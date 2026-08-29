// ============================================================
// GOAL WATCH — FLASHSCORE COLLECTOR V1
// ============================================================
// Flashscore -> Collector -> JSON
//
// V1 НЕ използва:
// - Hunter
// - Tracker
// - D1
// - Telegram
// - текущия сайт
//
// Цел:
// Само взима Flashscore feed и връща нормализирани мачове.
// ============================================================

const FLASHSCORE_URL =
  "https://www.flashscore.com/x/feed/f_1_0_3_en_1";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.flashscore.com/",
};

// ------------------------------------------------------------
// FIELD READER
// ------------------------------------------------------------

function getField(raw: string, key: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = raw.match(
    new RegExp(`(?:^|~)${escapedKey}÷([^~]*)`)
  );

  return match ? match[1] : "";
}

// ------------------------------------------------------------
// MATCH PARSER
// ------------------------------------------------------------

function parseMatch(raw: string) {
  const id = getField(raw, "AA");

  if (!id) return null;

  const home =
    getField(raw, "AE") ||
    getField(raw, "CX") ||
    getField(raw, "FH") ||
    "";

  const away =
    getField(raw, "AF") ||
    getField(raw, "FK") ||
    "";

  const homeScore =
    getField(raw, "AG") ||
    getField(raw, "AS") ||
    "0";

  const awayScore =
    getField(raw, "AH") ||
    getField(raw, "AZ") ||
    "0";

  const status = getField(raw, "AB");

  const timestamp =
    getField(raw, "AD") ||
    getField(raw, "ADE") ||
    "";

  const league = getField(raw, "ZA");

  const country =
    getField(raw, "ZY") ||
    getField(raw, "ZAF") ||
    "";

  return {
    id,
    home,
    away,

    home_score: homeScore,
    away_score: awayScore,

    status,
    timestamp,

    league,
    country
  };
}

// ------------------------------------------------------------
// FEED PARSER
// ------------------------------------------------------------

function parseFeed(feed: string) {
  const records = feed.split("~AA÷").slice(1);

  const matches = [];

  for (const record of records) {
    const raw = "AA÷" + record;

    const match = parseMatch(raw);

    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

// ------------------------------------------------------------
// JSON RESPONSE
// ------------------------------------------------------------

function json(
  data: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        "Access-Control-Allow-Origin":
          "*"
      }
    }
  );
}

// ------------------------------------------------------------
// WORKER
// ------------------------------------------------------------

export default {

  async fetch(
    request: Request
  ): Promise<Response> {

    const url =
      new URL(request.url);

    // --------------------------------------------------------
    // HEALTH
    // --------------------------------------------------------

    if (
      url.pathname === "/" ||
      url.pathname === "/health"
    ) {
      return json({
        success: true,
        worker:
          "goal-watch-collector",
        version: "V1",
        source:
          "FLASHSCORE ONLY",
        status:
          "online"
      });
    }

    // --------------------------------------------------------
    // MATCHES
    // --------------------------------------------------------

    if (
      url.pathname !== "/matches"
    ) {
      return json(
        {
          success: false,
          error: "Not found",

          available_endpoints: [
            "/",
            "/health",
            "/matches"
          ]
        },
        404
      );
    }

    try {

      // ------------------------------------------------------
      // GET FLASHSCORE FEED
      // ------------------------------------------------------

      const response =
        await fetch(
          FLASHSCORE_URL,
          {
            method: "GET",
            headers: HEADERS
          }
        );

      const feed =
        await response.text();

      // ------------------------------------------------------
      // FLASHCORE ERROR
      // ------------------------------------------------------

      if (!response.ok) {

        return json(
          {
            success: false,

            source:
              "FLASHSCORE ONLY",

            feed_status:
              response.status,

            feed_length:
              feed.length,

            error:
              "Flashscore feed request failed"
          },
          502
        );
      }

      // ------------------------------------------------------
      // PARSE
      // ------------------------------------------------------

      const matches =
        parseFeed(feed);

      // ------------------------------------------------------
      // LIVE
      // ------------------------------------------------------

      const liveMatches =
        matches.filter(
          match =>
            match.status === "1" ||
            match.status === "2"
        );

      // ------------------------------------------------------
      // 0:0
      // ------------------------------------------------------

      const zeroZeroMatches =
        liveMatches.filter(
          match =>
            match.home_score === "0" &&
            match.away_score === "0"
        );

      // ------------------------------------------------------
      // AB COUNTS
      // ------------------------------------------------------

      const abCounts:
        Record<string, number> = {};

      for (
        const match of matches
      ) {

        const status =
          match.status || "unknown";

        abCounts[status] =
          (abCounts[status] || 0) + 1;
      }

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      return json({

        success: true,

        worker:
          "goal-watch-collector",

        version:
          "V1",

        parser:
          "FLASHSCORE V1",

        source:
          "FLASHSCORE ONLY",

        timestamp:
          new Date().toISOString(),

        feed: {

          status:
            response.status,

          length:
            feed.length,

          total_matches:
            matches.length,

          live_matches:
            liveMatches.length,

          zero_zero_matches:
            zeroZeroMatches.length,

          ab_counts:
            abCounts
        },

        matches

      });

    } catch (error) {

      return json(
        {
          success: false,

          worker:
            "goal-watch-collector",

          version:
            "V1",

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
