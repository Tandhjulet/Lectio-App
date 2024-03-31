export interface Book {
    title: string,
    hold: string,
    udlånt: string,
    afleveringsfrist: string,
    price: string,
}

export function parseBooks(parser: any): Book[] {
    const table = parser.getElementById("s_m_Content_Content_BdBookLoanGV");
    if(table == null)
        return [];

    const out: Book[] = []

    table.children.forEach((book: any, i: number) => {
        if(i == 0) return;

        out.push({
            title: book.firstChild.firstChild.text,
            hold: book.children[1].firstChild.firstChild.text,
            udlånt: book.children[2].firstChild.text,
            afleveringsfrist: book.children[4].firstChild.text,
            price: book.lastChild.firstChild.text,
        })
    })

    return out;
}