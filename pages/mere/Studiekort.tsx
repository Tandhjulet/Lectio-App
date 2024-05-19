import { Image, View } from "react-native";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import { secureGet } from "../../modules/api/Authentication";
import { useEffect, useMemo } from "react";
import { getProfile } from "../../modules/api/scraper/Scraper";
import { getPeople } from "../../modules/api/scraper/class/PeopleList";

export default function Studiekort() {

    useEffect(() => {
        (async () => {
            const gym = await secureGet("gym");
        })();
    });

    return (
        <View style={{
            height: "100%",
            width: "100%",
        }}>

        </View>
    )
}