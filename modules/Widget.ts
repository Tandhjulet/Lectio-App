import { Platform } from "react-native";
import SharedGroupPreferences from "react-native-shared-group-preferences";
import { Day } from "./api/scraper/SkemaScraper";
import { formatDate } from "../pages/Skema";
import { getDay } from "./Date";

enum Status {
    changed,
    cancelled,
    normal,
}

type WidgetData = {[id: string]: EncodedModul}

interface EncodedModul {
    start: Date,
    end: Date,
    title: string,
    status: Status,
    _id: string,
    width: number,
    left: number,
}

const group = "group.widget";

export async function save(key: string, data: WidgetData) {
    if(Platform.OS === "ios") {
        await SharedGroupPreferences.setItem(key, data, group)
    } else {
        throw new Error("Only iOS is supported [Widget]")
    }
}

export async function get<T>(key: string): Promise<T> {
    if(Platform.OS === "ios") {
        return await SharedGroupPreferences.getItem(key, group);
    } else {
        throw new Error("Only iOS is supported [Widget]")
    }
}

export async function saveCurrentSkema(day: Day[]) {
    const now = new Date();

    let i = now.getDay() == 0 ? 6 : now.getDay()-1;
    const parsePercents = (p: string) => parseInt(p.replace("%", "").trim())/100

    const out: WidgetData = day.slice(i).reduce((a, v) => {
        const copy = now;

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
        now.setDate(now.getDate() + 1)

        return { ...a, [getDay(copy).dayNumber]: out}
    }, {}) // no reason to store from previous days
    console.log(out);

    await save("skema", out)
}