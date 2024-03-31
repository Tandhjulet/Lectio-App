import { ActivityIndicator, Alert, Linking, NativeModules, ScrollView, StyleSheet, Switch, Text, View, useColorScheme } from "react-native";
import NavigationBar from "../components/Navbar";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { themes } from "../modules/Themes";
import { memo, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AcademicCapIcon, BellSnoozeIcon, BookOpenIcon, BuildingLibraryIcon, ClipboardDocumentIcon, ClipboardDocumentListIcon, ClipboardIcon, ClockIcon, Square2StackIcon, UserMinusIcon, UsersIcon, XMarkIcon } from "react-native-heroicons/solid";
import { getUnsecure, removeSecure, removeUnsecure, secureGet, signOutReq } from "../modules/api/Authentication";
import { Profile, getProfile, saveProfile } from "../modules/api/scraper/Scraper";
import { AuthContext } from "../modules/Auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { abort } from "../modules/api/scraper/class/PeopleList";
import * as SecureStore from 'expo-secure-store';
import Subscription from "../components/Subscription";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as WebBrowser from 'expo-web-browser';
import { WebBrowserPresentationStyle } from "expo-web-browser";
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import { hasSubscription } from "../components/LectioPlusAPI";
import { SubscriptionContext } from "../modules/Sub";
import { useFocusEffect } from "@react-navigation/native";

export default function Mere({ navigation }: {navigation: any}) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);

    const [loadingSubscription, setLoadingSubscription] = useState<boolean>(false);

    const { signOut } = useContext(AuthContext);
    const { subscriptionState, dispatchSubscription } = useContext(SubscriptionContext);

    const [profile, setProfile] = useState<Profile>();
    
    const [endDate, setEndDate] = useState<Date>();

    //const [development, setDevelopment] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            const prof = await getProfile()
            setProfile(prof);
            
            const { result, endDate } = await hasSubscription(true);

            if(result === null) {
                dispatchSubscription({ type: "SERVER_DOWN"})
            } else {
                dispatchSubscription({ type: result ? "SUBSCRIBED" : "NOT_SUBSCRIBED"})
            }
            setEndDate(endDate ?? new Date())
            setLoadingSubscription(false);
        })();
    }, [])

    useEffect(() => {
        if(!loadingSubscription) return;

        (async () => {
            const { result, endDate } = await hasSubscription();

            if(result === null) {
                dispatchSubscription({ type: "SERVER_DOWN"})
            } else {
                dispatchSubscription({ type: result ? "SUBSCRIBED" : "NOT_SUBSCRIBED"})
            }
            setLoadingSubscription(false);

            setEndDate(endDate ?? new Date())
        })();
    }, [loadingSubscription])

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const subscriptionTitle: () => string = () => {
        // @ts-ignore
        if(subscriptionState?.serverDown)
            return "Lectio Plus' server er nede"

        // @ts-ignore
        return subscriptionState?.hasSubscription ? "Dit abonnement er aktivt" : "Du har ikke et gyldigt abonnement"
    }

    const subscriptionSubtitle: () => string = () => {
        // @ts-ignore
        if(subscriptionState?.serverDown)
            return "Har du et abonnement får du det snart igen"

        // @ts-ignore
        return (subscriptionState?.hasSubscription && endDate) ? "Udløber d. " + (endDate?.toLocaleDateString() ?? "") : "Et abonnement giver ubegrænset adgang til Lectio Plus";
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
                        <Section header={"INFORMATION"} roundedCorners={true} hideSurroundingSeparators={true} >
                            <Cell
                                cellStyle="Basic"
                                title="Fravær"
                                titleTextColor={theme.WHITE}
                                image={
                                    <BellSnoozeIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                onPress={() => {
                                    navigation.navigate("Absence")
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title="Afleveringer"
                                titleTextColor={theme.WHITE}
                                image={
                                    <ClockIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                onPress={() => {
                                    navigation.navigate("Afleveringer")
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title="Lærere og elever"
                                titleTextColor={theme.WHITE}
                                image={
                                    <UsersIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                onPress={() => {
                                    navigation.navigate("TeachersAndStudents")
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title="Modulregnskab"
                                titleTextColor={theme.WHITE}
                                image={
                                    <BuildingLibraryIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                onPress={() => {
                                    navigation.navigate("ModulRegnskab")
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title="Karakterer"
                                titleTextColor={theme.WHITE}
                                image={
                                    <AcademicCapIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }} />
                                }
                                accessory="DisclosureIndicator"
                                onPress={() => {
                                    navigation.navigate("Grades")
                                }}
                            />
                            
                            <Cell
                                cellStyle="Basic"
                                title="Dokumenter"
                                titleTextColor={theme.WHITE}
                                image={
                                    <Square2StackIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                onPress={() => {
                                    navigation.navigate("Dokumenter")
                                }}
                            />

                            {/* <Cell
                                cellStyle="Basic"
                                title="Spørgeskemaer"
                                titleTextColor={theme.WHITE}
                                image={
                                    <ClipboardDocumentListIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                isDisabled
                            /> */}

                            <Cell
                                cellStyle="Basic"
                                title="Bøger"
                                titleTextColor={theme.WHITE}
                                image={
                                    <BookOpenIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                onPress={() => {
                                    navigation.navigate("Books")
                                }}
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
                                
                                // @ts-ignore
                                accessory={!loadingSubscription && subscriptionState?.hasSubscription && "Checkmark"}
                                accessoryColor={theme.ACCENT}

                                cellAccessoryView={loadingSubscription ? (
                                    <ActivityIndicator size={"small"} />
                                // @ts-ignore
                                ) : !subscriptionState?.hasSubscription && (
                                    <XMarkIcon color={theme.RED} />
                                )}
                            />
                            
                            <Cell 
                                cellStyle="Basic"
                                title="Administrer abonnement"
                                titleTextColor={theme.ACCENT}

                                onPress={() => {
                                    // @ts-ignore
                                    if(!subscriptionState?.hasSubscription && !subscriptionState?.serverDown) {
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

                                onPress={() => {
                                    setLoadingSubscription(true);
                                }}
                            />
                        </Section>

                        <Section roundedCorners={true} hideSurroundingSeparators={true}>
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
                                    WebBrowser.openBrowserAsync("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/", {
                                        controlsColor: theme.ACCENT.toString(),
                                        dismissButtonStyle: "close",
                                        presentationStyle: WebBrowserPresentationStyle.POPOVER,

                                        toolbarColor: theme.ACCENT_BLACK.toString(),
                                    })
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title={"Kontakt Lectio Plus"}

                                titleTextColor={theme.ACCENT}
                                accessory="DisclosureIndicator"

                                onPress={() => {
                                    if(!MailComposer.isAvailableAsync())
                                        return;


                                    const body = (`

---------------
For at kunne hjælpe dig har vi brug for lidt information:
🏫: ${profile?.school}
🧑🏻‍🎓: ${profile?.elevId}
📱: ${Device.modelName}, ${Device.osVersion}`)

                                    MailComposer.composeAsync({
                                        subject: "Kontakt",
                                        body: body,
                                        recipients: ["hello@lectioplus.com"]
                                    })

                                    
                                }}
                            />
                        </Section>

                        <Section header={"KONTROLPANEL"} roundedCorners={true} hideSurroundingSeparators={true}>
                            <Cell
                                cellStyle="Subtitle"
                                title={profile?.name}
                                detail={profile?.school}

                                titleTextColor={theme.WHITE}
                                accessory="DisclosureIndicator"

                                onPress={() => {
                                    navigation.navigate("UserSettings")
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

                        <View style={{
                            paddingVertical: 42,
                        }} />
                    </TableView>
                </ScrollView>
                

                <Subscription bottomSheetModalRef={bottomSheetModalRef} />
            </View>
        </BottomSheetModalProvider>
    </GestureHandlerRootView>

    )
}