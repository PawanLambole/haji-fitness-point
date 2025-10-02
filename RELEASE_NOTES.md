(# Haji Fitness Point — Release v1.0.0)

Release date: 2025-10-02

This document contains the release notes for v1.0.0 of Haji Fitness Point.

## Summary

Initial stable release of the Haji Fitness Point mobile app. This release includes core member management, payments, and authentication features implemented with Expo + React Native and Supabase as the backend.

## Highlights / Features

- Member management: add, edit, view members
- Payments: record payments and view payment history
- Authentication: sign-in, password reset
- Responsive UI built with Expo Router and optimized for mobile
- Initial supabase migrations included in `supabase/migrations`

## Bug fixes

- Fixed path and build-related issues that surfaced during early development

## Upgrade notes

- This release targets Expo SDK 53 and React Native 0.79.3. If you upgrade Expo or React Native, test native modules (camera, image-picker, webview) carefully.
- Node_modules and lock files are not included in the repo; run `npm install` (or `yarn`) before building.

## Testing / QA notes

- Manual QA performed on Android emulators and a physical Android device.
- Automated tests are not included in this initial release; consider adding unit and E2E tests in subsequent releases.

## Screenshots (placeholders)

Replace these placeholder links with the real screenshots when available.

- ![Home screen](https://example.com/im1.png)
- ![Member list](https://example.com/im2.png)
- ![Add member form](https://example.com/im3.png)

## How to build locally

1. Clone the repo
2. Install dependencies: `npm install` or `yarn`
3. Start the dev server: `npm run dev`
4. Run on Android: `npm run android`

## Notes for maintainers

- Tag: `v1.0.0` has been created and pushed.
- Release artifacts: there are no compiled binaries attached; publish APK/AAB via EAS or local build if needed.

If you'd like, I can create a GitHub release using this markdown as the release body and optionally upload screenshots (you'll need to supply them or allow me to use placeholder files). 

