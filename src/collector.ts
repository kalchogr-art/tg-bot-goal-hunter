// ============================================================
// GOAL WATCH — COLLECTOR V1
// FLASHScore ONLY
//
// PURPOSE:
//   Collect ALL LIVE match data for Worker 2.
//
// INCLUDES:
//   - match ID
//   - league / tournament
//   - home / away
//   - LIVE status
//   - minute / seconds
//   - period
//   - score
//   - Flashscore statistics
//   - xG / xGOT / xA
//   - raw Flashscore fields
//
// DOES NOT INCLUDE:
//   - Hunter Score
//   - Attack Score
//   - Danger Index
//   - Goal Pressure
//   - signals
//   - ENTRY
//   - Tracker
//   - Telegram
// ============================================================

const MAIN_URL =
  "https://www.flashscore.com/x/feed/f_1_0_3_en_1";

const STAT_URL =
  "https://www.flashscore.com/x/feed/df_st_1_";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization"
};

const flashscoreHeaders = {
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


// ============================================================
// MAIN
// ============================================================

export default {

  async fetch(request: Request) {

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });

    }

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
      // 1. FLASHScore MAIN LIVE FEED
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

            collector:
              "COLLECTOR V1",

            source:
              "FLASHSCORE ONLY",

            stage:
              "main_feed",

            feed_status:
              feedResponse.status,

            feed_length:
              feedText.length,

            error:
              "Flashscore live feed failed"
          },
          503
        );

      }


      // ======================================================
      // 2. PARSE ALL MATCHES
      // ======================================================

      const parsedMatches =
        parseMainFeed(feedText);


      // ======================================================
      // 3. ALL LIVE MATCHES
      // AB = 2
      // ======================================================

      const liveMatches =
        parsedMatches.filter(
          match =>
            match.raw.AB === "2"
        );


      // ======================================================
      // 4. BUILD COLLECTOR OUTPUT
      // ======================================================

      const matches = [];


      // ------------------------------------------------------
      // IMPORTANT
      //
      // Collector V1 reads ALL LIVE matches.
      //
      // Statistics are requested for ALL LIVE matches.
      //
      // NO limit of 50.
      // NO Hunter filtering.
      // NO minute filtering.
      // ------------------------------------------------------

      for (
        const match of liveMatches
      ) {

        try {

          const r =
            match.raw;


          // ==================================================
          // BASIC MATCH INFORMATION
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
          //
          // AG = home
          // AH = away
          //
          // This is REAL MATCH SCORE.
          // It is NOT Hunter Score.
          // ==================================================

          const scoreHome =
            toNumberOrNull(r.AG);

          const scoreAway =
            toNumberOrNull(r.AH);


          const totalGoals =
            scoreHome !== null &&
            scoreAway !== null
              ? scoreHome + scoreAway
              : null;


          // ==================================================
          // TIME
          // Same time engine concept as V27
          // ==================================================

          const timeInfo =
            getMinuteInfo(r);


          // ==================================================
          // LEAGUE / TOURNAMENT
          //
          // Flashscore can expose tournament/category fields
          // under different feed keys depending on event.
          //
          // We preserve the raw values and expose the best
          // available human-readable fields.
          // ==================================================

          const league =
            getFirstValue(
              r,
              [
                "ZA",
                "ZB",
                "ZC",
                "ZD",
                "ZE",
                "ZG",
                "ZH"
              ]
            );

          const country =
            getFirstValue(
              r,
              [
                "ZJ",
                "ZK",
                "ZL"
              ]
            );


          // ==================================================
          // STATISTICS
          // ==================================================

          let statistics = {
            status:
              "NOT_REQUESTED",

            length:
              0,

            xg: {
              home: null as number | null,
              away: null as number | null
            },

            xgot: {
              home: null as number | null,
              away: null as number | null
            },

            xa: {
              home: null as number | null,
              away: null as number | null
            },

            stats:
              {} as Record<string, any>,

            occurrences:
              0
          };


          // --------------------------------------------------
          // Request Flashscore statistics.
          //
          // This is collection only.
          // No scoring logic is executed.
          // --------------------------------------------------

          const statResponse =
            await fetch(
              STAT_URL + match.id,
              {
                headers:
                  flashscoreHeaders,

                cache:
                  "no-store"
              }
            );


          const statText =
            await statResponse.text();


          if (statResponse.ok) {

            const parsedStats =
              parseStatistics(
                statText
              );

            statistics = {
              status:
                "OK",

              length:
                statText.length,

              xg:
                parsedStats.xg,

              xgot:
                parsedStats.xgot,

              xa:
                parsedStats.xa,

              stats:
                parsedStats.stats,

              occurrences:
                parsedStats.occurrences
            };

          } else {

            statistics.status =
              `HTTP_${statResponse.status}`;

            statistics.length =
              statText.length;

          }


          // ==================================================
          // FINAL CLEAN MATCH OBJECT
          // ==================================================

          matches.push({

            id:
              match.id,

            league: {
              name:
                league,

              country:
                country
            },

            match:
              matchName,

            home,
            away,

            status:
              "LIVE",

            status_code:
              r.AB,

            time: {

              minute:
                timeInfo.minute,

              minute_display:
                timeInfo.display,

              period:
                timeInfo.period,

              source:
                timeInfo.source,

              debug:
                timeInfo.debug

            },

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

            statistics,

            // ------------------------------------------------
            // RAW DATA
            //
            // Kept for Worker 2 so we don't lose any
            // Flashscore information that may be needed later.
            // ------------------------------------------------

            raw:
              r

          });

        } catch (error) {

          // One bad match must NOT kill the whole collector.

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

      const statisticsOk =
        matches.filter(
          m =>
            m.statistics?.status ===
            "OK"
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

          url:
            MAIN_URL,

          status:
            feedResponse.status,

          length:
            feedText.length

        },

        totals: {

          parsed_matches:
            parsedMatches.length,

          live_matches:
            liveMatches.length,

          returned_matches:
            matches.length,

          statistics_ok:
            statisticsOk

        },

        matches

      });

    } catch (error) {

      return json(
        {
          success:
            false,

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
//
// Flashscore feed:
//   ¬ = field separator
//   ÷ = key/value separator
//   AA = event/match ID
//
// This is the same parser model used by V27.
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


  const fields =
    text.split("\xAC");


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
  // Remove duplicate match IDs
  // ----------------------------------------------------------

  const seen =
    new Set<string>();


  return result.filter(
    match => {

      if (
        !match.id
      )
        return false;


      if (
        seen.has(match.id)
      )
        return false;


      seen.add(
        match.id
      );


      return true;

    }
  );

}


// ============================================================
// STATISTICS PARSER
// ============================================================
//
// Same Flashscore statistics structure as V27.
//
// SE = section
// SG = statistic name
// SH = home value
// SI = away value
// ============================================================

function parseStatistics(
  text: string
) {

  const result = {

    xg: {
      home: null as number | null,
      away: null as number | null
    },

    xgot: {
      home: null as number | null,
      away: null as number | null
    },

    xa: {
      home: null as number | null,
      away: null as number | null
    },

    stats:
      {} as Record<string, any>,

    occurrences:
      0
  };


  const fields =
    text.split("\xAC");


  let section =
    "match";


  let currentStat:
    string | null = null;


  let home:
    number | null = null;


  let away:
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
        v.includes("1st")
      ) {

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


    // --------------------------------------------------------
    // STAT NAME
    // --------------------------------------------------------

    if (
      key === "SG"
    ) {

      currentStat =
        normalizeStat(
          value
        );

      home =
        null;

      away =
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

      away =
        parseStatValue(
          value
        );


      if (
        currentStat &&
        home !== null &&
        away !== null
      ) {

        result.occurrences++;


        // ----------------------------------------------------
        // IMPORTANT:
        // We store raw normalized statistics.
        // We DO NOT calculate a score.
        // ----------------------------------------------------

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
            `${section}.${currentStat}`
          ] = {

            found:
              true,

            home,
            away

          };

        }

      }


      continue;

    }

  }


  return result;

}


// ============================================================
// STAT NAME NORMALIZATION
// ============================================================

function normalizeStat(
  value: string
) {

  const v =
    value
      .toLowerCase()
      .trim();


  if (
    v.includes(
      "expected goals"
    ) ||
    v === "xg"
  ) {

    return "xg";

  }


  if (
    v.includes(
      "xg on target"
    ) ||
    v.includes(
      "xgot"
    )
  ) {

    return "xgot";

  }


  if (
    v.includes(
      "expected assists"
    ) ||
    v === "xa"
  ) {

    return "xa";

  }


  if (
    v ===
    "ball possession"
  ) {

    return "possession";

  }


  if (
    v ===
    "total shots"
  ) {

    return "shots";

  }


  if (
    v ===
    "shots on target"
  ) {

    return "shots_on_target";

  }


  if (
    v ===
    "shots off target"
  ) {

    return "shots_off_target";

  }


  if (
    v ===
    "blocked shots"
  ) {

    return "blocked_shots";

  }


  if (
    v.includes(
      "inside the box"
    )
  ) {

    return "shots_inside_box";

  }


  if (
    v.includes(
      "outside the box"
    )
  ) {

    return "shots_outside_box";

  }


  if (
    v ===
    "big chances"
  ) {

    return "big_chances";

  }


  if (
    v ===
    "corner kicks"
  ) {

    return "corners";

  }


  if (
    v.includes(
      "touches in opposition box"
    )
  ) {

    return "touches_in_opposition_box";

  }


  if (
    v ===
    "hit the woodwork"
  ) {

    return "hit_the_woodwork";

  }


  if (
    v ===
    "goalkeeper saves"
  ) {

    return "goalkeeper_saves";

  }


  if (
    v.includes(
      "xgot faced"
    )
  ) {

    return "xgot_faced";

  }


  if (
    v.includes(
      "goals prevented"
    )
  ) {

    return "goals_prevented";

  }


  return v
    .replace(
      /\s+/g,
      "_"
    )
    .replace(
      /[()]/g,
      ""
    );

}


// ============================================================
// STAT VALUE
// ============================================================

function parseStatValue(
  value: string
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }


  if (
    value.includes("%")
  ) {

    const n =
      parseFloat(
        value.replace(
          "%",
          ""
        )
      );


    return isNaN(n)
      ? null
      : n;

  }


  const n =
    parseFloat(
      value
    );


  return isNaN(n)
    ? null
    : n;

}


// ============================================================
// TIME ENGINE
// Same logic used by V27.
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
    toNumberOrNull(
      r.AD
    );


  const AO =
    toNumberOrNull(
      r.AO
    );


  const BC =
    toNumberOrNull(
      r.BC
    );


  const BD =
    toNumberOrNull(
      r.BD
    );


  // ========================================================
  // 2ND HALF
  // ========================================================

  if (
    AC === "13" &&
    AO !== null
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
          : `${minute}:${String(
              sec
            ).padStart(2, "0")}`,

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


  // ========================================================
  // 1ST HALF
  // ========================================================

  if (
    AC === "12" &&
    AO !== null
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
        `${minute}:${String(
          sec
        ).padStart(2, "0")}`,

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


  // ========================================================
  // FALLBACK
  // ========================================================

  if (
    BC !== null
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


// ============================================================
// HELPERS
// ============================================================

function toNumberOrNull(
  value: unknown
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }


  const n =
    Number(value);


  return Number.isFinite(n)
    ? n
    : null;

}


function cleanText(
  value: unknown
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)
    .trim();

}


function getFirstValue(
  raw: Record<string, string>,
  keys: string[]
) {

  for (
    const key of keys
  ) {

    const value =
      raw[key];


    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {

      return cleanText(
        value
      );

    }

  }


  return null;

}


// ============================================================
// JSON RESPONSE
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
