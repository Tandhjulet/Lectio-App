export interface Grade {
    fag: string,
    type: string[],
    karakterer: {[id: string]: WeightedGrade}[],
}

export interface WeightedGrade {
    grade: string,
    weight: string,
}

export function parseGrades(parser: any): Grade[] {
    const table = parser.getElementById("s_m_Content_Content_karakterView_KarakterGV");
    if(table === null)
        return [];

    const out: {[id: string]: Grade} = {};
    const cols: string[] = [];

    table.children.forEach((child: any, i: number) => {        
        if(i == 0) {
            child.children.forEach((col: any, i: number) => {
                if(i < 2) return;

                cols.push(col.firstChild.text === "Afsluttende års-/" ? "Afsluttende" : col.firstChild.text.replace(".", ". "));
            })
            
            return;
        };

        const fag = child.children[1].firstChild.text;
        const grades: {[id: string]: WeightedGrade} = {}
        child.children.forEach((td: any, i: number) => {
            if(i < 2) return;

            let weight: string = "";
            if(td.firstChild !== undefined) {
                weight = td.firstChild.text;
                const matches = weight.match(/KarakterVægt: (\d*(,|\.)\d*|\d*)/)

                if(matches != null)
                    weight = matches[1];
            }

            grades[cols[i-2]] = {
                grade: td.firstChild === undefined ? "" : td.firstChild.firstChild.text,
                weight: weight,
            }
        })

        const fagNavn = fag.split(", ")[0];
        if(!out[fagNavn]) {
            out[fagNavn] = {
                fag: fag.split(", ")[0],
                karakterer: [grades],
                type: [fag.split(", ")[1] === "SAM" ? "Samlet" : fag.split(", ")[1]],
            }
        } else {
            out[fagNavn].type.push(fag.split(", ")[1] === "SAM" ? "Samlet" : fag.split(", ")[1]);
            out[fagNavn].karakterer.push(grades);
        }
    })

    return Object.values(out);
}