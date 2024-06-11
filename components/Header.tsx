import { ParamListBase, Route } from "@react-navigation/native";
import { NativeStackNavigationOptions, NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View, useColorScheme } from 'react-native';
import { getHeaderTitle } from '@react-navigation/elements';
import { Fragment } from "react";
import { getWeekNumber } from "../modules/api/scraper/Scraper";
import { themes } from "../modules/Themes";

export default function Header({ route, options }: {
    route: Route<string>,
    options: NativeStackNavigationOptions,
}) {
    const title = getHeaderTitle(options, route.name);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    if(title === "Schools") {
        return (<Fragment>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={{
                    ...styles.defaultHeaderContainer,
                    backgroundColor: theme.ACCENT_BLACK,
                }}>
                    <Text style={{
                        fontSize: 20,
                        color: theme.WHITE,
                    }}>Skoler</Text>
                </View>
            </TouchableWithoutFeedback>
        </Fragment>)
    }

    return (
        <Fragment>
            <View style={{
                    ...styles.defaultHeaderContainer,
                    backgroundColor: theme.ACCENT_BLACK,
                }}>
                <Text style={{
                    fontSize: 20,
                    color: theme.WHITE,
                }}>{title}</Text>
            </View>
        </Fragment>
    );
}

const styles = StyleSheet.create({
    schema: {
        paddingHorizontal: 20,
    },
    dayContainer: {
                                        
        width: 40,

        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,

        paddingBottom: 10,
        paddingTop: 5,
    },
    defaultHeaderContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',

        width: "100%",
        paddingTop: 60,
        paddingBottom: 20,
    }
});