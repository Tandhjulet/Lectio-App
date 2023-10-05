import React, {Fragment, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalendarIcon, EnvelopeIcon, ClockIcon, EllipsisHorizontalIcon } from 'react-native-heroicons/solid';
import COLORS from '../modules/Themes';

const styles = StyleSheet.create({
  navbarContainer: {
    width: '100%',
    backgroundColor: COLORS.BLACK,
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
  },
  iconCurrent: {
    color: COLORS.LIGHT,
    paddingHorizontal: 5,
  },
  icon: {
    color: COLORS.ACCENT,
    paddingHorizontal: 5,
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

  return (
    <>

      <View style={styles.navbarContainer}>
        <View
          style={{
              borderBottomColor: COLORS.ACCENT,
              opacity: 0.1,
              borderBottomWidth: 1,

              borderRadius: 5,

              marginHorizontal: 20,
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
                        <tab.icon style={styles.iconCurrent}></tab.icon>
                        <Text style={styles.iconCurrent}>{tab.slug}</Text>
                      </>
                    ) : (
                      <>
                        <tab.icon style={styles.icon}></tab.icon>
                        <Text style={styles.icon}>{tab.slug}</Text>
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