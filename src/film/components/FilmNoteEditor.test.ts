// @vitest-environment happy-dom

import { createApp, nextTick, type App } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveNote } from '../../util/storage';
import { invalidateNotesCache } from '../../util/notes-store';
import FilmNoteEditor from './FilmNoteEditor.vue';

vi.mock('../../util/storage', () => ({
  getSignedInUsername: () => 'leongeorgi',
  getNoteForFilm: (notes: Record<string, string>, filmId: string, filmSharingId: string) =>
    notes[filmId] ?? notes[filmSharingId],
  saveNote: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../util/notes-store', () => ({
  getConfiguredNoteListId: () => 'watchlist-notes',
  invalidateNotesCache: vi.fn(),
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
      notes: { '27256': 'Recommended by Sophie in Kyoto' },
      filmId: '27256',
      filmSharingId: '1UDa',
    });
    app.mount('#root');
  }

  it('starts compact, opens on click, and restores the saved note on cancel', async () => {
    mountEditor();

    expect(document.querySelector('.note-editor__preview')?.textContent).toContain(
      'Recommended by Sophie in Kyoto',
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
      'Recommended by Sophie in Kyoto',
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
    expect(saveNote).toHaveBeenCalledWith('Updated recommendation', '1UDa', 'watchlist-notes');
  });

  it('keeps the draft and cache when a save fails, then allows a manual retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(saveNote).mockResolvedValueOnce(false);
    mountEditor();
    document.querySelector<HTMLButtonElement>('.note-editor__summary-button')?.click();
    await nextTick();

    const textarea = document.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = 'Keep this draft';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector<HTMLButtonElement>('.note-editor__save')?.click();

    await vi.waitFor(() => {
      expect(document.querySelector('.note-editor__status')?.textContent).toContain(
        'Couldn’t save',
      );
    });
    expect(textarea.value).toBe('Keep this draft');
    expect(textarea.disabled).toBe(false);
    expect(invalidateNotesCache).not.toHaveBeenCalled();
    expect(saveNote).toHaveBeenCalledTimes(1);

    document.querySelector<HTMLButtonElement>('.note-editor__save')?.click();
    await vi.waitFor(() => expect(document.querySelector('textarea')).toBeNull());
    expect(invalidateNotesCache).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.note-editor__preview')?.textContent).toContain(
      'Keep this draft',
    );
    vi.restoreAllMocks();
  });
});
