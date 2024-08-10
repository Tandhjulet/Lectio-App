import { extractDataFromTable } from "../class/ClassPictureScraper";

export type Hold = {
    holdId: string,
    holdNavn: string,
}

export async function holdScraper(parser: any) {
    const table = parser.getElementById("s_m_Content_Content_laerereleverpanel_alm_gv");
    if(table == null)
        return null;
    
    const out = await extractDataFromTable(table);
    return out;
}

export async function scrapeHoldListe(parser: any): Promise<Hold[]> {
    try {
        const out: Hold[] = [];

        const holdWrapper: any[] = parser.getElementsByClassName("entitylinklistH");

        holdWrapper[0].children.forEach((hold: any) => {
            out.push({
                holdId: hold.lastChild.attributes.href.split("&")[1].replace(/\D/gm, ""),
                holdNavn: hold.lastChild.firstChild.text,
            });
        });

        return out;
    } catch {
        return [];
    }
}