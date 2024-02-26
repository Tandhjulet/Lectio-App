import {
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetScrollView,
    BottomSheetTextInput,
} from '@gorhom/bottom-sheet';

import { useMemo, useState } from "react";
import { StyleSheet, Text, View, ViewProps, ViewStyle, useColorScheme } from "react-native";
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CalendarDaysIcon, GlobeAltIcon, StarIcon } from 'react-native-heroicons/solid';
import { Pressable } from 'react-native';
import { hexToRgb, themes } from '../modules/Themes';

function Option({
    title,
    subtitle,
    price,
    sku,
    bottomSheetModalRef,
    style,
}: {
    title: string,
    subtitle: string,
    price: string,
    sku: string,
    bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>,
    style?: ViewStyle,
}) {
    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

    return (
        <Pressable style={{
            width: "40%",
            aspectRatio: 1 / 1.5,

            backgroundColor: theme.LIGHT,

            display: "flex",
            alignItems: "center",

            borderRadius: 20,

            paddingHorizontal: 5,         
            paddingTop: 20,

            ...style,
        }} onPress={() => {
            //subscribe(sku, null);
        }}>
            <View style={{
                position: "absolute",

                width: "100%",
                height: "100%",
                
                display: "flex",

                alignItems: "center",
                justifyContent: "center",

                paddingTop: 60,
            }}>
                {title == "Månedligt" ? (
                    <CalendarDaysIcon color={theme.ACCENT} size={100} />
                ) : (
                    <GlobeAltIcon color={theme.ACCENT} size={100} />
                )}
            </View>

            <Text style={{
                color: theme.WHITE,
                fontSize: 25,

                fontWeight: "bold",
                letterSpacing: 0.7,
            }}>
                {title}
            </Text>
            <Text style={{
                marginTop: 5,

                color: theme.ACCENT,
                fontSize: 14,

                fontFamily: "",
                textAlign: "center",
            }}>
                {subtitle}
            </Text>

            <View style={{
                flexGrow: 1,
            }} />

            <Pressable style={{
                backgroundColor: theme.DARK,

                paddingHorizontal: 30,
                paddingVertical: 5,
                marginVertical: 10,
                borderRadius: 20,
            }} onPress={() => {
                bottomSheetModalRef.current?.dismiss();
            }} hitSlop={35}>
                <Text style={{
                    textAlign: "center",
                    color: theme.WHITE,

                    fontSize: 20,
                }}>
                    {price} kr
                </Text>
            </Pressable>
        </Pressable>
    )
}

export default function Subscription({
    bottomSheetModalRef
}: {
    bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>,
}) {

    const snapPoints = useMemo(() => ['68%'], []);

    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}

            bottomInset={89}
            enableOverDrag

            backgroundStyle={{
                backgroundColor: theme.ACCENT_BLACK,
            }}
            handleIndicatorStyle={{
                backgroundColor: theme.WHITE,
            }}
        >
            <View style={{
                height: "100%",
                width: "100%",

                display: 'flex',
            }}>
                <View style={{
                    display: "flex",
                    flexDirection: "column",

                    justifyContent: "flex-start",
                    alignItems: "center",
                }}>
                    <Text style={{
                        color: theme.WHITE,

                        fontSize: 25,

                        fontWeight: "bold",
                        letterSpacing: 1,
                    }}>
                        Opgrader din oplevelse
                    </Text>
                    <View style={{
                        display: "flex",
                        flexDirection: "row",
                    }}>
                        <Text style={{
                            color: theme.WHITE,
                        }}>
                            med et ikke-bindene abonnement til 
                        </Text>
                        <Text style={{
                            color: theme.ACCENT,
                        }}>
                            {" "}Lectio Plus
                        </Text>
                        <Text style={{
                            color: theme.WHITE,
                        }}>
                            !
                        </Text>
                    </View>

                    <Text style={{
                        color: theme.LIGHT,
                        opacity: 0.9,
                        textAlign: "center",

                        marginTop: 7.5,
                    }}>
                        Dit abonnement vil give dig 
                        {"\n"}
                        <Text style={{
                            fontWeight: "bold",
                        }}>
                            ubegrænset adgang
                        </Text>*
                        {" "}til Lectio Plus!
                    </Text>

                    <View style={{
                        height: StyleSheet.hairlineWidth,
                        width: 100,

                        backgroundColor: theme.ACCENT,

                        marginTop: 15,
                        marginBottom: 7.5,
                    }} />

                    <Text style={{
                        color: theme.WHITE,
                        opacity: 0.8,

                        marginBottom: 20,
                    }}>
                        Lectio Plus tilbyder følgende muligheder
                    </Text>


                    <View style={{
                        display: "flex",
                        flexDirection: "row",

                        gap: 25,
                    }}>

                        <View style={{
                            position: "absolute",

                            width: "40%",
                            aspectRatio: 1 / 1.5,

                            transform: [{
                                translateX: -5,
                            }, {
                                translateY: 5,
                            }],
                            backgroundColor: theme.DARK,
                            borderRadius: 20,
                        }} />
                        <Option bottomSheetModalRef={bottomSheetModalRef} title={'Månedligt'} subtitle={'1 mdr. varighed\nFornyes automatisk!'} sku={"com.tandhjulet.lectioplus.premium_monthly"} price={'9,99'} />
 
                        <View style={{
                            position: "absolute",

                            width: "40%",
                            aspectRatio: 1 / 1.5,

                            left: "40%",
                            marginLeft: 25,

                            transform: [{
                                translateX: -5,
                            }, {
                                translateY: 5,
                            }],
                            backgroundColor: theme.DARK,
                            borderRadius: 20,
                        }} />
                        <Option bottomSheetModalRef={bottomSheetModalRef} title={'Årligt'} subtitle={'1 års varighed\nFornyes automatisk!'} price={'59,99'} sku={"com.tandhjulet.lectioplus.premium_yearly"} />
                    </View>
                </View>
                <Text style={{
                    marginTop: 10,

                    fontSize: 10,

                    color: hexToRgb(theme.WHITE.toString(), 0.7),
                    textAlign: "center",
                }}>
                    * På nuværende tidspunkt har du {"\n"} allerede ubegrænset adgang til Appen.
                </Text>
            </View>
        </BottomSheetModal>
    )
}