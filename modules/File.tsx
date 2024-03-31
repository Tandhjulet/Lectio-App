import { useCallback } from "react";
import { useColorScheme } from "react-native";
import { ClipboardDocumentIcon, DocumentArrowDownIcon, DocumentIcon, DocumentTextIcon, FilmIcon, FolderIcon, FolderOpenIcon, VideoCameraIcon } from "react-native-heroicons/outline";
import { hexToRgb, themes } from "./Themes";

export default function File() {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    function getUrlExtension(url: string) {
        return (url.split(/[#?]/)[0].split(".").pop() ?? "").trim();
    }

    function calculateSize(size: string): number {
        let factor: number = 1;
        switch(size.split(" ")[1].toUpperCase()) {
            case "KB":
                factor = 1_000;
                break;
            case "MB":
                factor = 1_000_000;
                break;
            case "GB":
                factor = 1_000_000_000;
                break;
        }

        return parseFloat(size.split(" ")[0].replace(",", "."))*factor;
    }

    const findIcon = useCallback((extension: string, size: number = 30) => {
        switch(extension) {
            case "ppt":
            case "ppsm":
            case "ppsx":
            case "pot":
            case "pps":
            case "pptm":
            case "pptx":
                return <FilmIcon size={size} color={theme.RED} />
            case "doc":
            case "docm":
            case "dotx":
            case "dot":
            case "txt":
            case "rtf":
            case "odt":
            case "docx":
                return <DocumentTextIcon size={size} />
            case "pdf":
                return <ClipboardDocumentIcon size={size} color={hexToRgb(theme.RED.toString(), 0.8)} />
            case "mp4":
            case "jpg":
            case "jpeg":
            case "svg":
            case "webp":
            case "png":
            case "webm":
            case "gif":
            case "gifv":
            case "mpg":
            case "mpeg":
            case "mov":
                return <VideoCameraIcon size={size} color={theme.ACCENT} />
            default:
                return <DocumentIcon size={size} color={hexToRgb(theme.WHITE.toString(), 0.8)} />
        }

    }, [])

    return {
        findIcon,
        getUrlExtension,
        calculateSize,
    }
}