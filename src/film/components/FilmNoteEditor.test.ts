// @vitest-environment happy-dom

import { createApp, nextTick, type App } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveNoteSync } from '../../util/storage';
import FilmNoteEditor from './FilmNoteEditor.vue';

vi.mock('../../util/storage', () => ({
  getUsernameFromCookies: () => 'leongeorgi',
  getNoteForFilm: (
    notes: Record<string, string>,
    filmId: string,
    filmSharingId: string,
  ) => notes[filmId] ?? notes[filmSharingId],
  invalidateCache: vi.fn(),
  saveNoteSync: vi.fn().mockResolvedValue(true),
}));

describe('FilmNoteEditor', () => {
  let app: App<Element> | null = null;

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
    localStorage.setItem('noteList', 'watchlist-notes');
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    app?.unmount();
    app = null;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function mountEditor() {
    app = createApp(FilmNoteEditor, {
      isVisible: true,
      notes: { '27256': 'Empfohlen von Sofie (Kyoto)' },
      filmId: '27256',
      filmSharingId: '1UDa',
    });
    app.mount('#root');
  }

  it('starts compact, opens on click, and restores the saved note on cancel', async () => {
    mountEditor();

    expect(document.querySelector('.note-editor__preview')?.textContent).toContain(
      'Empfohlen von Sofie (Kyoto)',
    );
    expect(document.querySelector('.note-editor__eyebrow')?.textContent).toBe('My note');
    expect(document.querySelector('textarea')).toBeNull();

    document.querySelector<HTMLButtonElement>('.note-editor__summary-button')?.click();
    await nextTick();

    const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea).not.toBeNull();
    expect(document.activeElement).toBe(textarea);

    textarea!.value = 'Unsaved change';
    textarea!.dispatchEvent(new Event('input', { bubbles: true }));
    textarea!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(document.querySelector('textarea')).toBeNull();
    expect(document.querySelector('.note-editor__preview')?.textContent).toContain(
      'Empfohlen von Sofie (Kyoto)',
    );
  });

  it('collapses to the updated note after saving', async () => {
    mountEditor();
    document.querySelector<HTMLButtonElement>('.note-editor__summary-button')?.click();
    await nextTick();

    const textarea = document.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = 'Updated recommendation';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLButtonElement>('.note-editor__save')?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('textarea')).toBeNull();
    });

    expect(document.querySelector('.note-editor__preview')?.textContent).toContain(
      'Updated recommendation',
    );
    expect(saveNoteSync).toHaveBeenCalledWith(
      'Updated recommendation',
      '27256',
      '1UDa',
      'watchlist-notes',
    );
  });
});
