import { replaceHTMLEntities } from "./SkemaScraper";

export interface Folder {
    subfolders: Folder[],
    name: string,
    id: string,
}

export interface Document {
    date: string,
    fileName: string,
    size: string,
    url: string,
}

export function parseFolders(parser: any): Folder[] {
    function parseFolder(folder: any): Folder {
        function parseSubfolders(folders: any): Folder[] {
            return folders.children.map((folder: any) => parseFolder(folder));
        }

        const name: string = folder.firstChild.lastChild.lastChild.firstChild.text;
        const lec_node_id: string = folder.attributes["lec-node-id"];

        const out: Folder = {
            name: name,
            id: lec_node_id,
            subfolders: folder.children.length === 2 ? parseSubfolders(folder.lastChild) : [],
        }

        return out;
    }

    const folders = parser.getElementById("s_m_Content_Content_FolderTreeView");
    if(folders == null) return [];

    let out: Folder[] = [];
    folders.children.forEach((folder: any) => out.push(parseFolder(folder)));

    return out;
}

export function parseDocuments(parser: any): Document[] {
    const documents = parser.getElementById("s_m_Content_Content_DocumentGridView");

    if(documents == null) return [];

    let out: Document[] = [];
    
    documents.children.forEach((document: any, i: number) => {
        if(i === 0) return;

        let date = document.firstChild.firstChild.text;
        let url = document.children[1].firstChild.attributes.href;
        let name = replaceHTMLEntities(document.children[1].firstChild.lastChild.text);
        let size = document.children[3].firstChild.text;
        if(document.children.length === 8) {
            date = document.children[4].firstChild.text;
            size = document.children[5].firstChild.text;
        }

        out.push({
            date: date,
            fileName: name.trim(),
            size: size,
            url: url,
        })
    })

    return out;
}