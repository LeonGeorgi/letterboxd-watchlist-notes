import { createApp } from 'vue';
import type { App } from 'vue';
import SetNoteListButton from './SetNoteListButton.vue';
import { findListActions, findListActionsPanel, getListSlug } from './list-dom';

const EXTENSION_ROOT_ATTRIBUTE = 'data-watchlist-notes-extension';

export function initializeList() {
  const listId = getListSlug();
  if (!listId) {
    console.error('Could not determine the Letterboxd list slug.');
    return;
  }

  let app: App<Element> | null = null;
  let mountedElement: HTMLElement | null = null;
  let synchronizationQueued = false;

  const synchronize = () => {
    const panel = findListActionsPanel();
    const actions = panel ? findListActions(panel) : null;

    if (mountedElement && (!mountedElement.isConnected || !actions?.contains(mountedElement))) {
      app?.unmount();
      app = null;
      mountedElement = null;
    }

    if (!actions) {
      return;
    }

    const existingRoot = actions.querySelector(`[${EXTENSION_ROOT_ATTRIBUTE}="list-selector"]`);
    if (existingRoot === mountedElement) {
      return;
    }

    existingRoot?.remove();
    const element = document.createElement('li');
    element.setAttribute(EXTENSION_ROOT_ATTRIBUTE, 'list-selector');
    actions.appendChild(element);
    app = createApp(SetNoteListButton, { listId });
    app.mount(element);
    mountedElement = element;
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
  observer.observe(document.body, { childList: true, subtree: true });
  synchronize();
}
