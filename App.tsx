import { NavigationContainer, NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Skema from './pages/Skema';
import Beskeder from './pages/Beskeder';
import Mere from './pages/Mere';
import Header from './components/Header';
import { HeaderBackButton } from "@react-navigation/elements";

import 'react-native-console-time-polyfill';
import Login from './pages/login/Login';
import Schools from './pages/login/Schools';
import Absence from './pages/mere/Absence';
import TeachersAndStudents from './pages/mere/TeachersAndStudents';
import BeskedView from './pages/beskeder/BeskedView';
import { Reducer, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { authorize, secureGet, getUnsecure, saveUnsecure, secureSave } from './modules/api/Authentication';
import { AuthContext } from './modules/Auth';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NavigationBar from './components/Navbar';
import ModulView from './pages/skema/ModulView';
import { scrapePeople } from './modules/api/scraper/class/PeopleList';
import Afleveringer from './pages/Afleveringer';
import AfleveringView from './pages/afleveringer/AfleveringView';
import { Appearance, Button, EmitterSubscription, Pressable, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { AdjustmentsVerticalIcon, ArrowUpOnSquareStackIcon, ChevronLeftIcon, PencilSquareIcon } from 'react-native-heroicons/solid';
import { HeaderStyleInterpolators, TransitionPresets, createStackNavigator } from '@react-navigation/stack';
import { cleanUp } from './modules/api/storage/Storage';

import {
  ProductPurchase,
  Purchase,
  PurchaseError,
  SubscriptionPurchase,
  clearProductsIOS,
  clearTransactionIOS,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  requestSubscription,
  useIAP,
  withIAPContext,
} from 'react-native-iap';

const AppStack = createNativeStackNavigator();
const Settings = createNativeStackNavigator();
const Messages = createStackNavigator();
const Opgaver = createNativeStackNavigator();
const SkemaNav = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import LandingPage from './pages/login/LandingPage';
import { themes } from './modules/Themes';
import UserSettings from './pages/mere/UserSettings';
import receiptValid, { hasSubscription } from './components/LectimateAPI';
import { SubState, SubscriptionContext } from './modules/Sub';
import ThankYou from './pages/ThankYou';
import Grades from './pages/mere/Grades';
import Documents from './pages/mere/Documents';
import Books from './pages/mere/Books';
import { Opgave } from './modules/api/scraper/OpgaveScraper';
import { hasProfileSaved } from './modules/api/scraper/Scraper';
import Studiekort from './pages/mere/Studiekort';
import NoAccess from './pages/NoAccess';

import SplashScreen from './pages/SplashScreen';
import Lokaler from './pages/mere/Lokaler';

Constants.appOwnership === 'expo'
  ? Linking.createURL('/--/')
  : Linking.createURL('');

type AuthType = {
  type: "SIGN_IN" | "SIGN_OUT",
  payload?: SignInPayload | null,
}

export type SignInPayload = {
  username: string | null,
  gym: {
    gymName: string,
    gymNummer: string
  } | null,
  password: string | null,
}

export const isExpoGo = Constants.appOwnership === 'expo';

const App = () => {
  useEffect(() => {
    // FIXME: make light theme a bit prettier, then this can be reenabled:
    getUnsecure("useDarkMode").then(
      (v: {result: boolean | null} | null) =>
        Appearance.setColorScheme("dark") //(v?.result ?? true) ? "dark" : "light")
    )

    cleanUp();

    (async () => {
      // LOGIN
      let payload: SignInPayload = {
        gym: null,
        password: null,
        username: null,
      };

      payload = {
        gym: await secureGet("gym"),
        password: await secureGet("password"),
        username: await secureGet("username"),
      }

      // validate and retry if it didn't work (lectio is autistic)
      if(!(await authorize(payload))) {
        setTimeout(async () => {
          if(!(await authorize(payload))) {
            dispatch({ type: 'SIGN_OUT' });
          } else {
            dispatch({ type: 'SIGN_IN' });
            setTimeout(() => scrapePeople(), 100);

            if(await hasProfileSaved())
              return;
            
            const { valid, freeTrial } = await hasSubscription();
            if(freeTrial && valid) {
              dispatchSubscription({ type: "FREE_TRIAL"})
            } else if(valid === null) {
              dispatchSubscription({ type: "SERVER_DOWN"})
            } else {
              dispatchSubscription({ type: valid ? "SUBSCRIBED" : "NOT_SUBSCRIBED"})
            }
          }
        }, 100)
      } else {
        dispatch({ type: 'SIGN_IN' });
        setTimeout(() => scrapePeople(), 100);
      }

      // STATE DISPATCH
      if(!(await hasProfileSaved()))
        return;

      const { valid, freeTrial } = await hasSubscription();

      if(freeTrial && valid) {
        dispatchSubscription({ type: "FREE_TRIAL"})
      } else if(valid === null) {
        dispatchSubscription({ type: "SERVER_DOWN"})
      } else {
        dispatchSubscription({ type: valid ? "SUBSCRIBED" : "NOT_SUBSCRIBED"})
      }
    })();

    // IAP
    let purchaseListener: EmitterSubscription | null;
    let errorListener: EmitterSubscription | null;
    if(!isExpoGo) {
      initConnection().then(async () => {
        console.log("init connection to iap")

        await clearProductsIOS();
        await clearTransactionIOS();

        errorListener = purchaseErrorListener(async (error: PurchaseError) => {
          console.log(error.message);
        })

        purchaseListener = purchaseUpdatedListener(async (purchase: SubscriptionPurchase | ProductPurchase) => {
          
          const receipt = purchase.transactionReceipt;
    
          if(receipt && await receiptValid(receipt)) {
            dispatchSubscription({ type: "SUBSCRIBED" })

            await finishTransaction({
              purchase,
            })
          }

        })
   
       })
    }

    return () => {
      purchaseListener?.remove();
      errorListener?.remove();
    }
  }, []);

  /**
   * State and dispatcher used for auth
   */
  const [state, dispatch]: [state: {loggedIn: boolean | null, payload: SignInPayload | null, isLoading: boolean}, dispatch: any] = useReducer(
    (prevState: any, action: AuthType) => {
      switch (action.type) {

        case 'SIGN_IN':
          return {
            ...prevState,
            loggedIn: true,
            isLoading: false,
          };

        case 'SIGN_OUT':
          return {
            ...prevState,
            loggedIn: false,
            isLoading: false,
            payload: null,
          };
      }
    },
    {
      loggedIn: undefined,
      isLoading: true,
    }
  );

  /**
   * Auth Context passed to the rest of the app
   */
  const authContext = useMemo(
    () => ({
      signIn: async (payload: SignInPayload) => {
        if(payload.username == null || payload.password == null || payload.gym == null)
          return false;

        if(await authorize(payload)) {
          await secureSave("username", payload.username);
          await secureSave("password", payload.password);
          
          dispatch({ type: 'SIGN_IN' })

          setTimeout(() => scrapePeople(), 100);
          return true;
        }

        return false;
      },

      signOut: () => {
        dispatch({ type: 'SIGN_OUT' })
        return true;
      },
    }),
    []
  );

  const [subscriptionState, dispatchSubscription]: [subscriptionState: any, dispatchSubscription: any] = useReducer<any>(
    (prev: any, action: SubState) => {
      return {
        loading: false,
        hasSubscription: action.type !== "NOT_SUBSCRIBED",
        serverDown: action.type === "SERVER_DOWN",
        freeTrial: action.type === "FREE_TRIAL",
      }
    },
    {
      serverDown: false,
      freeTrial: false,
      hasSubscription: undefined,
      loading: true, 
    }
  )

  const scheme = useColorScheme();
  const theme = themes[scheme ?? "dark"];
  
  return (
  <SubscriptionContext.Provider value={{ subscriptionState, dispatchSubscription }}>
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
          {state.isLoading ? (
            <AppStack.Navigator screenOptions={{
              headerShown: false,
              animation: "fade",
            }}>
              <AppStack.Screen name="Splash" component={SplashScreen} options={{
                header: () => <></>,
              }} />
            </AppStack.Navigator>
          ) : (
            <>
              {!state.loggedIn ? (
                <AppStack.Navigator screenOptions={{
                  gestureEnabled: false,
                  contentStyle: {
                    backgroundColor: theme.BLACK
                  },
        
                  headerStyle: {
                    backgroundColor: theme.ACCENT_BLACK.toString(),
                  },
                  headerTitleStyle: {
                    color: theme.WHITE.toString(),
                  },
                  headerBackVisible: false,
                }}>
                  <AppStack.Screen name="LandingPage" component={LandingPage} options={{
                    header: () => <></>,
                    animation: 'none',
                  }} />
                  <AppStack.Screen name="Login" component={Login} options={{
                    presentation: "formSheet",
                    gestureEnabled: true,
                    header: () => <></>,
                  }} />

                  <AppStack.Screen name="Schools" component={Schools} options={{
                    headerSearchBarOptions: {
                      inputType: "text",
                      placeholder: "Søg efter skole",
                      cancelButtonText: "Annuller",
                      hideWhenScrolling: false,
                    },
                    title: "Vælg din skole",
                  }} />
                </AppStack.Navigator>
              ) : (
                <Tab.Navigator
                  screenOptions={{
                    lazy: false,
                  }}
                  tabBar={props => <NavigationBar {...props} />}
                >
                  <Tab.Screen name="SkemaNavigator" component={SkemaNavigator} options={{
                    header: () => <></>,
                    title: "Skema"
                  }} />
        
                  <Tab.Screen name="Indbakke" component={BeskedNavigator} options={{
                    header: () => <></>
                  }} />
        
                  <Tab.Screen name="Mere" component={MereNavigator} options={{
                    header: () => <></>,
                  }} />
                </Tab.Navigator>
              )}
            </>
          )}
      </NavigationContainer>
    </AuthContext.Provider>
  </SubscriptionContext.Provider>
  );
}

export function SkemaNavigator() {

  const scheme = useColorScheme();
  const theme = themes[scheme ?? "dark"];

  return (
    <SkemaNav.Navigator initialRouteName="Skema" screenOptions={{
      gestureEnabled: true,
      headerStyle: {
        backgroundColor: theme.ACCENT_BLACK.toString(),
      },
      headerTitleStyle: {
        color: theme.WHITE.toString(),
      },
      headerBackTitleVisible: false,
      contentStyle: {backgroundColor: theme.BLACK},
    }}>
      <SkemaNav.Screen name={"Skema"} component={Skema} options={
          ({ route }) => {

            const isOwn = !(route.params && "user" in route.params);

            return {
              // @ts-ignore
              title: !isOwn ? route.params?.user?.navn.trim() : "",
              headerBackVisible: !isOwn,

              headerShown: !isOwn,
            }
          }
      } />
      <SkemaNav.Screen name={"Modul View"} component={ModulView} options={({ route }: any) => ({ title: route.params.modul.title ?? route.params.modul.team.join(", ") })} />
      <SkemaNav.Screen name="Tak" component={ThankYou} options={{
        header: () => <></>
      }} />
      <SkemaNav.Screen name={"NoAccessSkema"} component={NoAccess} options={{
        title: "Køb abonnement",
        headerShown: false,
        header: () => <></>,

        presentation: "formSheet",
      }} />

    </SkemaNav.Navigator>
  )
}

export function BeskedNavigator() {

  const scheme = useColorScheme();
  const theme = themes[scheme ?? "dark"];

  return (
    <Messages.Navigator initialRouteName="BeskedList" screenOptions={{
      gestureEnabled: true,
      headerStyle: {
        backgroundColor: theme.ACCENT_BLACK,
        shadowColor: "rgba(255, 255, 255, 0.2)",
      },
      headerTitleStyle: {
        color: theme.WHITE,
        fontSize: 17,
      },
      headerBackTitleVisible: false,
      headerStatusBarHeight: Constants.statusBarHeight,

    }}>
      <Messages.Screen name={"BeskedList"} component={Beskeder} options={{
        title: "Indbakke",
        headerLeft: () => (
          <View style={{
            marginLeft: 15,
          }}>
            <Pressable
              style={{
                  padding: 4,

                  backgroundColor: "rgba(0,122,255,0.2)",
                  borderRadius: 100,
              }}>
                  <PencilSquareIcon color={"rgba(0,122,255,1)"} />
            </Pressable>
          </View>
        ),
      }} />

      <Messages.Screen name={"BeskedView"} component={BeskedView} options={
        ({ route }) => {
          const params = route.params ?? {};

          // @ts-ignore
          const title: string = "message" in params ? params.message.title : "Besked";
  
          return {
            title: title,
          }
        }
      } />
    </Messages.Navigator>
  )
}

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
      <Settings.Screen name={"Settings"} component={Mere} options={{title: "Yderligere", headerShown: false}} />
      <Settings.Screen name={"UserSettings"} component={UserSettings} options={{title: "Brugerindstillinger"}} />

      <Settings.Screen name={"Absence"} component={Absence} options={{title: "Fravær"}} />

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
      <Settings.Screen name={"Modul information"} component={ModulView} options={({ route }: any) => ({ title: route.params.modul.title ?? route.params.modul.team.join(", ") })} />

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

export default App;