import { memo, useCallback, useEffect, useState } from "react"
import { getProfile, scrapeGrades } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/Authentication";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Grade } from "../../modules/api/scraper/GradeScraper";
import { hexToRgb, Theme, themes } from "../../modules/Themes";

const Cell = memo(function Cell({ grade, theme }: {
    grade: Grade,
    theme: Theme,
}) {

    const fag = grade.fag.replace(/ [ABC]$/g, (match, tag) => match.replace(" ", "\xa0"));

    return (
        <View style={{
            display: "flex",
            flexDirection: "row",

            borderBottomColor: theme.ACCENT_BLACK,
            borderBottomWidth: StyleSheet.hairlineWidth,
        }}>
            <View style={{
                backgroundColor: theme.LIGHT,
                paddingVertical: 20,
                paddingHorizontal: 15,

                width: "35%",

                display: "flex",
                flexDirection: "column",

                alignItems: "center",

                borderRightColor: hexToRgb(theme.WHITE.toString(), 0.2),
                borderRightWidth: 1,
            }}>
                <Text
                    style={{
                        color: theme.DARK,
                        fontWeight: "600",
                        fontSize: 12.5,
                    }}
                >
                    {grade.type}
                </Text>

                <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.3}
                    numberOfLines={fag.split(" ").length}

                    style={{
                        color: theme.WHITE,
                        fontWeight: "bold",
                        fontSize: 15,
                        letterSpacing: 0.4,
                        textAlign: "center",

                        flexShrink: 1,
                    }}
                >
                    {fag}
                </Text>
            </View>

            <View style={{
                width: "65%",

                display: "flex",
                flexDirection: "row",

                borderBottomColor: hexToRgb(theme.LIGHT.toString(), 0.6),
                borderBottomWidth: StyleSheet.hairlineWidth,
            }}>
                {Object.keys(grade.karakterer).map((title, index) => { 
                    const width = (1/Object.keys(grade.karakterer).length)*100;

                    return (
                        <View key={title + index} style={{
                            width: `${width}%`,

                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",

                            borderRightColor: hexToRgb(theme.WHITE.toString(), 0.2),
                            borderRightWidth: Object.keys(grade.karakterer).length-1 !== index ? 1 : 0,
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                textAlign: "center",

                                fontSize: 17.5,
                                fontWeight: "bold",
                            }}>
                                {grade.karakterer[title].grade}
                            </Text>

                            <Text style={{
                                color: hexToRgb(theme.WHITE.toString(), 0.8),
                                fontSize: 14,
                            }}>
                                {grade.karakterer[title].weight === "" ? "" : `(${parseFloat(grade.karakterer[title].weight.replace(",", ".")).toFixed(2).replace(".", ",")})`}
                            </Text>
                        </View>
                    )
                })}
            </View>
        </View>
    )
})

export default function Grades() {

    const [grades, setGrades] = useState<Grade[]>();

    const [ loading, setLoading ] = useState<boolean>(true);
    const [ refreshing, setRefreshing ] = useState<boolean>(false);

    const calculateAverage: (title: string, weighted?: boolean) => string = useCallback((title: string, weighted: boolean = true) => {

        let accumulator: number = 0;
        let unique: number = 0;

        grades?.forEach((grade: Grade) => {
            if(grade.karakterer[title].grade == "") return;

            const weight = parseFloat(grade.karakterer[title].weight.replace(",", "."));
            const gradeInt = parseInt(grade.karakterer[title].grade);

            accumulator += weighted ? gradeInt * weight : gradeInt;
            weighted ? unique += weight : unique++;
        })
        return (accumulator / (unique === 0 ? 1 : unique)).toFixed(2).replace(".", ",");
    }, [grades]);

    useEffect(() => {
        (async () => {
            const { gymNummer } = await secureGet("gym");
            const profile = await getProfile();

            const grades = await scrapeGrades(gymNummer, profile.elevId);
            setGrades(grades);

            setLoading(false);
        })();
    }, [])

    useEffect(() => {
        if(!refreshing) return;

        (async () => {
            const { gymNummer } = await secureGet("gym");
            const profile = await getProfile();

            const grades = await scrapeGrades(gymNummer, profile.elevId, true);
            setGrades(grades);
            setRefreshing(false);
        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View>
            <ScrollView style={{
                minHeight: "100%",
                minWidth: "100%",
            }} refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                {loading ? 
                    <View style={{
                        marginTop: "50%",
                    }}>
                        <ActivityIndicator size={"small"} />
                    </View>
                    :
                    <>
                        <View style={{
                            display: "flex",
                            flexDirection: "row",
                        }}>
                            <View style={{
                                paddingVertical: 15,

                                width: "35%",

                                display: "flex",
                                flexDirection: "column",

                                alignItems: "center",
                                backgroundColor: theme.ACCENT_BLACK,
                            }}>
                                <View style={{
                                    borderRightColor: hexToRgb(theme.WHITE.toString(), 0.2),
                                    borderRightWidth: 1,
                                    width: "100%",
                                    paddingHorizontal: 15,
                                    paddingVertical: 5,
                                }}>
                                    <Text
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.3}

                                        style={{
                                            color: theme.WHITE,
                                            fontWeight: "bold",
                                            fontSize: 15,
                                            letterSpacing: 0.4,
                                            textAlign: "center",

                                            flexShrink: 1,
                                        }}
                                    >
                                        Fag
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                display: "flex",
                                flexDirection: "row",
                                width: "65%",

                                borderBottomColor: hexToRgb(theme.LIGHT.toString(), 0.6),
                                borderBottomWidth: StyleSheet.hairlineWidth,

                                backgroundColor: theme.ACCENT_BLACK,
                            }}>
                                {grades && Object.keys(grades[0].karakterer).map((title, index) => { 
                                    const width = (1/Object.keys(grades[0].karakterer).length)*100;

                                    return (
                                        <View key={title + index + "header"} style={{
                                            width: `${width}%`,

                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}>
                                            <View style={{
                                                borderRightColor: hexToRgb(theme.WHITE.toString(), 0.2),
                                                borderRightWidth: Object.keys(grades[0].karakterer).length-1 !== index ? 1 : 0,
                                                width: "100%",
                                                paddingVertical: 5,
                                                paddingHorizontal: 5,
                                            }}>
                                                <Text style={{
                                                    color: theme.WHITE,
                                                    textAlign: "center",
                                                }} numberOfLines={title.split(" ").length} adjustsFontSizeToFit minimumFontScale={0.6}>
                                                    {title}
                                                </Text>
                                            </View>
                                        </View>
                                    )
                                })}
                            </View>
                        </View>

                        <View style={{
                            display: "flex",
                            flexDirection: "column",
                        }}>
                            {grades?.map((grade: Grade, i: number) => <Cell key={i} grade={grade} theme={theme} />)}
                        </View>

                        <View style={{
                            display: "flex",
                            flexDirection: "row",

                            backgroundColor: hexToRgb(theme.WHITE.toString(), 0.15),
                            alignItems: "center"
                        }}>
                            <View style={{
                                paddingVertical: 20,

                                width: "35%",

                                display: "flex",
                                flexDirection: "column",

                                alignItems: "center",

                                gap: 7.5,

                            }}>
                                <View style={{
                                    borderRightColor: hexToRgb(theme.WHITE.toString(), 0.2),
                                    borderRightWidth: 1,    
                                    width: "100%",
                                    paddingHorizontal: 15,
                                }}>
                                    <Text style={{
                                        color: theme.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 15,

                                        textAlign: "center",
                                    }}>
                                        Vægtet gennemsnit
                                    </Text>

                                    <Text style={{
                                        color: hexToRgb(theme.WHITE.toString(), 0.8),
                                        fontSize: 14,
                                        textAlign: "center",
                                    }}>
                                        (uvægtet)
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                display: "flex",
                                flexDirection: "row",
                                width: "65%",
                            }}>
                                {grades && Object.keys(grades[0].karakterer).map((title, index) => {
                                    const width = (1/Object.keys(grades[0].karakterer).length)*100;

                                    return (
                                        <View key={title + index + "footer"} style={{
                                            width: `${width}%`,

                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",

                                            flexDirection: "column",

                                            borderRightColor: hexToRgb(theme.WHITE.toString(), 0.2),
                                            borderRightWidth: Object.keys(grades[0].karakterer).length-1 !== index ? 1 : 0,
                                        }}>
                                            <Text style={{
                                                color: theme.WHITE,
                                                fontWeight: "bold",
                                                fontSize: 20,
                                            }}>
                                                {calculateAverage(title)}
                                            </Text>
                                            
                                            <Text style={{
                                                color: hexToRgb(theme.WHITE.toString(), 0.8),
                                                fontSize: 14,
                                            }}>
                                                ({calculateAverage(title, false)})
                                            </Text>
                                        </View>
                                    )
                                })}
                            </View>

                        </View>

                        <View style={{
                            paddingBottom: 89,
                        }} />
                    </>
                }
            </ScrollView>
        </View>
    )
}