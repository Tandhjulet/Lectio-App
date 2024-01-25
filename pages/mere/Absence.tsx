import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import NavigationBar from "../../components/Navbar";
import { useCallback, useEffect, useState } from "react";
import { getAbsence } from "../../modules/api/scraper/Scraper";
import { getUnsecure } from "../../modules/api/Authentication";
import COLORS from "../../modules/Themes";
import { Fag } from "../../modules/api/scraper/AbsenceScraper";
import PieChart from "react-native-pie-chart";
import RateLimit from "../../components/RateLimit";

type ChartedAbsence = {
    almindeligt: {
        series: number[],
        teams: string[],
        colors: string[],

        yearly: {
            collectiveAbsences: number,
            collectiveModules: number,
        },
        settled: {
            collectiveAbsences: number,
            collectiveModules: number,
        },
    },
    skriftligt: {
        series: number[],
        teams: string[],
        colors: string[],

        yearly: {
            collectiveAbsences: number,
            collectiveModules: number,
        },
        settled: {
            collectiveAbsences: number,
            collectiveModules: number,
        },
    },
}

/**
 * Converts a string to a hex color code using bit manipulation 
 * and a bit of black magic
 * @author Joe Freeman <https://stackoverflow.com/users/108907/joe-freeman>
 * @param str string to convert to color
 * @returns a 6-digit hex color code
 */
function _stringToColour(str: string): string {
    let hash = 0;
    str.split('').forEach(char => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash)
    })
    let colour = '#'
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff
      colour += value.toString(16).padStart(2, '0')
    }
    return colour
}

/**
 * Inverts given hex color
 * @param hex hex to invert color of
 * @returns inverted hex color
 * @author Martin Delille <https://stackoverflow.com/users/118125/martin-delille>
 */
function invertColor(hex: string) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    // invert color components
    var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
        g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
        b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
    // pad each with zeros and return
    return '#' + padZero(r) + padZero(g) + padZero(b);
}

/**
 * Pads string with zeros
 * @param str string to pad
 * @param len new post-padded length of string
 * @returns zero-padded string
 */
function padZero(str: string, len?: number) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
}

/**
 * Converts RGB to hex
 * @param r red
 * @param g green
 * @param b blue
 * @returns hex color
 * @author Tim Down <https://stackoverflow.com/users/96100/tim-down>
 */
function rgbToHex(r: number, g: number, b: number) {
    function componentToHex(c: number) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

/**
 * Converts a string into a hex-color using bit manipulation.
 * If the color is too dark, it gets inverted.
 * @param str string to convert to a color
 * @returns hex color
 */
function stringToColour(str: string): string {
    const color = _stringToColour(str);
    const c = color.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff; 
    const g = (rgb >>  8) & 0xff;  
    const b = (rgb >>  0) & 0xff; 

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // ITU-R BT.709
    if(luma < 40) { 
        return invertColor(rgbToHex(r, g, b)) // color is too dark, let's find a new one
    }

    return color;
}

export default function Absence({ navigation }: { navigation: any }) {
    const [ chartedAbsence, setChartedAbsence ] = useState<ChartedAbsence>();
    const [ loading, setLoading ] = useState(true);
    const [ rateLimited, setRateLimited ] = useState(false);

    const [ refreshing, setRefreshing ] = useState(false);

    /**
     * Fetches the absence on page load
     */
    useEffect(() => {
        setLoading(true);
        (async () => {
            const gymNummer = (await getUnsecure("gym")).gymNummer;

            // yeah...
            const out: ChartedAbsence = {
                almindeligt: {
                    series: [],
                    teams: [],
                    colors: [],

                    yearly: {
                        collectiveAbsences: 0,
                        collectiveModules: 0,
                    },
                    settled: {
                        collectiveAbsences: 0,
                        collectiveModules: 0,
                    },
                },
                skriftligt: {
                    series: [],
                    teams: [],
                    colors: [],

                    yearly: {
                        collectiveAbsences: 0,
                        collectiveModules: 0,
                    },
                    settled: {
                        collectiveAbsences: 0,
                        collectiveModules: 0,
                    },
                },
            }

            getAbsence(gymNummer).then(({ payload, rateLimited }): any => {
                setRateLimited(rateLimited)
                if(payload == null)
                    return out;

                const almindeligt = [...payload].sort((a,b) => {
                    return b.almindeligt.yearly.absent - a.almindeligt.yearly.absent;
                });

                const skriftligt = [...payload].sort((a,b) => {
                    return b.skriftligt.yearly.absent - a.skriftligt.yearly.absent;
                });

                // this should probably be fixed...
                if(almindeligt != null && skriftligt != null) {
                    almindeligt.forEach((fag: Fag) => {
                        if(fag.almindeligt.settled.absent > 0) {
                            out.almindeligt.series.push(fag.almindeligt.settled.absent);
                            out.almindeligt.teams.push(fag.almindeligt.team);
                            out.almindeligt.colors.push(stringToColour(fag.almindeligt.team))
                        }

                        out.almindeligt.yearly.collectiveModules += fag.almindeligt.yearly.total;
                        out.almindeligt.settled.collectiveModules += fag.almindeligt.settled.total;

                        out.almindeligt.yearly.collectiveAbsences += fag.almindeligt.yearly.absent;
                        out.almindeligt.settled.collectiveAbsences += fag.almindeligt.settled.absent;
                    })

                    skriftligt.forEach((fag: Fag) => {
                        if(fag.skriftligt.settled.absent > 0) {
                            out.skriftligt.series.push(fag.skriftligt.settled.absent);
                            out.skriftligt.teams.push(fag.skriftligt.team);
                            out.skriftligt.colors.push(stringToColour(fag.skriftligt.team));
                        }

                        out.skriftligt.yearly.collectiveModules += fag.skriftligt.yearly.total;
                        out.skriftligt.settled.collectiveModules += fag.skriftligt.settled.total;

                        out.skriftligt.yearly.collectiveAbsences += fag.skriftligt.yearly.absent;
                        out.skriftligt.settled.collectiveAbsences += fag.skriftligt.settled.absent;
                    })
                }

                setChartedAbsence(out);
                setLoading(false);
            })
        })();
    }, []);

    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const gymNummer = (await getUnsecure("gym")).gymNummer;

            // yeah...
            const out: ChartedAbsence = {
                almindeligt: {
                    series: [],
                    teams: [],
                    colors: [],

                    yearly: {
                        collectiveAbsences: 0,
                        collectiveModules: 0,
                    },
                    settled: {
                        collectiveAbsences: 0,
                        collectiveModules: 0,
                    },
                },
                skriftligt: {
                    series: [],
                    teams: [],
                    colors: [],

                    yearly: {
                        collectiveAbsences: 0,
                        collectiveModules: 0,
                    },
                    settled: {
                        collectiveAbsences: 0,
                        collectiveModules: 0,
                    },
                },
            }

            getAbsence(gymNummer).then(({ payload, rateLimited }): any => {
                setRateLimited(rateLimited)
                if(payload == null)
                    return out;

                const almindeligt = [...payload].sort((a,b) => {
                    return b.almindeligt.yearly.absent - a.almindeligt.yearly.absent;
                });

                const skriftligt = [...payload].sort((a,b) => {
                    return b.skriftligt.yearly.absent - a.skriftligt.yearly.absent;
                });

                // this should probably be fixed...
                if(almindeligt != null && skriftligt != null) {
                    almindeligt.forEach((fag: Fag) => {
                        if(fag.almindeligt.settled.absent > 0) {
                            out.almindeligt.series.push(fag.almindeligt.settled.absent);
                            out.almindeligt.teams.push(fag.almindeligt.team);
                            out.almindeligt.colors.push(stringToColour(fag.almindeligt.team))
                        }

                        out.almindeligt.yearly.collectiveModules += fag.almindeligt.yearly.total;
                        out.almindeligt.settled.collectiveModules += fag.almindeligt.settled.total;

                        out.almindeligt.yearly.collectiveAbsences += fag.almindeligt.yearly.absent;
                        out.almindeligt.settled.collectiveAbsences += fag.almindeligt.settled.absent;
                    })

                    skriftligt.forEach((fag: Fag) => {
                        if(fag.skriftligt.settled.absent > 0) {
                            out.skriftligt.series.push(fag.skriftligt.settled.absent);
                            out.skriftligt.teams.push(fag.skriftligt.team);
                            out.skriftligt.colors.push(stringToColour(fag.skriftligt.team));
                        }

                        out.skriftligt.yearly.collectiveModules += fag.skriftligt.yearly.total;
                        out.skriftligt.settled.collectiveModules += fag.skriftligt.settled.total;

                        out.skriftligt.yearly.collectiveAbsences += fag.skriftligt.yearly.absent;
                        out.skriftligt.settled.collectiveAbsences += fag.skriftligt.settled.absent;
                    })
                }

                setChartedAbsence(out);
                setRefreshing(false);
            })
        })();
    }, [refreshing]);

    const widthAndHeight = 200;

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    return (
    <View style={{height: '100%', width:'100%'}}>
        {loading ?
            <View style={{
                position: "absolute",

                top: "20%",
                left: "50%",

                transform: [{
                    translateX: -12.5,
                }]
            }}>
                <ActivityIndicator size={"small"} color={COLORS.ACCENT} />
            </View>
            :
            <ScrollView refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                <View style={{
                    display: 'flex',

                    marginTop: 20,
                    marginHorizontal: 20,
                    gap: 100,

                    paddingBottom: 150,
                    paddingTop: 25,
                }}>
                    <View style={{
                        display: 'flex',
                        gap: 20,
                    }}>
                        <View style={{
                            display: "flex",
                            gap: 5,
                        }}>
                            <Text style={{
                                color: COLORS.WHITE,
                                fontSize: 20,
                                fontWeight: "bold",
                            }}>
                                Almindeligt fravær
                            </Text>

                            <View style={{
                                width: "100%",
                                
                                borderBottomColor: COLORS.WHITE,
                                borderBottomWidth: 1,
                            }} />

                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                gap: 50,
                                flexDirection: "row",

                                marginVertical: 10,
                            }}>
                                <View style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                    }}>
                                        Opgjort
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 35,
                                    }}>
                                        {(chartedAbsence?.almindeligt.settled.collectiveAbsences != undefined && chartedAbsence?.almindeligt.settled.collectiveModules != undefined) &&
                                            ((chartedAbsence?.almindeligt.settled?.collectiveAbsences / chartedAbsence?.almindeligt.settled?.collectiveModules)*100).toFixed(2).toString().replace(".", ",")
                                            }%
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        opacity: 0.8,
                                    }}>
                                        {chartedAbsence?.almindeligt.settled?.collectiveAbsences.toString().replace(".", ",")} / {chartedAbsence?.almindeligt.settled?.collectiveModules.toString().replace(".", ",")}
                                    </Text>
                                </View>

                                <View style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                    }}>
                                        For året
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 35,
                                    }}>
                                        {(chartedAbsence?.almindeligt.yearly.collectiveAbsences != undefined && chartedAbsence?.almindeligt.yearly.collectiveModules != undefined) &&
                                            ((chartedAbsence?.almindeligt.yearly?.collectiveAbsences / chartedAbsence?.almindeligt.yearly?.collectiveModules)*100).toFixed(2).toString().replace(".", ",")
                                            }%
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        opacity: 0.8,
                                    }}>
                                        {chartedAbsence?.almindeligt.yearly.collectiveAbsences.toString().replace(".", ",")} / {chartedAbsence?.almindeligt.yearly.collectiveModules.toString().replace(".", ",")}
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                width: "100%",
                                
                                borderBottomColor: COLORS.WHITE,
                                borderBottomWidth: 1,
                            }} />

                        </View>

                        {(chartedAbsence != null && chartedAbsence.almindeligt.series.reduce((a, b) => a + b, 0) > 0) &&
                            <View style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',

                                gap: 10,
                            }}>
                                <PieChart
                                    widthAndHeight={widthAndHeight}
                                    /*
                                    // @ts-ignore */
                                    series={chartedAbsence.almindeligt.series}

                                    /*
                                    // @ts-ignore */
                                    sliceColor={chartedAbsence?.almindeligt.colors}
                                    coverRadius={0.55}
                                    coverFill={COLORS.BLACK}
                                />
                                <View style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}>
                                    {chartedAbsence?.almindeligt.colors.map((color: string, index: number) => (
                                        <View key={index}>
                                            <View style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                marginVertical: 2,
                                                gap: 5,

                                                alignItems: 'center',
                                            }}>
                                                <View style={{
                                                    width: 10,
                                                    height: 10,
                                                    backgroundColor: color,
                                                }} />
                                                <Text ellipsizeMode="tail" numberOfLines={1} style={{
                                                    color: color,
                                                    maxWidth: 100,
                                                    
                                                }}>
                                                    {chartedAbsence.almindeligt.teams[index]}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        }
                    </View>

                    <View style={{
                        display: 'flex',
                        gap: 20,
                    }}>
                        <View style={{
                            display: "flex",
                            gap: 5,
                        }}>
                            <Text style={{
                                color: COLORS.WHITE,
                                fontSize: 20,
                                fontWeight: "bold",
                            }}>
                                Skriftligt fravær
                            </Text>

                            <View style={{
                                width: "100%",
                                
                                borderBottomColor: COLORS.WHITE,
                                borderBottomWidth: 1,
                            }} />

                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                                gap: 50,
                                flexDirection: "row",

                                marginVertical: 10,
                            }}>
                                <View style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                    }}>
                                        Opgjort
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 35,
                                    }}>
                                        {(chartedAbsence?.skriftligt.settled.collectiveAbsences != undefined && chartedAbsence?.skriftligt.settled.collectiveModules != undefined) &&
                                            ((chartedAbsence?.skriftligt.settled?.collectiveAbsences / chartedAbsence?.skriftligt.settled?.collectiveModules)*100).toFixed(2).toString().replace(".", ",")
                                            }%
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        opacity: 0.8,
                                    }}>
                                        {chartedAbsence?.skriftligt.settled?.collectiveAbsences.toString().replace(".", ",")} / {chartedAbsence?.skriftligt.settled?.collectiveModules.toString().replace(".", ",")}
                                    </Text>
                                </View>

                                <View style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: COLORS.WHITE,
                                    }}>
                                        For året
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        fontWeight: "bold",
                                        fontSize: 35,
                                    }}>
                                        {(chartedAbsence?.skriftligt.yearly.collectiveAbsences != undefined && chartedAbsence?.skriftligt.yearly.collectiveModules != undefined) &&
                                            ((chartedAbsence?.skriftligt.yearly?.collectiveAbsences / chartedAbsence?.skriftligt.yearly?.collectiveModules)*100).toFixed(2).toString().replace(".", ",")
                                            }%
                                    </Text>

                                    <Text style={{
                                        color: COLORS.WHITE,
                                        opacity: 0.8,
                                    }}>
                                        {chartedAbsence?.skriftligt.yearly.collectiveAbsences.toString().replace(".", ",")} / {chartedAbsence?.skriftligt.yearly.collectiveModules.toString().replace(".", ",")}
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                width: "100%",
                                
                                borderBottomColor: COLORS.WHITE,
                                borderBottomWidth: 1,
                            }} />

                        </View>

                        {(chartedAbsence != null && chartedAbsence.skriftligt.series.reduce((a, b) => a + b, 0) > 0) &&
                            <View style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',

                                gap: 10,
                            }}>
                                <PieChart
                                    widthAndHeight={widthAndHeight}
                                    /*
                                    // @ts-ignore */
                                    series={chartedAbsence.skriftligt.series}

                                    /*
                                    // @ts-ignore */
                                    sliceColor={chartedAbsence?.skriftligt.colors}
                                    coverRadius={0.55}
                                    coverFill={COLORS.BLACK}
                                />
                                <View style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}>
                                    {chartedAbsence?.skriftligt.colors.map((color: string, index: number) => (
                                        <View key={color}>
                                            <View style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                marginVertical: 2,
                                                gap: 5,

                                                alignItems: 'center',
                                            }}>
                                                <View style={{
                                                    width: 10,
                                                    height: 10,
                                                    backgroundColor: color,
                                                }} />
                                                <Text ellipsizeMode="tail" numberOfLines={1} style={{
                                                    color: color,
                                                    maxWidth: 100,
                                                    
                                                }}>
                                                    {chartedAbsence.skriftligt.teams[index]}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        }
                    </View>
                </View>
            </ScrollView>
        }

        {rateLimited && <RateLimit />}
    </View>
    )
}