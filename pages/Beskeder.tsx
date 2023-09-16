import { Text, View } from "react-native";
import NavigationBar from "../components/Navbar";

export default function Beskeder({ navigation }: {navigation: any}) {
    return (
    <View style={{height: '100%',width:'100%'}}>
        <Text style={{fontSize: 50}}>Test!</Text>

        <NavigationBar currentTab={"Beskeder"} navigation={navigation} />
    </View>
    )
}