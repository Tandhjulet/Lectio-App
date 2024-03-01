import { saveUnsecure, secureGet, secureSave } from "../modules/api/Authentication";
import { SCRAPE_URLS } from "../modules/api/scraper/Helpers";
import { getProfile } from "../modules/api/scraper/Scraper";

export default async function receiptValid(receipt: string): Promise<boolean> {
    const id = await secureGet("userId");

    const body = JSON.stringify(id ? {
        "receipt": receipt,
        "userId": id,
    } : {
        "receipt": receipt,
    }).trim();

    const res: Response = await fetch(SCRAPE_URLS().LECTIOPLUS_SAVE_RECEIPT, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: body,
    })

    if(res.status != 200) return false;
    // if problem occurs dont finish the transaction
    // as the subscription probably wont be persisted.

    const json = await res.json();

    if(!id && json.code === "OK") {
        await secureSave("userId", json.userId);
    }
    return json.code === "OK";
}

export async function hasSubscription(): Promise<boolean> {
    const userId = await secureGet("userId");
    if(!userId) return false;

    const body = JSON.stringify({
        "userId": userId,
    }).trim();
    
    const res: Response = await fetch(SCRAPE_URLS().LECTIOPLUS_GET, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: body,
    })

    if(res.status != 200) return true;
    // if the server is down/slow make the user
    // have a subscription to avoid complaints.

    return (await res.json()).valid;
}

// NOT IMPLEMENTED ON SERVER YET (WIP)
export async function tryFreeTrial(): Promise <boolean> {
    const userId = await secureGet("userId");
    if(userId) return false;
    
    const profile = await getProfile();
    const gym = (await secureGet("gym")).gymNummer;

    const body = JSON.stringify({
        "name": profile.name,
        "elevId": profile.elevId,
        "gym": gym,
    }).trim();

    const res: Response = await fetch(SCRAPE_URLS().LECTIOPLUS_FREE_TRIAL, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: body,
    })

    if(res.status != 200) return false;
    // if the server is down, the user
    // cannot receive a free trial

    const json = await res.json();
    if(json.code === "OK") { // a free trial has been provided to the user
        await secureSave("userId", json.userId);
        return true;
    }

    return false;
}