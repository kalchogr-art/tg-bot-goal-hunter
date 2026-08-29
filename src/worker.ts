export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/debug-flashscore") {
      const target = "https://www.flashscore.com/";

      try {
        const response = await fetch(target, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache"
          }
        });

        const body = await response.text();

        const tests = [
          "pq_graphql",
          "event",
          "participant",
          "match",
          "live",
          "score",
          "football",
          "soccer",
          "0:0"
        ];

        const results = {};

        for (const term of tests) {
          const index = body
            .toLowerCase()
            .indexOf(term.toLowerCase());

          results[term] = {
            found: index !== -1,
            position: index
          };

          if (index !== -1) {
            results[term].sample =
              body.substring(
                Math.max(0, index - 200),
                Math.min(body.length, index + 500)
              );
          }
        }

        return new Response(
          JSON.stringify(
            {
              success: true,
              http_status: response.status,
              content_type:
                response.headers.get("content-type"),
              content_length: body.length,
              tests: results
            },
            null,
            2
          ),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json; charset=utf-8",
              "Cache-Control": "no-store"
            }
          }
        );

      } catch (error) {
        return new Response(
          JSON.stringify(
            {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : String(error)
            },
            null,
            2
          ),
          {
            status: 500,
            headers: {
              "Content-Type":
                "application/json; charset=utf-8"
            }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        worker: "FLASHscore DIAGNOSTIC V2",
        status: "ONLINE"
      }),
      {
        headers: {
          "Content-Type":
            "application/json; charset=utf-8"
        }
      }
    );
  }
};
