import { memo, useMemo } from "react"
import { Person } from "../modules/api/scraper/class/ClassPictureScraper"
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewProps, ViewStyle } from "react-native"
import { StackNavigationProp } from "@react-navigation/stack"
import ProfilePicture from "./ProfilePicture"
import { hexToRgb, Theme } from "../modules/Themes"
import { ContextMenuView } from "react-native-ios-context-menu"
import { AcademicCapIcon, CalendarIcon } from "react-native-heroicons/outline"
import TeacherSVG from "./TeacherSVG"
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native"

export default function UserCell() {

    const Cell = memo(function UserCell({ item, gym, theme, style, route }: {
        item: Person,
        gym: any,
        theme: Theme,
        style?: ViewStyle,
        route: RouteProp<any>;
    }) {
        const navigation = useNavigation<StackNavigationProp<any>>();
        const skemaScreenName = useMemo(() => {
            switch(route.name) {
                case "Modul View":
                    return "Skema";
                case "TeachersAndStudents":
                    return "Skemaoversigt";
            }

            console.log("[UserCell] could not find skema-path for origin", route.name)
        }, [route])

        return (
            <ContextMenuView
                previewConfig={{
                    previewType: "CUSTOM",
                    previewSize: "INHERIT",
                }}
                renderPreview={() => (
                    <ProfilePicture
                        gymNummer={gym?.gymNummer ?? ""}
                        billedeId={item.billedeId ?? ""}
                        size={40 * 1.2}
                        navn={item.navn}
                        noContextMenu
                        borderRadius={false}
                        big
                    />
                )}
                menuConfig={{
                    menuTitle: item.navn,
                    menuItems: [{
                        actionKey: "skema",
                        actionTitle: "Se skema",
                        icon: {
                            type: "IMAGE_SYSTEM",

                            imageValue: {
                                systemName: "calendar.badge.clock"
                            },
                        },
                        actionSubtitle: "Få vist personens skema"
                    }],
                }}
                onPressMenuItem={() => {
                    if(!skemaScreenName) return;

                    navigation.push(skemaScreenName, {
                        user: item,
                    })
                }}
            >
                <TouchableOpacity style={[{
                    paddingVertical: 15,
    
                    display: 'flex',
                    gap: 10,
                    flexDirection: "row",
    
                    alignItems: "center",
                    width: "100%",

                }, style]} onPress={() => {
                    if(!skemaScreenName) return;

                    navigation.push(skemaScreenName, {
                        user: item,
                    })
                }}>
                    <ProfilePicture
                        gymNummer={gym?.gymNummer ?? ""}
                        billedeId={item.billedeId ?? ""}
                        size={40}
                        navn={item.navn}
                        noContextMenu
                    />
    
                    <View style={{
                        display: "flex",
                        flexDirection: "column",
    
                        gap: 5,

                        width: "100%",
                    }}>
                        <Text style={{
                            color: theme.WHITE,
                            fontWeight: "bold",
                            maxWidth: "80%",
                        }} numberOfLines={1} ellipsizeMode="tail">
                            {item.navn}
                        </Text>

                        <Text style={{
                            color: theme.WHITE,
                        }}>
                            {item.klasse}
                        </Text>
                    </View>
                </TouchableOpacity> 
            </ContextMenuView>
        )
    }, (prev, next) => Object.is(prev.item.rawName, next.item.rawName))
    
    return {
        Cell
    }
}