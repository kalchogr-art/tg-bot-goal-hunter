GOAL WATCH TRACKER V6.7.9 — PARALLEL MATCHER + AI BEFORE TELEGRAM

ЦЕЛ
Hunter ENTRY се записва веднага в D1, но Telegram ENTRY се изпраща чак след финален matching резултат.
Mechanical Matcher и AI Matcher стартират едновременно.

FLOW
1) Hunter detected -> INSERT TRACKING
2) START Mechanical Matcher + AI Matcher едновременно
3) Ако Mechanical е secure CONFIDENT_MATCH -> използвай него веднага
4) Ако Mechanical не намери -> AI вече работи; чакаме неговия резултат
5) Ако AI accepted -> използвай AI event_id
6) Ако и AI няма match -> FINAL UNMATCHED
7) Чак тогава -> Bet Worker preflight -> Telegram ENTRY

ВАЖНО: Това е matching/preflight логика. Не активира реален залог.

============================================================
1. WRANGLER.JSON — добави AI_MATCHER service binding
============================================================

В services добави:

    {
      "binding": "AI_MATCHER",
      "service": "ai-matcher"
    }

Така services трябва да съдържа V27, MATCHER, BET_WORKER и AI_MATCHER.

============================================================
2. INDEX.TS — добави тези helpers ПРЕДИ createHunterEntry()
============================================================

function buildAiHunterPayload(m, hunterScore) {
  const rawMatch = m?.match ?? m?.name ?? "";
  const split = splitHunterMatchName(rawMatch);

  const home = String(
    m?.home ?? m?.homeTeam ?? m?.home_name ?? m?.home?.name ?? split.home ?? ""
  ).trim();

  const away = String(
    m?.away ?? m?.awayTeam ?? m?.away_name ?? m?.away?.name ?? split.away ?? ""
  ).trim();

  return {
    type: "HUNTER_ENTRY",
    signal: "HUNTER_ENTRY",
    match_id: m?.id ?? null,
    match: rawMatch || `${home} - ${away}`,
    match_name: rawMatch || `${home} - ${away}`,
    home,
    away,
    competition: m?.competition ?? m?.league ?? m?.tournament ?? null,
    league: m?.league ?? m?.tournament ?? m?.competition ?? null,
    country: m?.country ?? null,
    entry_minute: numberOrNull(m?.minute),
    current_minute: numberOrNull(m?.minute),
    hunter_score: numberOrNull(hunterScore),
    resolve_mode: "FALLBACK_SEARCH"
  };
}

async function getAiMatchForHunter(env, m, hunterScore) {
  if (!env.AI_MATCHER) {
    return {
      success: false,
      accepted: false,
      event_id: null,
      reason: "AI_MATCHER_BINDING_MISSING",
      source: "AI"
    };
  }

  try {
    const payload = buildAiHunterPayload(m, hunterScore);

    const response = await env.AI_MATCHER.fetch(
      new Request("https://ai-matcher.internal/resolve", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
    );

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        accepted: false,
        event_id: null,
        reason: `AI_MATCHER_HTTP_${response.status}`,
        error: body.substring(0, 180),
        source: "AI"
      };
    }

    const data = await response.json();

    // V1.3.7 /resolve may expose the result directly or under result/ai_match.
    const result = data?.result ?? data?.ai_match ?? data;
    const eventId =
      result?.event_id ??
      result?.cloudbet_event_id ??
      data?.event_id ??
      data?.cloudbet_event_id ??
      null;

    const accepted =
      result?.accepted === true ||
      result?.ai_accepted === 1 ||
      result?.ai_accepted === true ||
      data?.accepted === true ||
      data?.ai_accepted === 1 ||
      data?.ai_accepted === true;

    return {
      success: accepted && eventId !== null,
      accepted,
      event_id: eventId,
      match:
        result?.cloudbet_match ??
        result?.match ??
        data?.cloudbet_match ??
        null,
      confidence: numberOrNull(
        result?.confidence ?? data?.confidence
      ),
      reason:
        result?.reason ??
        data?.reason ??
        (accepted ? "AI_MATCHED" : "AI_NO_MATCH"),
      cloudbet_period:
        result?.cloudbet_period ?? data?.cloudbet_period ?? null,
      cloudbet_minute:
        numberOrNull(result?.cloudbet_minute ?? data?.cloudbet_minute),
      source: "AI"
    };
  } catch (error) {
    return {
      success: false,
      accepted: false,
      event_id: null,
      reason: "AI_MATCHER_EXCEPTION",
      error: error?.message || String(error),
      source: "AI"
    };
  }
}

function aiMatchToCloudbetResult(ai) {
  if (!ai?.success || !ai?.event_id) {
    return {
      success: false,
      event_id: null,
      matcher_reason: ai?.reason ?? "AI_NO_MATCH",
      matcher_attempts: 0,
      match_source: "AI",
      ai_confidence: numberOrNull(ai?.confidence)
    };
  }

  return {
    success: true,
    event_id: String(ai.event_id),
    match: ai?.match ?? null,
    matcher_reason: ai?.reason ?? "AI_MATCHED",
    matcher_attempts: 0,
    matcher_score: numberOrNull(ai?.confidence),
    secure_match: true,
    match_source: "AI",
    ai_confidence: numberOrNull(ai?.confidence),

    // Odds are NOT invented here. Bet Worker reads the exact event afterwards.
    price: null,
    odds_available: false,
    max_stake: null,
    min_stake: null,
    probability: null,
    selection_status: null,
    market_url: "soccer.total_goals_period_first_half/over?total=0.5"
  };
}

async function resolveParallelMatchForHunter(env, m, hunterScore) {
  // IMPORTANT: both requests are started before we await either one.
  const mechanicalPromise = getCloudbetOddsForHunter(env, m, hunterScore);
  const aiPromise = getAiMatchForHunter(env, m, hunterScore);

  let mechanical;

  try {
    mechanical = await mechanicalPromise;
  } catch (error) {
    mechanical = {
      success: false,
      event_id: null,
      matcher_reason: "MATCHER_EXCEPTION",
      matcher_error: error?.message || String(error)
    };
  }

  // Mechanical secure match keeps the fast path.
  // AI was already started in parallel, so no time was lost.
  if (mechanical?.success === true && mechanical?.event_id) {
    return {
      ...mechanical,
      match_source: "MECHANICAL",
      ai_started_in_parallel: true
    };
  }

  // Mechanical failed/weak/no-minute-candidate: AI has already been working.
  let ai;

  try {
    ai = await aiPromise;
  } catch (error) {
    ai = {
      success: false,
      accepted: false,
      event_id: null,
      reason: "AI_MATCHER_EXCEPTION",
      error: error?.message || String(error)
    };
  }

  if (ai?.success === true && ai?.event_id) {
    return {
      ...aiMatchToCloudbetResult(ai),
      mechanical_reason:
        mechanical?.matcher_reason ?? "MATCHER_NO_MATCH",
      mechanical_attempts:
        mechanical?.matcher_attempts ?? 0,
      ai_started_in_parallel: true
    };
  }

  // Only here is the signal FINAL UNMATCHED.
  return {
    success: false,
    event_id: null,
    match: null,
    matcher_reason:
      ai?.reason ??
      mechanical?.matcher_reason ??
      "MATCHERS_NO_MATCH",
    matcher_attempts:
      mechanical?.matcher_attempts ?? 0,
    mechanical_reason:
      mechanical?.matcher_reason ?? null,
    ai_reason:
      ai?.reason ?? null,
    ai_confidence:
      numberOrNull(ai?.confidence),
    match_source: "UNMATCHED",
    ai_started_in_parallel: true
  };
}

============================================================
3. CREATEHUNTERENTRY — смени CLOUDBET lookup блока
============================================================

НАМЕРИ:

    cloudbetOdds =
      await getCloudbetOddsForHunter(
        env,
        m,
        hunterScore
      );

СМЕНИ ГО С:

    cloudbetOdds =
      await resolveParallelMatchForHunter(
        env,
        m,
        hunterScore
      );

============================================================
4. ВАЖНО ПОВЕДЕНИЕ
============================================================

Не мести INSERT-а след matcher-ите. ENTRY трябва да се запише в D1 веднага, за да не изгубим Hunter сигнал при timeout/error.

Telegram вече остава на сегашното си място — той и сега е СЛЕД Cloudbet lookup + Bet Worker preflight. Разликата е, че Cloudbet lookup вече не приключва, докато:

- Mechanical не върне secure match; ИЛИ
- при mechanical failure AI не върне финален MATCH/NO MATCH.

Така AI_MATCH_PENDING не трябва да бъде финалният Telegram matching статус.

============================================================
5. EXPECTED EXAMPLES
============================================================

Lazio - AC Milan:
Mechanical -> NO_CLOUDBET_CANDIDATE_WITHIN_MINUTE_WINDOW
AI (вече стартирал) -> event 36120763 / SS Lazio v AC Milan / confidence 1
FINAL -> MATCHED / source AI
Telegram -> чак с финалния MATCHED резултат

Aarau - Kriens:
Mechanical -> NO MATCH
AI -> event 36197594 / FC Aarau v SC Kriens / confidence 1
FINAL -> MATCHED / source AI

Ако Mechanical намери secure match за ~1 секунда:
FINAL -> MATCHED / source MECHANICAL
Telegram -> веднага; не чакаме AI резултата.

Ако и двата не намерят:
FINAL -> UNMATCHED
Telegram -> едва тогава.


============================================================
V6.7.9.1 — DAILY MATCH RATE + BET READY RATE
============================================================

Тази добавка е върху V6.7.9.
Цел: Daily Report да показва колко Hunter ENTRY са MATCHED и колко са BET READY.

ВАЖНО:
- MATCHED = има финален Cloudbet event_id.
- BET READY = Bet Worker preflight е върнал ready=true.
- Не активира betting.
- За точна статистика записваме финалните matching/preflight резултати в hunter_signals.

============================================================
A) D1 MIGRATION — изпълнява се ЕДИН ПЪТ
============================================================

ALTER TABLE hunter_signals ADD COLUMN match_source TEXT;
ALTER TABLE hunter_signals ADD COLUMN match_final_status TEXT;
ALTER TABLE hunter_signals ADD COLUMN bet_ready INTEGER DEFAULT 0;
ALTER TABLE hunter_signals ADD COLUMN bet_ready_reason TEXT;

Стойности:
match_source = MECHANICAL | AI | UNMATCHED
match_final_status = MATCHED | UNMATCHED
bet_ready = 1 | 0

============================================================
B) createHunterEntry() — след getBetReadyForHunter() и ПРЕДИ Telegram
============================================================

Добави:

  // V6.7.9.1 — persist final matching + preflight result for daily statistics.
  try {
    const finalMatched =
      cloudbetOdds?.success === true &&
      cloudbetOdds?.event_id !== null &&
      cloudbetOdds?.event_id !== undefined &&
      String(cloudbetOdds.event_id).trim() !== "";

    const matchSource = finalMatched
      ? String(cloudbetOdds?.match_source ?? "MECHANICAL").toUpperCase()
      : "UNMATCHED";

    await env.DB
      .prepare(`
        UPDATE hunter_signals
        SET
          match_source = ?,
          match_final_status = ?,
          bet_ready = ?,
          bet_ready_reason = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .bind(
        matchSource,
        finalMatched ? "MATCHED" : "UNMATCHED",
        betReady?.ready === true ? 1 : 0,
        betReady?.reason ?? null,
        new Date().toISOString(),
        insertedId
      )
      .run();
  } catch (error) {
    console.error(
      "MATCH/BET READY STATS SAVE ERROR",
      id,
      error?.message || String(error)
    );
  }

============================================================
C) sendDailyReport() — добави полетата към съществуващия stats SELECT
============================================================

След COUNT(*) AS total, добави:

          SUM(
            CASE
              WHEN match_final_status = 'MATCHED'
                OR cloudbet_event_id IS NOT NULL
              THEN 1
              ELSE 0
            END
          ) AS matched,

          SUM(
            CASE
              WHEN match_final_status = 'UNMATCHED'
              THEN 1
              ELSE 0
            END
          ) AS unmatched_explicit,

          SUM(
            CASE
              WHEN bet_ready = 1
              THEN 1
              ELSE 0
            END
          ) AS bet_ready_count,

          SUM(
            CASE
              WHEN UPPER(COALESCE(match_source, '')) = 'MECHANICAL'
              THEN 1
              ELSE 0
            END
          ) AS mechanical_matches,

          SUM(
            CASE
              WHEN UPPER(COALESCE(match_source, '')) = 'AI'
              THEN 1
              ELSE 0
            END
          ) AS ai_matches,

============================================================
D) sendDailyReport() — след const total добави изчисленията
============================================================

  const matched = Number(stats?.matched || 0);

  // Всички приключили matching опити без event_id са UNMATCHED.
  // За новите V6.7.9.1 записи match_final_status е винаги записан.
  const unmatched = Math.max(0, total - matched);

  const betReadyCount = Number(stats?.bet_ready_count || 0);
  const mechanicalMatches = Number(stats?.mechanical_matches || 0);
  const aiMatches = Number(stats?.ai_matches || 0);

  const matchRate =
    total > 0
      ? matched / total * 100
      : 0;

  const betReadyOfMatchedRate =
    matched > 0
      ? betReadyCount / matched * 100
      : 0;

  const betReadyOfAllRate =
    total > 0
      ? betReadyCount / total * 100
      : 0;

============================================================
E) DAILY TELEGRAM REPORT — добави този блок след OPEN
============================================================

━━━━━━━━━━━━━━━━
🔗 MATCHING
━━━━━━━━━━━━━━━━

✅ MATCHED: ${matched}/${total}
❌ UNMATCHED: ${unmatched}
📈 Match Rate: ${matchRate.toFixed(1)}%

⚙️ Mechanical: ${mechanicalMatches}
🤖 AI Rescue: ${aiMatches}

💰 BET READY: ${betReadyCount}/${matched}
📈 Bet Ready / MATCHED: ${betReadyOfMatchedRate.toFixed(1)}%
📈 Bet Ready / ALL ENTRY: ${betReadyOfAllRate.toFixed(1)}%

============================================================
ПРИМЕР КРАЕН DAILY REPORT
============================================================

📊 DAILY HUNTER REPORT

📅 2026-09-12

🎯 ENTRY: 84
🟢 GOAL HIT: 51
🔴 NO GOAL: 31
⏳ OPEN: 2

━━━━━━━━━━━━━━━━
🔗 MATCHING
━━━━━━━━━━━━━━━━

✅ MATCHED: 76/84
❌ UNMATCHED: 8
📈 Match Rate: 90.5%

⚙️ Mechanical: 51
🤖 AI Rescue: 25

💰 BET READY: 69/76
📈 Bet Ready / MATCHED: 90.8%
📈 Bet Ready / ALL ENTRY: 82.1%

... останалата дневна статистика остава същата.

============================================================
ЗАЩО ПАЗИМ И ДВЕТЕ ПРОЦЕНТНИ СТОЙНОСТИ
============================================================

Match Rate = MATCHED / ENTRY
Показва качеството на Mechanical + AI системата.

Bet Ready / MATCHED = BET READY / MATCHED
Показва колко от намерените Cloudbet мачове минават preflight/market/odds проверката.

Bet Ready / ALL ENTRY = BET READY / ENTRY
Това е крайната ефективност на целия pipeline от Hunter до готов кандидат.

V6.7.9.1 не променя Hunter filter, GOAL/NO_GOAL tracking или реално betting поведение.
