import { Animated, Dimensions, Easing, Pressable, Text, TouchableHighlight, TouchableOpacity, View, useColorScheme } from "react-native";
import Logo from "../../components/Logo";
import { hexToRgb, Theme, themes } from "../../modules/Themes";
import { ChevronRightIcon } from "react-native-heroicons/solid";
import BackgroundSVG from "../../components/BackgroundSVG";
import * as WebBrowser from 'expo-web-browser';

import Constants from 'expo-constants';
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";

export const BannerItem = memo(function({
    title,
    description,
    theme,
}: {
    title: string,
    description: string,
    theme: Theme,
}) {
    return (
        <View style={{
            width: 240,
            height: 90,
            marginRight: 5,
            
            backgroundColor: "#1f2120",
        }}>
            <View style={{
                position: "absolute",
                left: 0,
                top: 0,

                width: 80,
                height: "100%",

                transform: [{
                    translateX: -20
                }]
            }}>

                    <View style={{
                        position: "absolute",

                        width: 0,
                        height: 0,
                        backgroundColor: "transparent",
                        borderStyle: "solid",
                        borderRightWidth: 20,
                        borderTopWidth: 100,
                        borderRightColor: "transparent",
                        borderTopColor: theme.ACCENT_BLACK,

                        transform: [{
                            rotate: "180deg",
                        }, {
                            translateX: 5,
                        }]
                    }} />

                <View style={{
                    position: "absolute",
                    top: 0,

                    width: 0,
                    height: 0,
                    backgroundColor: "transparent",
                    borderStyle: "solid",
                    borderRightWidth: 20,
                    borderTopWidth: 100,
                    borderRightColor: "transparent",
                    borderTopColor: "#1f2120",

                    transform: [{
                        rotate: "180deg",
                    }]
                }} />

            </View>

            <View style={{
                width: "100%",
                height: "100%",
                
                paddingVertical: 5,
                paddingHorizontal: 10,
            }}>
                <Text style={{
                    color: hexToRgb(theme.WHITE.toString(), 0.9),
                    fontWeight: "900",
                    fontSize: 17.5,
                }}>
                    {title}
                </Text>

                <Text style={{
                    fontSize: 15,
                    color: theme.WHITE,

                    width: 215,
                }} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={3}>
                    {description}
                </Text>
            </View>
        </View>
    )
})

export default function LandingPage({
    navigation,
}: {
    navigation: any,
}) {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const bannerItems = useRef([
        <BannerItem theme={theme} title="Karakterer" description="Lectio 360 udregner automatisk dit vægtede gennemsnit!" />,
        <BannerItem theme={theme} title="Skemaoversigt" description="Se en detaljeret oversigt over dit skema, for et effektivt overblik af din hverdag!" />,
        <BannerItem theme={theme} title="Fravær" description="Skab overblik over dit fravær, med en detaljeret rapport!" />,
        <BannerItem theme={theme} title="Indbakke" description="Send og modtag beskeder, så du kan holde dig ajour!" />,
        <BannerItem theme={theme} title="Studiekort" description="Tag dit studiekort med dig på farten, så du aldrig glemmer det!" />,
    ]).current;
    
    const screenWidth = Dimensions.get("screen").width;
    const [width, setWidth] = useState(0);

    const slideAnim = useRef(new Animated.Value(0)).current;

    useLayoutEffect(() => {
        const animation = Animated.loop(
            Animated.timing(slideAnim, {
                toValue: -width,
                duration: 10000,
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
            display: "flex",
            flexDirection: "column",

            height: "100%",
            width: "100%",

            backgroundColor: theme.ACCENT_BLACK,
        }}>
            <View style={{
                width: screenWidth,
                paddingTop: Constants.statusBarHeight + 20,
                backgroundColor: hexToRgb(theme.WHITE.toString(), 1),
            }}>
                <View style={{
                    height: 230,
                }} />
                
                <BackgroundSVG style={{
                    position: "absolute",
                    top: Constants.statusBarHeight + 20,

                    maxHeight: 230,
                    transform: [{translateX: -screenWidth / 4}]
                }} />
            </View>

            <View style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",

                marginTop: 40,
                gap: 10,
            }}>
                <Text style={{
                    color: hexToRgb(theme.WHITE.toString(), 1),

                    fontSize: 50,
                    fontWeight: "900",
                    paddingHorizontal: 20,
                }} adjustsFontSizeToFit minimumFontScale={0.01} numberOfLines={1}>
                    Velkommen til Lectio 360
                </Text>

                <Text style={{
                    color: theme.WHITE,
                    fontSize: 20,
                    textAlign: "center",
                }}>
                    Din forbedrede version
                    {"\n"}
                    af Lectio
                </Text>
            </View>

            <View style={{
                marginTop: 20,
                marginBottom: 10,

                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <Logo size={80}/>
            </View>

            <View style={{
                width: "100%",
                height: 90,
                overflow: "hidden",
                position: "relative",

                marginTop: 20,
                marginBottom: 20,
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
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginTop: 15,
            }}>
                <TouchableOpacity onPress={() => {
                    navigation.navigate("Schools")
                }}>
                    <View style={{
                        paddingLeft: 40,
                        paddingRight: 25,

                        paddingVertical: 15,
                        borderRadius: 20,

                        backgroundColor: "#1f2120",

                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 5,
                    }}>
                        <Text style={{
                            color: theme.WHITE,
                            fontSize: 20,

                            fontWeight: "500",
                            letterSpacing: 0.6,
                        }}>
                            Videre
                        </Text>
                        <ChevronRightIcon size={25} color={theme.ACCENT} />
                    </View>
                </TouchableOpacity>
            </View>

            <View style={{
                display: "flex",
                width: "100%",

                marginTop: 20,
            }}>
                <Text style={{
                    color: hexToRgb(theme.WHITE.toString(), 0.7),
                    textAlign: "center",
                    textAlignVertical: "center",
                }}>
                    Ved at bruge Lectio 360 accepterer du vores{" "}
                    <Text onPress={() => {
                        WebBrowser.openBrowserAsync("https://lectio360.dk/eula", {
                            controlsColor: theme.ACCENT.toString(),
                            dismissButtonStyle: "close",
                            presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,

                            toolbarColor: theme.ACCENT_BLACK.toString(),
                        })
                    }} style={{
                        textDecorationLine: "underline",
                        color: hexToRgb(theme.ACCENT.toString(), 0.8),
                    }}>
                        slutbrugerlicensaftale
                    </Text>
                    {" og "}
                    <Text onPress={() => {
                        WebBrowser.openBrowserAsync("https://lectio360.dk/privatliv", {
                            controlsColor: theme.ACCENT.toString(),
                            dismissButtonStyle: "close",
                            presentationStyle: WebBrowser.WebBrowserPresentationStyle.POPOVER,

                            toolbarColor: theme.ACCENT_BLACK.toString(),
                        })
                    }} style={{
                        textDecorationLine: "underline",
                        color: hexToRgb(theme.ACCENT.toString(), 0.8),
                    }}>
                        privatlivspolitik
                    </Text>!
                </Text>
            </View>
        </View>
    )
}