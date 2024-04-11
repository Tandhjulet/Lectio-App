import { createContext } from "react";

export type SubState = {
    type: "SUBSCRIBED" | "FREE_TRIAL" | "NOT_SUBSCRIBED" | "SERVER_DOWN",
}

export const SubscriptionContext = createContext<any>({
    dispatchSubscription: (action: {type: SubState}) => {},
    subscriptionState: null,
});