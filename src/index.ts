// ============================================================
// GOAL WATCH — HUNTER TRACKER
// OPTIMIZED + CRON ONLY + DUPLICATE PROTECTION
// + GOAL MINUTE FALLBACK
// + TELEGRAM /stats
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


    // ========================================================
    // TELEGRAM WEBHOOK
    // ========================================================

    if (request.method === "POST") {

      try {

        const update =
          await request.json();

        await handleTelegramUpdate(
          env,
          update
        );

        return json({
          success: true
        });

      } catch (error) {

        console.error(
          "TELEGRAM WEBHOOK ERROR",
          error
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
    // HTTP STATUS
    // ========================================================

    const local =
      getSofiaTime(new Date());

    return json({

      success: true,

      worker:
        "GOAL WATCH — HUNTER TRACKER",

      status:
        "ONLINE",

      mode:
        "CRON ONLY + TELEGRAM",

      message:
        "Tracker runs from Cron. Telegram commands are handled by POST.",

      time:
        local.text

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
            "TRACKER CRON ERROR",
            error
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
  // CONFIGURATION
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

    return {

      success: true,

      action:
        "DAILY_REPORT",

      local_time:
        local.text

    };

  }


  // ==========================================================
  // TRACKING WINDOW
  // ==========================================================

  if (
    local.hour < 12 ||
    local.hour >= 24
  ) {

    return {

      success: true,

      action:
        "OUTSIDE_WINDOW",

      local_time:
        local.text

    };

  }


  // ==========================================================
  // FETCH V27
  // ==========================================================

  const v27Request =
    new Request(
      "https://v27.internal/",
      {
        method: "GET",

        headers: {
          "Accept":
            "application/json"
        }

      }
    );


  const response =
    await env.V27.fetch(
      v27Request
    );


  const responseText =
    await response.text();


  if (!response.ok) {

    throw new Error(
      "V27 SERVICE HTTP " +
      response.status +
      " | " +
      responseText.substring(
        0,
        500
      )
    );

  }


  let data;

  try {

    data =
      JSON.parse(
        responseText
      );

  } catch (error) {

    throw new Error(
      "V27 JSON ERROR | " +
      responseText.substring(
        0,
        500
      )
    );

  }


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
  // LOAD TRACKING SIGNALS ONCE
  // ==========================================================

  const trackingResult =
    await env.DB
      .prepare(
        `
        SELECT *
        FROM hunter_signals
        WHERE status = 'TRACKING'
        `
      )
      .all();


  const trackingSignals =
    trackingResult?.results || [];


  // ==========================================================
  // MAP TRACKING SIGNALS
  // ==========================================================

  const trackingMap =
    new Map();


  for (
    const signal of trackingSignals
  ) {

    const matchId =
      String(
        signal?.match_id || ""
      );


    if (!matchId)
      continue;


    trackingMap.set(
      matchId,
      signal
    );

  }


  // ==========================================================
  // CURRENT MATCH IDS
  // ==========================================================

  const currentMatchIds =
    new Set();


  for (
    const match of matches
  ) {

    const id =
      String(
        match?.id || ""
      );


    if (id) {

      currentMatchIds.add(
        id
      );

    }

  }


  // ==========================================================
  // COUNTERS
  // ==========================================================

  let entries = 0;
  let goals = 0;
  let noGoals = 0;
  let candidates = 0;
  let duplicates = 0;

  let matchErrors = 0;

  let missingChecked = 0;
  let missingFinalized = 0;

  const errorDetails = [];


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


      if (
        result === "ENTRY"
      ) {
        entries++;
      }


      if (
        result === "GOAL"
      ) {
        goals++;
      }


      if (
        result === "NO_GOAL"
      ) {
        noGoals++;
      }


      if (
        result === "CANDIDATE"
      ) {
        candidates++;
      }


      if (
        result === "DUPLICATE"
      ) {
        duplicates++;
      }

    } catch (error) {

      matchErrors++;

      const detail = {

        id:
          match?.id ||
          null,

        match:
          match?.match ||
          null,

        error:
          error?.message ||
          String(error)

      };


      errorDetails.push(
        detail
      );


      console.error(
        "MATCH ERROR",
        match?.id,
        error
      );

    }

  }


  // ==========================================================
  // FINALIZE MISSING TRACKING
  // ==========================================================

  for (
    const signal of trackingSignals
  ) {

    const matchId =
      String(
        signal?.match_id || ""
      );


    if (!matchId)
      continue;


    if (
      currentMatchIds.has(
        matchId
      )
    ) {

      continue;

    }


    missingChecked++;


    try {

      const finalized =
        await finalizeMissingTracking(
          env,
          signal,
          now
        );


      if (finalized) {

        missingFinalized++;

        noGoals++;

      }

    } catch (error) {

      matchErrors++;

      const detail = {

        id:
          matchId,

        match:
          signal?.match_name ||
          null,

        error:
          error?.message ||
          String(error)

      };


      errorDetails.push(
        detail
      );


      console.error(
        "MISSING TRACKING ERROR",
        matchId,
        error
      );

    }

  }


  return {

    success: true,

    action:
      "TRACKING",

    local_time:
      local.text,

    source:
      "V27 SERVICE BINDING",

    source_status:
      response.status,

    source_matches:
      matches.length,

    active_tracking:
      trackingMap.size,

    candidates,

    duplicates,

    entries,

    goals,

    no_goals:
      noGoals,

    missing_tracking_checked:
      missingChecked,

    missing_finalized:
      missingFinalized,

    match_errors:
      matchErrors,

    error_details:
      errorDetails.slice(
        0,
        10
      )

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


  if (!id) {
    return null;
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
    // GOAL DETECTED
    // ========================================================

    if (
      home > entryHome ||
      away > entryAway
    ) {

      // ======================================================
      // GOAL MINUTE + FALLBACK
      //
      // 1. m.minute
      // 2. m.minute_display
      // 3. ENTRY TIME + elapsed minutes
      //
      // Нормалната логика не се променя.
      // ======================================================

      let goalMinute =
        minute > 0
          ? minute
          : null;


      // ------------------------------------------------------
      // FALLBACK 1 — minute_display
      // ------------------------------------------------------

      if (goalMinute === null) {

        const displayMinute =
          String(
            m?.minute_display || ""
          )
            .replace(
              /[^0-9]/g,
              ""
            );


        const parsedDisplayMinute =
          Number(
            displayMinute
          );


        if (
          Number.isFinite(
            parsedDisplayMinute
          ) &&
          parsedDisplayMinute > 0
        ) {

          goalMinute =
            parsedDisplayMinute;

        }

      }


      const entryMinute =
        Number(
          existing.entry_minute || 0
        );


      // ------------------------------------------------------
      // FALLBACK 2 — ENTRY TIME
      // ------------------------------------------------------

      if (goalMinute === null) {

        const entryTime =
          new Date(
            existing.entry_time ||
            existing.created_at ||
            ""
          );


        if (
          entryMinute > 0 &&
          !Number.isNaN(
            entryTime.getTime()
          )
        ) {

          const elapsedMinutes =
            Math.floor(
              (
                now.getTime() -
                entryTime.getTime()
              ) /
              60000
            );


          goalMinute =
            Math.min(
              90,
              Math.max(
                entryMinute,
                entryMinute +
                elapsedMinutes
              )
            );

        }

      }


      const afterMinutes =
        goalMinute !== null
          ? Math.max(
              0,
              goalMinute -
              entryMinute
            )
          : null;


      // ======================================================
      // ATOMIC FINALIZATION
      // ======================================================

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
  // NEW HUNTER CANDIDATE
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


  // ==========================================================
  // DATA
  // ==========================================================

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
  // SAVE ENTRY
  // ==========================================================

  try {

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

  } catch (error) {

    const existingAfterError =
      await env.DB
        .prepare(
          `
          SELECT *
          FROM hunter_signals
          WHERE match_id = ?
            AND status = 'TRACKING'
          ORDER BY id DESC
          LIMIT 1
          `
        )
        .bind(id)
        .first();


    if (existingAfterError) {

      trackingMap.set(
        id,
        existingAfterError
      );

      return "DUPLICATE";

    }


    throw error;

  }


  // ==========================================================
  // ADD TO LOCAL MAP
  // ==========================================================

  const newSignal = {

    id:
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


  return "ENTRY";

}


// ============================================================
// MISSING TRACKING FINALIZER
// ============================================================

async function finalizeMissingTracking(
  env,
  signal,
  now
) {

  const entryMinute =
    Number(
      signal?.entry_minute || 0
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
      (90 - safeEntryMinute) +
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
    ) /
    60000;


  if (
    ageMinutes <
    requiredMinutes
  ) {

    return false;

  }


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
// TELEGRAM COMMANDS
// ============================================================

async function handleTelegramUpdate(
  env,
  update
) {

  const message =
    update?.message;


  if (!message)
    return;


  const chatId =
    String(
      message?.chat?.id || ""
    );


  // ==========================================================
  // SECURITY
  // ==========================================================

  if (
    chatId !==
    String(env.TELEGRAM_CHAT_ID)
  ) {

    return;

  }


  const text =
    String(
      message?.text || ""
    )
      .trim();


  if (!text)
    return;


  const command =
    text
      .split(/\s+/)[0]
      .toLowerCase()
      .split("@")[0];


  // ==========================================================
  // START / HELP
  // ==========================================================

  if (
    command === "/start" ||
    command === "/help"
  ) {

    await sendTelegram(
      env,
      `🤖 GOAL WATCH

Команди:

/stats — статистика за днес

━━━━━━━━━━━━━━━━
NEXT GOAL HUNTER
━━━━━━━━━━━━━━━━`
    );

    return;

  }


  // ==========================================================
  // STATS
  // ==========================================================

  if (
    command === "/stats"
  ) {

    await sendTodayStats(
      env
    );

    return;

  }

}


// ============================================================
// TODAY STATISTICS
// ============================================================

async function sendTodayStats(
  env
) {

  const local =
    getSofiaTime(
      new Date()
    );


  const range =
    getSofiaDayUtcRange(
      local.date
    );


  const stats =
    await env.DB
      .prepare(
        `
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
              ELSE NULL
            END
          ) AS avg_goal_after

        FROM hunter_signals

        WHERE created_at >= ?
          AND created_at < ?
        `
      )
      .bind(
        range.start,
        range.end
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
      ? (
          goals /
          resolved *
          100
        )
      : 0;


  const avgGoalAfter =
    stats?.avg_goal_after !== null &&
    stats?.avg_goal_after !== undefined
      ? Number(
          stats.avg_goal_after
        )
      : null;


  const avgText =
    avgGoalAfter !== null &&
    Number.isFinite(
      avgGoalAfter
    )
      ? avgGoalAfter.toFixed(1) +
        " мин."
      : "—";


  const message =
`📊 HUNTER STATISTICS — ДНЕС

📅 ${local.date}

🎯 ENTRY: ${total}

🟢 GOAL HIT: ${goals}

🔴 NO GOAL: ${noGoals}

📈 Успеваемост:
${rate.toFixed(1)}%

⏱ Средно до гол:
${avgText}

━━━━━━━━━━━━━━━━
NEXT GOAL HUNTER
━━━━━━━━━━━━━━━━`;


  await sendTelegram(
    env,
    message
  );

}


// ============================================================
// SOFIA DAY -> UTC RANGE
// ============================================================

function getSofiaDayUtcRange(
  dateString
) {

  const start =
    localSofiaMidnightToUtc(
      dateString
    );


  const parts =
    dateString
      .split("-")
      .map(Number);


  const next =
    new Date(
      Date.UTC(
        parts[0],
        parts[1] - 1,
        parts[2] + 1
      )
    );


  const nextDate =
    next.getUTCFullYear() +
    "-" +
    String(
      next.getUTCMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      next.getUTCDate()
    ).padStart(2, "0");


  const end =
    localSofiaMidnightToUtc(
      nextDate
    );


  return {
    start,
    end
  };

}


function localSofiaMidnightToUtc(
  dateString
) {

  const guess =
    new Date(
      `${dateString}T00:00:00Z`
    );


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
    .formatToParts(
      guess
    );


  const get =
    type =>
      parts.find(
        p =>
          p.type === type
      )?.value;


  const localAsUtc =
    Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")),
      Number(get("minute")),
      Number(get("second"))
    );


  const offsetMs =
    localAsUtc -
    guess.getTime();


  return new Date(
    guess.getTime() -
    offsetMs
  ).toISOString();

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
      .prepare(
        `
        SELECT id
        FROM daily_reports
        WHERE report_date = ?
        LIMIT 1
        `
      )
      .bind(reportDate)
      .first();


  if (already) {

    return;

  }


  const range =
    getSofiaDayUtcRange(
      reportDate
    );


  const stats =
    await env.DB
      .prepare(
        `
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

        WHERE created_at >= ?
          AND created_at < ?
        `
      )
      .bind(
        range.start,
        range.end
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
      ? (
          goals /
          resolved *
          100
        )
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
    .prepare(
      `
      INSERT INTO daily_reports (

        report_date,
        total,
        goals,
        no_goals,
        success_rate,
        created_at

      )

      VALUES (?, ?, ?, ?, ?, ?)
      `
    )
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


  const url =
    `https://api.telegram.org/bot${token}/sendMessage`;


  const text =
    String(
      message || ""
    );


  const MAX_LENGTH = 4000;


  for (
    let i = 0;
    i < text.length;
    i += MAX_LENGTH
  ) {

    const part =
      text.substring(
        i,
        i + MAX_LENGTH
      );


    const response =
      await fetch(
        url,
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

              text:
                part

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
        errorText
      );

    }

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


  if (
    score !== null
  ) {

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


  return 0;

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
