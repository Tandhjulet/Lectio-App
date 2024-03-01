import { ActivityIndicator, Animated, Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import NavigationBar from "../../components/Navbar";
import { ReactElement, RefObject, createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAbsence, getAbsenceRegistration } from "../../modules/api/scraper/Scraper";
import { secureGet, getUnsecure } from "../../modules/api/Authentication";
import { hexToRgb, themes } from "../../modules/Themes";
import { AbsenceReason, AbsenceRegistration, AbsenceType, Fag, ModuleAbsence, Registration, postRegistration } from "../../modules/api/scraper/AbsenceScraper";
import RateLimit from "../../components/RateLimit";
import { VictoryChart, VictoryContainer, VictoryLabel, VictoryPie, VictoryTheme } from "victory-native";
import PagerView, { PagerViewOnPageScrollEventData } from "react-native-pager-view";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { PieChart } from "react-native-gifted-charts";
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView, TextInput } from "react-native-gesture-handler";
import { parseDate } from "../../modules/api/scraper/OpgaveScraper";
import { BellIcon, CalendarDaysIcon, ClockIcon, EyeDropperIcon, LockClosedIcon, PaperAirplaneIcon, PaperClipIcon } from "react-native-heroicons/solid";
import { NumberProp, SvgProps } from "react-native-svg";

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

const pieColors = ["#fc5353", "#fc8653", "#fcca53", "#57cf4c", "#00c972", "#78d6ff", "#009ac9", "#9578ff", "#ff78fd"];

const fraværColors = ["#fc5353", "#9578ff", "#fcca53", "#00c972", "#78d6ff", "#ff78fd"];
const fraværIndexes = ["ikke angivet", "andet", "kom for sent", "skolerelaterede aktiviteter", "private forhold", "sygdom"];

const { width, height } = Dimensions.get('window');

const PaginationIndicator = ({
    scrollOffset,
    position,
    pagerRef,
}: {
    scrollOffset: Animated.Value,
    position: Animated.Value,
    pagerRef: RefObject<PagerView>,
}) => {
    const inputRange = [0, 2];
    const translateX = Animated.add(
        scrollOffset,
        position,
    ).interpolate({
        inputRange,
        outputRange: [0, width],
    })

    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

    return (
        <View style={{
            width: "100%",

            display: "flex",
            flexDirection: "column",
            marginBottom: 2.5,

            backgroundColor: hexToRgb(theme.ACCENT_BLACK.toString(), 0.8,),
        }}>
            <View style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",

                marginTop: 15,
                marginBottom: 7.5,
            }}>
                <Pressable style={{
                    width: "50%",

                    display: "flex",
                    alignItems: "center",
                }} hitSlop={20} onPress={() => pagerRef.current?.setPage(0)}>
                    <Text style={{
                        color: theme.WHITE,
                        fontSize: 15,
                        fontWeight: "bold",
                    }}>
                        Fraværsoversigt
                    </Text>
                </Pressable>

                <Pressable style={{
                    width: "50%",

                    display: "flex",
                    alignItems: "center",
                }} hitSlop={20} onPress={() => pagerRef.current?.setPage(1)}>
                    <Text style={{
                        color: theme.WHITE,
                        fontSize: 15,
                        fontWeight: "bold",
                    }}>
                        Registreringer
                    </Text>
                </Pressable>
            </View>

            <Animated.View
                style={{
                    width: "50%",
                    height: 5,

                    backgroundColor: hexToRgb(theme.DARK.toString(), 1),

                    transform: [{ translateX: translateX }],
                }}
            />
        </View>
    )
}

interface Props extends SvgProps {
    size?: NumberProp;
}

const RegistrationComponent = ({
    title,
    color,
    Icon,
    setAbsenceReason,
}: {
    title: string,
    color: string,
    Icon: ReactElement<Props, any>,
    setAbsenceReason: React.Dispatch<React.SetStateAction<AbsenceReason | ((absenceReason: AbsenceReason) => string) | null>>,
}) => (
        <Pressable style={{
            width: "40%",
            height: "25%",

            marginVertical: 5,

            backgroundColor: hexToRgb(color, 0.3),
            
            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            flexDirection: "column",

            borderRadius: 5,

            gap: 5,
        }} onPress={() => {
            const str = (title || "andet").toUpperCase().replaceAll(" ", "_");

            const reason = AbsenceReason[str as keyof typeof AbsenceReason];
            setAbsenceReason(reason);
        }}>
            {Icon}

            <Text style={{
                fontWeight: "600",
                fontSize: 15,
                letterSpacing: 0.4,

                color: color,
            }}>
                {title}
            </Text>
        </Pressable>
    )


const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

export default function Absence({ navigation }: { navigation: any }) {

    //const gymNummer = useRef((await secureGet("gym")).gymNummer).current;

    const [ almindeligt, setAlmindeligt ] = useState<ModuleAbsence[]>();
    const [ skriftligt, setSkriftligt ] = useState<ModuleAbsence[]>();

    const [ chartedAbsence, setChartedAbsence ] = useState<ChartedAbsence>();
    const [ loading, setLoading ] = useState(true);
    const [ rateLimited, setRateLimited ] = useState(false);

    const [ refreshing, setRefreshing ] = useState(false);
    const [ registrationRefreshing, setRegistrationRefreshing ] = useState(false);

    const [ remappedRegs, setRemappedRegs ] = useState<{[id: string]: Registration[]}>();

    const [ absenceReason, setAbsenceReason] = useState<AbsenceReason | ((absenceReason: AbsenceReason) => string) | null>(null);

    const [ sendLoading, setSendLoading ] = useState<boolean>(false);

    /**
     * Fetches the absence on page load
     */
    useEffect(() => {
        setLoading(true);
        
        (async (): Promise<string> => {
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
            
            const gymNummer = (await secureGet("gym")).gymNummer;

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
            })

            return gymNummer;
        })().then(async (gymNummer: string) => { // render registrations after absence
            
            getAbsenceRegistration(gymNummer).then((res: Registration[]) => {

                res.sort((a, b) => (b.registered.valueOf() + b.modulStartTime.valueOf()) - (a.registered.valueOf() + a.modulStartTime.valueOf()));

                const out: {[id: string]: Registration[]} = {};
                res.forEach((reg) => {
                    const str = reg.registered.toLocaleDateString("da-DK").replace(".", "/").replace(".", "-")

                    if(!(str in out)) 
                        out[str] = []

                    out[str].push(reg);
                })

                setRemappedRegs(out);
            })

        });
        
    }, []);

    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const gymNummer: string = (await secureGet("gym")).gymNummer;

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
                setRefreshing(false);
            })
        })();
    }, [refreshing]);

    const radius = 110;

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const scrollOffsetAnimatedValue = useRef(new Animated.Value(0)).current;
    const positionAnimatedValue = useRef(new Animated.Value(0)).current;

    const [registration, setRegistration] = useState<Registration>();
    
    const pagerRef = createRef<PagerView>();

    const [commentField, setCommentField] = useState<string>();


    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const bottomSheetAbsenceRegistrationRef = useRef<BottomSheetModal>(null);

    useEffect(() => {
        if(absenceReason == null) return;
        
        bottomSheetAbsenceRegistrationRef.current?.dismiss();
        bottomSheetModalRef.current?.present();
    }, [absenceReason])

    const onRegistrationRefresh = useCallback(() => {
        setRegistrationRefreshing(true);
    }, []);

    useEffect(() => {
        if(!registrationRefreshing) return;

        (async () => {
            const gymNummer = (await secureGet("gym")).gymNummer;
            getAbsenceRegistration(gymNummer).then((res: Registration[]) => {

                res.sort((a, b) => (b.registered.valueOf() + b.modulStartTime.valueOf()) - (a.registered.valueOf() + a.modulStartTime.valueOf()));
                
                const out: {[id: string]: Registration[]} = {};
                res.forEach((reg) => {
                    const str = reg.registered.toLocaleDateString("da-DK").replace(".", "/").replace(".", "-")

                    if(!(str in out)) 
                        out[str] = []

                    out[str].push(reg);
                })

                setRemappedRegs(out);

                setSendLoading(false);
                bottomSheetModalRef.current?.dismiss();

                setRegistrationRefreshing(false);
            })
        })();
    }, [registrationRefreshing])

    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

    return (
        <GestureHandlerRootView>
            <BottomSheetModalProvider>
                <View style={{
                    height: '100%',
                    width:'100%'
                }}>
                    <PaginationIndicator scrollOffset={scrollOffsetAnimatedValue} position={positionAnimatedValue} pagerRef={pagerRef} />

                    <AnimatedPagerView
                        initialPage={0}
                        onPageScroll={Animated.event<PagerViewOnPageScrollEventData>(
                            [
                                {
                                    nativeEvent: {
                                        offset: scrollOffsetAnimatedValue,
                                        position: positionAnimatedValue,
                                    }
                                }
                            ],
                            {
                                useNativeDriver: true,
                            }
                        )}

                        orientation={"horizontal"}
                        overdrag

                        style={{
                            width: "100%",
                            height: "100%",
                        }}

                        ref={pagerRef}
                    >
                        <View key="0">
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
                                                    color: theme.WHITE,
                                                    fontSize: 20,
                                                    fontWeight: "bold",
                                                }}>
                                                    Almindeligt fravær
                                                </Text>

                                                <View style={{
                                                    width: "100%",
                                                    
                                                    borderBottomColor: theme.WHITE,
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
                                                            color: theme.WHITE,
                                                        }}>
                                                            Opgjort
                                                        </Text>

                                                        <Text style={{
                                                            color: theme.WHITE,
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
                                                            color: theme.WHITE,
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
                                                            color: theme.WHITE,
                                                        }}>
                                                            For året
                                                        </Text>

                                                        <Text style={{
                                                            color: theme.WHITE,
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
                                                            color: theme.WHITE,
                                                            opacity: 0.8,
                                                        }}>
                                                            {chartedAbsence?.almindeligt.absent.toString().replace(".", ",")} / {chartedAbsence?.almindeligt.yearly.toString().replace(".", ",")}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={{
                                                    width: "100%",
                                                    
                                                    borderBottomColor: theme.WHITE,
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
                                                                    color: theme.WHITE,
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
                                                    color: theme.WHITE,
                                                    fontSize: 20,
                                                    fontWeight: "bold",
                                                }}>
                                                    Skriftligt fravær
                                                </Text>

                                                <View style={{
                                                    width: "100%",
                                                    
                                                    borderBottomColor: theme.WHITE,
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
                                                            color: theme.WHITE,
                                                        }}>
                                                            Opgjort
                                                        </Text>

                                                        <Text style={{
                                                            color: theme.WHITE,
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
                                                            color: theme.WHITE,
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
                                                            color: theme.WHITE,
                                                        }}>
                                                            For året
                                                        </Text>

                                                        <Text style={{
                                                            color: theme.WHITE,
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
                                                            color: theme.WHITE,
                                                            opacity: 0.8,
                                                        }}>
                                                            {chartedAbsence?.skriftligt.absent.toString().replace(".", ",")} / {chartedAbsence?.skriftligt.yearly.toString().replace(".", ",")}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={{
                                                    width: "100%",
                                                    
                                                    borderBottomColor: theme.WHITE,
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
                                                                    {" "}{team}
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
                        </View>
                        
                        <View key="1">
                            <ScrollView refreshControl={
                                    <RefreshControl refreshing={registrationRefreshing} onRefresh={onRegistrationRefresh} />
                                }>
                                <View style={{
                                    display: 'flex',

                                    marginTop: 20,
                                    marginHorizontal: 20,

                                    paddingBottom: 150,
                                    paddingTop: 25,

                                    flexDirection: "column"
                                }}>
                                    {remappedRegs != null && Object.keys(remappedRegs).map((key: string, i: number) => {
                                        return (
                                            <View key={key} style={{
                                                marginTop: i == 0 ? 0 : 25,
                                            }}>
                                                <View style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    flexDirection: "row",
                                                }}>
                                                    <Text style={{
                                                        color: hexToRgb(theme.ACCENT.toString(), 0.5),
                                                        fontWeight: "normal",
                                                        fontSize: 15,
                                                        marginBottom: 5,
                                                    }}>
                                                        {["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"][parseDate(key).getDay()]} d. {key}
                                                    </Text>

                                                    <Text style={{
                                                        color: hexToRgb(theme.WHITE.toString(), 0.4),
                                                        fontWeight: "normal",
                                                        fontSize: 15,
                                                        marginBottom: 5,
                                                    }}>
                                                        {remappedRegs[key].length} {remappedRegs[key].length == 1 ? "modul" : "moduler"}
                                                    </Text>
                                                </View>
                                                {remappedRegs[key].map((reg: Registration, i: number) => {
                                                    const colorIndex = fraværIndexes.findIndex((v) => v == (!reg.studentProvidedReason ? "Ikke angivet" : reg.studentNote?.split("\n")[0])?.toLowerCase())
                                                    const color = fraværColors[colorIndex];

                                                    return (
                                                        <Pressable style={{
                                                            paddingVertical: 10,
                                                            paddingLeft: 0,

                                                            borderBottomColor: hexToRgb(theme.WHITE.toString(), 0.2),
                                                            borderBottomWidth: i+1 == remappedRegs[key].length ? StyleSheet.hairlineWidth : 0,

                                                            display: "flex",
                                                            flexDirection: "row",
                                                            alignItems: "center",

                                                            width: "100%",
                                                            gap: 15,
                                                        }} key={i} onPress={() => {
                                                            bottomSheetAbsenceRegistrationRef.current?.dismiss();

                                                            setRegistration(reg);
                                                            setCommentField(reg.studentNote?.split("\n").slice(1).join("\n"));

                                                            if(reg.studentProvidedReason) {
                                                                let note = reg.studentNote?.split("\n")[0]?.toLowerCase();
                                                                if(note?.toLowerCase() == "skolerelaterede aktiviteter")
                                                                    note = "skolerelateret";

                                                                setAbsenceReason(AbsenceReason[note?.replaceAll(" ", "_").toUpperCase() as keyof typeof AbsenceReason]);
                                                            } else {
                                                                setAbsenceReason(null);
                                                            }

                                                            bottomSheetModalRef.current?.present();
                                                        }}>
                                                            <View style={{
                                                                borderRadius: 999,
                                                                borderColor: color,
                                                                borderWidth: 2,

                                                                position: "relative"
                                                            }}>
                                                                <PieChart data={[{
                                                                    value: parseFloat(reg.absence),
                                                                    color: hexToRgb(color, 0.2),
                                                                }, {
                                                                    value: 100-parseFloat(reg.absence),
                                                                    color: theme.BLACK.toString(),
                                                                }]} radius={30} />

                                                                <View style={{
                                                                    position: "absolute",
                                                                    width: 60, // width and width of chart is 60 if radius is 30
                                                                    height: 60,

                                                                    display: "flex",
                                                                    justifyContent: "center",
                                                                    alignItems: "center",
                                                                }}>
                                                                    <Text style={{
                                                                        color: color,
                                                                        fontFamily: "bold",
                                                                        letterSpacing: 0.6,
                                                                    }}>
                                                                        {reg.absence}%
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            <View style={{
                                                                display: "flex",
                                                                gap: 5,

                                                                width: "100%",
                                                            }}>
                                                                <View style={{
                                                                    display: "flex",
                                                                    flexDirection: "row",

                                                                    justifyContent: "space-between",
                                                                    alignItems: "center",

                                                                    paddingRight: 15*5,

                                                                    width: "100%",
                                                                }}>
                                                                    <Text style={{
                                                                        color: theme.WHITE,
                                                                        fontSize: 15,
                                                                        fontWeight: "bold",
                                                                        letterSpacing: 0.5,

                                                                        flex: 0,
                                                                    }}>
                                                                        {reg.modul}
                                                                    </Text>

                                                                    <Text style={{
                                                                        color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                                        fontSize: 15,

                                                                        flex: 0,
                                                                    }}>
                                                                        {reg.modulStartTime?.toLocaleTimeString("de-DK", {
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                        })}
                                                                    </Text>
                                                                </View>

                                                                <View style={{
                                                                    backgroundColor: hexToRgb(color, 0.2),

                                                                    paddingHorizontal: 20,
                                                                    paddingVertical: 10,

                                                                    borderRadius: 5,
                                                                    alignSelf: "flex-start",
                                                                }}>
                                                                    <Text style={{
                                                                        color: color,
                                                                        flex: 0,

                                                                        fontWeight: "bold",
                                                                    }}>
                                                                        {!reg.studentProvidedReason ? "Ikke angivet" : reg.studentNote?.split("\n")[0]}
                                                                    </Text>
                                                                    {reg.studentNote?.split("\n").length == 2 && (
                                                                        <Text style={{
                                                                            color: color,
                                                                            flex: 0,

                                                                            fontWeight: "normal",
                                                                        }}>
                                                                            {reg.studentNote.split("\n")[1]}
                                                                        </Text>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        </Pressable>
                                                    )
                                                })}
                                            </View>
                                        )
                                    })}
                                </View>
                                
                            </ScrollView>
                        </View>

                    </AnimatedPagerView>
                    {rateLimited && <RateLimit />}

                    <BottomSheetModal
                        ref={bottomSheetModalRef}
                        index={0}
                        snapPoints={["60%"]}
                        stackBehavior="push"
        
                        bottomInset={89}
        
                        backgroundStyle={{
                            backgroundColor: theme.ACCENT_BLACK,
                        }}
                        handleIndicatorStyle={{
                            backgroundColor: theme.WHITE,
                        }}

                    >   
                        {(() => {
                            let color;
                            if(absenceReason == null) {
                                const colorIndex = fraværIndexes.findIndex((v) => v == (!registration?.studentProvidedReason ? "Ikke angivet" : registration?.studentNote?.split("\n")[0])?.toLowerCase())
                                color = fraværColors[colorIndex];
                            } else {
                                const str = AbsenceReason.toString(absenceReason);
                                const colorIndex = fraværIndexes.findIndex((v) => v == (str.toLowerCase() == "skolerelateret" ? "skolerelaterede aktiviteter" : str).toLowerCase())
                                color = fraværColors[colorIndex];
                            }

                            return (
                                <BottomSheetScrollView keyboardShouldPersistTaps="handled">
                                    <View style={{
                                        height: "100%",
                                        width: "100%",
            
                                        display: "flex",
                                        flexDirection: "column",
            
                                        paddingHorizontal: 20,
                                        marginVertical: 10,
            
                                        gap: 10,
                                    }}>
                                        <View style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            flexDirection: "row",
                                        }}>
                                            <Text style={{
                                                fontSize: 17.5,
                                                fontWeight: "bold",
                
                                                color: theme.WHITE,
                                            }}>
                                                Opgiv fraværsårsag
                                            </Text>

                                            <Pressable style={{
                                                display: "flex",
                                                flexDirection: "row",

                                                alignItems: "center",

                                                gap: 5,
                                            }} onPressIn={async () => {
                                                if(absenceReason == null) return;
                                                else if (typeof absenceReason == "function") return;
                                               
                                                setSendLoading(true);
                                                const gymNummer = (await secureGet("gym")).gymNummer;

                                                await postRegistration({
                                                    reason: absenceReason,
                                                    comment: commentField,
                                                }, (registration?.url) || "", gymNummer);
                                                onRegistrationRefresh();
                                            }}>
                                                {!sendLoading ? (
                                                    <>
                                                        <Text style={{
                                                            color: theme.LIGHT,
                                                            fontSize: 17.5,
                                                            fontWeight: "bold",
                                                        }}>
                                                            Send
                                                        </Text>
                                                        <PaperAirplaneIcon size={17.5} color={theme.LIGHT} />
                                                    </>
                                                ) : (
                                                    <ActivityIndicator color={theme.LIGHT} />
                                                )}
                                            </Pressable>
                                        </View>
            
                                        <View style={{
                                            width: "100%",
                                            height: StyleSheet.hairlineWidth,
            
                                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.6),
                                        }} />
            
                                        <View style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}>
                                            <View style={{
                                                maxWidth: "70%",

                                                display: "flex",
                                                gap: 10,
                                            }}>
                                                <View style={{
                                                    display: "flex",
                                                    gap: 2.5,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: "600",
                    
                                                        color: theme.WHITE,
                                                    }}>
                                                        Registreret
                                                    </Text>
                    
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: "400",
                    
                                                        color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                    }}>
                                                        {registration?.registered.toLocaleDateString("da-DK", {
                                                            day: "numeric",
                                                            month: "long",
                                                            year: "numeric",
                                                            weekday: "long",
                                                        })} kl. {registration?.registeredTime}
                                                    </Text>
                                                </View>

                                                <View style={{
                                                    display: "flex",
                                                    gap: 2.5,
                
                                                    marginTop: 5,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: "600",
                
                                                        color: theme.WHITE,
                                                    }}>
                                                        Lektion
                                                    </Text>
                
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: "400",
                
                                                        color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                    }}>
                                                        {registration?.modul}
                                                    </Text>
                                                </View>
                                            </View>
            
                                            <View style={{
                                                borderRadius: 999,
                                                borderColor: color,
                                                borderWidth: 2,

                                                position: "relative"
                                            }}>
                                                <PieChart data={[{
                                                    value: parseFloat(registration?.absence || "0"),
                                                    color: hexToRgb(color, 0.2),
                                                }, {
                                                    value: 100-parseFloat(registration?.absence || "0"),
                                                    color: theme.BLACK.toString(),
                                                }]} radius={40} />

                                                <View style={{
                                                    position: "absolute",
                                                    width: 40*2, // width and width of chart is 60 if radius is 30
                                                    height: 40*2,

                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                }}>
                                                    <Text style={{
                                                        color: color,
                                                        fontFamily: "bold",
                                                        letterSpacing: 1,

                                                        fontSize: 17.5,
                                                    }}>
                                                        {registration?.absence}%
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        
                                        <Pressable style={{
                                            width: "100%",
                                            paddingVertical: 20,
                                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
                                            borderRadius: 10,
                                        }} onPress={() => {
                                            bottomSheetModalRef.current?.dismiss();
                                            bottomSheetAbsenceRegistrationRef.current?.present()
                                        }}>
                                            <Text style={{
                                                color: color,
                                                fontWeight: "bold",
                                                fontSize: 17.5,
                                                textAlign: "center",
                                            }}>
                                                {absenceReason == null ? "Opgiv fraværsårsag" : AbsenceReason.toString(absenceReason)}
                                            </Text>
                                        </Pressable>

                                        <BottomSheetTextInput
                                            editable
                                            multiline
                                            textAlignVertical={"top"}
                                            scrollEnabled

                                            onChangeText={(e) => setCommentField(e)}
                                            defaultValue={registration?.studentNote?.split("\n").slice(1).join("\n") || ""}

                                            placeholder={"Tilføj en kommentar"}
                                            placeholderTextColor={hexToRgb(theme.WHITE.toString(), 0.6)}
                                            style={{
                                                padding: 8,

                                                fontSize: 16,
                                                lineHeight: 20,

                                                minHeight: 20 * 5,
                                                color: theme.WHITE,

                                                borderRadius: 10,
                                                backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
                                            }}
                                        />
                                    </View>
                                </BottomSheetScrollView>
                            )
                        })()}
                    </BottomSheetModal>

                    <BottomSheetModal
                        ref={bottomSheetAbsenceRegistrationRef}
                        index={0}
                        snapPoints={["50%"]}
        
                        bottomInset={89}
                        stackBehavior="push"

                        enableDismissOnClose

                        backgroundStyle={{
                            backgroundColor: theme.ACCENT_BLACK,
                        }}
                        handleIndicatorStyle={{
                            backgroundColor: theme.WHITE,
                        }}
                    >
                        <View style={{
                            width: "100%",
                            height: "100%",

                            backgroundColor: theme.ACCENT_BLACK,

                            display: "flex",
                            flexWrap: "wrap",

                            flexDirection: "row",

                            justifyContent: "space-evenly",
                            alignItems: "center",
                        }}>
                            {(() => {
                                const andet = fraværColors[fraværIndexes.findIndex((s) => s == "andet")]
                                const komForSent = fraværColors[fraværIndexes.findIndex((s) => s == "kom for sent")]
                                const skolerelateredeAktiviter = fraværColors[fraværIndexes.findIndex((s) => s == "skolerelaterede aktiviteter" || s == "skolerelateret")]
                                const privateForhold = fraværColors[fraværIndexes.findIndex((s) => s == "private forhold")]
                                const sygdom = fraværColors[fraværIndexes.findIndex((s) => s == "sygdom")]

                                return (
                                    <>
                                        <RegistrationComponent title={"Andet"} color={andet} Icon={<PaperClipIcon color={andet} />} setAbsenceReason={setAbsenceReason} />
                                        <RegistrationComponent title={"Kom for sent"} color={komForSent} Icon={<BellIcon color={komForSent} />} setAbsenceReason={setAbsenceReason} />
                                        <RegistrationComponent title={"Skolerelateret"} color={skolerelateredeAktiviter} Icon={<CalendarDaysIcon color={skolerelateredeAktiviter} />} setAbsenceReason={setAbsenceReason} />
                                        <RegistrationComponent title={"Private forhold"} color={privateForhold} Icon={<LockClosedIcon color={privateForhold} />} setAbsenceReason={setAbsenceReason} />
                                        <RegistrationComponent title={"Sygdom"} color={sygdom} Icon={<EyeDropperIcon color={sygdom} />} setAbsenceReason={setAbsenceReason} />
                                    </>
                                )
                            })()}
                        </View>
                    </BottomSheetModal>

                </View>
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    )
}