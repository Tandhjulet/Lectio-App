import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { getProfile, scrapeModulRegnskab } from "../../modules/api/scraper/Scraper";
import { Hold } from "../../modules/api/scraper/hold/HoldScraper";
import { Modulregnskab } from "../../modules/api/scraper/hold/ModulRegnskabScraper";
import { getUnsecure } from "../../modules/api/Authentication";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import COLORS from "../../modules/Themes";

export default function ModulRegnskab() {
    const [ loading, setLoading ] = useState<boolean>(false);
    const [ modulRegnskab, setModulRegnskab ] = useState<Modulregnskab[]>();

    const [refreshing, setRefreshing] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            setLoading(true);

            const profile = await getProfile();
            const gym: {gymName: string, gymNummer: string} = await getUnsecure("gym")

            const out: Modulregnskab[] = [];

            for(let hold of profile.hold) {
                await scrapeModulRegnskab(gym.gymNummer, hold.holdId).then((modulRegnskab) => {
                    if(modulRegnskab != null && modulRegnskab.held != 0) {
                        out.push(modulRegnskab)
                    }
                });
            }

            setModulRegnskab([...out])
            setLoading(false);
        })();
    }, [])

    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            const profile = await getProfile();
            const gym: {gymName: string, gymNummer: string} = await getUnsecure("gym")

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
                    <ActivityIndicator size={"small"} color={COLORS.ACCENT} />
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

                                                flexDirection: "row",
                                                width: "100%",
                                            }}>
                                                <View style={{
                                                    flexGrow: 1,
                                                }}>
                                                    <Text style={{
                                                        color: "#fff",
                                                        paddingBottom: 5,
                                                        paddingTop: 8,
                                                        fontSize: 16,
                                                    }}>
                                                        {modul.team}
                                                    </Text>
                                                    <View>
                                                        <Text style={{
                                                            color: "#fff",
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

                                                    paddingTop: 12,

                                                    gap: 5,
                                                    flexGrow: 1,
                                                }}>
                                                    <View style={{
                                                        width: 125,
                                                        height: 5,
                                                        backgroundColor: COLORS.LIGHT,
                                                        borderRadius: 100,

                                                        position: "relative"
                                                    }}>
                                                        <View style={{
                                                            height: "100%",
                                                            width: parseFloat(modul.afvigelse.replace("%", "").replace(",", ".")) + (125/2),
                                                            borderRadius: 100,

                                                            backgroundColor: COLORS.DARK,
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
                                                                
                                                                backgroundColor: COLORS.WHITE,
                                                            }}
                                                        />
                                                    </View>

                                                    <Text style={{
                                                        color: COLORS.WHITE,
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