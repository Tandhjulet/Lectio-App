import { NavigationContainer, NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Skema from './pages/Skema';
import Beskeder from './pages/Beskeder';
import Mere from './pages/Mere';
import Header from './components/Header';
import { HeaderBackButton } from "@react-navigation/elements";

import Login from './pages/login/Login';
import Schools from './pages/login/Schools';
import Absence from './pages/mere/Absence';
import TeachersAndStudents from './pages/mere/TeachersAndStudents';
import BeskedView from './pages/beskeder/BeskedView';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { authorize, getSecure, getUnsecure, saveUnsecure, secureGet, secureSave } from './modules/api/Authentication';
import SplashScreen from './pages/SplashScreen';
import { AuthContext } from './modules/Auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NavigationBar from './components/Navbar';
import ModulView from './pages/skema/ModulView';
import { scrapePeople } from './modules/api/scraper/class/PeopleList';
import Afleveringer from './pages/Afleveringer';
import AfleveringView from './pages/afleveringer/AfleveringView';
import ModulRegnskab from './pages/mere/ModulRegnskab';
import { Appearance, Button, Pressable, Text, View, useColorScheme } from 'react-native';
import { AdjustmentsVerticalIcon, ArrowUpOnSquareStackIcon, ChevronLeftIcon, PencilSquareIcon } from 'react-native-heroicons/solid';
import { HeaderStyleInterpolators, TransitionPresets, createStackNavigator } from '@react-navigation/stack';
import { cleanUp } from './modules/api/storage/Storage';

import {
  ProductPurchase,
  Purchase,
  SubscriptionPurchase,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
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

import { LogBox } from 'react-native';
LogBox.ignoreLogs(["Sending"]) // dårligt, men umiddelbart eneste løsning.

import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { PostPurchase } from './modules/API';
import LandingPage from './pages/login/LandingPage';
import { themes } from './modules/Themes';
import UserSettings from './pages/mere/UserSettings';

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

export const subSkus: Readonly<string[]> = [
  'com.tandhjulet.lectioplus.premium_yearly',
  'com.tandhjulet.lectioplus.premium_monthly',
];

export const subscribe = async (sku: string, offerToken: string | null) => {
  try {
    await requestSubscription({
      sku,
      ...(offerToken && {subscriptionOffers: [{sku, offerToken}]}),
    });
  } catch (err) {
    console.warn(err);
  }
};

export const checkSubscribed = async () => {
  const purchases = await getAvailablePurchases();
  await Promise.all(purchases.map(async purchase => {
    switch(purchase.productId) {
      case "com.tandhjulet.lectioplus.premium_yearly":
      case "com.tandhjulet.lectioplus.premium_monthly":
        
        break;
    }
    console.log(purchase);
  }))
}

export const isExpoGo = Constants.appOwnership === 'expo';

const App = () => {

  useEffect(() => {
    getUnsecure("useDarkMode").then((v: {result: boolean}) => {
      if(v.result == null) {
        Appearance.setColorScheme(null);
      } else {
        Appearance.setColorScheme(v.result ? "dark" : "light");
      }
    })
  })


  /**
   * Creates a connections to Apples IAP (WIP)
   */
  useEffect(() => {
    if(!isExpoGo) {
      initConnection().then(() => {
        console.log("init connection!");

        purchaseUpdatedListener(async (purchase: SubscriptionPurchase | ProductPurchase) => {
         const receipt = purchase.transactionReceipt;
   
         if(receipt) {
           console.log("purchase!")
           console.log(receipt);
   
           await finishTransaction({
             purchase,
             isConsumable: false,
           })
         }
        })
   
       })
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
   * Starts a clean up of the cache if it itsn't on cooldown.
   * Afterwards tries to authorize to Lectio with saved credentials, if there are any.
   */
  useEffect(() => {
    cleanUp();

    (async () => {
      let payload: SignInPayload = {
        gym: null,
        password: null,
        username: null,
      };

      payload = {
        gym: await getSecure("gym"),
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
            setTimeout(() => scrapePeople(), 500);
          }
        }, 100)
      } else {
        dispatch({ type: 'SIGN_IN' });
        setTimeout(() => scrapePeople(), 500);
      }
    })();
  }, []);

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
          
          console.log("authorized.")

          dispatch({ type: 'SIGN_IN' })
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

  const scheme = useColorScheme();
  const theme = themes[scheme || "dark"];
  
  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer theme={{colors: {
        background: theme.BLACK.toString(),
        primary: '',
        card: '',
        text: '',
        border: '',
        notification: ''
      }, dark: true}}>
          {state.isLoading ? (

            <AppStack.Navigator screenOptions={{
              headerShown: false,
            }}>
              <AppStack.Screen name="Splash" component={SplashScreen} options={{
                header: () => <></>
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
                  animation:'none',
        
                  headerStyle: {
                    backgroundColor: theme.ACCENT_BLACK.toString(),
                  },
                  headerTitleStyle: {
                    color: theme.WHITE.toString(),
                  },
                  headerBackVisible: false,
                }}>
                  <AppStack.Screen name="LandingPage" component={LandingPage} options={{
                    header: () => <></>
                  }} />
                  <AppStack.Screen name="Login" component={Login} options={{
                    header: () => <></>
                  }} />

                  <AppStack.Screen name="Schools" component={Schools} options={{
                    header: ({ navigation, route, options, back }) => Header({ navigation, route, options, back })
                  }} />
                </AppStack.Navigator>
              ) : (
                <Tab.Navigator
                  tabBar={props => <NavigationBar currentTab={props.state.key} navigation={props.navigation}/>}
                >
                  <Tab.Screen name="SkemaNavigator" component={SkemaNavigator} options={{
                    header: () => <></>
                  }} />
        
                  <Tab.Screen name="Beskeder" component={BeskedNavigator} options={{
                    header: () => <></>
                  }} />
        
                  <Tab.Screen name="Mere" component={MereNavigator} options={{
                    header: () => <></>
                  }} />
                </Tab.Navigator>
              )}
            </>
          )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

export function SkemaNavigator() {

  const scheme = useColorScheme();
  const theme = themes[scheme || "dark"];

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
      <SkemaNav.Screen name={"Skema"} component={Skema} options={{
        header: () => <></>
      }} />
      <SkemaNav.Screen name={"Modul View"} component={ModulView} options={({ route }: any) => ({ title: route.params.modul.team })} />
    </SkemaNav.Navigator>
  )
}

export function BeskedNavigator() {

  const scheme = useColorScheme();
  const theme = themes[scheme || "dark"];

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
        title: "Beskeder",
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

      <Messages.Screen name={"BeskedView"} component={BeskedView} options={{
        title: "Besked",
      }} />
    </Messages.Navigator>
  )
}

export function AfleveringNavigator() {

  const scheme = useColorScheme();
  const theme = themes[scheme || "dark"];

  return (
    <Opgaver.Navigator initialRouteName="AfleveringList" screenOptions={{
      gestureEnabled: true,
      headerStyle: {
        backgroundColor: theme.ACCENT_BLACK.toString(),
      },
      headerTitleStyle: {
        color: theme.WHITE.toString(),
      },
      headerBackTitleVisible: false,
      contentStyle: {backgroundColor: theme.BLACK}
    }}>
      <Opgaver.Screen name={"AfleveringList"} component={Afleveringer} options={({ navigation, route }) => ({
        headerRight: () => (
          <Pressable
            style={{
                padding: 4,

                backgroundColor: "rgba(0,122,255,0.2)",
                borderRadius: 100,
            }}
          >
            <View style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
            }}>
                <AdjustmentsVerticalIcon color={"rgba(0,122,255,1)"} />
                  <Text style={{
                      color: "rgba(0,122,255,1)",
                      marginLeft: 2.5,
                      marginRight: 1,
                  }}>
                    Venter
                  </Text>
            </View>
          </Pressable>
        ),
        headerLeft: () => (
          <View style={{
            position: "absolute",
            left: 0,
          }}>
            <HeaderBackButton labelVisible={false} onPress={() => {
              navigation.goBack();
            }} />
          </View>
        ),
        headerTitle: "Afleveringer",
      })} />
      <Opgaver.Screen name={"AfleveringView"} component={AfleveringView} options={{title: "Aflevering"}} />
    </Opgaver.Navigator>
  )
}

export function MereNavigator() {

  const scheme = useColorScheme();
  const theme = themes[scheme || "dark"];

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
      contentStyle: {backgroundColor: theme.BLACK}
    }}>
      <Settings.Screen name={"Settings"} component={Mere} options={{title: "Mere"}} />
      <Settings.Screen name={"UserSettings"} component={UserSettings} options={{title: "Brugerindstillinger"}} />

      <Settings.Screen name={"Absence"} component={Absence} options={{title: "Fravær"}} />
      <Settings.Screen name={"Afleveringer"} component={AfleveringNavigator} options={({ navigation, route }) => ({
        headerShown: false,
      })} />
      <Settings.Screen name={"ModulRegnskab"} component={ModulRegnskab} options={{title: "Modulregnskab"}} />
      <Settings.Screen name={"TeachersAndStudents"} component={TeachersAndStudents} options={{title: "Lærere og elever"}} />
    </Settings.Navigator>
  )
}

export default App;