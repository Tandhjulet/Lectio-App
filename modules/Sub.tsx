import { createContext } from "react";

type Sub = {
    subscribed: () => void,
    notSubscribed: () => void,
}

export type SubState = {
    type: "SUBSCRIBED" | "NOT_SUBSCRIBED" | "FREE_TRIAL"
}

export const SubscriptionContext = createContext<Sub>({
    subscribed: () => {
        console.log("wrong auth context called.")
    },
    notSubscribed: () => {
        console.log("wrong auth context called.")
    },
  });