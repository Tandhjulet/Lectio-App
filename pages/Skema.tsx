import { ActivityIndicator, Animated, DimensionValue, Dimensions, LogBox, Modal, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { createRef, useCallback, useEffect, useRef, useState } from "react";
import { Profile, getProfile, getSkema, getWeekNumber } from "../modules/api/scraper/Scraper";
import { getSecure, getUnsecure, isAuthorized } from "../modules/api/Authentication";
import { Day, Modul, ModulDate } from "../modules/api/scraper/SkemaScraper";
import COLORS, { hexToRgb } from "../modules/Themes";
import { BackwardIcon, ChatBubbleBottomCenterTextIcon, ClipboardDocumentListIcon, InboxStackIcon, PuzzlePieceIcon } from "react-native-heroicons/solid";
import getDaysOfCurrentWeek, { WeekDay, getDay, getDaysOfThreeWeeks, getNextWeek, getPrevWeek } from "../modules/Date";
import GestureRecognizer from 'react-native-swipe-gestures';
import { getPeople } from "../modules/api/scraper/class/PeopleList";
import { NavigationProp } from "@react-navigation/native";
import RateLimit from "../components/RateLimit";
import { Key, getSaved } from "../modules/api/storage/Storage";
import { SCHEMA_SEP_CHAR } from "../modules/Config";
import Logo from "../components/Logo";
import PagerView from "react-native-pager-view";
import { TouchableHighlight } from "react-native-gesture-handler";

/**
 * 
 * @param moduler a list of all the modules of the given day
 * @param fallbackValues a list containing the values to fall back to, if no earlier/later dates are found
 * @returns the extrenum dates of the given modules
 */
function findExtremumDates(moduler: Modul[], fallbackValues: {
    min: ModulDate,
    max: ModulDate,
}): {
    min: ModulDate,
    max: ModulDate,
} {
    let smallest: ModulDate = fallbackValues.min;
    let biggest: ModulDate = fallbackValues.max;

    moduler.forEach((modul: Modul) => {

        if(modul.timeSpan.startNum < smallest.startNum) {
            smallest = modul.timeSpan;
        }

        if(modul.timeSpan.endNum > biggest.endNum) {
            biggest = modul.timeSpan;
        }
    })

    return {
        min: smallest,
        max: biggest,
    };
}

/**
 * 
 * @param dateString a time formatted as a string in the format HHSS
 * @returns a date corresponding to the given string
 */
function formatDate(dateString: string): Date {
    const padded = dateString.padStart(4, "0");
    const minutes = padded.slice(2);
    const hours = padded.slice(0,2);

    const date = new Date();
    date.setMinutes(parseInt(minutes));
    date.setHours(parseInt(hours));

    return date;
}

/**
 * 
 * @param dates the two dates to find the hours between
 * @param padding the amount of hours to add before and after. (E.g timespan 08:00 - 09:00 will return [7, 8, 9, 10])
 * @returns the hours between the dates
 */
function hoursBetweenDates(dates: {
    min: ModulDate,
    max: ModulDate,
}, padding: number = 0) {

    const min: Date = formatDate(dates.min.startNum.toString())
    const max: Date = formatDate(dates.max.endNum.toString());

    const out: number[] = [];
    for(let i = min.getHours()-padding; i <= max.getHours()+padding; i++) {
        out.push(i);
    }

    return out;
}

/**
 * 
 * @param param0 Navigation prop
 * @returns JSX for the schema view
 */
export default function Skema({ navigation }: {
    navigation: NavigationProp<any>,
}) {
    /**
     * Calculates the color of a given module from it's status.
     * @param opacity opacity of the color
     * @param modul the module to calculate the color for
     * @returns a string color in RGBA-format
     */
    const calcColor = (opacity: number, modul: Modul) => (modul.changed || modul.cancelled) ? (modul.changed ? `rgba(207, 207, 0, ${opacity})` : `rgba(201, 32, 32, ${opacity})`) : `rgba(31, 222, 34, ${opacity})`;

    const [refreshing, setRefreshing] = useState(false);

    const [ dayNum, setDayNum ] = useState<number>((getDay(new Date()).weekDayNumber));

    const [ selectedDay, setSelectedDay ] = useState<Date>(new Date());

    const [ daysOfThreeWeeks, setDaysOfThreeWeeks ] = useState<WeekDay[][]>([]);
    const [ loadWeekDate, setLoadWeekDate ] = useState<Date>(new Date());

    const [ loadDate, setLoadDate ] = useState<Date>(new Date());

    const [ skema, setSkema ] = useState<Day[] | null>([]);
    const [ day, setDay ] = useState<{
        modul: Modul,

        width: string,
        left: string,
    }[]>([]);

    const [ modulTimings, setModulTimings ] = useState<ModulDate[]>([]);
    const [ hoursToMap, setHoursToMap ] = useState<number[]>([]);
    const [ loading, setLoading ] = useState(true);
    const [ blockScroll, setBlockScroll ] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [rateLimited, setRateLimited] = useState(false);

    const [ profile, setProfile ] = useState<Profile>();

    /**
     * Used in the gestureRecognizer to go to the next/previous day
     * @param t if it should go to the next day or the previous, respectively "ADD" or "REMOVE"
     */
    const daySelector = (t: "ADD" | "REMOVE") => {
        setSelectedDay((prev) => {
            const copy = new Date(prev);
    
            if(t == "ADD") {
                copy.setDate(prev.getDate()+1)
            } else {
                copy.setDate(prev.getDate()-1)
            }

            if(t == "ADD") {
                setDayNum(() => {
                    const num = getDay(copy).weekDayNumber;

                    return num;
                })
            } else if(t == "REMOVE") {
                setDayNum(() => {
                    const num = getDay(copy).weekDayNumber;
    
                    return num;
                })
            }

            if(getWeekNumber(prev) != getWeekNumber(copy)) {
                setLoadDate(copy);
                if(t == "ADD") pagerRef.current?.setPage(2);
                else if (t == "REMOVE") pagerRef.current?.setPage(0);
            }
            
            return copy;
        });
    }

    /**
     * Parses the schema for the currently selected day in the schema viewer
     * @param skema all of the modules for the week
     */
    function parseSkema(skema: Day[]) {
        if(skema == null)
            return;

        const out = calculateIntersects(skema[dayNum - 1].moduler)
        const depthAssigned = assignDepth(out);

        const flattened = flatten(depthAssigned);

        setDay(flattened);
    }

    /**
     * Fetches the data needed to display the page, on page load.
     * If anything is cached it will render that whilst waiting for the server to respond.
     */
    useEffect(() => {
        (async () => {
            setBlockScroll(true);

            const saved = await getSaved(Key.SKEMA, getWeekNumber(loadDate).toString());
            let hasCache = false;
            if(saved.valid && saved.value != null) {
                setSkema(saved.value.days);
                setModulTimings(saved.value.modul);
                hasCache = true;
            } else {
                setLoading(true);
            }

            const gymNummer = (await getSecure("gym")).gymNummer;

            setLoadWeekDate(loadDate);
            setDaysOfThreeWeeks([...getDaysOfThreeWeeks(loadDate)])

            setProfile(await getProfile());

            getSkema(gymNummer, loadDate).then(({ payload, rateLimited }) => {
                if(!rateLimited && payload != null) {
                    setSkema([...payload.days]);
                    setModulTimings([...payload.modul]);
                } else {
                    if(!hasCache) {
                        setSkema(null);
                        setModulTimings([]);
                    }
                }
                setLoading(false);
                setBlockScroll(false);
                setRateLimited(rateLimited)
            })
        })();

    }, [loadDate])

    useEffect(() => {
        pagerRef.current?.setPageWithoutAnimation(1);
    }, [daysOfThreeWeeks]);

    /**
     * Used for drag-to-refresh functionality
     */
    useEffect(() => {
        if(refreshing == false) 
            return;
        
        (async () => {
            const gymNummer = (await getSecure("gym")).gymNummer;
            getSkema(gymNummer, loadDate).then(({ payload, rateLimited }) => {
                if(!rateLimited && payload != null) {
                    setSkema([...payload.days]);
                    setModulTimings([...payload.modul]);
                } else {
                    setSkema(null);
                    setModulTimings([]);
                }
                setRateLimited(rateLimited)
                setRefreshing(false)
            })
        })();

    }, [refreshing])

    /**
     * Used to update the module view when you change the date you're viewing
     */
    useEffect(() => {
        if(skema == null || skema.length == 0 || skema[dayNum - 1] == null) 
            return;

        const extrenumDates = findExtremumDates(skema[dayNum - 1].moduler, {
            min: modulTimings[0],
            max: modulTimings[modulTimings.length - 1],
        })
        if(extrenumDates == null)
            return;
        
        const hoursBetween = hoursBetweenDates(extrenumDates, 1)
        setHoursToMap(hoursBetween)

        parseSkema(skema)
    }, [modulTimings, dayNum])

    /**
     * Compares two dates without taking account for time.
     * E.g for this function 07/01/2024 19:09 === 07/01/2024 00:01
     * @param d1
     * @param d2 
     * @returns true if they are equal, otherwise false
     */
    const dateCompare = (d1: Date, d2: Date) => {
        return (d1.getMonth() == d2.getMonth() &&
                d1.getDate() == d2.getDate() &&
                d1.getFullYear() == d2.getFullYear())
    }

    /**
     * Used to calculate how long down a module should be on the schema view
     * @param date the date to calculate the top-property of
     * @returns a number used for formatting
     */
    function calculateTop(date: ModulDate) {
        const min: Date = formatDate(date.startNum.toString())
        const out = ((min.getHours() - Math.min(...hoursToMap))*60 + min.getMinutes());
        return (out == Infinity || out == -Infinity) ? 0 : out;
    }

    /**
     * Searches the given dict for any overlaps
     * @param dict dict containing module intersects
     * @param startDate the start date formatted as a number
     * @param endDate the end date formatted as a number
     * @returns the overlap if any are detected, else null
     */
    function searchDateDict(dict: {[id: string]: any}, startDate: number, endDate: number): string | null {
        const xmin1 = formatDate(startDate.toString())
        const xmax1 = formatDate(endDate.toString())

        for(let key of Object.keys(dict)) {
            const xmin2 = formatDate(key.split("-")[0]);
            const xmax2 = formatDate(key.split("-")[1]);

            if(xmax1 >= xmin2 && xmax2 >= xmin1) { // if true timestamps are overlapping
                return key
            }
        }
        return null;
    }

    /**
     * Assigns depth to the given dictionary
     * @param intersections a dict containing module intersects
     * @param depth the current depth
     * @returns a depth assigned dict
     */
    function _depth(intersections: {[id: string]: {
        moduler: Modul[],
        contains: any,

        depth?: number,
        maxDepth?: number,
    }}, depth = 1) {
        const out = intersections;

        for(let key in intersections) {
            out[key].depth = depth + (out[key].moduler.length - 1);
            _depth(out[key].contains, depth + (out[key].moduler.length - 1) + 1)
        }

        return out;
    }

    let MAXDEPTH = 0;
    /**
     * Recursively sets the max depth in the given dict.
     * @param intersections a depth-assigned dict containing module intersects
     * @returns the max depth encountered in the dict
     */
    function _maxDepth(intersections: {[id: string]: {
        moduler: Modul[],
        contains: any,

        depth?: number,
        maxDepth?: number,
    }}) {
        const out = intersections;

        for(let key in intersections) {
            if((out[key].depth ?? 0) > MAXDEPTH) {
                MAXDEPTH = out[key].depth ?? MAXDEPTH;
            }
            _maxDepth(out[key].contains)
        }

        return MAXDEPTH;
    }

    /**
     * 
     * @param depthAssigned a depth-assigned dict containing module intersects
     * @returns a flattened dict containing width and left (%) properties used for formatting
     */
    function flatten(depthAssigned: {[id: string]: {
        moduler: Modul[],
        contains: any,

        depth?: number,
        maxDepth?: number,
    }}) {
        let out: {
            modul: Modul,

            width: string,
            left: string,
        }[] = []

        for(let key in depthAssigned) {
            const width = Math.floor(1/(depthAssigned[key].maxDepth ?? 1)*100).toString() + "%";

            depthAssigned[key].moduler.forEach((modul: Modul, index: number) => {
                const left = Math.floor((1-((depthAssigned[key].depth ?? 0)-index)/(depthAssigned[key].maxDepth ?? 1))*100) + "%";

                out.push({
                    modul: modul,
                    width: width,
                    left: left,
                })
            })

            out = [
                ...out,
                ...flatten(depthAssigned[key].contains),
            ]
        }

        return out;
    }

    /**
     * 
     * @param intersections intersections calculated by {@link calculateIntersects}
     * plus some additional info needed for the function to be able to recurse correctly
     * @param calcDepth if the depth needs to be calculated again
     * @param maxDepth the highest depth yet encoutered
     * @returns a depth-assigned dict containing module intersects
     * @see {@link calculateIntersects}
     */
    function assignDepth(intersections: {[id: string]: {
        moduler: Modul[],
        contains: any,

        depth?: number,
        maxDepth?: number,
    }}, calcDepth: boolean = true, maxDepth: number = 0) {
        let out = intersections;

        if(calcDepth) {
            out = _depth(intersections);
        }

        for(let key in out) {
            MAXDEPTH = 0;
            maxDepth = _maxDepth(out[key].contains);
            if(maxDepth == 0) {
                maxDepth = out[key].depth ?? 0;
            }
            out[key].maxDepth = maxDepth

            assignDepth(out[key].contains, false, maxDepth)
        }

        return out;
    }   

    /**
     * This function calculates the intersects of the modules and formats them into a dict. An intersection is when two modules have overlapping times.
     * E.g module A starts at 08:00 and ends 09:30, whilst module B starts 09:00 and ends 10:00. The app needs to be able to register this, and render without 
     * overlapping the two modules. Hence this function.
     * @param modules a list of modules for the selected day
     * @returns a dict of all the intersects. The keys are formatted as "{INTERSECT_START_DATE}-{INTERSECT_END_DATE}".
     * Every entry contains any internal children intersections. This makes it easy to render if any modules.
     */
    function calculateIntersects(modules: Modul[]) {
        const out: {[id: string]: {
            moduler: Modul[],
            contains: any,
        }} = {}

        const sortedModules = modules.sort((a,b) => {
            return (a.timeSpan.diff - b.timeSpan.diff)
        }).reverse();

        sortedModules.forEach((modul: Modul) => {
            const key = searchDateDict(out, modul.timeSpan.startNum, modul.timeSpan.endNum)
            if(key == null) {
                out[`${modul.timeSpan.startNum}-${modul.timeSpan.endNum}`] = {
                    contains: {},
                    moduler: [modul],
                }
            } else {
                if(`${modul.timeSpan.startNum}-${modul.timeSpan.endNum}` == key) {
                    out[`${modul.timeSpan.startNum}-${modul.timeSpan.endNum}`].moduler.push(modul)
                } else {
                    const intersects = calculateIntersects([modul]);
                    out[key].contains = { 
                        ...out[key].contains,
                        ...intersects,
                    }
                }
            }
        })

        return out
    }

    /**
     * Returns a different greeting depending on the time
     * @returns a greeting
     */
    const getTimeOfDayAsString: () => string = () => {
        const d = new Date()
        if(d.getHours() < 8) {
            return "Godmorgen"
        } else if (d.getHours() < 11) {
            return "Godformiddag"
        } else if (d.getHours() < 13) {
            return "Godmiddag"
        } else if (d.getHours() < 20) {
            return "Goddag"
        }
        return "Godaften"
    }

    /**
     * Used for auto-refresh
     */
    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const {width} = Dimensions.get('window');

    const pagerRef = createRef<PagerView>();
    const scrollRef = createRef<ScrollView>();

    return (
    <View>
        <View style={{
            paddingTop: 50,
    
            backgroundColor: COLORS.ACCENT_BLACK,

            display: 'flex',
            flexDirection: 'row',

            width: "100%",
        }}>
            <View style={{
                paddingHorizontal: 20,
            }}>
                <Text style={{
                    fontSize: 20,
                    color: COLORS.LIGHT,
                }}>{getTimeOfDayAsString()}, {profile == undefined ? "..." : profile.name.split(' ')[0]}</Text>

                <Text style={{
                    fontSize: 30,
                    fontWeight: "bold",
                    color: COLORS.WHITE,
                }}>Uge {getWeekNumber(loadWeekDate)}</Text>
            </View>
            <View style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 20,

                position: "absolute",
                right: 0,
                bottom: 0,

                paddingRight: 20,
            }}>
                <TouchableOpacity onPress={() => {
                    if(loadDate > new Date()) {
                        pagerRef.current?.setPage(0);
                    } else {
                        pagerRef.current?.setPage(2);
                    }

                    setLoadDate(new Date());
                    setSelectedDay(new Date());
                    setDayNum(getDay(new Date()).weekDayNumber)
                }}>
                    <View style={{
                        backgroundColor: COLORS.LIGHT,
                        padding: 5,
                        borderRadius: 12.5,

                        opacity: (!loading && !dateCompare(selectedDay, new Date())) ? 1 : 0.5,
                    }}>
                        <BackwardIcon color={COLORS.DARK} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {
                    if(skema != null && (skema[dayNum-2] == undefined || skema[dayNum-2].skemaNoter == ""))
                        return;

                    setModalVisible(true)
                }}>
                    <View style={{
                        backgroundColor: COLORS.LIGHT,
                        padding: 5,
                        borderRadius: 12.5,

                        opacity: (skema != null && (skema[dayNum-2] == undefined || skema[dayNum-2].skemaNoter == "")) ? 0.5 : 1,
                    }}>
                        <ClipboardDocumentListIcon color={COLORS.DARK} />
                    </View>
                </TouchableOpacity>

                <Modal 
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => {
                        setModalVisible(!modalVisible);
                    }}
                >
                    <TouchableWithoutFeedback style={{
                        position: "absolute",

                        width: "100%",
                        height: "100%",
                    }} onPress={() => {
                        setModalVisible(!modalVisible);
                    }}>
                        <View style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',

                            paddingTop: 22,
                            paddingBottom: 200,

                            backgroundColor: 'rgba(52, 52, 52, 0.6)',
                        }}>
                            <View style={{
                                margin: 20,

                                backgroundColor: COLORS.BLACK,
                                borderRadius: 20,

                                paddingHorizontal: 35,
                                paddingVertical: 20,

                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: {
                                    width: 0,
                                    height: 2,
                                },
                                shadowOpacity: 0.25,
                                shadowRadius: 4,
                                elevation: 5,
                            }}>
                                <Text style={{
                                    color: COLORS.WHITE,
                                }}>
                                    {skema != null && skema[dayNum - 2] != undefined && skema[dayNum - 2].skemaNoter}
                                </Text>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>

                </Modal>
            </View>
        </View>

        <View style={{
            backgroundColor: COLORS.ACCENT_BLACK,
        }}>
            <PagerView
                ref={pagerRef}
                initialPage={2}
                orientation={"horizontal"}
                overdrag

                style={{
                    width: width,
                    height: 56 + 15 + 10,
                }}

                scrollEnabled={!loading}

                onPageSelected={(e) => {
                    if(blockScroll)
                        return;
                    
                    if(e.nativeEvent.position == 2) {
                        setLoadDate(() => {
                            const week = getNextWeek(selectedDay);
    
                            setSelectedDay(week);
                            return week;
                        })
                    } else if (e.nativeEvent.position == 0) {
                        setLoadDate(() => {
                            const week = getPrevWeek(selectedDay);
    
                            setSelectedDay(week);
                            return week;
                        })
                    }

                }}
            >
                {daysOfThreeWeeks.map((_, i) => {
                    return (
                        <View key={i} style={{
                            display: 'flex',

                            justifyContent:'space-between',

                            paddingTop: 15,
                            flexDirection: 'row',

                            flexWrap: "nowrap",

                            width: width,
                            height: 56 + 15 + 10,

                            paddingHorizontal: 20,
                            marginBottom: 10,
                        }}>
                            {daysOfThreeWeeks[i].map((day,i) => {
                                return (
                                    <Pressable key={i + "."} onPress={() => {
                                        setDayNum(day.weekDayNumber);
                                        setSelectedDay(day.date);
                                    }} style={({pressed}) => [
                                        {
                                            opacity: pressed ? 0.6 : 1,
                                        }
                                    ]}>
                                        <View style={{...styles.dayContainer, backgroundColor: (day.date.getMonth() == selectedDay.getMonth() &&
                                                                                                day.date.getDate() == selectedDay.getDate() &&
                                                                                                day.date.getFullYear() == selectedDay.getFullYear()) ? COLORS.LIGHT : COLORS.DARK}}>
                                            <Text style={{
                                                textTransform: 'lowercase',
                                                color: COLORS.ACCENT,
                                                opacity: day.isWeekday ? 0.6 : 1,
                                            }}>{day.dayName.slice(0,3)}.</Text>

                                            <Text style={{
                                                color: COLORS.WHITE,
                                                fontWeight: "bold",
                                                fontSize: 20,
                                                opacity: day.isWeekday ? 0.6 : 1,
                                            }}>{day.dayNumber.toString()}</Text>
                                        </View>
                                    </Pressable>
                                )
                            })}
                        </View>
                    )
                })}
            </PagerView>
        </View>

        <GestureRecognizer 
            onSwipeLeft={() => daySelector("ADD")}
            onSwipeRight={() => daySelector("REMOVE")}
            style={{
                backgroundColor: COLORS.ACCENT_BLACK,
            }}
        >
            <View
                style={{
                    backgroundColor: COLORS.ACCENT,
                    opacity: 0.6,
                    height: 1,

                    borderRadius: 5,

                    marginHorizontal: 20,
                    marginBottom: 5,
                }}
            />

            
            <View style={{
                backgroundColor: COLORS.BLACK,
                minHeight: "100%",

                paddingBottom: 200,
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
                        <ActivityIndicator size={"small"} color={COLORS.ACCENT} />
                    </View>
                    :
                    <ScrollView style={{
                        flex: 1,
                    }} refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    } ref={scrollRef}>
                        <View style={{
                            paddingTop: 20,
                        }} /> 

                        {skema == null && 
                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                flexDirection: 'column-reverse',

                                minHeight: '40%',

                                gap: 20,
                            }}>
                                <Text style={{
                                    color: COLORS.RED,
                                    textAlign: 'center'
                                }}>
                                    Der opstod en fejl.
                                    {"\n"}
                                    Du kan prøve igen ved at genstarte appen.
                                </Text>

                            </View>
                        }

                        {skema != null && (skema[dayNum - 1] == undefined || Object.keys(skema[dayNum - 1].moduler).length == 0) ? (
                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                flexDirection: 'column-reverse',

                                minHeight: '40%',

                                gap: 5,
                            }}>
                                <Text style={{
                                    color: COLORS.WHITE,
                                    textAlign: 'center'
                                }}>
                                    Du har ingen moduler.
                                    {"\n"}
                                    Nyd din dag!
                                </Text>
                                <Logo size={60} />
                            </View>
                        )
                        :
                        <View>
                            {hoursToMap.map((hour: number, index: number) => {
                                return (
                                    <View key={index} style={{
                                        position: "absolute",
                                        top: (hour - Math.min(...hoursToMap)) * 60,

                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",

                                        left: 40,
                                        paddingRight: 41,
                                        gap: 7.5,

                                        transform: [{
                                            translateY: -(17 / 2),
                                        }],

                                        zIndex: 1,
                                    }}>
                                        <Text style={{
                                            color: hexToRgb(COLORS.WHITE, 0.8),
                                            width: 39,

                                            textAlign: "center",
                                            textAlignVertical: "center",
                                        }}>
                                            {hour.toString().padStart(2, "0")}:00
                                        </Text>
                                        <View style={{
                                            height: StyleSheet.hairlineWidth,
                                            backgroundColor: hexToRgb(COLORS.WHITE, 0.6),
                                            flex: 1,
                                        }} />
                                    </View>
                                )
                            })}

                            {modulTimings.map((modulTiming: ModulDate, index: number) => {
                                return (
                                    <View key={index} style={{
                                        position: "absolute",
                                        height: modulTiming.diff,
                                        width: 30,

                                        borderTopRightRadius: 7.5,
                                        borderBottomRightRadius: 7.5,

                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",

                                        backgroundColor: hexToRgb(COLORS.WHITE, 0.15),

                                        top: calculateTop(modulTiming)
                                    }}>
                                        <Text style={{
                                            color: COLORS.WHITE,
                                            fontWeight: "bold",
                                            opacity: 0.7,
                                        }}>
                                            {index+1}.
                                        </Text>
                                    </View>
                                )
                            })}

                            <View style={{
                                position: "relative",
                                marginLeft: 40 + 7.5 + 38,

                                zIndex: 5,
                            }}>
                                {day != null && day.map(({ modul, width, left}, index: number) => {
                                    const widthNum = parseInt(width.replace("%", ""));

                                    return (
                                        <Pressable key={index} onPress={() => {
                                            navigation.navigate("Modul View", {
                                                modul: modul,
                                            })
                                        }}>
                                            <View style={{
                                                position:"absolute",

                                                top: calculateTop(modul.timeSpan),
                                                height: modul.timeSpan.diff,
                                                
                                                width: width as DimensionValue,
                                                left: left as DimensionValue,

                                                zIndex: 5,
                                            }}>
                                                <View style={{
                                                    width: "100%",
                                                }}>
                                                    <View style={{
                                                        backgroundColor: calcColor(0.5, modul),
                                                        borderRadius: 5,

                                                        width: "100%",
                                                        height: "100%",

                                                        overflow: "hidden",

                                                        paddingHorizontal: 10,
                                                        paddingVertical: modul.timeSpan.diff > 25 ? 5 : 2.5,
                                                    }}>
                                                        <View style={{
                                                            position: 'absolute',
                                                            backgroundColor: calcColor(1, modul),

                                                            borderRadius: 100,

                                                            minHeight: modul.timeSpan.diff,
                                                            width: 4,

                                                            left: 0,
                                                        }} />

                                                        {modul.timeSpan.diff > 30 && (
                                                            <Text style={{
                                                                color: calcColor(1, modul),
                                                                fontSize: 12.5,
                                                            }}>
                                                                {modul.lokale.replace("...", "").replace(SCHEMA_SEP_CHAR, "").trim()}
                                                            </Text>
                                                        )}

                                                        <Text style={{
                                                            color: calcColor(1, modul),
                                                            fontWeight: "bold",
                                                        }}>
                                                            {modul.teacher.length == 0 ? modul.team : (modul.team + " - " + modul.teacher.join(", "))}
                                                        </Text>

                                                        {modul.timeSpan.diff > 70 && (
                                                            <View style={{
                                                                position: "absolute",
                                                                top: widthNum > 75 ? 0 : undefined,
                                                                bottom: widthNum > 75 ? undefined : 0,
                                                                right: 0,

                                                                display: 'flex',
                                                                flexDirection: 'row',
                                                                gap: 5,
                                                                
                                                                margin: 5,
                                                            }}>
                                                                {modul.comment ?
                                                                    <ChatBubbleBottomCenterTextIcon color={calcColor(1, modul)} />
                                                                : null}
                                            
                                                                {modul.homework ?
                                                                    <InboxStackIcon color={calcColor(1, modul)} />
                                                                : null}
                                                                
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        </Pressable>
                                    )
                                })}
                            </View>

                            <View style={{
                                width: "100%",
                                height: hoursToMap.length * 60 + (110 + 81) + 60
                            }} />

                        </View>
                        }
                    </ScrollView>
                }
            </View>
        </GestureRecognizer>

        {rateLimited && <RateLimit />}
    </View>
    )
}

const styles = StyleSheet.create({
    dayContainer: {
                                        
        width: 40,

        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,

        paddingBottom: 10,
        paddingTop: 5,
    },
})