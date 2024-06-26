import { saveUnsecure, secureGet, secureSave } from "../modules/api/Authentication";
import { SCRAPE_URLS } from "../modules/api/scraper/Helpers";
import { getProfile } from "../modules/api/scraper/Scraper";

interface ValidationResponse {
    valid: boolean | null,
    endDate?: Date,
    productId?: string,
    freeTrial?: boolean,
}


export default async function receiptValid(receipt: string): Promise<boolean> {
    const profile = await getProfile();
    const { gymNummer } = await secureGet("gym")

    const body = JSON.stringify({
        "receipt": receipt,
        "name": profile.name,
        "gym": gymNummer,
        "id": profile.elevId,
    }).trim();

    const res: Response = await fetch(SCRAPE_URLS().LECTIMATE_SAVE_RECEIPT, {
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

    await saveUnsecure("subscriptionEndDate", {date: json.endDate});
    
    return true;
}

export async function hasSubscription(save: boolean = true): Promise<ValidationResponse> {
    const profile = await getProfile();
    const { gymNummer } = await secureGet("gym")

    const body = JSON.stringify({
        "name": profile.name,
        "gym": gymNummer,
        "id": profile.elevId,
    }).trim();
    
    const res: Response = await fetch(SCRAPE_URLS().LECTIMATE_GET, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: body,
    })

    if(res.status != 200) return {
        valid: null,
    };

    const json: ValidationResponse = await res.json();
    if(save)
        await saveUnsecure("subscriptionEndDate", {date: json.endDate})

    json.endDate && (json.endDate = new Date(json.endDate))

    return json;
}