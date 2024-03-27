import { StringOmit } from "@rneui/base";

export type LectioMessage = {
    title: string,
    sender: string,
    editDate: Date | null,

    unread: boolean,

    messageId: string,
}

export function scrapeHelper(elements:any, opts?: {
    isLink: boolean,
    url: string,
}): TextComponent[] {
    let out: TextComponent[] = [];

    for(let child of elements) {
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
                        child.classList.includes("bb_u") ||
                        child.classList.includes("message-attachements")
                    ))) // nemt at forstå 
        {
            scrapeHelper(child.children, {
                // if it was already defined as a link dont override, otherwise check
                isLink: opts?.isLink === true ? true : child.tagName === "a",
                url: (child.tagName === "a") ? child.attributes.href : null,
            }).forEach((v) => {
                out.push(v);
            })
        } else {
            const text: string = child.text;
            out.push({
                inner: text,
                isBreakLine: false,
                isLink: opts?.isLink ?? false,
                url: opts?.url ?? null,
            })
        }
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
            editDate: new Date(),

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
        let editDate: Date | null = null;

        const regExpTimespan = message.children[7].firstChild.text.match(new RegExp('\\d{2}:\\d{2}', "gm"));
        if(regExpTimespan != null && regExpTimespan.length >= 2) {
            const start = new Date();
            start.setHours(parseInt(regExpTimespan[0].split(":")[0]))
            start.setMinutes(parseInt(regExpTimespan[0].split(":")[1]))
            editDate = start;
        }

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
    isBreakLine: boolean,
    isLink: boolean,
    url: string | null,
}