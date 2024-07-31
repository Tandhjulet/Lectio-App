// @ts-ignore
import DomSelector from 'react-native-dom-parser';

import { Day, Week, scrapeSchema } from './SkemaScraper';
import { Fag, Registration, scapeRegistration, scrapeAbsence } from './AbsenceScraper';

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LectioMessage, ThreadMessage, scrapeMessage, scrapeMessages } from './MessageScraper';
import { secureGet, saveUnsecure } from '../Authentication';
import { Hold, holdScraper, scrapeHoldListe } from './hold/HoldScraper';
import { HEADERS, SCRAPE_URLS, getASPHeaders, parseASPHeaders } from './Helpers';
import { Opgave, OpgaveDetails, scrapeOpgave, scrapeOpgaver } from './OpgaveScraper';
import { Key, Result, fetchWithCache, getSaved, saveFetch } from '../storage/Storage';
import { Timespan } from '../storage/Timespan';
import { CacheParams, scrapePeople, stringifyCacheParams } from './cache/CacheScraper';
import { Person } from './class/ClassPictureScraper';
import treat, { _treat, treatRaw } from './TextTreater';
import { Grade, parseGrades } from './GradeScraper';
import { Folder, parseDocuments, parseFolders, Document } from './DocumentScraper';
import { Book, parseBooks } from './BookScraper';
import { Lokale, scrapeLokaler } from './LokaleScraper';

export async function scrapeCache(gymNummer: string, params: CacheParams): Promise<{[id: string]: Person}> {
    const url = SCRAPE_URLS(gymNummer).CACHE + (params == undefined ? "" : ("?" + stringifyCacheParams(params)));

    const res = await fetch(url, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();
    const people = scrapePeople(text)

    return people;
}

export async function getIfCachedOrDefault<V>(key: Key, identifier: string = ""): Promise<V | null> {
    const saved = await getSaved(key, identifier);
    if(saved.valid)
        return saved.value;

    return null;
}

export async function scrapeHold(holdId: string, gymNummer: string, bypassCache: boolean = false) {
    const profile = await getProfile();
    const isOwnHold = !profile.hold.every((hold) => hold.holdId !== holdId);

    if(!bypassCache && isOwnHold) {
        const saved = await getSaved(Key.HOLD_MEMBERS, holdId);
        if(saved.valid && saved.value != null) {
            return saved.value;
        }
    }

    const res = await fetch(SCRAPE_URLS(gymNummer, holdId).HOLD, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    const hold = await holdScraper(parser);
    if(hold != null && isOwnHold)
        await saveFetch(Key.HOLD_MEMBERS, hold, Timespan.DAY, holdId);

    return hold;
}

export async function scrapeFolders(gymNummer: string, elevId: string, folderId: string, cb: (data: Folder[] | undefined | null) => Promise<void> | void, bypassCache: boolean = false): Promise<Folder[] | null | undefined> {
    const req = new Request(SCRAPE_URLS(gymNummer, elevId, folderId).DOCUMENTS, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache(req, Key.FOLDERS, folderId, Timespan.WEEK, cb, parseFolders, bypassCache)
}

export async function scrapeDocuments(gymNummer: string, elevId: string, folderId: string, cb: (data: Document[] | undefined | null) => Promise<void> | void, bypassCache: boolean = false): Promise<Document[] | null | undefined> {
    const req = new Request(SCRAPE_URLS(gymNummer, elevId, folderId).DOCUMENTS, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache(req, Key.DOCUMENTS, folderId, Timespan.WEEK, cb, parseDocuments, bypassCache)
}

export async function scrapeGrades(gymNummer: string, elevId: string, cb: (data: Grade[] | undefined | null) => Promise<void> | void, bypassCache: boolean = false): Promise<Grade[] | null | undefined> {
    const req = new Request(SCRAPE_URLS(gymNummer, elevId).GRADES, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache(req, Key.GRADES, undefined, -1, cb, parseGrades, bypassCache)
}

export interface Studiekort {
    name: string,
    birthdate: string,
    school: string,

    pictureurl: string,
    qrcodeurl: string,
}

function tryScrape(pred: () => string) {
    try {
        return pred();
    } catch {
        return "?";
    }
}

export async function scrapeStudiekort(gymNummer: string): Promise<Studiekort> {
    const res = await fetch(SCRAPE_URLS(gymNummer).STUDIEKORT, {
        method: "GET",
        credentials: "include",
        headers: {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, defalte, br, zstd",
            "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Pragma": "no-cache",
            "Priority": "u=0,i",
            "Sec-Ch-Ua": `"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"`,
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": "Windows",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        }
    });


    const parser = await treat(res);

    const birthdate = tryScrape(() => parser.getElementById("s_m_Content_Content_StudentBirthday").firstChild.text.replace("Fødselsdag: ", "").replace(/ \(.*$/, ""));
    const pictureurl = tryScrape(() => parser.getElementById("s_m_Content_Content_StudPic").attributes.src);
    const name = tryScrape(() => parser.getElementById("s_m_Content_Content_StudentName").firstChild.text);
    const school = tryScrape(() => parser.getElementById("s_m_Content_Content_SchoolName").firstChild.text);

    return {
        name,
        school,
        birthdate,
        pictureurl,
        qrcodeurl: SCRAPE_URLS(gymNummer, profile.elevId).QR_CODE_URL,
    };
}

export async function getSchools(bypassCache: boolean = false): Promise<{[id: string]: string;}> {
    const saved = await getSaved(Key.SCHOOLS);
    if(!bypassCache && saved.valid && saved.value != null) {
        return saved.value;
    }

    const res = await fetch(SCRAPE_URLS().GYM_LIST, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    const unparsedGyms = parser.getElementsByTagName("a")

    const parsedGyms: { [id: string] : string } = {}
    unparsedGyms.forEach((element: any) => {
        const href: string = element.attributes.href;
        const text: string = element.children[0].text;
        if(text == "Vis alle skoler")
            return;

        parsedGyms[text] = href.replace(/\D/g, "")
    });
    
    if(unparsedGyms.length > 0)
        await saveFetch(Key.SCHOOLS, parsedGyms, Timespan.DAY * 7);
    
    return parsedGyms;
}

export async function fetchProfile(forside?: string): Promise<Profile> {
    let ERROR = false;

    let gym: {gymName: string, gymNummer: string} | null = await secureGet("gym");
    if(gym == null)
        gym = { gymName: "", gymNummer: "" }
    
    const authFetch = await getSaved(Key.FORSIDE);
    let text;

    if(forside) {
        text = forside;
    } else {
        if(!authFetch.valid || authFetch.value == null) {
            const res = await fetch(SCRAPE_URLS(gym.gymNummer).FORSIDE, {
                method: "GET",
                credentials: 'include',
                headers: {
                    "User-Agent": "Mozilla/5.0",
                },
            })
            text = await res.text();
        } else {
            text = authFetch.value.body;
        }
    }

    const parser = await treatRaw(text);

    let elevID = parser.getElementsByName("msapplication-starturl")[0];
    if(elevID != null && "attributes" in elevID)
        elevID = elevID.attributes.content
    else {
        console.warn("Rate limited!")
        elevID = "";
    }
    if(elevID == "/lectio/" + gym.gymNummer + "/default.aspx") {
        ERROR = true;
        elevID = "";
    }

    let realName = parser.getElementById("s_m_HeaderContent_MainTitle");
    if(realName == null) {
        realName = "";
        ERROR = true;
    } else {
       realName = realName.firstChild.firstChild.text.split(", ")[0].replace("Eleven ", "").replace("Læreren ", "");
    }

    if(ERROR)
        console.warn("getProfile called without login.")

    return {
        name: realName,

        elevId: elevID.split("?")[1].replace(/\D/gm, ""),
    
        notifications: {
            aflysteLektioner: false,
            ændredeLektioner: false,
            beskeder: false,
        },

        hold: await scrapeHoldListe(parser),
    }
}

export type Profile = {
    name: string,
    
    elevId: string,

    notifications: {
        aflysteLektioner: boolean,
        ændredeLektioner: boolean,
        beskeder: boolean,
    }

    hold: Hold[],
}

// this is so stupid, but it's the only way to get metro to stfu.

export let profile: Profile;

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
    await SecureStore.setItemAsync("profile", stringifiedValue);
}

export async function hasProfileSaved() {
    const profileFetchDate = await _getUnsecure("lastScrapeProfile");
    if(profileFetchDate != null && ((new Date().valueOf() - profileFetchDate.date) < Timespan.DAY)) {
        const prof = await SecureStore.getItemAsync("profile");
        if(prof != null) {
            return true;
        }
    }
    return false;
}

export async function getProfile(): Promise<Profile> {
    if(profile != null) {
        return profile;
    }

    const profileFetchDate = await _getUnsecure("lastScrapeProfile");
    if(profileFetchDate != null && ((new Date().valueOf() - profileFetchDate.date) < Timespan.DAY)) {

        const savedProfile: string | null = await SecureStore.getItemAsync("profile");
        if(savedProfile != null) {
            const prof: Profile = JSON.parse(savedProfile);

            profile = prof;
            return prof;
        }
    }

    // first login or maybe memory cleared. let's make a new profile and save it.

    profile = await fetchProfile();
    saveProfile(profile);
    await saveUnsecure("lastScrapeProfile", { date: (new Date()).valueOf() })

    return profile;
}

// end of stupidity.

export async function getSkema(gymNummer: string, date: Date, cb: (data: Week | undefined | null) => Promise<void> | void, person?: Person): Promise<Week | null | undefined> {
    const id = person?.personId;
    const url = SCRAPE_URLS(gymNummer).SKEMA + (id !== undefined ? `?${person?.type === "ELEV" ? "elevid" : "laererid"}=`+id+"&" : "?") + `week=${getWeekNumber(date).toString().padStart(2, "0")}${date.getFullYear()}`;

    const req = new Request(url, {
        method: "GET",
        credentials: 'include',
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": `https://www.lectio.dk/lectio/${gymNummer}/SkemaNy.aspx`,
            "Sec-Ch-Ua": `"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"`,
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": `"Windows"`,
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "samxce-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        },
    });

    return await fetchWithCache(req, Key.SKEMA, getWeekNumber(date).toString(), Timespan.WEEK * 2, cb, scrapeSchema, !!person, !person)
}

export async function getMessage(gymNummer: string, messageId: string, headers: {}, bypassCache: boolean = false, cb: (data: ThreadMessage[] | undefined | null) => Promise<void> | void): Promise<ThreadMessage[] | null | void> {
    const payload: {[id: string]: string} = {
        ...headers,

        "__EVENTTARGET": "__Page",
        "__EVENTARGUMENT": "$LB2$_MC_$_"+messageId,
        "s$m$ChooseTerm$term": new Date().getFullYear().toString(),
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

    const req = new Request(SCRAPE_URLS(gymNummer, messageId).S_MESSAGE, {
        method: "POST",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: stringifiedData,
    });

    return await fetchWithCache<ThreadMessage[]>(req, Key.S_BESKED, messageId, Timespan.DAY, cb, scrapeMessage, bypassCache)
}

export async function getMessages(gymNummer: string, mappeId: number = -70, bypassCache: boolean = false, cb: (data: { messages: LectioMessage[] | null, headers: {[id: string]: string}} | undefined | null) => Promise<void> | void): Promise<{ messages: LectioMessage[] | null, headers: {[id: string]: string}} | null | undefined> {
    const req = new Request(SCRAPE_URLS(gymNummer, mappeId.toString()).MESSAGES, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache<{ messages: LectioMessage[] | null, headers: {[id: string]: string}}>(req, Key.BESKEDER, mappeId.toString(), -1, cb, async (parser: DomSelector) => {
        const ASPHeaders = parser.getElementsByClassName("aspNetHidden");
        let headers: {[id: string]: string} = {};
        ASPHeaders.forEach((header: any) => {
            headers = {...headers, ...parseASPHeaders(header)};
        })
    
        const messages = await scrapeMessages(parser);
        return {
            messages: messages,
            headers: headers
        };
    }, bypassCache)

}

export async function getAflevering(gymNummer: string, id: string, bypassCache: boolean = false, cb: (data: {opgaveDetails: OpgaveDetails, headers: {[id: string]: string}} | undefined | null) => Promise<void> | void): Promise<{opgaveDetails: OpgaveDetails, headers: {[id: string]: string}} | null | undefined> {
    const profile = await getProfile();
    const req = new Request(SCRAPE_URLS(gymNummer, profile.elevId, id).S_OPGAVE, {
        method: "GET",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache<{opgaveDetails: OpgaveDetails, headers: {[id: string]: string}}>(req, Key.S_AFLEVERING, id, Timespan.DAY * 3, cb, async (parser: DomSelector) => {
        const ASPHeaders = parser.getElementsByClassName("aspNetHidden");
        let headers: {[id: string]: string} = {};
        ASPHeaders.forEach((header: any) => {
            headers = {...headers, ...parseASPHeaders(header)};
        })
    
        const messages = await scrapeOpgave(parser);
        return {
            opgaveDetails: messages,
            headers: headers
        };
    }, bypassCache)
}

export async function getAfleveringer(gymNummer: string, bypassCache: boolean = false, cb: (data: Opgave[] | undefined | null | null) => Promise<void> | void): Promise<Opgave[] | null | undefined> {
    // const payload: {[id: string]: string} = {
    //     ...(await getASPHeaders(SCRAPE_URLS(gymNummer).OPGAVER)),

    //     "__EVENTTARGET": "s$m$Content$Content$ShowThisTermOnlyCB",
    //     "masterfootervalue": "X1!ÆØÅ",
    //     "s$m$ChooseTerm$term": "2023",
    //     "s$m$searchinputfield": "",
    //     "s$m$Content$Content$ShowHoldElementDD": "",
    //     "LectioPostbackId": "",
    // }

    // delete payload["s$m$Content$Content$CurrentExerciseFilterCB"]
    // delete payload["s$m$Content$Content$ShowThisTermOnlyCB"]
    
    // const parsedData = [];
    // for (const key in payload) {
    //     parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    // }
    // const stringifiedData = parsedData.join("&");

    const req = new Request(SCRAPE_URLS(gymNummer).OPGAVER, {
        method: "GET", // "POST",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        //body: stringifiedData,
    });

    return await fetchWithCache<Opgave[]>(req, Key.AFLEVERINGER, undefined, -1, cb, scrapeOpgaver, bypassCache)
}

export async function getAbsence(gymNummer: string, bypassCache: boolean = false, cb: (data: Fag[] | undefined | null) => Promise<void> | void): Promise<Fag[] | null | undefined> {
    const req = new Request(SCRAPE_URLS(gymNummer).ABSENCE, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache<Fag[]>(req, Key.FRAVÆR, undefined, -1, cb, scrapeAbsence, bypassCache)
}

export async function getLokaler(gymNummer: string, bypassCache: boolean = false, cb: (data: Lokale[] | undefined | null) => Promise<void> | void): Promise<Lokale[] | undefined | null> { 
    const req = new Request(SCRAPE_URLS(gymNummer).LOKALER, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache<Lokale[]>(req, Key.LOKALER, undefined, -1, cb, scrapeLokaler, bypassCache)
}

export async function getAbsenceRegistration(gymNummer: string, bypassCache: boolean = false, cb: (data: Registration[] | undefined | null) => Promise<void> | void): Promise<Registration[] | undefined | null> { 
    const req = new Request(SCRAPE_URLS(gymNummer).ABSENCE_REGISTRATION, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache<Registration[]>(req, Key.REGISTRATION, undefined, -1, cb, scapeRegistration, bypassCache)
}

export async function scrapeBooks(gymNummer: string, elevID: string, cb: (data: Book[] | undefined | null) => void | Promise<void>) {
    const req = new Request(SCRAPE_URLS(gymNummer, elevID).BOOKS, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    return await fetchWithCache<Book[]>(req, Key.BOOKS, undefined, -1, cb, parseBooks)
}

export function getWeekNumber(d: any): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));

    const yearStart: any = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo: any = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);

    return weekNo;
}