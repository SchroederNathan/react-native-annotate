# react-native-annotate

Visual annotation overlay for React Native apps. Tap any component in dev mode, leave a note, copy markdown for AI agents.

Inspired by [agentation.com](https://www.agentation.com/) — but for React Native instead of the browser.

## How it works

1. Wrap your app in `<AnnotationProvider>`.
2. In dev builds (`__DEV__`), a floating ✎ button appears.
3. Tap it to enter annotation mode, then tap any element on screen.
4. Type a note. Repeat for as many elements as you want.
5. Open the drawer (≡) and press **Copy as markdown** — your clipboard now has agent-ready context like:

```markdown
# UI feedback for agent

## 1. SubmitButton
- **Source:** `app/components/SubmitButton.tsx:42:8`
- **Note:** This button is too small on smaller screens.

## 2. ProfileHeader
- **Source:** `app/screens/Profile.tsx:18:4`
- **Note:** The avatar should be circular, not square.
```

Paste it into Claude Code, Cursor, or any other coding agent.

In production builds the provider compiles down to a pass-through fragment — no overlay, no listeners, zero overhead.

## Installation

```sh
npm install react-native-annotate
# or
yarn add react-native-annotate
```

You also need **one** clipboard backend (whichever you already use):

```sh
# Expo apps
npx expo install expo-clipboard

# bare React Native
npm install @react-native-clipboard/clipboard
cd ios && pod install
```

Works in both Expo and bare React Native. No native module, no config plugin, no Codegen — pure JS.

## Usage

```tsx
import { AnnotationProvider } from 'react-native-annotate';

export default function App() {
  return (
    <AnnotationProvider>
      <YourApp />
    </AnnotationProvider>
  );
}
```

That's it.

### Programmatic access

If you want to drive the annotator yourself (custom buttons, automated capture, etc.) use the hook:

```tsx
import { useAnnotations } from 'react-native-annotate';

function DevTools() {
  const { annotations, copyAsMarkdown, clearAnnotations } = useAnnotations();
  return (
    <View>
      <Text>{annotations.length} notes</Text>
      <Button title="Copy" onPress={copyAsMarkdown} />
      <Button title="Clear" onPress={clearAnnotations} />
    </View>
  );
}
```

### Props

| Prop      | Type      | Default   | Description                                                                                          |
| --------- | --------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `enabled` | `boolean` | `__DEV__` | Force on/off. Useful for internal QA builds where you want the annotator active in release configs. |

## How component identification works

Under the hood we call React Native's own dev-inspector API (`UIManager.getInspectorDataForViewAtPoint`) at the tap coordinate. That returns the component hierarchy plus the JSX `__source` metadata (file, line, column) that Babel injects in dev builds. No fiber walking, no React internals — works on both Paper and Fabric.

If the metadata isn't available (third-party component, missing source map, etc.) the annotation still saves with `Unknown` as the component name and "source unavailable" in the markdown.

## Limitations

- **Dev mode only by default.** JSX `__source` is stripped from production bundles, so we can't extract file/line there. Pass `enabled` if you want the UI in release builds — notes will still capture, but most components will show as `Unknown`.
- **Fabric is supported** via the same API — but I've only smoke-tested it on the architecture the example app defaults to. File an issue if you hit something.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Scaffolded with [create-react-native-library](https://github.com/callstack/react-native-builder-bob).
