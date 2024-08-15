import { Animated, Text, View, ViewStyle, useColorScheme } from "react-native";
import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import { themes } from "../modules/Themes";

type FlyInViewProps = PropsWithChildren<{style?: ViewStyle, deps: any[], setDep: ((v: boolean) => void)[]}>;

const FlyInView: React.FC<FlyInViewProps> = props => {
    const flyAnim = useRef(new Animated.Value(-150)).current;
  
    useEffect(() => {
        if(!props.deps[0]) return;

        Animated.sequence([
            Animated.timing(flyAnim, {
                toValue: 0,
                delay: 500,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(flyAnim, {
                toValue: -150,
                delay: 2000,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start(() => {
            props.setDep.length > 0 && (
                props.setDep[0](false)
            );
        });
    }, [flyAnim, ...props.deps]);
  
    return (
      <Animated.View
        style={{
          ...props.style,
          
          transform: [{
            translateY: flyAnim,
          }],
        }}>
            {props.children}
      </Animated.View>
    );
  };

export default function UIError({ details, deps, setDep, paddingTop = 45 }: {
    details: string[],
    deps?: any[],
    setDep?: ((v: boolean) => void)[],
    paddingTop: number,
}) {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <FlyInView style={{
            zIndex: 25,

            paddingTop: paddingTop,
            paddingBottom: 10,

            width: "100%",
            position: "absolute",

            top: 0,

            backgroundColor: "#FC5353",
            paddingHorizontal: 20,
        }} deps={deps ?? []} setDep={setDep ?? []}>
            <View style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
    
                flexDirection: "column",
                gap: 10,
            }}>
                <Text style={{
                    color: theme.WHITE,
                    fontWeight: "bold",
                    fontSize: 20,
                }}>
                    Fejl!
                </Text>
                <Text
                    style={{
                        color: theme.WHITE,
                        textAlign: "center",
                    }}
                >
                    {details.join("\n")}
                </Text>
            </View>
        </FlyInView>
    )
}