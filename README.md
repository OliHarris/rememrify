# rememrify v2.0

:heavy_check_mark: Code in pure React / TypeScript

Re-dev of this project:

https://github.com/OliHarris/rememrify-v1

The Spotify UK Charts Archive generator

A successful personal project that was created to prove I could build an innovative solution from scratch.

I then went on to study and wrap a Grunt workflow around the project, which concatonates the scripts.

More playing with API's, this time from the UK Charts Archive Wikia:

http://uk-charts-archive.wikia.com/

Lots of great functional ideas stemmed from this project (generated from showing to people); these can be researched and written up, and requires getting to grips with Spotify API in due time...

Sometimes anomalies are returned - the code can be tuned further to take care of these.

## Available Scripts

In the root directory you can run:

### `npm install`

Will perform a usual installation of any dependencies.

### `npm run dev`

Will perform a usual launch of the dev environment.

## NOTE 1:

In the root directory, you will need to provide your own Spotify keys - in a .env file.

Format:

'VITE_CLIENT_ID='

'VITE_CLIENT_SECRET='

## NOTE 2:

As this is an app with secrets, I hosted it on GitHub pages using these links as a guide:

https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository

https://github.com/facebook/create-react-app/discussions/9064#discussioncomment-30344