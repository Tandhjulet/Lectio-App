import {
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetScrollView,
    BottomSheetTextInput,
    useBottomSheetDynamicSnapPoints,
} from '@gorhom/bottom-sheet';

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, ViewProps, ViewStyle, useColorScheme } from "react-native";
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CalendarDaysIcon, GlobeAltIcon, StarIcon } from 'react-native-heroicons/solid';
import { Pressable } from 'react-native';
import { hexToRgb, themes } from '../modules/Themes';
import { Sku, getSubscriptions, requestSubscription,  purchaseUpdatedListener, Purchase } from "react-native-iap";
import { useNavigation } from '@react-navigation/native';
import { getName } from '../modules/Config';

export function Option({
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
    sku: Sku,
    bottomSheetModalRef?: React.RefObject<BottomSheetModalMethods>,
    style?: ViewStyle,
}) {
    const nav = useNavigation();
    const [subscription, setSubscription] = useState<string>();

    useEffect(() => {
        const subscription = purchaseUpdatedListener((purchase: Purchase) => {
            // @ts-ignore
            nav.navigate("Tak");

            bottomSheetModalRef && bottomSheetModalRef.current?.dismiss();
          });

        (async () => {
            const sub = (await getSubscriptions({
                skus: [sku]
            }))[0];

            setSubscription(sub.productId);
        })();

        return () => {
            subscription.remove();
        }
    }, [])

    const handlePurchase = useCallback(async (sku: Sku) => {
        await requestSubscription({sku});
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <TouchableOpacity style={{
            width: 156,
            aspectRatio: 1 / 1.5,

            backgroundColor: theme.LIGHT,

            display: "flex",
            alignItems: "center",

            borderRadius: 20,

            paddingHorizontal: 5,         
            paddingTop: 20,

            ...style,
        }} onPress={() => {
            (async () => {
                if(subscription == undefined) return;
                await handlePurchase(subscription)
            })();
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

            <View style={{
                backgroundColor: theme.DARK,

                paddingHorizontal: 30,
                paddingVertical: 5,
                marginVertical: 10,
                borderRadius: 20,
            }}>
                <Text style={{
                    textAlign: "center",
                    color: theme.WHITE,

                    fontSize: 20,
                }}>
                    {price} kr
                </Text>
            </View>
        </TouchableOpacity>
    )
}

export default function Subscription({
    bottomSheetModalRef,
    bottomInset = 146,
}: {
    bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>,
    bottomInset?: number,
}) {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}

            bottomInset={bottomInset}
            enableOverDrag

            backgroundStyle={{
                backgroundColor: theme.ACCENT_BLACK,
            }}
            handleIndicatorStyle={{
                backgroundColor: theme.WHITE,
            }}
            enableDynamicSizing
        >
            <BottomSheetScrollView style={{
                display: 'flex',
            }} scrollEnabled={false}>
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
                            {" "}{getName()}
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
                        </Text>
                        {" "}til {getName()}!
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
                        {getName()} tilbyder følgende muligheder
                    </Text>

                    
                    <View style={{
                        display: "flex",
                        flexDirection: "row",

                        gap: 25,
                    }}>

                        <View style={{
                            position: "absolute",

                            width: 156,
                            aspectRatio: 1 / 1.5,

                            transform: [{
                                translateX: -5,
                            }, {
                                translateY: 5,
                            }],
                            backgroundColor: theme.DARK,
                            borderRadius: 20,
                        }} />
                        <Option
                            bottomSheetModalRef={bottomSheetModalRef}
                            title={'Månedligt'}
                            subtitle={'1 mdr. varighed\nFornyes automatisk!'}
                            sku={"full_monthly"}
                            price={'9,00'}
                        />
 
                        <View style={{
                            position: "absolute",

                            width: 156,
                            aspectRatio: 1 / 1.5,

                            left: 156,
                            marginLeft: 25,

                            transform: [{
                                translateX: -5,
                            }, {
                                translateY: 5,
                            }],
                            backgroundColor: theme.DARK,
                            borderRadius: 20,
                        }} />
                        <Option
                            bottomSheetModalRef={bottomSheetModalRef}
                            title={'Årligt'}
                            subtitle={'1 års varighed\nFornyes automatisk!'}
                            price={'59,00'}
                            sku={"full_yearly"}
                        />
                    </View>
                </View>
                
                <View style={{
                    margin: 10,
                }} />
            </BottomSheetScrollView>
        </BottomSheetModal>
    )
}