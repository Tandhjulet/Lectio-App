import { Pressable, Text, TouchableHighlight, View } from "react-native";
import Logo from "../../components/Logo";
import COLORS from "../../modules/Themes";
import { ChevronRightIcon } from "react-native-heroicons/solid";
import BackgroundSVG from "../../components/BackgroundSVG";

export default function LandingPage({
    navigation,
}: {
    navigation: any,
}) {
    return (
        <View style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",

            flexDirection: "column",

            height: "100%",
            width: "100%",

            backgroundColor: COLORS.WHITE,
        }}>
                <BackgroundSVG style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                }} />

            <View style={{
                display: "flex",
                alignItems: "center",
            }}>
                <Logo color={COLORS.ACCENT_BLACK} size={128} minOpacity={0.8} />

                <Text style={{
                    color: COLORS.DARK,
                    fontWeight: "700",
                    
                    fontSize: 100,
                    textAlign: "center",
                }}>
                    Lectio
                    Plus
                </Text>
            </View>

            <Pressable onPress={() => {
                navigation.navigate("Login")
            }}>
                <View style={{
                    paddingLeft: 40,
                    paddingRight: 25,

                    paddingVertical: 15,
                    borderRadius: 20,

                    backgroundColor: COLORS.ACCENT_BLACK,

                    display: "flex",

                    justifyContent: "center",
                    alignItems: "center",

                    flexDirection: "row",
                    
                    gap: 5,
                }}>
                    <Text style={{
                        color: COLORS.WHITE,
                        fontSize: 20,

                        fontWeight: "500",
                        letterSpacing: 0.6,
                    }}>
                        Kom igang
                    </Text>
                    <ChevronRightIcon size={25} />
                </View>
            </Pressable>
        </View>
    )
}