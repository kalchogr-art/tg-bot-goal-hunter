export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // ========================================================
    // TEMP FLASHscore DIAGNOSTIC v1
    // ========================================================

    if (url.pathname === "/debug-flashscore") {

      const target =
        "https://www.flashscore.com/";

      try {

        const response = await fetch(target, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language":
              "en-US,en;q=0.9",
            "Cache-Control":
              "no-cache"
          }
        });

        const body =
          await response.text();

        return new Response(
          JSON.stringify({
            success: true,

            target,

            http_status:
              response.status,

            content_type:
              response.headers.get(
                "content-type"
              ),

            content_length:
              body.length,

            final_url:
              response.url,

            first_500_chars:
              body.substring(0, 500)

          }, null, 2),
          {
            status: 200,

            headers: {
              "content-type":
                "application/json; charset=utf-8"
            }
          }
        );

      } catch (error) {

        return new Response(
          JSON.stringify({
            success: false,

            error:
              error?.message ||
              String(error)

          }, null, 2),
          {
            status: 500,

            headers: {
              "content-type":
                "application/json; charset=utf-8"
            }
          }
        );

      }
    }

    // ========================================================
    // EXISTING WORKER CODE BELOW
    // ========================================================

    // ТУК ОСТАВЯШ СТАРИЯ worker код
