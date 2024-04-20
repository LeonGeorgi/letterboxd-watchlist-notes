export function getUsernameFromCookies() {
  return document.cookie.match(/letterboxd\.signed\.in\.as=([^;]+);/)?.[1];
}

export function saveNoteSync(note: string, filmId: string, isNewMovie: boolean, listId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const username = getUsernameFromCookies();
    console.log('username:', username);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://letterboxd.com/${username}/list/${listId}/edit/`, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const domParser = new DOMParser();
        const doc = domParser.parseFromString(xhr.responseText, 'text/html');
        const watchlistName = doc.querySelector(
          '#list-form #film-list-main-details input[name="name"]')?.getAttribute('value');
        console.log('watchlistName:', watchlistName);
        const csrf = doc.querySelector(`#list-form input[name="__csrf"]`)?.getAttribute('value');
        const filmListId = doc.querySelector(`input[name="filmListId"]`)?.getAttribute('value');
        const version = doc.querySelector(`input[name="version"]`)?.getAttribute('value');
        let filmIndex = -1
        if (!isNewMovie) {
          const listNumber = doc.querySelector(`li[data-film-id="${filmId}"] .list-number`)?.textContent;
          filmIndex = parseInt(listNumber ?? "0") - 1;
        } else {
          const listItems = doc.querySelectorAll('#list-items-editor #list-items li.film-list-entry');
          filmIndex = listItems.length;
        }

        const add = {
          film: filmId,
          action: "ADD"
        };

        const update = {
          version,
          name: watchlistName,
          description: "",
          tags: [],
          published: false,
          sharePolicy: "You",
          ranked: false,
          entries: [
            ...(isNewMovie ? [add] : []),
            {
              action: "UPDATE",
              position: filmIndex,
              notes: `<p>${note}</p>`,
              containsSpoilers: false,
            }
          ]
        };
        const postQuery = `__csrf=${csrf}&filmListId=${filmListId}&update=${encodeURIComponent(
          JSON.stringify(update))}`;

        xhr.open('POST', 'https://letterboxd.com/s/update-list', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("Note saved successfully!")
            resolve(true)
          }
        };
        xhr.onerror = function () {
          console.error('error:', xhr.statusText);
          reject(false)
        };
        xhr.send(postQuery);
      }
    };
    xhr.onerror = function () {
      console.error('error:', xhr.statusText);
      reject(false)
    };
    xhr.send();
  });
}

export function getAllNotesSync(noteListId: string): Promise<{ [key: string]: string }> {
  return new Promise((resolve, reject) => {
    const username = document.cookie.match(/letterboxd\.signed\.in\.as=([^;]+);/)?.[1];
    console.log('username:', username);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://letterboxd.com/${username}/list/${noteListId}/edit/`, true);
    xhr.withCredentials = true;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const domParser = new DOMParser();
        const doc = domParser.parseFromString(xhr.responseText, 'text/html');
        const notes: { [key: string]: string } = {};
        doc.querySelectorAll('#list-items-editor #list-items li').forEach((entry) => {
          const filmId = entry.querySelector('input[name="filmId"]')?.getAttribute('value');
          const note = entry.querySelector('.list-entry-notes')?.textContent?.trim();
          if (filmId && note) {
            notes[filmId] = note;
          }
        });
        console.log('notes:', notes);
        resolve(notes);
      }
    };
    xhr.onerror = function () {
      console.error('error:', xhr.statusText);
      reject({})
    };
    xhr.send();
  });

}

export function invalidateCache() {
  const notesFromLocalStorage = localStorage.getItem('notes');
  if (notesFromLocalStorage) {
    const { notes, date } = JSON.parse(notesFromLocalStorage);
    localStorage.setItem('notes', JSON.stringify({ notes, cacheValid: false, date: date }));
    console.log('Cache invalidated.');
  }
}