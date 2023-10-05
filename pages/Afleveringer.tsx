import { NavigationProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { getUnsecure } from "../modules/api/Authentication";
import { getAfleveringer } from "../modules/api/scraper/Scraper";
import { Opgave, STATUS } from "../modules/api/scraper/OpgaveScraper";
import COLORS from "../modules/Themes";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { ChevronRightIcon } from "react-native-heroicons/solid";

const formatDate = (date: Date) => {
    const weekday = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];
    const dateName = weekday[date.getDay()];

    return dateName + " " + date.getDate() + "/" + (date.getMonth()+1);
}

const formatData = (data: Opgave[] | null) => {
    const out: {[id:string]: Opgave[]} = {}

    data?.forEach((opgave) => {
        if(!(formatDate(opgave.date) in out)) {
            out[formatDate(opgave.date)] = [];
        }

        out[formatDate(opgave.date)].push(opgave)
    })

    return out;
}

const countdown = (date: Date) => {
    const diff = date.valueOf() - new Date().valueOf();
    let out = [];
    if(diff <= 0)
        return formatDate(date) + " kl. " + date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0");

    const days = Math.floor(diff / (1000*60*60*24));
    if(days > 10)
        return formatDate(date) + " kl. " + date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0");

    const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));

    if(days > 0)
        out.push(days == 1 ? days + " dag" : days + " dage")

    if(hours > 0)
        out.push(hours == 1 ? hours + " time" : hours + " timer")

    return out.join(" og ")
}

const calculateColor = (date: Date) => {
    const COLOR1 = [255, 0, 0]
    const COLOR2 = [255, 252, 0]

    const diff = date.valueOf() - new Date().valueOf();
    const hours = Math.floor(diff / (1000*60*60));
    if(hours > 24*14)
        return COLORS.WHITE;


    const percent = hours/(24*14)

    const res = [
        COLOR1[0] + percent * (COLOR2[0] - COLOR1[0]),
        COLOR1[1] + percent * (COLOR2[1] - COLOR1[1]),
        COLOR1[2] + percent * (COLOR2[2] - COLOR1[2]),
                ]

    return `rgb(${res[0]}, ${res[1]}, ${res[2]})`;
}

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
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        (async () => {
            setLoading(true);

            const gymNummer = (await getUnsecure("gym")).gymNummer;

            getAfleveringer(gymNummer).then((data: Opgave[] | null) => {
                const formattedData = formatData(data);

                setRawAfleveringer(formattedData)
                setAfleveringer(filterData(formattedData, STATUS.VENTER))
                setLoading(false);
            })
        })();
    }, [])

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
                    <ActivityIndicator size={"small"} color={COLORS.ACCENT} />
                </View>
            :
                <ScrollView>
                    <TableView>
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
                                                        backgroundColor: calculateColor(opgave.date),
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
                                                                color: COLORS.WHITE,
                                                                fontSize: 15,
                                                                fontWeight: "bold",
                                                            }}>
                                                            {opgave.title}
                                                        </Text>
                                                        <Text style={{
                                                            color: COLORS.ACCENT,
                                                        }}>
                                                            {opgave.team}
                                                        </Text>

                                                        <Text style={{
                                                            color: COLORS.WHITE,
                                                        }}>
                                                            {countdown(opgave.date)}
                                                        </Text>
                                                    </View>

                                                    <View style={{
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                    }}>
                                                        <ChevronRightIcon
                                                            color={COLORS.ACCENT}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        }
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
        </View>
    )
}