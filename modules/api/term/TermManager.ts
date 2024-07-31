import { getASPHeaders, parseASPHeaders, SCRAPE_URLS } from "../scraper/Helpers";
import treat from "../scraper/TextTreater";

export default async function selectTerm(gymNummer: string) {
    const selector = await treat(await fetch(SCRAPE_URLS(gymNummer).HOVEDMENU, {
        method: "GET",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        },
    }));

    const terms = selector.getElementById("m_ChooseTerm_term");
    if(terms == null) {
        console.warn("Couldn't find term.")
        return;
    }

    let currentYear: number = new Date().getFullYear();
    let maxTerm: number | undefined = undefined;

    for(let option of terms.children) {
        console.log(option.text);
        try {
            const termValue = parseInt(option.attributes.value);
            if(termValue == currentYear) {
                // we found a fitting term
                maxTerm = currentYear;
                break;
            } else if(termValue+1 == currentYear) {
                // maybe there is something better
                maxTerm = currentYear;
            }
        } catch {
            console.log("Couldn't find value of term")
        }
    }

    if(!maxTerm) {
        return;
    }

    const ASPHeaders = selector.getElementsByClassName("aspNetHidden");

    let headers: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        headers = {...headers, ...parseASPHeaders(header)};
    })

    headers = {
        ...headers, 
        "__EVENTTARGET": "m$ChooseTerm$term",
        "__EVENTARGUMENT": "",
        "m$ChooseTerm$term": maxTerm.toString(),
        "LectioPostbackId": "",
        "masterfootervalue": "X1!ÆØÅ"
    }

    const parsedData = [];
    for (const key in headers) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(headers[key]));
    }

    const stringifiedData = parsedData.join("&");

    await fetch(SCRAPE_URLS(gymNummer).HOVEDMENU, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "da-DK,da;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6",
            "Cache-Control": "no-cache",
            "Origin": "https://www.lectio.dk",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
            "Priority": "u=0, i",
            "Referer": `https://www.lectio.dk/lectio/${gymNummer}/default.aspx`,
            "Sec-Ch-Ua": `"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"`,
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": `"Windows"`,
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        },
        body: stringifiedData
    })
}