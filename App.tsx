import { NavigationContainer, NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Skema from './pages/Skema';
import Beskeder from './pages/Beskeder';
import Lektier from './pages/Lektier';
import Mere from './pages/Mere';
import Header from './components/Header';

import Login from './pages/login/Login';
import Schools from './pages/login/Schools';
import COLORS from './modules/Themes';
import Absence from './pages/mere/Absence';
import TeachersAndStudents from './pages/mere/TeachersAndStudents';
import TruantOMeter from './pages/mere/TruantOMeter';
import { LogBox, Text, View } from 'react-native';
import BeskedView from './pages/beskeder/BeskedView';
import { createContext, useEffect, useMemo, useReducer, useState } from 'react';
import { authorize, getUnsecure, secureGet, secureSave } from './modules/api/Authentication';
import { getItemAsync } from 'expo-secure-store';
import SplashScreen from './pages/SplashScreen';
import { AuthContext } from './modules/Auth';

const AppStack = createNativeStackNavigator();
const Settings = createNativeStackNavigator();

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

      if(await authorize(payload))
        dispatch({ type: 'SIGN_IN', payload: payload });
      else
        dispatch({ type: 'SIGN_OUT' });

    })();
  }, []);

  const authContext = useMemo(
    () => ({
      signIn: async (payload: SignInPayload) => {
        if(payload.username == null || payload.password == null || payload.gym == null || (payload.gym.gymNummer == "0" && payload.gym.gymName == "Vælg venligst et gymnasie."))
          return false;

        if(await authorize(payload)) {
          secureSave("username", payload.username);
          secureSave("password", payload.password);

          setTimeout(() => dispatch({ type: 'SIGN_IN', payload: payload }), 250);
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
          {state.isLoading ? (
            <AppStack.Screen name="Splash" component={SplashScreen} />
          ) : (
            <>
              {!state.loggedIn ? (
                <>
                  <AppStack.Screen name="Login" component={Login} />

                  <AppStack.Screen name="Schools" component={Schools} options={{
                    header: ({ navigation, route, options, back }) => Header({ navigation, route, options, back })
                  }} />
                </>
              ) : (
                <>
                  <AppStack.Screen name="Skema" component={Skema} options={{
                    header: () => <></>
                  }} />
        
                  <AppStack.Screen name="Beskeder" component={BeskedNavigator} options={{
                    header: () => <></>
                  }} />
                  <AppStack.Screen name="Lektier" component={Lektier} />
        
                  <AppStack.Screen name="Mere" component={MereNavigator} options={{
                    header: () => <></>
                  }} />
                </>
              )}
            </>
          )}
        </AppStack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

export function BeskedNavigator() {
  return (
    <Settings.Navigator initialRouteName="BeskedList" screenOptions={{
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
    </Settings.Navigator>
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
      <AppStack.Screen name={"Settings"} component={Mere} />

      <Settings.Screen name={"Absence"} component={Absence} />
      <Settings.Screen name={"TruantOMeter"} component={TruantOMeter} />
      <Settings.Screen name={"TeachersAndStudents"} component={TeachersAndStudents} />
    </Settings.Navigator>
  )
}

/* TODO: Loading screen here instead of null */