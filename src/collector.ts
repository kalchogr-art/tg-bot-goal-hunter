// ============================================================
// GOAL WATCH — COLLECTOR V1
// ============================================================
// FLASHscore ONLY
//
// COLLECTOR = DATA ONLY
//
// ВРЪЩА:
// - всички LIVE мачове
// - league / country (best effort)
// - home / away
// - minute / seconds / period
// - score
// - xG
// - xG share
// - xGOT
// - xA
// - key statistics
// - data quality
// - raw Flashscore data
//
// НЕ ВРЪЩА:
// - Hunter Score
// - Attack Score
// - Danger Index
// - Goal Pressure
// - Goal Signal
// - ENTRY
// - Tracker
// - Telegram
// ============================================================

const MAIN_URL =
  "https://www.flashscore.com/x/feed/f_1_0_3_en_1";

const STAT_URL =
  "https://www.flashscore.com/x/feed/df_st_1_";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const flashscoreHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.flashscore.com/",
  "Origin": "https://www.flashscore.com",
  "x-fsign": "SW9D1eZo",
  "Cache-Control": "no-cache"
};


// ============================================================
// MAIN
// ============================================================

export default {

  async fetch(request: Request) {

    // --------------------------------------------------------
    // OPTIONS
    // --------------------------------------------------------

    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });

    }


    // --------------------------------------------------------
    // METHOD
    // --------------------------------------------------------

    if (
      request.method !== "GET" &&
      request.method !== "HEAD"
    ) {

      return json(
        {
          success: false,
          error: "Method not allowed"
        },
        405
      );

    }


    try {

      // ======================================================
      // 1. MAIN FLASHSCORE FEED
      // ======================================================

      const feedResponse = await fetch(
        MAIN_URL + "?_=" + Date.now(),
        {
          headers: flashscoreHeaders,
          cache: "no-store"
        }
      );


      const feedText =
        await feedResponse.text();


      if (!feedResponse.ok) {

        return json(
          {
            success: false,
            collector: "COLLECTOR V1",
            source: "FLASHSCORE ONLY",
            feed: {
              status: feedResponse.status,
              length: feedText.length
            },
            error:
              "Flashscore feed request failed"
          },
          503
        );

      }


      // ======================================================
      // 2. PARSE ALL EVENTS
      // ======================================================

      const parsed =
        parseMainFeed(feedText);


      // ======================================================
      // 3. LIVE EVENTS
      // AB = 2
      //
      // НЯМАМЕ:
      // - minute filter
      // - 0:0 filter
      // - Hunter filter
      // ======================================================

      const live =
        parsed.filter(
          m => m.raw.AB === "2"
        );


      // ======================================================
      // 4. BUILD ALL LIVE MATCHES
      // ======================================================

      const matches = [];


      for (
        const match of live
      ) {

        try {

          const r =
            match.raw;


          // ==================================================
          // TEAMS
          // ==================================================

          const home =
            cleanText(
              r.AE
            );


          const away =
            cleanText(
              r.AF
            );


          const matchName =
            `${home} - ${away}`;


          // ==================================================
          // SCORE
          // ==================================================

          const scoreHome =
            numberOrNull(
              r.AG
            );


          const scoreAway =
            numberOrNull(
              r.AH
            );


          const totalGoals =
            scoreHome !== null &&
            scoreAway !== null
              ? scoreHome + scoreAway
              : null;


          // ==================================================
          // TIME
          // ==================================================

          const time =
            getMinuteInfo(r);


          // ==================================================
          // LEAGUE
          //
          // Best effort.
          // Ако не бъде намерено правилно,
          // raw остава наличен за следващата корекция.
          // ==================================================

          const league =
            getLeague(r);


          // ==================================================
          // STATISTICS
          // ==================================================

          const statistics =
            await getStatistics(
              match.id
            );


          // ==================================================
          // FINAL V27-STYLE OBJECT
          // ==================================================

          matches.push({

            id:
              match.id,

            match:
              matchName,

            league:
              league.name,

            country:
              league.country,

            home,
            away,

            status:
              "LIVE",

            status_code:
              r.AB,

            minute:
              time.minute,

            minute_display:
              time.minute_display,

            period:
              time.period,

            minute_source:
              time.minute_source,

            time_debug:
              time.time_debug,

            score: {

              home:
                scoreHome,

              away:
                scoreAway,

              total_goals:
                totalGoals,

              zero_zero:
                scoreHome === 0 &&
                scoreAway === 0

            },

            xg:
              statistics.xg,

            xg_share:
              statistics.xg_share,

            xgot:
              statistics.xgot,

            xa:
              statistics.xa,

            key_stats:
              statistics.key_stats,

            data_quality:
              statistics.data_quality,

            raw:
              r

          });


        } catch (error) {

          // --------------------------------------------------
          // Един счупен мач НЕ спира Collector-а.
          // --------------------------------------------------

          matches.push({

            id:
              match.id,

            error:
              error instanceof Error
                ? error.message
                : String(error),

            raw:
              match.raw

          });

        }

      }


      // ======================================================
      // 5. SUMMARY
      // ======================================================

      const matchesWithXg =
        matches.filter(
          m =>
            m.xg &&
            (
              m.xg.home !== null ||
              m.xg.away !== null
            )
        ).length;


      const zeroZero =
        matches.filter(
          m =>
            m.score?.zero_zero === true
        ).length;


      return json({

        success:
          true,

        collector:
          "COLLECTOR V1",

        source:
          "FLASHSCORE ONLY",

        timestamp:
          new Date().toISOString(),

        feed: {

          status:
            feedResponse.status,

          total_matches:
            parsed.length,

          live_matches:
            live.length,

          matches_returned:
            matches.length,

          matches_with_xg:
            matchesWithXg,

          zero_zero_matches:
            zeroZero,

          signals_found:
            0

        },

        matches

      });


    } catch (error) {

      return json(
        {
          success: false,

          collector:
            "COLLECTOR V1",

          source:
            "FLASHSCORE ONLY",

          error:
            error instanceof Error
              ? error.message
              : String(error)
        },
        500
      );

    }

  }

};


// ============================================================
// MAIN FEED PARSER
// ============================================================

function parseMainFeed(
  text: string
) {

  const result: Array<{
    id: string;
    raw: Record<string, string>;
  }> = [];


  let current:
    {
      id: string;
      raw: Record<string, string>;
    }
    | null = null;


  for (
    const fieldRaw of text.split("\xAC")
  ) {

    if (!fieldRaw)
      continue;


    const field =
      fieldRaw.replace(
        /^~/,
        ""
      );


    const separator =
      field.indexOf("\xF7");


    if (
      separator === -1
    )
      continue;


    const key =
      field.slice(
        0,
        separator
      );


    const value =
      field.slice(
        separator + 1
      );


    if (
      key === "AA"
    ) {

      if (current) {

        result.push(
          current
        );

      }


      current = {

        id:
          value,

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


  if (current) {

    result.push(
      current
    );

  }


  // ----------------------------------------------------------
  // REMOVE DUPLICATES
  // ----------------------------------------------------------

  const seen =
    new Set<string>();


  return result.filter(
    item => {

      if (!item.id)
        return false;


      if (
        seen.has(item.id)
      )
        return false;


      seen.add(
        item.id
      );


      return true;

    }
  );

}


// ============================================================
// STATISTICS
// ============================================================

async function getStatistics(
  matchId: string
) {

  const empty =
    createEmptyStatistics();


  try {

    const response =
      await fetch(
        STAT_URL + matchId,
        {
          headers:
            flashscoreHeaders,

          cache:
            "no-store"
        }
      );


    const text =
      await response.text();


    if (!response.ok) {

      empty.data_quality.statistics_status =
        response.status;

      empty.data_quality.statistics_length =
        text.length;

      return empty;

    }


    const parsed =
      parseStatistics(
        text
      );


    parsed.data_quality.statistics_status =
      response.status;

    parsed.data_quality.statistics_length =
      text.length;


    return parsed;


  } catch {

    return empty;

  }

}


// ============================================================
// EMPTY STATISTICS
// ============================================================

function createEmptyStatistics() {

  return {

    xg: {
      home: null,
      away: null,
      total: null
    },

    xg_share: {
      found: false,
      home: null,
      away: null
    },

    xgot: {
      home: null,
      away: null,
      total: null
    },

    xa: {
      home: null,
      away: null,
      total: null
    },

    key_stats: {

      possession:
        emptyStat(),

      shots:
        emptyStat(),

      shots_on_target:
        emptyStat(),

      shots_off_target:
        emptyStat(),

      blocked_shots:
        emptyStat(),

      shots_inside_box:
        emptyStat(),

      shots_outside_box:
        emptyStat(),

      big_chances:
        emptyStat(),

      corners:
        emptyStat(),

      touches_in_opposition_box:
        emptyStat(),

      hit_the_woodwork:
        emptyStat(),

      goalkeeper_saves:
        emptyStat(),

      xgot_faced:
        emptyStat(),

      goals_prevented:
        emptyStat()

    },

    data_quality: {

      statistics_status:
        0,

      statistics_length:
        0,

      xg_found:
        false,

      xgot_found:
        false,

      xa_found:
        false,

      xg_required:
        false,

      signal_can_work_without_xg:
        true,

      occurrences:
        0

    }

  };

}


function emptyStat() {

  return {

    found:
      false,

    home:
      null,

    away:
      null,

    total:
      0

  };

}


// ============================================================
// STATISTICS PARSER
// ============================================================

function parseStatistics(
  text: string
) {

  const result =
    createEmptyStatistics();


  const fields =
    text.split("\xAC");


  let section =
    "match";


  let statName:
    string | null = null;


  let home:
    number | null = null;


  for (
    const rawField of fields
  ) {

    if (!rawField)
      continue;


    const field =
      rawField.replace(
        /^~/,
        ""
      );


    const separator =
      field.indexOf("\xF7");


    if (
      separator === -1
    )
      continue;


    const key =
      field.slice(
        0,
        separator
      );


    const value =
      field.slice(
        separator + 1
      );


    // --------------------------------------------------------
    // SECTION
    // --------------------------------------------------------

    if (
      key === "SE"
    ) {

      const v =
        value
          .toLowerCase()
          .trim();


      if (
        v.includes("1st") ||
        v.includes("first")
      ) {

        section =
          "first_half";

      } else if (
        v.includes("2nd") ||
        v.includes("second")
      ) {

        section =
          "second_half";

      } else {

        section =
          "match";

      }


      continue;

    }


    // --------------------------------------------------------
    // STAT NAME
    // --------------------------------------------------------

    if (
      key === "SG"
    ) {

      statName =
        normalizeStat(
          value
        );

      home =
        null;

      continue;

    }


    // --------------------------------------------------------
    // HOME
    // --------------------------------------------------------

    if (
      key === "SH"
    ) {

      home =
        parseStatValue(
          value
        );

      continue;

    }


    // --------------------------------------------------------
    // AWAY
    // --------------------------------------------------------

    if (
      key === "SI"
    ) {

      const away =
        parseStatValue(
          value
        );


      if (
        statName &&
        home !== null &&
        away !== null
      ) {

        result.data_quality.occurrences++;


        const total =
          home + away;


        // ----------------------------------------------------
        // XG
        // ----------------------------------------------------

        if (
          statName === "xg"
        ) {

          result.xg = {

            home,

            away,

            total

          };

          result.data_quality.xg_found =
            true;

        }


        // ----------------------------------------------------
        // XGOT
        // ----------------------------------------------------

        else if (
          statName === "xgot"
        ) {

          result.xgot = {

            home,

            away,

            total

          };

          result.data_quality.xgot_found =
            true;

        }


        // ----------------------------------------------------
        // XA
        // ----------------------------------------------------

        else if (
          statName === "xa"
        ) {

          result.xa = {

            home,

            away,

            total

          };

          result.data_quality.xa_found =
            true;

        }


        // ----------------------------------------------------
        // XG SHARE
        // ----------------------------------------------------

        else if (
          statName === "xg_share"
        ) {

          result.xg_share = {

            found:
              true,

            home,

            away

          };

        }


        // ----------------------------------------------------
        // KEY STATISTICS
        // ----------------------------------------------------

        else {

          const key =
            keyStatName(
              statName
            );


          if (
            key &&
            key in result.key_stats
          ) {

            result.key_stats[key] = {

              found:
                true,

              home,

              away,

              total

            };

          }

        }

      }

    }

  }


  return result;

}


// ============================================================
// STAT NAME NORMALIZER
// ============================================================

function normalizeStat(
  value: string
) {

  const v =
    value
      .toLowerCase()
      .trim();


  if (
    v === "xg" ||
    v.includes("expected goals")
  )
    return "xg";


  if (
    v === "xgot" ||
    v.includes("xg on target") ||
    v.includes("expected goals on target")
  )
    return "xgot";


  if (
    v === "xa" ||
    v.includes("expected assists")
  )
    return "xa";


  if (
    v.includes("xg share") ||
    v.includes("expected goals share")
  )
    return "xg_share";


  return v
    .replace(
      /\s+/g,
      "_"
    )
    .replace(
      /[()%]/g,
      ""
    );

}


// ============================================================
// KEY STAT NORMALIZER
// ============================================================

function keyStatName(
  name: string
) {

  const v =
    name.toLowerCase();


  if (
    v.includes("possession")
  )
    return "possession";


  if (
    v === "shots" ||
    v.includes("total shots")
  )
    return "shots";


  if (
    v.includes("shots on target")
  )
    return "shots_on_target";


  if (
    v.includes("shots off target")
  )
    return "shots_off_target";


  if (
    v.includes("blocked shots")
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
    v.includes("big chances")
  )
    return "big_chances";


  if (
    v.includes("corner")
  )
    return "corners";


  if (
    v.includes("touches in opposition box")
  )
    return "touches_in_opposition_box";


  if (
    v.includes("woodwork")
  )
    return "hit_the_woodwork";


  if (
    v.includes("goalkeeper saves") ||
    v.includes("goalkeeper save")
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


  return null;

}


// ============================================================
// STAT VALUE
// ============================================================

function parseStatValue(
  value: string
) {

  if (
    !value
  )
    return null;


  const clean =
    value
      .replace(
        "%",
        ""
      )
      .replace(
        ",",
        "."
      );


  const n =
    parseFloat(
      clean
    );


  return Number.isFinite(n)
    ? n
    : null;

}


// ============================================================
// TIME ENGINE
// ============================================================

function getMinuteInfo(
  r: Record<string, string>
) {

  const now =
    Math.floor(
      Date.now() / 1000
    );


  const AC =
    r.AC;


  const AD =
    numberOrNull(
      r.AD
    );


  const AO =
    numberOrNull(
      r.AO
    );


  const BC =
    numberOrNull(
      r.BC
    );


  const BD =
    numberOrNull(
      r.BD
    );


  // ----------------------------------------------------------
  // 1ST HALF
  // ----------------------------------------------------------

  if (
    AC === "12" &&
    AO !== null
  ) {

    const elapsed =
      Math.max(
        0,
        now - AO
      );


    const minute =
      Math.floor(
        elapsed / 60
      );


    const seconds =
      elapsed % 60;


    return {

      minute,

      minute_display:
        `${minute}:${String(
          seconds
        ).padStart(
          2,
          "0"
        )}`,

      period:
        "1H",

      minute_source:
        "AO_1H",

      time_debug: {

        AC,
        AD,
        AO,
        BC,
        BD,

        now_unix:
          now,

        now_minus_AO:
          elapsed

      }

    };

  }


  // ----------------------------------------------------------
  // 2ND HALF
  // ----------------------------------------------------------

  if (
    AC === "13" &&
    AO !== null
  ) {

    const elapsed =
      Math.max(
        0,
        now - AO
      );


    const minute =
      45 +
      Math.floor(
        elapsed / 60
      );


    const seconds =
      elapsed % 60;


    return {

      minute,

      minute_display:
        minute >= 90
          ? `90+${Math.max(
              0,
              minute - 90
            )}`
          : `${minute}:${String(
              seconds
            ).padStart(
              2,
              "0"
            )}`,

      period:
        "2H",

      minute_source:
        "AO_2H",

      time_debug: {

        AC,
        AD,
        AO,
        BC,
        BD,

        now_unix:
          now,

        now_minus_AO:
          elapsed

      }

    };

  }


  // ----------------------------------------------------------
  // FALLBACK
  // ----------------------------------------------------------

  if (
    BC !== null
  ) {

    return {

      minute:
        BC,

      minute_display:
        String(
          BC
        ),

      period:
        "2H",

      minute_source:
        "BC_FALLBACK",

      time_debug: {

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

    minute_display:
      "0",

    period:
      "UNKNOWN",

    minute_source:
      "NONE",

    time_debug: {

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


// ============================================================
// LEAGUE
// ============================================================
//
// Best effort for now.
// Ако Flashscore feed използва друг key,
// raw данните остават и го коригираме после.
// ============================================================

function getLeague(
  r: Record<string, string>
) {

  const name =
    firstValue(
      r,
      [
        "ZA",
        "ZB",
        "ZC",
        "ZD",
        "ZE",
        "ZG",
        "ZH",
        "ZI"
      ]
    );


  const country =
    firstValue(
      r,
      [
        "ZJ",
        "ZK",
        "ZL",
        "ZM"
      ]
    );


  return {

    name:
      name || null,

    country:
      country || null

  };

}


// ============================================================
// HELPERS
// ============================================================

function firstValue(
  r: Record<string, string>,
  keys: string[]
) {

  for (
    const key of keys
  ) {

    if (
      r[key] !== undefined &&
      r[key] !== null &&
      r[key] !== ""
    ) {

      return cleanText(
        r[key]
      );

    }

  }


  return null;

}


function numberOrNull(
  value: unknown
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return null;

  }


  const n =
    Number(
      value
    );


  return Number.isFinite(n)
    ? n
    : null;

}


function cleanText(
  value: unknown
) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";

  }


  return String(
    value
  ).trim();

}


// ============================================================
// JSON
// ============================================================

function json(
  data: unknown,
  status = 200
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

        ...corsHeaders,

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store, no-cache, must-revalidate",

        "Pragma":
          "no-cache",

        "Expires":
          "0"

      }

    }
  );

            }
