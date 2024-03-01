import { NavigationProp, RouteProp } from "@react-navigation/native";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, useColorScheme } from "react-native";
import { themes } from "../../modules/Themes";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Modul, replaceHTMLEntities } from "../../modules/api/scraper/SkemaScraper";
import { Cell, Section, TableView } from "react-native-tableview-simple";
import { getProfile, scrapeHold } from "../../modules/api/scraper/Scraper";
import { secureGet, getUnsecure } from "../../modules/api/Authentication";
import { Person } from "../../modules/api/scraper/class/ClassPictureScraper";
import { Hold } from "../../modules/api/scraper/hold/HoldScraper";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { CLEAN_NAME } from "../beskeder/BeskedView";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";
import { UserIcon } from "react-native-heroicons/solid";
import { SCHEMA_SEP_CHAR } from "../../modules/Config";
import ProfilePicture from "../../components/ProfilePicture";

/**
 * 
 * @param modul modul
 * @returns the status of the module
 */
const getStatus = (modul: Modul) => {
    if(modul.cancelled)
        return "Aflyst";
    if(modul.changed)
        return "Ændret"
    return "Normal"
}

export default function ModulView({ navigation, route }: {
    navigation: NavigationProp<any>,
    route: RouteProp<any>
}) {
    const modul: Modul = route.params?.modul;

    const [members, setMembers] = useState<{ [id: string]: Person }>({})
    const [gym, setGym] = useState<{ gymName: string, gymNummer: string }>();

    const [ billedeId, setBilledeId ] = useState<string>();

    const [loading, setLoading] = useState<boolean>(true)
    const [refreshing, setRefreshing] = useState<boolean>(false);

    /**
     * Fetches the teacher and the students of the module on page load
     */
    useEffect(() => {
        setLoading(true);

        (async () => {
            const profile = await getProfile();
            const gym: { gymName: string, gymNummer: string } = await secureGet("gym")
            setGym(gym);

            const people = await getPeople();
            if(people != null && modul.lærerNavn != null)
                if(people[CLEAN_NAME(modul.lærerNavn)] != null)
                    setBilledeId(people[CLEAN_NAME(modul.lærerNavn)].billedeId);

            for(let hold of profile.hold) {
                if(hold.holdNavn == modul.team) {
                    const v = await scrapeHold(hold.holdId, gym.gymNummer);
                    if(v == null)
                        setMembers({})
                    else
                        setMembers(v)
                    break;
                }
            }
            setLoading(false);
        })();
    }, [])

    /**
     * Drag-to-refresh functionality
     */
    useEffect(() => {
        if(!refreshing)
            return;

        (async () => {
            if(gym == null)
                return;
            
            const profile = await getProfile();
            profile.hold.forEach((hold: Hold, i: number) => {

                if(hold.holdNavn == modul.team) {
                    scrapeHold(hold.holdId, gym.gymNummer, true).then((v) => {
                        if(v == null)
                            setMembers({})
                        else
                            setMembers(v)
                        setRefreshing(false);
                    })
                }

                if(i == profile.hold.length - 1) {
                    setRefreshing(false);
                }
            })


        })();
    }, [refreshing])

    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, []);

    if(modul == null)
        return <></>;

    const scheme = useColorScheme();
    const theme = themes[scheme || "dark"];

    return (
        <View style={{
            minHeight: '100%',
            minWidth:'100%',
        }}>
            <ScrollView refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
                <TableView style={{
                    marginHorizontal: 20,
                }}>
                    <Section header={"INFORMATION"} roundedCorners={true} hideSurroundingSeparators={true}>
                        <Cell
                            cellStyle="RightDetail"
                            title="Hold"
                            detail={modul.team}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Lokale"
                            detail={modul.lokale.replace("...", "").replace(SCHEMA_SEP_CHAR, "").trim()}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Start"
                            detail={modul.timeSpan.end} // idk ??
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Slut"
                            detail={modul.timeSpan.start} // idk ??
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Status"
                            detail={getStatus(modul)}
                        />

                        <Cell
                            cellStyle="RightDetail"
                            title="Lektier"
                            detail={modul.homework ? "Ja" : "Nej"}
                        />

                        {modul.note != undefined &&
                            <Cell
                                contentContainerStyle={{
                                    display: 'flex',
                                    flexDirection: 'column',

                                    alignItems: "flex-start",
                                    paddingBottom: 10,
                                }}
                                cellContentView={
                                    <>
                                        <Text style={{
                                            color: theme.WHITE,
                                            paddingBottom: 5,
                                            paddingTop: 8,
                                            fontSize: 16,
                                        }}>
                                            Note
                                        </Text>
                                        <Text style={{
                                            color: theme.WHITE,
                                        }}>
                                            {modul.note}
                                        </Text>
                                    </>
                                }
                            />
                        }
                    </Section>

                    {modul.homework && modul.lektier != undefined &&
                        <Section header="LEKTIER" roundedCorners={true} hideSurroundingSeparators={true}>
                            {modul.lektier?.map((lektie: string, index: number) => {
                                return (
                                    <Cell 
                                        key={index}
                                        cellStyle="Basic"

                                        cellContentView={
                                            <Text style={{
                                                color: theme.WHITE,
                                                paddingVertical: 8,
                                                fontSize: 16,
                                            }}>
                                                {replaceHTMLEntities(lektie)}
                                            </Text>
                                        }
                                    />)
                            })}
                        </Section>
                    }

                    {modul.extra && (
                        <Section header="ØVRIGT INDHOLD" roundedCorners hideSurroundingSeparators>
                            {modul.extra?.map((lektie: string, index: number) => {
                                return (
                                    <Cell 
                                        key={index}
                                        cellStyle="Basic"

                                        cellContentView={
                                            <Text style={{
                                                color: theme.WHITE,
                                                paddingVertical: 8,
                                                fontSize: 16,
                                            }}>
                                                {replaceHTMLEntities(lektie)}
                                            </Text>
                                        }
                                    />)
                            })}
                        </Section>
                    )}

                    {loading ?
                        <ActivityIndicator size={"small"} color={theme.WHITE} />
                    :
                        <>
                            {Object.keys(members).length > 0 &&
                                <Section header="MEDLEMMER" roundedCorners={true} hideSurroundingSeparators={true}>
                                    {Object.keys(members).map((navn: string, index: number) => {
                                        return (
                                            <Cell 
                                                key={index}
                                                cellStyle="Subtitle"

                                                title={navn}
                                                detail={members[navn] == null ? "?" : members[navn].type}

                                                subtitleTextStyle={{
                                                    textTransform: "capitalize"
                                                }}

                                                cellImageView={
                                                    <View style={{
                                                        marginRight: 10,
                                                    }}>
                                                        <ProfilePicture gymNummer={gym?.gymNummer ?? ""} billedeId={members[navn].billedeId ?? ""} size={35} navn={navn} />
                                                    </View>
                                                }
                                            />)
                                    })}
                                </Section>
                            }
                        </>
                    }

                    <View style={{
                        paddingVertical: 100,
                    }} />
                </TableView>
            </ScrollView>
        </View>
    )
}