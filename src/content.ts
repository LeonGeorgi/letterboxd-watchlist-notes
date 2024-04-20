import { initializeFilmPage } from './film/film';
import { initializeWatchlist } from './watchlist/watchlist';
import { getAllNotesSync } from './util/storage';

function initialize(notes: { [key: string]: string }) {
  console.log(notes);
  const url = window.location.href;
  if (url.startsWith('https://letterboxd.com/film/')) {
    initializeFilmPage(notes);
  }

  // if url is like https://letterboxd.com/[username]/watchlist/, call initializeWatchlist()
  const regex = /https:\/\/letterboxd\.com\/.+\/watchlist\//;
  if (regex.test(url)) {
    initializeWatchlist(notes);
  }
}

// get notes from local storage
const notesFromLocalStorage = localStorage.getItem('notes');

function initializeWithFetchedNotes() {
  getAllNotesSync().then((notes) => {
    localStorage.setItem('notes', JSON.stringify({ notes, cacheValid: true, date: new Date() }));
    initialize(notes);
  }).catch((error) => {
    console.error('Error fetching notes:', error);
  });
}

if (notesFromLocalStorage) {
  const { notes, cacheValid, date } = JSON.parse(notesFromLocalStorage);
  // if cache is valid and date is less than 1 day old, use notes from local storage
  if (cacheValid) {
    const dateNow = new Date();
    const dateCached = new Date(date);
    const diffMs = dateNow.getTime() - dateCached.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 1) {
      console.log('Cache is valid. Using notes from local storage.');
      initialize(notes);
    } else {
      console.log('Cache is outdated. Fetching notes from Letterboxd.');
      initializeWithFetchedNotes();
    }
  } else {
    console.log('Cache is invalid. Fetching notes from Letterboxd.');
    initializeWithFetchedNotes();
  }
} else {
  console.log('Notes not found in local storage. Fetching notes from Letterboxd.');
  initializeWithFetchedNotes();
}
