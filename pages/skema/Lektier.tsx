import { RouteProp } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Modul } from "../../modules/api/scraper/SkemaScraper";
import { getLektier } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/helpers/Storage";
import * as Sentry from 'sentry-expo';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import RateLimit from "../../components/RateLimit";
import UIError from "../../components/UIError";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { TextComponent } from "../../modules/api/scraper/MessageScraper";
import { hexToRgb, themes } from "../../modules/Themes";
import * as WebBrowser from 'expo-web-browser';
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { Lektie } from "../../modules/api/scraper/ModulScraper";


function extractIDs(href: string): {
    absId: string,
    elevId: string,
} | null {
    function getFromKey(key: string) {
        const result = new RegExp(`${key}=(\\d+)(&|$)`, "gmi").exec(href);
        if(!result) {
            Sentry.Native.captureException(new Error("Couldnt extract abs-id [Lektier, L16]"))
            return null;
        }

        return result[1];
    }

    const absId = getFromKey("absid");
    const elevId = getFromKey("elevid");

    if(!absId || !elevId)
        return null;

    return {
        absId,
        elevId,
    }
}

function sortData(data: Lektie[]) {
    const lektier: Lektie[] = [], ekstra: Lektie[] = [];

    data.forEach((v) => {
        if(v.isHomework)
            lektier.push(v)
        else
            ekstra.push(v);
    })

    return { lektier, ekstra }
}

export default function Lektier({ route }: {
    route: RouteProp<any>,
}) {
    const modul: Modul | undefined = route.params?.modul;

    const [content, setContent] = useState<{
        lektier: Lektie[],
        ekstra: Lektie[],
    }>({lektier: [], ekstra: []})

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(true);

    const [showError, setShowError] = useState(false);
    const [rateLimited, setRateLimited] = useState(false);

    const showUIError = useCallback(() => {
        if(showError) return;
        setShowError(!showError);
    }, [showError]);

    useEffect(() => {
        setLoading(true);
        if(!modul)
            return;

        (async () => {
            const { gymNummer } = await secureGet("gym");

            const res = extractIDs(modul.href);
            if(res === null) {
                showUIError();
                return;
            }

            const {
                absId,
                elevId
            } = res;

            await getLektier(gymNummer, absId, elevId, (data) => {
                if(data === undefined)
                    setRateLimited(true);

                setContent(sortData(data ?? []));
                setLoading(false);
            })
        })();
    }, [modul])

    useEffect(() => {
        if(!modul || !refreshing)
            return;

        (async () => {
            const { gymNummer } = await secureGet("gym");

            const res = extractIDs(modul.href);
            if(res === null) {
                showUIError();
                return;
            }

            const {
                absId,
                elevId
            } = res;

            await getLektier(gymNummer, absId, elevId, (data) => {
                if(data === undefined)
                    setRateLimited(true);

                setContent(sortData(data ?? []));
                setRefreshing(false);
            })
        })();
    }, [modul, refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View style={{
            height: "100%",
            width: "100%",

            paddingBottom: 89,
        }}>
            <ScrollView contentContainerStyle={{
                paddingVertical: 10,
                paddingHorizontal: 20,
            }} refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                <View>
                    <Text style={{
                        color: theme.WHITE,
                        fontSize: 14,
                        fontWeight: "700",
                        opacity: 0.8,
                    }}>
                        {modul?.teacher}
                    </Text>

                    {modul?.title ? (
                        <Text style={{
                            color: theme.WHITE,
                            fontSize: 17.5,
                            fontWeight: "800",
                        }}>
                            {modul?.title}
                        </Text>
                    ) : null}

                    <Text style={{
                        color: theme.WHITE,
                        fontSize: modul?.title ? 15 : 17.5,
                        fontWeight: modul?.title ? "600" : "800",
                    }}>
                        {modul?.team.join(", ")}
                    </Text>

                    {modul?.note ? (
                        <View style={{
                            paddingTop: 10,
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 15,
                            }}>
                                {modul?.note}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <Text style={{
                    marginTop: 20,
                    color: theme.WHITE,
                    fontWeight: "900",
                }}>
                    Lektier
                </Text>

                <View style={{
                    width: "100%",
                    backgroundColor: theme.WHITE,
                    height: StyleSheet.hairlineWidth,
                    opacity: 0.6,

                    marginTop: 2.5,
                    marginBottom: 7.5,
                }} />

                {loading ? (
                    <View style={{
                        height: 200,
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                    }}>
                        <ActivityIndicator />
                    </View>
                ) : (
                    <View style={{
                        flexDirection: "column",
                        gap: 10,
                    }}>
                        {content?.lektier && content?.lektier.length > 0 ? content?.lektier?.map((v, i) => (
                            <View key={i} style={{
                                justifyContent: "flex-start",
                                flexDirection: "row",
                                alignItems: "center",
                            }}>
                                <View style={{
                                    width: 20,
                                    height: "100%",

                                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.2),
                                    borderRadius: 5,

                                    paddingVertical: 20,
                                    marginLeft: -10,
                                    marginRight: 10,
                                }} />

                                <Text style={{
                                    fontSize: 16,
                                }}>
                                    {v?.body?.map((text, j) => {
                                        return (
                                            <Text style={{
                                                color: text.isLink ? theme.ACCENT : theme.WHITE,
                                            }} key={j}>
                                                {text.inner.trim()}
                                            </Text>
                                        )
                                    })}
                                </Text>
                            </View>
                        )) : null}
                    </View>
                )}

                <Text style={{
                    marginTop: 20,
                    color: theme.WHITE,
                    fontWeight: "900",
                }}>
                    Øvrigt indhold
                </Text>

                <View style={{
                    width: "100%",
                    backgroundColor: theme.WHITE,
                    height: StyleSheet.hairlineWidth,
                    opacity: 0.6,

                    marginTop: 2.5,
                    marginBottom: 7.5,
                }} />

                {loading ? (
                    <View style={{
                        height: 200,
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                    }}>
                        <ActivityIndicator />
                    </View>
                ) : (
                    <View style={{
                        flexDirection: "column",
                        gap: 10,
                    }}>
                        {content?.ekstra && content?.ekstra.length > 0 ? content?.ekstra?.map((v, i) => (
                            <View key={i} style={{
                                justifyContent: "flex-start",
                                flexDirection: "row",
                                alignItems: "center",
                            }}>
                                <View style={{
                                    width: 20,
                                    height: "100%",

                                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.2),
                                    borderRadius: 5,

                                    paddingVertical: 20,
                                    marginLeft: -10,
                                    marginRight: 10,
                                }} />

                                <Text style={{
                                    fontSize: 16,
                                }}>
                                    {v?.body?.map((text, j) => {
                                        return (
                                            <Text style={{
                                                color: text.isLink ? theme.ACCENT : theme.WHITE,
                                            }} key={j}>
                                                {text.inner.trim()}
                                            </Text>
                                        )
                                    })}
                                </Text>
                            </View>
                        )) : null}
                    </View>
                )}
            </ScrollView>
            
            
            {rateLimited && <RateLimit />}
            {showError && <UIError setDep={[setShowError]} deps={[showError]} details={[
                "Der opstod en fejl ved indlæsning",
                "Prøv venligst igen på et andet tidspunkt!"
            ]} paddingTop={10} />}
        </View>
    )
}