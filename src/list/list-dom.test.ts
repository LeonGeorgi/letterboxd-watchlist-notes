// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  findListActions,
  findListActionsPanel,
  getListSlug,
} from './list-dom';

describe('Letterboxd list page DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does not treat the server-rendered empty React root as ready', () => {
    document.body.innerHTML = `
      <aside class="sidebar">
        <section
          id="userpanel"
          class="actions-panel react-component"
          data-component-class="ListSidebar"
          data-list-identifier='{"lid":"TAiIo","uid":"filmlist:82135023"}'
        ></section>
      </aside>
    `;

    const panel = findListActionsPanel();

    expect(panel).not.toBeNull();
    expect(findListActions(panel!)).toBeNull();
  });

  it('finds the action list after Letterboxd hydrates the panel', () => {
    document.body.innerHTML = `
      <aside class="sidebar">
        <section
          id="userpanel"
          class="actions-panel react-component"
          data-component-class="ListSidebar"
        >
          <ul><li>Edit or delete this list…</li></ul>
        </section>
      </aside>
    `;

    const panel = findListActionsPanel();

    expect(panel).not.toBeNull();
    expect(findListActions(panel!)?.tagName).toBe('UL');
  });

  it('extracts and decodes the list slug from the pathname', () => {
    expect(getListSlug('/leongeorgi/list/watchlist%20notes/')).toBe(
      'watchlist notes',
    );
  });

  it('rejects paths that are not Letterboxd list detail pages', () => {
    expect(getListSlug('/leongeorgi/lists/')).toBeNull();
    expect(getListSlug('/film/the-truman-show/')).toBeNull();
  });
});
