import { memo, useCallback, useEffect, useRef, useState } from "react"
import { Lokale } from "../../modules/api/scraper/LokaleScraper"
import { ActivityIndicator, Dimensions, FlatList, KeyboardAvoidingView, RefreshControl, SafeAreaView, StyleSheet, TouchableOpacity, useColorScheme, View } from "react-native";
import { getLokaler } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/helpers/Storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { hexToRgb, Theme, themes } from "../../modules/Themes";
import { Text } from "react-native";

export default function Lokaler({ navigation }: {
    navigation: NativeStackNavigationProp<any>,
}) {
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    let lokaler = useRef<Lokale[]>([]).current;
    const [filteredLokaler, setFilteredLokaler] = useState<Lokale[]>([]);

    const [gestureEnabled, setGestureEnabled] = useState<boolean>(true);
    const [query, setQuery] = useState('');

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const filterSearch = useCallback(function filterSearch(filterText: string, reuse: boolean) {
        if(filteredLokaler.length == 0) reuse = false;

        setFilteredLokaler((reuse ? filteredLokaler : lokaler).filter((name) => {
            return name.title.toLowerCase().includes(filterText.toLowerCase());
        }));
    }, [lokaler, filteredLokaler])

    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: gestureEnabled,
        })
    }, [gestureEnabled]);

    const Cell = memo(function Cell({ lokale, theme }: {
        lokale: Lokale,
        theme: Theme
    }) {
        return (
            <View style={{
                paddingVertical: 10,

                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: "row",
                maxWidth: "100%",
                overflow: "hidden",

                gap: 10,
            }}>
                <View style={{
                    maxWidth: "80%",
                }}>
                    <Text style={{
                        color: theme.WHITE,
                        fontWeight: "bold",

                    }} numberOfLines={1} ellipsizeMode="tail">
                        {lokale.title.split(" - ")[0]}
                    </Text>

                    <Text style={{
                        color: theme.WHITE,
                        textTransform: "capitalize",
                    }} numberOfLines={1} ellipsizeMode="tail">
                        {lokale.title.split(" - ").slice(1).join(" - ")}
                    </Text>
                </View>

                <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,

                    borderRadius: 5,
                    backgroundColor: hexToRgb(lokale.status === "LEDIGT" ? "#00c972" : theme.RED.toString(), 0.8),
                }}>
                    <Text style={{
                        color: theme.WHITE,
                        fontWeight: "bold",

                        textTransform: "uppercase"
                        
                    }} numberOfLines={1}>
                        {lokale.status}
                    </Text>
                </View>
            </View>
        )
    })

    useEffect(() => {
        navigation.setOptions({
            headerSearchBarOptions: {
                inputType: "text",
                hideWhenScrolling: false,
                cancelButtonText: "Annuller",
                placeholder: "Søg efter lokale",
            
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
            const gym = await secureGet("gym");
            await getLokaler(gym.gymNummer, false, (data) => {
                setLoading(false);
                if(!data) return;

                lokaler = data ?? [];
                setFilteredLokaler(data ?? []);
            })
        })();
    }, [])

    useEffect(() => {
        if(!refreshing) return;

        (async () => {
            const gym = await secureGet("gym");
            await getLokaler(gym.gymNummer, true, (data) => {
                setRefreshing(false);
                if(!data) return;

                lokaler = data ?? [];
                setFilteredLokaler(data ?? []);
            })
        })();
    }, [refreshing])
    
    const onRefresh = useCallback(() => {
        setRefreshing(true);
    }, [])

    return (
        <View style={{
            minHeight: "100%",
            minWidth: "100%",

            justifyContent: "center",
            paddingBottom: 89,
        }}>
            {loading ? (
                <ActivityIndicator />
            ) : (
                <FlatList
                    data={filteredLokaler}
                    renderItem={({ item }) => <Cell lokale={item} theme={theme} />}
                    ItemSeparatorComponent={() => <View style={{
                        width: "100%",
                        height: StyleSheet.hairlineWidth,

                        backgroundColor: theme.WHITE,
                        opacity: 0.3,
                    }} />}

                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}

                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={{
                        paddingHorizontal: 15,
                    }}

                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="always"
                />
            )}
        </View>
    )
}