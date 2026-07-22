<script lang="ts">
import { defineComponent, ref } from 'vue';
import FilmNoteEditor from './FilmNoteEditor.vue';

export default defineComponent({
  name: 'FilmWrapper',
  components: { FilmNoteEditor },
  props: {
    notes: {
      type: Object,
      required: true,
    },
    filmId: {
      type: String,
      required: true,
    },
    filmSharingId: {
      type: String,
      required: true,
    },
  },
  setup() {
    const isVisible = ref(false);

    function show() {
      isVisible.value = true;
    }

    function hide() {
      isVisible.value = false;
    }

    return {
      isVisible,
      show,
      hide,
    };
  },
});
</script>

<template>
  <FilmNoteEditor
    :is-visible="isVisible"
    :notes="notes"
    :film-id="filmId"
    :film-sharing-id="filmSharingId"
  />
</template>
