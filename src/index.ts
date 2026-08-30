// ============================================================
// GOAL WATCH — HUNTER TRACKER V6
// LOW CPU / TELEGRAM / DAILY + ALL-TIME STATS
// V27 SERVICE BINDING
//
// FIXES:
// 1. REAL GOAL MINUTE FROM V27
// 2. DELAYED FEED DOES NOT CHANGE GOAL MINUTE
// 3. ONLY GOAL AFTER ENTRY IS ACCEPTED
// 4. 0:0 NO GOAL ONLY AT OFFICIAL HALF TIME
// 5. SESSION START 12:15
// 6. LOW CPU — ONE ACTIVE SIGNAL QUERY
// 7. SAFE TRACKING MAP
// 8. DAILY + ALL-TIME STATS
// 9. ATOMIC ONE-ENTRY PER MATCH_ID
//
// IMPORTANT:
// A match can have ONLY ONE Hunter ENTRY during its lifetime.
//
// After GOAL HIT or NO GOAL:
//
//     SAME match_id = PERMANENTLY BLOCKED
//
// Delayed V27 feed:
//
//     SCORE CHANGES
//     +
//     REAL GOAL EVENT NOT YET AVAILABLE
//
//     => DO NOT GUESS THE MINUTE
//     => KEEP TRACKING
//     => WAIT FOR REAL V27 GOAL EVENT
//
// NO GOAL:
//
//     ONLY when V27 explicitly reports official HT.
//
// ============================================================


const HUNTER_MIN_SCORE = 60;

const HUNTER_FROM = 10;

const HUNTER_TO = 42;

const TIME_ZONE = "Europe/Sofia";

const SESSION_START_HOUR = 12;

const SESSION_START_MINUTE = 15;


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
        "GOAL WATCH — HUNTER TRACKER V6",

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
  // V27 SERVICE BINDING
  // ==========================================================

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
    Array.isArray(
      data.matches
    )
      ? data.matches
      : [];


  // ==========================================================
  // LOAD ACTIVE TRACKING — ONE DB QUERY
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
          entry_away_score
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
  // PROCESS MATCHES
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
    // NEW HUNTER CANDIDATE
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
  // IMPORTANT
  //
  // NO automatic "missing match = NO GOAL".
  //
  // NO GOAL is created ONLY from official V27 HT.
  //
  // This prevents:
  //
  // match disappears from feed
  // ->
  // automatic NO GOAL
  //
  // without real halftime confirmation.
  // ==========================================================

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
  // SCORE CHANGED
  // ==========================================================

  const scoreChanged =
    home > entryHome ||
    away > entryAway;


  // ==========================================================
  // GOAL DETECTED
  // ==========================================================

  if (scoreChanged) {

    const goalMinute =
      getRealGoalMinute(
        m,
        entryHome,
        entryAway,
        entryMinute,
        currentMinute
      );


    // ========================================================
    // CRITICAL FIX:
    //
    // NEVER use currentMinute as a fake goal minute.
    //
    // If V27 has changed the score but has not yet supplied
    // the real goal event/minute:
    //
    // KEEP TRACKING.
    //
    // Next Cron will check V27 again.
    // ========================================================

    if (
      goalMinute === null
    ) {

      console.log(
        "GOAL SCORE DETECTED BUT REAL MINUTE NOT AVAILABLE",
        id,
        {
          entryMinute,
          currentMinute,
          home,
          away
        }
      );


      return;

    }


    const afterMinutes =
      Math.max(
        0,
        goalMinute -
        entryMinute
      );


    // ========================================================
    // FINAL DB UPDATE
    //
    // status TRACKING condition prevents duplicate GOAL.
    // ========================================================

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
  // OFFICIAL HALF TIME ONLY
  //
  // 0:0 by itself is NOT enough.
  //
  // V27 must explicitly report HT.
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
      formatNoGoalMessage(
        existing,
        m
      )
    );

  }

}


// ============================================================
// REAL GOAL MINUTE
// ============================================================
//
// IMPORTANT:
//
// There is NO currentMinute fallback.
//
// If V27 says:
// score = 1:0
// minute = 38
//
// but the actual event says:
// goal = 35'
//
// result = 35'
//
// If V27 does not yet expose the event:
// result = null
//
// Tracker waits for the next V27 update.
//
// ============================================================

function getRealGoalMinute(
  m,
  entryHome,
  entryAway,
  entryMinute,
  currentMinute
) {

  const candidates = [];


  // ----------------------------------------------------------
  // DIRECT GOALS
  // ----------------------------------------------------------

  if (
    Array.isArray(m?.goals)
  ) {

    candidates.push(
      ...m.goals
    );

  }


  // ----------------------------------------------------------
  // EVENTS
  // ----------------------------------------------------------

  if (
    Array.isArray(m?.events)
  ) {

    candidates.push(
      ...m.events
    );

  }


  // ----------------------------------------------------------
  // INCIDENTS
  // ----------------------------------------------------------

  if (
    Array.isArray(m?.incidents)
  ) {

    candidates.push(
      ...m.incidents
    );

  }


  // ----------------------------------------------------------
  // GOAL EVENTS
  // ----------------------------------------------------------

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


    // ========================================================
    // GOAL MUST BE STRICTLY AFTER ENTRY
    // ========================================================

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


  // ==========================================================
  // NO FALLBACK
  // ==========================================================
  //
  // DO NOT RETURN currentMinute.
  //
  // The score change alone is not enough to determine the
  // actual goal minute.
  //
  // ==========================================================

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
    String(
      value
    )
    .trim();


  if (!text) {

    return null;

  }


  // ----------------------------------------------------------
  // 35'
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // 35:12
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // 45+2
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // 35
  // ----------------------------------------------------------

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
      hasHalfTimeValue(value)
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
      hasHalfTimeValue(value)
    ) {

      return true;

    }

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
// CREATE HUNTER ENTRY
// ============================================================
//
// ATOMIC PROTECTION:
//
// The INSERT itself checks that this match_id has NEVER existed
// before in hunter_signals.
//
// This is stronger than:
//     trackingMap.has(id)
//
// because trackingMap only protects the current Worker execution.
//
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


  // ==========================================================
  // MEMORY SAFETY
  // ==========================================================

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
  //
  // If ANY record already exists for match_id:
  //
  //     INSERT = 0
  //
  // Therefore:
  //
  // TRACKING
  // GOAL
  // NO_GOAL
  //
  // all permanently block another ENTRY.
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


  // ==========================================================
  // ALREADY EXISTS
  // ==========================================================

  if (
    changes < 1
  ) {

    return;

  }


  // ==========================================================
  // DB ROW ID
  // ==========================================================

  const rowId =
    insert?.meta?.last_row_id ||
    null;


  // ==========================================================
  // ADD TO TRACKING MAP
  // ==========================================================

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
        away

    }
  );


  // ==========================================================
  // TELEGRAM ENTRY
  // ==========================================================

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
    )
    .toUpperCase();


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
    period.includes("1H");


  if (!firstHalf) {

    return false;

  }


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
    score < HUNTER_MIN_SCORE
  ) {

    return false;

  }


  return true;

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


  // ==========================================================
  // DAILY
  // ==========================================================

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
      .bind(
        today
      )
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


  // ==========================================================
  // ALL TIME
  // ==========================================================

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


  // ==========================================================
  // SCORE
  // ==========================================================

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

        WHERE hunter_score BETWEEN 60 AND 100

        GROUP BY score_group

        ORDER BY
          CASE score_group
            WHEN '60–69' THEN 1
            WHEN '70–79' THEN 2
            WHEN '80–89' THEN 3
            WHEN '90–100' THEN 4
          END
      `)
      .all();


  // ==========================================================
  // ENTRY MINUTE
  // ==========================================================

  const minuteResult =
    await env.DB
      .prepare(`
        SELECT

          CASE

            WHEN entry_minute BETWEEN 10 AND 19
              THEN '10–19′'

            WHEN entry_minute BETWEEN 20 AND 29
              THEN '20–29′'

            WHEN entry_minute BETWEEN 30 AND 42
              THEN '30–42′'

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

        WHERE entry_minute BETWEEN 10 AND 42

        GROUP BY minute_group

        ORDER BY
          CASE minute_group
            WHEN '10–19′' THEN 1
            WHEN '20–29′' THEN 2
            WHEN '30–42′' THEN 3
          END
      `)
      .all();


  // ==========================================================
  // LEAGUE
  // ==========================================================

  const leagueResult =
    await env.DB
      .prepare(`
        SELECT

          COALESCE(
            NULLIF(TRIM(league), ''),
            'UNKNOWN'
          ) AS league,

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

        GROUP BY league

        ORDER BY total DESC
      `)
      .all();


  // ==========================================================
  // MAIN VALUES
  // ==========================================================

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


  let message =
`📊 HUNTER STATISTICS — TODAY

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
🎯 ПО HUNTER SCORE
━━━━━━━━━━━━━━━━
`;


  const scoreRows =
    scoreResult?.results || [];


  const scoreMap =
    new Map();


  for (
    const row of scoreRows
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
    const group of scoreGroups
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
    const group of scoreGroups
  ) {

    const row =
      scoreMap.get(group);


    const rowAvg =
      row?.avg_goal_after !== null &&
      row?.avg_goal_after !== undefined
        ? Number(
            row.avg_goal_after
          )
        : null;


    message +=
      `${group}: ` +
      (
        rowAvg !== null
          ? rowAvg.toFixed(1) + " мин."
          : "—"
      ) +
      `\n`;

  }


  message +=
`
━━━━━━━━━━━━━━━━
⏱ ПО ENTRY МИНУТА
━━━━━━━━━━━━━━━━
`;


  const minuteRows =
    minuteResult?.results || [];


  const minuteMap =
    new Map();


  for (
    const row of minuteRows
  ) {

    minuteMap.set(
      row.minute_group,
      row
    );

  }


  const minuteGroups = [
    "10–19′",
    "20–29′",
    "30–42′"
  ];


  for (
    const group of minuteGroups
  ) {

    const row =
      minuteMap.get(group);


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
🏆 ПО ЛИГА
━━━━━━━━━━━━━━━━
`;


  const leagueRows =
    leagueResult?.results || [];


  if (
    leagueRows.length === 0
  ) {

    message +=
      "Няма данни.\n";

  } else {

    for (
      const row of leagueRows
    ) {

      const league =
        String(
          row?.league ||
          "UNKNOWN"
        );


      const leagueTotal =
        Number(
          row?.total || 0
        );


      const leagueGoals =
        Number(
          row?.goals || 0
        );


      const leagueNoGoals =
        Number(
          row?.no_goals || 0
        );


      const leagueResolved =
        leagueGoals +
        leagueNoGoals;


      const leagueRate =
        leagueResolved > 0
          ? leagueGoals /
            leagueResolved *
            100
          : 0;


      const leagueAvg =
        row?.avg_goal_after !== null &&
        row?.avg_goal_after !== undefined
          ? Number(
              row.avg_goal_after
            )
          : null;


      message +=
        `${league}\n` +

        `ENTRY: ${leagueTotal} | ` +
        `GOAL: ${leagueGoals} | ` +
        `NO GOAL: ${leagueNoGoals} | ` +
        `${leagueRate.toFixed(1)}%\n` +

        `⏱ Avg: ` +
        (
          leagueAvg !== null
            ? leagueAvg.toFixed(1) + " мин."
            : "—"
        ) +

        `\n\n`;

    }

  }


  message +=
`━━━━━━━━━━━━━━━━
💾 Данните са от hunter_signals
📊 Статистиката се изчислява при /stats
⚡ Cron не изчислява статистики
━━━━━━━━━━━━━━━━
NEXT GOAL HUNTER
━━━━━━━━━━━━━━━━`;


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
      .bind(
        reportDate
      )
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

⏱ КРАЙ НА 1H

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
