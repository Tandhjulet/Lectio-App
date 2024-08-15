import AsyncStorage from "@react-native-async-storage/async-storage";
import { Timespan } from "./Timespan";
import BeskedView from "../../../pages/beskeder/BeskedView";
import treat, { _treat } from "../scraper/TextTreater";

// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import { fetch as fetchNetInfo } from "@react-native-community/netinfo";

export function isRateLimited(parser: any): boolean {
    try {
        const text = parser.getElementsByClassName("content-container")[0].firstChild.firstChild.firstChild.text;
        return text.includes("403 - Forbidden");
    } catch(e) {
        return false;
    }
}

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

    HOLD_MEMBERS,

    REGISTRATION,
    GRADES,

    BOOKS,

    DOCUMENTS,
    FOLDERS,

    LOKALER,
}

export type SaveStructure = {
    value: object,
    invalidAfter: number,
}

export type Result = {
    value: any | null,
    valid: boolean,
}

/**
 * Saves/caches a HTTP response so that it can be shown whilst waiting the next time the user requests the same data.
 * @param key identifier for each page that needs caching
 * @param value the HTTP response
 * @param timespan timespan for when the fetch should expire and be deleted, or -1 if it should never be deleted automatically
 * @param identifier unique identifier, used by pages such as {@link BeskedView} to be able to save more than one message at a time.
 */
export async function saveFetch(key: Key, value: object, timespan: number = -1, identifier: string = "") {
    const fullKey: string = Key[key] + "-" + identifier;

    const toSave: SaveStructure = {
        value: value,
        invalidAfter: timespan == -1 ? -1 : Math.max(0, timespan) + new Date().valueOf(),
    }

    const stringifiedValue = JSON.stringify(toSave);
    await AsyncStorage.setItem(fullKey, stringifiedValue);
}

/**
 * Deletes a saved fetch using the given identifiers
 * @param key 
 * @param identifier 
 */
export async function deleteSaved(key: Key, identifier: string = "") {
    const fullKey: string = Key[key] + "-" + identifier;
    await AsyncStorage.removeItem(fullKey)
}

/**
 * Removes any Responses that have expired
 */
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

/**
 * 
 * @param key identifier for the page
 * @param identifier unique identifier
 * @returns an object containing the {@link Result}
 * @see {@link Result}
 */
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
            value: item.value,
        };
    }

    return {
        valid: true,
        value: item.value,
    }
}

export async function fetchWithCache<T>(req: Request, key: Key, identifier: string = "", timespan: number, cb: (data: T | undefined | null) => Promise<void> | void, parsingFunc: Function, bypassCache: boolean = false, cache: boolean = true): Promise<T | undefined | null> { 
    let cachedValue;
    if(!bypassCache) {
        const cached = await getSaved(key, identifier);
        if((cachedValue = cached.value)) { // doesn't need to be before expiration date.
                           // will be updated in a few seconds anyway
            await cb(cachedValue)
        }
    }

    const { isConnected } = await fetchNetInfo();
    if(isConnected) {
        const response = await fetch(req);
        const rawText = await response.text();
        // if(key === Key.S_MODUL)
        //     console.log(rawText);
        const text = _treat(rawText);
        const parser = DomSelector(text);
    
        const args = key == Key.SKEMA ? [parser, text] : [parser];
        const result = await parsingFunc.apply(null, args);
        const notRateLimited = !(isRateLimited(parser));
        await cb(notRateLimited ? result : undefined);
    
        (notRateLimited && result && cache) && (await saveFetch(key, result, timespan, identifier));   
        return notRateLimited ? result : undefined;
    } else {
        await cb(cachedValue ?? null);
    }

    return null;
}