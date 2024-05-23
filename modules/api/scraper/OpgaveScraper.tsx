import { Document } from "./DocumentScraper";
import { SCRAPE_URLS } from "./Helpers";
import { replaceHTMLEntities } from "./SkemaScraper";

export enum Status {
    AFLEVERET,
    MANGLER,
    VENTER,
}

export type Opgave = {
    date: string,
    time: string,
    title: string,
    status: Status, 
    team: string,
    absence: string,
    elevNote: string,

    id: string,
}

export type OpgaveDetails = {
    ansvarlig?: string,
    note?: string,
    karakterSkala?: string,
    opgaveBeskrivelse?: Document[],

    opgaveIndlæg?: Indlæg[],
    tilbagemedling?: Karakter,
}

export function parseDate(date: string): Date {
    const today = new Date();

    try {
        today.setFullYear(parseInt(date.split("-")[1].split(" ")[0]), parseInt(date.split("/")[1].split("-")[0])-1, parseInt(date.split("/")[0]))
        today.setHours(parseInt(date.split(" ")[1].split(":")[0]))
        today.setMinutes(parseInt(date.split(" ")[1].split(":")[1]))
    } catch {}

    return today;
}

const scrapeOpgaveDetails = (data: any) => {
    return scrapeText(data.lastChild.children);
}

export interface Indlæg {
    byUser: string,
    comment: string,
    document?: Document,
}

export interface Karakter {
    student: string,
    karakter: string,
    karakterNote: string,
}

function scrapeText(data: any[]) {
    let out = "";
    
    data.forEach((child: any) => {
        if(child.tagName == "span") {
            out += child.firstChild.text.trim();
        } else if(child.tagName == "br") {
            out += "\n"
        } else {
            out += child.text.trim();
        }
    })

    return out;
}

export async function scrapeOpgave(parser: any): Promise<OpgaveDetails | null> {
    const tableWrapper = parser.getElementsByClassName("ls-std-table-inputlist")[0];
    if(tableWrapper == null)
        return null;

    function scrapeDocument(documents: any[]): Document[] {
        const out: Document[] = []

        documents.forEach((document) => {
            if(document.tagName === "br") return;

            const name: string = document.lastChild.text.trim();

            out.push({
                date: (name.match(/\(.. \d{1,2}\/\d{1,2}\)$/gm) ?? [""])[0],
                fileName: name.replace(/\(.. \d{1,2}\/\d{1,2}\)$/gm, ""),
                size: "-1",
                url: SCRAPE_URLS().BASE_URL + replaceHTMLEntities(document.attributes.href),
            })
        })

        return out;
    }

    function scrapeKarakter(table: any): Karakter | undefined {
        const tryScrape: (child: string) => string = (child: any) => {
            try {
                return child.firstChild.text.trim();
            } catch {
                return "";
            }
        }

        const content = table.lastChild;
        if(table == null) return undefined;
    
        return {
            karakter: tryScrape(content.children[5]),
            karakterNote: tryScrape(content.children[6]),
            student: tryScrape(content.children[1].firstChild.firstChild),
        }
    }

    function scrapeIndlæg(table: any): Indlæg[] {
        const out: Indlæg[] = []
        if(table == null) return out;

        table.children.forEach((indlæg: any, i: number) => {
            try {
                if(i === 0) return;

                let document: Document | undefined = undefined;
                try {
                    document = {
                        date: "",
                        fileName: indlæg.children[3].firstChild.firstChild.lastChild.text,
                        size: "-1",
                        url: SCRAPE_URLS().BASE_URL + replaceHTMLEntities(indlæg.children[3].firstChild.firstChild.attributes.href),
                    }
                } catch {}

                out.push({
                    byUser: indlæg.children[1].firstChild.firstChild.text,
                    document: document,
                    comment: scrapeText(indlæg.children[2].children)
                })
            } catch {}
        })

        return out;
    }

    const table = tableWrapper.children;

    const out: {
        ansvarlig?: string,
        note?: string,
        karakterSkala?: string,
        opgaveBeskrivelse?: Document[],

        opgaveIndlæg?: Indlæg[],
        tilbagemedling?: Karakter,
    } = {}

    table.forEach((child: any) => {
        try {
            if(child.firstChild.firstChild.text == "Ansvarlig:") {
                out.ansvarlig = replaceHTMLEntities(scrapeOpgaveDetails(child));
            } else if(child.firstChild.firstChild.text == "Karakterskala:") {
                out.karakterSkala = replaceHTMLEntities(scrapeOpgaveDetails(child));
            } else if(child.firstChild.firstChild.text == "Opgavenote:") {
                out.note = replaceHTMLEntities(scrapeOpgaveDetails(child));
            } else if(child.firstChild.firstChild.text == "Opgavebeskrivelse:" || child.firstChild.firstChild.firstChild.text == "Opgavebeskrivelse:") {
                out.opgaveBeskrivelse = scrapeDocument(child.firstChild.lastChild.children);
            }
            // there seems to bug a bug in DomSelector here. this code is currently not affected,
            // but it might be in the future...
        } catch {}
    })

    const tilbagemeldingTable = parser.getElementById("m_Content_StudentGV");
    out.tilbagemedling = scrapeKarakter(tilbagemeldingTable)

    const opgaveIndlæg = parser.getElementById("m_Content_RecipientGV");
    out.opgaveIndlæg = scrapeIndlæg(opgaveIndlæg);

    return out;
}

export function scrapeOpgaver(parser: any): Opgave[] | null {
    const table = parser.getElementById("s_m_Content_Content_ExerciseGV");
    if(table == null)
        return null;

    const out: Opgave[] = [];

    table.children.forEach((child: any, index: number) => {
        if(index == 0)
            return;

        const id = child.children[2].firstChild.attributes.href.match(new RegExp("exerciseid=(\\d+)", "gm"))[0].replace("exerciseid=", "")

        const team = child.children[1].firstChild.firstChild.text;
        const title = child.children[2].firstChild.firstChild.text;
        const date = child.children[3].firstChild.text;
        const time = child.children[4].firstChild.text;

        let status = child.children[5].firstChild;
        if(status.firstChild != undefined)
            status = status.firstChild.text.toUpperCase().replace(" ", "_");
        else 
            status = status.text.toUpperCase().replace(" ", "_");

        let absence = child.children[6];
        if(absence.firstChild != undefined)
            absence = absence.firstChild.text.replaceAll("&nbsp;", "").replaceAll(" ", "");
        else
            absence = "0%";

        const elevNote = child.children[10].firstChild === undefined ? "" : scrapeText(child.children[10].children);
        
        out.push({
            absence: absence,
            date: parseDate(date).toString(),
            status: Status[status as keyof typeof Status],
            team: team,
            time: time,
            title: title,
            elevNote: elevNote,

            id: id,
        })
    })

    return out;
}