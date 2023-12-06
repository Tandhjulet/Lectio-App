import { URL_BACKEND_RECEIPT } from "./Config";

export async function PostPurchase(receipt: string) {
    const res = await fetch(URL_BACKEND_RECEIPT, {
        method: "POST",
        body: JSON.stringify({ receipt: receipt })
    })

    const json = await res.json();

    console.log(json);
    return true;
}