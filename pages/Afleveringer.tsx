import { NavigationProp } from "@react-navigation/native";
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ColorSchemeName, Modal, Pressable, RefreshControl, ScrollView, SectionList, SectionListData, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View, VirtualizedList, useColorScheme } from "react-native";
import { secureGet, getUnsecure } from "../modules/api/Authentication";
import { getAfleveringer } from "../modules/api/scraper/Scraper";
import { Opgave, Status } from "../modules/api/scraper/OpgaveScraper";
import { Theme, hexToRgb, themes } from "../modules/Themes";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { AdjustmentsVerticalIcon, ChevronRightIcon } from "react-native-heroicons/solid";
import { HeaderBackButton } from "@react-navigation/elements";
import RateLimit from "../components/RateLimit";
import Logo from "../components/Logo";
import { SubscriptionContext } from "../modules/Sub";
import Popover from "react-native-popover-view";
import { Placement } from "react-native-popover-view/dist/Types";
import { BellAlertIcon, CheckBadgeIcon, ClockIcon, ExclamationCircleIcon, ShieldExclamationIcon } from "react-native-heroicons/outline";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Formats the dates weekday as text.
 * E.g 07/01/2024 => "Søndag d. 7/1"
 * @param date date to format
 * @returns a weekday text
 */
export const formatDate = (date: Date) => {
    const weekday = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
    const dateName = weekday[date.getDay()];

    return dateName + " d. " + date.getDate() + "/" + (date.getMonth()+1);
}

/**
 * 
 * @param data assignments to count
 * @returns the amount of different types of assignments
 */
const countOpgaver = (data: Opgave[] | null) => {
    const out: {
        alle: number,
        venter: number,
        mangler: number,
        afleveret: number,
    } = {
        alle: 0,
        venter: 0,
        mangler: 0,
        afleveret: 0,
    }
    if(data == null)
        return out;

    data.forEach((opgave) => {
        switch(opgave.status) {
            case Status.VENTER:
                out.venter += 1
                break;
            case Status.AFLEVERET:
                out.afleveret += 1
                break;
            case Status.MANGLER:
                out.mangler += 1
                break;
        }
        out.alle += 1
    })

    return out;
}

/**
 * Filteres assignments depending on their status
 * @param data data to filter
 * @param filter what to filter for
 * @returns filtered data
 */
const filterData = (data: Opgave[] | null) => {
    const out: {[id: string]: {
        data: Opgave[],
        key: string,
    }[]} = {
        "Afleveret": [],
        "Venter": [],
        "Mangler": [],
        "Alle": [],
    };

    if(!data) {
        return null;
    }

    let currDate = "";
    let currStatus = "";

    data.forEach((opgave: Opgave) => {
        let status: string;
        switch(opgave.status) {
            case Status.AFLEVERET:
                status = "Afleveret";
                break;
            case Status.MANGLER:
                status = "Mangler";
                break;
            case Status.VENTER:
                status = "Venter";
                break;
        }

        if(currDate != opgave.date) {
            out["Alle"].push({
                key: opgave.date,
                data: [opgave],
            })
        }

        if(currDate != opgave.date || currStatus != status) {
            out[status].push({
                key: opgave.date,
                data: [opgave],
            });

            currDate = opgave.date;
            currStatus = status;
        } else {
            out[status][out[status].length-1].data.push(opgave);
            out["Alle"][out["Alle"].length-1].data.push(opgave);
        }
    })

    return out;
}


export default function Afleveringer({ navigation }: {navigation: NavigationProp<any>}) {
    const { subscriptionState } = useContext(SubscriptionContext);

    const currTime = useRef(new Date().valueOf()).current;

    /**
     * 
     * @param date a date of an assignment
     * @returns a text depending on how long there is until the assignment is due
     */
    const countdown = useCallback((dateString: string, date: number) => {

        const diff = date - currTime;
        const days = Math.floor(diff / (1000*60*60*24));
        if(diff <= 0 || days > 10)
            return dateString

        const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));

        const out: string[] = [];
        if(days > 0)
            out.push(days == 1 ? days + " dag" : days + " dage")

        if(hours > 0)
            out.push(hours == 1 ? hours + " time" : hours + " timer")

        return out.join(" og ")
    }, [])

    const [afleveringer, setAfleveringer] = useState<{[id: string]: {
        data: Opgave[],
        key: string,
    }[]} | null>({})

    const [ opgaveCount, setOpgaveCount ] = useState<{
        alle: number,
        venter: number,
        mangler: number,
        afleveret: number,
    }>()
    const [ sortedBy, setSortedBy ] = useState<"Venter" | "Mangler" | "Afleveret" | "Alle">("Venter");

    const [loading, setLoading] = useState<boolean>(false)
    const [rateLimited, setRateLimited] = useState<boolean>(false)

    const [refreshing, setRefreshing] = useState<boolean>(false);

    const colorFromStatus = useCallback((opgave: Opgave) => {
        switch(opgave.status) {
            case Status.AFLEVERET:
                return "#00c972";
            case Status.MANGLER:
                return "#fc5353";
            case Status.VENTER:
                return "#fcca53";
        }
    }, [])

    const iconFromStatus = useCallback((opgave: Opgave) => {
        switch(opgave.status) {
            case Status.AFLEVERET:
                return <CheckBadgeIcon color={colorFromStatus(opgave)} />;
            case Status.MANGLER:
                return <ShieldExclamationIcon color={colorFromStatus(opgave)} />;
            case Status.VENTER:
                return <ExclamationCircleIcon color={calculateColor(opgave.dateObject, scheme, opgave.status)} />;
        }
    }, [])
    
    /**
     * Calculates color from a linear gradient ([255,0,0] to [255,252,0]) 
     * depending on how soon the assignment is due. If the assignment is due in more than 14 days it will
     * return white.
     * @param date date to calculate color from
     * @returns a color
     */
    const calculateColor = useCallback((date: number, theme: ColorSchemeName, opgaveStatus: Status) => {
        const COLOR2 = [252, 200, 83]
        const COLOR1 = [252, 83, 83]

        const diff = date.valueOf() - currTime;
        const hours = Math.floor(diff / (1000*60*60));
        if(hours > 24*14 || opgaveStatus != Status.VENTER) {
            if(theme == "dark")
                switch(opgaveStatus) {
                    case Status.AFLEVERET:
                        return "#00c972";
                    case Status.MANGLER:
                        return "#fc5353";
                    case Status.VENTER:
                        return "#fcca53";
                }
            switch(opgaveStatus) {
                case Status.MANGLER:
                    return themes.dark.RED;
                case Status.AFLEVERET:
                    return themes.dark.LIGHT;
                case Status.VENTER:
                    return hexToRgb(themes.light.WHITE.toString(), 0.6);
            }
        }

        const percent = hours/(24*14)

        const res = [
            COLOR1[0] + percent * (COLOR2[0] - COLOR1[0]),
            COLOR1[1] + percent * (COLOR2[1] - COLOR1[1]),
            COLOR1[2] + percent * (COLOR2[2] - COLOR1[2]),
                    ]

        return `rgb(${res[0]}, ${res[1]}, ${res[2]})`;
    }, [])

    const [showPopover, setShowPopover] = useState(false);

    /**
     * Renders the filter-button
     */
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => selectorButton,
        })
    }, [navigation, showPopover, countOpgaver])

    /**
     * Fetches the assignments on page load
     */
    useEffect(() => {
        (async () => {
            setLoading(true);

            const gymNummer = (await secureGet("gym")).gymNummer;

            getAfleveringer(gymNummer).then(({payload, rateLimited}): any => {
                setOpgaveCount(countOpgaver(payload));

                setAfleveringer(filterData(payload))
                setRateLimited(rateLimited)
                setLoading(false);
            })
        })();
    }, [])

    /**
     * Scroll-to-refresh
     */
    useEffect(() => {
        if(!refreshing)

        (async () => {
            const gymNummer = (await secureGet("gym")).gymNummer;

            getAfleveringer(gymNummer, true).then(({payload, rateLimited}): any => {
                setOpgaveCount(countOpgaver(payload));

                setAfleveringer(filterData(payload))
                setRateLimited(rateLimited)
                setRefreshing(false);
            })
        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);


    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const selectorButton = useMemo(() => (
        <View>
            <Popover
                placement={[Placement.BOTTOM, Placement.LEFT]}
                isVisible={showPopover}
                onRequestClose={() => setShowPopover(false)}
                popoverStyle={{
                    backgroundColor: theme.BLACK,
                    borderRadius: 7.5,
                }}
                backgroundStyle={{
                    backgroundColor: "rgba(0,0,0,0.2)"
                }}
                offset={5}

                from={(
                    <TouchableOpacity delayPressIn={0} style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",

                        paddingVertical: 4,
                        paddingHorizontal: 6,

                        borderRadius: 100,

                        backgroundColor: "rgba(0,122,255,0.2)",
                    }} onPress={() => setShowPopover(true)}>
                        <AdjustmentsVerticalIcon color={"rgba(0,122,255,1)"} />

                        {(sortedBy != null) &&
                            <Text style={{
                                color: "rgba(0,122,255,1)",
                                marginLeft: 2.5,
                                marginRight: 1,
                            }}>
                                {sortedBy}
                            </Text>
                        }
                    </TouchableOpacity>
                )}
            >
                <View style={{
                    borderRadius: 7.5,
                    backgroundColor: theme.BLACK,

                    paddingVertical: 10,
                }}>
                    <TouchableOpacity delayPressIn={0} onPress={() => {
                        setShowPopover(false);
                        setSortedBy("Alle")
                    }}>
                        <View style={{
                            paddingLeft: 10,
                            paddingRight: 15,

                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",

                            marginVertical: 7.5,

                            gap: 40,
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 15,
                            }}>
                                Alle
                            </Text>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 12.5,
                                opacity: 0.6,
                            }}>
                                {opgaveCount?.alle} opgaver
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.WHITE,
                        opacity: 0.6,

                        marginHorizontal: 10,
                        marginVertical: 5,
                    }} />

                    <TouchableOpacity delayPressIn={0} onPress={() => {
                        setShowPopover(false);
                        setSortedBy("Venter")
                    }}>
                        <View style={{
                            paddingLeft: 10,
                            paddingRight: 15,

                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",

                            marginVertical: 7.5,

                            gap: 40,
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 15,
                            }}>
                                Venter
                            </Text>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 12.5,
                                opacity: 0.6,
                            }}>
                                {opgaveCount?.venter} opgaver
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.WHITE,
                        opacity: 0.6,

                        marginHorizontal: 10,
                        marginVertical: 5,
                    }} />

                    <TouchableOpacity delayPressIn={0} onPress={() => {
                        setShowPopover(false);
                        setSortedBy("Afleveret")
                    }}>
                        <View style={{
                            paddingLeft: 10,
                            paddingRight: 15,

                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            
                            marginVertical: 7.5,

                            gap: 40,
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 15,
                            }}>
                                Afleveret
                            </Text>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 12.5,
                                opacity: 0.6,
                            }}>
                                {opgaveCount?.afleveret} opgaver
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.WHITE,
                        opacity: 0.6,

                        marginHorizontal: 10,
                        marginVertical: 5,
                    }} />

                    <TouchableOpacity delayPressIn={0} onPress={() => {
                        setShowPopover(false);
                        setSortedBy("Mangler")
                    }}>
                        <View style={{
                            paddingLeft: 10,
                            paddingRight: 15,

                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",

                            marginVertical: 7.5,

                            gap: 40,
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 15,
                            }}>
                                Mangler
                            </Text>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 12.5,
                                opacity: 0.6,
                            }}>
                                {opgaveCount?.mangler} opgaver
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </Popover>
        </View>
    ), [showPopover])

    const parseElevtimer = useCallback((time: string, numDecimals?: number) => {
        if(!numDecimals)
            numDecimals = time.split(",")[1] != "00" ? 2 : 0

        const num = parseFloat(time.replace(",", "."));
        return num.toFixed(numDecimals).replace(".", ",");
    }, [])

    const AfleveringCell = memo(function AfleveringCell({
        opgave,
    }: {
        opgave: Opgave,
    }) {
        return (
            <TouchableOpacity
                onPress={() => {
                    // @ts-ignore
                    if(!subscriptionState?.hasSubscription) {
                        navigation.navigate("NoAccess")
                        return;
                    }
        
                    navigation.navigate("AfleveringView", {
                        opgave: opgave,
                    })
                }}
            >
                <View style={{
                    position: "relative",

                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.05),
                    paddingHorizontal: 15,
                    height: 75,
    
                    width: "100%",
                }}>
                    <View
                        style={{
                            display: "flex",
                            flexDirection: "row",
    
                            width: "100%",
                            justifyContent: "space-between",
                            zIndex: 2,
                        }}
                    >
                        <View
                            style={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "row",
                            }}
                        >
                            <View style={{
                                paddingRight: 15,
    
                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                <View style={{
                                    padding: 4,
                                    backgroundColor: hexToRgb(colorFromStatus(opgave), 0.1),
                                    borderRadius: 500,
                                }}>
                                    {iconFromStatus(opgave)}
                                </View>
                            </View>
    
    
                            <View style={{
                                display: "flex",
                                flexDirection: "column",
    
                                gap: 4,
                                marginVertical: 8,
                                maxWidth: "80%",
                            }}>
                                <Text 
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={{
                                        color: theme.WHITE,
                                        fontSize: 15,
                                        fontWeight: "bold",
                                    }} adjustsFontSizeToFit minimumFontScale={0.8}>
                                    {opgave.title}
                                </Text>
                                <Text style={{
                                    color: calculateColor(opgave.dateObject, scheme, opgave.status),
                                }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                    {opgave.team} - {parseElevtimer(opgave.time)} elevtim{parseElevtimer(opgave.time, 2) == "1,00" ? "e" : "er"}
                                </Text>
    
                                <Text style={{
                                    color: theme.WHITE,
                                }}>
                                    {countdown(opgave.date, opgave.dateObject)}
                                </Text>
                            </View>
                        </View>
    
                        <View style={{
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <ChevronRightIcon
                                color={theme.WHITE}
                            />
                        </View>
                    </View>
    
                    <LinearGradient
                        start={[0, 0]}
                        end={[1, 0]}
                        colors={[calculateColor(opgave.dateObject, scheme, opgave.status).toString(), "transparent"]}
    
                        style={{
                            position: "absolute",
                            right: -20, // horizontalPadding is 15px by default
    
                            width: "100%",
                            height: "100%",
    
                            transform: [{
                                rotate: "180deg",
                            }],
                            zIndex: 1,
                            opacity: 0.2,
                        }}
                    />
                </View>
            </TouchableOpacity>
        )
    }, (prev, next) => prev.opgave.id === next.opgave.id)

    const SectionHeader = memo(function SectionHeader({
        data,
        theme
    }: {
        data: string,
        theme: Theme,
    }) {
        return (
            <View style={{
                display: "flex",
                alignItems: "center",
                flexDirection: "row",
                paddingHorizontal: 15,
                width: "100%",
                marginTop: 8,
                marginBottom: 5,
            }}>
                <Text style={{
                    color: hexToRgb(theme.WHITE.toString(), 0.5)
                }}>
                    {data}
                </Text>
            </View>
        )
    }, (prev, next) => prev.data == next.data)

    const renderItemSectionList = useCallback(({ item, index }: {
        item: Opgave,
        index: number,
    }) => <AfleveringCell opgave={item} />, []);

    const renderSectionHeader = useCallback((data: {
        section: SectionListData<Opgave, {
            key: string;
            data: Opgave[];
        }>;
    }) => <SectionHeader data={data.section.key} theme={theme} />, [theme]);

    return (
        <View style={{
            minHeight: "100%",
            minWidth: "100%",
        }}>
            {loading ?
                <View style={{
                    position: "absolute",

                    top: "20%",
                    left: "50%",

                    transform: [{
                        translateX: -12.5,
                    }]
                }}>
                    <ActivityIndicator size={"small"} color={theme.ACCENT} />
                </View>
            :
                <View>
                    {(!afleveringer || !afleveringer[sortedBy] || Object.keys(afleveringer[sortedBy]).length == 0) && (
                        <View style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',

                            flexDirection: 'column-reverse',

                            minHeight: '80%',

                            gap: 5,
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                textAlign: 'center'
                            }}>
                                {sortedBy == "Alle" ?
                                    "Du har ingen opgaver"
                                :
                                    `Du har ingen opgaver der ${sortedBy == "Afleveret" ? "er " : ""}${sortedBy.toLowerCase()}.`
                                }
                            </Text>
                            <Logo size={40} />
                        </View>
                    )}

                    {afleveringer && afleveringer[sortedBy] && (
                        <SectionList
                            sections={afleveringer[sortedBy]}
                            renderItem={renderItemSectionList}
                            renderSectionHeader={renderSectionHeader}

                            keyExtractor={(data, i) => i + ":" + data.id}
                            getItemLayout={(data, i) => ({
                                index: i,
                                length: 70,
                                offset: 70 * i,
                            })}

                            stickySectionHeadersEnabled={false}

                            initialNumToRender={25}

                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                            }

                            contentContainerStyle={{
                                minHeight: "100%",
                                paddingBottom: 150,
                                paddingTop: 2.5,
                            }}
                        />
                    )}
                </View>
            }

            {rateLimited && <RateLimit />}
        </View>
    )
}