import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import SVGInject from "@iconfu/svg-inject";
import App from "./App";
import { buildWikiHtml, wikiResponse, spotifyResponse } from "../test/fixtures/wiki";

jest.mock("axios");
jest.mock("@iconfu/svg-inject", () => ({ __esModule: true, default: jest.fn() }));

// Replace the calendar with a stub that exposes its props and lets tests pick a date.
type FlatpickrProps = { value?: [Date, Date]; onChange: (dates: Date[]) => void };
const flatpickrProps: { current: FlatpickrProps | null } = { current: null };
const pickDate = { current: new Date(2000, 0, 12) };
jest.mock("react-flatpickr", () => ({
  __esModule: true,
  default: (props: FlatpickrProps) => {
    flatpickrProps.current = props;
    return (
      <button data-testid="flatpickr" onClick={() => props.onChange([pickDate.current])}>
        pick
      </button>
    );
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Spotify lookups resolve on a later tick, as a real network call would,
// so the chart table is committed to the DOM before the iframes are injected.
const later = <T,>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), 0));

const songs = [
  { artist: "Bill Haley Ft. The Comets", title: "Rock Around The Clock (Remix)" },
  { artist: "Wham!/George Michael", title: "F**k It" },
  ...Array.from({ length: 20 }, (_, i) => ({
    artist: `Artist ${i + 2}`,
    title: `Song ${i + 2}`,
  })),
];

const spotifyQuery = (body: unknown) =>
  new URL((body as { spotifyUrl: string }).spotifyUrl).search.match(/q=(.*?)&type=/)?.[1] ?? "";

const setupSuccessfulApis = () => {
  mockedAxios.get.mockResolvedValue(wikiResponse(buildWikiHtml(songs)));
  mockedAxios.post.mockImplementation((_url, body) => {
    const query = spotifyQuery(body);
    // "Wham!" row: nothing found on Spotify
    if (query.startsWith("Wham!")) return later(spotifyResponse(null));
    return later(spotifyResponse(`id-${query}`));
  });
};

const chartRows = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLTableRowElement>("#wikichart > table > tbody > tr")
  );

// The week picker unlocks as soon as the chart renders; Spotify players arrive after.
// Wait for both: no overlay, and every song row showing a player or "No song found".
const waitForChartLoaded = () =>
  waitFor(() => {
    expect(screen.queryByText("Loading Chart...")).not.toBeInTheDocument();
    expect(document.querySelector("#wikichart > table")).not.toBeNull();
    const rows = document.querySelectorAll("#wikichart > table > tbody > tr.song-row");
    rows.forEach((row) => expect(row.querySelector("iframe, .no-song")).not.toBeNull());
  });

describe("App", () => {
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, "", "/");
    pickDate.current = new Date(2000, 0, 12);
    consoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
    // App builds nested <table><tr> rows without a <tbody>, which React flags
    // with a validateDOMNesting warning. Hide only that known warning.
    const realError = console.error;
    consoleError = jest.spyOn(console, "error").mockImplementation((...args) => {
      if (String(args[0]).includes("validateDOMNesting")) return;
      realError(...args);
    });
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });

  describe("static content", () => {
    beforeEach(setupSuccessfulApis);

    it("renders the headings, intro and credits", async () => {
      render(<App />);
      expect(screen.getByRole("heading", { level: 1, name: "Rememrify" })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "The Spotify UK Charts Archive generator" })
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Choose a chart week" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "UK Top 20 Chart" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Inspiration" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "UK Charts Archive Wiki" })).toHaveAttribute(
        "href",
        "https://uk-charts-archive.fandom.com/"
      );
      expect(screen.getByRole("link", { name: "flatpickr" })).toHaveAttribute(
        "href",
        "https://flatpickr.js.org/"
      );
      await waitForChartLoaded();
    });

    it("renders the four hexagon background lists and injects their SVGs", async () => {
      const { container } = render(<App />);
      for (const orientation of ["top", "bottom", "left", "right"]) {
        expect(container.querySelector(`#background ul.no-disc.${orientation}`)).toBeInTheDocument();
      }
      expect(SVGInject).toHaveBeenCalledTimes(1);
      const injected = (SVGInject as jest.Mock).mock.calls[0][0] as NodeListOf<Element>;
      expect(injected).toHaveLength(40);
      await waitForChartLoaded();
    });
  });

  describe("initial week selection", () => {
    beforeEach(setupSuccessfulApis);

    it("defaults to the week starting 01/01/2000 when there is no URL hash", async () => {
      render(<App />);
      expect(await screen.findByText("01/01/2000")).toBeInTheDocument();
      expect(window.location.hash).toBe("#date=01/01/2000");
      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://uk-charts-archive.fandom.com/api.php?action=parse&format=json&page=UK_Singles_%26_Album_Chart_(01/01/2000)&origin=*"
      );
      expect(flatpickrProps.current?.value).toEqual([
        new Date(2000, 0, 1),
        new Date(2000, 0, 7),
      ]);
      await waitForChartLoaded();
    });

    it("reads the week from the URL hash", async () => {
      window.location.hash = "#date=13/05/1995";
      render(<App />);
      expect(await screen.findByText("13/05/1995")).toBeInTheDocument();
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("UK_Singles_%26_Album_Chart_(13/05/1995)")
      );
      await waitForChartLoaded();
    });

    it("snaps a mid-week URL hash back to the preceding Saturday", async () => {
      window.location.hash = "#date=17/05/1995"; // Wednesday
      render(<App />);
      expect(await screen.findByText("13/05/1995")).toBeInTheDocument();
      expect(window.location.hash).toBe("#date=13/05/1995");
      await waitForChartLoaded();
    });
  });

  describe("choosing a week", () => {
    beforeEach(setupSuccessfulApis);

    it.each([
      ["a Saturday", new Date(2000, 0, 8)],
      ["a Wednesday", new Date(2000, 0, 12)],
      ["a Friday", new Date(2000, 0, 14)],
    ])("selects the Saturday-to-Friday week when %s is picked", async (_label, date) => {
      render(<App />);
      await waitForChartLoaded();
      mockedAxios.get.mockClear();

      pickDate.current = date;
      await userEvent.click(screen.getByTestId("flatpickr"));

      expect(await screen.findByText("08/01/2000")).toBeInTheDocument();
      expect(window.location.hash).toBe("#date=08/01/2000");
      expect(flatpickrProps.current?.value).toEqual([
        new Date(2000, 0, 8),
        new Date(2000, 0, 14),
      ]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("UK_Singles_%26_Album_Chart_(08/01/2000)")
      );
      await waitForChartLoaded();
    });
  });

  describe("chart rendering", () => {
    beforeEach(setupSuccessfulApis);

    it("renders the info row plus the top 20 songs only", async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(chartRows(container)).toHaveLength(21));
      const [info, ...songRows] = chartRows(container);
      expect(info).toHaveClass("info-row");
      songRows.forEach((row) => expect(row).toHaveClass("song-row"));
      expect(screen.queryByText("Artist 21")).not.toBeInTheDocument();
      expect(screen.getByText("Artist 19")).toBeInTheDocument();
      await waitForChartLoaded();
    });

    it("wraps each row's cells in a nested table tagged with its column count", async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(chartRows(container)).toHaveLength(21));
      chartRows(container).forEach((row) => {
        const wrapper = row.querySelector("tr.wrapper");
        expect(wrapper).toHaveClass("five-columns");
        expect(wrapper?.children).toHaveLength(5);
      });
      await waitForChartLoaded();
    });

    it("spaces out forward slashes in artist and title names", async () => {
      render(<App />);
      expect(await screen.findByText("Wham! / George Michael")).toBeInTheDocument();
      await waitForChartLoaded();
    });

    it("supports six- and seven-column chart layouts", async () => {
      mockedAxios.get.mockResolvedValue(
        wikiResponse(
          buildWikiHtml(
            [
              { artist: "Six Artist", title: "Six Song" },
              { artist: "Seven Artist", title: "Seven Song" },
            ],
            [6, 7]
          )
        )
      );
      const { container } = render(<App />);
      await waitFor(() => expect(chartRows(container)).toHaveLength(3));
      const [, six, seven] = chartRows(container);
      expect(six.querySelector("tr.wrapper")).toHaveClass("six-columns");
      expect(seven.querySelector("tr.wrapper")).toHaveClass("seven-columns");
      await waitForChartLoaded();
      const queries = mockedAxios.post.mock.calls.map(([, body]) =>
        spotifyQuery(body)
      );
      expect(queries.slice(0, 2)).toEqual(["Six+ArtistSix+Song", "Seven+ArtistSeven+Song"]);
    });

    it("still wraps rows with an unrecognised column count, but skips song extraction", async () => {
      mockedAxios.get.mockResolvedValue(
        wikiResponse(buildWikiHtml([{ artist: "AC/DC", title: "Thunderstruck" }], [4]))
      );
      const { container } = render(<App />);
      await waitFor(() => expect(chartRows(container)).toHaveLength(2));
      const [, song] = chartRows(container);
      const wrapper = song.querySelector("tr.wrapper");
      expect(wrapper?.className).toBe("wrapper");
      expect(wrapper?.children).toHaveLength(4);
      // slash formatting only happens during extraction, so the name is untouched
      expect(screen.getByText("AC/DC")).toBeInTheDocument();
      await waitForChartLoaded();
    });
  });

  describe("charts with unreadable or missing rows", () => {
    const mixedSongs = [
      { artist: "First Artist", title: "First Song" },
      { artist: "Odd Artist", title: "Odd Song" },
      { artist: "Third Artist", title: "Third Song" },
    ];

    beforeEach(() => {
      mockedAxios.post.mockImplementation((_url, body) =>
        later(spotifyResponse(`id-${spotifyQuery(body)}`))
      );
    });

    it("keeps players aligned with their songs when a row can't be read", async () => {
      // middle row has an unrecognised 4-column layout
      mockedAxios.get.mockResolvedValue(wikiResponse(buildWikiHtml(mixedSongs, [5, 4, 5])));
      const { container } = render(<App />);
      await waitForChartLoaded();

      const queries = mockedAxios.post.mock.calls.map(([, body]) => spotifyQuery(body));
      expect(queries).toEqual(["First+ArtistFirst+Song", "Third+ArtistThird+Song"]);

      const [, first, odd, third] = chartRows(container);
      expect(first.querySelector("iframe")).toHaveAttribute(
        "src",
        "https://open.spotify.com/embed?uri=spotify:track:id-First+ArtistFirst+Song"
      );
      expect(within(odd).getByText("No song found on Spotify!")).toBeInTheDocument();
      expect(odd.querySelector("iframe")).not.toBeInTheDocument();
      expect(third.querySelector("iframe")).toHaveAttribute(
        "src",
        "https://open.spotify.com/embed?uri=spotify:track:id-Third+ArtistThird+Song"
      );
    });

    it("only searches for the songs a short chart actually has", async () => {
      mockedAxios.get.mockResolvedValue(wikiResponse(buildWikiHtml(mixedSongs)));
      render(<App />);
      await waitForChartLoaded();

      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
      mockedAxios.post.mock.calls.forEach(([, body]) =>
        expect(spotifyQuery(body)).not.toContain("undefined")
      );
    });

    it("finishes loading when the chart has no song rows", async () => {
      mockedAxios.get.mockResolvedValue(wikiResponse(buildWikiHtml([])));
      const { container } = render(<App />);
      await waitFor(() => expect(chartRows(container)).toHaveLength(1));
      await waitForChartLoaded();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe("Spotify lookups", () => {
    beforeEach(setupSuccessfulApis);

    it("posts one search per chart position to the local API on localhost", async () => {
      render(<App />);
      await waitForChartLoaded();
      expect(mockedAxios.post).toHaveBeenCalledTimes(20);
      mockedAxios.post.mock.calls.forEach(([url, body]) => {
        expect(url).toBe("http://localhost:3001/");
        expect((body as { spotifyUrl: string }).spotifyUrl).toMatch(
          /^https:\/\/api\.spotify\.com\/v1\/search\?q=.*&type=track&market=GB&limit=1$/
        );
      });
    });

    it("cleans artist and title names into search terms", async () => {
      render(<App />);
      await waitForChartLoaded();
      const queries = mockedAxios.post.mock.calls.map(([, body]) =>
        spotifyQuery(body)
      );
      // "Ft." and everything after it dropped; bracketed words removed
      expect(queries[0]).toBe("Bill+HaleyRock+Around+The+Clock++");
      // text after a slash dropped; censored words removed
      expect(queries[1]).toBe("Wham!+It");
      expect(queries[2]).toBe("Artist+2Song+2");
    });

    it("embeds a Spotify player under each song that was found", async () => {
      const { container } = render(<App />);
      await waitForChartLoaded();
      const firstSong = chartRows(container)[1];
      const iframe = firstSong.querySelector("tr.iframe-wrapper iframe");
      expect(iframe).toHaveAttribute(
        "src",
        "https://open.spotify.com/embed?uri=spotify:track:id-Bill+HaleyRock+Around+The+Clock++"
      );
      expect(iframe).toHaveAttribute("allow", "encrypted-media");
      expect(container.querySelectorAll("#wikichart iframe")).toHaveLength(19);
    });

    it("hides the song loader once the player has loaded", async () => {
      const { container } = render(<App />);
      await waitForChartLoaded();
      const firstSong = chartRows(container)[1];
      const loader = firstSong.querySelector<HTMLElement>("tr.load-wrapper");
      expect(loader).toHaveTextContent("Loading song...");
      expect(loader?.style.display).not.toBe("none");

      fireEvent.load(firstSong.querySelector("iframe")!);
      expect(loader?.style.display).toBe("none");
    });

    it("shows a message when a song is not on Spotify", async () => {
      const { container } = render(<App />);
      await waitForChartLoaded();
      const whamRow = chartRows(container)[2];
      expect(within(whamRow).getByText("No song found on Spotify!")).toBeInTheDocument();
      expect(whamRow.querySelector("iframe")).not.toBeInTheDocument();
    });

    it("shows the loading overlay while the chart itself is loading", async () => {
      let resolveWiki: (value: unknown) => void = () => {};
      mockedAxios.get.mockReturnValue(new Promise((resolve) => (resolveWiki = resolve)));
      render(<App />);
      expect(await screen.findByText("Loading Chart...")).toBeInTheDocument();

      resolveWiki(wikiResponse(buildWikiHtml(songs)));
      await waitForChartLoaded();
    });

    it("unlocks the week picker as soon as the chart renders, before Spotify answers", async () => {
      // Spotify never answers
      mockedAxios.post.mockReturnValue(new Promise(() => {}));
      const { container } = render(<App />);
      await waitFor(() => expect(chartRows(container)).toHaveLength(21));
      await waitFor(() =>
        expect(screen.queryByText("Loading Chart...")).not.toBeInTheDocument()
      );
      expect(mockedAxios.post).toHaveBeenCalledTimes(20);
      expect(container.querySelectorAll("#wikichart iframe")).toHaveLength(0);
    });
  });

  describe("switching weeks", () => {
    it("ignores Spotify answers for a week that is no longer on screen", async () => {
      mockedAxios.get.mockResolvedValue(wikiResponse(buildWikiHtml(songs)));
      // hold the first week's lookups until after the week has changed
      const heldLookups: Array<() => void> = [];
      let holdLookups = true;
      mockedAxios.post.mockImplementation((_url, body) => {
        const query = spotifyQuery(body);
        const answer = query.startsWith("Wham!")
          ? spotifyResponse(null)
          : spotifyResponse(`id-${query}`);
        if (holdLookups) {
          return new Promise((resolve) => heldLookups.push(() => resolve(answer)));
        }
        return later(answer);
      });

      const { container } = render(<App />);
      await waitFor(() => expect(heldLookups).toHaveLength(20));

      // pick the next week while the first week's lookups are still pending
      holdLookups = false;
      pickDate.current = new Date(2000, 0, 12);
      await userEvent.click(screen.getByTestId("flatpickr"));
      expect(await screen.findByText("08/01/2000")).toBeInTheDocument();
      await waitForChartLoaded();

      // now let the old week's answers arrive
      heldLookups.forEach((release) => release());
      await new Promise((resolve) => setTimeout(resolve, 20));

      // one player per found song (19) and one "No song found": no duplicates
      expect(container.querySelectorAll("#wikichart iframe")).toHaveLength(19);
      expect(container.querySelectorAll("#wikichart .no-song")).toHaveLength(1);
      chartRows(container)
        .slice(1)
        .forEach((row) =>
          expect(row.querySelectorAll("iframe, .no-song")).toHaveLength(1)
        );
    });
  });

  describe("error handling", () => {
    it("logs and leaves the chart empty when the wiki request fails", async () => {
      const error = new Error("wiki down");
      mockedAxios.get.mockRejectedValue(error);
      const { container } = render(<App />);
      await waitFor(() => expect(consoleLog).toHaveBeenCalledWith(error));
      expect(container.querySelector("#wikichart")).toBeEmptyDOMElement();
      // the week picker isn't left locked
      await waitFor(() =>
        expect(screen.queryByText("Loading Chart...")).not.toBeInTheDocument()
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("logs a failed Spotify lookup without breaking the rest of the chart", async () => {
      const error = new Error("spotify down");
      mockedAxios.get.mockResolvedValue(wikiResponse(buildWikiHtml(songs)));
      mockedAxios.post.mockImplementation((_url, body) => {
        const query = spotifyQuery(body);
        if (query.startsWith("Bill")) return Promise.reject(error);
        return later(spotifyResponse(`id-${query}`));
      });
      const { container } = render(<App />);
      await waitFor(() => expect(consoleLog).toHaveBeenCalledWith(error));
      await waitFor(() =>
        expect(container.querySelectorAll("#wikichart iframe")).toHaveLength(19)
      );
      expect(chartRows(container)[1].querySelector("iframe")).not.toBeInTheDocument();
    });
  });
});
