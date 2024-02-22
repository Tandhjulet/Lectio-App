import React, {Fragment, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { CalendarIcon, EnvelopeIcon, ClockIcon, EllipsisHorizontalIcon } from 'react-native-heroicons/solid';
import { themes } from '../modules/Themes';

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

type NavbarTab = {
  "icon": any;
  "slug": String;
}

export type Props = {
  currentTab: String;
  navigation: any;
}

const navTabs: NavbarTab[] = [{
  "icon": CalendarIcon,
  "slug": "Skema",
}, {
  "icon": EnvelopeIcon,
  "slug": "Beskeder",
}, {
  "icon": EllipsisHorizontalIcon,
  "slug": "Mere",
}];

const NavigationBar: React.FC<Props> = ({
  currentTab,
  navigation,
}) => {

  const scheme = useColorScheme();
  const theme = themes[scheme || "dark"];

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
          {navTabs.map(tab => {
            return (
              <Fragment key={tab.slug as React.Key}>

                <TouchableOpacity onPress={() => {navigation.navigate(tab.slug)}}>
                  <View style={styles.iconContainer}>
                    {(currentTab === tab.slug) ? (
                      <>
                        <tab.icon style={{
                          color: theme.LIGHT,
                          paddingHorizontal: 5,
                        }}></tab.icon>
                        <Text style={{
                          color: theme.LIGHT,
                          paddingHorizontal: 5,
                        }}>{tab.slug}</Text>
                      </>
                    ) : (
                      <>
                        <tab.icon style={{
                          color: theme.ACCENT,
                          paddingHorizontal: 5,
                        }}></tab.icon>
                        <Text style={{
                          color: theme.ACCENT,
                          paddingHorizontal: 5,
                        }}>{tab.slug}</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>

              </Fragment>);
          })}
        </View>
      </View>
    </>
  )
};

export default NavigationBar;