import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timespan } from "./Timespan";

export enum Key {
    SKEMA,
    S_MODUL,

    AFLEVERINGER,
    S_AFLEVERING,

    BESKEDER,
    S_BESKED,

    MODULREGNSKAB,

    SCHOOLS,
    FRAVÆR,

    CACHE_PEOPLE,
    FORSIDE,
}

export type SaveStructure = {
    value: object,
    invalidAfter: number,
}

export type Result = {
    value: any | null,
    valid: boolean,
}

export async function saveFetch(key: Key, value: object, timespan: number = -1, identifier: string = "") {
    const fullKey: string = Key[key] + "-" + identifier;

    const toSave: SaveStructure = {
        value: value,
        invalidAfter: timespan == -1 ? -1 : Math.max(0, timespan) + new Date().valueOf(),
    }

    const stringifiedValue = JSON.stringify(toSave);
    await AsyncStorage.setItem(fullKey, stringifiedValue);
}

export async function deleteSaved(key: Key, identifier: string = "") {
    const fullKey: string = Key[key] + "-" + identifier;
    await AsyncStorage.removeItem(fullKey)
}

export async function cleanUp() {
    const lastCall = await AsyncStorage.getItem("lastCleanUp");
    
    if(lastCall != null && new Date().valueOf() < (JSON.parse(lastCall)).invalidAfter) {
        return;
    }

    const keys = await AsyncStorage.getAllKeys();
    const filteredKeys: string[] = [];
    keys.forEach((key) => {
        Object.keys(Key).forEach((s) => {
            if(key.startsWith(s))
                filteredKeys.push(key);
        })
    })

    const values = await AsyncStorage.multiGet(filteredKeys);
    values.forEach(async (kv) => {
        if(kv[1] == null)
            return;

        const obj: SaveStructure = JSON.parse(kv[1])
        if(obj.invalidAfter != -1 && new Date().valueOf() > obj.invalidAfter)
            await AsyncStorage.removeItem(kv[0]);
    })

    await AsyncStorage.setItem("lastCleanUp", JSON.stringify({
        invalidAfter: new Date().valueOf() + Timespan.HOUR * 12,
    }));
}

export async function getSaved(key: Key, identifier: string = ""): Promise<Result> {
    const fullKey: string = Key[key] + "-" + identifier;

    const stringified = await AsyncStorage.getItem(fullKey);
    const item: SaveStructure | null = stringified == null ? null : JSON.parse(stringified);

    if(item == null)
        return {
            valid: false,
            value: null,
        };


    if(item.invalidAfter != -1 && new Date().valueOf() > item.invalidAfter) {
        await deleteSaved(key, identifier);
        return {
            valid: false,
            value: null,
        };
    }

    return {
        valid: true,
        value: item.value,
    }
}