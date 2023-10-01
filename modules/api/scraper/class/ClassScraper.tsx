// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import { getUnsecure, saveUnsecure } from "../../Authentication"
import { SCRAPE_URLS, getASPHeaders } from "../Scraper"

export type Klasse = {
    name: string,
    classId: string,
}

export async function getClasses(): Promise<Klasse[] | null> {
    const classes: Klasse[] = await getUnsecure("classes");
    if(classes != null)
        return classes;

    const gym: { gymName: string, gymNummer: string } =  await getUnsecure("gym")

    const payload: {[id: string]: string} = {
        ...(await getASPHeaders(SCRAPE_URLS(gym.gymNummer).CLASS_LIST)),

        "masterfootervalue": "X1!ÆØÅ",
        "LectioPostbackId": "",
        "__EVENTTARGET": "m$Content$AktuelAndAfdelingCB$ShowOnlyAktulleCB",
        "m$ChooseTerm$term": "2023",
    }

    delete payload["m$Content$AktuelAndAfdelingCB$ShowOnlyCurrentShoolAfdelingCB"]
    delete payload["m$Content$AktuelAndAfdelingCB$ShowOnlyAktulleCB"]

    const parsedData = [];
    for (const key in payload) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }
    const stringifiedData = parsedData.join("&");

    const text = (await (await fetch(SCRAPE_URLS(gym.gymNummer).CLASS_LIST, {
        method: "POST",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: stringifiedData,
    })).text())

    const parser = DomSelector(text);
    const wrapper = parser.getElementById("m_Content_listecontainer");
    if(wrapper == null)
        // not logged in.
        return null;

    const out: Klasse[] = []

    wrapper.firstChild.children.forEach((pElement: any) => {
        pElement.children.forEach((aElement: any) => {
            out.push({
                name: aElement.firstChild.text,
                classId: getClassIdFromHref(aElement.attributes.href),
            })
        })
    })


    await saveUnsecure("classes", out)
    return out;
}

function getClassIdFromHref(href: string): string {
    const matches = href.match(new RegExp('klasseid=(\\d+)', "gm"));
    if(matches == null)
        return "";

    const id = matches[0].replace("klasseid=", "");
    return id;
}