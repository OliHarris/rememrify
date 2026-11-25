# How Rememrify is set up

A guide to how the project fits together: what each part does, where it's hosted, and how to change it. Most of the detail is on `rest-api/` and Netlify.

Last checked: November 2026.

---

## The big picture

Rememrify is two separate apps, hosted in two places:

| Part | Folder | What it is | Hosted on |
|---|---|---|---|
| Front end | `client/` | React + TypeScript app built with Vite | GitHub Pages: `oliharris.github.io/rememrify` |
| Back end | `rest-api/` | A small Node API that talks to Spotify | Netlify: `rememrify-connect.netlify.app` |

Both live in one GitHub repo, `OliHarris/rememrify`, but they're built and deployed independently.

What happens when someone picks a week:

```
Browser (GitHub Pages)
  │
  ├─1─▶ UK Charts Archive wiki API  ──▶ chart HTML for that week
  │      (called directly from the browser)
  │
  └─2─▶ POST rememrify-connect.netlify.app/api/spotify-connect   (×20, one per song)
         body: { spotifyUrl: "https://api.spotify.com/v1/search?q=…" }
              │
              ▼
         Netlify Function  (rest-api/netlify/functions/spotify-connect.js)
              ├─▶ accounts.spotify.com/api/token   ← uses CLIENT_ID + CLIENT_SECRET
              │       returns a short-lived access token
              └─▶ api.spotify.com/v1/search        ← uses that token
                      returns the matching track
              │
              ▼
         JSON back to the browser → it embeds a Spotify player for the track ID
```

---

## Why `rest-api/` exists

Spotify only gives out an access token if you send the app's **client ID and client secret**. Anything in the React app is downloaded to every visitor's browser, so the secret can't go there.

`rest-api/` is a small middleman that holds the secret on a server, gets the token, runs the search, and returns only the results. The browser never sees the secret or the token.

It uses Spotify's **client credentials** flow: app-level access to the public catalogue, with no user login. That's why the embedded players only play 30-second previews unless the visitor is logged in to Spotify in their browser.

---

## What's in `rest-api/`

```
rest-api/
├── netlify.toml                      ← tells Netlify how to build and route the API
├── netlify/functions/
│   ├── spotify-connect.js            ← the real API (runs on Netlify)
│   └── hello.js                      ← a "Hello world" test function
├── spotify-connect-local.js          ← the same logic as an Express server, for local dev
├── package.json / package-lock.json
├── .env                              ← Spotify keys for local use (gitignored)
├── .netlify/                         ← Netlify CLI's local cache (gitignored)
└── .git/                             ← an empty nested repo, unused (see "Leftovers")
```

### `netlify/functions/spotify-connect.js`: the production API

This is a **Netlify Function**, a serverless function. There's no server running all the time: Netlify starts the code when a request arrives and stops it afterwards. Netlify looks for an exported function called `handler`. It receives an `event` (the HTTP request) and returns `{ statusCode, headers, body }`.

When a request arrives, the code works through these steps:

1. **`OPTIONS` requests get an immediate `200` with CORS headers.** Browsers send this "preflight" check first, because the page (GitHub Pages) and the API (Netlify) are on different domains. `Access-Control-Allow-Origin: *` tells the browser it may read the response.
2. **It reads the request body.** From the app, that's a `POST` with `{ spotifyUrl }`. If there's no body, as when you open the URL in a browser, it uses a built-in test search ("Far East Movement – Like A G6"), so a quick check is easy.
3. **Security check:** anything that isn't `https://api.spotify.com/v1/search?…` gets a `400 Invalid request`. This stops the endpoint being used to send the access token to other URLs.
4. **`getSpotifyData`** makes the two Spotify calls:
   - **Token:** it base64-encodes `CLIENT_ID:CLIENT_SECRET` and POSTs it to `accounts.spotify.com/api/token`.
   - **Search:** it calls the search URL with `Authorization: Bearer <token>`.
5. **It returns Spotify's JSON** with the CORS headers.

The secrets come from `process.env.CLIENT_ID` and `process.env.CLIENT_SECRET`. On Netlify, they're environment variables set in the site's dashboard, under **Project configuration → Environment variables**. They aren't in the code or the repo.

Notes:
- **A new token is fetched on every request,** so each song lookup is two Spotify calls. Reusing the token until it expires is on the README roadmap.
- **The file imports Express and sets up an `app`, but never uses it.** That's left over from copying the local version, and it's harmless.

### `spotify-connect-local.js`: the local version

This is the same logic as an ordinary **Express** server on `http://localhost:3001/`. Run it with `node spotify-connect-local.js`.

- **Keys:** it reads them from `rest-api/.env` using `dotenv`. In production, Netlify supplies them instead.
- **Security:** it has the same check as the production function.
- **No CORS headers:** the browser therefore blocks the lookups when the app runs on Vite's dev server (`localhost:5173`), so Spotify players don't appear in local development. Adding the same CORS headers as the Netlify function would fix this.

The client decides which API to call in `client/src/components/App.tsx`:

```js
currentHostname === "localhost"
  ? "http://localhost:3001/"
  : "https://rememrify-connect.netlify.app/api/spotify-connect"
```

Any other hostname, including `127.0.0.1`, uses the live Netlify API. This is handy for testing a production build locally with `npm run preview -- --host 127.0.0.1`.

### `hello.js`

A test function from when Netlify was first set up. It returns `{"msg": "Hello world"}` at `/api/hello`, and it's still deployed. It's safe to delete.

### `netlify.toml`

```toml
[functions]
node_bundler = "esbuild"          # bundle each function and its packages (axios) into one file

[[redirects]]
from = "/api/*"
to = "/.netlify/functions/:splat"
status = 200                      # 200 = rewrite, not redirect: the URL the browser sees stays /api/…
```

Netlify always serves functions at `/.netlify/functions/<name>`. The redirect rule gives them a cleaner address, so `/api/spotify-connect` runs the `spotify-connect` function. Both URLs work.

### `package.json`

- **Dependencies:** `axios` (the HTTP calls), `express` and `dotenv` (both only for the local server).
- **Dev dependencies:** `netlify-cli` (runs functions locally) and `nodemon`.
- **`npm run serve`** runs `netlify functions:serve`, which runs the real Netlify function on your machine at `http://localhost:9999/.netlify/functions/spotify-connect`. This is the closest local match to production.
- **`npm start` and `npm run dev`** point at an `index.js` that doesn't exist, so both fail. Use `node spotify-connect-local.js` instead.

### Leftovers

- **`rest-api/.git`:** a second, empty Git repository inside the main one, with no commits and no remote. Netlify doesn't use it; it deploys from the main repo. It's safe to delete.
- **`.netlify/state.json`:** only holds a cached location from the Netlify CLI. The folder isn't linked to the Netlify site, so `netlify deploy` from here would ask which site to use first (or run `netlify link`). Deploys normally happen through Git, so this isn't needed.
- **`variables.env` in `.gitignore`:** probably copied from another project's ignore file. It's harmless.

---

## How it hooks up to Netlify

The Netlify site is called `rememrify-connect`, and its settings are:

| Setting | Value | What it means |
|---|---|---|
| Repository | `github.com/OliHarris/rememrify` | Netlify watches the GitHub repo |
| Production branch | `main` | Only pushes to `main` deploy |
| Base directory | `rest-api` | Netlify ignores everything outside this folder, including `client/` |
| Functions directory | `rest-api/netlify/functions` | Every `.js` file here becomes a function |
| Build command / publish directory | not set | No website is built; the site exists only to serve the functions |
| Node.js | 18 | Version used for the build |
| Auto publishing | on | A successful build goes live straight away |

When you push to `main`, Netlify:

1. clones the repo and switches into `rest-api/`
2. runs `npm install` from `rest-api/package.json`
3. reads `netlify.toml`
4. bundles each file in `netlify/functions/` with esbuild
5. deploys the bundles as functions
6. adds the environment variables (the Spotify keys) at run time

A deploy takes about 30 seconds. Pushes that only change `client/` also trigger a build, but nothing in the function changes.

Where to look in the Netlify dashboard (`app.netlify.com/projects/rememrify-connect`):

- **Deploys:** history and build logs for each push.
- **Logs → Functions → spotify-connect:** a line for every request, with its duration. A normal lookup takes about 0.25–0.7 s on Netlify's side, so a slow site is usually down to the network.
- **Project configuration → Environment variables:** `CLIENT_ID` and `CLIENT_SECRET`.

---

## The front end

- **Build:** `client/` is a **Vite + React + TypeScript** app. Its `base: "/rememrify/"` setting in `vite.config.ts` matches the GitHub Pages address.
- **Deploy:** this isn't automatic. `npm run deploy` runs the build (`tsc && vite build`), then the `gh-pages` package uploads `dist/` to a `gh-pages` branch, which GitHub Pages serves.
- **`App.tsx`** does nearly everything:
  - works out the Saturday-to-Friday week and keeps it in the URL hash (`#date=dd/mm/yyyy`)
  - fetches the chart HTML from the UK Charts Archive wiki, parses it, and trims it to the Top 20
  - fires the 20 lookups through the Netlify function
  - shows "Loading song..." on each row until its Spotify player (or a "No song found" or "Couldn't load this song" message) arrives
  - ignores answers for a week that's no longer selected
- **`WeekPicker`** wraps the flatpickr calendar, and shows the "Loading Chart..." overlay while the chart itself loads.
- **`ContentPanel`** displays the chart.
- **The `BackgroundHexagon` components** draw the honeycomb background.
- **Tests:** `npm run test` runs the Jest + React Testing Library suite. Each test sits next to its component as `*.test.tsx`, and shared test data is in `src/test/`. The wiki and Spotify are faked, so the tests run offline.

---

## Quick reference

| I want to… | Do this |
|---|---|
| Update the live API | Push changes in `rest-api/` to `main`; Netlify deploys automatically |
| Update the live site | `cd client && npm run deploy` |
| Run the tests | `cd client && npm run test` |
| Run the app locally | `cd client && npm run dev`, then open `http://localhost:5173/rememrify/` |
| Run the API locally like production | `cd rest-api && npm run serve` (needs `rest-api/.env`) |
| Run the simple local API | `cd rest-api && node spotify-connect-local.js` (needs `rest-api/.env`) |
| Check the live API works | Open `https://rememrify-connect.netlify.app/api/spotify-connect` in a browser; it runs the built-in test search |
| Change the Spotify keys | Netlify dashboard → Environment variables, and `rest-api/.env` for local use |

`rest-api/.env` format:

```
CLIENT_ID=<your-client-id>
CLIENT_SECRET=<your-client-secret>
```

---

## Branch protection

GitHub has a rule on `main` asking for changes to go through pull requests. The repo owner's account can bypass it, so direct pushes still work, with a warning. Netlify only deploys `main`, so with pull requests, API changes go live when the pull request is merged.
