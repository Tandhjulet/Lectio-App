import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, ViewStyle, useColorScheme } from "react-native";
import { hexToRgb, themes } from "../../modules/Themes";
import { ArrowRightCircleIcon, ChevronDoubleRightIcon, LockClosedIcon, UserIcon } from "react-native-heroicons/solid";
import { createRef, useCallback, useContext, useEffect, useRef, useState } from "react";
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

    const passwdRef = createRef<TextInput>();
    const [gym, setGym] = useState<{ gymName: string, gymNummer: string } | null>()

    /**
     * Refresh gym state every time page focuses, to avoid logout/login mishaps
     */
    useFocusEffect(
        useCallback(() => {
            let _gym: string[] | null = null;
            if(route?.params?._gym) {
                _gym = route.params._gym;
            }

            if(_gym) {
                setGym({
                    gymName: _gym[0],
                    gymNummer: _gym[1],
                })
            }
        }, [route?.params?._gym])
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

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View style={{
            width: '100%',

            backgroundColor: theme.BLACK,
            
            display: 'flex',
            flexDirection: 'column',

            justifyContent: 'center',
            alignItems: 'center',

            paddingBottom: 275,
        }}>
            <View style={{
                paddingVertical: 10,
                width: "100%",

                backgroundColor: theme.ACCENT_BLACK,

                justifyContent: "center",
                alignItems: "center",
                marginBottom: 10,
            }}>
                <View style={{
                    width: 30,
                    height: 3,
                    borderRadius: 5,
                    backgroundColor: theme.WHITE,
                }} />
            </View>

            <Logo style={{
                marginBottom: 20,
            }} color={hexToRgb(theme.WHITE.toString(), 0.8)} minOpacity={0.8} />

            <Text style={{
                fontSize: 30,
                color: theme.WHITE,
                fontWeight: "bold",
            }}>Log ind</Text>

            <Pressable onPress={() => {
                navigation.navigate("Schools")
            }}>
                <View style={{
                    backgroundColor: theme.DARK,
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
                        color: theme.ACCENT,
                        fontWeight: "bold",

                        maxWidth: 290,
                    }}>{gym == null ? "Vælg venligst et gymnasie" : gym.gymName}</Text>

                    <ArrowRightCircleIcon color={theme.ACCENT} />
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
                    backgroundColor: theme.BLACK,
                    borderColor: hexToRgb(theme.ACCENT.toString(), 0.6),
                    shadowColor: (invalidCredentials) ? theme.RED : undefined,
                }}>
                    <UserIcon size={20} color={theme.WHITE} opacity={scheme === "light" ? 0.6 : 1} />

                    <TextInput
                        onFocus={() => setInvalidCredentials(false)}
                        onChangeText={(updated) => setUsername(updated)}
                        placeholder="Brugernavn"
                        placeholderTextColor={hexToRgb(theme.WHITE.toString(), 0.6)}
                        style={{
                            ...styles.textInput,
                            color: theme.WHITE,
                        }}
                        textContentType="oneTimeCode"
                        autoComplete="off"

                        cursorColor={theme.ACCENT}
                        autoFocus

                        onSubmitEditing={() => {
                            passwdRef.current?.focus();
                        }}
                        enterKeyHint="next"
                    />
                </View>

                <View style={{
                    ...styles.wrapper,
                    backgroundColor: theme.BLACK,
                    borderColor: hexToRgb(theme.ACCENT.toString(), 0.6),
                    shadowColor: (invalidCredentials) ? theme.RED : undefined,
                }}>
                    <LockClosedIcon size={20} color={theme.WHITE} opacity={scheme === "light" ? 0.6 : 1} />

                    <TextInput
                        ref={passwdRef}
                        onFocus={() => setInvalidCredentials(false)}
                        onChangeText={(updated) => setPassword(updated)}
                        placeholder="Kodeord"
                        secureTextEntry={true}
                        placeholderTextColor={hexToRgb(theme.WHITE.toString(), 0.6)}
                        style={{
                            ...styles.textInput,
                            color: theme.WHITE,
                        }}
                        textContentType="oneTimeCode"
                        autoComplete="off"

                        cursorColor={theme.ACCENT}

                        enterKeyHint="send"
                        onSubmitEditing={validateAndContinue}
                    />
                </View>
            </View>

            <Text style={{
                color: theme.RED,
                marginTop: 5,
                opacity: invalidCredentials ? 1 : 0,
                marginBottom: 5,
            }}>Dine oplysninger er ikke gyldige.</Text>

            <View style={{
                display: "flex",
                flexDirection: "row",
                gap: 20,
            }}>
                <Pressable
                    onPress={validateAndContinue}
                >
                    <View style={{

                        paddingHorizontal: 25,
                        paddingVertical: 10,
                        borderRadius: 99,

                        backgroundColor: scheme === "dark" ? theme.LIGHT : theme.DARK,

                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 5,
                    }}>
                        {!loading ? 
                            <Text style={{
                                color: theme.WHITE,
                                fontSize: 17,
                                fontWeight: "normal",
                            }}>
                                Fortsæt
                            </Text>
                        :
                            <ActivityIndicator color={theme.WHITE} />
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

        width: 200,

        borderRadius: 5,
        borderWidth: 1,
    }
})