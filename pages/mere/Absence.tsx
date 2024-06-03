import { ActivityIndicator, Animated, Dimensions, Pressable, RefreshControl, ScrollView, SectionListData, StyleSheet, Text, TouchableHighlight, TouchableOpacity, View, useColorScheme } from "react-native";
import NavigationBar from "../../components/Navbar";
import { ReactElement, RefObject, createRef, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAbsence, getAbsenceRegistration } from "../../modules/api/scraper/Scraper";
import { secureGet, getUnsecure } from "../../modules/api/Authentication";
import { hexToRgb, Theme, themes } from "../../modules/Themes";
import { AbsenceReason, AbsenceRegistration, AbsenceType, Fag, ModuleAbsence, Registration, postRegistration } from "../../modules/api/scraper/AbsenceScraper";
import RateLimit from "../../components/RateLimit";
import { VictoryChart, VictoryContainer, VictoryLabel, VictoryPie, VictoryTheme } from "victory-native";
import PagerView, { PagerViewOnPageScrollEventData } from "react-native-pager-view";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView, TextInput } from "react-native-gesture-handler";
import { parseDate } from "../../modules/api/scraper/OpgaveScraper";
import { BellIcon, CalendarDaysIcon, ClockIcon, EyeDropperIcon, LockClosedIcon, PaperAirplaneIcon, PaperClipIcon } from "react-native-heroicons/solid";
import { NumberProp, SvgProps } from "react-native-svg";
import * as Progress from 'react-native-progress';
import { SubscriptionContext } from "../../modules/Sub";
import { FlatList } from "react-native";
import { SectionList } from "react-native";
import Shake from "../../components/Shake";
import Logo from "../../components/Logo";
import { LinearGradient } from "expo-linear-gradient";
import Subscription from "../../components/Subscription";

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
    const theme = themes[scheme ?? "dark"];

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
    const [ registrationLoading, setRegistrationLoading ] = useState(true);

    const [ remappedRegs, setRemappedRegs ] = useState<{
        key: string,
        data: Registration[],
    }[]>([]);

    const [ absenceReason, setAbsenceReason] = useState<AbsenceReason | ((absenceReason: AbsenceReason) => string) | null>(null);

    const [ sendLoading, setSendLoading ] = useState<boolean>(false);
    const [ sendError, setSendError ] = useState<boolean>(false);

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

    /**
     * Fetches the absence on page load
     */
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
        })().then(async (gymNummer: string) => { // render registrations after absence
            
            getAbsenceRegistration(gymNummer, false, (res) => {
                if(!res) {
                    setRemappedRegs([]);
                    setRegistrationLoading(false);
                    return;
                }

                const out: {
                    key: string,
                    data: Registration[],
                }[] = [];

                res.sort((a, b) => {
                    if(typeof a.registered === "string") a.registered = new Date(a.registered);
                    if(typeof a.modulStartTime === "string") a.modulStartTime = new Date(a.modulStartTime);
                    if(typeof b.registered === "string") b.registered = new Date(b.registered);
                    if(typeof b.modulStartTime === "string") b.modulStartTime = new Date(b.modulStartTime);

                    return (b.registered.valueOf() + b.modulStartTime.valueOf()) - (a.registered.valueOf() + a.modulStartTime.valueOf())
                });

                let current = "";
                let index = 0;

                for(let reg of res) {
                    const str = reg.modulStartTime.toLocaleDateString("da-DK", {
                        dateStyle: "full",
                    });

                    if(current != str) {
                        index = out.push({
                            key: str,
                            data: [],
                        })-1;
        
                        current = str;
                    }
        
                    out[index].data.push(reg);
                }

                setRemappedRegs(out);
                setRegistrationLoading(false);
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

    const scrollOffsetAnimatedValue = useRef(new Animated.Value(0)).current;
    const positionAnimatedValue = useRef(new Animated.Value(0)).current;

    const [registration, setRegistration] = useState<Registration>();
    
    const pagerRef = createRef<PagerView>();

    const [commentField, setCommentField] = useState<string>();


    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const noAccessRef = useRef<BottomSheetModal>(null);
    const bottomSheetAbsenceRegistrationRef = useRef<BottomSheetModal>(null);

    const onRegistrationRefresh = useCallback(() => {
        setRegistrationRefreshing(true);
    }, []);

    useEffect(() => {
        if(!registrationRefreshing) return;

        bottomSheetModalRef.current?.dismiss();

        (async () => {
            const gymNummer = (await secureGet("gym")).gymNummer;
            getAbsenceRegistration(gymNummer, true, (res) => {
                if(!res) {
                    setRemappedRegs([]);
                    return;
                }
                const out: {
                    key: string,
                    data: Registration[]
                }[] = [];

                res.sort((a, b) => {
                    if(typeof a.registered === "string") a.registered = new Date(a.registered);
                    if(typeof a.modulStartTime === "string") a.modulStartTime = new Date(a.modulStartTime);
                    if(typeof b.registered === "string") b.registered = new Date(b.registered);
                    if(typeof b.modulStartTime === "string") b.modulStartTime = new Date(b.modulStartTime);

                    return (b.registered.valueOf() + b.modulStartTime.valueOf()) - (a.registered.valueOf() + a.modulStartTime.valueOf())
                });

                let current = "";
                let index = 0;

                for(let reg of res) {
                    const str = reg.modulStartTime.toLocaleDateString("da-DK", {
                        dateStyle: "full",
                    });

                    if(current != str) {
                        index = out.push({
                            key: str,
                            data: [],
                        })-1;
        
                        current = str;
                    }
        
                    out[index].data.push(reg);
                }
                setRemappedRegs(out);

                setSendLoading(false);
                setRegistrationRefreshing(false);
            })
        })();
    }, [registrationRefreshing])

    const scheme = useColorScheme();
    const theme = useMemo(() => themes[scheme ?? "dark"], [scheme]);

    const { subscriptionState } = useContext(SubscriptionContext);

    const treatNumber = useCallback((num: number | undefined, dec?: number) => {
        if(num === undefined)
            return 0;

        return num.toLocaleString("da-DK", {
            style: "decimal",
            maximumFractionDigits: dec ?? 2,
        })
    }, []);

    const handlePress = useCallback((reg: Registration) => {
        // @ts-ignore
        if(!subscriptionState?.hasSubscription) {
            noAccessRef.current?.present();
            return;
        }

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

        bottomSheetAbsenceRegistrationRef.current?.dismiss();
        bottomSheetModalRef.current?.present();
    }, []);

    const renderItemSectionList = useCallback(({ item, index }: {
        item: Registration,
        index: number,
    }) => <Registration reg={item} theme={theme} i={index} />, []);

    const renderSectionHeader = useCallback((data: {
        section: SectionListData<Registration, {
            key: string;
            data: Registration[];
        }>;
    }) => <SectionHeader data={data} theme={theme} />, [remappedRegs]);

    const SectionHeader = memo(function SectionHeader({
        data,
        theme,
    }: {
        data: {
            section: SectionListData<Registration, {
                key: string;
                data: Registration[];
            }>;
        },
        theme: Theme,
    }) {
        return (
            <View style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
            }}>

                <View style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    flexDirection: "row",
                    width: "100%",
                }}>

                    <Text style={{
                        color: hexToRgb(theme.WHITE.toString(), 0.8),
                        fontWeight: "normal",
                        fontSize: 15,
                        marginBottom: 5,
                    }}>
                        {data.section.key}
                    </Text>

                    <Text style={{
                        color: hexToRgb(theme.WHITE.toString(), 0.4),
                        fontWeight: "normal",
                        fontSize: 15,
                        marginBottom: 5,
                    }}>
                        {data.section.data.length} {data.section.data.length == 1 ? "modul" : "moduler"}
                    </Text>
                </View>
            </View>
        )
    })

    const Registration = memo(function Registration({
        reg,
        theme,
        i,
    }: {
        reg: Registration,
        theme: Theme,
        i: number,
    }) {
        const colorIndex = fraværIndexes.findIndex((v) => v == (!reg.studentProvidedReason ? "Ikke angivet" : reg.studentNote?.split("\n")[0])?.toLowerCase())
        const color = fraværColors[colorIndex];

        return (
            <Pressable
                onPress={() => handlePress(reg)}

                style={({pressed}) => [
                    {
                        opacity: pressed ? 0.6 : 1,
                        marginTop: !(i == 0) ? 4 : 0,
                    }
                ]}

            >
                <View style={{
                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.07),

                    borderRadius: 10,
                    overflow: "hidden",

                    maxWidth: "100%",
                }}>
                    <LinearGradient
                        start={[0, 0]}
                        end={[1, 0]}
                        colors={[color, "transparent"]}
    
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
    
                            transform: [{
                                rotate: "180deg",
                            }],
                            zIndex: 1,
                            opacity: 0.15,
                        }}
                    />

                    <View style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        padding: 10,
                    }}>
                        <View style={{
                            flexDirection: "column",
                            alignItems: "flex-start",

                            gap: 5,

                            maxWidth: "80%",
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                fontWeight: "700",
                                fontSize: 14,
                                letterSpacing: 0.2,
                            }}>
                                {reg.modul}
                            </Text>

                            <View style={{
                                paddingVertical: 7.5,
                                paddingHorizontal: 15,

                                backgroundColor: hexToRgb(color, 0.1),
                                borderRadius: 5,
                            }}>
                                <Text style={{
                                    color: hexToRgb(color, 1),
                                    fontWeight: "800",
                                    letterSpacing: 0.1,
                                    fontSize: 15,
                                }}>
                                    {reg.studentNote?.split("\n")[0] ?? "Opgiv årsag"}
                                </Text>

                                {reg.studentNote?.split("\n")[1] && (
                                    <Text style={{
                                        color: hexToRgb(color, 1),
                                        fontSize: 14,
                                    }} adjustsFontSizeToFit minimumFontScale={0.6}>
                                        {reg.studentNote?.split("\n")[1] ?? "Ingen elevnote noteret"}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={{
                            flexGrow: 1,
                        }} />

                        <View style={{
                            position: "relative",
                        }}>
                            <Progress.Circle
                                size={60}
                                progress={parseFloat(reg.absence)/100}
                                color={color}
                                thickness={2}
                                borderWidth={0}

                                unfilledColor={hexToRgb(color, 0.2)}
                            />
        
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
                    </View>

                </View>
            </Pressable>
        )
    }, (prev, next) => Object.is(prev.reg.url, next.reg.url))

    const RegistrationComponent = memo(({
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
            <TouchableOpacity style={{
                width: "40%",
                height: "25%",
    
                marginVertical: 5,
    
                backgroundColor: hexToRgb(color, 0.3),
    
                borderRadius: 5,
            }} onPress={() => {
                const str = (title || "andet").toUpperCase().replaceAll(" ", "_");
    
                const reason = AbsenceReason[str as keyof typeof AbsenceReason];
                setAbsenceReason(reason);
                
                bottomSheetAbsenceRegistrationRef.current?.dismiss();
                bottomSheetModalRef.current?.present();
            }}>
                <View style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
    
                    flexDirection: "column",
    
                    flex: 1,
                    gap: 5,
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
                </View>
            </TouchableOpacity>
        ), (prev, next) => Object.is(prev.title, next.title));

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

                                            {chartedAbsence?.almindeligt?.absent && chartedAbsence?.almindeligt?.absent > 0 && (
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
                                                                        {totalHeight*300 > 7.5 && (
                                                                            <Text style={{
                                                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                                                position: "absolute"
                                                                            }}>
                                                                                {(totalHeight * 100).toFixed(0)}%
                                                                            </Text>
                                                                        )}
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
                                            )}
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

                                            {chartedAbsence?.skriftligt?.absent && chartedAbsence?.skriftligt?.absent > 0 && (
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
                                                                        {totalHeight*300 > 7.5 && (
                                                                            <Text style={{
                                                                                color: scheme === "dark" ? "#FFF" : "#000",
                                                                                position: "absolute"
                                                                            }}>
                                                                                {(totalHeight * 100).toFixed(0)}%
                                                                            </Text>
                                                                        )}
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
                                            )}
                                        </View>
                                    </View>

                                    <View style={{
                                        height: 89 / 2,
                                        width: "100%",
                                    }} />
                                </ScrollView>
                            }
                        </View>
                        
                        <View key="1">
                            {remappedRegs.length == 0 && !registrationLoading && (
                                <ScrollView refreshControl={
                                    <RefreshControl refreshing={registrationRefreshing} onRefresh={onRegistrationRefresh} />
                                } contentContainerStyle={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                            
                                    minHeight: '40%',
                
                                    gap: 10,
                                }}>
                                    <Logo size={60} />
                                    <Text style={{
                                        color: theme.WHITE,
                                        textAlign: 'center'
                                    }}>
                                        Du har ingen fraværsregistreringer.
                                    </Text>
                                </ScrollView>
                            )}
                            {registrationLoading && (
                                <View style={{
                                    height: height / 2,
                                    width: width,

                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}>
                                    <ActivityIndicator size={"small"} />
                                </View>
                            )}
                            {!registrationLoading && remappedRegs && (
                                <SectionList
                                    sections={remappedRegs}
                                    renderItem={renderItemSectionList}

                                    renderSectionHeader={renderSectionHeader}

                                    stickySectionHeadersEnabled={false}
                                    keyExtractor={(item, index) => index + item.modul + item.registeredTime}

                                    style={{
                                        paddingHorizontal: 15,
                                    }}

                                    contentContainerStyle={{
                                        paddingBottom: 150,
                                    }}

                                    refreshControl={
                                        <RefreshControl refreshing={registrationRefreshing} onRefresh={onRegistrationRefresh} />
                                    }
                                />
                            )}
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
                        {(!registrationLoading && !registrationRefreshing) && (() => {
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
                                                if(absenceReason == null || typeof absenceReason == "function")  {
                                                    setSendError(!sendError);
                                                    return;
                                                };
                                               
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
                                                <Progress.Pie
                                                    size={80}
                                                    progress={parseFloat(registration?.absence || "0")/100}
                                                    color={hexToRgb(color, 0.2)}
                                                    borderWidth={1}
                                                />

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
                                            <Shake shakeOn={() => absenceReason == null} deps={[sendError]} violence={2}>
                                                <Text style={{
                                                    color: color,
                                                    fontWeight: "bold",
                                                    fontSize: 17.5,
                                                    textAlign: "center",
                                                }}>
                                                    {absenceReason == null ? "Opgiv fraværsårsag" : AbsenceReason.toString(absenceReason)}
                                                </Text>
                                            </Shake>
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
                    
                    <Subscription bottomSheetModalRef={noAccessRef} bottomInset={89} />
                </View>
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    )
}