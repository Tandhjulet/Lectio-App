export function scrapeSchema(parser: any, raw: string): Week | null {

    const table = parser.getElementById("s_m_Content_Content_SkemaNyMedNavigation_skema_skematabel");
    if(table == null) {
        return null;
    }

    const schema = table.lastChild.children;

    //delete days[0];

    let modules: ModulDate[] = [];
    const days: Day[] = [];

    schema.forEach((element: any, index: number) => {
        if(index == 0) {
            modules = parseModule(element.firstChild);
        } else {
            days.push(parseDay(element.firstChild, table, index, raw));
        }
    });

    return {
        days: days,
        modul: modules,
    };

    //parseDay(days[1].firstChild, table)
}

const formatDate = (date: Date) => {
    return date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0");
}

function differenceBetweenDates(date1: Date, date2: Date) {
    const hours = date1.getHours() - date2.getHours();
    const minutes = date1.getMinutes() - date2.getMinutes();

    const out = minutes + hours*60;
    if (out <= 70) {
        return 70;
    }

    return out;
}


export type Modul = {
    team: string,
    teacher: string[],
    lokale: string,
    timeSpan: {
        endDate: string,
        startDate: string,
        diff: number,
    }

    changed: boolean,
    cancelled: boolean,

    comment: boolean,
    homework: boolean,

    lektier?: string[],
    note?: string,
    lærerNavn?: string,
}

export type Day = {
    moduler: {[id: string]: Modul[]}
    sortedKeys: string[],
    skemaNoter: String,
}

export type ModulDate = {
    start: string,
    startNum: number,

    end: string,
    endNum: number,
}

export type Week = {
    modul: ModulDate[],
    days: Day[],
}

let DEBUG = false;

function parseStringifiedTime(stringifiedDate: string): Date {
    const hours = parseInt(stringifiedDate.split(":")[0]);
    const minutes = parseInt(stringifiedDate.split(":")[1]);

    const d = new Date();
    d.setHours(hours);
    d.setMinutes(minutes);

    return d;
}

function parseModule(htmlObject: any): ModulDate[] {
    const out: ModulDate[] = [];

    const modulListe = htmlObject.getElementsByClassName("s2module-info");
    modulListe.forEach((modul: any) => {
        const dateString = modul.firstChild.lastChild.text;

        const start = parseStringifiedTime(dateString.split(" - ")[0]);
        const end = parseStringifiedTime(dateString.split(" - ")[1]);

        out.push({
            start: dateString.split(" - ")[0],
            startNum: parseInt(start.getHours().toString() + start.getMinutes().toString()),

            end: dateString.split(" - ")[1],
            endNum: parseInt(end.getHours().toString() + end.getMinutes().toString()),
        })
    });

    return out;
}

function parseDay(htmlObject: any, table: any, dayNum: number, raw: string): Day {
    const modulListe = htmlObject.getElementsByTagName("a");

    const skemaNoter = getSkemaNote(table, dayNum);

    const out: {[id: string]: Modul[]} = {}
    let moduleNum = 0;

    modulListe.forEach((modul: any, index: number) => {
        
        if("text" in modul.children[0] && (modul.children[0].text == "Aktivitetsforside" || modul.children[0].text == "Vis prøvehold"))
            return;

        const lektier = parseLektieNote(modul.attributes.href, raw);

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
            modul?: string,
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
                endDate: formatDate(timeSpan[0]), //moduleDates[moduleNum][0],
                startDate: formatDate(timeSpan[1]), //moduleDates[moduleNum][1],
                diff: differenceBetweenDates(timeSpan[1], timeSpan[0])
            },

            ...lektier,
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

export function parseInfoString(info: any): {
    teacher: string[],
    lokale: string,
    team: string,
    changed: boolean,
    cancelled: boolean,
    modul?: string,
} {

    const out: {
        teacher: string[],
        lokale: string,
        team: string,
        changed: boolean,
        cancelled: boolean,
        modul?: string,
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
            if(element.text.endsWith(". modul - "))
                out["modul"] = element.text.replace(". modul - ", "")

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
            out["team"] = info.firstChild.firstChild.text.replaceAll("&amp;", "&");
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

function parseMatch(match: string) {
    const out: {
        lektier?: string[],
        note?: string,
        lærerNavn?: string,
    } = {};

    if(match.includes("Lektier:\n")) {
        const lektier = match.split("Lektier:\n")[1].split("\n\n")[0].split(" [...]\n");
        const lektierParsed: string[] = []

        lektier.forEach((lektie) => {
            if(lektie.startsWith("- "))
                lektie = lektie.slice(2);
            if(lektie.endsWith(" [...]"))
                lektie = lektie.slice(0, -5)
            lektierParsed.push(replaceHTMLEntities(lektie.trim()))
        })

        out.lektier = lektierParsed;
    }

    if(match.includes("Note:\n")) {
        const noter = match.split("Note:\n")[1]
        out.note = replaceHTMLEntities(noter);
    }

    if(match.includes("\nLærer: ")) {
        const lærer = match.split("\nLærer: ")[1].split("\n")[0]
        if(!(lærer.includes(", ")))
            out.lærerNavn = replaceHTMLEntities(lærer);
    }

    return out;
}

function parseLektieNote(href: string, raw: string) {
    let out: {
        lektier?: string[],
        note?: string,
        lærerNavn?: string,
    } = {};

    const regExp = new RegExp(`<a href=${fixString(href)}.*?>`, "gms");
    let matches;

    while((matches = regExp.exec(raw)) != null) {
        if (matches.index === regExp.lastIndex) {
            regExp.lastIndex++;
        }
        
        // The result can be accessed through the `m`-variable.
        matches.forEach((match, groupIndex) => {
            if(!match.includes("data-additionalInfo"))
                return;

            let info = match.split("data-additionalInfo=")[1];
            if(info.startsWith("'") || info.startsWith("\"")) {
                info = info.substring(1);
            }

            if(info.endsWith("'>") || info.endsWith("\">")) {
                info = info.slice(0, -2);
            }

            out = parseMatch(info);
        });
    }

    return out;
}

export const replaceHTMLEntities = (toFix: string) => {
    return (decodeURIComponent(toFix)
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", "\"")
        .replaceAll("&apos;", "'"));
}

const fixString = (toFix: string) => {
    return toFix.replaceAll("'", "[\"\']").replaceAll("/", "\\/").replaceAll(".", "\\.").replaceAll("?", "\\?");
}