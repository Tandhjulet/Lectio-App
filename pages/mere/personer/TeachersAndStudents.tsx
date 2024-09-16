import { ActivityIndicator, FlatList, Image, ImageBackground, Modal, Pressable, ScrollView, SectionList, SectionListData, StyleSheet, Text, TextInput, TouchableHighlight, TouchableOpacity, TouchableWithoutFeedback, View, useColorScheme } from "react-native";
import NavigationBar from "../../../components/Navbar";
import React, { Suspense, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Person } from "../../../modules/api/scraper/class/ClassPictureScraper";
import { getPeople } from "../../../modules/api/scraper/class/PeopleList";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { hexToRgb, Theme, themes } from "../../../modules/Themes";
import { secureGet, getUnsecure } from "../../../modules/api/helpers/Storage";
import { SCRAPE_URLS } from "../../../modules/api/scraper/Helpers";

import { NavigationProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import UserCell from "../../../components/UserCell";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getName } from "../../../modules/Config";

export default function TeachersAndStudents({ navigation }: {
    navigation: NativeStackNavigationProp<any>,
}) {
    const route = useRoute();

    const { Cell } = UserCell();

    const [loading, setLoading] = useState<boolean>(true);

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();
    const [people, setPeople] = useState<{
        letter: string,
        data: Person[];
    }[] | null>([]);

    const [rawPeople, setRawPeople] = useState<{[id: string]: Person}>({});

    let namelistAndClassList = useRef<string[]>([]).current;
    const [filteredNamelist, setFilteredNamelist] = useState<string[]>([]);

    const [query, setQuery] = useState<string>();

    
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const filterSearch = useCallback(function filterSearch(filterText: string, reuse: boolean) {
        if(filterText === ":") {
            setFilteredNamelist([]);
            return;
        }

        if(reuse && filteredNamelist.length === 0) reuse = false;

        setFilteredNamelist((reuse ? filteredNamelist : namelistAndClassList).filter((name) => {
            return name.toLowerCase().includes(filterText.toLowerCase());
        }));
    }, [filteredNamelist, namelistAndClassList])

    const parseData = useCallback(function parseData(data: {[id: string]: Person}, list: string[], filter?: string): {
        letter: string,
        data: Person[];
    }[] {
        const out: {
            letter: string,
            data: Person[];
        }[] = [];

        let letter: string = "";
        let index: number = 0;

        for(let name of list) {
            if(filter != null && !name.toLowerCase().includes(filter.toLowerCase())) continue;

            if(letter != name[0]) {
                index = out.push({
                    letter: name[0],
                    data: [],
                })-1;

                letter = name[0];
            }

            out[index].data.push(data[name]);
        }

        return out;
    }, []);

    let [gestureEnabled, setGestureEnabled] = useState<boolean>(true);
    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: gestureEnabled,
        })
    }, [gestureEnabled]);

    /**
     * Fetches the people to be rendered on page load
     */
    useEffect(() => {
        setLoading(true);

        navigation.setOptions({
            headerSearchBarOptions: {
                inputType: "text",
                hideWhenScrolling: false,
                cancelButtonText: "Annuller",
                placeholder: "Søg efter lære eller elev",
            
                onChangeText: (changeTextEvent) => {
                    const text = changeTextEvent.nativeEvent.text;
                    filterSearch(text, text.length > (query?.length ?? 0));
                    setQuery(text);
                },
                
                onFocus: () => setGestureEnabled(false),
                onCancelButtonPress: () => setGestureEnabled(true),
            },
        });

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await secureGet("gym");
            setGym(gym);

            const peopleList: { [id: string]: Person } | null = await getPeople();

            if(peopleList == null) {
                setPeople(null);
                setLoading(false);
                return;
            }
            setRawPeople(peopleList)

            const namelist = Object.keys(peopleList).sort((a,b) => {
                if(a.startsWith("<") && !b.startsWith("<")) {
                    return 1;
                } else if(b.startsWith("<") && !a.startsWith("<")) {
                    return -1;
                } else {
                    if(a < b) return -1;
                    else if(a > b) return 1;
                    return 0;
                }
            });

            const nameClass = namelist.flatMap((v) => v + ":" + peopleList[v].klasse);

            namelistAndClassList = nameClass
            setFilteredNamelist(nameClass);

            setPeople(parseData(peopleList, namelist))

            setLoading(false)
        })();
    }, [])

    const renderItem = useCallback(({ item, index }: {
        item: string,
        index: number,
    }) => {
        const user = item.split(":")[0];

        return <Cell item={rawPeople[user]} gym={gym} theme={theme} route={route} style={{
            paddingLeft: 15,
        }} originScreen="Skemaoversigt" />
    }, [rawPeople, gym, theme, route]);

    const renderItemSectionList = useCallback(({ item }: {
        item: Person,
        index: number,
    }) => <Cell item={item} gym={gym} theme={theme} style={{
        paddingLeft: 15,
    }} route={route} originScreen="Skemaoversigt" />, [gym, theme, route]);

    const keyExtractor = useCallback((item: Person, index: number) => item.navn + "-" + item.billedeId + ":" + index, [])
    const getLayout = useCallback((data: any, index: number) => {
        return {length: 70 + StyleSheet.hairlineWidth, offset: index * (70 + StyleSheet.hairlineWidth), index: index}
    }, [])

    return (
        <View style={{
            height: '100%',
            width:'100%',
            paddingBottom: 89,
        }}>
            {!loading &&
                <>
                    <TableView style={{
                        paddingLeft: 5,
                    }}>   
                        {people == null ? 
                            <ScrollView style={{
                                height: "100%",
                            }} contentContainerStyle={{
                                height: "60%",
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 30,
                            }} contentInsetAdjustmentBehavior="automatic">
                                <Text style={{
                                    color: theme.WHITE,
                                    textAlign: 'center',

                                    fontSize: 15,
                                    fontWeight: "700",
                                }}>
                                    Indlæser personer...
                                </Text>

                                <Text style={{
                                    color: hexToRgb(theme.WHITE.toString(), 0.6),
                                    textAlign: 'center',

                                    letterSpacing: 0.2,
                                    fontSize: 12,
                                }}>
                                    Eftersom det er en af de første gange du åbner appen, er {getName()} stadig i gang med at hente skolens elever og lærere fra Lectio.
                                    Dette gøres i baggrunden mens appen er åben, og tager sjældent længere end et minut.
                                    {"\n\n"}
                                    Det kan være nødvendigt at genstarte appen, for at personerne vises, hvis de er blevet indlæst.
                                </Text>
                            </ScrollView>
                            :
                            <>
                                <View style={{
                                    marginHorizontal: 0,
                                }}>
                                    {query && query.length > 0 ? (
                                        <FlatList
                                            contentInsetAdjustmentBehavior="automatic"

                                            data={filteredNamelist}
                                            renderItem={renderItem}
                                            keyExtractor={(item, index) => item + index}
                                            contentContainerStyle={{
                                                paddingBottom: 50,
                                                paddingRight: 5,
                                                paddingLeft: 5,

                                                height: "100%",
                                            }}

                                            getItemLayout={getLayout}

                                            directionalLockEnabled={true}
                                            removeClippedSubviews

                                            maxToRenderPerBatch={1}
                                            initialNumToRender={8}
                                            windowSize={3}

                                            keyboardDismissMode="on-drag"
                                            keyboardShouldPersistTaps="always"
                                        />
                                    ) : (
                                        <SectionList
                                            sections={people}
                                            contentInsetAdjustmentBehavior="automatic"

                                            SectionSeparatorComponent={() => {
                                                return (
                                                    <View style={{
                                                        marginVertical: 3,
                                                    }} />
                                                )
                                            }}
                                            renderItem={renderItemSectionList}

                                            renderSectionHeader={(data) => {
                                                return (
                                                    <View style={{
                                                        paddingTop: 7.5,
                                                        paddingBottom: 2,
                                                        marginLeft: 2.5,

                                                        backgroundColor: theme.BLACK,
                                                        opacity: 0.9,
                                                    }}>
                                                        <Text style={{
                                                            color: theme.WHITE,
                                                            fontWeight: "bold",
                                                        }}>
                                                            {data.section.letter.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )
                                            }}

                                            keyExtractor={keyExtractor}

                                            getItemLayout={(data, index) => {
                                                return {length: 70 + StyleSheet.hairlineWidth, offset: index * (70 + StyleSheet.hairlineWidth), index: index}
                                            }}

                                            contentContainerStyle={{
                                                paddingBottom: 50,
                                                paddingRight: 5,
                                                paddingLeft: 5,

                                                height: "100%",
                                            }}

                                            stickySectionHeadersEnabled
                                            directionalLockEnabled={true}

                                            maxToRenderPerBatch={20}
                                            initialNumToRender={10}
                                            removeClippedSubviews

                                            viewabilityConfig={{
                                                itemVisiblePercentThreshold: 0,
                                                minimumViewTime: 200,
                                                waitForInteraction: false,
                                            }}

                                            keyboardDismissMode="on-drag"
                                            keyboardShouldPersistTaps="always"
                                        />
                                    )}
                                </View>
                            </>
                        }
                    </TableView>
                </>
            }
        </View>
    )
}