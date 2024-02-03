import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { LectioMessage } from "../../modules/api/scraper/MessageScraper";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import COLORS from "../../modules/Themes";
import { useEffect, useState } from "react";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { getMessage } from "../../modules/api/scraper/Scraper";
import { getSecure, getUnsecure } from "../../modules/api/Authentication";
import { UserIcon } from "react-native-heroicons/solid";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";

/**
 * Removes the extra data associated to each name
 * @param name name to clean
 * @returns a clean name
 */
export const CLEAN_NAME = (name: string) => {
    return name.replace(new RegExp(/ \(.*?\)/), "")
}

export default function BeskedView({ navigation, route }: {
    navigation: NavigationProp<any>,
    route: RouteProp<any>
}) {
    const [loading, setLoading] = useState<boolean>(true);

    const [messageBody, setMessageBody] = useState<string>();

    const [billedeId, setBilledeId] = useState<string>();
    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();

    const message: LectioMessage = route.params?.message;
    const headers = route.params?.headers;

    /**
     * Fetches the message body upon page load
     */
    useEffect(() => {
        (async () => {
            const gym: { gymName: string, gymNummer: string } = await getSecure("gym");
            setGym(gym);

            const people = await getPeople();

            if(people != null)
                setBilledeId(people[CLEAN_NAME(route.params?.message.sender)]?.billedeId)

            const body = await getMessage(gym.gymNummer, message.messageId, headers);
            if(body != null)
                setMessageBody(body.body);
            
            setLoading(false)
        })()
    }, [])

    return (
        <View style={{
            height: '100%',
            width:'100%',

            display: 'flex',
            justifyContent: 'center',
            paddingBottom: 200,

            backgroundColor: COLORS.BLACK,

        }}>
            <View style={{
                paddingHorizontal: 10,
                paddingVertical: 20,

                backgroundColor: COLORS.DARK,
                borderRadius: 5,

                marginHorizontal: 40,

                flexGrow: 0,
                maxHeight: "70%"
            }}>
                {loading ? 
                    <View style={{
                        position: "absolute",

                        top: "20%",
                        left: "50%",

                        transform: [{
                            translateX: -12.5,
                        }]
                    }}>
                        <ActivityIndicator size={"small"} color={COLORS.ACCENT} />
                    </View>
                    :
                    <View style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}>
                        <View style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 10,

                            alignItems: 'center',
                        }}>
                            {billedeId != undefined ? (
                                <Image
                                    style={{
                                        borderRadius: 100,
                                        width: 50,
                                        height: 50,
                                    }}
                                    source={{
                                        uri: SCRAPE_URLS(gym?.gymNummer, billedeId).PICTURE_HIGHQUALITY,
                                        headers: {
                                            "User-Agent": "Mozilla/5.0",
                                            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                                        },
                                    }}
                                    crossOrigin="use-credentials"
                                />
                            ) : (
                                <UserIcon style={{
                                    borderRadius: 100,
                                }} color={COLORS.WHITE} size={35} />
                            )}
                            <View style={{
                                maxWidth: "80%",
                            }}>
                                <Text style={{
                                    color: COLORS.WHITE,
                                    fontWeight: 'bold',
                                    fontSize: 12,

                                    opacity: 0.8,
                                }}>
                                    {message.sender}
                                </Text>

                                <Text style={{
                                    color: COLORS.WHITE,
                                    fontWeight: 'bold',
                                }}>
                                    {message.title}
                                </Text>
                            </View>
                        </View>

                        <View style={{
                            borderTopColor: COLORS.WHITE,
                            borderTopWidth: 1,
                            opacity: 0.5,
                            marginHorizontal: 5,
                        }} />

                        <ScrollView style={{
                            paddingHorizontal: 10,
                            overflow: "hidden",

                            maxHeight: "80%",
                        }} persistentScrollbar>
                            <Text style={{
                                color: COLORS.WHITE,
                            }}>
                                {messageBody}
                            </Text>
                        </ScrollView>
                    </View>
                }
            </View>
        </View>
    )
}