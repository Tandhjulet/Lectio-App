import { replaceHTMLEntities } from "./SkemaScraper";

export interface Lokale {
    title: string,
    status: "LEDIGT" | "I BRUG"
}

export function scrapeLokaler(parser: any) {
    const out: Lokale[] = []

    let i = 0;
    let element;
    while((element = parser.getElementById("printSingleControl" + i++)) != null) {
        try {
            const status = element.lastChild.lastChild.children.length == 1 ? "LEDIGT" : "I BRUG"
            const title: string = replaceHTMLEntities(element.firstChild.firstChild.firstChild.firstChild.firstChild.text.replace("Lokale ", ""));

            out.push({
                title,
                status
            })
        } catch {
            break;
        }

    }

    return out;
}