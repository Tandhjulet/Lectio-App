import { memo, ReactElement, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getAbsenceRegistration } from "../../../modules/api/scraper/Scraper";
import { secureGet } from "../../../modules/api/helpers/Storage";
import { AbsenceReason, postRegistration, Registration,  } from "../../../modules/api/scraper/AbsenceScraper";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, SectionList, SectionListData, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { BellIcon, CalendarDaysIcon, ClockIcon, EyeDropperIcon, LockClosedIcon, PaperAirplaneIcon, PaperClipIcon } from "react-native-heroicons/solid";
import { hexToRgb, Theme, themes } from "../../../modules/Themes";
import * as Progress from 'react-native-progress';
import { LinearGradient } from "expo-linear-gradient";
import { NumberProp, SvgProps } from "react-native-svg";
import Logo from "../../../components/Logo";
import Shake from "../../../components/Shake";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SubscriptionContext } from "../../../modules/Sub";

const fraværColors = ["#fc5353", "#9578ff", "#fcca53", "#00c972", "#78d6ff", "#ff78fd"];
const fraværIndexes = ["ikke angivet", "andet", "kom for sent", "skolerelaterede aktiviteter", "private forhold", "sygdom"];

interface Props extends SvgProps {
    size?: NumberProp;
}

export default function Registreringer({ navigation }: { navigation: NativeStackNavigationProp<any> }) {
    const { subscriptionState } = useContext(SubscriptionContext);

    const [ remappedRegs, setRemappedRegs ] = useState<{
        key: string,
        data: Registration[],
    }[]>([]);
    const [ absenceReason, setAbsenceReason] = useState<AbsenceReason | ((absenceReason: AbsenceReason) => string) | null>(null);

    const [ loading, setLoading ] = useState(true);
    const [ refreshing, setRefreshing ] = useState(false);

    const [ sendLoading, setSendLoading ] = useState<boolean>(false);
    const [ sendError, setSendError ] = useState<boolean>(false);
    const [ commentField, setCommentField ] = useState<string>();
    const [ registration, setRegistration ] = useState<Registration>();

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const bottomSheetAbsenceRegistrationRef = useRef<BottomSheetModal>(null);

    const onRegistrationRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    useEffect(() => {
        (async () => {
            const gymNummer = (await secureGet("gym")).gymNummer;
        
            getAbsenceRegistration(gymNummer, false, (res) => {
                if(!res) {
                    setRemappedRegs([]);
                    setLoading(false);
                    return;
                }
    
                const out: {
                    key: string,
                    data: Registration[],
                }[] = [];
    
                res.sort((a, b) => {
                    if(typeof a.registered === "string") a.registered = new Date(a.registered);
                    if(typeof a.modulStartTime === "string") a.modulStartTime = new Date(a.modulStartTime);
                    if(typeof b.registered === "string") b.registered = new Date(b.registered);
                    if(typeof b.modulStartTime === "string") b.modulStartTime = new Date(b.modulStartTime);
    
                    return (b.registered.valueOf() + b.modulStartTime.valueOf()) - (a.registered.valueOf() + a.modulStartTime.valueOf())
                });
    
                let current = "";
                let index = 0;
    
                for(let reg of res) {
                    const str = reg.modulStartTime.toLocaleDateString("da-DK", {
                        dateStyle: "full",
                    });
    
                    if(current != str) {
                        index = out.push({
                            key: str,
                            data: [],
                        })-1;
        
                        current = str;
                    }
        
                    out[index].data.push(reg);
                }
    
                setRemappedRegs(out);
                setLoading(false);
            })
        })();
    }, [])

    useEffect(() => {
        if(!refreshing) return;

        bottomSheetModalRef.current?.dismiss();

        (async () => {
            const gymNummer = (await secureGet("gym")).gymNummer;
            getAbsenceRegistration(gymNummer, true, (res) => {
                if(!res) {
                    setRemappedRegs([]);
                    return;
                }
                const out: {
                    key: string,
                    data: Registration[]
                }[] = [];

                res.sort((a, b) => {
                    if(typeof a.registered === "string") a.registered = new Date(a.registered);
                    if(typeof a.modulStartTime === "string") a.modulStartTime = new Date(a.modulStartTime);
                    if(typeof b.registered === "string") b.registered = new Date(b.registered);
                    if(typeof b.modulStartTime === "string") b.modulStartTime = new Date(b.modulStartTime);

                    return (b.registered.valueOf() + b.modulStartTime.valueOf()) - (a.registered.valueOf() + a.modulStartTime.valueOf())
                });

                let current = "";
                let index = 0;

                for(let reg of res) {
                    const str = reg.modulStartTime.toLocaleDateString("da-DK", {
                        dateStyle: "full",
                    });

                    if(current != str) {
                        index = out.push({
                            key: str,
                            data: [],
                        })-1;
        
                        current = str;
                    }
        
                    out[index].data.push(reg);
                }
                setRemappedRegs(out);

                setSendLoading(false);
                setRefreshing(false);
            })
        })();
    }, [refreshing])

    const handlePress = useCallback((reg: Registration) => {
        if(!subscriptionState?.hasSubscription) {
            navigation.push("NoAccess")
            return;
        }

        setRegistration(reg);
        setCommentField(reg.studentNote?.split("\n").slice(1).join("\n"));

        if(reg.studentProvidedReason) {
            let note = reg.studentNote?.split("\n")[0]?.toLowerCase();
            if(note?.toLowerCase() == "skolerelaterede aktiviteter")
                note = "skolerelateret";

            setAbsenceReason(AbsenceReason[note?.replaceAll(" ", "_").toUpperCase() as keyof typeof AbsenceReason]);
        } else {
            setAbsenceReason(null);
        }

        bottomSheetAbsenceRegistrationRef.current?.dismiss();
        bottomSheetModalRef.current?.present();
    }, []);

    const SectionHeader = memo(function SectionHeader({
        data,
        theme,
    }: {
        data: {
            section: SectionListData<Registration, {
                key: string;
                data: Registration[];
            }>;
        },
        theme: Theme,
    }) {
        return (
            <View style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
            }}>

                <View style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    flexDirection: "row",
                    width: "100%",
                }}>

                    <Text style={{
                        color: hexToRgb(theme.WHITE.toString(), 0.8),
                        fontWeight: "normal",
                        fontSize: 15,
                        marginBottom: 5,
                    }}>
                        {data.section.key}
                    </Text>

                    <Text style={{
                        color: hexToRgb(theme.WHITE.toString(), 0.4),
                        fontWeight: "normal",
                        fontSize: 15,
                        marginBottom: 5,
                    }}>
                        {data.section.data.length} {data.section.data.length == 1 ? "modul" : "moduler"}
                    </Text>
                </View>
            </View>
        )
    })

    const Registration = memo(function Registration({
        reg,
        theme,
        i,
    }: {
        reg: Registration,
        theme: Theme,
        i: number,
    }) {
        const colorIndex = useRef(fraværIndexes.findIndex((v) => v == (!reg.studentProvidedReason ? "Ikke angivet" : reg.studentNote?.split("\n")[0])?.toLowerCase())).current;
        const color = useRef(fraværColors[colorIndex]).current;

        return (
            <TouchableOpacity
                onPress={() => handlePress(reg)}

                style={{
                    marginTop: !(i == 0) ? 4 : 0,
                }}
            >
                <View 
                    style={{
                        backgroundColor: hexToRgb(theme.WHITE.toString(), 0.07),

                        borderRadius: 10,
                        overflow: "hidden",

                        maxWidth: "100%",
                    }}
                    
                    shouldRasterizeIOS
                    renderToHardwareTextureAndroid
                >
                    <LinearGradient
                        start={[0, 0]}
                        end={[1, 0]}
                        colors={[color, "transparent"]}
    
                        style={{
                            position: "absolute",
                            width: "100%",
                            height: "100%",
    
                            transform: [{
                                rotate: "180deg",
                            }],
                            zIndex: 1,
                            opacity: 0.1,
                        }}
                    />

                    <View style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        padding: 10,
                    }}>
                        <View style={{
                            flexDirection: "column",
                            alignItems: "flex-start",

                            gap: 5,

                            maxWidth: "80%",
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                fontWeight: "700",
                                fontSize: 14,
                                letterSpacing: 0.2,
                            }}>
                                {reg.modul}
                            </Text>

                            <View style={{
                                paddingVertical: 7.5,
                                paddingHorizontal: 15,

                                backgroundColor: hexToRgb(color, 0.1),
                                borderRadius: 5,
                            }}>
                                <Text style={{
                                    color: hexToRgb(color, 1),
                                    fontWeight: "800",
                                    letterSpacing: 0.1,
                                    fontSize: 15,
                                }}>
                                    {reg.studentNote?.split("\n")[0] ?? "Opgiv årsag"}
                                </Text>

                                {reg.studentNote?.split("\n")[1] ? (
                                    <Text style={{
                                        color: hexToRgb(color, 1),
                                        fontSize: 14,
                                        lineHeight: 15,

                                    }} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={4} ellipsizeMode="middle">
                                        {reg.studentNote?.split("\n")[1]}
                                    </Text>
                                ): null }
                            </View>
                        </View>

                        <View style={{
                            flexGrow: 1,
                        }} />

                        <View style={{
                            position: "relative",
                        }}>
                            <Progress.Circle
                                size={60}
                                progress={parseFloat(reg.absence)/100}
                                color={color}
                                thickness={2}
                                borderWidth={0}

                                unfilledColor={hexToRgb(color, 0.2)}
                            />
        
                            <View style={{
                                position: "absolute",
                                width: 60, // width and width of chart is 60 if radius is 30
                                height: 60,
        
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                <Text style={{
                                    color: color,
                                    fontFamily: "bold",
                                    letterSpacing: 0.6,
                                }}>
                                    {reg.absence}%
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        )
    }, (prev, next) => Object.is(prev.reg.url, next.reg.url))

    const RegistrationComponent = memo(({
        title,
        color,
        Icon,
        setAbsenceReason,
    }: {
        title: string,
        color: string,
        Icon: ReactElement<Props, any>,
        setAbsenceReason: React.Dispatch<React.SetStateAction<AbsenceReason | ((absenceReason: AbsenceReason) => string) | null>>,
    }) => (
        <TouchableOpacity style={{
            width: "40%",
            height: "25%",

            marginVertical: 5,

            backgroundColor: hexToRgb(color, 0.3),

            borderRadius: 5,
        }} onPress={() => {
            const str = (title || "andet").toUpperCase().replaceAll(" ", "_");

            const reason = AbsenceReason[str as keyof typeof AbsenceReason];
            setAbsenceReason(reason);
            
            bottomSheetAbsenceRegistrationRef.current?.dismiss();
            bottomSheetModalRef.current?.present();
        }}>
            <View style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",

                flexDirection: "column",

                flex: 1,
                gap: 5,
            }}>
                {Icon}

                <Text style={{
                    fontWeight: "600",
                    fontSize: 15,
                    letterSpacing: 0.4,

                    color: color,
                }}>
                    {title}
                </Text>
            </View>
        </TouchableOpacity>
    ), (prev, next) => Object.is(prev.title, next.title));

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const { height, width } = Dimensions.get("window")
    
    return (
        <GestureHandlerRootView>
            <BottomSheetModalProvider>
                <View style={{
                    height: "100%",
                    width: "100%",

                    paddingBottom: 89,
                }}>
                    {(!remappedRegs || remappedRegs.length == 0) && !loading ? (
                        <ScrollView refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRegistrationRefresh} />
                        } contentContainerStyle={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                    
                            minHeight: '40%',

                            gap: 10,
                        }}>
                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                paddingTop: 100,

                                gap: 5,
                            }}>
                                <Logo size={50} color={hexToRgb(theme.ACCENT.toString(), 0.8)} minOpacity={0.8} />
                                <Text style={{
                                    fontSize: 20,
                                    color: hexToRgb(theme.LIGHT.toString(), 1),
                                }}>
                                    Ingen fraværsregistreringer
                                </Text>
                                <Text style={{
                                    color: theme.WHITE,
                                    textAlign: 'center'
                                }}>
                                    Du har ikke fået noget fravær.
                                </Text>
                            </View>
                        </ScrollView>
                    ) : null}
                    {loading ? (
                        <View style={{
                            height: height / 2,
                            width: width,

                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <ActivityIndicator size={"small"} />
                        </View>
                    ) : null}
                    {!loading && remappedRegs && remappedRegs.length > 0 ? (
                        <SectionList
                            sections={remappedRegs}

                            renderItem={({ item, index }) => <Registration reg={item} theme={theme} i={index} />}
                            renderSectionHeader={(data) => <SectionHeader data={data} theme={theme} />}

                            stickySectionHeadersEnabled={false}
                            keyExtractor={(item, index) => index + item.modul + item.registeredTime}

                            getItemLayout={(data, index) => {
                                return {index, length: 80, offset: 80 * index}
                            }}

                            style={{
                                paddingHorizontal: 15,
                            }}

                            contentContainerStyle={{
                                paddingBottom: 10,
                            }}

                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRegistrationRefresh} />
                            }
                        />
                    ) : null}

                    <BottomSheetModal
                        ref={bottomSheetModalRef}
                        index={0}
                        stackBehavior="push"

                        bottomInset={89}

                        backgroundStyle={{
                            backgroundColor: theme.ACCENT_BLACK,
                        }}
                        handleIndicatorStyle={{
                            backgroundColor: theme.WHITE,
                        }}

                        enableDynamicSizing
                    >   
                        {(!loading && !refreshing) ? (() => {
                            let color;
                            if(absenceReason == null) {
                                const colorIndex = fraværIndexes.findIndex((v) => v == (!registration?.studentProvidedReason ? "Ikke angivet" : registration?.studentNote?.split("\n")[0])?.toLowerCase())
                                color = fraværColors[colorIndex];
                            } else {
                                const str = AbsenceReason.toString(absenceReason);
                                const colorIndex = fraværIndexes.findIndex((v) => v == (str.toLowerCase() == "skolerelateret" ? "skolerelaterede aktiviteter" : str).toLowerCase())
                                color = fraværColors[colorIndex];
                            }

                            return (
                                <BottomSheetScrollView keyboardShouldPersistTaps="handled" key={0}>
                                    <View style={{
                                        height: "100%",
                                        width: "100%",
            
                                        display: "flex",
                                        flexDirection: "column",
            
                                        paddingHorizontal: 20,
                                        marginVertical: 10,
            
                                        gap: 10,
                                    }}>
                                        <View style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            flexDirection: "row",
                                        }}>     
                                            <Text style={{
                                                fontSize: 17.5,
                                                fontWeight: "bold",
                
                                                color: theme.WHITE,
                                            }}>
                                                Opgiv fraværsårsag
                                            </Text>

                                            <Pressable style={{
                                                display: "flex",
                                                flexDirection: "row",

                                                alignItems: "center",

                                                gap: 5,
                                            }} onPressIn={async () => {
                                                if(absenceReason == null || typeof absenceReason == "function")  {
                                                    setSendError(!sendError);
                                                    return;
                                                };
                                                
                                                setSendLoading(true);
                                                const gymNummer = (await secureGet("gym")).gymNummer;

                                                await postRegistration({
                                                    reason: absenceReason,
                                                    comment: commentField,
                                                }, (registration?.url) || "", gymNummer);
                                                onRegistrationRefresh();
                                            }}>
                                                {!sendLoading ? (
                                                    <>
                                                        <Text style={{
                                                            color: theme.LIGHT,
                                                            fontSize: 17.5,
                                                            fontWeight: "bold",
                                                        }}>
                                                            Send
                                                        </Text>
                                                        <PaperAirplaneIcon size={17.5} color={theme.LIGHT} />
                                                    </>
                                                ) : (
                                                    <ActivityIndicator color={theme.LIGHT} />
                                                )}
                                            </Pressable>
                                        </View>
            
                                        <View style={{
                                            width: "100%",
                                            height: StyleSheet.hairlineWidth,
            
                                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.6),
                                        }} />
            
                                        <View style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}>
                                            <View style={{
                                                maxWidth: "70%",

                                                display: "flex",
                                                gap: 10,
                                            }}>
                                                <View style={{
                                                    display: "flex",
                                                    gap: 2.5,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: "600",
                    
                                                        color: theme.WHITE,
                                                    }}>
                                                        Registreret
                                                    </Text>
                    
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: "400",
                    
                                                        color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                    }}>
                                                        {registration?.registered.toLocaleDateString("da-DK", {
                                                            day: "numeric",
                                                            month: "long",
                                                            year: "numeric",
                                                            weekday: "long",
                                                        })} kl. {registration?.registeredTime}
                                                    </Text>
                                                </View>

                                                <View style={{
                                                    display: "flex",
                                                    gap: 2.5,
                
                                                    marginTop: 5,
                                                }}>
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: "600",
                
                                                        color: theme.WHITE,
                                                    }}>
                                                        Lektion
                                                    </Text>
                
                                                    <Text style={{
                                                        fontSize: 15,
                                                        fontWeight: "400",
                
                                                        color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                    }}>
                                                        {registration?.modul}
                                                    </Text>
                                                </View>
                                            </View>
            
                                            <View style={{
                                                borderRadius: 999,
                                                borderColor: color,
                                                borderWidth: 2,

                                                position: "relative"
                                            }}>
                                                <Progress.Pie
                                                    size={80}
                                                    progress={parseFloat(registration?.absence || "0")/100}
                                                    color={hexToRgb(color, 0.2)}
                                                    borderWidth={1}
                                                />

                                                <View style={{
                                                    position: "absolute",
                                                    width: 40*2, // width and width of chart is 60 if radius is 30
                                                    height: 40*2,

                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                }}>
                                                    <Text style={{
                                                        color: color,
                                                        fontFamily: "bold",
                                                        letterSpacing: 1,

                                                        fontSize: 17.5,
                                                    }}>
                                                        {registration?.absence}%
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        
                                        <Pressable style={{
                                            width: "100%",
                                            paddingVertical: 20,
                                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
                                            borderRadius: 10,
                                        }} onPress={() => {
                                            bottomSheetModalRef.current?.dismiss();
                                            bottomSheetAbsenceRegistrationRef.current?.present()
                                        }}>
                                            <Shake shakeOn={() => absenceReason == null} deps={[sendError]} violence={2}>
                                                <Text style={{
                                                    color: color,
                                                    fontWeight: "bold",
                                                    fontSize: 17.5,
                                                    textAlign: "center",
                                                }}>
                                                    {absenceReason == null ? "Opgiv fraværsårsag" : AbsenceReason.toString(absenceReason)}
                                                </Text>
                                            </Shake>
                                        </Pressable>

                                        <BottomSheetTextInput
                                            editable
                                            multiline
                                            textAlignVertical={"top"}
                                            scrollEnabled

                                            onChangeText={(e) => setCommentField(e)}
                                            defaultValue={registration?.studentNote?.split("\n").slice(1).join("\n") || ""}

                                            placeholder={"Tilføj en kommentar"}
                                            placeholderTextColor={hexToRgb(theme.WHITE.toString(), 0.6)}
                                            style={{
                                                padding: 8,

                                                fontSize: 16,
                                                lineHeight: 20,

                                                minHeight: 20 * 5,
                                                color: theme.WHITE,

                                                borderRadius: 10,
                                                backgroundColor: hexToRgb(theme.WHITE.toString(), 0.1),
                                            }}
                                        />
                                    </View>
                                </BottomSheetScrollView>
                            )
                        })() : null}
                    </BottomSheetModal>

                    <BottomSheetModal
                        ref={bottomSheetAbsenceRegistrationRef}
                        index={0}
                        snapPoints={["50%"]}

                        bottomInset={89}
                        stackBehavior="push"

                        enableDismissOnClose

                        backgroundStyle={{
                            backgroundColor: theme.ACCENT_BLACK,
                        }}
                        handleIndicatorStyle={{
                            backgroundColor: theme.WHITE,
                        }}
                    >
                        <View style={{
                            width: "100%",
                            height: "100%",

                            backgroundColor: theme.ACCENT_BLACK,

                            display: "flex",
                            flexWrap: "wrap",

                            flexDirection: "row",

                            justifyContent: "space-evenly",
                            alignItems: "center",
                        }}>
                            {(() => {
                                const andet = fraværColors[fraværIndexes.findIndex((s) => s == "andet")]
                                const komForSent = fraværColors[fraværIndexes.findIndex((s) => s == "kom for sent")]
                                const skolerelateredeAktiviter = fraværColors[fraværIndexes.findIndex((s) => s == "skolerelaterede aktiviteter" || s == "skolerelateret")]
                                const privateForhold = fraværColors[fraværIndexes.findIndex((s) => s == "private forhold")]
                                const sygdom = fraværColors[fraværIndexes.findIndex((s) => s == "sygdom")]

                                return (
                                    <>
                                        <RegistrationComponent title={"Andet"} color={andet} Icon={<PaperClipIcon color={andet} />} setAbsenceReason={setAbsenceReason} />
                                        <RegistrationComponent title={"Kom for sent"} color={komForSent} Icon={<BellIcon color={komForSent} />} setAbsenceReason={setAbsenceReason} />
                                        <RegistrationComponent title={"Skolerelateret"} color={skolerelateredeAktiviter} Icon={<CalendarDaysIcon color={skolerelateredeAktiviter} />} setAbsenceReason={setAbsenceReason} />
                                        <RegistrationComponent title={"Private forhold"} color={privateForhold} Icon={<LockClosedIcon color={privateForhold} />} setAbsenceReason={setAbsenceReason} />
                                        <RegistrationComponent title={"Sygdom"} color={sygdom} Icon={<EyeDropperIcon color={sygdom} />} setAbsenceReason={setAbsenceReason} />
                                    </>
                                )
                            })()}
                        </View>
                    </BottomSheetModal>
                </View>
            </BottomSheetModalProvider>
        </GestureHandlerRootView>
    );
}