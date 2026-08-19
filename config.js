/* REELIST configuration.
   Fill this in before deploying — see README.md for step-by-step instructions. */

window.REELIST_CONFIG = {
  /* Required: a free TMDB API key (v3 auth) from
     https://www.themoviedb.org/settings/api
     This is embedded in the public site so every visitor can browse without
     signing up for their own key. TMDB keys are free and rate-limited, not a
     secret credential — but note it IS visible to anyone who views source. */
  TMDB_API_KEY: "ef9131cf5ecd845bdfc6bf10b9e749ee",

  /* Optional: enables "Sign in with Google" + cloud-synced watchlist/history.
     Leave apiKey blank ("") to skip this — the site works fine without it,
     the watchlist just stays local to each browser instead of syncing.

     To fill this in:
     1. Go to https://console.firebase.google.com → Add project (free).
     2. Project settings → General → "Your apps" → Add app → Web (</>).
        Copy the firebaseConfig object it gives you into FIREBASE_CONFIG below.
     3. Build → Authentication → Get started → Sign-in method → enable Google.
     4. Build → Firestore Database → Create database → start in production
        mode (rules are covered in README.md). */
  FIREBASE_CONFIG: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
};
