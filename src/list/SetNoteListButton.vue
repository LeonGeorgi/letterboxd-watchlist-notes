<script setup lang="ts">
import {
  clearConfiguredNoteListId,
  getConfiguredNoteListId,
  setConfiguredNoteListId,
} from '../util/notes-store';
import { ref } from 'vue';

const props = defineProps<{ listId: string }>();
const noteListId = ref(getConfiguredNoteListId());

function setNoteList() {
  setConfiguredNoteListId(props.listId);
  noteListId.value = props.listId;
}

function unsetNoteList() {
  clearConfiguredNoteListId();
  noteListId.value = null;
}
</script>

<template>
  <a v-if="listId !== noteListId" href="#" class="js-form-action" @click.prevent="setNoteList">
    Use for watchlist notes
  </a>
  <a v-else href="#" class="js-form-action" @click.prevent="unsetNoteList">
    Don't use for watchlist notes
  </a>
</template>

<style scoped>
.js-form-action {
  cursor: pointer;
}
</style>
