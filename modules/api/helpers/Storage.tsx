import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * @param key the key of the item
 * @returns the object fetched from secure storage
 */
export async function secureGet(key: string) {
    const stringifiedValue = await SecureStore.getItemAsync(key);
    if(stringifiedValue == null)
        return null;
    
    try {
        return JSON.parse(stringifiedValue);
    } catch {
        return stringifiedValue;
    }
}

/**
 * Securely saves a K,V pair in secure store
 * @param key 
 * @param value 
 */
export async function secureSave(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
}

/**
 * Securely removes a K,V pair from secure store
 * @param key 
 */
export async function removeSecure(key: string) {
    await SecureStore.deleteItemAsync(key);
}

/**
 * Removes a K,V pair from async storage
 * @param key 
 */
export async function removeUnsecure(key: string) {
    await AsyncStorage.removeItem(key);
}

/**
 * Saves a K,V pair unsecurely (other apps can access this data)
 * @param key 
 * @param value 
 */
export async function saveUnsecure(key: string, value: object) {
    const stringifiedValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, stringifiedValue);
}

/**
 * Gets an unsecure value from async storage
 * @param key 
 * @returns 
 */
export async function getUnsecure(key: string): Promise<any> {
    const stringifiedValue = await AsyncStorage.getItem(key);
    if(stringifiedValue == null)
        return null;
    return JSON.parse(stringifiedValue);
}
