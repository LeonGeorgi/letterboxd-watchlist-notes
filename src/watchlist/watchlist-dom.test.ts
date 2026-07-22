// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findWatchlistGrid,
  findWatchlistItems,
  getWatchlistItemIdentifiers,
  getWatchlistItemNote,
  isWatchlistPath,
} from './watchlist-dom';

const watchlistMarkup = `
  <ul class="grid -p125 -scaled128">
    <li class="griditem">
      <div
        data-item-slug="chungking-express"
        data-postered-identifier='{"lid":"1UDa","uid":"film:27256","type":"film"}'
      >
        <div class="poster film-poster">
          <a href="/film/chungking-express/" class="frame"></a>
        </div>
      </div>
    </li>
  </ul>
`;

describe('Letterboxd watchlist DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = watchlistMarkup;
  });

  it('recognizes watchlist pages including pagination', () => {
    expect(isWatchlistPath('/leongeorgi/watchlist/')).toBe(true);
    expect(isWatchlistPath('/leongeorgi/watchlist/page/2/')).toBe(true);
    expect(isWatchlistPath('/leongeorgi/list/watchlist/')).toBe(false);
  });

  it('finds the poster grid and its film items', () => {
    expect(findWatchlistGrid()?.classList.contains('grid')).toBe(true);
    expect(findWatchlistItems()).toHaveLength(1);
  });

  it('reads every stable identifier from current poster markup', () => {
    const item = findWatchlistItems()[0]!;

    expect(getWatchlistItemIdentifiers(item)).toEqual([
      'chungking-express',
      'film:27256',
      '27256',
      '1UDa',
    ]);
  });

  it('matches notes by numeric UID, LID, or slug', () => {
    const item = findWatchlistItems()[0]!;

    expect(getWatchlistItemNote({ '27256': 'Numeric' }, item)).toBe('Numeric');
    expect(getWatchlistItemNote({ '1UDa': 'LID' }, item)).toBe('LID');
    expect(getWatchlistItemNote({ 'chungking-express': 'Slug' }, item)).toBe('Slug');
  });

  it('keeps the slug fallback when Letterboxd emits invalid identifier JSON', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const poster = document.querySelector('[data-postered-identifier]')!;
    poster.setAttribute('data-postered-identifier', '{broken');

    expect(getWatchlistItemIdentifiers(findWatchlistItems()[0]!)).toEqual(['chungking-express']);
    expect(warning).toHaveBeenCalledOnce();
  });
});
