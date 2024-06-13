import React, { memo, useCallback, useEffect, useState } from "react"
import { getProfile, scrapeGrades } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/Authentication";
import { ActivityIndicator, ColorSchemeName, Dimensions, DimensionValue, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Grade, WeightedGrade } from "../../modules/api/scraper/GradeScraper";
import { hexToRgb, Theme, themes } from "../../modules/Themes";
import Logo from "../../components/Logo";
import * as Progress from 'react-native-progress';

export default function Grades() {

    const [grades, setGrades] = useState<Grade[] | undefined | null>();

    const [ loading, setLoading ] = useState<boolean>(true);
    const [ refreshing, setRefreshing ] = useState<boolean>(false);

    const calculateAverage: (title: string) => number = useCallback((title: string) => {

        let accumulator: number = 0;
        let unique: number = 0;

        grades?.forEach((grade: Grade) => {
            grade.karakterer.forEach((karakter) => {
                if(karakter[title].grade == "") return;

                const weight = parseFloat(karakter[title].weight.replace(",", "."));
                const gradeInt = parseInt(karakter[title].grade);
    
                accumulator += gradeInt * weight;
                unique += weight;
            })
        })
        return (accumulator / (unique === 0 ? 1 : unique));
    }, [grades]);

    useEffect(() => {
        (async () => {
            const { gymNummer } = await secureGet("gym");
            const profile = await getProfile();

            scrapeGrades(gymNummer, profile.elevId, (grades) => {
                setGrades(grades);
                setLoading(false);
            }, true);
        })();
    }, [])

    useEffect(() => {
        if(!refreshing) return;

        (async () => {
            const { gymNummer } = await secureGet("gym");
            const profile = await getProfile();

            scrapeGrades(gymNummer, profile.elevId, (grades) => {
                setGrades(grades);
                setRefreshing(false);
            }, true);
        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const calculateColor = useCallback((grade: number, opacity: number = 1) => {
        const COLOR2 = [0, 201, 114];
        const COLOR1 = [66, 135, 245]

        const percent = (grade+3)/(12+3) // offset by 3 to avoid division by -3

        const res = [
            COLOR1[0] + percent * (COLOR2[0] - COLOR1[0]),
            COLOR1[1] + percent * (COLOR2[1] - COLOR1[1]),
            COLOR1[2] + percent * (COLOR2[2] - COLOR1[2]),
                    ]

        return `rgba(${res[0]}, ${res[1]}, ${res[2]}, ${opacity})`;
    }, [theme])

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
                    <View style={{
                        flexDirection: "column",
                    }}>
                        {grades ? (
                            <>
                                <View style={{
                                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.12),
                                    padding: 20,
                                }}>
                                    <View style={{
                                        flexDirection: "row",
                                        justifyContent: "space-evenly",
                                        width: "100%",

                                        gap: 20,
                                    }}>
                                        {grades && grades[0]?.karakterer[0] && Object.keys(grades[0].karakterer[0]).map((title, index) => {
                                            const avg = calculateAverage(title);
                                            const color = calculateColor(avg);

                                            const length = Object.keys(grades[0].karakterer[0]).length;
                                            let size;
                                            switch(length) {
                                                case 1:
                                                case 2:
                                                case 3:
                                                    size = 110;
                                                    break;
                                                case 4:
                                                    size = 92;
                                                    break;
                                            }
                                            
                                            return (
                                                <View style={{
                                                    justifyContent: "center",
                                                    alignItems: "center",

                                                    width: size,
                                                    height: size,
                                                    paddingHorizontal: 14,
                                                }} key={index}>
                                                    <Progress.Circle
                                                        key={index + "d"}

                                                        size={size}
                                                        progress={(avg+3)/15}
                                                        color={color}
                                                        thickness={5}
                                                        borderWidth={0}
                                                        strokeCap="round"

                                                        unfilledColor={hexToRgb(theme.WHITE.toString(), 0.1)}
                                                        style={{
                                                            position: "absolute",
                                                        }}
                                                    />

                                                    <View style={{
                                                        alignItems: "center",
                                                    }}>
                                                        <Text style={{
                                                            color: scheme === "dark" ? "#FFF" : "#000",
                                                            opacity: 0.9,
                                                            fontWeight: "500",
                                                            fontSize: length === 4 ? 9 : 11,
                                                            paddingHorizontal: 8,
                                                            textAlign: "center",
                                                        }} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1}>
                                                            Gennemsnit
                                                        </Text>

                                                        <Text style={{
                                                            color: scheme === "dark" ? "#FFF" : "#000",
                                                            fontWeight: "700",
                                                            fontSize: length === 4 ? 20 : 25,
                                                        }} adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1}>
                                                            {avg.toFixed(2).replace(".", ",")}
                                                        </Text>

                                                        <Text style={{
                                                            color: scheme === "dark" ? "#FFF" : "#000",
                                                            opacity: 0.9,
                                                            fontWeight: "900",
                                                            fontSize: length === 4 ? 9 : 10,
                                                            paddingHorizontal: 6,
                                                            textAlign: "center",
                                                        }} adjustsFontSizeToFit numberOfLines={2}>
                                                            {title.replace("1.", "Første").replace("2.", "Andet")}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )
                                        })}
                                    </View>
                                </View>
                                
                                <View style={{
                                    padding: 20,
                                    gap: 20,
                                }}>
                                    {grades?.map((grade, i) => {
                                        return (
                                            <View style={{
                                                backgroundColor: hexToRgb(theme.WHITE.toString(), 0.12),
                                                padding: 20,
                                                borderRadius: 5,
                                                gap: 10,
                                            }} key={i + "c"}>
                                                <View style={{
                                                    flexDirection: "row",
                                                }}>
                                                    <Text style={{
                                                        color: scheme == "dark" ? "#FFF" : "#000",
                                                        fontWeight: "800",
                                                        fontSize: 14,

                                                        maxWidth: "100%",

                                                    }} ellipsizeMode="tail" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                                        {grade.fag}
                                                    </Text>
                                                </View>

                                                <View style={{
                                                    height: 1,
                                                    width: "100%",

                                                    backgroundColor: hexToRgb(theme.WHITE.toString(), 0.5),
                                                }} />

                                                {grade.karakterer.map((karakter, j) => (
                                                    <View style={{
                                                        flexDirection: "column",
                                                        gap: 7.5,
                                                    }} key={j + "j"}> 
                                                        <Text style={{
                                                            fontWeight: "bold",
                                                            color: theme.WHITE,
                                                        }}>
                                                            {grade.type[j]}
                                                        </Text>

                                                        {Object.keys(karakter).map((key, i) => {
                                                            if(karakter[key].grade == "") return <React.Fragment key={i + "a"}></React.Fragment>;

                                                            const color = calculateColor(parseInt(karakter[key].grade));
                                                            const percentCompleted = ((parseInt(karakter[key].grade)+3)/15);

                                                            return (
                                                                <View style={{
                                                                    flexDirection: "row",
                                                                    marginBottom: 2,
                                                                    gap: 7.5,

                                                                    alignItems: "center"
                                                                }} key={i + "a"}>
                                                                    <Progress.Circle
                                                                        size={40 + 2*2}
                                                                        progress={percentCompleted}
                                                                        color={color}
                                                                        thickness={2}
                                                                        borderWidth={0}

                                                                        unfilledColor={hexToRgb(theme.WHITE.toString(), 0.1)}
                                                                        showsText
                                                                        formatText={() => karakter[key].grade}
                                                                        textStyle={{
                                                                            color: scheme === "dark" ? "#FFF" : "#000",
                                                                            fontWeight: "900",
                                                                            position: "absolute",
                                                                            fontSize: 14,
                                                                        }}
                                                                    />

                                                                    <View>
                                                                        <Text style={{
                                                                            color: scheme === "dark" ? "#FFF" : "#000",
                                                                            fontWeight: (key === "Afsluttende" || key === "Intern prøve") ? "700" : "500",
                                                                        }}>
                                                                            {key}
                                                                        </Text>

                                                                        <Text style={{
                                                                            color: theme.WHITE,
                                                                            fontWeight: "400",
                                                                        }}>
                                                                            Vægt:
                                                                            <Text style={{
                                                                                fontWeight: "700"
                                                                            }}>
                                                                                {" "}{karakter[key].weight}
                                                                            </Text>
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            )
                                                        })}
                                                    </View>
                                                ))}  

                                            </View>
                                        )
                                    })}

                                    <View style={{
                                        height: 89,
                                        width: "100%"
                                    }} />
                                </View>
                            </>
                        ) : (
                            <View style={{
                                marginTop: 200,
                                gap: 5,

                                alignItems: "center",
                            }}>
                                <Logo size={40} />

                                <Text style={{
                                    color: theme.WHITE,
                                    opacity: 0.7,
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    fontSize: 17.5,
                                }}>
                                    Ingen karakterer
                                </Text>

                                <Text style={{
                                    color: theme.WHITE,
                                    textAlign: "center",
                                    fontSize: 15
                                }}>
                                    Du har ikke fået nogen karakterer.
                                </Text>
                            </View>
                        )}
                    </View>
                }
            </ScrollView>
        </View>
    )
}