import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SCRAPE_URLS, getASPHeaders } from './scraper/Scraper';

async function getValueFor(key: string) {
  const res = await SecureStore.getItemAsync(key);
  return res;
}

export async function validate(gymNummer: string, username: string, password: string): Promise<boolean> {
    const payload: {[id: string]: string} = {
        ...(await getASPHeaders(gymNummer)),

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
    })
    return !res.url.includes("login.aspx?prevurl")
}

export async function authorize(): Promise<boolean> {
    const gym: { gymName: string, gymNummer: string } = await getUnsecure("gym");

    //if(await _isAuthorized(gym.gymNummer)) {
    //    return true;
    //}

    // det her gør åbenbart så man ikke kan logge ind umiddelbart efter
    // flot lavet

    const pswd = await getValueFor("password");
    const username = await getValueFor("username");

    if(gym == null || pswd == null || username == null) {
        return false;
    }
    
    return validate(gym.gymNummer, username, pswd);
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

export async function getUnsecure(key: string) {
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