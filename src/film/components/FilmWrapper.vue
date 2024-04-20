<script lang="ts">
import { defineComponent, ref } from 'vue';
import FilmNoteEditor from './FilmNoteEditor.vue';

export default defineComponent({
  name: 'AddedElement',
  components: { FilmNoteEditor },
  props: {
    notes: {
      type: Object,
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
  }
});
</script>

<template>
  <FilmNoteEditor :isVisible="isVisible" :notes="notes"/>
</template>

<style>
</style>
