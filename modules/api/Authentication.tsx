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
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: stringifiedData,
    });

    // test if logged in

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
            "User-Agent": "Mozilla/5.0",
        },
    });

    const isAuth = !res.url.includes("login.aspx?prevurl");

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