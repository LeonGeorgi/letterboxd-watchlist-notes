import { createApp } from 'vue';
import type { App } from 'vue';
import SetNoteListButton from './SetNoteListButton.vue';
import { findListActions, findListActionsPanel, getListSlug } from './list-dom';

const EXTENSION_ROOT_ATTRIBUTE = 'data-watchlist-notes-extension';

export function initializeList() {
  let app: App<Element> | null = null;
  let mountedElement: HTMLElement | null = null;
  let mountedListId: string | null = null;
  let synchronizationQueued = false;

  const unmount = () => {
    app?.unmount();
    mountedElement?.remove();
    app = null;
    mountedElement = null;
    mountedListId = null;
  };

  const synchronize = () => {
    const listId = getListSlug();
    const panel = findListActionsPanel();
    const actions = panel ? findListActions(panel) : null;

    if (!listId || !actions) {
      unmount();
      return;
    }

    if (
      mountedElement?.isConnected &&
      actions.contains(mountedElement) &&
      mountedListId === listId
    ) {
      return;
    }

    unmount();
    document
      .querySelectorAll(`[${EXTENSION_ROOT_ATTRIBUTE}="list-selector"]`)
      .forEach((element) => element.remove());

    const element = document.createElement('li');
    element.setAttribute(EXTENSION_ROOT_ATTRIBUTE, 'list-selector');
    const sharingAction = actions.querySelector(':scope > .panel-sharing');
    actions.insertBefore(element, sharingAction);
    app = createApp(SetNoteListButton, { listId });
    app.mount(element);
    mountedElement = element;
    mountedListId = listId;
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
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-component-class', 'data-list-identifier'],
    childList: true,
    subtree: true,
  });
  window.addEventListener('pageshow', queueSynchronization);
  window.addEventListener('popstate', queueSynchronization);
  document.addEventListener('visibilitychange', queueSynchronization);
  synchronize();

  return () => {
    observer.disconnect();
    window.removeEventListener('pageshow', queueSynchronization);
    window.removeEventListener('popstate', queueSynchronization);
    document.removeEventListener('visibilitychange', queueSynchronization);
    unmount();
  };
}
