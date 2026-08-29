export default {
  async fetch(request, env) {

    return new Response(
      JSON.stringify({
        success: true,
        test: "GOAL-WATCH-PROXY-CONNECTION-TEST",
        marker: "PROXY-2026-08-29-OK",
        worker: "goal-watch-proxy",
        timestamp: new Date().toISOString()
      }, null, 2),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
};
