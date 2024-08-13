import { Image, Platform, ScrollView, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { secureGet } from "../../modules/api/helpers/Storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProfile, Profile, scrapeStudiekort, Studiekort as StudieKort } from "../../modules/api/scraper/Scraper";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { hexToRgb, themes } from "../../modules/Themes";
import Constants from 'expo-constants';
import { QrCodeIcon, XMarkIcon } from "react-native-heroicons/outline";
import StudiekortSVG from "../../components/StudiekortSVG";
import Animated, { BounceIn, BounceOut, withTiming, ZoomIn, ZoomOut } from "react-native-reanimated";
import RNFetchBlob from "rn-fetch-blob";
import { NavigationProp } from "@react-navigation/native";
import BloomingSVG from "../../components/BloomingSVG";
import { UserIcon } from "react-native-heroicons/outline";
import Connectivity from "../../components/Connectivity";
import * as Sentry from 'sentry-expo';

export default function Studiekort({ navigation }: {
    navigation: NavigationProp<any>;
}) {

    const dataFetched = useRef(new Date()).current;
    const timeout = useRef<number[]>([]).current;
    const [qrcodeFetched, setqrcodeFetched] = useState<Date>();

    const [showQR, setShowQR] = useState<boolean>(false);
    const [QRCode, setQRCode] = useState<string>();

    const [studiekort, setStudiekort] = useState<StudieKort>();
    const [profile, setProfile] = useState<Profile>();

    const {
        isConnected,
        noConnectionUIError,
        showUIError,
    } = Connectivity();

    const parseDate = useCallback((date: string) => {
        const parts = date.replace("/", "-").split("-");
        return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]))
    }, [])

    const calculateAge = useMemo(() => {
        if(!studiekort?.birthdate)
            return "";

        const diffMs = Date.now() - parseDate(studiekort?.birthdate).getTime();
        const ageDT = new Date(diffMs);

        return Math.abs(ageDT.getUTCFullYear() - 1970).toString();
    }, [studiekort])

    useEffect(() => {
        (async () => {
            if(!isConnected) return showUIError();

            const gym = (await secureGet("gym")).gymNummer;

            setProfile(await getProfile());
            setStudiekort(await scrapeStudiekort(gym));
        })();
    }, [isConnected]);

    useEffect(() => {
        if(!isConnected) return showUIError();

        if(showQR) {
            timeout.push(setTimeout(() => {
                setShowQR(false)
            }, 5 * 1000))
            return;
        };

        if(studiekort?.qrcodeurl) {
            RNFetchBlob.config({
                    fileCache: true,
                    appendExt: "jpg",
                })
                .fetch("GET", studiekort?.qrcodeurl)
                .then((res) => {
                    const path = res.path();
                    setqrcodeFetched(new Date());
                    setQRCode(Platform.OS === "android" ? "file://" + path : "" + path);
                }).catch((err) => {
                    Sentry.Native.captureException(err)
                })
        }
    }, [studiekort, showQR, isConnected])

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View>
            <View style={{
                minHeight: "100%",
                width: "100%",

                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                overflow: "scroll",

                paddingTop: Constants.statusBarHeight,
                paddingHorizontal: 20,

                gap: 20,
            }}>
                <View style={{
                    width: "100%",
                    justifyContent: "center",
                    alignItems: "center",

                    height: 60,
                }}>
                    <Text style={{
                        fontSize: 25,
                        fontWeight: "900",
                        color: theme.WHITE,
                    }}>
                        Studiekort
                    </Text>

                    <TouchableOpacity style={{
                        width: 60,
                        height: 60,

                        position: "absolute",
                        right: 0,

                        borderRadius: 32,
                        backgroundColor: hexToRgb(theme.WHITE.toString(), 0.15),

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }} onPress={() => {
                        navigation.goBack();
                    }}>
                        <XMarkIcon color={hexToRgb(theme.WHITE.toString(), 0.7)} size={25} />
                    </TouchableOpacity>
                </View>


                <View style={{
                    width: 140,
                    height: 140,
                    marginTop: 20,
                }}>
                    {!showQR ? (
                        <Image
                            style={{
                                borderRadius: 999,
                                width: 140,
                                height: 140,
                            }}
                            source={{
                                uri: SCRAPE_URLS().BASE_URL + studiekort?.pictureurl,
                                headers: {
                                    "User-Agent": "Mozilla/5.0",
                                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                                },
                                cache: "force-cache"
                            }}
                            crossOrigin="use-credentials"
                        />
                    ) : (
                        <Image
                            style={{
                                width: 140,
                                height: 140,
                            }}
                            source={{uri: QRCode}}
                        />
                    )}
                </View>
                <Text style={{
                    color: theme.WHITE,
                    fontWeight: "400",
                    fontSize: 20,
                    marginBottom: -5,
                    marginTop: -5,
                }}>
                    {studiekort?.school ?? "Indlæser..."}
                </Text>

                <Text style={{
                    color: theme.WHITE,
                    marginTop: -5,
                    fontWeight: "900",
                    letterSpacing: 0.6,
                    fontSize: 22.5,
                }}>
                    {studiekort?.name ?? "Indlæser..."}
                </Text>

                <Text style={{
                    color: theme.WHITE,
                    fontWeight: "500",
                    marginTop: -7.5,
                    fontSize: 16,
                }}>
                    {studiekort?.birthdate ? parseDate(studiekort?.birthdate).toLocaleDateString("da-DK", {
                        dateStyle: "long"
                    }) : "Indlæser..."} {studiekort?.birthdate && `(${calculateAge} år)`}
                </Text>

                <TouchableOpacity style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,

                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
                    borderRadius: 10,

                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                }} onPress={() => {
                    timeout.forEach((id) => clearTimeout(id));
                    setShowQR((prev) => !prev)
                }}>
                    {!showQR ? (
                        <QrCodeIcon color={theme.WHITE} />
                    ) : (
                        <UserIcon color={theme.WHITE} />
                    )}
                    <Text style={{
                        color: theme.WHITE,
                    }}>
                        {showQR ? "Vis billede" : "Vis QR kode"}
                    </Text>
                </TouchableOpacity>
                
                <StudiekortSVG style={{
                    position: "absolute",
                    bottom: "-20%",
                    left: 0,
                }} color={hexToRgb(theme.WHITE.toString(), 0.1)} /> 

                <View style={{
                    marginTop: 50,
                    paddingVertical: 20,

                    width: "100%",
                    gap: 10,
                }}>
                    <Text style={{
                        color: theme.WHITE,
                        fontSize: 15,
                        letterSpacing: 0.2,
                    }}>Studie-ID</Text>

                    <Text style={{
                        color: theme.WHITE,
                        fontWeight: "800",
                        fontSize: 15,
                        letterSpacing: 0.4,
                    }}>{profile?.elevId ?? "Ikke indlæst"}</Text>

                    <Text style={{
                        color: theme.WHITE,
                        fontSize: 15,
                        letterSpacing: 0.2,
                        marginTop: 10,
                    }}>Information indlæst</Text>

                    <Text style={{
                        color: theme.WHITE,
                        fontWeight: "800",
                        fontSize: 15,
                        letterSpacing: 0.4,
                    }}>{dataFetched.toLocaleString("da-DK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                    })}</Text>

                    <Text style={{
                        color: theme.WHITE,
                        fontSize: 15,
                        letterSpacing: 0.2,
                        marginTop: 10,
                    }}>QR-kode hentet</Text>

                    <Text style={{
                        color: theme.WHITE,
                        fontWeight: "800",
                        fontSize: 15,
                        letterSpacing: 0.4,
                    }}>{qrcodeFetched ? qrcodeFetched.toLocaleString("da-DK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                    }) : "Ikke indlæst"}</Text>

                </View>

                <BloomingSVG style={{
                    position: "absolute",
                    bottom: 89,
                    right: 0,

                    maxWidth: 150,
                    maxHeight: 100,
                }} />

                <View style={{
                    paddingVertical: 100,
                }} />

            </View>
            {!isConnected && noConnectionUIError}
        </View>
    )
}