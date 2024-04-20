<script setup lang="ts">
import {
  invalidateCache,
  saveNoteSync,
} from '../../util/storage';
import { computed, ref } from 'vue';

const props = defineProps<{ isVisible: boolean, notes: { [key: string]: string } }>();
const parsedFilmId = document.querySelector('#userpanel .film-watch-link-target')?.getAttribute('data-film-id');
if (!parsedFilmId) {
  console.error('Could not find film ID in userpanel');
}
const filmId = parsedFilmId ?? '';
const textareaContent = ref(props.notes[filmId] ?? '');

const performingSave = ref(false);

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
  const success = await saveNoteSync(textareaContent.value, filmSharingId, !props.notes[filmId])
  if (success) {
    console.log('Saved note:', textareaContent.value);
    invalidateCache();
  } else {
    console.error('Failed to save note');
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
  }">
    <textarea :style="{
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
    }">
      <button class="button button-action" @click="save">Save</button>
    </div>
  </div>
</template>

<style scoped>

</style>