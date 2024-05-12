import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

export default function Shake({
    shakeOn,
    deps,
    children,
    override,
    violence,
}: {
    shakeOn: () => boolean,
    deps: any[],
    children?: React.ReactNode,
    override?: () => void,
    violence?: number,
}) {
    if(!violence) violence = 1;

    let hasRendered = useRef(false);

    const value = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if(!hasRendered.current) {
            hasRendered.current = true;
            return;
        }

        if(!shakeOn()) return;
        
        if(!override) {
            value.setValue(0.1);
            Animated.timing(value,
                {
                    toValue: 1, 
                    duration: 750,
                    easing: Easing.linear,
                    useNativeDriver: true
                }
            ).start(() => {
                value.setValue(0);
            })
        } else {
            override();
        }
    }, [...deps])


    return (
        <Animated.View style={{
            transform: [{
                translateX: value.interpolate({
                    inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    outputRange: [0, 2.5 * violence, -2.5 * violence, 2.5 * violence, -2.5 * violence, 2.5 * violence, -2.5 * violence, 2.5 * violence, -2.5 * violence, 2.5 * violence, 0]
                 })
              }]
        }}>
            {children}
        </Animated.View>
    )
}