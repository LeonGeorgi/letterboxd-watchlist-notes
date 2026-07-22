import type { Notes } from '../util/storage';
import { findWatchlistGrid, findWatchlistItems, getWatchlistItemNote } from './watchlist-dom';

const NOTE_ATTRIBUTE = 'data-watchlist-notes-extension';
const NOTE_ATTRIBUTE_VALUE = 'watchlist-note';
const NOTE_ITEM_ATTRIBUTE = 'data-watchlist-notes-has-note';
const STYLE_ID = 'watchlist-notes-watchlist-style';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    li.griditem[${NOTE_ITEM_ATTRIBUTE}="true"] {
      position: relative !important;
    }

    li.griditem > [${NOTE_ATTRIBUTE}="${NOTE_ATTRIBUTE_VALUE}"] {
      position: absolute;
      z-index: 6;
      right: 5px;
      bottom: 5px;
      left: 5px;
      box-sizing: border-box;
      padding: 6px 7px 6px 9px;
      overflow: hidden;
      border-radius: 3px;
      background: rgb(31 39 48 / 94%);
      box-shadow:
        inset 3px 0 #ff8000,
        0 2px 8px rgb(0 0 0 / 45%);
      color: #def;
      font-family: var(
        --font-stack-graphik,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif
      );
      pointer-events: none;
      text-align: left;
      transform: translateY(0);
      transition:
        opacity 100ms ease,
        transform 100ms ease;
    }

    li.griditem:hover > [${NOTE_ATTRIBUTE}="${NOTE_ATTRIBUTE_VALUE}"],
    li.griditem:focus-within > [${NOTE_ATTRIBUTE}="${NOTE_ATTRIBUTE_VALUE}"] {
      opacity: 0;
      transform: translateY(4px);
    }

    li.griditem > [${NOTE_ATTRIBUTE}="${NOTE_ATTRIBUTE_VALUE}"] .watchlist-notes__label {
      display: block;
      margin-bottom: 3px;
      color: #ff9d3d;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.08em;
      line-height: 1;
      text-transform: uppercase;
    }

    li.griditem > [${NOTE_ATTRIBUTE}="${NOTE_ATTRIBUTE_VALUE}"] .watchlist-notes__content {
      display: -webkit-box;
      overflow: hidden;
      font-size: 10px;
      line-height: 1.25;
      overflow-wrap: anywhere;
      white-space: pre-line;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }
  `;
  document.head.appendChild(style);
}

function findRenderedNote(item: Element) {
  return Array.from(item.children).find(
    (child) => child.getAttribute(NOTE_ATTRIBUTE) === NOTE_ATTRIBUTE_VALUE,
  ) as HTMLElement | undefined;
}

function createRenderedNote(note: string) {
  const element = document.createElement('aside');
  element.setAttribute(NOTE_ATTRIBUTE, NOTE_ATTRIBUTE_VALUE);
  element.setAttribute('role', 'note');
  element.setAttribute('aria-label', `My note: ${note}`);

  const label = document.createElement('span');
  label.className = 'watchlist-notes__label';
  label.textContent = 'My note';

  const content = document.createElement('span');
  content.className = 'watchlist-notes__content';
  content.textContent = note;

  element.append(label, content);
  return element;
}

export function renderWatchlistNotes(notes: Notes, root: ParentNode = document) {
  ensureStyles();
  let renderedCount = 0;

  for (const item of findWatchlistItems(root)) {
    const note = getWatchlistItemNote(notes, item)?.trim() ?? '';
    const existingNote = findRenderedNote(item);

    if (!note) {
      existingNote?.remove();
      item.removeAttribute(NOTE_ITEM_ATTRIBUTE);
      continue;
    }

    if (existingNote) {
      const content = existingNote.querySelector('.watchlist-notes__content');
      if (content && content.textContent !== note) {
        content.textContent = note;
        existingNote.setAttribute('aria-label', `My note: ${note}`);
      } else if (!content) {
        existingNote.replaceWith(createRenderedNote(note));
      }
    } else {
      item.appendChild(createRenderedNote(note));
    }

    item.setAttribute(NOTE_ITEM_ATTRIBUTE, 'true');
    renderedCount += 1;
  }

  return renderedCount;
}

export function initializeWatchlist(notes: Notes) {
  if (!Object.values(notes).some((note) => note.trim())) {
    return;
  }

  const start = () => {
    let renderScheduled = false;
    const render = () => {
      renderScheduled = false;
      if (findWatchlistGrid()) {
        renderWatchlistNotes(notes);
      }
    };
    const scheduleRender = () => {
      if (!renderScheduled) {
        renderScheduled = true;
        queueMicrotask(render);
      }
    };

    render();
    const observer = new MutationObserver(scheduleRender);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
