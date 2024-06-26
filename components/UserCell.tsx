import { createRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Person } from "../modules/api/scraper/class/ClassPictureScraper"
import { ActivityIndicator, Animated, ImageLoadEventData, ImageProps, NativeSyntheticEvent, StyleProp, StyleSheet, Text, TouchableOpacity, useColorScheme, View, ViewProps, ViewStyle } from "react-native"
import { StackNavigationProp } from "@react-navigation/stack"
import { hexToRgb, Theme, themes } from "../modules/Themes"
import { ContextMenuView } from "react-native-ios-context-menu"
import { AcademicCapIcon, CalendarIcon, UserIcon } from "react-native-heroicons/outline"
import TeacherSVG from "./TeacherSVG"
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native"
import { SCRAPE_URLS } from "../modules/api/scraper/Helpers"
import Constants from 'expo-constants';
import FastImage, { FastImageProps, OnLoadEvent } from 'react-native-fast-image'

const isExpoGo = Constants.appOwnership === 'expo'

export default function UserCell() {
    const Image = (function Image({
        onLoad,
        style = {},
        theme,
        borderRadius,
        source,

        size,
        big,

        ...props
    }: FastImageProps & {
        theme: Theme,
        borderRadius: boolean,

        size: number,
        big: boolean,
    }) {
        if(typeof source == "object" && source.uri === "") {
            return (
                <View style={{
                    width: big ? 3/4 * (size * 6) : size,
                    height: big ? size * 6 : size,

                    justifyContent: "center",
                    alignItems: "center",

                    borderRadius: borderRadius ? 999 : 0,

                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: hexToRgb(theme.ACCENT.toString(), 0.2),
                    backgroundColor: theme.ACCENT_BLACK,

                }}>
                    <UserIcon color={hexToRgb(theme.ACCENT.toString(), 0.6)} size={20} />
                </View>
            )
        }

        const [showPlaceholder, setShowPlaceholder] = useState<boolean>(false);
        const [loading, setLoading] = useState<boolean>(true);

        let thresholdTimer = useRef<number | null>(null).current;

        useEffect(() => {
            thresholdTimer = setTimeout(() => {
                setShowPlaceholder(true);
                thresholdTimer = null;
            }, 50)

            return () => {
                if(thresholdTimer)
                    clearTimeout(thresholdTimer);
            };
        }, [])

        const onLoadHandler = useCallback((event: OnLoadEvent) => {
            setLoading(false);
            onLoad?.(event);
        }, [onLoad]);

        // indfør threshold:
        // https://github.com/oblador/react-native-image-progress/blob/1de7238b3efe1347f61488ec40b9bb26d9de309f/index.js#L30
    
        return (
            <View>
                <FastImage
                    {...props}
                    source={source}
                    onLoad={onLoadHandler}
                    style={style}
                />

                {showPlaceholder && loading && (
                    <View style={{
                        position: "absolute",
                        height: "100%",
                        width: "100%",

                        justifyContent: "center",
                        alignItems: "center",

                        borderRadius: borderRadius ? 999 : 0,

                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: hexToRgb(theme.ACCENT.toString(), 0.2),
                        backgroundColor: theme.ACCENT_BLACK,

                    }}>
                        <ActivityIndicator />
                    </View>
                )}
            </View>
        )
    });

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
                    source={{
                        uri: url,
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                        }
                    }}
                    style={{
                        borderRadius: borderRadius ? 999 : 0,
                        width: big ? 3/4 * (size * 6) : size,
                        height: big ? size * 6 : size,
                    }}
                    borderRadius={borderRadius}
                    theme={theme}

                    size={size}
                    big={big}
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
                        theme={theme}
                        borderRadius={false}

                        size={size}
                        big={true}
                    />
                )}
                menuConfig={{
                    menuTitle: navn,
                }}

                style={{
                    borderRadius: borderRadius ? 999 : 0,
                }}
            >
                <Image
                    style={{
                        borderRadius: 999,
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
                    theme={theme}
                    borderRadius={borderRadius}

                    size={size}
                    big={false}
                />
            </ContextMenuView>
    
        )
    })

    const Cell = memo(function UserCell({ item, gym, theme, style, route }: {
        item: Person,
        gym: any,
        theme: Theme,
        style?: ViewStyle,
        route: RouteProp<any>;
    }) {
        let [pressed, setPressed] = useState<boolean>();

        const focusEffect = useCallback(() => {
            setPressed(false);
        }, [pressed])
    
        useFocusEffect(focusEffect)

        const navigation = useNavigation<StackNavigationProp<any>>();
        const skemaScreenName = useMemo(() => {
            switch(route.name) {
                case "Modul View":
                    return "Skema";
                case "TeachersAndStudents":
                    return "Skemaoversigt";
                case "Modul information":
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

                    setPressed(true);

                    navigation.push(skemaScreenName, {
                        user: item,
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

                    setPressed(true)

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