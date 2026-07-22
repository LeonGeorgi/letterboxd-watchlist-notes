<script setup lang="ts">
import {
  getUsernameFromCookies,
  getNoteForFilm,
  invalidateCache,
  saveNoteSync,
} from '../../util/storage';
import { nextTick, ref } from 'vue';

const props = defineProps<{
  isVisible: boolean,
  notes: { [key: string]: string },
  filmId: string,
  filmSharingId: string,
}>();

const noteListId: string | null = localStorage.getItem('noteList');

const initialNote = getNoteForFilm(props.notes, props.filmId, props.filmSharingId) ?? '';
const savedContent = ref(initialNote);
const textareaContent = ref(initialNote);
const textarea = ref<HTMLTextAreaElement | null>(null);
const isEditing = ref(false);
const performingSave = ref(false);
const saveState = ref<'idle' | 'saved' | 'error'>('idle');

const username = getUsernameFromCookies();
const listsUrl = username
  ? `https://letterboxd.com/${encodeURIComponent(username)}/lists/`
  : 'https://letterboxd.com/lists/';
const noteListUrl = username && noteListId
  ? `https://letterboxd.com/${encodeURIComponent(username)}/list/${encodeURIComponent(noteListId)}/`
  : listsUrl;

function setTextareaContent(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  textareaContent.value = target.value;
  saveState.value = 'idle';
}

async function startEditing() {
  saveState.value = 'idle';
  isEditing.value = true;
  await nextTick();
  textarea.value?.focus();
  textarea.value?.setSelectionRange(
    textarea.value.value.length,
    textarea.value.value.length,
  );
}

function cancelEditing() {
  textareaContent.value = savedContent.value;
  saveState.value = 'idle';
  isEditing.value = false;
}

async function save() {
  if (performingSave.value) {
    return;
  }

  performingSave.value = true;
  saveState.value = 'idle';

  if (noteListId) {
    const success = await saveNoteSync(
      textareaContent.value,
      props.filmId,
      props.filmSharingId,
      noteListId,
    );
    if (success) {
      console.log('Saved note:', textareaContent.value);
      invalidateCache();
      savedContent.value = textareaContent.value;
      saveState.value = 'saved';
      isEditing.value = false;
    } else {
      console.error('Failed to save note');
      saveState.value = 'error';
    }
  } else {
    console.error('No note list ID configured');
    saveState.value = 'error';
  }
  performingSave.value = false;
}
</script>

<template>
  <section v-show="isVisible" class="note-editor" aria-label="My watchlist note">
    <template v-if="noteListId !== null">
      <div v-if="!isEditing" class="note-editor__summary">
        <a
          class="note-editor__list-link note-editor__list-link--summary"
          :href="noteListUrl"
          title="Open the watchlist notes list"
        >List entry</a>
        <button
          class="note-editor__summary-button"
          type="button"
          title="Edit watchlist note"
          @click="startEditing"
        >
          <span class="note-editor__eyebrow">My note</span>
          <span
            class="note-editor__preview"
            :class="{ 'note-editor__preview--empty': !savedContent }"
          >{{ savedContent || 'Add a note…' }}</span>
          <span
            class="note-editor__edit-indicator"
            :class="{ 'note-editor__edit-indicator--saved': saveState === 'saved' }"
            aria-hidden="true"
          >{{ saveState === 'saved' ? 'Saved' : 'Edit' }}</span>
        </button>
        <span class="sr-only" role="status" aria-live="polite">
          {{ saveState === 'saved' ? 'Saved' : '' }}
        </span>
      </div>

      <div v-else class="note-editor__form">
        <header class="note-editor__header">
          <span class="note-editor__eyebrow">My note</span>
          <a
            class="note-editor__list-link"
            :href="noteListUrl"
            title="Open the watchlist notes list"
          >List entry</a>
        </header>

        <textarea
          ref="textarea"
          class="textarea note-editor__textarea"
          :value="textareaContent"
          :disabled="performingSave"
          placeholder="Add a private note…"
          aria-label="Watchlist note"
          @input="setTextareaContent"
          @keydown.esc.prevent="cancelEditing"
          @keydown.meta.enter.prevent="save"
          @keydown.ctrl.enter.prevent="save"
        ></textarea>

        <footer class="note-editor__footer">
          <span
            class="note-editor__status"
            :class="{ 'note-editor__status--error': saveState === 'error' }"
            role="status"
            aria-live="polite"
          >
            <template v-if="saveState === 'error'">Couldn’t save</template>
            <template v-else>Esc · ⌘↵ to save</template>
          </span>
          <span class="note-editor__actions">
            <button
              class="note-editor__cancel"
              type="button"
              :disabled="performingSave"
              @click="cancelEditing"
            >Cancel</button>
            <button
              class="button button-action note-editor__save"
              type="button"
              :disabled="performingSave"
              @click="save"
            >
              {{ performingSave ? 'Saving…' : 'Save' }}
            </button>
          </span>
        </footer>
      </div>
    </template>

    <div v-else class="note-editor__empty">
      <strong>No note list configured</strong>
      <span>
        <a :href="listsUrl">Open your lists</a> and choose “Use for watchlist notes”.
      </span>
    </div>
  </section>
</template>

<style scoped>
:global(li[data-watchlist-notes-extension="editor"]) {
  padding: 0 !important;
}

.note-editor {
  box-sizing: border-box;
  width: 100%;
  background: #456;
  color: #bcd;
  font-family: var(
    --font-stack-graphik,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif
  );
  text-align: left;
}

.note-editor__summary {
  position: relative;
  padding: 10px 12px;
}

.note-editor__summary-button {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 72px;
  padding: 12px 50px 13px 14px !important;
  border: 0 !important;
  border-radius: 3px !important;
  background: #2c3440 !important;
  box-shadow: inset 3px 0 #ff8000 !important;
  color: inherit !important;
  cursor: pointer !important;
  font: inherit;
  text-align: left;
  transition: background-color 120ms ease;
}

.note-editor__summary-button:hover {
  background: #354250 !important;
}

.note-editor__summary-button:focus-visible {
  outline: 2px solid #40bcf4 !important;
  outline-offset: -2px;
}

.note-editor__preview {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 6px;
  color: #cde;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.note-editor__preview--empty {
  color: #89a;
  font-style: italic;
}

.note-editor__edit-indicator {
  position: absolute;
  right: 16px;
  bottom: 14px;
  color: #789;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  text-transform: uppercase;
}

.note-editor__edit-indicator--saved {
  color: #00e054;
}

.note-editor__form {
  padding: 14px 16px 16px;
  background: #3f4f5f;
  box-shadow: inset 3px 0 #ff8000;
}

.note-editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
}

.note-editor__eyebrow {
  color: #ff9d3d;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.075em;
  line-height: 1.2;
  text-transform: uppercase;
}

.note-editor__list-link {
  color: #89a;
  font-size: 11px;
  line-height: 1.2;
  text-decoration: none;
}

.note-editor__list-link:hover,
.note-editor__list-link:focus-visible {
  color: #40bcf4;
  text-decoration: underline;
}

.note-editor__list-link--summary {
  position: absolute;
  z-index: 1;
  top: 23px;
  right: 26px;
}

.note-editor__textarea.textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 112px;
  margin: 0;
  padding: 9px 10px;
  resize: vertical;
  border: 0;
  border-radius: 3px;
  outline: 0;
  background: #2c3440;
  box-shadow: inset 0 -1px #567;
  color: #cde;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  transition:
    background-color 120ms ease,
    box-shadow 120ms ease,
    color 120ms ease;
}

.note-editor__textarea.textarea::placeholder {
  color: #678;
}

.note-editor__textarea.textarea:hover:not(:focus):not(:disabled) {
  background: #354250;
}

.note-editor__textarea.textarea:focus {
  background: #fff;
  box-shadow: 0 0 5px #012;
  color: #234;
}

.note-editor__textarea.textarea:focus::placeholder {
  color: #89a;
}

.note-editor__textarea.textarea:disabled {
  cursor: wait;
  opacity: 0.55;
}

.note-editor__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.note-editor__status {
  color: #789;
  font-size: 11px;
  line-height: 1.2;
}

.note-editor__status--error {
  color: #ff8000;
}

.note-editor__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.note-editor__cancel {
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  color: #89a !important;
  cursor: pointer !important;
  font-family: inherit;
  font-size: 11px !important;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1 !important;
  text-transform: uppercase;
}

.note-editor__cancel:hover:not(:disabled),
.note-editor__cancel:focus-visible {
  color: #fff !important;
  text-decoration: underline;
}

.note-editor__cancel:disabled {
  cursor: wait !important;
  opacity: 0.5;
}

.note-editor__save.button.button-action {
  min-width: 70px;
  padding: 6px 13px 7px !important;
  border: 0 !important;
  border-radius: 3px !important;
  background: #00ac1c !important;
  box-shadow: inset 0 1px rgb(255 255 255 / 30%) !important;
  color: #f4fcf0 !important;
  cursor: pointer !important;
  font-family: inherit;
  font-size: 11px !important;
  font-weight: 700;
  letter-spacing: 0.075em;
  line-height: 1 !important;
  text-align: center;
  text-transform: uppercase;
}

.note-editor__save.button.button-action:hover:not(:disabled) {
  background: #009d1a !important;
  color: #fff !important;
}

.note-editor__save.button.button-action:focus-visible {
  outline: 2px solid #40bcf4 !important;
  outline-offset: 2px;
}

.note-editor__save.button.button-action:disabled {
  background: #404d59 !important;
  box-shadow: inset 0 1px rgb(255 255 255 / 10%) !important;
  color: #789 !important;
  cursor: wait !important;
}

.note-editor__empty {
  margin: 14px 16px 16px;
  padding: 10px 12px;
  border-left: 3px solid #ff8000;
  border-radius: 3px;
  background: #2c3440;
  color: #9ab;
  font-size: 12px;
  line-height: 1.45;
}

.note-editor__empty strong,
.note-editor__empty span {
  display: block;
}

.note-editor__empty strong {
  margin-bottom: 3px;
  color: #cde;
  font-weight: 700;
}

.note-editor__empty a {
  color: #40bcf4;
}

.note-editor__empty a:hover {
  color: #fff;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
