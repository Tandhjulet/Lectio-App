import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useColorScheme } from "react-native";
import { LectioMessage, ThreadMessage } from "../../modules/api/scraper/MessageScraper";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import { hexToRgb, themes } from "../../modules/Themes";
import { useCallback, useEffect, useState } from "react";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { getMessage } from "../../modules/api/scraper/Scraper";
import { getSecure, getUnsecure } from "../../modules/api/Authentication";
import { UserIcon } from "react-native-heroicons/solid";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import ProfilePicture from "../../components/ProfilePicture";

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
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
    const [people, setPeople] = useState<{
        [id: string]: Person;
    }>({});

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();

    const message: LectioMessage = route.params?.message;
    const headers = route.params?.headers;

    /**
     * Fetches the message body upon page load
     */
    useEffect(() => {
        (async () => {
            setLoading(true);

            const gym: { gymName: string, gymNummer: string } = await getSecure("gym");
            setGym(gym);

            setPeople(await getPeople() ?? {});

            const messageThread: ThreadMessage[] | null = await getMessage(gym.gymNummer, message.messageId, headers, true);
            
            setThreadMessages(messageThread ?? []);
            setLoading(false)
        })()
    }, [])

    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await getSecure("gym");
            setGym(gym);

            setPeople(await getPeople() ?? {});

            const messageThread: ThreadMessage[] | null = await getMessage(gym.gymNummer, message.messageId, headers, true);
            
            setThreadMessages(messageThread ?? []);
            setRefreshing(false)
        })()

    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

    return (
        <View style={{
            backgroundColor: theme.BLACK,
            width: "100%",
        }}>

            {loading ? 
                <ActivityIndicator size={"small"} color={theme.ACCENT} />
            :
                <ScrollView style={{
                    paddingVertical: 20,
                    paddingHorizontal: 10,

                    width: "100%"

                }} showsVerticalScrollIndicator={false} refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }>  
                    {threadMessages?.map((message: ThreadMessage, i: number) => (
                        <View key={i} style={{
                            paddingHorizontal: 10,
                            paddingVertical: 20,
        
                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
        
                            borderRadius: 5,

                            marginTop: 20,
                        }}>
                                
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
                                        <ProfilePicture navn={message.sender} gymNummer={gym?.gymNummer ?? ""} billedeId={people[CLEAN_NAME(message.sender)]?.billedeId ?? ""} size={50} />

                                        <View style={{
                                            maxWidth: "80%",
                                        }}>
                                            <Text style={{
                                                color: theme.WHITE,
                                                fontWeight: 'bold',
                                                fontSize: 12,
        
                                                opacity: 0.8,
                                            }}>
                                                {message.sender}
                                            </Text>
        
                                            <Text style={{
                                                color: theme.WHITE,
                                                fontWeight: 'bold',
                                            }}>
                                                {message.title}
                                            </Text>
                                        </View>
                                    </View>
        
                                    <View style={{
                                        borderTopColor: theme.WHITE,
                                        borderTopWidth: 1,
                                        opacity: 0.5,
                                        marginHorizontal: 5,
                                    }} />
        
                                    <Text style={{
                                        color: theme.WHITE,
                                    }}>
                                        {message.body}
                                    </Text>
                            </View>
                        </View>
                    ))}
                
                    <View style={{
                        paddingVertical: 75,
                    }} />
                </ScrollView>
            }
        </View>
    )
}