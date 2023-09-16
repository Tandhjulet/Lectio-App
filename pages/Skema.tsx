import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { useEffect, useState } from "react";
import { getSkema, getWeekNumber } from "../modules/api/scraper/Scraper";
import { getUnsecure, isAuthorized } from "../modules/api/Authentication";
import { Day, Modul } from "../modules/api/scraper/SkemaScraper";
import COLORS from "../modules/Themes";
import { BackwardIcon, ChatBubbleBottomCenterTextIcon, ClipboardDocumentListIcon, InboxStackIcon, PuzzlePieceIcon } from "react-native-heroicons/solid";
import getDaysOfCurrentWeek, { WeekDay, getDay, getNextWeek, getPrevWeek } from "../modules/Date";
import GestureRecognizer from 'react-native-swipe-gestures';

function differenceBetweenDates(date1: Date, date2: Date) {
    const hours = date1.getHours() - date2.getHours();
    const minutes = date1.getMinutes() - date2.getMinutes();

    const out = minutes + hours*60;
    if (out <= 70) {
        return 70;
    }

    return out;
}
function Module({ moduler, index }: {
    moduler: Modul[]
    index: number
}): JSX.Element {
    const calcColor = (opacity: number, modul: Modul) => (modul.changed || modul.cancelled) ? (modul.changed ? `rgba(255, 255, 0, ${opacity})` : `rgba(255, 0, 34, ${opacity})`) : `rgba(34, 255, 0, ${opacity})`;

    return (
        <View style={{
            marginTop: 30,
            display: 'flex',

            position: 'relative'
        }}>
            <View style={{
                position: 'absolute',

                height: "100%",

                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <View style={{
                    paddingVertical: 7.5,

                    paddingLeft: 30,
                    paddingRight: 7.5,

                    backgroundColor: COLORS.LIGHT,

                    borderBottomRightRadius: 10,
                    borderTopRightRadius: 10,
                }}>
                    <Text style={{
                        color: COLORS.WHITE,
                        fontWeight: "bold",

                        opacity: 0.9,
                    }}>
                        {index + 1}.
                    </Text>
                </View>
            </View>

            <View style={{
                display: 'flex',
                flexDirection: 'row',

                alignItems: 'center',
                maxWidth: '100%',

                marginHorizontal: 10,
                gap: 10,
            }}>
                <Text style={{
                    color: COLORS.ACCENT,
                }}>
                    {moduler[moduler.length - 1].timeSpan.endDate.getHours().toString().padStart(2, "0")}:{moduler[moduler.length - 1].timeSpan.endDate.getMinutes().toString().padStart(2, "0")}
                </Text>

                <View style={{
                    borderBottomColor: COLORS.DARK,
                    borderBottomWidth: 1,

                    borderRadius: 5,
                    flex: 1,
                }}/>
            </View>

            <View style={{
                display: 'flex',
                flexDirection: 'row',

                marginLeft: 40 + (10 * 2) + 5,
                marginRight: 15,
                marginVertical: -15,

                zIndex: 5,
                
                gap: 10,
            }}>
                {moduler.map((modul: Modul) => {
                    return (
                        <View key={moduler.indexOf(modul)} style={{
                            backgroundColor: calcColor(0.5, modul),
                            borderRadius: 5,
                            opacity: 0.8,
            
                            paddingHorizontal: 10,
                            paddingVertical: 10,
            
                            display: 'flex',

                            position: 'relative',
                            
                            flexGrow: 1,
                            flexBasis: 0,
            
                            height: differenceBetweenDates(modul.timeSpan.startDate, modul.timeSpan.endDate),
                            overflow: "hidden",
                        }}>
                            <View style={{
                                position: 'absolute',
                                backgroundColor: calcColor(1, modul),

                                minHeight: differenceBetweenDates(modul.timeSpan.startDate, modul.timeSpan.endDate),
                                width: 4,

                                left: 0,
                            }} />

                            <Text style={{
                                color: calcColor(1, modul),
                                fontWeight: "bold",
                                fontSize: 12.5,
                            }}>
                                {modul.lokale}
                            </Text>
                            
                            <Text style={{
                                color: calcColor(1, modul),
                                fontWeight: "bold",
                                fontSize: 15,
                            }}>
                                {modul.teacher.length == 0 ? modul.team : (modul.team + " - " + modul.teacher.join(", "))}
                            </Text>
            
                            <View style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: 5,
                            }}>
                                {modul.comment ?
                                    <ChatBubbleBottomCenterTextIcon style={{
                                        marginTop: 5,
                                    }} color={calcColor(1, modul)} />
                                : null}
            
                                {modul.homework ?
                                    <InboxStackIcon style={{
                                        marginTop: 5,
                                    }} color={calcColor(1, modul)} />
                                : null}
                                
                            </View>
                        </View>
                    )
                })}
            </View>
            

            <View style={{
                display: 'flex',
                flexDirection: 'row',

                alignItems: 'center',
                maxWidth: '100%',

                marginHorizontal: 10,
                gap: 10,
            }}>
                <Text style={{
                    color: COLORS.ACCENT,
                }}>
                    {moduler[moduler.length - 1].timeSpan.startDate.getHours().toString().padStart(2, "0")}:{moduler[moduler.length - 1].timeSpan.startDate.getMinutes().toString().padStart(2, "0")}
                </Text>

                <View style={{
                    borderBottomColor: COLORS.DARK,
                    borderBottomWidth: 1,

                    borderRadius: 5,
                    flex: 1,
                }} />

            </View>
        </View>
    )
}

export default function Skema({ navigation }: {
    navigation: any,
}) {
    const [ dayNum, setDayNum ] = useState<number>((getDay(new Date()).weekDayNumber));

    const [ selectedDay, setSelectedDay ] = useState<Date>(new Date());

    const [ daysOfWeek, setDaysOfWeek ] = useState<WeekDay[]>([]);
    const [ loadWeekDate, setLoadWeekDate ] = useState<Date>(new Date());

    const [ loadDate, setLoadDate ] = useState<Date>(new Date());

    const [ skema, setSkema ] = useState<Day[]>([]);
    const [ loading, setLoading ] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);

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

    useEffect(() => {
        setLoading(true);

        (async () => {
            const gymNummer = (await getUnsecure("gym")).gymNummer;

            setLoadWeekDate(loadDate);
            setDaysOfWeek(getDaysOfCurrentWeek(loadDate));

            getSkema(gymNummer, loadDate).then((skema) => {
                setSkema(skema)
                setLoading(false);
            })
        })();

    }, [loadDate])

    const dateCompare = (d1: Date, d2: Date) => {
        return (d1.getMonth() == d2.getMonth() &&
                d1.getDate() == d2.getDate() &&
                d1.getFullYear() == d2.getFullYear())
    }

    return (
    <>
        <View style={{
            paddingTop: 50,
    
            backgroundColor: COLORS.BLACK,

            display: 'flex',
            flexDirection: 'row',

            maxWidth: "100%",
        }}>
            <View style={{
                paddingHorizontal: 20,
            }}>

                <Text style={{
                    fontSize: 20,
                    color: COLORS.LIGHT,
                }}>Godmorgen, Mads</Text>

                <Text style={{
                    fontSize: 30,
                    fontWeight: "bold",
                    color: COLORS.WHITE,
                }}>Uge {getWeekNumber(loadWeekDate)}</Text>
            </View>
            <View style={{
                display: 'flex',
                flexDirection: 'row',

                gap: 20,

                width: '100%',

                justifyContent: 'center',
                alignItems: 'center',

                transform: [{
                    translateX: -70,
                }]
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
                    if(skema[dayNum-2] == undefined || skema[dayNum-2].skemaNoter == "")
                        return;

                    setModalVisible(true)
                }}>
                    <View style={{
                        backgroundColor: COLORS.LIGHT,
                        padding: 5,
                        borderRadius: 12.5,

                        opacity: (skema[dayNum-2] == undefined || skema[dayNum-2].skemaNoter == "") ? 0.5 : 1,
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
                                    {skema[dayNum - 2] != undefined && skema[dayNum - 2].skemaNoter}
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

        <GestureRecognizer onSwipeLeft={() => daySelector("ADD")} onSwipeRight={() => daySelector("REMOVE")}>
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
                    <ScrollView>
                        {skema[dayNum - 1] == undefined ? (
                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                flexDirection: 'column-reverse',

                                minHeight: '40%',

                                gap: 20,
                            }}>
                                <Text style={{
                                    color: COLORS.ACCENT,
                                    textAlign: 'center'
                                }}>
                                    Du har ingen moduler.
                                    {"\n"}
                                    Nyd din dag!
                                </Text>

                            </View>
                        )
                        :
                        <>
                            {skema[dayNum - 1].sortedKeys.map((index: string, i: number) => {
                                const moduler: Modul[] = skema[dayNum - 1].moduler[index];

                                return (
                                    <Module key={index.toString()} moduler={moduler} index={i} /> 
                                )
                            })}
                        </>
                        }

                        <View style={{
                            marginVertical: 80,
                        }} />
                    </ScrollView>
                }
            </View>
        </GestureRecognizer>

        <NavigationBar currentTab={"Skema"} navigation={navigation} />
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