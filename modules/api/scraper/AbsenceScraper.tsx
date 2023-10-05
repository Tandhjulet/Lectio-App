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
    skriftligt: Absence,
    almindeligt: Absence,
}

export type Absence = {
    team: string,
    settled: {
        total: number,
        absent: number,
    },
    yearly: {
        total: number,
        absent: number,
    },
    type: AbsenceType,
}

function scrapeAbsenceRow(row: any): Fag {
    const team: string = row.firstChild.firstChild.firstChild.text;

    const scaffOld = (absenceType: AbsenceType): Absence => {
        return ({
            team: team,
            settled: {
                total: 0,
                absent: 0,
            },
            yearly: {
                total: 0,
                absent: 0,
            },
            type: absenceType,
        })
    }

    const almindeligt: Absence = scaffOld(AbsenceType.ALMINDELIGT);
    const skriftligt: Absence = scaffOld(AbsenceType.SKRIFTLIGT);

    row.children.forEach((child: any, index: number) => {
        if(index == 0 || index % 2 != 0)
            return;

        const data = scrapeCell(child)
        if(index <= 4) {
            if(index == 2) 
                almindeligt.settled = data;
            else if (index == 4) 
                almindeligt.yearly = data;
        } else {
            if(index == 6) 
                skriftligt.settled = data;
            else if (index == 8) 
                skriftligt.yearly = data;
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