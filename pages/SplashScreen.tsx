import { Text, View, useColorScheme } from "react-native";
import Constants from 'expo-constants';
import { Image } from "react-native-svg";
import { themes } from "../modules/Themes";
import Logo from "../components/Logo";

export default function SplashScreen({ navigation }: { navigation: any }) {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
    <View style={{
        height: '100%',
        width: '100%',
        backgroundColor: Constants.expoConfig?.splash?.backgroundColor ?? theme.BLACK,

        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    }}>
        <Logo size={60} />
    </View>
    )
}