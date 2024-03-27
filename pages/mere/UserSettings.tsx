import { Appearance, ScrollView, Switch, View, useColorScheme } from "react-native";
import { themes } from "../../modules/Themes";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { useEffect, useState } from "react";
import { getUnsecure, saveUnsecure } from "../../modules/api/Authentication";

export default function UserSettings() {
    const [darkMode, setDarkMode] = useState<boolean>()

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    useEffect(() => {
        (async () => {
            const useDarkMode: {result: boolean} = await getUnsecure("useDarkMode") || {result: null};
            if(useDarkMode.result == null) {
                setDarkMode(true);
            } else {
                setDarkMode(useDarkMode.result);
            }
        })();
    }, []);

    useEffect(() => {
        if(darkMode == undefined || darkMode == (scheme == "dark")) return;

        saveUnsecure("useDarkMode", {result: darkMode}).then(() => {
            Appearance.setColorScheme(darkMode ? "dark" : "light");
        });

    }, [darkMode])

    return (
        <View style={{minHeight: '100%',minWidth:'100%'}}>
            <ScrollView contentContainerStyle={{
                backgroundColor: theme.BLACK,
                paddingBottom: 20,
            }}>
                <TableView style={{
                    paddingHorizontal: 20,
                }}>
                    <Section header={"Udseende"} roundedCorners={true} hideSurroundingSeparators={true}>

                    <Cell
                        cellStyle="Basic"
                        title="Brug mørk tilstand"
                        titleTextColor={theme.WHITE}
                        cellAccessoryView={<Switch 
                            trackColor={{false: '#767577', true: "#4ca300"}}

                            onValueChange={setDarkMode}
                            value={darkMode}
                        />}
                    />
                    </Section>
                </TableView>
            </ScrollView>
        </View>
    )
}