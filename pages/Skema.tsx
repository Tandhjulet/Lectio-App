import { ActivityIndicator, DimensionValue, LogBox, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { useCallback, useEffect, useState } from "react";
import { Profile, getProfile, getSkema, getWeekNumber } from "../modules/api/scraper/Scraper";
import { getUnsecure, isAuthorized } from "../modules/api/Authentication";
import { Day, Modul, ModulDate } from "../modules/api/scraper/SkemaScraper";
import COLORS, { hexToRgb } from "../modules/Themes";
import { AcademicCapIcon, BackwardIcon, ChatBubbleBottomCenterTextIcon, ClipboardDocumentListIcon, InboxStackIcon, PuzzlePieceIcon } from "react-native-heroicons/solid";
import getDaysOfCurrentWeek, { WeekDay, getDay, getNextWeek, getPrevWeek } from "../modules/Date";
import GestureRecognizer from 'react-native-swipe-gestures';
import { getPeople } from "../modules/api/scraper/class/PeopleList";
import { NavigationProp } from "@react-navigation/native";
import RateLimit from "../components/RateLimit";
import { Key, getSaved } from "../modules/api/storage/Storage";

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

function formatDate(dateString: string) {
    const padded = dateString.padStart(4, "0");
    const minutes = padded.slice(2);
    const hours = padded.slice(0,2);

    const date = new Date();
    date.setMinutes(parseInt(minutes));
    date.setHours(parseInt(hours));

    return date;
}

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

export default function Skema({ navigation }: {
    navigation: NavigationProp<any>,
}) {
    const calcColor = (opacity: number, modul: Modul) => (modul.changed || modul.cancelled) ? (modul.changed ? `rgba(207, 207, 0, ${opacity})` : `rgba(201, 32, 32, ${opacity})`) : `rgba(31, 222, 34, ${opacity})`;

    const [refreshing, setRefreshing] = useState(false);

    const [ dayNum, setDayNum ] = useState<number>((getDay(new Date()).weekDayNumber));

    const [ selectedDay, setSelectedDay ] = useState<Date>(new Date());

    const [ daysOfWeek, setDaysOfWeek ] = useState<WeekDay[]>([]);
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

    const [modalVisible, setModalVisible] = useState(false);
    const [rateLimited, setRateLimited] = useState(false);

    const [ profile, setProfile ] = useState<Profile>();

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
            }
            
            return copy;
        });
    }

    function parseSkema(skema: Day[]) {
        if(skema == null)
            return;

        const out = calculateIntersects(skema[dayNum - 1].moduler)
        const depthAssigned = assignDepth(out);

        const flattened = flatten(depthAssigned);

        setDay(flattened);
    }

    useEffect(() => {
        (async () => {
            const saved = await getSaved(Key.SKEMA, getWeekNumber(loadDate).toString());
            let hasCache = false;
            if(saved.valid && saved.value != null) {
                setSkema(saved.value.days);
                setModulTimings(saved.value.modul);
                hasCache = true;
            } else {
                setLoading(true);
            }

            const gymNummer = (await getUnsecure("gym")).gymNummer;

            setLoadWeekDate(loadDate);
            setDaysOfWeek(getDaysOfCurrentWeek(loadDate));
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
                setRateLimited(rateLimited)
            })
        })();

    }, [loadDate])

    useEffect(() => {
        if(refreshing == false) 
            return;
        
        (async () => {
            const gymNummer = (await getUnsecure("gym")).gymNummer;
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

    const dateCompare = (d1: Date, d2: Date) => {
        return (d1.getMonth() == d2.getMonth() &&
                d1.getDate() == d2.getDate() &&
                d1.getFullYear() == d2.getFullYear())
    }

    function calculateTop(date: ModulDate) {
        const min: Date = formatDate(date.startNum.toString())
        const out = ((min.getHours() - Math.min(...hoursToMap))*60 + min.getMinutes());
        return (out == Infinity || out == -Infinity) ? 0 : out;
    }

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

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    return (
    <>
        <View style={{
            paddingTop: 50,
    
            backgroundColor: COLORS.BLACK,

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

                    if((getWeekNumber(loadWeekDate) != getWeekNumber(loadDate)) || dateCompare(selectedDay, new Date()))
                        return;

                    setLoadDate(new Date());
                    setSelectedDay(new Date());
                    setDayNum(getDay(new Date()).weekDayNumber)
                }}>
                    <View style={{
                        backgroundColor: COLORS.LIGHT,
                        padding: 5,
                        borderRadius: 12.5,

                        opacity: (getWeekNumber(loadWeekDate) != getWeekNumber(loadDate) || dateCompare(selectedDay, new Date())) ? 0.5 : 1,
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

        <GestureRecognizer onSwipeLeft={() => {
            //setLoadWeekDate((prev) => {
            //    const prevWeek = getNextWeek(prev);
            //    setDaysOfWeek(getDaysOfCurrentWeek(prevWeek));
            //    return prevWeek;
            //})

            setLoadDate(() => {
                const week = getNextWeek(selectedDay);
                
                setSelectedDay(week);
                return week;
            })
        }} onSwipeRight={() => {
            //setLoadWeekDate((prev) => {
            //    const prevWeek = getPrevWeek(prev);
            //    setDaysOfWeek(getDaysOfCurrentWeek(prevWeek));
            //    return prevWeek;
            //})

            setLoadDate(() => {
                const week = getPrevWeek(selectedDay);

                setSelectedDay(week);
                return week;
            })
        }} style={{
            backgroundColor: COLORS.BLACK,
        }}>
            <View style={{
                display: 'flex',
                justifyContent:'space-between',

                paddingTop: 15,
                flexDirection: 'row',
                width: '100%',

                paddingHorizontal: 20,
                marginBottom: 10,
            }}>
                {daysOfWeek.map(day => {
                    return (
                        <TouchableOpacity key={day.dayName as React.Key} onPress={() => {
                            setDayNum(day.weekDayNumber);
                            setSelectedDay(day.date);
                        }}>
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
                        </TouchableOpacity>
                    )
                })}
            </View>
        </GestureRecognizer>

        <GestureRecognizer 
            onSwipeLeft={() => daySelector("ADD")}
            onSwipeRight={() => daySelector("REMOVE")}
            style={{
                backgroundColor: COLORS.BLACK,
            }}
        >
            <View
                style={{
                    borderTopColor: COLORS.ACCENT,
                    borderTopWidth: 1,

                    borderRadius: 5,

                    marginHorizontal: 20,

                    paddingBottom: 10,
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
                    }>

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
                                    color: COLORS.ACCENT,
                                    textAlign: 'center'
                                }}>
                                    Du har ingen moduler.
                                    {"\n"}
                                    Nyd din dag!
                                </Text>
                                <AcademicCapIcon size={40} color={COLORS.WHITE} />
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

                                        backgroundColor: hexToRgb(COLORS.ACCENT, 0.3),

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
                                                                {modul.lokale.replace("...", "").replace("▪", "").trim()}
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
                                paddingBottom: hoursToMap.length * 60 + 100,
                            }} /> 
                        </View>
                        }
                    </ScrollView>
                }
            </View>
        </GestureRecognizer>

        {rateLimited && <RateLimit />}
    </>
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