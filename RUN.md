# Run Instructions

> Make sure you have completed [SETUP.md](./SETUP.md) before running the app.

## Development

```bash
npm start          # Start Expo dev server (Metro bundler)
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in browser
```

When `npm start` is running, press:

| Key | Action |
|-----|--------|
| `i` | Open iOS simulator |
| `a` | Open Android emulator |
| `w` | Open in browser |
| `r` | Reload app |
| `m` | Toggle menu |
| `?` | Show all commands |

## iOS Simulator

Requires Xcode installed. On first run, pods must be installed:

```bash
npx pod-install
npm run ios
```

## Android Emulator

Requires Android Studio with at least one AVD configured. Start your emulator from Android Studio first, then:

```bash
npm run android
```

## Web

Outputs a static site. Runs in your default browser:

```bash
npm run web
```

## Linting

```bash
npm run lint
```

## Reset to Blank Slate

Moves starter code to `app-example/` and creates a blank `app/` directory:

```bash
npm run reset-project
```
