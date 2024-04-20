import { createApp } from 'vue';
import FilmWrapper from './components/FilmWrapper.vue';

function onAddToWatchlistClicked(vueInstance: any) {
  console.log('Add to Watchlist button was clicked!');
  vueInstance.show();
}

function onRemoveFromWatchlistClicked(vueInstance: any) {
  console.log('Remove from Watchlist button was clicked!');
  vueInstance.hide();
}

function mountVueComponent(element: HTMLElement, notes: { [key: string]: string }) {
  const app = createApp(FilmWrapper, { notes: notes });
  return app.mount(element);
}

function insertVueComponentIntoPage(notes: { [key: string]: string }) {
  const actionsRow = document.querySelector('.sidebar ul');
  if (!actionsRow) {
    console.log('Error: Actions row not found!');
    throw new Error('Actions row not found!');
  }

  const element = document.createElement('div');
  actionsRow.insertBefore(element, actionsRow.children[1]);
  const vueInstance = mountVueComponent(element, notes);
  console.log('Vue component mounted.');
  return vueInstance;
}

function setupButtonListeners(notes: { [key: string]: string }) {
  let attempts = 0;
  const maxAttempts = 5;
  const retryIntervalMs = 1000;
  const interval = setInterval(() => {
    const addButton = document.querySelector('.action.add-to-watchlist');
    const removeButton = document.querySelector('.action.remove-from-watchlist');

    if (addButton && removeButton) {
      clearInterval(interval);
      const vueInstance: any = insertVueComponentIntoPage(notes);
      addButton.addEventListener('click', () => onAddToWatchlistClicked(vueInstance));
      removeButton.addEventListener('click', () => onRemoveFromWatchlistClicked(vueInstance));
      console.log('Both buttons are present and listeners have been attached.');

      const parent = addButton.parentElement;
      if (parent && parent.classList.contains('hidden')) {
        console.log('Film is on watchlist. Showing component.');
        vueInstance.show();
      } else {
        console.log('Film is not on watchlist. Hiding component.');
        vueInstance.hide();
      }
    } else {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.log('Error: One or both buttons could not be found after multiple attempts.');
      }
    }
  }, retryIntervalMs);
}

export function initializeFilmPage(notes: { [key: string]: string }) {
  console.log('Document state:', document.readyState);
  if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', () => setupButtonListeners(notes));
  } else {
    setupButtonListeners(notes);
  }
}