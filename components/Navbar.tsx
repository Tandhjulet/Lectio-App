import React, {Fragment, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { CalendarIcon, EnvelopeIcon, ClockIcon, EllipsisHorizontalIcon } from 'react-native-heroicons/outline';
import { themes } from '../modules/Themes';
import { NavigationHelpers, ParamListBase, TabNavigationState } from '@react-navigation/native';
import { BottomTabDescriptorMap, BottomTabNavigationEventMap } from '@react-navigation/bottom-tabs/lib/typescript/src/types';
import { ArrowPathIcon } from 'react-native-heroicons/outline';

const styles = StyleSheet.create({
  navbarContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    minHeight: 50,

    paddingBottom: 30,
  },
  navbarWrapper: {
    display: 'flex',

    paddingTop: 15,

    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
  },
  iconContainer: {
    display: 'flex',
    gap: 2.5,
    alignItems: 'center',
    fontSize: '50px',
  }
});

const NavigationBar = ({ state, descriptors, navigation }: {
  state: TabNavigationState<ParamListBase>,
  descriptors: BottomTabDescriptorMap,
  navigation: NavigationHelpers<ParamListBase, BottomTabNavigationEventMap>,
}) => {
  const scheme = useColorScheme();
  const theme = themes[scheme ?? "dark"];

  return (
    <>
      <View style={{
        ...styles.navbarContainer,
        backgroundColor: theme.ACCENT_BLACK,
      }}>
        <View
          style={{
            borderBottomColor: theme.WHITE,
            opacity: 0.2,
            borderBottomWidth: StyleSheet.hairlineWidth,

            borderRadius: 5,

            marginHorizontal: 0,
          }}
        />

        <View style={styles.navbarWrapper}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const label =
              options.title !== undefined
                ? options.title
                : route.name;

            let Icon;
            switch(label) {
              case "Skema":
                Icon = CalendarIcon;
                break;
              case "Indbakke":
                Icon = EnvelopeIcon
                break;
              case "Mere":
                Icon = EllipsisHorizontalIcon
                break;
              default:
                Icon = ArrowPathIcon
            }

            return (
              <TouchableOpacity onPress={() => {
                navigation.navigate(route.name)
              }} key={index}>
                <View style={[styles.iconContainer, {
                  opacity: isFocused ? 1 : 0.7,
                }]}>
                  <Icon color={theme.ACCENT} />
                  <Text style={{
                    color: theme.ACCENT,
                  }}>
                    {label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  )
};

export default NavigationBar;