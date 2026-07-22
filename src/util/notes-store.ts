import type { Notes } from './storage';

const NOTE_LIST_KEY = 'noteList';
const NOTES_CACHE_KEY = 'notes';
const NOTES_CACHE_VERSION = 3;
const NOTES_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type NotesCacheIdentity = {
  listId: string;
  username: string;
};

type NotesCache = {
  version: number;
  listId: string;
  username: string;
  notes: Notes;
  cacheValid: boolean;
  date: string;
};

function isNotes(value: unknown): value is Notes {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every((note) => typeof note === 'string')
  );
}

export function getConfiguredNoteListId() {
  return localStorage.getItem(NOTE_LIST_KEY);
}

export function setConfiguredNoteListId(listId: string) {
  localStorage.setItem(NOTE_LIST_KEY, listId);
  invalidateNotesCache();
}

export function clearConfiguredNoteListId() {
  localStorage.removeItem(NOTE_LIST_KEY);
  invalidateNotesCache();
}

export function readNotesCache(identity: NotesCacheIdentity): Notes | null {
  const serializedCache = localStorage.getItem(NOTES_CACHE_KEY);
  if (!serializedCache) {
    return null;
  }

  try {
    const cache = JSON.parse(serializedCache) as Partial<NotesCache>;
    const cacheTimestamp = typeof cache.date === 'string' ? Date.parse(cache.date) : Number.NaN;
    const cacheAge = Date.now() - cacheTimestamp;

    if (
      cache.version === NOTES_CACHE_VERSION &&
      cache.listId === identity.listId &&
      cache.username === identity.username &&
      cache.cacheValid === true &&
      Number.isFinite(cacheAge) &&
      cacheAge >= 0 &&
      cacheAge < NOTES_CACHE_MAX_AGE_MS &&
      isNotes(cache.notes)
    ) {
      return cache.notes;
    }
  } catch (error) {
    console.warn('Ignoring an invalid notes cache.', error);
  }

  return null;
}

export function writeNotesCache(identity: NotesCacheIdentity, notes: Notes) {
  const cache: NotesCache = {
    version: NOTES_CACHE_VERSION,
    ...identity,
    notes,
    cacheValid: true,
    date: new Date().toISOString(),
  };

  localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(cache));
}

export function invalidateNotesCache() {
  localStorage.removeItem(NOTES_CACHE_KEY);
}
