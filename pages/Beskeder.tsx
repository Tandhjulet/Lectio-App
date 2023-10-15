import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableWithoutFeedback, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { useCallback, useEffect, useState } from "react";
import { getMessages } from "../modules/api/scraper/Scraper";
import COLORS from "../modules/Themes";
import { getUnsecure } from "../modules/api/Authentication";
import { LectioMessage } from "../modules/api/scraper/MessageScraper";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { ArrowUpOnSquareStackIcon, ChevronRightIcon, PencilSquareIcon } from "react-native-heroicons/solid";
import { NavigationProp, useFocusEffect, useIsFocused } from "@react-navigation/native";
import RateLimit from "../components/RateLimit";

export default function Beskeder({ navigation }: {navigation: NavigationProp<any>}) {
    const [ loading, setLoading ] = useState<boolean>(true);

    const [ rateLimited, setRateLimited ] = useState<boolean>(false);
    const [ messages, setMessages ] = useState<LectioMessage[] | null>([]);
    const [ headers, setHeaders ] = useState<{[id: string]: string}>();

    useEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <View style={{
                    marginLeft: 15,
                }}>
                    <Pressable
                        onPress={() => {
                            navigation.navigate("NyBesked")
                        }}
                        style={{
                            paddingVertical: 4,
                            paddingHorizontal: 6,

                            backgroundColor: "rgba(0,122,255,0.2)",
                            borderRadius: 100,

                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                        }}
                    >
                        <PencilSquareIcon
                            color={"rgba(0,122,255,1)"}
                            size="22.5"
                        />
                        <Text style={{
                            color: "rgba(0,122,255,1)",
                        }}>
                            Ny besked
                        </Text>
                    </Pressable>
                </View>
            )
        })
    }, [navigation])

    useEffect(() => {
        (async () => {
            const gymNummer = (await getUnsecure("gym")).gymNummer;

            getMessages(gymNummer).then(({payload, rateLimited}): any => {
                setMessages(payload.messages);
                setHeaders(payload.headers);

                setRateLimited(rateLimited);
                setLoading(false);
            })
        })();
    }, []);

    return (
    <View style={{
        minHeight: '100%',
        minWidth:'100%',
        backgroundColor: COLORS.BLACK,
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
            <ScrollView>
                {messages == null ? 
                <View style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',

                    flexDirection: 'column-reverse',

                    minHeight: '40%',

                    gap: 20,
                }}>
                    <Text style={{
                        color: COLORS.RED,
                        textAlign: 'center'
                    }}>
                        Der opstod en fejl.
                        {"\n"}
                        Du kan prøve igen ved at genstarte appen.
                    </Text>

                </View>
                :
                <TableView style={{
                    paddingHorizontal: 20,
                }}>
                    <Section roundedCorners={true} hideSurroundingSeparators={true}>
                        {messages.map((message: LectioMessage, index: number) => {
                            return (
                                <Cell 
                                    key={message.sender + "-" + message.editDate + "-" + message.title + "-" + message.editDate}
                                    accessory="DisclosureIndicator"
                                    cellStyle="Subtitle"
                                    title={message.sender.split(" (")[0]}
                                    titleTextStyle={{
                                        fontWeight: message.unread ? "bold" : "normal",
                                        maxWidth: "80%",
                                        overflow: "hidden",
                                    }}
                                    detail={message.title}
                                    contentContainerStyle={{
                                        marginVertical: 5,
                                    }}
                                    cellAccessoryView={
                                        <View style={{
                                            position: 'absolute',
                                            height: "100%",
                                            right: 0,

                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',

                                            flexDirection: 'row',

                                            marginHorizontal: 20,
                                            gap: 5,
                                        }}>
                                            {message.unread &&
                                                <View style={{
                                                    backgroundColor: COLORS.ACCENT,

                                                    height: 10,
                                                    width: 10,
                                                    borderRadius: 10,
                                                }} />
                                            }

                                            <ChevronRightIcon
                                                color={COLORS.ACCENT}
                                            />
                                        </View>
                                    }
                                    
                                    onPress={() => {
                                        const copy = messages;
                                        if(copy != null) {
                                            copy[index].unread = false;
                                            setMessages([...copy]);

                                            navigation.navigate("BeskedView", {
                                                message: message,
                                                headers: headers,
                                            })
                                        }
                                    }}
                                />
                            )
                        })}
                    </Section>
                </TableView>
                }
            </ScrollView>
        }

        {rateLimited && <RateLimit />}
    </View>
    )
}