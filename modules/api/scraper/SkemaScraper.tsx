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
    return date.toLocaleString("da-DK", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).replace(".", "/").replace(".", ":");
}

function differenceBetweenDates(start: Date, end: Date) {
    return Math.min(Math.abs(start.valueOf() - end.valueOf()) / 1000 / 60, 60*24);
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

    width: string,
    height: number,
    left: string,
    top: number,
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
        
        if("text" in modul.children[0] && (modul.children[0].text == "Aktivitetsforside" || modul.children[0].text == "Vis prøvehold" || modul.children[0].text == "Vis udgående censur" || modul.children[0].text == "Rediger privat aftale"))
            return;

        const lektier = parseLektieNote(modul.attributes.href, raw);

        let timeSpan: [Date, Date];
        const text: string = modul.text;
        let regex = text.match(/(\d{1,2}\/\d{1,2}-\d{4} \d{2}:\d{2})/gm)
        if((regex?.length ?? 1) < 2) {
            regex = text.match(/(\d{2}:\d{2})/gm)
        }

        if(regex && regex.length >= 2) { 
            timeSpan = [parseFullDate(regex[0]), parseFullDate(regex[1])]
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
            modul?: string,
        } = parseInfoString(brik.lastChild)

        const parsedIcons: {homework: boolean, comment: boolean} = parseIconString(brik.firstChild)

        const startNum = parseInt(timeSpan[1].getHours().toString().padStart(2,"0") + timeSpan[1].getMinutes().toString().padStart(2,"0"));
        const endNum = parseInt(timeSpan[0].getHours().toString().padStart(2,"0") + timeSpan[0].getMinutes().toString().padStart(2,"0"));

        const {
            width,
            height,
            top,
            left,
        } = scrapeLayout(modul);

        out.push({
            changed: modul.classList.includes("s2changed"),
            cancelled: modul.classList.includes("s2cancelled"),

            lokale: parsedInfoString.lokale,
            team: parsedInfoString.team,
            title: parsedInfoString.title,
            teamId: parsedInfoString.teamId,

            teacher: parsedInfoString.teacher,

            href: modul.attributes.href.replaceAll("'", "").replaceAll("\"", ""),

            homework: parsedIcons.homework,
            comment: parsedIcons.comment,
            
            timeSpan: {
                start: formatDate(timeSpan[0]),
                startNum: startNum > endNum ? endNum : startNum,

                end: formatDate(timeSpan[1]),
                endNum: startNum > endNum ? startNum : endNum,
    
                diff: differenceBetweenDates(timeSpan[0], timeSpan[1]),
            },

            width,
            left,
            top,
            height,

            ...lektier,
        })

        moduleNum++;
    });

    return { 
        moduler: out,
        skemaNoter: skemaNoter,
    };
}

function scrapeLayout(modul: any): {
    width: string,
    left: string,
    top: number,
    height: number,
} {
    function scrapeProperties(modul: any): {width: string; left: string; top: string; height: string} {
        const properties: { width: string; left: string; top: string; height: string; } | {[id: string]: string} = {};

        const style: string = modul.attributes.style.replace(" ", "");
        // @ts-ignore
        ["width", "height", "left", "top"].forEach((property: "width" | "height" | "left" | "top") => {
            const match = new RegExp(`${property}:.*?;`).exec(style)
            properties[property] = (match ?? ["0em"])[0].replace(property + ":", "").replace(";", "");
        })
    
        // @ts-ignore
        return properties;
    }

    const out: {[id: string]: number | string} = {};

    const properties = scrapeProperties(modul);
    const parentProperties = scrapeProperties(modul.parent);

    const parentWidth = parseFloat(parentProperties["width"].replace("em", "")) * 12 * (16/12);

    // @ts-ignore
    ["width", "height", "left", "top"].flatMap((v: "width" | "height" | "left" | "top") => {
        if(v === "top" || v === "height") {
            out[v] = parseFloat(properties[v].replace("em", ""))*12 * (16/12);
        } else {
            let property = parseFloat(properties[v].replace("em", "")) * 12 * (16/12);

            if(v === "left") {
                property -= 8.8;
            }

            out[v] = (property / parentWidth) * 1.0787989 * 100 + "%";
        }
    })

    // @ts-ignore
    return out;
}

export function parseFullDate(date: string): Date {
    let today = new Date();

    try {
        try {
            today.setFullYear(parseInt(date.split("-")[1].split(" ")[0]), parseInt(date.split("/")[1].split("-")[0])-1, parseInt(date.split("/")[0]))
        } catch {}
        const index = date.includes(" ") ? 1 : 0;
        today.setHours(parseInt(date.split(" ")[index].split(":")[0]))
        today.setMinutes(parseInt(date.split(" ")[index].split(":")[1]))
    } catch {}

    return today;
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

            const data = /data-tooltip=".*?"/gms.exec(match);
            if(data) {
                info = data[0].replace("data-tooltip=\"", "").slice(0, -1)
            }

            if(!data && (info.startsWith("'") || info.startsWith("\""))) {
                info = info.substring(1);
            }

            if(!data && (info.endsWith("'>") || info.endsWith("\">"))) {
                info = info.slice(0, -2);
            } else if (!data && (info.endsWith("\" title>") || info.endsWith("\' title>"))) {
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