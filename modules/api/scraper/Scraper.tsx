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
import { modulRegnskabScraper, Modulregnskab } from './hold/ModulRegnskabScraper';
import { Key, Result, getSaved, saveFetch } from '../storage/Storage';
import { Timespan } from '../storage/Timespan';
import { CacheParams, scrapePeople, stringifyCacheParams } from './cache/CacheScraper';
import { Person } from './class/ClassPictureScraper';
import treat, { _treat, treatRaw } from './TextTreater';
import { Grade, parseGrades } from './GradeScraper';
import { Folder, parseDocuments, parseFolders, Document } from './DocumentScraper';
import { parseBooks } from './BookScraper';

export async function scrapeCache(gymNummer: string, params?: CacheParams): Promise<Person[]> {
    const saved = await getSaved(Key.CACHE_PEOPLE);
    if(saved.valid && saved.value != null) {
        return saved.value;
    }

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

    await saveFetch(Key.CACHE_PEOPLE, people, Timespan.HOUR * 3, params == undefined ? "" : ("?" + stringifyCacheParams(params)));

    return people;
}

export async function getIfCachedOrDefault<V>(key: Key, identifier: string = ""): Promise<V | null> {
    const saved = await getSaved(key, identifier);
    if(saved.valid)
        return saved.value;

    return null;
}

export async function scrapeHold(holdId: string, gymNummer: string, bypassCache: boolean = false) {
    if(!bypassCache) {
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
    if(hold != null)
        await saveFetch(Key.HOLD_MEMBERS, hold, Timespan.DAY, holdId);

    return hold;
}

export async function scrapeFolders(gymNummer: string, elevId: string, folderId: string, bypassCache: boolean = false): Promise<Folder[]> {
    const res = await fetch(SCRAPE_URLS(gymNummer, elevId, folderId).DOCUMENTS, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });
    const parser = await treat(res);
    const folders = parseFolders(parser);

    return folders;
}

export async function scrapeDocuments(gymNummer: string, elevId: string, folderId: string, bypassCache: boolean = false): Promise<Document[]> {
    const res = await fetch(SCRAPE_URLS(gymNummer, elevId, folderId).DOCUMENTS, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();

    const parser = await treatRaw(text);
    const documents = parseDocuments(parser);

    return documents;
}

export async function scrapeGrades(gymNummer: string, elevId: string, bypassCache: boolean = false): Promise<Grade[]> {
    if(!bypassCache) {
        const saved = await getSaved(Key.GRADES);
        if(saved.valid && saved.value != null) {
            return saved.value;
        }
    }

    const res = await fetch(SCRAPE_URLS(gymNummer, elevId).GRADES, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    const grades = parseGrades(parser);

    if(grades != null)
        await saveFetch(Key.GRADES, grades, -1);

    return grades;
}

export async function scrapeModulRegnskab(gymNummer: string, holdId: string, bypassCache: boolean = false): Promise<Modulregnskab | null> {
    if(!bypassCache) {
        const saved = await getSaved(Key.MODULREGNSKAB, holdId);
        if(saved.valid && saved.value != null) {
            return saved.value;
        }
    }

    const res = await fetch(SCRAPE_URLS(gymNummer, holdId).MODUL_REGNSKAB, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    const hold = await modulRegnskabScraper(parser);

    if(hold != null)
        await saveFetch(Key.MODULREGNSKAB, hold, -1, holdId);
    
    return hold;
}

export async function getSchools(): Promise<{[id: string]: string;}> {
    const saved = await getSaved(Key.SCHOOLS);
    if(saved.valid && saved.value != null) {
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

    await saveFetch(Key.SCHOOLS, parsedGyms, Timespan.DAY * 7);
    return parsedGyms;
}

export async function fetchProfile(): Promise<Profile> {
    let ERROR = false;

    let gym: {gymName: string, gymNummer: string} | null = await secureGet("gym");
    if(gym == null)
        gym = { gymName: "", gymNummer: "" }
    
    const authFetch = await getSaved(Key.FORSIDE);
    let text;

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
    await SecureStore.setItemAsync("profile", stringifiedValue);
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

export async function getSkema(gymNummer: string, date: Date): Promise<{ payload: Week | null, rateLimited: boolean }> {
    const res = await fetch(SCRAPE_URLS(gymNummer).SKEMA + `?week=${getWeekNumber(date).toString().padStart(2, "0")}${date.getFullYear()}`, {
        method: "GET",
        credentials: 'include',
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": `https://www.lectio.dk/lectio/${gymNummer}/SkemaNy.aspx}`,
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

    const text = _treat(await res.text());
    const parser = DomSelector(text);

    const skema: Week | null = scrapeSchema(parser, text);

    if(skema != null)
        await saveFetch(Key.SKEMA, skema, Timespan.HOUR, getWeekNumber(date).toString());

    return {
        payload: skema,
        rateLimited: isRateLimited(parser),
    };
}

export async function getMessage(gymNummer: string, messageId: string, headers: {}, bypassCache: boolean = false): Promise<ThreadMessage[] | null> {
    if(!bypassCache) {
        const saved = await getSaved(Key.S_BESKED, messageId);
        if(saved.valid && saved.value != null) {
            return saved.value;
        }    
    }
    
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

    const res = await fetch(SCRAPE_URLS(gymNummer, messageId).S_MESSAGE, {
        method: "POST",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: stringifiedData,
    });

    const parser = await treat(res);
    const messageBody = await scrapeMessage(parser);
    
    if( messageBody != null)
        await saveFetch(Key.S_BESKED, messageBody, Timespan.HOUR * 6, messageId)

    return messageBody;
}

export async function getMessages(gymNummer: string, mappeId: number = -70, bypassCache: boolean = false): Promise<{ payload: { messages: LectioMessage[] | null, headers: {[id: string]: string}}, rateLimited: boolean }> {
    if(!bypassCache) {
        const saved = await getSaved(Key.BESKEDER, mappeId.toString());
        if(saved.valid && saved.value != null) {
            return {
                payload: saved.value,
                rateLimited: false,
            };
        }
    }


    const res = await fetch(SCRAPE_URLS(gymNummer, undefined, undefined, undefined, mappeId).MESSAGES, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    
    const ASPHeaders = parser.getElementsByClassName("aspNetHidden");
    let headers: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        headers = {...headers, ...parseASPHeaders(header)};
    })

    const messages = await scrapeMessages(parser);

    if(messages != null && headers != null)
        await saveFetch(Key.BESKEDER, {
            messages: messages,
            headers: headers
        }, Timespan.MINUTE * 5, mappeId.toString())

    return {
        payload: {
            messages: messages,
            headers: headers
        },
        rateLimited: isRateLimited(parser),
    };
}

export async function getAflevering(gymNummer: string, id: string, bypassCache: boolean = false): Promise<OpgaveDetails | null> {
    if(!bypassCache) {
        const saved = await getSaved(Key.S_AFLEVERING, id);
        if(saved.valid && saved.value != null) {
            return saved.value;
        }
    }

    const profile = await getProfile();

    const res = await fetch(SCRAPE_URLS(gymNummer, profile.elevId, id).S_OPGAVE, {
        method: "GET",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    const opgaver = await scrapeOpgave(parser);

    if(opgaver != null)
        await saveFetch(Key.S_AFLEVERING, opgaver, Timespan.HOUR * 6, id)

    return opgaver;
}

export async function getAfleveringer(gymNummer: string, bypassCache: boolean = false): Promise<{ payload: Opgave[] | null, rateLimited: boolean }> {
    if(!bypassCache) {
        const saved = await getSaved(Key.AFLEVERINGER);
        if(saved.valid && saved.value != null) {
            return {
                payload: saved.value,
                rateLimited: false,
            };
        }
    }

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

    const parser = await treat(res);
    const opgaver = scrapeOpgaver(parser);

    if(opgaver != null)
        await saveFetch(Key.AFLEVERINGER, opgaver, Timespan.MINUTE * 5)

    return {
        payload: opgaver,
        rateLimited: isRateLimited(parser),
    };
}

export async function getAbsence(gymNummer: string, bypassCache: boolean = false): Promise<{ payload: Fag[] | null, rateLimited: boolean}> {
    if(!bypassCache) {
        const saved = await getSaved(Key.FRAVÆR);
        if(saved.valid && saved.value != null) {
            return {
                payload: saved.value,
                rateLimited: false,
            };
        }   
    }

    const res = await fetch(SCRAPE_URLS(gymNummer).ABSENCE, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    const absence = scrapeAbsence(parser);

    if(absence != null)
        await saveFetch(Key.FRAVÆR, absence, Timespan.HOUR)

    return {
        payload: absence,
        rateLimited: isRateLimited(parser),
    };
}

export async function getAbsenceRegistration(gymNummer: string, bypassCache: boolean = false): Promise<Registration[] | null> { 
    if(!bypassCache) {
        const saved = await getSaved(Key.REGISTRATION);
        if(saved.valid && saved.value != null) {
            return saved.value;
        }   
    }

    const res = await fetch(SCRAPE_URLS(gymNummer).ABSENCE_REGISTRATION, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    const registration = scapeRegistration(parser);

    if(registration.length > 0) {
        await saveFetch(Key.REGISTRATION, registration, Timespan.HOUR)
    }

    return registration
}

export async function scrapeBooks(gymNummer: string, elevID: string) {
    const res = await fetch(SCRAPE_URLS(gymNummer, elevID).BOOKS, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const parser = await treat(res);
    const books = parseBooks(parser);

    return books;
}

export function getWeekNumber(d: any): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));

    const yearStart: any = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo: any = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);

    return weekNo;
}

export function isRateLimited(parser: any): boolean {
    try {
        const text = parser.getElementsByClassName("content-container")[0].firstChild.firstChild.firstChild.text;
        return text.includes("403 - Forbidden");
    } catch(e) {
        return false;
    }
}