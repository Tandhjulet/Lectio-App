import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, ViewStyle } from "react-native";
import COLORS from "../../modules/Themes";
import { AcademicCapIcon, ArrowRightCircleIcon, ChevronDoubleRightIcon } from "react-native-heroicons/solid";
import { useContext, useEffect, useRef, useState } from "react";
import { getUnsecure, isAuthorized, secureSave, validate } from "../../modules/api/Authentication";
import { SignInPayload } from "../../App";
import { AuthContext } from "../../modules/Auth";
import { useFocusEffect } from "@react-navigation/native";
import { Easing } from "react-native-reanimated";

export default function Login({ route, navigation }: {
    route: any,
    navigation: any,
}) {
    const { signIn } = useContext(AuthContext);

    /**
     * Logo animation
     */
    const opacity = useRef(new Animated.Value(0.7)).current;
    const scale = useRef(new Animated.Value(0.95)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
            Animated.parallel([
                Animated.timing(opacity, {
                    easing: Easing.linear,
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    easing: Easing.linear,
                    toValue: 1.05,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(opacity, {
                    easing: Easing.linear,
                    toValue: 0.7,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    easing: Easing.linear,
                    toValue: 0.95,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]),
        ])
      ).start();
    }, [opacity, scale]);

    const passwdRef = useRef<TextInput>(null);

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string } | null>()

    /**
     * Refresh gym state every time page focuses, to avoid logout/login mishaps
     */
    useFocusEffect(() => {
        getUnsecure("gym").then((gym: { gymName: string, gymNummer: string } | null) => {
            setGym(gym)
        })
    })

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [invalidCredentials, setInvalidCredentials] = useState(false);
    const [loading, setLoading] = useState<boolean>(false);

    /**
     * Validates credentials with Lectios servers
     * @returns boolean value indicating whether login was successful or not
     */
    async function validateAndContinue() { 
        if(password == "" || username == "" || gym == null) {
            setInvalidCredentials(true);
            return;
        }
        setLoading(true)

        const payload: SignInPayload = {
            password: password,
            username: username,
            gym: gym,
        }
        
        if(!(await signIn(payload))) {
            setTimeout(async () => {
                if(!(await signIn(payload))) {
                    setInvalidCredentials(true)
                    setLoading(false)
                }
            }, 100)
        }
    }

    return (
        <View style={{
            width: '100%',
            height: "100%",

            backgroundColor: COLORS.BLACK,
            
            display: 'flex',
            flexDirection: 'column',

            justifyContent: 'center',
            alignItems: 'center',

            paddingBottom: 275,
        }}>

            <Animated.View style={{
                marginBottom: 30,
                opacity: opacity,

                transform: [{
                    scale: scale,
                }]
            }}>
                <AcademicCapIcon size={75} color={COLORS.WHITE} />
            </Animated.View>

            <Text style={{
                fontSize: 30,
                color: COLORS.WHITE,
                fontWeight: "bold",
            }}>Log ind</Text>

            <Pressable onPress={() => {
                navigation.navigate("Schools")
            }}>
                <View style={{
                    backgroundColor: COLORS.DARK,
                    borderRadius: 10,

                    padding: 5,
                    paddingVertical: 2,

                    display: "flex",
                    flexDirection: "row",
                    gap: 5,

                    marginTop: 5,
                }}>
                    <Text numberOfLines={1} ellipsizeMode={"tail"} style={{
                        fontSize: 20,
                        color: COLORS.ACCENT,
                        fontWeight: "bold",

                        maxWidth: 290,
                    }}>{gym == null ? "Vælg venligst et gymnasie" : gym.gymName}</Text>

                    <ArrowRightCircleIcon color={COLORS.ACCENT} />
                </View>
            </Pressable>

            <View style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: 25,
                gap: 15,
            }}>
                <TextInput
                    onFocus={() => setInvalidCredentials(false)}
                    onChangeText={(updated) => setUsername(updated)}
                    placeholder="Brugernavn"
                    style={{
                        ...styles.textInput,
                        shadowColor: (invalidCredentials) ? COLORS.RED : undefined,
                        shadowRadius: 4,
                        shadowOpacity: 0.6,

                        shadowOffset: {
                            width: 0,
                            height: 0,
                        },
                    }}
                    textContentType="username"
                    autoComplete="username"
                    autoFocus

                    onSubmitEditing={() => {
                        passwdRef.current?.focus();
                    }}
                    enterKeyHint="next"
                />

                <TextInput
                    ref={passwdRef}
                    onFocus={() => setInvalidCredentials(false)}
                    onChangeText={(updated) => setPassword(updated)}
                    placeholder="Password"
                    secureTextEntry={true}
                    style={{
                        ...styles.textInput,
                        shadowColor: (invalidCredentials) ? COLORS.RED : undefined,
                        shadowRadius: 4,
                        shadowOpacity: 0.6,

                        shadowOffset: {
                            width: 0,
                            height: 0,
                        },
                    }}
                    textContentType="password"
                    autoComplete="current-password"

                    enterKeyHint="send"
                    onSubmitEditing={validateAndContinue}
                />
            </View>

            <Text style={{
                color: COLORS.RED,
                marginTop: 10,
                opacity: invalidCredentials ? 1 : 0,
            }}>Dine oplysninger er ikke gyldige.</Text>

            <Pressable
                onPress={validateAndContinue}
            >
                <View style={{
                    marginTop: 20,

                    paddingHorizontal: 30,
                    paddingVertical: 20,
                    borderRadius: 10,

                    backgroundColor: COLORS.LIGHT,

                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 5,
                }}>
                    {!loading ? 
                        <>
                            <ChevronDoubleRightIcon size={25} style={{
                                // @ts-ignore
                                color: COLORS.WHITE,
                            }} />

                            <Text style={{
                                color: COLORS.WHITE,
                                fontSize: 17,
                                fontWeight: "bold",
                            }}>
                                Fortsæt
                            </Text>
                        </>
                    :
                        <ActivityIndicator color={COLORS.WHITE} />
                    }
                </View>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    textInput: {
        backgroundColor: COLORS.DARK,
        color: COLORS.WHITE,

        paddingHorizontal: 18,
        paddingVertical: 15,

        fontSize: 16,

        minWidth: 200,
        borderRadius: 5,
    },
})