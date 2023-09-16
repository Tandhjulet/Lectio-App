import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { authorize, getUnsecure, isAuthorized } from "../modules/api/Authentication";

export default function Loading({ navigation }: {navigation: any}) {
  
    useEffect(() => {
        setTimeout(() => {
            (async () => {
                const res = await authorize();
                if(!res) {
                    getUnsecure("gym").then((gym: { gymName: string, gymNummer: string }) => {
                        if(gym != null) {
                            navigation.navigate("Login", {
                                gym: [ gym.gymName, gym.gymNummer ]
                            })
                        } else {
                            navigation.navigate("Schools");
                        }
                    });
        
                } else {
                    navigation.navigate("Skema");
                }
            })()
        }, 500);
    }, []);

    return (
    <View style={{
        height: '100%',
        width:'100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    }}>
        <Text style={{fontSize: 50}}>Indlæser...</Text>
    </View>
    )
}