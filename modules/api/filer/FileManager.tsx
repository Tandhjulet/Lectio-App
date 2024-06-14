import * as DocumentPicker from 'expo-document-picker';
import RNFS from "react-native-fs";
import { getASPHeaders, SCRAPE_URLS } from '../scraper/Helpers';
import { secureGet } from '../Authentication';
import RNFetchBlob from 'rn-fetch-blob'

export interface LocalDocument {
    uri: string,
    name: string,
    size: number,
    type: string | undefined,
}

export type UploadResult = UploadFailure & {ok: false} | UploadSuccess & {ok: true}

export interface UploadFailure {
    errorMessage?: string,
}

export interface UploadSuccess {
    serializedId: string,
    fileName: string,
    size: number,
}

export async function chooseDocument(): Promise<LocalDocument | null | undefined> {
    const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
    })

    if(result.canceled)
        return undefined;

    if(result.assets.length == 0) return null;

    const { uri, name, size, mimeType } = result.assets[0];

    return {
        uri: decodeURIComponent(uri),
        name,
        size: size ?? -1,
        type: mimeType,
    }
}

export async function uploadFile(document: LocalDocument, binary: string): Promise<string | null> {
    const gymNummer = (await secureGet("gym")).gymNummer;

    const form = new FormData();
    form.append("file", binary);

    const res = await RNFetchBlob.fetch("POST", SCRAPE_URLS(gymNummer).DOCUMENT_UPLOAD, {
        'Content-Type' : 'multipart/form-data',
    }, [
        {
            name: document.name,
            filename: document.name,
            data: binary,
        }
    ])

    try {
        return JSON.parse(res.data).serializedId;
    } catch {
        return null;
    }
}

export async function upload(): Promise<UploadResult> {
    const document = await chooseDocument();
    if(document === null)
        return {
            ok: false,
            errorMessage: "Der opstod en ukendt fejl imens dokumentet blev hentet fra telefonen."
        };
    else if(document === undefined) {
        return {
            ok: false,
        }
    }
    else if(document.size > 50_000_000) // 50 mb
        return {
            ok: false,
            errorMessage: "Filen er for stor (>50 mb)."
        };

    const binary = await RNFS.readFile(document.uri, "base64");
    const id = await uploadFile(document, binary);

    return {
        ok: true,
        fileName: document.name,
        serializedId: id ?? "",
        size: document.size,
    }
}