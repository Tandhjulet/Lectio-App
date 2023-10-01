import { getUnsecure, removeUnsecure, saveUnsecure } from "../../Authentication";
import { Person, scrapeStudentPictures } from "./ClassPictureScraper";
import { Klasse, getClasses } from "./ClassScraper";

export async function getPeople(): Promise<{ [id: string]: Person } | null> {
    const done = async (res: { [id: string]: Person }) => {
        await removeUnsecure("peopleListBackup");
        await saveUnsecure("peopleList", res)
    }

    const savedPeopleList: { [id: string]: Person } = await getUnsecure("peopleList");
    if(savedPeopleList != null)
        return savedPeopleList;

    const klasser = await getClasses();
    if(klasser == null)
        return null;

    let out: { [id: string]: Person } = {}

    const oldData: {stage: number, data: { [id: string]: Person }} = await getUnsecure("peopleListBackup");
    if(oldData)
        out = oldData.data;

    let ERROR = false;

    for(let i = (oldData == null ? 0 : oldData.stage); i < klasser.length; i++) {
        setTimeout(async () => {
            if(ERROR)
                return;

            const cId = klasser[i].classId;

            const pictureData = (await scrapeStudentPictures(cId));
            if(pictureData == null) {
                // save current stage. probably rate limited?
                await saveUnsecure("peopleListBackup", { stage: i, data: out })

                //console.log("rate limited")

                ERROR = true;
                return;
            }
            out = {...out, ...pictureData};

            if(i + 1 == klasser.length) {
                done(out);
            } /*else {
                console.log("Scraped class " + klasser[i].name + " (" + i + ")")
            }*/
        }, ((i - (oldData == null ? 0 : oldData.stage)) + 1) * 2000)
    }

    return null;
}