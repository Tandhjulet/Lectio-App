import { Fragment, memo, useCallback, useEffect, useState } from "react"
import { getProfile, Profile, scrapeGrades } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/helpers/Storage";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Grade } from "../../modules/api/scraper/GradeScraper";
import { hexToRgb, Theme, themes } from "../../modules/Themes";
import { Hold } from "../../modules/api/scraper/hold/HoldScraper";
import Logo from "../../components/Logo";

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
                backgroundColor: hexToRgb(theme.LIGHT.toString(), 1),
                paddingVertical: 5,
                paddingHorizontal: 6,

                height: 62,

                width: "35%",

                display: "flex",
                flexDirection: "column",

                alignItems: "center",
                justifyContent: "center"
            }}>
                <Text
                    ellipsizeMode="tail"
                    numberOfLines={2}

                    adjustsFontSizeToFit
                    minimumFontScale={0.3}

                    style={{
                        color: theme.WHITE,
                        fontWeight: "bold",
                        fontSize: 14,
                        letterSpacing: 0.4,
                        textAlign: "center",
                    }}
                >
                    {fag}
                </Text>

                <Text
                    style={{
                        color: theme.DARK,
                        fontWeight: "600",
                        fontSize: 12.5,
                    }}
                >
                    {grade.type}
                </Text>
            </View>

            <View style={{
                width: "65%",

                display: "flex",
                flexDirection: "row",

                borderBottomColor: hexToRgb(theme.WHITE.toString(), 0.2),
                borderBottomWidth: StyleSheet.hairlineWidth,
            }}>
                {["1. standpunkt", "2. standpunkt", "Eksamen/årsprøve", "Årskarakter"].map((title, index) => { 
                    return (
                        <View key={title + index} style={{
                            width: "25%",

                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <Text style={{
                                color: theme.WHITE,
                                textAlign: "center",

                                fontSize: 15,
                                fontWeight: "600",
                            }}>
                                {grade.karakterer[title]?.grade}
                            </Text>

                            <Text style={{
                                color: hexToRgb(theme.WHITE.toString(), 0.5),
                                fontSize: 11,
                            }}>
                                {(!grade.karakterer[title] || grade.karakterer[title]?.weight === "") ? "" : `(${parseFloat(grade.karakterer[title].weight.replace(",", ".")).toFixed(2).replace(".", ",")})`}
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
            if(!grade.karakterer[title] || grade.karakterer[title].grade == "") return;

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

            await scrapeGrades(gymNummer, profile.elevId, (data) => {
                setGrades(data ?? []);
                setLoading(false);
            });
        })();
    }, [])

    useEffect(() => {
        if(!refreshing) return;

        (async () => {
            const { gymNummer } = await secureGet("gym");
            const profile = await getProfile();

            await scrapeGrades(gymNummer, profile.elevId, (data) => {
                setGrades(data ?? []);
                setRefreshing(false);
            }, true);
        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View style={{
            maxHeight: "100%",
            maxWidth: "100%",

            paddingBottom: 89,
        }}>
            <ScrollView style={{
                minHeight: "100%",
                minWidth: "100%",
            }} refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                {loading || (!grades || grades?.length == 0) ? 
                    <>
                        {loading ? 
                            <View style={{
                                marginTop: "50%",
                            }}>
                                <ActivityIndicator size={"small"} />
                            </View>
                            :
                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                paddingTop: 150,

                                gap: 5,
                            }}>
                                
                                <Text style={{
                                    fontSize: 20,
                                    color: hexToRgb(theme.LIGHT.toString(), 1),
                                }}>
                                    Ingen karakterer i år
                                </Text>
                                <Text style={{
                                    color: theme.WHITE,
                                    textAlign: 'center'
                                }}>
                                    Du har endnu ikke fået nogen karakterer.
                                </Text>
                            </View>
                        }
                    </>
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

                                alignItems: "center",

                                backgroundColor: theme.ACCENT_BLACK,
                            }}>
                                {["1. standpunkt", "2. standpunkt", "Eksamen/årsprøve", "Årskarakter"].map((title, index) => { 
                                    return (
                                        <Fragment key={title + index + "header"}>
                                            <View style={{
                                                borderLeftWidth: 1,
                                                borderColor: hexToRgb(theme.WHITE.toString(), 0.2),
                                                height: 30,
                                            }} />

                                            <View style={{
                                                flexGrow: 1,
                                                marginLeft: -1.5,

                                                width: "25%",

                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}>
                                                <View style={{
                                                    width: "100%",
                                                    paddingVertical: 5,
                                                    paddingHorizontal: 6,
                                                }}>
                                                    <Text
                                                        adjustsFontSizeToFit
                                                        minimumFontScale={0.8}
                                                        numberOfLines={2}
                                                        textBreakStrategy="simple"

                                                        style={{
                                                            color: theme.WHITE,
                                                            textAlign: "center",
                                                        }}
                                                    >
                                                        {title}
                                                    </Text>
                                                </View>
                                            </View>
                                        </Fragment>
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
                                paddingVertical: 12.5,

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
                                </View>
                            </View>

                            <View style={{
                                display: "flex",
                                flexDirection: "row",
                                width: "65%",
                            }}>
                                {grades && grades[0] && ["1. standpunkt", "2. standpunkt", "Eksamen/årsprøve", "Årskarakter"].map((title, index) => {
                                    if(!grades[0].karakterer[title] || grades[0].karakterer[title].grade == "") {
                                        return (
                                            <View
                                                key={title + index + "footer"}
                                                style={{
                                                    width: "25%",
                                                }}
                                            />
                                        )
                                    }

                                    return (
                                        <View key={title + index + "footer"} style={{
                                            width: `25%`,

                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",

                                            flexDirection: "column",
                                        }}>
                                            <Text style={{
                                                color: theme.WHITE,
                                                fontWeight: "bold",
                                                fontSize: 15,
                                            }}>
                                                {calculateAverage(title)}
                                            </Text>
                                        </View>
                                    )
                                })}
                            </View>

                        </View>
                    </>
                }
            </ScrollView>
        </View>
    )
}