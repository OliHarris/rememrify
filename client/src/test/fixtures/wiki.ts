export interface Song {
  artist: string;
  title: string;
}

const pad = (count: number) => Array.from({ length: count }, (_, i) => `<td>x${i}</td>`).join("");

/**
 * Build a wiki chart table like the UK Charts Archive returns: a header row,
 * then one row per song with the artist and title in the last two columns.
 * `columns` sets each song row's width (5, 6 or 7); defaults to 5.
 */
export const buildWikiHtml = (songs: Song[], columns: number[] = []) => {
  const headerWidth = columns[0] ?? 5;
  const header = `<tr>${Array.from({ length: headerWidth }, (_, i) => `<th>H${i}</th>`).join("")}</tr>`;
  const rows = songs
    .map((song, i) => {
      const width = columns[i] ?? 5;
      return `<tr><td>${i + 1}</td>${pad(width - 3)}<td>${song.artist}</td><td>${song.title}</td></tr>`;
    })
    .join("");
  return `<div class="mw-parser-output"><p>Intro</p><table class="wikitable">${header}${rows}</table></div>`;
};

export const wikiResponse = (html: string) => ({
  data: { parse: { text: { "*": html } } },
});

export const spotifyResponse = (trackId: string | null) => ({
  data: { tracks: { items: trackId ? [{ id: trackId }] : [] } },
});
