// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SignInPayload } from '../../App';
import { SCRAPE_URLS, getASPHeaders } from './scraper/Helpers';
import { Key, saveFetch } from './storage/Storage';
import { abort } from './scraper/class/PeopleList';

export async function secureGet(key: string) {
  const res = await SecureStore.getItemAsync(key);
  return res;
}

export async function validate(gymNummer: string, username: string, password: string): Promise<boolean> {
    console.log("validate called, sending request...")

    const payload: {[id: string]: string} = {
        ...(await getASPHeaders(SCRAPE_URLS(gymNummer).LOGIN_URL)),

        "__EVENTTARGET": "m$Content$submitbtn2",
        "m$Content$username": username,
        "m$Content$password": password,
        "m$Content$AutologinCbx": "off",
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
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
            "Cache-Control": "no-cache",
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

    // tests if log in was successful
    return await _isAuthorized(gymNummer);
}

export async function isAuthorized() {
    const gym: { gymName: string, gymNummer: string } = await getUnsecure("gym");

    return _isAuthorized(gym.gymNummer);
}

export async function _isAuthorized(gymNummer: string) {
    
    const res = await fetch(SCRAPE_URLS(gymNummer).FORSIDE, {
        method: "GET",
        credentials: 'include',
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
            "Cache-Control": "no-cache",
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
    });

    if(res.status == 303) {
        console.log("status: 303")
        return _isAuthorized(gymNummer);
    }

    const isAuth = (res.url == SCRAPE_URLS(gymNummer).FORSIDE);
    if(isAuth) {
        await saveFetch(Key.FORSIDE, {
            body: await res.text(),
        })
    }

    console.log("validation process finished.\nresult: " + isAuth)

    return isAuth;
}

export async function authorize({ gym, password, username }: SignInPayload): Promise<boolean> {
    console.log("authorize called!")

    if(gym == null || password == null || username == null) {
        return false;
    }
    
    return await validate(gym.gymNummer, username, password);
}

export async function secureSave(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
}

export async function removeSecure(key: string) {
    await SecureStore.deleteItemAsync(key);
}

export async function removeUnsecure(key: string) {
    await AsyncStorage.removeItem(key);
}

export async function saveUnsecure(key: string, value: object) {
    const stringifiedValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, stringifiedValue);
}

export async function getUnsecure(key: string): Promise<any> {
    const stringifiedValue = await AsyncStorage.getItem(key);
    if(stringifiedValue == null)
        return null;
    return JSON.parse(stringifiedValue);
}

export async function signOut() {
    fetch(SCRAPE_URLS().LOG_UD, {
        method: "GET",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    })
}