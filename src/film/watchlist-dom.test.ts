// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  findActionsPanel,
  findWatchlistControl,
  getProductionIdentifiers,
  getWatchlistState,
} from './watchlist-dom';

function renderFilmPage(controlMarkup: string) {
  document.head.innerHTML = `
    <meta
      name="production:identifier"
      content='{"lid":"18U8","uid":"film:27256","type":"film"}'
    >
  `;
  document.body.innerHTML = `
    <section id="userpanel">
      <ul class="js-actions-panel">
        <li>${controlMarkup}</li>
        <li class="js-actions-panel-sharing">
          <input id="url-field-film-27256" value="https://boxd.it/18U8" readonly>
        </li>
      </ul>
    </section>
  `;
}

describe('Letterboxd film page DOM', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('finds the current single watchlist control and its active state', () => {
    renderFilmPage(`
      <a
        data-film-id="27256"
        class="action -watchlist remove-from-watchlist"
      >This film is in your Watchlist</a>
    `);

    const panel = findActionsPanel();
    const control = panel ? findWatchlistControl(panel) : null;

    expect(panel).not.toBeNull();
    expect(control).not.toBeNull();
    expect(getWatchlistState(control!)).toBe(true);
  });

  it('recognizes the inactive state on the same control', () => {
    renderFilmPage(`
      <a
        data-film-id="27256"
        class="action -watchlist add-to-watchlist"
      >Add this film to your Watchlist</a>
    `);

    const panel = findActionsPanel();
    const control = panel ? findWatchlistControl(panel) : null;

    expect(control).not.toBeNull();
    expect(getWatchlistState(control!)).toBe(false);
  });

  it('falls back to semantic ARIA state', () => {
    renderFilmPage(`
      <button aria-label="Watchlist" aria-pressed="true">Watchlist</button>
    `);

    const panel = findActionsPanel();
    const control = panel ? findWatchlistControl(panel) : null;

    expect(control).not.toBeNull();
    expect(getWatchlistState(control!)).toBe(true);
  });

  it('reads both production identifiers from Letterboxd metadata', () => {
    renderFilmPage(`
      <a data-film-id="\${film.id}" class="action -watchlist remove-from-watchlist">
        Watchlist
      </a>
    `);

    const panel = findActionsPanel();
    const control = panel ? findWatchlistControl(panel) : null;

    expect(getProductionIdentifiers(document, control)).toEqual({
      filmId: '27256',
      filmSharingId: '18U8',
    });
  });

  it('falls back to the sharing input when metadata is unavailable', () => {
    renderFilmPage(`
      <a data-film-id="27256" class="action -watchlist remove-from-watchlist">
        Watchlist
      </a>
    `);
    document.querySelector('meta[name="production:identifier"]')?.remove();

    const panel = findActionsPanel();
    const control = panel ? findWatchlistControl(panel) : null;

    expect(getProductionIdentifiers(document, control)).toEqual({
      filmId: '27256',
      filmSharingId: '18U8',
    });
  });
});
