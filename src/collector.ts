// ============================================================
// GOAL WATCH — COLLECTOR V1
// FLASHscore ONLY
//
// V3 DATA ENGINE
// DATA ONLY
//
// REMOVED:
// ❌ Hunter Score
// ❌ Goal Signal
// ❌ Attack Score
// ❌ Danger Index
// ❌ Goal Pressure
// ❌ Derived
// ❌ Telegram
// ❌ bookmaker / TV / sponsor data
// ❌ raw commercial feed
//
// KEPT:
// ✅ ALL LIVE MATCHES
// ✅ teams
// ✅ league / country when available
// ✅ live time
// ✅ score
// ✅ xG
// ✅ xG Share
// ✅ xGOT
// ✅ xA
// ✅ ALL statistics
// ✅ occurrences
// ============================================================


const MAIN_URL =
    "https://www.flashscore.com/x/feed/f_1_0_3_en_1";

const STAT_URL =
    "https://www.flashscore.com/x/feed/df_st_1_";


const headers = {

    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139.0.0.0 Safari/537.36",

    "Accept":
        "*/*",

    "Accept-Language":
        "en-US,en;q=0.9",

    "Referer":
        "https://www.flashscore.com/",

    "Origin":
        "https://www.flashscore.com",

    "x-fsign":
        "SW9D1eZo",

    "Cache-Control":
        "no-cache"

};


const corsHeaders = {

    "Access-Control-Allow-Origin":
        "*",

    "Access-Control-Allow-Methods":
        "GET, HEAD, OPTIONS",

    "Access-Control-Allow-Headers":
        "Content-Type, Authorization"

};


// ============================================================
// MAIN
// ============================================================

export default {

    async fetch(request: Request) {

        if (
            request.method === "OPTIONS"
        ) {

            return new Response(
                null,
                {
                    status: 204,
                    headers: corsHeaders
                }
            );

        }


        if (
            request.method !== "GET" &&
            request.method !== "HEAD"
        ) {

            return json(
                {
                    success: false,
                    error: "Method not allowed"
                },
                405
            );

        }


        try {

            // =================================================
            // FLASHscore LIVE FEED
            // =================================================

            const mainRes =
                await fetch(
                    MAIN_URL +
                    "?_=" +
                    Date.now(),
                    {
                        headers,
                        cache: "no-store"
                    }
                );


            const mainText =
                await mainRes.text();


            if (
                !mainRes.ok
            ) {

                return json(
                    {
                        success: false,
                        collector: "COLLECTOR V1",
                        source: "FLASHSCORE ONLY",
                        feed: {
                            status:
                                mainRes.status,
                            length:
                                mainText.length
                        },
                        error:
                            "Flashscore live feed failed"
                    },
                    503
                );

            }


            // =================================================
            // PARSE V3 MAIN FEED
            // =================================================

            const parsed =
                parse(
                    mainText
                );


            // =================================================
            // ALL LIVE MATCHES
            // AB = 2
            // =================================================

            const liveMatches =
                parsed.filter(
                    m =>
                        m?.raw?.AB === "2"
                );


            const output: any[] = [];


            // =================================================
            // PROCESS EVERY LIVE MATCH
            // =================================================

            for (
                const match of liveMatches
            ) {

                try {

                    const r =
                        match.raw;


                    // =========================================
                    // TIME
                    // =========================================

                    const timeInfo =
                        getMinuteInfo(
                            r
                        );


                    const minute =
                        timeInfo.minute;


                    const minuteDisplay =
                        timeInfo.display;


                    const period =
                        timeInfo.period;


                    // =========================================
                    // SCORE
                    // =========================================

                    const scoreHome =
                        toNumber(
                            r.AG
                        );


                    const scoreAway =
                        toNumber(
                            r.AH
                        );


                    const totalGoals =
                        valid(scoreHome) &&
                        valid(scoreAway)
                            ? scoreHome + scoreAway
                            : 0;


                    const zeroZero =
                        scoreHome === 0 &&
                        scoreAway === 0;


                    // =========================================
                    // STATISTICS
                    //
                    // Collector V1 reads the same Flashscore
                    // statistics endpoint used by V3.
                    //
                    // NO SCORE / SIGNAL calculation.
                    // =========================================

                    const statistics =
                        await fetchEndpoint(
                            STAT_URL +
                            match.id,
                            headers
                        );


                    const parsedStats =
                        statistics.status === 200
                            ? parseStatistics(
                                statistics.text
                              )
                            : emptyStatistics();


                    // =========================================
                    // XG
                    // =========================================

                    const xgHome =
                        parsedStats.xg.home;


                    const xgAway =
                        parsedStats.xg.away;


                    const xgTotal =
                        valid(xgHome) &&
                        valid(xgAway)
                            ? round(
                                xgHome +
                                xgAway
                              )
                            : null;


                    // =========================================
                    // XG SHARE
                    // =========================================

                    let xgShare = {

                        found:
                            false,

                        home:
                            null as number | null,

                        away:
                            null as number | null

                    };


                    if (
                        valid(xgHome) &&
                        valid(xgAway) &&
                        valid(xgTotal) &&
                        xgTotal > 0
                    ) {

                        xgShare = {

                            found:
                                true,

                            home:
                                round(
                                    (
                                        xgHome /
                                        xgTotal
                                    ) * 100,
                                    1
                                ),

                            away:
                                round(
                                    (
                                        xgAway /
                                        xgTotal
                                    ) * 100,
                                    1
                                )

                        };

                    }


                    // =========================================
                    // XGOT
                    // =========================================

                    const xgotHome =
                        parsedStats.xgot.home;


                    const xgotAway =
                        parsedStats.xgot.away;


                    const xgotTotal =
                        valid(xgotHome) &&
                        valid(xgotAway)
                            ? round(
                                xgotHome +
                                xgotAway
                              )
                            : null;


                    // =========================================
                    // XA
                    // =========================================

                    const xaHome =
                        parsedStats.xa.home;


                    const xaAway =
                        parsedStats.xa.away;


                    const xaTotal =
                        valid(xaHome) &&
                        valid(xaAway)
                            ? round(
                                xaHome +
                                xaAway
                              )
                            : null;


                    // =========================================
                    // KEY STATS
                    // =========================================

                    const keyStats =
                        buildKeyStats(
                            parsedStats.stats
                        );


                    // =========================================
                    // LEAGUE
                    //
                    // V3 feed does not expose a reliable
                    // league field in the match raw object.
                    // Keep null instead of inventing it.
                    // =========================================

                    const league =
                        getLeague(
                            r
                        );


                    // =========================================
                    // CLEAN MATCH OBJECT
                    //
                    // NO RAW FIELD.
                    // NO COMMERCIAL DATA.
                    // =========================================

                    output.push({

                        id:
                            match.id,

                        match:
                            `${r.AE || ""} - ${r.AF || ""}`,

                        league:
                            league.name,

                        country:
                            league.country,

                        home:
                            r.AE || "",

                        away:
                            r.AF || "",

                        status:
                            "LIVE",

                        status_code:
                            r.AB || null,


                        // -------------------------------
                        // TIME
                        // -------------------------------

                        minute,

                        minute_display:
                            minuteDisplay,

                        period,

                        minute_source:
                            timeInfo.source,

                        time_debug:
                            timeInfo.debug,


                        // -------------------------------
                        // SCORE
                        // -------------------------------

                        score: {

                            home:
                                scoreHome,

                            away:
                                scoreAway,

                            total_goals:
                                totalGoals,

                            zero_zero:
                                zeroZero

                        },


                        // -------------------------------
                        // XG
                        // -------------------------------

                        xg: {

                            home:
                                xgHome,

                            away:
                                xgAway,

                            total:
                                xgTotal

                        },


                        xg_share:
                            xgShare,


                        // -------------------------------
                        // XGOT
                        // -------------------------------

                        xgot: {

                            home:
                                xgotHome,

                            away:
                                xgotAway,

                            total:
                                xgotTotal

                        },


                        // -------------------------------
                        // XA
                        // -------------------------------

                        xa: {

                            home:
                                xaHome,

                            away:
                                xaAway,

                            total:
                                xaTotal

                        },


                        // -------------------------------
                        // V3 KEY STATS
                        // -------------------------------

                        key_stats:
                            keyStats,


                        // -------------------------------
                        // ALL STATS
                        //
                        // Нищо не се губи.
                        // -------------------------------

                        stats:
                            parsedStats.stats,


                        // -------------------------------
                        // OCCURRENCES
                        // -------------------------------

                        occurrences:
                            parsedStats.occurrences,


                        // -------------------------------
                        // DATA QUALITY
                        // -------------------------------

                        data_quality: {

                            statistics_status:
                                statistics.status,

                            statistics_length:
                                statistics.text.length,

                            xg_found:
                                valid(xgTotal),

                            xgot_found:
                                valid(xgotTotal),

                            xa_found:
                                valid(xaTotal),

                            occurrences:
                                parsedStats.occurrences

                        }

                    });


                } catch (
                    error
                ) {

                    // Do not kill the complete collector
                    // because of one match.

                    output.push({

                        id:
                            match.id,

                        match:
                            `${match.raw?.AE || ""} - ${match.raw?.AF || ""}`,

                        error:
                            error instanceof Error
                                ? error.message
                                : String(error)

                    });

                }

            }


            // =================================================
            // SUMMARY
            // =================================================

            const xgMatches =
                output.filter(
                    m =>
                        m?.data_quality?.xg_found
                ).length;


            const zeroZeroMatches =
                output.filter(
                    m =>
                        m?.score?.zero_zero === true
                ).length;


            // =================================================
            // FINAL RESPONSE
            // =================================================

            return json({

                success:
                    true,

                collector:
                    "COLLECTOR V1",

                source:
                    "FLASHSCORE ONLY",

                timestamp:
                    new Date().toISOString(),

                feed: {

                    status:
                        mainRes.status,

                    total_matches:
                        parsed.length,

                    live_matches:
                        liveMatches.length,

                    matches_returned:
                        output.length,

                    matches_with_xg:
                        xgMatches,

                    zero_zero_matches:
                        zeroZeroMatches,

                    signals_found:
                        0

                },

                matches:
                    output

            });


        } catch (
            error
        ) {

            return json(
                {

                    success:
                        false,

                    collector:
                        "COLLECTOR V1",

                    source:
                        "FLASHSCORE ONLY",

                    error:
                        error instanceof Error
                            ? error.message
                            : String(error)

                },
                500
            );

        }

    }

};


// ============================================================
// MAIN FEED PARSER
// ============================================================

function parse(
    text: string
) {

    const result: any[] = [];

    let current:
        any = null;


    // Flashscore:
    //
    // field separator = U+00AC
    // key/value separator = U+00F7
    // AA = new event

    for (
        const field of
        text.split("\xAC")
    ) {

        if (!field)
            continue;


        const separator =
            field.indexOf("\xF7");


        if (
            separator === -1
        )
            continue;


        const key =
            field
                .slice(
                    0,
                    separator
                )
                .replace(
                    /^~/,
                    ""
                );


        const value =
            field.slice(
                separator + 1
            );


        if (!key)
            continue;


        if (
            key === "AA"
        ) {

            if (
                current
            ) {

                result.push(
                    current
                );

            }


            current = {

                id:
                    value,

                raw:
                    {}

            };


            continue;

        }


        if (
            current
        ) {

            current.raw[key] =
                value;

        }

    }


    if (
        current
    ) {

        result.push(
            current
        );

    }


    const seen =
        new Set<string>();


    return result.filter(
        m => {

            if (
                !m?.id
            )
                return false;


            if (
                seen.has(
                    m.id
                )
            )
                return false;


            seen.add(
                m.id
            );


            return true;

        }
    );

}


// ============================================================
// STATISTICS
// ============================================================

function parseStatistics(
    text: string
) {

    const result =
        emptyStatistics();


    let section =
        "match";


    let currentStat:
        string | null =
            null;


    let home:
        number | null =
            null;


    const fields =
        text.split("\xAC");


    for (
        const rawField of fields
    ) {

        if (!rawField)
            continue;


        const field =
            rawField.replace(
                /^~/,
                ""
            );


        // V3 statistics feed uses
        // ? as key/value separator.

        const i =
            field.indexOf("?");


        if (
            i === -1
        )
            continue;


        const key =
            field.slice(
                0,
                i
            );


        const value =
            field.slice(
                i + 1
            );


        // ---------------------------------------------
        // SECTION
        // ---------------------------------------------

        if (
            key === "SE"
        ) {

            const v =
                value.toLowerCase();


            if (
                v.includes("1st")
            ) {

                section =
                    "first_half";

            } else if (
                v.includes("2nd")
            ) {

                section =
                    "second_half";

            } else {

                section =
                    "match";

            }


            continue;

        }


        // ---------------------------------------------
        // STAT NAME
        // ---------------------------------------------

        if (
            key === "SG"
        ) {

            currentStat =
                normalizeStat(
                    value
                );


            home =
                null;


            continue;

        }


        // ---------------------------------------------
        // HOME
        // ---------------------------------------------

        if (
            key === "SH"
        ) {

            home =
                parseStatValue(
                    value
                );


            continue;

        }


        // ---------------------------------------------
        // AWAY
        // ---------------------------------------------

        if (
            key === "SI"
        ) {

            const away =
                parseStatValue(
                    value
                );


            if (
                currentStat &&
                home !== null &&
                away !== null
            ) {

                result.occurrences++;


                // =====================================
                // KEEP EVERY STAT
                // =====================================

                if (
                    !result.stats[
                        currentStat
                    ]
                ) {

                    result.stats[
                        currentStat
                    ] = {

                        found:
                            true,

                        home,

                        away

                    };

                } else {

                    // If the same stat appears in
                    // another section, preserve it
                    // instead of overwriting it.

                    const existing =
                        result.stats[
                            currentStat
                        ];


                    if (
                        !existing.sections
                    ) {

                        existing.sections =
                            {};

                    }


                    existing.sections[
                        section
                    ] = {

                        home,

                        away,

                        total:
                            round(
                                home +
                                away
                            )

                    };

                }


                // =====================================
                // XG
                // =====================================

                if (
                    currentStat ===
                    "xg"
                ) {

                    result.xg = {

                        home,

                        away

                    };

                }


                // =====================================
                // XGOT
                // =====================================

                else if (
                    currentStat ===
                    "xgot"
                ) {

                    result.xgot = {

                        home,

                        away

                    };

                }


                // =====================================
                // XA
                // =====================================

                else if (
                    currentStat ===
                    "xa"
                ) {

                    result.xa = {

                        home,

                        away

                    };

                }

            }

        }

    }


    return result;

}


// ============================================================
// EMPTY STATISTICS
// ============================================================

function emptyStatistics() {

    return {

        xg: {

            home:
                null,

            away:
                null

        },

        xgot: {

            home:
                null,

            away:
                null

        },

        xa: {

            home:
                null,

            away:
                null

        },

        stats:
            {} as Record<string, any>,

        occurrences:
            0

    };

}


// ============================================================
// NORMALIZE STAT
// ============================================================

function normalizeStat(
    value: string
) {

    const v =
        value
            .toLowerCase()
            .trim();


    if (
        v === "xg" ||
        v.includes(
            "expected goals"
        )
    )
        return "xg";


    if (
        v === "xgot" ||
        v.includes(
            "xg on target"
        ) ||
        v.includes(
            "expected goals on target"
        )
    )
        return "xgot";


    if (
        v === "xa" ||
        v.includes(
            "expected assists"
        )
    )
        return "xa";


    if (
        v === "ball possession"
    )
        return "possession";


    if (
        v === "total shots"
    )
        return "shots";


    if (
        v === "shots on target"
    )
        return "shots_on_target";


    if (
        v === "shots off target"
    )
        return "shots_off_target";


    if (
        v === "blocked shots"
    )
        return "blocked_shots";


    if (
        v.includes(
            "inside the box"
        )
    )
        return "shots_inside_box";


    if (
        v.includes(
            "outside the box"
        )
    )
        return "shots_outside_box";


    if (
        v === "big chances"
    )
        return "big_chances";


    if (
        v === "corner kicks"
    )
        return "corners";


    if (
        v.includes(
            "touches in opposition box"
        )
    )
        return "touches_in_opposition_box";


    if (
        v === "hit the woodwork"
    )
        return "hit_the_woodwork";


    if (
        v === "goalkeeper saves"
    )
        return "goalkeeper_saves";


    if (
        v.includes(
            "xgot faced"
        )
    )
        return "xgot_faced";


    if (
        v.includes(
            "goals prevented"
        )
    )
        return "goals_prevented";


    return v
        .replace(
            /\s+/g,
            "_"
        )
        .replace(
            /[()%]/g,
            ""
        );

}


// ============================================================
// KEY STATS
// ============================================================

function buildKeyStats(
    stats: Record<string, any>
) {

    const names = [

        "possession",

        "shots",

        "shots_on_target",

        "shots_off_target",

        "blocked_shots",

        "shots_inside_box",

        "shots_outside_box",

        "big_chances",

        "corners",

        "touches_in_opposition_box",

        "hit_the_woodwork",

        "goalkeeper_saves",

        "xgot_faced",

        "goals_prevented"

    ];


    const output: Record<
        string,
        any
    > = {};


    for (
        const name of names
    ) {

        const stat =
            stats[name];


        if (!stat) {

            output[name] = {

                found:
                    false,

                home:
                    null,

                away:
                    null,

                total:
                    0

            };


            continue;

        }


        output[name] = {

            found:
                stat.found === true,

            home:
                stat.home,

            away:
                stat.away,

            total:
                valid(stat.home) &&
                valid(stat.away)
                    ? round(
                        stat.home +
                        stat.away
                      )
                    : 0

        };

    }


    return output;

}


// ============================================================
// TIME ENGINE — V3
// ============================================================

function getMinuteInfo(
    r: Record<string, string>
) {

    const now =
        Math.floor(
            Date.now() / 1000
        );


    const AC =
        r.AC;


    const AD =
        toNumber(
            r.AD
        );


    const AO =
        toNumber(
            r.AO
        );


    const BC =
        toNumber(
            r.BC
        );


    const BD =
        toNumber(
            r.BD
        );


    // ========================================================
    // 2H
    // ========================================================

    if (
        AC === "13" &&
        valid(AO)
    ) {

        const seconds =
            Math.max(
                0,
                now - AO!
            );


        const minute =
            45 +
            Math.floor(
                seconds / 60
            );


        const sec =
            seconds % 60;


        return {

            minute,

            display:
                minute >= 90
                    ? `90+${Math.max(
                        0,
                        minute - 90
                    )}`
                    : `${minute}:${String(
                        sec
                    ).padStart(
                        2,
                        "0"
                    )}`,

            period:
                "2H",

            source:
                "AO_2H",

            debug: {

                AC,
                AD,
                AO,
                BC,
                BD,

                now_unix:
                    now,

                now_minus_AO:
                    now - AO!

            }

        };

    }


    // ========================================================
    // 1H
    // ========================================================

    if (
        AC === "12" &&
        valid(AO)
    ) {

        const seconds =
            Math.max(
                0,
                now - AO!
            );


        const minute =
            Math.floor(
                seconds / 60
            );


        const sec =
            seconds % 60;


        return {

            minute,

            display:
                `${minute}:${String(
                    sec
                ).padStart(
                    2,
                    "0"
                )}`,

            period:
                "1H",

            source:
                "AO_1H",

            debug: {

                AC,
                AD,
                AO,
                BC,
                BD,

                now_unix:
                    now,

                now_minus_AO:
                    now - AO!

            }

        };

    }


    // ========================================================
    // FALLBACK
    // ========================================================

    if (
        valid(BC)
    ) {

        return {

            minute:
                BC!,

            display:
                String(
                    BC
                ),

            period:
                "2H",

            source:
                "BC_FALLBACK",

            debug: {

                AC,
                AD,
                AO,
                BC,
                BD,

                now_unix:
                    now

            }

        };

    }


    return {

        minute:
            0,

        display:
            "0",

        period:
            "UNKNOWN",

        source:
            "NONE",

        debug: {

            AC,
            AD,
            AO,
            BC,
            BD,

            now_unix:
                now

        }

    };

}


// ============================================================
// LEAGUE
// ============================================================
//
// V3 няма надеждно league поле в основния event raw.
// Не измисляме стойност.
// Следващата стъпка е да вземем league от V27
// по същия начин, по който V27 го показва.
// ============================================================

function getLeague(
    r: Record<string, string>
) {

    return {

        name:
            r.ZA ||
            r.ZB ||
            r.ZC ||
            null,

        country:
            r.ZJ ||
            r.ZK ||
            null

    };

}


// ============================================================
// FETCH ENDPOINT
// ============================================================

async function fetchEndpoint(
    url: string,
    requestHeaders: Record<string, string>
) {

    try {

        const res =
            await fetch(
                url +
                "?_=" +
                Date.now(),
                {
                    headers:
                        requestHeaders,
                    cache:
                        "no-store"
                }
            );


        const text =
            await res.text();


        return {

            status:
                res.status,

            text

        };

    } catch {

        return {

            status:
                0,

            text:
                ""

        };

    }

}


// ============================================================
// HELPERS
// ============================================================

function parseStatValue(
    value: string
) {

    if (
        !value
    )
        return null;


    const clean =
        value
            .replace(
                "%",
                ""
            )
            .replace(
                ",",
                "."
            );


    const n =
        parseFloat(
            clean
        );


    return Number.isFinite(n)
        ? n
        : null;

}


function toNumber(
    value: unknown
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    )
        return null;


    const n =
        Number(
            value
        );


    return Number.isFinite(n)
        ? n
        : null;

}


function valid(
    value: unknown
): value is number {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );

}


function round(
    value: number,
    decimals = 2
) {

    const factor =
        Math.pow(
            10,
            decimals
        );


    return Math.round(
        value * factor
    ) / factor;

}


// ============================================================
// JSON
// ============================================================

function json(
    data: unknown,
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

                ...corsHeaders,

                "Content-Type":
                    "application/json; charset=utf-8",

                "Cache-Control":
                    "no-store, no-cache, must-revalidate",

                "Pragma":
                    "no-cache"

            }

        }

    );

              }
