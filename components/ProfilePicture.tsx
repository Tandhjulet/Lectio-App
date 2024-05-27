import { SCRAPE_URLS } from "../modules/api/scraper/Helpers";
import { ContextMenuView } from "react-native-ios-context-menu";
import Constants from 'expo-constants';
import { useMemo, useRef } from "react";
import { Image } from "@rneui/themed";
import { UserIcon } from "react-native-heroicons/outline";
import { StyleSheet, useColorScheme } from "react-native";
import { themes } from "../modules/Themes";

const isExpoGo = Constants.appOwnership === 'expo'

export default function ProfilePicture({
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

    if(noContextMenu || isExpoGo) {
        return  (
            <Image
                style={{
                    borderRadius: borderRadius ? 999 : 0,
                    width: big ? 3/4 * (size * 6) : size,
                    height: big ? size * 6 : size,
                }}
                source={{
                    uri: SCRAPE_URLS(gymNummer, billedeId).PICTURE_HIGHQUALITY,
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    },
                }}
                PlaceholderContent={<UserIcon color={theme.ACCENT} />}
                placeholderStyle={{
                    backgroundColor: theme.ACCENT_BLACK,
                    borderColor: theme.ACCENT,
                    borderWidth: StyleSheet.hairlineWidth,
                }}
                crossOrigin="use-credentials"
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
                        uri: SCRAPE_URLS(gymNummer, billedeId).PICTURE_HIGHQUALITY,
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
                    uri: SCRAPE_URLS(gymNummer, billedeId).PICTURE_HIGHQUALITY,
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    },
                }}
                crossOrigin="use-credentials"
                PlaceholderContent={<UserIcon color={theme.ACCENT} />}
                placeholderStyle={{
                    backgroundColor: theme.ACCENT_BLACK,
                    borderColor: theme.ACCENT,
                    borderWidth: StyleSheet.hairlineWidth,
                }}
            />
        </ContextMenuView>

    )
}