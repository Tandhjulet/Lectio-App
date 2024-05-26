import { memo } from "react"
import { Person } from "../modules/api/scraper/class/ClassPictureScraper"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { StackNavigationProp } from "@react-navigation/stack"
import ProfilePicture from "./ProfilePicture"
import { Theme } from "../modules/Themes"
import { ContextMenuView } from "react-native-ios-context-menu"

export default function UserCell() {


    const Cell = memo(function UserCell({ item, gym, theme, navigation }: {
        item: Person,
        gym: any,
        theme: Theme,
        navigation: StackNavigationProp<any>,
    }) {
        return (
            <>
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
                            big                        />

                    )}
                    menuConfig={{
                        menuTitle: item.navn,
                        menuItems: [{
                            actionKey: "skema",
                            actionTitle: "Vis skema"
                        }]
                    }}
                    onPressMenuItem={({ nativeEvent }) => {
                        console.log(nativeEvent)
                    }}
                >
                    <TouchableOpacity style={{
                        paddingHorizontal: 20,
                        paddingVertical: 15,
                        
                        backgroundColor: theme.BLACK,
        
                        display: 'flex',
                        gap: 10,
                        flexDirection: "row",
        
                        alignItems: "center",
                    }} onPress={() => {
                        navigation.push("Skemaoversigt", {
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
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                fontWeight: "bold",
                            }}>
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

                <View style={{
                    marginHorizontal: 15,
                }}>
                    <View style={{
                        backgroundColor: theme.WHITE,
                        width: "100%",
                        height: StyleSheet.hairlineWidth,
    
                        opacity: 0.2,
                    }} />
                </View>
            </>
        )
    }, (prev, next) => Object.is(prev.item.rawName, next.item.rawName))
    
    return {
        Cell
    }
}