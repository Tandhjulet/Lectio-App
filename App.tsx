import { NavigationContainer, NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Skema from './pages/Skema';
import Beskeder from './pages/Beskeder';
import Mere from './pages/Mere';
import Header from './components/Header';
import { HeaderBackButton } from "@react-navigation/elements";

import Login from './pages/login/Login';
import Schools from './pages/login/Schools';
import COLORS from './modules/Themes';
import Absence from './pages/mere/Absence';
import TeachersAndStudents from './pages/mere/TeachersAndStudents';
import BeskedView from './pages/beskeder/BeskedView';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { authorize, getUnsecure, saveUnsecure, secureGet, secureSave } from './modules/api/Authentication';
import SplashScreen from './pages/SplashScreen';
import { AuthContext } from './modules/Auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NavigationBar from './components/Navbar';
import ModulView from './pages/skema/ModulView';
import { scrapePeople } from './modules/api/scraper/class/PeopleList';
import Afleveringer from './pages/Afleveringer';
import AfleveringView from './pages/afleveringer/AfleveringView';
import ModulRegnskab from './pages/mere/ModulRegnskab';
import { Button, Pressable, Text, View } from 'react-native';
import { AdjustmentsVerticalIcon, ArrowUpOnSquareStackIcon, ChevronLeftIcon, PencilSquareIcon } from 'react-native-heroicons/solid';
import { HeaderStyleInterpolators, TransitionPresets, createStackNavigator } from '@react-navigation/stack';
import { cleanUp } from './modules/api/storage/Storage';


const AppStack = createNativeStackNavigator();
const Settings = createNativeStackNavigator();
const Messages = createStackNavigator();
const Opgaver = createNativeStackNavigator();
const SkemaNav = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

import { LogBox } from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import Checkout from './pages/payment/Checkout';
import { STRIPE_PUBLIC_KEY, URL_SCHEME } from './modules/Config';
LogBox.ignoreLogs(["Sending"])

import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

urlScheme:
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

export default function App() {
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

  useEffect(() => {
    cleanUp();

    (async () => {
      let payload: SignInPayload = {
        gym: null,
        password: null,
        username: null,
      };

      try {

        payload = {
          gym: await getUnsecure("gym"),
          password: await secureGet("password"),
          username: await secureGet("username"),
        }

      } catch (e) {
      }
      // validation here

      console.log(payload)
      if(await authorize(payload)) {
        dispatch({ type: 'SIGN_IN' });

        setTimeout(() => scrapePeople(), 500);
      } else
        dispatch({ type: 'SIGN_OUT' });

    })();
  }, []);

  const authContext = useMemo(
    () => ({
      signIn: async (payload: SignInPayload) => {
        if(payload.username == null || payload.password == null || payload.gym == null)
          return false;

        console.log(payload)
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

  const { handleURLCallback } = useStripe();

  const handleDeepLink = useCallback(
    async (url: string | null) => {
      if (url) {
        const stripeHandled = await handleURLCallback(url);
        if (stripeHandled) {
          // This was a Stripe URL - you can return or add extra handling here as you see fit
        } else {
          // This was NOT a Stripe URL – handle as you normally would
        }
      }
    },
    [handleURLCallback]
  );

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
    };

    getUrlAsync();

    const deepLinkListener = Linking.addEventListener(
      'url',
      (event: { url: string }) => {
        handleDeepLink(event.url);
      }
    );

    return () => deepLinkListener.remove();
  }, [handleDeepLink]);


  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLIC_KEY}
      urlScheme={URL_SCHEME}
    >
      <AuthContext.Provider value={authContext}>
        <NavigationContainer theme={{colors: {
          background: COLORS.BLACK,
          primary: '',
          card: '',
          text: '',
          border: '',
          notification: ''
        }, dark: true}}>
            {state.isLoading ? (

              <AppStack.Navigator screenOptions={{
                gestureEnabled: false,
                contentStyle: {
                  backgroundColor: COLORS.BLACK
                },
                animation:'none',
      
                headerStyle: {
                  backgroundColor: COLORS.BLACK,
                },
                headerTitleStyle: {
                  color: COLORS.WHITE,
                },
                headerBackVisible: false,
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
                      backgroundColor: COLORS.BLACK
                    },
                    animation:'none',
          
                    headerStyle: {
                      backgroundColor: COLORS.BLACK,
                    },
                    headerTitleStyle: {
                      color: COLORS.WHITE,
                    },
                    headerBackVisible: false,
                  }}>
                    <AppStack.Screen name="Login" component={Login} options={{
                      header: () => <></>
                    }} />

                    <AppStack.Screen name="Schools" component={Schools} options={{
                      header: ({ navigation, route, options, back }) => Header({ navigation, route, options, back })
                    }} />
                  </AppStack.Navigator>
                ) : (
                  <Tab.Navigator
                    tabBar={props => <NavigationBar currentTab={props.state.key} navigation={props.navigation} />}
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
    </StripeProvider>
  );
}

export function SkemaNavigator() {
  return (
    <SkemaNav.Navigator initialRouteName="Skema" screenOptions={{
      gestureEnabled: true,
      headerStyle: {
        backgroundColor: COLORS.BLACK,
      },
      headerTitleStyle: {
        color: COLORS.WHITE,
      },
      headerBackTitleVisible: false,
      contentStyle: {backgroundColor: COLORS.BLACK},
    }}>
      <SkemaNav.Screen name={"Skema"} component={Skema} options={{
        header: () => <></>
      }} />
      <SkemaNav.Screen name={"Modul View"} component={ModulView} options={({ route }: any) => ({ title: route.params.modul.team })} />
    </SkemaNav.Navigator>
  )
}

export function BeskedNavigator() {
  return (
    <Messages.Navigator initialRouteName="BeskedList" screenOptions={{
      gestureEnabled: true,
      headerStyle: {
        backgroundColor: COLORS.BLACK,
        shadowColor: "rgba(255, 255, 255, 0.2)",
      },
      headerTitleStyle: {
        color: COLORS.WHITE,
        fontSize: 17,
      },
      headerBackTitleVisible: false,
      headerStatusBarHeight: 47,

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
  return (
    <Opgaver.Navigator initialRouteName="AfleveringList" screenOptions={{
      gestureEnabled: true,
      headerStyle: {
        backgroundColor: COLORS.BLACK,
      },
      headerTitleStyle: {
        color: COLORS.WHITE,
      },
      headerBackTitleVisible: false,
      contentStyle: {backgroundColor: COLORS.BLACK}
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
  return (
    <Settings.Navigator initialRouteName="Settings" screenOptions={{
      gestureEnabled: true,
      headerStyle: {
        backgroundColor: COLORS.BLACK,
      },
      headerTitleStyle: {
        color: COLORS.WHITE,
      },
      headerBackTitleVisible: false,
      contentStyle: {backgroundColor: COLORS.BLACK}
    }}>
      <Settings.Screen name={"Settings"} component={Mere} options={{title: "Indstillinger"}} />

      <Settings.Screen name={"Absence"} component={Absence} options={{title: "Fravær"}} />
      <Settings.Screen name={"Afleveringer"} component={AfleveringNavigator} options={({ navigation, route }) => ({
        headerShown: false,
      })} />
      <Settings.Screen name={"ModulRegnskab"} component={ModulRegnskab} options={{title: "Modulregnskab"}} />
      <Settings.Screen name={"TeachersAndStudents"} component={TeachersAndStudents} options={{title: "Lærere og elever"}} />
      <Settings.Screen name={"Checkout"} component={Checkout} options={{title: "Check out"}} />
    </Settings.Navigator>
  )
}

/* TODO: Loading screen here instead of null */