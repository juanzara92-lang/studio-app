# Studio App — Setup Guide

## Before you start
Open `src/App.js` and replace these two values at the top of the file:

```
const DAILY_ROOM_URL = 'https://YOUR_SUBDOMAIN.daily.co/studio';
const DAILY_API_KEY  = 'YOUR_API_KEY_HERE';
```

Replace them with your actual Daily.co room URL and API key from your Daily.co dashboard.

## Run locally
```
npm install
npm start
```

## Deploy to Vercel
1. Push this folder to a GitHub repository
2. Go to vercel.com → New Project → Import your repo
3. Click Deploy — done!
