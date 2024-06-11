// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SignInPayload } from '../../App';
import { SCRAPE_URLS, getASPHeaders } from './scraper/Helpers';
import { Key, saveFetch } from './storage/Storage';
import { treatRaw } from './scraper/TextTreater';
import { scrapeHoldListe } from './scraper/hold/HoldScraper';

/**
 * @param key the key of the item
 * @returns the object fetched from secure storage
 */
export async function secureGet(key: string) {
    const stringifiedValue = await SecureStore.getItemAsync(key);
    if(stringifiedValue == null)
        return null;
    
    try {
        return JSON.parse(stringifiedValue);
    } catch {
        return stringifiedValue;
    }
}

/**
 * Validates a login request with the given details
 * @param gymNummer 
 * @param username 
 * @param password 
 * @returns a boolean value indicating whether the request succeded or not
 */
export async function validate(gymNummer: string, username: string, password: string): Promise<boolean> {
    const payload: {[id: string]: string} = {
        ...(await getASPHeaders(SCRAPE_URLS(gymNummer).LOGIN_URL)),

        "__EVENTTARGET": "m$Content$submitbtn2",
        "m$Content$username": username,
        "m$Content$password": password,
        "masterfootervalue": "X1!ÆØÅ",
        "LectioPostbackId": "",
    }
    
    const parsedData = [];
    for (const key in payload) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }
    const stringifiedData = parsedData.join("&");

    await fetch(SCRAPE_URLS(gymNummer).LOGIN_URL, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
            "Cache-Control": "no-cache",
            "Origin": "https://www.lectio.dk",
            "Pragma": "no-cache",
            "Referer": `https://www.lectio.dk/lectio/${gymNummer}/login.aspx`,
            "Sec-Ch-Ua": `"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"`,
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": `"Windows"`,
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        },
        body: stringifiedData,
    });

    const res2 = await fetch(SCRAPE_URLS(gymNummer).FORSIDE, {
        method: "POST",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        },
        body: stringifiedData,
    });
    const isAuth = (res2.url == SCRAPE_URLS(gymNummer).FORSIDE);

    if(isAuth) {
        const body = await res2.text()

        await _fetchProfile(body, gymNummer)
        await saveFetch(Key.FORSIDE, {
            body: body,
        }, -1)
    }

    return isAuth;
}

async function _fetchProfile(text: string, gymNummer: string) {
    try {
        const parser = await treatRaw(text);

        let elevID = parser.getElementsByName("msapplication-starturl")[0];
        if(elevID != null && "attributes" in elevID) {
            elevID = elevID.attributes.content;
        } else {
            console.warn("Rate limited!")
            elevID = "";
        }
        if(elevID == "/lectio/" + gymNummer + "/default.aspx") {
            elevID = "";
        }

        let realName = parser.getElementById("s_m_HeaderContent_MainTitle");
        if(realName == null) {
            realName = "";
        } else {
            realName = realName.firstChild.firstChild.text.split(", ")[0].replace("Eleven ", "").replace("Læreren ", "");
        }

        const profile = {
            name: realName,

            elevId: elevID.split("?")[1].replace(/\D/gm, ""),
        
            notifications: {
                aflysteLektioner: false,
                ændredeLektioner: false,
                beskeder: false,
            },

            hold: await scrapeHoldListe(parser),
        };

        const stringifiedValue = JSON.stringify(profile);
        await SecureStore.setItemAsync("profile", stringifiedValue);
        await saveUnsecure("lastScrapeProfile", { date: (new Date()).valueOf() })
    } catch(err) {
        console.warn(err)
    }
}

/**
 * Tries to authorize the user with the given credentials
 * @param {SignInPayload} credentials Sign In Payload
 * @returns true if success, otherwise false
 */
export async function authorize({ gym, password, username }: SignInPayload): Promise<boolean> {
    if(gym == null || password == null || username == null) {
        return false;
    }
    
    return await validate(gym.gymNummer, username, password);
}

/**
 * Securely saves a K,V pair in secure store
 * @param key 
 * @param value 
 */
export async function secureSave(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
}

/**
 * Securely removes a K,V pair from secure store
 * @param key 
 */
export async function removeSecure(key: string) {
    await SecureStore.deleteItemAsync(key);
}

/**
 * Removes a K,V pair from async storage
 * @param key 
 */
export async function removeUnsecure(key: string) {
    await AsyncStorage.removeItem(key);
}

/**
 * Saves a K,V pair unsecurely (other apps can access this data)
 * @param key 
 * @param value 
 */
export async function saveUnsecure(key: string, value: object) {
    const stringifiedValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, stringifiedValue);
}

/**
 * Gets an unsecure value from async storage
 * @param key 
 * @returns 
 */
export async function getUnsecure(key: string): Promise<any> {
    const stringifiedValue = await AsyncStorage.getItem(key);
    if(stringifiedValue == null)
        return null;
    return JSON.parse(stringifiedValue);
}

/**
 * Sign out of lectio
 */
export async function signOutReq() {
    return await fetch(SCRAPE_URLS().LOG_UD, {
        method: "GET",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    })
}