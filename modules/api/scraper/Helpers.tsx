// @ts-ignore
import DomSelector from 'react-native-dom-parser';

export function SCRAPE_URLS(gymNummer?: String, elevId?: string, klasseId?: string, type?: "bcstudent" | "bcteacher", selectedFolder: number = -70) {
    const _URLS = {
        "GYM_LIST": "https://www.lectio.dk/lectio/login_list.aspx?forcemobile=1",
        "LOGIN_URL": `https://www.lectio.dk/lectio/${gymNummer}/login.aspx`,
        "FORSIDE": `https://www.lectio.dk/lectio/${gymNummer}/forside.aspx`,
        "SKEMA": `https://www.lectio.dk/lectio/${gymNummer}/SkemaNy.aspx`,
        "SKEMA_FOR": `https://www.lectio.dk/lectio/${gymNummer}/SkemaNy.aspx?type=${type}&elevid=${elevId}`,
        "LOG_UD": `https://www.lectio.dk/lectio/${gymNummer}/logout.aspx`,
        "ABSENCE": `https://www.lectio.dk/lectio/${gymNummer}/subnav/fravaerelev.aspx`,
        "MESSAGES": `https://www.lectio.dk/lectio/${gymNummer}/beskeder2.aspx?type=&elevid=${elevId}&selectedfolderid=${selectedFolder}`,
        "S_MESSAGE": `https://www.lectio.dk/lectio/${gymNummer}/beskeder2.aspx?type=liste&elevid=${elevId}`,
        "PEOPLE": `https://www.lectio.dk/lectio/${gymNummer}/cache/DropDown.aspx?type=${type}`,
        "CLASS_LIST": `https://www.lectio.dk/lectio/${gymNummer}/FindSkema.aspx?type=stamklasse`,
        "CLASS": `https://www.lectio.dk/lectio/${gymNummer}/subnav/members.aspx?klasseid=${klasseId}&showstudents=1&reporttype=withpics&showteachers=1`,
        "PICTURE": `https://www.lectio.dk/lectio/${gymNummer}/GetImage.aspx?pictureid=${elevId}`,
        "PICTURE_HIGHQUALITY": `https://www.lectio.dk/lectio/${gymNummer}/GetImage.aspx?pictureid=${elevId}&fullsize=1`,
        "LEKTIE": `https://www.lectio.dk/lectio/${gymNummer}/material_lektieoversigt.aspx`,
        "HOLD": `https://www.lectio.dk/lectio/${gymNummer}/subnav/members.aspx?holdelementid=${elevId}&showteachers=1&showstudents=1`,
        "OPGAVER": `https://www.lectio.dk/lectio/${gymNummer}/OpgaverElev.aspx`,
        "S_OPGAVE": `https://www.lectio.dk/lectio/${gymNummer}/ElevAflevering.aspx?elevid=${elevId}&exerciseid=${klasseId}&prevurl=OpgaverElev.aspx`
    } as const;

    return _URLS;
};

export function parseASPHeaders(ASPHeader: any) {
    const parsedHeaders: any = {};
    ASPHeader.children.forEach((i: any) => {
        parsedHeaders[i.attributes.name] = i.attributes.value;
    });
    return parsedHeaders;
}

export async function getASPHeaders(url: string): Promise<{[id: string]: string}> {
    const text = await (await fetch(url, {
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

