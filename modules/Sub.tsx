import { createContext } from "react";

export type SubState = {
    type: "SUBSCRIBED" | "NOT_SUBSCRIBED" | "SERVER_DOWN",
}

export const SubscriptionContext = createContext<{ subscriptionState: unknown; dispatchSubscription: any; }>({
    dispatchSubscription: (action: {type: SubState}) => {},
    subscriptionState: null,
});