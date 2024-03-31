import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, useColorScheme, View } from "react-native";
import { getProfile, scrapeBooks } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/Authentication";
import { Book } from "../../modules/api/scraper/BookScraper";
import { hexToRgb, themes } from "../../modules/Themes";
import * as Progress from 'react-native-progress';

export default function Books() {
    const [books, setBooks] = useState<Book[]>();
    const [loading, setLoading] = useState(false);

    const [width, setWidth] = useState<number>(450);

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

    return (
        <ScrollView style={{
            minHeight: "100%",
            minWidth: "100%",
        }}>
            <View style={{
                display: "flex",
                flexDirection: "column",

                gap: 5,

                padding: 20,
            }}>
                {books?.map((book: Book, i) => {
                    const diff = 1-(parseDate(book.afleveringsfrist).valueOf() - new Date().valueOf())/(parseDate(book.afleveringsfrist).valueOf() - parseDate(book.udlånt).valueOf());

                    return (
                        <View
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: theme.ACCENT_BLACK,
                                padding: 15,

                                borderRadius: 10,
                            }}
                            key={i}
                        >
                            <View style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-between"
                            }}>
                                <Text style={{
                                    fontWeight: "bold",
                                    color: hexToRgb(theme.WHITE.toString(), 0.6),
                                    fontSize: 12.5,
                                }}>
                                    {book.hold}
                                </Text>

                                <Text style={{
                                    color: hexToRgb(theme.WHITE.toString(), 0.6),
                                }}>
                                    {book.price} kr
                                </Text>
                            </View>

                            <Text style={{
                                color: scheme === "dark" ? "#FFF" : "#000",
                                fontSize: 15,
                                fontWeight: "500",
                            }}>
                                {book.title}
                            </Text>

                            <View style={{
                                marginTop: 10,

                                display: "flex",
                                gap: 2.5,
                            }}>
                                <View style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    flexDirection: "row",
                                }} onLayout={(e) => {
                                    setWidth(e.nativeEvent.layout.width);
                                }}>
                                    <Text style={{
                                        color: hexToRgb(theme.WHITE.toString(), 0.7),
                                        fontWeight: "bold",
                                    }}>
                                        Lånt
                                    </Text>

                                    <Text style={{
                                        color: hexToRgb(theme.WHITE.toString(), 0.7),
                                        fontWeight: "bold",
                                    }}>
                                        Afleveres
                                    </Text>
                                </View>

                                <Progress.Bar
                                    width={width}

                                    color={theme.LIGHT.toString()}
                                    unfilledColor={hexToRgb(theme.WHITE.toString(), 0.2)}
                                    borderWidth={0}
                                    progress={diff}
                                    
                                />

                                <View style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    flexDirection: "row",
                                }} onLayout={(e) => {
                                    setWidth(e.nativeEvent.layout.width);
                                }}>
                                    <Text style={{
                                        color: hexToRgb(theme.WHITE.toString(), 0.7),
                                    }}>
                                        {parseDate(book.udlånt).toLocaleDateString("da-DK", {
                                            month: "short",
                                            day: "2-digit",
                                            year: "numeric",
                                        })}
                                    </Text>

                                    <Text style={{
                                        color: hexToRgb(theme.WHITE.toString(), 0.7),
                                    }}>
                                        {parseDate(book.afleveringsfrist).toLocaleDateString("da-DK", {
                                            month: "short",
                                            day: "2-digit",
                                            year: "numeric",
                                        })}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )
                })}
            </View>
        </ScrollView>
    )
}