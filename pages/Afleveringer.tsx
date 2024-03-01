import { NavigationProp } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ColorSchemeName, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View, useColorScheme } from "react-native";
import { secureGet, getUnsecure } from "../modules/api/Authentication";
import { getAfleveringer } from "../modules/api/scraper/Scraper";
import { Opgave, STATUS } from "../modules/api/scraper/OpgaveScraper";
import { Theme, hexToRgb, themes } from "../modules/Themes";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { AdjustmentsVerticalIcon, ChevronRightIcon } from "react-native-heroicons/solid";
import RateLimit from "../components/RateLimit";
import Logo from "../components/Logo";

/**
 * Formats the dates weekday as text.
 * E.g 07/01/2024 => "Søndag"
 * @param date date to format
 * @returns a weekday text
 */
export const formatDate = (date: Date) => {
    const weekday = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
    const dateName = weekday[date.getDay()];

    return dateName + " " + date.getDate() + "/" + (date.getMonth()+1);
}

/**
 * Formats assignments to a dict by their date.
 * @param data data to format
 * @returns formatted data
 */
const formatData = (data: Opgave[] | null) => {
    const out: {[id:string]: Opgave[]} = {}

    data?.forEach((opgave) => {
        if(!(formatDate(new Date(opgave.date)) in out)) {
            out[formatDate(new Date(opgave.date))] = [];
        }

        out[formatDate(new Date(opgave.date))].push(opgave)
    })

    return out;
}

/**
 * 
 * @param date a date of an assignment
 * @returns a text depending on how long there is until the assignment is due
 */
const countdown = (date: Date): string => {
    const diff = date.valueOf() - new Date().valueOf();
    const days = Math.floor(diff / (1000*60*60*24));
    if(diff <= 0 || days > 10)
        return formatDate(date) + " kl. " + date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0");

    const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));

    const out: string[] = [];
    if(days > 0)
        out.push(days == 1 ? days + " dag" : days + " dage")

    if(hours > 0)
        out.push(hours == 1 ? hours + " time" : hours + " timer")

    return out.join(" og ")
}

/**
 * Calculates color from a linear gradient ([255,0,0] to [255,252,0]) 
 * depending on how soon the assignment is due. If the assignment is due in more than 14 days it will
 * return white.
 * @param date date to calculate color from
 * @returns a color
 */
const calculateColor = (date: Date, theme: ColorSchemeName) => {
    const COLOR1 = [255, 0, 0]
    const COLOR2 = [255, 252, 0]

    const diff = date.valueOf() - new Date().valueOf();
    const hours = Math.floor(diff / (1000*60*60));
    if(hours > 24*14 || hours < 0)
        return theme == "dark" ? themes.dark.WHITE : hexToRgb(themes.light.WHITE.toString(), 0.6);


    const percent = hours/(24*14)

    const res = [
        COLOR1[0] + percent * (COLOR2[0] - COLOR1[0]),
        COLOR1[1] + percent * (COLOR2[1] - COLOR1[1]),
        COLOR1[2] + percent * (COLOR2[2] - COLOR1[2]),
                ]

    return `rgb(${res[0]}, ${res[1]}, ${res[2]})`;
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
            case STATUS.VENTER:
                out.venter += 1
                break;
            case STATUS.AFLEVERET:
                out.afleveret += 1
                break;
            case STATUS.IKKE_AFLEVERET:
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
const filterData = (data: {
    [id: string]: Opgave[];
}, filter: STATUS | "ALL") => {
    const out: {
        [id: string]: Opgave[];
    } = {};

    Object.keys(data).forEach((dato: string) => {
        data[dato].forEach((opgave) => {
            if(opgave.status == filter || filter == "ALL") {
                if(out[dato] == null)
                    out[dato] = []

                out[dato].push(opgave)
            }
        })
    })

    return out;
}

export default function Afleveringer({ navigation }: {navigation: NavigationProp<any>}) {
    const [afleveringer, setAfleveringer] = useState<{
        [id: string]: Opgave[];
    }>({})
    const [rawAfleveringer, setRawAfleveringer] = useState<{
        [id: string]: Opgave[];
    }>({})

    const [ opgaveCount, setOpgaveCount ] = useState<{
        alle: number,
        venter: number,
        mangler: number,
        afleveret: number,
    }>()
    const [ sortedBy, setSortedBy ] = useState<string>("Venter");

    const [loading, setLoading] = useState<boolean>(false)
    const [rateLimited, setRateLimited] = useState<boolean>(false)

    const [modalVisible, setModalVisible] = useState<boolean>(false);

    const [refreshing, setRefreshing] = useState<boolean>(false);

    /**
     * Renders the filter-button
     */
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{

                }}>
                    <Pressable
                        onPress={() => {
                            setModalVisible(true)
                        }}
                        style={{
                            padding: 4,

                            backgroundColor: "rgba(0,122,255,0.2)",
                            borderRadius: 100,
                        }}>
                            <View style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                            }}>
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
                            </View>
                    </Pressable>

                    <Modal
                        transparent
                        visible={modalVisible}
                        onRequestClose={() => {
                            setModalVisible(!modalVisible)
                        }}
                        style={{
                            position: "relative",

                            bottom: 0,
                            right: 0,
                        }}
                    >
                        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                            <View style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)'
                            }} />
                        </TouchableWithoutFeedback>

                        <View style={{
                            position: "absolute",
                            right: 50,
                            top: 50,

                            borderRadius: 7.5,
                            backgroundColor: theme.BLACK,

                            paddingVertical: 10,
                        }}>
                            <Pressable onPress={() => {
                                setModalVisible(false);
                                setAfleveringer(filterData(rawAfleveringer, "ALL"))
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
                            </Pressable>
                            <View style={{
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.WHITE,
                                opacity: 0.6,

                                marginHorizontal: 10,
                                marginVertical: 5,
                            }} />

                            <Pressable onPress={() => {
                                setModalVisible(false);
                                setAfleveringer(filterData(rawAfleveringer, STATUS.VENTER))
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
                            </Pressable>
                            <View style={{
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.WHITE,
                                opacity: 0.6,

                                marginHorizontal: 10,
                                marginVertical: 5,
                            }} />

                            <Pressable onPress={() => {
                                setModalVisible(false);
                                setAfleveringer(filterData(rawAfleveringer, STATUS.AFLEVERET))
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
                            </Pressable>
                            <View style={{
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.WHITE,
                                opacity: 0.6,

                                marginHorizontal: 10,
                                marginVertical: 5,
                            }} />

                            <Pressable onPress={() => {
                                setModalVisible(false);
                                setAfleveringer(filterData(rawAfleveringer, STATUS.IKKE_AFLEVERET))
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
                            </Pressable>
                        </View>
                    </Modal>
                </View>
            )
        })
    }, [navigation, modalVisible])

    /**
     * Fetches the assignments on page load
     */
    useEffect(() => {
        (async () => {
            setLoading(true);

            const gymNummer = (await secureGet("gym")).gymNummer;

            getAfleveringer(gymNummer).then(({payload, rateLimited}): any => {
                setOpgaveCount(countOpgaver(payload));

                const formattedData = formatData(payload);

                setRawAfleveringer(formattedData)
                setAfleveringer(filterData(formattedData, STATUS.VENTER))
                setRateLimited(rateLimited)
                setLoading(false);
            })
        })();
    }, [])
    
    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const gymNummer = (await secureGet("gym")).gymNummer;

            getAfleveringer(gymNummer, true).then(({payload, rateLimited}): any => {
                setOpgaveCount(countOpgaver(payload));

                const formattedData = formatData(payload);

                setRawAfleveringer(formattedData)
                setAfleveringer(filterData(formattedData, STATUS.VENTER))
                setRateLimited(rateLimited)
                
                setRefreshing(false);
            })
        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);


    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

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
                <ScrollView refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }>
                    <TableView>
                        {Object.keys(afleveringer).length == 0 && (
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
                                        `Du har ingen opgaver der ${sortedBy == "Afleveret" && "er "}${sortedBy.toLowerCase()}.`
                                    }
                                </Text>
                                <Logo size={40} />
                            </View>
                        )}

                        {Object.keys(afleveringer).map((dato) => (
                            <Section
                                key={dato}
                                header={dato}

                                hideSurroundingSeparators={true}
                            >
                                {afleveringer[dato].map((opgave, index) => (
                                    <Cell
                                        key={index}

                                        cellContentView={
                                            <View style={{
                                                position: "relative",

                                                width: "100%",
                                            }}>
                                                <View style={{
                                                    position: "absolute",
                                                    left: -15,

                                                    height: "100%",
                                                    width: 7.5,

                                                    paddingVertical: 5,
                                                }}>
                                                    <View style={{
                                                        backgroundColor: calculateColor(new Date(opgave.date), scheme),
                                                        height: "100%",
                                                        width: 7.5,

                                                        marginLeft: -2,

                                                        borderTopRightRadius: 50,
                                                        borderBottomRightRadius: 50,
                                                    }}>

                                                    </View>
                                                </View>

                                                <View style={{
                                                    display: "flex",
                                                    flexDirection: "row",

                                                    width: "100%",
                                                    justifyContent: "space-between"
                                                }}>
                                                    <View style={{
                                                        display: "flex",
                                                        flexDirection: "column",

                                                        gap: 4,
                                                        marginVertical: 7.5,
                                                    }}>
                                                        <Text 
                                                            numberOfLines={1}
                                                            ellipsizeMode="tail"
                                                            style={{
                                                                color: theme.WHITE,
                                                                fontSize: 15,
                                                                fontWeight: "bold",
                                                            }}>
                                                            {opgave.title}
                                                        </Text>
                                                        <Text style={{
                                                            color: theme.ACCENT,
                                                        }}>
                                                            {opgave.team}
                                                        </Text>

                                                        <Text style={{
                                                            color: theme.WHITE,
                                                        }}>
                                                            {countdown(new Date(opgave.date))}
                                                        </Text>
                                                    </View>

                                                    <View style={{
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}>
                                                        <ChevronRightIcon
                                                            color={theme.ACCENT}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        }

                                        onPress={() => {
                                            navigation.navigate("AfleveringView", {
                                                opgave: opgave,
                                            })
                                        }}
                                    />
                                ))}
                            </Section>
                        ))}

                        <View 
                            style={{
                                paddingVertical: 100,
                            }}
                        />
                    </TableView>
                </ScrollView>
            }

            {rateLimited && <RateLimit />}
        </View>
    )
}