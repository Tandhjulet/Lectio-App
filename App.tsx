import { NavigationContainer, NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Skema from './pages/Skema';
import Beskeder from './pages/Beskeder';
import Lektier from './pages/Lektier';
import Mere from './pages/Mere';
import Header from './components/Header';

import Loading from './pages/Loading';
import Login from './pages/login/Login';
import Schools from './pages/login/Schools';
import COLORS from './modules/Themes';
import Absence from './pages/mere/Absence';
import TeachersAndStudents from './pages/mere/TeachersAndStudents';
import TruantOMeter from './pages/mere/TruantOMeter';
import { LogBox } from 'react-native';
import BeskedView from './pages/beskeder/BeskedView';
import { Text } from 'react-native-svg';

const AppStack = createNativeStackNavigator();
const Settings = createNativeStackNavigator();

export default function App() {
  return (
    <>
        <NavigationContainer>
          <AppStack.Navigator initialRouteName="Loading" screenOptions={{
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
            <AppStack.Screen name="Loading" component={Loading} />

            <AppStack.Screen name="Schools" component={Schools} options={{
              header: ({ navigation, route, options, back }) => Header({ navigation, route, options, back })
            }} />
            <AppStack.Screen name="Login" component={Login} />

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
          </AppStack.Navigator>
        </NavigationContainer>
    </>
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