import { TextComponent } from "./MessageScraper";
import { replaceHTMLEntities } from "./SkemaScraper";
import * as Sentry from 'sentry-expo';

export interface Component {
    inner: string,
    isLink?: boolean,
    url?: string,
}

export interface Lektie {
    body: Component[],
    isHomework?: boolean,
}

export function scrapeLektier(elements: any[], opts?: {
    isLink?: boolean,
    url?: string,
}): Component[] {
    if(!elements)
        return [];

    const out: Component[] = []

    try {
        elements.forEach((element) => {
            if(element.tagName === "hr" || element.tagName === "br") {
                out.push({
                    inner: "\n",
                })
            } else if(element.tagName !== undefined && (element?.children?.length ?? 0) > 0) {
                const url: undefined | string = element?.attributes?.href ? replaceHTMLEntities(element?.attributes?.href) : undefined;

                out.push(...scrapeLektier(element.children, {
                    isLink: url !== undefined,
                    url,
                }))
            } else {
                out.push({
                    inner: replaceHTMLEntities(element.text),
                    isLink: opts?.isLink,
                    url: opts?.url,
                })
            }
        })
    } catch(err) {
        Sentry.Native.captureException(err);
    }

    return out;
}

export function parseLinks(parser: any) {
    const elements = parser.getElementsByClassName("lc-display-fragment");
    if(elements == null) return [];

    const out: Lektie[] = [];

    elements.forEach((element: any) => {
        const lektier = scrapeLektier(element?.children[0]?.children);
        if(lektier.length === 0)
            return;

        out.push({
            body: lektier,
            isHomework: element?.children[0]?.attributes?.style?.includes("doc-homework") ?? false,
        });
    })

    return out;
}