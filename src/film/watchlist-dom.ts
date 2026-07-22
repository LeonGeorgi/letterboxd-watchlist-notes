export interface ProductionIdentifiers {
  filmId: string;
  filmSharingId: string;
}

const WATCHLIST_STATE_ATTRIBUTES = [
  'data-in-watchlist',
  'data-is-in-watchlist',
  'aria-pressed',
] as const;

function parseBooleanState(value: string | null): boolean | null {
  if (value === null) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 'remove'].includes(normalizedValue)) {
    return true;
  }
  if (['false', '0', 'no', 'off', 'add'].includes(normalizedValue)) {
    return false;
  }

  return null;
}

export function findActionsPanel(root: ParentNode = document): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('#userpanel .js-actions-panel') ??
    root.querySelector<HTMLElement>('#userpanel ul')
  );
}

export function findWatchlistControl(panel: ParentNode): HTMLElement | null {
  const selectors = [
    '[data-film-id][class~="-watchlist"]',
    '.action.remove-from-watchlist',
    '.action.add-to-watchlist',
    '[aria-pressed][aria-label*="watchlist" i]',
    '[aria-label*="watchlist" i]',
    '[title*="watchlist" i]',
  ];

  for (const selector of selectors) {
    const control = panel.querySelector<HTMLElement>(selector);
    if (control) {
      return control;
    }
  }

  return (
    Array.from(panel.querySelectorAll<HTMLElement>('a, button')).find((control) => {
      const accessibleText = [
        control.getAttribute('aria-label'),
        control.getAttribute('title'),
        control.textContent,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return accessibleText.includes('watchlist');
    }) ?? null
  );
}

export function getWatchlistState(control: HTMLElement): boolean | null {
  if (control.classList.contains('remove-from-watchlist')) {
    return true;
  }
  if (control.classList.contains('add-to-watchlist')) {
    return false;
  }

  for (const attribute of WATCHLIST_STATE_ATTRIBUTES) {
    const state = parseBooleanState(control.getAttribute(attribute));
    if (state !== null) {
      return state;
    }
  }

  const accessibleText = [
    control.getAttribute('aria-label'),
    control.getAttribute('title'),
    control.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();

  if (accessibleText.includes('remove') && accessibleText.includes('watchlist')) {
    return true;
  }
  if (accessibleText.includes('in your watchlist')) {
    return true;
  }
  if (accessibleText.includes('add') && accessibleText.includes('watchlist')) {
    return false;
  }

  return null;
}

function parseProductionMeta(root: ParentNode): Partial<ProductionIdentifiers> {
  const content = root.querySelector<HTMLMetaElement>(
    'meta[name="production:identifier"]',
  )?.content;
  if (!content) {
    return {};
  }

  try {
    const identifier = JSON.parse(content) as { lid?: unknown; uid?: unknown };
    const filmId =
      typeof identifier.uid === 'string' ? identifier.uid.match(/^film:(\d+)$/)?.[1] : undefined;
    const filmSharingId = typeof identifier.lid === 'string' ? identifier.lid : undefined;

    return { filmId, filmSharingId };
  } catch (error) {
    console.warn('Could not parse Letterboxd production identifier.', error);
    return {};
  }
}

export function getProductionIdentifiers(
  root: ParentNode = document,
  watchlistControl?: HTMLElement | null,
): ProductionIdentifiers | null {
  const fromMeta = parseProductionMeta(root);
  const controlFilmId = watchlistControl?.getAttribute('data-film-id');
  const sharingInput = root.querySelector<HTMLInputElement>(
    '#userpanel input[readonly][value*="boxd.it/"]',
  );
  const sharingUrl = sharingInput?.value || sharingInput?.getAttribute('value') || '';
  const controlIdentifier = /^\d+$/.test(controlFilmId ?? '') ? controlFilmId : undefined;
  const sharingInputIdentifier = sharingInput?.id.match(/^url-field-film-(\d+)$/)?.[1];

  const filmId = [fromMeta.filmId, controlIdentifier, sharingInputIdentifier].find(
    (identifier): identifier is string => Boolean(identifier),
  );
  const filmSharingId =
    fromMeta.filmSharingId ?? sharingUrl.match(/^https:\/\/boxd\.it\/([^/?#]+)/)?.[1];

  if (!filmId || !filmSharingId) {
    return null;
  }

  return { filmId, filmSharingId };
}
