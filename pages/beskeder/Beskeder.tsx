import { ActivityIndicator, Alert, Button, ColorValue, Image, Keyboard, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View, useColorScheme } from "react-native";
import NavigationBar from "../../components/Navbar";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Profile, getMessages, getProfile } from "../../modules/api/scraper/Scraper";
import { hexToRgb, themes } from "../../modules/Themes";
import { secureGet, getUnsecure } from "../../modules/api/helpers/Storage";
import { LectioMessage } from "../../modules/api/scraper/MessageScraper";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { AdjustmentsVerticalIcon, ArrowUpOnSquareStackIcon, ChevronRightIcon, DocumentIcon, EnvelopeIcon, EnvelopeOpenIcon, FolderIcon, FolderMinusIcon, PaperAirplaneIcon, PencilSquareIcon, SunIcon, TrashIcon, UserIcon, XCircleIcon } from "react-native-heroicons/solid";
import { NavigationProp, useFocusEffect, useIsFocused } from "@react-navigation/native";
import RateLimit from "../../components/RateLimit";
import {
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetScrollView,
    BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { Key, deleteSaved, getSaved } from "../../modules/api/helpers/Cache";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { KeyboardAvoidingView } from "react-native";
import { sendMessage } from "../../modules/api/beskeder/sendBesked";
import Logo from "../../components/Logo";
import File from "../../modules/File";
import Popover from "react-native-popover-view/dist/Popover";
import { Placement } from "react-native-popover-view/dist/Types";
import { LinkIcon, PaperClipIcon } from "react-native-heroicons/outline";
import { upload, UploadResult } from "../../modules/api/filer/FileManager";
import React from "react";
import Shake from "../../components/Shake";
import UserCell from "../../components/UserCell";

export default function Beskeder({ navigation }: {navigation: NavigationProp<any>}) {

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const [ loading, setLoading ] = useState<boolean>(true);

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();

    const [contentColor, setContentColor] = useState<ColorValue>(theme.WHITE);

    const [sendError, setSendError] = useState<boolean>();

    const [ refreshing, setRefreshing ] = useState<boolean>(false);

    const [ recipients, setRecipients ] = useState<Person[]>([]);
    const [ files, setFiles ] = useState<UploadResult[]>();
    const [ title, setTitle ] = useState<string>();
    const [ content, setContent ] = useState<string>();

    const [profile, setProfile] = useState<Profile>();

    const [sortedBy, setSortedBy] = useState<string>("Nyeste");

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

    const [showPopover, setShowPopover] = useState(false);

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
                    <Popover
                        placement={[Placement.BOTTOM, Placement.LEFT]}
                        isVisible={showPopover}
                        onRequestClose={() => setShowPopover(false)}
                        popoverStyle={{
                            backgroundColor: theme.BLACK,
                            borderRadius: 7.5,
                        }}
                        backgroundStyle={{
                            backgroundColor: "rgba(0,0,0,0.2)"
                        }}
                        offset={5}

                        from={(
                            <TouchableOpacity style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                
                                paddingVertical: 4,
                                paddingHorizontal: 6,

                                borderRadius: 100,

                                backgroundColor: "rgba(0,122,255,0.2)",
                            }} onPress={() => setShowPopover(true)}>
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
                            </TouchableOpacity>
                        )}
                    >
                        <View style={{
                            borderRadius: 7.5,
                            backgroundColor: theme.BLACK,

                            paddingVertical: 10,
                        }}>
                            <Pressable onPress={() => {
                                setShowPopover(false);
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
                                        color: theme.WHITE,
                                        fontSize: 15,
                                    }}>
                                        Nyeste
                                    </Text>
                                    <EnvelopeOpenIcon size={20} color={theme.LIGHT} />
                                </View>
                            </Pressable>
                            <View style={{
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.WHITE,
                                opacity: 0.6,

                                marginHorizontal: 10,
                                marginVertical: 5,
                            }} />

                            <Pressable onPress={() => {
                                setShowPopover(false);
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
                                        color: theme.WHITE,
                                        fontSize: 15,
                                    }}>
                                        Ulæste
                                    </Text>
                                    <EnvelopeIcon size={20} color={theme.LIGHT} />
                                </View>
                            </Pressable>
                            <View style={{
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.WHITE,
                                opacity: 0.6,

                                marginHorizontal: 10,
                                marginVertical: 5,
                            }} />

                            <Pressable onPress={() => {
                                setShowPopover(false);
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
                                        color: theme.WHITE,
                                        fontSize: 15,
                                    }}>
                                        Slettede
                                    </Text>
                                    <TrashIcon size={20} color={theme.LIGHT} />
                                </View>
                            </Pressable>
                        </View>
                    </Popover>
                </View>
            )
        })
    }, [navigation, showPopover])

    /**
     * Fetches the messages on page load
     */
    useEffect(() => {
        setLoading(true);

        (async () => {
            const gym = await secureGet("gym");
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

            getMessages(gym.gymNummer, mappeId, false, (payload) => {
                setMessages(payload?.messages ?? null);
                setHeaders(payload?.headers);

                setRateLimited(payload === undefined);
                setLoading(false);
            })
        })();
    }, [sortedBy]);

    const { ProfilePicture } = UserCell();

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
            
            getMessages(gym.gymNummer, mappeId, true, (payload) => {
                setMessages(payload?.messages ?? null);
                setHeaders(payload?.headers);

                setRateLimited(payload === undefined);
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
        backgroundColor: theme.BLACK,

        paddingBottom: 89,
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
                <ActivityIndicator size={"small"} color={theme.ACCENT} />
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
                            color: theme.RED,
                            textAlign: 'center'
                        }}>
                            Der opstod en fejl.
                            {"\n"}
                            Du kan prøve igen ved at genindlæse.
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
                                    color: theme.WHITE,
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
                                                cellContentView={
                                                    <View style={{
                                                        paddingVertical: 10,
                                                        width: "100%",

                                                        display: "flex",
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                    }}>
                                                        <View style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                        }}>
                                                            <Text style={{
                                                                color: theme.WHITE,
                                                            }}>
                                                                {message.sender.split(" (")[0]}
                                                            </Text>

                                                            <Text style={{
                                                                color: theme.WHITE,
                                                                fontSize: 15,
                                                                fontWeight: "bold",
                                                            }}>
                                                                {message.title}
                                                            </Text>

                                                            <Text style={{
                                                                color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                            }}>
                                                                {"\n"}{message.editDate}
                                                            </Text>
                                                        </View>

                                                        <View style={{
                                                            position: 'absolute',
                                                            height: "100%",
                                                            right: 0,

                                                            justifyContent: 'center',
                                                            alignItems: 'center',

                                                            flexDirection: 'row',

                                                            gap: 5,
                                                        }}>
                                                            {message.unread &&
                                                                <View style={{
                                                                    backgroundColor: theme.ACCENT,

                                                                    height: 10,
                                                                    width: 10,
                                                                    borderRadius: 10,
                                                                }} />
                                                            }

                                                            <ChevronRightIcon
                                                                color={theme.ACCENT}
                                                            />
                                                        </View>
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

                bottomInset={89}

                backgroundStyle={{
                    backgroundColor: theme.ACCENT_BLACK,
                }}
                handleIndicatorStyle={{
                    backgroundColor: theme.WHITE,
                }}
            >
                <View onLayout={(event) => {
                    const {height} = event.nativeEvent.layout;
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
                                backgroundColor: hexToRgb(theme.WHITE.toString(), 0.02),

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
                            
                            <Shake shakeOn={() => recipients.length === 0} deps={[sendError]}>
                                <Text style={{
                                    color: theme.WHITE,
                                    fontSize: 16,
                                    lineHeight: 20,
                                }}>
                                    Modtager(e):
                                </Text>
                            </Shake>
                            

                            {recipients.map((recipient: Person, index: number) => {
                                return (
                                    <TouchableOpacity key={index} onPress={() => {
                                        const filtered = recipients.filter((person: Person) => { return person !== recipient });
                                        setRecipients(filtered);
                                    }}> 
                                        <View style={{
                                            padding: 5,
                                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.01),
                                            borderColor: theme.DARK,
                                            borderWidth: 1,

                                            display: "flex",
                                            flexDirection: "row",

                                            alignItems: "center",
                                            gap: 5,

                                            borderRadius: 5,
                                        }}>
                                            <UserIcon size={15} color={hexToRgb(theme.LIGHT.toString(), 1)} />

                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {recipient.navn}
                                            </Text>

                                            <XCircleIcon size={15} color={hexToRgb(theme.ACCENT.toString(), 0.6)} />
                                        </View>
                                    </TouchableOpacity>
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
                                placeholderTextColor={hexToRgb(theme.WHITE.toString(), 0.6)}
                                style={{
                                    fontSize: 16,
                                    lineHeight: 20,
                                    textAlign: "left",
                                    color: theme.WHITE,
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
                                    <XCircleIcon size={20} color={theme.WHITE} />
                                </Pressable>
                            )}

                        </View>

                        <View style={{
                            borderRadius: 2,
                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.02),

                            padding: 8,

                            display: "flex",
                            flexDirection: "row",
                            gap: 5,
                        }}>
                            <Shake shakeOn={() => (title ?? "").length === 0} deps={[sendError]}>
                                <Text style={{
                                    color: theme.WHITE,
                                    fontSize: 16,
                                    lineHeight: 20,
                                }}>
                                    Titel:
                                </Text>
                            </Shake>
                            
                            <BottomSheetTextInput
                                numberOfLines={1}

                                editable
                                placeholder={"Overskrift"}
                                placeholderTextColor={hexToRgb(theme.WHITE.toString(), 0.6)}
                                style={{
                                    fontSize: 16,
                                    lineHeight: 20,
                                    color: theme.WHITE,
                                    flex: 1,
                                }}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View
                            style={{
                                borderRadius: 2,
                                backgroundColor: hexToRgb(theme.WHITE.toString(), 0.02),

                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",

                                alignItems: "center",

                                gap: 5,
                                paddingVertical: 8,
                                paddingHorizontal: 8,
                            }}
                        >
                            
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 16,
                                lineHeight: 20,
                            }}>
                                Vedhæft fil:
                            </Text>

                            {files && files.map((file: UploadResult, index: number) => {
                                if(!file.ok) return <React.Fragment key={":" + index}></React.Fragment>;

                                return (
                                    <TouchableOpacity key={":" + index} onPress={() => {
                                        const filtered = files.filter((fileToCheck: UploadResult) => { return fileToCheck !== file });
                                        setFiles(filtered);
                                    }}>
                                        <View style={{
                                            padding: 5,

                                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.01),
                                            borderColor: theme.DARK,
                                            borderWidth: 1,

                                            display: "flex",
                                            flexDirection: "row",

                                            alignItems: "center",
                                            gap: 5,

                                            borderRadius: 5,
                                        }}>
                                            <DocumentIcon size={15} color={hexToRgb(theme.LIGHT.toString(), 1)} />

                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {file.fileName}
                                            </Text>

                                            <XCircleIcon size={15} color={hexToRgb(theme.ACCENT.toString(), 0.6)} />
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}

                            <TouchableOpacity onPress={async () => {
                                const file = await upload();
                                if(!file.ok && file.errorMessage) {
                                    Alert.alert(
                                        "Der opstod en fejl",
                                        file.errorMessage,
                                    )
                                }

                                const filesCopy = files;
                                if(filesCopy && !filesCopy[filesCopy.length - 1]?.ok) {
                                    filesCopy.pop();
                                }

                                if(!file.ok && !file.errorMessage) {
                                    return;
                                }

                                setFiles([
                                    ...(filesCopy ?? []),
                                    file
                                ])
                            }} style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,

                                padding: 3.2,
                                borderRadius: 5,

                                backgroundColor: hexToRgb(theme.WHITE.toString(), 0.01),
                                borderColor: (files && files.length >= 1 && !files[files.length-1].ok) ? theme.RED : theme.DARK,
                                borderWidth: 1,
                            }}>
                                <LinkIcon size={20} color={(files && files.length >= 1 && !files[files.length-1].ok) ? theme.RED : theme.LIGHT} />
                            </TouchableOpacity>
                        </View>

                        <View           
                            style={{
                                width: "100%",
                                backgroundColor: hexToRgb(theme.WHITE.toString(), 0.02),
                                maxHeight: "60%",
                            }}
                        >
                            <Shake shakeOn={() => (content ?? "").length === 0} deps={[sendError]}>
                                <BottomSheetTextInput
                                    editable
                                    multiline
                                    textAlignVertical={"top"}
                                    scrollEnabled

                                    placeholder={"Indhold"}
                                    placeholderTextColor={hexToRgb(contentColor.toString(), 0.6)}
                                    style={{
                                        padding: 8,

                                        fontSize: 16,
                                        lineHeight: 20,

                                        minHeight: 20 * 5,
                                        color: theme.WHITE,
                                        borderRadius: 2,
                                    }}
                                    onChangeText={setContent}
                                />
                            </Shake>
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

                        backgroundColor: theme.DARK,

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",

                        transform: [{
                            rotate: "-45deg",
                        }]
                    }} onPress={() => {
                        if (title != null && content != null && recipients.length != 0 && gym != null) {
                            setSendingMessage(true);
                            sendMessage(title, recipients, content ?? "", gym?.gymNummer, files ?? [], (messageId: string | null) => {
                                setSendingMessage(false);
                                if(!messageId) {
                                    return;
                                }
                                const now = new Date();

                                handleCloseModalPress();

                                deleteSaved(Key.BESKEDER);
                                setMessages((prev) => {
                                    return (
                                        [
                                            {
                                                editDate: "i dag, " + now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0"),
                                                sender: profile == null ? "Ukendt" : profile.name,
                                                title: title,
                                                unread: false,
                                                messageId: messageId == null ? "" : messageId,
                                            },
                                            ...(prev ?? [])
                                        ]
                                    )
                                })

                                
                                setFiles([]);
                                setRecipients([]);
                                setContent("");
                                setTitle("");
                            }).catch((err) => {
                                console.log(err);
                            });
                        } else {
                            setSendError(!sendError);
                        }
                    }}>
                        {!sendingMessage ? 
                            (<PaperAirplaneIcon size={25} color={theme.WHITE} />)
                        :
                            (<ActivityIndicator size={25} color={theme.WHITE} />)
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

                        backgroundColor: hexToRgb(theme.BLACK.toString(), 0.6),
                        zIndex: 50,
                    }}>
                        <BottomSheetScrollView
                            keyboardShouldPersistTaps="always"
                            keyboardDismissMode={"none"}
                        >
                            {filteredPeople.map((person: Person, i: number) => {
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
                                            
                                            backgroundColor: hexToRgb(theme.BLACK.toString(), 0.6),
                                            display: 'flex',
                                            gap: 10,
                                            flexDirection: "row",

                                            alignItems: "center",
                                        }}>
                                            <ProfilePicture gymNummer={gym?.gymNummer ?? ""} billedeId={person.billedeId ?? ""} size={40} navn={person.navn} noContextMenu />

                                            <Text style={{
                                                color: theme.WHITE,
                                            }}>
                                                {person.navn}
                                            </Text>
                                        </View>
                                    </TouchableWithoutFeedback>
                                )
                            })}

                            {filteredPeople.length == 0 && (
                                <Text style={{
                                    color: theme.WHITE,
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