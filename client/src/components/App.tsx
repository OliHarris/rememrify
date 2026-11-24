import { useState, useEffect, ReactNode } from "react";
import axios from "axios";
import parseHtml from "html-react-parser";
import SVGInject from "@iconfu/svg-inject";

import BackgroundHexagonCompositeList from "./BackgroundHexagonCompositeList";
import WeekPicker from "./WeekPicker";
import ContentPanel from "./ContentPanel";

const App = () => {
  const total = 20;

  const selectWholeWeek = (event: Date[]) => {
    const selectedDate = event[0];
    // prevDate - check not Saturday
    const prevDate =
      selectedDate.getDay() !== 6
        ? // work out last Saturday
          selectedDate.setDate(
            selectedDate.getDate() - (selectedDate.getDay() + 1)
          )
        : selectedDate.setDate(selectedDate.getDate());
    // nextDate - selectedDate is now the Saturday, so the week ends on the Friday six days later
    const nextDate = selectedDate.setDate(selectedDate.getDate() + 6);
    setDateRange([new Date(prevDate), new Date(nextDate)]);
    setWeekStart(new Date(prevDate).toLocaleDateString("en-GB"));
  };

  const [dateRange, setDateRange] = useState<[Date, Date]>();
  const [weekStart, setWeekStart] = useState<string>("");
  useEffect(() => {
    // check url hash
    if (window.location.hash) {
      const urlHash = window.location.hash
        .substring(1)
        .replace("date=", "")
        .split("/");
      const urlDate = urlHash[2] + "," + urlHash[1] + "," + urlHash[0];
      return selectWholeWeek([new Date(urlDate)]);
    } else {
      return selectWholeWeek([new Date(2000, 0, 1)]);
    }
  }, []);

  const [loadData, setLoadData] = useState<boolean>(false);
  const [tableOutput, setTableOutput] = useState<ReactNode>(null);
  useEffect(() => {
    // set to true when the week changes, so late answers for this week are ignored
    let staleWeek = false;

    // clear table
    setTableOutput(null);

    if (weekStart) {
      // generate url hash based on selection
      window.location.hash = `date=${weekStart}`;
      setLoadData(true);

      axios
        .get(
          `https://uk-charts-archive.fandom.com/api.php?action=parse&format=json&page=UK_Singles_%26_Album_Chart_(${weekStart})&origin=*`
        )
        .then((response) => {
          // a different week has been picked since this request was sent
          if (staleWeek) return;
          // console.log(response);
          // populate data from Wiki API JSON file
          const output = response.data.parse.text["*"];
          // find tables
          const parser = new DOMParser();
          const doc = parser.parseFromString(output, "text/html");
          const table = doc.getElementsByTagName("table")[0];

          // wrap: no song (or another message in the same style)
          const createWrapNoSong = (message = "No song found on Spotify!") => {
            // construct message
            const trElement = document.createElement("tr");
            trElement.classList.add("no-song-wrapper");
            trElement.innerHTML = `<td colspan='3'><div>
              <div class='no-song'>${message}</div>
              </div></td>`;
            return trElement;
          };

          // wrap: song loader, shown from the moment the chart appears
          // until that row's Spotify result arrives
          const createWrapSongLoader = () => {
            // construct loader
            const trElement = document.createElement("tr");
            trElement.classList.add("load-wrapper");
            trElement.innerHTML = `<td colspan='3'><div>
              <div class='load-song'>Loading song...</div>
              </div></td>`;
            return trElement;
          };

          const artistArray: (string | null)[] = [];
          const titleArray: (string | null)[] = [];

          (() => {
            // extract artist + title data based on columns
            const extractSongData = (
              classList: DOMTokenList,
              artistNode: Element | null,
              titleNode: Element | null
            ) => {
              if (classList.contains("song-row")) {
                // always push one entry per song row (null if the column wasn't found),
                // so array positions stay aligned with chart positions
                artistArray.push(artistNode ? artistNode.textContent : null);
                titleArray.push(titleNode ? titleNode.textContent : null);
                if (artistNode) {
                  // format forward-slashes on UI
                  if (artistNode.textContent) {
                    artistNode.textContent = artistNode.textContent.replace(
                      /\//g,
                      " / "
                    );
                  }
                }
                if (titleNode) {
                  // format forward-slashes on UI
                  if (titleNode.textContent) {
                    titleNode.textContent = titleNode.textContent.replace(
                      /\//g,
                      " / "
                    );
                  }
                }
              }
            };

            // format table further
            const createWrapTable = (content: Element) => {
              // construct table
              const tdElement = document.createElement("td");
              const tableElement = document.createElement("table");
              tableElement.style.width = "100%";
              const trElement = document.createElement("tr");
              trElement.classList.add("wrapper");
              // format different table columns parsed
              // artist is in this column; title is in the next one
              let artistColumn: number | null = null;
              switch (content.children.length) {
                case 5:
                case 10:
                  trElement.classList.add("five-columns");
                  artistColumn = 4;
                  break;
                case 6:
                case 11:
                  trElement.classList.add("six-columns");
                  artistColumn = 5;
                  break;
                case 7:
                case 12:
                  trElement.classList.add("seven-columns");
                  artistColumn = 6;
                  break;
                default:
                // unrecognised layout: no song data can be read from this row
              }
              extractSongData(
                content.classList,
                artistColumn
                  ? content.querySelector(`td:nth-of-type(${artistColumn})`)
                  : null,
                artistColumn
                  ? content.querySelector(`td:nth-of-type(${artistColumn + 1})`)
                  : null
              );
              // wrap child content
              Array.from(content.children).forEach((item) => {
                trElement.appendChild(item);
              });
              // append to DOM
              tableElement.appendChild(trElement);
              if (content.classList.contains("song-row")) {
                if (artistColumn === null) {
                  // song row we can't read: show the message now, as there's nothing to search for
                  tableElement.appendChild(createWrapNoSong());
                } else {
                  // song row we'll look up: show its loader straight away
                  tableElement.appendChild(createWrapSongLoader());
                }
              }
              tdElement.appendChild(tableElement);
              return tdElement;
            };

            // info row
            const infoRow = table.querySelector("tr:first-of-type");
            if (infoRow) {
              infoRow.classList.add("info-row");
              infoRow.appendChild(createWrapTable(infoRow));
            }

            // song rows
            table.querySelectorAll("tr+tr").forEach((item, index) => {
              item.classList.add("song-row");
              // remove unneeded output below total
              if (index >= total) {
                item.remove();
              } else {
                item.appendChild(createWrapTable(item));
              }
            });

            setTableOutput(parseHtml(table.outerHTML));
            // chart is ready: unlock the week picker now, rather than waiting
            // for the Spotify lookups (each song row shows its own "Loading song...")
            setLoadData(false);
          })();

          (() => {
            // array looper
            const arrayLooper = (index: number) => {
              // add a row (player, message) under this song's chart row
              const displayWrapper = (wrapper: HTMLTableRowElement) => {
                const songRow = document.querySelector(
                  `#wikichart tr:nth-of-type(${index + 2}) tr.wrapper`
                );
                if (songRow) {
                  songRow.after(wrapper);
                }
              };
              // hide this song's "Loading song..." row; returns false if it has none
              const hideSongLoader = () => {
                const songLoader = document.querySelector(
                  `#wikichart tr:nth-of-type(${index + 2}) tr.load-wrapper`
                ) as HTMLElement | null;
                if (songLoader) {
                  songLoader.style.display = "none";
                }
                return songLoader !== null;
              };

              return new Promise<void>((resolve) => {
                const stringCleanser = (string: string | null) => {
                  if (string) {
                    return (
                      string
                        // need to remove '%'
                        .replace("%", "")
                        // need to remove ' &' and ' And'; replace with '+'
                        .replace(" &", "+")
                        .replace(" And", "+")
                        // need to remove ' Ft', ' ft', ' Ft.', ' ft.' and all following info; replace with '+'
                        .split(" Ft")[0]
                        .replace(" Ft", "+")
                        .split(" ft")[0]
                        .replace(" ft", "+")
                        .split(" Ft.")[0]
                        .replace(" Ft.", "+")
                        .split(" ft.")[0]
                        .replace(" ft.", "+")
                        // need to remove slashes and all following info; replace with '+'
                        .split(/\//g)[0]
                        .replace(/\//g, "+")
                        // need to remove spaces; replace with '+'
                        .replace(/\s+/g, "+")
                        // need to remove words in brackets (); replace with '+'
                        .replace(/ *\([^)]*\) */g, "+")
                        // need to replace double-quotes with single-quotes
                        .replace(/"/g, "'")
                    );
                  }
                };
                const artist = stringCleanser(artistArray[index]);
                // console.log(artist);
                let title = stringCleanser(titleArray[index]);
                // console.log(title);

                // find censored-starred single words and curly-braces {} then remove them
                // replace between two +'s
                if (title) {
                  const titleWord = title.split("+");
                  titleWord.forEach((item, index) => {
                    if (
                      item.indexOf("*") !== -1 ||
                      item.indexOf("{") !== -1 ||
                      item.indexOf("}") !== -1
                    ) {
                      titleWord[index] = "";
                    }
                  });
                  title = titleWord.join("+");
                }

                // no artist or title could be read from this row: nothing to search for
                // (an unreadable row got its "No song found" message when the table was
                // built; a readable row with empty cells swaps its loader for one now)
                if (!artist && !title) {
                  if (hideSongLoader()) {
                    displayWrapper(createWrapNoSong());
                  }
                  resolve();
                  return;
                }

                // get tokenResult securely from Netlify Function API
                const currentHostname = window.location.hostname;
                axios
                  .post(
                    currentHostname === "localhost"
                      ? "http://localhost:3001/"
                      : "https://rememrify-connect.netlify.app/api/spotify-connect",
                    {
                      spotifyUrl: `https://api.spotify.com/v1/search?q=${artist}${title}&type=track&market=GB&limit=1`,
                    }
                  )
                  .then((response) => {
                    // a different week is on screen now: don't add this song to its table
                    if (staleWeek) {
                      resolve();
                      return;
                    }
                    // console.log(response);
                    // get Spotify ID if exists, push into array
                    const data = response.data;
                    // if no song
                    if (!data.tracks.items[0]) {
                      // swap the loader for the message
                      hideSongLoader();
                      displayWrapper(createWrapNoSong());
                    } else if (data.tracks.items[0]) {
                      // the row's loader stays visible until the player has loaded

                      // wrap: song iframe
                      const createWrapSongIframe = () => {
                        // construct iframe
                        const trElement = document.createElement("tr");
                        trElement.classList.add("iframe-wrapper");
                        trElement.innerHTML = `<td colspan='3'></td>`;
                        return trElement;
                      };
                      // song row
                      displayWrapper(createWrapSongIframe());

                      //query Spotify ID
                      const songId = data.tracks.items[0].id;
                      // insert Spotify src
                      const spotifyApiSrc = `https://open.spotify.com/embed?uri=spotify:track:${songId}`;
                      // iframe create
                      const iframeElement = document.createElement("iframe");
                      iframeElement.setAttribute("src", spotifyApiSrc);
                      iframeElement.setAttribute("frameborder", "0");
                      iframeElement.setAttribute("allowtransparency", "true");
                      iframeElement.setAttribute("allow", "encrypted-media");
                      // attach 'load' before iframe starts loading
                      iframeElement.onload = () => {
                        hideSongLoader();
                      };
                      // output iframe
                      const iframeRow = document.querySelector(
                        `#wikichart tr:nth-of-type(${
                          index + 2
                        }) tr.iframe-wrapper td`
                      );
                      if (iframeRow) {
                        const wrap = (
                          wrapperElement: Element,
                          insideElement: HTMLIFrameElement
                        ) => {
                          // construct wrapper
                          insideElement.replaceWith(wrapperElement);
                          wrapperElement.appendChild(insideElement);
                        };
                        wrap(iframeRow, iframeElement);
                      }
                    }
                    // resolve when complete
                    resolve();
                  })
                  .catch((error) => {
                    console.log(error);
                    // don't leave this row saying "Loading song..." forever
                    if (!staleWeek) {
                      hideSongLoader();
                      displayWrapper(createWrapNoSong("Couldn't load this song"));
                    }
                  });
              });
            };

            // one lookup per song row actually in the chart (up to total)
            const songCount = artistArray.length;
            new Array(songCount).fill(0).forEach((_item, index) => {
              arrayLooper(index);
            });
          })();
        })
        .catch((error) => {
          console.log(error);
          // don't leave the week picker locked if the chart couldn't load
          if (!staleWeek) setLoadData(false);
        });
    }

    return () => {
      staleWeek = true;
    };
  }, [weekStart]);

  useEffect(() => {
    SVGInject(document.querySelectorAll("img.svg-inject"));
  }, []);

  return (
    <main>
      <div id="background" className="cf">
        <div id="grass"></div>
        <BackgroundHexagonCompositeList orientation="top" />
        <BackgroundHexagonCompositeList orientation="bottom" />
        <BackgroundHexagonCompositeList orientation="left" />
        <BackgroundHexagonCompositeList orientation="right" />
      </div>
      {/* 1008px max-width */}
      <div className="row">
        <div className="small-12 columns">
          <div className="panel center">
            <div className="content">
              <h1>Rememrify</h1>
              <h2>The Spotify UK Charts Archive generator</h2>
              <hr />
              <div className="spacer">
                <p className="center">
                  Time-travel through Spotify lists of the UK Top 20!
                </p>
                <p className="center">
                  Select through every UK musical chart week from
                  <br />
                  <span className="highlight">05/01/1957</span> through to{" "}
                  <span className="highlight">21/04/2012</span>.
                </p>
              </div>
            </div>
            <div className="background"></div>
          </div>
          <div className="row">
            <section className="small-12 large-6 xlarge-5 columns">
              <div className="panel center">
                <div className="content">
                  <h2>Choose a chart week</h2>
                  <div className="spacer">
                    Maybe your birthday plus 13 years..?
                  </div>
                  <hr />
                  <WeekPicker
                    loadData={loadData}
                    dateRange={dateRange}
                    selectWholeWeek={selectWholeWeek}
                  />
                </div>
                <div className="background"></div>
              </div>
            </section>
            <section className="small-12 large-6 xlarge-7 columns">
              <div className="panel center">
                <ContentPanel
                  total={total}
                  weekStart={weekStart}
                  tableOutput={tableOutput}
                />
                <div className="background"></div>
              </div>
            </section>
            <section className="small-12 columns">
              <div className="panel center">
                <div className="content">
                  <h2>Inspiration</h2>
                  <p>
                    <em>
                      "I recommend that if you are caring for or sharing with or
                      just chatting to someone who's memory is beginning to fail
                      them and they are not particularly engaging with what is
                      culturally happening at the moment, track down the Top
                      Twenty on their 13th birthday and get them to choose ten
                      of the tracks and play them back together... and then
                      discuss"
                    </em>
                    <br />~ Bill Drummond
                  </p>
                  <hr />
                  <h2>Further info</h2>
                  <p>
                    If you are browsing this site from your desktop, and logged
                    into{" "}
                    <a href="https://www.spotify.com/" target="_blank">
                      Spotify
                    </a>{" "}
                    in your browser...
                    <br />
                    You can enjoy playback of full songs rather than 30 second
                    snippets!
                  </p>
                  <hr />
                  <h2>Credits</h2>
                  <p>
                    This would not be possible without the{" "}
                    <a
                      href="https://uk-charts-archive.fandom.com/"
                      target="_blank"
                    >
                      UK Charts Archive Wiki
                    </a>
                    .<br />
                    Catalogued by volunteers, this is a free reference of weekly
                    chart archive data.
                  </p>
                  <p>
                    Datepicker drilled-in from{" "}
                    <a href="https://flatpickr.js.org/" target="_blank">
                      flatpickr
                    </a>
                    .
                  </p>
                  <p>
                    All design and implementation &copy;
                    <a href="http://github.com/oliharris" target="_blank">
                      Oliver Harris
                    </a>
                    , 2017, 2021, 2023, 2026
                  </p>
                  <p>
                    <em>Where we're going, we don't need roads!</em>
                  </p>
                </div>
                <div className="background"></div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default App;
