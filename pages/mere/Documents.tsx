import { useCallback, useEffect, useState } from "react"
import { getProfile, scrapeDocuments, scrapeFolders } from "../../modules/api/scraper/Scraper";
import { secureGet } from "../../modules/api/Authentication";
import { Folder, Document } from "../../modules/api/scraper/DocumentScraper";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { Cell, TableView } from "react-native-tableview-simple";
import { FolderOpenIcon } from "react-native-heroicons/outline";
import {useNavigation } from "@react-navigation/native";
import { hexToRgb, themes } from "../../modules/Themes";
import { StackNavigationProp } from "@react-navigation/stack";
import React from "react";
import FileViewer from "react-native-file-viewer";
import RNFS from "react-native-fs";
import { SCRAPE_URLS } from "../../modules/api/scraper/Helpers";
import * as Progress from 'react-native-progress';
import File from "../../modules/File";

export default function Documents({ route }: {
    route: any,
}) {
    const navigation = useNavigation<StackNavigationProp<any>>();

    const currentFolder: Folder | undefined = route.params && route.params.currentFolder;

    const [folders, setFolders] = useState<Folder[] | undefined>(currentFolder?.subfolders ?? undefined);
    const [documents, setDocuments] = useState<Document[]>();

    const [progress, setProgress] = useState<number>(-1);

    const { calculateSize, getUrlExtension, findIcon } = File();

    const openFile = useCallback(async (document: Document) => {
        if(progress !== -1) return;

        const extension = getUrlExtension(document.fileName);
        const expectedSize = calculateSize(document.size);

        const fileURI = RNFS.CachesDirectoryPath + "/tempfile." + extension;

        RNFS.downloadFile({
            fromUrl: SCRAPE_URLS().BASE_URL + document.url,
            toFile: fileURI,
            cacheable: true,

            discretionary: true,
            background: false,

            begin() {
                setProgress(0);
            },
            progress(downloadProgress) {
                const progress = Math.min((downloadProgress.bytesWritten / (downloadProgress.contentLength == -1 ? expectedSize : downloadProgress.contentLength)), 1);
                setProgress(progress);
            },
            progressInterval: 100,
            progressDivider: 5,
        }).promise.then(() => {
            FileViewer.open(fileURI, {
                displayName: document.fileName,
                showAppsSuggestions: true,
                showOpenWithDialog: true,
            })
            setProgress(-1);
        })
    }, [progress])

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
        <View style={{
            height: "100%",
            width: "100%",
        }}>
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
                                    navigation.push("Dokumenter", {
                                        currentFolder: folder,
                                        folders: folder.subfolders,
                                    })
                                }}
                            />
                        )
                    })}

                    {documents?.map((document, i) => {
                        const extensionKnown = !(findIcon(getUrlExtension(document.fileName)).props.color == hexToRgb(theme.WHITE.toString(), 0.8));
                        
                        const name = extensionKnown ? document.fileName.replace(new RegExp("\\." + getUrlExtension(document.fileName) + "$"), "") : document.fileName;


                        return (
                            <Cell
                                key={i}
                                cellStyle="Subtitle"
                                accessory="DisclosureIndicator"
                                cellContentView={
                                    <React.Fragment key={i}>
                                        <TouchableOpacity style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            alignItems: "center",

                                            width: "95%",
                                            height: 60,
                                            gap: 10,
                                        }} onPress={() => openFile(document)}>
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
                                                    {name}
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
                                        </TouchableOpacity>
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

        {progress != -1 && (
                <View style={{
                    position: "absolute",
                    height: height / 2,
                    width: width,

                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",

                    pointerEvents: "none",
                }}>
                    <View style={{
                        backgroundColor: theme.ACCENT_BLACK,
                        borderRadius: 5,
                        paddingHorizontal: 20,
                        paddingVertical: 15,

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",

                        gap: 5,
                    }}>
                        <Text style={{
                            color: theme.WHITE,
                        }}>
                            Henter fil...
                        </Text>

                        <Progress.Pie
                            size={48}
                            progress={progress}
                            color={theme.LIGHT.toString()}
                            borderWidth={1}
                        />
                    </View>
                </View>
            )}
        </View>
    )
}