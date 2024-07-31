export interface Grade {
    fag: string,
    type: "Mundtlig" | "Skriftlig" | "Samlet" | "Ukendt",
    karakterer: {[id: string]: WeightedGrade | undefined},
    weight: string,
}

export interface WeightedGrade {
    grade: string,
    weight: string,
}

export function parseGrades(parser: any): Grade[] {
    const table = parser.getElementById("s_m_Content_Content_karakterView_KarakterGV");
    if(table === null) {
        console.log("table is null")
        return [];
    }

    const out: Grade[] = [];
    const cols: string[] = [];

    table.children.forEach((child: any, i: number) => {        
        if(i == 0) {
            child.children.forEach((col: any, i: number) => {
                if(i < 2) return;

                cols.push(col.firstChild.text.replace(".", ". "));
            })
            
            return;
        };

        const fag = child.children[1].firstChild.text;
        const grades: {[id: string]: WeightedGrade | undefined} = {};

        // ["1. standpunkt", "2. standpunkt", "Eksamen/årsprøve", "Årskarakter"].forEach((v) => {
        //     if(!grades[v]) {
        //         grades[v] = undefined
        //     }
        // })

        child.children.forEach((td: any, i: number) => {
            if(i < 2) return;

            let weight: string = "";
            if(td.firstChild !== undefined) {
                weight = td.firstChild.text;
                const matches = weight.match(/Vægt: (\d*(,|\.)\d*|\d*)/)

                if(matches != null)
                    weight = matches[1];
                else
                    weight = "1"
            }

            let col: string;
            switch(cols[i-2].toLowerCase()) {
                case "eksamens-/":
                case "intern prøve":
                    col = "Eksamen/årsprøve"
                    break;
                case "afsluttende års-/":
                case "årskarakter":
                    col = "Årskarakter"
                    break;
                default:
                    col = cols[i-2]
            }

            const grade = td.firstChild === undefined ? "" : 
                            td.firstChild.firstChild.tagName == "b" ?
                            td.firstChild.firstChild.firstChild.text : td.firstChild.firstChild.text

            if(!grades[col] || grades[col]?.grade == "") {
                grades[col] = {
                    grade,
                    weight,
                }
            }
        })

        out.push(({
            fag: fag.split(", ")[0],
            karakterer: grades,
            type: fag.split(", ")[1] === "SAM" ? "Samlet" : fag.split(", ")[1],
            weight: "",
        }))
    })


    return out;
}