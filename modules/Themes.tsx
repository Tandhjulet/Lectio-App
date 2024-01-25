/**
 * Color scheme
 */
const COLORS = {
    "BLACK": "#000000",
    "ACCENT_BLACK": "#0b0d0c", 
    "DARK": "#183D3D",
    "LIGHT": "#5C8374",
    "ACCENT": "#9bd1bc",
    "WHITE": "#d1d1d1",
    "RED": "#ff7a7a",
} as const;

export default COLORS;

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