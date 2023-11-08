import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Cell, Section, TableView} from 'react-native-tableview-simple';
import COLORS from '../../modules/Themes';
import { getSchools } from '../../modules/api/scraper/Scraper';
import { getUnsecure, saveUnsecure, } from '../../modules/api/Authentication';

function parseData(data: {[id: string]: string}, contains?: string) {
  const out: { [id: string] : Array<string>} = {}

  for(let schoolName in data) {
    if(out[schoolName[0]] == undefined)
      out[schoolName[0]] = [];

    if(contains != undefined && !schoolName.toLowerCase().includes(contains.toLowerCase()))
      continue;

    out[schoolName[0]].push(schoolName)
  }

  for(let key in out) {
    out[key].sort();
  }

  return out;
}

const Schools = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);

  const [schools, setSchools] = useState({});
  const [rawData, setRawData] = useState({});

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

  return (
      <View style={{paddingBottom: 40, minHeight: "100%"}}>
        <TextInput placeholder="Søg efter skole..." onChangeText={(text) => {setSchools(parseData(rawData, text))}} style={{
          color: COLORS.WHITE,
          fontSize: 15,

          backgroundColor: COLORS.DARK,

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
                <ActivityIndicator size={"small"} color={COLORS.ACCENT} />
            </View>
        }

        <ScrollView
          contentContainerStyle={styles.stage}
          keyboardDismissMode='on-drag'
          keyboardShouldPersistTaps="always"
        >
          <TableView>

            {Object.keys(schools).map((key: string) => {
              // @ts-ignore
              if(schools[key].length == 0)
                return null;

              return (
                <Section header={key} key={key}>
                  {/* 
                  // @ts-ignore */}
                  {schools[key].map((schoolName: any) => (

                    <Cell
                      key={schoolName}
                      cellStyle="Basic"
                      title={schoolName}
                      accessory="DisclosureIndicator"
                      onPress={() => {
                          // @ts-ignore
                          const gymNummer = rawData[schoolName];

                          saveUnsecure("gym", { "gymNummer": gymNummer, "gymName": schoolName })

                          navigation.navigate("Login", {
                            gym: [schoolName, gymNummer]
                        })}
                      }
                    />
                  ))}
                </Section>
              )
            })}

          </TableView>
        </ScrollView>
      </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    backgroundColor: COLORS.BLACK,
    paddingBottom: 20,
  },
});

export default Schools;