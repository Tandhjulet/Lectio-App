// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import { secureGet, getUnsecure } from "../../helpers/Storage"
import { SCRAPE_URLS, getASPHeaders } from '../Helpers';
import { replaceHTMLEntities } from '../SkemaScraper';
import { treatRaw } from '../TextTreater';

export type Person = {
    type: "LÆRER" | "ELEV"
    navn: string,
    rawName: string,

    billedeId?: string,
    personId?: string,
    klasse?: string,
}

export async function scrapeStudentPictures(classId: string, className: string, gym: {gym: string, gymNummer: string}) {
    const text = (await (await fetch(SCRAPE_URLS(gym.gymNummer, undefined, classId).CLASS, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
    })).text())

    const parser = treatRaw(text);
    const table = parser.getElementById("s_m_Content_Content_laerereleverpanel_alm_gv");
    if(table == null)
        // not logged in.
        return null;

    const out = await extractDataFromTable(table, className);

    return out;
}

export async function extractDataFromTable(table: any, className?: string): Promise<{ [id: string]: Person }> {
    const out: { [id: string]: Person } = {};

    table.children.forEach((trElement: any, index: number) => {
        try {
            if(index == 0)
                return;
    
            const url = trElement.children[0].firstChild.attributes.src;
            const matches = url.match(new RegExp('GetImage\\.aspx\\?pictureid=(\\d+)', "gm"));
    
            const id: undefined | string = matches ? matches[0].replace("GetImage.aspx?pictureid=", "") : undefined;
    
            const type: "ELEV" | "LÆRER" = trElement.children[1].firstChild.text.toUpperCase();
    
            let personId;
            const link = trElement.children[3].firstChild.firstChild.attributes.href;
    
            if(type == "ELEV") {
                const matches = link.match(new RegExp('elevid=(\\d+)', "gm"));
                personId = matches[0].replace("elevid=", "");
            } else {
                const matches = link.match(new RegExp('laererid=(\\d+)', "gm"));
                personId = matches[0].replace("laererid=", "");
            }
    
            const fornavn = replaceHTMLEntities(trElement.children[3].firstChild.firstChild.firstChild.text);
            const efternavn = replaceHTMLEntities(trElement.children[4].firstChild.firstChild.text);
            const navn = fornavn + " " + efternavn;
    
            let initials: string = className ?? "";
            let fullID;
            if(trElement.children[2].firstChild.firstChild) {
                let elevInitials: string[] = replaceHTMLEntities(trElement.children[2].firstChild.firstChild.text).split(" ")
                elevInitials.pop();
                initials = type === "LÆRER" ? replaceHTMLEntities(trElement.children[2].firstChild.firstChild.text) : (className ?? elevInitials.join(" "))

                fullID = replaceHTMLEntities(navn + " (" + initials + ")");
            }
    
            out[navn] = {
                billedeId: id,
                navn,
                rawName: fullID,
                type: type,
                personId: personId,
                klasse: initials,
            };
        } catch(err) {
            console.error(err)
        }
    })

    return out;
}