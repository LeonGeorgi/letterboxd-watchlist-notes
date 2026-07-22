import { initializeFilmPage } from './film/film';
import { getAllNotesSync, type Notes } from './util/storage';
import { initializeList } from './list/list';

const NOTES_CACHE_VERSION = 2;

function initializeWithFetchedNotes(noteListId: string) {
  getAllNotesSync(noteListId).then((notes) => {
    localStorage.setItem('notes', JSON.stringify({
      version: NOTES_CACHE_VERSION,
      notes,
      cacheValid: true,
      date: new Date(),
    }));
    initializeFilmPage(notes);
  }).catch((error) => {
    console.error('Error fetching notes:', error);
    initializeFilmPage({});
  });
}

function readCachedNotes(): Notes | null {
  const serializedCache = localStorage.getItem('notes');
  if (!serializedCache) {
    return null;
  }

  try {
    const cache = JSON.parse(serializedCache) as {
      notes?: unknown;
      cacheValid?: unknown;
      date?: unknown;
      version?: unknown;
    };
    const cacheDate = typeof cache.date === 'string'
      ? new Date(cache.date)
      : null;
    const cacheAge = cacheDate
      ? Date.now() - cacheDate.getTime()
      : Number.POSITIVE_INFINITY;
    const isFresh = cacheAge < 24 * 60 * 60 * 1000;

    if (
      cache.version === NOTES_CACHE_VERSION
      && cache.cacheValid === true
      && isFresh
      && cache.notes !== null
      && typeof cache.notes === 'object'
    ) {
      return cache.notes as Notes;
    }
  } catch (error) {
    console.warn('Ignoring invalid notes cache.', error);
  }

  return null;
}

function initializeFilm() {
  const noteListId = localStorage.getItem('noteList');
  if (!noteListId) {
    initializeFilmPage({});
    return;
  }

  const cachedNotes = readCachedNotes();
  if (cachedNotes) {
    console.log('Using cached watchlist notes.');
    initializeFilmPage(cachedNotes);
    return;
  }

  initializeWithFetchedNotes(noteListId);
}

const { hostname, pathname } = window.location;
if (hostname === 'letterboxd.com') {
  if (/^\/[^/]+\/list\//.test(pathname)) {
    // List selection must never be blocked by loading the configured note list.
    initializeList();
  } else if (pathname.startsWith('/film/')) {
    initializeFilm();
  }
}
