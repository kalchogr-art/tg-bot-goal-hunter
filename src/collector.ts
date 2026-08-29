// ============================================================
// GOAL WATCH — COLLECTOR V1
// FLASHSCORE ONLY
// PURPOSE: collect ALL match data from the live feed.
// NO SCORE / NO SIGNALS / NO HUNTER / NO TRACKER / NO TELEGRAM
// ============================================================

const MAIN_URL =
  "https://www.flashscore.com/x/feed/f_1_0_3_en_1";

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

export default {
  async fetch(request: Request) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({
        success: false,
        error: "Method not allowed"
      }, 405);
    }

    try {

      // --------------------------------------------------------
      // FLASHSCORE LIVE FEED
      // --------------------------------------------------------

      const response = await fetch(
        MAIN_URL + "?_=" + Date.now(),
        {
          headers: flashscoreHeaders,
          cache: "no-store"
        }
      );

      const text = await response.text();

      if (!response.ok) {
        return json({
          success: false,
          source: "FLASHSCORE ONLY",
          stage: "live_feed",
          feed_status: response.status,
          feed_length: text.length,
          error: "Flashscore live feed failed"
        }, 503);
      }

      // --------------------------------------------------------
      // PARSE ALL EVENTS
      // --------------------------------------------------------

      const matches = parse(text);

      // --------------------------------------------------------
      // LIGHT SUMMARY ONLY
      // NO HUNTER / SCORE / SIGNAL CALCULATIONS
      // --------------------------------------------------------

      let liveMatches = 0;
      let finishedMatches = 0;
      let scheduledMatches = 0;

      for (const match of matches) {

        const status = match.raw?.AB;

        if (status === "2") {
          liveMatches++;
        } else if (status === "3") {
          finishedMatches++;
        } else if (status === "1") {
          scheduledMatches++;
        }
      }

      // --------------------------------------------------------
      // RETURN ALL MATCH DATA
      // --------------------------------------------------------

      return json({
        success: true,
        collector: "COLLECTOR V1",
        source: "FLASHSCORE ONLY",

        timestamp: new Date().toISOString(),

        feed: {
          url: MAIN_URL,
          status: response.status,
          length: text.length
        },

        totals: {
          matches: matches.length,
          live: liveMatches,
          scheduled: scheduledMatches,
          finished: finishedMatches
        },

        matches
      });

    } catch (error) {

      return json({
        success: false,
        collector: "COLLECTOR V1",
        source: "FLASHSCORE ONLY",
        error:
          error instanceof Error
            ? error.message
            : String(error)
      }, 500);
    }
  }
};


// ============================================================
// FLASHSCORE MAIN FEED PARSER
// ============================================================
// Feed format from WorkerV3:
// fields separated by U+00AC (¬)
// key/value separated by U+00F7 (÷)
// AA starts a new event.
// ============================================================

function parse(text: string) {

  const result: Array<{
    id: string;
    raw: Record<string, string>;
  }> = [];

  let current: {
    id: string;
    raw: Record<string, string>;
  } | null = null;

  for (const field of text.split("\xAC")) {

    if (!field) continue;

    const separator = field.indexOf("\xF7");

    if (separator === -1) continue;

    const key = field
      .slice(0, separator)
      .replace(/^~/, "");

    const value = field.slice(separator + 1);

    if (!key) continue;

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

    if (current) {
      current.raw[key] = value;
    }
  }

  if (current) {
    result.push(current);
  }

  // Remove duplicate event IDs exactly as in WorkerV3.

  const seen = new Set<string>();

  return result.filter((match) => {

    if (!match?.id) return false;

    if (seen.has(match.id)) {
      return false;
    }

    seen.add(match.id);

    return true;
  });
}


// ============================================================
// JSON RESPONSE
// ============================================================

function json(data: unknown, status = 200) {

  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,

      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        ...corsHeaders
      }
    }
  );
}
