# REELIST

A movie site — search, ratings, posters/wallpapers, a genre mega-menu, and a
watchlist + browse history that can sync to a visitor's Google account. Plain
HTML/CSS/JS, powered live by the [TMDB API](https://www.themoviedb.org/documentation/api).
No build step, no framework, no server code required.

## Files

- `index.html` — page shell, loads config + Firebase SDKs + app.js
- `styles.css` — all styling (cinema ticket-stub theme)
- `app.js` — app logic
- `config.js` — **you fill this in before deploying** (see below)

## 1. Set up your TMDB key (required)

1. Get a free key at https://www.themoviedb.org/settings/api (a couple minutes,
   just needs an account).
2. Open `config.js` and paste it in:
   ```js
   TMDB_API_KEY: "your-real-key-here",
   ```

Visitors won't need a key of their own — this one key powers the whole site for
everyone. Because it's a static site, that key is visible to anyone who views
page source. TMDB keys are free and rate-limited (not a payment credential), so
this is standard practice for small/demo sites, but keep it in mind — if it
ever gets abused you can regenerate it from your TMDB account.

## 2. Set up Google sign-in + cloud sync (optional)

Skip this and the site still works great — the watchlist and history just stay
local to each browser instead of following a signed-in user across devices.

To enable it:

1. Go to https://console.firebase.google.com → **Add project** (free tier is
   plenty).
2. **Project settings → General → Your apps → Add app → Web (`</>`)**. It'll
   show you a `firebaseConfig` object — copy those values into
   `FIREBASE_CONFIG` in `config.js`.
3. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
4. **Build → Firestore Database → Create database** (production mode is fine).
   Then in **Rules**, use this so people can only read/write their own data:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
5. **Authentication → Settings → Authorized domains** — add the domain you
   deploy to (e.g. `your-site.netlify.app`). `localhost` is already allowed for
   local testing.

Once `FIREBASE_CONFIG.apiKey` is filled in, the "Sign in with Google" option
appears automatically in the menu and account dropdown.

## Run it locally

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Deploy it

Any static host works:

**Netlify Drop** — drag the folder onto https://app.netlify.com/drop
**Netlify CLI** — `netlify deploy --prod --dir .`
**Vercel** — `vercel --prod`
**GitHub Pages** — push to a repo → Settings → Pages → deploy from branch/root

Remember to add your deploy domain to Firebase's authorized domains (step 5
above) if you're using sign-in — Google auth will silently fail on unlisted
domains.

## What's new in this version

- Clicking the **REELIST logo** always returns to the homepage (trending view).
- A **Menu** button (top left) opens an IMDb-style full-screen menu with quick
  lists (Popular, Top Rated, Now Playing, Upcoming) and every TMDB **genre**,
  each of which loads that slice of the catalogue via `/discover/movie`.
- No visitor needs their own TMDB key — it's baked into `config.js`.
- Optional **Google sign-in** (via Firebase Auth) with watchlist and browse
  history synced to Firestore, so a signed-in user sees the same list on any
  device. Signed-out visitors still get local, browser-only persistence.

## Notes

- Poster/backdrop images come directly from `image.tmdb.org`. If a title has no
  artwork, a generated placeholder is shown so the layout never breaks.
- Browse history keeps the last 50 titles a visitor has opened, newest first.
- Per TMDB's API terms, the footer includes their required attribution line —
  keep it if you customize this further.
