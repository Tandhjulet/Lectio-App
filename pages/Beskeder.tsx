import { ActivityIndicator, Button, Image, Keyboard, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import NavigationBar from "../components/Navbar";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Profile, getMessages, getProfile, scrapeCache } from "../modules/api/scraper/Scraper";
import COLORS, { hexToRgb } from "../modules/Themes";
import { getSecure, getUnsecure } from "../modules/api/Authentication";
import { LectioMessage } from "../modules/api/scraper/MessageScraper";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { AdjustmentsVerticalIcon, ArrowUpOnSquareStackIcon, ChevronRightIcon, EnvelopeIcon, EnvelopeOpenIcon, PaperAirplaneIcon, PencilSquareIcon, SunIcon, TrashIcon, XCircleIcon } from "react-native-heroicons/solid";
import { NavigationProp, useFocusEffect, useIsFocused } from "@react-navigation/native";
import RateLimit from "../components/RateLimit";
import {
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetScrollView,
    BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Key, deleteSaved, getSaved } from "../modules/api/storage/Storage";
import { Person } from "../modules/api/scraper/class/ClassPictureScraper";
import { SCRAPE_URLS } from "../modules/api/scraper/Helpers";
import { getPeople } from "../modules/api/scraper/class/PeopleList";
import { KeyboardAvoidingView } from "react-native";
import { sendMessage } from "../modules/api/beskeder/sendBesked";
import Logo from "../components/Logo";
import ProfilePicture from "../components/ProfilePicture";

export default function Beskeder({ navigation }: {navigation: NavigationProp<any>}) {
    const [ loading, setLoading ] = useState<boolean>(true);

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();

    const [ refreshing, setRefreshing ] = useState<boolean>(false);

    const [ recipients, setRecipients ] = useState<Person[]>([]);
    const [ title, setTitle ] = useState<string>();
    const [ content, setContent ] = useState<string>();

    const [profile, setProfile] = useState<Profile>();

    const [sortedBy, setSortedBy] = useState<string>("Nyeste");
    const [modalVisible, setModalVisible] = useState<boolean>(false);

    const [ sendingMessage, setSendingMessage ] = useState<boolean>(false);

    const [ rawPeople, setRawPeople ] = useState<{[id: string]: Person}>({});
    const [ filteredPeople, setFilteredPeople ] = useState<Person[]>([]);

    const [ titleFocused, setTitleFocused ] = useState<boolean>();
    const [ headerTop, setHeaderTop ] = useState<number>(45);
    const [ sheetHeight, setSheetHeight ] = useState<number>(45);

    const [ rateLimited, setRateLimited ] = useState<boolean>(false);
    const [ messages, setMessages ] = useState<LectioMessage[] | null>([]);
    const [ headers, setHeaders ] = useState<{[id: string]: string}>();

    /**
     * Used in the message-modal to make the x-icon appear so you can clear 
     * what you've entered
     */
    useEffect(() => {
        const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
            if(bottomSheetModalRef == null) return;
            
            handleSnapPress(0)
            setTitleFocused(false);
        });
    
        return () => {
            hideSubscription.remove();
        };
    }, []);

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['80%'], []);
    const handlePresentModalPress = useCallback(() => {
      bottomSheetModalRef.current?.present();
    }, []);
    const handleCloseModalPress = useCallback(() => {
        bottomSheetModalRef.current?.close();
      }, []);
    const handleSnapPress = useCallback((index: number) => {
        bottomSheetModalRef.current?.snapToIndex(index);
    }, []);

    /**
     * 
     * @param searchString what the user is searching for
     * @returns a list of users matching the searched string
     */
    const filterPeople = (searchString: string) => {
        if(searchString.length < 3)
            return [];

        const out: Person[] = [];

        Object.keys(rawPeople).forEach((name) => {
            if(name.trim().toLowerCase().includes(searchString.toLowerCase().trim()))
                out.push(rawPeople[name])
        })

        return out;
    }

    /**
     * Renders the filter and message-buttons
     */
    useEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <View style={{
                    marginLeft: 15,
                }}>
                    <Pressable
                        onPress={() => {
                            handlePresentModalPress();
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
            ),
            headerRight: () => (
                <View style={{
                    marginRight: 15,
                }}>
                    <Pressable
                        onPress={() => {
                            setModalVisible(true)
                        }}
                        style={{
                            padding: 4,

                            backgroundColor: "rgba(0,122,255,0.2)",
                            borderRadius: 100,
                        }}
                    >
                        <View style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                        }}>
                            <AdjustmentsVerticalIcon color={"rgba(0,122,255,1)"} />

                            {(sortedBy != null) &&
                                <Text style={{
                                    color: "rgba(0,122,255,1)",
                                    marginLeft: 2.5,
                                    marginRight: 1,
                                }}>
                                    {sortedBy}
                                </Text>
                            }
                        </View>
                    </Pressable>

                    <Modal
                        transparent
                        visible={modalVisible}
                        onRequestClose={() => {
                            setModalVisible(!modalVisible)
                        }}
                        style={{
                            position: "relative",

                            bottom: 0,
                            right: 0,
                        }}
                    >
                        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                            <View style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)'
                            }} />
                        </TouchableWithoutFeedback>

                        <View style={{
                            position: "absolute",
                            right: 50,
                            top: 50,

                            borderRadius: 7.5,
                            backgroundColor: COLORS.BLACK,

                            paddingVertical: 10,
                        }}>
                            <Pressable onPress={() => {
                                setModalVisible(false);
                                setSortedBy("Nyeste")
                            }}>
                                <View style={{
                                    paddingLeft: 10,
                                    paddingRight: 15,

                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",

                                    marginVertical: 7.5,

                                    gap: 40,
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontSize: 15,
                                    }}>
                                        Nyeste
                                    </Text>
                                    <EnvelopeOpenIcon size={20} color={COLORS.LIGHT} />
                                </View>
                            </Pressable>
                            <View style={{
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: COLORS.WHITE,
                                opacity: 0.6,

                                marginHorizontal: 10,
                                marginVertical: 5,
                            }} />

                            <Pressable onPress={() => {
                                setModalVisible(false);
                                setSortedBy("Ulæste")
                            }}>
                                <View style={{
                                    paddingLeft: 10,
                                    paddingRight: 15,

                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",

                                    marginVertical: 7.5,

                                    gap: 40,
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontSize: 15,
                                    }}>
                                        Ulæste
                                    </Text>
                                    <EnvelopeIcon size={20} color={COLORS.LIGHT} />
                                </View>
                            </Pressable>
                            <View style={{
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: COLORS.WHITE,
                                opacity: 0.6,

                                marginHorizontal: 10,
                                marginVertical: 5,
                            }} />

                            <Pressable onPress={() => {
                                setModalVisible(false);
                                setSortedBy("Slettede")
                            }}>
                                <View style={{
                                    paddingLeft: 10,
                                    paddingRight: 15,

                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",

                                    marginVertical: 7.5,

                                    gap: 40,
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontSize: 15,
                                    }}>
                                        Slettede
                                    </Text>
                                    <TrashIcon size={20} color={COLORS.LIGHT} />
                                </View>
                            </Pressable>
                        </View>
                    </Modal>
                </View>
            )
        })
    }, [navigation, modalVisible])

    /**
     * Fetches the messages on page load
     */
    useEffect(() => {
        setLoading(true);

        (async () => {
            const gym = await getSecure("gym");
            setGym(gym);

            if(profile == null) {
                const profile = await getProfile();
                setProfile(profile);
            }

            if(Object.keys(rawPeople).length == 0) {
                const people = await getPeople();
                if(people != null)
                    setRawPeople(people);
            }

            let mappeId: number = -70;
            if(sortedBy == "Nyeste") mappeId = -70;
            else if(sortedBy == "Ulæste") mappeId = -40;
            else if(sortedBy == "Slettede") mappeId = -60;

            getMessages(gym.gymNummer, mappeId).then(({payload, rateLimited}): any => {
                setMessages(payload.messages);
                setHeaders(payload.headers);

                setRateLimited(rateLimited);
                setLoading(false);
            })
        })();
    }, [sortedBy]);

    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            let mappeId: number = -70;
            if(sortedBy == "Nyeste") mappeId = -70;
            else if(sortedBy == "Ulæste") mappeId = -40;
            else if(sortedBy == "Slettede") mappeId = -60;

            if(gym == null)
                return;
            
            getMessages(gym.gymNummer, mappeId, true).then(({payload, rateLimited}): any => {
                setMessages(payload.messages);
                setHeaders(payload.headers);

                setRateLimited(rateLimited);
                setRefreshing(false);
            })
        })();
    }, [refreshing]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    return (
    <View style={{
        minHeight: '100%',
        minWidth:'100%',
        backgroundColor: COLORS.BLACK,

        paddingBottom: 50,
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
            <ScrollView style={{
                marginBottom: 50,
            }} refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
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
                    <>
                        {messages.length == 0 ? 
                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
        
                                flexDirection: 'column-reverse',
        
                                minHeight: '40%',
        
                                gap: 5,
                            }}>
                                <Text style={{
                                    color: COLORS.WHITE,
                                    textAlign: 'center'
                                }}>
                                    {sortedBy == "Nyeste" ? "Du har ingen nye beskeder!" : `Du har ingen ${sortedBy.toLowerCase()} beskeder!`}
                                </Text>
                                <Logo size={40} />
                            </View>
                        :
                            <TableView style={{
                                paddingHorizontal: 20,
                            }}>
                                <Section roundedCorners={true} hideSurroundingSeparators={true}>
                                    {messages.map((message: LectioMessage, index: number) => {
                                        return (
                                            <Cell 
                                                key={index}
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
                    </>
                }
            </ScrollView>
        }

        <BottomSheetModalProvider>
            <BottomSheetModal
                ref={bottomSheetModalRef}
                index={0}
                snapPoints={snapPoints}

                bottomInset={90}

                backgroundStyle={{
                    backgroundColor: COLORS.BLACK,
                }}
                handleIndicatorStyle={{
                    backgroundColor: COLORS.WHITE,
                }}
            >
                <View onLayout={(event) => {
                    const {x, y, width, height} = event.nativeEvent.layout;
                    setSheetHeight(height);
                }} style={{
                    minHeight: "100%",
                }}>
                    
                    <View style={{
                        display: "flex",
                        flexDirection: "column",

                        gap: 2.5,
                    }}>
                        <View
                            onLayout={(event) => {
                                const {x, y, width, height} = event.nativeEvent.layout;
                                setHeaderTop(height + 9);
                            }}
                            style={{
                                borderRadius: 2,
                                backgroundColor: COLORS.ACCENT_BLACK,

                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",

                                alignItems: "center",

                                gap: 5,
                                
                                marginTop: 8,
                                paddingVertical: 8,
                                paddingHorizontal: 8,
                            }}
                        >
                            
                            <Text style={{
                                color: COLORS.WHITE,
                                fontSize: 16,
                                lineHeight: 20,
                            }}>
                                Til:
                            </Text>
                            

                            {recipients.map((recipient: Person, index: number) => {
                                return (
                                    <Pressable key={index} onPress={() => {
                                        const filtered = recipients.filter((person: Person) => { return person !== recipient });
                                        setRecipients(filtered);
                                    }}>
                                        <View style={{
                                            padding: 5,
                                            backgroundColor: COLORS.DARK,

                                            display: "flex",
                                            flexDirection: "row",

                                            alignItems: "center",
                                            gap: 5,

                                            borderRadius: 5,
                                        }}>
                                            <Text style={{
                                                color: COLORS.WHITE,
                                            }}>
                                                {recipient.navn}
                                            </Text>

                                            <XCircleIcon size={15} color={COLORS.ACCENT} />
                                        </View>
                                    </Pressable>
                                )
                            })}

                            {recipients.length > 0 && (
                                <View style={{
                                    width: "100%",
                                }} />
                            )} 

                            <BottomSheetTextInput
                                ref={ref => (this.ref = ref)}

                                numberOfLines={1}
                                editable
                                placeholder={"Søg efter lære eller elev"}
                                placeholderTextColor={hexToRgb(COLORS.WHITE, 0.6)}
                                style={{
                                    fontSize: 16,
                                    lineHeight: 20,
                                    textAlign: "left",
                                    color: COLORS.WHITE,
                                    flex: 1,
                                }}
                                onPressIn={() => {
                                    setFilteredPeople([]);
                                }}
                                onFocus={() => setTitleFocused(true)}
                                onBlur={() => {
                                    this.ref.clear();
                                    //setFilteredPeople([]);
                                }}

                                onChangeText={(text) => {
                                    
                                    setFilteredPeople(filterPeople(text));
                                }}
                            />

                            {titleFocused && (
                                <Pressable onPress={() => {

                                    this.ref.blur();
                                    this.ref.clear();
                                    setTitleFocused(false);
                                    handleSnapPress(0);

                                }} hitSlop={20}>
                                    <XCircleIcon size={20} color={COLORS.WHITE} />
                                </Pressable>
                            )}

                        </View>

                        <View style={{
                            borderRadius: 2,
                            backgroundColor: COLORS.ACCENT_BLACK,

                            padding: 8,

                            display: "flex",
                            flexDirection: "row",
                            gap: 5,
                        }}>
                            <Text style={{
                                color: COLORS.WHITE,
                                fontSize: 16,
                                lineHeight: 20,
                            }}>
                                Emne:
                            </Text>
                            
                            <BottomSheetTextInput
                                numberOfLines={1}

                                editable
                                placeholder={"Overskrift"}
                                placeholderTextColor={hexToRgb(COLORS.WHITE, 0.6)}
                                style={{
                                    fontSize: 16,
                                    lineHeight: 20,
                                    color: COLORS.WHITE,
                                    flex: 1,
                                }}
                                onChangeText={setTitle}
                            />
                        </View>
                        <View           
                            style={{
                                width: "100%",

                                maxHeight: "60%",
                            }}
                        >
                            <BottomSheetTextInput
                                editable
                                multiline
                                textAlignVertical={"top"}
                                scrollEnabled

                                placeholder={"Indhold"}
                                placeholderTextColor={hexToRgb(COLORS.WHITE, 0.6)}
                                style={{
                                    padding: 8,

                                    fontSize: 16,
                                    lineHeight: 20,

                                    minHeight: 20 * 5,
                                    color: COLORS.WHITE,

                                    borderRadius: 2,
                                    backgroundColor: COLORS.ACCENT_BLACK,
                                }}
                                onChangeText={setContent}
                            />
                        </View>
                    </View>

                    <Pressable style={{
                        position: "absolute",
                        right: 0,
                        bottom: 0,

                        height: 60,
                        width: 60,
                        borderRadius: 100,

                        marginRight: 30,
                        marginBottom: 30,

                        backgroundColor: COLORS.DARK,

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",

                        transform: [{
                            rotate: "-45deg",
                        }]
                    }} onPress={() => {
                        if (title != null && content != null && recipients.length != 0 && gym != null) {
                            setSendingMessage(true);
                            sendMessage(title, recipients, content, gym?.gymNummer, (messageId: string | null) => {
                                setSendingMessage(false);
                                handleCloseModalPress();

                                deleteSaved(Key.BESKEDER);
                                setMessages((prev) => {
                                    return (
                                        [...(prev == null ? [] : prev),
                                        {
                                            editDate: null,
                                            sender: profile == null ? "Ukendt" : profile.name,
                                            title: title,
                                            unread: false,
                                            messageId: messageId == null ? "" : messageId,
                                        }
                                        ]
                                    )
                                })

                            });
                        } else {
                            console.log("Invalid args passed.")
                        }
                    }}>
                        {!sendingMessage ? 
                            (<PaperAirplaneIcon size={25} color={COLORS.WHITE} />)
                        :
                            (<ActivityIndicator size={25} color={COLORS.WHITE} />)
                        }
                    </Pressable>
                </View>

                {titleFocused && 
                    <KeyboardAvoidingView behavior="padding" style={{
                        position: "absolute",

                        width: "100%",
                        height: sheetHeight - headerTop,
                        top: headerTop,
                        left: 0,

                        backgroundColor: hexToRgb(COLORS.BLACK, 0.6),
                        zIndex: 50,
                    }}>
                        <BottomSheetScrollView
                            keyboardShouldPersistTaps="always"
                            keyboardDismissMode={"none"}
                        >
                            {filteredPeople.map((person: Person, i: number) => {
                                const uri = SCRAPE_URLS(gym?.gymNummer, person.billedeId).PICTURE_HIGHQUALITY;

                                return (
                                    <TouchableWithoutFeedback
                                        onPress={() => {
                                            setRecipients([...recipients, person])
                                            setTitleFocused(false)
                                            this.ref.blur();
                                        }}
                                        key={i}
                                    >
                                        <View style={{
                                            paddingHorizontal: 20,
                                            paddingVertical: 15,
                                            
                                            backgroundColor: hexToRgb(COLORS.BLACK, 0.6),
                                            display: 'flex',
                                            gap: 10,
                                            flexDirection: "row",

                                            alignItems: "center",
                                        }}>
                                            <ProfilePicture gymNummer={gym?.gymNummer ?? ""} billedeId={person.billedeId ?? ""} size={40} navn={person.navn} noContextMenu />

                                            <Text style={{
                                                color: COLORS.WHITE,
                                            }}>
                                                {person.navn}
                                            </Text>
                                        </View>
                                    </TouchableWithoutFeedback>
                                )
                            })}

                            {filteredPeople.length == 0 && (
                                <Text style={{
                                    color: COLORS.WHITE,
                                    fontSize: 10,

                                    paddingTop: 20,
                                    width: "100%",
                                    textAlign: "center"
                                }}>
                                    Ingen resultater...
                                </Text>
                            )}
                            
                        </BottomSheetScrollView>
                    </KeyboardAvoidingView>
                }

            </BottomSheetModal>
        </BottomSheetModalProvider>

        {rateLimited && <RateLimit />}
    </View>
    )
}