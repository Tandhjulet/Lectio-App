import { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";
import { AcademicCapIcon } from "react-native-heroicons/solid";
import { Easing } from "react-native-reanimated";
import COLORS from "../modules/Themes";

export default function Logo({
    color,
    size,
    style,
    minOpacity,
    minScale,
}: {
    color?: string,
    size?: number,
    style?: ViewStyle,
    minOpacity?: number,
    minScale?: number,
}) {
    const opacity = useRef(new Animated.Value(minOpacity ?? 0.7)).current;
    const scale = useRef(new Animated.Value(minScale ?? 0.95)).current;
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
                    toValue: minOpacity ?? 0.7,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    easing: Easing.linear,
                    toValue: minScale ?? 0.95,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]),
        ])
      ).start();
    }, [opacity, scale]);

    return (
        <Animated.View style={{
            opacity: opacity,
            transform: [{
                scale: scale,
            }],

            ...style,
        }}>
            <AcademicCapIcon size={size ?? 75} color={color ?? COLORS.WHITE} />
        </Animated.View>
    )
}