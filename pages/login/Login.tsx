import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, ViewStyle } from "react-native";
import COLORS from "../../modules/Themes";
import { ArrowRightCircleIcon, ChevronDoubleRightIcon } from "react-native-heroicons/solid";
import { useContext, useState } from "react";
import { getUnsecure, isAuthorized, secureSave, validate } from "../../modules/api/Authentication";
import { SignInPayload } from "../../App";
import { AuthContext } from "../../modules/Auth";

export default function Login({ route, navigation }: {
    route: any,
    navigation: any,
}) {
    const { signIn } = useContext(AuthContext);

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string } | null>()

    getUnsecure("gym").then((gym: { gymName: string, gymNummer: string } | null) => {
        setGym(gym)
    })

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [invalidCredentials, setInvalidCredentials] = useState(false);

    function validateAndContinue() {
        if(password == "" || username == "" || gym == null) {
            setInvalidCredentials(true);
            return;
        }

        const payload: SignInPayload = {
            password: password,
            username: username,
            gym: gym,
        }
        
        if(!signIn(payload))
            setInvalidCredentials(true)
    }

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{
                height: '100%',
                width: '100%',

                backgroundColor: COLORS.BLACK,
                
                display: 'flex',
                flexDirection: 'column',

                justifyContent: 'center',
                alignItems: 'center',

                paddingBottom: 75,
            }}>

                <Text style={{
                    fontSize: 30,
                    color: COLORS.WHITE,
                    fontWeight: "bold",
                }}>Log ind</Text>

                <TouchableOpacity onPress={() => {
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
                </TouchableOpacity>

                <View style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 25,
                    gap: 15,
                }}>
                    <TextInput onFocus={() => setInvalidCredentials(false)} onChangeText={(updated) => setUsername(updated)} placeholder="Brugernavn" style={{
                        ...styles.textInput,
                        shadowColor: (invalidCredentials) ? COLORS.RED : undefined,
                        shadowRadius: 4,
                        shadowOpacity: 0.6,

                        shadowOffset: {
                            width: 0,
                            height: 0,
                        },
                    }} />

                    <TextInput onFocus={() => setInvalidCredentials(false)} onChangeText={(updated) => setPassword(updated)} placeholder="Password" secureTextEntry={true} style={{
                        ...styles.textInput,
                        shadowColor: (invalidCredentials) ? COLORS.RED : undefined,
                        shadowRadius: 4,
                        shadowOpacity: 0.6,

                        shadowOffset: {
                            width: 0,
                            height: 0,
                        },
                    }} />
                </View>

                <Text style={{
                    color: COLORS.RED,
                    marginTop: 10,
                    opacity: invalidCredentials ? 1 : 0,
                }}>Dine oplysninger er ikke gyldige.</Text>

                <TouchableOpacity onPress={() => {Keyboard.dismiss(); validateAndContinue()}}>
                    <View style={{
                        marginTop: 50,
                        marginBottom: 125,

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
                    </View>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
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