import { View } from "react-native";
import COLORS from "../../modules/Themes";
import { NavigationProp } from "@react-navigation/native";

export default function BeskedView({ navigation }: {
    navigation: NavigationProp<any>,
}) {
    return (
        <View style={{
            minHeight: "70%",
            minWidth: "100%",

            backgroundColor: COLORS.BLACK,
        }}>

        </View>
    )
}