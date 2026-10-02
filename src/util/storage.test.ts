// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import editorHtml from './fixtures/list-editor.html?raw';
import entriesStream from './fixtures/list-entries.ndjson?raw';
import { fetchAllNotes, getNoteForFilm, getSignedInUsername, saveNote } from './storage';

beforeEach(() => {
  document.cookie = 'letterboxd.signed.in.as=leongeorgi; Path=/';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockRequests(body: string, status = 200, html = editorHtml) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(html))
    .mockResolvedValueOnce(new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const savedResponse = JSON.stringify({ data: { id: 'XGJv0', version: 8 }, messages: [] });

describe('Letterboxd session and film identifiers', () => {
  it('reads the username when the cookie is the final cookie', () => {
    expect(getSignedInUsername()).toBe('leongeorgi');
  });

  it('decodes an encoded username', () => {
    document.cookie = 'letterboxd.signed.in.as=Leon%20Georgi; Path=/';
    expect(getSignedInUsername()).toBe('Leon Georgi');
  });

  it('finds notes by numeric UID or Letterboxd LID, including empty notes', () => {
    expect(getNoteForFilm({ 'film:27256': 'By UID' }, '27256', '18U8')).toBe('By UID');
    expect(getNoteForFilm({ '18U8': 'By LID' }, '27256', '18U8')).toBe('By LID');
    expect(getNoteForFilm({ '18U8': '' }, '27256', '18U8')).toBe('');
    expect(getNoteForFilm({}, '27256', '18U8')).toBeUndefined();
  });

  it('does not make requests without a signed-in user', async () => {
    document.cookie = 'letterboxd.signed.in.as=; Max-Age=0; Path=/';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(false);
    await expect(fetchAllNotes('notes')).rejects.toThrow('signed-in');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('JSON note loading', () => {
  it('loads all entries and preserves LBML, line breaks and identifier aliases', async () => {
    const fetchMock = mockRequests(entriesStream);
    const notes = await fetchAllNotes('watchlist-notes');
    const note = 'First line\nSecond line\n\n<b>Source formatting</b>';
    expect(notes).toEqual({
      '1W7A': note,
      'film:120': note,
      '120': note,
      '18U8': '',
      'film:27256': '',
      '27256': '',
      abcd: '',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0]?.[0] as URL).href).toBe(
      'https://letterboxd.com/leongeorgi/list/watchlist-notes/edit/',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ credentials: 'include' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://letterboxd.com/s/load-list-entries');
    const options = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(options).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect((options.body as URLSearchParams).toString()).toBe('filmListLid=XGJv0');
  });

  it('accepts a confirmed empty list', async () => {
    mockRequests('{"success":true}\n');
    await expect(fetchAllNotes('notes')).resolves.toEqual({});
  });

  it.each([
    ['truncated stream', entriesStream.replace('{"success":true}', '')],
    ['loader error', entriesStream.replace('{"success":true}', '{"success":false,"error":[]}')],
    ['invalid JSON', entriesStream.replace('{"success":true}', 'not JSON')],
    ['missing entry identity', '{"notes":null}\n{"success":true}'],
    ['invalid film identity', '{"listable":{"lid":""}}\n{"success":true}'],
    ['invalid note text', '{"listable":{"lid":"abcd"},"notes":{"lbml":42}}\n{"success":true}'],
    ['extra termination', entriesStream + '{"success":true}\n'],
    ['HTML login page', '<html><body>Sign in</body></html>'],
  ])('rejects %s instead of returning partial notes', async (_label, stream) => {
    mockRequests(stream);
    await expect(fetchAllNotes('notes')).rejects.toThrow();
  });

  it('rejects an HTTP error even if its body resembles valid entries', async () => {
    mockRequests(entriesStream, 403);
    await expect(fetchAllNotes('notes')).rejects.toThrow('HTTP 403');
  });
});

describe('minimal note saving', () => {
  it.each(['First line\nSecond line', ''])(
    'upserts a note with only the LID, text and version (%j)',
    async (note) => {
      const fetchMock = mockRequests(savedResponse);
      await expect(saveNote(note, '1W7A', 'watchlist-notes')).resolves.toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1]?.[0]).toBe('https://letterboxd.com/api/v0/list/XGJv0');
      const options = fetchMock.mock.calls[1]?.[1] as RequestInit;
      expect(options).toMatchObject({
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-CSRF-TOKEN': 'fixture-csrf-token',
        },
      });
      // Same request for new/existing films; never rewrite list metadata or spoiler flags.
      expect(JSON.parse(options.body as string)).toEqual({
        version: 7,
        entries: [{ listable: '1W7A', notes: note }],
      });
    },
  );

  it('treats an HTTP 200 version conflict as failure without retrying', async () => {
    const fetchMock = mockRequests(
      JSON.stringify({
        data: { id: 'XGJv0' },
        messages: [{ type: 'Error', code: 'ListVersionMismatch', title: 'Refresh the list.' }],
      }),
    );
    await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    '',
    '<html>Sign in</html>',
    'null',
    '{}',
    '{"data":{"id":"otherList"},"messages":[]}',
    '{"data":{"id":"XGJv0"}}',
    '{"data":{"id":"XGJv0"},"messages":[null]}',
  ])('does not report success for an unconfirmed response (%j)', async (body) => {
    mockRequests(body);
    await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(false);
  });

  it('rejects an HTTP error', async () => {
    mockRequests(savedResponse, 403);
    await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(false);
  });

  it('keeps network failures as unsuccessful saves', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(false);
  });
});

describe('editor boundary validation', () => {
  it.each(['', '-1', '1.5', 'NaN', '9007199254740992'])(
    'refuses to write with invalid version %j',
    async (version) => {
      const fetchMock = mockRequests(
        savedResponse,
        200,
        editorHtml.replace('data-list-version="7"', `data-list-version="${version}"`),
      );
      await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    editorHtml.replace('data-list-version="7"', ''),
    editorHtml.replace('data-list-lid="XGJv0"', ''),
    editorHtml.replace('fixture-csrf-token', 'placeholder'),
    editorHtml.replace('supermodelCSRF', 'missingCsrf'),
    '<html><body>Sign in</body></html>',
  ])('refuses unknown or incomplete editor markup', async (html) => {
    const fetchMock = mockRequests(savedResponse, 200, html);
    await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('accepts a zero version and the window CSRF assignment', async () => {
    const fetchMock = mockRequests(
      savedResponse,
      200,
      editorHtml
        .replace('data-list-version="7"', 'data-list-version="0"')
        .replace('var supermodelCSRF', 'window.supermodelCSRF'),
    );
    await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1].body).version).toBe(0);
  });

  it('does not write after an editor HTTP error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(editorHtml, { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveNote('Draft', '1W7A', 'notes')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not write without a film LID', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveNote('Draft', '', 'notes')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
