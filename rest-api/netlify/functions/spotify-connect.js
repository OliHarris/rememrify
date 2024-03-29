// based on: https://gist.github.com/owalid/cf7a2425d9733b6aee80832f6fbc660c

import express, { urlencoded, json } from "express";
const app = express();
app.use(urlencoded({ extended: true }));
// express json-parser
app.use(json());

import axios from "axios";
const getSpotifyData = async (body) => {
  // Part 1 - get token
  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  const auth = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
    "base64"
  )}`;

  const config = {
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization: auth,
    },
    data: "grant_type=client_credentials",
  };
  return await axios(config).then(async (result) => {
    // console.log(result.data);

    // Part 2 - use token to retrieve data
    const authToken = `Bearer ${result.data.access_token}`;
    // console.log(authToken);

    const tokenConfig = {
      method: "get",
      url: body.spotifyUrl,
      headers: {
        Authorization: authToken,
      },
    };
    return await axios(tokenConfig).then((tokenResult) => {
      // console.log(tokenResult.data);
      return tokenResult.data;
    });
  });
};

export const handler = async (event, context) => {
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
    };
  }

  let body;
  // test switch
  if (event.body) {
    // called from UI - POST
    body = JSON.parse(event.body);
  } else {
    // testing purposes - GET
    // http://localhost:9999/.netlify/functions/spotify-connect
    // https://rememrify-connect.netlify.app/api/spotify-connect
    body = {
      spotifyUrl:
        "https://api.spotify.com/v1/search?q=Far+East+Movement+Like+A+G6&type=track&market=GB&limit=1",
    };
  }

  const spotifyData = await getSpotifyData(body).then(async (response) => {
    return response;
  });

  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(spotifyData),
  };
};
