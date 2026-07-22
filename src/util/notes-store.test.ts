// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearConfiguredNoteListId,
  getConfiguredNoteListId,
  invalidateNotesCache,
  readNotesCache,
  setConfiguredNoteListId,
  writeNotesCache,
} from './notes-store';

describe('notes store', () => {
  const identity = { listId: 'watchlist-notes', username: 'leongeorgi' };

  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage);
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stores the configured list and invalidates cached notes', () => {
    writeNotesCache(identity, { 'film:1': 'A note' });

    setConfiguredNoteListId('watchlist-notes');

    expect(getConfiguredNoteListId()).toBe('watchlist-notes');
    expect(readNotesCache(identity)).toBeNull();
  });

  it('clears the configured list and cached notes', () => {
    setConfiguredNoteListId('watchlist-notes');
    writeNotesCache(identity, { 'film:1': 'A note' });

    clearConfiguredNoteListId();

    expect(getConfiguredNoteListId()).toBeNull();
    expect(readNotesCache(identity)).toBeNull();
  });

  it('reads a valid fresh cache', () => {
    const notes = { 'film:1': 'A note', slug: '' };

    writeNotesCache(identity, notes);

    expect(readNotesCache(identity)).toEqual(notes);
  });

  it('does not return notes for a different account or list', () => {
    writeNotesCache(identity, { 'film:1': 'A note' });

    expect(readNotesCache({ ...identity, username: 'another-user' })).toBeNull();
    expect(readNotesCache({ ...identity, listId: 'another-list' })).toBeNull();
  });

  it('rejects expired and malformed cache entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-22T12:00:00Z'));
    localStorage.setItem(
      'notes',
      JSON.stringify({
        version: 3,
        ...identity,
        notes: { 'film:1': 'A note' },
        cacheValid: true,
        date: '2026-07-21T11:59:59Z',
      }),
    );

    expect(readNotesCache(identity)).toBeNull();

    localStorage.setItem(
      'notes',
      JSON.stringify({
        version: 3,
        ...identity,
        notes: { 'film:1': 42 },
        cacheValid: true,
        date: '2026-07-22T11:59:59Z',
      }),
    );

    expect(readNotesCache(identity)).toBeNull();
  });

  it('removes cached notes explicitly', () => {
    writeNotesCache(identity, { 'film:1': 'A note' });

    invalidateNotesCache();

    expect(readNotesCache(identity)).toBeNull();
  });
});
