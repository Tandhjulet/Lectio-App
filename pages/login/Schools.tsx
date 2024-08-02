import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  SectionList,
  SectionListData,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from 'react-native';
import {Cell, Section, TableView} from 'react-native-tableview-simple';
import { hexToRgb, themes } from '../../modules/Themes';
import { getSchools } from '../../modules/api/scraper/Scraper';
import { saveUnsecure, secureSave } from '../../modules/api/helpers/Storage';
import { replaceHTMLEntities } from '../../modules/api/scraper/SkemaScraper';
import Constants from "expo-constants";
import { StackNavigationProp } from '@react-navigation/stack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * Finds first alphabet character in a string
 * @param str str to search
 * @returns first char
 */
function findFirstChar(str: string): string {
  return str.replace(/[^a-zA-ZæøåÆØÅ]+/gm, "")[0]
}

/**
 * Renders the school in a memo to reduce lag/skip rerendering
 */
const School = memo(function School({ navigation, gymNummer, gymName }: {
  navigation: any,
  gymNummer: string,
  gymName: string,
}) {
  const scheme = useColorScheme();
  const theme = themes[scheme ?? "dark"];

  return (
    <TouchableOpacity onPress={() => {
      secureSave("gym", JSON.stringify({ "gymNummer": gymNummer, "gymName": gymName })).then(() => {
        navigation.navigate("Login", {
          _gym: [gymName, gymNummer]
        })
      })
    }}>
      <View style={{
        height: 48,
      }}>
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 15,
          
          backgroundColor: theme.BLACK,

          display: 'flex',
          gap: 10,
          flexDirection: "row",

          alignItems: "center",
        }}>
          <Text style={{
            color: theme.WHITE,
            fontSize: 15,
          }}>
            {gymName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
})

/**
 * Formats and optionally filters schools
 * @param data data to parse
 * @param contains optional filter to apply
 * @returns parsed data
 */
function parseData(data: {[id: string]: string}): {
  letter: string,
  data: string[];
}[] {
  let out: { [id: string] : string[]} = {}

  for(let schoolName in data) {
    const c = findFirstChar(schoolName.toUpperCase());

    if(out[c] == undefined)
      out[c] = [];

    out[c].push(replaceHTMLEntities(schoolName))
  }

  const sortedKeys = Object.keys(out).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), "da"))
  const formattedOut: {
    letter: string,
    data: string[];
  }[] = [];

  for(let key of sortedKeys) {
    formattedOut.push({
        letter: key,
        data: out[key],
    })
  }

  return formattedOut;
}

const Schools = ({ navigation }: {
  navigation: NativeStackNavigationProp<any>,
}) => {
  const [schools, setSchools] = useState<{
    letter: string,
    data: string[];
  }[]>([]);
  const [rawData, setRawData] = useState<{[key: string]: string}>({});
  const [query, setQuery] = useState<string>();

  let namelist = useRef<string[]>([]).current;
  const [filteredNamelist, setFilteredNamelist] = useState<string[]>([]);

  const filterSearch = useCallback(function filterSearch(filterText: string, reuse: boolean) {
    if(reuse && filteredNamelist.length === 0) reuse = false;

    setFilteredNamelist((reuse ? filteredNamelist : namelist).filter((name: string) => {
        return name.toLowerCase().includes(filterText.toLowerCase());
    }));
}, [filteredNamelist])

  /**
   * Loads the schools upon page load
   */
  useEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        inputType: "text",
        hideWhenScrolling: false,
        cancelButtonText: "Annuller",
        placeholder: "Søg efter skole",
        

        onChangeText: (changeTextEvent) => {
          const text = changeTextEvent.nativeEvent.text;
          filterSearch(text, text.length > (query?.length ?? 0));
          setQuery(text);
        },
      },
    })

    const load = async () => {
      const rawData = await getSchools(true);
      setRawData(rawData);
      setSchools(parseData(rawData));

      namelist = Object.keys(rawData);
      setFilteredNamelist(namelist);

    }

    load();
  }, [])

  const scheme = useColorScheme();
  const theme = themes[scheme ?? "dark"];

  return (
      <View style={{
        paddingBottom: 40,
        marginTop: Constants.statusBarHeight,
        minHeight: "100%"
      }}>
        <View>
          <TableView>
            {query && query.length > 0 ? (
              <FlatList
                data={filteredNamelist}
                renderItem={({ item }) => {
                  return <School gymNummer={rawData[item]} gymName={item} navigation={navigation} />
                }}
                ItemSeparatorComponent={() => (
                  <View style={{
                    marginLeft: 15,
                  }}>
                    <View style={{
                      backgroundColor: theme.WHITE,
                      width: "100%",
                      height: StyleSheet.hairlineWidth,
          
                      opacity: 0.2,
                    }} />
                  </View>
                )}

                keyExtractor={(item, index) => item + "-" + index}
                getItemLayout={(data, index) => {
                    return {length: 48, offset: 48 * index, index: index}
                }}

                contentInsetAdjustmentBehavior="automatic"

                directionalLockEnabled={true}

                contentContainerStyle={{
                  paddingBottom: 150,
                }}

                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="always"
              />
            ) : (
              <SectionList
                sections={schools}

                renderItem={({ item }) => {
                    return <School gymNummer={rawData[item]} gymName={item} navigation={navigation} />
                }}
                ItemSeparatorComponent={() => (
                  <View style={{
                    marginLeft: 15,
                  }}>
                    <View style={{
                      backgroundColor: theme.WHITE,
                      width: "100%",
                      height: StyleSheet.hairlineWidth,
          
                      opacity: 0.2,
                    }} />
                  </View>
                )}

                renderSectionHeader={(data) => {
                    return (
                        <View style={{
                            paddingTop: 7.5,

                            backgroundColor: theme.BLACK,
                            opacity: 0.9,

                            marginLeft: 7.5,
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

                keyExtractor={(item, index) => item + "-" + index}
                getItemLayout={(data, index) => {
                    return {length: 48, offset: 48 * index, index: index}
                }}

                contentInsetAdjustmentBehavior="automatic"

                stickySectionHeadersEnabled={false}
                directionalLockEnabled={true}

                contentContainerStyle={{
                  paddingBottom: 150,
                }}

                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="always"
              />
            )}
          </TableView>
        </View>
      </View>
  );
};

export default Schools;