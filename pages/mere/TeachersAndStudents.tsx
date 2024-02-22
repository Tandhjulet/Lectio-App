import { ActivityIndicator, FlatList, Image, ImageBackground, Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, TouchableHighlight, TouchableWithoutFeedback, View, useColorScheme } from "react-native";
import NavigationBar from "../../components/Navbar";
import React, { memo, useCallback, useEffect, useState } from "react";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { themes } from "../../modules/Themes";
import { getSecure, getUnsecure } from "../../modules/api/Authentication";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import ProfilePicture from "../../components/ProfilePicture";

/**
 * returns the given object with keys sorted alphanumerically.
 * @param obj the object to sort
 * @returns the sorted object
 * @author sinclairzx81 <https://stackoverflow.com/users/8525946/sinclairzx81>
 */
const sort = (obj: any) => Object.keys(obj).sort()
        .reduce((acc: any, c: any) => { acc[c] = obj[c]; return acc }, {})

/**
 * Formats, sorts and optionally filters data so that it's ready to be rendered
 * @param data data to parse
 * @param contains a string to filter the data with
 * @returns filtered data
 */
function parseData(data: {[id: string]: Person}): {
    letter: string,
    data: Person[];
}[] {
    let out: { [id: string] : Person[]} = {}
  
    for(let name in data) {
        if(out[name[0]] == undefined)
            out[name[0]] = [];

        out[name[0]].push(data[name])
    }

    for(let key in out) {
        out[key].sort((a, b) => a.navn.localeCompare(b.navn, "da"));
    }
  
    out = sort(out);

    const formattedOut: {
        letter: string,
        data: Person[];
    }[] = [];

    for(let key in out) {
        formattedOut.push({
            letter: key,
            data: out[key],
        })
    }

    return formattedOut;
}

const UserCell = memo(function UserCell({ index, item, section, gym }: {
    index: number,
    item: Person,
    section: any,
    gym: any,

}) {
    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

    return (
        <>
            <View style={{
                paddingHorizontal: 20,
                paddingVertical: 15,
                
                backgroundColor: theme.BLACK,

                borderTopLeftRadius: index == 0 ? 20 : 0,
                borderTopRightRadius: index == 0 ? 20 : 0,

                borderBottomLeftRadius: index == section.data.length - 1 ? 20 : 0,
                borderBottomRightRadius: index == section.data.length - 1 ? 20 : 0,

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

    const [rawPeople, setRawPeople] = useState<{
        letter: string,
        data: Person[];
    }[]>([]);
    const [filter, setFilter] = useState<string>("");

    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];


    const parseFormattedData = useCallback((data: {
        letter: string,
        data: Person[];
    }[], contains: string) => {
        const out: {
            letter: string,
            data: Person[];
        }[] = [];

        data.forEach((v) => {
            if(contains.length > 0 && (!(contains.toLowerCase().includes(v.letter.toLowerCase()))))
                return;

            const i = out.push({
                letter: v.letter,
                data: [],
            })-1;

            for(let person of v.data) {
                if(contains.length > 0 && (!(person.rawName.toLowerCase().includes(contains.toLowerCase()))))
                    continue;

                out[i].data.push(person);
            }

            if(out[i].data.length === 0)
                out.pop();
        })

        return out;
    }, [])

    /**
     * Fetches the people to be rendered on page load
     */
    useEffect(() => {
        setLoading(true);

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await getSecure("gym");
            setGym(gym);

            const peopleList: { [id: string]: Person } | null = await getPeople();
            if(peopleList == null) {
                setLoading(false);
                return;
            }

            const parsedPeople = parseData(peopleList);
            setRawPeople(parsedPeople)
            setPeople(parsedPeople)

            setLoading(false)
        })();
    }, [])

    return (
        <View style={{height: '100%',width:'100%'}}>
            {!loading &&
                <>
                    <TextInput placeholder="Søg efter lære eller elev..." onChangeText={(text) => {
                        setFilter(text);
                        if(text.length > filter.length) {
                            setPeople(parseFormattedData(people, text));
                        } else {
                            setPeople(parseFormattedData(rawPeople, text));
                        }
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
                                    <SectionList
                                        sections={people}

                                        SectionSeparatorComponent={() => {
                                            return (
                                                <View style={{
                                                    marginVertical: 3,
                                                }} />
                                            )
                                        }}
                                        renderItem={({item, index, section}) => {
                                            return <UserCell section={section} item={item} index={index} gym={gym} />
                                        }}

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

                                        contentContainerStyle={{ paddingBottom: 200 }}

                                        getItemLayout={(data, index) => {
                                            return {length: 70 + StyleSheet.hairlineWidth, offset: index * (70 + StyleSheet.hairlineWidth), index: index}
                                        }}

                                        stickySectionHeadersEnabled={false}
                                        directionalLockEnabled={true}

                                        maxToRenderPerBatch={1}

                                        keyboardDismissMode="on-drag"
                                        keyboardShouldPersistTaps="always"
                                    />
                                </View>
                            </>
                        }
                    </TableView>
                </>
            }
        </View>
    )
}