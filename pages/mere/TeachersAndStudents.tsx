import { ActivityIndicator, FlatList, Image, ImageBackground, Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, TouchableHighlight, TouchableWithoutFeedback, View } from "react-native";
import NavigationBar from "../../components/Navbar";
import React, { memo, useEffect, useState } from "react";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import COLORS from "../../modules/Themes";
import { getUnsecure } from "../../modules/api/Authentication";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
//import { Image } from "@rneui/themed";

const sort = (obj: any) => Object.keys(obj).sort()
        .reduce((acc: any, c: any) => { acc[c] = obj[c]; return acc }, {})

function parseData(data: {[id: string]: Person}, contains?: string): {
    letter: string,
    data: Person[];
}[] {
    let out: { [id: string] : Person[]} = {}
  
    for(let name in data) {    
        if(contains != null && !name.toLowerCase().includes(contains.toLowerCase()))
            continue;

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

const UserCell = memo(function UserCell({ uri, index, item, section, setModalData, setModalVisible }: any) {
    return (
    <View>
        <TouchableWithoutFeedback
            hitSlop={10}
            onPress={() => {
                setModalData(item);
                setModalVisible(true);
            }}
            
            >
            <View style={{
                paddingHorizontal: 20,
                paddingVertical: 15,
                
                backgroundColor: COLORS.BLACK,

                borderTopLeftRadius: index == 0 ? 20 : 0,
                borderTopRightRadius: index == 0 ? 20 : 0,

                borderBottomLeftRadius: index == section.data.length - 1 ? 20 : 0,
                borderBottomRightRadius: index == section.data.length - 1 ? 20 : 0,

                display: 'flex',
                gap: 10,
                flexDirection: "row",

                alignItems: "center",
            }}>
                <Image
                    style={{
                        borderRadius: 100,
                        width: 40,
                        height: 40,
                    }}
                    source={{
                        uri: uri,
                        headers: {
                            "User-Agent": "Mozilla/5.0",
                        },
                    }}
                    crossOrigin="use-credentials"
                />

                <Text style={{
                    color: COLORS.WHITE,
                }}>
                    {item.navn}
                </Text>
            </View>
        </TouchableWithoutFeedback>

        <View style={{
            marginHorizontal: 15,
        }}>
            <View style={{
                backgroundColor: COLORS.WHITE,
                width: "100%",
                height: StyleSheet.hairlineWidth,

                opacity: 0.2,
            }} />
        </View>
    </View>
    )
})

export default function TeachersAndStudents({ navigation }: { navigation: any }) {
    const [loading, setLoading] = useState<boolean>(true);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState<Person>();

    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>({gymName: "", gymNummer: ""});
    const [people, setPeople] = useState<{
        letter: string,
        data: Person[];
    }[]>([]);

    const [rawPeople, setRawPeople] = useState<{ [id: string]: Person }>({});

    useEffect(() => {
        setLoading(true);

        (async () => {
            const gym: { gymName: string, gymNummer: string } = await getUnsecure("gym");
            setGym(gym);

            const peopleList: { [id: string]: Person } | null = await getPeople();
            if(peopleList == null) {
                setLoading(false);
                return;
            }

            setRawPeople(peopleList)
            const parsedPeople = parseData(peopleList);

            setPeople(parsedPeople)
            setLoading(false)
        })();
    }, [])

    return (
        <View style={{height: '100%',width:'100%'}}>
            {!loading &&
                <>
                    <TextInput placeholder="Søg efter lære eller elev..." onChangeText={(text) => {setPeople(parseData(rawPeople, text))}} style={{
                        color: COLORS.WHITE,
                        fontSize: 15,

                        backgroundColor: COLORS.DARK,

                        marginHorizontal: 20,
                        padding: 5,
                        borderRadius: 5,

                        marginVertical: 10,
                    }} />

                    <TableView style={{
                        paddingHorizontal: 20,
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
                                    color: COLORS.RED,
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
                                    marginHorizontal: 10,
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
                                            const uri = SCRAPE_URLS(gym.gymNummer, item.billedeId).PICTURE_HIGHQUALITY;

                                            return <UserCell uri={uri} section={section} item={item} index={index} gym={gym} setModalData={setModalData} setModalVisible={setModalVisible} />
                                        }}

                                        renderSectionHeader={(data) => {
                                            
                                            return (
                                                <View style={{
                                                    paddingTop: 7.5,
                                                    paddingBottom: 2,

                                                    backgroundColor: COLORS.BLACK,
                                                    opacity: 0.9,
                                                }}>
                                                    <Text style={{
                                                        color: COLORS.WHITE,
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
                                        bounces={false}
                                    />
                                </View>
                            </>
                        }
                    </TableView>

                    <Modal 
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => {
                            setModalVisible(!modalVisible);
                            setModalData(undefined)
                        }}
                    >
                        {modalData != undefined &&
                            <TouchableWithoutFeedback style={{
                                position: "absolute",

                                width: "100%",
                                height: "100%",
                            }} onPress={() => {
                                setModalVisible(!modalVisible);
                                setModalData(undefined)
                            }}>
                                <View style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    alignItems: 'center',

                                    paddingTop: 22,
                                    paddingBottom: 200,

                                    backgroundColor: 'rgba(52, 52, 52, 0.6)',
                                }}>
                                    <View style={{
                                        margin: 20,

                                        backgroundColor: COLORS.BLACK,
                                        borderRadius: 20,

                                        paddingHorizontal: 35,
                                        paddingVertical: 20,

                                        display: 'flex',
                                        flexDirection: 'column',
                                        
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                        <Image
                                            style={{
                                                borderRadius: 100,
                                                width: 100,
                                                height: 100,
                                                marginBottom: 15,
                                            }}
                                            source={{
                                                uri: SCRAPE_URLS(gym.gymNummer, modalData.billedeId).PICTURE_HIGHQUALITY,
                                                headers: {
                                                    "User-Agent": "Mozilla/5.0",
                                                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                                                    "Referer": "https://www.lectio.dk/lectio/572/forside.aspx"
                                                },
                                            }}
                                            crossOrigin="use-credentials"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                        />
                                        

                                        <Text style={{
                                            color: COLORS.WHITE,

                                            fontSize: 20,
                                            fontWeight: "bold",

                                            textAlign: 'center'
                                        }}>
                                            {modalData?.navn}
                                        </Text>

                                        <Text style={{
                                            color: COLORS.WHITE,
                                            textTransform: "capitalize"
                                        }}>
                                            {modalData?.type}
                                        </Text>
                                        
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        }
                    </Modal>
                </>
            }
        </View>
    )
}