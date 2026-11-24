# Rememrify v2.0

**The Spotify UK Charts Archive generator.** Pick any week from 5 January 1957 to April 2012 and Rememrify shows that week's UK Top 20, with a Spotify player under each song.

Live site: https://oliharris.github.io/rememrify

The idea comes from Bill Drummond, who suggests finding the Top Twenty from the week someone turned 13. For a person whose memory is starting to fail, choosing and playing those songs together can start a conversation.

This is a rebuild in React and TypeScript of my original project, [rememrify-v1](https://github.com/OliHarris/rememrify-v1). I designed and wrote both versions from scratch.

---

## What I built

### Front end (React + TypeScript, Vite)

- **A typed component structure.** The page is built from small presentational components with typed props: `WeekPicker`, `ContentPanel` and the `BackgroundHexagon` family. `App` holds the state and data fetching.
- **Week selection that always snaps to a chart week.** UK chart weeks run Saturday to Friday. Picking any day selects the whole week around it, and the calendar starts on Saturday and only allows dates inside the archive.
- **Shareable links.** The selected week is saved in the URL (`#date=dd/mm/yyyy`), so you can bookmark or send a link to a specific week and it opens straight to that chart.
- **Two live APIs working together.**
  - The [UK Charts Archive Wiki](https://uk-charts-archive.fandom.com/) API supplies each week's chart as HTML.
  - I parse that HTML, handle the different table layouts it uses (5, 6 and 7 columns), and trim it to the Top 20.
  - Each song is then looked up on Spotify, with a "Loading song..." placeholder that swaps to an embedded player, or a clear message when there's no match.
- **Cleaning messy data.** Chart names are inconsistent: "Ft." credits, `&` and "And", slashes between double A-sides, bracketed remixes and censored words. A cleaning step turns each artist and title into a usable Spotify search.
- **Visual design.** All the artwork and CSS are mine: the animated hexagon honeycomb background, the custom fonts, and the floating queen bee on the loading screen.

### Back end: keeping secrets on the server

The Spotify API needs a client ID and **client secret** to issue an access token. Anything shipped to the browser is public, so these can't live in the React app.

- I built a small Node API (`rest-api/`) that holds the credentials as environment variables, requests the access token, and calls Spotify for the client.
- In production it runs as a **Netlify Function** at `https://rememrify-connect.netlify.app/api/spotify-connect`. It sends the CORS headers the GitHub Pages front end needs.
- For local development there is an Express version (`spotify-connect-local.js`) on `http://localhost:3001/`. The client switches between the two automatically depending on the hostname.
- **The API is locked to its one job.** Both versions reject any request that isn't a Spotify track search (`https://api.spotify.com/v1/search?…`) with a `400`. That way the endpoint can't be used as an open proxy, or to send my access token anywhere else.

The browser never sees the client secret or the access token.

### Testing

- **Jest + React Testing Library** suite: **42 tests across every component and the entry point**, with each test file next to its component as `*.test.tsx`.
- **100% coverage** of statements, branches, functions and lines. `npm run test` prints the coverage report and fails if coverage drops below 100%.
- **The wiki and Spotify APIs are mocked,** so the suite runs offline with no keys.
- **What it covers:**
  - the week maths and URL-hash links
  - building the chart table for each layout, including rows it can't read
  - the search-term cleaning
  - Spotify player and "no song found" states
  - the production vs. local API address
  - loading and error paths

> **A note on authorship:** the application code is my own work. The Jest test suite was written by Claude (Anthropic's AI coding assistant), working from my code. I've read through it and understand how it's put together, and I maintain and extend it as the app changes. While writing the tests, Claude also found a real bug: when a chart row couldn't be read, every later song's Spotify player appeared next to the wrong song. That's now fixed and covered by tests.

---

## Running it

### Client (`client/`)

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run test
```

`npm run test` runs the suite and prints the coverage report. Also available: `npm run test:watch`, `npm run lint`, `npm run build`, and `npm run deploy` (publishes to GitHub Pages).

### API (`rest-api/`)

Create a `.env` file with your own Spotify credentials:

```
CLIENT_ID=<your-client-id>
CLIENT_SECRET=<your-client-secret>
```

Then run the local Express server on http://localhost:3001/:

```bash
node spotify-connect-local.js
```

Or run the Netlify Function locally on http://localhost:9999/.netlify/functions/spotify-connect:

```bash
npm run serve
```

---

## What's next

The project works, and I've reviewed it with fresh eyes to plan the next round of improvements. The test suite is in place first so these changes can be made safely.

### Architecture

- **Let React own the chart.** At the moment `App` turns the wiki HTML into React elements and then adds the Spotify rows by editing the page directly (`querySelector`, `innerHTML`). The plan:
  - parse the wiki table into plain data, e.g. `{ position, artist, title }[]`
  - keep each song's Spotify result in state
  - render it through `ChartTable`, `ChartRow` and `SpotifyEmbed` components
- **Split up `App`.** Move the fetching into custom hooks (`useChart(weekStart)`, `useSpotifyTrack(...)`), so `App` is mostly layout.
- **Move the search-term cleaning into a pure, unit-tested helper.** Simplify the chain of string replacements, put a separator between artist and title, and use `URLSearchParams` so names containing `&` or `#` are encoded correctly.

### Reliability

- **Cancel requests that are no longer needed.** When the week changes, abort the previous week's requests (`AbortController` in the effect's cleanup), so slow responses from an old week can't land in the new one.
- **Never leave the loader stuck.** Use `Promise.allSettled` for the 20 Spotify lookups so the loading screen always clears, even if one lookup fails.
- **Show errors on screen.** Show the user a message when the chart or Spotify can't be reached, instead of only logging to the console.
- **Make date handling safer.** Use a date library (e.g. date-fns `startOfWeek`) instead of changing `Date` objects in place, and check the week in the URL so a bad link can't break the page.

### API

- **Build the Spotify URL on the server.** The client would send only the search terms, and the server would encode them with `URLSearchParams`, so names containing `&` or `#` are handled correctly.
- **Reuse the access token** until it expires instead of requesting a new one on every call.
- **Return proper error responses.**
- **Clean up:** remove unused code (the Express setup inside the Netlify Function, `hello.js`) and fix the `start`/`dev` scripts.

### Accessibility and polish

- **Hide the decorative hexagons from screen readers** (`alt=""`).
- **Give each Spotify iframe a `title`.**
- **Announce loading with `aria-live`.**
- **Add `rel="noopener noreferrer"` to external links.**
- **Import SVGs as React components** instead of injecting them at runtime.
- **Tidy the TypeScript:** name prop types `…Props` and use union types such as `"top" | "bottom" | "left" | "right"`.

### Ideas

People I've shown Rememrify to have suggested plenty of features, such as building a Spotify playlist from a week's chart. These need deeper use of the Spotify API and are on the longer-term list.

---

## Credits

- Chart data from the [UK Charts Archive Wiki](https://uk-charts-archive.fandom.com/), a free reference catalogued by volunteers.
- Date picker: [flatpickr](https://flatpickr.js.org/).
- Hosting: GitHub Pages ([Vite deployment guide](https://medium.com/@aishwaryaparab1/deploying-vite-deploying-vite-app-to-github-pages-166fff40ffd3)) and Netlify Functions ([Node API guide](https://hrishikeshpathak.com/blog/host-nodejs-api-netlify-functions/), [CORS guide](https://www.johno.com/cors-handling-with-netlify-functions)).

Design and implementation © [Oliver Harris](http://github.com/oliharris), 2017, 2021, 2023, 2026.
