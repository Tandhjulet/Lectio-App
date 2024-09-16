// import 'ts-node/register';
import { ExpoConfig, ConfigContext } from 'expo/config';
// import { Platform } from 'react-native';

// const IS_IOS = Platform.OS === "ios";

const getName = () => {
  return "EasyStudy";
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  "name": getName(),
  "slug": getName(),
  "version": "1.6.1",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "userInterfaceStyle": "automatic",
  "scheme": "lectimate",
  "splash": {
    "image": "./assets/splash-transparent.png",
    "resizeMode": "contain"
  },
  "ios": {
    "supportsTablet": false,
    "entitlements": {
      "com.apple.security.application-groups": [
        "group.com.tandhjulet.lectimate.widget"
      ]
    },
    "bundleIdentifier": "com.tandhjulet.lectimate",
    "buildNumber": "29"
  },
  "plugins": [
    [
      "expo-build-properties",
      {
        "ios": {
          "deploymentTarget": "17.0"
        },
        "android": {
          "targetSdkVersion": 33,
          "compileSdkVersion": 33,
          "minSdkVersion": 21,
          "kotlinVersion": "1.9.0"
        }
      }
    ],
    [
      "@bacons/apple-targets",
      {
        "appleTeamId": "BBTQB8LB7C"
      }
    ],
    [
      "sentry-expo"
    ]
  ],
  "android": {
    "package": "com.tandhjulet.lectimate"
  },
  "hooks": {
    "postPublish": [
      {
        "file": "sentry-expo/upload-sourcemaps",
        "config": {
          "organization": "mads-bech-mortensen",
          "project": "lectimate"
        }
      }
    ]
  },
  "extra": {
    "eas": {
      "build": {
        "experimental": {
          "ios": {
            "appExtensions": [
              {
                "bundleIdentifier": "com.tandhjulet.lectimate.widget",
                "targetName": "Skema",
                "entitlements": {
                  "com.apple.security.application-groups": [
                    "group.com.tandhjulet.lectimate.widget"
                  ]
                }
              }
            ]
          }
        }
      },
      "projectId": "c5fb3ba4-07c3-4038-9df9-84a012f49e9f"
    }
  },
  "runtimeVersion": {
    "policy": "appVersion"
  },
  "updates": {
    "url": "https://u.expo.dev/c5fb3ba4-07c3-4038-9df9-84a012f49e9f"
  }
})
