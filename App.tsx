import { NavigationContainer, NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Skema from './pages/Skema';
import Beskeder from './pages/Beskeder';
import Mere from './pages/Mere';
import Header from './components/Header';

import Login from './pages/login/Login';
import Schools from './pages/login/Schools';
import COLORS from './modules/Themes';
import Absence from './pages/mere/Absence';
import TeachersAndStudents from './pages/mere/TeachersAndStudents';
import BeskedView from './pages/beskeder/BeskedView';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { authorize, getUnsecure, secureGet, secureSave } from './modules/api/Authentication';
import SplashScreen from './pages/SplashScreen';
import { AuthContext } from './modules/Auth';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NavigationBar from './components/Navbar';
import ModulView from './pages/skema/ModulView';
import { scrapePeople } from './modules/api/scraper/class/PeopleList';
import Afleveringer from './pages/Afleveringer';
import AfleveringView from './pages/afleveringer/AfleveringView';


const AppStack = createNativeStackNavigator();
const Settings = createNativeStackNavigator();
const Messages = createNativeStackNavigator();
const Opgaver = createNativeStackNavigator();
const SkemaNav = createNativeStackNavigator();

const Tab = createBottomTabNavigator();


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
            payload: action.payload,
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

      if(await authorize(payload)) {
        dispatch({ type: 'SIGN_IN', payload: payload });

        setTimeout(() => scrapePeople(), 5000);
      } else
        dispatch({ type: 'SIGN_OUT' });

    })();
  }, []);

  const authContext = useMemo(
    () => ({
      signIn: async (payload: SignInPayload) => {
        if(payload.username == null || payload.password == null || payload.gym == null)
          return false;

        if(await authorize(payload)) {
          secureSave("username", payload.username);
          secureSave("password", payload.password);

          setTimeout(() => dispatch({ type: 'SIGN_IN', payload: payload }), 200);
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

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
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
                  <AppStack.Screen name="Login" component={Login} />

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
      <AppStack.Screen name={"Skema"} component={Skema} options={{
        header: () => <></>
      }} />
      <AppStack.Screen name={"Modul View"} component={ModulView} options={({ route }: any) => ({ title: route.params.modul.team })} />
    </SkemaNav.Navigator>
  )
}

export function BeskedNavigator() {
  return (
    <Messages.Navigator initialRouteName="BeskedList" screenOptions={{
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
      <AppStack.Screen name={"BeskedList"} component={Beskeder} options={{ title: "Beskeder" }} />
      <AppStack.Screen name={"BeskedView"} component={BeskedView} options={{ title: "Besked" }} />
    </Messages.Navigator>
  )
}

export function AfleveringNavigator() {
  return (
    <Opgaver.Navigator initialRouteName="AfleveringList" screenOptions={{
      gestureEnabled: true,
      contentStyle: {backgroundColor: COLORS.BLACK},
      headerShown: false,
    }}>
      <AppStack.Screen name={"AfleveringList"} component={Afleveringer} />

      <AppStack.Screen name={"AfleveringView"} component={AfleveringView} />
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
      <AppStack.Screen name={"Settings"} component={Mere} options={{title: "Indstillinger"}} />

      <Settings.Screen name={"Absence"} component={Absence} options={{title: "Fravær"}} />
      <Settings.Screen name={"Afleveringer"} component={AfleveringNavigator} />
      <Settings.Screen name={"TeachersAndStudents"} component={TeachersAndStudents} options={{title: "Lærere og elever"}} />
    </Settings.Navigator>
  )
}

/* TODO: Loading screen here instead of null */