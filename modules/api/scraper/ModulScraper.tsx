export interface Link {
    href: string;
    title: string;
    lektier: boolean;
}

export function assertLinks(extra: string[], lektier: string[]) {

}

export function parseLinks(parser: any) {
    const links = parser.getElementsByClassName("lc-display-fragment");
    if(links == null) return [];

    const parsedLinks: Link[] = []

    links.forEach((link: any) => {
        const style: string | undefined = link?.firstChild?.attributes?.style;

        parsedLinks.push({
            href: link.firstChild.firstChild.attributes.href,
            lektier: style?.includes("doc-homework") ?? true,
            title: link.firstChild.firstChild.firstChild.text,
        })
    })

    return parsedLinks;
}