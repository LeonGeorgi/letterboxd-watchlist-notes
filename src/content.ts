import { initializeFilmPage } from './film/film';
import { getConfiguredNoteListId, readNotesCache, writeNotesCache } from './util/notes-store';
import { fetchAllNotes, getSignedInUsername, type Notes } from './util/storage';
import { initializeList } from './list/list';
import { initializeWatchlist } from './watchlist/watchlist';
import { isWatchlistPath } from './watchlist/watchlist-dom';

type NotesInitializer = (notes: Notes) => void;

async function initializeWithFetchedNotes(
  noteListId: string,
  username: string,
  initialize: NotesInitializer,
) {
  try {
    const notes = await fetchAllNotes(noteListId);
    writeNotesCache({ listId: noteListId, username }, notes);
    initialize(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    initialize({});
  }
}

function initializeNotesPage(initialize: NotesInitializer) {
  const noteListId = getConfiguredNoteListId();
  const username = getSignedInUsername();
  if (!noteListId || !username) {
    initialize({});
    return;
  }

  const cachedNotes = readNotesCache({ listId: noteListId, username });
  if (cachedNotes) {
    initialize(cachedNotes);
    return;
  }

  initializeWithFetchedNotes(noteListId, username, initialize);
}

const { hostname, pathname } = window.location;
if (hostname === 'letterboxd.com') {
  // Keep the list selector ready even when Letterboxd replaces or navigates its React sidebar.
  initializeList();

  if (/^\/[^/]+\/list\//.test(pathname)) {
    // List pages do not need the configured notes cache.
  } else if (pathname.startsWith('/film/')) {
    initializeNotesPage(initializeFilmPage);
  } else if (isWatchlistPath(pathname)) {
    initializeNotesPage(initializeWatchlist);
  }
}
