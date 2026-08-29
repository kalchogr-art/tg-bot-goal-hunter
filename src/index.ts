// ============================================================
// GOAL WATCH — HUNTER TRACKER
// LOW CPU / TELEGRAM STATS / IMMEDIATE FINAL 0:0
// ============================================================

const HUNTER_MIN_SCORE = 60;
const HUNTER_FROM = 10;
const HUNTER_TO = 42;

const TIME_ZONE = "Europe/Sofia";


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
            await buildTodayStats(env)
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
    // STATUS
    // ========================================================

    return json({

      success: true,

      worker:
        "GOAL WATCH — HUNTER TRACKER",

      status:
        "ONLINE",

      mode:
        "CRON ONLY + TELEGRAM",

      message:
        "Tracker runs from Cron. Telegram commands enabled.",

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
    local.hour < 12 ||
    local.hour >= 24
  ) {

    return;

  }


  // ==========================================================
  // GET V27
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


  // ==========================================================
  // LOAD ACTIVE TRACKING
  // ==========================================================

  const result =
    await env.DB
      .prepare(`
        SELECT *
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

    if (id)
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
  // PROCESS MATCHES
  // ==========================================================

  for (
    const match of matches
  ) {

    try {

      await processMatch(
        env,
        match,
        now,
        local,
        trackingMap
      );

    } catch (error) {

      console.error(
        "MATCH ERROR",
        match?.id,
        error?.message ||
        String(error)
      );

    }

  }


  // ==========================================================
  // MISSING TRACKING
  //
  // Only used when V27 completely removes a match.
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
    return;


  const home =
    Number(
      m?.score?.home ?? 0
    );


  const away =
    Number(
      m?.score?.away ?? 0
    );


  // ==========================================================
  // MINUTE
  //
  // НЕ ПРОМЕНЯМЕ ЛОГИКАТА ЗА МИНУТИТЕ
  // ==========================================================

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
    // GOAL DETECTION
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


      // ------------------------------------------------------
      // ATOMIC FINALIZATION
      // ------------------------------------------------------

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


    // ========================================================
    // FINAL 0:0
    //
    // ВАЖНО:
    // НЕ изпращаме NO GOAL при 2H.
    //
    // Изпращаме го само когато V27 показва,
    // че мачът действително е приключил.
    // ========================================================

    if (
      home === 0 &&
      away === 0 &&
      isMatchFinished(m)
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


      return;

    }


    return;

  }


  // ==========================================================
  // NEW HUNTER ENTRY
  // ==========================================================

  const hunterScore =
    getHunterScore(m);


  if (
    !isHunterCandidate(
      m,
      hunterScore
    )
  ) {

    return;

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
  // INSERT
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

        VALUES (

          ?, ?, ?,

          ?, ?,

          ?, ?, ?, ?,

          ?, ?,

          'TRACKING',
          NULL,

          ?, ?

        )
      `)
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


  const changes =
    Number(
      insert?.meta?.changes || 0
    );


  if (
    changes < 1
  ) {

    return;

  }


  // ==========================================================
  // MEMORY MAP
  // ==========================================================

  trackingMap.set(
    id,
    {

      id:
        insert?.meta?.last_row_id ||
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
// MATCH FINISHED DETECTION
// ============================================================

function isMatchFinished(m) {

  const values = [

    m?.status,
    m?.status_type,
    m?.match_status,
    m?.state,
    m?.period,
    m?.phase

  ];


  for (
    const value of values
  ) {

    const text =
      String(
        value || ""
      )
      .toUpperCase()
      .trim();


    if (!text)
      continue;


    if (
      text === "FT" ||
      text === "FINISHED" ||
      text === "FINISH" ||
      text === "ENDED" ||
      text === "END" ||
      text === "FULL TIME" ||
      text === "AFTER FULL TIME" ||
      text === "AET" ||
      text === "PEN"
    ) {

      return true;

    }

  }


  // ----------------------------------------------------------
  // Common Flashscore-style values
  // ----------------------------------------------------------

  if (
    m?.is_finished === true ||
    m?.finished === true ||
    m?.ended === true
  ) {

    return true;

  }


  return false;

}


// ============================================================
// MISSING TRACKING
// ============================================================

async function finalizeMissingTracking(
  env,
  signal,
  now
) {

  // ----------------------------------------------------------
  // IMPORTANT:
  // If V27 completely removes a match, we cannot know
  // whether it finished 0:0 or simply disappeared.
  //
  // Therefore we keep the existing safety fallback.
  // ----------------------------------------------------------

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
        signal.id
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
// TODAY STATS
// ============================================================

async function buildTodayStats(env) {

  const local =
    getSofiaTime(
      new Date()
    );


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
        local.date
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


  const avg =
    stats?.avg_goal_after !== null &&
    stats?.avg_goal_after !== undefined
      ? Number(
          stats.avg_goal_after
        )
      : null;


  return `📊 HUNTER STATISTICS — ДНЕС

📅 ${local.date}

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
      .bind(
        reportDate
      )
      .first();


  if (already)
    return;


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


  if (!text)
    return;


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

⏱ КРАЙ НА МАЧА

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
