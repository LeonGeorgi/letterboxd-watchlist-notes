import { createApp } from 'vue';
import type { App, ComponentPublicInstance } from 'vue';
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

type MountedEditor = {
  app: App<Element>;
  element: HTMLElement;
  instance: FilmWrapperInstance;
};

function mountVueComponent(
  element: HTMLElement,
  notes: { [key: string]: string },
  identifiers: ProductionIdentifiers,
): MountedEditor {
  const app = createApp(FilmWrapper, { notes, ...identifiers });
  const instance = app.mount(element) as FilmWrapperInstance;
  return { app, element, instance };
}

function insertVueComponentIntoPage(
  actionsPanel: HTMLElement,
  notes: { [key: string]: string },
  identifiers: ProductionIdentifiers,
): MountedEditor {
  const element = document.createElement('li');
  element.dataset.watchlistNotesExtension = 'editor';
  const sharingAction = actionsPanel.querySelector('.js-actions-panel-sharing, .panel-sharing');
  actionsPanel.insertBefore(element, sharingAction);
  return mountVueComponent(element, notes, identifiers);
}

function setupButtonListeners(notes: { [key: string]: string }) {
  let mountedEditor: MountedEditor | null = null;
  let synchronizationQueued = false;

  const synchronize = () => {
    const actionsPanel = findActionsPanel();

    if (
      mountedEditor &&
      (!mountedEditor.element.isConnected || !actionsPanel?.contains(mountedEditor.element))
    ) {
      mountedEditor.app.unmount();
      mountedEditor = null;
    }

    const watchlistControl = actionsPanel ? findWatchlistControl(actionsPanel) : null;
    const identifiers = getProductionIdentifiers(document, watchlistControl);

    if (!actionsPanel || !watchlistControl || !identifiers) {
      return;
    }

    if (!mountedEditor) {
      actionsPanel.querySelector('[data-watchlist-notes-extension="editor"]')?.remove();
      mountedEditor = insertVueComponentIntoPage(actionsPanel, notes, identifiers);
    }

    const isInWatchlist = getWatchlistState(watchlistControl);
    if (isInWatchlist === true) {
      mountedEditor.instance.show();
    } else if (isInWatchlist === false) {
      mountedEditor.instance.hide();
    } else {
      console.warn('Could not determine the current Letterboxd watchlist state.');
      mountedEditor.instance.hide();
    }
  };

  const queueSynchronization = () => {
    if (synchronizationQueued) {
      return;
    }

    synchronizationQueued = true;
    queueMicrotask(() => {
      synchronizationQueued = false;
      synchronize();
    });
  };

  const observer = new MutationObserver(queueSynchronization);
  observer.observe(document.body, {
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
    subtree: true,
  });
  synchronize();
}

export function initializeFilmPage(notes: { [key: string]: string }) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupButtonListeners(notes), {
      once: true,
    });
  } else {
    setupButtonListeners(notes);
  }
}
