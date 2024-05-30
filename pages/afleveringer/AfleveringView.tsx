import { NavigationProp, RouteProp } from "@react-navigation/native"
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { Cell, Section, Separator, TableView } from "react-native-tableview-simple";
import { Opgave, OpgaveDetails, parseDate, Status } from "../../modules/api/scraper/OpgaveScraper";
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

    const afleveringsFrist = new Date(aflevering.dateObject);

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
                                            fontWeight: "800",
                                            fontSize: 13.5,
                                            color: hexToRgb(theme.WHITE.toString(), 0.7),
                                            letterSpacing: 0.7,
                                            textAlign: "center",
                                        }}>
                                            {aflevering.team}
                                        </Text>

                                        <Text style={{
                                            fontWeight: "900",
                                            fontSize: 15,
                                            color: theme.WHITE,
                                            textAlign: "center",
                                        }}>
                                            {aflevering.title}
                                        </Text>

                                        {opgaveDetails ? (
                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 0.7),
                                                textAlign: "center",
                                                fontSize: 15,
                                            }}>
                                                <Text style={{
                                                    textTransform: "capitalize",
                                                }}>
                                                    {opgaveDetails?.ansvarlig?.split("(")[0]}
                                                </Text>
                                                {"(" + opgaveDetails?.ansvarlig?.split("(")[1]}
                                            </Text>
                                        ): (
                                            <ActivityIndicator size={"small"} />
                                        )}

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
                                            }}>
                                                Elevtid
                                            </Text>

                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 1),
                                                textAlign: "left",
                                            }}>
                                                {aflevering.time} elevtimer
                                            </Text>
                                        </View>

                                        <View style={{
                                            flexDirection: "column",
                                        }}>
                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                fontWeight: "bold",
                                                textAlign: "right",

                                                fontSize: 15,
                                            }}>
                                                Fravær
                                            </Text>

                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 1),
                                                textAlign: "right",

                                                fontSize: 16,
                                            }}>
                                                {aflevering.absence}
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
                                            }}>
                                                Karakterskala
                                            </Text>

                                            {opgaveDetails ? (
                                                <Text style={{
                                                    color: hexToRgb(theme.WHITE.toString(), 1),
                                                    textAlign: "left",
                                                    maxWidth: "80%",
                                                }} ellipsizeMode="tail" numberOfLines={2}>
                                                    {opgaveDetails?.karakterSkala}
                                                </Text>
                                            ) : (
                                                <View style={{
                                                    width: "100%",
                                                    alignItems: "flex-start",
                                                    justifyContent: "flex-start",
                                                }}>
                                                    <ActivityIndicator size={"small"} />
                                                </View>
                                            )}
                                        </View>

                                        <View style={{
                                            flexDirection: "column",
                                        }}>
                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                fontWeight: "bold",
                                                textAlign: "right",

                                                fontSize: 15,
                                            }}>
                                                Afleveringsfrist
                                            </Text>

                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 1),
                                                textAlign: "right",

                                                fontSize: 16,
                                            }}>
                                                {afleveringsFrist.toLocaleDateString("da-DK", {
                                                    dateStyle: "medium",
                                                })}{"\n"}
                                                kl. {afleveringsFrist.toLocaleTimeString("da-DK", {
                                                    timeStyle: "short"
                                                }).replace(".", ":")}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{
                                        paddingHorizontal: 10,
                                    }}>
                                        <Text style={{
                                            color: hexToRgb(theme.WHITE.toString(), 0.7),
                                        }}>
                                            Status:{" "}
                                            <Text style={{
                                                textTransform: "capitalize",
                                                color: theme.WHITE,
                                                fontWeight: "bold",
                                            }}>
                                                {Status[aflevering.status]}
                                            </Text>
                                        </Text>
                                    </View>

                                    {opgaveDetails?.note && (
                                        <View style={{
                                            paddingHorizontal: 10,
                                            marginTop: 5,
                                        }}>
                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                <Text style={{
                                                    color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                }}>
                                                    Note:
                                                </Text>

                                                {"\n"}{opgaveDetails?.note}
                                            </Text>
                                        </View>
                                    )}

                                    {!opgaveDetails && (
                                        <View style={{
                                            marginTop: 10,
                                        }}>
                                            <ActivityIndicator size={"small"} />
                                        </View>
                                    )}
                                </View>
                            }
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

                                                        paddingVertical: 10,
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
                                                                        color: theme.ACCENT,
                                                                        fontWeight: "600",
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
                                                }
                                            />
                                        )}
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

                                const indlægDate = parseDate(indlæg.time);

                                return (
                                    <Cell
                                        key={i}
                                        cellStyle="Basic"
                                        cellContentView={
                                            <View style={{
                                                paddingVertical: 7.5,
                                                width: "100%",
                                            }}>
                                                <View style={{
                                                    display: "flex",
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",

                                                    width: "100%",
                                                }}>
                                                    <Text style={{
                                                        color: theme.WHITE.toString(),
                                                        fontWeight: "bold",
                                                        fontSize: 12.5,
                                                        maxWidth: "60%",
                                                    }}>
                                                        {indlæg.byUser}
                                                    </Text>

                                                    <Text style={{
                                                        color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                        maxWidth: "40%",
                                                    }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                                        {indlægDate.toLocaleTimeString("da-DK", {
                                                            timeStyle: "short"
                                                        }).replace(".", ":")}, {indlægDate.toLocaleDateString("da-DK", {
                                                            dateStyle: "medium",
                                                        })}
                                                    </Text>
                                                </View>
                                                
                                                {indlæg.document && (
                                                    <TouchableOpacity style={{
                                                        display: "flex",
                                                        flexDirection: "row",

                                                        alignItems: "center",

                                                        marginLeft: -3,
                                                        marginVertical: 5,
                                                        
                                                        gap: 2.5,
                                                    }}>

                                                        <Text style={{
                                                            color: theme.ACCENT,
                                                            fontWeight: "700"
                                                        }}>
                                                            {name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}

                                                {indlæg.comment !== "" && (
                                                    <Text style={{
                                                        color: theme.WHITE,
                                                    }} >
                                                        {indlæg.comment}
                                                    </Text>
                                                )}
                                            </View>
                                        }
                                        onPress={() => {
                                            openFile(indlæg.document!)
                                        }}
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