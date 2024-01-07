import { NavigationProp, RouteProp } from "@react-navigation/native"
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { Opgave, OpgaveDetails, STATUS } from "../../modules/api/scraper/OpgaveScraper";
import { formatDate } from "../Afleveringer";
import { getAflevering } from "../../modules/api/scraper/Scraper";
import { getUnsecure } from "../../modules/api/Authentication";
import COLORS from "../../modules/Themes";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { CLEAN_NAME } from "../beskeder/BeskedView";
import { UserIcon } from "react-native-heroicons/solid";

export default function AfleveringView({ navigation, route }: {
    navigation: NavigationProp<any>,
    route: RouteProp<any>
}) {
    const [loading, setLoading] = useState<boolean>(true);
    const [opgaveDetails, setOpgaveDetails] = useState<OpgaveDetails | null>();

    const [refreshing, setRefreshing] = useState<boolean>(false);

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();
    const [billedeId, setBilledeId] = useState<string>();

    const aflevering: Opgave = route.params?.opgave;

    /**
     * Fetches the assignment, the teacher and the students
     */
    useEffect(() => {
        setLoading(true);

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await getUnsecure("gym");
            setGym(gym);

            getAflevering(gym.gymNummer, aflevering.id).then(async (v) => {
                setOpgaveDetails(v);

                const people = await getPeople();

                if(people != null && v?.ansvarlig != null)
                    setBilledeId(people[CLEAN_NAME(v.ansvarlig)]?.billedeId)

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
            if(gym == null)
                return;

            getAflevering(gym.gymNummer, aflevering.id, true).then(async (v) => {
                setOpgaveDetails(v);

                const people = await getPeople();

                if(people != null && v?.ansvarlig != null)
                    setBilledeId(people[CLEAN_NAME(v.ansvarlig)]?.billedeId)

                    setRefreshing(false);
            })
        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);
    
    return (
        <View style={{
            minHeight: "100%",
            minWidth: "100%",
        }}>
            <ScrollView refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                <TableView style={{
                    marginHorizontal: 20,
                }}>
                    <Section
                        header="INFORMATION"
                        roundedCorners={true}
                        hideSurroundingSeparators={true}
                    >
                        <Cell
                            cellStyle="RightDetail"
                            title="Titel"
                            detail={aflevering.title}

                            detailTextStyle={{
                                maxWidth: "70%",
                            }}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Team"
                            detail={aflevering.team}

                            detailTextStyle={{
                                maxWidth: "70%",
                            }}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Status"
                            detail={STATUS[aflevering.status]}

                            detailTextStyle={{
                                textTransform: "capitalize",
                                maxWidth: "70%",
                            }}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Fravær"
                            detail={aflevering.absence}

                            detailTextStyle={{
                                maxWidth: "70%",
                            }}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Frist"
                            detail={formatDate(new Date(aflevering.date)) + " kl. " + new Date(aflevering.date).getHours().toString().padStart(2, "0") + ":" + new Date(aflevering.date).getMinutes().toString().padStart(2, "0")}

                            detailTextStyle={{
                                maxWidth: "70%",
                            }}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Elevtid"
                            detail={aflevering.time}

                            detailTextStyle={{
                                maxWidth: "70%",
                            }}
                        />

                        {!loading ?
                            <>
                                {opgaveDetails != null &&
                                    <>
                                        {(opgaveDetails.karakterSkala != null && opgaveDetails.karakterSkala != "Der gives ikke karakter" && opgaveDetails.karakterSkala != "") &&
                                            <>
                                                <Cell
                                                    cellStyle="RightDetail"
                                                    title="Karakter Skala"
                                                    detail={opgaveDetails?.karakterSkala}

                                                    detailTextStyle={{
                                                        maxWidth: "70%",
                                                    }}
                                                />

                                                <View style={{
                                                    height: StyleSheet.hairlineWidth,
                                                    width: "100%",

                                                    backgroundColor: "#2b2b2d",
                                                    marginLeft: 15,
                                                }} />
                                            </>
                                        }

                                        {(opgaveDetails.note != null && opgaveDetails.note != "") &&
                                            <>
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
                                                                color: "#fff",
                                                                paddingBottom: 5,
                                                                paddingTop: 8,
                                                                fontSize: 16,
                                                            }}>
                                                                Note
                                                            </Text>
                                                            <Text style={{
                                                                color: COLORS.WHITE,
                                                            }}>
                                                                {opgaveDetails?.note}
                                                            </Text>
                                                        </>
                                                    }
                                                />

                                                <View style={{
                                                    height: StyleSheet.hairlineWidth,
                                                    width: "100%",

                                                    backgroundColor: "#2b2b2d",
                                                    marginLeft: 15,
                                                }} />
                                            </>
                                        }

                                        {(opgaveDetails.ansvarlig != null && opgaveDetails.ansvarlig != "") &&
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
                                                            color: "#fff",
                                                            paddingBottom: 5,
                                                            paddingTop: 8,
                                                            fontSize: 16,
                                                        }}>
                                                            Ansvarlig
                                                        </Text>
                                                        <View style={{
                                                            display: "flex",
                                                            flexDirection: "row",
                                                            alignItems: "center",

                                                            gap: 10,
                                                        }}>
                                                            {billedeId != null ?
                                                                <Image
                                                                    style={{
                                                                        borderRadius: 100,
                                                                        width: 40,
                                                                        height: 40,
                                                                    }}
                                                                    source={{
                                                                        uri: SCRAPE_URLS(gym?.gymNummer, billedeId).PICTURE_HIGHQUALITY,
                                                                        headers: {
                                                                            "User-Agent": "Mozilla/5.0",
                                                                            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                                                                        },
                                                                    }}
                                                                    crossOrigin="use-credentials"
                                                                />
                                                            :
                                                                <View style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    borderRadius: 100,

                                                                    display: "flex",
                                                                    justifyContent: "center",
                                                                    alignItems: "center",
                                                                }}>
                                                                    <UserIcon color={COLORS.WHITE} />
                                                                </View>
                                                            }
                                                                
                                                            <Text style={{
                                                                color: COLORS.WHITE,
                                                                maxWidth: "80%",
                                                            }} numberOfLines={1}>
                                                                {opgaveDetails?.ansvarlig}
                                                            </Text>
                                                        </View>
                                                    </>
                                                }
                                            />
                                        }
                                    </>
                                }
                            </>
                        :
                            <View style={{
                                marginVertical: 50,
                                width: "100%",
                                display: "flex",

                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                <ActivityIndicator color={COLORS.ACCENT} />
                            </View>
                        }
                    </Section>

                    <View 
                        style={{
                            paddingVertical: 100,
                        }}
                    />
                </TableView>
            </ScrollView>
        </View>
    )
}