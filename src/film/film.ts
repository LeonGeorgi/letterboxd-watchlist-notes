import { createApp } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import FilmWrapper from './components/FilmWrapper.vue';
import {
  findActionsPanel,
  findWatchlistControl,
  getProductionIdentifiers,
  getWatchlistState,
} from './watchlist-dom';
import type { ProductionIdentifiers } from './watchlist-dom';

type FilmWrapperInstance = ComponentPublicInstance & {
  show: () => void;
  hide: () => void;
};

function mountVueComponent(
  element: HTMLElement,
  notes: { [key: string]: string },
  identifiers: ProductionIdentifiers,
): FilmWrapperInstance {
  const app = createApp(FilmWrapper, { notes, ...identifiers });
  return app.mount(element) as FilmWrapperInstance;
}

function insertVueComponentIntoPage(
  notes: { [key: string]: string },
  identifiers: ProductionIdentifiers,
): FilmWrapperInstance {
  const actionsRow = findActionsPanel();
  if (!actionsRow) {
    throw new Error('Letterboxd actions panel not found.');
  }

  const element = document.createElement('li');
  element.dataset.watchlistNotesExtension = 'editor';
  const sharingAction = actionsRow.querySelector('.js-actions-panel-sharing, .panel-sharing');
  actionsRow.insertBefore(element, sharingAction);
  const vueInstance = mountVueComponent(element, notes, identifiers);
  console.log('Vue component mounted.');
  return vueInstance;
}

function setupButtonListeners(notes: { [key: string]: string }) {
  let vueInstance: FilmWrapperInstance | null = null;
  let observer: MutationObserver | null = null;
  let attempts = 0;
  const maxAttempts = 20;

  const synchronize = () => {
    const actionsPanel = findActionsPanel();
    const watchlistControl = actionsPanel
      ? findWatchlistControl(actionsPanel)
      : null;
    const identifiers = getProductionIdentifiers(document, watchlistControl);

    if (!actionsPanel || !watchlistControl || !identifiers) {
      return false;
    }

    if (!vueInstance) {
      vueInstance = insertVueComponentIntoPage(notes, identifiers);
    }

    const isInWatchlist = getWatchlistState(watchlistControl);
    if (isInWatchlist === true) {
      vueInstance.show();
    } else if (isInWatchlist === false) {
      vueInstance.hide();
    } else {
      console.warn('Could not determine the current Letterboxd watchlist state.');
      vueInstance.hide();
    }

    if (!observer) {
      const userPanel = actionsPanel.closest('#userpanel') ?? actionsPanel;
      observer = new MutationObserver(synchronize);
      observer.observe(userPanel, {
        attributes: true,
        attributeFilter: [
          'aria-label',
          'aria-pressed',
          'class',
          'data-in-watchlist',
          'data-is-in-watchlist',
          'title',
        ],
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    return true;
  };

  if (synchronize()) {
    return;
  }

  const interval = window.setInterval(() => {
    attempts += 1;
    if (synchronize()) {
      window.clearInterval(interval);
    } else if (attempts >= maxAttempts) {
      window.clearInterval(interval);
      console.error('Letterboxd watchlist control or production identifiers not found.');
    }
  }, 500);
}

export function initializeFilmPage(notes: { [key: string]: string }) {
  console.log('Document state:', document.readyState);
  if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', () => setupButtonListeners(notes));
  } else {
    setupButtonListeners(notes);
  }
}
