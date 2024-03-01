import { ActivityIndicator, Linking, NativeModules, ScrollView, StyleSheet, Switch, Text, View, useColorScheme } from "react-native";
import NavigationBar from "../components/Navbar";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { themes } from "../modules/Themes";
import { memo, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AcademicCapIcon, BellSnoozeIcon, BuildingLibraryIcon, ClipboardDocumentIcon, ClipboardDocumentListIcon, ClipboardIcon, ClockIcon, Square2StackIcon, UserMinusIcon, UsersIcon } from "react-native-heroicons/solid";
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

export default function Mere({ navigation }: {navigation: any}) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);

    const [loadingSubscription, setLoadingSubscription] = useState<boolean>();

    const { signOut } = useContext(AuthContext);

    const [loading, setLoading] = useState<boolean>(true);

    const [profile, setProfile] = useState<Profile>();

    const [aflysteLektioner, setAflysteLektioner] = useState<boolean>();
    const [ændredeLektioner, setÆndredeLektioner] = useState<boolean>();
    const [beskeder, setBeskeder] = useState<boolean>();

    const [showNotifications, setShowNotifications] = useState<boolean>(false);

    const renew = new Date();
    renew.setDate(renew.getDate() + 1);

    //const [development, setDevelopment] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            const prof = await getProfile() 
            setProfile(prof);

            setAflysteLektioner(prof.notifications.aflysteLektioner);
            setÆndredeLektioner(prof.notifications.ændredeLektioner);
            setBeskeder(prof.notifications.beskeder);
    
            setLoading(false);
        })();
    }, [])

    useEffect(() => {
        setLoadingSubscription(false);
    }, [loadingSubscription])

    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

    return (
    <GestureHandlerRootView>
        <BottomSheetModalProvider>
            <View style={{minHeight: '100%',minWidth:'100%'}}>

                {loading ?
                    <View style={{
                        position: "absolute",

                        top: "20%",
                        left: "50%",

                        transform: [{
                            translateX: -12.5,
                        }]
                    }}>
                        <ActivityIndicator size={"small"} color={theme.ACCENT} />
                    </View>
                    :
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
                                    isDisabled
                                />

                                <Cell
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
                                    isDisabled
                                />
                            </Section>

                            {showNotifications && (
                                <Section header={"NOTIFIKATIONER"} roundedCorners={true} hideSurroundingSeparators={true}>
                                    <Cell
                                        isDisabled
                                        cellStyle="Basic"
                                        title="Aflyste lektioner"
                                        titleTextColor={theme.WHITE}
                                        cellAccessoryView={<Switch 
                                            disabled
                                            trackColor={{false: '#767577', true: "#4ca300"}}

                                            onValueChange={() => setAflysteLektioner((prev) => {
                                                setProfile((profile) => {
                                                    if(profile != null) {
                                                        profile.notifications.aflysteLektioner = !prev;
                                                        saveProfile(profile);
                                                    }
                                                    return profile;
                                                })
                                                return !prev
                                            })}
                                            value={aflysteLektioner}
                                        />}
                                    />
                                    <Cell
                                        isDisabled
                                        cellStyle="Basic"
                                        title="Ændrede lektioner"
                                        titleTextColor={theme.WHITE}
                                        cellAccessoryView={<Switch 
                                            disabled
                                            trackColor={{false: '#767577', true: "#4ca300"}}

                                            onValueChange={() => setÆndredeLektioner((prev) => {
                                                setProfile((profile) => {
                                                    if(profile != null) {
                                                        profile.notifications.ændredeLektioner = !prev;
                                                        saveProfile(profile);
                                                    }
                                                    return profile;
                                                })
                                                return !prev
                                            })}
                                            value={ændredeLektioner}
                                        />}
                                    />
                                    <Cell
                                        isDisabled
                                        cellStyle="Basic"
                                        title="Beskeder"
                                        titleTextColor={theme.WHITE}
                                        cellAccessoryView={<Switch 
                                            disabled

                                            trackColor={{false: '#767577', true: "#4ca300"}}
                                            onValueChange={() => setBeskeder((prev) => {
                                                setProfile((profile) => {
                                                    if(profile != null) {
                                                        profile.notifications.beskeder = !prev;
                                                        saveProfile(profile);
                                                    }

                                                    return profile;
                                                })
                                                return !prev
                                            })}
                                            value={beskeder}
                                        />}
                                    />
                                </Section>
                            )}

                            <Section header={"ABONNEMENT"} roundedCorners={true} hideSurroundingSeparators={true} >
                                <Cell 
                                    cellStyle="Subtitle"
                                    title="Dit abonnement er aktivt"
                                    titleTextColor={theme.WHITE}

                                    detail={"Fornyes d. " + renew.toLocaleDateString()}

                                    accessory={!loadingSubscription && "Checkmark"}
                                    accessoryColor={!loadingSubscription ? theme.ACCENT : undefined}
                                    cellAccessoryView={loadingSubscription && (
                                        <ActivityIndicator size={"small"} />
                                    )}
                                />
                                
                                <Cell 
                                    cellStyle="Basic"
                                    title="Administrer abonnement"
                                    titleTextColor={theme.ACCENT}

                                    onPress={() => {
                                        bottomSheetModalRef.current?.present();
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
                                    cellStyle="RightDetail"
                                    title={profile?.name.slice(0,21)}
                                    detail={profile?.username.slice(0,13)}

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
                }

                <Subscription bottomSheetModalRef={bottomSheetModalRef} />
            </View>
        </BottomSheetModalProvider>
    </GestureHandlerRootView>

    )
}