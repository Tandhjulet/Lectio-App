import { SCHEMA_SEP_CHAR } from "../../Config";
var he = require('he');

export function scrapeSchema(parser: any, raw: string): Week | null {
    const table = parser.getElementById("s_m_Content_Content_SkemaMedNavigation_skema_skematabel");

    if(table == null) {
        return null;
    }

    const schema = table.children[3].children;

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
    return out;
}


export type Modul = {
    team: string[],
    title?: string,
    teamId: string | null,
    teacher: string[],
    lokale: string,
    timeSpan: ModulDate,

    href: string,

    changed: boolean,
    cancelled: boolean,

    comment: boolean,
    homework: boolean,

    lektier?: string[],
    extra?: string[],
    note?: string,
    lærerNavn?: string,
}

export type Day = {
    moduler: Modul[]
    skemaNoter: string[] | string,
}

export type ModulDate = {
    start: string,
    startNum: number,

    end: string,
    endNum: number,

    diff: number,
}

export type Week = {
    modul: ModulDate[],
    days: Day[],
}

let DEBUG = false;

function parseModule(htmlObject: any): ModulDate[] {
    const out: ModulDate[] = [];

    const modulListe = htmlObject.getElementsByClassName("s2module-info");
    modulListe.forEach((modul: any) => {
        const dateString = modul.firstChild.lastChild.text;

        const start = parseDate(dateString.split(" - ")[0]);
        const end = parseDate(dateString.split(" - ")[1]);

        const startNum = parseInt(start.getHours().toString().padStart(2,"0") + start.getMinutes().toString().padStart(2,"0"));
        const endNum = parseInt(end.getHours().toString().padStart(2,"0") + end.getMinutes().toString().padStart(2,"0"));

        out.push({
            start: start > end ? dateString.split(" - ")[1] : dateString.split(" - ")[0],
            startNum: start > end ? endNum : startNum,

            end: start > end ? dateString.split(" - ")[0] : dateString.split(" - ")[1],
            endNum: start > end ? startNum : endNum,

            diff: differenceBetweenDates(end, start),
        })
    });

    return out;
}

function parseDay(htmlObject: any, table: any, dayNum: number, raw: string): Day {
    const modulListe = htmlObject.getElementsByTagName("a");

    const skemaNoter = getSkemaNote(table, dayNum);

    const out: Modul[] = [];
    let moduleNum = 0;

    modulListe.forEach((modul: any, index: number) => {
        
        if("text" in modul.children[0] && (modul.children[0].text == "Aktivitetsforside" || modul.children[0].text == "Vis prøvehold"))
            return;

        const lektier = parseLektieNote(modul.attributes.href, raw);

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
            team: string[],
            title?: string,
            teamId: string | null,
            changed: boolean,
            cancelled: boolean,
            modul?: string,
        } = parseInfoString(brik.lastChild)

        const parsedIcons: {homework: boolean, comment: boolean} = parseIconString(brik.firstChild)

        const startNum = parseInt(timeSpan[1].getHours().toString().padStart(2,"0") + timeSpan[1].getMinutes().toString().padStart(2,"0"));
        const endNum = parseInt(timeSpan[0].getHours().toString().padStart(2,"0") + timeSpan[0].getMinutes().toString().padStart(2,"0"));

        out.push({
            changed: parsedInfoString.changed,
            cancelled: parsedInfoString.cancelled,

            lokale: parsedInfoString.lokale,
            team: parsedInfoString.team,
            title: parsedInfoString.title,
            teamId: parsedInfoString.teamId,

            teacher: parsedInfoString.teacher,

            href: modul.attributes.href.replaceAll("'", "").replaceAll("\"", ""),

            homework: parsedIcons.homework,
            comment: parsedIcons.comment,
            
            timeSpan: {
                end: startNum > endNum ? formatDate(timeSpan[1]) : formatDate(timeSpan[0]),
                startNum: startNum > endNum ? endNum : startNum,
    
                start: startNum > endNum ? formatDate(timeSpan[0]) : formatDate(timeSpan[1]),
                endNum: startNum > endNum ? startNum : endNum,
    
                diff: differenceBetweenDates(timeSpan[1], timeSpan[0]),
            },

            ...lektier,
        })

        moduleNum++;
    });

    return { 
        moduler: out,
        skemaNoter: skemaNoter,
    };
}

function parseDate(dateString: string): Date {
    const date = new Date();
    
    const hours = dateString.split(':')[0];
    const minutes = dateString.split(':')[1];

    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parseInt(hours), parseInt(minutes));
}

function getSkemaNote(table: any, dayNum: number): string[] {
    const skemaNote = table.getElementsByClassName("s2infoHeader")[dayNum + 1];

    if(skemaNote != undefined) {
        const out: string[] = [];

        let note = skemaNote.getElementsByTagName("a");
        note.forEach((n: any) => {
            let text: string;
            try {
                text = n.firstChild.firstChild.lastChild.firstChild.text;
            } catch {
                text = "";
            }
            out.push(text.replace("&nbsp;", " "));
        })

        return out;
    }

    return [];
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

    if(!info.classList.includes("s2skemabrikIcons")) {
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
    team: string[],
    title?: string,
    teamId: string | null,
    changed: boolean,
    cancelled: boolean,
} {

    const out: {
        teacher: string[],
        lokale: string,
        title?: string,
        team: string[],
        teamId: string | null,
        changed: boolean,
        cancelled: boolean,
    } = {
        teacher: [],
        lokale: "",
        team: [],
        teamId: null,
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

    info.children.forEach((element: any) => {
        if(element.text == ` ${SCHEMA_SEP_CHAR} `) 
            return;

        if(element.text.includes(` ${SCHEMA_SEP_CHAR} `)) {
            out["lokale"] = replaceHTMLEntities(element.text.replace(` ${SCHEMA_SEP_CHAR} `, ""))
        }

        if("attributes" in element) {

            const attr: string = element.attributes["data-lectioContextCard"];
            if(attr == undefined)
                return;

            if(attr.startsWith("T")) {
                const teacherInitials: string = element.children[0].text;
                out["teacher"].push(replaceHTMLEntities(teacherInitials));

            } else if (attr.startsWith("HE")) {
                out["team"].push(replaceHTMLEntities(element.children[0].text));
                out["teamId"] = attr.replace("HE", "");
            }
        }
    });

    if(info.firstChild.tagName == "span" && info.firstChild.attributes["data-lectioContextCard"] == undefined) {
        out["title"] = replaceHTMLEntities(info.firstChild.firstChild.text);
    }
    if(out["lokale"].startsWith("...")) {
        out["lokale"] = out["lokale"].replace(/\.\.\./, "");
    }
    if(out["lokale"] == "") {
        out["lokale"] = "..."
    }

    return out;
}

function parseMatch(match: string) {
    const out: {
        lektier?: string[],
        note?: string,
        lærerNavn?: string,
        extra?: string[],
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

    if(match.includes("Øvrigt indhold:\n")) {
        const lektier = match.split("Øvrigt indhold:\n")[1].split("\n\n")[0].split(" [...]\n");
        const lektierParsed: string[] = []

        lektier.forEach((lektie) => {
            if(lektie.startsWith("- "))
                lektie = lektie.slice(2);
            if(lektie.endsWith(" [...]"))
                lektie = lektie.slice(0, -5)
            lektierParsed.push(replaceHTMLEntities(lektie.trim()))
        })

        out.extra = lektierParsed;
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
        extra?: string[],
    } = {};

    const regExp = new RegExp(`<a href="${fixString(href)}.*?>`, "gms");
    let matches;

    while((matches = regExp.exec(raw)) != null) {
        if (matches.index === regExp.lastIndex) {
            regExp.lastIndex++;
        }
        
        matches.forEach((match, groupIndex) => {
            if(!match.includes("data-tooltip"))
                return;

            let info = match.split("data-tooltip=")[1];
            if(info.startsWith("'") || info.startsWith("\"")) {
                info = info.substring(1);
            }

            if(info.endsWith("'>") || info.endsWith("\">")) {
                info = info.slice(0, -2);
            } else if (info.endsWith("\" title>") || info.endsWith("\' title>")) {
                info = info.slice(0, -8);
            }

            out = parseMatch(info);
        });
    }

    return out;
}

export const replaceHTMLEntities = (toFix: string) => {
    return he.decode(decodeURIComponent(toFix))
}

const fixString = (toFix: string) => {
    return toFix.replaceAll("'", "[\"\']").replaceAll("/", "\\/").replaceAll(".", "\\.").replaceAll("?", "\\?");
}