# Setup & Installation

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo`)
- For iOS: Xcode 15+ and CocoaPods (`brew install cocoapods`)
- For Android: Android Studio with an emulator configured

## 1. Clone and install dependencies

```bash
git clone https://github.com/Minhkh0inee/unibridge-notify-app.git
cd unibridge-notify-app
npm install
```

## 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these values in your [Supabase project settings](https://supabase.com/dashboard) under **Project Settings → API**.

## 3. Install iOS native dependencies (iOS only)

```bash
npx pod-install
```

## 4. Run the app

```bash
npm start          # Start Expo dev server (Metro bundler)
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in browser
```

## Lint

```bash
npm run lint
```
