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
import { themes } from '../modules/Themes';

function Option({
    title,
    subtitle,
    price,
    sku,
    recommended,
    style,
}: {
    title: string,
    subtitle: string,
    price: string,
    sku: string,
    recommended?: boolean,
    style?: ViewStyle,
}) {
    const [height, setHeight] = useState<number>(0);
    const [width, setWidth] = useState<number>(0);

    const OFFSET = 15;

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
            }}>
                {title == "Månedligt" ? (
                    <CalendarDaysIcon color={theme.LIGHT} size={100} />
                ) : (
                    <GlobeAltIcon color={theme.LIGHT} size={100} />
                )}
            </View>

            {recommended && (
                <View style={{
                    position: "absolute",
                    top: height / 2 * -1 + OFFSET,

                    padding: 5,
                    backgroundColor: theme.LIGHT,

                    borderColor: theme.BLACK,
                    borderRadius: 50,
                    borderWidth: 2,

                    display: "flex",
                    flexDirection: "row",

                    alignItems: "center",
                    justifyContent: "center",

                    right: width / 2 * -1 + OFFSET,

                    transform: [{
                        rotate: "45deg",
                    }]
                }} onLayout={(e) => {
                    setHeight(e.nativeEvent.layout.height)
                    setWidth(e.nativeEvent.layout.width)
                }}>
                    <Text style={{
                        fontFamily: "CourierNewPS-BoldMT"
                    }}>
                        ANBEFALET
                    </Text>
                    
                </View>
            )}

            <Text style={{
                color: theme.WHITE,
                fontSize: 25,
            }}>
                {title}
            </Text>
            <Text style={{
                marginTop: 5,

                color: theme.WHITE,
                opacity: 0.8,
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
        </Pressable>
    )
}

export default function Subscription({
    bottomSheetModalRef
}: {
    bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>,
}) {

    const snapPoints = useMemo(() => ['65%'], []);

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
                backgroundColor: theme.BLACK,
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

                        fontFamily: "Palatino-Bold"
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
                        </Text>
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
                        <Option title={'Månedligt'} subtitle={'1 mdr. varighed\nFornyes automatisk!'} sku={"com.tandhjulet.lectioplus.premium_monthly"} price={'9,99'} />
 
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
                        <Option title={'Årligt'} subtitle={'1 års varighed\nFornyes automatisk!'} price={'59,99'} sku={"com.tandhjulet.lectioplus.premium_yearly"} recommended />
                    </View>
                </View>
            </View>
        </BottomSheetModal>
    )
}