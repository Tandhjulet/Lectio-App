import { scrapeHelper } from "./MessageScraper";
import { parseInfoString } from "./SkemaScraper";

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

    modul: string,
    date: string,
    time: string,

    absence: string,
}


export function scapeRegistration(parser: any): Registration[] {
    const tables = parser.getElementsByClassName("ls-table-layout1");

    if(tables == null)
        return [];

    const out: Registration[] = [];

    tables.forEach((table: any, j: number) => {
        table.children.forEach((absence: any, i: number) => {

            if(i == 0) return;

            // TODO: fiks så time & date i Registration ikke hentes fra tidspunktet fraværet
            // blev registreret, men istedet hvornår lektionen tog sted.

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

            out.push({
                modul: team,
                date: registreret.join(" "),
                absence: absenceAmount,
                time: time || "",
                studentProvidedReason: studentProvidedReason,
                studentNote: studentNote,
                teacherNote: teacherNote,
            })
    
        })
    });

    return out;
}


