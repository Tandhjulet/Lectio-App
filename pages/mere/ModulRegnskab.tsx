import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useColorScheme } from "react-native";
import { getIfCachedOrDefault, getProfile, scrapeModulRegnskab } from "../../modules/api/scraper/Scraper";
import { Hold } from "../../modules/api/scraper/hold/HoldScraper";
import { Modulregnskab } from "../../modules/api/scraper/hold/ModulRegnskabScraper";
import { secureGet, getUnsecure } from "../../modules/api/Authentication";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { themes } from "../../modules/Themes";
import { Key } from "../../modules/api/storage/Storage";

export default function ModulRegnskab() {
    const [ loading, setLoading ] = useState<boolean>(false);
    const [ modulRegnskab, setModulRegnskab ] = useState<Modulregnskab[]>();

    const [refreshing, setRefreshing] = useState<boolean>(false);

    /**
     * Fetches the modul calculations on page load
     */
    useEffect(() => {
        (async () => {
            setLoading(true);

            const profile = await getProfile();
            const gym: {gymName: string, gymNummer: string} = await secureGet("gym")

            const out: Modulregnskab[] = [];

            for(let hold of profile.hold) {
                await getIfCachedOrDefault<Modulregnskab>(Key.MODULREGNSKAB, hold.holdId).then((modulRegnskab) => {
                    if(modulRegnskab != null && modulRegnskab.held != 0) {
                        out.push(modulRegnskab)
                    }
                })
            }

            if(out.length === 0) {
                for(let hold of profile.hold) {
                    await scrapeModulRegnskab(gym.gymNummer, hold.holdId, true).then((modulRegnskab) => {
                        if(modulRegnskab != null && modulRegnskab.held != 0) {
                            out.push(modulRegnskab)
                        }
                    });
                }
            } else {
                setRefreshing(true);
            }
            setLoading(false);

            setModulRegnskab([...out])
        })();
    }, [])

    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const profile = await getProfile();
            const gym: {gymName: string, gymNummer: string} = await secureGet("gym")

            const out: Modulregnskab[] = [];

            for(let hold of profile.hold) {
                await scrapeModulRegnskab(gym.gymNummer, hold.holdId, true).then((modulRegnskab) => {
                    if(modulRegnskab != null && modulRegnskab.held != 0) {
                        out.push(modulRegnskab)
                    }
                });
            }

            setModulRegnskab([...out])
            setRefreshing(false);
        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    return (
        <View style={{
            minWidth: "100%",
            minHeight: "100%",
        }}>
            {loading ?
                <View style={{
                    position: "absolute",
    
                    top: "20%",
                    left: "50%",
    
                    transform: [{
                        translateX: -12.5,
                    }]
                }}>
                    <ActivityIndicator size={"small"} color={theme.ACCENT} />
                </View>
                : 
                <ScrollView refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }>
                    <TableView style={{
                        marginHorizontal: 20,
                    }}>
                        <Section
                            roundedCorners
                            hideSurroundingSeparators
                        >
                            {modulRegnskab?.map((modul: Modulregnskab, index: number) => {
                                const width = parseFloat(modul.afvigelse.replace("%", "").replace(",", "."));

                                return (
                                    <Cell
                                        key={index}
                                        contentContainerStyle={{
                                            display: 'flex',
                                            flexDirection: 'column',

                                            alignItems: "flex-start",
                                            paddingBottom: 10,
                                        }}
                                        cellContentView={
                                            <View style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",

                                                paddingTop: 5,

                                                flexDirection: "row",
                                                width: "100%",
                                            }}>
                                                <View style={{
                                                }}>
                                                    <Text style={{
                                                        color: theme.WHITE,
                                                        paddingBottom: 5,
                                                        paddingTop: 8,
                                                        fontSize: 16,
                                                    }}>
                                                        {modul.team}
                                                    </Text>
                                                    <View>
                                                        <Text style={{
                                                            color: theme.WHITE,
                                                        }}>
                                                            {modul.held} ud af {modul.planned + modul.held} moduler
                                                        </Text>
                                                    </View>
                                                </View>
                                                
                                                <View style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",

                                                    flexDirection: "column",

                                                    gap: 5,
                                                    flexGrow: 1,
                                                }}>
                                                    <View style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        flexDirection: "row",

                                                        width: 150,
                                                    }}>
                                                        <Text style={{
                                                            color: theme.LIGHT,
                                                        }}>
                                                            -75%
                                                        </Text>

                                                        <Text style={{
                                                            color: theme.LIGHT,
                                                        }}>
                                                            75%
                                                        </Text>
                                                    </View>
                                                    
                                                    <View style={{
                                                        width: 150,
                                                        height: 5,
                                                        backgroundColor: theme.LIGHT,
                                                        borderRadius: 100,

                                                        position: "relative",
                                                        overflow: "hidden",
                                                    }}>
                                                        <View style={{
                                                            height: 5,
                                                            width: Math.abs(width),
                                                            transform: [{
                                                                translateX: width < 0 ? width+0.5 : 0,
                                                            }],

                                                            backgroundColor: theme.DARK,

                                                            position: "absolute",
                                                            left: "50%",
                                                        }} />

                                                        <View
                                                            style={{
                                                                position: "absolute",
                                                                width: 1,
                                                                height: "100%",
                                                                paddingVertical: 5,
                                                                top: -2.5,

                                                                left: "50%",
                                                                marginLeft: 0.5,
                                                                
                                                                backgroundColor: theme.WHITE,
                                                            }}
                                                        />
                                                    </View>

                                                    <Text style={{
                                                        color: theme.WHITE,
                                                        opacity: 0.6,
                                                    }}>
                                                        {modul.afvigelse} afvigelse
                                                    </Text>
                                                </View>
                                            </View>
                                        }
                                    />
                                )
                            })}
                        </Section>

                        <View
                            style={{
                                paddingVertical: 100,
                            }}
                        />
                    </TableView>
                </ScrollView>
            }
        </View>
    )
}