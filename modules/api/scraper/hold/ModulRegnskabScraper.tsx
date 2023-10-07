export type Modulregnskab = {
    team: string,
    afvigelse: string,
    held: number,
    planned: number,
}

export async function modulRegnskabScraper(parser: any): Promise<Modulregnskab | null> {
    const table = parser.getElementById("s_m_Content_Content_afholdtelektionertbl");

    if(table == null)
        return null;

    const data: any[] = table.children[2].children;

    const team = data[0].lastChild.text.trim();
    const afvigelse = data[data.length - 1].firstChild.text;
    const held = parseFloat(data[1].firstChild.text) + parseFloat(data[3].firstChild.text);
    const planned = parseFloat(data[2].firstChild.text) + parseFloat(data[4].firstChild.text);

    return {
        team: team,
        afvigelse: afvigelse,
        held: held,
        planned: planned,
    }
}