# 👗 Wardrobe Assistant

An AI-powered personal wardrobe assistant that helps you organize your clothes and create perfect outfits — completely free to use!

## Features

- 📸 **Catalog Your Closet** — Upload photos of your clothes; Gemini AI automatically identifies the item name, category, color, and tags
- ✨ **AI Outfit Suggestions** — Get personalized outfit recommendations powered by Google Gemini, filtered by occasion and season
- 🪄 **Virtual Try-On** — Upload a photo of yourself and let AI describe how a selected outfit would look on you
- 🔒 **Google Login** — Secure authentication via Google OAuth
- 📊 **Google Sheets Database** — Your wardrobe data is stored in your own Google Sheet
- 🗂️ **Google Drive Storage** — Clothing photos are stored in your own Google Drive

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Auth | [NextAuth.js](https://next-auth.js.org/) + Google OAuth |
| Database | Google Sheets API |
| Storage | Google Drive API |
| AI | [Google Gemini 1.5 Flash](https://ai.google.dev/) |
| Hosting | [Vercel](https://vercel.com/) (free tier) |

## Prerequisites

All services used are **free**:
- Google account (for OAuth, Sheets, Drive)
- [Google AI Studio](https://aistudio.google.com/) account (free Gemini API key)
- [Vercel](https://vercel.com/) account (free hosting)

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/wardrobe-assistant.git
cd wardrobe-assistant
npm install
```

### 2. Configure Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable these APIs:
   - **Google Sheets API**
   - **Google Drive API**
4. Go to **Credentials → Create OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-app.vercel.app/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**

### 3. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key (free, no credit card required)

### 4. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/**YOUR_SHEET_ID**/edit`

### 5. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all values:

```env
NEXTAUTH_SECRET=          # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=         # From Google Cloud Console
GOOGLE_CLIENT_SECRET=     # From Google Cloud Console
GOOGLE_SHEETS_ID=         # Your spreadsheet ID
GEMINI_API_KEY=           # From Google AI Studio
```

### 6. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign in with Google and start adding your wardrobe!

## Deploy to Vercel (Free)

1. Push your code to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in Vercel project settings
4. Update the Google OAuth redirect URI to your Vercel URL
5. Deploy!

## How It Works

1. **Sign in** with your Google account
2. **Add clothes** — upload a photo and Gemini AI fills in the details automatically
3. **Get outfit ideas** — specify the occasion/weather and AI suggests 3 complete outfits from your wardrobe
4. **Virtual try-on** — upload a selfie, select an outfit, and get a detailed AI description of how it looks on you

## Project Structure

```
wardrobe-assistant/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Google OAuth
│   │   ├── wardrobe/            # CRUD for clothing items
│   │   ├── outfits/             # AI outfit suggestions
│   │   ├── try-on/              # Virtual try-on
│   │   └── upload/              # Image upload to Drive + AI analysis
│   ├── wardrobe/                # Wardrobe management page
│   ├── outfits/                 # Outfit suggestions page
│   ├── try-on/                  # Virtual try-on page
│   └── page.tsx                 # Landing / login page
├── components/
│   ├── Navigation.tsx
│   ├── ClothingCard.tsx
│   └── AddClothingModal.tsx
├── lib/
│   ├── auth.ts                  # NextAuth configuration
│   ├── gemini.ts                # Gemini AI functions
│   ├── google-sheets.ts         # Sheets database functions
│   └── google-drive.ts          # Drive image storage functions
└── .env.example
```
