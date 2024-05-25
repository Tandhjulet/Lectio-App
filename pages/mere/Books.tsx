import { useCallback, useEffect, useRef, useState } from "react";
import { ColorSchemeName, Dimensions, ScrollView, Text, useColorScheme, View } from "react-native";
import { getProfile, scrapeBooks } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/Authentication";
import { Book } from "../../modules/api/scraper/BookScraper";
import { hexToRgb, themes } from "../../modules/Themes";
import * as Progress from 'react-native-progress';
import { ShieldExclamationIcon, SwatchIcon } from "react-native-heroicons/outline";

export default function Books() {
    const [books, setBooks] = useState<Book[]>();
    const [loading, setLoading] = useState(false);

    const now = useRef(new Date().valueOf()).current;

    const {width} = Dimensions.get("screen")

    useEffect(() => {
        setLoading(true);
        (async () => {
            const { gymNummer } = await secureGet("gym");
            const profile = await getProfile();

            const books = await scrapeBooks(gymNummer, profile.elevId);
            setBooks(books);
            setLoading(false);
        })();
    }, [])

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const parseDate = useCallback((date: string) => {
        const parts = date.split("-");
        return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]))
    }, [])

            
    /**
     * Calculates color from a linear gradient ([255,0,0] to [255,252,0]) 
     * depending on how soon the assignment is due. If the assignment is due in more than 14 days it will
     * return white.
     * @param date date to calculate color from
     * @returns a color
     */
    const calculateColor = useCallback((diff: number) => {  
        const COLOR2 = [252, 83, 83]
        const COLOR1 = [0, 201, 114]

        const res = [
            COLOR1[0] + diff * (COLOR2[0] - COLOR1[0]),
            COLOR1[1] + diff * (COLOR2[1] - COLOR1[1]),
            COLOR1[2] + diff * (COLOR2[2] - COLOR1[2]),
        ]

        return `rgb(${res[0]}, ${res[1]}, ${res[2]})`;
    }, [theme]);

    /**
     * 
     * @param date a date of an assignment
     * @returns a text depending on how long there is until the assignment is due
     */
    const countdown = useCallback((dateString: string, date: number) => {

        const diff = date - now;
        const weeks = Math.floor(diff / (1000*60*60*24*7));
        const days = Math.floor((diff % (1000*60*60*24*7)) / (1000*60*60*24));
        if(diff <= 0 || weeks > 4*3) // 3 mdr.
            return "Afleveres d. " + dateString

        const out: string[] = [];
        if(weeks > 0)
            out.push(weeks == 1 ? weeks + " uge" : weeks + " uger")

        if(days > 0)
            out.push(days == 1 ? days + " dag" : days + " dage")

        return out.join(" og ") + " tilbage"
    }, [])

    return (
        <ScrollView style={{
            minHeight: "100%",
            minWidth: "100%",
        }}>
            <View style={{
                display: "flex",
                flexDirection: "column",

                gap: 7.5,

                padding: 20,
            }}>
                {books?.map((book: Book, i) => {
                    const aflrFrist = parseDate(book.afleveringsfrist);
                    const diff = 1-(aflrFrist.valueOf() - now)/(aflrFrist.valueOf() - parseDate(book.udlånt).valueOf());
                    const color = calculateColor(diff).toString();

                    const skalAfleveres = countdown(aflrFrist.toLocaleDateString("da-DK", {
                        dateStyle: "long",
                    }), aflrFrist.valueOf());

                    let Icon;
                    if(diff < 0.66) {
                        Icon = SwatchIcon
                    } else {
                        Icon = ShieldExclamationIcon
                    }

                    return (
                        <View
                            style={{
                                display: "flex",
                                flexDirection: "row",

                                backgroundColor: theme.ACCENT_BLACK,
                                paddingVertical: 12.5,
                                paddingRight: 15,
                                paddingLeft: 7.5,
                                borderRadius: 10,
                                gap: 10,

                                width: "100%",
                                overflow: "hidden",
                            }}
                            key={i}
                        >
                            <View style={{
                                height: "100%",
                                alignItems: "center",
                                flexDirection: "row",
                            }}>
                                <View style={{
                                    padding: 4,
                                    backgroundColor: hexToRgb(diff < 0.66 ? theme.ACCENT.toString() : theme.RED.toString(), 0.12),
                                    borderRadius: 50,
                                }}>
                                    <Icon size={27.5} color={color} />
                                </View>
                            </View>
                            
                            <View style={{
                                flexDirection: "column"
                            }}>
                                <View style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    width: width - 20*2 - 35 - 10 - 4*2,
                                    justifyContent: "space-between",
                                    flexWrap: "nowrap",
                                }}>
                                    <Text style={{
                                        color: theme.WHITE,
                                        fontWeight: "900",
                                        maxWidth: width - 20*2 - 35 - 10 - 4*2 - 80,
                                    }} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={2}>
                                        {book.title}
                                    </Text>

                                    <View style={{
                                        paddingRight: 10,
                                    }}>
                                        <Text style={{
                                            color: hexToRgb(theme.WHITE.toString(), 0.7),
                                        }}>
                                            {book.price} kr
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                }}>
                                    <View style={{
                                        flexDirection: "column",
                                    }}>
                                        <Text style={{
                                            color: hexToRgb(theme.WHITE.toString(), 0.7),
                                            fontWeight: "600",
                                        }}>
                                            Hold: {book.hold}
                                        </Text>

                                        <View style={{
                                            flexGrow: 1,
                                        }} />

                                        <Text style={{
                                            color: color,
                                        }}>
                                            {skalAfleveres}
                                        </Text>

                                        <Text style={{
                                            color: hexToRgb(theme.WHITE.toString(), 0.3),
                                            fontWeight: "400",
                                            marginTop: 3,
                                        }}>
                                            Udlånt: <Text style={{
                                                fontWeight: "500",
                                                color: hexToRgb(theme.WHITE.toString(), 0.4),
                                            }}>{book.udlånt}</Text>
                                        </Text>
                                    </View>

                                    <View style={{
                                        paddingTop: 8,
                                        paddingRight: 15,
                                    }}>
                                            <View style={{
                                                borderRadius: 999,
                                                borderColor: color,
                                                borderWidth: 2,

                                                position: "relative"
                                            }}>
                                                <Progress.Pie
                                                    size={60}
                                                    progress={diff}
                                                    color={hexToRgb(color)}
                                                    style={{
                                                        opacity: 0.2,
                                                    }}
                                                    borderWidth={1}
                                                />

                                                <View style={{
                                                    position: "absolute",
                                                    width: 30*2, // width and width of chart is 60 if radius is 30
                                                    height: 30*2,

                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                }}>
                                                    <Text style={{
                                                        color: color,
                                                        fontFamily: "bold",
                                                        letterSpacing: 1,

                                                        fontSize: 12.5,
                                                    }}>
                                                        {(diff*100).toFixed(0)}%
                                                    </Text>
                                                </View>
                                            </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )
                })}
            </View>
        </ScrollView>
    )
}