import { APP_NAME } from '../../modules/Config';
import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import UIError from '../../components/UIError';
import COLORS, { hexToRgb } from '../../modules/Themes';

export function Card() {
    return (
        <View style={{
            width: "100%",
            backgroundColor: hexToRgb(COLORS.WHITE, 0.25),

            borderRadius: 10,

            paddingHorizontal: 20,
            paddingVertical: 10,
        }}>
            <Text style={{
                color: COLORS.WHITE,
                fontWeight: "bold",

                textAlign: "center",
                fontSize: 22.5,
            }}>
                Fuld adgang til 
                <Text style={{
                    color: COLORS.ACCENT
                }}>{" " + APP_NAME}</Text>
            </Text>
        </View>
    )
}

export default function Checkout({ navigation }: {
    navigation: NavigationProp<any>
}) {

    return (
        <View style={{
            minHeight: "100%",
            minWidth: "100%",

            padding: 20,
        }}>
            <View style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
            }}>
                <Card />
            </View>
        </View>
    )
}
/*
            {error && <UIError details={errorMessage == null ? 
                ["Der er opstået en ukendt fejl med dit køb.",
                 "Prøv venligst igen senere."]
            :
                ["Der er opstået en fejl med dit køb:",
                  errorMessage]}
            />}*/