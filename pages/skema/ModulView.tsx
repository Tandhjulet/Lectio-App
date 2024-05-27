import { NavigationProp, RouteProp } from "@react-navigation/native";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useColorScheme } from "react-native";
import { themes } from "../../modules/Themes";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Modul, replaceHTMLEntities } from "../../modules/api/scraper/SkemaScraper";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { getProfile, scrapeHold } from "../../modules/api/scraper/Scraper";
import { secureGet, getUnsecure } from "../../modules/api/Authentication";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import { Hold } from "../../modules/api/scraper/hold/HoldScraper";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { CLEAN_NAME } from "../beskeder/BeskedView";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { UserIcon } from "react-native-heroicons/solid";
import { SCHEMA_SEP_CHAR } from "../../modules/Config";
import UserCell from "../../components/UserCell";
import { StackNavigationProp } from "@react-navigation/stack";

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
                        {modul.title && (
                            <Cell
                                cellStyle="RightDetail"
                                title="Titel"
                                detail={modul.title}
                                
                                detailTextStyle={{
                                    maxWidth: "80%",
                                }}
                            />
                        )}

                        <Cell
                            cellStyle="RightDetail"
                            title="Hold"
                            detail={modul.team.join(", ")}

                            detailTextStyle={{
                                maxWidth: "80%",
                            }}
                        />

                        {modul.lokale.replace("...", "").replace(SCHEMA_SEP_CHAR, "").trim().length > 0 && (
                            <Cell
                                cellStyle="RightDetail"
                                title="Lokale"
                                detail={modul.lokale.replace("...", "").replace(SCHEMA_SEP_CHAR, "").trim()}

                                detailTextStyle={{
                                    maxWidth: "80%",
                                }}
                            />
                        )}

                        <Cell
                            cellStyle="RightDetail"
                            title="Start"
                            detail={modul.timeSpan.start}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Slut"
                            detail={modul.timeSpan.end} 
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Status"
                            detail={getStatus(modul)}

                            detailTextStyle={{
                                maxWidth: "80%",
                            }}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Lektier"
                            detail={modul.homework ? "Ja" : "Nej"}

                            detailTextStyle={{
                                fontWeight: "bold",
                            }}
                        />

                        {modul.note != undefined &&
                            <Cell
                                contentContainerStyle={{
                                    display: 'flex',
                                    flexDirection: 'column',

                                    alignItems: "flex-start",
                                    paddingBottom: 10,
                                }}
                                cellContentView={
                                    <>
                                        <Text style={{
                                            color: scheme === "dark" ? "#fff" : "#000",
                                            paddingBottom: 5,
                                            paddingTop: 8,
                                            fontSize: 16,
                                        }}>
                                            Note
                                        </Text>
                                        <Text style={{
                                            color: theme.WHITE,
                                        }}>
                                            {modul.note}
                                        </Text>
                                    </>
                                }
                            />
                        }
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
                                                <UCell item={person} gym={gym} navigation={navigation} theme={theme} />
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