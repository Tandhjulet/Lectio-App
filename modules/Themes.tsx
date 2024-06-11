import React from "react";
import { Appearance, ColorValue } from "react-native";

export type Theme = {
  BLACK: ColorValue,
  ACCENT_BLACK: ColorValue,
  DARK: ColorValue,
  LIGHT: ColorValue,
  ACCENT: ColorValue,
  WHITE: ColorValue,
  RED: ColorValue,
}

export const LightTheme: Theme = {
  BLACK: "#f2f2f2",
  ACCENT_BLACK: "#e3e3e3",
  DARK: "#89b39e",
  LIGHT: "#5C8374",
  ACCENT: "#3d6354",
  WHITE: "#000000",
  RED: "#ff7a7a",
}

export const DarkTheme: Theme = {
  BLACK: "#000000",
  ACCENT_BLACK: "#0b0d0c", 
  DARK: "#183D3D",
  LIGHT: "#5C8374",
  ACCENT: "#9bd1bc",
  WHITE: "#d1d1d1",
  RED: "#ff7a7a",
}

export const themes = {light: LightTheme, dark: DarkTheme};

/**
 * Converts hex to RGBA color
 * @param hex 
 * @param opacity 
 * @returns RGBA color as string
 */
export function hexToRgb(hex: string, opacity: number = 1) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if(result == null) // isn't a valid hex color
      return hex; 
    // parse every hexadecimal integer (radix 16) as a 10-bit int, and format it into RGBA color format
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`
  }