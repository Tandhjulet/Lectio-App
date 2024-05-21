import { ActivityIndicator, Alert, Linking, NativeModules, ScrollView, StyleSheet, Switch, Text, View, useColorScheme } from "react-native";
import NavigationBar from "../components/Navbar";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { hexToRgb, themes } from "../modules/Themes";
import { memo, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AcademicCapIcon, AdjustmentsVerticalIcon, ArrowPathIcon, BellSnoozeIcon, BookOpenIcon, BuildingLibraryIcon, CheckCircleIcon, CheckIcon, ClipboardDocumentIcon, ClipboardDocumentListIcon, ClipboardIcon, ClockIcon, Square2StackIcon, UserMinusIcon, UsersIcon, XMarkIcon } from "react-native-heroicons/outline";
import { getUnsecure, removeSecure, removeUnsecure, secureGet, signOutReq } from "../modules/api/Authentication";
import { Profile, getProfile, saveProfile } from "../modules/api/scraper/Scraper";
import { AuthContext } from "../modules/Auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { abort } from "../modules/api/scraper/class/PeopleList";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { hasSubscription } from "../components/LectioPlusAPI";
import { SubscriptionContext } from "../modules/Sub";
import { useFocusEffect } from "@react-navigation/native";
import { IdentificationIcon } from "react-native-heroicons/outline";
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import { EnvelopeIcon, WrenchScrewdriverIcon } from "react-native-heroicons/solid";
import * as WebBrowser from 'expo-web-browser';
import Subscription from "../components/Subscription";

export default function Mere({ navigation }: {navigation: any}) {
    const { subscriptionState, dispatchSubscription } = useContext(SubscriptionContext);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);

    const [profile, setProfile] = useState<Profile>();
    const [gym, setGym] = useState<{
        gymNummer: string,
        gymName: string,
    }>()

    const [endDate, setEndDate] = useState<Date | undefined>()
    const [loadingSubscription, setLoadingSubscription] = useState<boolean>(false);

    useEffect(() => {

        (async () => {
            const prof = await getProfile()
            setProfile(prof);
            
            const { valid, endDate, freeTrial } = await hasSubscription(true);
            setGym((await secureGet("gym")))

            if(freeTrial && valid) {
                dispatchSubscription({ type: "FREE_TRIAL"})
            } else if(valid === null) {
                dispatchSubscription({ type: "SERVER_DOWN"})
            } else {
                dispatchSubscription({ type: valid ? "SUBSCRIBED" : "NOT_SUBSCRIBED"})
            }

            setEndDate(endDate);
        })();
    }, [])

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

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

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
                                    // @ts-ignore
                                    if(!subscriptionState?.hasSubscription) {
                                        navigation.navigate("NoAccess")
                                        return;
                                    }

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
                                    // @ts-ignore
                                    if(!subscriptionState?.hasSubscription) {
                                        navigation.navigate("NoAccess")
                                        return;
                                    }

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
                                    // @ts-ignore
                                    if(!subscriptionState?.hasSubscription) {
                                        navigation.navigate("NoAccess")
                                        return;
                                    }

                                    navigation.navigate("Books")
                                }}
                            />  
                        </Section>

                        <Section hideSurroundingSeparators roundedCorners>
                            <Cell
                                cellStyle="Basic"
                                title="Studiekort"
                                titleTextColor={theme.WHITE}
                                image={
                                    <IdentificationIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                onPress={() => {
                                    navigation.navigate("Studiekort")
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
                                            presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,

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

                        <Section header={"KONTROLPANEL"} roundedCorners={true} hideSurroundingSeparators={true}>
                            <Cell
                                cellStyle="Basic"
                                title={"Profil"}

                                titleTextColor={theme.WHITE}
                                titleTextStyle={{
                                    fontWeight: "500",
                                }}
                                accessory="DisclosureIndicator"

                                image={
                                    <WrenchScrewdriverIcon color={hexToRgb(theme.WHITE.toString(), 0.3)} />
                                }

                                onPress={() => {
                                    navigation.navigate("UserSettings")
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title={"Kontakt Lectio Plus"}

                                titleTextColor={theme.WHITE}
                                titleTextStyle={{
                                    fontWeight: "500",
                                }}
                                accessory="DisclosureIndicator"

                                image={
                                    <EnvelopeIcon color={hexToRgb(theme.WHITE.toString(), 0.3)} />
                                }

                                onPress={() => {
                                    if(!MailComposer.isAvailableAsync())
                                        return;


                                    const body = (`

---------------
For at kunne hjælpe dig har vi brug for lidt information:
🏫: ${gym?.gymNummer}
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

                        <View style={{
                            paddingBottom: 89,
                        }} />
                    </TableView>
                </ScrollView>
                
                <Subscription bottomSheetModalRef={bottomSheetModalRef} />
            </View>
        </BottomSheetModalProvider>
    </GestureHandlerRootView>

    )
}