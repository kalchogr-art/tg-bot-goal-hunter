// ============================================================
// GOAL WATCH — COLLECTOR V1
// FLASHscore ONLY — V3/V27 DATA READER
// ============================================================
// Collects ALL LIVE matches and their football data.
// No Hunter score / no goal signal / no derived analytics.
// Statistics are requested for EVERY LIVE match.
// Commercial fields (bookmakers / TV / sponsors / logos) are not returned.
// ============================================================

const MAIN_URL = "https://www.flashscore.com/x/feed/f_1_0_3_en_1";
const STAT_URL = "https://www.flashscore.com/x/feed/df_st_1_";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.flashscore.com/",
  "Origin": "https://www.flashscore.com",
  "x-fsign": "SW9D1eZo",
  "Cache-Control": "no-cache",
};

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ success: false, collector: "COLLECTOR V1", error: "Method not allowed" }, 405);
    }

    try {
      const mainRes = await fetch(MAIN_URL + "?_=" + Date.now(), {
        headers,
        cache: "no-store",
      });

      const mainText = await mainRes.text();

      if (!mainRes.ok) {
        return json({
          success: false,
          collector: "COLLECTOR V1",
          source: "FLASHSCORE ONLY",
          feed: { status: mainRes.status, length: mainText.length },
          error: "Flashscore live feed failed",
        }, 503);
      }

      const parsed = parse(mainText);
      const liveMatches = parsed.filter((m) => m.raw.AB === "2");
      const output: any[] = [];

      for (const match of liveMatches) {
        const r = match.raw;
        const timeInfo = getMinuteInfo(r);

        const scoreHome = toNumber(r.AG);
        const scoreAway = toNumber(r.AH);
        const totalGoals = valid(scoreHome) && valid(scoreAway)
          ? scoreHome + scoreAway
          : 0;

        // IMPORTANT:
        // V3/V27 statistics parser is used, but unlike the old V3
        // collector we DO NOT restrict statistics to 1H 0:0.
        const statistics = await fetchEndpoint(
          STAT_URL + match.id,
          headers
        );

        const parsedStats = parseStatistics(statistics.text);

        const xgHome = parsedStats.xg.home;
        const xgAway = parsedStats.xg.away;
        const xgTotal = valid(xgHome) && valid(xgAway)
          ? round(xgHome + xgAway)
          : null;

        const xgotHome = parsedStats.xgot.home;
        const xgotAway = parsedStats.xgot.away;
        const xgotTotal = valid(xgotHome) && valid(xgotAway)
          ? round(xgotHome + xgotAway)
          : null;

        const xaHome = parsedStats.xa.home;
        const xaAway = parsedStats.xa.away;
        const xaTotal = valid(xaHome) && valid(xaAway)
          ? round(xaHome + xaAway)
          : null;

        const statNames = [
          "possession",
          "shots",
          "shots_on_target",
          "shots_off_target",
          "blocked_shots",
          "shots_inside_box",
          "shots_outside_box",
          "big_chances",
          "corners",
          "touches_in_opposition_box",
          "hit_the_woodwork",
          "goalkeeper_saves",
          "xgot_faced",
          "goals_prevented",
        ];

        const keyStats: Record<string, any> = {};
        for (const name of statNames) {
          const value = parsedStats.stats[name] || {
            found: false,
            home: null,
            away: null,
          };

          keyStats[name] = {
            found: value.found,
            home: value.home,
            away: value.away,
            total: valid(value.home) && valid(value.away)
              ? round(value.home + value.away)
              : 0,
          };
        }

        let xgShare: any = {
          found: false,
          home: null,
          away: null,
        };

        if (valid(xgHome) && valid(xgAway) && valid(xgTotal) && xgTotal > 0) {
          xgShare = {
            found: true,
            home: round((xgHome / xgTotal) * 100, 1),
            away: round((xgAway / xgTotal) * 100, 1),
          };
        }

        output.push({
          id: match.id,
          match: `${r.AE || ""} - ${r.AF || ""}`,
          league: null,
          country: null,
          home: r.AE || "",
          away: r.AF || "",
          status: "LIVE",
          status_code: r.AB || null,

          minute: timeInfo.minute,
          minute_display: timeInfo.display,
          period: timeInfo.period,
          minute_source: timeInfo.source,
          time_debug: timeInfo.debug,

          score: {
            home: scoreHome,
            away: scoreAway,
            total_goals: totalGoals,
            zero_zero: scoreHome === 0 && scoreAway === 0,
          },

          xg: {
            home: xgHome,
            away: xgAway,
            total: xgTotal,
          },

          xg_share: xgShare,

          xgot: {
            home: xgotHome,
            away: xgotAway,
            total: xgotTotal,
          },

          xa: {
            home: xaHome,
            away: xaAway,
            total: xaTotal,
          },

          key_stats: keyStats,

          // Exact V3/V27 statistics collection result.
          // No score/signal/derived logic is added here.
          stats: parsedStats.stats,
          occurrences: parsedStats.occurrences,

          data_quality: {
            statistics_status: statistics.status,
            statistics_length: statistics.text.length,
            xg_found: valid(xgHome) || valid(xgAway),
            xgot_found: valid(xgotHome) || valid(xgotAway),
            xa_found: valid(xaHome) || valid(xaAway),
            occurrences: parsedStats.occurrences,
          },
        });
      }

      return json({
        success: true,
        collector: "COLLECTOR V1",
        source: "FLASHSCORE ONLY",
        timestamp: new Date().toISOString(),
        feed: {
          status: mainRes.status,
          total_matches: parsed.length,
          live_matches: liveMatches.length,
          matches_returned: output.length,
          matches_with_xg: output.filter((m) => m.data_quality.xg_found).length,
          zero_zero_matches: output.filter((m) => m.score.zero_zero).length,
          signals_found: 0,
        },
        matches: output,
      });
    } catch (error) {
      return json({
        success: false,
        collector: "COLLECTOR V1",
        source: "FLASHSCORE ONLY",
        error: error instanceof Error ? error.message : String(error),
      }, 500);
    }
  },
};

// ============================================================
// V3/V27 MAIN FEED PARSER — UNCHANGED LOGIC
// ============================================================
function parse(text: string) {
  const result: any[] = [];
  let current: any = null;

  for (const field of text.split("\xAC")) {
    if (!field) continue;
    const separator = field.indexOf("\xF7");
    if (separator === -1) continue;

    const key = field.slice(0, separator).replace(/^~/, "");
    const value = field.slice(separator + 1);
    if (!key) continue;

    if (key === "AA") {
      if (current) result.push(current);
      current = { id: value, raw: {} };
      continue;
    }

    if (current) current.raw[key] = value;
  }

  if (current) result.push(current);

  const seen = new Set<string>();
  return result.filter((match) => {
    if (!match?.id) return false;
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

// ============================================================
// V3/V27 STATISTICS PARSER — IMPORTANT: separator is '?'
// ============================================================
function parseStatistics(text: string) {
  const result: any = {
    xg: { home: null, away: null },
    xgot: { home: null, away: null },
    xa: { home: null, away: null },
    stats: {},
    occurrences: 0,
  };

  const fields = text.split("\xAC");
  let section = "match";
  let currentStat: string | null = null;
  let home: number | null = null;
  let away: number | null = null;

  for (const rawField of fields) {
    const field = rawField.replace(/^~/, "");
    const i = field.indexOf("?");
    if (i === -1) continue;

    const key = field.slice(0, i);
    const value = field.slice(i + 1);

    if (key === "SE") {
      const v = value.toLowerCase();
      if (v.includes("1st")) section = "first_half";
      else if (v.includes("2nd")) section = "second_half";
      else section = "match";
      continue;
    }

    if (key === "SG") {
      currentStat = normalizeStat(value);
      home = null;
      away = null;
      continue;
    }

    if (key === "SH") {
      home = parseStatValue(value);
      continue;
    }

    if (key === "SI") {
      away = parseStatValue(value);

      if (currentStat && home !== null && away !== null) {
        result.occurrences++;

        if (section === "match") {
          if (currentStat === "xg") result.xg = { home, away };
          else if (currentStat === "xgot") result.xgot = { home, away };
          else if (currentStat === "xa") result.xa = { home, away };
          else result.stats[currentStat] = { found: true, home, away };
        }
      }
      continue;
    }
  }

  const names = [
    "possession",
    "shots",
    "shots_on_target",
    "shots_off_target",
    "blocked_shots",
    "shots_inside_box",
    "shots_outside_box",
    "big_chances",
    "corners",
    "touches_in_opposition_box",
    "hit_the_woodwork",
    "goalkeeper_saves",
    "xgot_faced",
    "goals_prevented",
  ];

  for (const name of names) {
    if (!result.stats[name]) {
      result.stats[name] = {
        found: false,
        home: null,
        away: null,
      };
    }
  }

  return result;
}

function normalizeStat(value: string) {
  const v = value.toLowerCase().trim();

  if (v.includes("expected goals") || v === "xg") return "xg";
  if (v.includes("xg on target") || v.includes("xgot")) return "xgot";
  if (v.includes("expected assists") || v === "xa") return "xa";
  if (v === "ball possession") return "possession";
  if (v === "total shots") return "shots";
  if (v === "shots on target") return "shots_on_target";
  if (v === "shots off target") return "shots_off_target";
  if (v === "blocked shots") return "blocked_shots";
  if (v.includes("inside the box")) return "shots_inside_box";
  if (v.includes("outside the box")) return "shots_outside_box";
  if (v === "big chances") return "big_chances";
  if (v === "corner kicks") return "corners";
  if (v.includes("touches in opposition box")) return "touches_in_opposition_box";
  if (v === "hit the woodwork") return "hit_the_woodwork";
  if (v === "goalkeeper saves") return "goalkeeper_saves";
  if (v.includes("xgot faced")) return "xgot_faced";
  if (v.includes("goals prevented")) return "goals_prevented";

  return v.replace(/\s+/g, "_").replace(/[()]/g, "");
}

function parseStatValue(value: string) {
  if (value === null || value === undefined || value === "") return null;

  if (value.includes("%")) {
    const n = parseFloat(value.replace("%", ""));
    return isNaN(n) ? null : n;
  }

  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

// ============================================================
// V3/V27 TIME ENGINE — UNCHANGED LOGIC
// ============================================================
function getMinuteInfo(r: Record<string, string>) {
  const now = Math.floor(Date.now() / 1000);
  const AC = r.AC;
  const AD = toNumber(r.AD);
  const AO = toNumber(r.AO);
  const BC = toNumber(r.BC);
  const BD = toNumber(r.BD);

  if (AC === "13" && valid(AO)) {
    const seconds = Math.max(0, now - AO!);
    const minute = 45 + Math.floor(seconds / 60);
    const sec = seconds % 60;

    return {
      minute,
      display: minute >= 90
        ? `90+${Math.max(0, minute - 90)}`
        : `${minute}:${String(sec).padStart(2, "0")}`,
      period: "2H",
      source: "AO_2H",
      debug: { AC, AD, AO, BC, BD, now_unix: now, now_minus_AO: now - AO! },
    };
  }

  if (AC === "12" && valid(AO)) {
    const seconds = Math.max(0, now - AO!);
    const minute = Math.floor(seconds / 60);
    const sec = seconds % 60;

    return {
      minute,
      display: `${minute}:${String(sec).padStart(2, "0")}`,
      period: "1H",
      source: "AO_1H",
      debug: { AC, AD, AO, BC, BD, now_unix: now, now_minus_AO: now - AO! },
    };
  }

  if (valid(BC)) {
    return {
      minute: BC,
      display: String(BC),
      period: "2H",
      source: "BC_FALLBACK",
      debug: { AC, AD, AO, BC, BD, now_unix: now },
    };
  }

  return {
    minute: 0,
    display: "0",
    period: "UNKNOWN",
    source: "NONE",
    debug: { AC, AD, AO, BC, BD, now_unix: now },
  };
}

async function fetchEndpoint(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url + "?_=" + Date.now(), {
      headers,
      cache: "no-store",
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch {
    return { status: 0, text: "" };
  }
}

function toNumber(v: unknown) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function valid(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function round(n: number, digits = 2) {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
