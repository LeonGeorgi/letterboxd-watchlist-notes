<script setup lang="ts">
import { invalidateCache } from '../util/storage';
import { ref } from 'vue';

const listId = window.location.href.match(/https:\/\/letterboxd\.com\/[^/]+\/list\/([^/]+)\//)?.[1];
const noteListId = ref(localStorage.getItem('noteList'));

function setNoteList() {
  if (listId) {
    localStorage.setItem('noteList', listId);
    noteListId.value = listId;
    invalidateCache();
    console.log('Set note list ID:', listId);
  } else {
    console.error('Could not find list ID in URL:', window.location.href);
  }
}

function unsetNoteList() {
  localStorage.removeItem('noteList');
  noteListId.value = null;
  invalidateCache();
  console.log('Unset note list ID');
}
</script>

<template>
  <a v-if="listId !== noteListId" class="js-form-action" @click="setNoteList" :style="{
    cursor: 'pointer',
  }">
    Use for watchlist notes
  </a>
  <a v-else class="js-form-action" @click="unsetNoteList" :style="{
    cursor: 'pointer',
  }">
    Don't use for watchlist notes
  </a>
</template>

<style scoped>

</style>