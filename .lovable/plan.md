

# User Profile Settings Page

## Overview
Add a new `/settings` page accessible from the dashboard header, where users can update their display name (username) and manage email notification preferences for price alerts and portfolio updates.

## What You'll Get
- A new "Settings" icon button in the dashboard header (next to the sign-out button)
- A dedicated profile settings page with two sections:
  1. **Display Name** -- update your username/display name
  2. **Email Preferences** -- toggle notifications for price alerts and weekly portfolio summaries
- Changes save to the cloud database with instant feedback

## Technical Details

### 1. Database Migration
Add email preference columns to the existing `profiles` table:
- `email_alerts_enabled` (boolean, default true) -- receive price alert notifications
- `email_portfolio_summary` (boolean, default true) -- receive weekly portfolio summaries

### 2. New File: `src/pages/Settings.tsx`
A settings page with:
- Avatar fallback showing the user's initials
- Editable display name field (using the existing `username` column in profiles)
- Toggle switches for email preferences
- Save button that updates the `profiles` table via the database client
- Back button to return to the dashboard
- Styled consistently with the existing glass-morphism design system

### 3. Update: `src/App.tsx`
- Add a new protected route: `/settings`

### 4. Update: `src/pages/Index.tsx`
- Add a Settings icon button (gear icon from lucide-react) in the header, next to the sign-out button
- Clicking it navigates to `/settings` using react-router-dom

### 5. Update: `src/hooks/useAuth.tsx`
- Expose the current user's email for display on the settings page (already available via `user.email`)

No new dependencies are needed -- this uses existing components (Card, Input, Button, Switch, Avatar) and libraries (react-router-dom, sonner for toasts).

