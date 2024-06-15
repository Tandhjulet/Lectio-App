import { Platform } from "react-native";
import SharedGroupPreferences from "react-native-shared-group-preferences";
import { Day } from "./api/scraper/SkemaScraper";
import { getDay } from "./Date";
import Constants from "expo-constants"
import { Timespan } from "./api/storage/Timespan";

export function formatDate(dateString: string): Date {
    const padded = dateString.padStart(4, "0");
    const minutes = padded.slice(2);
    const hours = padded.slice(0,2);

    const date = new Date();
    date.setMinutes(parseInt(minutes));
    date.setHours(parseInt(hours));

    return date;
}

enum Status {
    changed,
    cancelled,
    normal,
}

type WidgetData = {[id: string]: EncodedModul[]}

interface EncodedModul {
    start: Date,
    end: Date,
    title: string,
    status: Status,
    _id: string,
    width: number,
    left: number,
}

const appGroupIdentifier = `group.${Constants.expoConfig?.ios?.bundleIdentifier}.widget`

export async function save(key: string, data: WidgetData) {
    if(Platform.OS === "ios") {
        await SharedGroupPreferences.setItem(key, JSON.stringify(data), appGroupIdentifier)
    } else {
        throw new Error("Only iOS is supported [Widget]")
    }
}

export async function get(key: string): Promise<WidgetData> {
    if(Platform.OS === "ios") {
        return JSON.parse(await SharedGroupPreferences.getItem(key, appGroupIdentifier));
    } else {
        throw new Error("Only iOS is supported [Widget]")
    }
}

export async function saveCurrentSkema(day: Day[]) {
    const now = new Date();

    let i = now.getDay() == 0 ? 6 : now.getDay()-1;

    const currSaved: WidgetData = await get("skema")
    const keepKeys = Object.fromEntries(Object.keys(currSaved)
                        .filter(s => {
                            // @ts-expect-error
                            const date: string | undefined = currSaved[s][0]?.start
                            return Math.abs(parseInt(s) - now.getDate()) < 7 || (date && new Date(date).valueOf() - now.valueOf() < Timespan.WEEK)
                        }).map((k) => [k, currSaved[k]]))

    const parsePercents = (p: string) => parseInt(p.replace("%", "").trim())/100

    const out: WidgetData = day.slice(i).reduce((a, v) => {
        const currDate = now.getDate();

        const out: EncodedModul[] = []
        v.moduler.forEach((modul) => {
            out.push({
                _id: modul.href,
                end: formatDate(modul.timeSpan.endNum.toString()),
                start: formatDate(modul.timeSpan.startNum.toString()),
                left: parsePercents(modul.left),
                width: parsePercents(modul.width),
                status: modul.cancelled ? Status.cancelled : modul.changed ? Status.changed : Status.normal,
                title: modul.title ?? modul.team.join(", ")
            })
        });

        now.setDate(currDate + 1)
        return { ...a, [currDate]: out}
    }, {}) // no reason to store from previous days

    await save("skema", {...keepKeys, ...out})
}