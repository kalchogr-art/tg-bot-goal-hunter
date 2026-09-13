export default {
  async fetch(request) {

    // =================================================
    // CORS
    // =================================================

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // =================================================
    // FLASHSCORE ONLY
    // =================================================

    const MAIN_URL =
      "https://www.flashscore.com/x/feed/f_1_0_3_en_1";

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36",

      "Accept": "*/*",

      "Accept-Language":
        "en-US,en;q=0.9",

      "Referer":
        "https://www.flashscore.com/",

      "Origin":
        "https://www.flashscore.com",

      "x-fsign":
        "SW9D1eZo",

      "Cache-Control":
        "no-cache"
    };

    const requestUrl =
      new URL(request.url);

    // =================================================
    // DEBUG FEED FRESHNESS V3
    // =================================================

    if (
      request.method === "GET" &&
      requestUrl.pathname === "/debug-feed-freshness"
    ) {

      return debugFeedFreshness(
        requestUrl,
        MAIN_URL,
        headers,
        corsHeaders
      );
    }

    try {

      // =================================================
      // MAIN LIVE FEED
      // =================================================

      const mainRes =
        await fetch(
          MAIN_URL + "?_=" + Date.now(),
          {
            headers,
            cache: "no-store"
          }
        );

      const mainText =
        await mainRes.text();

      if (!mainRes.ok) {

        return json(
          {
            success: false,
            stage: "live_feed",
            status: mainRes.status,
            message: "Flashscore live feed failed"
          },
          503,
          corsHeaders
        );
      }

      // =================================================
      // PARSE
      // =================================================

      const matches =
        parse(mainText);

      const liveMatches =
        matches.filter(
          m => m.raw.AB === "2"
        );

      const output = [];

      // =================================================
      // ONE SNAPSHOT FOR ALL MATCHES
      // =================================================

      const snapshotUnix =
        Math.floor(
          Date.now() / 1000
        );

      // =================================================
      // FETCH STATS IN PARALLEL
      // =================================================

      const STATISTICS_BATCH_SIZE =
        10;

      const statisticsById =
        await fetchStatisticsInBatches(
          liveMatches,
          headers,
          STATISTICS_BATCH_SIZE
        );

      // =================================================
      // PROCESS MATCHES
      // =================================================

      for (const match of liveMatches) {

        const r =
          match.raw;

        // =================================================
        // TIME
        // =================================================

        const timeInfo =
          getMinuteInfo(
            r,
            snapshotUnix
          );

        const minute =
          timeInfo.minute;

        const minuteDisplay =
          timeInfo.display;

        const period =
          timeInfo.period;

        // =================================================
        // MAIN FEED SCORE
        // =================================================

        const mainScoreHome =
          toNumber(r.AG);

        const mainScoreAway =
          toNumber(r.AH);

        // =================================================
        // V3 SCORE CROSS-CHECK
        // =================================================
        //
        // Only check df_sui when this match could potentially
        // become a Hunter ENTRY:
        // - 1H
        // - 10..42
        // - main feed currently says 0:0
        //
        // This avoids fetching df_sui for every live match.
        // =================================================

        let summaryCheck = {
          checked: false,
          status: 0,
          goal_count: 0,
          latest_goal_minute: null,
          latest_score: null,
          score_mismatch: false,
          main_feed_behind: false
        };

        if (
          period === "1H" &&
          minute >= 10 &&
          minute <= 42 &&
          mainScoreHome === 0 &&
          mainScoreAway === 0
        ) {

          summaryCheck =
            await getSummaryScoreCheck(
              match.id,
              headers,
              mainScoreHome,
              mainScoreAway
            );
        }

        // =================================================
        // EFFECTIVE SCORE
        // =================================================
        //
        // If df_sui has a confirmed goal and a score that is
        // ahead of the main feed, use df_sui score.
        //
        // Otherwise keep AG/AH from main feed.
        // =================================================

        let scoreHome =
          mainScoreHome;

        let scoreAway =
          mainScoreAway;

        let scoreSource =
          "MAIN_FEED";

        if (
          summaryCheck.checked &&
          summaryCheck.main_feed_behind &&
          summaryCheck.latest_score &&
          valid(summaryCheck.latest_score.home) &&
          valid(summaryCheck.latest_score.away)
        ) {

          scoreHome =
            summaryCheck.latest_score.home;

          scoreAway =
            summaryCheck.latest_score.away;

          scoreSource =
            "DF_SUI_CROSSCHECK";
        }

        const totalGoals =
          valid(scoreHome) &&
          valid(scoreAway)
            ? scoreHome + scoreAway
            : 0;

        const isZeroZero =
          scoreHome === 0 &&
          scoreAway === 0;

        // =================================================
        // FLASHCORE STATISTICS
        // =================================================

        const statistics =
          statisticsById.get(
            match.id
          ) || {
            status: 0,
            text: ""
          };

        const parsed =
          parseStatistics(
            statistics.text
          );

        // =================================================
        // XG
        // =================================================

        const xgHome =
          parsed.xg.home;

        const xgAway =
          parsed.xg.away;

        const xgTotal =
          valid(xgHome) &&
          valid(xgAway)
            ? round(
                xgHome + xgAway
              )
            : null;

        // =================================================
        // XGOT
        // =================================================

        const xgotHome =
          parsed.xgot.home;

        const xgotAway =
          parsed.xgot.away;

        const xgotTotal =
          valid(xgotHome) &&
          valid(xgotAway)
            ? round(
                xgotHome + xgotAway
              )
            : null;

        // =================================================
        // XA
        // =================================================

        const xaHome =
          parsed.xa.home;

        const xaAway =
          parsed.xa.away;

        const xaTotal =
          valid(xaHome) &&
          valid(xaAway)
            ? round(
                xaHome + xaAway
              )
            : null;

        // =================================================
        // KEY STATS
        // =================================================

        const keyStats = {};

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
          "goals_prevented"
        ];

        for (const name of statNames) {

          const value =
            parsed.stats[name];

          keyStats[name] = {

            found:
              value.found,

            home:
              value.home,

            away:
              value.away,

            total:
              valid(value.home) &&
              valid(value.away)
                ? round(
                    value.home +
                    value.away
                  )
                : 0
          };
        }

        // =================================================
        // XG SHARE
        // =================================================

        let xgShare = {
          found: false,
          home: null,
          away: null
        };

        if (
          valid(xgHome) &&
          valid(xgAway) &&
          valid(xgTotal) &&
          xgTotal > 0
        ) {

          xgShare = {

            found: true,

            home:
              round(
                (xgHome / xgTotal) * 100,
                1
              ),

            away:
              round(
                (xgAway / xgTotal) * 100,
                1
              )
          };
        }

        // =================================================
        // BASIC VALUES
        // =================================================

        const shots =
          keyStats.shots.total;

        const shotsOnTarget =
          keyStats.shots_on_target.total;

        const corners =
          keyStats.corners.total;

        const boxTouches =
          keyStats.touches_in_opposition_box.total;

        const bigChances =
          keyStats.big_chances.total;

        const possessionHome =
          keyStats.possession.home;

        const possessionAway =
          keyStats.possession.away;

        // =================================================
        // ATTACK SCORE
        // =================================================

        const attackScore =
          calculateAttackScore({
            xg: xgTotal,
            shots,
            shotsOnTarget,
            corners,
            boxTouches,
            minute
          });

        // =================================================
        // DANGER INDEX
        // =================================================

        const dangerIndex =
          calculateDangerIndex({
            xg: xgTotal,
            xgot: xgotTotal,
            shots,
            shotsOnTarget,
            corners,
            boxTouches,
            bigChances,
            minute
          });

        // =================================================
        // GOAL PRESSURE
        // =================================================

        const goalPressure =
          calculateGoalPressure({
            xg: xgTotal,
            shots,
            shotsOnTarget,
            corners,
            boxTouches,
            bigChances,
            minute
          });

        // =================================================
        // GOAL SIGNAL
        // =================================================

        const signal =
          calculateGoalSignal({
            minute,
            period,
            scoreHome,
            scoreAway,
            shots,
            shotsOnTarget,
            corners,
            boxTouches,
            bigChances,
            possessionHome,
            possessionAway,
            xg: xgTotal,
            xgot: xgotTotal
          });

        // =================================================
        // EXTRA ENTRY GUARD
        // =================================================
        //
        // If main says 0:0 but df_sui already has a goal,
        // Hunter must NOT be eligible.
        // =================================================

        if (
          summaryCheck.checked &&
          summaryCheck.goal_count > 0 &&
          mainScoreHome === 0 &&
          mainScoreAway === 0
        ) {

          signal.hunter_eligible =
            false;

          signal.target =
            "NONE";

          signal.reasons.push(
            "df_sui_goal_guard"
          );
        }

        // =================================================
        // DERIVED
        // =================================================

        const xgPerMinute =
          valid(xgTotal) &&
          minute > 0
            ? round(
                xgTotal / minute,
                3
              )
            : 0;

        const projected90XG =
          valid(xgTotal) &&
          minute > 0
            ? round(
                (xgTotal / minute) * 90,
                2
              )
            : 0;

        const shotsPerMinute =
          minute > 0
            ? round(
                shots / minute,
                3
              )
            : 0;

        const shotsOnTargetPerMinute =
          minute > 0
            ? round(
                shotsOnTarget / minute,
                3
              )
            : 0;

        const cornersPerMinute =
          minute > 0
            ? round(
                corners / minute,
                3
              )
            : 0;

        const boxTouchesPerMinute =
          minute > 0
            ? round(
                boxTouches / minute,
                3
              )
            : 0;

        // =================================================
        // RESULT
        // =================================================

        output.push({

          id:
            match.id,

          match:
            `${r.AE || ""} - ${r.AF || ""}`,

          league:
            match.league ||
            "LIVE",

          minute,

          minute_display:
            minuteDisplay,

          period,

          minute_source:
            timeInfo.source,

          time_debug:
            timeInfo.debug,

          score: {

            home:
              scoreHome,

            away:
              scoreAway,

            total_goals:
              totalGoals,

            zero_zero:
              isZeroZero,

            source:
              scoreSource,

            main_feed: {
              home:
                mainScoreHome,

              away:
                mainScoreAway
            },

            df_sui_check:
              summaryCheck
          },

          xg: {
            home:
              xgHome,

            away:
              xgAway,

            total:
              xgTotal
          },

          xg_share:
            xgShare,

          xgot: {
            home:
              xgotHome,

            away:
              xgotAway,

            total:
              xgotTotal
          },

          xa: {
            home:
              xaHome,

            away:
              xaAway,

            total:
              xaTotal
          },

          key_stats:
            keyStats,

          derived: {

            xg_per_minute:
              xgPerMinute,

            projected_90_xg:
              projected90XG,

            shots_per_minute:
              shotsPerMinute,

            shots_on_target_per_minute:
              shotsOnTargetPerMinute,

            corners_per_minute:
              cornersPerMinute,

            box_touches_per_minute:
              boxTouchesPerMinute,

            attack_score:
              attackScore,

            danger_index:
              dangerIndex,

            goal_pressure:
              goalPressure
          },

          goal_signal:
            signal,

          data_quality: {

            statistics_status:
              statistics.status,

            statistics_length:
              statistics.text.length,

            xg_found:
              valid(xgTotal),

            xgot_found:
              valid(xgotTotal),

            xa_found:
              valid(xaTotal),

            xg_required:
              false,

            signal_can_work_without_xg:
              true,

            occurrences:
              parsed.occurrences,

            score_source:
              scoreSource,

            score_crosscheck_used:
              summaryCheck.checked,

            stale_main_detected:
              summaryCheck.main_feed_behind
          }
        });
      }

      // =================================================
      // SORT
      // =================================================

      output.sort(
        (a, b) =>
          b.goal_signal.score -
          a.goal_signal.score
      );

      // =================================================
      // SUMMARY
      // =================================================

      const xgMatches =
        output.filter(
          m =>
            m.data_quality.xg_found
        );

      const zeroZeroMatches =
        output.filter(
          m =>
            m.score.zero_zero
        );

      const signals =
        output.filter(
          m =>
            m.goal_signal.signal !==
            "LOW"
        );

      const staleScoresDetected =
        output.filter(
          m =>
            m.data_quality
              .stale_main_detected
        );

      // =================================================
      // RESPONSE
      // =================================================

      return json({

        test:
          "flashscore_only_v27_score_crosscheck_v3",

        version:
          "V3_DF_SUI_SCORE_CROSSCHECK",

        success:
          true,

        source:
          "FLASHscore ONLY",

        timestamp:
          new Date().toISOString(),

        hunter_rules: {

          window:
            "10-42",

          thresholds: {
            "10-29": 61,
            "30-34": 65,
            "35-37": 68,
            "38-39": 72,
            "40-42": 75
          },

          after_42:
            false,

          score_guard:
            "DF_SUI_GOAL_CROSSCHECK_ON_0_0_CANDIDATES"
        },

        feed: {

          status:
            mainRes.status,

          total_matches:
            matches.length,

          live_matches:
            liveMatches.length,

          matches_returned:
            output.length,

          matches_with_xg:
            xgMatches.length,

          zero_zero_matches:
            zeroZeroMatches.length,

          signals_found:
            signals.length,

          stale_scores_detected:
            staleScoresDetected.length,

          statistics_batch_size:
            STATISTICS_BATCH_SIZE,

          snapshot_unix:
            snapshotUnix
        },

        matches:
          output

      }, 200, corsHeaders);

    } catch (e) {

      return json({

        test:
          "flashscore_only_v27_score_crosscheck_v3",

        version:
          "V3_DF_SUI_SCORE_CROSSCHECK",

        success:
          false,

        error:
          e.message,

        stack:
          e.stack || null

      }, 500, corsHeaders);
    }
  }
};


// =====================================================
// FETCH FLASHSCORE ENDPOINT
// =====================================================

async function fetchEndpoint(
  url,
  headers
) {

  try {

    const res =
      await fetch(
        url + "?_=" + Date.now(),
        {
          headers,
          cache: "no-store"
        }
      );

    const text =
      await res.text();

    return {
      status:
        res.status,
      text
    };

  } catch (e) {

    return {
      status:
        0,
      text:
        ""
    };
  }
}


// =====================================================
// FETCH STATISTICS IN PARALLEL BATCHES
// =====================================================

async function fetchStatisticsInBatches(
  matches,
  headers,
  batchSize = 10
) {

  const result =
    new Map();

  const safeBatchSize =
    Math.max(
      1,
      Math.floor(
        Number(batchSize) || 10
      )
    );

  for (
    let i = 0;
    i < matches.length;
    i += safeBatchSize
  ) {

    const batch =
      matches.slice(
        i,
        i + safeBatchSize
      );

    const responses =
      await Promise.all(
        batch.map(
          async match => {

            const statistics =
              await fetchEndpoint(
                `https://www.flashscore.com/x/feed/df_st_1_${match.id}`,
                headers
              );

            return {
              id:
                match.id,
              statistics
            };
          }
        )
      );

    for (const item of responses) {

      result.set(
        item.id,
        item.statistics
      );
    }
  }

  return result;
}


// =====================================================
// DF_SUI SCORE CHECK
// =====================================================

async function getSummaryScoreCheck(
  matchId,
  headers,
  mainHome,
  mainAway
) {

  const response =
    await fetchEndpoint(
      `https://www.flashscore.com/x/feed/df_sui_1_${encodeURIComponent(matchId)}`,
      headers
    );

  const parsed =
    parseSummaryEvents(
      response.text
    );

  const goals =
    parsed.events.filter(
      isLikelyGoalEvent
    );

  let latestGoal =
    null;

  for (const goal of goals) {

    if (
      goal.score &&
      valid(goal.score.home) &&
      valid(goal.score.away)
    ) {

      latestGoal =
        goal;
    }
  }

  const latestScore =
    latestGoal
      ? {
          home:
            latestGoal.score.home,
          away:
            latestGoal.score.away
        }
      : null;

  const mainTotal =
    (
      valid(mainHome)
        ? mainHome
        : 0
    ) +
    (
      valid(mainAway)
        ? mainAway
        : 0
    );

  const summaryTotal =
    latestScore
      ? latestScore.home +
        latestScore.away
      : 0;

  const scoreMismatch =
    Boolean(
      latestScore &&
      (
        latestScore.home !== mainHome ||
        latestScore.away !== mainAway
      )
    );

  const mainFeedBehind =
    Boolean(
      latestScore &&
      summaryTotal > mainTotal
    );

  return {

    checked:
      true,

    status:
      response.status,

    goal_count:
      goals.length,

    latest_goal_minute:
      latestGoal?.minute ||
      null,

    latest_score:
      latestScore,

    score_mismatch:
      scoreMismatch,

    main_feed_behind:
      mainFeedBehind
  };
}


// =====================================================
// MAIN FEED PARSER
// =====================================================

function parse(text) {

  const result = [];

  let current = null;

  let currentLeague =
    "";

  for (
    const field of text.split("¬")
  ) {

    const i =
      field.indexOf("÷");

    if (i === -1)
      continue;

    const key =
      field
        .slice(0, i)
        .replace(/^~/, "");

    const value =
      field.slice(i + 1);

    if (key === "ZA") {

      currentLeague =
        cleanLeagueName(
          value
        );

      continue;
    }

    if (key === "AA") {

      if (current)
        result.push(current);

      current = {

        id:
          value,

        league:
          currentLeague,

        raw:
          {}
      };

      continue;
    }

    if (current) {

      current.raw[key] =
        value;
    }
  }

  if (current)
    result.push(current);

  const latest =
    new Map();

  for (const match of result) {

    latest.set(
      match.id,
      match
    );
  }

  return Array.from(
    latest.values()
  );
}


// =====================================================
// CLEAN LEAGUE NAME
// =====================================================

function cleanLeagueName(value) {

  return String(
    value || ""
  )
    .replace(/\s+/g, " ")
    .trim();
}


// =====================================================
// STATISTICS PARSER
// =====================================================

function parseStatistics(text) {

  const result = {

    xg: {
      home: null,
      away: null
    },

    xgot: {
      home: null,
      away: null
    },

    xa: {
      home: null,
      away: null
    },

    stats: {},

    occurrences:
      0
  };

  const fields =
    text.split("¬");

  let section =
    "match";

  let currentStat =
    null;

  let home =
    null;

  let away =
    null;

  for (
    const rawField of fields
  ) {

    const field =
      rawField.replace(/^~/, "");

    const i =
      field.indexOf("÷");

    if (i === -1)
      continue;

    const key =
      field.slice(0, i);

    const value =
      field.slice(i + 1);

    if (key === "SE") {

      const v =
        value.toLowerCase();

      if (v.includes("1st")) {
        section =
          "first_half";
      } else if (
        v.includes("2nd")
      ) {
        section =
          "second_half";
      } else {
        section =
          "match";
      }

      continue;
    }

    if (key === "SG") {

      currentStat =
        normalizeStat(value);

      home =
        null;

      away =
        null;

      continue;
    }

    if (key === "SH") {

      home =
        parseStatValue(value);

      continue;
    }

    if (key === "SI") {

      away =
        parseStatValue(value);

      if (
        currentStat &&
        home !== null &&
        away !== null
      ) {

        result.occurrences++;

        if (
          section === "match"
        ) {

          if (
            currentStat === "xg"
          ) {

            result.xg = {
              home,
              away
            };

          } else if (
            currentStat === "xgot"
          ) {

            result.xgot = {
              home,
              away
            };

          } else if (
            currentStat === "xa"
          ) {

            result.xa = {
              home,
              away
            };

          } else {

            result.stats[
              currentStat
            ] = {
              found:
                true,
              home,
              away
            };
          }
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
    "goals_prevented"
  ];

  for (const name of names) {

    if (
      !result.stats[name]
    ) {

      result.stats[name] = {
        found:
          false,
        home:
          null,
        away:
          null
      };
    }
  }

  return result;
}


// =====================================================
// STAT NORMALIZATION
// =====================================================

function normalizeStat(value) {

  const v =
    value
      .toLowerCase()
      .trim();

  if (
    v.includes("expected goals") ||
    v === "xg"
  )
    return "xg";

  if (
    v.includes("xg on target") ||
    v.includes("xgot")
  )
    return "xgot";

  if (
    v.includes("expected assists") ||
    v === "xa"
  )
    return "xa";

  if (
    v === "ball possession"
  )
    return "possession";

  if (
    v === "total shots"
  )
    return "shots";

  if (
    v === "shots on target"
  )
    return "shots_on_target";

  if (
    v === "shots off target"
  )
    return "shots_off_target";

  if (
    v === "blocked shots"
  )
    return "blocked_shots";

  if (
    v.includes("inside the box")
  )
    return "shots_inside_box";

  if (
    v.includes("outside the box")
  )
    return "shots_outside_box";

  if (
    v === "big chances"
  )
    return "big_chances";

  if (
    v === "corner kicks"
  )
    return "corners";

  if (
    v.includes(
      "touches in opposition box"
    )
  )
    return "touches_in_opposition_box";

  if (
    v === "hit the woodwork"
  )
    return "hit_the_woodwork";

  if (
    v === "goalkeeper saves"
  )
    return "goalkeeper_saves";

  if (
    v.includes("xgot faced")
  )
    return "xgot_faced";

  if (
    v.includes("goals prevented")
  )
    return "goals_prevented";

  return v
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "");
}


// =====================================================
// STAT VALUE
// =====================================================

function parseStatValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  )
    return null;

  if (
    value.includes("%")
  ) {

    const n =
      parseFloat(
        value.replace("%", "")
      );

    return isNaN(n)
      ? null
      : n;
  }

  const n =
    parseFloat(value);

  return isNaN(n)
    ? null
    : n;
}


// =====================================================
// TIME ENGINE
// =====================================================

function getMinuteInfo(
  r,
  snapshotUnix = null
) {

  const now =
    valid(snapshotUnix)
      ? snapshotUnix
      : Math.floor(
          Date.now() / 1000
        );

  const AC =
    r.AC;

  const AD =
    toNumber(r.AD);

  const AO =
    toNumber(r.AO);

  const BC =
    toNumber(r.BC);

  const BD =
    toNumber(r.BD);

  if (
    AC === "13" &&
    valid(AO)
  ) {

    const seconds =
      Math.max(
        0,
        now - AO
      );

    const minute =
      45 +
      Math.floor(
        seconds / 60
      );

    const sec =
      seconds % 60;

    return {

      minute,

      display:
        minute >= 90
          ? `90+${Math.max(
              0,
              minute - 90
            )}`
          : `${minute}:${String(sec).padStart(2, "0")}`,

      period:
        "2H",

      source:
        "AO_2H",

      debug: {
        AC,
        AD,
        AO,
        BC,
        BD,
        now_unix:
          now,
        now_minus_AO:
          now - AO
      }
    };
  }

  if (
    AC === "12" &&
    valid(AO)
  ) {

    const seconds =
      Math.max(
        0,
        now - AO
      );

    const minute =
      Math.floor(
        seconds / 60
      );

    const sec =
      seconds % 60;

    return {

      minute,

      display:
        `${minute}:${String(sec).padStart(2, "0")}`,

      period:
        "1H",

      source:
        "AO_1H",

      debug: {
        AC,
        AD,
        AO,
        BC,
        BD,
        now_unix:
          now,
        now_minus_AO:
          now - AO
      }
    };
  }

  if (
    valid(BC)
  ) {

    return {

      minute:
        BC,

      display:
        String(BC),

      period:
        "2H",

      source:
        "BC_FALLBACK",

      debug: {
        AC,
        AD,
        AO,
        BC,
        BD,
        now_unix:
          now
      }
    };
  }

  return {

    minute:
      0,

    display:
      "0",

    period:
      "UNKNOWN",

    source:
      "NONE",

    debug: {
      AC,
      AD,
      AO,
      BC,
      BD,
      now_unix:
        now
    }
  };
}


// =====================================================
// ATTACK SCORE
// =====================================================

function calculateAttackScore(data) {

  const xg =
    valid(data.xg)
      ? data.xg
      : 0;

  const shots =
    data.shots || 0;

  const sot =
    data.shotsOnTarget || 0;

  const corners =
    data.corners || 0;

  const box =
    data.boxTouches || 0;

  const minute =
    Math.max(
      data.minute || 1,
      1
    );

  let raw =

    xg * 25 +

    shots * 2 +

    sot * 5 +

    corners * 1.5 +

    box * 2;

  const timeFactor =
    Math.min(
      1.5,
      45 / minute
    );

  raw *= timeFactor;

  return Math.round(
    Math.min(
      100,
      raw
    )
  );
}


// =====================================================
// DANGER INDEX
// =====================================================

function calculateDangerIndex(data) {

  const xg =
    valid(data.xg)
      ? data.xg
      : 0;

  const xgot =
    valid(data.xgot)
      ? data.xgot
      : 0;

  const shots =
    data.shots || 0;

  const sot =
    data.shotsOnTarget || 0;

  const corners =
    data.corners || 0;

  const box =
    data.boxTouches || 0;

  const big =
    data.bigChances || 0;

  const minute =
    Math.max(
      data.minute || 1,
      1
    );

  let score =

    xg * 35 +

    xgot * 20 +

    shots * 1.5 +

    sot * 5 +

    corners * 2 +

    box * 2 +

    big * 8;

  const timeFactor =
    Math.min(
      2,
      45 / minute
    );

  score *= timeFactor;

  return Math.round(
    Math.min(
      100,
      score
    )
  );
}


// =====================================================
// GOAL PRESSURE
// =====================================================

function calculateGoalPressure(data) {

  const minute =
    Math.max(
      data.minute || 1,
      1
    );

  const xg =
    valid(data.xg)
      ? data.xg
      : 0;

  const shots =
    data.shots || 0;

  const sot =
    data.shotsOnTarget || 0;

  const corners =
    data.corners || 0;

  const box =
    data.boxTouches || 0;

  const big =
    data.bigChances || 0;

  const pressure =

    (xg / minute) * 100 +

    (shots / minute) * 12 +

    (sot / minute) * 25 +

    (corners / minute) * 8 +

    (box / minute) * 8 +

    (big / minute) * 35;

  return round(
    Math.min(
      100,
      pressure
    ),
    1
  );
}


// =====================================================
// HUNTER DYNAMIC THRESHOLD
// =====================================================

function getHunterMinScore(
  minute,
  period
) {

  if (
    period !== "1H" ||
    minute < 10 ||
    minute > 42
  ) {

    return null;
  }

  if (minute <= 29) {
    return 61;
  }

  if (minute <= 34) {
    return 65;
  }

  if (minute <= 37) {
    return 68;
  }

  if (minute <= 39) {
    return 72;
  }

  return 75;
}


// =====================================================
// GOAL DETECTOR
// =====================================================

function calculateGoalSignal(data) {

  const minute =
    data.minute || 0;

  const period =
    data.period || "UNKNOWN";

  const home =
    valid(data.scoreHome)
      ? data.scoreHome
      : 0;

  const away =
    valid(data.scoreAway)
      ? data.scoreAway
      : 0;

  const goals =
    home + away;

  const shots =
    data.shots || 0;

  const sot =
    data.shotsOnTarget || 0;

  const corners =
    data.corners || 0;

  const boxTouches =
    data.boxTouches || 0;

  const bigChances =
    data.bigChances || 0;

  const possessionHome =
    valid(data.possessionHome)
      ? data.possessionHome
      : null;

  const possessionAway =
    valid(data.possessionAway)
      ? data.possessionAway
      : null;

  const xg =
    valid(data.xg)
      ? data.xg
      : null;

  const xgot =
    valid(data.xgot)
      ? data.xgot
      : null;

  let score = 0;

  const reasons = [];

  if (
    period === "1H" &&
    minute >= 15 &&
    minute <= 45
  ) {

    score += 10;

    reasons.push(
      "prime_1H_window"
    );
  }

  if (
    period === "2H" &&
    minute >= 55 &&
    minute <= 85
  ) {

    score += 12;

    reasons.push(
      "prime_2H_window"
    );
  }

  if (
    home === 0 &&
    away === 0
  ) {

    score += 12;

    reasons.push(
      "score_0_0"
    );
  }

  if (shots >= 6) {
    score += 8;
    reasons.push("shots_6_plus");
  }

  if (shots >= 10) {
    score += 8;
    reasons.push("shots_10_plus");
  }

  if (shots >= 15) {
    score += 7;
    reasons.push("shots_15_plus");
  }

  if (sot >= 2) {
    score += 10;
    reasons.push("sot_2_plus");
  }

  if (sot >= 4) {
    score += 10;
    reasons.push("sot_4_plus");
  }

  if (sot >= 6) {
    score += 8;
    reasons.push("sot_6_plus");
  }

  if (corners >= 3) {
    score += 5;
    reasons.push("corners_3_plus");
  }

  if (corners >= 5) {
    score += 7;
    reasons.push("corners_5_plus");
  }

  if (corners >= 8) {
    score += 8;
    reasons.push("corners_8_plus");
  }

  if (bigChances >= 1) {
    score += 10;
    reasons.push("big_chance");
  }

  if (bigChances >= 2) {
    score += 10;
    reasons.push("big_chances_2_plus");
  }

  if (boxTouches >= 15) {
    score += 8;
    reasons.push("box_touches_15_plus");
  }

  if (boxTouches >= 25) {
    score += 8;
    reasons.push("box_touches_25_plus");
  }

  if (
    valid(possessionHome) &&
    valid(possessionAway)
  ) {

    const diff =
      Math.abs(
        possessionHome -
        possessionAway
      );

    if (diff >= 15) {
      score += 4;
      reasons.push(
        "possession_advantage"
      );
    }

    if (diff >= 25) {
      score += 5;
      reasons.push(
        "strong_possession_advantage"
      );
    }
  }

  if (valid(xg)) {

    if (xg >= 0.50) {
      score += 8;
      reasons.push("xg_0_50_plus");
    }

    if (xg >= 0.90) {
      score += 10;
      reasons.push("xg_0_90_plus");
    }

    if (xg >= 1.30) {
      score += 10;
      reasons.push("xg_1_30_plus");
    }
  }

  if (valid(xgot)) {

    if (xgot >= 0.50) {
      score += 7;
      reasons.push("xgot_0_50_plus");
    }

    if (xgot >= 1.00) {
      score += 8;
      reasons.push("xgot_1_00_plus");
    }
  }

  if (
    minute >= 20 &&
    shots <= 2 &&
    sot === 0 &&
    corners <= 1
  ) {

    score -= 15;

    reasons.push(
      "low_activity_penalty"
    );
  }

  if (
    minute >= 30 &&
    shots <= 4 &&
    sot === 0
  ) {

    score -= 10;

    reasons.push(
      "very_low_attack_penalty"
    );
  }

  if (
    period === "2H" &&
    minute >= 70 &&
    goals === 0 &&
    shots >= 10
  ) {

    score += 8;

    reasons.push(
      "late_0_0_pressure"
    );
  }

  score =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(score)
      )
    );

  const hunterMinScore =
    getHunterMinScore(
      minute,
      period
    );

  const hunterEligible =
    hunterMinScore !== null &&
    score >= hunterMinScore;

  let signal =
    "LOW";

  if (score >= 75) {
    signal =
      "VERY_STRONG";
  } else if (score >= 60) {
    signal =
      "STRONG";
  } else if (score >= 45) {
    signal =
      "MEDIUM";
  } else if (score >= 30) {
    signal =
      "WATCH";
  }

  let target =
    "NONE";

  if (
    hunterEligible
  ) {
    target =
      "NEXT_GOAL";
  }

  return {

    score,

    signal,

    target,

    hunter_min_score:
      hunterMinScore,

    hunter_eligible:
      hunterEligible,

    xg_used:
      valid(xg),

    xgot_used:
      valid(xgot),

    reasons
  };
}


// =====================================================
// SUMMARY EVENTS PARSER
// =====================================================

function parseSummaryEvents(
  text
) {

  const events = [];

  const typeCounts = {};

  const fields =
    String(text || "")
      .split("¬");

  let context = {

    section:
      null,

    ia:
      null,

    minute:
      null,

    home_score:
      null,

    away_score:
      null
  };

  let current = {};

  function finishCurrent() {

    const kind =
      cleanDebugValue(
        current.IK
      );

    if (!kind) {

      current = {};

      return;
    }

    const event = {

      kind,

      type:
        kind,

      minute:
        context.minute,

      section:
        context.section,

      ia:
        context.ia,

      participant:
        cleanDebugValue(
          current.IF
        ),

      participant_code:
        cleanDebugValue(
          current.IE
        ),

      participant_id:
        cleanDebugValue(
          current.IM
        ),

      participant_url:
        cleanDebugValue(
          current.IU
        ),

      score: {

        home:
          toNumber(
            context.home_score
          ),

        away:
          toNumber(
            context.away_score
          )
      },

      raw: {

        IA:
          context.ia,

        IB:
          context.minute,

        INX:
          context.home_score,

        IOX:
          context.away_score,

        ...compactDebugRaw(
          current
        )
      }
    };

    events.push(
      event
    );

    typeCounts[
      kind
    ] =
      (
        typeCounts[
          kind
        ] ||
        0
      ) + 1;

    current = {};
  }

  for (
    const rawField of fields
  ) {

    if (!rawField) {
      continue;
    }

    const field =
      String(rawField)
        .replace(/^~/, "");

    const i =
      field.indexOf("÷");

    if (i === -1) {
      continue;
    }

    const key =
      field
        .slice(0, i)
        .trim();

    const value =
      field.slice(
        i + 1
      );

    if (
      key === "AC"
    ) {

      if (current.IK) {
        finishCurrent();
      }

      context.section =
        cleanDebugValue(
          value
        );

      continue;
    }

    if (
      key === "IA"
    ) {

      if (current.IK) {
        finishCurrent();
      }

      context.ia =
        cleanDebugValue(
          value
        );

      continue;
    }

    if (
      key === "IB"
    ) {

      if (current.IK) {
        finishCurrent();
      }

      context.minute =
        cleanDebugValue(
          value
        );

      continue;
    }

    if (
      key === "INX"
    ) {

      context.home_score =
        cleanDebugValue(
          value
        );

      continue;
    }

    if (
      key === "IOX"
    ) {

      context.away_score =
        cleanDebugValue(
          value
        );

      continue;
    }

    if (
      key === "IE" &&
      current.IK
    ) {

      finishCurrent();
    }

    if (
      key === "IE" ||
      key === "IF" ||
      key === "IU" ||
      key === "ICT" ||
      key === "IK" ||
      key === "IM"
    ) {

      current[
        key
      ] =
        value;

      continue;
    }
  }

  if (
    current.IK
  ) {

    finishCurrent();
  }

  return {
    events,
    typeCounts
  };
}


// =====================================================
// GOAL EVENT CHECK
// =====================================================

function isLikelyGoalEvent(
  event
) {

  const kind =
    String(
      event?.kind ||
      event?.type ||
      ""
    )
      .trim()
      .toLowerCase();

  if (!kind) {
    return false;
  }

  if (
    kind.includes(
      "disallowed"
    ) ||
    kind.includes(
      "cancelled"
    ) ||
    kind.includes(
      "canceled"
    ) ||
    kind.includes(
      "var overturn"
    )
  ) {

    return false;
  }

  return (
    kind === "goal" ||
    kind === "own goal" ||
    kind === "penalty goal"
  );
}


// =====================================================
// DEBUG FEED FRESHNESS V3
// =====================================================

async function debugFeedFreshness(
  requestUrl,
  mainUrl,
  headers,
  corsHeaders
) {

  const matchId =
    String(
      requestUrl.searchParams.get("matchId") ||
      ""
    ).trim();

  const includeRaw =
    requestUrl.searchParams.get("raw") ===
    "1";

  if (!matchId) {

    return json(
      {
        success: false,
        debug: "FEED_FRESHNESS",
        version:
          "V3_SCORE_CROSSCHECK",
        mode: "READ_ONLY",
        error: "MATCH_ID_REQUIRED",
        usage:
          "/debug-feed-freshness?matchId=FLASHSCORE_MATCH_ID",
        raw_usage:
          "/debug-feed-freshness?matchId=FLASHSCORE_MATCH_ID&raw=1"
      },
      400,
      corsHeaders
    );
  }

  const started =
    Date.now();

  const [
    main,
    summary,
    statistics
  ] =
    await Promise.all([
      fetchDebugEndpoint(
        mainUrl,
        headers
      ),

      fetchDebugEndpoint(
        `https://www.flashscore.com/x/feed/df_sui_1_${encodeURIComponent(matchId)}`,
        headers
      ),

      fetchDebugEndpoint(
        `https://www.flashscore.com/x/feed/df_st_1_${encodeURIComponent(matchId)}`,
        headers
      )
    ]);

  const parsedMain =
    parse(main.text);

  const mainMatch =
    parsedMain.find(
      item =>
        String(item?.id || "") ===
        matchId
    ) || null;

  const mainRaw =
    mainMatch?.raw ||
    {};

  const mainScore = {

    home:
      toNumber(
        mainRaw.AG
      ),

    away:
      toNumber(
        mainRaw.AH
      )
  };

  const summaryEvents =
    parseSummaryEvents(
      summary.text
    );

  const goalEvents =
    summaryEvents.events.filter(
      isLikelyGoalEvent
    );

  let latestGoal =
    null;

  for (const goal of goalEvents) {

    if (
      goal.score &&
      valid(goal.score.home) &&
      valid(goal.score.away)
    ) {

      latestGoal =
        goal;
    }
  }

  const summaryLatestScore =
    latestGoal
      ? {
          home:
            latestGoal.score.home,
          away:
            latestGoal.score.away
        }
      : null;

  const mainTotal =
    (
      valid(mainScore.home)
        ? mainScore.home
        : 0
    ) +
    (
      valid(mainScore.away)
        ? mainScore.away
        : 0
    );

  const summaryTotal =
    summaryLatestScore
      ? summaryLatestScore.home +
        summaryLatestScore.away
      : 0;

  const scoreMismatch =
    Boolean(
      summaryLatestScore &&
      (
        summaryLatestScore.home !==
          mainScore.home ||
        summaryLatestScore.away !==
          mainScore.away
      )
    );

  const mainFeedBehind =
    Boolean(
      summaryLatestScore &&
      summaryTotal > mainTotal
    );

  const comparison = {

    main_match_found:
      Boolean(mainMatch),

    main_score:
      mainScore,

    summary_latest_score:
      summaryLatestScore,

    summary_goal_count:
      goalEvents.length,

    latest_goal_minute:
      latestGoal?.minute ||
      null,

    score_mismatch:
      scoreMismatch,

    main_feed_behind:
      mainFeedBehind,

    stale_main_suspected:
      mainFeedBehind
  };

  return json(
    {
      success: true,

      debug:
        "FEED_FRESHNESS",

      version:
        "V3_SCORE_CROSSCHECK",

      mode:
        "READ_ONLY",

      match_id:
        matchId,

      checked_at:
        new Date().toISOString(),

      processing_ms:
        Date.now() - started,

      main_feed: {

        endpoint:
          "f_1_0_3_en_1",

        http_status:
          main.status,

        response_ms:
          main.ms,

        length:
          main.text.length,

        match_found:
          Boolean(mainMatch),

        match:
          mainMatch
            ? `${mainRaw.AE || ""} - ${mainRaw.AF || ""}`
            : null,

        league:
          mainMatch?.league ||
          null,

        score:
          mainScore,

        raw_time_fields: {
          AB:
            mainRaw.AB ??
            null,
          AC:
            mainRaw.AC ??
            null,
          AO:
            mainRaw.AO ??
            null,
          BC:
            mainRaw.BC ??
            null,
          BD:
            mainRaw.BD ??
            null
        }
      },

      match_summary_events: {

        endpoint:
          `df_sui_1_${matchId}`,

        http_status:
          summary.status,

        response_ms:
          summary.ms,

        length:
          summary.text.length,

        parsed_event_count:
          summaryEvents.events.length,

        likely_goal_count:
          goalEvents.length,

        latest_goal:
          latestGoal,

        goals:
          goalEvents.slice(
            0,
            20
          ),

        type_counts:
          summaryEvents.typeCounts,

        all_events:
          summaryEvents.events.slice(
            0,
            50
          )
      },

      match_statistics: {

        endpoint:
          `df_st_1_${matchId}`,

        http_status:
          statistics.status,

        response_ms:
          statistics.ms,

        length:
          statistics.text.length,

        parsed:
          buildDebugStatsSummary(
            statistics.text
          )
      },

      comparison,

      conclusion:
        mainFeedBehind
          ? "MAIN_FEED_SCORE_STALE"
          : scoreMismatch
            ? "SCORE_MISMATCH_REVIEW"
            : goalEvents.length > 0
              ? "SOURCES_AGREE_GOAL"
              : "NO_STALE_SCORE_DETECTED",

      raw:
        includeRaw
          ? {

              main_match_raw:
                mainMatch ||
                null,

              summary:
                limitDebugText(
                  summary.text,
                  30000
                ),

              statistics:
                limitDebugText(
                  statistics.text,
                  15000
                )
            }
          : undefined
    },
    200,
    corsHeaders
  );
}


// =====================================================
// DEBUG FETCH
// =====================================================

async function fetchDebugEndpoint(
  url,
  headers
) {

  const started =
    Date.now();

  try {

    const separator =
      url.includes("?")
        ? "&"
        : "?";

    const response =
      await fetch(
        `${url}${separator}_=${Date.now()}`,
        {
          headers,
          cache: "no-store"
        }
      );

    const text =
      await response.text();

    return {
      status:
        response.status,
      text,
      ms:
        Date.now() - started
    };

  } catch (error) {

    return {
      status:
        0,
      text:
        "",
      ms:
        Date.now() - started,
      error:
        error?.message ||
        String(error)
    };
  }
}


// =====================================================
// DEBUG STATS SUMMARY
// =====================================================

function buildDebugStatsSummary(
  text
) {

  const parsed =
    parseStatistics(
      String(text || "")
    );

  return {
    xg:
      parsed.xg,
    xgot:
      parsed.xgot,
    xa:
      parsed.xa,
    occurrences:
      parsed.occurrences,
    shots:
      parsed.stats?.shots ||
      null,
    shots_on_target:
      parsed.stats?.shots_on_target ||
      null,
    big_chances:
      parsed.stats?.big_chances ||
      null,
    corners:
      parsed.stats?.corners ||
      null
  };
}


// =====================================================
// HELPERS
// =====================================================

function valid(v) {

  return (
    typeof v === "number" &&
    Number.isFinite(v)
  );
}


function toNumber(v) {

  if (
    v === undefined ||
    v === null ||
    v === ""
  )
    return null;

  const n =
    Number(v);

  return Number.isFinite(n)
    ? n
    : null;
}


function round(
  v,
  decimals = 2
) {

  if (
    !Number.isFinite(v)
  )
    return 0;

  const p =
    Math.pow(
      10,
      decimals
    );

  return (
    Math.round(
      v * p
    ) / p
  );
}


function compactDebugRaw(
  raw
) {

  const out = {};

  for (
    const [
      key,
      value
    ] of Object.entries(
      raw || {}
    )
  ) {

    if (
      value !== "" &&
      value !== null &&
      value !== undefined
    ) {

      out[key] =
        value;
    }
  }

  return out;
}


function cleanDebugValue(
  value
) {

  const text =
    String(
      value ??
      ""
    ).trim();

  return text || null;
}


function limitDebugText(
  value,
  maxLength
) {

  const text =
    String(
      value ||
      ""
    );

  if (
    text.length <=
    maxLength
  ) {

    return text;
  }

  return (
    text.slice(
      0,
      maxLength
    ) +
    `\n...[TRUNCATED ${text.length - maxLength} chars]`
  );
}


// =====================================================
// JSON RESPONSE + CORS
// =====================================================

function json(
  data,
  status = 200,
  corsHeaders = {}
) {

  return new Response(

    JSON.stringify(
      data,
      null,
      2
    ),

    {

      status,

      headers: {

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store, no-cache, must-revalidate",

        "Pragma":
          "no-cache",

        "Expires":
          "0",

        ...corsHeaders
      }
    }
  );
}
