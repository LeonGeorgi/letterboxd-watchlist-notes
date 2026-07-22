<script setup lang="ts">
import { invalidateCache } from '../util/storage';
import { ref } from 'vue';

const props = defineProps<{ listId: string }>();
const noteListId = ref(localStorage.getItem('noteList'));

function setNoteList() {
  localStorage.setItem('noteList', props.listId);
  noteListId.value = props.listId;
  invalidateCache();
  console.log('Set note list ID:', props.listId);
}

function unsetNoteList() {
  localStorage.removeItem('noteList');
  noteListId.value = null;
  invalidateCache();
  console.log('Unset note list ID');
}
</script>

<template>
  <a v-if="listId !== noteListId" href="#" class="js-form-action" @click.prevent="setNoteList" :style="{
    cursor: 'pointer',
  }">
    Use for watchlist notes
  </a>
  <a v-else href="#" class="js-form-action" @click.prevent="unsetNoteList" :style="{
    cursor: 'pointer',
  }">
    Don't use for watchlist notes
  </a>
</template>

<style scoped>

</style>
