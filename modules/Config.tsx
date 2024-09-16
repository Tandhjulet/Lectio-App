import { Platform } from "react-native";

export const SCHEMA_SEP_CHAR = "•";

const IS_IOS = Platform.OS === "ios";

export const getName = () => {
  return IS_IOS ? "EasyStudy" : "Lectimate";
}