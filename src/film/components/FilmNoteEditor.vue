<script setup lang="ts">
import {
  getUsernameFromCookies,
  invalidateCache,
  saveNoteSync,
} from '../../util/storage';
import { computed, ref } from 'vue';

const props = defineProps<{ isVisible: boolean, notes: { [key: string]: string } }>();
const parsedFilmId = document.querySelector('.col-poster-large .film-watch-link-target')
?.getAttribute(
    'data-film-id');
if (!parsedFilmId) {
  console.error('Could not find film ID in userpanel');
}
const filmId = parsedFilmId ?? '';

const noteListId: string | null = localStorage.getItem('noteList');

const textareaContent = ref(props.notes[filmId] ?? '');
const performingSave = ref(false);

const username = getUsernameFromCookies()
const listsUrl = `https://letterboxd.com/${username}/lists/`

function setTextareaContent(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  textareaContent.value = target.value;
}


async function save() {
  performingSave.value = true;

  const sharingUrlInput = document.querySelector('.panel-sharing .urlgroup input')
  const sharingUrl = sharingUrlInput?.getAttribute('value');
  const parsedFilmSharingId = sharingUrl?.match(/https:\/\/boxd\.it\/([^/]+)/)?.[1];
  if (!parsedFilmSharingId) {
    console.error('Could not find film ID in URL:', sharingUrl);
  }
  const filmSharingId = parsedFilmSharingId ?? '';
  if (noteListId) {
    const success = await saveNoteSync(textareaContent.value,
        filmSharingId,
        !props.notes[filmId],
        noteListId);
    if (success) {
      console.log('Saved note:', textareaContent.value);
      invalidateCache();
    } else {
      console.error('Failed to save note');
    }
  } else {
    console.error('No note list ID configured');
  }
  performingSave.value = false;
}

</script>

<template>
  <div v-show="isVisible" :style="{
    width: '100%',
    padding: '8px',
    boxSizing: 'border-box',
    backgroundColor: '#456',
    borderBottom: '1px solid #2c3440',
    position: 'relative',
  }">
    <div>

    <textarea v-if="noteListId !== null" :style="{
      height: '100px',
      width: '100%',
      backgroundColor: '#789',
      color: '#ffffff',
      margin: '0 0 8px',
      resize: 'vertical'
    }" class="textarea" :value="textareaContent" @input="setTextareaContent"
              :disabled="performingSave"
    ></textarea>
      <div :style="{
      display: 'flex',
      justifyContent: 'flex-start',
      gap: '8px',
    }" v-if="noteListId !== null">
        <button class="button button-action" @click="save"
                :disabled="performingSave">Save
        </button>
      </div>
    </div>
    <div v-if="noteListId === null" :style="{
      backgroundColor: '#dc4c4c',
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      boxSizing: 'border-box',
      color: '#ffffff'
    }">
    <span :style="{
      display: 'block',
      textAlign: 'center',
      // line spacing should be 1.5 times the font size
      lineHeight: '1.5em',
    }">
      No note list configured.
      <a :href="listsUrl" :style="{
        color: '#ffffff',
        textDecoration: 'underline',
        cursor: 'pointer'
      }">Open a list</a> and click "Use for watchlist notes" to configure one.
    </span>
    </div>
  </div>
</template>

<style scoped>

</style>