import { NavigationContainer, NavigationProp, useNavigation, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Skema from './Skema';
import Beskeder from './Beskeder';
import Lektier from './Lektier';
import Mere from './Mere';
import Header from '../components/Header';

import Loading from './Loading';
import Login from './login/Login';
import Schools from './login/Schools';
import COLORS from '../modules/Themes';
import { View } from 'react-native';
import Absence from './mere/Absence';
import TeachersAndStudents from './mere/TeachersAndStudents';
import TruantOMeter from './mere/TruantOMeter';

const AppStack = createNativeStackNavigator();
const Settings = createNativeStackNavigator();

export default function App() {
  return (
    <>
        <NavigationContainer>
          <AppStack.Navigator initialRouteName="Loading" screenOptions={{gestureEnabled: false, contentStyle: {backgroundColor: COLORS.BLACK}, animation:'none', header: ({ navigation, route, options, back }) => Header({ navigation, route, options, back })}}>
            <AppStack.Screen name="Loading" component={Loading} />

            <AppStack.Screen name="Schools" component={Schools} />
            <AppStack.Screen name="Login" component={Login} />

            <AppStack.Screen name="Skema" component={Skema} />
            <AppStack.Screen name="Beskeder" component={Beskeder} />
            <AppStack.Screen name="Lektier" component={Lektier} />

            <AppStack.Screen name="Mere" component={MereNavigator} />
          </AppStack.Navigator>
        </NavigationContainer>
    </>
  );
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
      <AppStack.Screen name="Settings" component={Mere} />

      <Settings.Screen name={"Absence"} component={Absence} />
      <Settings.Screen name={"TruantOMeter"} component={TruantOMeter} />
      <Settings.Screen name={"TeachersAndStudents"} component={TeachersAndStudents} />
    </Settings.Navigator>
  )
}

/* TODO: Loading screen here instead of null */