export type LectioMessage = {
    title: string,
    sender: string,
    editDate: Date | null,

    unread: boolean,
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
        }

        if(message.classList != null && message.classList.includes("unread")) {
            scaffOld.unread = true
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

export type LectioMessageDetailed = {
    body: string,
}