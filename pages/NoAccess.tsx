import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { hexToRgb, themes } from "../modules/Themes";
import { BookOpenIcon, CalendarDaysIcon, CalendarIcon, ClockIcon, PencilSquareIcon, Square2StackIcon, XMarkIcon } from "react-native-heroicons/solid";
import { Option } from "../components/Subscription";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NavigationProp } from "@react-navigation/native";
import Constants from 'expo-constants';
import { TrophyIcon } from "react-native-heroicons/solid";
import { BannerItem } from "./login/LandingPage";
import Logo from "../components/Logo";

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

    const bannerItems = useRef([
        <BannerItem theme={theme} title="Karakterer" description="Lectio 360 udregner automatisk dit vægtede gennemsnit!" />,
        <BannerItem theme={theme} title="Bøger" description="Se hvilke bøger du låner af din skole, så du ikke overskrider afleveringstiden!" />,
        <BannerItem theme={theme} title="Fraværsregistrering" description="Registrer dine fraværsårsager direkte fra appen, så du kan holde styr på det!" />,
        <BannerItem theme={theme} title="Dokumenter" description="Få adgang til de dokumenter, der inddrages i timen - så du kan studere på farten!" />,
        <BannerItem theme={theme} title="Afleveringer" description="Se information om dine afleveringer, så du kun skal fokusere på, at få afleveret!" />,
        <BannerItem theme={theme} title="Justing af uge i skema" description="Se dit skema flere uger frem, eller tilbage, så du får mulighed for at planlægge!" />,
    ]).current;

    const [width, setWidth] = useState(0);

    const slideAnim = useRef(new Animated.Value(0)).current;

    useLayoutEffect(() => {
        const animation = Animated.loop(
            Animated.timing(slideAnim, {
                toValue: -width,
                duration: 30000,
                useNativeDriver: true,
                easing: Easing.linear,
            })
        );
        animation.start();

        return () => {
            animation.stop();
        }
    }, [width]); // width will update the view causing the animation to stop

    return (
        <View style={{
            maxHeight: "100%",
            width: "100%",

            display: "flex",
            flexDirection: "column",
            overflow: "scroll",

            marginVertical: Constants.statusBarHeight + 10,

            gap: 15,
        }}>
            <View style={{
                display: "flex",
                flexDirection: "row",

                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
            }}>
                <View>
                    <Text style={{
                        fontWeight: "800",
                        fontSize: 20,
                        color: hexToRgb(theme.WHITE.toString(), 0.9),
                    }}>
                        Abonnement påkrævet
                    </Text>
                    <Text style={{
                        color: hexToRgb(theme.WHITE.toString(), 0.7),
                    }}>
                        Denne funktion kræver et betalt abonnement.
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

            <View style={{
                width: "100%",
                height: 90,
                overflow: "hidden",
                position: "relative",

                marginVertical: 5,
            }}>
                <View style={{
                    display: "flex",
                    position: "absolute",
                    flexDirection: "row",
                }}>
                    <Animated.View style={{
                        transform: [{translateX: slideAnim}],
                        display: "flex",
                        flexDirection: "row",
                    }} onLayout={(e) => {
                        setWidth(e.nativeEvent.layout.width);
                    }}>
                        {bannerItems.map((Card, i) => (
                            <View key={i + "1"}>
                                {Card}
                            </View>
                        ))}
                    </Animated.View>
                    <Animated.View style={{
                        transform: [{translateX: slideAnim}],
                        display: "flex",
                        flexDirection: "row",
                    }}>
                        {bannerItems.map((Card, i) => (
                            <View key={i + "2"}>
                                {Card}
                            </View>
                        ))}
                    </Animated.View>
                    <Animated.View style={{
                        transform: [{translateX: slideAnim}],
                        display: "flex",
                        flexDirection: "row",
                    }}>
                        {bannerItems.map((Card, i) => (
                            <View key={i + "3"}>
                                {Card}
                            </View>
                        ))}
                    </Animated.View>
                </View>
            </View>

            <View style={{
                justifyContent: "center",
                alignItems: "center",
            }}>
                <View style={{flex: 1}} />

                <Text style={{
                    color: theme.WHITE,

                    fontSize: 22.5,

                    fontWeight: "900",
                    letterSpacing: 0.7,
                    textAlign: "center"
                }}>
                    Få fuld adgang
                </Text>
                <View style={{
                    display: "flex",
                    flexDirection: "row",
                }}>
                    <Text style={{
                        color: theme.WHITE,
                    }}>
                        gennem et ikke-bindene abonnement til 
                    </Text>
                    <Text style={{
                        color: theme.ACCENT,
                    }}>
                        {" "}Lectio 360
                    </Text>
                    <Text style={{
                        color: theme.WHITE,
                    }}>
                        !
                    </Text>
                </View>

                <Text style={{
                    color: theme.LIGHT,
                    opacity: 0.9,
                    textAlign: "center",

                    marginTop: 7.5,
                }}>
                    Dit abonnement vil give dig 
                    {"\n"}
                    <Text style={{
                        fontWeight: "bold",
                    }}>
                        ubegrænset adgang
                    </Text>
                    {" "}til Lectio 360!
                </Text>

                <View style={{
                    height: StyleSheet.hairlineWidth,
                    width: 100,

                    backgroundColor: theme.ACCENT,

                    marginTop: 15,
                }} />
            </View>

            <View style={{
                width: "100%",

                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <View style={{
                    padding: 20,
                    borderRadius: 999,
                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
                }}>
                    <Logo size={60} minOpacity={0.9} minScale={0.8} color={hexToRgb(theme.WHITE.toString(), 0.7)} />
                </View>
            </View>

            <View style={{
                width: "100%",
                justifyContent: "center",
                alignItems: "center",

                gap: 10,
            }}>
                <View style={{
                    height: StyleSheet.hairlineWidth,
                    width: 100,

                    backgroundColor: theme.ACCENT,
                }} />

                <Text style={{
                    color: theme.WHITE,
                    opacity: 0.8,
                }}>
                    Lectio 360 tilbyder følgende muligheder
                </Text>
            </View>
            
            <View style={{
                width: "100%",
                paddingBottom: 89 + Constants.statusBarHeight + 20 + 10,

                display: "flex",
                justifyContent:"space-between",
                alignItems: "center",
                flexDirection: "row",
                paddingHorizontal: 20,
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