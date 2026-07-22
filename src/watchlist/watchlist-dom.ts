import type { Notes } from '../util/storage';

type PosteredIdentifier = {
  lid?: unknown;
  uid?: unknown;
};

export function isWatchlistPath(pathname: string) {
  return /^\/[^/]+\/watchlist(?:\/page\/\d+)?\/?$/.test(pathname);
}

function addIdentifier(keys: Set<string>, identifier: string | null | undefined) {
  const value = identifier?.trim();
  if (!value) {
    return;
  }

  keys.add(value);
  const numericFilmId = value.match(/^film:(\d+)$/)?.[1];
  if (numericFilmId) {
    keys.add(numericFilmId);
  }
}

export function findWatchlistGrid(root: ParentNode = document): HTMLUListElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLUListElement>('ul.grid')).find((grid) =>
      grid.querySelector('li.griditem [data-postered-identifier]'),
    ) ?? null
  );
}

export function findWatchlistItems(root: ParentNode = document): HTMLElement[] {
  const grid = findWatchlistGrid(root);
  return grid ? Array.from(grid.querySelectorAll<HTMLElement>('li.griditem')) : [];
}

export function getWatchlistItemIdentifiers(item: Element) {
  const keys = new Set<string>();
  const poster = item.matches('[data-postered-identifier]')
    ? item
    : item.querySelector('[data-postered-identifier]');

  addIdentifier(keys, poster?.getAttribute('data-item-slug'));
  addIdentifier(keys, poster?.getAttribute('data-film-slug'));
  addIdentifier(keys, poster?.getAttribute('data-film-id'));

  const serializedIdentifier = poster?.getAttribute('data-postered-identifier');
  if (serializedIdentifier) {
    try {
      const identifier = JSON.parse(serializedIdentifier) as PosteredIdentifier;
      addIdentifier(keys, typeof identifier.uid === 'string' ? identifier.uid : undefined);
      addIdentifier(keys, typeof identifier.lid === 'string' ? identifier.lid : undefined);
    } catch (error) {
      console.warn('Ignoring an invalid watchlist poster identifier.', error);
    }
  }

  return [...keys];
}

export function getWatchlistItemNote(notes: Notes, item: Element) {
  for (const identifier of getWatchlistItemIdentifiers(item)) {
    if (Object.hasOwn(notes, identifier)) {
      return notes[identifier];
    }
  }

  return undefined;
}
