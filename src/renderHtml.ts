<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Goal Watch — Next Goal Hunter V27</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">

<style>

:root{
  --bg:#0A1220;
  --panel:#101A2E;
  --panel2:#0B1526;
  --line:#1E2C48;

  --green:#34C77B;
  --green2:#1F7A4C;

  --amber:#F2A93B;
  --red:#E85D5D;

  --text:#E9EDF6;
  --muted:#8A96AE;
  --muted2:#566079;
}

*{
  box-sizing:border-box;
}

html,
body{
  margin:0;
  padding:0;
}

body{
  min-height:100vh;

  background:
    radial-gradient(
      1200px 500px at 15% -10%,
      rgba(52,199,123,.08),
      transparent 60%
    ),
    radial-gradient(
      900px 400px at 90% 0%,
      rgba(242,169,59,.06),
      transparent 55%
    ),
    var(--bg);

  color:var(--text);

  font-family:'Archivo',system-ui,sans-serif;

  -webkit-font-smoothing:antialiased;
}


/* =========================================================
   TICKER
========================================================= */

.ticker{
  background:#050A14;
  border-bottom:1px solid var(--line);
  padding:9px 0;
  overflow:hidden;
  white-space:nowrap;
  position:sticky;
  top:0;
  z-index:50;
}

.ticker-track{
  display:inline-block;
  padding-left:100%;
  animation:ticker 34s linear infinite;
  font-family:'IBM Plex Mono',monospace;
  font-size:11px;
  color:var(--muted);
}

.ticker-track span{
  margin-right:45px;
}

.ticker-track b{
  color:var(--green);
}

@keyframes ticker{
  to{
    transform:translateX(-100%);
  }
}


/* =========================================================
   HEADER
========================================================= */

header{
  max-width:920px;
  margin:0 auto;
  padding:32px 20px 20px;
}

.eyebrow{
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:13px;
  color:var(--green);
  font-family:'IBM Plex Mono',monospace;
  font-size:10px;
  letter-spacing:.15em;
  text-transform:uppercase;
}

.live-dot{
  width:7px;
  height:7px;
  border-radius:50%;
  background:var(--red);
  animation:pulse 1.8s infinite;
}

@keyframes pulse{

  0%{
    box-shadow:0 0 0 0 rgba(232,93,93,.55);
  }

  70%{
    box-shadow:0 0 0 8px rgba(232,93,93,0);
  }

  100%{
    box-shadow:0 0 0 0 rgba(232,93,93,0);
  }

}

h1{
  margin:0 0 12px;
  font-family:'Archivo Black',sans-serif;
  font-size:clamp(30px,6vw,46px);
  line-height:1.02;
  letter-spacing:-.02em;
}

h1 em{
  color:var(--green);
  font-style:normal;
}

.subtitle{
  max-width:65ch;
  margin:0;
  color:var(--muted);
  font-size:14px;
  line-height:1.55;
}

.info{
  margin-top:15px;
  padding:12px 14px;
  border:1px solid var(--line);
  border-left:3px solid var(--amber);
  border-radius:6px;
  background:rgba(242,169,59,.05);
  color:var(--muted);
  font-size:12px;
  line-height:1.55;
}

.info b{
  color:var(--amber);
}


/* =========================================================
   STATUS
========================================================= */

.status-wrap{
  max-width:920px;
  margin:0 auto;
  padding:0 20px 15px;
}

.status{
  padding:11px 13px;
  border:1px solid var(--line);
  border-left:3px solid var(--amber);
  border-radius:7px;
  background:var(--panel);
  color:var(--muted);
  font-family:'IBM Plex Mono',monospace;
  font-size:11px;
  line-height:1.45;
}

.status.ok{
  border-left-color:var(--green);
}

.status.error{
  border-left-color:var(--red);
}


/* =========================================================
   FILTERS
========================================================= */

.filters{
  max-width:920px;
  margin:0 auto;
  padding:0 20px 20px;
  display:flex;
  gap:7px;
  flex-wrap:wrap;
}

.chip{
  border:1px solid var(--line);
  background:var(--panel);
  color:var(--muted);
  padding:7px 11px;
  border-radius:20px;
  cursor:pointer;
  font-family:'IBM Plex Mono',monospace;
  font-size:10.5px;
  transition:
    background .15s ease,
    color .15s ease,
    border-color .15s ease;
}

.chip:hover{
  border-color:var(--green2);
}

.chip.active{
  background:var(--green);
  border-color:var(--green);
  color:#07140D;
  font-weight:600;
}


/* =========================================================
   MAIN
========================================================= */

main{
  max-width:920px;
  margin:0 auto;
  padding:0 20px 60px;
  display:flex;
  flex-direction:column;
  gap:14px;
}


/* =========================================================
   SECTION
========================================================= */

.section-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:13px 15px;
  border:1px solid var(--line);
  border-radius:8px;
  background:var(--panel);
  cursor:pointer;
  font-size:14px;
  font-weight:700;
}

.section-count{
  color:var(--muted);
  font-family:'IBM Plex Mono',monospace;
  font-size:11px;
}

.arrow{
  color:var(--muted);
  margin-left:8px;
}

.match-list{
  display:none;
  flex-direction:column;
  gap:14px;
}


/* =========================================================
   CARD
========================================================= */

.card{
  position:relative;
  overflow:hidden;
  padding:17px 17px 14px;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:10px;
}

.card::before{
  content:"";
  position:absolute;
  left:0;
  top:0;
  bottom:0;
  width:3px;
  background:var(--green2);
}

.card.strong::before{
  background:var(--amber);
}

.card.very-strong::before{
  background:var(--red);
}


/* =========================================================
   CARD TOP
========================================================= */

.card-top{
  display:flex;
  justify-content:space-between;
  gap:12px;
  margin-bottom:13px;
}

.league{
  color:var(--muted2);
  font-family:'IBM Plex Mono',monospace;
  font-size:9.5px;
  text-transform:uppercase;
  letter-spacing:.08em;
}

.teams{
  margin-top:5px;
  font-size:17px;
  font-weight:700;
  line-height:1.3;
}

.clock{
  flex-shrink:0;
  text-align:right;
}

.minute{
  color:var(--green);
  font-family:'IBM Plex Mono',monospace;
  font-size:14px;
  font-weight:600;
}

.score{
  margin-top:3px;
  font-family:'Archivo Black',sans-serif;
  font-size:23px;
}


/* =========================================================
   PERIOD
========================================================= */

.period{
  display:inline-block;
  margin-top:7px;
  padding:4px 7px;
  border:1px solid var(--line);
  border-radius:4px;
  color:var(--muted);
  font-family:'IBM Plex Mono',monospace;
  font-size:9px;
}


/* =========================================================
   SIGNAL
========================================================= */

.signal{
  margin:12px 0;
  padding:12px;
  background:var(--panel2);
  border:1px solid var(--line);
  border-radius:7px;
}

.signal-head{
  color:var(--muted);
  font-family:'IBM Plex Mono',monospace;
  font-size:9px;
  text-transform:uppercase;
  letter-spacing:.1em;
}

.signal-main{
  margin-top:5px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
}

.signal-name{
  font-family:'Archivo Black',sans-serif;
  font-size:18px;
}

.signal-score{
  font-family:'Archivo Black',sans-serif;
  font-size:25px;
}

.signal-target{
  margin-top:5px;
  color:var(--muted);
  font-family:'IBM Plex Mono',monospace;
  font-size:10px;
}

.reasons{
  margin-top:8px;
  display:flex;
  gap:5px;
  flex-wrap:wrap;
}

.reason{
  padding:4px 6px;
  border:1px solid var(--line);
  border-radius:4px;
  color:var(--muted);
  font-family:'IBM Plex Mono',monospace;
  font-size:8.5px;
}


/* =========================================================
   HUNTER SCORE
========================================================= */

.hunter-rank{
  margin-top:10px;
  padding:10px;
  border:1px solid var(--line);
  border-radius:6px;
  background:rgba(242,169,59,.045);
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  font-family:'IBM Plex Mono',monospace;
  font-size:9px;
  color:var(--muted);
}

.hunter-rank b{
  color:var(--amber);
  font-size:15px;
}


/* =========================================================
   DATA GRID
========================================================= */

.grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:7px;
}

.data{
  padding:9px 10px;
  background:var(--panel2);
  border:1px solid var(--line);
  border-radius:6px;
}

.label{
  color:var(--muted2);
  font-family:'IBM Plex Mono',monospace;
  font-size:8.5px;
  text-transform:uppercase;
  letter-spacing:.06em;
}

.value{
  margin-top:4px;
  color:var(--text);
  font-family:'IBM Plex Mono',monospace;
  font-size:12px;
  font-weight:600;
}


/* =========================================================
   STATS
========================================================= */

.stats{
  margin-top:9px;
  border-top:1px solid var(--line);
  border-bottom:1px solid var(--line);
}

.stat-row{
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:center;
  gap:8px;
  padding:8px 2px;
  border-bottom:1px solid rgba(30,44,72,.55);
}

.stat-row:last-child{
  border-bottom:0;
}

.stat-home{
  text-align:right;
  font-family:'IBM Plex Mono',monospace;
  font-size:11px;
  font-weight:600;
}

.stat-name{
  min-width:80px;
  text-align:center;
  color:var(--muted2);
  font-family:'IBM Plex Mono',monospace;
  font-size:8.5px;
  text-transform:uppercase;
}

.stat-away{
  font-family:'IBM Plex Mono',monospace;
  font-size:11px;
  font-weight:600;
}


/* =========================================================
   DERIVED
========================================================= */

.derived{
  margin-top:10px;
  padding:10px;
  background:var(--panel2);
  border:1px solid var(--line);
  border-radius:6px;
}

.derived-title{
  color:var(--muted);
  font-family:'IBM Plex Mono',monospace;
  font-size:9px;
  text-transform:uppercase;
}

.derived-grid{
  margin-top:7px;
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:7px;
}

.derived-item{
  color:var(--muted);
  font-family:'IBM Plex Mono',monospace;
  font-size:9px;
}

.derived-item b{
  display:block;
  margin-top:2px;
  color:var(--text);
  font-size:11px;
}


/* =========================================================
   XG
========================================================= */

.xg{
  margin-top:9px;
  padding:10px;
  border-top:1px solid var(--line);
  border-bottom:1px solid var(--line);
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  font-family:'IBM Plex Mono',monospace;
}

.xg-label{
  color:var(--muted);
  font-size:9px;
  text-transform:uppercase;
}

.xg-value{
  font-size:11px;
  color:var(--text);
}


/* =========================================================
   TREND
========================================================= */

.trend{
  margin-top:10px;
  font-family:'IBM Plex Mono',monospace;
  font-size:10px;
}


/* =========================================================
   QUALITY
========================================================= */

.quality{
  margin-top:10px;
  color:var(--muted2);
  font-family:'IBM Plex Mono',monospace;
  font-size:9px;
  line-height:1.5;
}

.quality.good{
  color:var(--green);
}


/* =========================================================
   FOOT
========================================================= */

.card-foot{
  margin-top:11px;
  padding-top:10px;
  border-top:1px solid var(--line);
  display:flex;
  justify-content:space-between;
  gap:8px;
  flex-wrap:wrap;
  color:var(--muted2);
  font-family:'IBM Plex Mono',monospace;
  font-size:8.5px;
}


/* =========================================================
   EMPTY
========================================================= */

.empty{
  padding:24px 15px;
  text-align:center;
  color:var(--muted2);
  font-family:'IBM Plex Mono',monospace;
  font-size:11px;
}


/* =========================================================
   FOOTER
========================================================= */

footer{
  max-width:920px;
  margin:0 auto;
  padding:0 20px 55px;
  color:var(--muted2);
  font-family:'IBM Plex Mono',monospace;
  font-size:9.5px;
  line-height:1.6;
}


/* =========================================================
   MOBILE
========================================================= */

@media(max-width:520px){

  header{
    padding-top:27px;
  }

  .teams{
    font-size:15px;
  }

  .card{
    padding:15px 14px 13px;
  }

  .stat-name{
    min-width:65px;
  }

}


/* =========================================================
   REDUCED MOTION
========================================================= */

@media(prefers-reduced-motion:reduce){

  .ticker-track,
  .live-dot{
    animation:none;
  }

}

</style>
</head>


<body>


<!-- =========================================================
     TICKER
========================================================= -->

<div class="ticker">

  <div class="ticker-track">

    <span>
      <b>● LIVE</b> NEXT GOAL HUNTER V27
    </span>

    <span>
      Търсим 0:0 през първото полувреме
    </span>

    <span>
      Фокус: 10'–45'
    </span>

    <span>
      Next Goal Hunter: SCORE ≥ 60
    </span>

    <span>
      Второ полувреме: всички live мачове
    </span>

    <span>
      xG не се измисля
    </span>

  </div>

</div>


<!-- =========================================================
     HEADER
========================================================= -->

<header>

  <div class="eyebrow">

    <span class="live-dot"></span>

    LIVE · FLASHSCORE WORKER · V27

  </div>


  <h1>

    Next Goal<br>

    <em>Hunter</em>

  </h1>


  <p class="subtitle">

    Филтър за live мачове 0:0 през
    първото полувреме.

    Системата търси мачове между
    10' и 45' и ги подрежда по сила
    според наличните live показатели.

    Второто полувреме се показва
    отделно като live категория.

  </p>


  <div class="info">

    <b>HUNTER FILTER:</b>

    само 1H · резултат 0:0 ·
    минута 10'–45' ·

    <b>Score ≥ 60</b>.

    Най-силните мачове са най-отгоре.

    <br><br>

    <b>SECOND HALF:</b>

    всички live мачове в 2H,
    без ограничение 0:0.

  </div>

</header>


<!-- =========================================================
     STATUS
========================================================= -->

<div class="status-wrap">

  <div
    id="statusMsg"
    class="status"
  >

    ⟳ Свързване с Development V27 Worker...

  </div>

</div>


<!-- =========================================================
     FILTERS
========================================================= -->

<div
  id="filterBar"
  class="filters"
></div>


<!-- =========================================================
     MAIN
========================================================= -->

<main>


  <!-- =======================================================
       NEXT GOAL HUNTER
  ======================================================== -->

  <div
    class="section-header"
    data-target="allList"
  >

    <span>

      🎯 Next Goal Hunter

      <span
        class="section-count"
        id="countAll"
      >
        0
      </span>

    </span>


    <span class="arrow">

      ▸

    </span>

  </div>


  <div
    id="allList"
    class="match-list"
  ></div>


  <!-- =======================================================
       FIRST HALF
  ======================================================== -->

  <div
    class="section-header"
    data-target="firstList"
  >

    <span>

      ⚽ Hunter — 1H · 0:0

      <span
        class="section-count"
        id="count1"
      >
        0
      </span>

    </span>


    <span class="arrow">

      ▸

    </span>

  </div>


  <div
    id="firstList"
    class="match-list"
  ></div>


  <!-- =======================================================
       SECOND HALF
  ======================================================== -->

  <div
    class="section-header"
    data-target="secondList"
  >

    <span>

      ⚽ Второ полувреме

      <span
        class="section-count"
        id="count2"
      >
        0
      </span>

    </span>


    <span class="arrow">

      ▸

    </span>

  </div>


  <div
    id="secondList"
    class="match-list"
  ></div>


</main>


<!-- =========================================================
     FOOTER
========================================================= -->

<footer>

  <b>
    GOAL WATCH V27 · NEXT GOAL HUNTER
  </b>

  · 1H 0:0 · 10'–45'

  · NEXT GOAL HUNTER SCORE ≥ 60

  · 2H всички live мачове

  · подреждане по сила

  · данните идват от V27 Worker

</footer>


<script>


/* =========================================================
   CONFIG
========================================================= */

const WORKER_URL =
  "https://goal-watch-proxy.kalchogr.workers.dev";

const REFRESH_MS =
  60000;


const HUNTER_MINUTE_FROM =
  10;

const HUNTER_MINUTE_TO =
  45;


const NEXT_GOAL_HUNTER_MIN_SCORE =
  60;


/* =========================================================
   STATE
========================================================= */

let matches = [];

let activeLeagueFilter =
  "all";

let previousSnapshot = {};


/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value){

  if(
    value === null ||
    value === undefined
  ){

    return "";

  }


  return String(value)

    .replace(/&/g,"&amp;")

    .replace(/</g,"&lt;")

    .replace(/>/g,"&gt;")

    .replace(/"/g,"&quot;")

    .replace(/'/g,"&#039;");

}


function numberOrNull(value){

  if(
    value === null ||
    value === undefined ||
    value === ""
  ){

    return null;

  }


  const n =
    Number(value);


  return Number.isFinite(n)
    ? n
    : null;

}


function displayNumber(value){

  if(
    value === null ||
    value === undefined
  ){

    return "—";

  }


  return String(value);

}


function formatNumber(value){

  if(
    value === null ||
    value === undefined
  ){

    return "—";

  }


  const n =
    Number(value);


  if(
    !Number.isFinite(n)
  ){

    return "—";

  }


  return n.toFixed(2);

}


/* =========================================================
   NORMALIZE V27
========================================================= */

function normalizeMatch(m){

  const score =
    m.score || {};

  const stats =
    m.key_stats || {};

  const possession =
    stats.possession || {};

  const shots =
    stats.shots || {};

  const sot =
    stats.shots_on_target || {};

  const corners =
    stats.corners || {};

  const derived =
    m.derived || {};

  const signal =
    m.goal_signal || {};

  const xg =
    m.xg || {};

  const xgot =
    m.xgot || {};

  const xa =
    m.xa || {};

  const quality =
    m.data_quality || {};


  const teams =
    String(
      m.match || ""
    );


  let home =
    "Home";

  let away =
    "Away";


  const split =
    teams.split(" - ");


  if(
    split.length >= 2
  ){

    home =
      split.shift().trim();

    away =
      split.join(" - ").trim();

  }


  return {

    id:
      String(
        m.id || ""
      ),

    home,

    away,

    league:
      m.league ||
      m.tournament ||
      m.competition ||
      "LIVE",

    minute:
      numberOrNull(
        m.minute
      ) ?? 0,

    minuteDisplay:
      m.minute_display ||
      null,

    period:
      m.period ||
      m.statusShort ||
      "—",

    minuteSource:
      m.minute_source ||
      null,

    scoreH:
      numberOrNull(
        score.home
      ) ?? 0,

    scoreA:
      numberOrNull(
        score.away
      ) ?? 0,

    totalGoals:
      numberOrNull(
        score.total_goals
      ),

    zeroZero:
      score.zero_zero === true,

    xgH:
      numberOrNull(
        xg.home
      ),

    xgA:
      numberOrNull(
        xg.away
      ),

    xgTotal:
      numberOrNull(
        xg.total
      ),

    xgotH:
      numberOrNull(
        xgot.home
      ),

    xgotA:
      numberOrNull(
        xgot.away
      ),

    xgotTotal:
      numberOrNull(
        xgot.total
      ),

    xaH:
      numberOrNull(
        xa.home
      ),

    xaA:
      numberOrNull(
        xa.away
      ),

    xaTotal:
      numberOrNull(
        xa.total
      ),

    possH:
      numberOrNull(
        possession.home
      ),

    possA:
      numberOrNull(
        possession.away
      ),

    shotsH:
      numberOrNull(
        shots.home
      ),

    shotsA:
      numberOrNull(
        shots.away
      ),

    sotH:
      numberOrNull(
        sot.home
      ),

    sotA:
      numberOrNull(
        sot.away
      ),

    cornersH:
      numberOrNull(
        corners.home
      ),

    cornersA:
      numberOrNull(
        corners.away
      ),

    projectedXg:
      numberOrNull(
        derived.projected_90_xg
      ),

    xgPerMinute:
      numberOrNull(
        derived.xg_per_minute
      ),

    shotsPerMinute:
      numberOrNull(
        derived.shots_per_minute
      ),

    sotPerMinute:
      numberOrNull(
        derived.shots_on_target_per_minute
      ),

    cornersPerMinute:
      numberOrNull(
        derived.corners_per_minute
      ),

    attackScore:
      numberOrNull(
        derived.attack_score
      ),

    dangerIndex:
      numberOrNull(
        derived.danger_index
      ),

    goalPressure:
      numberOrNull(
        derived.goal_pressure
      ),

    signalScore:
      numberOrNull(
        signal.score
      ),

    signal:
      signal.signal ||
      "—",

    target:
      signal.target ||
      "—",

    xgUsed:
      signal.xg_used === true,

    xgotUsed:
      signal.xgot_used === true,

    reasons:
      Array.isArray(
        signal.reasons
      )
        ? signal.reasons
        : [],

    statisticsStatus:
      quality.statistics_status ??
      null,

    xgFound:
      quality.xg_found === true,

    xgotFound:
      quality.xgot_found === true,

    signalWithoutXg:
      quality.signal_can_work_without_xg === true,

    occurrences:
      quality.occurrences ??
      null,

    raw:
      m

  };

}


/* =========================================================
   FETCH WORKER
========================================================= */

async function fetchWorker(){

  const url =
    WORKER_URL +

    (
      WORKER_URL.includes("?")
        ? "&"
        : "?"
    ) +

    "t=" +

    Date.now();


  const response =
    await fetch(
      url,
      {
        method:"GET",

        cache:"no-store",

        headers:{
          "Accept":
            "application/json"
        }

      }
    );


  const text =
    await response.text();


  let data;


  try{

    data =
      JSON.parse(text);

  }catch(error){

    console.error(
      "RAW WORKER RESPONSE:",
      text
    );


    throw new Error(
      "Worker върна невалиден JSON"
    );

  }


  if(
    !response.ok
  ){

    throw new Error(
      `HTTP ${response.status}`
    );

  }


  if(
    data.success === false
  ){

    throw new Error(
      data.error ||
      data.message ||
      "Worker success:false"
    );

  }


  return data;

}


/* =========================================================
   TREND
========================================================= */

function updateTrend(list){

  list.forEach(
    m => {

      const previous =
        previousSnapshot[m.id];


      m.minuteMoving =
        false;

      m.scoreChanged =
        false;


      if(
        previous
      ){

        if(
          m.minute >
          previous.minute
        ){

          m.minuteMoving =
            true;

        }


        if(
          m.scoreH !==
            previous.scoreH ||

          m.scoreA !==
            previous.scoreA
        ){

          m.scoreChanged =
            true;

        }

      }


      previousSnapshot[m.id] = {

        minute:
          m.minute,

        scoreH:
          m.scoreH,

        scoreA:
          m.scoreA,

        checkedAt:
          Date.now()

      };

    }
  );

}


/* =========================================================
   STATUS
========================================================= */

function setStatus(
  html,
  type
){

  const el =
    document.getElementById(
      "statusMsg"
    );


  el.className =
    "status " +
    (
      type || ""
    );


  el.innerHTML =
    html;

}


/* =========================================================
   PERIOD DETECTION
========================================================= */

function isFirstHalf(m){

  const period =
    String(
      m.period || ""
    ).toUpperCase();


  return (
    period === "1H" ||
    period === "FIRST" ||
    period === "FIRST HALF" ||
    period === "1ST HALF" ||
    period.includes("1H")
  );

}


function isSecondHalf(m){

  const period =
    String(
      m.period || ""
    ).toUpperCase();


  return (
    period === "2H" ||
    period === "SECOND" ||
    period === "SECOND HALF" ||
    period === "2ND HALF" ||
    period.includes("2H")
  );

}


function isZeroZero(m){

  return (
    m.scoreH === 0 &&
    m.scoreA === 0
  );

}


/* =========================================================
   HUNTER ELIGIBILITY
========================================================= */

function hunterEligible(m){

  if(
    !isFirstHalf(m)
  ){

    return false;

  }


  if(
    !isZeroZero(m)
  ){

    return false;

  }


  if(
    m.minute <
    HUNTER_MINUTE_FROM
  ){

    return false;

  }


  if(
    m.minute >
    HUNTER_MINUTE_TO
  ){

    return false;

  }


  return true;

}


/* =========================================================
   NEXT GOAL HUNTER
========================================================= */

function nextGoalHunterEligible(m){

  if(
    !hunterEligible(m)
  ){

    return false;

  }


  const score =
    hunterScore(m);


  return (
    score >=
    NEXT_GOAL_HUNTER_MIN_SCORE
  );

}


/* =========================================================
   HUNTER SCORE
========================================================= */

function hunterScore(m){

  /*
    V27 Worker вече изчислява
    истинския Goal Signal Score.

    HTML НЕ го променя.
  */

  if(
    m.signalScore !== null
  ){

    return Math.round(
      Math.min(
        100,
        Math.max(
          0,
          m.signalScore
        )
      )
    );

  }


  /*
    Fallback само ако Worker
    няма signalScore.
  */

  let score =
    0;


  if(
    m.goalPressure !== null
  ){

    score +=
      Math.min(
        35,
        Math.max(
          0,
          m.goalPressure * 0.35
        )
      );

  }


  if(
    m.dangerIndex !== null
  ){

    score +=
      Math.min(
        25,
        Math.max(
          0,
          m.dangerIndex * 0.25
        )
      );

  }


  if(
    m.attackScore !== null
  ){

    score +=
      Math.min(
        20,
        Math.max(
          0,
          m.attackScore * 0.20
        )
      );

  }


  if(
    m.shotsPerMinute !== null
  ){

    score +=
      Math.min(
        8,
        m.shotsPerMinute * 8
      );

  }


  if(
    m.sotPerMinute !== null
  ){

    score +=
      Math.min(
        12,
        m.sotPerMinute * 12
      );

  }


  return Math.round(
    Math.min(
      100,
      score
    )
  );

}


/* =========================================================
   SECOND HALF SCORE
========================================================= */

function secondHalfScore(m){

  /*
    За 2H използваме V27 Signal Score,
    ако Worker го е изчислил.

    Ако няма Signal Score,
    подреждаме по наличните показатели.
  */

  if(
    m.signalScore !== null
  ){

    return m.signalScore;

  }


  let score =
    0;


  if(
    m.goalPressure !== null
  ){

    score +=
      m.goalPressure * 0.40;

  }


  if(
    m.dangerIndex !== null
  ){

    score +=
      m.dangerIndex * 0.30;

  }


  if(
    m.attackScore !== null
  ){

    score +=
      m.attackScore * 0.20;

  }


  if(
    m.sotPerMinute !== null
  ){

    score +=
      Math.min(
        10,
        m.sotPerMinute * 10
      );

  }


  return Math.round(
    Math.min(
      100,
      Math.max(
        0,
        score
      )
    )
  );

}


/* =========================================================
   SORT HUNTER
========================================================= */

function sortHunter(list){

  return [...list].sort(
    (a,b) => {

      const scoreA =
        hunterScore(a);

      const scoreB =
        hunterScore(b);


      if(
        scoreA !==
        scoreB
      ){

        return (
          scoreB -
          scoreA
        );

      }


      const pressureA =
        a.goalPressure ??
        -1;

      const pressureB =
        b.goalPressure ??
        -1;


      if(
        pressureA !==
        pressureB
      ){

        return (
          pressureB -
          pressureA
        );

      }


      return (
        b.minute -
        a.minute
      );

    }
  );

}


/* =========================================================
   SORT SECOND HALF
========================================================= */

function sortSecondHalf(list){

  return [...list].sort(
    (a,b) => {

      const scoreA =
        secondHalfScore(a);

      const scoreB =
        secondHalfScore(b);


      if(
        scoreA !==
        scoreB
      ){

        return (
          scoreB -
          scoreA
        );

      }


      const pressureA =
        a.goalPressure ??
        -1;

      const pressureB =
        b.goalPressure ??
        -1;


      if(
        pressureA !==
        pressureB
      ){

        return (
          pressureB -
          pressureA
        );

      }


      const dangerA =
        a.dangerIndex ??
        -1;

      const dangerB =
        b.dangerIndex ??
        -1;


      if(
        dangerA !==
        dangerB
      ){

        return (
          dangerB -
          dangerA
        );

      }


      return (
        b.minute -
        a.minute
      );

    }
  );

}


/* =========================================================
   SIGNAL
========================================================= */

function signalClass(signal){

  if(
    signal ===
    "VERY_STRONG"
  ){

    return "very-strong";

  }


  if(
    signal ===
    "STRONG"
  ){

    return "strong";

  }


  return "";

}


function signalColor(signal){

  if(
    signal ===
    "VERY_STRONG"
  ){

    return "var(--red)";

  }


  if(
    signal ===
    "STRONG"
  ){

    return "var(--amber)";

  }


  if(
    signal ===
    "MODERATE"
  ){

    return "var(--green)";

  }


  return "var(--muted)";

}


/* =========================================================
   XG
========================================================= */

function renderXG(m){

  const available =
    m.xgH !== null &&
    m.xgA !== null;


  if(
    !available
  ){

    return `

      <div class="xg">

        <span class="xg-label">
          xG
        </span>

        <span class="xg-value">
          —
        </span>

      </div>

    `;

  }


  return `

    <div class="xg">

      <span class="xg-label">
        xG
      </span>

      <span class="xg-value">

        ${formatNumber(m.xgH)}

        —

        ${formatNumber(m.xgA)}

        ${
          m.xgTotal !== null
            ? ` · общо ${formatNumber(m.xgTotal)}`
            : ""
        }

      </span>

    </div>

  `;

}


/* =========================================================
   STAT ROW
========================================================= */

function statRow(
  name,
  home,
  away
){

  return `

    <div class="stat-row">

      <div class="stat-home">
        ${displayNumber(home)}
      </div>

      <div class="stat-name">
        ${escapeHtml(name)}
      </div>

      <div class="stat-away">
        ${displayNumber(away)}
      </div>

    </div>

  `;

}


/* =========================================================
   MATCH CARD
========================================================= */

function renderCard(m){

  const signalColorValue =
    signalColor(
      m.signal
    );


  const minute =
    m.minuteDisplay ||

    (
      m.minute > 0
        ? `${m.minute}'`
        : "LIVE"
    );


  let trend =
    "→ НЯМА ПРОМЯНА";


  if(
    m.scoreChanged
  ){

    trend =
      "⚽ РЕЗУЛТАТЪТ СЕ ПРОМЕНИ";

  }

  else if(
    m.minuteMoving
  ){

    trend =
      "▶ МИНУТАТА СЕ ДВИЖИ";

  }


  const trendColor =
    m.scoreChanged
      ? "var(--amber)"
      : m.minuteMoving
        ? "var(--green)"
        : "var(--muted)";


  const reasons =
    m.reasons.length

      ? `

        <div class="reasons">

          ${
            m.reasons
              .map(
                r => `

                  <span class="reason">

                    ${escapeHtml(r)}

                  </span>

                `
              )
              .join("")
          }

        </div>

      `

      : "";


  const hunter =
    hunterScore(m);


  return `

    <article
      class="card ${signalClass(m.signal)}"
    >

      <div class="card-top">

        <div>

          <div class="league">

            ${escapeHtml(
              m.league
            )}

          </div>


          <div class="teams">

            ${escapeHtml(
              m.home
            )}

            <span
              style="
                color:var(--muted);
                margin:0 5px;
                font-weight:500;
              "
            >

              срещу

            </span>

            ${escapeHtml(
              m.away
            )}

          </div>


          <div class="period">

            ${escapeHtml(
              m.period
            )}

            ·

            ${m.scoreH}:${m.scoreA}

            ·

            ${
              isSecondHalf(m)
                ? "2H LIVE"
                : "HUNTER"
            }

          </div>

        </div>


        <div class="clock">

          <div class="minute">

            ${escapeHtml(
              minute
            )}

          </div>


          <div class="score">

            ${m.scoreH}:${m.scoreA}

          </div>

        </div>

      </div>


      <div class="signal">

        <div class="signal-head">

          GOAL SIGNAL ·

          ${escapeHtml(
            m.target
          )}

        </div>


        <div class="signal-main">

          <div
            class="signal-name"
            style="
              color:${signalColorValue};
            "
          >

            ${escapeHtml(
              m.signal
            )}

          </div>


          <div
            class="signal-score"
            style="
              color:${signalColorValue};
            "
          >

            ${
              m.signalScore !== null
                ? m.signalScore
                : "—"
            }

          </div>

        </div>


        <div class="signal-target">

          Цел:
          ${escapeHtml(
            m.target
          )}

          ·

          xG:
          ${
            m.xgUsed
              ? "използван"
              : "не е използван"
          }

          ·

          xGOT:
          ${
            m.xgotUsed
              ? "използван"
              : "не е използван"
          }

        </div>


        ${reasons}

      </div>


      <div class="hunter-rank">

        <span>

          🎯 SCORE

        </span>


        <b>

          ${hunter}/100

        </b>

      </div>


      <div class="grid">

        <div class="data">

          <div class="label">
            Минута
          </div>

          <div class="value">

            ${escapeHtml(
              minute
            )}

          </div>

        </div>


        <div class="data">

          <div class="label">
            Резултат
          </div>

          <div class="value">

            ${m.scoreH}:${m.scoreA}

          </div>

        </div>


        <div class="data">

          <div class="label">
            Goal Pressure
          </div>

          <div class="value">

            ${
              m.goalPressure !== null
                ? m.goalPressure
                : "—"
            }

          </div>

        </div>


        <div class="data">

          <div class="label">
            Danger Index
          </div>

          <div class="value">

            ${
              m.dangerIndex !== null
                ? m.dangerIndex
                : "—"
            }

          </div>

        </div>


        <div class="data">

          <div class="label">
            Attack Score
          </div>

          <div class="value">

            ${
              m.attackScore !== null
                ? m.attackScore
                : "—"
            }

          </div>

        </div>


        <div class="data">

          <div class="label">
            Signal Score
          </div>

          <div class="value">

            ${
              m.signalScore !== null
                ? m.signalScore
                : "—"
            }

          </div>

        </div>

      </div>


      <div class="stats">

        ${statRow(
          "Удари",
          m.shotsH,
          m.shotsA
        )}


        ${statRow(
          "Удари в целта",
          m.sotH,
          m.sotA
        )}


        ${statRow(
          "Ъглови",
          m.cornersH,
          m.cornersA
        )}


        ${statRow(
          "Притежание %",
          m.possH !== null
            ? m.possH + "%"
            : null,
          m.possA !== null
            ? m.possA + "%"
            : null
        )}

      </div>


      <div class="derived">

        <div class="derived-title">

          DERIVED · V27

        </div>


        <div class="derived-grid">


          <div class="derived-item">

            Удари / мин

            <b>

              ${
                m.shotsPerMinute !== null
                  ? m.shotsPerMinute
                  : "—"
              }

            </b>

          </div>


          <div class="derived-item">

            Удари в цел / мин

            <b>

              ${
                m.sotPerMinute !== null
                  ? m.sotPerMinute
                  : "—"
              }

            </b>

          </div>


          <div class="derived-item">

            Ъглови / мин

            <b>

              ${
                m.cornersPerMinute !== null
                  ? m.cornersPerMinute
                  : "—"
              }

            </b>

          </div>


          <div class="derived-item">

            Projected 90' xG

            <b>

              ${
                m.projectedXg !== null
                  ? m.projectedXg
                  : "—"
              }

            </b>

          </div>


        </div>

      </div>


      ${renderXG(m)}


      <div class="grid">

        <div class="data">

          <div class="label">
            xG
          </div>

          <div class="value">

            ${
              m.xgH !== null &&
              m.xgA !== null

                ? `${formatNumber(m.xgH)} — ${formatNumber(m.xgA)}`

                : "—"
            }

          </div>

        </div>


        <div class="data">

          <div class="label">
            xGOT
          </div>

          <div class="value">

            ${
              m.xgotH !== null &&
              m.xgotA !== null

                ? `${formatNumber(m.xgotH)} — ${formatNumber(m.xgotA)}`

                : "—"
            }

          </div>

        </div>


        <div class="data">

          <div class="label">
            XA
          </div>

          <div class="value">

            ${
              m.xaH !== null &&
              m.xaA !== null

                ? `${formatNumber(m.xaH)} — ${formatNumber(m.xaA)}`

                : "—"
            }

          </div>

        </div>

      </div>


      <div
        class="trend"
        style="
          color:${trendColor};
        "
      >

        ${trend}

      </div>


      <div
        class="
          quality
          ${
            m.statisticsStatus === 200
              ? "good"
              : ""
          }
        "
      >

        Statistics HTTP:

        ${
          m.statisticsStatus !== null
            ? m.statisticsStatus
            : "—"
        }

        ·

        xG:

        ${
          m.xgFound
            ? "FOUND"
            : "—"
        }

        ·

        xGOT:

        ${
          m.xgotFound
            ? "FOUND"
            : "—"
        }

        ·

        Signal без xG:

        ${
          m.signalWithoutXg
            ? "YES"
            : "NO"
        }

      </div>


      <div class="card-foot">

        <span>

          ID:
          ${escapeHtml(
            m.id
          )}

        </span>


        <span>

          Minute source:

          ${
            m.minuteSource
              ? escapeHtml(
                  m.minuteSource
                )
              : "—"
          }

        </span>


        <span>

          Development V27

        </span>

      </div>


    </article>

  `;

}


/* =========================================================
   FILTER BAR
========================================================= */

function renderFilterBar(){

  const bar =
    document.getElementById(
      "filterBar"
    );


  /*
    Филтрите се правят от всички
    мачове, които могат да се виждат
    в сайта:
      - Hunter 1H
      - Second Half
  */

  const visibleMatches =
    matches.filter(
      m =>
        nextGoalHunterEligible(m) ||
        isSecondHalf(m)
    );


  const leagues =
    [
      ...new Set(
        visibleMatches
          .map(
            m => m.league
          )
          .filter(Boolean)
      )
    ]
    .sort(
      (a,b) =>
        String(a).localeCompare(
          String(b),
          "bg"
        )
    );


  let html = `

    <div
      class="chip ${
        activeLeagueFilter === "all"
          ? "active"
          : ""
      }"
      data-league="all"
    >

      Всички

    </div>

  `;


  leagues.forEach(
    league => {

      html += `

        <div
          class="chip ${
            activeLeagueFilter === league
              ? "active"
              : ""
          }"
          data-league="${escapeHtml(league)}"
        >

          ${escapeHtml(
            league
          )}

        </div>

      `;

    }
  );


  bar.innerHTML =
    html;


  bar
    .querySelectorAll(
      ".chip"
    )
    .forEach(
      chip => {

        chip.addEventListener(
          "click",
          () => {

            activeLeagueFilter =
              chip.dataset.league;

            render();

          }
        );

      }
    );

}


/* =========================================================
   RENDER LIST
========================================================= */

function renderList(
  list,
  targetId,
  sorter = sortHunter
){

  const el =
    document.getElementById(
      targetId
    );


  if(
    !el
  ){

    return;

  }


  if(
    !list.length
  ){

    el.innerHTML = `

      <div class="empty">

        Няма мачове в тази категория.

      </div>

    `;

    return;

  }


  el.innerHTML =
    sorter(list)
      .map(
        renderCard
      )
      .join("");

}


/* =========================================================
   RENDER
========================================================= */

function render(){

  renderFilterBar();


  /*
     NEXT GOAL HUNTER

     1H
     0:0
     10'–45'
     SCORE >= 60
  */

  let nextGoalHunter =
    matches.filter(
      nextGoalHunterEligible
    );


  /*
     HUNTER 1H

     Всички:
     1H
     0:0
     10'–45'
  */

  let firstHalf =
    matches.filter(
      hunterEligible
    );


  /*
     SECOND HALF

     Всички live мачове,
     които са във 2H.

     Няма ограничение:
     - резултат
     - минута
     - score
  */

  let secondHalf =
    matches.filter(
      isSecondHalf
    );


  /*
     LEAGUE FILTER
  */

  if(
    activeLeagueFilter !==
    "all"
  ){

    nextGoalHunter =
      nextGoalHunter.filter(
        m =>
          m.league ===
          activeLeagueFilter
      );


    firstHalf =
      firstHalf.filter(
        m =>
          m.league ===
          activeLeagueFilter
      );


    secondHalf =
      secondHalf.filter(
        m =>
          m.league ===
          activeLeagueFilter
      );

  }


  /*
     COUNTS
  */

  document.getElementById(
    "countAll"
  ).textContent =
    nextGoalHunter.length;


  document.getElementById(
    "count1"
  ).textContent =
    firstHalf.length;


  document.getElementById(
    "count2"
  ).textContent =
    secondHalf.length;


  /*
     RENDER
  */

  renderList(
    nextGoalHunter,
    "allList",
    sortHunter
  );


  renderList(
    firstHalf,
    "firstList",
    sortHunter
  );


  renderList(
    secondHalf,
    "secondList",
    sortSecondHalf
  );

}


/* =========================================================
   SECTION TOGGLE
========================================================= */

document
  .querySelectorAll(
    ".section-header"
  )
  .forEach(
    header => {

      header.addEventListener(
        "click",
        () => {

          const target =
            document.getElementById(
              header.dataset.target
            );


          const arrow =
            header.querySelector(
              ".arrow"
            );


          const isClosed =
            getComputedStyle(
              target
            ).display ===
            "none";


          if(
            isClosed
          ){

            target.style.display =
              "flex";

            arrow.textContent =
              "▾";

          }

          else{

            target.style.display =
              "none";

            arrow.textContent =
              "▸";

          }

        }
      );

    }
  );


/* =========================================================
   AUTO REFRESH
========================================================= */

setInterval(
  () => {

    if(
      document.visibilityState ===
      "visible"
    ){

      loadMatches();

    }

  },
  REFRESH_MS
);


/* =========================================================
   VISIBILITY REFRESH
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if(
      document.visibilityState ===
      "visible"
    ){

      loadMatches();

    }

  }
);


/* =========================================================
   LOAD MATCHES
========================================================= */

async function loadMatches(){

  setStatus(
    "⟳ Проверявам Development V27...",
    ""
  );


  try{

    const data =
      await fetchWorker();


    /*
      Поддържаме директния формат
      на V27:

      data.matches

      и резервно:

      data.feed.matches
      data.data.matches
    */

    const raw =
      Array.isArray(
        data.matches
      )

        ? data.matches

        : Array.isArray(
            data.feed?.matches
          )

          ? data.feed.matches

          : Array.isArray(
              data.data?.matches
            )

            ? data.data.matches

            : [];


    matches =
      raw
        .map(
          normalizeMatch
        )
        .filter(
          m => m.id
        );


    updateTrend(
      matches
    );


    const liveCount =
      data.feed?.live_matches ??
      matches.length;


    const total =
      data.feed?.total_matches ??
      "—";


    const returned =
      data.feed?.matches_returned ??
      matches.length;


    const xgCount =
      data.feed?.matches_with_xg ??
      0;


    const hunterCount =
      matches.filter(
        nextGoalHunterEligible
      ).length;


    const firstHalfCount =
      matches.filter(
        hunterEligible
      ).length;


    const secondHalfCount =
      matches.filter(
        isSecondHalf
      ).length;


    const timestamp =
      data.timestamp

        ? new Date(
            data.timestamp
          ).toLocaleTimeString(
            "bg-BG",
            {
              hour:"2-digit",
              minute:"2-digit",
              second:"2-digit"
            }
          )

        : "";


    setStatus(

      `🟢 <b>FLASHSCORE V27</b> · ` +

      `${liveCount} live · ` +

      `Hunter ≥60: ${hunterCount} · ` +

      `1H: ${firstHalfCount} · ` +

      `2H: ${secondHalfCount} · ` +

      `получени ${returned} · ` +

      `xG ${xgCount} · ` +

      `feed ${total}` +

      (
        timestamp
          ? ` · ${timestamp}`
          : ""
      ),

      "ok"

    );


    render();


  }

  catch(error){

    console.error(
      error
    );


    setStatus(

      `🔴 <b>Грешка:</b> ` +

      escapeHtml(
        error.message
      ),

      "error"

    );

  }

}


/* =========================================================
   START
========================================================= */

loadMatches();

</script>

</body>
</html>
