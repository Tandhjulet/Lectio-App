// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import { Day, scrapeSchema } from './SkemaScraper';
import { TypedAbsence, scrapeAbsence } from './AbsenceScraper';


export function SCRAPE_URLS(gymNummer?: String) {
    const _URLS = {
        "GYM_LIST": "https://www.lectio.dk/lectio/login_list.aspx?forcemobile=1",
        "LOGIN_URL": `https://www.lectio.dk/lectio/${gymNummer}/login.aspx`,
        "FORSIDE": `https://www.lectio.dk/lectio/${gymNummer}/forside.aspx`,
        "SKEMA": `https://www.lectio.dk/lectio/${gymNummer}/SkemaNy.aspx`,
        "LOG_UD": "https://www.lectio.dk/lectio/572/logout.aspx",
        "ABSENCE": "https://www.lectio.dk/lectio/572/subnav/fravaerelev.aspx",
    } as const;

    return _URLS;
};

export async function getSchools(): Promise<{[id: string]: string;}> {

    const text = await (await fetch(SCRAPE_URLS().GYM_LIST, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    })).text();

    const parser = DomSelector(text);
    const unparsedGyms = parser.getElementsByTagName("a")

    const parsedGyms: { [id: string] : string } = {}
    unparsedGyms.forEach((element: any) => {
        const href: string = element.attributes.href;
        const text: string = element.children[0].text;
        if(text == "Vis alle skoler")
            return;

        parsedGyms[text] = href.replace(/\D/g, "")
    });

    return parsedGyms;
}

function parseASPHeaders(ASPHeader: any) {
    const parsedHeaders: any = {};
    ASPHeader.children.forEach((i: any) => {
        parsedHeaders[i.attributes.name] = i.attributes.value;
    });
    return parsedHeaders;
}

export async function getASPHeaders(gymNummer: string): Promise<{[id: string]: string}> {
    const text = await (await fetch(SCRAPE_URLS(gymNummer).LOGIN_URL, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    })).text();

    const parser = DomSelector(text);
    const ASPHeaders = parser.getElementsByClassName("aspNetHidden");

    let headers: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        headers = {...headers, ...parseASPHeaders(header)};
    })

    return headers;
}

export async function getElevID(gymNummer: string): Promise<string> {
    const res = await fetch(SCRAPE_URLS(gymNummer).FORSIDE, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    })

    const text = await res.text();

    const parser = DomSelector(text);
    let elevID = parser.getElementsByName("msapplication-starturl")[0];

    if(elevID != null && "attributes" in elevID)
        elevID = elevID.attributes.content
    else {
        // probably rate limited 
        console.warn("Rate limited!")
        return "";
    }

    if(elevID == "/lectio/" + gymNummer + "/default.aspx") {
        console.warn("getElevID called without login.")
        return "";
    }

    return elevID.split("?")[1].replace(/\D/gm, "");
}


export async function getSkema(gymNummer: string, date: Date): Promise<Day[]> {
    
    const res = await fetch(SCRAPE_URLS(gymNummer).SKEMA + `?type=elev&elevid=${await getElevID(gymNummer)}&week=${getWeekNumber(date).toString().padStart(2, "0")}${date.getFullYear()}`, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();

    const parser = DomSelector(text);
    const skema: Day[] = scrapeSchema(parser);

    return skema;
}

export async function getAbsence(gymNummer: string): Promise<TypedAbsence[]> {
    const res = await fetch(SCRAPE_URLS(gymNummer).ABSENCE, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    const text = await res.text();

    const parser = DomSelector(text);
    const absence = scrapeAbsence(parser);

    return absence;
}

export function getWeekNumber(d: any): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));

    const yearStart: any = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo: any = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);

    return weekNo;
}
