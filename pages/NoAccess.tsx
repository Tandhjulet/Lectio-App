import { ScrollView, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { hexToRgb, themes } from "../modules/Themes";
import { BookOpenIcon, CalendarDaysIcon, CalendarIcon, ClockIcon, PencilSquareIcon, Square2StackIcon, XMarkIcon } from "react-native-heroicons/solid";
import { Option } from "../components/Subscription";
import { memo, useEffect, useMemo } from "react";
import { NavigationProp } from "@react-navigation/native";
import Constants from 'expo-constants';
import { TrophyIcon } from "react-native-heroicons/solid";

interface Argument {
    title: string,
    description: string,
    icon: JSX.Element,
}

const Reason = memo((arg: Argument) => {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];
    
    return (
        <View style={{
            width: "100%",
        }}>
            <View style={{
                margin: 10,
                marginTop: 0,
                borderRadius: 10,
                padding: 10,

                display: "flex",
                flexDirection: "row",

                gap: 10,
                alignItems: "center",

                backgroundColor: theme.BLACK,
            }}>
                {arg.icon}

                <View style={{
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: "100%",
                    marginRight: 40,
                }}>
                    <Text style={{
                        color: scheme == "dark" ? "#FFF" : "#000",
                        fontWeight: "bold",
                        fontSize: 17,
                    }}>
                        {arg.title}
                    </Text>

                    <Text style={{
                        color: theme.WHITE,
                    }}>
                        {arg.description}
                    </Text>
                </View>
            </View>
        </View>
    )
})

export default function NoAccess({
    navigation
}: {
    navigation: NavigationProp<any>,
}) {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View style={{
            minHeight: "100%",
            width: "100%",

            display: "flex",
            flexDirection: "column",
            overflow: "scroll",

            marginVertical: Constants.statusBarHeight + 10,

            paddingHorizontal: 20,

            gap: 15,
        }}>
            <View style={{
                display: "flex",
                flexDirection: "row",

                justifyContent: "space-between",
            }}>
                <View style={{
                    maxWidth: "70%",
                }}>
                    <Text style={{
                        fontWeight: "bold",
                        fontSize: 25,
                        color: scheme === "dark" ? "#FFF" : "#000",
                    }}>
                        Køb abonnement
                    </Text>

                    <Text style={{
                        color: theme.WHITE,
                    }} numberOfLines={2}>
                        Du skal købe et abonnement for at få adgang til dette
                    </Text>
                </View>

                <TouchableOpacity style={{
                    width: 40,
                    height: 40,

                    borderRadius: 32,
                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.3),

                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }} onPress={() => {
                    navigation.goBack();
                }}>
                    <XMarkIcon color={hexToRgb(theme.WHITE.toString(), 1)} />
                </TouchableOpacity>
            </View>

            <ScrollView style={{
                width: "100%",
                backgroundColor: scheme === "dark" ? hexToRgb(theme.WHITE.toString(), 0.2) : theme.ACCENT_BLACK,

                flexShrink: 1,
                borderRadius: 20,
            }}>
                <View style={{
                    height: 10,
                    width: "100%",
                }} />

                <Reason
                    title={"Karakterer"}
                    description={"Få et overskueligt overblik over dine karakterer, så du ved hvor du skal prioritere!"}
                    icon={<TrophyIcon color={theme.LIGHT} size={40} />}
                />

                <Reason
                    title={"Bøger"}
                    description={"Se hvilke bøger du låner af din skole, så du ikke overskrider afleveringstiden!"}
                    icon={<BookOpenIcon color={theme.LIGHT} size={40} />}
                />

                <Reason
                    title={"Fraværsregistrering"}
                    description={"Registrer dine fraværsårsager direkte fra appen, så du kan holde styr på det!"}
                    icon={<PencilSquareIcon color={theme.LIGHT} size={40} />}
                />

                <Reason
                    title={"Dokumenter"}
                    description={"Få adgang til de dokumenter der bliver brugt i undervisningen - så du nemt kan studere på farten!"}
                    icon={<Square2StackIcon color={theme.LIGHT} size={40} />}
                />

                <Reason
                    title={"Afleveringer"}
                    description={"Se information om dine afleveringer, så du kun skal fokusere på, at få afleveret!"}
                    icon={<ClockIcon color={theme.LIGHT} size={40} />}
                />

                <Reason
                    title={"Justinger af uge i skema"}
                    description={"Se dit skema flere uger frem - eller tilbage - så du har mulighed for at planlægge din hverdag!"}
                    icon={<CalendarDaysIcon color={theme.LIGHT} size={40} />}
                />
            </ScrollView>

            <View style={{
                width: "100%",
                marginTop: 5,
                paddingBottom: 89 + Constants.statusBarHeight + 20 + 10,

                display: "flex",
                justifyContent:"space-between",
                alignItems: "center",
                flexDirection: "row",
            }}>
                <Option
                    title={'Månedligt'}
                    subtitle={'1 mdr. varighed\nFornyes automatisk!'}
                    sku={"premium_monthly"}
                    price={'9,00'}
                />
                
                <Option
                    title={'Årligt'}
                    subtitle={'1 års varighed\nFornyes automatisk!'}
                    price={'59,00'}
                    sku={"premium_yearly"}
                />
            </View>
        </View>
    )
}