import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import COLORS from "../modules/Themes";
import { useContext, useEffect, useState } from "react";
import { AcademicCapIcon, BellSnoozeIcon, BuildingLibraryIcon, ClipboardDocumentIcon, ClipboardDocumentListIcon, ClipboardIcon, ClockIcon, Square2StackIcon, UserMinusIcon, UsersIcon } from "react-native-heroicons/solid";
import { getUnsecure, removeSecure, removeUnsecure, secureGet, signOut } from "../modules/api/Authentication";
import { Profile, getProfile, saveProfile } from "../modules/api/scraper/Scraper";
import { AuthContext } from "../modules/Auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { abort } from "../modules/api/scraper/class/PeopleList";
import * as SecureStore from 'expo-secure-store';

export default function Mere({ navigation }: {navigation: any}) {
    const { signOut } = useContext(AuthContext);

    const [loading, setLoading] = useState<boolean>(true);

    const [profile, setProfile] = useState<Profile>();

    const [aflysteLektioner, setAflysteLektioner] = useState<boolean>();
    const [ændredeLektioner, setÆndredeLektioner] = useState<boolean>();
    const [beskeder, setBeskeder] = useState<boolean>();

    const [development, setDevelopment] = useState<boolean>(false);

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
                    <Section header={"DIG"} roundedCorners={true} hideSurroundingSeparators={true} >
                        <Cell
                            cellStyle="Subtitle"
                            title={profile?.name}

                            detail={profile?.username}

                            titleTextColor={COLORS.WHITE}
                        />
                        <Cell
                            cellStyle="Basic"
                            title={profile?.school}

                            titleTextColor={COLORS.WHITE}
                        />
                    </Section>

                    <Section header={"INFORMATION"} roundedCorners={true} hideSurroundingSeparators={true} >
                        <Cell
                            cellStyle="Basic"
                            title="Fravær"
                            titleTextColor={COLORS.WHITE}
                            image={
                                <BellSnoozeIcon color={COLORS.LIGHT} />
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
                                <ClockIcon color={COLORS.LIGHT} />
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
                                <UsersIcon color={COLORS.LIGHT} />
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
                                <BuildingLibraryIcon color={COLORS.LIGHT} />
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
                                <AcademicCapIcon color={COLORS.LIGHT} />
                            }
                            accessory="DisclosureIndicator"
                            isDisabled
                        />

                        <Cell
                            cellStyle="Basic"
                            title="Spørgeskemaer"
                            titleTextColor={COLORS.WHITE}
                            image={
                                <ClipboardDocumentListIcon color={COLORS.LIGHT} />
                            }
                            accessory="DisclosureIndicator"
                            isDisabled
                        />

                        <Cell
                            cellStyle="Basic"
                            title="Dokumenter"
                            titleTextColor={COLORS.WHITE}
                            image={
                                <Square2StackIcon color={COLORS.LIGHT} />
                            }
                            accessory="DisclosureIndicator"
                            isDisabled
                        />
                    </Section>

                    <Section header={"NOTIFIKATIONER"} roundedCorners={true} hideSurroundingSeparators={true} >
                        <Cell
                            cellStyle="Basic"
                            title="Aflyste lektioner"
                            titleTextColor={COLORS.WHITE}
                            cellAccessoryView={<Switch 
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
                            cellStyle="Basic"
                            title="Ændrede lektioner"
                            titleTextColor={COLORS.WHITE}
                            cellAccessoryView={<Switch 
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
                            cellStyle="Basic"
                            title="Beskeder"
                            titleTextColor={COLORS.WHITE}
                            cellAccessoryView={<Switch 
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

                    <Section header={"ABONNEMENT"} roundedCorners={true} hideSurroundingSeparators={true} >
                        <Cell 
                            cellStyle="Basic"
                            title="Administrer abonnoment"
                            titleTextColor={COLORS.WHITE}
                            onPress={() => {
                                navigation.navigate("Checkout")
                            }}
                        />
                    </Section>

                    <Section header={"KONTROLPANEL"} roundedCorners={true} hideSurroundingSeparators={true} >
                        <Cell
                            cellStyle="Basic"
                            title="Udvikler tilstand"
                            titleTextColor={COLORS.WHITE}
                            cellAccessoryView={<Switch 
                                trackColor={{false: '#767577', true: "#4ca300"}}

                                onValueChange={() => setDevelopment((prev) => !prev)}
                                value={development}
                            />}
                        />

                        {development && (
                            <Cell
                                cellStyle="Basic"
                                title="Slet data"

                                titleTextColor={COLORS.RED}
                                accessory="DisclosureIndicator"

                                onPress={() => {
                                    AsyncStorage.clear();
                                    removeSecure("password");
                                    removeSecure("username");
                                    abort();
                                }}
                            />
                        )}

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
                        BETA (v0.0.1) - Mads B. Mortensen
                    </Text>

                    <View style={{
                        paddingVertical: 100,
                    }} />
                </TableView>
            </ScrollView>
        }
    </View>
    )
}

const styles = StyleSheet.create({
    stage: {
      backgroundColor: COLORS.BLACK,
      paddingBottom: 20,
    },
  });