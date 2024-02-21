import { getASPHeaders } from "./Helpers";
import { scrapeHelper } from "./MessageScraper";
import { parseInfoString, replaceHTMLEntities } from "./SkemaScraper";

export function scrapeAbsence(parser: any): Fag[] | null {
    const table = parser.getElementById("s_m_Content_Content_SFTabStudentAbsenceDataTable");
    if(table == null)
        return null;

    const tableData = table.children;

    const out: Fag[] = []

    tableData.forEach((child: any, index: number) => {
        if(child.attributes["id"] == undefined && index != tableData.length - 1) {
            out.push(scrapeAbsenceRow(child));
        }
    })

    return out;
}

export enum AbsenceType {
    SKRIFTLIGT,
    ALMINDELIGT,
}

export enum AbsenceReason {
    ANDET,
    KOM_FOR_SENT,
    SKOLERELATERET,
    PRIVATE_FORHOLD,
    SYGDOM,
}

export namespace AbsenceReason {
    export function toString(absenceReason: AbsenceReason | any): string {
        const str = AbsenceReason[absenceReason].replaceAll("_", " ");
        return str[0] + str.slice(1).toLowerCase()
    }
}

export type AbsenceRegistration = {
    reason: AbsenceReason,
    comment?: string,
}

export type Fag = {
    skriftligt: ModuleAbsence,
    almindeligt: ModuleAbsence,
}

export type ModuleAbsence = {
    team: string,
    settled: number
    yearly: number
    absent: number,
    type: AbsenceType,
}

function scrapeAbsenceRow(row: any): Fag {
    const team: string = row.firstChild.firstChild.firstChild.text;

    const scaffOld = (absenceType: AbsenceType): ModuleAbsence => {
        return ({
            team: team,
            settled: 0,
            yearly: 0,
            absent: 0,
            type: absenceType,
        })
    }

    const almindeligt: ModuleAbsence = scaffOld(AbsenceType.ALMINDELIGT);
    const skriftligt: ModuleAbsence = scaffOld(AbsenceType.SKRIFTLIGT);

    row.children.forEach((child: any, index: number) => {
        if(index == 0 || index % 2 != 0)
            return;

        const data = scrapeCell(child)
        if(index <= 4) {
            if(index == 2) 
                almindeligt.settled = data.total, almindeligt.absent = data.absent;
            else if (index == 4) 
                almindeligt.yearly = data.total, almindeligt.absent = data.absent;
        } else {
            if(index == 6) 
                skriftligt.settled = data.total, skriftligt.absent = data.absent;
            else if (index == 8) 
                skriftligt.yearly = data.total, skriftligt.absent = data.absent;
        }
    })

    return {
        almindeligt: almindeligt,
        skriftligt: skriftligt,
    }
}

function scrapeCell(cell: any): {
    total: number,
    absent: number,
} {
    if(cell.firstChild == undefined) {
        return {
            absent: 0,
            total: 0,
        }
    }

    const data: string[] = cell.firstChild.text.split("/");

    return {
        absent: parseFloat(data[0].replace(",", ".")),
        total: parseFloat(data[1].replace(",", ".")),
    };
}

// -- REGISTRATION --


export type Registration = {
    studentProvidedReason: boolean,
    studentNote?: string,
    teacherNote?: string,

    modulStartTime: string,

    modul: string,

    registered: string,
    registeredTime: string,

    absence: string,

    url?: string,
}

export async function postRegistration(reg: AbsenceRegistration, url: string, gymNummer: string) {
    if(url == "" || gymNummer == "") return;

    url = replaceHTMLEntities(url);

    if(!url.startsWith("/")) url = "/" + url;
    url = "https://www.lectio.dk" + url;

    const reason = AbsenceReason.toString(reg.reason);


    const headers: {[id: string]: string}  = {
        ...(await getASPHeaders(url)),

        "__EVENTTARGET": "s$m$Content$Content$savecancelapplyBtn$svbtn",

        "s$m$Content$Content$StudentReasonDD$dd": reason.toLowerCase() == "skolerelateret" ? "Skolerelaterede aktiviteter" : reason,
        "s$m$Content$Content$cancelStudentNote$tb": reg.comment || "",
        "masterfootervalue": "X1!ÆØÅ",
        "LectioPostbackId": "",
    }

    const parsedData = [];
    for (const key in headers) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(headers[key]));
    }
    const stringifiedData = parsedData.join("&");

    await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: stringifiedData,
    });
}


export function scapeRegistration(parser: any): Registration[] {
    const tables = parser.getElementsByClassName("ls-table-layout1");

    if(tables == null)
        return [];

    const out: Registration[] = [];

    tables.forEach((table: any, j: number) => {
        table.children.forEach((absence: any, i: number) => {

            if(i == 0) return;

            let timeSpan: Date | undefined;
            const regExpTimespan = absence.children[1].firstChild.text.match(new RegExp('\\d{2}:\\d{2}', "gm"));

            if(regExpTimespan != null) {
                const start = new Date();
                start.setHours(parseInt(regExpTimespan[0].split(":")[0]))
                start.setMinutes(parseInt(regExpTimespan[0].split(":")[1]))
                timeSpan = start;
            }

            let team = absence.children[1].firstChild.firstChild.children;
            team = team.length == 2 ? team[0].children[1].firstChild.text : team[1].children[1].firstChild.text;

            const absenceAmount: string = absence.children[2].firstChild.text.replace("%", "").trim();

            let registreret: string[] = absence.children[4].firstChild.text.split(" ");
            const time = registreret.pop()?.slice(0,5);

            const teacherNote: string | undefined = (absence.children[5].children.length > 0 && scrapeHelper(absence.children[5].children)) || undefined;

            let studentProvidedReason: boolean = false;
            let studentNote: string | undefined = undefined;

            if(j == 1) {
                studentProvidedReason = true;
                studentNote = scrapeHelper(absence.children[6].children).trim();
                if(studentNote?.endsWith("\n")) studentNote = studentNote.replace("\n", "");
            }

            const url = absence.children[j == 1 ? 7 : 6].firstChild.firstChild.attributes.href

            out.push({
                modul: team,
                absence: absenceAmount,
                studentProvidedReason: studentProvidedReason,
                studentNote: studentNote,
                teacherNote: teacherNote,

                modulStartTime: timeSpan?.toLocaleTimeString("de-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                }) || "",

                registered: registreret.join(" "),
                registeredTime: time || "",

                url: url,
            })
    
        })
    });

    return out;
}


