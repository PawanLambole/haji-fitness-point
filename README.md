# HAJI Fitness Point

A modern React Native + Expo app for gym management, built with TypeScript.

## Features
- Member management (add, edit, delete, search)
- WhatsApp integration for notifications
- Payment tracking and revenue stats
- Dashboard with active/new/total members
- Expo Router navigation
- Android and iOS support

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Git](https://git-scm.com/)

### Installation
```sh
git clone https://github.com/PawanLambole/haji-fitness-point.git
cd haji-fitness-point
yarn install # or npm install
```

### Running the App
```sh
# Start Metro bundler
npx expo start
# Or for Android emulator/device
npx expo run:android
# Or for iOS simulator/device (on Mac)
npx expo run:ios
```

### Building APK (Android)
```sh
eas build -p android --profile preview
```

### Environment Variables
Create a `.env` file for any secrets (API keys, etc). Example:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

### Folder Structure
```
app/            # Expo Router screens
android/        # Native Android project
assets/         # Images and static assets
contexts/       # React Context providers
hooks/          # Custom React hooks
lib/            # API clients (e.g. supabase)
types/          # TypeScript types
tools/          # Utility scripts
```

## Security
- Do NOT commit `android/app/debug.keystore` or any production keystore files.
- Do NOT commit `.env` or any secrets.

## License
MIT

---
Made with ❤️ for HAJI Fitness Point.
