export async function copyToClipboard(text: string): Promise<void> {
  try {
    const expo = require('expo-clipboard');
    if (expo && typeof expo.setStringAsync === 'function') {
      await expo.setStringAsync(text);
      return;
    }
  } catch {
    // expo-clipboard not installed; try the community package
  }

  try {
    const mod = require('@react-native-clipboard/clipboard');
    const community = mod?.default ?? mod;
    if (community && typeof community.setString === 'function') {
      community.setString(text);
      return;
    }
  } catch {
    // community clipboard not installed either
  }

  throw new Error(
    'react-native-annotate: no clipboard backend found. Install `expo-clipboard` or `@react-native-clipboard/clipboard` in your app.'
  );
}
