import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { useEffect, useState } from "react";
import { getMessages } from "../modules/api/scraper/Scraper";
import COLORS from "../modules/Themes";
import { getUnsecure } from "../modules/api/Authentication";
import { LectioMessage } from "../modules/api/scraper/MessageScraper";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { ChevronRightIcon } from "react-native-heroicons/solid";
import { NavigationProp } from "@react-navigation/native";

export default function Beskeder({ navigation }: {navigation: NavigationProp<any>}) {
    const [ loading, setLoading ] = useState<boolean>(true);
    const [ messages, setMessages ] = useState<LectioMessage[] | null>([]);

    useEffect(() => {
        setLoading(true);

        (async () => {
            const gymNummer = (await getUnsecure("gym")).gymNummer;

            getMessages(gymNummer).then((messages) => {
                setMessages(messages);
                setLoading(false);
            })
        })();
    }, [])

    return (
    <View style={{height: '100%',width:'100%'}}>
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
                        {messages.map((message: LectioMessage) => {
                            return (
                                <Cell 
                                    key={message.sender + "-" + message.editDate + "-" + message.title + "-" + message.editDate}
                                    accessory="DisclosureIndicator"
                                    cellStyle="Subtitle"
                                    title={message.sender}
                                    titleTextStyle={{
                                        fontWeight: message.unread ? "bold" : "normal"
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
                                        navigation.navigate("BeskedView", {
                                            message: message,
                                        })
                                    }}
                                />
                            )
                        })}
                    </Section>
                </TableView>
                }
            </ScrollView>
        }

        <NavigationBar currentTab={"Beskeder"} navigation={navigation} />
    </View>
    )
}