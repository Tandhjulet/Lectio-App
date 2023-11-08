// @ts-ignore
import DomSelector from 'react-native-dom-parser';

import { SCRAPE_URLS, getASPHeaders, parseASPHeaders } from "../scraper/Helpers";
import { Person } from "../scraper/class/ClassPictureScraper";

export async function sendMessage(title: string, sendTo: Person[], content: string, gymNummer: string, finished: any) {
    let headers = await createMessage(gymNummer);

    new Promise<void>((resolve, reject) => {
        sendTo.forEach(async (receiver: Person, index: number) => {
            headers = await addReceiver(gymNummer, receiver, headers);
            if (index === sendTo.length -1) resolve();
        });
    }).then(async () => {
        const response = await send(title, content, headers, gymNummer);
        const matches = response.url.match(new RegExp('id=(\\d+)', "gm"));
        if(matches == null) {
            finished(null);
            return;
        }

        const messageId = matches[0].replace("id=", "");
        finished(messageId);
    })
}

async function send(title: string, content: string, headers: {[id: string]: string}, gymNummer: string) {
    const payload: {[id: string]: string} = {
        ...headers,

        "__EVENTTARGET": "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$SendMessageBtn",
        "masterfootervalue": "X1!ÆØÅ",
        "__SCROLLPOSITION": JSON.stringify({"tableId":"","rowIndex":-1,"rowScreenOffsetTop":-1,"rowScreenOffsetLeft":-1,"pixelScrollTop":0,"pixelScrollLeft":0}),
        "s$m$searchinputfield": "",
        "s$m$Content$Content$MessageThreadCtrl$addRecipientDD$inp": "",
        "s$m$Content$Content$MessageThreadCtrl$addRecipientDD$inpid": "",
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$EditModeHeaderTitleTB$tb": title,
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$EditModeContentBBTB$TbxNAME$tb": content,
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$AttachmentDocChooser$selectedDocumentId": "",
        "LectioPostbackId": "",
    }

    const parsedData = [];
    for (const key in payload) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }
    const stringifiedData = parsedData.join("&");

    const res = await fetch(SCRAPE_URLS(gymNummer).NEW_MESSAGE, {
        method: "POST",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: stringifiedData,
    });

    return res;
}

async function addReceiver(gymNummer: string, receiver: Person, headers: {[id: string]: string}): Promise<{[id: string]: string}> {
    const payload: {[id: string]: string} = {
        ...headers,

        "__EVENTTARGET": "s$m$Content$Content$MessageThreadCtrl$AddRecipientBtn",
        "masterfootervalue": "X1!ÆØÅ",
        "__SCROLLPOSITION": JSON.stringify({"tableId":"","rowIndex":-1,"rowScreenOffsetTop":-1,"rowScreenOffsetLeft":-1,"pixelScrollTop":0,"pixelScrollLeft":0}),
        "s$m$Content$Content$MessageThreadCtrl$addRecipientDD$inp": receiver.rawName,
        "s$m$Content$Content$MessageThreadCtrl$addRecipientDD$inpid": (receiver.type == "ELEV" ? "S" : "T") + receiver.personId,
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$EditModeHeaderTitleTB$tb": "",
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$EditModeContentBBTB$TbxNAME$tb": "",
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$AttachmentDocChooser$selectedDocumentId": "",
        "s$m$Content$Content$ListGridSelectionTree$folders": "-70",
        "__LASTFOCUS": "",
        "LectioPostbackId": "",
    }

    const parsedData = [];
    for (const key in payload) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }
    const stringifiedData = parsedData.join("&");

    const text = await (await fetch(SCRAPE_URLS(gymNummer).NEW_MESSAGE, {
        method: "POST",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: stringifiedData,
    })).text();

    const parser = DomSelector(text);
    const ASPHeaders = parser.getElementsByClassName("aspNetHidden");

    let newHeaders: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        newHeaders = {...newHeaders, ...parseASPHeaders(header)};
    })

    return newHeaders;
}

async function createMessage(gymNummer: string): Promise<{[id: string]: string}> {
    const payload: {[id: string]: string} = {
        ...(await getASPHeaders(SCRAPE_URLS(gymNummer).RAW_MESSAGE_URL)),

        "__EVENTTARGET": "s$m$Content$Content$NewMessageLnk",
        "masterfootervalue": "X1!ÆØÅ",
        "LectioPostbackId": "",
    }

    const parsedData = [];
    for (const key in payload) {
        parsedData.push(encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]));
    }
    const stringifiedData = parsedData.join("&");


    const text = await (await fetch(SCRAPE_URLS(gymNummer).NEW_MESSAGE, {
        method: "POST",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: stringifiedData,
    })).text();

    const parser = DomSelector(text);
    const ASPHeaders = parser.getElementsByClassName("aspNetHidden");

    let headers: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        headers = {...headers, ...parseASPHeaders(header)};
    })

    return headers;
}