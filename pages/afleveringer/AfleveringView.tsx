import { NavigationProp, RouteProp } from "@react-navigation/native"
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { Cell, Section, Separator, TableView } from "react-native-tableview-simple";
import { Opgave, OpgaveDetails, Status } from "../../modules/api/scraper/OpgaveScraper";
import { formatDate } from "../Afleveringer";
import { getAflevering } from "../../modules/api/scraper/Scraper";
import { secureGet, getUnsecure } from "../../modules/api/Authentication";
import { hexToRgb, themes } from "../../modules/Themes";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { CLEAN_NAME } from "../beskeder/BeskedView";
import { UserIcon } from "react-native-heroicons/solid";
import ProfilePicture from "../../components/ProfilePicture";
import File from "../../modules/File";
import FileViewer from "react-native-file-viewer";
import RNFS from "react-native-fs";
import * as Progress from 'react-native-progress';
import { Document } from "../../modules/api/scraper/DocumentScraper";
import { replaceHTMLEntities } from "../../modules/api/scraper/SkemaScraper";

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

        navigation.setOptions({
            title: aflevering.title,
        });

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await secureGet("gym")
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

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const {
        findIcon,
        getUrlExtension,
    } = File()

    const [downloading, setDownloading] = useState<boolean>(false);

    const openFile = useCallback((file: Document) => {
        if(downloading) return;

        setDownloading(true);
        const extension = getUrlExtension(file.fileName);
        const fileURI = RNFS.CachesDirectoryPath + "/tempfile." + extension;

        RNFS.downloadFile({
            fromUrl: replaceHTMLEntities(file.url),
            toFile: fileURI,
            cacheable: true,

            discretionary: true,
            background: false,
        }).promise.then(async () => {
            await FileViewer.open(fileURI, {
                displayName: file.fileName,
                showAppsSuggestions: true,
                showOpenWithDialog: true,
            });
            setDownloading(false);
        })
    }, [downloading])

    const {
        width,
        height,
    } = Dimensions.get("screen");
    
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
                            title="Team"
                            detail={aflevering.team}

                            detailTextStyle={{
                                maxWidth: "70%",
                            }}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Status"
                            detail={Status[aflevering.status]}

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
                            <View>
                                {opgaveDetails != null &&
                                    <View>
                                        {opgaveDetails.opgaveBeskrivelse && (
                                            <Cell
                                                cellContentView={
                                                    <View style={{
                                                        display: "flex",
                                                        flexDirection: "column",

                                                        paddingBottom: 10,
                                                    }}>
                                                        <Text style={{
                                                            color: scheme === "dark" ? "#fff" : "#000",
                                                            paddingBottom: 5,
                                                            paddingTop: 8,
                                                            fontSize: 16,
                                                        }}>
                                                            Opgavebeskrivelse
                                                        </Text>

                                                        <View style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 5,
                                                        }}>
                                                            {opgaveDetails.opgaveBeskrivelse?.map((document, i) => (
                                                                <TouchableOpacity style={{
                                                                    display: "flex",
                                                                    flexDirection: "row",
                                                                    alignItems: "center",

                                                                    gap: 7.5,
                                                                }} key={i} onPress={() => {
                                                                    openFile(document)
                                                                }}>
                                                                    {findIcon(getUrlExtension(document.fileName))}
                                                                    
                                                                    <Text
                                                                        style={{
                                                                            color: scheme == "dark" ? "lightblue" : "darkblue",
                                                                            maxWidth: "90%",
                                                                        }}

                                                                        ellipsizeMode="middle"
                                                                        numberOfLines={2}
                                                                    >
                                                                        {document.fileName}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    </View>
                                                }
                                            />
                                        )}

                                        {(opgaveDetails.karakterSkala != null && opgaveDetails.karakterSkala != "Der gives ikke karakter" && opgaveDetails.karakterSkala != "") && opgaveDetails.opgaveBeskrivelse && <Separator />}

                                        {(opgaveDetails.karakterSkala != null && opgaveDetails.karakterSkala != "Der gives ikke karakter" && opgaveDetails.karakterSkala != "") &&
                                            <View>
                                                <Cell
                                                    cellStyle="RightDetail"
                                                    title="Karakter Skala"
                                                    detail={opgaveDetails?.karakterSkala}

                                                    detailTextStyle={{
                                                        maxWidth: "70%",
                                                    }}
                                                />
                                            </View>
                                        }

                                        {(opgaveDetails.karakterSkala != null && opgaveDetails.karakterSkala != "Der gives ikke karakter" && opgaveDetails.karakterSkala != "") && (opgaveDetails.note != null && opgaveDetails.note != "") && <Separator />}

                                        {(opgaveDetails.note != null && opgaveDetails.note != "") &&
                                            <View>
                                                <Cell
                                                    cellContentView={
                                                        <View style={{
                                                            display: "flex",
                                                            flexDirection: "column",

                                                            paddingBottom: 10,
                                                        }}>
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
                                                                {opgaveDetails?.note}
                                                            </Text>
                                                        </View>
                                                    }
                                                />
                                            </View>
                                        }

                                        {!(opgaveDetails.note != null && opgaveDetails.note != "") && (opgaveDetails.ansvarlig != null && opgaveDetails.ansvarlig != "") && (opgaveDetails.karakterSkala != null && opgaveDetails.karakterSkala != "Der gives ikke karakter" && opgaveDetails.karakterSkala != "") && <Separator />}

                                        {(opgaveDetails.note != null && opgaveDetails.note != "") && (opgaveDetails.ansvarlig != null && opgaveDetails.ansvarlig != "") && <Separator />}

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
                                                            color: theme.WHITE,
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
                                                                <ProfilePicture gymNummer={gym?.gymNummer ?? ""} billedeId={billedeId} size={40} navn={opgaveDetails?.ansvarlig} />
                                                            :
                                                                <View style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    borderRadius: 100,

                                                                    display: "flex",
                                                                    justifyContent: "center",
                                                                    alignItems: "center",
                                                                }}>
                                                                    <UserIcon color={theme.WHITE} />
                                                                </View>
                                                            }
                                                                
                                                            <Text style={{
                                                                color: theme.WHITE,
                                                                maxWidth: "80%",
                                                            }} numberOfLines={1}>
                                                                {opgaveDetails?.ansvarlig}
                                                            </Text>
                                                        </View>
                                                    </>
                                                }
                                            />
                                        }
                                    </View>
                                }
                            </View>
                        :
                            <View style={{
                                marginVertical: 50,
                                width: "100%",
                                display: "flex",

                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                <ActivityIndicator color={theme.ACCENT} />
                            </View>
                        }
                    </Section>

                    {((opgaveDetails?.tilbagemedling && (opgaveDetails.tilbagemedling.karakter !== "" || opgaveDetails.tilbagemedling.karakterNote !== "")) || aflevering.elevNote) && (
                        <Section
                            header="TILBAGEMELDING"
                            roundedCorners
                            hideSurroundingSeparators
                        >
                            {opgaveDetails?.tilbagemedling && opgaveDetails.tilbagemedling.karakter !== "" && (
                                <Cell
                                    cellStyle="RightDetail"
                                    title="Karakter"
                                    detail={opgaveDetails.tilbagemedling.karakter}
                                    detailTextStyle={{
                                        fontWeight: "bold",
                                    }}
                                />
                            )}

                            {opgaveDetails?.tilbagemedling && opgaveDetails.tilbagemedling.karakterNote !== "" && (
                                <Cell
                                    cellContentView={
                                        <View style={{
                                            display: "flex",
                                            flexDirection: "column",

                                            paddingBottom: 10,
                                        }}>
                                            <Text style={{
                                                color: scheme === "dark" ? "#fff" : "#000",
                                                paddingBottom: 5,
                                                paddingTop: 8,
                                                fontSize: 16,
                                            }}>
                                                Karakternote
                                            </Text>
                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {opgaveDetails?.tilbagemedling.karakterNote}
                                            </Text>
                                        </View>
                                    }
                                />
                            )}

                            {aflevering.elevNote !== "" && (
                                <Cell
                                    cellContentView={
                                        <View style={{
                                            display: "flex",
                                            flexDirection: "column",

                                            paddingBottom: 10,
                                        }}>
                                            <Text style={{
                                                color: scheme === "dark" ? "#fff" : "#000",
                                                paddingBottom: 5,
                                                paddingTop: 8,
                                                fontSize: 16,
                                            }}>
                                                Elevnote
                                            </Text>
                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {aflevering.elevNote.replace(/\n*(?=\n?$(?!\n))/gm, "")}
                                            </Text>
                                        </View>
                                    }
                                />
                            )}
                        </Section>
                    )}
                    {opgaveDetails?.opgaveIndlæg && opgaveDetails.opgaveIndlæg.length > 0 && (
                        <Section
                            header="OPGAVEINDLÆG"
                            roundedCorners={true}
                            hideSurroundingSeparators={true}
                        >
                            {opgaveDetails.opgaveIndlæg.map((indlæg, i) => {
                                let name;
                                if(indlæg.document) {
                                    const extensionKnown = !(findIcon(getUrlExtension(indlæg.document.fileName)).props.color == hexToRgb(theme.WHITE.toString(), 0.8));
                                    name = extensionKnown ? indlæg.document.fileName.replace(new RegExp("\\." + getUrlExtension(indlæg.document.fileName) + "$"), "") : indlæg.document.fileName;
                                }

                                return (
                                    <Cell
                                        key={i}
                                        cellStyle="Basic"
                                        cellContentView={
                                            <View style={{
                                                paddingVertical: 7.5,
                                            }}>
                                                <View style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    flexDirection: "row",
                                                }}>
                                                    <Text style={{
                                                        color: theme.WHITE.toString(),
                                                        fontWeight: "bold",
                                                        fontSize: 12.5,
                                                    }}>
                                                        {indlæg.byUser}
                                                    </Text>
                                                </View>

                                                {indlæg.comment !== "" && (
                                                    <Text style={{
                                                        color: scheme === "dark" ? "#FFF" : "#000",
                                                    }} >
                                                        {indlæg.comment}
                                                    </Text>
                                                )}
                                                
                                                {indlæg.document && (
                                                    <TouchableOpacity style={{
                                                        display: "flex",
                                                        flexDirection: "row",

                                                        alignItems: "center",

                                                        marginTop: 5,
                                                        marginLeft: -3,
                                                        
                                                        gap: 2.5,
                                                    }} onPress={() => {
                                                        // @ts-ignore
                                                        openFile(indlæg.document)
                                                    }}>
                                                        {findIcon(getUrlExtension(indlæg.document.fileName), 25)}

                                                        <Text style={{
                                                            color: scheme === "dark" ? "lightblue" : "darkblue",
                                                            textDecorationLine: "underline",
                                                        }}>
                                                            {name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        }
                                    />
                                )
                            })}
                        </Section>
                    )}

                    <View 
                        style={{
                            paddingTop: 89,
                        }}
                    />
                </TableView>
            </ScrollView>

            {downloading && (
                <View style={{
                    position: "absolute",
                    height: height / 2,
                    width: width,

                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",

                    pointerEvents: "none",
                }}>
                    <View style={{
                        backgroundColor: theme.ACCENT_BLACK,
                        borderRadius: 5,
                        paddingHorizontal: 20,
                        paddingVertical: 15,

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",

                        gap: 5,
                    }}>
                        <Text style={{
                            color: theme.WHITE,
                        }}>
                            Henter fil...
                        </Text>

                        <Progress.Circle
                            size={48}
                            indeterminate
                            color={theme.LIGHT.toString()}
                            borderWidth={1}
                        />
                    </View>
                </View>
            )}
        </View>
    )
}