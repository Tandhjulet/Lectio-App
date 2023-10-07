// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import { Day, scrapeSchema } from './SkemaScraper';
import { Fag, scrapeAbsence } from './AbsenceScraper';

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LectioMessage, LectioMessageDetailed, scrapeMessage, scrapeMessages } from './MessageScraper';
import { extractDataFromTable } from './class/ClassPictureScraper';
import { getPeople } from './class/PeopleList';
import { saveUnsecure } from '../Authentication';
import { Hold, holdScraper, scrapeHoldListe } from './hold/HoldScraper';
import { SCRAPE_URLS, getASPHeaders, parseASPHeaders } from './Helpers';
import { Opgave, OpgaveDetails, scrapeOpgave, scrapeOpgaver } from './OpgaveScraper';

export async function scrapeHold(holdId: string, gymNummer: string) {
    const res = await fetch(SCRAPE_URLS(gymNummer, holdId).HOLD, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();
    const parser = DomSelector(text);

    const hold = holdScraper(parser);

    return hold;
}

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

export async function fetchProfile(): Promise<Profile> {
    let gym: {gymName: string, gymNummer: string} | null = await _getUnsecure("gym");
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
        },

        hold: await scrapeHoldListe(parser),
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

    hold: Hold[],
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

    const profileFetchDate = await _getUnsecure("lastScrapeProfile");
    if(profileFetchDate != null && ((new Date().valueOf() - profileFetchDate.date) < 604800000)) { // 7 dage 

        const savedProfile = await _getUnsecure("profile");
        if(savedProfile != null) {
            profile = savedProfile;
            return savedProfile;
        }
    }

    // first login or maybe memory cleared. let's make a new profile and save it.

    profile = await fetchProfile();
    saveProfile(profile);
    await saveUnsecure("lastScrapeProfile", { date: (new Date()).valueOf() })

    return profile;
}

// end of stupidity.

export async function getSkema(gymNummer: string, date: Date): Promise<{ payload: Day[] | null, rateLimited: boolean }> {
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

    return {
        payload: skema,
        rateLimited: isRateLimited(parser),
    };
}

export async function getMessage(gymNummer: string, messageId: string, headers: {}): Promise<LectioMessageDetailed | null> {
    const payload: {[id: string]: string} = {
        ...headers,

        "__EVENTTARGET": "__Page",
        "__EVENTARGUMENT": "$LB2$_MC_$_"+messageId,
        "s$m$ChooseTerm$term": "2023",
        "s$m$searchinputfield": "",
        "s$m$Content$Content$ListGridSelectionTree$folders": "-70",
        "s$m$Content$Content$SPSearchText$tb": "",
        "s$m$Content$Content$MarkChkDD": "-1",
        "masterfootervalue": "X1!ÆØÅ",
        "LectioPostbackId": "",
    }

    const parsedData = [];
    for (const key in payload) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }
    const stringifiedData = parsedData.join("&");

    const profile: Profile = await getProfile();

    const res = await fetch(SCRAPE_URLS(gymNummer, profile.elevId).S_MESSAGE, {
        method: "POST",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: stringifiedData,
    });

    const text = await res.text();

    const parser = DomSelector(text);
    const messageBody = scrapeMessage(parser);

    return messageBody;
}

export async function getMessages(gymNummer: string): Promise<{ payload: { messages: LectioMessage[] | null, headers: {[id: string]: string}}, rateLimited: boolean }> {
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
    
    const ASPHeaders = parser.getElementsByClassName("aspNetHidden");
    let headers: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        headers = {...headers, ...parseASPHeaders(header)};
    })

    const messages = await scrapeMessages(parser);

    return {
        payload: {
            messages: messages,
            headers: headers
        },
        rateLimited: isRateLimited(parser),
    };
}

export async function getAflevering(gymNummer: string, id: string): Promise<OpgaveDetails | null> {
    const profile = await getProfile();

    const res = await fetch(SCRAPE_URLS(gymNummer, profile.elevId, id).S_OPGAVE, {
        method: "GET",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();

    const parser = DomSelector(text);
    const opgaver = scrapeOpgave(parser);

    return opgaver;
}

export async function getAfleveringer(gymNummer: string): Promise<{ payload: Opgave[] | null, rateLimited: boolean }> {
    const payload: {[id: string]: string} = {
        ...(await getASPHeaders(SCRAPE_URLS(gymNummer).OPGAVER)),

        "__EVENTTARGET": "s$m$Content$Content$ShowThisTermOnlyCB",
        "masterfootervalue": "X1!ÆØÅ",
        "s$m$ChooseTerm$term": "2023",
        "s$m$searchinputfield": "",
        "s$m$Content$Content$ShowHoldElementDD": "",
        "LectioPostbackId": "",
    }

    delete payload["s$m$Content$Content$CurrentExerciseFilterCB"]
    delete payload["s$m$Content$Content$ShowThisTermOnlyCB"]
    
    const parsedData = [];
    for (const key in payload) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }
    const stringifiedData = parsedData.join("&");

    const res = await fetch(SCRAPE_URLS(gymNummer).OPGAVER, {
        method: "POST",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: stringifiedData,
    });

    const text = await res.text();

    const parser = DomSelector(text);
    const opgaver = scrapeOpgaver(parser);

    return {
        payload: opgaver,
        rateLimited: isRateLimited(parser),
    };
}

export async function getAbsence(gymNummer: string): Promise<{ payload: Fag[] | null, rateLimited: boolean}> {
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

    return {
        payload: absence,
        rateLimited: isRateLimited(parser),
    };
}

export function getWeekNumber(d: any): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));

    const yearStart: any = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo: any = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);

    return weekNo;
}

export function isRateLimited(parser: DomSelector): boolean {
    try {
        const text = parser.getElementsByClassName("content-container")[0].firstChild.firstChild.firstChild.text;
        return text.includes("403 - Forbidden");
    } catch(e) {
        return false;
    }
}