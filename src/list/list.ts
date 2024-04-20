import { createApp } from 'vue';
import SetNoteListButton from './SetNoteListButton.vue';

export function initializeList(notes: { [key: string]: string }) {
  console.log('Watchlist page initialized.');
  // wait up to 5 seconds for the a ".film-poster" element to appear
  let attempts = 0;
  const retryIntervalMs = 500;
  const maxAttempts = 5000 / retryIntervalMs;
  const interval = setInterval(() => {
    const userpanel = document.querySelector('#userpanel');
    if (userpanel) {
      clearInterval(interval);
      console.log('User panel found.');
      const listId = window.location.href.match(/https:\/\/letterboxd\.com\/.+\/list\/(.+)\//)?.[1];
      if (!listId) {
        console.log('Error: List ID not found.');
        return;
      }
      // create a SetNoteListButton.vue component and mount it to the userpanel > ul
      const element = document.createElement('li');
      userpanel.querySelector('ul')?.appendChild(element);
      const app = createApp(SetNoteListButton);
      app.mount(element);
    } else {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.log('Error: Film posters not found after multiple attempts.');
      }
    }
  }, retryIntervalMs);
}