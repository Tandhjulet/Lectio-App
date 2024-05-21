import { ActivityIndicator, Appearance, ScrollView, Switch, View, useColorScheme } from "react-native";
import { themes } from "../../modules/Themes";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { useContext, useEffect, useRef, useState } from "react";
import { getUnsecure, removeSecure, saveUnsecure, secureGet, signOutReq } from "../../modules/api/Authentication";
import Subscription from "../../components/Subscription";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SubscriptionContext } from "../../modules/Sub";
import { hasSubscription } from "../../components/LectioPlusAPI";
import { AdjustmentsVerticalIcon, ArrowPathIcon, CheckCircleIcon, XMarkIcon } from "react-native-heroicons/outline";
import * as WebBrowser from 'expo-web-browser';
import { WebBrowserPresentationStyle } from "expo-web-browser";
import { abort } from "../../modules/api/scraper/class/PeopleList";
import { AuthContext } from "../../modules/Auth";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function UserSettings() {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const [darkMode, setDarkMode] = useState<boolean>()
    const [endDate, setEndDate] = useState<Date | undefined>()

    const { signOut } = useContext(AuthContext);
    const { subscriptionState, dispatchSubscription } = useContext(SubscriptionContext);
    const [loadingSubscription, setLoadingSubscription] = useState<boolean>(false);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    useEffect(() => {
        hasSubscription().then(({ endDate }) => setEndDate(endDate));

        (async () => {
            const useDarkMode: {result: boolean} = await getUnsecure("useDarkMode") || {result: null};
            if(useDarkMode.result == null) {
                setDarkMode(true);
            } else {
                setDarkMode(useDarkMode.result);
            }
        })();
    }, []);

    useEffect(() => {
        if(darkMode == undefined || darkMode == (scheme == "dark")) return;

        saveUnsecure("useDarkMode", {result: darkMode}).then(() => {
            Appearance.setColorScheme(darkMode ? "dark" : "light");
        });

    }, [darkMode])

    useEffect(() => {
        if(!loadingSubscription) return;

        (async () => {
            const { valid, endDate, freeTrial } = await hasSubscription();

            if(freeTrial && valid) {
                dispatchSubscription({ type: "FREE_TRIAL"})
            } else if(valid === null) {
                dispatchSubscription({ type: "SERVER_DOWN"})
            } else {
                dispatchSubscription({ type: valid ? "SUBSCRIBED" : "NOT_SUBSCRIBED"})
            }

            setEndDate(endDate ?? new Date())
            setLoadingSubscription(false);
        })();
    }, [loadingSubscription])

    
    const subscriptionTitle: () => string = () => {
        // @ts-ignore
        if(subscriptionState?.serverDown)
            return "Lectio Plus' server er nede"

        if(subscriptionState?.freeTrial)
            return "Din prøveperiode er aktiv"

        // @ts-ignore
        return subscriptionState?.hasSubscription ? "Dit abonnement er aktivt" : "Du har ikke et gyldigt abonnement"
    }

    const subscriptionSubtitle: () => string = () => {
        // @ts-ignore
        if(subscriptionState?.serverDown)
            return "Dette abonnement er midlertidigt"

        if(subscriptionState?.freeTrial)
            return "Udløber d. " + (endDate?.toLocaleDateString() ?? "ukendt dato")

        // @ts-ignore
        return (subscriptionState?.hasSubscription && endDate) ? "Udløber d. " + (endDate?.toLocaleDateString() ?? "ukendt dato") : "Et abonnement giver ubegrænset adgang til Lectio Plus";
    }

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

                                        onValueChange={setDarkMode}
                                        value={darkMode}
                                    />}
                                />
                            </Section>

                            <Section header={"ABONNEMENT"} roundedCorners={true} hideSurroundingSeparators={true} >
                                <Cell
                                    cellStyle={"Subtitle"}

                                    // @ts-ignore
                                    title={subscriptionTitle()}
                                    titleTextColor={scheme == "dark" ? "#FFF" : "#000"}

                                    // @ts-ignore
                                    detail={subscriptionSubtitle()}

                                    disableImageResize
                                    image={loadingSubscription ? (
                                        <View style={{
                                            width: 25,
                                        }}>
                                            <ActivityIndicator size={"small"}/>
                                        </View>
                                    ) : (!subscriptionState?.hasSubscription ? (
                                        <View style={{
                                            width: 25,
                                        }}>
                                            <XMarkIcon color={theme.RED} />
                                        </View>
                                    ): (
                                        <View style={{
                                            width: 25,
                                        }}>
                                            <CheckCircleIcon color={theme.ACCENT} />
                                        </View>
                                    ))}
                                />
                                
                                <Cell 
                                    cellStyle="Basic"
                                    // @ts-ignore
                                    title={((!subscriptionState?.hasSubscription && !subscriptionState?.serverDown) || subscriptionState?.freeTrial) ? "Køb abonnement" : "Administrer abonnement"}
                                    titleTextColor={theme.ACCENT}

                                    image={
                                        <AdjustmentsVerticalIcon color={theme.ACCENT} style={{
                                            opacity: 0.85,
                                        }}  />
                                    }

                                    onPress={() => {
                                        // @ts-ignore
                                        if((!subscriptionState?.hasSubscription && !subscriptionState?.serverDown) || subscriptionState?.freeTrial) {
                                            bottomSheetModalRef.current?.present();
                                        } else {
                                            WebBrowser.openBrowserAsync("https://apps.apple.com/account/subscriptions", {
                                                controlsColor: theme.ACCENT.toString(),
                                                dismissButtonStyle: "close",
                                                presentationStyle: WebBrowserPresentationStyle.POPOVER,

                                                toolbarColor: theme.ACCENT_BLACK.toString(),
                                            })
                                        }
                                    }}
                                />

                                <Cell 
                                    cellStyle="Basic"
                                    title="Genindlæs adgang"
                                    titleTextColor={theme.ACCENT}
                                    
                                    image={
                                        <ArrowPathIcon color={theme.ACCENT} style={{
                                            opacity: 0.85,
                                        }}  />
                                    }
                                    onPress={() => {
                                        setLoadingSubscription(true);
                                    }}
                                />
                            </Section>

                            <Section hideSurroundingSeparators roundedCorners>
                                <Cell
                                    cellStyle="Basic"
                                    title={"Privatlivspolitik"}

                                    titleTextColor={theme.WHITE}
                                    accessory="Detail"

                                    onPress={() => {
                                        WebBrowser.openBrowserAsync("https://lectioplus.com/privatliv", {
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
                                        WebBrowser.openBrowserAsync("https://lectioplus.com/eula", {
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

                                            await signOutReq();
                                            await abort();

                                            await signOut();
                                        })();
                                    }}
                                />
                            </Section>

                        </TableView>
                    </ScrollView>

                    <Subscription bottomSheetModalRef={bottomSheetModalRef} />
                </View>
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    )
}