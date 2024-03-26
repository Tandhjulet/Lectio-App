import { useCallback, useEffect, useState } from "react"
import { getProfile, scrapeDocuments, scrapeFolders } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/Authentication";
import { Folder, Document } from "../../modules/api/scraper/DocumentScraper";
import { Dimensions, ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Cell, TableView } from "react-native-tableview-simple";
import { ClipboardDocumentIcon, DocumentArrowDownIcon, DocumentIcon, DocumentTextIcon, FilmIcon, FolderIcon, FolderOpenIcon } from "react-native-heroicons/outline";
import { NavigationProp, RouteProp, useNavigation } from "@react-navigation/native";
import { hexToRgb, themes } from "../../modules/Themes";
import { StackNavigationProp } from "@react-navigation/stack";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";

export default function Documents({ route }: {
    route: any,
}) {
    const navigation = useNavigation<StackNavigationProp<any>>();

    const currentFolder: Folder | undefined = route.params && route.params.currentFolder;

    const [folders, setFolders] = useState<Folder[] | undefined>(currentFolder?.subfolders ?? undefined);
    const [documents, setDocuments] = useState<Document[]>();

    function getUrlExtension(url: string) {
        return (url.split(/[#?]/)[0].split(".").pop() ?? "").trim();
    }
      

    const findIcon = useCallback((extension: string) => {
        switch(extension) {
            case "pptx":
                return <FilmIcon size={30} color={theme.RED} />
            case "doc":
            case "docx":
                return <DocumentTextIcon size={30} />
            case "pdf":
                return <ClipboardDocumentIcon size={30} color={hexToRgb(theme.RED.toString(), 0.8)} />
            default:
                return <DocumentIcon size={30} color={hexToRgb(theme.WHITE.toString(), 0.8)} />
        }

    }, [])

    useEffect(() => {
        navigation.setOptions({
            title: currentFolder ? currentFolder?.name : "Dokumenter",
            headerBackTitleVisible: !!currentFolder,
        });

        (async () => {
            const { gymNummer } = await secureGet("gym");
            const profile = await getProfile();

            if(!currentFolder?.subfolders) {
                const folders = await scrapeFolders(gymNummer, profile.elevId, currentFolder?.id ?? "S" + profile.elevId + "__");
                setFolders(folders);
            }

            if(currentFolder) {
                const documents = await scrapeDocuments(gymNummer, profile.elevId, currentFolder.id);
                setDocuments(documents);
            }
        })();
    }, []);

    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];

    const {width, height} = Dimensions.get("screen");

    return (
        <ScrollView style={{
            height: "100%",
            width: "100%",
        }}>
            <TableView style={{
                paddingBottom: 89,
            }}>
                {folders?.map((folder, i) => {
                    return (
                        <Cell
                            key={i}
                            cellStyle="Basic"
                            accessory="DisclosureIndicator"
                            cellImageView={
                                <FolderOpenIcon />
                            }
                            title={folder.name}
                            titleTextStyle={{
                                marginLeft: 10,
                                fontSize: 16,
                            }}
                            contentContainerStyle={{
                                height: 60,
                                borderBottomColor: hexToRgb(theme.WHITE.toString(), 0.1),
                                borderBottomWidth: StyleSheet.hairlineWidth,
                            }}

                            onPress={() => {
                                navigation.push("Documents", {
                                    currentFolder: folder,
                                    folders: folder.subfolders,
                                })
                            }}
                        />
                    )
                })}

                {documents?.map((document, i) => {
                    return (
                        <Cell
                            key={i}
                            cellStyle="Subtitle"
                            accessory="DisclosureIndicator"
                            cellContentView={
                                <React.Fragment key={i}>
                                    <View style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",

                                        width: "95%",
                                        height: 60,
                                        gap: 10,
                                    }}>
                                        {findIcon(getUrlExtension(document.fileName))}

                                        <View style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            width: "100%",
                                            gap: 2,
                                        }}>
                                            <Text style={{
                                                color: theme.WHITE,
                                                fontSize: 15,
                                                letterSpacing: -0.32,
                                                width: "87.5%",
                                                fontWeight: "bold",
                                            }} ellipsizeMode="middle" numberOfLines={1}>
                                                {document.fileName}
                                            </Text>

                                            <View style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                flexDirection: "row",
                                                width: "87.5%",
                                            }}>
                                                <Text style={{
                                                    color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                    fontSize: 15,
                                                    letterSpacing: -0.32,
                                                }} ellipsizeMode="middle" numberOfLines={1}>
                                                    {" "}{document.date}
                                                </Text>

                                                <Text style={{
                                                    color: hexToRgb(theme.WHITE.toString(), 0.6),
                                                    fontSize: 15,
                                                    letterSpacing: -0.32,
                                                }} ellipsizeMode="middle" numberOfLines={1}>
                                                    {document.size}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={{
                                        position: "absolute",
                                        bottom: 0,

                                        width: width,
                                        borderBottomColor: hexToRgb(theme.WHITE.toString(), 0.1),
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                    }} />
                                </React.Fragment>
                            }
                        />
                    )
                })}
            </TableView>

            {(folders == undefined || folders.length == 0) && (documents == undefined || documents.length == 0) && (
                <View style={{
                    position: "absolute",

                    height: height / 2,
                    width: width,

                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",

                    gap: 5,
                    opacity: 0.8,

                    paddingHorizontal: 20,
                }}>
                    <Text style={{
                        color: theme.WHITE,
                        fontWeight: "500",
                        fontSize: 21,
                        letterSpacing: 0.7,
                        textAlign: "center",
                    }}>
                        Folderen er tom
                    </Text>

                    <Text style={{
                        color: theme.WHITE,
                        fontWeight: "normal",
                        fontSize: 16,
                        textAlign: "center",
                        opacity: 0.9,
                    }}>
                        Der er ingen dokumenter eller under-foldere i denne folder.
                    </Text>
                </View>
            )}
        </ScrollView>
    )
}