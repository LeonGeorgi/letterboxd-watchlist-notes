// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeList } from './list';

const ROOT_SELECTOR = '[data-watchlist-notes-extension="list-selector"]';

function renderSidebar() {
  document.body.innerHTML = `
    <aside>
      <section
        class="actions-panel"
        data-component-class="ListSidebar"
        data-list-identifier='{"lid":"TAiIo"}'
      >
        <ul>
          <li class="panel-edit">Edit this list</li>
          <li class="panel-sharing">Share</li>
        </ul>
      </section>
    </aside>
  `;
}

async function waitForSynchronization() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Letterboxd list selector', () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage);
    window.history.replaceState({}, '', '/leongeorgi/list/watchlist-notes/');
    document.body.innerHTML = '';
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    vi.unstubAllGlobals();
  });

  it('mounts before the native sharing action after the sidebar hydrates', async () => {
    dispose = initializeList();
    renderSidebar();
    await waitForSynchronization();

    const root = document.querySelector(ROOT_SELECTOR);

    expect(root?.textContent).toContain('Use for watchlist notes');
    expect(root?.nextElementSibling?.classList.contains('panel-sharing')).toBe(true);
  });

  it('restores the selector after Letterboxd replaces the sidebar', async () => {
    renderSidebar();
    dispose = initializeList();
    const firstRoot = document.querySelector(ROOT_SELECTOR);

    renderSidebar();
    await waitForSynchronization();

    const restoredRoot = document.querySelector(ROOT_SELECTOR);
    expect(restoredRoot).not.toBe(firstRoot);
    expect(restoredRoot?.textContent).toContain('Use for watchlist notes');
    expect(document.querySelectorAll(ROOT_SELECTOR)).toHaveLength(1);
  });

  it('uses the current list slug after an in-page navigation', async () => {
    renderSidebar();
    dispose = initializeList();

    window.history.pushState({}, '', '/leongeorgi/list/another-list/');
    renderSidebar();
    await waitForSynchronization();
    document.querySelector<HTMLAnchorElement>(`${ROOT_SELECTOR} a`)?.click();

    expect(localStorage.getItem('noteList')).toBe('another-list');
  });
});
