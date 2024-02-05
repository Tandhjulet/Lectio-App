import { ActivityIndicator, Linking, NativeModules, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import COLORS from "../modules/Themes";
import { memo, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AcademicCapIcon, BellSnoozeIcon, BuildingLibraryIcon, ClipboardDocumentIcon, ClipboardDocumentListIcon, ClipboardIcon, ClockIcon, Square2StackIcon, UserMinusIcon, UsersIcon } from "react-native-heroicons/solid";
import { getUnsecure, removeSecure, removeUnsecure, secureGet, signOut } from "../modules/api/Authentication";
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
                        <ActivityIndicator size={"small"} color={COLORS.ACCENT} />
                    </View>
                    :
                    <ScrollView contentContainerStyle={styles.stage}>
                        <TableView style={{
                            paddingHorizontal: 20,
                        }}>
                            <Section header={"INFORMATION"} roundedCorners={true} hideSurroundingSeparators={true} >
                                <Cell
                                    cellStyle="Basic"
                                    title="Fravær"
                                    titleTextColor={COLORS.WHITE}
                                    image={
                                        <BellSnoozeIcon color={COLORS.ACCENT} style={{
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
                                    titleTextColor={COLORS.WHITE}
                                    image={
                                        <ClockIcon color={COLORS.ACCENT} style={{
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
                                    titleTextColor={COLORS.WHITE}
                                    image={
                                        <UsersIcon color={COLORS.ACCENT} style={{
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
                                    titleTextColor={COLORS.WHITE}
                                    image={
                                        <BuildingLibraryIcon color={COLORS.ACCENT} style={{
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
                                    titleTextColor={COLORS.WHITE}
                                    image={
                                        <AcademicCapIcon color={COLORS.ACCENT} style={{
                                            opacity: 0.85,
                                        }} />
                                    }
                                    accessory="DisclosureIndicator"
                                    isDisabled
                                />

                                <Cell
                                    cellStyle="Basic"
                                    title="Spørgeskemaer"
                                    titleTextColor={COLORS.WHITE}
                                    image={
                                        <ClipboardDocumentListIcon color={COLORS.ACCENT} style={{
                                            opacity: 0.85,
                                        }}  />
                                    }
                                    accessory="DisclosureIndicator"
                                    isDisabled
                                />

                                <Cell
                                    cellStyle="Basic"
                                    title="Dokumenter"
                                    titleTextColor={COLORS.WHITE}
                                    image={
                                        <Square2StackIcon color={COLORS.ACCENT} style={{
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
                                        titleTextColor={COLORS.WHITE}
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
                                        titleTextColor={COLORS.WHITE}
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
                                        titleTextColor={COLORS.WHITE}
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
                                    titleTextColor={COLORS.WHITE}

                                    detail={"Fornyes d. " + renew.toLocaleDateString()}

                                    accessory={"Checkmark"}
                                    accessoryColor={COLORS.ACCENT}
                                />
                                
                                <Cell 
                                    cellStyle="Basic"
                                    title="Administrer abonnement"
                                    titleTextColor={COLORS.ACCENT}

                                    onPress={() => {}}
                                />

                                <Cell 
                                    cellStyle="Basic"
                                    title="Genindlæs adgang"
                                    titleTextColor={COLORS.ACCENT}

                                    onPress={() => {

                                    }}
                                />
                            </Section>

                            <Section roundedCorners={true} hideSurroundingSeparators={true}>
                                <Cell
                                    cellStyle="Basic"
                                    title={"Privatlivspolitik"}

                                    titleTextColor={COLORS.WHITE}
                                    accessory="DisclosureIndicator"

                                    onPress={() => {
                                        WebBrowser.openBrowserAsync("https://lectioplus.com/privatliv", {
                                            controlsColor: COLORS.ACCENT,
                                            dismissButtonStyle: "close",
                                            presentationStyle: WebBrowserPresentationStyle.POPOVER,

                                            toolbarColor: COLORS.ACCENT_BLACK,
                                        })
                                    }}
                                />

                                <Cell
                                    cellStyle="Basic"
                                    title={"Kontakt Lectio Plus"}

                                    titleTextColor={COLORS.WHITE}
                                    accessory="DisclosureIndicator"

                                    onPress={() => {
                                        if(!MailComposer.isAvailableAsync())
                                            return;


                                        const body = (`

---------------
For at bedre kunne hjælpe dig, har vi brug for lidt information:
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
                                    title={profile?.name.slice(0,23)}

                                    detail={profile?.username.slice(0,13)}

                                    titleTextColor={COLORS.WHITE}
                                />

                                <Cell
                                    cellStyle="Basic"
                                    title="Log ud"

                                    titleTextStyle={{
                                        fontWeight: "bold"
                                    }}
                                    titleTextColor={COLORS.RED}
                                    accessory="DisclosureIndicator"

                                    onPress={() => {
                                        (async () => {
                                            await signOut();

                                            await removeSecure("password");
                                            await removeSecure("username");
                                            //await removeUnsecure("gym");

                                            signOut();
                                            abort();
                                        })();
                                    }}
                                />
                            </Section>

                            <Text style={{
                                color: COLORS.WHITE,
                                opacity: 0.5,
                            }}>
                                BETA (v0.0.1)
                            </Text>

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

const styles = StyleSheet.create({
    stage: {
      backgroundColor: COLORS.BLACK,
      paddingBottom: 20,
    },
  });