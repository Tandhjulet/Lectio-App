import { createContext } from "react";

type AuthState = {
    signIn: any,
    signOut: any,
}

export const AuthContext = createContext<AuthState>({
    signIn: () => {
        console.log("wrong auth context called.")
    },
    signOut: () => {
        console.log("wrong auth context called.")
    },
  });