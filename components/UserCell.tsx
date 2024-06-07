import { createRef, memo, useCallback, useMemo, useRef } from "react"
import { Person } from "../modules/api/scraper/class/ClassPictureScraper"
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, useColorScheme, View, ViewProps, ViewStyle } from "react-native"
import { StackNavigationProp } from "@react-navigation/stack"
import { hexToRgb, Theme, themes } from "../modules/Themes"
import { ContextMenuView } from "react-native-ios-context-menu"
import { AcademicCapIcon, CalendarIcon, UserIcon } from "react-native-heroicons/outline"
import TeacherSVG from "./TeacherSVG"
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native"
import { SCRAPE_URLS } from "../modules/api/scraper/Helpers"
import Constants from 'expo-constants';
import { Image } from "@rneui/themed"


const isExpoGo = Constants.appOwnership === 'expo'

export default function UserCell() {
    const ProfilePicture = memo(function ProfilePicture({
        gymNummer,
        billedeId,
        size,
        navn,
        noContextMenu = false,
        borderRadius = true,
        big = false,
    }: {
        gymNummer: string,
        billedeId: string,
        size: number,
        navn: string,
        noContextMenu?: boolean,
        borderRadius?: boolean,
        big?: boolean,
    }) {
        const scheme = useColorScheme();
        const theme = useMemo(() => themes[scheme ?? "dark"], [scheme]);

        const url = (billedeId === "" || gymNummer === "") ? null : SCRAPE_URLS(gymNummer, billedeId).PICTURE_HIGHQUALITY;

        if(noContextMenu || isExpoGo) {
            if(!url) {
                return (
                    <View style={{
                        borderRadius: borderRadius ? 999 : 0,
                        width: big ? 3/4 * (size * 6) : size,
                        height: big ? size * 6 : size,

                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: hexToRgb(theme.ACCENT.toString(), 0.2),
                        backgroundColor: theme.ACCENT_BLACK,

                        justifyContent: "center",
                        alignItems: "center",
                    }}>
                        <UserIcon color={hexToRgb(theme.ACCENT.toString(), 0.6)} size={20} />
                    </View>
                )
            }

            return (
                <Image
                    style={{
                        borderRadius: borderRadius ? 999 : 0,
                        width: big ? 3/4 * (size * 6) : size,
                        height: big ? size * 6 : size,
                    }}
                    PlaceholderContent={<ActivityIndicator size={"small"} />}
                    placeholderStyle={{
                        backgroundColor: theme.ACCENT_BLACK,
                        borderColor: hexToRgb(theme.ACCENT.toString(), 0.2),
                        borderWidth: StyleSheet.hairlineWidth,
                    }}
                    crossOrigin="use-credentials"

                    source={{
                        uri: url,
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                        }
                    }}
                />
            )
        }
    
        return (
            <ContextMenuView
                previewConfig={{
                    previewType: "CUSTOM",
                    previewSize: "INHERIT",
                }}
                renderPreview={() => (
                    <Image
                        style={{
                            width: 3/4 * (size * 6),
                            height: size * 6,
                        }} // aspect ratio is 3/4
                        source={{
                            uri: url ?? "",
                            headers: {
                                "User-Agent": "Mozilla/5.0",
                                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                            },
                        }}
                        crossOrigin="use-credentials"
                    />
                )}
                menuConfig={{
                    menuTitle: navn,
                }}
            >
                <Image
                    style={{
                        borderRadius: size * 2,
                        width: size,
                        height: size,
                    }}
                    source={{
                        uri: url ?? "", // if url is null lets just keep the placeholder content forever.
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                        },
                    }}
                    crossOrigin="use-credentials"
                    PlaceholderContent={<UserIcon color={hexToRgb(theme.ACCENT.toString(), 0.2)} />}
                    placeholderStyle={{
                        backgroundColor: theme.ACCENT_BLACK,
                        borderColor: hexToRgb(theme.ACCENT.toString(), 0.2),
                        borderWidth: StyleSheet.hairlineWidth,
                    }}
                />
            </ContextMenuView>
    
        )
    })

    let pressed = useRef(false).current;

    const focusEffect = useCallback(() => {
        pressed = false;
    }, [])

    useFocusEffect(focusEffect)

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

        const ref = createRef<ContextMenuView>();

        return (
            <ContextMenuView
                ref={ref}
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
                    if(!skemaScreenName || pressed) return;

                    pressed = true;

                    ref.current?.dismissMenu().then(() => {
                        navigation.push(skemaScreenName, {
                            user: item,
                        });
                    });
                }}
                style={{
                    height: 70,
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
                    if(!skemaScreenName || pressed) return;

                    pressed = true;

                    ref.current?.dismissMenu().then(() => {
                        navigation.push(skemaScreenName, {
                            user: item,
                        });
                    });
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
        Cell,
        ProfilePicture
    }
}