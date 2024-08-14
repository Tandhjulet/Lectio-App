import { ActivityIndicator, Alert, Animated, ColorValue, DimensionValue, Dimensions, Modal, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableHighlight, TouchableOpacity, TouchableWithoutFeedback, View, useColorScheme } from "react-native";
import NavigationBar from "../components/Navbar";
import { createRef, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Profile, compareWeeks, getProfile, getSkema, getWeekNumber } from "../modules/api/scraper/Scraper";
import { secureGet } from "../modules/api/helpers/Storage";
import { Day, Modul, ModulDate } from "../modules/api/scraper/SkemaScraper";
import { hexToRgb, themes } from "../modules/Themes";
import { ArrowLeftIcon, ArrowRightIcon, BackwardIcon, ChatBubbleBottomCenterTextIcon, ChevronLeftIcon, ClipboardDocumentListIcon, InboxStackIcon, PuzzlePieceIcon } from "react-native-heroicons/solid";
import getDaysOfCurrentWeek, { WeekDay, getDay, getDaysOfThreeWeeks, getNextWeek, getPrevWeek } from "../modules/Date";
import { getPeople } from "../modules/api/scraper/class/PeopleList";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import RateLimit from "../components/RateLimit";
import { Key, getSaved } from "../modules/api/helpers/Cache";
import { SCHEMA_SEP_CHAR } from "../modules/Config";
import Logo from "../components/Logo";
import PagerView from "react-native-pager-view";
import { SubscriptionContext } from "../modules/Sub";
import Popover from "react-native-popover-view";
import { Mode, Placement } from "react-native-popover-view/dist/Types";
import Constants from 'expo-constants';
import React from "react";
import { StackNavigationProp } from "@react-navigation/stack";

import 'react-native-console-time-polyfill';
import Connectivity from "../components/Connectivity";
import { saveCurrentSkema } from "../modules/Widget";
import { Timespan } from "../modules/api/helpers/Timespan";

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

        if(modul.timeSpan.end.split(" ")[0] != modul.timeSpan.start.split(" ")[0]) {
            biggest = {
                ...modul.timeSpan,
                endNum: 2359,
            }
        }
        else if(modul.timeSpan.endNum > biggest.endNum) {
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
export function formatDate(dateString: string): Date {
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
        if(i < 0 || i > 24) continue;
        out.push(i);
    }

    return out;
}

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

/**
 * 
 * @param param0 Navigation prop
 * @returns JSX for the schema view
 */
export default function Skema({ navigation, route }: {
    navigation: StackNavigationProp<any>,
    route: RouteProp<any>,
}) {
    const {
        noConnectionUIError,
        isConnected,
        showUIError,
    } = Connectivity();

    const isOwnSkema = useMemo(() => {
        return route?.params?.user == undefined;
    }, [route]);

    const [time, setTime] = useState<Date>(new Date());

    const chooseSelectedDay = useMemo(() => {
        let selectedDay = new Date();
        if(selectedDay.getDay() % 6 === 0) {
            selectedDay.setDate(selectedDay.getDate() + (selectedDay.getDay() === 0 ? 1 : 2));
        }

        return selectedDay;
    }, [time])

    const { subscriptionState } = useContext(SubscriptionContext);
    const [refreshing, setRefreshing] = useState(false);

    const [ dayNum, setDayNum ] = useState<number>((getDay(chooseSelectedDay).weekDayNumber));
    const [ selectedDay, setSelectedDay ] = useState<Date>(chooseSelectedDay);

    const [ daysOfThreeWeeks, setDaysOfThreeWeeks ] = useState<WeekDay[][]>([]);

    const [ loadDate, setLoadDate ] = useState<Date>(chooseSelectedDay);

    const [ skema, setSkema ] = useState<Day[] | null>([]);

    const [ modulTimings, setModulTimings ] = useState<ModulDate[]>([]);
    const [ hoursToMap, setHoursToMap ] = useState<number[]>([]);
    const [ loading, setLoading ] = useState(true);

    const [blockScroll, setBlockScroll] = useState<boolean>(false);

    const [rateLimited, setRateLimited] = useState(false);

    const [ profile, setProfile ] = useState<Profile>();

    /**
     * Used in the gestureRecognizer to go to the next/previous day
     * @param t if it should go to the next day or the previous, respectively "ADD" or "REMOVE"
     */
    const daySelector = useCallback((t: "ADD" | "REMOVE") => {
        setSelectedDay((prev) => {
            const copy = new Date(prev);
    
            if(t == "ADD") {
                copy.setDate(prev.getDate()+1)
            } else {
                copy.setDate(prev.getDate()-1)
            }
            
            if(getWeekNumber(prev) != getWeekNumber(copy)) {
                // @ts-ignore
                if(!subscriptionState?.hasSubscription) {
                    navigation.push("NoAccessSkema")
                    pagerRef.current?.setPageWithoutAnimation(1);
                    return prev;
                }
                setBlockScroll(true);

                if(t === "ADD") pagerRef.current?.setPage(2);
                else if(t === "REMOVE") pagerRef.current?.setPage(0);
                setLoadDate(copy);

                !isConnected && showUIError();
            } else {
                setDayNum(getDay(copy).weekDayNumber)
            }
            
            return copy;
        });
    }, [subscriptionState, isConnected])

    /**
     * Fetches the data needed to display the page, on page load.
     * If anything is cached it will render that whilst waiting for the server to respond.
     */
    useEffect(() => {
        (async () => {
            setLoading(true);
            const profile = await getProfile();

            const gymNummer = (await secureGet("gym")).gymNummer;

            setDayNum(getDay(selectedDay).weekDayNumber)
            setDaysOfThreeWeeks([...getDaysOfThreeWeeks(loadDate)])

            pagerRef.current?.setPageWithoutAnimation(1);

            setProfile(profile);

            const res = await getSkema(gymNummer, loadDate, (payload) => {
                if(payload) {
                    setSkema([...payload.days]);
                    setModulTimings([...payload.modul]);
                } else {
                    setSkema(null);
                    setModulTimings([]);
                }
                
                setLoading(false);
                setRateLimited(payload === undefined)
            }, route?.params?.user)

            if(res && compareWeeks(loadDate)) {
                await saveCurrentSkema(res.days)
            }
        })();

    }, [loadDate])

    /**
     * Used for drag-to-refresh functionality
     */
    useEffect(() => {
        if(refreshing == false) 
            return;
        
        (async () => {
            const gymNummer = (await secureGet("gym")).gymNummer;
            const res = await getSkema(gymNummer, loadDate, (payload) => {
                if(payload) {
                    setSkema([...payload.days]);
                    setModulTimings([...payload.modul]);
                } else {
                    setSkema(null);
                    setModulTimings([]);
                }
                setRateLimited(payload === undefined)
                setRefreshing(false)
            }, route?.params?.user)

            if(res && (loadDate.valueOf() >= new Date().valueOf())) saveCurrentSkema(res.days)
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
    }, [modulTimings, dayNum])

    /**
     * Compares two dates without taking account for time.
     * E.g for this function 07/01/2024 19:09 === 07/01/2024 00:01
     * @param d1
     * @param d2 
     * @returns true if they are equal, otherwise false
     */
    const dateCompare = useCallback((d1: Date, d2: Date) => {
        return (d1.getMonth() == d2.getMonth() &&
                d1.getDate() == d2.getDate() &&
                d1.getFullYear() == d2.getFullYear())
    }, [])

    /**
     * Used to calculate how long down a module should be on the schema view
     * @param date the date to calculate the top-property of
     * @returns a number used for formatting
     */
    const calculateTop = useCallback(function calculateTop(date: ModulDate) {
        const min: Date = formatDate(date.startNum.toString())
        const out = ((min.getHours() - Math.min(...hoursToMap))*60 + min.getMinutes());
        return (out == Infinity || out == -Infinity) ? 0 : out;
    }, [hoursToMap])

    // /**
    //  * Searches the given dict for any overlaps
    //  * @param dict dict containing module intersects
    //  * @param startDate the start date formatted as a number
    //  * @param endDate the end date formatted as a number
    //  * @returns the overlap if any are detected, else null
    //  */

    // let searchCache: {[id: number]: number[]} = useRef({}).current;
    // function searchDateDict(dict: Modul[], i: number): number[] {
    //     if(searchCache[i]) {
    //         return searchCache[i];
    //     } else {
    //         searchCache[i] = [];
    //     }

    //     const xmin1 = formatDate(dict[i].timeSpan.startNum.toString())
    //     const xmax1 = formatDate(dict[i].timeSpan.endNum.toString())

    //     const overlaps: number[] = [];

    //     for(let j = 0; j < dict.length; j++) {

    //         const xmin2 = formatDate(dict[j].timeSpan.startNum.toString());
    //         const xmax2 = formatDate(dict[j].timeSpan.endNum.toString());

    //         if(xmax1 > xmin2 && xmax2 > xmin1) { // if true timestamps are overlapping
    //             overlaps.push(j);
    //         }
    //     }

    //     searchCache[i].push(...overlaps);
    //     return overlaps;
    // }

    // // timer brugt her: ~30
    // function calculateIntersects(modules: Modul[]) {
    //     searchCache = {};

    //     const out: {
    //         modul: Modul,
    
    //         width: string,
    //         left: string,
    //     }[] = [];

    //     // modules.sort((a,b) => a.timeSpan.startNum - b.timeSpan.startNum)


    //     // let i = -1;
    //     // let seen: Set<number> = new Set();

    //     // let max: {
    //     //     key: number,
    //     //     value: number[],
    //     // } | undefined;

    //     // function calculateIntersect(num: number) {
    //     //     const overlaps = searchDateDict(modules, num);
    //     //     if(overlaps.length > (max?.value?.length ?? -1)) max = {key: num, value: overlaps};

    //     //     overlaps.forEach((num) => {
    //     //         if(seen.has(num)) return;
    //     //         seen.add(num);

    //     //         const overlaps2 = searchDateDict(modules, num);
    //     //         if(overlaps.length > (max?.value?.length ?? -1)) max = {key: num, value: overlaps};

    //     //         overlaps2.forEach((num2) => {
    //     //             i = num2;

    //     //             if(!overlaps.includes(num2)) return;

    //     //             calculateIntersect(num2)
    //     //         })

    //     //     })
    //     // }

    //     // function calculateWidth(numbers: number[]) {
    //     //     if(!max?.value) return;

    //     //     const width = (1-(1/(max?.value.length-1)))/(numbers.length-1) * 100 + "%";

    //     //     numbers.forEach((number) => { 
    //     //         if(seen.has(number)) return;

    //     //         out.push({
    //     //             modul: modules[number],

    //     //             left: (1/numbers.length) * 100 + "%",
    //     //             width: width,
    //     //         })

    //     //         seen.add(number);
    //     //         calculateWidth(searchDateDict(modules, number))
    //     //     })
    //     // }

    //     // while (++i < modules.length) {
    //     //     seen.add(i);
    //     //     calculateIntersect(i);

    //     //     if(max == undefined) break;

    //     //     const index = max.value.findIndex((v) => v == max?.key)
    
    //     //     out.push({
    //     //         modul: modules[max?.key],
    
    //     //         left: (index/max.value.length) * 100 + "%",
    //     //         width: (1/max.value.length) * 100 + "%",
    //     //     })
        
    //     //     seen = new Set([max.key]);
    //     //     calculateWidth(max.value);

    //     //     seen = new Set();
    //     //     max = undefined;
    //     // }

    //     modules.forEach((modul: Modul, i: number) => {
    //         const overlaps = searchDateDict(modules, i)
    //         if(overlaps.length == 1) {
    //             out.push({
    //                 modul: modul,

    //                 width: "100%",
    //                 left: "0%",
    //             })
    //         } else {
    //             const index = overlaps.findIndex((v) => v == i)
                
    //             out.push({
    //                 modul: modul,

    //                 width: (1/overlaps.length) * 100 + "%",
    //                 left: (index/overlaps.length) * 100 + "%",
    //             })
    //         }
    //     })

    //     return out
    // }


    /**
     * Returns a different greeting depending on the time
     * @returns a greeting
     */
    const getTimeOfDayAsString = useCallback(() => {
        if(time.getHours() < 8) {
            return "Godmorgen"
        } else if (time.getHours() < 11) {
            return "Godformiddag"
        } else if (time.getHours() < 13) {
            return "Godmiddag"
        } else if (time.getHours() < 20) {
            return "Goddag"
        }
        return "Godaften"
    }, [time])

    /**
     * Used for auto-refresh
     */
    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const { width } = Dimensions.get('screen');

    const pagerRef = useRef<PagerView>(null);
    const scrollView = useRef<ScrollView>(null)

    const scheme = useColorScheme();
    const theme = useMemo(() => themes[scheme ?? "dark"], [scheme]);

    const pan = useRef(new Animated.ValueXY()).current;

    const threshold = useRef(60).current;
    const maxExtension = useRef(90).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder : () => false,
            onMoveShouldSetPanResponder : (e, gestureState) => {
                const {dx, dy} = gestureState;
                return (Math.abs(dx) > threshold) && (Math.abs(dy) < (threshold / 2));
            },

            onPanResponderMove: (evt, gestureState) => {
                if(Math.abs(gestureState.dx) > maxExtension)
                    gestureState.dx = gestureState.dx > 0 ? maxExtension : -maxExtension;

                return Animated.event(
                    [
                        null,
                        { dx: pan.x }
                    ],
                    {useNativeDriver: false}
                )(evt, gestureState)
            },
            onPanResponderRelease: (evt, gestureState) => {
                if(gestureState.dx > threshold) { // previous day
                    daySelector("REMOVE")
                } else if (Math.abs(gestureState.dx) > threshold) { // next day
                    daySelector("ADD")
                }

                Animated.spring(
                    pan,
                    {
                        useNativeDriver: true,
                        toValue: 0
                    }
                ).start();
            }
        })).current;

    /**
     * Calculates the color of a given module from it's status.
     * @param opacity opacity of the color
     * @param modul the module to calculate the color for
     * @returns a string color in RGBA-format
     */
    const calcColor = useCallback((opacity: number, modul: Modul) => {
        if(modul.changed) {
            return scheme == "dark" ? `rgba(255, 211, 0, ${opacity-0.05})` : `rgba(168, 144, 25, ${opacity})`;
        }

        if(modul.cancelled) {
            return scheme == "dark" ? `rgba(201, 32, 32, ${opacity})` : `rgba(201, 32, 32, ${opacity-0.2})`;
        }

        return scheme == "dark" ? `rgba(31, 184, 124, ${opacity})` : `rgba(9, 135, 86, ${opacity-0.1})`;
    }, [scheme]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
        }, 1000 * 60);

        return () => clearInterval(interval);
    }, [])

    const currentTime = useMemo(() => {
        const min = Math.min(...hoursToMap);
        const max = Math.max(...hoursToMap);

        const hour = time.getHours() + time.getMinutes()/60;

        if(!(hour > min-0.5 && hour < max+0.5)) {
            return <></>;
        }

        if(!(time.getMonth() == selectedDay.getMonth() &&
            time.getDate() == selectedDay.getDate() &&
            time.getFullYear() == selectedDay.getFullYear())) {
            return <></>;
        }

        return (
            <View
                style={{
                    position: "absolute",
                    top: (hour - min) * 60,
                    left: 0,

                    display: "flex",
                    flexDirection: "row",

                    zIndex: 10,
                }}
            >
                <View style={{
                    height: StyleSheet.hairlineWidth * 2,
                    width: width - 50,
                    backgroundColor: "#ff5e5e",
                    opacity: 0.8,
                    zIndex: 10,
                }} />
                

            </View>
        )
    }, [time, hoursToMap, selectedDay]);

    const color = useCallback((isSelectedDay: boolean, isToday: boolean, title: boolean) => {
        if(isSelectedDay) {
            return theme.GREEN_INTENSE;
        }

        if(isToday && title) {
            return theme.LIGHT;
        } else if(isToday && !title) {
            return theme.LIGHT;
        }

        return theme.WHITE;
    }, []);

    const renderSlider = useMemo(() => {
        return daysOfThreeWeeks.map((days, i) => (
            <View style={{
                paddingTop: 15,

                width: width,
                height: 56 + 15 + 10,

                paddingHorizontal: 20,
                marginBottom: 10,
            }} key={i}>
                <View style={{
                    width: width - 20*2,
                    display: 'flex',
                    flexDirection: 'row',

                    paddingHorizontal: 5,

                    justifyContent:'space-between',
                    flexWrap: "nowrap",

                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.15),
                    borderRadius: 5,
                }}>
                    {days.map((day,j) => {
                        // doesn't surve any purpose to move this to a memo.
                        // will be re-rendered anyway, because react...

                        // maybe a useCallback with a nested memo could work...

                        const isSelectedDay = dateCompare(day.date, selectedDay);

                        const nextDate = i == 1 && days[j+1]?.date;
                        const isDayBeforeSelectedDay = nextDate && dateCompare(nextDate, selectedDay)
                                                        
                        const isToday = dateCompare(day.date, time);

                        let hasNoModulesToday = i == 1 ? (skema != null && (skema[day.weekDayNumber - 1] == undefined || Object.keys(skema[day.weekDayNumber - 1].moduler).length == 0)) : true;
                        if(!skema || loading) hasNoModulesToday = true;

                        return (
                            <React.Fragment key={j + "."}>
                                <Pressable onPress={() => {
                                    setDayNum(day.weekDayNumber);
                                    setSelectedDay(day.date);
                                }} style={({pressed}) => [
                                    {
                                        opacity: pressed ? 0.6 : 1,
                                    }
                                ]}>
                                    <View style={{...styles.dayContainer}}>
                                        <Text style={{
                                            color: color(isSelectedDay, isToday, true),
                                            fontWeight: "bold",
                                            fontSize: 20,
                                            opacity: hasNoModulesToday && !isSelectedDay ? 0.9 : 1,
                                        }}>{day.dayNumber.toString()}</Text>

                                        <Text style={{
                                            textTransform: 'lowercase',
                                            color: color(isSelectedDay, isToday, false),
                                            opacity: hasNoModulesToday && !isSelectedDay ? 0.4 : 1,
                                        }}>{day.dayName.slice(0,3)}.</Text>
                                    </View>
                                </Pressable>
                                {j+1 !== days.length && (
                                    <View style={{
                                        height: 41,
                                        width: StyleSheet.hairlineWidth,
                                        marginVertical: 5,

                                        backgroundColor: isDayBeforeSelectedDay || isSelectedDay ? hexToRgb(theme.GREEN_INTENSE.toString(), 0.6) : hexToRgb(theme.WHITE.toString(), 0.5),
                                    }} />
                                )}
                            </React.Fragment>
                        )
                    })}
                </View>
            </View>
        ))
    }, [daysOfThreeWeeks, selectedDay, loading])
    // skema depends on loading and will always be set before loading
    // therefor its not needed on the list

    const renderSkemaNoter = useCallback((skemaNoter: string | string[] | undefined) => {

        if(!skemaNoter || skemaNoter.length == 0) {
            return "Ingen skemanoter"
        }
        if(typeof skemaNoter === "string") skemaNoter = [skemaNoter];

        return "• " + skemaNoter.join("\n• ")
    }, [skema])

    return (
        <View>
            <View style={{
                paddingTop: isOwnSkema ? Constants.statusBarHeight : 10,
        
                backgroundColor: theme.ACCENT_BLACK,

                display: 'flex',
                flexDirection: 'row',

                width: "100%",
            }}>
                <View style={{
                    paddingHorizontal: 20,
                }}>
                    {isOwnSkema && !(profile == undefined) ? (
                        <Text style={{
                            fontSize: 20,
                            color: theme.LIGHT,
                        }}>{getTimeOfDayAsString()}, {profile.name.split(' ')[0]}</Text>
                    ) : (
                        <Text style={{
                            textTransform: "uppercase",
                            color: theme.LIGHT,
                            fontWeight: "bold",
                            fontSize: 13,
                        }}>
                            {time.toLocaleDateString("da-DK", {
                                dateStyle:"medium",
                            })}
                        </Text>
                    )}

                    
                    <Text style={{
                        fontSize: 30,
                        fontWeight: "bold",
                        color: theme.WHITE,
                    }}>Uge {getWeekNumber(loadDate)}</Text>
                </View>
                <View style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',

                    position: "absolute",
                    right: 0,
                    bottom: 0,

                    paddingRight: 20,
                }}>
                    <TouchableOpacity onPress={() => {
                        if(loading || dateCompare(selectedDay, time) || blockScroll) return;

                        if(getWeekNumber(time) !== getWeekNumber(selectedDay)) {
                            pagerRef.current?.setPage(selectedDay > time ? 0 : 2);
                            setBlockScroll(true);
                            setLoadDate(time);
                        }

                        setDayNum(getDay(time).weekDayNumber)
                        setSelectedDay(time);

                        
                        !isConnected && showUIError();
                    }}>
                        <View style={{
                            backgroundColor: theme.LIGHT,
                            padding: 5,
                            borderRadius: 12.5,

                            opacity: (!loading && !dateCompare(selectedDay, time)) ? 1 : scheme === "light" ? 0.8 : 0.5,
                        }}>
                            <BackwardIcon color={theme.DARK} />
                        </View>
                    </TouchableOpacity>

                    <Popover
                        placement={[Placement.BOTTOM, Placement.LEFT]}

                        popoverStyle={{
                            backgroundColor: hexToRgb(theme.ACCENT_BLACK.toString()),
                            borderRadius: 7,
                        }}
                        backgroundStyle={{
                            backgroundColor: "rgba(0,0,0,0.2)"
                        }}
                        offset={5}
                        from={(
                            <TouchableOpacity style={{
                                backgroundColor: theme.LIGHT,
                                padding: 5,
                                borderRadius: 12.5,
                                marginLeft: 20,

                                opacity: (skema != null && (skema[dayNum-2] == undefined || skema[dayNum-2].skemaNoter.length == 0)) ? scheme === "light" ? 0.8 : 0.5 : 1,
                            }}>
                                <ClipboardDocumentListIcon color={theme.DARK} />
                            </TouchableOpacity>
                        )}
                    >
                        <View style={{
                            padding: 17.5,

                            gap: 5,
                        }}>
                            <Text style={{
                                color: hexToRgb(theme.WHITE.toString(), 0.5),
                            }}>
                                Skemanoter
                            </Text>

                            <Text style={{
                                color: theme.WHITE,
                                lineHeight: 20,
                            }}>
                                {skema ? renderSkemaNoter(skema[dayNum-2]?.skemaNoter) : "Ingen skemanoter"}
                            </Text>
                        </View>
                    </Popover>
                </View>
            </View>


            <View style={{
                backgroundColor: theme.ACCENT_BLACK,
            }}>
                <AnimatedPagerView
                    ref={pagerRef}
                    initialPage={1}
                    orientation={"horizontal"}
                    offscreenPageLimit={3}
                    overdrag

                    style={{
                        width: width,
                        height: 56 + 15 + 10,
                    }}

                    scrollEnabled={!loading}

                    onPageSelected={(e) => {
                        // this gets called every time PagerView#setPage is called
                        // super annoying to deal with...

                        if(blockScroll) {
                            setBlockScroll(false);
                            return;
                        }

                        if(e.nativeEvent.position == 2 || e.nativeEvent.position == 0) {
                            // @ts-ignore
                            if(!subscriptionState?.hasSubscription) {
                                navigation.push("NoAccessSkema")
                                setTimeout(() => pagerRef.current?.setPageWithoutAnimation(1), 300);
                                return;
                            }
                        }
                        
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

                        !isConnected && showUIError();
                    }}
                >
                    {renderSlider}
                </AnimatedPagerView>
            </View>

            <View style={{
                backgroundColor: theme.ACCENT_BLACK,
            }} {...panResponder.panHandlers}>
                <View
                    style={{
                        backgroundColor: theme.ACCENT,
                        opacity: 0.6,
                        height: 1,

                        borderRadius: 5,

                        marginHorizontal: 20,
                        marginBottom: 5,
                    }}
                />

                
                <View style={{
                    backgroundColor: theme.BLACK,
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
                            <ActivityIndicator size={"small"} color={theme.ACCENT} />
                        </View>
                        :
                        <ScrollView style={{
                            zIndex: 50,
                            minHeight: "100%",
                            flex: 1,
                        }} refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        } scrollEnabled ref={scrollView} showsVerticalScrollIndicator={false}>
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
                                        color: theme.RED,
                                        textAlign: 'center'
                                    }}>
                                        Der opstod en fejl.
                                        {"\n"}
                                        Du kan prøve igen ved at genindlæse.
                                    </Text>

                                </View>
                            }

                            {skema != null && (skema[dayNum - 1] == undefined || Object.keys(skema[dayNum - 1].moduler).length == 0) ? (
                                <View style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',

                                    paddingTop: 35,

                                    gap: 5,
                                }}>
                                    <Logo size={60} color={hexToRgb(theme.ACCENT.toString(), 0.8)} minOpacity={0.8} />
                                    <Text style={{
                                        fontSize: 20,
                                        color: hexToRgb(theme.LIGHT.toString(), 1),
                                    }}>
                                        Du har ingen moduler!
                                    </Text>
                                    <Text style={{
                                        color: theme.WHITE,
                                        textAlign: 'center'
                                    }}>
                                        Ha' en god dag!
                                    </Text>
                                </View>
                            )
                            :
                            <View>
                                {skema != null && (
                                    <>
                                        {hoursToMap.map((hour: number, index: number) => {
                                            const hours = time.getHours() + time.getMinutes()/60;
                                            const isCurrentTimeClose = (hours > hour-0.3 && hours < hour+0.3) && (
                                                (time.getMonth() == selectedDay.getMonth() &&
                                                time.getDate() == selectedDay.getDate() &&
                                                time.getFullYear() == selectedDay.getFullYear())
                                            )
                                            return (
                                                <View key={index} style={{
                                                    position: "absolute",
                                                    top: (hour - Math.min(...hoursToMap)) * 60,
                                                    zIndex: 2,

                                                    display: "flex",
                                                    flexDirection: "row-reverse",
                                                    alignItems: "center",

                                                    right: 5,
                                                    gap: 5,

                                                    transform: [{
                                                        translateY: -(17 / 2),
                                                    }],
                                                    opacity: isCurrentTimeClose ? 0.3 : 0.8,
                                                }}>
                                                    <Text style={{
                                                        color: hexToRgb(theme.WHITE.toString(), 0.8),
                                                        width: 39,

                                                        textAlign: "center",
                                                        textAlignVertical: "center",
                                                    }}>
                                                        {hour.toString().padStart(2, "0")}:00
                                                    </Text>
                                                    <View style={{
                                                        height: StyleSheet.hairlineWidth,
                                                        backgroundColor: hexToRgb(theme.WHITE.toString(), 0.3),
                                                        flex: 1,
                                                        zIndex: 1,
                                                    }} />
                                                </View>
                                            )
                                        })}

                                        {currentTime}

                                        {modulTimings.map((modulTiming: ModulDate, index: number) => {
                                            return (
                                                <View key={index} style={{
                                                    position: "absolute",

                                                    top: calculateTop(modulTiming),
                                                    transform: [{
                                                        translateY: modulTiming.diff/2 - (modulTiming.diff > 60 ? 30/2 : 22.5),
                                                    }],
                                                    height: modulTiming.diff > 60 ? 30 : modulTiming.diff,
                                                    width: modulTiming.diff > 60 ? 30 : 33.5+5,

                                                    left: modulTiming.diff > 60 ? 5 : 0,
                                                    
                                                    borderBottomLeftRadius: modulTiming.diff > 60 ? 500 : 0,
                                                    borderTopLeftRadius: modulTiming.diff > 60 ? 500 : 0,
                                                    borderTopRightRadius: modulTiming.diff > 60 ? 0 : 5,
                                                    borderBottomRightRadius: modulTiming.diff > 60 ? 0 : 5,

                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",

                                                    backgroundColor: scheme == "dark" ? "#1f1f1f" : "#cecece",
                                                    zIndex: 5,
                                                }} onLayout={() => {
                                                    if(index === 0){
                                                        scrollView.current?.scrollTo({y: calculateTop(modulTiming), animated: true})
                                                    }
                                                }}>
                                                    {modulTiming.diff > 60 && (
                                                        <View style={{
                                                            position:"absolute",

                                                            right: -4,
                                                            top: 0,

                                                            height: modulTiming.diff,
                                                            width: 20,

                                                            //borderCurve: "continuous",
                                                            borderBottomLeftRadius: 5,
                                                            borderTopLeftRadius: 5,
                                                            borderTopRightRadius: 7.5,
                                                            borderBottomRightRadius: 7.5,

                                                            transform: [{
                                                                translateY: -modulTiming.diff/2 + 30/2
                                                            }],
                                                            backgroundColor: scheme == "dark" ? "#1f1f1f" : "#cecece",
                                                        }}/>
                                                    )}
                                                    <Text style={{
                                                        color: theme.WHITE,
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
                                            marginLeft: 38 + 7.5,
                                            marginRight: 35 + 7.5 * 2,

                                            zIndex: 5,
                                        }}>
                                            {skema && skema[dayNum - 1].moduler.map((modul, index) => {
                                                const {
                                                    width,
                                                    left,
                                                } = modul;

                                                // brug højden defineret af lectio, desto mindre modulet går på tværs af dage.
                                                // i det tilfælde bruger vi vores egen.
                                                let height = modul.height - 1
                                                if(modul.timeSpan.end.startsWith(selectedDay.getDate().toString().padStart(2, "0")) &&
                                                   modul.timeSpan.start.split(" ")[0] != modul.timeSpan.end.split(" ")[0] &&
                                                   modul.timeSpan.diff > 0) { // FIXME: exams start and end-date will always be 0 as they are unsupported by the parser.
                                                                              // this might make the exam appear shorter than it actually is, if it stretches over multiple days. 
                                                    height = modul.timeSpan.diff - 1;
                                                }

                                                const widthNum = parseInt(width.replace("%", ""));

                                                return (
                                                    <TouchableHighlight
                                                        key={index}

                                                        onPress={() => {
                                                            if(modul.href.includes("proevehold")) {
                                                                Alert.alert("Eksamen",
                                                                            "Du kan desværre ikke se yderligere information om din eksamen i Lectimate.",
                                                                            [
                                                                                {
                                                                                    text: "OK",
                                                                                    style: "cancel",
                                                                                    isPreferred: true,
                                                                                }
                                                                            ],
                                                                            {
                                                                                cancelable: true,
                                                                            })
                                                                return;
                                                            };
                                                            
                                                            if(route.name === "Skema") {
                                                                navigation.push("Modul View", {
                                                                    modul: modul,
                                                                })
                                                            } else {
                                                                navigation.push("Modul information", {
                                                                    modul: modul,
                                                                })
                                                            }
                                                        }}
                                                    >
                                                        <View style={{
                                                            position:"absolute",

                                                            top: calculateTop(modul.timeSpan),
                                                            height: height as DimensionValue,
                                                            
                                                            width: width as DimensionValue,
                                                            left: left as DimensionValue,

                                                            zIndex: 5,
                                                        }}>
                                                            <View style={{
                                                                width: "100%",
                                                            }}>
                                                                <View style={{
                                                                    backgroundColor: (modul.changed && scheme == "light") ? calcColor(0.3, modul) : calcColor(0.5, modul),
                                                                    borderRadius: 5,

                                                                    width: "100%",
                                                                    height: "100%",

                                                                    overflow: "hidden",

                                                                    paddingHorizontal: 10,
                                                                    paddingVertical: modul.timeSpan.diff > 25 ? 5 : 2.5,
                                                                }}>
                                                                    <View
                                                                        style={{
                                                                            position: 'absolute',
                                                                            backgroundColor: calcColor(1, modul),

                                                                            height: "150%",
                                                                            width: 4,

                                                                            left: 0,
                                                                        }}
                                                                    />

                                                                    {((modul.title && height > 50) || !modul.title) && modul.lokale.replace("...", "").replace(SCHEMA_SEP_CHAR, "").trim().length > 0 && (
                                                                        <Text style={{
                                                                            color: calcColor(1, modul),
                                                                            fontSize: 12.5,
                                                                            maxWidth: "90%",
                                                                        }}>
                                                                            {modul.lokale.replace("...", "").replace(SCHEMA_SEP_CHAR, "").trim()}
                                                                        </Text>
                                                                    )}

                                                                    {modul.title && (
                                                                        <Text style={{
                                                                            color: calcColor(1, modul),
                                                                            fontWeight: "bold",
                                                                            maxWidth: "90%",

                                                                        }} ellipsizeMode="middle" numberOfLines={1}>
                                                                            {modul.title}
                                                                        </Text>
                                                                    )}

                                                                    <Text style={{
                                                                        color: calcColor(1, modul),
                                                                        fontWeight: "500",

                                                                        overflow: "hidden",
                                                                        maxWidth: "90%",
                                                                    }} ellipsizeMode="middle" numberOfLines={Math.floor(widthNum/25)}>
                                                                        {modul.team.join(", ")}
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
                                                    </TouchableHighlight>
                                                )
                                            })}
                                        </View>

                                        <View style={{
                                            width: "100%",
                                            height: hoursToMap.length * 60 + (110 + 81) + 60
                                        }} />
                                    </>
                                )}
                            </View>
                            }
                        </ScrollView>
                    }

                    <View style={{
                        width: "100%",
                        height: "100%",

                        position: "absolute",
                        pointerEvents: "none",
                        overflow: "hidden",

                        zIndex: 50,
                    }}>
                        <Animated.View style={{
                            position: "absolute",
                            top: "25%",
                            left: -77,

                            width: 75,
                            height: 75,

                            transform: [{translateX: pan.x.interpolate({
                                inputRange: [0, width],
                                outputRange: [0, 75 * 2],
                            }) }],

                            backgroundColor: theme.ACCENT_BLACK,
                            opacity: 1,
                            borderRadius: 75,

                            display: "flex",
                            alignItems: "flex-end",

                            zIndex: 50,
                        }}>
                            <View style={{
                                width: "50%",
                                height: "100%",

                                borderRadius: 75,

                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                <ArrowLeftIcon size={20} color={theme.WHITE} />
                            </View>
                        </Animated.View>

                        <Animated.View style={{
                            position: "absolute",
                            top: "25%",
                            right: -77,

                            width: 75,
                            height: 75,

                            transform: [{translateX: pan.x.interpolate({
                                inputRange: [0, width],
                                outputRange: [0, 75 * 2],
                            }) }],

                            backgroundColor: theme.ACCENT_BLACK,
                            borderRadius: 75,

                            display: "flex",
                            alignItems: "flex-start",

                            zIndex: 50,
                        }}>
                            <View style={{
                                width: "50%",
                                height: "100%",

                                borderRadius: 75,

                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                <ArrowRightIcon size={20} color={theme.WHITE} />
                            </View>
                        </Animated.View>
                    </View>

                </View>
            </View>

            {rateLimited && <RateLimit paddingTop={45} />}
            {!isConnected && noConnectionUIError}
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

        paddingBottom: 5,
        paddingTop: 5,
    },
})