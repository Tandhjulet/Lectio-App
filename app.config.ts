import { ExpoConfig, ConfigContext } from 'expo/config';

const getName = () => {
  return "EasyStudy";
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  slug: 'lectimate',
  name: getName(),
});