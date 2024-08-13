import { ActivityIndicator, Appearance, ScrollView, Switch, View, useColorScheme } from "react-native";
import { themes } from "../../modules/Themes";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { useContext, useEffect, useRef, useState } from "react";
import { getUnsecure, removeSecure, saveUnsecure, secureGet } from "../../modules/api/helpers/Storage";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as WebBrowser from 'expo-web-browser';
import { WebBrowserPresentationStyle } from "expo-web-browser";
import { abort } from "../../modules/api/scraper/class/PeopleList";
import { AuthContext } from "../../modules/Auth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOutReq } from "../../modules/api/Authentication";

export default function UserSettings() {
    const [darkMode, setDarkMode] = useState<boolean>()

    const { signOut } = useContext(AuthContext);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    // FIXME: make light theme prettier, then reenable. remember to enable in App.tsx aswell.
    // useEffect(() => {
    //     (async () => {
    //         const useDarkMode: {result: boolean} = await getUnsecure("useDarkMode") || {result: null};
    //         if(useDarkMode.result == null) {
    //             setDarkMode(true);
    //         } else {
    //             setDarkMode(useDarkMode.result);
    //         }
    //     })();
    // }, []);

    // useEffect(() => {
    //     if(darkMode == undefined || darkMode == (scheme == "dark")) return;

    //     saveUnsecure("useDarkMode", {result: darkMode}).then(() => {
    //         Appearance.setColorScheme(darkMode ? "dark" : "light");
    //     });

    // }, [darkMode])

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
                            {/* <Section header={"Udseende"} roundedCorners={true} hideSurroundingSeparators={true}>
                                <Cell
                                    cellStyle="Basic"
                                    title="Brug mørk tilstand"
                                    titleTextColor={theme.WHITE}
                                    cellAccessoryView={<Switch 
                                        trackColor={{false: '#767577', true: "#4ca300"}}

                                        onValueChange={setDarkMode}
                                        value={darkMode}
                                    />}
                                />
                            </Section> */}

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
                                            await removeSecure("password");
                                            await removeSecure("username");
                                            await removeSecure("gym");

                                            await AsyncStorage.clear();

                                            await signOutReq();
                                            await abort();

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