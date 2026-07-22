export function getUsernameFromCookies() {
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

type PosteredIdentifier = {
  lid?: unknown;
  uid?: unknown;
};

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

function getEntryIdentifiers(entry: Element) {
  const keys = new Set<string>();
  const poster = entry.matches('[data-postered-identifier]')
    ? entry
    : entry.querySelector('[data-postered-identifier]');
  const serializedIdentifier = poster?.getAttribute('data-postered-identifier');

  if (serializedIdentifier) {
    try {
      const identifier = JSON.parse(serializedIdentifier) as PosteredIdentifier;
      addIdentifier(keys, typeof identifier.uid === 'string' ? identifier.uid : undefined);
      addIdentifier(keys, typeof identifier.lid === 'string' ? identifier.lid : undefined);
    } catch (error) {
      console.warn('Ignoring an invalid Letterboxd production identifier.', error);
    }
  }

  const legacyFilmId = entry.querySelector<HTMLInputElement>('input[name="filmId"]')?.value;
  const listableLid = entry.querySelector<HTMLInputElement>('input[name="listableLid"]')?.value;
  const dataFilmElement = entry.matches('[data-film-id]')
    ? entry
    : entry.querySelector('[data-film-id]');
  const slugElement = entry.matches('[data-item-slug], [data-film-slug]')
    ? entry
    : entry.querySelector('[data-item-slug], [data-film-slug]');

  addIdentifier(keys, legacyFilmId);
  addIdentifier(keys, listableLid);
  addIdentifier(keys, dataFilmElement?.getAttribute('data-film-id'));
  addIdentifier(keys, slugElement?.getAttribute('data-item-slug'));
  addIdentifier(keys, slugElement?.getAttribute('data-film-slug'));

  return keys;
}

function getEntryNote(entry: Element) {
  const noteElement = entry.querySelector<HTMLElement | HTMLInputElement | HTMLTextAreaElement>(
    '.notes, .list-entry-notes, textarea[name="notes"], input[name="notes"], [data-list-entry-notes]',
  );
  if (!noteElement) {
    return '';
  }

  if (noteElement instanceof HTMLInputElement || noteElement instanceof HTMLTextAreaElement) {
    return noteElement.value.trim();
  }

  return (noteElement.getAttribute('data-list-entry-notes') ?? noteElement.textContent ?? '').trim();
}

/**
 * Reads both Letterboxd's current detail-list markup and its former list editor markup.
 * Every film is included, even if its note is currently empty, so saving does not add a duplicate.
 */
export function parseNotesDocument(doc: Document): Notes {
  const notes: Notes = {};
  const entries = doc.querySelectorAll(
    '.list-detailed-entry, #list-items-editor #list-items li, li.film-list-entry',
  );

  entries.forEach((entry) => {
    const note = getEntryNote(entry);
    getEntryIdentifiers(entry).forEach((identifier) => {
      notes[identifier] = note;
    });
  });

  return notes;
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

export function notesContainFilm(notes: Notes, filmId: string, filmSharingId: string) {
  return getFilmKeys(filmId, filmSharingId).some((key) => Object.hasOwn(notes, key));
}

type ListEntryChange = {
  action: 'ADD' | 'UPDATE';
  listable?: string;
  position?: number;
  notes: string;
  containsSpoilers: boolean;
};

type ListUpdate = {
  version?: number;
  published: boolean;
  name: string;
  sharePolicy: string;
  ranked: boolean;
  description: string;
  tags: string[];
  entries: ListEntryChange[];
};

export type ListUpdateRequest = {
  csrf: string;
  listLid: string;
  update: ListUpdate;
};

function inputValue(doc: ParentNode, selector: string) {
  return doc.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)
    ?.value ?? '';
}

function getCsrfToken(doc: Document, form: ParentNode) {
  const inputToken = inputValue(form, 'input[name="__csrf"]');
  if (inputToken && inputToken !== 'placeholder') {
    return inputToken;
  }

  for (const script of doc.scripts) {
    const scriptToken = script.textContent?.match(
      /(?:window\.)?supermodelCSRF\s*=\s*(['"])([^'"]+)\1/,
    )?.[2];
    if (scriptToken) {
      return scriptToken;
    }
  }

  return '';
}

/** Builds the same list PATCH that Letterboxd's current editor sends. */
export function buildListUpdateRequest(
  doc: Document,
  note: string,
  filmId: string,
  filmSharingId: string,
): ListUpdateRequest | null {
  const form = doc.querySelector('#list-form');
  if (!form) {
    return null;
  }

  const csrf = getCsrfToken(doc, form);
  const listLid = inputValue(form, 'input[name="filmListLid"]').trim();
  const name = inputValue(form, 'input[name="name"]');
  const sharing = inputValue(form, 'select[name="sharing"]').trim();
  const versionValue = inputValue(form, 'input[name="version"]');
  if (!csrf || !listLid || !name || !sharing) {
    return null;
  }

  const entries = Array.from(form.querySelectorAll('#list-items li.film-list-entry'));
  const filmKeys = new Set(getFilmKeys(filmId, filmSharingId));
  const position = entries.findIndex((entry) => (
    [...getEntryIdentifiers(entry)].some((identifier) => filmKeys.has(identifier))
  ));
  const change: ListEntryChange = position >= 0
    ? {
        action: 'UPDATE',
        position,
        notes: note,
        containsSpoilers: false,
      }
    : {
        action: 'ADD',
        listable: filmSharingId,
        notes: note,
        containsSpoilers: false,
      };
  const version = Number(versionValue);

  return {
    csrf,
    listLid,
    update: {
      ...(Number.isFinite(version) ? { version } : {}),
      published: sharing === 'Public',
      name,
      sharePolicy: sharing === 'Public' ? 'You' : sharing,
      ranked: form.querySelector<HTMLInputElement>('input[name="numberedList"]')?.checked ?? false,
      description: inputValue(form, 'textarea[name="notes"]'),
      tags: Array.from(form.querySelectorAll<HTMLInputElement>('input[name="tag"]'))
        .map((tag) => tag.value),
      entries: [change],
    },
  };
}

type ListUpdateResponse = {
  messages?: Array<{ type?: string; title?: string }>;
};

export async function saveNoteSync(
  note: string,
  filmId: string,
  filmSharingId: string,
  listId: string,
): Promise<boolean> {
  const username = getUsernameFromCookies();
  if (!username) {
    console.error('Could not determine the signed-in Letterboxd username.');
    return false;
  }

  try {
    const editUrl = new URL(
      `/${encodeURIComponent(username)}/list/${encodeURIComponent(listId)}/edit/`,
      'https://letterboxd.com',
    );
    const editResponse = await fetch(editUrl, { credentials: 'include' });
    if (!editResponse.ok) {
      console.error('Could not load the configured note list:', editResponse.status);
      return false;
    }

    const doc = new DOMParser().parseFromString(await editResponse.text(), 'text/html');
    const request = buildListUpdateRequest(doc, note, filmId, filmSharingId);
    if (!request) {
      console.error('Could not read the current Letterboxd list editor fields.');
      return false;
    }

    const updateResponse = await fetch(
      `https://letterboxd.com/api/v0/list/${encodeURIComponent(request.listLid)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-CSRF-TOKEN': request.csrf,
        },
        body: JSON.stringify(request.update),
      },
    );
    const responseBody = await updateResponse.json().catch(() => null) as ListUpdateResponse | null;
    const errorMessage = responseBody?.messages?.find((message) => message.type === 'Error');
    if (!updateResponse.ok || errorMessage) {
      console.error(
        'Could not save note:',
        updateResponse.status,
        errorMessage?.title ?? responseBody,
      );
      return false;
    }

    console.log('Note saved successfully.');
    return true;
  } catch (error) {
    console.error('Could not save note:', error);
    return false;
  }
}

export async function getAllNotesSync(noteListId: string): Promise<Notes> {
  const username = getUsernameFromCookies();
  if (!username) {
    throw new Error('Could not determine the signed-in Letterboxd username.');
  }

  const listUrl = new URL(
    `/${encodeURIComponent(username)}/list/${encodeURIComponent(noteListId)}/detail/`,
    'https://letterboxd.com',
  );
  const visitedUrls = new Set<string>();
  const notes: Notes = {};
  let nextUrl: URL | null = listUrl;

  while (nextUrl && visitedUrls.size < 250) {
    const currentUrl: URL = nextUrl;
    visitedUrls.add(currentUrl.href);

    const response = await fetch(currentUrl, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Could not load notes list (HTTP ${response.status}).`);
    }

    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    Object.assign(notes, parseNotesDocument(doc));

    const nextHref = doc.querySelector<HTMLAnchorElement>('a.next[href]')?.getAttribute('href');
    const candidateUrl: URL | null = nextHref ? new URL(nextHref, currentUrl) : null;
    nextUrl = candidateUrl
      && candidateUrl.origin === listUrl.origin
      && candidateUrl.pathname.startsWith(listUrl.pathname)
      && !visitedUrls.has(candidateUrl.href)
      ? candidateUrl
      : null;
  }

  console.log('Loaded watchlist notes:', notes);
  return notes;
}

export function invalidateCache() {
  const notesFromLocalStorage = localStorage.getItem('notes');
  if (notesFromLocalStorage) {
    try {
      const { notes, date, version } = JSON.parse(notesFromLocalStorage);
      localStorage.setItem('notes', JSON.stringify({ notes, cacheValid: false, date, version }));
      console.log('Cache invalidated.');
    } catch (error) {
      localStorage.removeItem('notes');
      console.warn('Removed an invalid notes cache.', error);
    }
  }
}
