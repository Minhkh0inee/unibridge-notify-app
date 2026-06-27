# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm start          # Start Expo dev server (Metro bundler)
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in browser
npm run lint       # Run ESLint via expo lint
npm run reset-project  # Move starter code to app-example/, create blank app/
```

## Architecture

This is an **Expo SDK 56** app using **expo-router** for file-based routing. All source lives in `src/`, with routes under `src/app/` and the app entry point set to `expo-router/entry` in package.json.

**Path aliases** (`tsconfig.json`):
- `@/*` → `src/*`
- `@/assets/*` → `assets/*`

**Routing** (`src/app/`): `_layout.tsx` is the root layout — it wraps everything in `ThemeProvider` and renders `AnimatedSplashOverlay` + `AppTabs`. Tab screens are `index.tsx` (Home) and `explore.tsx`. Tabs use `expo-router/unstable-native-tabs` (`NativeTabs`) on native; `src/components/app-tabs.web.tsx` is the web-specific version.

**Theming** (`src/constants/theme.ts`): Central source for `Colors` (light/dark token map), `Fonts` (platform-specific font stacks), `Spacing` (named numeric scale), and layout constants (`BottomTabInset`, `MaxContentWidth`). The `useTheme()` hook in `src/hooks/use-theme.ts` returns the active color set. Platform-specific hook overrides use `.web.ts` / `.ts` file pairs (e.g., `use-color-scheme`).

**Components** (`src/components/`): Themed primitives (`ThemedText`, `ThemedView`) consume `useTheme()` directly. `AnimatedIcon` / `AnimatedSplashOverlay` use `react-native-reanimated` Keyframes and `react-native-worklets` for the splash transition — `scheduleOnRN` is used to call React state setters from worklet callbacks.

**Experiments enabled** (`app.json`): `typedRoutes` (type-safe `href` props) and `reactCompiler` (React 19 compiler).

**Web output**: Static (`"output": "static"` in `app.json`). CSS is in `src/global.css`, imported via `src/constants/theme.ts`.

**iOS native project** is pre-generated under `ios/` with CocoaPods already installed (Pods directory present). Bundle ID: `com.minhkhoi09012003.unibridge-notify-app`.
