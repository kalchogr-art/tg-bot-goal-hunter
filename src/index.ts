// ============================================================
// GOAL WATCH — HUNTER TRACKER
// FIXED — MISSING MATCH FINALIZATION
// ============================================================

const HUNTER_MIN_SCORE = 60;
const HUNTER_FROM = 10;
const HUNTER_TO = 42;

const TIME_ZONE = "Europe/Sofia";

// Минимално време, след което липсващ TRACKING мач
// може да бъде приет за приключил.
// Изчислява се спрямо минутата на ENTRY.
//
// ENTRY 10'  -> около 100 минути чакане
// ENTRY 20'  -> около 90 минути чакане
// ENTRY 30'  -> около 80 минути чакане
// ENTRY 42'  -> около 68 минути чакане
//
// Има буфер за почивка + добавено време.
const FINAL_BUFFER_MINUTES = 20;


// ============================================================
// MAIN
// ============================================================

export default {

  // ----------------------------------------------------------
  // MANUAL TEST
  // ----------------------------------------------------------

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

      console.error(error);

      return json({
        success: false,
        error:
          error?.message ||
          String(error)
      }, 500);

    }

  },


  // ----------------------------------------------------------
  // CRON
  // ----------------------------------------------------------

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

  const now =
    new Date();


  const local =
    getSofiaTime(now);


  // ==========================================================
  // CONFIGURATION CHECK
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
  // FETCH V27 THROUGH SERVICE BINDING
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
  // LOAD ALL ACTIVE TRACKING SIGNALS ONCE
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
  // MAP ACTIVE SIGNALS BY MATCH ID
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
  // CURRENT V27 MATCH IDS
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
  // PROCESS MATCHES
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
  // MISSING TRACKING FINALIZATION
  //
  // IMPORTANT:
  //
  // Ако TRACKING мачът вече не е във V27,
  // processMatch() никога няма да бъде извикан.
  //
  // Затова тук проверяваме всички останали TRACKING
  // сигнали след обработката на текущите live мачове.
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


    // Все още е live във V27.
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


  // ==========================================================
  // RESULT
  // ==========================================================

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
  // EXISTING TRACKING SIGNAL
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
          `
        )
        .bind(
          goalMinute,
          afterMinutes,
          now.toISOString(),
          existing.id
        )
        .run();


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

      await env.DB
        .prepare(
          `
          UPDATE hunter_signals

          SET
            status = 'NO_GOAL',
            result = 'NO GOAL',
            updated_at = ?

          WHERE id = ?
          `
        )
        .bind(
          now.toISOString(),
          existing.id
        )
        .run();


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
  // ADD NEW SIGNAL TO MAP
  // ==========================================================

  trackingMap.set(
    id,
    {

      id: null,

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


  // Ако по някаква причина минутата липсва,
  // използваме консервативен максимум.
  const safeEntryMinute =
    Math.max(
      0,
      Math.min(
        42,
        entryMinute
      )
    );


  // Очаквано оставащо време до края
  // + halftime + buffer.
  //
  // 90 - ENTRY + 15 halftime + 20 buffer
  //
  // ENTRY 42:
  // 90 - 42 + 15 + 20 = 83 мин.
  //
  // ENTRY 10:
  // 90 - 10 + 15 + 20 = 115 мин.
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


  // Все още е твърде рано да приемаме,
  // че мачът е приключил.
  if (
    ageMinutes <
    requiredMinutes
  ) {

    return false;

  }


  // ==========================================================
  // ВАЖНО:
  //
  // Този сигнал е изчезнал от V27.
  // Изчакали сме достатъчно време.
  //
  // При HUNTER ENTRY винаги започваме от 0:0,
  // затова липсата на GOAL до този момент означава
  // NO GOAL за проследяването.
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


  // Ако нищо не е обновено,
  // друг процес вероятно вече го е финализирал.
  if (
    !update ||
    Number(
      update?.meta?.changes || 0
    ) < 1
  ) {

    return false;

  }


  // ==========================================================
  // TELEGRAM
  // ==========================================================

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

        WHERE substr(
          created_at,
          1,
          10
        ) = ?

        `
      )
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
