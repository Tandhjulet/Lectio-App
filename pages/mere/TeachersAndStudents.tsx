import { ActivityIndicator, FlatList, Image, ImageBackground, Modal, Pressable, ScrollView, SectionList, SectionListData, StyleSheet, Text, TextInput, TouchableHighlight, TouchableWithoutFeedback, View, useColorScheme } from "react-native";
import NavigationBar from "../../components/Navbar";
import React, { Suspense, memo, useCallback, useEffect, useState } from "react";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { Theme, themes } from "../../modules/Themes";
import { secureGet, getUnsecure } from "../../modules/api/Authentication";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import ProfilePicture from "../../components/ProfilePicture";

import 'react-native-console-time-polyfill';

const UserCell = memo(function UserCell({ item, gym, theme }: {
    item: Person,
    gym: any,
    theme: Theme
}) {

    return (
        <>
            <View style={{
                paddingHorizontal: 20,
                paddingVertical: 15,
                
                backgroundColor: theme.BLACK,

                display: 'flex',
                gap: 10,
                flexDirection: "row",

                alignItems: "center",
            }}>
                <ProfilePicture gymNummer={gym?.gymNummer ?? ""} billedeId={item.billedeId ?? ""} size={40} navn={item.navn} />

                <View style={{
                    display: "flex",
                    flexDirection: "column",

                    gap: 5,
                }}>
                    <Text style={{
                        color: theme.WHITE,
                        fontWeight: "bold",
                    }}>
                        {item.navn}
                    </Text>

                    <Text style={{
                        color: theme.WHITE,
                    }}>
                        {item.klasse}
                    </Text>
                </View>
            </View>

            <View style={{
                marginHorizontal: 15,
            }}>
                <View style={{
                    backgroundColor: theme.WHITE,
                    width: "100%",
                    height: StyleSheet.hairlineWidth,

                    opacity: 0.2,
                }} />
            </View>
        </>
    )
})

export default function TeachersAndStudents({ navigation }: { navigation: any }) {
    const [loading, setLoading] = useState<boolean>(true);

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>({gymName: "", gymNummer: ""});
    const [people, setPeople] = useState<{
        letter: string,
        data: Person[];
    }[]>([]);

    const [rawPeople, setRawPeople] = useState<{[id: string]: Person}>({});

    const [namelistAndClassList, setNamelistAndClassList] = useState<string[]>([]);
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

    /**
     * Fetches the people to be rendered on page load
     */
    useEffect(() => {
        setLoading(true);

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await secureGet("gym");
            setGym(gym);

            const peopleList: { [id: string]: Person } | null = await getPeople();

            if(peopleList == null) {
                setLoading(false);
                return;
            }
            setRawPeople(peopleList)

            const namelist = Object.keys(peopleList).sort();
            const nameAndClasslist = namelist.flatMap((v) => v + ":" + peopleList[v].klasse);

            setNamelistAndClassList(nameAndClasslist)
            setFilteredNamelist(nameAndClasslist);

            setPeople(parseData(peopleList, namelist))

            setLoading(false)
        })();
    }, [])

    const renderItem = useCallback(({ item, index }: {
        item: string,
        index: number,
    }) => {
        const user = item.split(":")[0];

        return <UserCell item={rawPeople[user]} gym={gym} theme={theme} />
    }, [rawPeople]);

    const renderItemSectionList = useCallback(({ item, index }: {
        item: Person,
        index: number,
    }) => <UserCell item={item} gym={gym} theme={theme} />, []);

    return (
        <View style={{height: '100%',width:'100%'}}>
            {!loading &&
                <>
                    <TextInput placeholder="Søg efter lære eller elev..." onChangeText={(text) => {
                        filterSearch(text, text.length > (query?.length ?? 0));
                        setQuery(text);
                        //setPeople(parseData(rawPeople, namelist, text));
                    }} style={{
                        color: theme.WHITE,
                        fontSize: 15,

                        backgroundColor: theme.DARK,

                        marginHorizontal: 20,
                        padding: 5,
                        borderRadius: 5,

                        marginVertical: 10,
                    }} />

                    <TableView style={{
                        paddingHorizontal: 5,
                    }}>   
                        {people == null ? 

                            <View style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
            
                                flexDirection: 'column-reverse',
            
                                minHeight: '40%',
            
                                gap: 20,
                            }}>
                                <Text style={{
                                    color: theme.RED,
                                    textAlign: 'center'
                                }}>
                                    Der opstod en fejl.
                                    {"\n"}
                                    Du kan prøve igen ved at genstarte appen.
                                </Text>
                            </View>
                            :
                            <>
                                <View style={{
                                    marginHorizontal: 0,
                                }}>
                                    {query && query.length > 0 ? (
                                        <FlatList
                                            data={filteredNamelist}
                                            renderItem={renderItem}
                                            keyExtractor={(item, index) => item + index}
                                            contentContainerStyle={{ paddingBottom: 200 }}

                                            getItemLayout={(data, index) => {
                                                return {length: 70 + StyleSheet.hairlineWidth, offset: index * (70 + StyleSheet.hairlineWidth), index: index}
                                            }}

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

                                            keyExtractor={(item, index) => item.navn + "-" + item.billedeId + ":" + index}

                                            getItemLayout={(data, index) => {
                                                return {length: 70 + StyleSheet.hairlineWidth, offset: index * (70 + StyleSheet.hairlineWidth), index: index}
                                            }}

                                            stickySectionHeadersEnabled
                                            directionalLockEnabled={true}

                                            maxToRenderPerBatch={1}
                                            initialNumToRender={8}

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