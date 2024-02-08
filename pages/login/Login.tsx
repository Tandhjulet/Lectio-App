import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, ViewStyle } from "react-native";
import COLORS, { hexToRgb } from "../../modules/Themes";
import { ArrowRightCircleIcon, ChevronDoubleRightIcon, LockClosedIcon, UserIcon } from "react-native-heroicons/solid";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSecure, getUnsecure, isAuthorized, secureSave, validate } from "../../modules/api/Authentication";
import { SignInPayload } from "../../App";
import { AuthContext } from "../../modules/Auth";
import { useFocusEffect } from "@react-navigation/native";
import { Easing } from "react-native-reanimated";
import Logo from "../../components/Logo";

export default function Login({ route, navigation }: {
    route: any,
    navigation: any,
}) {
    const { signIn } = useContext(AuthContext);

    const passwdRef = useRef<TextInput>(null);
    const [gym, setGym] = useState<{ gymName: string, gymNummer: string } | null>()

    /**
     * Refresh gym state every time page focuses, to avoid logout/login mishaps
     */
    useFocusEffect(
        useCallback(() => {
            getSecure("gym").then((gym: { gymName: string, gymNummer: string } | null) => {
                setGym(gym)
            })
        }, [])
    )

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

            <Logo style={{
                marginBottom: 20,
            }} />

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
                <View style={{
                    ...styles.wrapper,
                    shadowColor: (invalidCredentials) ? COLORS.RED : undefined,
                }}>
                    <UserIcon size={20} color={COLORS.WHITE} />

                    <TextInput
                        onFocus={() => setInvalidCredentials(false)}
                        onChangeText={(updated) => setUsername(updated)}
                        placeholder="Brugernavn"
                        style={{
                            ...styles.textInput,
                        }}
                        textContentType="username"
                        autoComplete="username"
                        autoFocus

                        cursorColor={COLORS.ACCENT}

                        onSubmitEditing={() => {
                            passwdRef.current?.focus();
                        }}
                        enterKeyHint="next"
                    />
                </View>

                <View style={{
                    ...styles.wrapper,
                    shadowColor: (invalidCredentials) ? COLORS.RED : undefined,
                }}>
                    <LockClosedIcon size={20} color={COLORS.WHITE} />

                    <TextInput
                        ref={passwdRef}
                        onFocus={() => setInvalidCredentials(false)}
                        onChangeText={(updated) => setPassword(updated)}
                        placeholder="Password"
                        secureTextEntry={true}
                        style={{
                            ...styles.textInput,
                        }}
                        textContentType="password"
                        autoComplete="current-password"

                        cursorColor={COLORS.ACCENT}

                        enterKeyHint="send"
                        onSubmitEditing={validateAndContinue}
                    />
                </View>
            </View>

            <Text style={{
                color: COLORS.RED,
                marginTop: 10,
                opacity: invalidCredentials ? 1 : 0,
            }}>Dine oplysninger er ikke gyldige.</Text>

            <View style={{
                display: "flex",
                flexDirection: "row",
                gap: 20,
            }}>
                <Pressable
                    onPress={() => {
                        navigation.navigate("LandingPage")
                    }}
                >
                    <View style={{

                        paddingHorizontal: 15,
                        paddingVertical: 10,
                        borderRadius: 99,

                        backgroundColor: hexToRgb(COLORS.WHITE, 0.2),

                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 5,
                    }}>
                        <Text style={{
                            color: COLORS.WHITE,
                            fontSize: 17,
                            fontWeight: "normal",
                        }}>
                            Tilbage
                        </Text>
                    </View>
                </Pressable>

                <Pressable
                    onPress={validateAndContinue}
                >
                    <View style={{

                        paddingHorizontal: 25,
                        paddingVertical: 10,
                        borderRadius: 99,

                        backgroundColor: COLORS.LIGHT,

                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 5,
                    }}>
                        {!loading ? 
                            <Text style={{
                                color: COLORS.WHITE,
                                fontSize: 17,
                                fontWeight: "normal",
                            }}>
                                Fortsæt
                            </Text>
                        :
                            <ActivityIndicator color={COLORS.WHITE} />
                        }
                    </View>
                </Pressable>
            </View>

            
        </View>
    )
}

const styles = StyleSheet.create({
    textInput: {
        fontSize: 16,
        color: COLORS.WHITE,

        flexGrow: 1,
        paddingVertical: 15,
        width: 0,
    },
    wrapper: {
        paddingRight: 10,
        paddingLeft: 10,

        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",

        gap: 7.5,

        shadowRadius: 4,
        shadowOpacity: 0.6,

        shadowOffset: {
            width: 0,
            height: 0,
        },

        backgroundColor: COLORS.BLACK,

        width: 200,

        borderRadius: 5,
        borderColor: hexToRgb(COLORS.ACCENT, 0.6),
        borderWidth: 1,
    }
})