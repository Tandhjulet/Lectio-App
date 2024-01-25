import { Text, View } from "react-native";
import Constants from 'expo-constants';
import { Image } from "react-native-svg";

export default function SplashScreen({ navigation }: { navigation: any }) {
    return (
    <View style={{
        height: '100%',
        width:'100%',
        backgroundColor: Constants.expoConfig?.splash?.backgroundColor ?? "#000"
    }}>
    </View>
    )
}