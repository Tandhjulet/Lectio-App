import { Image } from "react-native";
import { SCRAPE_URLS } from "../modules/api/scraper/Helpers";
import { ContextMenuView } from "react-native-ios-context-menu";
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo'

export default function ProfilePicture({
    gymNummer,
    billedeId,
    size,
    navn,
    noContextMenu = false,
}: {
    gymNummer: string,
    billedeId: string,
    size: number,
    navn: string,
    noContextMenu?: boolean,
}) {
    if(noContextMenu || isExpoGo) {
        return  (
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
            />
        </ContextMenuView>

    )
}