/**
 * @jest-environment-options {"url": "https://oliharris.github.io/rememrify/"}
 */
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import { buildWikiHtml, wikiResponse, spotifyResponse } from "../test/fixtures/wiki";

jest.mock("axios");
jest.mock("@iconfu/svg-inject", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("react-flatpickr", () => ({
  __esModule: true,
  default: () => <div data-testid="flatpickr" />,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("App (production host)", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation((...args) => {
      // App builds nested <table><tr> rows without a <tbody>; ignore that known warning
      if (!String(args[0]).includes("validateDOMNesting")) throw new Error(String(args[0]));
    });
  });

  it("sends Spotify lookups to the Netlify function when not on localhost", async () => {
    mockedAxios.get.mockResolvedValue(
      wikiResponse(buildWikiHtml([{ artist: "Artist", title: "Song" }]))
    );
    mockedAxios.post.mockResolvedValue(spotifyResponse("id-1"));
    render(<App />);

    await waitFor(() =>
      expect(screen.queryByText("Loading Chart...")).not.toBeInTheDocument()
    );
    expect(mockedAxios.post).toHaveBeenCalled();
    mockedAxios.post.mock.calls.forEach(([url]) =>
      expect(url).toBe("https://rememrify-connect.netlify.app/api/spotify-connect")
    );
  });
});
