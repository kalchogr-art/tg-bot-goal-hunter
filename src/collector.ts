// ============================================================
// GOAL WATCH — FLASHSCORE COLLECTOR V1
// ============================================================
// FLASHscore ONLY
//
// This Worker:
//   1. Fetches the Flashscore live feed
//   2. Parses the raw Flashscore events
//   3. Returns normalized live-match data
//
// NO:
//   - Hunter
//   - Tracker
//   - D1
//   - Telegram
//   - Website logic
// ============================================================

const MAIN_URL =
  "https://www.flashscore.com/x/feed/f_1_0_3_en_1";

// ------------------------------------------------------------
// THESE ARE THE SAME FLASHscore REQUEST HEADERS USED BY
// THE WORKING V3 WORKER.
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// FLASHscore PARSER
// SAME FORMAT AS WORKING V3
// ------------------------------------------------------------

function parse(text: string) {

  const result: any[] = [];

  let current: any = null;

  // Flashscore:
  //
  // fields separated by U+00AC
  // key/value separated by U+00F7
  //
  // AA = event ID

  for (
    const field of text.split("\xAC")
  ) {

    if (!field) continue;

    const separator =
      field.indexOf("\xF7");

    if (separator === -1)
      continue;

    const key =
      field
        .slice(0, separator)
        .replace(/^~/, "");

    const value =
      field.slice(separator + 1);

    if (!key)
      continue;

    // --------------------------------------------------------
    // NEW EVENT
    // --------------------------------------------------------

    if (key === "AA") {

      if (current) {
        result.push(current);
      }

      current = {
        id: value,
        raw: {}
      };

      continue;
    }

    // --------------------------------------------------------
    // EVENT FIELD
    // --------------------------------------------------------

    if (current) {
      current.raw[key] = value;
    }
  }

  // Last event
  if (current) {
    result.push(current);
  }

  // ----------------------------------------------------------
  // REMOVE DUPLICATES
  // ----------------------------------------------------------

  const seen =
    new Set<string>();

  return result.filter(
    (match) => {

      if (!match?.id)
        return false;

      if (seen.has(match.id))
        return false;

      seen.add(match.id);

      return true;
    }
  );
}

// ------------------------------------------------------------
// JSON
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
          "*",

        "Access-Control-Allow-Methods":
          "GET, HEAD, OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type, Authorization"
      }
    }
  );
}

// ============================================================
// WORKER
// ============================================================

export default {

  async fetch(
    request: Request
  ): Promise<Response> {

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    if (
      request.method === "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,

          headers: {
            "Access-Control-Allow-Origin":
              "*",

            "Access-Control-Allow-Methods":
              "GET, HEAD, OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type, Authorization"
          }
        }
      );
    }

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

        version:
          "V1",

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

          error:
            "Not found",

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
      // EXACT WORKING FLASHscore REQUEST METHOD
      // ------------------------------------------------------

      const mainRes =
        await fetch(
          MAIN_URL +
            "?_=" +
            Date.now(),

          {
            headers,

            cache:
              "no-store"
          }
        );

      const mainText =
        await mainRes.text();

      // ------------------------------------------------------
      // FLASHscore ERROR
      // ------------------------------------------------------

      if (!mainRes.ok) {

        return json(
          {
            success: false,

            worker:
              "goal-watch-collector",

            version:
              "V1",

            source:
              "FLASHSCORE ONLY",

            stage:
              "live_feed",

            feed_status:
              mainRes.status,

            feed_length:
              mainText.length,

            message:
              "Flashscore live feed failed"
          },
          503
        );
      }

      // ------------------------------------------------------
      // PARSE
      // ------------------------------------------------------

      const matches =
        parse(mainText);

      // ------------------------------------------------------
      // LIVE = AB 2
      // SAME AS WORKING V3
      // ------------------------------------------------------

      const liveMatches =
        matches.filter(
          m =>
            m?.raw?.AB === "2"
        );

      // ------------------------------------------------------
      // 0:0 LIVE
      // ------------------------------------------------------

      const zeroZeroMatches =
        liveMatches.filter(
          m =>
            String(m?.raw?.AG ?? "0") === "0" &&
            String(m?.raw?.AH ?? "0") === "0"
        );

      // ------------------------------------------------------
      // AB COUNTS
      // ------------------------------------------------------

      const abCounts:
        Record<string, number> = {};

      for (
        const match of matches
      ) {

        const ab =
          match?.raw?.AB ??
          "MISSING";

        abCounts[ab] =
          (abCounts[ab] || 0) + 1;
      }

      // ------------------------------------------------------
      // RETURN
      // ------------------------------------------------------

      return json({

        success: true,

        worker:
          "goal-watch-collector",

        version:
          "V1",

        parser:
          "FLASHscore V3 parser",

        source:
          "FLASHSCORE ONLY",

        timestamp:
          new Date().
