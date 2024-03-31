// @ts-ignore
import DomSelector from 'react-native-dom-parser';
import treat, { _treat, treatRaw } from './TextTreater';

export function SCRAPE_URLS(gymNummer?: String, elevId?: string, klasseId?: string, type?: "bcstudent" | "bcteacher", selectedFolder: number = -70) {
    const _URLS = {
        "BASE_URL": "https://www.lectio.dk",
        "GYM_LIST": "https://www.lectio.dk/lectio/login_list.aspx?showall=1",
        "LOGIN_URL": `https://www.lectio.dk/lectio/${gymNummer}/login.aspx`,
        "FORSIDE": `https://www.lectio.dk/lectio/${gymNummer}/forside.aspx`,
        "SKEMA": `https://www.lectio.dk/lectio/${gymNummer}/SkemaNy.aspx`,
        "SKEMA_FOR": `https://www.lectio.dk/lectio/${gymNummer}/SkemaNy.aspx?type=${type}&elevid=${elevId}`,
        "LOG_UD": `https://www.lectio.dk/lectio/${gymNummer}/logout.aspx`,
        "ABSENCE": `https://www.lectio.dk/lectio/${gymNummer}/subnav/fravaerelev.aspx`,
        "ABSENCE_REGISTRATION": `https://www.lectio.dk/lectio/${gymNummer}/subnav/fravaerelev_fravaersaarsager.aspx`,
        "RAW_MESSAGE_URL": `https://www.lectio.dk/lectio/${gymNummer}/beskeder2.aspx`,
        "MESSAGES": `https://www.lectio.dk/lectio/${gymNummer}/beskeder2.aspx?mappeid=${selectedFolder}`,
        "NEW_MESSAGE": `https://www.lectio.dk/lectio/572/beskeder2.aspx?mappeid=${selectedFolder}`,
        "S_MESSAGE": `https://www.lectio.dk/lectio/${gymNummer}/beskeder2.aspx?type=visbesked&id=${elevId}`,
        "PEOPLE": `https://www.lectio.dk/lectio/${gymNummer}/cache/DropDown.aspx?type=${type}`,
        "CLASS_LIST": `https://www.lectio.dk/lectio/${gymNummer}/FindSkema.aspx?type=stamklasse`,
        "CLASS": `https://www.lectio.dk/lectio/${gymNummer}/subnav/members.aspx?klasseid=${klasseId}&showstudents=1&reporttype=withpics&showteachers=1`,
        "PICTURE": `https://www.lectio.dk/lectio/${gymNummer}/GetImage.aspx?pictureid=${elevId}`,
        "PICTURE_HIGHQUALITY": `https://www.lectio.dk/lectio/${gymNummer}/GetImage.aspx?pictureid=${elevId}&fullsize=1`,
        "LEKTIE": `https://www.lectio.dk/lectio/${gymNummer}/material_lektieoversigt.aspx`,
        "HOLD": `https://www.lectio.dk/lectio/${gymNummer}/subnav/members.aspx?holdelementid=${elevId}&showteachers=1&showstudents=1`,
        "OPGAVER": `https://www.lectio.dk/lectio/${gymNummer}/OpgaverElev.aspx`,
        "S_OPGAVE": `https://www.lectio.dk/lectio/${gymNummer}/ElevAflevering.aspx?elevid=${elevId}&exerciseid=${klasseId}&prevurl=OpgaverElev.aspx`,
        "MODUL_REGNSKAB": `https://www.lectio.dk/lectio/${gymNummer}/subnav/modulregnskab.aspx?holdelementid=${elevId}`,
        "CACHE": `https://www.lectio.dk/lectio/${gymNummer}/cache/DropDown.aspx`,
        "GRADES": `https://www.lectio.dk/lectio/${gymNummer}/grades/grade_report.aspx?elevid=${elevId}&culture=da-DK`,
        "FOLDERS": `https://www.lectio.dk/lectio/${gymNummer}/DokumentOversigt.aspx?elevid=${elevId}`,
        "DOCUMENTS": `https://www.lectio.dk/lectio/${gymNummer}/DokumentOversigt.aspx?elevid=${elevId}&folderid=${klasseId}`,
        "BOOKS": `https://www.lectio.dk/lectio/${gymNummer}/BD/UserReservations.aspx?ElevID=${elevId}`,

        "LECTIOPLUS_SAVE_RECEIPT": `https://lectioplus.com/api/v1/save-receipt`,
        "LECTIOPLUS_GET": `https://lectioplus.com/api/v1/validate`,
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
    const res = (await fetch(url, {
        method: "GET",
        credentials: 'include',
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    }));

    const text = _treat(await res.text());

    const parser = DomSelector(text);
    const ASPHeaders = parser.getElementsByClassName("aspNetHidden");

    let headers: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        headers = {...headers, ...parseASPHeaders(header)};
    })

    return headers;
}

export const HEADERS = {
    credentials: 'include',
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache",
        "Host": "www.lectio.dk",
    },
} as const;
