// ============================================================
// GOAL WATCH — HUNTER TRACKER
// CPU OPTIMIZED + DUPLICATE PROTECTION
// ============================================================

const HUNTER_MIN_SCORE = 60;
const HUNTER_FROM = 10;
const HUNTER_TO = 42;

const TIME_ZONE = "Europe/Sofia";

const FINAL_BUFFER_MINUTES = 20;

// ============================================================
// MAIN
// ============================================================

export default {

  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    try {

      const result =
        await processTracker(env);

      return json(result);

    } catch (error) {

      console.error(
        "TRACKER ERROR",
        error
      );

      return json({
        success: false,
        error:
          error?.message ||
          String(error)
      }, 500);

    }

  },


  async scheduled(event, env, ctx) {

    ctx.waitUntil(
      processTracker(env)
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


  // ==========================================================
  // CONFIG
  // ==========================================================

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


  // ==========================================================
  // TIME WINDOW
  // ==========================================================

  if (
    local.hour < 12 ||
    local.hour >= 24
  ) {

    return {
      success: true,
      action: "OUTSIDE_WINDOW",
      local_time: local.text
    };

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
    Array.isArray(data.matches)
      ? data.matches
      : [];


  // ==========================================================
  // LOAD TRACKING ONLY
  // ==========================================================

  const trackingResult =
    await env.DB
      .prepare(
        `
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
        `
      )
      .all();


  const trackingSignals =
    trackingResult?.results || [];


  const trackingMap =
    new Map();


  for (
    const signal of trackingSignals
  ) {

    const id =
      String(
        signal.match_id || ""
      );

    if (!id)
      continue;

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

    if (id)
      currentIds.add(id);

  }


  // ==========================================================
  // COUNTERS
  // ==========================================================

  let entries = 0;
  let goals = 0;
  let noGoals = 0;
  let duplicates = 0;
  let finalized = 0;
  let errors = 0;


  // ==========================================================
  // PROCESS LIVE MATCHES
  // ==========================================================

  for (
    const match of matches
  ) {

    try {

      const result =
        await processMatch(
          env,
          match,
          now,
          local,
          trackingMap
        );


      if (result === "ENTRY")
        entries++;

      else if (result === "GOAL")
        goals++;

      else if (result === "NO_GOAL")
        noGoals++;

      else if (result === "DUPLICATE")
        duplicates++;

    } catch (error) {

      errors++;

      console.error(
        "MATCH ERROR",
        match?.id,
        error
      );

    }

  }


  // ==========================================================
  // FINALIZE MISSING MATCHES
  // ==========================================================

  for (
    const signal of trackingSignals
  ) {

    const id =
      String(
        signal.match_id || ""
      );

    if (!id)
      continue;

    if (
      currentIds.has(id)
    )
      continue;


    try {

      const result =
        await finalizeMissingTracking(
          env,
          signal,
          now
        );


      if (result) {

        finalized++;
        noGoals++;

      }

    } catch (error) {

      errors++;

      console.error(
        "FINALIZE ERROR",
        id,
        error
      );

    }

  }


  return {

    success: true,

    action: "TRACKING",

    local_time:
      local.text,

    source_matches:
      matches.length,

    active_tracking:
      trackingMap.size,

    entries,

    goals,

    no_goals:
      noGoals,

    duplicates,

    missing_finalized:
      finalized,

    errors

  };

}


// ============================================================
// PROCESS MATCH
// ============================================================

async function processMatch(
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

  if (!id)
    return null;


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


  // ==========================================================
  // EXISTING TRACKING
  // ==========================================================

  const existing =
    trackingMap.get(id);


  if (existing) {

    const entryHome =
      Number(
        existing.entry_home_score || 0
      );

    const entryAway =
      Number(
        existing.entry_away_score || 0
      );


    // ========================================================
    // GOAL
    // ========================================================

    if (
      home > entryHome ||
      away > entryAway
    ) {

      const goalMinute =
        minute > 0
          ? minute
          : null;

      const entryMinute =
        Number(
          existing.entry_minute || 0
        );

      const afterMinutes =
        goalMinute !== null
          ? Math.max(
              0,
              goalMinute -
              entryMinute
            )
          : null;


      // IMPORTANT:
      // UPDATE FIRST.
      // Telegram only after successful state change.

      const update =
        await env.DB
          .prepare(
            `
            UPDATE hunter_signals

            SET
              status = 'GOAL',
              goal_minute = ?,
              goal_after_minutes = ?,
              result = 'GOAL HIT',
              updated_at = ?

            WHERE id = ?
              AND status = 'TRACKING'
            `
          )
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


      // Already processed by another execution.
      if (changes < 1) {

        trackingMap.delete(id);

        return "DUPLICATE";

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


      return "GOAL";

    }


    // ========================================================
    // NO GOAL — SECOND HALF
    // ========================================================

    if (
      isFirstHalfFinished(m)
    ) {

      const update =
        await env.DB
          .prepare(
            `
            UPDATE hunter_signals

            SET
              status = 'NO_GOAL',
              result = 'NO GOAL',
              updated_at = ?

            WHERE id = ?
              AND status = 'TRACKING'
            `
          )
          .bind(
            now.toISOString(),
            existing.id
          )
          .run();


      const changes =
        Number(
          update?.meta?.changes || 0
        );


      if (changes < 1) {

        trackingMap.delete(id);

        return "DUPLICATE";

      }


      trackingMap.delete(id);


      await sendTelegram(
        env,
        formatNoGoalMessage(
          existing,
          m
        )
      );


      return "NO_GOAL";

    }


    return null;

  }


  // ==========================================================
  // NEW HUNTER
  // ==========================================================

  const hunterScore =
    getHunterScore(m);


  if (
    !isHunterCandidate(
      m,
      hunterScore
    )
  ) {

    return null;

  }


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


  // ==========================================================
  // DUPLICATE PROTECTION
  //
  // The unique match ID is checked BEFORE Telegram.
  // ==========================================================

  const existingEntry =
    await env.DB
      .prepare(
        `
        SELECT id, status
        FROM hunter_signals
        WHERE match_id = ?
        ORDER BY id DESC
        LIMIT 1
        `
      )
      .bind(id)
      .first();


  if (existingEntry) {

    return "DUPLICATE";

  }


  // ==========================================================
  // INSERT ENTRY
  // ==========================================================

  const insert =
    await env.DB
      .prepare(
        `
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

        VALUES (

          ?, ?, ?,

          ?, ?,

          ?, ?, ?, ?,

          ?, ?,

          'TRACKING',
          NULL,

          ?, ?

        )
        `
      )
      .bind(

        id,
        matchName,
        league,

        now.toISOString(),
        minute,

        hunterScore,
        goalPressure,
        dangerIndex,
        attackScore,

        home,
        away,

        now.toISOString(),
        now.toISOString()

      )
      .run();


  // ==========================================================
  // ADD TO MEMORY MAP
  // ==========================================================

  const newSignal = {

    id:
      insert?.meta?.last_row_id ??
      null,

    match_id:
      id,

    match_name:
      matchName,

    league,

    entry_time:
      now.toISOString(),

    entry_minute:
      minute,

    hunter_score:
      hunterScore,

    entry_home_score:
      home,

    entry_away_score:
      away

  };


  trackingMap.set(
    id,
    newSignal
  );


  // ==========================================================
  // TELEGRAM
  // ==========================================================

  await sendTelegram(
    env,
    formatEntryMessage(
      m,
      hunterScore,
      local
    )
  );


  return "ENTRY";

}


// ============================================================
// FINALIZE MISSING
// ============================================================

async function finalizeMissingTracking(
  env,
  signal,
  now
) {

  const entryMinute =
    Math.max(
      0,
      Math.min(
        42,
        Number(
          signal?.entry_minute || 0
        )
      )
    );


  const requiredMinutes =
    Math.max(
      68,
      (90 - entryMinute) +
      15 +
      FINAL_BUFFER_MINUTES
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

    return false;

  }


  const ageMinutes =
    (
      now.getTime() -
      entryTime.getTime()
    ) / 60000;


  if (
    ageMinutes <
    requiredMinutes
  ) {

    return false;

  }


  // ==========================================================
  // ATOMIC UPDATE
  // ==========================================================

  const update =
    await env.DB
      .prepare(
        `
        UPDATE hunter_signals

        SET
          status = 'NO_GOAL',
          result = 'NO GOAL',
          updated_at = ?

        WHERE id = ?
          AND status = 'TRACKING'
        `
      )
      .bind(
        now.toISOString(),
        signal.id
      )
      .run();


  const changes =
    Number(
      update?.meta?.changes || 0
    );


  if (changes < 1) {

    return false;

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
    )
  );


  return true;

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
    period.includes("1H");


  if (!firstHalf)
    return false;


  if (
    home !== 0 ||
    away !== 0
  )
    return false;


  if (
    minute < HUNTER_FROM ||
    minute > HUNTER_TO
  )
    return false;


  if (
    score < HUNTER_MIN_SCORE
  )
    return false;


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


  if (score === null)
    return 0;


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
// FIRST HALF FINISHED
// ============================================================

function isFirstHalfFinished(m) {

  const period =
    String(
      m?.period || ""
    ).toUpperCase();


  return (
    period === "2H" ||
    period.includes("2H")
  );

}


// ============================================================
// TELEGRAM
// ============================================================

async function sendTelegram(
  env,
  message
) {

  const url =
    `https://api.telegram.org/bot` +
    `${env.TELEGRAM_BOT_TOKEN}` +
    `/sendMessage`;


  const response =
    await fetch(
      url,
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
            String(message || "")
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
      errorText.substring(0, 500)
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
      ) + "'"
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
${
    goalMinute !== null
      ? goalMinute + "'"
      : "—"
  }

⏱ След ENTRY:
${
    afterMinutes !== null
      ? afterMinutes + " мин."
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
      "GET,HEAD,OPTIONS",

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
