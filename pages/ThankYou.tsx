import { Button, Image, Text, View, useColorScheme } from "react-native";
import { themes } from "../modules/Themes";
import { CakeIcon } from "react-native-heroicons/solid";
import React, { createRef, useCallback, useEffect } from "react";

import Confetti from 'react-native-confetti';
import { NavigationProp, useFocusEffect } from "@react-navigation/native";


export default function ThankYou({
    navigation,
}: {
    navigation: NavigationProp<any>,
}) {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const ref = createRef<Confetti>();
    useFocusEffect(
        useCallback(() => {
            ref.current?.startConfetti();
        },
        [])
    )

    return (
        <View style={{
            height: "85%",
            width: "100%",
            
            gap: 20,

            justifyContent: "center",
            alignItems: "center",

            backgroundColor: theme.BLACK
        }}>
            <Image
                source={require("../assets/balloons.png")}
                style={{
                    height: 256,
                    aspectRatio: 1/1,
                }}
            />

            <View style={{
                display: "flex",
                gap: 5,
                maxWidth: "75%",
            }}>
                <Text style={{
                    color: scheme == "dark" ? "#fff" : "#000",
                    fontSize: 45,
                    fontWeight: "600",
                    letterSpacing: 1,

                    textAlign: "center",
                }}>
                    Tillykke!
                </Text>

                <Text style={{
                    color: theme.WHITE,
                    textAlign: "center",

                    flexShrink: 1,

                    flexWrap: "wrap",
                
                }}>
                    Dit nye abonnement giver dig fuld adgang til Lectimate.
                    {"\n\n"}
                    Opstår der et problem med dit abonnement, kan du kontakte Lectimate gennem appen.
                </Text>
            </View>

            <Button 
                title="Kom i gang"
                onPress={() => {
                    // @ts-ignore
                    navigation.popToTop();
                }}
            />

            <Confetti 
                ref={ref}
            />
        </View>
    )
}