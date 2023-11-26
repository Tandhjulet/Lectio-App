import { Animated, Text, View, ViewStyle } from "react-native";
import COLORS from "../modules/Themes";
import React, { PropsWithChildren, useEffect, useRef } from "react";

type FlyInViewProps = PropsWithChildren<{style?: ViewStyle}>;

const FlyInView: React.FC<FlyInViewProps> = props => {
    const flyAnim = useRef(new Animated.Value(-150)).current;
  
    useEffect(() => {
        Animated.sequence([
            Animated.timing(flyAnim, {
                toValue: 0,
                delay: 1000,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(flyAnim, {
                toValue: -150,
                delay: 6500,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

    }, [flyAnim]);
  
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

export default function UIError({ details }: {
    details: string[]
}) {
    return (
        <FlyInView style={{
            zIndex: 25,

            paddingTop: 45,
            paddingBottom: 10,

            width: "100%",
            position: "absolute",

            top: 0,

            backgroundColor: COLORS.RED,
            paddingHorizontal: 20,
        }}>
            <View style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
    
                flexDirection: "column",
                gap: 10,
            }}>
                <Text style={{
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: 20,
                }}>
                    Fejl!
                </Text>
                <Text
                    style={{
                        color: "#fff",
                        textAlign: "center",
                    }}
                >
                    {details.join("\n")}
                </Text>
            </View>
        </FlyInView>
    )
}