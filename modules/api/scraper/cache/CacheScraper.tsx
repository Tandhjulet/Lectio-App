import { Person } from "../class/ClassPictureScraper";

export type CacheParams = {
    type: "bcstudent" | "bcteacher" | "bchold" | "bcgroup" | "favorites"
    year?: number,
    afdeling?: number,
    dt?: number,
}

export function stringifyCacheParams(params: CacheParams): string {
    let out: string[] = [];

    params.afdeling == undefined ? "" : out.push("afdeling=" + params.afdeling);
    params.dt == undefined ? "" : out.push("dt=" + params.dt);
    out.push("type=" + params.type);
    params.year == undefined ? "" : out.push("subcache=y" + params.year);

    return out.join("&");
}

export async function scrapePeople(stringifiedData: string): Promise<Person[]> {
    const cleanedData = stringifiedData.replace(/.*= /, "").replaceAll("\",, ", "\", null,").replace(";", "");

    const out: Person[] = [];
    const getTypeFromLetter = (letter: string): "LÆRER" | "ELEV" => {
        if(letter.toUpperCase() == "T") return "LÆRER"
        if(letter.toUpperCase() == "S") return "ELEV"
        return "ELEV"
    }

    const parsedData = JSON.parse(cleanedData);
    parsedData.forEach((stringifiedPerson: string) => {
        const name = stringifiedPerson[0].split(" (")[0]
        const id = stringifiedPerson[1].slice(1);
        const type = getTypeFromLetter(stringifiedPerson[1].slice(0, 1))

        out.push({
            navn: name,
            type: type,
            personId: id,
        })
    })

    return out;
}