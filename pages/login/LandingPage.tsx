import { Animated, Dimensions, Easing, Pressable, Text, TouchableHighlight, TouchableOpacity, View, useColorScheme } from "react-native";
import Logo from "../../components/Logo";
import { hexToRgb, Theme, themes } from "../../modules/Themes";
import { ChevronRightIcon } from "react-native-heroicons/solid";
import * as WebBrowser from 'expo-web-browser';

import Constants from 'expo-constants';
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AcademicCapIcon } from "react-native-heroicons/outline";
import { getName } from "../../modules/Config";

export default function LandingPage({
    navigation,
}: {
    navigation: any,
}) {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View style={{
            display: "flex",
            flexDirection: "column",

            height: "100%",
            width: "100%",

            backgroundColor: theme.ACCENT_BLACK,
        }}>
            <View style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",

                marginTop: 100,
            }}>
                <AcademicCapIcon color="rgb(22, 163, 74)" size={80} style={{
                    shadowColor: "rgb(22,163,72)",
                    shadowOpacity: 1,
                    shadowRadius: 5,
                    shadowOffset: {
                        height: 2,
                        width: 0,
                    }
                }} />

                <Text style={{
                    color: hexToRgb(theme.WHITE.toString(), 1),
                    marginTop: 7.5,
                    fontSize: 50,
                    fontWeight: "900",
                    paddingHorizontal: 20,
                    textTransform: "uppercase",
                }} adjustsFontSizeToFit minimumFontScale={0.01} numberOfLines={1}>
                    {getName()}
                </Text>

                <Text style={{
                    color: theme.WHITE,
                    fontSize: 20,
                    textAlign: "center",
                }}>
                    Invester i din fremtid
                </Text>
            </View>

            <View style={{
                flex: 1,
            }} />

            <View style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <TouchableOpacity onPress={() => {
                    navigation.navigate("Schools")
                }}>
                    <View style={{
                        paddingLeft: 40,
                        paddingRight: 25,

                        paddingVertical: 15,
                        borderRadius: 20,

                        backgroundColor: scheme === "dark" ? "#1f2120" : hexToRgb(theme.BLACK.toString(), 0.5),

                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 5,
                    }}>
                        <Text style={{
                            color: theme.WHITE,
                            fontSize: 20,

                            fontWeight: "500",
                            letterSpacing: 0.6,
                        }}>
                            Videre
                        </Text>
                        <ChevronRightIcon size={25} color={theme.ACCENT} />
                    </View>
                </TouchableOpacity>
            </View>

            <View style={{
                display: "flex",
                width: "100%",

                marginTop: 20,
                marginBottom: 50,
            }}>
                <Text style={{
                    color: hexToRgb(theme.WHITE.toString(), 0.7),
                    textAlign: "center",
                    textAlignVertical: "center",
                }}>
                    Ved at bruge {getName()} accepterer du vores{" "}
                    <Text onPress={() => {
                        WebBrowser.openBrowserAsync("https://lectimate.com/eula", {
                            controlsColor: theme.ACCENT.toString(),
                            dismissButtonStyle: "close",
                            presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,

                            toolbarColor: theme.ACCENT_BLACK.toString(),
                        })
                    }} style={{
                        textDecorationLine: "underline",
                        color: hexToRgb(theme.ACCENT.toString(), 0.8),
                    }}>
                        slutbrugerlicensaftale
                    </Text>
                    {" og "}
                    <Text onPress={() => {
                        WebBrowser.openBrowserAsync("https://lectimate.com/privatliv", {
                            controlsColor: theme.ACCENT.toString(),
                            dismissButtonStyle: "close",
                            presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,

                            toolbarColor: theme.ACCENT_BLACK.toString(),
                        })
                    }} style={{
                        textDecorationLine: "underline",
                        color: hexToRgb(theme.ACCENT.toString(), 0.8),
                    }}>
                        privatlivspolitik
                    </Text>!
                </Text>
            </View>
        </View>
    )
}