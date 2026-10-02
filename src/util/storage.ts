export function getSignedInUsername() {
  const encodedUsername = document.cookie.match(
    /(?:^|;\s*)letterboxd\.signed\.in\.as=([^;]+)/,
  )?.[1];
  if (!encodedUsername) {
    return undefined;
  }

  try {
    return decodeURIComponent(encodedUsername);
  } catch {
    return encodedUsername;
  }
}

export type Notes = Record<string, string>;

function addIdentifier(keys: Set<string>, identifier: string | null | undefined) {
  const value = identifier?.trim();
  if (!value) {
    return;
  }

  keys.add(value);

  const numericFilmId = value.match(/^film:(\d+)$/)?.[1];
  if (numericFilmId) {
    keys.add(numericFilmId);
  } else if (/^\d+$/.test(value)) {
    keys.add(`film:${value}`);
  }
}

function getFilmKeys(filmId: string, filmSharingId: string) {
  const keys = new Set<string>();
  addIdentifier(keys, filmId);
  addIdentifier(keys, filmSharingId);
  return [...keys];
}

export function getNoteForFilm(notes: Notes, filmId: string, filmSharingId: string) {
  for (const key of getFilmKeys(filmId, filmSharingId)) {
    if (Object.hasOwn(notes, key)) {
      return notes[key];
    }
  }

  return undefined;
}

type ListContext = {
  csrf: string;
  listLid: string;
  version: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLid(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9]+$/.test(value);
}

// The React editor bootstraps these values in HTML; API GET routes are not accessible
// with a web session. Keep this small boundary separate from note/list presentation.
function readListContext(doc: Document): ListContext {
  const editor = doc.querySelector('[data-component-class="ListEditor"]');
  const listLid = editor?.getAttribute('data-list-lid');
  const versionText = editor?.getAttribute('data-list-version');
  const version = Number(versionText);
  const csrf = Array.from(doc.scripts)
    .map(
      (script) =>
        script.textContent?.match(/(?:window\.)?supermodelCSRF\s*=\s*(['"])([^'"]+)\1/)?.[2],
    )
    .find((token) => token && token !== 'placeholder');

  if (
    !isLid(listLid) ||
    !versionText ||
    !/^\d+$/.test(versionText) ||
    !Number.isSafeInteger(version) ||
    !csrf
  ) {
    throw new Error('Could not read the Letterboxd list ID, version or CSRF token.');
  }
  return { csrf, listLid, version };
}

async function loadListContext(listId: string): Promise<ListContext> {
  const username = getSignedInUsername();
  if (!username) {
    throw new Error('Could not determine the signed-in Letterboxd username.');
  }
  const editUrl = new URL(
    `/${encodeURIComponent(username)}/list/${encodeURIComponent(listId)}/edit/`,
    'https://letterboxd.com',
  );
  const response = await fetch(editUrl, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Could not load the notes list editor (HTTP ${response.status}).`);
  }
  return readListContext(new DOMParser().parseFromString(await response.text(), 'text/html'));
}

export async function saveNote(
  note: string,
  filmSharingId: string,
  listId: string,
): Promise<boolean> {
  try {
    if (!isLid(filmSharingId)) {
      throw new Error('Could not determine the Letterboxd film LID.');
    }
    const { csrf, listLid, version } = await loadListContext(listId);
    const response = await fetch(`https://letterboxd.com/api/v0/list/${listLid}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-CSRF-TOKEN': csrf,
      },
      // Without action/position, Letterboxd updates the film or appends it if missing.
      // Omitting list properties and spoiler flags preserves their existing values.
      body: JSON.stringify({ version, entries: [{ listable: filmSharingId, notes: note }] }),
    });
    if (!response.ok) {
      throw new Error(`Could not save note (HTTP ${response.status}).`);
    }
    const body: unknown = await response.json();
    // A stale version returns HTTP 200 with an Error message. Never retry silently.
    if (
      !isRecord(body) ||
      !isRecord(body.data) ||
      body.data.id !== listLid ||
      !Array.isArray(body.messages) ||
      !body.messages.every(
        (message: unknown) =>
          isRecord(message) && typeof message.type === 'string' && message.type !== 'Error',
      )
    ) {
      throw new Error('Letterboxd did not confirm that the note was saved.');
    }
    return true;
  } catch (error) {
    console.error('Could not save note:', error);
    return false;
  }
}

function parseNotesStream(text: string): Notes {
  const lines: unknown[] = text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as unknown);
  const terminal = lines.pop();
  if (!isRecord(terminal) || terminal.success !== true) {
    throw new Error('Letterboxd did not confirm a complete list of notes.');
  }

  const notes: Notes = {};
  for (const entry of lines) {
    if (
      !isRecord(entry) ||
      !isRecord(entry.listable) ||
      !isLid(entry.listable.lid) ||
      (entry.listable.uid !== undefined && typeof entry.listable.uid !== 'string') ||
      (entry.notes != null && (!isRecord(entry.notes) || typeof entry.notes.lbml !== 'string'))
    ) {
      throw new Error('Unexpected Letterboxd list entry format.');
    }
    const keys = new Set<string>([entry.listable.lid]);
    if (typeof entry.listable.uid === 'string') {
      addIdentifier(keys, entry.listable.uid);
    }
    const note = isRecord(entry.notes) ? (entry.notes.lbml as string) : '';
    for (const key of keys) {
      // Use own properties even for unexpected identifiers such as "__proto__".
      Object.defineProperty(notes, key, { value: note, enumerable: true, configurable: true });
    }
  }
  return notes;
}

export async function fetchAllNotes(noteListId: string): Promise<Notes> {
  const { listLid } = await loadListContext(noteListId);
  const response = await fetch('https://letterboxd.com/s/load-list-entries', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ filmListLid: listLid }),
  });
  if (!response.ok) {
    throw new Error(`Could not load notes (HTTP ${response.status}).`);
  }
  // Do not expose/cache partial results if the NDJSON stream fails or is truncated.
  return parseNotesStream(await response.text());
}
