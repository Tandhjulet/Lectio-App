import { NavigationProp, RouteProp } from "@react-navigation/native";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useColorScheme } from "react-native";
import { hexToRgb, themes } from "../../modules/Themes";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Modul, replaceHTMLEntities } from "../../modules/api/scraper/SkemaScraper";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { getProfile, scrapeHold } from "../../modules/api/scraper/Scraper";
import { secureGet, getUnsecure } from "../../modules/api/helpers/Storage";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import { Hold } from "../../modules/api/scraper/hold/HoldScraper";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { CLEAN_NAME } from "../beskeder/BeskedView";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { UserIcon } from "react-native-heroicons/solid";
import { SCHEMA_SEP_CHAR } from "../../modules/Config";
import UserCell from "../../components/UserCell";
import { StackNavigationProp } from "@react-navigation/stack";
import { MapPinIcon } from "react-native-heroicons/outline";

/**
 * 
 * @param modul modul
 * @returns the status of the module
 */
const getStatus = (modul: Modul) => {
    if(modul.cancelled)
        return "Aflyst";
    if(modul.changed)
        return "Ændret"
    return "Normal"
}

export default function ModulView({ navigation, route }: {
    navigation: StackNavigationProp<any>,
    route: RouteProp<any>
}) {
    const modul: Modul = route.params?.modul;

    const [members, setMembers] = useState<{ [id: string]: Person }>({})
    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();

    const [loading, setLoading] = useState<boolean>(true)
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const UCell = UserCell().Cell;

    /**
     * Fetches the teacher and the students of the module on page load
     */
    useEffect(() => {
        setLoading(true);

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await secureGet("gym")
            setGym(gym);

            if(modul.teamId && modul.team.length == 1) {
                scrapeHold(modul.teamId, gym.gymNummer, true).then((v) => {
                    if(v == null)
                        setMembers({})
                    else
                        setMembers(v)
                    setLoading(false);
                })
            } else {
                setLoading(false);
            }
        })();
    }, [])

    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            if(gym == null) {
                setRefreshing(false);
                return;
            }
            if(modul.teamId && modul.team.length == 1) {
                scrapeHold(modul.teamId, gym.gymNummer, true).then((v) => {
                    if(v == null)
                        setMembers({})
                    else
                        setMembers(v)
                    setRefreshing(false);
                })
            } else {
                setRefreshing(false);
            }
        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    if(modul == null)
        return <></>;

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View style={{
            minHeight: '100%',
            minWidth:'100%',
        }}>
            <ScrollView refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                <TableView style={{
                    marginHorizontal: 20,
                }}>
                    <Section header={"INFORMATION"} roundedCorners={true} hideSurroundingSeparators={true}>
                        <Cell
                            cellContentView={
                                <View style={{
                                    width: "100%",

                                    flexDirection: "column",
                                    paddingBottom: 20,

                                    gap: 10,
                                }}>
                                    <View style={{
                                        marginVertical: 15,
                                        alignItems: "center",
                                    }}>
                                        <Text style={{
                                            color: hexToRgb(theme.WHITE.toString(), 0.7),
                                            textAlign: "center",
                                            fontSize: 15,

                                            fontWeight: modul.title ? "normal" : "900"
                                        }}>
                                            {modul.team.join(", ")}
                                        </Text>

                                        {modul.title && (
                                            <Text style={{
                                                fontWeight: "900",
                                                fontSize: 15,
                                                color: theme.WHITE,
                                                textAlign: "center",
                                            }}>
                                                {modul.title}
                                            </Text>
                                        )}

                                        <View style={{
                                            flexDirection: "column",
                                            marginTop: 10,

                                            alignItems: "center",
                                        }}>
                                            <MapPinIcon color={theme.WHITE} />

                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {modul.lokale}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        paddingHorizontal: 30,
                                    }}>
                                        <View style={{
                                            flexDirection: "column",
                                        }}>
                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                fontWeight: "bold",
                                                textAlign: "left",

                                                fontSize: 15,
                                            }}>
                                                Start
                                            </Text>

                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 1),
                                                textAlign: "left",

                                                fontSize: 16,
                                            }}>
                                                {modul.timeSpan.start}
                                            </Text>
                                        </View>

                                        <View style={{
                                            flexDirection: "column",
                                        }}>
                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                fontWeight: "bold",
                                                textAlign: "right",
                                            }}>
                                                Slut
                                            </Text>

                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 1),
                                                textAlign: "right",

                                                fontSize: 16,
                                            }}>
                                                {modul.timeSpan.end}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        paddingHorizontal: 30,
                                    }}>
                                        <View style={{
                                            flexDirection: "column",
                                        }}>
                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                fontWeight: "bold",
                                                textAlign: "left",

                                                fontSize: 15,
                                            }}>
                                                Status
                                            </Text>

                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 1),
                                                textAlign: "left",

                                                fontSize: 16,
                                            }}>
                                                {getStatus(modul)}
                                            </Text>
                                        </View>

                                        <View style={{
                                            flexDirection: "column",
                                        }}>
                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                fontWeight: "bold",
                                                textAlign: "right",
                                            }}>
                                                Lektier
                                            </Text>

                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 1),
                                                textAlign: "right",

                                                fontSize: 16,
                                            }}>
                                                {modul.homework ? "Ja" : "Nej"}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    {modul.note && (
                                        <View style={{
                                            paddingHorizontal: 20,
                                            marginTop: 10,
                                        }}>
                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                <Text style={{
                                                    color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                }}>
                                                    Note:
                                                </Text>

                                                {" "}{modul.note}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            }
                            hideSeparator
                        />
                    </Section>

                    {modul.homework && modul.lektier != undefined &&
                        <Section header="LEKTIER" roundedCorners={true} hideSurroundingSeparators={true}>
                            {modul.lektier?.map((lektie: string, index: number) => {
                                return (
                                    <Cell 
                                        key={index}
                                        cellStyle="Basic"

                                        cellContentView={
                                            <Text style={{
                                                color: theme.WHITE,
                                                paddingVertical: 8,
                                                fontSize: 16,
                                            }}>
                                                {replaceHTMLEntities(lektie)}
                                            </Text>
                                        }
                                    />)
                            })}
                        </Section>
                    }

                    {modul.extra && (
                        <Section header="ØVRIGT INDHOLD" roundedCorners hideSurroundingSeparators>
                            {modul.extra?.map((lektie: string, index: number) => {
                                return (
                                    <Cell 
                                        key={index}
                                        cellStyle="Basic"

                                        cellContentView={
                                            <Text style={{
                                                color: theme.WHITE,
                                                paddingVertical: 8,
                                                fontSize: 16,
                                            }}>
                                                {replaceHTMLEntities(lektie)}
                                            </Text>
                                        }
                                    />)
                            })}
                        </Section>
                    )}

                    {loading ?
                        <ActivityIndicator size={"small"} color={theme.WHITE} style={{
                            paddingTop: 20,
                        }} />
                    :
                        <>
                            {Object.keys(members).length > 0 &&
                                <Section header="MEDLEMMER" roundedCorners={true} hideSurroundingSeparators={true}>
                                    {Object.values(members).map((person: Person, index: number) => (
                                        <Cell
                                            key={index}
                                            cellContentView={(
                                                <UCell item={person} gym={gym} theme={theme} route={route} />
                                            )}
                                        />
                                    ))}
                                </Section>
                            }
                        </>
                    }

                    <View style={{
                        paddingVertical: 100,
                    }} />
                </TableView>
            </ScrollView>
        </View>
    )
}