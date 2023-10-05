export enum STATUS {
    AFLEVERET,
    IKKE_AFLEVERET,
    VENTER,
}

export type Opgave = {
    date: Date,
    time: number,
    title: string,
    status: STATUS,
    team: string,
    absence: string,
}

function parseDate(date: string): Date {
    const today = new Date();

    today.setFullYear(parseInt(date.split("-")[1].split(" ")[0]), parseInt(date.split("/")[1].split("-")[0])-1, parseInt(date.split("/")[0]))
    today.setHours(parseInt(date.split(" ")[1].split(":")[0]))
    today.setMinutes(parseInt(date.split(" ")[1].split(":")[1]))

    return today;
}

export async function scrapeOpgaver(parser: any): Promise<Opgave[] | null> {
    const table = parser.getElementById("s_m_Content_Content_ExerciseGV");
    if(table == null)
        return null;

    const out: Opgave[] = [];

    table.children.forEach((child: any, index: number) => {
        if(index == 0)
            return;

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
            date: parseDate(date),
            status: STATUS[status as keyof typeof STATUS],
            team: team,
            time: time,
            title: title,
        })
    })

    return out;
}