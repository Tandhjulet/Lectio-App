import { replaceHTMLEntities } from "./SkemaScraper";

export enum STATUS {
    AFLEVERET,
    IKKE_AFLEVERET,
    VENTER,
}

export type Opgave = {
    date: string,
    time: number,
    title: string,
    status: STATUS,
    team: string,
    absence: string,

    id: string,
}

export type OpgaveDetails = {
    note?: string,
    ansvarlig?: string,
    karakterSkala?: string,
}

function parseDate(date: string): Date {
    const today = new Date();

    today.setFullYear(parseInt(date.split("-")[1].split(" ")[0]), parseInt(date.split("/")[1].split("-")[0])-1, parseInt(date.split("/")[0]))
    today.setHours(parseInt(date.split(" ")[1].split(":")[0]))
    today.setMinutes(parseInt(date.split(" ")[1].split(":")[1]))

    return today;
}

export async function scrapeSpecificOpgave(parser: any) {
    return null;
}

const scrapeOpgaveDetails = (data: any) => {
    let out: string = "";

    data.lastChild.children.forEach((child: any) => {
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

    const table = tableWrapper.children;

    const out: {
        ansvarlig?: string,
        note?: string,
        karakterSkala?: string,
    } = {}

    try {
        table.forEach((child: any) => {
            if(child.firstChild.firstChild.text == "Ansvarlig:") {
                out.ansvarlig = replaceHTMLEntities(scrapeOpgaveDetails(child));
            } else if(child.firstChild.firstChild.text == "Karakterskala:") {
                out.karakterSkala = replaceHTMLEntities(scrapeOpgaveDetails(child));
            } else if(child.firstChild.firstChild.text == "Opgavenote:") {
                out.note = replaceHTMLEntities(scrapeOpgaveDetails(child));
            }
        })
    } catch {
    }

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
            absence = absence.firstChild.text.replace("&nbsp;", " ");
        else
            absence = "0 %";
        
        out.push({
            absence: absence,
            date: parseDate(date).toString(),
            status: STATUS[status as keyof typeof STATUS],
            team: team,
            time: time,
            title: title,

            id: id,
        })
    })

    return out;
}