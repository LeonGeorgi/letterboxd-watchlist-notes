// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildListUpdateRequest,
  getAllNotesSync,
  getNoteForFilm,
  getUsernameFromCookies,
  notesContainFilm,
  parseNotesDocument,
  saveNoteSync,
} from './storage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Letterboxd session cookie', () => {
  beforeEach(() => {
    document.cookie = 'letterboxd.signed.in.as=; Max-Age=0; Path=/';
  });

  it('reads the username when the cookie is the final cookie', () => {
    document.cookie = 'letterboxd.signed.in.as=leongeorgi; Path=/';

    expect(getUsernameFromCookies()).toBe('leongeorgi');
  });

  it('decodes an encoded username', () => {
    document.cookie = 'letterboxd.signed.in.as=Leon%20Georgi; Path=/';

    expect(getUsernameFromCookies()).toBe('Leon Georgi');
  });
});

describe('watchlist note parsing', () => {
  it('reads current detail-list markup under every stable film identifier', () => {
    const doc = new DOMParser().parseFromString(`
      <article class="list-detailed-entry">
        <div
          data-item-slug="adventure-time-stakes"
          data-postered-identifier='{"lid":"wNju","uid":"film:781606","type":"film"}'
        ></div>
        <div class="notes"><p>Adventure Time</p></div>
      </article>
    `, 'text/html');

    expect(parseNotesDocument(doc)).toEqual({
      '781606': 'Adventure Time',
      'adventure-time-stakes': 'Adventure Time',
      'film:781606': 'Adventure Time',
      wNju: 'Adventure Time',
    });
  });

  it('keeps films without notes so saving updates instead of adding a duplicate', () => {
    const doc = new DOMParser().parseFromString(`
      <article class="list-detailed-entry">
        <div data-postered-identifier='{"lid":"18U8","uid":"film:27256"}'></div>
      </article>
    `, 'text/html');

    const notes = parseNotesDocument(doc);

    expect(notes['27256']).toBe('');
    expect(notesContainFilm(notes, '27256', '18U8')).toBe(true);
  });

  it('still reads the former editor markup and textarea values', () => {
    const doc = new DOMParser().parseFromString(`
      <div id="list-items-editor">
        <ul id="list-items">
          <li class="film-list-entry" data-film-id="27256">
            <input name="filmId" value="27256">
            <textarea class="list-entry-notes">A private note</textarea>
          </li>
        </ul>
      </div>
    `, 'text/html');

    expect(parseNotesDocument(doc)['27256']).toBe('A private note');
  });

  it('finds a note by numeric UID or Letterboxd LID', () => {
    expect(getNoteForFilm({ 'film:27256': 'By UID' }, '27256', '18U8')).toBe('By UID');
    expect(getNoteForFilm({ '18U8': 'By LID' }, '27256', '18U8')).toBe('By LID');
  });

  it('loads the current detail view and follows list pagination', async () => {
    document.cookie = 'letterboxd.signed.in.as=leongeorgi; Path=/';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(`
        <article class="list-detailed-entry">
          <div data-postered-identifier='{"lid":"18U8","uid":"film:27256"}'></div>
          <div class="notes">First note</div>
        </article>
        <a class="next" href="/leongeorgi/list/watchlist-notes/detail/page/2/">Next</a>
      `, { status: 200 }))
      .mockResolvedValueOnce(new Response(`
        <article class="list-detailed-entry">
          <div data-postered-identifier='{"lid":"2aH8","uid":"film:51777"}'></div>
          <div class="notes">Second note</div>
        </article>
      `, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const notes = await getAllNotesSync('watchlist-notes');

    expect(notes['27256']).toBe('First note');
    expect(notes['2aH8']).toBe('Second note');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0]?.[0] as URL).href).toBe(
      'https://letterboxd.com/leongeorgi/list/watchlist-notes/detail/',
    );
    expect((fetchMock.mock.calls[1]?.[0] as URL).href).toBe(
      'https://letterboxd.com/leongeorgi/list/watchlist-notes/detail/page/2/',
    );
  });
});

describe('watchlist note saving', () => {
  const editorHtml = `
    <script>supermodelCSRF = 'csrf-token';</script>
    <form id="list-form">
      <input type="hidden" name="__csrf" value="placeholder">
      <input type="hidden" name="filmListId" value="30077510">
      <input type="hidden" name="filmListLid" value="km1lk">
      <input type="hidden" name="version" value="40">
      <input name="name" value="Watchlist Notes">
      <select name="sharing"><option value="You" selected>You</option></select>
      <input type="checkbox" name="numberedList">
      <textarea name="notes">List description</textarea>
      <input name="tag" value="recommendations">
      <ul id="list-items">
        <li class="film-list-entry">
          <input type="hidden" name="listableLid" value="1UDa">
          <div data-postered-identifier='{"lid":"1UDa","uid":"film:27256"}'></div>
          <input type="hidden" name="review" value="Old note">
        </li>
        <li class="film-list-entry">
          <input type="hidden" name="listableLid" value="2aWi">
        </li>
      </ul>
    </form>
  `;

  it('builds the current Letterboxd PATCH for an existing film', () => {
    const doc = new DOMParser().parseFromString(editorHtml, 'text/html');

    expect(buildListUpdateRequest(doc, 'New note', '27256', '1UDa')).toEqual({
      csrf: 'csrf-token',
      listLid: 'km1lk',
      update: {
        version: 40,
        published: false,
        name: 'Watchlist Notes',
        sharePolicy: 'You',
        ranked: false,
        description: 'List description',
        tags: ['recommendations'],
        entries: [{
          action: 'UPDATE',
          position: 0,
          notes: 'New note',
          containsSpoilers: false,
        }],
      },
    });
  });

  it('uses ADD with Letterboxd\'s listable LID for a new film', () => {
    const doc = new DOMParser().parseFromString(editorHtml, 'text/html');
    const request = buildListUpdateRequest(doc, 'New film note', '99999', 'abcd');

    expect(request?.update.entries).toEqual([{
      action: 'ADD',
      listable: 'abcd',
      notes: 'New film note',
      containsSpoilers: false,
    }]);
  });

  it('sends the update to Letterboxd\'s current list API with CSRF protection', async () => {
    document.cookie = 'letterboxd.signed.in.as=leongeorgi; Path=/';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(editorHtml, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [], data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(saveNoteSync('Saved note', '27256', '1UDa', 'watchlist-notes'))
      .resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0]?.[0] as URL).href).toBe(
      'https://letterboxd.com/leongeorgi/list/watchlist-notes/edit/',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://letterboxd.com/api/v0/list/km1lk',
    );
    const updateOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(updateOptions.method).toBe('PATCH');
    expect(updateOptions.headers).toEqual({
      'Content-Type': 'application/json; charset=UTF-8',
      'X-CSRF-TOKEN': 'csrf-token',
    });
    expect(JSON.parse(updateOptions.body as string).entries).toEqual([{
      action: 'UPDATE',
      position: 0,
      notes: 'Saved note',
      containsSpoilers: false,
    }]);
  });
});
