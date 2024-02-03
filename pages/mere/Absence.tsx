import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import NavigationBar from "../../components/Navbar";
import { useCallback, useEffect, useState } from "react";
import { getAbsence } from "../../modules/api/scraper/Scraper";
import { getSecure, getUnsecure } from "../../modules/api/Authentication";
import COLORS from "../../modules/Themes";
import { AbsenceType, Fag, ModuleAbsence } from "../../modules/api/scraper/AbsenceScraper";
import RateLimit from "../../components/RateLimit";
import { VictoryChart, VictoryContainer, VictoryLabel, VictoryPie, VictoryTheme } from "victory-native";

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

const pieColors = ["#fc5353", "#fc8653", "#fcca53", "#57cf4c", "#00c972", "#78d6ff", "#009ac9", "#9578ff", "#ff78fd"]

export default function Absence({ navigation }: { navigation: any }) {
    const [ almindeligt, setAlmindeligt ] = useState<ModuleAbsence[]>();
    const [ skriftligt, setSkriftligt ] = useState<ModuleAbsence[]>();

    const [ chartedAbsence, setChartedAbsence ] = useState<ChartedAbsence>();
    const [ loading, setLoading ] = useState(true);
    const [ rateLimited, setRateLimited ] = useState(false);

    const [ refreshing, setRefreshing ] = useState(false);

    const [ endAngle, setEndAngle ] = useState<number>(0);

    /**
     * Fetches the absence on page load
     */
    useEffect(() => {
        setLoading(true);
        
        (async () => {
            const gymNummer = (await getSecure("gym")).gymNummer;

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

            getAbsence(gymNummer, true).then(({ payload, rateLimited }): any => {
                setRateLimited(rateLimited)
                if(payload == null) {
                    return;
                }

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
                setLoading(false);

                setEndAngle(360);
            })
        })();
    }, []);

    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const gymNummer = (await getSecure("gym")).gymNummer;

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

            getAbsence(gymNummer).then(({ payload, rateLimited }): any => {
                setRateLimited(rateLimited)
                if(payload == null) {
                    return;
                }

                const almindeligt = [...payload.map(load => load.almindeligt).filter((modul) => modul.absent > 0)]

                const skriftligt = [...payload.map(load => load.skriftligt)].filter((modul) => modul.absent > 0)

                setAlmindeligt(almindeligt);
                setSkriftligt(skriftligt);

                payload.forEach((fag: Fag) => {
                    if(fag.almindeligt.absent > 0) {
                        out.almindeligt.absent += fag.almindeligt.absent;
                        out.almindeligt.teams.push(fag.almindeligt.team);
                    }
                    out.almindeligt.settled += fag.almindeligt.settled;
                    out.almindeligt.yearly += fag.almindeligt.yearly;
                })

                setChartedAbsence(out);
                setRefreshing(false);
            })
        })();
    }, [refreshing]);

    const radius = 110;

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    return (
    <View style={{height: '100%', width:'100%'}}>
        {loading ?
            <View style={{
                position: "absolute",

                top: "20%",
                left: "50%",

                transform: [{
                    translateX: -12.5,
                }]
            }}>
                <ActivityIndicator size={"small"} color={COLORS.ACCENT} />
            </View>
            :
            <ScrollView refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                <View style={{
                    display: 'flex',

                    marginTop: 20,
                    marginHorizontal: 20,
                    gap: 25,

                    paddingBottom: 150,
                    paddingTop: 25,
                }}>
                    <View style={{
                        display: 'flex',
                    }}>
                        <View style={{
                            display: "flex",
                            gap: 5,
                        }}>
                            <Text style={{
                                color: COLORS.WHITE,
                                fontSize: 20,
                                fontWeight: "bold",
                            }}>
                                Almindeligt fravær
                            </Text>

                            <View style={{
                                width: "100%",
                                
                                borderBottomColor: COLORS.WHITE,
                                borderBottomWidth: 1,
                            }} />

                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                gap: 50,
                                flexDirection: "row",

                                marginVertical: 10,
                            }}>
                                <View style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                    }}>
                                        Opgjort
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 35,
                                    }}>
                                        {(chartedAbsence?.almindeligt.absent != undefined && chartedAbsence?.almindeligt.settled > 0) ?
                                            ((chartedAbsence?.almindeligt.absent / chartedAbsence?.almindeligt.settled)*100).toFixed(2).toString().replace(".", ",")
                                            :
                                            "0,00"
                                            }%
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        opacity: 0.8,
                                    }}>
                                        {chartedAbsence?.almindeligt.absent.toString().replace(".", ",")} / {chartedAbsence?.almindeligt.settled.toString().replace(".", ",")}
                                    </Text>
                                </View>

                                <View style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                    }}>
                                        For året
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 35,
                                    }}>
                                        {(chartedAbsence?.almindeligt.absent != undefined && chartedAbsence?.almindeligt.yearly > 0) ?
                                            ((chartedAbsence?.almindeligt.absent / chartedAbsence?.almindeligt.yearly)*100).toFixed(2).toString().replace(".", ",")
                                            :
                                            "0,00"
                                            }%
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        opacity: 0.8,
                                    }}>
                                        {chartedAbsence?.almindeligt.absent.toString().replace(".", ",")} / {chartedAbsence?.almindeligt.yearly.toString().replace(".", ",")}
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                width: "100%",
                                
                                borderBottomColor: COLORS.WHITE,
                                borderBottomWidth: 1,
                            }} />

                        </View>

                
                        <View style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',

                            gap: 20,
                        }}>
                            <VictoryPie
                                animate={{
                                    easing: "backInOut",
                                    onLoad: {
                                        duration: 1750,
                                    },
                                }}

                                data={almindeligt}
                                x="team"
                                y="absent"
                                labels={({ datum }) => {
                                    return ((datum.absent / (chartedAbsence?.almindeligt.absent ?? 1))*100).toFixed(1).replace(".", ",") + "%"
                                }}
                                colorScale={pieColors}
                                labelPlacement={"parallel"}

                                innerRadius={radius / 2}
                                labelRadius={radius / 1.5}

                                padAngle={0.5}
                                endAngle={endAngle}

                                width={radius * 2}
                                height={radius * 2}
                                radius={radius}

                                style={{
                                    labels: {
                                        fill: "white",
                                        fontSize: 11,
                                        fontFamily: "Avenir-Light"
                                    }
                                }}
                            />

                            <View style={{
                                display: 'flex',
                                flexDirection: 'column',
                                paddingVertical: 20,
                            }}>
                                {chartedAbsence?.almindeligt.teams.map((team: string, index: number) => {
                                    return (
                                        <View style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            marginVertical: 2,

                                            alignItems: 'center',
                                        }} key={index}>
                                            <View style={{
                                                width: 10,
                                                height: 10,
                                                backgroundColor: pieColors[index % pieColors.length],
                                            }} />
                                            <Text ellipsizeMode="tail" numberOfLines={1} style={{
                                                color: COLORS.WHITE,
                                                maxWidth: 100,

                                                fontSize: 12,
                                                lineHeight: 13,
                                            }}>
                                                {" "}{team}
                                            </Text>
                                        </View>
                                    )
                                })}
                            </View>
                        </View>
                        
                    </View>

                    <View style={{
                        display: 'flex',
                        gap: 20,
                    }}>
                        <View style={{
                            display: "flex",
                            gap: 5,
                        }}>
                            <Text style={{
                                color: COLORS.WHITE,
                                fontSize: 20,
                                fontWeight: "bold",
                            }}>
                                Skriftligt fravær
                            </Text>

                            <View style={{
                                width: "100%",
                                
                                borderBottomColor: COLORS.WHITE,
                                borderBottomWidth: 1,
                            }} />

                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                gap: 50,
                                flexDirection: "row",

                                marginVertical: 10,
                            }}>
                                <View style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                    }}>
                                        Opgjort
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 35,
                                    }}>
                                        {(chartedAbsence?.skriftligt.absent != undefined && chartedAbsence?.skriftligt.yearly > 0) ?
                                            ((chartedAbsence?.skriftligt.absent / chartedAbsence?.skriftligt.yearly)*100).toFixed(2).toString().replace(".", ",")
                                            :
                                            "0,00"
                                            }%
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        opacity: 0.8,
                                    }}>
                                        {chartedAbsence?.skriftligt.absent.toString().replace(".", ",")} / {chartedAbsence?.skriftligt.yearly.toString().replace(".", ",")}
                                    </Text>
                                </View>

                                <View style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                    }}>
                                        For året
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 35,
                                    }}>
                                        {(chartedAbsence?.skriftligt.absent != undefined && chartedAbsence?.skriftligt.yearly > 0) ?
                                            (((chartedAbsence?.skriftligt.absent / chartedAbsence?.skriftligt.yearly)*100).toFixed(2).toString().replace(".", ","))
                                            :
                                            "0,00"
                                        }%
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        opacity: 0.8,
                                    }}>
                                        {chartedAbsence?.skriftligt.absent.toString().replace(".", ",")} / {chartedAbsence?.skriftligt.yearly.toString().replace(".", ",")}
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                width: "100%",
                                
                                borderBottomColor: COLORS.WHITE,
                                borderBottomWidth: 1,
                            }} />

                        </View>

                        
                        <View style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',

                            gap: 20,
                        }}>
                            <VictoryPie
                                animate={{
                                    easing: "backInOut",
                                    onLoad: {
                                        duration: 1750,
                                    },
                                }}

                                data={skriftligt}
                                x="team"
                                y="absent"
                                labels={({ datum }) => {
                                    return ((datum.absent / (chartedAbsence?.skriftligt.absent ?? 1))*100).toFixed(1).replace(".", ",") + "%"
                                }}
                                colorScale={pieColors}
                                labelPlacement={"parallel"}

                                innerRadius={radius / 2}
                                labelRadius={radius / 1.5}

                                padAngle={0.5}
                                padding={{
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    top: 0,
                                }}

                                endAngle={endAngle}

                                width={radius * 2}
                                height={radius * 2}
                                radius={radius}

                                style={{
                                    labels: {
                                        fill: "white",
                                        fontSize: 11,
                                        fontFamily: "Avenir-Light"
                                    }
                                }}
                            />
                            
                            <View style={{
                                display: 'flex',
                                flexDirection: 'column',
                                paddingVertical: 20,
                            }}>
                                {chartedAbsence?.skriftligt.teams.map((team: string, index: number) => (
                                    <View key={index}>
                                        <View style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            marginVertical: 2,
                                            gap: 5,

                                            alignItems: 'center',
                                        }}>
                                            <View style={{
                                                width: 10,
                                                height: 10,
                                                backgroundColor: pieColors[index % pieColors.length],
                                            }} />
                                            <Text ellipsizeMode="tail" numberOfLines={1} style={{
                                                color: pieColors[index % pieColors.length],
                                                maxWidth: 100,
                                                
                                            }}>
                                                {team}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                        
                    </View>
                </View>
            </ScrollView>
        }

        {rateLimited && <RateLimit />}
    </View>
    )
}