import { fetch as FetchNet } from "@react-native-community/netinfo";
import { getUnsecure, saveUnsecure, secureGet, secureSave } from "../modules/api/helpers/Storage";
import { SCRAPE_URLS } from "../modules/api/scraper/Helpers";
import { getProfile } from "../modules/api/scraper/Scraper";
import { parseQR } from "../modules/api/qr/QRCode";

export interface ValidationResponse {
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

    // if a problem occurs dont finish the transaction
    // as the subscription probably wont be persisted.
    if(res.status != 200) return false;

    const json = await res.json();
    return (json.code === "OK");
}

export async function hasSubscription(): Promise<ValidationResponse> {
    const saved: ValidationResponse = await getUnsecure("subscription");
    saved && saved.endDate && (saved.endDate = new Date(saved.endDate))
    if(!(await FetchNet()).isConnected) {
        return saved ? saved : {valid: false};
    }

    const profile = await getProfile();
    const { gymNummer } = await secureGet("gym")

    let qrUrl = await parseQR(profile, gymNummer);
    qrUrl && (qrUrl = qrUrl.split("QrId=")[1])

    const body = JSON.stringify({
        "name": profile.name,
        "gym": gymNummer,
        "id": profile.elevId,
        qrUrl,
    }).trim();
    
    const res: Response = await fetch(SCRAPE_URLS().LECTIMATE_GET, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: body,
    })

    if(res.status != 200) {
        return saved ? saved : {valid: false}
    };

    const json: ValidationResponse = await res.json();
    await saveUnsecure("subscription", json)

    json.endDate && (json.endDate = new Date(json.endDate))

    return json;
}