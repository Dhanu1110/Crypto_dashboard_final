# CryptoTracker Pro

A professional cryptocurrency portfolio tracker with real-time data, AI-powered insights, and comprehensive market analysis.

## Technologies

This project is built with:

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn-ui + Tailwind CSS + Framer Motion
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **AI**: Google Gemini API
- **Real-time Data**: CoinGecko API

## Getting Started

### Install Dependencies

```sh
npm install
```

### Development

```sh
npm run dev
```

The app will run at `http://localhost:8080/`

### Build

```sh
npm run build
```

## Environment Variables

### Client Environment (`.env`)

```
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=https://your_project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### Supabase Secrets

Set these in your Supabase project under **Project Settings > Secrets**:

```
GEMINI_API_KEY=your_gemini_api_key
SERPAPI_KEY=your_serpapi_key
```

## Features

- 🔐 User authentication with Supabase Auth
- 💼 Portfolio management (add/edit/delete holdings)
- 📊 Real-time cryptocurrency data from CoinGecko
- 🤖 AI-powered portfolio analysis using Google Gemini
- 💬 AI chat assistant with web search integration
- 🚨 Price alerts for cryptocurrencies
- 📈 Technical analysis and market insights
- 🌙 Dark mode support

## Deployment

Deploy to Vercel or any Node.js hosting platform:

1. Set environment variables in your hosting platform
2. Run `npm run build`
3. Deploy the `dist` folder
