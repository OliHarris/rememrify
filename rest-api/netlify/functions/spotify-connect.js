// based on: https://gist.github.com/owalid/cf7a2425d9733b6aee80832f6fbc660c

import express, { urlencoded, json } from "express";
const app = express();
app.use(urlencoded({ extended: true }));
// express json-parser
app.use(json());

import axios from "axios";
const getSpotifyData = async (body, response) => {
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
      // Accept: "application/json",
      // "Content-Type": "application/x-www-form-urlencoded",
    },
    data: "grant_type=client_credentials",
  };
  await axios(config).then(async (result) => {
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
    await axios(tokenConfig).then((tokenResult) => {
      // console.log(tokenResult.data);
      return response.json(tokenResult.data);
    });
  });
};

import dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();

  app.post("/", async (request, response) => {
    const body = request.body;
    // console.log(body);
    getSpotifyData(body, response);
  });
} else {
  exports.handler = async (request, response) => {
    const body = request.body;
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(getSpotifyData(body, response)),
    };
  };
}

if (process.env.NODE_ENV !== "production") {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
