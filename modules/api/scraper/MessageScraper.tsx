import { StringOmit } from "@rneui/base";
import { SCRAPE_URLS } from "./Helpers";
import { replaceHTMLEntities } from "./SkemaScraper";

export type LectioMessage = {
    title: string,
    sender: string,
    editDate: string,

    unread: boolean,

    messageId: string,
}

export function scrapeHelper(elements:any, opts?: {
    isLink: boolean,
    isItalic: boolean,
    isBold: boolean,
    isUnderlined: boolean,
    url: string,
}): TextComponent[] {
    let out: TextComponent[] = [];

    for(let child of elements) {
        //if(child.classList.includes("message-attachements")) continue;

        if(child.tagName == "br") {
            out.push({
                inner: "",
                isBreakLine: true,
                isLink: false,
                url: null,
            })
        } else if ( child.tagName == "a" ||
                    (child.classList != null && (
                        child.classList.includes("bb_b") ||
                        child.classList.includes("bb_i") ||
                        child.classList.includes("bb_u")
                    ))) { // nemt at forstå 
            scrapeHelper(child.children, {
                // if it was already defined as a link dont override, otherwise check
                isLink: opts?.isLink === true ? true : child.tagName === "a",
                isBold: opts?.isLink === true ? true : (child.classList != null && child.classList.includes("bb_b")),
                isItalic: opts?.isLink === true ? true : (child.classList != null && child.classList.includes("bb_i")),
                isUnderlined: opts?.isLink === true ? true : (child.classList != null && child.classList.includes("bb_u")),
                url: (child.tagName === "a") ? child.attributes.href : null,
            }).forEach((v) => {
                out.push(v);
            })
        } else if (child.classList != null && child.classList.includes("message-attachements")) {
            const parent = child;
            child.children.forEach((child: any, i: number) => {
                if(i%2 !== 0) return;

                if(child.tagName === "a") {
                    out.push({
                        inner: child.firstChild.text,
                        size: parent.children[i+1].text.replace(", ", "").trim(),
                        isFile: true,
                        url: "https://www.lectio.dk" + replaceHTMLEntities(child.attributes.href),
                    })
                }
            })
        } else {
            const text: string = child.text;
            out.push({
                inner: text,
                isLink: opts?.isLink,
                url: opts?.url ?? null,
                isBold: opts?.isBold,
                isItalic: opts?.isItalic,
                isUnderlined: opts?.isUnderlined,
            })
        }
    }

    if(!!out[out.length-1].isFile) {
        let i = 0;
        out.forEach((v) => {
            if(v.isFile) i++;
        })

        out = [
            ...out.slice(0, out.length - 2 - i),
            ...out.slice(out.length - i)
        ];
    }
    return out;
}

export async function scrapeMessage(parser: any): Promise<ThreadMessage[] | null> {
    const table = parser.getElementsByClassName("ls-table-layout")[0];

    if(table == null) {
        return null;
    }

    const data = table.children;
    const out: ThreadMessage[] = [];

    data.forEach((message: any, index: number) => {
        if(index == data.length - 1)
            return; // last index is answer field

        const gridRowMessage = message.firstChild.firstChild;

        const sender: string = gridRowMessage.firstChild.firstChild.firstChild.text.trim();
        const time: string = gridRowMessage.firstChild.lastChild.text.trim();

        const body: TextComponent[] = scrapeHelper(gridRowMessage.lastChild.firstChild.firstChild.lastChild.children);
        const title: string = gridRowMessage.lastChild.firstChild.firstChild.firstChild.firstChild.lastChild.firstChild.text;

        out.push({
            body: body,
            date: time.replace(", ", ""),
            sender: sender,
            title: title,
        })
    })

    return out;
}

export async function scrapeMessages(parser: any): Promise<LectioMessage[] | null> {
    const table = parser.getElementsByClassName("highlightarea")[0];

    if(table == null) {
        return null;
    }

    const tableData = table.children;
    const out: LectioMessage[] = [];

    tableData.forEach((message: any, index: number) => {
        if(index == 0)
            return;

        const scaffOld: LectioMessage = {
            title: "",
            sender: "",
            editDate: "",

            unread: false,
            messageId: "",
        }

        if(message.classList != null && message.classList.includes("unread")) {
            scaffOld.unread = true
        }

        const onclickId: string = message.children[3].firstChild.firstChild.attributes.onclick;
        const idMatches = onclickId.match(new RegExp(/_MC_\$_\d+?&#/))
        if(idMatches != null) {
            scaffOld.messageId = idMatches[0].replace("_MC_$_", "").replace("&#", "");
        }

        const title: string = message.children[3].firstChild.firstChild.firstChild.text;
        const sender: string = message.children[5].firstChild.attributes.title;


        let editDate: string = message.children[7].firstChild.text;
        if(editDate.includes(":"))
            editDate =  editDate.replace("ma", "i mandags,")
                                .replace("ti", "i tirsdags,")
                                .replace("on", "i onsdags,")
                                .replace("to", "i torsdags,")
                                .replace("fr", "i fredags,")
                                .replace("lø", "i lørdags,")
                                .replace("sø", "i søndags,")

        if(!editDate.startsWith("i ") && editDate.includes(":")) editDate = "i dag, " + editDate;
        

        scaffOld.title = title;
        scaffOld.sender = sender;
        scaffOld.editDate = editDate;

        out.push(scaffOld)
    });

    return out;
}

export type ThreadMessage = {
    sender: string,
    date: string,
    title: string,
    body: TextComponent[],
}

export type TextComponent = {
    inner: string | null,
    isBreakLine?: boolean,
    isLink?: boolean,
    isBold?: boolean,
    isItalic?: boolean,
    isUnderlined?: boolean,
    isFile?: boolean,
    size?: string,
    url: string | null,
}