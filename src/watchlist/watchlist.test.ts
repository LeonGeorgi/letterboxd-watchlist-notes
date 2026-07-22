// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import { renderWatchlistNotes } from './watchlist';

describe('watchlist note rendering', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <ul class="grid -p125 -scaled128">
        <li class="griditem">
          <div
            data-item-slug="chungking-express"
            data-postered-identifier='{"lid":"1UDa","uid":"film:27256"}'
          >
            <div class="poster film-poster">
              <a href="/film/chungking-express/" class="frame"></a>
            </div>
          </div>
        </li>
        <li class="griditem">
          <div
            data-item-slug="aftersun"
            data-postered-identifier='{"lid":"Arw0","uid":"film:868558"}'
          ></div>
        </li>
      </ul>
    `;
  });

  it('adds a non-interactive personal note overlay only to matching films', () => {
    expect(renderWatchlistNotes({ 'film:27256': 'Recommended by Sophie in Kyoto' })).toBe(1);

    const notes = document.querySelectorAll('[data-watchlist-notes-extension="watchlist-note"]');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent).toContain('My note');
    expect(notes[0]?.textContent).toContain('Recommended by Sophie in Kyoto');
    expect(notes[0]?.getAttribute('role')).toBe('note');
    expect(notes[0]?.parentElement?.getAttribute('data-watchlist-notes-has-note')).toBe('true');
    expect(document.getElementById('watchlist-notes-watchlist-style')).not.toBeNull();
  });

  it('updates idempotently and removes overlays for empty notes', () => {
    renderWatchlistNotes({ '27256': 'First note' });
    renderWatchlistNotes({ '27256': 'Updated note' });

    const selector = '[data-watchlist-notes-extension="watchlist-note"]';
    expect(document.querySelectorAll(selector)).toHaveLength(1);
    expect(document.querySelector(selector)?.textContent).toContain('Updated note');

    expect(renderWatchlistNotes({ '27256': '' })).toBe(0);
    expect(document.querySelector(selector)).toBeNull();
  });
});
