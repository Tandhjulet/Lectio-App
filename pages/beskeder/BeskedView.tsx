import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { LectioMessage, TextComponent, ThreadMessage } from "../../modules/api/scraper/MessageScraper";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import { hexToRgb, themes } from "../../modules/Themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { getMessage } from "../../modules/api/scraper/Scraper";
import { secureGet, getUnsecure } from "../../modules/api/Authentication";
import { UserIcon } from "react-native-heroicons/solid";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import * as WebBrowser from 'expo-web-browser';
import { WebBrowserPresentationStyle } from "expo-web-browser";
import React from "react";
import File from "../../modules/File";
import FileViewer from "react-native-file-viewer";
import RNFS from "react-native-fs";
import * as Progress from 'react-native-progress';
import UserCell from "../../components/UserCell";


/**
 * Removes the extra data associated to each name
 * @param name name to clean
 * @returns a clean name
 */
export const CLEAN_NAME = (name: string) => {
    return name.replace(new RegExp(/ \(.*?\)/), "")
}

export default function BeskedView({ navigation, route }: {
    navigation: NavigationProp<any>,
    route: RouteProp<any>
}) {
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
    const [people, setPeople] = useState<{
        [id: string]: Person;
    }>({});

    const [progress, setProgress] = useState<number>(-1);

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();

    const message: LectioMessage = route.params?.message;
    const headers = route.params?.headers;

    const { calculateSize, findIcon, getUrlExtension } = File();

    /**
     * Fetches the message body upon page load
     */
    useEffect(() => {
        (async () => {
            setLoading(true);

            const gym: { gymName: string, gymNummer: string } = await secureGet("gym");
            setGym(gym);

            setPeople(await getPeople() ?? {});

            await getMessage(gym.gymNummer, message.messageId, headers, false, (messageThread) => {
                setThreadMessages(messageThread ?? []);
                setLoading(false)
            });

        })()
    }, [])

    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await secureGet("gym");
            setGym(gym);

            setPeople(await getPeople() ?? {});

            await getMessage(gym.gymNummer, message.messageId, headers, true, (messageThread) => {
                setThreadMessages(messageThread ?? []);
                setRefreshing(false)
            });
        })()

    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const { ProfilePicture } = UserCell();

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const renderMessages = useMemo(() => {
        return threadMessages?.map((message: ThreadMessage, i: number) => (
            <View key={i} style={{
                maxWidth: "100%",
                display: "flex",
                flexDirection: "row",

                gap: 10,
                marginTop: i === 0 ? 0 : 20,
            }}>
                <ProfilePicture
                    navn={message.sender}
                    gymNummer={gym?.gymNummer ?? ""}
                    billedeId={people[CLEAN_NAME(message.sender)]?.billedeId ?? ""}
                    size={50}
                    borderRadius
                />

                <View style={{
                    flexDirection: "column",
                    gap: 5,
                    flex: 1,
                }}>
                    <View style={{
                        paddingBottom: 10,
                        borderRadius: 5,

                        backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
                        padding: 7.5,
                    }}>
                        <View style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                        }}>
                            <View style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: 10,

                                alignItems: 'center',
                            }}>

                                <View style={{
                                    maxWidth: "100%",
                                }}>
                                    <Text style={{
                                        color: theme.WHITE,
                                        fontWeight: '600',
                                        fontSize: 11,

                                        opacity: 0.8,
                                    }}>
                                        {message.sender.split(" (")[0]}
                                    </Text>

                                    <Text style={{
                                        color: theme.WHITE,
                                        fontWeight: '700',
                                    }}>
                                        {message.title}
                                    </Text>
                                </View>
                            </View>

                            <Text style={{
                                paddingLeft: 7.5,
                            }}>
                                {message.body.map((component: TextComponent, index: number) => {
                                    if(component.isFile) return;

                                    if(component.isBreakLine)
                                        return (
                                            <Text 
                                                key={index}
                                            >
                                                {"\n"}
                                            </Text>
                                        )
                                    if(component.isLink) {
                                        return (
                                            <Text
                                                key={index}
                                                onPress={() => {
                                                    if(component.url == null) return;

                                                    WebBrowser.openBrowserAsync(cleanURL(component.url), {
                                                        controlsColor: theme.ACCENT.toString(),
                                                        dismissButtonStyle: "close",
                                                        presentationStyle: WebBrowserPresentationStyle.POPOVER,
            
                                                        toolbarColor: theme.ACCENT_BLACK.toString(),
                                                    })
                                                }}
                                                style={{
                                                    color: scheme === "dark" ? "lightblue" : "darkblue",
                                                    fontWeight: component.isBold ? "bold" : "normal",
                                                    textDecorationLine: component.isUnderlined ? "underline" : "none",
                                                    fontStyle: component.isItalic ? "italic" : "normal",
                                                }}
                                            >
                                                {component.inner?.trim()}
                                            </Text>
                                        )
                                    }

                                    return (
                                        <Text
                                            key={index}
                                            style={{
                                                color: theme.WHITE,
                                                fontWeight: component.isBold ? "bold" : "normal",
                                                textDecorationLine: component.isUnderlined ? "underline" : "none",
                                                fontStyle: component.isItalic ? "italic" : "normal",
                                            }}
                                        >
                                            {component.inner?.trim()}
                                        </Text>
                                    )
                                    
                                })}
                            </Text>

                            <Text style={{
                                color: hexToRgb(theme.WHITE.toString(), 0.6),
                                textAlign: "right",
                            }}>
                                {message.date}
                            </Text>
                        </View>
                    </View>
                    {message.body.filter((v) => v.isFile).map((file, i) => (
                        <TouchableOpacity key={threadMessages.length + i} style={{
                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
                            width: "100%",
                            padding: 5,
                            borderRadius: 5,

                            display: "flex",
                            flexDirection: "row",

                            gap: 5,
                            alignItems: "center",
                            overflow: "hidden",
                        }} onPress={() => {
                            openFile(file);
                        }}>
                            {file.inner && findIcon(getUrlExtension(file.inner))}

                            <Text style={{
                                color: scheme === "dark" ? "lightblue" : "darkblue",
                                maxWidth: "90%",
                            }} ellipsizeMode="middle" numberOfLines={2}>
                                {file.inner}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    
                </View>
            </View>
        ))
    }, [threadMessages])

    const cleanURL = (url: string) => {
        if(url.endsWith("'")) url = url.slice(0,url.length-1);
        if(url.startsWith("'")) url = url.slice(1,url.length);
        return url;
    }

    const openFile = useCallback(async (component: TextComponent) => {
        if(progress !== -1) return;
        if(!component.url) return;

        const extension = getUrlExtension(component.inner || "");
        const expectedSize = calculateSize((component.size || "").replace("(", "").replace(")", ""));

        const fileURI = RNFS.CachesDirectoryPath + "/tempfile." + extension;

        RNFS.downloadFile({
            fromUrl: component.url,
            toFile: fileURI,
            cacheable: true,

            discretionary: true,
            background: false,

            begin() {
                setProgress(0);
            },
            progress(downloadProgress) {
                const progress = Math.min((downloadProgress.bytesWritten / (downloadProgress.contentLength == -1 ? expectedSize : downloadProgress.contentLength)), 1);
                setProgress(progress);
            },
            progressInterval: 100,
            progressDivider: 5,
        }).promise.then(async () => {
            await FileViewer.open(fileURI, {
                displayName: component.inner || "Dokument",
                showAppsSuggestions: true,
                showOpenWithDialog: true,
            })
            setProgress(-1);
        })
    }, [progress])

    const {height, width} = Dimensions.get("screen");

    return (
        <View style={{
            backgroundColor: theme.BLACK,
            width: "100%",
            minHeight: "100%",
        }}>
            {loading ? 
                <View style={{
                    position: "absolute",
                    height: height / 3,
                    width: "100%",

                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",

                }}>
                    <ActivityIndicator size={"small"} color={theme.ACCENT} />
                </View>
            :
                <ScrollView style={{
                    paddingVertical: 20,
                    paddingHorizontal: 10,

                    width: "100%"

                }} showsVerticalScrollIndicator={false} refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }>  
                    {renderMessages}
                
                    <View style={{
                        paddingVertical: 75,
                    }} />
                </ScrollView>
            }

            {progress != -1 && (
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

                        <Progress.Pie
                            size={48}
                            progress={progress}
                            color={theme.LIGHT.toString()}
                            borderWidth={1}
                        />
                    </View>
                </View>
            )}
        </View>
    )
}