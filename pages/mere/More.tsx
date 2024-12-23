import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useContext, useEffect, useRef, useState } from "react";
import { SubscriptionContext } from "../../modules/Sub";
import { getProfile, Profile } from "../../modules/api/scraper/Scraper";
import { hasSubscription } from "../../components/LectimateAPI";
import { secureGet } from "../../modules/api/helpers/Storage";
import { ActivityIndicator, ScrollView, useColorScheme, View } from "react-native";
import { hexToRgb, themes } from "../../modules/Themes";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Constants from "expo-constants";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { AcademicCapIcon, AdjustmentsVerticalIcon, ArrowPathIcon, BellSnoozeIcon, BookOpenIcon, CheckCircleIcon, ClockIcon, ComputerDesktopIcon, EnvelopeIcon, IdentificationIcon, Square2StackIcon, UsersIcon, WrenchScrewdriverIcon, XMarkIcon } from "react-native-heroicons/solid";
import * as WebBrowser from 'expo-web-browser';
import * as MailComposer from 'expo-mail-composer';
import * as Device from 'expo-device';
import Subscription from "../../components/Subscription";
import { getName } from "../../modules/Config";

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
            
            const { valid, endDate, freeTrial } = await hasSubscription();
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
            return "Vores server er nede"

        if(subscriptionState?.freeTrial)
            return "Din prøveperiode er aktiv"

        // @ts-ignore
        return subscriptionState?.hasSubscription ? "Dit abonnement er aktivt" : "Du har ikke et gyldigt abonnement"
    }

    const subscriptionSubtitle: () => string = () => {
        // @ts-ignore
        if(subscriptionState?.serverDown)
            return "Ukendt udløbsdato"

        if(subscriptionState?.freeTrial)
            return "Udløber d. " + (endDate ? endDate.toLocaleDateString() : "ukendt dato")

        return (subscriptionState?.hasSubscription && endDate) ? "Udløber d. " + (endDate ? endDate.toLocaleDateString() : "ukendt dato") : `Et abonnement giver ubegrænset adgang til {getName()}`;
    }

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
    <GestureHandlerRootView>
        <BottomSheetModalProvider>
            <View style={{
                minHeight: '100%',
                minWidth:'100%',

                marginTop: Constants.statusBarHeight + 10,
            }}>
                <ScrollView contentContainerStyle={{
                    backgroundColor: theme.BLACK,
                    paddingBottom: 20,
                }}>

                    <TableView style={{
                        paddingHorizontal: 20,
                    }}>
                        <Section header="INFORMATION" roundedCorners={true} hideSurroundingSeparators={true} hideSeparator>

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
                                accessoryColorDisclosureIndicator={theme.WHITE}
                                onPress={() => {
                                    // @ts-ignore
                                    if(!subscriptionState?.hasSubscription) {
                                        navigation.push("NoAccess");
                                        return;
                                    }

                                    navigation.navigate("Grades")
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
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
                                accessoryColorDisclosureIndicator={theme.WHITE}
                                onPress={() => {
                                    // @ts-ignore
                                    if(!subscriptionState?.hasSubscription) {
                                        navigation.push("NoAccess");
                                        return;
                                    }

                                    navigation.navigate("Dokumenter")
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
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
                                accessoryColorDisclosureIndicator={theme.WHITE}
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
                                accessoryColorDisclosureIndicator={theme.WHITE}
                                onPress={() => {
                                    // @ts-ignore
                                    if(!subscriptionState?.hasSubscription) {
                                        navigation.push("NoAccess");
                                        return;
                                    }

                                    navigation.navigate("Books")
                                }}
                                
                                contentContainerStyle={{
                                    paddingVertical: 5,
                                }}
                            />

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
                                accessoryColorDisclosureIndicator={theme.WHITE}
                                onPress={() => {
                                    navigation.navigate("Absence")
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
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
                                accessoryColorDisclosureIndicator={theme.WHITE}
                                onPress={() => {
                                    navigation.navigate("Afleveringer")
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title="Personer"
                                titleTextColor={theme.WHITE}
                                image={
                                    <UsersIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                accessoryColorDisclosureIndicator={theme.WHITE}
                                onPress={() => {
                                    navigation.navigate("TeachersAndStudents")
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title="Lokaler"
                                titleTextColor={theme.WHITE}
                                image={
                                    <ComputerDesktopIcon color={theme.ACCENT} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                accessory="DisclosureIndicator"
                                accessoryColorDisclosureIndicator={theme.WHITE}
                                onPress={() => {
                                    navigation.navigate("Lokaler")
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                }}
                            />
                        </Section>

                        <Section header="IDENTIFIKATION" hideSurroundingSeparators roundedCorners>
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
                                accessoryColorDisclosureIndicator={theme.WHITE}
                                onPress={() => {
                                    navigation.navigate("Studiekort")
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                }}
                            />  
                        </Section>

                        <Section header={"ADGANG"} roundedCorners={true} hideSurroundingSeparators={true} hideSeparator>
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

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                }}
                            />

                            <Cell 
                                cellStyle="Basic"
                                // @ts-ignore
                                title={((!subscriptionState?.hasSubscription && !subscriptionState?.serverDown) || subscriptionState?.freeTrial) ? "Køb abonnement" : "Administrer abonnement"}
                                titleTextColor={theme.ACCENT}

                                image={
                                    <AdjustmentsVerticalIcon color={hexToRgb(theme.ACCENT.toString(), 1)} style={{
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

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                }}
                            />

                            <Cell 
                                cellStyle="Basic"
                                title="Genindlæs adgang"
                                titleTextColor={theme.WHITE}
                                
                                image={
                                    <ArrowPathIcon color={hexToRgb(theme.WHITE.toString(), 0.3)} style={{
                                        opacity: 0.85,
                                    }}  />
                                }
                                onPress={() => {
                                    setLoadingSubscription(true);
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                }}
                            />
                        </Section>

                        <Section header={"KONTROLPANEL"} roundedCorners={true} hideSurroundingSeparators={true} hideSeparator>
                            <Cell
                                cellStyle="Basic"
                                title={"Profil"}

                                titleTextColor={theme.WHITE}
                                titleTextStyle={{
                                    fontWeight: "500",
                                }}
                                accessory="DisclosureIndicator"
                                accessoryColorDisclosureIndicator={theme.WHITE}

                                image={
                                    <WrenchScrewdriverIcon color={hexToRgb(theme.WHITE.toString(), 0.3)} />
                                }

                                onPress={() => {
                                    navigation.navigate("UserSettings")
                                }}

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                    zIndex: 5,
                                }}
                            />

                            <Cell
                                cellStyle="Basic"
                                title={`Kontakt ${getName()}`}

                                titleTextColor={theme.WHITE}
                                titleTextStyle={{
                                    fontWeight: "500",
                                }}
                                accessory="DisclosureIndicator"
                                accessoryColorDisclosureIndicator={theme.WHITE}

                                contentContainerStyle={{
                                    paddingVertical: 5,
                                    zIndex: 5,
                                }}

                                image={
                                    <EnvelopeIcon color={hexToRgb(theme.WHITE.toString(), 0.3)} />
                                }

                                onPress={() => {
                                    if(!MailComposer.isAvailableAsync())
                                        return;


                                    const body = (`

---------------
For at kunne hjælpe dig har vi brug for lidt information:
🧑🏻‍🎓: ${profile?.elevId}
🌀: ${Device.modelName}, ${Device.osVersion}`)

                                    MailComposer.composeAsync({
                                        subject: "Kontakt",
                                        body: body,
                                        recipients: ["kontakt@lectimate.com"]
                                    })

                                    
                                }}
                            />
                        </Section>

                        <View style={{
                            height: 150 + Constants.statusBarHeight,
                            width: "100%",
                        }} />
                    </TableView>
                </ScrollView>
                
                <Subscription bottomSheetModalRef={bottomSheetModalRef} />
            </View>
        </BottomSheetModalProvider>
    </GestureHandlerRootView>

    )
}