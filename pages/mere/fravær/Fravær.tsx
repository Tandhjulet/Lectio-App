import { useCallback, useEffect, useState } from "react";
import { Fag, ModuleAbsence } from "../../../modules/api/scraper/AbsenceScraper";
import { getAbsence } from "../../../modules/api/scraper/Scraper";
import { secureGet } from "../../../modules/api/helpers/Storage";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { hexToRgb, themes } from "../../../modules/Themes";
import RateLimit from "../../../components/RateLimit";

type ChartedAbsence = {
    almindeligt: {
        yearly: number,
        settled: number,
        absent: number,

        teams: string[],
    },
    skriftligt: {
        yearly: number,
        settled: number,
        absent: number,

        teams: string[],
    },
}

const pieColors = ["#57cf4c", "#00c972", "#78d6ff", "#009ac9", "#9578ff", "#ff78fd", "#fc5353", "#fc8653", "#fcca53"];

export default function Fravær() {
    const [ almindeligt, setAlmindeligt ] = useState<ModuleAbsence[]>();
    const [ skriftligt, setSkriftligt ] = useState<ModuleAbsence[]>();

    const [ chartedAbsence, setChartedAbsence ] = useState<ChartedAbsence>();
    const [ loading, setLoading ] = useState(true);
    const [ rateLimited, setRateLimited ] = useState(false);

    const [ refreshing, setRefreshing ] = useState(false);

    const handleAbsenceData = useCallback((payload: Fag[], out: ChartedAbsence) => {
        const almindeligt = [...payload.map(load => load.almindeligt).filter((modul) => modul.absent > 0)].sort((a,b) => {
            return b.absent - a.absent;
        });

        const skriftligt = [...payload.map(load => load.skriftligt)].filter((modul) => modul.absent > 0).sort((a,b) => {
            return b.absent - a.absent;
        });

        almindeligt.forEach((fag: ModuleAbsence) => {
            out.almindeligt.absent += fag.absent;
            out.almindeligt.teams.push(fag.team); 
        })

        skriftligt.forEach((fag: ModuleAbsence) => {
            out.skriftligt.absent += fag.absent;
            out.skriftligt.teams.push(fag.team);
        })

        payload.forEach((fag: Fag) => {
            out.almindeligt.settled += fag.almindeligt.settled;
            out.almindeligt.yearly += fag.almindeligt.yearly;

            out.skriftligt.settled += fag.skriftligt.settled;
            out.skriftligt.yearly += fag.skriftligt.yearly;
        })

        setAlmindeligt(almindeligt);
        setSkriftligt(skriftligt);
        setChartedAbsence(out);
    }, [])

    useEffect(() => {
        setLoading(true);
        
        (async (): Promise<string> => {
            const gymNummer = (await secureGet("gym")).gymNummer;

            getAbsence(gymNummer, false, (payload) => {
                const out: ChartedAbsence = {
                    almindeligt: {
                        yearly: 0,
                        settled: 0,
                        absent: 0,
                        teams: []
                    },
                    skriftligt: {
                        yearly: 0,
                        settled: 0,
                        absent: 0,
                        teams: []
                    }
                }

                setRateLimited(payload == undefined)
                if(!payload) {
                    
                    setLoading(false);
                    return;
                }
                handleAbsenceData(payload, out);
                setLoading(false);
            })

            return gymNummer;
        })()
    }, []);

    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const gymNummer: string = (await secureGet("gym")).gymNummer;

            getAbsence(gymNummer, true, (payload) => {
                const out: ChartedAbsence = {
                    almindeligt: {
                        yearly: 0,
                        settled: 0,
                        absent: 0,
                        teams: []
                    },
                    skriftligt: {
                        yearly: 0,
                        settled: 0,
                        absent: 0,
                        teams: []
                    }
                }

                setRateLimited(payload == undefined)
                if(!payload) {
                    setLoading(false);
                    return;
                }

                handleAbsenceData(payload, out);
                setRefreshing(false);
            })
        })();
    }, [refreshing]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const treatNumber = useCallback((num: number | undefined, dec?: number) => {
        if(num === undefined)
            return 0;

        return num.toLocaleString("da-DK", {
            style: "decimal",
            maximumFractionDigits: dec ?? 2,
        })
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"]

    return (
        <View style={{
            height: "100%",
            width: "100%",
        }}>
            {loading ?
                <View style={{
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                }}>
                    <ActivityIndicator size={"small"} color={theme.ACCENT} />
                </View>
                :
                <ScrollView refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }>
                    <View style={{
                        display: 'flex',

                        marginHorizontal: 20,
                        gap: 25,
                        paddingTop: 15,
                    }}>
                        <View style={{
                            flexDirection: "column",
                        }}>
                            <View style={{
                                borderBottomColor: hexToRgb(theme.WHITE.toString(), 0.3),
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                marginBottom: 12.5,
                                paddingBottom: 5,
                            }}>
                                <Text style={{
                                    fontSize: 12.5,
                                    letterSpacing: 0.7,
                                    fontWeight: "900",

                                    color: hexToRgb(theme.WHITE.toString(), 0.7),
                                }}>
                                    Normalt fravær
                                </Text>
                            </View>

                            {chartedAbsence?.almindeligt?.absent && chartedAbsence?.almindeligt?.absent > 0 ? (
                                <View style={{
                                    flexDirection: "column"
                                }}>
                                    <View style={{
                                        flexDirection: "row",
                                    }}>
                                        <View style={{
                                            borderRadius: 10,
                                            width: "60%",
                                            overflow: "hidden",

                                            height: 300,

                                            gap: 2,
                                        }}>
                                            {almindeligt?.map((a, i) => {
                                                const totalHeight = (a.absent / chartedAbsence.almindeligt.absent);

                                                return (
                                                    <View style={{
                                                        flexGrow: a.absent,
                                                        width: "100%",
                                                        backgroundColor: pieColors[i % pieColors.length],

                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }} key={i}>
                                                        {totalHeight*300 > 7.5 ? (
                                                            <Text style={{
                                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                                position: "absolute"
                                                            }}>
                                                                {(totalHeight * 100).toFixed(0)}%
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                )
                                            })}
                                        </View>

                                        <View style={{
                                            flexDirection: "column",
                                            width: "50%",

                                            marginLeft: 20,
                                        }}>
                                            {almindeligt?.map((a, i) => {
                                                return (
                                                    <View style={{
                                                        width: "100%",
                                                        alignItems: "center",

                                                        flexDirection: "row",
                                                    }} key={i}>
                                                        <View style={{
                                                            width: 12.5,
                                                            height: 12.5,
                                                            borderRadius: 2.5,
                                                            backgroundColor: pieColors[i % pieColors.length],
                                                        }} />

                                                        <Text style={{
                                                            color: theme.WHITE,
                                                            maxWidth: "70%",
                                                        }} numberOfLines={1} ellipsizeMode="tail">
                                                            {" "}{a.team}
                                                        </Text>
                                                    </View>
                                                )
                                            })}
                                        </View>
                                    </View>

                                    <View style={{
                                        marginTop: 15,
                                        marginRight: 5,

                                        width: "60%",
                                        flexDirection: "row",
                                        justifyContent: "space-evenly",
                                    }}>
                                        <View style={{
                                            alignItems: "center",
                                        }}>
                                            <Text style={{
                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                fontWeight: "600",
                                            }}>
                                                For nu
                                            </Text>

                                            <Text style={{
                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                fontWeight: "900",

                                                fontSize: 15,
                                                marginBottom: 4,
                                            }}>
                                                {treatNumber((chartedAbsence.almindeligt.absent/chartedAbsence.almindeligt.settled)*100, 1)}%
                                            </Text>

                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {treatNumber(chartedAbsence.almindeligt.absent)}/{treatNumber(chartedAbsence.almindeligt.settled)}
                                            </Text>
                                        </View>

                                        <View style={{
                                            backgroundColor: theme.WHITE,

                                            height: "100%",
                                            width: StyleSheet.hairlineWidth,
                                        }} />

                                        <View style={{
                                            alignItems: "center",
                                        }}>
                                            <Text style={{
                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                fontWeight: "600",
                                            }}>
                                                For året
                                            </Text>

                                            <Text style={{
                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                fontWeight: "900",

                                                fontSize: 15,
                                                marginBottom: 4,
                                            }}>
                                                {treatNumber((chartedAbsence.almindeligt.absent/chartedAbsence.almindeligt.yearly)*100, 1)}%
                                            </Text>

                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {treatNumber(chartedAbsence.almindeligt.absent)}/{treatNumber(chartedAbsence.almindeligt.yearly)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ) : <View style={{
                                marginBottom: 200,
                            }} />}
                        </View>

                        <View style={{
                            flexDirection: "column",
                        }}>
                            <View style={{
                                borderBottomColor: hexToRgb(theme.WHITE.toString(), 0.3),
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                marginBottom: 12.5,
                                paddingBottom: 5,
                            }}>
                                <Text style={{
                                    fontSize: 12.5,
                                    letterSpacing: 0.7,
                                    fontWeight: "900",

                                    color: hexToRgb(theme.WHITE.toString(), 0.7),
                                }}>
                                    Skriftligt fravær
                                </Text>
                            </View>

                            {chartedAbsence?.skriftligt?.absent && chartedAbsence?.skriftligt?.absent > 0 ? (
                                <View style={{
                                    flexDirection: "column"
                                }}>
                                    <View style={{
                                        flexDirection: "row",
                                    }}>
                                        <View style={{
                                            borderRadius: 10,
                                            width: "60%",
                                            overflow: "hidden",

                                            height: 300,

                                            gap: 2,
                                        }}>
                                            {skriftligt?.map((a, i) => {
                                                const totalHeight = (a.absent / chartedAbsence.skriftligt.absent);

                                                return (
                                                    <View style={{
                                                        flexGrow: a.absent,
                                                        width: "100%",
                                                        backgroundColor: pieColors[i % pieColors.length],

                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }} key={i}>
                                                        {totalHeight*300 > 7.5 ? (
                                                            <Text style={{
                                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                                position: "absolute"
                                                            }}>
                                                                {(totalHeight * 100).toFixed(0)}%
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                )
                                            })}
                                        </View>

                                        <View style={{
                                            flexDirection: "column",
                                            width: "50%",

                                            marginLeft: 20,
                                        }}>
                                            {skriftligt?.map((a, i) => {
                                                return (
                                                    <View style={{
                                                        width: "100%",
                                                        alignItems: "center",

                                                        flexDirection: "row",
                                                    }} key={i}>
                                                        <View style={{
                                                            width: 12.5,
                                                            height: 12.5,
                                                            borderRadius: 2.5,
                                                            backgroundColor: pieColors[i % pieColors.length],
                                                        }} />

                                                        <Text style={{
                                                            color: theme.WHITE,
                                                            maxWidth: "70%",
                                                        }} numberOfLines={1} ellipsizeMode="tail">
                                                            {" "}{a.team}
                                                        </Text>
                                                    </View>
                                                )
                                            })}
                                        </View>
                                    </View>

                                    <View style={{
                                        marginTop: 15,
                                        marginRight: 5,

                                        width: "60%",
                                        flexDirection: "row",
                                        justifyContent: "space-evenly",
                                    }}>
                                        <View style={{
                                            alignItems: "center",
                                        }}>
                                            <Text style={{
                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                fontWeight: "600",
                                            }}>
                                                For nu
                                            </Text>

                                            <Text style={{
                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                fontWeight: "900",

                                                fontSize: 15,
                                                marginBottom: 4,
                                            }}>
                                                {treatNumber((chartedAbsence.skriftligt.absent/chartedAbsence.skriftligt.settled)*100, 1)}%
                                            </Text>

                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {treatNumber(chartedAbsence.skriftligt.absent)}/{treatNumber(chartedAbsence.skriftligt.settled)}
                                            </Text>
                                        </View>

                                        <View style={{
                                            backgroundColor: theme.WHITE,

                                            height: "100%",
                                            width: StyleSheet.hairlineWidth,
                                        }} />

                                        <View style={{
                                            alignItems: "center",
                                        }}>
                                            <Text style={{
                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                fontWeight: "600",
                                            }}>
                                                For året
                                            </Text>

                                            <Text style={{
                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                fontWeight: "900",

                                                fontSize: 15,
                                                marginBottom: 4,
                                            }}>
                                                {treatNumber((chartedAbsence.skriftligt.absent/chartedAbsence.skriftligt.yearly)*100, 1)}%
                                            </Text>

                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {treatNumber(chartedAbsence.skriftligt.absent)}/{treatNumber(chartedAbsence.skriftligt.yearly)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ) : null}
                        </View>
                    </View>  
                    

                    <View style={{
                        height: 89 / 2,
                        width: "100%",
                    }} />
                </ScrollView>
            }

            {rateLimited ? <RateLimit /> : null}
        </View>
    );
}