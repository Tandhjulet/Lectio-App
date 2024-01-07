/**
 * Color scheme
 */
const COLORS = {
    "BLACK": "#040D12", 
    "DARK": "#183D3D",
    "LIGHT": "#5C8374",
    "ACCENT": "#93B1A6",
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
    if(result == null)
      return hex;
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`
  }