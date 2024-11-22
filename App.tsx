import { NavigationContainer, NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Skema from './pages/skema/Skema';
import Beskeder from './pages/beskeder/Beskeder';
import Header from './components/Header';
import { HeaderBackButton } from "@react-navigation/elements";

import 'react-native-console-time-polyfill';
import Login from './pages/login/Login';
import Schools from './pages/login/Schools';
import BeskedView from './pages/beskeder/BeskedView';
import { Reducer, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { secureGet, getUnsecure, saveUnsecure, secureSave } from './modules/api/helpers/Storage';
import { AuthContext } from './modules/Auth';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NavigationBar from './components/Navbar';
import ModulView from './pages/skema/ModulView';
import { scrapePeople } from './modules/api/scraper/class/PeopleList';
import { ActivityIndicator, Appearance, Button, Dimensions, EmitterSubscription, Pressable, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { AdjustmentsVerticalIcon, ArrowUpOnSquareStackIcon, ChevronLeftIcon, PencilSquareIcon } from 'react-native-heroicons/solid';
import { HeaderStyleInterpolators, TransitionPresets, createStackNavigator } from '@react-navigation/stack';
import { cleanUp } from './modules/api/helpers/Cache';

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
const Messages = createStackNavigator();
const SkemaNav = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'https://c026c665046dbe3bb4441be91943ee7b@o4507719891288064.ingest.de.sentry.io/4507719895875664',
  enableInExpoDevelopment: true,
  debug: __DEV__,
  integrations: [
    new Sentry.Native.ReactNativeTracing({
      enableAppStartTracking: false,
    }),
  ],
});

import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import LandingPage from './pages/login/LandingPage';
import { hexToRgb, themes } from './modules/Themes';
import receiptValid, { hasSubscription, ValidationResponse } from './components/LectimateAPI';
import { SubState, SubscriptionContext } from './modules/Sub';
import ThankYou from './pages/ThankYou';
import { Opgave } from './modules/api/scraper/OpgaveScraper';
import { hasProfileSaved } from './modules/api/scraper/Scraper';
import NoAccess from './pages/NoAccess';

import SplashScreen from './pages/SplashScreen';
import { authorize } from './modules/api/Authentication';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Registreringer from './pages/mere/fravær/Registreringer';
import Fravær from './pages/mere/fravær/Fravær';
import Lektier from './pages/skema/Lektier';
import { MereNavigator } from './pages/mere/Navigator';
import React from 'react';

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
    (async () => {
	  try {
		const { scheme } = await getUnsecure("colorScheme");
		Appearance.setColorScheme(scheme);
	  } catch {
		Appearance.setColorScheme("dark");
	  }

      await cleanUp();

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

			const persistedSubscription: ValidationResponse = await getUnsecure("subscription")
			dispatchSubscription({ type: persistedSubscription.valid ? persistedSubscription.freeTrial ? "FREE_TRIAL" : "SUBSCRIBED" : "NOT_SUBSCRIBED" })

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
   
      }).catch((err) => {
        Sentry.Native.captureException(err);
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
			const persistedSubscription: ValidationResponse = await getUnsecure("subscription")
			dispatchSubscription({ type: persistedSubscription.valid ? persistedSubscription.freeTrial ? "FREE_TRIAL" : "SUBSCRIBED" : "NOT_SUBSCRIBED" })

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
      <SkemaNav.Screen name={"Modul View"} component={ModulNavigator} options={({ route }: any) => ({ title: route.params.modul.title ?? route.params.modul.team.join(", ") })} initialParams={{
        origin: "Skema"
      }} />
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

const Modul = createMaterialTopTabNavigator();

export function ModulNavigator({ route }: {
  route: RouteProp<any>,
}) {
  if(!route?.params?.origin)
    throw new Error("Origin not present on Modul Navigator")

  const scheme = useColorScheme();
  const theme = themes[scheme ?? "dark"];

  return (
    <Modul.Navigator
      initialRouteName='Oversigt' initialLayout={{
       width: Dimensions.get("window").width
      }}
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.ACCENT_BLACK,
        },
        tabBarLabelStyle: {
          fontWeight: "bold"
        },
        tabBarActiveTintColor: theme.WHITE.toString(),
        tabBarIndicatorStyle: {
          backgroundColor: theme.DARK,
          height: 5,
        },

        lazy: true,
      }}
      sceneContainerStyle={{
        backgroundColor: theme.BLACK,
      }}
    >
      <Modul.Screen name={"Oversigt"} component={ModulView} options={{title: "Oversigt", }} initialParams={{
        ...route.params,
      }} />
      <Modul.Screen name={"Andet"} component={Lektier} options={{title: "Andet"}} initialParams={route.params} />
    </Modul.Navigator>
  )
}

const Absence = createMaterialTopTabNavigator();

export function AbsenceNavigator() {
  const scheme = useColorScheme();
  const theme = themes[scheme ?? "dark"];

  return (
    <Absence.Navigator
      initialRouteName='Fravær' initialLayout={{
       width: Dimensions.get("window").width
      }}
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.ACCENT_BLACK,
        },
        tabBarLabelStyle: {
          fontWeight: "bold"
        },
        tabBarActiveTintColor: theme.WHITE.toString(),
        tabBarIndicatorStyle: {
          backgroundColor: theme.DARK,
          height: 5,
        },

        lazy: true
      }}
      sceneContainerStyle={{
        backgroundColor: theme.BLACK,
      }}
    >
      <Absence.Screen name={"Fravær"} component={Fravær} options={{title: "Fravær"}} />
      <Absence.Screen name={"Registration"} component={Registreringer} options={{title: "Registration"}} />
    </Absence.Navigator>
  )
}



export default App;