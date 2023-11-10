# rememrify v2.0

:heavy_check_mark: Code in pure React / TypeScript

:heavy_check_mark: Spotify CLIENT_SECRET environment variable and generated auth token hidden behind deployed Netlify Function API

Re-dev of this project:

https://github.com/OliHarris/rememrify-v1

The Spotify UK Charts Archive generator

A successful personal project that was created to prove I could build an innovative solution from scratch.

I then went on to study and wrap a Grunt workflow around the project, which concatonates the scripts.

More playing with API's, this time from the UK Charts Archive Wikia:

http://uk-charts-archive.wikia.com/

Lots of great functional ideas stemmed from this project (generated from showing to people); these can be researched and written up, and requires getting to grips with Spotify API in due time...

Sometimes anomalies are returned - the code can be tuned further to take care of these.

## Available Scripts 1

In the 'client' project directory you can run:

### `npm install`

Will perform a usual installation of any dependencies.

### `npm run dev`

Will perform a usual launch of the dev environment.

## Available Scripts 2

In the 'rest-api' project directory you can run:

### `npm install`

Will perform a usual installation of any dependencies.

### `npm run dev`

Will perform a usual launch of the back-end Node.JS dev environment; for file: spotify-connect-local.js

Server will run: http://localhost:3001/

### `npm run serve`

Will perform a launch of the local Netlify function; for file: netlify/functions/spotify-connect.js

Server will run on: http://localhost:9999/.netlify/functions/spotify-connect

## NOTE 1:

In the 'rest-api' folder, you will need to provide your own Spotify keys - in a .env file.

Format:

'CLIENT_ID=<your-connection-string>'

'CLIENT_SECRET=<your-connection-string>'

## NOTE 2:

As this is a Vite app, I hosted it on GitHub pages using this guide:

https://medium.com/@aishwaryaparab1/deploying-vite-deploying-vite-app-to-github-pages-166fff40ffd3

## NOTE 3:

To hide the CLIENT_SECRET and generated auth token I have built and deployed the 'rest-api' folder, and hosted it here: https://rememrify-connect.netlify.app/api/spotify-connect

This page was a guide:

https://hrishikeshpathak.com/blog/host-nodejs-api-netlify-functions/

Further CORS issues were resolved with this guide:

https://www.johno.com/cors-handling-with-netlify-functions
