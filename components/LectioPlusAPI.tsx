import { saveUnsecure, secureGet, secureSave } from "../modules/api/Authentication";
import { SCRAPE_URLS } from "../modules/api/scraper/Helpers";
import { getProfile } from "../modules/api/scraper/Scraper";

export default async function receiptValid(receipt: string): Promise<boolean> {
    const profile = await getProfile();

    const body = JSON.stringify({
        "receipt": receipt,
        "name": profile.name,
        "id": profile.elevId,
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
    if(json.code !== "OK") return false;

    await secureSave("userId", json.userId);
    await saveUnsecure("subscriptionEndDate", {date: json.endDate});
    
    return true;
}

export async function hasSubscription(save: boolean = true): Promise<{result: boolean | null, endDate: Date | null}> {
    const userId = await secureGet("userId");
    if(!userId) return {
        result: false,
        endDate: null,
    };

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

    if(res.status != 200) return {
        result: null,
        endDate: null,
    };;

    const json = await res.json();
    if(save)
        await saveUnsecure("subscriptionEndDate", {date: json.endDate})

    return {
        result: json.valid,
        endDate: new Date(json.endDate),
    }
}