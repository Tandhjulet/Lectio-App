// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import { getUnsecure } from "../../Authentication"
import { SCRAPE_URLS, getASPHeaders } from '../Helpers';

export type Person = {
    type: "LÆRER" | "ELEV"
    navn: string,
    billedeId: string,
    klasse: string,
}

export async function scrapeStudentPictures(classId: string, className: string) {
    const gym: { gymName: string, gymNummer: string } =  await getUnsecure("gym")

    const payload: {[id: string]: string} = {
        ...(await getASPHeaders(SCRAPE_URLS(gym.gymNummer, undefined, classId).CLASS)),

        "masterfootervalue": "X1!ÆØÅ",
        "LectioPostbackId": "",
        "__EVENTTARGET": "s$m$Content$Content$IsPrintingHiResPicturesCB",
        "s$m$Content$Content$IsPrintingHiResPicturesCB": "on",
        "s$m$ChooseTerm$term": "2023",
    }

    const parsedData = [];
    for (const key in payload) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }
    const stringifiedData = parsedData.join("&");

    const text = (await (await fetch(SCRAPE_URLS(gym.gymNummer).CLASS, {
        method: "POST",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: stringifiedData,
    })).text())

    const parser = DomSelector(text);
    const table = parser.getElementById("s_m_Content_Content_laerereleverpanel_alm_gv");
    if(table == null)
        // not logged in.
        return null;

    const out = await extractDataFromTable(table, className);

    return out;
}

export async function extractDataFromTable(table: any, className: string): Promise<{ [id: string]: Person }> {
    const out: { [id: string]: Person } = {};

    table.children.forEach((trElement: any, index: number) => {
        if(index == 0)
            return;

        const url = trElement.children[0].firstChild.attributes.src;
        const matches = url.match(new RegExp('GetImage\\.aspx\\?pictureid=(\\d+)', "gm"));
        if(matches == null)
            return null;

        const id = matches[0].replace("GetImage.aspx?pictureid=", "");

        const type: "ELEV" | "LÆRER" = trElement.children[1].firstChild.text.toUpperCase();

        const fornavn = trElement.children[3].firstChild.firstChild.firstChild.text;
        const efternavn = trElement.children[4].firstChild.firstChild.text;
        const navn = fornavn + " " + efternavn;

        out[navn] = {
            billedeId: id,
            navn: navn,
            type: type,
            klasse: className,
        };
    })

    return out;
}