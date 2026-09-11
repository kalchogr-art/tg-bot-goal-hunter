// ============================================================
// GOAL WATCH — HUNTER TRACKER V6.7.7
// 24/7 / LOW CPU / TELEGRAM / DAILY + MONTHLY STATS
// V27 + MATCHER SERVICE BINDINGS
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
// 8. HUNTER LOGIC UNCHANGED: 10–42' AND SCORE 61+
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
// ============================================================

const HUNTER_FROM = 10;
const HUNTER_TO = 42;
const HUNTER_MIN_SCORE = 61;

const TIME_ZONE = "Europe/Sofia";
const DAILY_REPORT_WINDOW_MINUTES = 10;

// Theoretical reporting stake per signal. Change only this value if needed.
const REPORT_STAKE = 10;

// V6.7.4 matcher retry: same strict matcher rules, no relaxed names.
const MATCHER_ENTRY_ATTEMPTS = 2;
const MATCHER_RETRY_DELAY_MS = 750;

const MIN_LEAGUE_RESOLVED = 5;
const LEAGUE_TOP_COUNT = 10;
const LEAGUE_BOTTOM_COUNT = 10;

const ENTRY_MINUTE_GROUPS = [
  { label: "10–19′", min: 10, max: 19 },
  { label: "20–29′", min: 20, max: 29 },
  { label: "30–34′", min: 30, max: 34 },
  { label: "35–37′", min: 35, max: 37 },
  { label: "38–39′", min: 38, max: 39 },
  { label: "40–42′", min: 40, max: 42 }
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

            return {
            type: "HUNTER_ENTRY",
            signal: "HUNTER_ENTRY",
            action: "ENTRY",
            status: "TRACKING",
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
  // GOAL
  // ==========================================================

  if (
    home > entryHome ||
    away > entryAway
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
      return;
    }


    trackingMap.delete(id);


    await sendTelegram(
      env,
      formatGoalMessage(
        existing,
        m,
        goalMinute,
        afterMinutes
      ),
      existing.telegram_message_id
    );

    return;
  }


  // ==========================================================
  // SECOND HALF STARTED
  // ==========================================================

  if (
    isSecondHalfStarted(m)
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

    if (
      changes < 1
    ) {
      return;
    }


    trackingMap.delete(id);


    await sendTelegram(
      env,
      formatNoGoalMessage(
        existing,
        m
      ),
      existing.telegram_message_id
    );

    return;
  }


  // ==========================================================
  // HT 0:0
  // ==========================================================

  if (
    home === 0 &&
    away === 0 &&
    isFirstHalfFinished(m)
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

    if (
      changes < 1
    ) {
      return;
    }


    trackingMap.delete(id);


    await sendTelegram(
      env,
      formatNoGoalMessage(
        existing,
        m
      ),
      existing.telegram_message_id
    );

    return;
  }
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

    const payload = {
      event_id:
        eventId === null ||
        eventId === undefined ||
        String(eventId).trim() === ""
          ? null
          : String(eventId),

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
      await getCloudbetOddsForHunter(
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
  // TELEGRAM ENTRY
  // ==========================================================

  const telegramMessageId =
    await sendTelegram(
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


  if (
    score <
      HUNTER_MIN_SCORE
  ) {
    return false;
  }


  return true;
}


function getRequiredHunterScore(
  minute
) {

  const m =
    Number(
      minute || 0
    );


  if (
    m >= HUNTER_FROM &&
    m <= HUNTER_TO
  ) {

    return HUNTER_MIN_SCORE;
  }


  return null;
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
          AND hunter_score BETWEEN 61 AND 100

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

            WHEN entry_minute BETWEEN 20 AND 29
              THEN '20–29′'

            WHEN entry_minute BETWEEN 30 AND 34
              THEN '30–34′'

            WHEN entry_minute BETWEEN 35 AND 37
              THEN '35–37′'

            WHEN entry_minute BETWEEN 38 AND 39
              THEN '38–39′'

            WHEN entry_minute BETWEEN 40 AND 42
              THEN '40–42′'

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
          AND entry_minute BETWEEN 10 AND 42

        GROUP BY minute_group

        ORDER BY
          CASE minute_group
            WHEN '10–19′' THEN 1
            WHEN '20–29′' THEN 2
            WHEN '30–34′' THEN 3
            WHEN '35–37′' THEN 4
            WHEN '38–39′' THEN 5
            WHEN '40–42′' THEN 6
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

            WHEN entry_minute BETWEEN 20 AND 29
              THEN '20–29′'

            WHEN entry_minute BETWEEN 30 AND 34
              THEN '30–34′'

            WHEN entry_minute BETWEEN 35 AND 37
              THEN '35–37′'

            WHEN entry_minute BETWEEN 38 AND 39
              THEN '38–39′'

            WHEN entry_minute BETWEEN 40 AND 42
              THEN '40–42′'

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
          AND entry_minute BETWEEN 10 AND 42

        GROUP BY minute_group

        ORDER BY
          CASE minute_group
            WHEN '10–19′' THEN 1
            WHEN '20–29′' THEN 2
            WHEN '30–34′' THEN 3
            WHEN '35–37′' THEN 4
            WHEN '38–39′' THEN 5
            WHEN '40–42′' THEN 6
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
          `)
          .bind(
            dailyBounds.start,
            dailyBounds.end
          )
          .first()
      : null;


  const dailyMinuteRows =
    await getMinuteStatsForBounds(
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
    formatMinuteStats(
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
${formatMinuteStats(
  dailyMinuteRows
)}
━━━━━━━━━━━━━━━━
💾 Данните са от hunter_signals
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


  const message =
`📊 DAILY HUNTER REPORT

📅 ${reportDate}

🎯 ENTRY: ${total}

🟢 GOAL HIT: ${goals}

🔴 NO GOAL: ${noGoals}

⏳ OPEN: ${open}

📈 Успеваемост:
${rate.toFixed(1)}%

🎲 Avg Entry Odds:
${
  avgEntryOdds !== null
    ? avgEntryOdds.toFixed(2)
    : "—"
}

⚖️ Break-even Odds:
${
  breakEvenOdds !== null
    ? breakEvenOdds.toFixed(2)
    : "—"
}

💶 P/L @ ${REPORT_STAKE.toFixed(2)} EUR:
${
  financialBets > 0
    ? formatMoney(
        profitLoss
      ) + " EUR"
    : "—"
}

📈 ROI:
${
  roi !== null
    ? (
        roi > 0
          ? "+"
          : ""
      ) +
      roi.toFixed(1) +
      "%"
    : "—"
}

🎟 Financial bets:
${financialBets}/${resolved}

━━━━━━━━━━━━━━━━
⏱ ПО ENTRY МИНУТА
━━━━━━━━━━━━━━━━
${formatMinuteStats(
  minuteRows
)}
━━━━━━━━━━━━━━━━
🕐 Timezone: Europe/Sofia
━━━━━━━━━━━━━━━━
NEXT GOAL HUNTER
━━━━━━━━━━━━━━━━`;


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


  let cloudbetText =
    matched
      ? "🔗 CLOUDBET: ✅ MATCHED"
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


    if (
      matcherScore !== null
    ) {

      cloudbetText +=
        `\n📊 Matcher: ${matcherScore.toFixed(3)}`;
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

  const aiEventId =
    betReady?.event_id ??
    null;

  const aiCloudbetMatch =
    betReady?.cloudbet_match ??
    null;

  const aiConfidence =
    numberOrNull(
      betReady?.ai_confidence
    );

  const aiMatched =
    aiEventId !== null &&
    aiEventId !== undefined &&
    String(aiEventId).trim() !== "";

  if (
    !matched &&
    aiMatched
  ) {
    cloudbetText =
      "🔗 CLOUDBET: ✅ AI MATCHED";

    if (aiCloudbetMatch) {
      cloudbetText +=
        `\n🎯 Cloudbet: ${aiCloudbetMatch}`;
    }

    cloudbetText +=
      `\n🆔 Event: ${aiEventId}`;

    if (aiConfidence !== null) {
      cloudbetText +=
        `\n🤖 AI Match: ${(aiConfidence * 100).toFixed(0)}%`;
    }
  }

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
  afterMinutes
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
