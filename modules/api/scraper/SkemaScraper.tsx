export function scrapeSchema(parser: any): Day[] {

    const table = parser.getElementById("s_m_Content_Content_SkemaNyMedNavigation_skema_skematabel");

    const days = table.lastChild.children;

    //delete days[0];

    const out: Day[] = [];

    days.forEach((element: any, index: number) => {
        if(index == 0) 
            return;
        
        out.push(parseDay(element.firstChild, table, index));
    });

    return out;

    //parseDay(days[1].firstChild, table)
}

export type Modul = {
    team: String,
    teacher: String[],
    lokale: String,
    timeSpan: {
        endDate: Date,
        startDate: Date,
    }

    changed: boolean,
    cancelled: boolean,

    comment: boolean,
    homework: boolean,
}

export type Day = {
    moduler: {[id: string]: Modul[]}
    sortedKeys: string[],
    skemaNoter: String,
}

function parseDay(htmlObject: any, table: any, dayNum: number): Day {
    const modulListe = htmlObject.getElementsByTagName("a");

    const skemaNoter = getSkemaNote(table, dayNum);

    const out: {[id: string]: Modul[]} = {}
    let moduleNum = 0;

    modulListe.forEach((modul: any) => {
        
        if("text" in modul.children[0] && modul.children[0].text == "Aktivitetsforside")
            return;

        let height;
        const regExpHeight = /top:(?<height>([\d\.]*))em/gm.exec(modul.text);
        if(regExpHeight != null)
            height = regExpHeight[1];
        else
            height = "0";

        let timeSpan: [Date, Date];
        const regExpTimespan = modul.text.match(new RegExp('\\d{2}:\\d{2}', "gm"));

        if(regExpTimespan != null && regExpTimespan.length >= 2) {

            const start = new Date();
            const end = new Date();

            start.setHours(parseInt(regExpTimespan[0].split(":")[0]))
            start.setMinutes(parseInt(regExpTimespan[0].split(":")[1]))

            end.setHours(parseInt(regExpTimespan[1].split(":")[0]))
            end.setMinutes(parseInt(regExpTimespan[1].split(":")[1]))

            timeSpan = [start, end];
        } else {
            timeSpan = getModuleDate(table)[moduleNum];
        }

        const brik = modul.firstChild;

        const parsedInfoString: {
            teacher: string[],
            lokale: string,
            team: string,
            changed: boolean,
            cancelled: boolean,
        } = parseInfoString(brik.lastChild)

        const parsedIcons: {homework: boolean, comment: boolean} = parseIconString(brik.firstChild)

        if(out[height] == null)
            out[height] = [];

        out[height].push({
            changed: parsedInfoString.changed,
            cancelled: parsedInfoString.cancelled,

            lokale: parsedInfoString.lokale,
            team: parsedInfoString.team,
            teacher: parsedInfoString.teacher,

            homework: parsedIcons.homework,
            comment: parsedIcons.comment,
            
            timeSpan: {
                endDate: timeSpan[0], //moduleDates[moduleNum][0],
                startDate: timeSpan[1], //moduleDates[moduleNum][1],
            }
        })

        moduleNum++;
    });

    const keys = Object.keys(out);
    keys.sort((a,b) => parseInt(a) - parseInt(b))

    return { 
        moduler: out,
        sortedKeys: keys,
        skemaNoter: skemaNoter,
    };
}

function parseDate(dateString: string): Date {
    const date = new Date();
    
    const hours = dateString.split(':')[0];
    const minutes = dateString.split(':')[1];

    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(hours), parseInt(minutes));
}

function getSkemaNote(table: any, dayNum: number): String {
    const skemaNote = table.getElementsByClassName("s2infoHeader")[dayNum + 1];

    if(skemaNote != undefined) {
        let note = skemaNote.getElementsByTagName("span")[1];
        if(note == undefined)
            return "";

        return note.firstChild.text;
    }

    return "";
}

function getModuleDate(parser: any): {[id: number]: [Date, Date]}  {
    const modulListe = parser.getElementsByClassName("s2module-info")

    const out: {[id: number]: [Date, Date]} = {};

    modulListe.forEach((modul: any, index: number) => {
        const fromTo: string = modul.children[0].children[2].text

        const from: string = fromTo.split(' - ')[0];
        const to: string = fromTo.split(' - ')[1];

        out[index] = [parseDate(from), parseDate(to)];
    });

    return out;
}

function parseIconString(info: any): {homework: boolean, comment: boolean} {
    if(info == undefined) {
        return {homework: false, comment: false}
    }

    if(!info.classList.includes("'s2skemabrikIcons'")) {
        return {homework: false, comment: false};
    }
    
    const out: {homework: boolean, comment: boolean} = {homework: false, comment: false}

    if("children" in info) {
        info.children.forEach((child: any) => {

            const text = child.children[0].text;
            if(text == "sms") {
                out.comment = true;
            } else if (text == "bookmark") {
                out.homework = true;
            }
        })
    }
    
    return out;
}

function parseInfoString(info: any): {
    teacher: string[],
    lokale: string,
    team: string,
    changed: boolean,
    cancelled: boolean,
} {

    const out: {
        teacher: string[],
        lokale: string,
        team: string,
        changed: boolean,
        cancelled: boolean,
    } = {
        teacher: [],
        lokale: "",
        team: "",
        changed: false,
        cancelled: false,
    };

    if(info == undefined)
        return out;

    if (info.classList.includes("s2changed")) {
        out.changed = true;
    }
    else if (info.classList.includes("s2cancelled")) {
        out.cancelled = true;
    }

    if("children" in info) {
        info.children.forEach((element: any) => {
            if(element.text == " ▪ ") 
                return;

            if(element.text.includes(" ▪ ")) {
                out["lokale"] = element.text.replace(" ▪ ", "")
            }

            if("attributes" in element) {
                const attr: string = element.attributes["data-lectioContextCard"];
                if(attr == undefined)
                    return;

                if(attr.startsWith("'T")) {
                    const teacherInitials: string = element.children[0].text;
                    out["teacher"].push(teacherInitials);

                } else if (attr.startsWith("'HE")) {
                    out["team"] = element.children[0].text;
                }
            }
        });

        if(info.firstChild.tagName == "span" && info.firstChild.attributes["data-lectioContextCard"] == undefined) {
            out["team"] = info.firstChild.firstChild.text;
        }
        if(out["lokale"].startsWith("...")) {
            out["lokale"] = out["lokale"].replace(/\.\.\./, "");
        }
        if(out["lokale"] == "") {
            out["lokale"] = "..."
        }
    }

    return out;
}