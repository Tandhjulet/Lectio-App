// @ts-ignore
import DomSelector from 'react-native-dom-parser';

import { SCRAPE_URLS, getASPHeaders, parseASPHeaders } from "../scraper/Helpers";
import { Person } from "../scraper/class/ClassPictureScraper";
import { UploadResult } from '../filer/FileManager';

/**
 * Sends a message over lectio to the specified recipients with the specified data
 * @param title title of the message
 * @param sendTo recipients of the message
 * @param content the body/content of the message
 * @param gymNummer the gymNummer of the sender
 * @param finished a callback to run once after the message has been sent
 */
export async function sendMessage(title: string, sendTo: Person[], content: string, gymNummer: string, attachments: UploadResult[], finished: (messageId: string | null) => void) {
    let headers = await createMessage(gymNummer);

    // when running a forEach with an async callback the code will continue before all the callbacks are finished.
    // since forEach doesn't return a promise that we can await, we need to make one ourselves
    new Promise<void>((resolve, reject) => {
        sendTo.forEach(async (receiver: Person, index: number) => {
            headers = await addReceiver(gymNummer, receiver, headers);
            if (index === sendTo.length -1) resolve();
        });
    }).then(() => {
        new Promise<void>((res, rej) => {
            attachments.forEach(async (file: UploadResult, index: number) => {
                headers = await addFile(gymNummer, file, headers);
                if (index === attachments.length -1) res();
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
    })
}

/**
 * Sends the message HTTPS POST request that sends the message to the server
 * @param title 
 * @param content 
 * @param headers 
 * @param gymNummer 
 * @returns the {@link Response} of the request
 */
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

/**
 * Sends a HTTP POST that adds a receiver to the message
 * @param gymNummer 
 * @param receiver 
 * @param headers 
 * @returns the ASP headers of the new page
 */
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

async function addFile(gymNummer: string, file: UploadResult, headers: {[id: string]: string}): Promise<{ [id: string]: string; }> {
    if(!file.ok) return headers;

    const payload: {[id: string]: string} = {
        ...headers,

        "__EVENTTARGET": "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$AttachmentDocChooser",
        "__EVENTARGUMENT": "documentId",
        "masterfootervalue": "X1!ÆØÅ",
        "__SCROLLPOSITION": JSON.stringify({"tableId":"","rowIndex":-1,"rowScreenOffsetTop":-1,"rowScreenOffsetLeft":-1,"pixelScrollTop":0,"pixelScrollLeft":0}),
        "s$m$Content$Content$MessageThreadCtrl$addRecipientDD$inp": "",
        "s$m$Content$Content$MessageThreadCtrl$addRecipientDD$inpid": "",
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$EditModeHeaderTitleTB$tb": "",
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$EditModeContentBBTB$TbxNAME$tb": "",
        "s$m$Content$Content$MessageThreadCtrl$MessagesGV$ctl02$AttachmentDocChooser$selectedDocumentId": JSON.stringify({
            type: "serializedAnyFileId",
            serializedId: file.serializedId,
            isPublic: true,
            filename: file.fileName,
        }),
        "s$m$searchinputfield": "",
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

    console.log(payload)

    const parser = DomSelector(text);
    const ASPHeaders = parser.getElementsByClassName("aspNetHidden");

    let newHeaders: {[id: string]: string} = {};
    ASPHeaders.forEach((header: any) => {
        newHeaders = {...newHeaders, ...parseASPHeaders(header)};
    })

    return newHeaders;
}

/**
 * Creates a request to make a new message in Lectio's system
 * @param gymNummer 
 * @returns the ASP headers of the page
 */
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