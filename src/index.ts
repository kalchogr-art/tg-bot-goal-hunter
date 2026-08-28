// ============================================================
// GOAL WATCH — TRACKER DIAGNOSTIC TEST
// MINIMAL CPU VERSION
// ============================================================

export default {

  async fetch(request, env) {

    try {

      const result = {
        success: true,
        worker: "TRACKER",
        test: {}
      };


      // --------------------------------------------------------
      // 1. ENVIRONMENT
      // --------------------------------------------------------

      result.test.environment = {
        V27: !!env.V27,
        DB: !!env.DB,
        TELEGRAM_BOT_TOKEN: !!env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: !!env.TELEGRAM_CHAT_ID
      };


      // --------------------------------------------------------
      // 2. V27 TEST
      // --------------------------------------------------------

      if (env.V27) {

        const startV27 = Date.now();

        const response = await env.V27.fetch(
          new Request(
            "https://v27.internal/",
            {
              method: "GET",
              headers: {
                "Accept": "application/json"
              }
            }
          )
        );

        const text = await response.text();

        result.test.v27 = {
          ok: response.ok,
          status: response.status,
          milliseconds: Date.now() - startV27,
          response_length: text.length
        };

        if (response.ok) {

          try {

            const data = JSON.parse(text);

            result.test.v27.success =
              data?.success === true;

            result.test.v27.matches =
              Array.isArray(data?.matches)
                ? data.matches.length
                : 0;

          } catch {

            result.test.v27.json = false;

          }

        }

      } else {

        result.test.v27 = {
          skipped: true,
          reason: "V27 binding missing"
        };

      }


      // --------------------------------------------------------
      // 3. D1 TEST
      // --------------------------------------------------------

      if (env.DB) {

        const startDB = Date.now();

        const dbResult =
          await env.DB
            .prepare(
              `
              SELECT COUNT(*) AS total
              FROM hunter_signals
              `
            )
            .first();

        result.test.database = {
          ok: true,
          milliseconds: Date.now() - startDB,
          hunter_signals:
            Number(dbResult?.total || 0)
        };

      } else {

        result.test.database = {
          skipped: true,
          reason: "DB binding missing"
        };

      }


      // --------------------------------------------------------
      // 4. TELEGRAM TEST
      // --------------------------------------------------------

      if (
        env.TELEGRAM_BOT_TOKEN &&
        env.TELEGRAM_CHAT_ID
      ) {

        const startTelegram = Date.now();

        const telegramResponse =
          await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({

                chat_id:
                  env.TELEGRAM_CHAT_ID,

                text:
                  "🧪 GOAL WATCH\n\nTRACKER DIAGNOSTIC TEST OK"

              })

            }
          );


        const telegramText =
          await telegramResponse.text();


        result.test.telegram = {
          ok: telegramResponse.ok,
          status: telegramResponse.status,
          milliseconds:
            Date.now() - startTelegram
        };


        if (!telegramResponse.ok) {

          result.test.telegram.error =
            telegramText.substring(
              0,
              300
            );

        }

      } else {

        result.test.telegram = {
          skipped: true,
          reason:
            "Telegram secrets missing"
        };

      }


      // --------------------------------------------------------
      // FINAL
      // --------------------------------------------------------

      return new Response(
        JSON.stringify(
          result,
          null,
          2
        ),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            "Access-Control-Allow-Origin":
              "*"
          }
        }
      );

    } catch (error) {

      return new Response(
        JSON.stringify(
          {
            success: false,
            error:
              error?.message ||
              String(error)
          },
          null,
          2
        ),
        {
          status: 500,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            "Access-Control-Allow-Origin":
              "*"
          }
        }
      );

    }

  }

};
