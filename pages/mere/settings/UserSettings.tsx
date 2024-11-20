import { ActivityIndicator, Appearance, ScrollView, Switch, View, useColorScheme } from "react-native";
import { themes } from "../../../modules/Themes";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { useContext, useEffect, useRef, useState } from "react";
import { getUnsecure, removeSecure, saveUnsecure, secureGet } from "../../../modules/api/helpers/Storage";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as WebBrowser from 'expo-web-browser';
import { WebBrowserPresentationStyle } from "expo-web-browser";
import { abort } from "../../../modules/api/scraper/class/PeopleList";
import { AuthContext } from "../../../modules/Auth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOutReq } from "../../../modules/api/Authentication";

export default function UserSettings() {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const [darkMode, setDarkMode] = useState<boolean>(scheme === "dark")

    const { signOut } = useContext(AuthContext);

    return (
        <GestureHandlerRootView>
            <BottomSheetModalProvider>
                <View style={{minHeight: '100%',minWidth:'100%'}}>
                    <ScrollView contentContainerStyle={{
                        backgroundColor: theme.BLACK,
                        paddingBottom: 20,
                    }}>
                        <TableView style={{
                            paddingHorizontal: 20,
                        }}>
                            <Section header={"Udseende"} roundedCorners={true} hideSurroundingSeparators={true}>
                                <Cell
                                    cellStyle="Basic"
                                    title="Brug mørk tilstand"
                                    titleTextColor={theme.WHITE}
                                    cellAccessoryView={<Switch 
                                        trackColor={{false: '#767577', true: "#4ca300"}}

                                        onValueChange={async () => {
											setDarkMode((prev) => !prev);
											const newScheme = scheme === "dark" ? "light" : "dark";
											Appearance.setColorScheme(newScheme);
											await saveUnsecure("colorScheme", {scheme: newScheme});
										}}
                                        value={darkMode}
                                    />}
                                />
                            </Section>

                            <Section hideSurroundingSeparators roundedCorners>
                                <Cell
                                    cellStyle="Basic"
                                    title={"Privatlivspolitik"}

                                    titleTextColor={theme.WHITE}
                                    accessory="Detail"

                                    onPress={() => {
                                        WebBrowser.openBrowserAsync("https://lectimate.com/privatliv", {
                                            controlsColor: theme.ACCENT.toString(),
                                            dismissButtonStyle: "close",
                                            presentationStyle: WebBrowserPresentationStyle.POPOVER,

                                            toolbarColor: theme.ACCENT_BLACK.toString(),
                                        })
                                    }}
                                />

                                <Cell
                                    cellStyle="Basic"
                                    title={"Slutbrugerlicensaftale"}

                                    titleTextColor={theme.WHITE}
                                    accessory="Detail"

                                    onPress={() => {
                                        WebBrowser.openBrowserAsync("https://lectimate.com/eula", {
                                            controlsColor: theme.ACCENT.toString(),
                                            dismissButtonStyle: "close",
                                            presentationStyle: WebBrowserPresentationStyle.POPOVER,

                                            toolbarColor: theme.ACCENT_BLACK.toString(),
                                        })
                                    }}
                                />

                                <Cell
                                    cellStyle="Basic"
                                    title="Log ud"

                                    titleTextStyle={{
                                        fontWeight: "bold"
                                    }}
                                    titleTextColor={theme.RED}
                                    accessory="DisclosureIndicator"

                                    onPress={() => {
                                        (async () => {
											abort();
                                            await removeSecure("password");
                                            await removeSecure("username");
                                            await removeSecure("gym");
											await removeSecure("profile");

                                            await AsyncStorage.clear();

                                            await signOutReq();

                                            await signOut();
                                        })();
                                    }}
                                />
                            </Section>

                            {__DEV__ && (
                                <Section>
                                    <Cell
                                        cellStyle="Basic"
                                        title="Force error"

                                        titleTextStyle={{
                                            fontWeight: "bold"
                                        }}
                                        titleTextColor={theme.RED}
                                        accessory="DisclosureIndicator"

                                        onPress={() => {
                                            throw new Error("Error thrown from dev menu")
                                        }}
                                    />
                                </Section>
                            )}

                        </TableView>
                    </ScrollView>
                </View>
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    )
}