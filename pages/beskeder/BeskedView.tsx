import { Text, View } from "react-native";
import { LectioMessage } from "../../modules/api/scraper/MessageScraper";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import COLORS from "../../modules/Themes";

export default function BeskedView({ navigation, route }: {
    navigation: NavigationProp<any>,
    route: RouteProp<any>
}) {
    const message: LectioMessage = route.params?.message;

    return (
        <View style={{
            height: '100%',
            width:'100%',

            display: 'flex',
            justifyContent: 'center',
            paddingBottom: 200,
        }}>
            <View style={{
                paddingHorizontal: 10,
                paddingVertical: 20,

                backgroundColor: COLORS.DARK,
                borderRadius: 5,

                maxWidth: "100%",
                marginHorizontal: 40,
            }}>
                <Text>
                    {message.sender}
                </Text>
                <Text>
                    {message.title}
                </Text>
            </View>
        </View>
    )
}