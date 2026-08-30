// ============================================================
// GOAL WATCH — HUNTER TRACKER V7
// LOW CPU / TELEGRAM / DAILY + ALL-TIME STATS
// V27 SERVICE BINDING
//
// FIXES:
// 1. REAL GOAL MINUTE FROM V27
// 2. DELAYED FEED DOES NOT CHANGE GOAL MINUTE
// 3. ONLY GOAL AFTER ENTRY IS ACCEPTED
// 4. HT 0:0 -> WAIT 10 MINUTES -> NO GOAL
// 5. FT 0:0 -> IMMEDIATE NO GOAL
// 6. RECOVERY FOR MISSING TRACKING MATCHES
// 7. getMatchFromV27ById()
// 8. SAFE TRACKING MAP
// 9. LOW CPU
// 10. DAILY + ALL-TIME STATS
// 11. ATOMIC ONE-ENTRY PER MATCH_ID
// 12. FIX: V27 1H detection via AC=12
//
// IMPORTANT:
//
// MATCH CAN HAVE ONLY ONE ENTRY.
//
// After GOAL or NO GOAL:
// SAME match_id = PERMANENTLY BLOCKED
//
// ============================================================

const HUNTER_MIN_SCORE = 60;

const HUNTER_FROM = 10;

const HUNTER_TO = 42;

const TIME_ZONE = "Europe/Sofia";

const SESSION_START_HOUR = 12;

const SESSION_START_MINUTE = 15;

// Official HT + 10 minutes
const HT_NO_GOAL_DELAY_MINUTES = 10;


// ============================================================
// MAIN
// ============================================================

export default {

  async fetch(request, env) {

    const url = new URL(request.url);


    // ========================================================
    // DEBUG PROXY BINDING
    // ========================================================

    if (url.pathname === "/debug-proxy-binding") {

      try {

        const response =
          await env.V27.fetch(
            "https://v27.internal/"
          );

        const text =
          await response.text();

        return new Response(
          JSON.stringify({
            success: true,
            binding: "V27",
            status: response.status,
            response: text
          }, null, 2),
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
          JSON.stringify({
            success: false,
            binding: "V27",
            error:
              error instanceof Error
                ? error.message
                : String(error)
          }, null, 2),
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
    // OPTIONS
    // ========================================================

    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });

    }


    // ========================================================
    // TELEGRAM
    // ========================================================

    if (request.method === "POST") {

      try {

        const update =
          await request.json();

        const message =
          update?.message;

        const text =
          String(
            message?.text || ""
          ).trim();


        // ====================================================
        // /stats
        // ====================================================

        if (
          text === "/stats" ||
          text.startsWith("/stats@")
        ) {

          await sendTelegram(
            env,
            await buildStats(env)
          );

          return json({
            success: true,
            action: "STATS"
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


    // ========================================================
    // STATUS
    // ========================================================

    return json({

      success: true,

      worker:
        "GOAL WATCH — HUNTER TRACKER V7",

      status:
        "ONLINE",

      mode:
        "CRON + TELEGRAM",

      time:
        getSofiaTime(new Date()).text

    });

  },


  // ==========================================================
  // CRON
  // ==========================================================

  async scheduled(event, env, ctx) {

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

  const now =
    new Date();

  const local =
    getSofiaTime(now);


  // ==========================================================
  // CONFIG CHECK
  // ==========================================================

  if (!env.V27) {

    throw new Error(
      "V27 Service Binding missing"
    );

  }

  if (!env.DB) {

    throw new Error(
      "DB binding missing"
    );

  }

  if (!env.TELEGRAM_BOT_TOKEN) {

    throw new Error(
      "TELEGRAM_BOT_TOKEN missing"
    );

  }

  if (!env.TELEGRAM_CHAT_ID) {

    throw new Error(
      "TELEGRAM_CHAT_ID missing"
    );

  }


  // ==========================================================
  // SESSION START
  // ==========================================================

  if (
    local.hour === SESSION_START_HOUR &&
    local.minute === SESSION_START_MINUTE
  ) {

    await sendSessionStart(
      env,
      local
    );

    return;

  }


  // ==========================================================
  // DAILY REPORT
  // ==========================================================

  if (
    local.hour === 0 &&
    local.minute === 0
  ) {

    await sendDailyReport(
      env,
      local
    );

    return;

  }


  // ==========================================================
  // TRACKING WINDOW
  // ==========================================================

  if (
    local.hour < 12
  ) {

    return;

  }


  // ==========================================================
  // V27
  // ==========================================================

  const response =
    await env.V27.fetch(

      new Request(
        "https://v27.internal/",
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json",
            "Cache-Control":
              "no-cache"
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
      text.substring(0, 300)
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
    Array.isArray(data.matches)
      ? data.matches
      : [];


  // ==========================================================
  // ACTIVE TRACKING — ONE DB QUERY
  // ==========================================================

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
          ht_time,
          ht_detected
        FROM hunter_signals
        WHERE status = 'TRACKING'
      `)
      .all();


  const signals =
    result?.results || [];


  // ==========================================================
  // TRACKING MAP
  // ==========================================================

  const trackingMap =
    new Map();


  for (
    const signal of signals
  ) {

    const id =
      String(
        signal?.match_id || ""
      );

    if (!id) {
      continue;
    }

    trackingMap.set(
      id,
      signal
    );

  }


  // ==========================================================
  // CURRENT MATCH IDS
  // ==========================================================

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
  // PROCESS CURRENT V27 MATCHES
  // ==========================================================

  for (
    const match of matches
  ) {

    const id =
      String(
        match?.id || ""
      );

    if (!id) {
      continue;
    }


    // --------------------------------------------------------
    // EXISTING TRACKING
    // --------------------------------------------------------

    if (
      trackingMap.has(id)
    ) {

      try {

        await processTrackingMatch(
          env,
          match,
          now,
          local,
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
    // NEW CANDIDATE
    // --------------------------------------------------------

    const score =
      getHunterScore(match);


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
  // RECOVERY
  // ==========================================================

  await recoverMissingTracking(
    env,
    trackingMap,
    currentIds,
    now,
    local
  );

}


// ============================================================
// EXISTING TRACKING
// ============================================================

async function processTrackingMatch(
  env,
  m,
  now,
  local,
  trackingMap
) {

  const id =
    String(
      m?.id || ""
    );

  if (!id) {
    return;
  }


  const existing =
    trackingMap.get(id);


  if (!existing) {
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


  const currentMinute =
    Number(
      m?.minute ?? 0
    );


  const entryHome =
    Number(
      existing.entry_home_score || 0
    );


  const entryAway =
    Number(
      existing.entry_away_score || 0
    );


  const entryMinute =
    Number(
      existing.entry_minute || 0
    );


  // ==========================================================
  // GOAL CHECK FIRST
  // ==========================================================

  const scoreChanged =
    home > entryHome ||
    away > entryAway;


  if (scoreChanged) {

    const goalMinute =
      getRealGoalMinute(
        m,
        entryHome,
        entryAway,
        entryMinute,
        currentMinute
      );


    if (
      goalMinute === null
    ) {

      console.log(
        "GOAL SCORE DETECTED BUT REAL MINUTE NOT AVAILABLE",
        id
      );

      return;

    }


    const afterMinutes =
      Math.max(
        0,
        goalMinute -
        entryMinute
      );


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
        update?.meta?.changes || 0
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
      )
    );


    return;

  }


  // ==========================================================
  // OFFICIAL FT
  // ==========================================================

  if (
    home === 0 &&
    away === 0 &&
    isFullTime(m)
  ) {

    await finalizeNoGoal(
      env,
      existing,
      m,
      now,
      trackingMap
    );

    return;

  }


  // ==========================================================
  // OFFICIAL HT
  // ==========================================================

  if (
    home === 0 &&
    away === 0 &&
    isFirstHalfFinished(m)
  ) {

    await registerHalfTime(
      env,
      existing,
      now
    );

    return;

  }


  // ==========================================================
  // HT + 10 MINUTES
  // ==========================================================

  await checkHalfTimeTimeout(
    env,
    existing,
    m,
    now,
    trackingMap
  );

}


// ============================================================
// HALF TIME REGISTER
// ============================================================

async function registerHalfTime(
  env,
  existing,
  now
) {

  if (
    existing.ht_detected === 1 ||
    existing.ht_detected === true ||
    existing.ht_time
  ) {

    return;

  }


  const htTime =
    now.toISOString();


  const update =
    await env.DB
      .prepare(`
        UPDATE hunter_signals
        SET
          ht_detected = 1,
          ht_time = ?,
          updated_at = ?
        WHERE id = ?
          AND status = 'TRACKING'
          AND (
            ht_detected IS NULL
            OR ht_detected = 0
          )
      `)
      .bind(
        htTime,
        now.toISOString(),
        existing.id
      )
      .run();


  if (
    Number(update?.meta?.changes || 0) > 0
  ) {

    existing.ht_detected = 1;
    existing.ht_time = htTime;

    console.log(
      "OFFICIAL HT REGISTERED",
      existing.match_id,
      htTime
    );

  }

}


// ============================================================
// HT + 10 MINUTES
// ============================================================

async function checkHalfTimeTimeout(
  env,
  existing,
  m,
  now,
  trackingMap
) {

  if (
    !existing.ht_time
  ) {

    return;

  }


  const ht =
    new Date(
      existing.ht_time
    );


  if (
    Number.isNaN(
      ht.getTime()
    )
  ) {

    return;

  }


  const elapsed =
    (
      now.getTime() -
      ht.getTime()
    ) / 60000;


  if (
    elapsed <
    HT_NO_GOAL_DELAY_MINUTES
  ) {

    return;

  }


  // ==========================================================
  // CHECK V27 ONE MORE TIME FOR GOAL
  // ==========================================================

  const entryHome =
    Number(
      existing.entry_home_score || 0
    );


  const entryAway =
    Number(
      existing.entry_away_score || 0
    );


  const home =
    Number(
      m?.score?.home ?? 0
    );


  const away =
    Number(
      m?.score?.away ?? 0
    );


  if (
    home > entryHome ||
    away > entryAway
  ) {

    const goalMinute =
      getRealGoalMinute(
        m,
        entryHome,
        entryAway,
        Number(
          existing.entry_minute || 0
        ),
        Number(
          m?.minute ?? 0
        )
      );


    if (
      goalMinute !== null
    ) {

      const afterMinutes =
        Math.max(
          0,
          goalMinute -
          Number(
            existing.entry_minute || 0
          )
        );


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


      if (
        Number(update?.meta?.changes || 0) > 0
      ) {

        trackingMap.delete(
          String(existing.match_id)
        );


        await sendTelegram(
          env,
          formatGoalMessage(
            existing,
            m,
            goalMinute,
            afterMinutes
          )
        );

      }


      return;

    }


    return;

  }


  // ==========================================================
  // NO GOAL AFTER HT + 10
  // ==========================================================

  await finalizeNoGoal(
    env,
    existing,
    m,
    now,
    trackingMap
  );

}


// ============================================================
// FINALIZE NO GOAL
// ============================================================

async function finalizeNoGoal(
  env,
  existing,
  m,
  now,
  trackingMap
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
      update?.meta?.changes || 0
    );


  if (
    changes < 1
  ) {

    return;

  }


  trackingMap.delete(
    String(existing.match_id)
  );


  await sendTelegram(
    env,
    formatNoGoalMessage(
      existing,
      m
    )
  );

}


// ============================================================
// RECOVERY
// ============================================================

async function recoverMissingTracking(
  env,
  trackingMap,
  currentIds,
  now,
  local
) {

  const missing = [];


  for (
    const [id, signal] of trackingMap.entries()
  ) {

    if (
      !currentIds.has(id)
    ) {

      missing.push({
        id,
        signal
      });

    }

  }


  if (
    missing.length === 0
  ) {

    return;

  }


  console.log(
    "RECOVERY START",
    missing.length
  );


  for (
    const item of missing
  ) {

    try {

      const recovered =
        await getMatchFromV27ById(
          env,
          item.id
        );


      if (recovered) {

        await processTrackingMatch(
          env,
          recovered,
          now,
          local,
          trackingMap
        );

        continue;

      }


      await recoverFromStoredState(
        env,
        item.signal,
        now,
        trackingMap
      );

    } catch (error) {

      console.error(
        "RECOVERY ERROR",
        item.id,
        error?.message ||
        String(error)
      );

    }

  }

}


// ============================================================
// GET MATCH FROM V27 BY ID
// ============================================================

async function getMatchFromV27ById(
  env,
  matchId
) {

  const response =
    await env.V27.fetch(

      new Request(
        "https://v27.internal/",
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json",
            "Cache-Control":
              "no-cache"
          }
        }
      )

    );


  if (
    !response.ok
  ) {

    return null;

  }


  const data =
    await response.json();


  if (
    data?.success !== true
  ) {

    return null;

  }


  const matches =
    Array.isArray(data.matches)
      ? data.matches
      : [];


  const wanted =
    String(matchId);


  for (
    const match of matches
  ) {

    if (
      String(match?.id || "") === wanted
    ) {

      return match;

    }

  }


  return null;

}


// ============================================================
// RECOVERY FROM STORED STATE
// ============================================================

async function recoverFromStoredState(
  env,
  existing,
  now,
  trackingMap
) {

  if (
    !existing.ht_time
  ) {

    console.log(
      "RECOVERY WAITING FOR HT",
      existing.match_id
    );

    return;

  }


  const ht =
    new Date(
      existing.ht_time
    );


  if (
    Number.isNaN(
      ht.getTime()
    )
  ) {

    return;

  }


  const elapsed =
    (
      now.getTime() -
      ht.getTime()
    ) / 60000;


  if (
    elapsed <
    HT_NO_GOAL_DELAY_MINUTES
  ) {

    return;

  }


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
          AND ht_detected = 1
      `)
      .bind(
        now.toISOString(),
        existing.id
      )
      .run();


  if (
    Number(update?.meta?.changes || 0) < 1
  ) {

    return;

  }


  trackingMap.delete(
    String(existing.match_id)
  );


  await sendTelegram(
    env,
    formatNoGoalMessage(
      existing,
      null
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
    Array.isArray(m?.goals)
  ) {

    candidates.push(
      ...m.goals
    );

  }


  if (
    Array.isArray(m?.events)
  ) {

    candidates.push(
      ...m.events
    );

  }


  if (
    Array.isArray(m?.incidents)
  ) {

    candidates.push(
      ...m.incidents
    );

  }


  if (
    Array.isArray(m?.goal_events)
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
      typeof event !== "object"
    ) {

      continue;

    }


    if (
      !isGoalEvent(event)
    ) {

      continue;

    }


    const minute =
      extractEventMinute(
        event
      );


    if (
      minute === null
    ) {

      continue;

    }


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
      (a, b) => a - b
    );

    return validGoals[0];

  }


  return null;

}


// ============================================================
// GOAL EVENT DETECTION
// ============================================================

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
      text.includes("goal")
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


// ============================================================
// EVENT MINUTE
// ============================================================

function extractEventMinute(event) {

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
    ) {

      return minute;

    }

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
      typeof value !== "object"
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


// ============================================================
// PARSE MINUTE
// ============================================================

function parseMinuteValue(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return null;

  }


  if (
    typeof value === "number"
  ) {

    return Number.isFinite(value)
      ? Math.floor(value)
      : null;

  }


  const text =
    String(value)
      .trim();


  if (!text) {
    return null;
  }


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


  const added =
    text.match(
      /^(\d{1,3})\s*\+\s*(\d{1,2})/
    );


  if (
    added
  ) {

    return (
      Number(added[1]) +
      Number(added[2])
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
// FIRST HALF FINISHED
// ============================================================
//
// V27 FIX:
//
// AC = 12  -> 1H
// AC = 13  -> 2H
//
// Tracker previously relied only on m.period.
// That could cause V27 to show a valid 1H match while
// Tracker rejected it.
//
// ============================================================

function isFirstHalfFinished(m) {

  // ----------------------------------------------------------
  // V27 status fields
  // ----------------------------------------------------------

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
      hasHalfTimeValue(value)
    ) {

      return true;

    }

  }


  // ----------------------------------------------------------
  // Nested status fields
  // ----------------------------------------------------------

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
      hasHalfTimeValue(value)
    ) {

      return true;

    }

  }


  // ----------------------------------------------------------
  // V27 AC FIX
  //
  // AC = 12 means first-half finished / HT state.
  //
  // ----------------------------------------------------------

  const ac =
    Number(
      m?.ac ??
      m?.AC ??
      m?.status?.ac ??
      m?.status?.AC ??
      0
    );


  if (
    ac === 12
  ) {

    return true;

  }


  return false;

}


// ============================================================
// HALF TIME VALUE
// ============================================================

function hasHalfTimeValue(value) {

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
// FULL TIME
// ============================================================

function isFullTime(m) {

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
      hasFullTimeValue(value)
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
      hasFullTimeValue(value)
    ) {

      return true;

    }

  }


  // ----------------------------------------------------------
  // V27 AC = 13 means second half.
  // We do NOT treat AC 13 as FT.
  // ----------------------------------------------------------

  return false;

}


// ============================================================
// FULL TIME VALUE
// ============================================================

function hasFullTimeValue(value) {

  const text =
    String(
      value || ""
    )
    .toUpperCase()
    .trim();


  return (

    text === "FT" ||
    text === "FULL TIME" ||
    text === "FULL-TIME" ||
    text === "FINISHED" ||
    text === "MATCH FINISHED" ||
    text === "ENDED" ||
    text === "END"

  );

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


  if (!id) {
    return;
  }


  if (
    trackingMap.has(id)
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


  const minute =
    Number(
      m?.minute ?? 0
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


  const timestamp =
    now.toISOString();


  // ==========================================================
  // ATOMIC INSERT
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

          ht_detected,
          ht_time,

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

          0,
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

        timestamp,
        minute,

        hunterScore,
        goalPressure,
        dangerIndex,
        attackScore,

        home,
        away,

        timestamp,
        timestamp,

        id

      )
      .run();


  const changes =
    Number(
      insert?.meta?.changes || 0
    );


  if (
    changes < 1
  ) {

    return;

  }


  const rowId =
    insert?.meta?.last_row_id ||
    null;


  trackingMap.set(
    id,
    {

      id:
        rowId,

      match_id:
        id,

      match_name:
        matchName,

      league,

      entry_time:
        timestamp,

      entry_minute:
        minute,

      hunter_score:
        hunterScore,

      entry_home_score:
        home,

      entry_away_score:
        away,

      ht_detected:
        0,

      ht_time:
        null

    }
  );


  await sendTelegram(
    env,
    formatEntryMessage(
      m,
      hunterScore,
      local
    )
  );

}


// ============================================================
// HUNTER FILTER
// ============================================================
//
// IMPORTANT FIX:
//
// V27 може да няма m.period.
//
// Затова:
// 1. първо проверяваме period
// 2. ако няма валиден period -> проверяваме AC
//
// AC:
// 12 = FIRST HALF / HT
// 13 = SECOND HALF
//
// ENTRY се допуска само при 1H.
// ============================================================

function isHunterCandidate(
  m,
  score
) {

  const minute =
    Number(
      m?.minute ?? 0
    );


  const home =
    Number(
      m?.score?.home ?? 0
    );


  const away =
    Number(
      m?.score?.away ?? 0
    );


  // ==========================================================
  // FIRST HALF DETECTION — V27
  // ==========================================================

  const firstHalf =
    isV27FirstHalf(m);


  if (!firstHalf) {

    return false;

  }


  // ==========================================================
  // 0:0 ONLY
  // ==========================================================

  if (
    home !== 0 ||
    away !== 0
  ) {

    return false;

  }


  // ==========================================================
  // MINUTE 10 - 42
  // ==========================================================

  if (
    minute < HUNTER_FROM ||
    minute > HUNTER_TO
  ) {

    return false;

  }


  // ==========================================================
  // SCORE >= 60
  // ==========================================================

  if (
    score < HUNTER_MIN_SCORE
  ) {

    return false;

  }


  return true;

}


// ============================================================
// V27 FIRST HALF
// ============================================================
//
// PRIMARY:
//
// AC = 12 -> 1H
//
// FALLBACK:
//
// period / status text
//
// AC = 13 is explicitly NOT first half.
// ============================================================

function isV27FirstHalf(m) {

  const ac =
    Number(
      m?.ac ??
      m?.AC ??
      m?.status?.ac ??
      m?.status?.AC ??
      0
    );


  // ----------------------------------------------------------
  // V27 primary state
  // ----------------------------------------------------------

  if (
    ac === 12
  ) {

    return true;

  }


  if (
    ac === 13
  ) {

    return false;

  }


  // ----------------------------------------------------------
  // Existing V27 period fallback
  // ----------------------------------------------------------

  const period =
    String(
      m?.period || ""
    )
    .toUpperCase()
    .trim();


  if (
    period === "1H" ||
    period === "FIRST" ||
    period === "FIRST HALF" ||
    period === "1ST HALF" ||
    period.includes("1H")
  ) {

    return true;

  }


  return false;

}


// ============================================================
// HUNTER SCORE
// ============================================================

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
// SESSION START
// ============================================================

async function sendSessionStart(
  env,
  local
) {

  const message =
`🚀 SESSION START

📅 ${local.date}

🕐 ${local.text}

STATUS: SESSION START`;


  await sendTelegram(
    env,
    message
  );

}


// ============================================================
// STATS
// ============================================================

async function buildStats(env) {

  const now =
    new Date();


  const local =
    getSofiaTime(now);


  const today =
    local.date;


  const daily =
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

        WHERE substr(
          created_at,
          1,
          10
        ) = ?
      `)
      .bind(today)
      .first();


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
    daily?.avg_goal_after !== null &&
    daily?.avg_goal_after !== undefined
      ? Number(
          daily.avg_goal_after
        )
      : null;


  const main =
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
      `)
      .first();


  const total =
    Number(
      main?.total || 0
    );


  const goals =
    Number(
      main?.goals || 0
    );


  const noGoals =
    Number(
      main?.no_goals || 0
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
    main?.avg_goal_after !== null &&
    main?.avg_goal_after !== undefined
      ? Number(
          main.avg_goal_after
        )
      : null;


  return `📊 HUNTER STATISTICS — TODAY

📅 ${today}

🎯 ENTRY: ${dailyTotal}

🟢 GOAL HIT: ${dailyGoals}

🔴 NO GOAL: ${dailyNoGoals}

📈 Успеваемост:
${dailyRate.toFixed(1)}%

⏱ Средно до гол:
${
    dailyAvg !== null
      ? dailyAvg.toFixed(1) + " мин."
      : "—"
  }

━━━━━━━━━━━━━━━━
📊 HUNTER STATISTICS — ALL TIME

🎯 ENTRY: ${total}

🟢 GOAL HIT: ${goals}

🔴 NO GOAL: ${noGoals}

📈 Успеваемост:
${rate.toFixed(1)}%

⏱ Средно до гол:
${
    avg !== null
      ? avg.toFixed(1) + " мин."
      : "—"
  }

━━━━━━━━━━━━━━━━
NEXT GOAL HUNTER
━━━━━━━━━━━━━━━━`;

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
      .bind(reportDate)
      .first();


  if (already) {
    return;
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
          ) AS no_goals

        FROM hunter_signals

        WHERE substr(
          created_at,
          1,
          10
        ) = ?
      `)
      .bind(reportDate)
      .first();


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


  const message =
`📊 DAILY HUNTER REPORT

📅 ${reportDate}

🎯 ENTRY: ${total}

🟢 GOAL HIT: ${goals}

🔴 NO GOAL: ${noGoals}

📈 Успеваемост:
${rate.toFixed(1)}%

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
      new Date().toISOString()

    )
    .run();

}


// ============================================================
// TELEGRAM
// ============================================================

async function sendTelegram(
  env,
  message
) {

  const token =
    env.TELEGRAM_BOT_TOKEN;


  const chatId =
    env.TELEGRAM_CHAT_ID;


  const text =
    String(
      message || ""
    );


  if (!text) {
    return;
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
          JSON.stringify({

            chat_id:
              chatId,

            text

          })

      }

    );


  if (!response.ok) {

    const errorText =
      await response.text();


    throw new Error(
      "Telegram HTTP " +
      response.status +
      " | " +
      errorText.substring(
        0,
        500
      )
    );

  }

}


// ============================================================
// ENTRY MESSAGE
// ============================================================

function formatEntryMessage(
  m,
  score,
  local
) {

  const home =
    m?.score?.home ?? 0;


  const away =
    m?.score?.away ?? 0;


  const minute =
    m?.minute_display ||
    (
      Number(
        m?.minute || 0
      ) +
      "'"
    );


  const league =
    m?.league ||
    m?.tournament ||
    m?.competition ||
    "LIVE";


  return `🎯 HUNTER ENTRY

⚽ ${m?.match || "Unknown"}

🏆 ${league}

⏱ ${minute}

📊 Резултат: ${home}:${away}

🔥 HUNTER SCORE: ${score}/100

🎯 Условие: ≥ 60

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
${goalMinute}'

⏱ След ENTRY:
${afterMinutes} мин.

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

⏱ HT + ${HT_NO_GOAL_DELAY_MINUTES} MIN.

Резултат:
${m?.score?.home ?? 0}:${m?.score?.away ?? 0}

RESULT: NO GOAL`;

}


// ============================================================
// SOFIA TIME
// ============================================================

function getSofiaTime(date) {

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {

        timeZone:
          TIME_ZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23"

      }
    )
    .formatToParts(date);


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
      .map(Number);


  const d =
    new Date(
      Date.UTC(
        parts[0],
        parts[1] - 1,
        parts[2]
      )
    );


  d.setUTCDate(
    d.getUTCDate() - 1
  );


  return (

    d.getUTCFullYear() +
    "-" +

    String(
      d.getUTCMonth() + 1
    ).padStart(2, "0") +

    "-" +

    String(
      d.getUTCDate()
    ).padStart(2, "0")

  );

}


// ============================================================
// NUMBER
// ============================================================

function numberOrNull(value) {

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

        ...corsHeaders()

      }

    }

  );

        }
