import { createContext } from "react";

type AuthState = {
    signIn: any,
    signOut: any,
}

export const AuthContext = createContext<AuthState>({
    signIn: () => {},
    signOut: () => {},
  });