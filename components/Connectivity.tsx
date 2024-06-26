import NetInfo, { NetInfoStateType, useNetInfo } from "@react-native-community/netinfo";
import UIError from "./UIError";
import { useCallback, useEffect, useState } from "react";


export default function Connectivity() {
    const { isConnected } = useNetInfo();

    const [show, setShow] = useState<boolean>(false);
    const showUIError = useCallback(() => {
        if(show) return;
        setShow(!show);
    }, [show]);

    useEffect(() => {
        !isConnected && showUIError();
    }, [isConnected])

    return {
        isConnected,
        noConnectionUIError: <UIError details={[
            "Du har ingen internetforbindelse! Lectimate kræver en internetforbindelse for at tilgå Lectio, dog kan du fortsat se gemte informationer!",
        ]} deps={[show]} setDep={[setShow]} />,
        showUIError,
    }
}