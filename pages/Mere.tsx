import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import COLORS from "../modules/Themes";
import { useContext, useEffect, useState } from "react";
import { BellSnoozeIcon, UserMinusIcon, UsersIcon } from "react-native-heroicons/solid";
import { getUnsecure, removeSecure, removeUnsecure, signOut } from "../modules/api/Authentication";
import { Profile, getProfile, saveProfile } from "../modules/api/scraper/Scraper";
import { AuthContext } from "../modules/Auth";

export default function Mere({ navigation }: {navigation: any}) {
    const { signOut } = useContext(AuthContext);

    const [loading, setLoading] = useState<boolean>(true);

    const [profile, setProfile] = useState<Profile>();

    const [aflysteLektioner, setAflysteLektioner] = useState<boolean>();
    const [ændredeLektioner, setÆndredeLektioner] = useState<boolean>();
    const [beskeder, setBeskeder] = useState<boolean>();

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
    <View style={{height: '100%',width:'100%'}}>

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
                            title="Pjæk-o'-meter"
                            titleTextColor={COLORS.WHITE}
                            image={
                                <UserMinusIcon color={COLORS.LIGHT} />
                            }
                            accessory="DisclosureIndicator"
                            onPress={() => {
                                navigation.navigate("TruantOMeter")
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

                    <Section header={"KONTROLPANEL"} roundedCorners={true} hideSurroundingSeparators={true} >
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

                                    signOut()
                                })();
                            }}
                        />
                    </Section>
                </TableView>
            </ScrollView>
        }

        <NavigationBar currentTab={"Mere"} navigation={navigation} />
    </View>
    )
}

const styles = StyleSheet.create({
    stage: {
      backgroundColor: COLORS.BLACK,
      paddingBottom: 20,
    },
  });