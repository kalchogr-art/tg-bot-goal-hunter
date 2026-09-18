
// ============================================================
// GOAL WATCH — HUNTER TRACKER V6.7.10.13 SHADOW BET-READY ONLY
// 24/7 / LOW CPU / TELEGRAM / DAILY + MONTHLY STATS
// V27 + MATCHER + AI_MATCHER + BET_WORKER SERVICE BINDINGS
//
// V6.7.10.13:
// - /shadowstats shows ONLY 5–9 minute SHADOW signals that became BET READY.
// - Requires Cloudbet event id + real entry_odds > 1 + odds_available = 1.
// - Shadow research threshold remains Score >= 50.
// - IMPORTANT: restores the real 20–24 BET READY threshold to Score >= 65.
// - Tracker / GOAL resolver / /betstats are unchanged.
//
// V6.7.10.12:
// - SHADOW research 5–9 minute threshold lowered from Score 65 to Score 50.
// - Shadow signals continue through the SAME Cloudbet matcher + odds lookup as normal entries.
// - Saves cloudbet_event_id, entry_odds and odds_available in D1 when found.
// - AI-matched shadow events can also sync exact 1H O0.5 odds from Bet Worker preflight.
// - Still SHADOW ONLY: no normal ENTRY Telegram and never enters /betstats.
// - /shadowstats adds Score buckets 50–54, 55–59 and 60–64.
// - Real BET READY thresholds from minute 10 onward are unchanged.
//
// // V6.7.10.11:
// - Adds /shadowstats for experimental 5–9 minute SHADOW signals.
// - /shadowstats keeps 5–9 separate from real BET READY statistics.
// - /betstats adds a virtual bankroll simulation from 2026-09-15.
// - Starting bank: 100 EUR; flat stake: REPORT_STAKE (10 EUR).
// - Each day's closing bank becomes the next day's opening bank.
// - This is accounting/statistics only; no betting logic is changed.
//
// V6.7.10.9:
// - /betstats now shows ONLY clean data after the tracker fixes.
// - Clean period starts 2026-09-18 Europe/Sofia.
// - Removes old/pre-fix history from this command's calculations and output.
// - Keeps odds buckets, minute buckets, score buckets, P/L and ROI.
// - Does NOT delete old D1 rows; they are simply excluded from /betstats.
// - Tracker / GOAL resolver / HT reconciliation remain unchanged.
//
// V6.7.10.8:
// - /betstats keeps ALL BET READY history.
// - Adds CLEAN PERIOD starting from the working GOAL-resolver generation (V6.7.10.6).
// - CLEAN cutoff: 2026-09-18 00:00 Europe/Sofia.
// - Adds odds buckets with GOAL/NO GOAL, hit rate, average odds, P/L and ROI.
// - Does NOT alter Hunter, Tracker, GOAL/NO_GOAL resolution, Matcher, odds capture or Bet Worker.
//
// V6.7.10.7:
// - Adds Telegram command /betstats.
// - /betstats is persistent history: only signals that became genuinely BET READY.
// - Historical READY rule matches /entries: Cloudbet event id + real entry odds > 1.
// - Keeps Dynamic Score thresholds and excludes shadow 5–9.
// - Shows current-month totals, P/L/ROI, daily breakdown, minute groups and score groups.
// - Does NOT change /stats, /today, Hunter, Tracker, Matcher, odds capture or Bet Worker.
//
// V6.7.10.6:
// - CRITICAL FIX: restores the missing resolveTrackingGoal() function.
// - GOAL can now complete TRACKING -> GOAL atomically again.
// - Writes goal_minute, goal_after_minutes and result='GOAL HIT'.
// - Sends the Telegram GOAL HIT reply after the DB update.
// - Keeps V6.7.10.5 HT/2H reconciliation unchanged.
// - Keeps DF_SUI first-half guards and conservative missing-feed fallback.
// - Hunter / Matcher / AI Matcher / odds / Bet Worker / reports are unchanged.
//
// V6.7.10.5:
// - FIX: HT/2H 0:0 is no longer finalized immediately.
// - HT/2H enters a reconciliation grace window and remains TRACKING.
// - During the grace window every cron run re-checks DF_SUI for a confirmed 1H post-entry goal.
// - A score increase at official HT is still accepted as GOAL.
// - A generic score increase first seen in 2H is NOT used as proof of a 1H goal.
// - After the reconciliation window expires, NO_GOAL can be finalized only after repeated DF_SUI misses.
// - Explicit 1H DF_SUI context can accept direct 46/47/etc as first-half stoppage time.
// - Direct 46/47/etc without explicit 1H context remains rejected.
// - Missing-feed fallback remains conservative.
// - Hunter / Matcher / AI Matcher / odds / Bet Worker / reports are unchanged.
//
// V6.7.10.4:
// - FIX: V27 score increase is checked BEFORE HT/2H NO_GOAL resolution again.
// - Keeps the V6.7.10.3 DF_SUI first-half guard (45+N allowed; direct 46/47/50 rejected).
// - Prevents a valid 1H goal from being lost when DF_SUI temporarily misses the event.
// - HT/2H can close NO_GOAL only after DF_SUI + V27 score checks did not find a goal.
// - Missing-feed finalization is conservative again; it no longer creates fast false NO_GOALs.
// - Final DF_SUI check before missing-feed NO_GOAL is preserved.
// - Hunter / Matcher / AI Matcher / odds / Bet Worker / reports are unchanged.
//
// V6.7.10.3:
// - DF_SUI goals are accepted only when they belong to the FIRST HALF.
// - 45+N is valid first-half stoppage time; direct 46/47/50 from 2H is rejected.
// - 2H can never create a GOAL HIT unless a valid 1H DF_SUI goal was already found.
// - HT/2H closes 0:0 signals immediately as NO_GOAL.
// - Missing-feed fallback closes near expected HT after a short safety grace, not ~20 min later.
//
// V6.7.9.2:
// - Mechanical Matcher and AI Matcher start in parallel.
// - Secure Mechanical match wins immediately.
// - Mechanical failure waits for the already-running AI.
// - Telegram ENTRY is sent only after final matching result.
// - AI requires accepted=true, confidence>=0.90 and category_guard.ok=true.
// - AI 0% / rejected result never exposes an event_id.
// - Existing D1, odds callback, GOAL/NO_GOAL and reports are preserved.
// - Tracker does not place wagers.
//
// V6.7.7:
//
// 1. /preflight is called for EVERY Hunter ENTRY, even when old Matcher is UNMATCHED.
// 2. AI Matcher can recover the correct Cloudbet event_id.
// 3. Temporary AI resolution => WAITING, not false final NO.
// 4. Exact odds unavailable => WAITING; Bet Worker persistent queue owns retry.
// 5. Hunter remains stored and normal tracking/reporting is unchanged.
// 6. No real betting is enabled by Tracker.
//
// V6.7.6:
//
//
// 1. DAILY REPORT: OPEN count
// 2. DAILY REPORT: average real Cloudbet ENTRY odds
// 3. DAILY REPORT: break-even odds
// 4. DAILY REPORT: exact P/L from each resolved signal with known entry_odds
// 5. DAILY REPORT: ROI based only on resolved signals with known entry_odds
// 6. Minute groups include OPEN / Avg odds / Break-even / P/L / ROI
// 7. Missing odds are excluded from financial P/L/ROI, never invented
// 8. Hunter / Matcher / Bet Worker / tracking logic unchanged
//
// V6.7.5:
//
//
// 1. BET WORKER PREFLIGHT SENDS THE EXACT MATCHED EVENT DIRECTLY
// 2. USES POST /preflight INSTEAD OF GENERAL /run
// 3. FIXES EVENT_NOT_RETURNED_BY_BET_WORKER RACE CONDITION
// 4. DOES NOT WAIT FOR THE SAME ENTRY TO REAPPEAR THROUGH /entries
// 5. SAME Cloudbet event_id lock preserved
// 6. Hunter / Matcher / Telegram / D1 tracking logic otherwise unchanged
//
// V6.7.4:
//
// 1. REAL CLOUDBET ODDS AT HUNTER ENTRY
// 2. MATCHER V7.3.1 FAST_HUNTER
// 3. ONLY CONFIDENT_MATCH + secure_match=true
// 4. EXACT MARKET: 1H TOTAL GOALS OVER 0.5
// 5. ODDS READ DIRECTLY FROM MATCHER result.odds
// 6. ENTRY ODDS SAVED IN D1
// 7. ODDS FAILURE NEVER BLOCKS HUNTER ENTRY
// 8. HUNTER LOGIC: 5–9 SHADOW 50+; 10–19 60+; 20–24 65+; 25–29 70+; 30–34 75+; 35–42 80+
// 9. TRACKING / GOAL / NO_GOAL LOGIC PRESERVED
// 10. DAILY / MONTHLY / LEAGUE / HOUR STATS PRESERVED
// 11. TELEGRAM ENTRY SHOWS MATCHED / UNMATCHED
// 12. BET READY COMES ONLY FROM BET WORKER PREFLIGHT
// 13. BET WORKER FAILURE NEVER BLOCKS HUNTER ENTRY
// 14. STRICT MATCHER RETRY x2 AT ENTRY (750ms)
// 15. REAL MATCHER FAILURE REASON IN TELEGRAM
// 16. MATCHER DIAGNOSTICS PRESERVED IN MEMORY RESPONSE
//
// IMPORTANT:
//
// A match can have ONLY ONE Hunter ENTRY during its lifetime.
// created_at / updated_at / entry_time are stored as UTC ISO.
// Statistics are calculated according to Europe/Sofia.
// V6.7.10.0: 5–9 shadow 50+ tracking + dynamic live Score thresholds + odds-only filtered reports.
//
// V6.7.10.1 DF_SUI GOAL VERIFY:
// - TRACKING checks Flashscore df_sui for confirmed post-ENTRY goals.
// - A df_sui Goal can resolve GOAL HIT before the main V27 score catches up.
// - Only goals strictly AFTER entry_minute are accepted.
// - Disallowed/cancelled/VAR-overturned goals are ignored.
// - Existing V27 score increase remains as fallback.
// - Telegram GOAL HIT shows the confirmation source.
// - NO_GOAL/report/matcher/bet logic is unchanged.
// V6.7.10.2 ODDS REACTIVATION:
// - /internal/odds-found atomically saves event_id + entry_odds + odds_available=1.
// - /entries exposes READY_TO_BET immediately after that save.
// - No new matcher is called; the SAME locked Cloudbet event_id is preserved.
// - Adds top-level bet_ready / bet_status / entry_odds / cloudbet_event_id for consumers.
// - TRACKING remains the football result-tracking status; betting readiness is separate.
// ============================================================

const HUNTER_FROM = 5;
const HUNTER_TO = 42;
const HUNTER_MIN_SCORE = 60;

// V6.7.10.0 LIVE HUNTER FILTER
// 5–9   => 50+  SHADOW ONLY (D1 + odds + GOAL/NO_GOAL, no Telegram)
// WEEKEND BET READY TEST:
// 10–25 => 60+
// 26–34 => 90+
// 35–42 => 100
const SHADOW_FROM = 5;
const SHADOW_TO = 9;

const TIME_ZONE = "Europe/Sofia";
const DAILY_REPORT_WINDOW_MINUTES = 10;

// Theoretical reporting stake per signal. Change only this value if needed.
const REPORT_STAKE = 10;

// V6.7.10.1 — Flashscore event feed used only for TRACKING verification.
const FLASHSCORE_DF_SUI_BASE =
  "https://www.flashscore.com/x/feed/df_sui_1_";

const FLASHSCORE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.flashscore.com/",
  "Origin": "https://www.flashscore.com",
  "x-fsign": "SW9D1eZo",
  "Cache-Control": "no-cache"
};

// BET FILTER UPDATE — WEEKEND TEST: 10–25 Score >=60; 26–34 Score >=90; 35–42 Score 100. Same filter in /betstats.
// V6.7.10.0 REPORT FILTER
// 5–9 shadow rows NEVER enter the normal Telegram statistics.
// A normal row enters statistics only after a real entry odds is captured
// and only if it passes the same dynamic Score threshold used for live ENTRY.
const REPORT_ELIGIBLE_SQL = `
  entry_odds IS NOT NULL
  AND entry_odds > 1
  AND (
    (entry_minute BETWEEN 10 AND 25 AND hunter_score >= 60)
    OR (entry_minute BETWEEN 26 AND 34 AND hunter_score >= 90)
    OR (entry_minute BETWEEN 35 AND 42 AND hunter_score >= 100)
  )
`;

// /stats HUNTER HISTORY: keep the complete historical Hunter sample.
// Odds are NOT required here. Shadow 5–9 remains excluded from normal history.
const HUNTER_HISTORY_SQL = `
  entry_minute BETWEEN 10 AND 42
`;

// V6.7.10.7 — persistent historical BET READY population.
// This mirrors the READY state exposed by /entries, but works after a match
// leaves TRACKING because the locked Cloudbet event id and entry odds stay in D1.
const BET_READY_HISTORY_SQL = `
  cloudbet_event_id IS NOT NULL
  AND TRIM(CAST(cloudbet_event_id AS TEXT)) <> ''
  AND entry_odds IS NOT NULL
  AND entry_odds > 1
  AND odds_available = 1
  AND (
    (entry_minute BETWEEN 10 AND 25 AND hunter_score >= 60)
    OR (entry_minute BETWEEN 26 AND 34 AND hunter_score >= 90)
    OR (entry_minute BETWEEN 35 AND 42 AND hunter_score >= 100)
  )
`;

// /betstats clean analysis window requested by user.
// 2026-09-15 00:00 Europe/Sofia = 2026-09-14T21:00:00.000Z.
const BETSTATS_CLEAN_START_UTC = "2026-09-14T21:00:00.000Z";
const BETSTATS_CLEAN_START_LABEL = "2026-09-15";

// Virtual bankroll for clean BET READY research.
const BETSTATS_START_BANK = 100;



// V6.7.4 matcher retry: same strict matcher rules, no relaxed names.
const MATCHER_ENTRY_ATTEMPTS = 2;
const MATCHER_RETRY_DELAY_MS = 750;

const MIN_LEAGUE_RESOLVED = 5;
const LEAGUE_TOP_COUNT = 10;
const LEAGUE_BOTTOM_COUNT = 10;

const ENTRY_MINUTE_GROUPS = [
  { label: "10–19′", min: 10, max: 19 },
  { label: "20–24′", min: 20, max: 24 },
  { label: "25–29′", min: 25, max: 29 },
  { label: "30–34′", min: 30, max: 34 },
  { label: "35–42′", min: 35, max: 42 }
];

const ENTRY_HOUR_GROUPS = [
  { label: "00–05", min: 0, max: 5 },
  { label: "06–09", min: 6, max: 9 },
  { label: "10–13", min: 10, max: 13 },
  { label: "14–17", min: 14, max: 17 },
  { label: "18–21", min: 18, max: 21 },
  { label: "22–23", min: 22, max: 23 }
];

const SOFIA_FORMATTER =
  new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }
  );


// ============================================================
// MAIN
// ============================================================

export default {

  async fetch(request, env) {

    const url = new URL(request.url);


    // ========================================================
    // DEBUG V27
    // ========================================================

    if (
      request.method === "GET" &&
      url.pathname === "/debug-proxy-binding"
    ) {

      try {

        const response =
          await env.V27.fetch(
            "https://v27.internal/"
          );

        const text =
          await response.text();

        return new Response(
          JSON.stringify(
            {
              success: true,
              binding: "V27",
              status: response.status,
              response: text
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
              binding: "V27",
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


    // ========================================================
    // DEBUG MATCHER
    // ========================================================

    if (
      request.method === "GET" &&
      url.pathname === "/debug-matcher-binding"
    ) {

      try {

        if (!env.MATCHER) {
          throw new Error(
            "MATCHER Service Binding missing"
          );
        }

        const response =
          await env.MATCHER.fetch(
            new Request(
              "https://matcher.internal/",
              {
                method: "GET",
                headers: {
                  "Accept":
                    "application/json"
                }
              }
            )
          );

        const text =
          await response.text();

        return json({
          success: true,
          binding: "MATCHER",
          status: response.status,
          response: text
        });

      } catch (error) {

        return json({
          success: false,
          binding: "MATCHER",
          error:
            error?.message ||
            String(error)
        }, 500);
      }
    }


    // ========================================================
    // ENTRIES
    // ========================================================

    if (
      request.method === "GET" &&
      url.pathname === "/entries"
    ) {

      try {

        if (!env.DB) {
          return json(
            {
              success: false,
              error: "DB binding missing"
            },
            500
          );
        }

        const result =
          await env.DB
            .prepare(`
              SELECT
                id,
                match_id,
                match_name,
                league,
                entry_time,
                entry_minute,
                hunter_score,
                goal_pressure,
                danger_index,
                attack_score,
                entry_home_score,
                entry_away_score,
                cloudbet_event_id,
                entry_odds,
                cloudbet_max_stake,
                cloudbet_match,
                odds_available,
                matcher_score,
                status,
                result,
                created_at,
                updated_at
              FROM hunter_signals
              WHERE status = 'TRACKING'
              ORDER BY created_at DESC
            `)
            .all();

        const rows =
          result?.results || [];

        // V6.7.4:
        // Enrich /entries with the CURRENT V27 live minute/period.
        // entry_minute remains the immutable Hunter entry snapshot.
        // No D1 migration is required.
        const liveById =
          new Map();

        try {

          if (env.V27) {

            const liveResponse =
              await env.V27.fetch(
                new Request(
                  "https://v27.internal/",
                  {
                    method: "GET",
                    headers: {
                      "Accept":
                        "application/json"
                    }
                  }
                )
              );

            if (liveResponse.ok) {

              const liveData =
                await liveResponse.json();

              const liveMatches =
                Array.isArray(
                  liveData?.matches
                )
                  ? liveData.matches
                  : [];

              for (
                const liveMatch of liveMatches
              ) {

                const liveId =
                  String(
                    liveMatch?.id ?? ""
                  );

                if (liveId) {
                  liveById.set(
                    liveId,
                    liveMatch
                  );
                }
              }
            }
          }

        } catch (error) {

          // /entries must remain available even if V27 enrichment
          // temporarily fails. In that case current_* fields are null.
          console.error(
            "ENTRIES V27 ENRICH ERROR",
            error?.message ||
            String(error)
          );
        }

        const entries =
          rows.map(row => {

            const liveMatch =
              liveById.get(
                String(
                  row?.match_id ?? ""
                )
              ) ?? null;

            const currentMinute =
              liveMatch
                ? parseMinuteValue(
                    liveMatch?.minute ??
                    liveMatch?.minute_display ??
                    liveMatch?.minuteDisplay
                  )
                : null;

            const period =
              liveMatch
                ? normalizeLivePeriod(
                    liveMatch
                  )
                : null;

            // V6.7.10.2:
            // Betting readiness is independent from football TRACKING status.
            // As soon as /internal/odds-found stores the real odds, /entries
            // must expose the signal as READY_TO_BET on the very next read.
            const readyEventId =
              row?.cloudbet_event_id !== null &&
              row?.cloudbet_event_id !== undefined &&
              String(row.cloudbet_event_id).trim() !== "";

            const readyEntryOdds =
              numberOrNull(
                row?.entry_odds
              );

            const readyOddsAvailable =
              Number(
                row?.odds_available || 0
              ) === 1 ||
              (
                readyEntryOdds !== null &&
                readyEntryOdds > 1
              );

            const betReady =
              readyEventId &&
              readyOddsAvailable &&
              readyEntryOdds !== null &&
              readyEntryOdds > 1;

            return {
            type: "HUNTER_ENTRY",
            signal: "HUNTER_ENTRY",
            action: "ENTRY",
            status: "TRACKING",

            // V6.7.10.2 — explicit betting state for dashboard / Bet Worker.
            bet_ready:
              betReady,
            bet_status:
              betReady
                ? "READY_TO_BET"
                : (
                    readyEventId
                      ? "WAITING_ODDS"
                      : "UNMATCHED"
                  ),
            cloudbet_event_id:
              row?.cloudbet_event_id ?? null,
            entry_odds:
              readyEntryOdds,
            odds_available:
              readyOddsAvailable,

            id: row?.id ?? null,
            match_id: row?.match_id ?? null,
            match_name: row?.match_name ?? "",
            match: row?.match_name ?? "",
            league: row?.league ?? "LIVE",
            entry_time: row?.entry_time ?? null,
            entry_minute: row?.entry_minute ?? null,
            hunter_score: row?.hunter_score ?? null,
            goal_pressure: row?.goal_pressure ?? null,
            danger_index: row?.danger_index ?? null,
            attack_score: row?.attack_score ?? null,
            score: {
              home: row?.entry_home_score ?? 0,
              away: row?.entry_away_score ?? 0
            },
            cloudbet: {
              event_id: row?.cloudbet_event_id ?? null,
              match: row?.cloudbet_match ?? null,
              entry_odds: numberOrNull(row?.entry_odds),
              max_stake: numberOrNull(row?.cloudbet_max_stake),
              odds_available: Number(row?.odds_available || 0) === 1,
              matcher_score: numberOrNull(row?.matcher_score)
            },
            home: null,
            away: null,
            current_minute:
              currentMinute,
            period
          };
        });

        return json({
          success: true,
          worker:
            "GOAL WATCH — HUNTER TRACKER V6.7.4",
          source:
            "hunter_signals",
          mode:
            "READ_ONLY",
          count:
            entries.length,
          entries
        });

      } catch (error) {

        console.error(
          "ENTRIES API ERROR",
          error?.message ||
          String(error)
        );

        return json({
          success: false,
          error:
            error?.message ||
            String(error)
        }, 500);
      }
    }


    // ========================================================
    // OPTIONS
    // ========================================================

    if (
      request.method === "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers: corsHeaders()
        }
      );
    }



    // ========================================================
    // V6.7.8 — INTERNAL PENDING ODDS FOUND CALLBACK
    // Bet Worker calls this only when the SAME locked event_id
    // changes from PENDING_ODDS to a real exact 1H O0.5 price.
    // The atomic entry_odds IS NULL guard prevents duplicate
    // storage and duplicate Telegram replies.
    // ========================================================

    if (
      request.method === "POST" &&
      url.pathname ===
        "/internal/odds-found"
    ) {

      try {

        const body =
          await request.json();

        const matchId =
          String(
            body?.match_id ?? ""
          ).trim();

        const eventId =
          String(
            body?.event_id ?? ""
          ).trim();

        const odds =
          numberOrNull(
            body?.odds
          );

        if (
          !matchId ||
          !eventId ||
          odds === null ||
          odds <= 1
        ) {
          return json(
            {
              success: false,
              error:
                "INVALID_ODDS_FOUND_PAYLOAD"
            },
            400
          );
        }

        const nowIso =
          new Date().toISOString();

        const update =
          await env.DB
            .prepare(`
              UPDATE hunter_signals
              SET
                cloudbet_event_id = ?,
                entry_odds = ?,
                odds_available = 1,
                cloudbet_max_stake =
                  COALESCE(?, cloudbet_max_stake),
                cloudbet_match =
                  COALESCE(?, cloudbet_match),
                updated_at = ?
              WHERE match_id = ?
                AND status = 'TRACKING'
                AND entry_odds IS NULL
                AND (
                  cloudbet_event_id IS NULL
                  OR cloudbet_event_id = ?
                )
            `)
            .bind(
              eventId,
              odds,
              numberOrNull(
                body?.max_stake
              ),
              body?.cloudbet_match ??
              null,
              nowIso,
              matchId,
              eventId
            )
            .run();

        const changed =
          Number(
            update?.meta?.changes ?? 0
          );

        if (changed < 1) {

          return json({
            success: true,
            action:
              "ALREADY_PROCESSED",
            duplicate:
              true,
            match_id:
              matchId,
            event_id:
              eventId,
            odds
          });
        }

        const row =
          await env.DB
            .prepare(`
              SELECT
                id,
                match_id,
                match_name,
                entry_minute,
                telegram_message_id,
                entry_time
              FROM hunter_signals
              WHERE match_id = ?
              LIMIT 1
            `)
            .bind(
              matchId
            )
            .first();

        const entryMinute =
          numberOrNull(
            row?.entry_minute
          );

        let delayText =
          null;

        if (row?.entry_time) {
          const entryMs =
            new Date(
              row.entry_time
            ).getTime();

          if (
            Number.isFinite(entryMs)
          ) {
            const seconds =
              Math.max(
                0,
                Math.round(
                  (
                    Date.now() -
                    entryMs
                  ) / 1000
                )
              );

            delayText =
              seconds < 60
                ? seconds + " сек."
                : Math.max(
                    1,
                    Math.round(
                      seconds / 60
                    )
                  ) + " мин.";
          }
        }

        const message =
          [
            "🎲 ODDS FOUND",
            "",
            "⚽ " +
              String(
                row?.match_name ??
                matchId
              ),

            entryMinute !== null
              ? "📥 ENTRY: " +
                entryMinute +
                "'"
              : null,

            "🎲 1H Over 0.5: " +
              odds.toFixed(2),

            delayText
              ? "⏳ Намерен след: " +
                delayText
              : null,

            "🆔 Event: " +
              eventId,

            "",
            "✅ PENDING → READY_TO_BET\n🟢 Сигналът е АКТИВЕН"
          ]
            .filter(
              value =>
                value !== null &&
                value !== undefined
            )
            .join("\n");

        const telegramMessageId =
          await sendTelegram(
            env,
            message,
            row?.telegram_message_id ??
            null
          );

        return json({
          success: true,
          action:
            "ODDS_FOUND_SAVED",
          duplicate:
            false,
          match_id:
            matchId,
          event_id:
            eventId,
          odds,
          bet_ready:
            true,
          bet_status:
            "READY_TO_BET",
          odds_available:
            true,
          activation:
            "IMMEDIATE_ON_NEXT_ENTRIES_READ",
          reply_to:
            row?.telegram_message_id ??
            null,
          telegram_message_id:
            telegramMessageId ??
            null
        });

      } catch (error) {

        console.error(
          "ODDS FOUND CALLBACK ERROR",
          error?.message ||
          String(error)
        );

        return json(
          {
            success: false,
            error:
              error?.message ||
              String(error)
          },
          500
        );
      }
    }


    // ========================================================
    // TELEGRAM WEBHOOK
    // ========================================================

    if (
      request.method === "POST"
    ) {

      try {

        const update =
          await request.json();

        const message =
          update?.message;

        const text =
          String(
            message?.text || ""
          ).trim();

        if (
          text === "/today" ||
          text.startsWith("/today@")
        ) {

          await sendTelegram(
            env,
            await buildTodayStats(env)
          );

          return json({
            success: true,
            action: "TODAY"
          });
        }


        if (
          text === "/shadowstats" ||
          text.startsWith("/shadowstats@")
        ) {

          await sendTelegram(
            env,
            await buildShadowStats(env)
          );

          return json({
            success: true,
            action: "SHADOWSTATS",
            population: "SHADOW_5_9"
          });
        }


        if (
          text === "/betstats" ||
          text.startsWith("/betstats@")
        ) {

          await sendTelegram(
            env,
            await buildBetReadyStats(env)
          );

          return json({
            success: true,
            action: "BETSTATS",
            population: "BET_READY_HISTORY"
          });
        }


        if (
          text === "/stats" ||
          text.startsWith("/stats@")
        ) {

          await sendTelegram(
            env,
            await buildStats(env)
          );

          await sendTelegram(
            env,
            await buildHourMinuteStatsMessage(
              env
            )
          );

          return json({
            success: true,
            action: "STATS",
            hour_minute_matrix:
              true
          });
        }

        return json({
          success: true,
          action: "IGNORED"
        });

      } catch (error) {

        console.error(
          "TELEGRAM WEBHOOK ERROR",
          error?.message ||
          String(error)
        );

        return json({
          success: false,
          error:
            error?.message ||
            String(error)
        }, 500);
      }
    }


    return json({
      success: true,
      worker:
        "GOAL WATCH — HUNTER TRACKER V6.7.4",
      status: "ONLINE",
      mode:
        "24/7 CRON + TELEGRAM + MATCHER CLOUDBET ODDS + D1 ODDS",
      bindings: {
        V27:
          Boolean(env.V27),
        MATCHER:
          Boolean(env.MATCHER),
        BET_WORKER:
          Boolean(env.BET_WORKER),
        DB:
          Boolean(env.DB)
      },
      hunter: {
        from:
          HUNTER_FROM,
        to:
          HUNTER_TO,
        min_score:
          HUNTER_MIN_SCORE
      },
      odds: {
        source:
          "MATCHER V7.3.1",
        market:
          "1H Over 0.5",
        saved_to_d1:
          true
      },
      time:
        getSofiaTime(
          new Date()
        ).text
    });
  },


  async scheduled(
    event,
    env,
    ctx
  ) {

    ctx.waitUntil(
      processTracker(env)
        .catch(error => {
          console.error(
            "TRACKER ERROR",
            error?.message ||
            String(error)
          );
        })
    );
  }
};


// ============================================================
// TRACKER
// ============================================================

async function processTracker(env) {

  const now = new Date();
  const local =
    getSofiaTime(now);

  if (!env.V27)
    throw new Error(
      "V27 Service Binding missing"
    );

  if (!env.DB)
    throw new Error(
      "DB binding missing"
    );

  if (!env.TELEGRAM_BOT_TOKEN)
    throw new Error(
      "TELEGRAM_BOT_TOKEN missing"
    );

  if (!env.TELEGRAM_CHAT_ID)
    throw new Error(
      "TELEGRAM_CHAT_ID missing"
    );


  // MATCHER intentionally is NOT mandatory
  // for Hunter itself.
  // Missing odds must never stop tracking.

  if (
    local.hour === 0 &&
    local.minute <=
      DAILY_REPORT_WINDOW_MINUTES
  ) {

    try {

      await sendDailyReport(
        env,
        local
      );

    } catch (error) {

      console.error(
        "DAILY REPORT ERROR",
        error?.message ||
        String(error)
      );
    }
  }


  const response =
    await env.V27.fetch(
      new Request(
        "https://v27.internal/",
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json"
          }
        }
      )
    );

  if (!response.ok) {

    const text =
      await response.text();

    throw new Error(
      "V27 HTTP " +
      response.status +
      " | " +
      text.substring(
        0,
        300
      )
    );
  }


  const data =
    await response.json();

  if (
    data?.success !== true
  ) {

    throw new Error(
      "V27 returned success=false"
    );
  }


  const matches =
    Array.isArray(
      data.matches
    )
      ? data.matches
      : [];


  const result =
    await env.DB
      .prepare(`
        SELECT
          id,
          match_id,
          match_name,
          league,
          entry_time,
          entry_minute,
          hunter_score,
          entry_home_score,
          entry_away_score,
          telegram_message_id
        FROM hunter_signals
        WHERE status = 'TRACKING'
      `)
      .all();


  const signals =
    result?.results || [];


  const trackingMap =
    new Map();


  for (
    const signal of signals
  ) {

    const id =
      String(
        signal?.match_id || ""
      );

    if (!id)
      continue;

    trackingMap.set(
      id,
      signal
    );
  }


  const currentIds =
    new Set();


  for (
    const match of matches
  ) {

    const id =
      String(
        match?.id || ""
      );

    if (id) {
      currentIds.add(id);
    }
  }


  // ==========================================================
  // CURRENT MATCHES
  // ==========================================================

  for (
    const match of matches
  ) {

    const id =
      String(
        match?.id || ""
      );

    if (!id)
      continue;


    // --------------------------------------------------------
    // ALREADY TRACKING
    // --------------------------------------------------------

    if (
      trackingMap.has(id)
    ) {

      try {

        await processTrackingMatch(
          env,
          match,
          now,
          trackingMap
        );

      } catch (error) {

        console.error(
          "TRACKING MATCH ERROR",
          id,
          error?.message ||
          String(error)
        );
      }

      continue;
    }


    // --------------------------------------------------------
    // NEW HUNTER CANDIDATE
    // --------------------------------------------------------

    const score =
      getHunterScore(
        match
      );

    if (
      !isHunterCandidate(
        match,
        score
      )
    ) {
      continue;
    }


    try {

      await createHunterEntry(
        env,
        match,
        now,
        local,
        trackingMap,
        score
      );

    } catch (error) {

      console.error(
        "ENTRY ERROR",
        id,
        error?.message ||
        String(error)
      );
    }
  }


  // ==========================================================
  // MISSING TRACKING
  // ==========================================================

  for (
    const signal of signals
  ) {

    const id =
      String(
        signal?.match_id || ""
      );

    if (!id)
      continue;

    if (
      currentIds.has(id)
    )
      continue;

    try {

      await finalizeMissingTracking(
        env,
        signal,
        now
      );

    } catch (error) {

      console.error(
        "FINALIZE ERROR",
        id,
        error?.message ||
        String(error)
      );
    }
  }
}


// ============================================================
// EXISTING TRACKING
// ============================================================

async function processTrackingMatch(
  env,
  m,
  now,
  trackingMap
) {

  const id =
    String(
      m?.id || ""
    );

  if (!id)
    return;

  const existing =
    trackingMap.get(id);

  if (!existing)
    return;

  const home =
    Number(
      m?.score?.home ?? 0
    );

  const away =
    Number(
      m?.score?.away ?? 0
    );

  const currentMinute =
    Number(
      m?.minute ?? 0
    );

  const entryHome =
    Number(
      existing.entry_home_score ||
      0
    );

  const entryAway =
    Number(
      existing.entry_away_score ||
      0
    );

  const entryMinute =
    Number(
      existing.entry_minute ||
      0
    );


  // ==========================================================
  // 1) DF_SUI — CONFIRMED FIRST-HALF GOAL AFTER ENTRY
  // ==========================================================
  // Preferred source. This check runs on EVERY cron pass while
  // the signal remains TRACKING, including HT/2H reconciliation.

  let summaryGoal = null;

  try {

    summaryGoal =
      await getPostEntryDfSuiGoal(
        id,
        entryMinute
      );

  } catch (error) {

    console.error(
      "DF_SUI TRACKING ERROR",
      id,
      error?.message ||
      String(error)
    );
  }


  if (summaryGoal) {

    const goalMinute =
      summaryGoal.minute;

    const afterMinutes =
      Math.max(
        0,
        goalMinute -
        entryMinute
      );

    const matchForMessage = {
      ...m,
      score:
        summaryGoal.score &&
        Number.isFinite(
          Number(
            summaryGoal.score.home
          )
        ) &&
        Number.isFinite(
          Number(
            summaryGoal.score.away
          )
        )
          ? {
              home:
                Number(
                  summaryGoal.score.home
                ),
              away:
                Number(
                  summaryGoal.score.away
                )
            }
          : m?.score
    };

    await resolveTrackingGoal(
      env,
      existing,
      matchForMessage,
      trackingMap,
      id,
      now,
      goalMinute,
      afterMinutes,
      "DF_SUI_1H"
    );

    return;
  }


  const atHalfTime =
    isFirstHalfFinished(m);

  const inSecondHalf =
    isSecondHalfStarted(m);


  // ==========================================================
  // 2) STILL FIRST HALF — V27 SCORE FALLBACK IS SAFE
  // ==========================================================
  // While still in 1H, any score increase happened in 1H.

  if (
    !atHalfTime &&
    !inSecondHalf &&
    (
      home > entryHome ||
      away > entryAway
    )
  ) {

    const goalMinute =
      getRealGoalMinute(
        m,
        entryHome,
        entryAway,
        entryMinute,
        currentMinute
      );

    const afterMinutes =
      goalMinute !== null
        ? Math.max(
            0,
            goalMinute -
            entryMinute
          )
        : null;

    await resolveTrackingGoal(
      env,
      existing,
      m,
      trackingMap,
      id,
      now,
      goalMinute,
      afterMinutes,
      "V27_1H_SCORE"
    );

    return;
  }


  // ==========================================================
  // 3) OFFICIAL HT — SCORE INCREASE IS SAFE
  // ==========================================================
  // At a genuine HT snapshot, a score increase versus ENTRY
  // necessarily belongs to the first half.

  if (
    atHalfTime &&
    (
      home > entryHome ||
      away > entryAway
    )
  ) {

    const goalMinute =
      getRealGoalMinute(
        m,
        entryHome,
        entryAway,
        entryMinute,
        currentMinute
      );

    const afterMinutes =
      goalMinute !== null
        ? Math.max(
            0,
            goalMinute -
            entryMinute
          )
        : null;

    await resolveTrackingGoal(
      env,
      existing,
      m,
      trackingMap,
      id,
      now,
      goalMinute,
      afterMinutes,
      "V27_HT_SCORE"
    );

    return;
  }


  // ==========================================================
  // 4) HT / 2H RECONCILIATION WINDOW
  // ==========================================================
  // CRITICAL V6.7.10.5 FIX:
  //
  // The first HT/2H 0:0 snapshot is NOT trusted as final.
  // Flashscore/V27 can briefly transition period before score/events
  // have caught up. Keep TRACKING and let subsequent cron passes
  // re-check DF_SUI.
  //
  // We intentionally do NOT use a generic score increase first seen
  // in 2H as proof of a 1H goal because that could be a real 2H goal.

  if (
    atHalfTime ||
    inSecondHalf
  ) {

    const deferNoGoal =
      shouldDeferHalfTransitionNoGoal(
        existing,
        now
      );

    if (deferNoGoal) {

      console.log(
        "HT_RECONCILIATION_DEFER",
        id,
        {
          entry_minute:
            entryMinute,
          period:
            normalizeLivePeriod?.(m) ??
            m?.period ??
            null,
          score: {
            home,
            away
          }
        }
      );

      return;
    }


    // Grace window has expired.
    // DF_SUI was already checked again at the top of this pass.
    // If no confirmed 1H post-entry goal exists, close NO_GOAL.

    await resolveTrackingNoGoal(
      env,
      existing,
      m,
      trackingMap,
      id,
      now,
      atHalfTime
        ? "HALF_TIME_RECONCILED_NO_GOAL"
        : "SECOND_HALF_RECONCILED_NO_GOAL"
    );

    return;
  }
}


// ============================================================
// V6.7.10.5 — HT / 2H NO_GOAL RECONCILIATION TIMER
// ============================================================

function shouldDeferHalfTransitionNoGoal(
  signal,
  now
) {

  const entryMinute =
    Math.max(
      0,
      Math.min(
        45,
        Number(
          signal?.entry_minute ||
          0
        )
      )
    );

  const entryTime =
    new Date(
      signal?.entry_time ||
      signal?.created_at ||
      ""
    );

  // If timestamp is temporarily unusable, fail SAFE:
  // do not finalize NO_GOAL from one uncertain HT/2H snapshot.
  if (
    Number.isNaN(
      entryTime.getTime()
    )
  ) {
    return true;
  }

  const ageMinutes =
    (
      now.getTime() -
      entryTime.getTime()
    ) /
    60000;

  // Estimated real-time distance from ENTRY to 45:00.
  const minutesUntil45 =
    Math.max(
      0,
      45 - entryMinute
    );

  // Allow enough time for:
  // - first-half stoppage time
  // - Flashscore period transition
  // - V27 score propagation
  // - DF_SUI event propagation
  //
  // Cron keeps retrying each minute during this window.
  const HT_RECONCILIATION_GRACE_MINUTES =
    15;

  const requiredAge =
    minutesUntil45 +
    HT_RECONCILIATION_GRACE_MINUTES;

  return (
    ageMinutes <
    requiredAge
  );
}


// ============================================================
// RESOLVE TRACKING GOAL — V6.7.10.6 RESTORED
// ============================================================

async function resolveTrackingGoal(
  env,
  existing,
  m,
  trackingMap,
  id,
  now,
  goalMinute,
  afterMinutes,
  source
) {

  const update =
    await env.DB
      .prepare(`
        UPDATE hunter_signals
        SET
          status = 'GOAL',
          goal_minute = ?,
          goal_after_minutes = ?,
          result = 'GOAL HIT',
          updated_at = ?
        WHERE id = ?
          AND status = 'TRACKING'
      `)
      .bind(
        goalMinute,
        afterMinutes,
        now.toISOString(),
        existing.id
      )
      .run();


  const changes =
    Number(
      update?.meta?.changes ||
      0
    );

  if (
    changes < 1
  ) {
    return false;
  }


  trackingMap.delete(id);


  if (!isShadowSignal(existing)) {

    await sendTelegram(
      env,
      formatGoalMessage(
        existing,
        m,
        goalMinute,
        afterMinutes,
        source
      ),
      existing.telegram_message_id
    );
  }


  return true;
}


// ============================================================
// NO_GOAL RESOLVER — ATOMIC / AFTER GOAL CHECKS
// ============================================================

async function resolveTrackingNoGoal(
  env,
  existing,
  m,
  trackingMap,
  id,
  now,
  source = "UNKNOWN"
) {

  const update =
    await env.DB
      .prepare(`
        UPDATE hunter_signals
        SET
          status = 'NO_GOAL',
          result = 'NO GOAL',
          updated_at = ?
        WHERE id = ?
          AND status = 'TRACKING'
      `)
      .bind(
        now.toISOString(),
        existing.id
      )
      .run();

  const changes =
    Number(
      update?.meta?.changes ||
      0
    );

  if (changes < 1) {
    return false;
  }

  trackingMap?.delete?.(id);

  if (!isShadowSignal(existing)) {
    await sendTelegram(
      env,
      formatNoGoalMessage(
        existing,
        m,
        source
      ),
      existing.telegram_message_id
    );
  }

  return true;
}


// ============================================================
// DF_SUI — FIRST CONFIRMED GOAL AFTER ENTRY
// ============================================================

async function getPostEntryDfSuiGoal(
  matchId,
  entryMinute
) {

  if (!matchId) {
    return null;
  }


  const url =
    FLASHSCORE_DF_SUI_BASE +
    encodeURIComponent(
      String(matchId)
    ) +
    "?_=" +
    Date.now();


  let response;

  try {

    response =
      await fetch(
        url,
        {
          method: "GET",
          headers:
            FLASHSCORE_HEADERS,
          cache: "no-store"
        }
      );

  } catch (error) {

    return null;
  }


  if (!response.ok) {
    return null;
  }


  const text =
    await response.text();


  if (!text) {
    return null;
  }


  const parsed =
    parseDfSuiEvents(
      text
    );


  const goals =
    parsed.events
      .filter(
        isConfirmedDfSuiGoal
      )
      .map(
        event => {

          const minuteInfo =
            parseDfSuiMinuteInfo(
              event?.minute
            );

          return {
            event,
            minute:
              minuteInfo?.effective ??
              null,
            minuteInfo
          };
        }
      )
      .filter(
        item =>
          item.minute !== null &&
          item.minute > entryMinute &&
          isFirstHalfDfSuiEvent(
            item.event,
            item.minuteInfo
          )
      )
      .sort(
        (a, b) =>
          a.minute -
          b.minute
      );


  if (
    goals.length < 1
  ) {
    return null;
  }


  const first =
    goals[0];


  return {
    minute:
      first.minute,

    minute_display:
      first.event?.minute ??
      null,

    score:
      first.event?.score ??
      null,

    participant:
      first.event?.participant ??
      null,

    kind:
      first.event?.kind ??
      first.event?.type ??
      "Goal"
  };
}


// ============================================================
// DF_SUI EVENT PARSER
// ============================================================

function parseDfSuiEvents(
  text
) {

  const events = [];

  const fields =
    String(
      text || ""
    ).split("¬");


  let context = {
    section: null,
    ia: null,
    minute: null,
    home_score: null,
    away_score: null
  };


  let current = {};


  function finishCurrent() {

    const kind =
      cleanDfSuiValue(
        current.IK
      );


    if (!kind) {

      current = {};

      return;
    }


    events.push(
      {
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
          cleanDfSuiValue(
            current.IF
          ),
        participant_code:
          cleanDfSuiValue(
            current.IE
          ),
        participant_id:
          cleanDfSuiValue(
            current.IM
          ),
        participant_url:
          cleanDfSuiValue(
            current.IU
          ),
        score: {
          home:
            numberOrNull(
              context.home_score
            ),
          away:
            numberOrNull(
              context.away_score
            )
        }
      }
    );


    current = {};
  }


  for (
    const rawField of fields
  ) {

    if (!rawField) {
      continue;
    }


    const field =
      String(
        rawField
      ).replace(
        /^~/,
        ""
      );


    const i =
      field.indexOf(
        "÷"
      );


    if (
      i === -1
    ) {
      continue;
    }


    const key =
      field
        .slice(
          0,
          i
        )
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
        cleanDfSuiValue(
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
        cleanDfSuiValue(
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
        cleanDfSuiValue(
          value
        );

      continue;
    }


    if (
      key === "INX"
    ) {

      context.home_score =
        cleanDfSuiValue(
          value
        );

      continue;
    }


    if (
      key === "IOX"
    ) {

      context.away_score =
        cleanDfSuiValue(
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
    }
  }


  if (
    current.IK
  ) {

    finishCurrent();
  }


  return {
    events
  };
}


// ============================================================
// DF_SUI GOAL FILTER
// ============================================================

function isConfirmedDfSuiGoal(
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


// ============================================================
// DF_SUI MINUTE PARSER
// Examples: 32' => 32, 45+2' => 47
// ============================================================

function parseDfSuiMinuteInfo(
  value
) {

  const raw =
    String(
      value ?? ""
    ).trim();

  const text =
    raw.replace(
      /['’"]/g,
      ""
    );

  if (!text) {
    return null;
  }

  const plus =
    text.match(
      /^(\d+)\s*\+\s*(\d+)$/
    );

  if (plus) {

    const base =
      Number(plus[1]);

    const added =
      Number(plus[2]);

    if (
      Number.isFinite(base) &&
      Number.isFinite(added)
    ) {
      return {
        raw,
        base,
        added,
        effective:
          base + added,
        stoppage: true
      };
    }
  }

  const direct =
    Number(
      text.match(/\d+/)?.[0]
    );

  if (!Number.isFinite(direct)) {
    return null;
  }

  return {
    raw,
    base: direct,
    added: 0,
    effective: direct,
    stoppage: false
  };
}


function isFirstHalfDfSuiEvent(
  event,
  minuteInfo
) {

  if (!minuteInfo) {
    return false;
  }

  const sectionText =
    [
      event?.section,
      event?.ia
    ]
      .map(
        value =>
          String(value ?? "")
            .trim()
            .toUpperCase()
      )
      .filter(Boolean)
      .join(" ");

  // Explicit second-half context always wins.
  if (
    /(^|\s)(2H|2ND HALF|SECOND HALF|2P)(\s|$)/.test(
      sectionText
    )
  ) {
    return false;
  }

  // V6.7.10.5:
  // Explicit FIRST-HALF context is stronger than the raw displayed
  // minute. Some feeds can expose stoppage as direct 46/47/etc
  // instead of 45+N. Accept it only when the event context itself
  // explicitly says first half.
  const explicitFirstHalf =
    /(^|\s)(1H|1ST HALF|FIRST HALF|1P)(\s|$)/.test(
      sectionText
    );

  if (
    explicitFirstHalf &&
    minuteInfo.effective <= 60
  ) {
    return true;
  }

  // Flashscore-style 45+N is first-half stoppage time.
  if (
    minuteInfo.stoppage === true &&
    minuteInfo.base === 45
  ) {
    return true;
  }

  // Normal first-half clock.
  if (
    minuteInfo.stoppage === false &&
    minuteInfo.effective <= 45
  ) {
    return true;
  }

  // A direct 46/47/50 is intentionally NOT treated as 1H.
  // This prevents 2H events from becoming false 1H GOAL HITs.
  return false;
}


function parseDfSuiMinute(
  value
) {

  return (
    parseDfSuiMinuteInfo(
      value
    )?.effective ??
    null
  );
}


function cleanDfSuiValue(
  value
) {

  const text =
    String(
      value ??
      ""
    ).trim();


  return text || null;
}


// ============================================================
// SECOND HALF DETECTION
// ============================================================

function isSecondHalfStarted(m) {

  const values = [
    m?.period,
    m?.status,
    m?.status_type,
    m?.match_status,
    m?.state,
    m?.phase
  ];

  for (
    const value of values
  ) {

    if (
      hasSecondHalfValue(
        value
      )
    ) {
      return true;
    }
  }


  const nestedValues = [
    m?.period?.type,
    m?.period?.name,
    m?.period?.short,
    m?.period?.long,
    m?.status?.type,
    m?.status?.name,
    m?.status?.short,
    m?.status?.long,
    m?.match_status?.type,
    m?.match_status?.name,
    m?.match_status?.short,
    m?.match_status?.long,
    m?.state?.type,
    m?.state?.name,
    m?.state?.short,
    m?.state?.long,
    m?.phase?.type,
    m?.phase?.name,
    m?.phase?.short,
    m?.phase?.long
  ];


  for (
    const value of nestedValues
  ) {

    if (
      hasSecondHalfValue(
        value
      )
    ) {
      return true;
    }
  }


  return false;
}


function hasSecondHalfValue(
  value
) {

  const text =
    String(
      value || ""
    )
      .toUpperCase()
      .trim();

  if (!text)
    return false;


  return (
    text === "2H" ||
    text === "2ND HALF" ||
    text === "2ND HALF." ||
    text === "SECOND" ||
    text === "SECOND HALF" ||
    text === "SECOND-HALF" ||
    text === "SECOND_HALF" ||
    text === "2ND_HALF" ||
    text === "2H STARTED" ||
    text === "SECOND HALF STARTED" ||
    text.includes(
      "SECOND HALF"
    ) ||
    text.includes(
      "2ND HALF"
    )
  );
}


// ============================================================
// REAL GOAL MINUTE
// ============================================================

function getRealGoalMinute(
  m,
  entryHome,
  entryAway,
  entryMinute,
  currentMinute
) {

  const candidates = [];


  if (
    Array.isArray(
      m?.goals
    )
  ) {
    candidates.push(
      ...m.goals
    );
  }


  if (
    Array.isArray(
      m?.events
    )
  ) {
    candidates.push(
      ...m.events
    );
  }


  if (
    Array.isArray(
      m?.incidents
    )
  ) {
    candidates.push(
      ...m.incidents
    );
  }


  if (
    Array.isArray(
      m?.goal_events
    )
  ) {
    candidates.push(
      ...m.goal_events
    );
  }


  const validGoals = [];


  for (
    const event of candidates
  ) {

    if (
      !event ||
      typeof event !==
        "object"
    ) {
      continue;
    }


    if (
      !isGoalEvent(event)
    )
      continue;


    const minute =
      extractEventMinute(
        event
      );


    if (
      minute === null
    )
      continue;


    if (
      minute <= 0 ||
      minute > 130
    ) {
      continue;
    }


    if (
      minute <= entryMinute
    ) {
      continue;
    }


    validGoals.push(
      minute
    );
  }


  if (
    validGoals.length > 0
  ) {

    validGoals.sort(
      (a, b) =>
        a - b
    );

    return validGoals[0];
  }


  if (
    currentMinute >
      entryMinute &&
    currentMinute <= 45
  ) {

    return currentMinute;
  }


  return null;
}


function isGoalEvent(event) {

  const values = [
    event?.type,
    event?.event_type,
    event?.incident_type,
    event?.incidentType,
    event?.kind,
    event?.name,
    event?.description,
    event?.action,
    event?.incident,
    event?.event
  ];


  for (
    const value of values
  ) {

    const text =
      String(
        value || ""
      )
        .toLowerCase()
        .trim();


    if (
      text === "goal" ||
      text === "goals" ||
      text.includes(
        "goal"
      )
    ) {
      return true;
    }
  }


  if (
    event?.is_goal === true ||
    event?.isGoal === true ||
    event?.goal === true
  ) {
    return true;
  }


  return false;
}


function extractEventMinute(
  event
) {

  const values = [
    event?.minute,
    event?.minute_display,
    event?.minuteDisplay,
    event?.match_minute,
    event?.incident_minute,
    event?.time_minute
  ];


  for (
    const value of values
  ) {

    const minute =
      parseMinuteValue(
        value
      );


    if (
      minute !== null
    )
      return minute;
  }


  const directTime =
    parseMinuteValue(
      event?.time
    );


  if (
    directTime !== null
  ) {
    return directTime;
  }


  const nested = [
    event?.time,
    event?.match_time,
    event?.clock
  ];


  for (
    const value of nested
  ) {

    if (
      !value ||
      typeof value !==
        "object"
    ) {
      continue;
    }


    const minute =
      parseMinuteValue(
        value?.minute ??
        value?.display ??
        value?.value
      );


    if (
      minute !== null
    ) {
      return minute;
    }
  }


  return null;
}


function parseMinuteValue(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }


  if (
    typeof value ===
      "number"
  ) {

    return Number.isFinite(
      value
    )
      ? Math.floor(
          value
        )
      : null;
  }


  const text =
    String(
      value
    ).trim();


  if (!text)
    return null;


  const apostrophe =
    text.match(
      /^(\d{1,3})\s*['′]/
    );


  if (
    apostrophe
  ) {
    return Number(
      apostrophe[1]
    );
  }


  const clock =
    text.match(
      /^(\d{1,3}):(\d{1,2})/
    );


  if (
    clock
  ) {
    return Number(
      clock[1]
    );
  }


  const added =
    text.match(
      /^(\d{1,3})\s*\+\s*(\d{1,2})/
    );


  if (
    added
  ) {

    return (
      Number(
        added[1]
      ) +
      Number(
        added[2]
      )
    );
  }


  const plain =
    text.match(
      /^(\d{1,3})$/
    );


  if (
    plain
  ) {
    return Number(
      plain[1]
    );
  }


  return null;
}


// ============================================================
// LIVE PERIOD — /entries V6.7.2
// ============================================================

function normalizeLivePeriod(
  m
) {

  const values = [
    m?.period,
    m?.phase,
    m?.status,
    m?.status_type,
    m?.match_status,
    m?.state
  ];

  for (
    const value of values
  ) {

    const text =
      String(
        value ?? ""
      )
        .trim()
        .toUpperCase();

    if (!text)
      continue;

    if (
      text === "1H" ||
      text === "1ST HALF" ||
      text === "FIRST HALF" ||
      text === "1P"
    ) {
      return "1H";
    }

    if (
      text === "HT" ||
      text === "HALFTIME" ||
      text === "HALF TIME" ||
      text === "HALF-TIME"
    ) {
      return "HT";
    }

    if (
      text === "2H" ||
      text === "2ND HALF" ||
      text === "SECOND HALF" ||
      text === "2P"
    ) {
      return "2H";
    }

    if (
      text === "FT" ||
      text === "FINISHED" ||
      text === "FULL TIME" ||
      text === "FULL-TIME"
    ) {
      return "FT";
    }
  }

  return null;
}


// ============================================================
// FIRST HALF FINISHED
// ============================================================

function isFirstHalfFinished(m) {

  const values = [
    m?.status,
    m?.status_type,
    m?.match_status,
    m?.state,
    m?.phase,
    m?.period
  ];


  for (
    const value of values
  ) {

    if (
      hasHalfTimeValue(
        value
      )
    ) {
      return true;
    }
  }


  const nestedValues = [
    m?.status?.type,
    m?.status?.name,
    m?.status?.short,
    m?.status?.long,
    m?.match_status?.type,
    m?.match_status?.name,
    m?.match_status?.short,
    m?.match_status?.long,
    m?.state?.type,
    m?.state?.name,
    m?.state?.short,
    m?.state?.long
  ];


  for (
    const value of nestedValues
  ) {

    if (
      hasHalfTimeValue(
        value
      )
    ) {
      return true;
    }
  }


  return false;
}


function hasHalfTimeValue(
  value
) {

  const text =
    String(
      value || ""
    )
      .toUpperCase()
      .trim();


  return (
    text === "HT" ||
    text === "HALFTIME" ||
    text === "HALF TIME" ||
    text === "HALF-TIME" ||
    text === "1H FINISHED" ||
    text === "FIRST HALF FINISHED" ||
    text === "END OF FIRST HALF" ||
    text === "END OF 1H" ||
    text === "1H END"
  );
}


// ============================================================
// CLOUDBET ODDS — HUNTER ENTRY
// MATCHER V7.3.1 FAST_HUNTER
//
// Matcher already reads Cloudbet directly.
// Tracker only consumes secure match + exact odds.
//
// BEST EFFORT:
// Any failure returns null.
// Hunter ENTRY is NEVER blocked.
// ============================================================

async function getCloudbetOddsForHunter(
  env,
  m,
  hunterScore
) {

  if (!env.MATCHER) {
    return {
      success: false,
      matcher_reason: "MATCHER_BINDING_MISSING",
      matcher_attempts: 0,
      event_id: null
    };
  }

  const split = splitHunterMatchName(m?.match || m?.name || "");
  const home = String(
    m?.home ?? m?.homeTeam ?? m?.home_name ?? m?.home?.name ?? split.home ?? ""
  ).trim();
  const away = String(
    m?.away ?? m?.awayTeam ?? m?.away_name ?? m?.away?.name ?? split.away ?? ""
  ).trim();

  if (!home || !away) {
    return {
      success: false,
      matcher_reason: "HUNTER_TEAMS_MISSING",
      matcher_attempts: 0,
      event_id: null
    };
  }

  const hunterSignal = [{
    type: "HUNTER_ENTRY",
    signal: "HUNTER_ENTRY",
    match: m?.match ?? `${home} - ${away}`,
    match_id: m?.id ?? null,
    home,
    away,
    league: m?.league ?? m?.tournament ?? m?.competition ?? null,
    competition: m?.competition ?? m?.league ?? m?.tournament ?? null,
    country: m?.country ?? null,
    entry_minute: Number(m?.minute ?? 0),
    current_minute: Number(m?.minute ?? 0),
    hunter_score: hunterScore
  }];

  const matcherPath =
    "/match?threshold=0.45&signals=" +
    encodeURIComponent(JSON.stringify(hunterSignal));

  let lastDiagnostic = {
    success: false,
    event_id: null,
    matcher_reason: "MATCHER_NO_RESULT",
    matcher_attempts: 0,
    classification: null,
    match_mode: null,
    cloudbet_minute: null,
    minute_difference: null,
    candidate_evaluations: null,
    minute_candidates: null,
    best_candidate: null
  };

  for (let attempt = 1; attempt <= MATCHER_ENTRY_ATTEMPTS; attempt++) {
    try {
      const matcherResponse = await env.MATCHER.fetch(
        new Request("https://matcher.internal" + matcherPath, {
          method: "GET",
          headers: { "Accept": "application/json" }
        })
      );

      if (!matcherResponse.ok) {
        const text = await matcherResponse.text();
        lastDiagnostic = {
          ...lastDiagnostic,
          matcher_reason: "MATCHER_HTTP_" + matcherResponse.status,
          matcher_attempts: attempt,
          matcher_error: text.substring(0, 160)
        };
      } else {
        const matcherData = await matcherResponse.json();
        const hunterResults = Array.isArray(matcherData?.hunter_results)
          ? matcherData.hunter_results
          : [];
        const result = hunterResults.find(item =>
          String(item?.signal?.match_id ?? "") === String(m?.id ?? "")
        ) ?? hunterResults[0] ?? null;

        const diagnostics = result?.diagnostics ?? matcherData?.diagnostics ?? {};
        const scoring = result?.matcher_scoring ?? {};

        lastDiagnostic = {
          success: false,
          event_id: result?.cloudbet?.event_id ?? result?.cloudbet?.id ?? null,
          matcher_reason:
            result?.reason ??
            matcherData?.reason ??
            (matcherData?.success === true ? "MATCHER_NO_SECURE_MATCH" : "MATCHER_SUCCESS_FALSE"),
          matcher_attempts: attempt,
          classification: result?.classification ?? null,
          match_mode: result?.matchMode ?? result?.match_mode ?? null,
          cloudbet_minute:
            diagnostics?.cloudbet_minute ?? result?.cloudbet?.minute ?? null,
          minute_difference:
            diagnostics?.minute_difference ?? null,
          candidate_evaluations:
            diagnostics?.candidate_evaluations ?? null,
          minute_candidates:
            diagnostics?.minute_candidates ?? null,
          best_candidate:
            diagnostics?.best_candidate ?? diagnostics?.best ?? null,
          matcher_score: numberOrNull(scoring?.total),
          home_score: numberOrNull(scoring?.home_score),
          away_score: numberOrNull(scoring?.away_score)
        };

        const secure =
          matcherData?.success === true &&
          result?.status === "MATCH" &&
          result?.classification === "CONFIDENT_MATCH" &&
          result?.security?.secure_match === true &&
          lastDiagnostic.event_id !== null;

        if (secure) {
          const odds = result?.odds ?? null;
          const rawPrice = numberOrNull(odds?.price ?? odds?.raw_price);
          const selectionStatus = String(
            odds?.selection_status ?? odds?.status ?? ""
          ).trim().toUpperCase();
          const oddsAvailable =
            odds?.available === true &&
            rawPrice !== null && rawPrice > 1 &&
            (!selectionStatus || selectionStatus === "SELECTION_ENABLED");

          return {
            ...lastDiagnostic,
            success: true,
            matcher_reason: result?.reason ?? "CONFIDENT_MATCH",
            match: result?.cloudbet?.match ?? null,
            cloudbet_status: result?.cloudbet?.status ?? null,
            price: oddsAvailable ? rawPrice : null,
            odds_available: oddsAvailable,
            selection_status: selectionStatus || null,
            max_stake: oddsAvailable ? numberOrNull(odds?.max_stake ?? odds?.maxStake) : null,
            min_stake: oddsAvailable ? numberOrNull(odds?.min_stake ?? odds?.minStake) : null,
            probability: oddsAvailable ? numberOrNull(odds?.probability) : null,
            market_url: odds?.market_url ?? odds?.marketUrl ??
              "soccer.total_goals_period_first_half/over?total=0.5",
            secure_match: true
          };
        }
      }
    } catch (error) {
      lastDiagnostic = {
        ...lastDiagnostic,
        matcher_reason: "MATCHER_EXCEPTION",
        matcher_attempts: attempt,
        matcher_error: error?.message || String(error)
      };
    }

    // Retry only after a failed strict lookup. No thresholds/names are relaxed.
    if (attempt < MATCHER_ENTRY_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, MATCHER_RETRY_DELAY_MS));
    }
  }

  console.log(
    "CLOUDBET MATCHER UNMATCHED",
    m?.match || "",
    lastDiagnostic.matcher_reason,
    "attempts=" + lastDiagnostic.matcher_attempts
  );

  return lastDiagnostic;
}


// ============================================================
// V6.7.9.2 — AI MATCHER PARALLEL RESCUE
// ============================================================
function buildAiHunterPayload(m, hunterScore) {
  const rawMatch = m?.match || m?.name || "";
  const split = splitHunterMatchName(rawMatch);
  const home = String(m?.home ?? m?.homeTeam ?? m?.home_name ?? m?.home?.name ?? split.home ?? "").trim();
  const away = String(m?.away ?? m?.awayTeam ?? m?.away_name ?? m?.away?.name ?? split.away ?? "").trim();
  return {
    type: "HUNTER_ENTRY", signal: "HUNTER_ENTRY", match_id: m?.id ?? null,
    match: rawMatch || `${home} - ${away}`, match_name: rawMatch || `${home} - ${away}`,
    home, away,
    competition: m?.competition ?? m?.league ?? m?.tournament ?? null,
    league: m?.league ?? m?.tournament ?? m?.competition ?? null,
    country: m?.country ?? null,
    entry_minute: numberOrNull(m?.minute), current_minute: numberOrNull(m?.minute),
    hunter_score: numberOrNull(hunterScore),
    score: { home: numberOrNull(m?.score?.home) ?? 0, away: numberOrNull(m?.score?.away) ?? 0 },
    resolve_mode: "FALLBACK_SEARCH"
  };
}

async function getAiMatchForHunter(env, m, hunterScore) {
  if (!env.AI_MATCHER) return { success:false, accepted:false, event_id:null, confidence:null, reason:"AI_MATCHER_BINDING_MISSING", source:"AI" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await env.AI_MATCHER.fetch(new Request("https://ai-matcher.internal/resolve", {
      method:"POST", headers:{"content-type":"application/json","accept":"application/json"},
      body:JSON.stringify(buildAiHunterPayload(m,hunterScore)), signal:controller.signal
    }));
    const rawText = await response.text();
    let data = null;
    try { data = rawText ? JSON.parse(rawText) : null; }
    catch { return { success:false, accepted:false, event_id:null, confidence:null, reason:"AI_MATCHER_INVALID_JSON", source:"AI" }; }
    if (!response.ok || data?.success !== true) return { success:false, accepted:false, event_id:null, confidence:null, reason:data?.error || `AI_MATCHER_HTTP_${response.status}`, source:"AI" };
    const result = data?.result ?? {};
    const rawId = result?.event_id ?? result?.candidate?.event_id ?? result?.candidate?.id ?? null;
    const eventId = rawId == null || String(rawId).trim()==="" ? null : String(rawId).trim();
    const confidence = numberOrNull(result?.confidence);
    const categoryGuardOk = result?.category_guard?.ok === true;
    const accepted = result?.accepted === true && eventId !== null && confidence !== null && confidence >= 0.90 && categoryGuardOk;
    return {
      success:accepted, accepted, event_id:accepted ? eventId : null,
      match:accepted ? (result?.cloudbet_match ?? result?.candidate?.match ?? null) : null,
      confidence, category_guard_ok:categoryGuardOk,
      reason:accepted ? (result?.reason || "AI_MATCH_ACCEPTED") :
        (confidence !== null && confidence < 0.90 ? "AI_CONFIDENCE_BELOW_090" :
        (!categoryGuardOk ? "AI_CATEGORY_GUARD_FAILED" : (result?.reason || "AI_MATCH_NOT_ACCEPTED"))),
      source:"AI"
    };
  } catch(error) {
    return { success:false, accepted:false, event_id:null, confidence:null,
      reason:error?.name === "AbortError" ? "AI_MATCHER_TIMEOUT" : "AI_MATCHER_EXCEPTION",
      error:error?.message || String(error), source:"AI" };
  } finally { clearTimeout(timeout); }
}

function aiMatchToCloudbetResult(ai) {
  if (ai?.success !== true || ai?.accepted !== true || !ai?.event_id || numberOrNull(ai?.confidence) === null || Number(ai?.confidence) < 0.90 || ai?.category_guard_ok !== true) {
    return { success:false, event_id:null, match:null, matcher_reason:ai?.reason || "AI_NO_MATCH", matcher_attempts:0, matcher_score:null, match_source:"AI", ai_confidence:numberOrNull(ai?.confidence), secure_match:false };
  }
  return {
    success:true, event_id:String(ai.event_id), match:ai?.match ?? null,
    matcher_reason:ai?.reason || "AI_MATCHED", matcher_attempts:0,
    matcher_score:numberOrNull(ai?.confidence), secure_match:true, match_source:"AI",
    ai_confidence:numberOrNull(ai?.confidence), price:null, odds_available:false,
    max_stake:null, min_stake:null, probability:null, selection_status:null,
    market_url:"soccer.total_goals_period_first_half/over?total=0.5"
  };
}

async function resolveParallelMatchForHunter(env, m, hunterScore) {
  // BOTH start before either is awaited.
  const mechanicalPromise = getCloudbetOddsForHunter(env,m,hunterScore);
  const aiPromise = getAiMatchForHunter(env,m,hunterScore);
  let mechanical;
  try { mechanical = await mechanicalPromise; }
  catch(error) { mechanical={success:false,event_id:null,matcher_reason:"MATCHER_EXCEPTION",matcher_attempts:0,matcher_error:error?.message||String(error)}; }
  if (mechanical?.success === true && mechanical?.event_id) {
    return {...mechanical,match_source:"MECHANICAL",ai_started_in_parallel:true};
  }
  let ai;
  try { ai = await aiPromise; }
  catch(error) { ai={success:false,accepted:false,event_id:null,confidence:null,reason:"AI_MATCHER_EXCEPTION",error:error?.message||String(error)}; }
  if (ai?.success === true && ai?.accepted === true && ai?.event_id) {
    return {...aiMatchToCloudbetResult(ai),mechanical_reason:mechanical?.matcher_reason??"MATCHER_NO_MATCH",mechanical_attempts:mechanical?.matcher_attempts??0,ai_started_in_parallel:true};
  }
  return {
    success:false,event_id:null,match:null,
    matcher_reason:ai?.reason ?? mechanical?.matcher_reason ?? "MATCHERS_NO_MATCH",
    matcher_attempts:mechanical?.matcher_attempts??0,
    mechanical_reason:mechanical?.matcher_reason??null,ai_reason:ai?.reason??null,
    ai_confidence:numberOrNull(ai?.confidence),secure_match:false,match_source:"UNMATCHED",ai_started_in_parallel:true
  };
}

// ============================================================
// MATCH NAME SPLIT FOR MATCHER
// ============================================================

function splitHunterMatchName(
  value
) {

  const text =
    String(
      value || ""
    ).trim();


  if (!text) {

    return {
      home: null,
      away: null
    };
  }


  const separators = [
    " - ",
    " v ",
    " vs ",
    " VS ",
    " @ "
  ];


  for (
    const separator of
      separators
  ) {

    const index =
      text.indexOf(
        separator
      );


    if (
      index >= 0
    ) {

      return {
        home:
          text
            .slice(
              0,
              index
            )
            .trim(),

        away:
          text
            .slice(
              index +
              separator.length
            )
            .trim()
      };
    }
  }


  return {
    home: null,
    away: null
  };
}


// ============================================================
// BET WORKER PREFLIGHT — TELEGRAM ONLY
//
// Bet Worker V7.3.1 remains the ONLY authority for BET READY.
// Tracker does NOT duplicate:
// - current market / selection verification
// - current odds refresh
// - account authentication
// - balance
// - min/max stake
//
// IMPORTANT:
// This is READ/DRY-RUN preflight only.
// It NEVER places a real wager.
// Any failure returns NOT READY and never blocks Hunter ENTRY.
// ============================================================

async function getBetReadyForHunter(
  env,
  m,
  cloudbet
) {

  const eventId =
    cloudbet?.event_id ??
    null;


  if (!env.BET_WORKER) {

    return {
      checked: false,
      ready: false,
      reason:
        "BET_WORKER_BINDING_MISSING",
      action:
        "NOT_CHECKED",
      current_odds:
        null,
      max_stake:
        null,
      account_balance:
        null
    };
  }


  try {

    // V6.7.6:
//
// 1. DAILY REPORT: OPEN count
// 2. DAILY REPORT: average real Cloudbet ENTRY odds
// 3. DAILY REPORT: break-even odds
// 4. DAILY REPORT: exact P/L from each resolved signal with known entry_odds
// 5. DAILY REPORT: ROI based only on resolved signals with known entry_odds
// 6. Minute groups include OPEN / Avg odds / Break-even / P/L / ROI
// 7. Missing odds are excluded from financial P/L/ROI, never invented
// 8. Hunter / Matcher / Bet Worker / tracking logic unchanged
//
// V6.7.5:
//
    // Send THIS exact matched event directly to Bet Worker.
    // No general /run and no search through ready/pending/skipped arrays.
    const rawMatch =
      m?.match ??
      m?.name ??
      null;

    const split =
      splitHunterMatchName(
        rawMatch
      );

    const oldMatcherEventId =
      eventId === null ||
      eventId === undefined ||
      String(eventId).trim() === ""
        ? null
        : String(eventId);

    const oldMatcherSecure =
      cloudbet?.success === true &&
      oldMatcherEventId !== null;

    const payload = {
      event_id:
        oldMatcherEventId,

      // V6.7.8 — synchronize deterministic matcher with AI matcher.
      // A secure old-matcher event becomes an identity lock.
      matcher_sync: {
        old_matcher_event_id:
          oldMatcherEventId,
        old_matcher_locked:
          oldMatcherSecure,
        old_matcher_score:
          numberOrNull(
            cloudbet?.matcher_score
          ),
        ai_mode:
          oldMatcherSecure
            ? "VERIFY_LOCKED_EVENT"
            : "FALLBACK_SEARCH"
      },

      match_id:
        m?.id ??
        m?.match_id ??
        null,

      match:
        rawMatch,

      match_name:
        rawMatch,

      home:
        m?.home ??
        split.home ??
        null,

      away:
        m?.away ??
        split.away ??
        null,

      competition:
        m?.league ??
        m?.tournament ??
        m?.competition ??
        null,

      league:
        m?.league ??
        m?.tournament ??
        m?.competition ??
        null,

      entry_minute:
        numberOrNull(
          m?.minute
        ),

      hunter_score:
        numberOrNull(
          m?.goal_signal?.score ??
          m?.hunter_score
        ),

      entry_odds:
        numberOrNull(
          cloudbet?.entry_odds
        ),

      max_stake:
        numberOrNull(
          cloudbet?.max_stake
        ),

      matcher_score:
        numberOrNull(
          cloudbet?.matcher_score
        )
    };


    const response =
      await env.BET_WORKER.fetch(
        new Request(
          "https://bet-worker.internal/preflight",
          {
            method:
              "POST",

            headers: {
              "Accept":
                "application/json",

              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                payload
              )
          }
        )
      );


    if (!response.ok) {

      const responseText =
        await response.text();

      return {
        checked: false,
        ready: false,
        reason:
          "BET_WORKER_HTTP_" +
          response.status +
          (
            responseText
              ? " | " +
                responseText.substring(
                  0,
                  160
                )
              : ""
          ),
        action:
          "ERROR",
        current_odds:
          null,
        max_stake:
          null,
        account_balance:
          null
      };
    }


    const data =
      await response.json();


    if (
      data?.success !== true
    ) {

      return {
        checked:
          true,

        ready:
          false,

        reason:
          data?.reason ??
          data?.error ??
          "BET_WORKER_SUCCESS_FALSE",

        action:
          data?.action ??
          "ERROR",

        current_odds:
          numberOrNull(
            data?.current_odds
          ),

        max_stake:
          numberOrNull(
            data?.max_stake
          ),

        account_balance:
          numberOrNull(
            data?.account_balance ??
            data?.account?.balance
          ),

        event_id:
          data?.event_id ??
          null,

        cloudbet_match:
          data?.ai_match?.cloudbet_match ??
          null,

        ai_confidence:
          numberOrNull(
            data?.ai_match?.confidence
          )
      };
    }


    return {
      checked:
        true,

      ready:
        data?.ready ===
          true,

      reason:
        data?.reason ??
        (
          data?.ready === true
            ? "ALL_PREFLIGHT_CHECKS_PASSED"
            : "PREFLIGHT_NOT_READY"
        ),

      action:
        data?.action ??
        (
          data?.ready === true
            ? "READY_TO_BET"
            : "NOT_READY"
        ),

      current_odds:
        numberOrNull(
          data?.current_odds
        ),

      max_stake:
        numberOrNull(
          data?.max_stake
        ),

      account_balance:
        numberOrNull(
          data?.account_balance ??
          data?.account?.balance
        ),

      event_id:
        data?.event_id ??
        null,

      cloudbet_match:
        data?.ai_match?.cloudbet_match ??
        null,

      ai_confidence:
        numberOrNull(
          data?.ai_match?.confidence
        )
    };


  } catch (error) {

    return {
      checked:
        false,

      ready:
        false,

      reason:
        "BET_WORKER_ERROR: " +
        (
          error?.message ||
          String(error)
        ),

      action:
        "ERROR",

      current_odds:
        null,

      max_stake:
        null,

      account_balance:
        null
    };
  }
}


// ============================================================
// CREATE HUNTER ENTRY
// ============================================================

async function createHunterEntry(
  env,
  m,
  now,
  local,
  trackingMap,
  hunterScore
) {

  const id =
    String(
      m?.id || ""
    );


  if (!id)
    return;


  if (
    trackingMap.has(id)
  ) {
    return;
  }


  const minute =
    Number(
      m?.minute ?? 0
    );


  const requiredScore =
    getRequiredHunterScore(
      minute
    );


  if (
    requiredScore === null
  ) {
    return;
  }


  if (
    hunterScore <
      requiredScore
  ) {
    return;
  }


  const home =
    Number(
      m?.score?.home ?? 0
    );


  const away =
    Number(
      m?.score?.away ?? 0
    );


  const matchName =
    m?.match ||
    "Unknown match";


  const league =
    m?.league ||
    m?.tournament ||
    m?.competition ||
    "LIVE";


  const goalPressure =
    numberOrNull(
      m?.derived?.goal_pressure
    );


  const dangerIndex =
    numberOrNull(
      m?.derived?.danger_index
    );


  const attackScore =
    numberOrNull(
      m?.derived?.attack_score
    );


  const nowIso =
    now.toISOString();


  // ==========================================================
  // FIRST INSERT ENTRY
  //
  // IMPORTANT:
  // Hunter is stored BEFORE Cloudbet lookup.
  // Therefore odds failure cannot lose the Hunter signal.
  // ==========================================================

  const insert =
    await env.DB
      .prepare(`
        INSERT INTO hunter_signals (

          match_id,
          match_name,
          league,

          entry_time,
          entry_minute,

          hunter_score,
          goal_pressure,
          danger_index,
          attack_score,

          entry_home_score,
          entry_away_score,

          status,
          result,

          created_at,
          updated_at

        )

        SELECT

          ?, ?, ?,

          ?, ?,

          ?, ?, ?, ?,

          ?, ?,

          'TRACKING',
          NULL,

          ?, ?

        WHERE NOT EXISTS (

          SELECT 1
          FROM hunter_signals
          WHERE match_id = ?

        )
      `)
      .bind(
        id,
        matchName,
        league,
        nowIso,
        minute,
        hunterScore,
        goalPressure,
        dangerIndex,
        attackScore,
        home,
        away,
        nowIso,
        nowIso,
        id
      )
      .run();


  const changes =
    Number(
      insert?.meta?.changes ||
      0
    );


  if (
    changes < 1
  ) {
    return;
  }


  const insertedId =
    insert?.meta?.last_row_id ||
    null;


  const signal = {
    id:
      insertedId,

    match_id:
      id,

    match_name:
      matchName,

    league,

    entry_time:
      nowIso,

    entry_minute:
      minute,

    hunter_score:
      hunterScore,

    goal_pressure:
      goalPressure,

    danger_index:
      dangerIndex,

    attack_score:
      attackScore,

    entry_home_score:
      home,

    entry_away_score:
      away,

    telegram_message_id:
      null
  };


  trackingMap.set(
    id,
    signal
  );


  // ==========================================================
  // CLOUDBET ODDS
  //
  // BEST EFFORT.
  // NEVER cancel Telegram ENTRY.
  // ==========================================================

  let cloudbetOdds =
    null;


  try {

    cloudbetOdds =
      await resolveParallelMatchForHunter(
        env,
        m,
        hunterScore
      );

  } catch (error) {

    console.error(
      "ENTRY CLOUDBET LOOKUP ERROR",
      id,
      error?.message ||
      String(error)
    );

    cloudbetOdds =
      null;
  }


  // ==========================================================
  // SAVE ENTRY ODDS TO D1
  // ==========================================================

  if (
    cloudbetOdds?.success ===
      true
  ) {

    try {

      await env.DB
        .prepare(`
          UPDATE hunter_signals
          SET
            cloudbet_event_id = ?,
            entry_odds = ?,
            cloudbet_max_stake = ?,
            cloudbet_match = ?,
            odds_available = ?,
            matcher_score = ?,
            updated_at = ?
          WHERE id = ?
        `)
        .bind(
          cloudbetOdds.event_id ?? null,
          cloudbetOdds.price ?? null,
          cloudbetOdds.max_stake ?? null,
          cloudbetOdds.match ?? null,
          cloudbetOdds.odds_available ? 1 : 0,
          cloudbetOdds.matcher_score ?? null,
          nowIso,
          insertedId
        )
        .run();

      console.log(
        "CLOUDBET ENTRY ODDS SAVED",
        id,
        cloudbetOdds.event_id,
        cloudbetOdds.price
      );

    } catch (error) {

      // DB odds storage must not block Telegram ENTRY.
      console.error(
        "CLOUDBET ODDS DB SAVE ERROR",
        id,
        error?.message ||
        String(error)
      );
    }

  } else {

    console.log(
      "CLOUDBET ENTRY ODDS UNAVAILABLE",
      id,
      matchName
    );
  }


  // ==========================================================
  // BET READY PREFLIGHT
  //
  // Best effort only.
  // Hunter ENTRY must still be sent if Bet Worker is unavailable.
  // ==========================================================

  let betReady =
    null;


  try {

    betReady =
      await getBetReadyForHunter(
        env,
        m,
        cloudbetOdds
      );

  } catch (error) {

    console.error(
      "BET READY PREFLIGHT ERROR",
      id,
      error?.message ||
      String(error)
    );

    betReady = {
      checked:
        false,
      ready:
        false,
      reason:
        "BET_READY_CHECK_FAILED",
      action:
        "ERROR",
      current_odds:
        null,
      max_stake:
        null,
      account_balance:
        null
    };
  }


  // ==========================================================
  // V6.7.9.5 — SYNC AI PREFLIGHT ODDS BACK TO ENTRY ODDS
  //
  // AI matcher returns a locked event_id but usually no price.
  // If Bet Worker preflight finds the exact 1H O0.5 price for
  // that SAME locked event, treat it as the real ENTRY odds.
  // This fixes: Entry odds WAITING + Current odds X.XX.
  // ==========================================================

  const preflightOdds =
    numberOrNull(
      betReady?.current_odds
    );

  const finalEventId =
    cloudbetOdds?.event_id === null ||
    cloudbetOdds?.event_id === undefined
      ? null
      : String(cloudbetOdds.event_id);

  const preflightEventId =
    betReady?.event_id === null ||
    betReady?.event_id === undefined ||
    String(betReady.event_id).trim() === ""
      ? finalEventId
      : String(betReady.event_id);

  const sameLockedEvent =
    finalEventId !== null &&
    preflightEventId !== null &&
    finalEventId === preflightEventId;

  if (
    cloudbetOdds?.success === true &&
    sameLockedEvent &&
    numberOrNull(cloudbetOdds?.price) === null &&
    preflightOdds !== null &&
    preflightOdds > 1
  ) {

    cloudbetOdds = {
      ...cloudbetOdds,
      price: preflightOdds,
      entry_odds: preflightOdds,
      odds_available: true,
      max_stake:
        numberOrNull(betReady?.max_stake) ??
        numberOrNull(cloudbetOdds?.max_stake)
    };

    try {
      await env.DB
        .prepare(`
          UPDATE hunter_signals
          SET
            entry_odds = ?,
            cloudbet_max_stake = COALESCE(?, cloudbet_max_stake),
            odds_available = 1,
            updated_at = ?
          WHERE id = ?
            AND status = 'TRACKING'
            AND cloudbet_event_id = ?
            AND entry_odds IS NULL
        `)
        .bind(
          preflightOdds,
          numberOrNull(betReady?.max_stake),
          nowIso,
          insertedId,
          finalEventId
        )
        .run();

      console.log(
        "AI PREFLIGHT ODDS SYNCED TO ENTRY",
        id,
        finalEventId,
        preflightOdds
      );

    } catch (error) {
      console.error(
        "AI PREFLIGHT ODDS SYNC DB ERROR",
        id,
        error?.message || String(error)
      );
    }
  }

  // ==========================================================
  // TELEGRAM ENTRY
  // ==========================================================

  const shadowEntry = isShadowEntryMinute(minute);

  const telegramMessageId =
    shadowEntry
      ? null
      : await sendTelegram(
          env,
          formatEntryMessage(
            m,
            hunterScore,
            local,
            cloudbetOdds,
            betReady
          )
        );


  if (
    telegramMessageId !== null &&
    telegramMessageId !==
      undefined
  ) {

    await env.DB
      .prepare(`
        UPDATE hunter_signals
        SET
          telegram_message_id = ?,
          updated_at = ?
        WHERE id = ?
          AND status = 'TRACKING'
      `)
      .bind(
        telegramMessageId,
        nowIso,
        insertedId
      )
      .run();


    signal.telegram_message_id =
      telegramMessageId;
  }
}


// ============================================================
// MISSING TRACKING
// ============================================================

async function finalizeMissingTracking(
  env,
  signal,
  now
) {

  const entryMinute =
    Number(
      signal?.entry_minute ||
      0
    );


  const safeEntryMinute =
    Math.max(
      0,
      Math.min(
        42,
        entryMinute
      )
    );


  // V6.7.10.4 SAFE MISSING-FEED FALLBACK
  //
  // A match disappearing from the V27 live list is NOT proof of HT 0:0.
  // V6.7.10.3 finalized these signals close to HT, which can create a
  // false NO_GOAL during a temporary feed transition.
  //
  // Return to the conservative timeout. The final DF_SUI goal check
  // below is still executed before any NO_GOAL is written.
  const requiredMinutes =
    Math.max(
      68,
      (
        90 -
        safeEntryMinute
      ) +
      15 +
      20
    );


  const entryTime =
    new Date(
      signal?.entry_time ||
      signal?.created_at ||
      ""
    );


  if (
    Number.isNaN(
      entryTime.getTime()
    )
  ) {
    return;
  }


  const ageMinutes =
    (
      now.getTime() -
      entryTime.getTime()
    ) /
    60000;


  if (
    ageMinutes <
      requiredMinutes
  ) {
    return;
  }


  // One final first-half event check before closing a missing match.
  // This catches 45+N goals even if the main V27 match disappeared.
  try {
    const lateFirstHalfGoal =
      await getPostEntryDfSuiGoal(
        String(
          signal?.match_id ||
          ""
        ),
        safeEntryMinute
      );

    if (lateFirstHalfGoal) {
      const goalMinute =
        lateFirstHalfGoal.minute;

      const afterMinutes =
        Math.max(
          0,
          goalMinute - safeEntryMinute
        );

      const fakeTrackingMap =
        new Map([
          [
            String(signal?.match_id || ""),
            signal
          ]
        ]);

      await resolveTrackingGoal(
        env,
        signal,
        {
          id: signal?.match_id,
          score:
            lateFirstHalfGoal.score ||
            {
              home:
                Number(signal?.entry_home_score || 0),
              away:
                Number(signal?.entry_away_score || 0)
            }
        },
        fakeTrackingMap,
        String(signal?.match_id || ""),
        now,
        goalMinute,
        afterMinutes,
        "DF_SUI_1H_MISSING"
      );

      return;
    }
  } catch (error) {
    console.error(
      "MISSING DF_SUI ERROR",
      signal?.match_id,
      error?.message || String(error)
    );
  }


  const nowIso =
    now.toISOString();


  const update =
    await env.DB
      .prepare(`
        UPDATE hunter_signals
        SET
          status = 'NO_GOAL',
          result = 'NO GOAL',
          updated_at = ?
        WHERE id = ?
          AND status = 'TRACKING'
      `)
      .bind(
        nowIso,
        signal.id
      )
      .run();


  const changes =
    Number(
      update?.meta?.changes ||
      0
    );


  if (
    changes < 1
  ) {
    return;
  }


  if (!isShadowSignal(signal)) {
    await sendTelegram(
      env,
      formatNoGoalMessage(
        signal,
        {
          score: {
            home:
              signal?.entry_home_score ??
              0,

            away:
              signal?.entry_away_score ??
              0
          }
        }
      ),
      signal?.telegram_message_id
    );
  }
}


// ============================================================
// HUNTER FILTER
// ============================================================

function isHunterCandidate(
  m,
  score
) {

  const minute =
    Number(
      m?.minute ?? 0
    );


  const period =
    String(
      m?.period || ""
    ).toUpperCase();


  const home =
    Number(
      m?.score?.home ?? 0
    );


  const away =
    Number(
      m?.score?.away ?? 0
    );


  const firstHalf =
    period === "1H" ||
    period === "FIRST" ||
    period === "FIRST HALF" ||
    period === "1ST HALF" ||
    period.includes(
      "1H"
    );


  if (!firstHalf)
    return false;


  if (
    home !== 0 ||
    away !== 0
  ) {
    return false;
  }


  if (
    minute < HUNTER_FROM ||
    minute > HUNTER_TO
  ) {
    return false;
  }


  const requiredScore = getRequiredHunterScore(minute);

  if (requiredScore === null || score < requiredScore) {
    return false;
  }

  return true;
}


function getRequiredHunterScore(minute) {
  const m = Number(minute || 0);

  if (m >= 5 && m <= 9) return 50;
  if (m >= 10 && m <= 25) return 60;
  if (m >= 26 && m <= 34) return 90;
  if (m >= 35 && m <= 42) return 100;

  return null;
}

function isShadowEntryMinute(minute) {
  const m = Number(minute || 0);
  return m >= SHADOW_FROM && m <= SHADOW_TO;
}

function isShadowSignal(signal) {
  return isShadowEntryMinute(signal?.entry_minute);
}


function getHunterScore(m) {

  const score =
    numberOrNull(
      m?.goal_signal?.score
    );


  if (
    score === null
  ) {
    return 0;
  }


  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        score
      )
    )
  );
}


// ============================================================
// MONTH HELPERS
// ============================================================

function getBulgarianMonthName(
  month
) {

  const months = [
    "ЯНУАРИ",
    "ФЕВРУАРИ",
    "МАРТ",
    "АПРИЛ",
    "МАЙ",
    "ЮНИ",
    "ЮЛИ",
    "АВГУСТ",
    "СЕПТЕМВРИ",
    "ОКТОМВРИ",
    "НОЕМВРИ",
    "ДЕКЕМВРИ"
  ];


  return (
    months[
      Number(month) - 1
    ] ||
    String(month)
  );
}


function getMonthKey(
  dateString
) {

  const match =
    String(
      dateString || ""
    ).match(
      /^(\d{4})-(\d{2})/
    );


  if (!match)
    return null;


  return (
    match[1] +
    "-" +
    match[2]
  );
}


function formatMonthLabel(
  monthKey
) {

  const match =
    String(
      monthKey || ""
    ).match(
      /^(\d{4})-(\d{2})$/
    );


  if (!match)
    return monthKey;


  return (
    getBulgarianMonthName(
      Number(
        match[2]
      )
    ) +
    " " +
    match[1]
  );
}


function getSofiaMonthUtcBounds(
  monthKey
) {

  const match =
    String(
      monthKey || ""
    ).match(
      /^(\d{4})-(\d{2})$/
    );


  if (!match)
    return null;


  const year =
    Number(
      match[1]
    );


  const month =
    Number(
      match[2]
    );


  if (
    !year ||
    !month ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }


  const startDate =
    `${year}-${String(month).padStart(2, "0")}-01`;


  const nextDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;


  const start =
    getSofiaDayUtcBounds(
      startDate
    );


  const end =
    getSofiaDayUtcBounds(
      nextDate
    );


  if (
    !start ||
    !end
  ) {
    return null;
  }


  return {
    start:
      start.start,

    end:
      end.start
  };
}


function getSofiaDayUtcBounds(
  dateString
) {

  const match =
    String(
      dateString || ""
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (!match)
    return null;


  const year =
    Number(
      match[1]
    );


  const month =
    Number(
      match[2]
    );


  const day =
    Number(
      match[3]
    );


  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }


  const getOffsetMinutes =
    utcMillis => {

      const parts =
        SOFIA_FORMATTER.formatToParts(
          new Date(
            utcMillis
          )
        );


      const get =
        type => {

          const part =
            parts.find(
              p =>
                p.type === type
            );


          return Number(
            part?.value
          );
        };


      const localAsUtc =
        Date.UTC(
          get("year"),
          get("month") - 1,
          get("day"),
          get("hour"),
          get("minute"),
          get("second")
        );


      return (
        localAsUtc -
        utcMillis
      ) /
      60000;
    };


  const localMidnightGuess =
    Date.UTC(
      year,
      month - 1,
      day
    );


  const startOffset =
    getOffsetMinutes(
      localMidnightGuess
    );


  const startMillis =
    localMidnightGuess -
    startOffset *
    60000;


  const nextLocalMidnightGuess =
    Date.UTC(
      year,
      month - 1,
      day + 1
    );


  const endOffset =
    getOffsetMinutes(
      nextLocalMidnightGuess
    );


  const endMillis =
    nextLocalMidnightGuess -
    endOffset *
    60000;


  return {
    start:
      new Date(
        startMillis
      ).toISOString(),

    end:
      new Date(
        endMillis
      ).toISOString()
  };
}


// ============================================================
// MONTH STATISTICS
// ============================================================

async function getMonthlyStats(
  env,
  monthKey
) {

  const bounds =
    getSofiaMonthUtcBounds(
      monthKey
    );


  if (!bounds) {

    return {
      monthKey,
      total: 0,
      goals: 0,
      noGoals: 0,
      resolved: 0,
      rate: 0,
      avg: null
    };
  }


  const result =
    await env.DB
      .prepare(`
        SELECT

          COUNT(*) AS total,

          SUM(
            CASE
              WHEN result = 'GOAL HIT'
              THEN 1
              ELSE 0
            END
          ) AS goals,

          SUM(
            CASE
              WHEN result = 'NO GOAL'
              THEN 1
              ELSE 0
            END
          ) AS no_goals,

          AVG(
            CASE
              WHEN result = 'GOAL HIT'
              AND goal_after_minutes IS NOT NULL
              THEN goal_after_minutes
            END
          ) AS avg_goal_after

        FROM hunter_signals

        WHERE created_at >= ?
          AND created_at < ?
          AND ${HUNTER_HISTORY_SQL}
      `)
      .bind(
        bounds.start,
        bounds.end
      )
      .first();


  const total =
    Number(
      result?.total || 0
    );


  const goals =
    Number(
      result?.goals || 0
    );


  const noGoals =
    Number(
      result?.no_goals || 0
    );


  const resolved =
    goals +
    noGoals;


  const rate =
    resolved > 0
      ? goals /
        resolved *
        100
      : 0;


  const avg =
    result?.avg_goal_after !==
      null &&
    result?.avg_goal_after !==
      undefined
      ? Number(
          result.avg_goal_after
        )
      : null;


  return {
    monthKey,
    total,
    goals,
    noGoals,
    resolved,
    rate,
    avg
  };
}


async function getMonthlyHistory(
  env,
  currentMonth
) {

  const result =
    await env.DB
      .prepare(`
        SELECT created_at
        FROM hunter_signals
        WHERE created_at IS NOT NULL
          AND ${HUNTER_HISTORY_SQL}
      `)
      .all();


  const monthSet =
    new Set();


  for (
    const row of
      result?.results || []
  ) {

    const createdAt =
      new Date(
        row?.created_at
      );


    if (
      Number.isNaN(
        createdAt.getTime()
      )
    ) {
      continue;
    }


    const local =
      getSofiaTime(
        createdAt
      );


    const key =
      getMonthKey(
        local.date
      );


    if (key) {
      monthSet.add(key);
    }
  }


  monthSet.add(
    currentMonth
  );


  const months =
    Array.from(
      monthSet
    )
      .sort(
        (a, b) =>
          b.localeCompare(a)
      );


  const stats = [];


  for (
    const monthKey of months
  ) {

    stats.push(
      await getMonthlyStats(
        env,
        monthKey
      )
    );
  }


  return stats;
}


function formatMonthGraph(
  goals,
  noGoals
) {

  const total =
    Number(
      goals || 0
    ) +
    Number(
      noGoals || 0
    );


  if (
    total <= 0
  ) {

    return (
      "🟢 GOAL     —\n" +
      "🔴 NO GOAL  —"
    );
  }


  const graphLength =
    20;


  const goalBlocks =
    Math.round(
      Number(
        goals || 0
      ) /
      total *
      graphLength
    );


  const noGoalBlocks =
    Math.max(
      0,
      graphLength -
      goalBlocks
    );


  const goalBar =
    "█".repeat(
      goalBlocks
    ) +
    "░".repeat(
      Math.max(
        0,
        graphLength -
        goalBlocks
      )
    );


  const noGoalBar =
    "█".repeat(
      noGoalBlocks
    ) +
    "░".repeat(
      Math.max(
        0,
        graphLength -
        noGoalBlocks
      )
    );


  const rate =
    Number(
      goals || 0
    ) /
    total *
    100;


  const noGoalRate =
    Number(
      noGoals || 0
    ) /
    total *
    100;


  return (
`🟢 GOAL     ${goalBar} ${rate.toFixed(1)}%
🔴 NO GOAL  ${noGoalBar} ${noGoalRate.toFixed(1)}%`
  );
}


function formatMonthlyBlock(
  stats
) {

  return (
`━━━━━━━━━━━━━━━━
📅 ${formatMonthLabel(stats.monthKey)}
━━━━━━━━━━━━━━━━

🎯 ENTRY: ${stats.total}

🟢 GOAL HIT: ${stats.goals}

🔴 NO GOAL: ${stats.noGoals}

📈 Успеваемост:
${stats.rate.toFixed(1)}%

⏱ Средно до гол:
${
  stats.avg !== null
    ? stats.avg.toFixed(1) +
      " мин."
    : "—"
}

${formatMonthGraph(
  stats.goals,
  stats.noGoals
)}`
  );
}


// ============================================================
// CURRENT MONTH DETAIL
// ============================================================

async function getCurrentMonthDetails(
  env,
  monthKey
) {

  const bounds =
    getSofiaMonthUtcBounds(
      monthKey
    );


  if (!bounds) {

    return {
      scoreRows: [],
      minuteRows: [],
      hourRows: [],
      hourMinuteRows: [],
      leagueRows: []
    };
  }


  const scoreResult =
    await env.DB
      .prepare(`
        SELECT

          CASE

            WHEN hunter_score BETWEEN 60 AND 69
              THEN '60–69'

            WHEN hunter_score BETWEEN 70 AND 79
              THEN '70–79'

            WHEN hunter_score BETWEEN 80 AND 89
              THEN '80–89'

            WHEN hunter_score BETWEEN 90 AND 100
              THEN '90–100'

          END AS score_group,

          COUNT(*) AS total,

          SUM(
            CASE
              WHEN result = 'GOAL HIT'
              THEN 1
              ELSE 0
            END
          ) AS goals,

          SUM(
            CASE
              WHEN result = 'NO GOAL'
              THEN 1
              ELSE 0
            END
          ) AS no_goals,

          AVG(
            CASE
              WHEN result = 'GOAL HIT'
              AND goal_after_minutes IS NOT NULL
              THEN goal_after_minutes
            END
          ) AS avg_goal_after

        FROM hunter_signals

        WHERE created_at >= ?
          AND created_at < ?
          AND ${HUNTER_HISTORY_SQL}

        GROUP BY score_group

        ORDER BY
          CASE score_group
            WHEN '60–69' THEN 1
            WHEN '70–79' THEN 2
            WHEN '80–89' THEN 3
            WHEN '90–100' THEN 4
          END
      `)
      .bind(
        bounds.start,
        bounds.end
      )
      .all();


  const minuteResult =
    await env.DB
      .prepare(`
        SELECT

          CASE

            WHEN entry_minute BETWEEN 10 AND 19
              THEN '10–19′'

            WHEN entry_minute BETWEEN 20 AND 24
              THEN '20–24′'

            WHEN entry_minute BETWEEN 25 AND 29
              THEN '25–29′'

            WHEN entry_minute BETWEEN 30 AND 34
              THEN '30–34′'

            WHEN entry_minute BETWEEN 35 AND 42
              THEN '35–42′'

          END AS minute_group,

          COUNT(*) AS total,

          SUM(
            CASE
              WHEN result = 'GOAL HIT'
              THEN 1
              ELSE 0
            END
          ) AS goals,

          SUM(
            CASE
              WHEN result = 'NO GOAL'
              THEN 1
              ELSE 0
            END
          ) AS no_goals

        FROM hunter_signals

        WHERE created_at >= ?
          AND created_at < ?
          AND ${HUNTER_HISTORY_SQL}
          AND entry_minute BETWEEN 10 AND 42

        GROUP BY minute_group

        ORDER BY
          CASE minute_group
            WHEN '10–19′' THEN 1
            WHEN '20–24′' THEN 2
            WHEN '25–29′' THEN 3
            WHEN '30–34′' THEN 4
            WHEN '35–42′' THEN 5
          END
      `)
      .bind(
        bounds.start,
        bounds.end
      )
      .all();


  const hourSource =
    await env.DB
      .prepare(`
        SELECT
          created_at,
          entry_minute,
          result
        FROM hunter_signals
        WHERE created_at >= ?
          AND created_at < ?
          AND ${HUNTER_HISTORY_SQL}
      `)
      .bind(
        bounds.start,
        bounds.end
      )
      .all();


  const hourRows =
    buildHourRows(
      hourSource?.results ||
      []
    );


  const hourMinuteRows =
    buildHourMinuteRows(
      hourSource?.results ||
      []
    );


  const leagueResult =
    await env.DB
      .prepare(`
        SELECT
          league,
          COUNT(*) AS total,

          SUM(
            CASE
              WHEN result = 'GOAL HIT'
              THEN 1
              ELSE 0
            END
          ) AS goals,

          SUM(
            CASE
              WHEN result = 'NO GOAL'
              THEN 1
              ELSE 0
            END
          ) AS no_goals

        FROM hunter_signals

        WHERE created_at >= ?
          AND created_at < ?
          AND ${HUNTER_HISTORY_SQL}
          AND league IS NOT NULL
          AND TRIM(league) <> ''
          AND UPPER(TRIM(league)) <> 'LIVE'

        GROUP BY league
      `)
      .bind(
        bounds.start,
        bounds.end
      )
      .all();


  const leagueRows =
    (
      leagueResult?.results ||
      []
    )
      .map(row => {

        const total =
          Number(
            row?.total || 0
          );


        const goals =
          Number(
            row?.goals || 0
          );


        const noGoals =
          Number(
            row?.no_goals || 0
          );


        const resolved =
          goals +
          noGoals;


        const rate =
          resolved > 0
            ? goals /
              resolved *
              100
            : 0;


        return {
          league:
            String(
              row?.league ||
              ""
            ).trim(),

          total,

          goals,

          no_goals:
            noGoals,

          resolved,

          rate
        };
      })
      .filter(
        row =>
          row.league &&
          row.resolved >=
            MIN_LEAGUE_RESOLVED
      );


  return {
    scoreRows:
      scoreResult?.results ||
      [],

    minuteRows:
      minuteResult?.results ||
      [],

    hourRows,

    hourMinuteRows,

    leagueRows
  };
}


// ============================================================
// HOUR GROUPING
// ============================================================

function buildHourRows(rows) {

  const map =
    new Map();


  for (
    const group of
      ENTRY_HOUR_GROUPS
  ) {

    map.set(
      group.label,
      {
        hour_group:
          group.label,

        total: 0,

        goals: 0,

        no_goals: 0
      }
    );
  }


  for (
    const row of rows
  ) {

    const date =
      new Date(
        row?.created_at ||
        ""
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      continue;
    }


    const local =
      getSofiaTime(
        date
      );


    const hour =
      Number(
        local.hour
      );


    const group =
      ENTRY_HOUR_GROUPS.find(
        g =>
          hour >= g.min &&
          hour <= g.max
      );


    if (!group)
      continue;


    const item =
      map.get(
        group.label
      );


    item.total++;


    if (
      row?.result ===
        "GOAL HIT"
    ) {

      item.goals++;

    } else if (
      row?.result ===
        "NO GOAL"
    ) {

      item.no_goals++;
    }
  }


  return ENTRY_HOUR_GROUPS.map(
    g =>
      map.get(
        g.label
      )
  );
}


function buildHourMinuteRows(
  rows
) {

  const matrix =
    new Map();


  for (
    const hourGroup of
      ENTRY_HOUR_GROUPS
  ) {

    for (
      const minuteGroup of
        ENTRY_MINUTE_GROUPS
    ) {

      const key =
        hourGroup.label +
        "|" +
        minuteGroup.label;


      matrix.set(
        key,
        {
          hour_group:
            hourGroup.label,

          minute_group:
            minuteGroup.label,

          total: 0,

          goals: 0,

          no_goals: 0
        }
      );
    }
  }


  for (
    const row of rows
  ) {

    const date =
      new Date(
        row?.created_at ||
        ""
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      continue;
    }


    const local =
      getSofiaTime(
        date
      );


    const hour =
      Number(
        local.hour
      );


    const entryMinute =
      Number(
        row?.entry_minute
      );


    const hourGroup =
      ENTRY_HOUR_GROUPS.find(
        g =>
          hour >= g.min &&
          hour <= g.max
      );


    const minuteGroup =
      ENTRY_MINUTE_GROUPS.find(
        g =>
          entryMinute >=
            g.min &&
          entryMinute <=
            g.max
      );


    if (
      !hourGroup ||
      !minuteGroup
    ) {
      continue;
    }


    const key =
      hourGroup.label +
      "|" +
      minuteGroup.label;


    const item =
      matrix.get(key);


    if (!item)
      continue;


    item.total++;


    if (
      row?.result ===
        "GOAL HIT"
    ) {

      item.goals++;

    } else if (
      row?.result ===
        "NO GOAL"
    ) {

      item.no_goals++;
    }
  }


  const result = [];


  for (
    const hourGroup of
      ENTRY_HOUR_GROUPS
  ) {

    for (
      const minuteGroup of
        ENTRY_MINUTE_GROUPS
    ) {

      const key =
        hourGroup.label +
        "|" +
        minuteGroup.label;


      result.push(
        matrix.get(key)
      );
    }
  }


  return result;
}


// ============================================================
// DAILY MINUTE STATS
// ============================================================

async function getHunterMinuteStatsForBounds(env, bounds) {
  if (!bounds) return [];

  const result = await env.DB
    .prepare(`
      SELECT
        CASE
          WHEN entry_minute BETWEEN 10 AND 19 THEN '10–19′'
          WHEN entry_minute BETWEEN 20 AND 24 THEN '20–24′'
          WHEN entry_minute BETWEEN 25 AND 29 THEN '25–29′'
          WHEN entry_minute BETWEEN 30 AND 34 THEN '30–34′'
          WHEN entry_minute BETWEEN 35 AND 42 THEN '35–42′'
        END AS minute_group,
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${HUNTER_HISTORY_SQL}
      GROUP BY minute_group
      ORDER BY CASE minute_group
        WHEN '10–19′' THEN 1
        WHEN '20–24′' THEN 2
        WHEN '25–29′' THEN 3
        WHEN '30–34′' THEN 4
        WHEN '35–42′' THEN 5
      END
    `)
    .bind(bounds.start, bounds.end)
    .all();

  return result?.results || [];
}

function formatHunterMinuteStats(rows) {
  const map = new Map((rows || []).map(row => [row.minute_group, row]));
  let text = '';
  for (const group of ENTRY_MINUTE_GROUPS) {
    const row = map.get(group.label);
    const total = Number(row?.total || 0);
    const goals = Number(row?.goals || 0);
    const noGoals = Number(row?.no_goals || 0);
    const resolved = goals + noGoals;
    const rate = resolved > 0 ? goals / resolved * 100 : 0;
    if (!total) text += `${group.label}: 0 ENTRY\n`;
    else text += `${group.label}: ${total} ENTRY | ${goals} GOAL | ${noGoals} NO GOAL | ${rate.toFixed(1)}%\n`;
  }
  return text;
}

async function getOddsStatsForBounds(env, bounds) {
  if (!bounds) return null;
  return await env.DB.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
      SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
      AVG(entry_odds) AS avg_entry_odds,
      SUM(CASE WHEN result IN ('GOAL HIT','NO GOAL') THEN 1 ELSE 0 END) AS financial_bets,
      SUM(CASE
        WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
        WHEN result = 'NO GOAL' THEN -?
        ELSE 0
      END) AS profit_loss
    FROM hunter_signals
    WHERE created_at >= ?
      AND created_at < ?
      AND ${REPORT_ELIGIBLE_SQL}
  `).bind(REPORT_STAKE, REPORT_STAKE, bounds.start, bounds.end).first();
}

async function getMinuteStatsForBounds(
  env,
  bounds
) {

  if (!bounds) {
    return [];
  }


  const result =
    await env.DB
      .prepare(`
        SELECT

          CASE

            WHEN entry_minute BETWEEN 10 AND 19
              THEN '10–19′'

            WHEN entry_minute BETWEEN 20 AND 24
              THEN '20–24′'

            WHEN entry_minute BETWEEN 25 AND 29
              THEN '25–29′'

            WHEN entry_minute BETWEEN 30 AND 34
              THEN '30–34′'

            WHEN entry_minute BETWEEN 35 AND 42
              THEN '35–42′'

          END AS minute_group,

          COUNT(*) AS total,

          SUM(
            CASE
              WHEN result = 'GOAL HIT'
              THEN 1
              ELSE 0
            END
          ) AS goals,

          SUM(
            CASE
              WHEN result = 'NO GOAL'
              THEN 1
              ELSE 0
            END
          ) AS no_goals,

          SUM(
            CASE
              WHEN result IS NULL
                OR result NOT IN ('GOAL HIT', 'NO GOAL')
              THEN 1
              ELSE 0
            END
          ) AS open_count,

          AVG(
            CASE
              WHEN entry_odds IS NOT NULL
               AND entry_odds > 1
              THEN entry_odds
            END
          ) AS avg_entry_odds,

          SUM(
            CASE
              WHEN result IN ('GOAL HIT', 'NO GOAL')
               AND entry_odds IS NOT NULL
               AND entry_odds > 1
              THEN 1
              ELSE 0
            END
          ) AS financial_bets,

          SUM(
            CASE
              WHEN result = 'GOAL HIT'
               AND entry_odds IS NOT NULL
               AND entry_odds > 1
              THEN ? * (entry_odds - 1)

              WHEN result = 'NO GOAL'
               AND entry_odds IS NOT NULL
               AND entry_odds > 1
              THEN -?

              ELSE 0
            END
          ) AS profit_loss

        FROM hunter_signals

        WHERE created_at >= ?
          AND created_at < ?
          AND ${REPORT_ELIGIBLE_SQL}
          AND entry_minute BETWEEN 10 AND 42

        GROUP BY minute_group

        ORDER BY
          CASE minute_group
            WHEN '10–19′' THEN 1
            WHEN '20–24′' THEN 2
            WHEN '25–29′' THEN 3
            WHEN '30–34′' THEN 4
            WHEN '35–42′' THEN 5
          END
      `)
      .bind(
        REPORT_STAKE,
        REPORT_STAKE,
        bounds.start,
        bounds.end
      )
      .all();


  return (
    result?.results ||
    []
  );
}


function formatMoney(
  value
) {
  const n = Number(value || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}


function formatMinuteStats(
  rows
) {

  const map =
    new Map();


  for (
    const row of
      rows || []
  ) {

    map.set(
      row.minute_group,
      row
    );
  }


  let text = "";


  for (
    const group of
      ENTRY_MINUTE_GROUPS
  ) {

    const row =
      map.get(
        group.label
      );


    if (!row) {

      text +=
        `${group.label}: 0 ENTRY\n`;

      continue;
    }


    const total =
      Number(
        row.total || 0
      );


    const goals =
      Number(
        row.goals || 0
      );


    const noGoals =
      Number(
        row.no_goals || 0
      );


    const resolved =
      goals +
      noGoals;


    const open =
      Math.max(
        0,
        total -
        resolved
      );


    const rate =
      resolved > 0
        ? goals /
          resolved *
          100
        : 0;


    const breakEven =
      goals > 0 &&
      resolved > 0
        ? resolved /
          goals
        : null;


    const avgOdds =
      numberOrNull(
        row.avg_entry_odds
      );


    const financialBets =
      Number(
        row.financial_bets || 0
      );


    const profitLoss =
      Number(
        row.profit_loss || 0
      );


    const roi =
      financialBets > 0
        ? profitLoss /
          (
            financialBets *
            REPORT_STAKE
          ) *
          100
        : null;


    text +=
      `${group.label}: ` +
      `${total} ENTRY | ` +
      `${goals} GOAL | ` +
      `${noGoals} NO GOAL` +
      (
        open > 0
          ? ` | ${open} OPEN`
          : ""
      ) +
      ` | ${rate.toFixed(1)}%\n` +
      `   🎲 Avg odds: ${
        avgOdds !== null
          ? avgOdds.toFixed(2)
          : "—"
      } | ⚖️ BE: ${
        breakEven !== null
          ? breakEven.toFixed(2)
          : "—"
      }\n` +
      `   💶 P/L: ${
        financialBets > 0
          ? formatMoney(
              profitLoss
            ) + " EUR"
          : "—"
      } | 📈 ROI: ${
        roi !== null
          ? (
              roi > 0
                ? "+"
                : ""
            ) +
            roi.toFixed(1) +
            "%"
          : "—"
      } | bets: ${financialBets}\n`;
  }


  return text;
}


// ============================================================
// TODAY COMMAND
// ============================================================

async function buildTodayStats(env, requestedDate = null, reportTitle = "📊 HUNTER TODAY") {

  const now = new Date();
  const local = getSofiaTime(now);
  const today = requestedDate || local.date;
  const bounds = getSofiaDayUtcBounds(today);

  if (!bounds) {
    return `${reportTitle}\n\n📅 ${today}\n\n❌ Не успях да изчисля дневните граници.`;
  }

  const overall = await env.DB
    .prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
        AVG(CASE WHEN result = 'GOAL HIT' AND goal_after_minutes IS NOT NULL THEN goal_after_minutes END) AS avg_goal_after,
        AVG(entry_odds) AS avg_entry_odds,
        SUM(CASE WHEN result IN ('GOAL HIT','NO GOAL') THEN 1 ELSE 0 END) AS financial_bets,
        SUM(
          CASE
            WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
            WHEN result = 'NO GOAL' THEN -?
            ELSE 0
          END
        ) AS profit_loss
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${REPORT_ELIGIBLE_SQL}
    `)
    .bind(
      REPORT_STAKE,
      REPORT_STAKE,
      bounds.start,
      bounds.end
    )
    .first();

  const scoreResult = await env.DB
    .prepare(`
      SELECT
        CASE
          WHEN hunter_score BETWEEN 60 AND 69 THEN '60–69'
          WHEN hunter_score BETWEEN 70 AND 79 THEN '70–79'
          WHEN hunter_score BETWEEN 80 AND 89 THEN '80–89'
          WHEN hunter_score BETWEEN 90 AND 100 THEN '90–100'
        END AS score_group,
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${REPORT_ELIGIBLE_SQL}
      GROUP BY score_group
    `)
    .bind(bounds.start, bounds.end)
    .all();

  const minuteRows = await getMinuteStatsForBounds(env, bounds);

  // Full-month recalculation with the CURRENT BET READY filter.
  // Historical D1 rows are not modified or deleted.
  const cleanStart = bounds.start;

  const cleanOverall = await env.DB
    .prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
        AVG(CASE WHEN result = 'GOAL HIT' AND goal_after_minutes IS NOT NULL THEN goal_after_minutes END) AS avg_goal_after,
        AVG(entry_odds) AS avg_entry_odds,
        SUM(CASE WHEN result IN ('GOAL HIT','NO GOAL') THEN 1 ELSE 0 END) AS financial_bets,
        SUM(
          CASE
            WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
            WHEN result = 'NO GOAL' THEN -?
            ELSE 0
          END
        ) AS profit_loss
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${BET_READY_HISTORY_SQL}
    `)
    .bind(
      REPORT_STAKE,
      REPORT_STAKE,
      cleanStart,
      bounds.end
    )
    .first();

  const oddsResult = await env.DB
    .prepare(`
      SELECT
        CASE
          WHEN entry_odds >= 1.00 AND entry_odds < 1.40 THEN '1.00–1.39'
          WHEN entry_odds >= 1.40 AND entry_odds < 1.70 THEN '1.40–1.69'
          WHEN entry_odds >= 1.70 AND entry_odds < 2.00 THEN '1.70–1.99'
          WHEN entry_odds >= 2.00 AND entry_odds < 2.50 THEN '2.00–2.49'
          WHEN entry_odds >= 2.50 AND entry_odds < 3.50 THEN '2.50–3.49'
          WHEN entry_odds >= 3.50 AND entry_odds < 5.00 THEN '3.50–4.99'
          ELSE '5.00+'
        END AS odds_group,
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
        AVG(entry_odds) AS avg_entry_odds,
        SUM(
          CASE
            WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
            WHEN result = 'NO GOAL' THEN -?
            ELSE 0
          END
        ) AS profit_loss
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${BET_READY_HISTORY_SQL}
      GROUP BY odds_group
    `)
    .bind(
      REPORT_STAKE,
      REPORT_STAKE,
      bounds.start,
      bounds.end
    )
    .all();

  const cleanOddsResult = await env.DB
    .prepare(`
      SELECT
        CASE
          WHEN entry_odds >= 1.00 AND entry_odds < 1.40 THEN '1.00–1.39'
          WHEN entry_odds >= 1.40 AND entry_odds < 1.70 THEN '1.40–1.69'
          WHEN entry_odds >= 1.70 AND entry_odds < 2.00 THEN '1.70–1.99'
          WHEN entry_odds >= 2.00 AND entry_odds < 2.50 THEN '2.00–2.49'
          WHEN entry_odds >= 2.50 AND entry_odds < 3.50 THEN '2.50–3.49'
          WHEN entry_odds >= 3.50 AND entry_odds < 5.00 THEN '3.50–4.99'
          ELSE '5.00+'
        END AS odds_group,
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
        AVG(entry_odds) AS avg_entry_odds,
        SUM(
          CASE
            WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
            WHEN result = 'NO GOAL' THEN -?
            ELSE 0
          END
        ) AS profit_loss
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${BET_READY_HISTORY_SQL}
      GROUP BY odds_group
    `)
    .bind(
      REPORT_STAKE,
      REPORT_STAKE,
      cleanStart,
      bounds.end
    )
    .all();

  const total = Number(overall?.total || 0);
  const goals = Number(overall?.goals || 0);
  const noGoals = Number(overall?.no_goals || 0);
  const resolved = goals + noGoals;
  const open = Math.max(0, total - resolved);
  const rate = resolved > 0 ? goals / resolved * 100 : 0;

  const avgGoalAfter = numberOrNull(overall?.avg_goal_after);
  const avgOdds = numberOrNull(overall?.avg_entry_odds);
  const financialBets = Number(overall?.financial_bets || 0);
  const profitLoss = Number(overall?.profit_loss || 0);
  const roi = financialBets > 0
    ? profitLoss / (financialBets * REPORT_STAKE) * 100
    : null;

  let message =
`${reportTitle}

📅 ${today}

🎯 ENTRY: ${total}
🟢 GOAL HIT: ${goals}
🔴 NO GOAL: ${noGoals}${open > 0 ? `\n⏳ OPEN: ${open}` : ""}

📈 Успеваемост: ${rate.toFixed(1)}%
⏱ Средно до гол: ${avgGoalAfter !== null ? avgGoalAfter.toFixed(1) + " мин." : "—"}
🎲 Avg odds: ${avgOdds !== null ? avgOdds.toFixed(2) : "—"}
💶 P/L: ${financialBets > 0 ? formatMoney(profitLoss) + " EUR" : "—"}
📈 ROI: ${roi !== null ? (roi > 0 ? "+" : "") + roi.toFixed(1) + "%" : "—"}

━━━━━━━━━━━━━━━━
⏱ ДНЕС — ПО ENTRY МИНУТА
━━━━━━━━━━━━━━━━
${formatMinuteStats(minuteRows)}
━━━━━━━━━━━━━━━━
🔥 ДНЕС — ПО HUNTER SCORE
━━━━━━━━━━━━━━━━
`;

  const scoreMap = new Map();
  for (const row of scoreResult?.results || []) {
    scoreMap.set(row.score_group, row);
  }

  for (const group of ["60–69", "70–79", "80–89", "90–100"]) {
    const row = scoreMap.get(group);
    if (!row) {
      message += `${group}: 0 ENTRY\n`;
      continue;
    }

    const rowTotal = Number(row.total || 0);
    const rowGoals = Number(row.goals || 0);
    const rowNoGoals = Number(row.no_goals || 0);
    const rowResolved = rowGoals + rowNoGoals;
    const rowRate = rowResolved > 0 ? rowGoals / rowResolved * 100 : 0;

    message += `${group}: ${rowTotal} ENTRY | ${rowGoals} GOAL | ${rowNoGoals} NO GOAL | ${rowRate.toFixed(1)}%\n`;
  }

  message +=
`\n━━━━━━━━━━━━━━━━
🎲 Само мачове с реален entry odds
🎯 Dynamic Score filter
🕐 Europe/Sofia`;

  return message;
}


// ============================================================
// SHADOW STATS — /shadowstats
// Experimental 5–9 minute Hunter population
// ============================================================

async function buildShadowStats(env) {

  const result = await env.DB
    .prepare(`
      SELECT
        entry_minute,
        hunter_score,
        result,
        goal_after_minutes,
        entry_odds
      FROM hunter_signals
      WHERE entry_minute BETWEEN 5 AND 9
        AND hunter_score >= 50
        AND cloudbet_event_id IS NOT NULL
        AND TRIM(CAST(cloudbet_event_id AS TEXT)) <> ''
        AND entry_odds IS NOT NULL
        AND entry_odds > 1
        AND odds_available = 1
      ORDER BY created_at ASC
    `)
    .all();

  const rows = result?.results || [];

  const total = rows.length;
  const goals = rows.filter(r => r?.result === "GOAL HIT").length;
  const noGoals = rows.filter(r => r?.result === "NO GOAL").length;
  const open = Math.max(0, total - goals - noGoals);
  const resolved = goals + noGoals;
  const successRate = resolved > 0 ? goals / resolved * 100 : 0;

  const goalTimes = rows
    .filter(r => r?.result === "GOAL HIT")
    .map(r => numberOrNull(r?.goal_after_minutes))
    .filter(v => v !== null);

  const avgGoalAfter = goalTimes.length
    ? goalTimes.reduce((a, b) => a + b, 0) / goalTimes.length
    : null;

  const oddsRows = rows.filter(r => {
    const odds = numberOrNull(r?.entry_odds);
    return odds !== null && odds > 1;
  });

  let oddsPL = 0;
  let oddsResolved = 0;

  for (const row of oddsRows) {
    const odds = numberOrNull(row?.entry_odds);
    if (row?.result === "GOAL HIT") {
      oddsPL += REPORT_STAKE * (odds - 1);
      oddsResolved += 1;
    } else if (row?.result === "NO GOAL") {
      oddsPL -= REPORT_STAKE;
      oddsResolved += 1;
    }
  }

  const avgOdds = oddsRows.length
    ? oddsRows.reduce((sum, row) => sum + Number(row.entry_odds), 0) / oddsRows.length
    : null;

  const oddsROI = oddsResolved > 0
    ? oddsPL / (oddsResolved * REPORT_STAKE) * 100
    : null;

  let message =
`👻 SHADOW BET READY STATS — 5–9′

🧪 Само ранни сигнали, които реално са станали BET READY
🔥 Минимален Score: 50

🎯 ENTRY: ${total}
🟢 GOAL HIT: ${goals}
🔴 NO GOAL: ${noGoals}${open > 0 ? `\n⏳ OPEN: ${open}` : ""}

📈 Успеваемост: ${successRate.toFixed(1)}%
⏱ Средно до гол: ${avgGoalAfter !== null ? avgGoalAfter.toFixed(1) + " мин." : "—"}
🎲 Avg odds: ${avgOdds !== null ? avgOdds.toFixed(2) : "—"}
💶 P/L @ €${REPORT_STAKE.toFixed(0)}: ${oddsResolved ? formatMoney(oddsPL) + " EUR" : "—"}
📈 ROI: ${oddsROI !== null ? (oddsROI > 0 ? "+" : "") + oddsROI.toFixed(1) + "%" : "—"}

━━━━━━━━━━━━━━━━
⏱ ПО ТОЧНА ENTRY МИНУТА
━━━━━━━━━━━━━━━━
`;

  for (let minute = 5; minute <= 9; minute++) {
    const group = rows.filter(r => Number(r?.entry_minute) === minute);
    const g = group.filter(r => r?.result === "GOAL HIT").length;
    const ng = group.filter(r => r?.result === "NO GOAL").length;
    const resolvedMinute = g + ng;
    const rate = resolvedMinute > 0 ? g / resolvedMinute * 100 : 0;

    message += group.length
      ? `${minute}′: ${group.length} ENTRY | ${g} GOAL | ${ng} NO GOAL | ${rate.toFixed(1)}%\n`
      : `${minute}′: 0 ENTRY\n`;
  }

  message +=
`\n━━━━━━━━━━━━━━━━
🔥 ПО HUNTER SCORE
━━━━━━━━━━━━━━━━
`;

  for (const [minScore, maxScore, label] of [
    [50, 54, "50–54"],
    [55, 59, "55–59"],
    [60, 64, "60–64"],
    [65, 69, "65–69"],
    [70, 79, "70–79"],
    [80, 89, "80–89"],
    [90, 100, "90–100"]
  ]) {
    const group = rows.filter(r => {
      const score = Number(r?.hunter_score || 0);
      return score >= minScore && score <= maxScore;
    });
    const g = group.filter(r => r?.result === "GOAL HIT").length;
    const ng = group.filter(r => r?.result === "NO GOAL").length;
    const resolvedScore = g + ng;
    const rate = resolvedScore > 0 ? g / resolvedScore * 100 : 0;

    message += group.length
      ? `${label}: ${group.length} ENTRY | ${g} GOAL | ${ng} NO GOAL | ${rate.toFixed(1)}%\n`
      : `${label}: 0 ENTRY\n`;
  }

  message +=
`\n━━━━━━━━━━━━━━━━
👻 Само SHADOW BET READY — не влиза в /betstats
🎲 Cloudbet event + реален entry odds + odds_available
💾 Не-BET-READY Shadow сигналите не участват в тази команда
🕐 Europe/Sofia`;

  return message;
}


// ============================================================
// BET READY HISTORY — /betstats
// V6.7.10.7
// ============================================================

async function buildBetReadyStats(env) {

  const now = new Date();
  const local = getSofiaTime(now);
  const today = local.date;
  const currentMonth = getMonthKey(today);
  const bounds = getSofiaMonthUtcBounds(currentMonth);

  if (!bounds) {
    return `💰 BET READY STATS\n\n❌ Не успях да изчисля месечните граници.`;
  }

  const cleanStart =
    bounds.start > BETSTATS_CLEAN_START_UTC
      ? bounds.start
      : BETSTATS_CLEAN_START_UTC;

  const overall = await env.DB
    .prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
        AVG(CASE WHEN result = 'GOAL HIT' AND goal_after_minutes IS NOT NULL THEN goal_after_minutes END) AS avg_goal_after,
        AVG(entry_odds) AS avg_entry_odds,
        SUM(CASE WHEN result IN ('GOAL HIT','NO GOAL') THEN 1 ELSE 0 END) AS financial_bets,
        SUM(
          CASE
            WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
            WHEN result = 'NO GOAL' THEN -?
            ELSE 0
          END
        ) AS profit_loss
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${BET_READY_HISTORY_SQL}
    `)
    .bind(REPORT_STAKE, REPORT_STAKE, cleanStart, bounds.end)
    .first();

  const dailyResult = await env.DB
    .prepare(`
      SELECT
        substr(datetime(created_at, '+3 hours'), 1, 10) AS day_key,
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
        AVG(entry_odds) AS avg_entry_odds,
        SUM(
          CASE
            WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
            WHEN result = 'NO GOAL' THEN -?
            ELSE 0
          END
        ) AS profit_loss
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${BET_READY_HISTORY_SQL}
      GROUP BY day_key
      ORDER BY day_key DESC
      LIMIT 10
    `)
    .bind(REPORT_STAKE, REPORT_STAKE, cleanStart, bounds.end)
    .all();

  const minuteResult = await env.DB
    .prepare(`
      SELECT
        CASE
          WHEN entry_minute BETWEEN 10 AND 19 THEN '10–19′'
          WHEN entry_minute BETWEEN 20 AND 24 THEN '20–24′'
          WHEN entry_minute BETWEEN 25 AND 29 THEN '25–29′'
          WHEN entry_minute BETWEEN 30 AND 34 THEN '30–34′'
          WHEN entry_minute BETWEEN 35 AND 42 THEN '35–42′'
        END AS minute_group,
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
        AVG(entry_odds) AS avg_entry_odds,
        SUM(
          CASE
            WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
            WHEN result = 'NO GOAL' THEN -?
            ELSE 0
          END
        ) AS profit_loss
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${BET_READY_HISTORY_SQL}
      GROUP BY minute_group
      ORDER BY CASE minute_group
        WHEN '10–19′' THEN 1
        WHEN '20–24′' THEN 2
        WHEN '25–29′' THEN 3
        WHEN '30–34′' THEN 4
        WHEN '35–42′' THEN 5
      END
    `)
    .bind(REPORT_STAKE, REPORT_STAKE, cleanStart, bounds.end)
    .all();

  const scoreResult = await env.DB
    .prepare(`
      SELECT
        CASE
          WHEN hunter_score BETWEEN 60 AND 69 THEN '60–69'
          WHEN hunter_score BETWEEN 70 AND 79 THEN '70–79'
          WHEN hunter_score BETWEEN 80 AND 89 THEN '80–89'
          WHEN hunter_score BETWEEN 90 AND 100 THEN '90–100'
        END AS score_group,
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${BET_READY_HISTORY_SQL}
      GROUP BY score_group
    `)
    .bind(cleanStart, bounds.end)
    .all();

  const oddsResult = await env.DB
    .prepare(`
      SELECT
        CASE
          WHEN entry_odds >= 1.00 AND entry_odds < 1.40 THEN '1.00–1.39'
          WHEN entry_odds >= 1.40 AND entry_odds < 1.70 THEN '1.40–1.69'
          WHEN entry_odds >= 1.70 AND entry_odds < 2.00 THEN '1.70–1.99'
          WHEN entry_odds >= 2.00 AND entry_odds < 2.50 THEN '2.00–2.49'
          WHEN entry_odds >= 2.50 AND entry_odds < 3.50 THEN '2.50–3.49'
          WHEN entry_odds >= 3.50 AND entry_odds < 5.00 THEN '3.50–4.99'
          ELSE '5.00+'
        END AS odds_group,
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'GOAL HIT' THEN 1 ELSE 0 END) AS goals,
        SUM(CASE WHEN result = 'NO GOAL' THEN 1 ELSE 0 END) AS no_goals,
        AVG(entry_odds) AS avg_entry_odds,
        SUM(
          CASE
            WHEN result = 'GOAL HIT' THEN ? * (entry_odds - 1)
            WHEN result = 'NO GOAL' THEN -?
            ELSE 0
          END
        ) AS profit_loss
      FROM hunter_signals
      WHERE created_at >= ?
        AND created_at < ?
        AND ${BET_READY_HISTORY_SQL}
      GROUP BY odds_group
    `)
    .bind(REPORT_STAKE, REPORT_STAKE, cleanStart, bounds.end)
    .all();

  const total = Number(overall?.total || 0);
  const goals = Number(overall?.goals || 0);
  const noGoals = Number(overall?.no_goals || 0);
  const resolved = goals + noGoals;
  const open = Math.max(0, total - resolved);
  const rate = resolved > 0 ? goals / resolved * 100 : 0;
  const avgGoalAfter = numberOrNull(overall?.avg_goal_after);
  const avgOdds = numberOrNull(overall?.avg_entry_odds);
  const financialBets = Number(overall?.financial_bets || 0);
  const profitLoss = Number(overall?.profit_loss || 0);
  const roi = financialBets > 0
    ? profitLoss / (financialBets * REPORT_STAKE) * 100
    : null;

  let message =
`💰 BET READY STATS — CURRENT FILTER

📅 ${currentMonth} · целият месец по текущия BET READY филтър

🎯 ENTRY: ${total}
🟢 GOAL HIT: ${goals}
🔴 NO GOAL: ${noGoals}${open > 0 ? `\n⏳ OPEN: ${open}` : ""}

📈 Успеваемост: ${rate.toFixed(1)}%
⏱ Средно до гол: ${avgGoalAfter !== null ? avgGoalAfter.toFixed(1) + " мин." : "—"}
🎲 Avg odds: ${avgOdds !== null ? avgOdds.toFixed(2) : "—"}
💶 P/L: ${financialBets > 0 ? formatMoney(profitLoss) + " EUR" : "—"}
📈 ROI: ${roi !== null ? (roi > 0 ? "+" : "") + roi.toFixed(1) + "%" : "—"}

━━━━━━━━━━━━━━━━
📆 ПО ДНИ
━━━━━━━━━━━━━━━━
`;

  const dailyRows = dailyResult?.results || [];
  if (!dailyRows.length) {
    message += `Няма BET READY записи след фикса.\n`;
  } else {
    for (const row of dailyRows) {
      const dTotal = Number(row?.total || 0);
      const dGoals = Number(row?.goals || 0);
      const dNoGoals = Number(row?.no_goals || 0);
      const dResolved = dGoals + dNoGoals;
      const dOpen = Math.max(0, dTotal - dResolved);
      const dRate = dResolved > 0 ? dGoals / dResolved * 100 : 0;
      const dOdds = numberOrNull(row?.avg_entry_odds);
      const dPL = Number(row?.profit_loss || 0);
      const dRoi = dResolved > 0 ? dPL / (dResolved * REPORT_STAKE) * 100 : null;

      message += `${row?.day_key || "—"}: ${dTotal} ENTRY | ${dGoals} GOAL | ${dNoGoals} NO GOAL${dOpen ? ` | ${dOpen} OPEN` : ""} | ${dRate.toFixed(1)}%\n`;
      message += `   🎲 ${dOdds !== null ? dOdds.toFixed(2) : "—"} | 💶 ${dResolved ? formatMoney(dPL) + " EUR" : "—"} | ROI ${dRoi !== null ? (dRoi > 0 ? "+" : "") + dRoi.toFixed(1) + "%" : "—"}\n`;
    }
  }

  message += `\n━━━━━━━━━━━━━━━━
🏦 ВИРТУАЛНА БАНКА · €${BETSTATS_START_BANK.toFixed(2)} START
━━━━━━━━━━━━━━━━
`;

  let virtualBank = BETSTATS_START_BANK;
  const bankRows = [...dailyRows].reverse();

  if (!bankRows.length) {
    message += `Няма завършени дни.\n`;
  } else {
    for (const row of bankRows) {
      const dGoals = Number(row?.goals || 0);
      const dNoGoals = Number(row?.no_goals || 0);
      const dResolved = dGoals + dNoGoals;
      const dPL = Number(row?.profit_loss || 0);
      const openingBank = virtualBank;

      // Flat-stake research: the stake stays REPORT_STAKE (10 EUR).
      // We do not stop the simulation if the virtual bank falls below the stake;
      // this is a historical accounting curve, not an execution engine.
      virtualBank += dPL;

      const bankReturn = openingBank !== 0
        ? dPL / openingBank * 100
        : null;

      message +=
        `${row?.day_key || "—"}: €${openingBank.toFixed(2)} → ${dPL >= 0 ? "+" : ""}€${dPL.toFixed(2)} → €${virtualBank.toFixed(2)}` +
        `${dResolved ? ` | ${dResolved} bets` : ""}` +
        `${bankReturn !== null ? ` | ${bankReturn >= 0 ? "+" : ""}${bankReturn.toFixed(1)}% bank` : ""}\n`;
    }

    const totalBankPL = virtualBank - BETSTATS_START_BANK;
    const bankGrowth = BETSTATS_START_BANK > 0
      ? totalBankPL / BETSTATS_START_BANK * 100
      : null;

    message +=
      `\n💰 Текуща виртуална банка: €${virtualBank.toFixed(2)}\n` +
      `📊 Промяна: ${totalBankPL >= 0 ? "+" : ""}€${totalBankPL.toFixed(2)}` +
      `${bankGrowth !== null ? ` | ${bankGrowth >= 0 ? "+" : ""}${bankGrowth.toFixed(1)}% спрямо началната банка` : ""}\n` +
      `🎯 Flat stake: €${REPORT_STAKE.toFixed(2)} на BET READY`;
  }

  message += `\n━━━━━━━━━━━━━━━━
⏱ ПО ENTRY МИНУТА
━━━━━━━━━━━━━━━━
`;

  const minuteMap = new Map((minuteResult?.results || []).map(row => [row.minute_group, row]));
  for (const group of ENTRY_MINUTE_GROUPS) {
    const row = minuteMap.get(group.label);
    const n = Number(row?.total || 0);
    const g = Number(row?.goals || 0);
    const ng = Number(row?.no_goals || 0);
    const r = g + ng;
    const hit = r ? g / r * 100 : 0;
    const av = numberOrNull(row?.avg_entry_odds);
    const pl = Number(row?.profit_loss || 0);
    const rr = r ? pl / (r * REPORT_STAKE) * 100 : null;
    message += n
      ? `${group.label}: ${n} ENTRY | ${g} GOAL | ${ng} NO GOAL | ${hit.toFixed(1)}%\n   🎲 ${av !== null ? av.toFixed(2) : "—"} | 💶 ${r ? formatMoney(pl) + " EUR" : "—"} | ROI ${rr !== null ? (rr > 0 ? "+" : "") + rr.toFixed(1) + "%" : "—"}\n`
      : `${group.label}: 0 ENTRY\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━
🔥 ПО HUNTER SCORE
━━━━━━━━━━━━━━━━
`;

  const scoreMap = new Map((scoreResult?.results || []).map(row => [row.score_group, row]));
  for (const group of ["60–69", "70–79", "80–89", "90–100"]) {
    const row = scoreMap.get(group);
    const n = Number(row?.total || 0);
    const g = Number(row?.goals || 0);
    const ng = Number(row?.no_goals || 0);
    const r = g + ng;
    message += n
      ? `${group}: ${n} ENTRY | ${g} GOAL | ${ng} NO GOAL | ${(r ? g / r * 100 : 0).toFixed(1)}%\n`
      : `${group}: 0 ENTRY\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━
🎲 ПО ENTRY ODDS
━━━━━━━━━━━━━━━━
`;

  const oddsOrder = ["1.00–1.39","1.40–1.69","1.70–1.99","2.00–2.49","2.50–3.49","3.50–4.99","5.00+"];
  const oddsMap = new Map((oddsResult?.results || []).map(row => [row.odds_group, row]));

  for (const group of oddsOrder) {
    const row = oddsMap.get(group);
    const n = Number(row?.total || 0);
    const g = Number(row?.goals || 0);
    const ng = Number(row?.no_goals || 0);
    const r = g + ng;
    const hit = r ? g / r * 100 : 0;
    const av = numberOrNull(row?.avg_entry_odds);
    const be = av !== null && av > 0 ? 100 / av : null;
    const pl = Number(row?.profit_loss || 0);
    const rr = r ? pl / (r * REPORT_STAKE) * 100 : null;

    message += n
      ? `${group}: ${n} ENTRY | ${g} GOAL | ${ng} NO GOAL | ${hit.toFixed(1)}%\n   🎲 Avg ${av !== null ? av.toFixed(2) : "—"} | ⚖️ BE ${be !== null ? be.toFixed(1) + "%" : "—"}\n   💶 ${r ? formatMoney(pl) + " EUR" : "—"} | ROI ${rr !== null ? (rr > 0 ? "+" : "") + rr.toFixed(1) + "%" : "—"}\n`
      : `${group}: 0 ENTRY\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━
✅ BET READY за целия ${currentMonth}
🎯 10–25: Score >=60 | 26–34: Score >=90 | 35–42: Score =100
♻️ Старите записи се преизчисляват по същия филтър
💾 Не са изтрити от D1
🕐 Europe/Sofia`;

  return message;
}


// ============================================================
// STATS
// ============================================================

async function buildStats(env) {

  const now =
    new Date();


  const local =
    getSofiaTime(
      now
    );


  const today =
    local.date;


  const currentMonth =
    getMonthKey(
      today
    );


  const monthlyHistory =
    await getMonthlyHistory(
      env,
      currentMonth
    );


  const currentDetails =
    await getCurrentMonthDetails(
      env,
      currentMonth
    );

  const currentMonthBounds = getSofiaMonthUtcBounds(currentMonth);
  const currentOddsStats = await getOddsStatsForBounds(env, currentMonthBounds);


  const dailyBounds =
    getSofiaDayUtcBounds(
      today
    );


  const daily =
    dailyBounds
      ? await env.DB
          .prepare(`
            SELECT

              COUNT(*) AS total,

              SUM(
                CASE
                  WHEN result = 'GOAL HIT'
                  THEN 1
                  ELSE 0
                END
              ) AS goals,

              SUM(
                CASE
                  WHEN result = 'NO GOAL'
                  THEN 1
                  ELSE 0
                END
              ) AS no_goals,

              AVG(
                CASE
                  WHEN result = 'GOAL HIT'
                  AND goal_after_minutes IS NOT NULL
                  THEN goal_after_minutes
                END
              ) AS avg_goal_after

            FROM hunter_signals

            WHERE created_at >= ?
              AND created_at < ?
              AND ${HUNTER_HISTORY_SQL}
          `)
          .bind(
            dailyBounds.start,
            dailyBounds.end
          )
          .first()
      : null;


  const dailyMinuteRows =
    await getHunterMinuteStatsForBounds(
      env,
      dailyBounds
    );


  const dailyTotal =
    Number(
      daily?.total || 0
    );


  const dailyGoals =
    Number(
      daily?.goals || 0
    );


  const dailyNoGoals =
    Number(
      daily?.no_goals || 0
    );


  const dailyResolved =
    dailyGoals +
    dailyNoGoals;


  const dailyRate =
    dailyResolved > 0
      ? dailyGoals /
        dailyResolved *
        100
      : 0;


  const dailyAvg =
    daily?.avg_goal_after !==
      null &&
    daily?.avg_goal_after !==
      undefined
      ? Number(
          daily.avg_goal_after
        )
      : null;


  let message =
`📊 HUNTER MONTHLY REPORT

📅 ${formatMonthLabel(
  currentMonth
)}

`;


  for (
    const monthStats of
      monthlyHistory
  ) {

    message +=
      formatMonthlyBlock(
        monthStats
      ) +
      "\n\n";
  }


  message +=
`━━━━━━━━━━━━━━━━
🎯 ${formatMonthLabel(currentMonth)} — ПО HUNTER SCORE
━━━━━━━━━━━━━━━━
`;


  const scoreMap =
    new Map();


  for (
    const row of
      currentDetails.scoreRows
  ) {

    scoreMap.set(
      row.score_group,
      row
    );
  }


  const scoreGroups = [
    "60–69",
    "70–79",
    "80–89",
    "90–100"
  ];


  for (
    const group of
      scoreGroups
  ) {

    const row =
      scoreMap.get(group);


    if (!row) {

      message +=
        `${group}: 0 ENTRY\n`;

      continue;
    }


    const rowTotal =
      Number(
        row.total || 0
      );


    const rowGoals =
      Number(
        row.goals || 0
      );


    const rowNoGoals =
      Number(
        row.no_goals || 0
      );


    const rowResolved =
      rowGoals +
      rowNoGoals;


    const rowRate =
      rowResolved > 0
        ? rowGoals /
          rowResolved *
          100
        : 0;


    message +=
      `${group}: ` +
      `${rowTotal} ENTRY | ` +
      `${rowGoals} GOAL | ` +
      `${rowNoGoals} NO GOAL | ` +
      `${rowRate.toFixed(1)}%\n`;
  }


  message +=
`
━━━━━━━━━━━━━━━━
⚽ СРЕДНО ДО ГОЛ ПО SCORE
━━━━━━━━━━━━━━━━
`;


  for (
    const group of
      scoreGroups
  ) {

    const row =
      scoreMap.get(
        group
      );


    const rowAvg =
      row?.avg_goal_after !==
        null &&
      row?.avg_goal_after !==
        undefined
        ? Number(
            row.avg_goal_after
          )
        : null;


    message +=
      `${group}: ` +
      (
        rowAvg !== null
          ? rowAvg.toFixed(1) +
            " мин."
          : "—"
      ) +
      "\n";
  }


  message +=
`
━━━━━━━━━━━━━━━━
⏱ ${formatMonthLabel(currentMonth)} — ПО ENTRY МИНУТА
━━━━━━━━━━━━━━━━
`;


  message +=
    formatHunterMinuteStats(
      currentDetails.minuteRows
    );


  message +=
`
━━━━━━━━━━━━━━━━
🕐 ${formatMonthLabel(currentMonth)} — ПО ЧАС НА ENTRY
━━━━━━━━━━━━━━━━
`;


  for (
    const row of
      currentDetails.hourRows
  ) {

    const total =
      Number(
        row?.total || 0
      );


    const goals =
      Number(
        row?.goals || 0
      );


    const noGoals =
      Number(
        row?.no_goals || 0
      );


    const resolved =
      goals +
      noGoals;


    const rate =
      resolved > 0
        ? goals /
          resolved *
          100
        : 0;


    message +=
      `${row.hour_group}: ` +
      `${total} ENTRY | ` +
      `${goals} GOAL | ` +
      `${noGoals} NO GOAL | ` +
      `${rate.toFixed(1)}%\n`;
  }


  const leagueRows =
    Array.isArray(
      currentDetails.leagueRows
    )
      ? currentDetails.leagueRows
      : [];


  const strongestLeagues =
    [...leagueRows]
      .sort(
        (a, b) =>
          b.rate - a.rate ||
          b.resolved -
            a.resolved ||
          b.total - a.total ||
          a.league.localeCompare(
            b.league
          )
      )
      .slice(
        0,
        LEAGUE_TOP_COUNT
      );


  const strongestNames =
    new Set(
      strongestLeagues.map(
        row =>
          row.league
      )
    );


  const weakestLeagues =
    [...leagueRows]
      .filter(
        row =>
          !strongestNames.has(
            row.league
          ) ||
          leagueRows.length <=
            LEAGUE_TOP_COUNT
      )
      .sort(
        (a, b) =>
          a.rate - b.rate ||
          b.resolved -
            a.resolved ||
          b.total - a.total ||
          a.league.localeCompare(
            b.league
          )
      )
      .slice(
        0,
        LEAGUE_BOTTOM_COUNT
      );


  message +=
`
━━━━━━━━━━━━━━━━
🏆 ${formatMonthLabel(currentMonth)} — ТОП 10 ЛИГИ
━━━━━━━━━━━━━━━━
`;


  if (
    strongestLeagues.length ===
      0
  ) {

    message +=
      `Няма достатъчно данни за лиги (минимум ${MIN_LEAGUE_RESOLVED} приключили сигнала).\n`;

  } else {

    strongestLeagues.forEach(
      (row, index) => {

        message +=
          `${index + 1}. ${row.league}\n` +
          `   ${row.total} ENTRY | ` +
          `${row.goals} GOAL | ` +
          `${row.no_goals} NO GOAL | ` +
          `${row.rate.toFixed(1)}%\n`;
      }
    );
  }


  message +=
`
━━━━━━━━━━━━━━━━
⚠️ ${formatMonthLabel(currentMonth)} — 10 НАЙ-СЛАБИ ЛИГИ
━━━━━━━━━━━━━━━━
`;


  if (
    weakestLeagues.length ===
      0
  ) {

    message +=
      `Няма достатъчно данни за лиги (минимум ${MIN_LEAGUE_RESOLVED} приключили сигнала).\n`;

  } else {

    weakestLeagues.forEach(
      (row, index) => {

        message +=
          `${index + 1}. ${row.league}\n` +
          `   ${row.total} ENTRY | ` +
          `${row.goals} GOAL | ` +
          `${row.no_goals} NO GOAL | ` +
          `${row.rate.toFixed(1)}%\n`;
      }
    );
  }


  const oddsTotal = Number(currentOddsStats?.total || 0);
  const oddsGoals = Number(currentOddsStats?.goals || 0);
  const oddsNoGoals = Number(currentOddsStats?.no_goals || 0);
  const oddsResolved = oddsGoals + oddsNoGoals;
  const oddsRate = oddsResolved > 0 ? oddsGoals / oddsResolved * 100 : 0;
  const oddsAvg = numberOrNull(currentOddsStats?.avg_entry_odds);
  const oddsBets = Number(currentOddsStats?.financial_bets || 0);
  const oddsPL = Number(currentOddsStats?.profit_loss || 0);
  const oddsROI = oddsBets > 0 ? oddsPL / (oddsBets * REPORT_STAKE) * 100 : null;

  message += `
━━━━━━━━━━━━━━━━
💰 ${formatMonthLabel(currentMonth)} — ODDS / BET STATISTICS
━━━━━━━━━━━━━━━━
🎯 Qualified: ${oddsTotal}
🟢 GOAL: ${oddsGoals} | 🔴 NO GOAL: ${oddsNoGoals}
📈 Success: ${oddsRate.toFixed(1)}%
🎲 Avg odds: ${oddsAvg !== null ? oddsAvg.toFixed(2) : '—'}
💶 P/L: ${oddsBets > 0 ? (oddsPL >= 0 ? '+' : '') + oddsPL.toFixed(2) + ' EUR' : '—'}
📈 ROI: ${oddsROI !== null ? (oddsROI >= 0 ? '+' : '') + oddsROI.toFixed(1) + '%' : '—'}
🎟 bets: ${oddsBets}
🎯 Filter: entry_odds > 1 + Score 60/65/70/75/80
`;

  message +=
`
━━━━━━━━━━━━━━━━
📅 ДНЕШЕН ОТЧЕТ
━━━━━━━━━━━━━━━━

📅 ${today}

🎯 ENTRY: ${dailyTotal}

🟢 GOAL HIT: ${dailyGoals}

🔴 NO GOAL: ${dailyNoGoals}

📈 Успеваемост:
${dailyRate.toFixed(1)}%

⏱ Средно до гол:
${
  dailyAvg !== null
    ? dailyAvg.toFixed(1) +
      " мин."
    : "—"
}

━━━━━━━━━━━━━━━━
⏱ ДНЕС — ПО ENTRY МИНУТА
━━━━━━━━━━━━━━━━
${formatHunterMinuteStats(
  dailyMinuteRows
)}
━━━━━━━━━━━━━━━━
💾 Данните са от hunter_signals
📚 Hunter history: всички нормални ENTRY 10–42′
💰 Odds/ROI: отделно само entry_odds > 1 + Score 60/65/70/75/80
🕐 Daily timezone: Europe/Sofia
📊 Месеците се изчисляват по Europe/Sofia
━━━━━━━━━━━━━━━━
NEXT GOAL HUNTER
━━━━━━━━━━━━━━━━`;


  return message;
}


// ============================================================
// HOUR × ENTRY MINUTE
// ============================================================

async function buildHourMinuteStatsMessage(
  env
) {

  const now =
    new Date();


  const local =
    getSofiaTime(
      now
    );


  const currentMonth =
    getMonthKey(
      local.date
    );


  const details =
    await getCurrentMonthDetails(
      env,
      currentMonth
    );


  const rows =
    Array.isArray(
      details?.hourMinuteRows
    )
      ? details.hourMinuteRows
      : [];


  let message =
`🧭 ${formatMonthLabel(currentMonth)} — ЧАС × ENTRY МИНУТА

`;


  for (
    const hourGroup of
      ENTRY_HOUR_GROUPS
  ) {

    message +=
`━━━━━━━━━━━━━━━━
🕐 ${hourGroup.label}
━━━━━━━━━━━━━━━━
`;


    for (
      const minuteGroup of
        ENTRY_MINUTE_GROUPS
    ) {

      const row =
        rows.find(
          r =>
            r?.hour_group ===
              hourGroup.label &&
            r?.minute_group ===
              minuteGroup.label
        );


      const total =
        Number(
          row?.total || 0
        );


      const goals =
        Number(
          row?.goals || 0
        );


      const noGoals =
        Number(
          row?.no_goals || 0
        );


      const resolved =
        goals +
        noGoals;


      const rate =
        resolved > 0
          ? goals /
            resolved *
            100
          : 0;


      if (
        total === 0
      ) {

        message +=
          `${minuteGroup.label}: 0 ENTRY\n`;

      } else {

        message +=
          `${minuteGroup.label}: ` +
          `${total} ENTRY | ` +
          `${goals} GOAL | ` +
          `${noGoals} NO GOAL | ` +
          `${rate.toFixed(1)}%\n`;
      }
    }


    message +=
      "\n";
  }


  message +=
`💾 hunter_signals
📚 Всички Hunter ENTRY 10–42′ (без shadow 5–9′)
🕐 Europe/Sofia`;


  return message;
}


// ============================================================
// DAILY REPORT
// ============================================================

async function sendDailyReport(
  env,
  local
) {

  const reportDate =
    getPreviousSofiaDate(
      local.date
    );


  const already =
    await env.DB
      .prepare(`
        SELECT id
        FROM daily_reports
        WHERE report_date = ?
        LIMIT 1
      `)
      .bind(
        reportDate
      )
      .first();


  if (already)
    return;


  const reportBounds =
    getSofiaDayUtcBounds(
      reportDate
    );


  if (!reportBounds) {

    throw new Error(
      "Could not calculate Sofia UTC bounds for " +
      reportDate
    );
  }


  const stats =
    await env.DB
      .prepare(`
        SELECT

          COUNT(*) AS total,

          SUM(
            CASE
              WHEN result = 'GOAL HIT'
              THEN 1
              ELSE 0
            END
          ) AS goals,

          SUM(
            CASE
              WHEN result = 'NO GOAL'
              THEN 1
              ELSE 0
            END
          ) AS no_goals,

          AVG(
            CASE
              WHEN entry_odds IS NOT NULL
               AND entry_odds > 1
              THEN entry_odds
            END
          ) AS avg_entry_odds,

          SUM(
            CASE
              WHEN result IN ('GOAL HIT', 'NO GOAL')
               AND entry_odds IS NOT NULL
               AND entry_odds > 1
              THEN 1
              ELSE 0
            END
          ) AS financial_bets,

          SUM(
            CASE
              WHEN result = 'GOAL HIT'
               AND entry_odds IS NOT NULL
               AND entry_odds > 1
              THEN ? * (entry_odds - 1)

              WHEN result = 'NO GOAL'
               AND entry_odds IS NOT NULL
               AND entry_odds > 1
              THEN -?

              ELSE 0
            END
          ) AS profit_loss

        FROM hunter_signals

        WHERE created_at >= ?
          AND created_at < ?
          AND ${REPORT_ELIGIBLE_SQL}
      `)
      .bind(
        REPORT_STAKE,
        REPORT_STAKE,
        reportBounds.start,
        reportBounds.end
      )
      .first();


  const minuteRows =
    await getMinuteStatsForBounds(
      env,
      reportBounds
    );


  const total =
    Number(
      stats?.total || 0
    );


  const goals =
    Number(
      stats?.goals || 0
    );


  const noGoals =
    Number(
      stats?.no_goals || 0
    );


  const resolved =
    goals +
    noGoals;


  const rate =
    resolved > 0
      ? goals /
        resolved *
        100
      : 0;


  const open =
    Math.max(
      0,
      total -
      resolved
    );


  const avgEntryOdds =
    numberOrNull(
      stats?.avg_entry_odds
    );


  const breakEvenOdds =
    goals > 0 &&
    resolved > 0
      ? resolved /
        goals
      : null;


  const financialBets =
    Number(
      stats?.financial_bets || 0
    );


  const profitLoss =
    Number(
      stats?.profit_loss || 0
    );


  const roi =
    financialBets > 0
      ? profitLoss /
        (
          financialBets *
          REPORT_STAKE
        ) *
        100
      : null;


  // V6.7.10.0: the automatic midnight report uses the exact same
  // formatter, filters and minute/score groups as /today.
  const message = await buildTodayStats(
    env,
    reportDate,
    "📊 HUNTER DAILY FINAL"
  );


  await sendTelegram(
    env,
    message
  );


  await env.DB
    .prepare(`
      INSERT INTO daily_reports (

        report_date,
        total,
        goals,
        no_goals,
        success_rate,
        created_at

      )

      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      reportDate,
      total,
      goals,
      noGoals,
      rate,
      new Date()
        .toISOString()
    )
    .run();
}


// ============================================================
// TELEGRAM
// ============================================================

async function sendTelegram(
  env,
  message,
  replyToMessageId = null
) {

  const token =
    env.TELEGRAM_BOT_TOKEN;


  const chatId =
    env.TELEGRAM_CHAT_ID;


  const text =
    String(
      message || ""
    );


  if (!text)
    return null;


  const chunks =
    splitTelegramMessage(
      text,
      3900
    );


  let firstMessageId =
    null;


  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {

    const body = {
      chat_id:
        chatId,

      text:
        chunks[i]
    };


    if (
      i === 0 &&
      replyToMessageId !==
        null &&
      replyToMessageId !==
        undefined &&
      String(
        replyToMessageId
      ) !== ""
    ) {

      body.reply_parameters = {
        message_id:
          Number(
            replyToMessageId
          )
      };
    }


    const response =
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              body
            )
        }
      );


    const responseText =
      await response.text();


    if (!response.ok) {

      throw new Error(
        "Telegram HTTP " +
        response.status +
        " | " +
        responseText.substring(
          0,
          500
        )
      );
    }


    try {

      const result =
        JSON.parse(
          responseText
        );


      if (
        result?.ok === true &&
        result?.result?.message_id !==
          undefined
      ) {

        const messageId =
          Number(
            result.result.message_id
          );


        if (
          firstMessageId ===
            null
        ) {

          firstMessageId =
            messageId;
        }
      }

    } catch (error) {

      console.error(
        "TELEGRAM RESPONSE PARSE ERROR",
        error?.message ||
        String(error)
      );
    }
  }


  return firstMessageId;
}


function splitTelegramMessage(
  text,
  maxLength = 3900
) {

  const source =
    String(
      text || ""
    );


  if (
    source.length <=
      maxLength
  ) {

    return [
      source
    ];
  }


  const lines =
    source.split(
      "\n"
    );


  const chunks = [];


  let current =
    "";


  for (
    const line of lines
  ) {

    const candidate =
      current
        ? current +
          "\n" +
          line
        : line;


    if (
      candidate.length <=
        maxLength
    ) {

      current =
        candidate;

      continue;
    }


    if (current) {

      chunks.push(
        current
      );

      current =
        "";
    }


    if (
      line.length <=
        maxLength
    ) {

      current =
        line;

      continue;
    }


    let remaining =
      line;


    while (
      remaining.length >
        maxLength
    ) {

      chunks.push(
        remaining.slice(
          0,
          maxLength
        )
      );


      remaining =
        remaining.slice(
          maxLength
        );
    }


    current =
      remaining;
  }


  if (current) {

    chunks.push(
      current
    );
  }


  return chunks;
}


// ============================================================
// ENTRY MESSAGE — V6.7 CLOUDBET ODDS
// ============================================================

function formatEntryMessage(
  m,
  score,
  local,
  cloudbet = null,
  betReady = null
) {

  const home =
    m?.score?.home ??
    0;


  const away =
    m?.score?.away ??
    0;


  const minute =
    Number(
      m?.minute ?? 0
    );


  const minuteDisplay =
    m?.minute_display ||
    (
      minute +
      "'"
    );


  const league =
    m?.league ||
    m?.tournament ||
    m?.competition ||
    "LIVE";


  // ==========================================================
  // CLOUDBET MATCH STATUS
  // ==========================================================

  const eventId =
    cloudbet?.event_id ??
    null;


  const matched =
    cloudbet?.success ===
      true &&
    eventId !== null &&
    eventId !==
      undefined &&
    String(
      eventId
    ).trim() !== "";


  const directAiMatched =
    matched &&
    String(cloudbet?.match_source || "").toUpperCase() === "AI";

  let cloudbetText =
    matched
      ? directAiMatched
        ? "🔗 CLOUDBET: ✅ AI MATCHED"
        : "🔗 CLOUDBET: ✅ MATCHED"
      : "🔗 CLOUDBET: ❌ UNMATCHED";


  if (matched) {

    if (
      cloudbet?.match
    ) {

      cloudbetText +=
        `\n🎯 Cloudbet: ${cloudbet.match}`;
    }


    cloudbetText +=
      `\n🆔 Event: ${eventId}`;


    const matcherScore =
      numberOrNull(
        cloudbet?.matcher_score
      );


    if (matcherScore !== null) {
      if (directAiMatched) {
        cloudbetText += `
🤖 AI Match: ${(matcherScore * 100).toFixed(0)}%`;
      } else {
        cloudbetText += `
📊 Matcher: ${matcherScore.toFixed(3)}`;
      }
    }


    const price =
      numberOrNull(
        cloudbet?.price
      );


    if (
      cloudbet?.odds_available ===
        true &&
      price !== null
    ) {

      cloudbetText +=
        `\n🎲 Entry odds: ${price.toFixed(2)}`;

    } else {

      cloudbetText +=
        "\n🎲 Entry odds: WAITING";
    }
  }


  if (!matched && cloudbet) {
    const matcherReason = cloudbet?.matcher_reason ?? null;
    if (matcherReason) {
      cloudbetText += `\n🔎 Matcher: ${matcherReason}`;
    }

    const attempts = Number(cloudbet?.matcher_attempts ?? 0);
    if (attempts > 0) {
      cloudbetText += `\n🔁 Matcher attempts: ${attempts}`;
    }

    const minuteDiff = numberOrNull(cloudbet?.minute_difference);
    if (minuteDiff !== null) {
      cloudbetText += `\n⏱ Minute diff: ${minuteDiff}`;
    }
  }


  // ==========================================================
  // BET READY STATUS
  // ==========================================================

  // V6.7.9.3 HARD GUARD:
  // Bet Worker is PRE-FLIGHT only. It must never promote a rejected/stale
  // AI candidate into Telegram as a successful match.
  // The final Cloudbet identity is accepted ONLY from `cloudbet`, which is
  // already resolved by the Tracker's parallel Mechanical + AI matcher.
  // Therefore confidence 0%, rejected AI candidates and stale event_ids
  // can never become `✅ AI MATCHED` here.

  const waitingAction =
    betReady?.action === "WAITING_AI" ||
    betReady?.action === "PENDING_ODDS";

  const waitingReason =
    [
      "AI_MATCH_PENDING",
      "TARGET_ODDS_NOT_AVAILABLE",
      "EXACT_ODDS_EVENT_NOT_FOUND",
      "MATCHER_LIVE_FAILED",
      "CURRENT_ODDS_INVALID",
      "SELECTION_NOT_ENABLED",
      "MINUTE_UNKNOWN"
    ].includes(
      String(
        betReady?.reason || ""
      )
    );

  let betReadyText =
    "💰 BET READY: ❌ NO";

  if (
    betReady?.ready ===
      true
  ) {

    betReadyText =
      "💰 BET READY: ✅ YES";

    const currentOdds =
      numberOrNull(
        betReady?.current_odds
      );

    if (
      currentOdds !== null
    ) {
      betReadyText +=
        `\n🎲 Current odds: ${currentOdds.toFixed(2)}`;
    }

    const maxStake =
      numberOrNull(
        betReady?.max_stake
      );

    if (
      maxStake !== null
    ) {
      betReadyText +=
        `\n💵 Max stake: ${maxStake.toFixed(2)}`;
    }

    const balance =
      numberOrNull(
        betReady
          ?.account_balance
      );

    if (
      balance !== null
    ) {
      betReadyText +=
        `\n💳 Balance: ${balance.toFixed(2)}`;
    }

  } else if (
    waitingAction ||
    waitingReason
  ) {

    betReadyText =
      "💰 BET READY: ⏳ WAITING";

    betReadyText +=
      `\nПричина: ${
        betReady?.reason ??
        "WAITING_FOR_AI_OR_ODDS"
      }`;

  } else {

    const reason =
      betReady?.reason ??
      (
        !matched
          ? (
              cloudbet?.matcher_reason ??
              "NO_CLOUDBET_EVENT_ID"
            )
          : "PREFLIGHT_NOT_READY"
      );

    betReadyText +=
      `\nПричина: ${reason}`;
  }


  return `🎯 HUNTER ENTRY

⚽ ${m?.match || "Unknown"}

🏆 ${league}

⏱ ${minuteDisplay}

📊 Резултат: ${home}:${away}

🔥 HUNTER SCORE: ${score}/100

${cloudbetText}

${betReadyText}

🎯 Условие: > 60

🕐 ${local.text}

STATUS: TRACKING`;
}


// ============================================================
// GOAL MESSAGE
// ============================================================

function formatGoalMessage(
  existing,
  m,
  goalMinute,
  afterMinutes,
  source = "V27_SCORE"
) {

  return `🟢 GOAL HIT

⚽ ${existing.match_name}

🏆 ${existing.league}

📥 ENTRY:
${existing.entry_minute}'

⚽ ГОЛ:
${
  goalMinute !== null
    ? goalMinute + "'"
    : "—"
}

⏱ След ENTRY:
${
  afterMinutes !== null
    ? afterMinutes +
      " мин."
    : "—"
}

📊 HUNTER SCORE:
${existing.hunter_score}/100

📊 Резултат:
${m?.score?.home ?? 0}:${m?.score?.away ?? 0}

🔎 Потвърждение:
${String(source || "").startsWith("DF_SUI") ? "DF_SUI EVENT" : "V27 SCORE"}

RESULT: GOAL HIT`;
}


// ============================================================
// NO GOAL MESSAGE
// ============================================================

function formatNoGoalMessage(
  existing,
  m
) {

  return `🔴 NO GOAL

⚽ ${existing.match_name}

🏆 ${existing.league}

📥 ENTRY:
${existing.entry_minute}'

📊 HUNTER SCORE:
${existing.hunter_score}/100

⏱ КРАЙ НА 1H

Резултат:
${m?.score?.home ?? 0}:${m?.score?.away ?? 0}

RESULT: NO GOAL`;
}


// ============================================================
// SOFIA TIME
// ============================================================

function getSofiaTime(
  date
) {

  const parts =
    SOFIA_FORMATTER
      .formatToParts(
        date
      );


  const get =
    type =>
      parts.find(
        p =>
          p.type === type
      )?.value;


  const year =
    get("year");


  const month =
    get("month");


  const day =
    get("day");


  const hour =
    Number(
      get("hour")
    );


  const minute =
    Number(
      get("minute")
    );


  const second =
    Number(
      get("second")
    );


  return {
    date:
      `${year}-${month}-${day}`,

    hour,

    minute,

    second,

    text:
      `${day}.${month}.${year} ` +
      `${String(hour).padStart(2, "0")}:` +
      `${String(minute).padStart(2, "0")}:` +
      `${String(second).padStart(2, "0")}`
  };
}


// ============================================================
// PREVIOUS DATE
// ============================================================

function getPreviousSofiaDate(
  dateString
) {

  const parts =
    dateString
      .split("-")
      .map(
        Number
      );


  const d =
    new Date(
      Date.UTC(
        parts[0],
        parts[1] - 1,
        parts[2]
      )
    );


  d.setUTCDate(
    d.getUTCDate() -
    1
  );


  return (
    d.getUTCFullYear() +
    "-" +
    String(
      d.getUTCMonth() +
      1
    ).padStart(
      2,
      "0"
    ) +
    "-" +
    String(
      d.getUTCDate()
    ).padStart(
      2,
      "0"
    )
  );
}


// ============================================================
// NUMBER
// ============================================================

function numberOrNull(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;
  }


  const n =
    Number(
      value
    );


  return Number.isFinite(
    n
  )
    ? n
    : null;
}


// ============================================================
// CORS
// ============================================================

function corsHeaders() {

  return {
    "Access-Control-Allow-Origin":
      "*",

    "Access-Control-Allow-Methods":
      "GET,HEAD,POST,OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type"
  };
}


// ============================================================
// JSON
// ============================================================

function json(
  data,
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
        "Content-Type":
          "application/json; charset=utf-8",

        ...corsHeaders(),

        "Cache-Control":
          "no-store"
      }
    }
  );
}
