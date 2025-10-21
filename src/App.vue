<script setup>
import MarkdownEditor from './components/MarkdownEditor.vue'
</script>

<template>
  <div id="app" class="editor-app">
    <MarkdownEditor />
  </div>
</template>

<style>
#app {
  height: 100vh;
}
.editor-app {
  height: 100%;
}
</style>
