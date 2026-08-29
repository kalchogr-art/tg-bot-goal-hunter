export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/debug-feed") {

      const target =
        "https://www.flashscore.com/x/feed/f_1_0_3_en_1?_=" +
        Date.now();

      try {

        const response = await fetch(target, {
          method: "GET",

          headers: {
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
          }
        });

        const text =
          await response.text();

        return new Response(
          JSON.stringify(
            {
              success: true,

              target,

              http_status:
                response.status,

              content_type:
                response.headers.get(
                  "content-type"
                ),

              content_length:
                text.length,

              first_1000_chars:
                text.substring(0, 1000)
            },
            null,
            2
          ),
          {
            status: 200,

            headers: {
              "Content-Type":
                "application/json; charset=utf-8",

              "Cache-Control":
                "no-store"
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
        worker:
          "GOAL WATCH — FLASHscore FEED TEST",
        endpoint:
          "/debug-feed"
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
