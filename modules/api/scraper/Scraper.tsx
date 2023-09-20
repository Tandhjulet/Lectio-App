// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import { Day, scrapeSchema } from './SkemaScraper';
import { Fag, scrapeAbsence } from './AbsenceScraper';

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from 'react-hook-form';
import { LectioMessage, scrapeMessages } from './MessageScraper';


export function SCRAPE_URLS(gymNummer?: String, elevId?: string, selectedFolder: number = -70) {
    const _URLS = {
        "GYM_LIST": "https://www.lectio.dk/lectio/login_list.aspx?forcemobile=1",
        "LOGIN_URL": `https://www.lectio.dk/lectio/${gymNummer}/login.aspx`,
        "FORSIDE": `https://www.lectio.dk/lectio/${gymNummer}/forside.aspx`,
        "SKEMA": `https://www.lectio.dk/lectio/${gymNummer}/SkemaNy.aspx`,
        "LOG_UD": "https://www.lectio.dk/lectio/572/logout.aspx",
        "ABSENCE": "https://www.lectio.dk/lectio/572/subnav/fravaerelev.aspx",
        "MESSAGES": `https://www.lectio.dk/lectio/572/beskeder2.aspx?type=&elevid=${elevId}&selectedfolderid=${selectedFolder}`,
    } as const;

    return _URLS;
};

export async function getSchools(): Promise<{[id: string]: string;}> {

    const text = await (await fetch(SCRAPE_URLS().GYM_LIST, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    })).text();

    const parser = DomSelector(text);
    const unparsedGyms = parser.getElementsByTagName("a")

    const parsedGyms: { [id: string] : string } = {}
    unparsedGyms.forEach((element: any) => {
        const href: string = element.attributes.href;
        const text: string = element.children[0].text;
        if(text == "Vis alle skoler")
            return;

        parsedGyms[text] = href.replace(/\D/g, "")
    });

    return parsedGyms;
}

function parseASPHeaders(ASPHeader: any) {
    const parsedHeaders: any = {};
    ASPHeader.children.forEach((i: any) => {
        parsedHeaders[i.attributes.name] = i.attributes.value;
    });
    return parsedHeaders;
}

export async function getASPHeaders(gymNummer: string): Promise<{[id: string]: string}> {
    const text = await (await fetch(SCRAPE_URLS(gymNummer).LOGIN_URL, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    })).text();

    const parser = DomSelector(text);
    const ASPHeaders = parser.getElementsByClassName("aspNetHidden");

    let headers: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        headers = {...headers, ...parseASPHeaders(header)};
    })

    return headers;
}

export async function fetchProfile(): Promise<Profile> {
    let gym: {gymName: string, gymNummer: string} = await _getUnsecure("gym");
    if(gym == null)
        gym = { gymName: "", gymNummer: "" }
    
    let username = await getUsername();
    if(username == null)
        username = "";

    const res = await fetch(SCRAPE_URLS(gym.gymNummer).FORSIDE, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    })
    const text = await res.text();
    const parser = DomSelector(text);

    let elevID = parser.getElementsByName("msapplication-starturl")[0];
    if(elevID != null && "attributes" in elevID)
        elevID = elevID.attributes.content
    else {
        console.warn("Rate limited!")
        elevID = "";
    }
    if(elevID == "/lectio/" + gym.gymNummer + "/default.aspx") {
        console.warn("getElevID called without login.")
        elevID = "";
    }

    let realName = parser.getElementById("s_m_HeaderContent_MainTitle");
    if(realName == null) {
        realName = "";
        console.warn("getProfile called with no login!");
    }
    realName = realName.firstChild.firstChild.text.split(", ")[0].replace("Eleven ", "");

    return {
        name: realName,
        username: username,

        elevId: elevID.split("?")[1].replace(/\D/gm, ""),
    
        school: gym.gymName,
    
        notifications: {
            aflysteLektioner: true,
            ændredeLektioner: true,
            beskeder: true,
        }
    }
}

export type Profile = {
    name: string,
    username: string,
    
    elevId: string,
    school: string,

    notifications: {
        aflysteLektioner: boolean,
        ændredeLektioner: boolean,
        beskeder: boolean,
    }
}

// this is so stupid, but it's the only way to get metro to stfu.

let profile: Profile;

async function _getUnsecure(key: string) {
    const stringifiedValue = await AsyncStorage.getItem(key);
    if(stringifiedValue == null)
        return null;
    return JSON.parse(stringifiedValue);
}

export async function saveProfile(newProfile: Profile) {
    if(newProfile == null)
        return;
    //profile = newProfile;

    const stringifiedValue = JSON.stringify(newProfile);
    await AsyncStorage.setItem("profile", stringifiedValue);
}

async function getUsername() {
    const res = await SecureStore.getItemAsync("username");
    return res;
}

export async function getProfile(): Promise<Profile> {
    if(profile != null) {
        return profile;
    }

    const savedProfile = await _getUnsecure("profile");
    if(savedProfile != null) {
        profile = savedProfile;
        return savedProfile;
    }

    // first login or maybe memory cleared. let's make a new profile and save it.

    profile = await fetchProfile();
    saveProfile(profile);

    return profile;
}

// end of stupidity.

export async function getSkema(gymNummer: string, date: Date): Promise<Day[] | null> {
    const profile: Profile = await getProfile();
    
    const res = await fetch(SCRAPE_URLS(gymNummer).SKEMA + `?type=elev&elevid=${profile.elevId}&week=${getWeekNumber(date).toString().padStart(2, "0")}${date.getFullYear()}`, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();

    const parser = DomSelector(text);
    const skema: Day[] | null = scrapeSchema(parser);

    return skema;
}

export async function getMessages(gymNummer: string): Promise<LectioMessage[] | null> {
    const profile: Profile = await getProfile();

    const res = await fetch(SCRAPE_URLS(gymNummer, profile.elevId).MESSAGES, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();

    const parser = DomSelector(text);
    const messages = scrapeMessages(parser);

    return messages;
}


export async function getAbsence(gymNummer: string): Promise<Fag[]> {
    const res = await fetch(SCRAPE_URLS(gymNummer).ABSENCE, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();

    const parser = DomSelector(text);
    const absence = scrapeAbsence(parser);

    return absence;
}

export function getWeekNumber(d: any): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));

    const yearStart: any = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo: any = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);

    return weekNo;
}
