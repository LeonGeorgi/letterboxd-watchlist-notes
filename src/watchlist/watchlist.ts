import { createApp } from 'vue';
import WatchlistNoteViewer from './WatchlistNoteViewer.vue';

function queryFilmId(filmPoster: Element) {
  // get "data-film-slug" attribute from the ".film-poster" element
  const slug = filmPoster.getAttribute('data-film-slug');
  if (slug !== null) {
    return slug;
  }
  const filmPosterLink = filmPoster.querySelector('a');
  if (!filmPosterLink) {
    console.log('Error: Film poster link not found.');
    return null;
  }
  const url = filmPosterLink?.getAttribute('href');
  if (!url) {
    console.log('Error: Film poster link URL not found.');
    return null;
  }
  const regex = /.*\/film\/(.+)\//;
  const match = url.match(regex);
  if (!match) {
    console.log('Error: Film ID not found in URL:', url);
    return null;
  }
  return match[1];
}

export function initializeWatchlist(notes: { [key: string]: string }) {
  console.log('Watchlist page initialized.');
  // wait up to 5 seconds for the a ".film-poster" element to appear
  let attempts = 0;
  const retryIntervalMs = 500;
  const maxAttempts = 5000 / retryIntervalMs;
  const interval = setInterval(() => {
    const filmPosters = document.querySelectorAll('.film-poster');
    if (filmPosters.length > 0) {
      clearInterval(interval);
      console.log('Film posters found:', filmPosters);
      console.log('Watchlist page is ready.');
      for (const filmPoster of filmPosters) {
        const filmId = queryFilmId(filmPoster);
        if (filmId) {
          const note = notes[filmId]; // TODO: this is using the wrong film ID
          if (note) {
            console.log('Film ID:', filmId);
            console.log('Note for film:', note);
            const noteElement = document.createElement('div');
            noteElement.textContent = note;
            filmPoster.appendChild(noteElement);
            const app = createApp(WatchlistNoteViewer, { filmId });
            app.mount(noteElement);
          }
        }
      }
    } else {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.log('Error: Film posters not found after multiple attempts.');
      }
    }
  }, retryIntervalMs);
}