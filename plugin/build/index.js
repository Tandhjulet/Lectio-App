"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const withWidgetIos_1 = require("./ios/withWidgetIos");
const withAppConfigs = (config, options) => {
    //config = withWidgetAndroid(config)
    config = (0, withWidgetIos_1.withWidgetIos)(config, options);
    return config;
};
exports.default = withAppConfigs;
