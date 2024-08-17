import { Profile } from "../scraper/Scraper";
import { SCRAPE_URLS } from "../scraper/Helpers";
import { BarCodeScanner } from "expo-barcode-scanner";
import * as Sentry from 'sentry-expo';

export async function parseQR(profile: Profile, gymNummer: string) {
    try {
        const res = await BarCodeScanner.scanFromURLAsync(SCRAPE_URLS(gymNummer, profile.elevId).QR_CODE_URL, [BarCodeScanner.Constants.BarCodeType.qr])
        return res[0].data;
    } catch(err) {
        console.error("Couldn't fetch bar code")
        Sentry.Native.captureException(err);
    }
}