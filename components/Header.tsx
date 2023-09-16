import { ParamListBase, Route } from "@react-navigation/native";
import { NativeStackNavigationOptions, NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { getHeaderTitle } from '@react-navigation/elements';
import { Fragment } from "react";
import COLORS from "../modules/Themes";
import { getWeekNumber } from "../modules/api/scraper/Scraper";

export default function Header({ navigation, route, options, back }: {
    navigation: NativeStackNavigationProp<ParamListBase, string, undefined>;
    route: Route<string>,
    options: NativeStackNavigationOptions,
    back: {
        title: string;
    } | undefined,
}) {
    const title = getHeaderTitle(options, route.name);

    if(title == "Login" || title == "Settings" || title == "Mere" || title == "Skema") {
        return null;
    }

    if(title === "Schools") {
        return (<Fragment>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={styles.defaultHeaderContainer}>
                    <Text style={styles.text}>Skoler</Text>
                </View>
            </TouchableWithoutFeedback>
        </Fragment>)
    }

    return (
        <Fragment>
            <View style={styles.defaultHeaderContainer}>
                <Text style={styles.text}>{title}</Text>
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
    headerContainer: {
        width: "100%",
        paddingTop: 50,

        backgroundColor: COLORS.BLACK,
    },
    defaultHeaderContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',

        width: "100%",
        paddingTop: 60,
        paddingBottom: 20,

        backgroundColor: COLORS.BLACK,
    },
    text: {
        fontSize: 20,
        color: COLORS.WHITE,
    }
});