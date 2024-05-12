import { createRef, useRef } from "react";
import { ViewProps } from "react-native";
import { TextInput } from "react-native-gesture-handler";

export default function Input({
    style,
    pattern,
    onChangeText,
    onValidation,
    children,
}: {
    style: ViewProps,
    pattern: string[] | string,
    onChangeText: (arg0: string) => void,
    onValidation: (arg0: boolean) => void,
    children: React.ReactNode,
}) {
    const handleValidation = useRef((value: string) => {
        if (!pattern) return true;
        if (typeof pattern === 'string') {
          const condition = new RegExp(pattern, 'g');
          return condition.test(value);
        }
        if (typeof pattern === 'object') {
          const conditions = pattern.map(rule => new RegExp(rule, 'g'));
          return conditions.every(condition => condition.test(value));
        }
        return true;
    }).current;

    const ref = createRef<TextInput>();

    const validate = useRef(() => {
        if(!ref.current) return;

        // @ts-ignore
        const value = ref.current.state.value;
        const isValid = handleValidation(value);

        onValidation && onValidation(isValid);
    }).current;

    return (
        <TextInput
            ref={ref}
            style={style}
            onChangeText={text => onChangeText && onChangeText(text)}
            onBlur={validate}
        >
            {children}
        </TextInput>
    )
}