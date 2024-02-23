import React, {memo, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  SectionList,
  SectionListData,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from 'react-native';
import {Cell, Section, TableView} from 'react-native-tableview-simple';
import { themes } from '../../modules/Themes';
import { getSchools } from '../../modules/api/scraper/Scraper';
import { saveUnsecure, secureSave } from '../../modules/api/Authentication';
import { replaceHTMLEntities } from '../../modules/api/scraper/SkemaScraper';

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
const School = memo(function School({ index, section, navigation, gymNummer, gymName }: {
  index: number,
  section: any,
  navigation: any,
  gymNummer: string,
  gymName: string,
}) {
  const scheme = useColorScheme();
  const theme = themes[scheme || "dark"];

  return (
    <Pressable onPress={() => {
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

          borderTopLeftRadius: index == 0 ? 20 : 0,
          borderTopRightRadius: index == 0 ? 20 : 0,

          borderBottomLeftRadius: index == section.data.length - 1 ? 20 : 0,
          borderBottomRightRadius: index == section.data.length - 1 ? 20 : 0,

          display: 'flex',
          gap: 10,
          flexDirection: "row",

          alignItems: "center",
        }}>
          <Text style={{
            color: theme.WHITE,
          }}>
            {gymName}
          </Text>
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
      </View>
    </Pressable>
  )
})

/**
 * Formats and optionally filters schools
 * @param data data to parse
 * @param contains optional filter to apply
 * @returns parsed data
 */
function parseData(data: {[id: string]: string}, contains?: string): {
  letter: string,
  data: string[];
}[] {
  let out: { [id: string] : string[]} = {}

  for(let schoolName in data) {
    const c = findFirstChar(schoolName.toUpperCase());

    if(contains != undefined && !schoolName.toLowerCase().includes(contains.toLowerCase()))
      continue;

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

const Schools = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);

  const [schools, setSchools] = useState<{
    letter: string,
    data: string[];
  }[]>([]);
  const [rawData, setRawData] = useState<{[key: string]: string}>({});

  /**
   * Loads the schools upon page load
   */
  useEffect(() => {
    const load = async () => {
      const rawData = await getSchools();
      setRawData(rawData);
      const data = parseData(rawData);
      setSchools(data);

      setLoading(false);
    }

    load();
  }, [])

  const scheme = useColorScheme();
  const theme = themes[scheme || "dark"];

  return (
      <View style={{paddingBottom: 40, minHeight: "100%"}}>
        <TextInput placeholder="Søg efter skole..." onChangeText={(text) => {setSchools(parseData(rawData, text))}} style={{
          color: theme.WHITE,
          fontSize: 15,

          backgroundColor: theme.DARK,

          marginHorizontal: 20,
          padding: 5,
          borderRadius: 5,

          marginBottom: 10,
        }} />

        {loading &&
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
        }

        <View style={{
          marginHorizontal: 20,
        }}>
          <TableView>
            <SectionList
              sections={schools}

              renderItem={({item, index, section}) => {
                  return <School gymNummer={rawData[item]} gymName={item} index={index} section={section} navigation={navigation} />
              }}

              renderSectionHeader={(data) => {
                  return (
                      <View style={{
                          paddingTop: 7.5,

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
              keyExtractor={(item, index) => item + "-" + index}
              getItemLayout={(data, index) => {
                  return {length: 48, offset: 48 * index, index: index}
              }}

              bounces={false}

              stickySectionHeadersEnabled={false}
              directionalLockEnabled={true}

              contentContainerStyle={{
                paddingBottom: 150,
              }}

              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="always"
            />
          </TableView>
        </View>
      </View>
  );
};

export default Schools;