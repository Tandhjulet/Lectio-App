import { getUnsecure, removeUnsecure, saveUnsecure, secureGet } from "../../Authentication";
import { Timespan } from "../../storage/Timespan";
import { Person, scrapeStudentPictures } from "./ClassPictureScraper";
import { Klasse, getClasses } from "./ClassScraper";
import NetInfo from "@react-native-community/netinfo";

let IDS: number[] = []

enum InterruptReason {
    RATELIMITED,
    NO_INTERNET,
}

const unsubscribe = NetInfo.addEventListener((state) => {
    if(ERROR === InterruptReason.NO_INTERNET && state.isConnected) {
        ERROR = undefined;
        scrapePeople();
    }
})

let ERROR: InterruptReason | undefined;
export async function scrapePeople(force: boolean = false) {

    const lastScrape: {date: number} | null = await getUnsecure("lastScrape");
    const gym = await secureGet("gym");

    if(!force && lastScrape != null && (new Date().valueOf() < (lastScrape.date + Timespan.DAY * 7)))
        return;

    const done = async (res: { [id: string]: Person }) => {
        await removeUnsecure("peopleListBackup");
        await saveUnsecure("peopleList", res)

        await saveUnsecure("lastScrape", { date: new Date().valueOf() })

        unsubscribe();
    }

    const klasser = await getClasses();
    if(klasser == null)
        return null;

    let out: { [id: string]: Person } = {}

    const oldData: {stage: number, data: { [id: string]: Person }} = await getUnsecure("peopleListBackup");
    if(oldData)
        out = oldData.data;

    IDS = [];
    for(let i = (oldData == null ? 0 : oldData.stage); i < klasser.length; i++) {
        IDS.push(setTimeout(async () => {
            if(ERROR)
                return;

            const { isConnected } = await NetInfo.fetch();
            if(!isConnected) { // no internet connection
                await saveUnsecure("peopleListBackup", { stage: i, data: out })

                ERROR = InterruptReason.NO_INTERNET;
                return;
            }

            const pictureData = (await scrapeStudentPictures(klasser[i].classId, klasser[i].name, gym));
            if(pictureData == null) {
                // save current stage. probably rate limited?
                await saveUnsecure("peopleListBackup", { stage: i, data: out })

                ERROR = InterruptReason.RATELIMITED;
                return;
            }
            out = {...out, ...pictureData};

            if(i + 1 == klasser.length) {
                done(out);
            } else {
                // save current stage in case app gets shut down.
                await saveUnsecure("peopleListBackup", { stage: i, data: out })
                //console.log("Saved stage " + i + "/" + klasser.length)
            }
        }, ((i - (oldData == null ? 0 : oldData.stage)) + 1) * 1250))
    }
}

export async function abort() {
    IDS.forEach((id: number) => {
        clearTimeout(id);
    })
}

export async function getPeople(): Promise<{ [id: string]: Person } | null> {
    const savedPeopleList: { [id: string]: Person } = await getUnsecure("peopleList");
    if(savedPeopleList != null)
        return savedPeopleList;

    return (await getUnsecure("peopleListBackup")).data;
}