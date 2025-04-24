/**
 * Generates a consistent HSL color value from a string
 * @param {string} str - The string to hash
 * @returns {string} - HSL color value
 */
export function generateColorFromString(str) {
    if (!str) return null
  
    // Create a simple hash from the string
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
  
    // Hash to HSL color
    // fixed saturation and lightness for consistency
    // Hue ranges from 0 to 360
    const hue = Math.abs(hash % 360)
  
    // Different saturation and lightness values for light/dark mode
    // Good contrast in both modes
    return {
      light: `hsl(${hue}, 85%, 90%)`,
      dark: `hsl(${hue}, 70%, 25%)`,
    }
  }
  