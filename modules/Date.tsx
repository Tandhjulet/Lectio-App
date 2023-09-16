export type WeekDay = {
    dayNumber: number,
    weekDayNumber: number,
    dayName: string,
    isWeekday: boolean,
    date: Date,
}

function dates(date: Date) {
    const current = new Date(date);
    if(current.getDay() == 0)
        current.setDate(date.getDate() - 1);

    var week= new Array(); 
    // Starting Monday not Sunday
    current.setDate((current.getDate() - current.getDay() +1));
    for (var i = 0; i < 7; i++) {
        week.push(
            new Date(current)
        ); 
        current.setDate(current.getDate() +1);
    }
    return week; 
}

export default function getDaysOfWeek(date: Date): WeekDay[] {

    const days: WeekDay[] = []
    const weekDates = dates(date);

    weekDates.forEach((i) => {
        days.push(getDay(i));
    })

    return days;
}

export function getNextWeek(date: Date): Date {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);

    return next;
}

export function getPrevWeek(date: Date): Date {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);

    return next;
}

export function getDay(date: Date): WeekDay {
    const weekday = ["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"];

    const dateName = weekday[date.getDay()];
    const dateNum = date.getDate();


    const correctedWeekdays = ["Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag","Søndag"]

    return { date: date, weekDayNumber: correctedWeekdays.findIndex((dN) => dN === dateName)+1, dayNumber: dateNum, dayName: dateName, isWeekday: (date.getDay() == 6 || date.getDay() == 0) }
}