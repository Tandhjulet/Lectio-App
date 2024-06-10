import { ConfigPlugin } from "@expo/config-plugins"
import { withWidgetIos } from "./ios/withWidgetIos"

const withAppConfigs: ConfigPlugin<WithWidgetProps> = (config, options) => {
  //config = withWidgetAndroid(config)
  config = withWidgetIos(config, options)
  return config
}

export default withAppConfigs