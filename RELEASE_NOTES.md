# Haji Fitness Point — Release v1.0.0 (Initial Release)

![App Dashboard](https://example.com/im1.png)
*Main Dashboard / Home screen (placeholder)*

## Overview

Haji Fitness Point is a mobile-first fitness management app designed for small gyms and training centers. This release introduces member management, payments, session tracking, and admin settings powered by Expo + React Native with Supabase as the backend.

## Core Functionalities

### 1. Member Management
**Description**: Add, edit, and manage member profiles with contact details and membership status.
- Features:
	- Create and edit member profiles
	- Member search and list view
	- Member detail pages with activity and payment history
  
### 2. Payments & Billing
**Description**: Record payments, track due payments and generate receipts.
- Features:
	- Record one-time and recurring payments
	- View payment history per member
	- Simple receipt generation (PDF export via mobile share)

### 3. Authentication & Security
**Description**: Secure login and password workflows using Supabase auth.
- Features:
	- Email-based sign-in
	- Password reset flow
	- Role-based views for admin vs staff

### 4. Member Check-in & Session Tracking
**Description**: Track member visits and session attendance.
- Features:
	- Quick check-in screen
	- Attendance logs per member
	- Basic analytics for visits per day/week

## Technical Architecture

### Frontend
- Framework: Expo (React Native)
- Navigation: Expo Router
- Key libraries: React Navigation, Reanimated, Expo Camera/ImagePicker

### Backend
- BaaS: Supabase (Postgres + Auth + Storage)
- Migrations: `supabase/migrations`

### Deployment
- Mobile builds: EAS / Expo build

## Security Features

- Secure authentication via Supabase
- Input validation to mitigate XSS
- Prepared statements via Postgres to mitigate SQL injection

## Performance Optimizations

- Lazy-loading screens
- Optimized list rendering for members
- Use of local caching where appropriate

## Screenshots (placeholders)

Replace the links with real screenshots when available:

- ![Dashboard](https://example.com/im1.png)
- ![Members List](https://example.com/im2.png)
- ![Add Member](https://example.com/im3.png)
- ![Payments](https://example.com/im4.png)

## Installation Requirements

### Prerequisites
- Node.js (LTS) and npm or yarn
- Expo CLI (optional but helpful)
- Android Studio / Xcode for emulators

### Setup Instructions
1. Clone repository
2. Install dependencies: `npm install` or `yarn`
3. Configure `.env` with Supabase URL & anon key
4. Run Supabase migrations in `supabase/migrations`
5. Start dev server: `npm run dev`

## Known Limitations

- No automated tests in this initial release
- File upload size limits depend on Supabase storage configuration
- Offline support limited to local caching (not full sync)

## Upcoming Features

- Mobile receipt/PDF attachments
- Push notifications for membership renewals
- Multi-currency billing and payment gateway integration
- Role-based team management and permissions

---

For support or feedback, open an issue in the repository or contact the maintainer.

If you'd like, I can create the GitHub Release for tag `v1.0.0` using this content and attach placeholder screenshots to the release assets. Let me know if you want me to upload dummy images into `screenshots/` first.

