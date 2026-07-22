import { createApp } from 'vue';
import type { App } from 'vue';
import SetNoteListButton from './SetNoteListButton.vue';
import {
  findListActions,
  findListActionsPanel,
  getListSlug,
} from './list-dom';

const EXTENSION_ROOT_ATTRIBUTE = 'data-watchlist-notes-extension';

export function initializeList() {
  console.log('List page initialized.');
  const listId = getListSlug();
  if (!listId) {
    console.error('Could not determine the Letterboxd list slug.');
    return;
  }

  let app: App<Element> | null = null;
  let observer: MutationObserver | null = null;
  let attempts = 0;
  const maxAttempts = 20;

  const mountButton = (panel: HTMLElement) => {
    const actions = findListActions(panel);
    if (!actions) {
      return false;
    }

    const existingRoot = actions.querySelector(
      `[${EXTENSION_ROOT_ATTRIBUTE}="list-selector"]`,
    );
    if (existingRoot) {
      return true;
    }

    app?.unmount();
    const element = document.createElement('li');
    element.setAttribute(EXTENSION_ROOT_ATTRIBUTE, 'list-selector');
    actions.appendChild(element);
    app = createApp(SetNoteListButton, { listId });
    app.mount(element);
    console.log('Watchlist notes list selector mounted.');
    return true;
  };

  const initializePanel = () => {
    const panel = findListActionsPanel();
    if (!panel) {
      return false;
    }

    if (!observer) {
      observer = new MutationObserver(() => mountButton(panel));
      observer.observe(panel, { childList: true, subtree: true });
    }

    return mountButton(panel);
  };

  if (initializePanel()) {
    return;
  }

  const interval = window.setInterval(() => {
    attempts += 1;
    if (initializePanel()) {
      window.clearInterval(interval);
    } else if (attempts >= maxAttempts) {
      window.clearInterval(interval);
      console.error('Letterboxd list actions did not become available.');
    }
  }, 500);
}
