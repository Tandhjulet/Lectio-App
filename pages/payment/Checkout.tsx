import { PaymentSheetError, useStripe } from '@stripe/stripe-react-native';
import { Result } from '@stripe/stripe-react-native/lib/typescript/src/types/PaymentMethod';
import { IntentCreationCallbackParams } from '@stripe/stripe-react-native/lib/typescript/src/types/PaymentSheet';
import { STRIPE_CREATE_PAYMENT_INTENT_URL, STRIPE_RETURN_URL } from '../../modules/Config';
import { useEffect, useState } from 'react';
import { Button, View } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import UIError from '../../components/UIError';

export default function Checkout({ navigation }: {
    navigation: NavigationProp<any>
}) {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const [error, setError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>();

    const initializePaymentSheet = async () => {
        const { clientSecret } = await fetchPaymentSheetParams();

        const { error } = await initPaymentSheet({
            merchantDisplayName: "Lectio Plus",
            returnURL: STRIPE_RETURN_URL,
            paymentIntentClientSecret: clientSecret,
        });
        if (error) {
            console.log("Error:")
            console.log(error)
        }
    };

    const fetchPaymentSheetParams = async () => {
        const res = await (await fetch(STRIPE_CREATE_PAYMENT_INTENT_URL, {
            method: "POST",
        })).json()

        console.log(res);

        return { clientSecret: res.body || "" }
    }

    const didTapCheckoutButton = async () => {
        const { error } = await presentPaymentSheet();
    
        if (error) {
            if (error.code !== PaymentSheetError.Canceled) {
                setError(true)
                setErrorMessage(error.localizedMessage)
            }
        } else {
            navigation.navigate("Settings")
        }
    }

    useEffect(() => {
        initializePaymentSheet();
    }, []);

    return (
        <View>
            <Button
                onPress={() => {
                    didTapCheckoutButton()
                }}
                title='check out'
            />
            {error && <UIError details={errorMessage == null ? 
                ["Der er opstået en ukendt fejl med dit køb.",
                 "Prøv venligst igen senere."]
            :
                ["Der er opstået en fejl med dit køb:",
                  errorMessage]}
            />}
        </View>
    )
}