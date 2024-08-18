import { Platform } from "react-native";
import SharedGroupPreferences from "react-native-shared-group-preferences";
import { Day } from "./api/scraper/SkemaScraper";
import { getDay } from "./Date";
import Constants from "expo-constants"
import { Timespan } from "./api/helpers/Timespan";
import * as Sentry from 'sentry-expo';

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
    start: number, // will be encoded to a Date by Swift
    end: number,

    title: string,
    status: string,
    _id: string,
    width: number,
    left: number,
}

const appGroupIdentifier = `group.${Constants.expoConfig?.ios?.bundleIdentifier}.widget`

export async function save(key: string, data: WidgetData) {
    if(Platform.OS === "ios") {
        try {
            await SharedGroupPreferences.setItem(key, JSON.stringify(data), appGroupIdentifier)
        } catch(errCode) {
            if(!__DEV__)
                switch(errCode) {
                    case 0:
                        Sentry.Native.captureMessage("There is no suite with that name [App Group, L49]")
                        return;
                    default:
                        Sentry.Native.captureMessage("Invalid error code sent from App Group " + errCode)
                }
            console.log("App Group Error: " + errCode)
        }
    } else {
        throw new Error("Only iOS is supported [Widget]")
    }
}

export async function get(key: string) {
    if(Platform.OS === "ios") {
        try {
            await SharedGroupPreferences.getItem(key, appGroupIdentifier)
        } catch(errCode) {
            if(!__DEV__)
                switch(errCode) {
                    case 0:
                        Sentry.Native.captureMessage("There is no suite with that name [App Group, L49]")
                        return;
                    default:
                        Sentry.Native.captureMessage("Invalid error code sent from App Group " + errCode)
                }
            console.log("App Group Error: " + errCode)
        }
    } else {
        throw new Error("Only iOS is supported [Widget]")
    }
}

export async function saveCurrentSkema(day: Day[]) {
    const now = new Date();

    console.log("before", await get("skema") === undefined);

    const parsePercents = (p: string) => parseInt(p.replace("%", "").trim())/100

    let j = 0;
    const out: WidgetData = day.reduce((a, v) => {
        const currDate = now.getDate();

        const out: EncodedModul[] = []
        v.moduler.forEach((modul) => {
            out.push({
                _id: modul.href + ":" + j++,
                end: formatDate(modul.timeSpan.endNum.toString()).valueOf(),
                start: formatDate(modul.timeSpan.startNum.toString()).valueOf(),
                left: parsePercents(modul.left),
                width: parsePercents(modul.width),
                status: modul.cancelled ? Status[Status.cancelled] : modul.changed ? Status[Status.changed] : Status[Status.normal],
                title: modul.title ?? modul.team.join(", ")
            })
        });

        now.setDate(currDate + 1)
        return { ...a, [currDate]: out}
    }, {})
    
    await save("skema", {...out})
    console.log("after", await get("skema") === undefined);
}