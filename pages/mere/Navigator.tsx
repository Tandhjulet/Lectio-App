import { Text, TouchableOpacity, useColorScheme } from "react-native";
import { themes } from "../../modules/Themes";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import UserSettings from "./settings/UserSettings";
import { AbsenceNavigator, ModulNavigator } from "../../App";
import Afleveringer from "./afleveringer/Afleveringer";
import { AdjustmentsVerticalIcon } from "react-native-heroicons/outline";
import AfleveringView from "./afleveringer/AfleveringView";
import Grades from "./karakterer/Grades";
import Documents from "./dokumenter/Documents";
import TeachersAndStudents from "./personer/TeachersAndStudents";
import Lokaler from "./lokaler/Lokaler";
import Skema from "../skema/Skema";
import Books from "./bøger/Books";
import Studiekort from "./studiekort/Studiekort";
import NoAccess from "../NoAccess";
import ThankYou from "../ThankYou";
import More from "./More";

export const Settings = createNativeStackNavigator();

export function MereNavigator() {
    const scheme = useColorScheme();
    const theme = themes[scheme ?? "dark"];
  
    return (
      <Settings.Navigator initialRouteName="Settings" screenOptions={{
        gestureEnabled: true,
        headerStyle: {
          backgroundColor: theme.ACCENT_BLACK.toString(),
        },
        headerTitleStyle: {
          color: theme.WHITE.toString(),
        },
  
        headerBackVisible: true,
        headerBackTitleVisible: false,
        contentStyle: {
          backgroundColor: theme.BLACK,
        }
      }}>
        <Settings.Screen name={"Settings"} component={More} options={{title: "Yderligere", headerShown: false}} />
        <Settings.Screen name={"UserSettings"} component={UserSettings} options={{title: "Brugerindstillinger"}} />
  
        <Settings.Screen name={"Absence"} component={AbsenceNavigator} options={{title: "Fravær"}} />
  
        <Settings.Screen name={"Afleveringer"} component={Afleveringer} options={{
          title: "Afleveringer",
          headerRight: () => (
            <TouchableOpacity style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
  
              paddingVertical: 4,
              paddingHorizontal: 6,
  
              borderRadius: 100,
  
              backgroundColor: "rgba(0,122,255,0.2)",
          }}>
              <AdjustmentsVerticalIcon color={"rgba(0,122,255,1)"} />
              <Text style={{
                  color: "rgba(0,122,255,1)",
                  marginLeft: 2.5,
                  marginRight: 1,
              }}>
                  Venter
              </Text>
          </TouchableOpacity>
          )
        }} />
        <Settings.Screen name={"AfleveringView"} component={AfleveringView} options={({ route }) => {
          const params = route.params ?? {};
  
          // @ts-ignore
          const title: string = "opgave" in params ? params.opgave.title : "Aflevering";
  
          return {
            title: title,
          }
        }} />
  
        <Settings.Screen name={"Grades"} component={Grades} options={{title: "Karakterer"}} />
        <Settings.Screen name={"Dokumenter"} component={Documents} options={
          ({ route }) => {
            const params = route.params ?? {};
  
            // @ts-ignore
            const name: string = "currentFolder" in params ? params.currentFolder.name : "Dokumenter";
  
            return {
              title: name.trim(),
              headerBackTitleVisible: true
            }
          }
        } />
        <Settings.Screen name={"TeachersAndStudents"} component={TeachersAndStudents} options={{
          headerSearchBarOptions: {
            inputType: "text",
            placeholder: "Søg efter lære eller elev",
            cancelButtonText: "Annuller",
            hideWhenScrolling: false,
          },
          title: "Personer"
          }} />
  
        <Settings.Screen name={"Lokaler"} component={Lokaler} options={{
          headerSearchBarOptions: {
            inputType: "text",
            placeholder: "Søg efter lokale",
            cancelButtonText: "Annuller",
            hideWhenScrolling: false,
          },
          title: "Lokaler"
        }} />
  
        <Settings.Screen name={"Skemaoversigt"} component={Skema} options={
            ({ route }) => {
              const params = route.params ?? {};
  
              // @ts-ignore
              const name: string | undefined = "user" in params ? params.user.navn : "Skemaoversigt";
  
              return {
                title: name?.trim(),
                headerBackVisible: true,
              }
            }
        } />
        <Settings.Screen name={"Modul information"} component={ModulNavigator} options={({ route }: any) => ({ title: route.params.modul.title ?? route.params.modul.team.join(", ") })} initialParams={{
          origin: "Skemaoversigt"
        }} />
  
        <Settings.Screen name={"Books"} component={Books} options={{title: "Bøger"}} />
        <Settings.Screen name={"Studiekort"} component={Studiekort} options={{title: "Studiekort", header: () => <></>}} />
        <Settings.Screen name={"NoAccess"} component={NoAccess} options={{
          title: "Køb abonnement",
          headerShown: false,
          header: () => <></>,
  
          presentation: "formSheet",
        }} />
        <Settings.Screen name="Tak" component={ThankYou} options={{
          header: () => <></>
        }} />
      </Settings.Navigator>
    )
  }