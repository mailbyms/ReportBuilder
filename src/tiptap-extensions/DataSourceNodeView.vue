<template>
  <node-view-wrapper as="span" class="data-source-node" :class="{ 'is-selected': selected }">
    {{ node.attrs.apiId || 'apiId' }}.{{ node.attrs.variableId || 'variableId' }}
  </node-view-wrapper>
</template>

<script setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
</script>

<style scoped>
.data-source-node {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 2px 4px;
  cursor: pointer;
  display: inline-block;
}

.is-selected {
  background-color: #e0e0e0;
  border-color: #a0a0a0;
}
</style>
