/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
    type: "widget",
    name: "Skema",
    frameworks: [
        "SwiftUI",
        "WidgetKit",
        "Intents"
    ],

    colors: {
      $AccentColor: {light: "#ffffff", dark: "#000000"},
      $Light: {light: "#3D6354", dark: "#9BD1BC"},
      $Primary: {light: "rgba(9,135,86,0.9)", dark: "rgb(31,184,124)"},
      $Red: "#FC5353",
      $widgetBackground: {light: "#ffffff", dark: "#000000"},
    },
    deploymentTarget: "17.0",
    entitlements: {
        "com.apple.security.application-groups": ["group.com.tandhjulet.lectimate.widget"]
    }
};