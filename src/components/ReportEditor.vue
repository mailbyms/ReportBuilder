<template>
  <div class="split">
    <div class="left">
      <el-card class="editor-card">
        <template #header>
          <div class="toolbar">
            <div class="toolbar-left">
              <el-button-group>
                <el-button size="small" @click="toggleH1" :disabled="!isEditorReady" :type="isActive('heading', { level: 1 }) ? 'primary' : ''">H1</el-button>
                <el-button size="small" @click="toggleH2" :disabled="!isEditorReady" :type="isActive('heading', { level: 2 }) ? 'primary' : ''">H2</el-button>
                <el-button size="small" @click="toggleH3" :disabled="!isEditorReady" :type="isActive('heading', { level: 3 }) ? 'primary' : ''">H3</el-button>
              </el-button-group>
              <el-button-group>
                <el-button size="small" @click="toggleBold" :disabled="!isEditorReady" :type="isActive('bold') ? 'primary' : ''">Bold</el-button>
                <el-button size="small" @click="toggleItalic" :disabled="!isEditorReady" :type="isActive('italic') ? 'primary' : ''">Italic</el-button>
              </el-button-group>
              <el-button-group>
                <el-button size="small" @click="toggleList" :disabled="!isEditorReady" :type="isActive('bulletList') ? 'primary' : ''">List</el-button>
                <el-button size="small" @click="toggleCode" :disabled="!isEditorReady" :type="isActive('codeBlock') ? 'primary' : ''">Code</el-button>
              </el-button-group>
              <el-button-group>
                <el-button size="small" @click="addDataSource" :disabled="!isEditorReady">Data Source</el-button>
              </el-button-group>
            </div>
            <div class="toolbar-right">
              <el-button-group>
                <el-button size="small" @click="importContent" :disabled="!isEditorReady">Import</el-button>
                <el-button size="small" @click="exportContent" :disabled="!isEditorReady">Export</el-button>
              </el-button-group>
              <el-button-group>
                <el-button size="small" @click="resetSample" type="warning" :disabled="!isEditorReady">Reset</el-button>
              </el-button-group>
            </div>
            <input type="file" ref="fileInput" @change="handleFileImport" style="display: none" accept=".html" />
          </div>
        </template>

        <div class="editor-wrapper card-body">
          <EditorContent class="editor-content" :editor="editor" />
        </div>
      </el-card>
    </div>
    <div class="right">
      <el-card v-if="selectedNode" class="properties-card">
        <template #header>
          <div>Data Source Properties</div>
        </template>
        <div class="properties-body">
          <el-form label-position="top">
            <el-form-item label="API ID">
              <el-input v-model="selectedApiId" @change="updateDataSource" />
            </el-form-item>
            <el-form-item label="Variable ID">
              <el-input v-model="selectedVariableId" @change="updateVariableId" />
            </el-form-item>
            <el-form-item label="Available Variables">
              <div v-if="loading" class="loading">Loading...</div>
              <ul v-else class="variables-list">
                <li
                  v-for="variable in selectedVariables"
                  :key="variable"
                  @click="selectVariable(variable)"
                  class="variable-item"
                  :class="{ 'is-selected': variable === selectedVariableId }"
                >
                  {{ variable }}
                </li>
              </ul>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
      <el-card v-else class="preview-card">
        <div class="preview" v-html="html"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import DataSourceNode from '../tiptap-extensions/DataSourceNode.js'

const CustomDocument = Document.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      dataSourceCounter: {
        default: 0,
        renderHTML: attributes => {
          if (attributes.dataSourceCounter === 0) {
            return {}
          }
          return { 'data-source-counter': attributes.dataSourceCounter }
        },
        parseHTML: element => {
          return {
            dataSourceCounter: parseInt(element.getAttribute('data-source-counter') || '0', 10),
          }
        },
      },
    }
  },
})

const sampleHtml = `<h1>欢迎使用富文本编辑器</h1><p>在左侧编辑，右侧实时预览。</p><ul><li><strong>支持粗体</strong></li><li><em>支持斜体</em></li></ul><pre><code>console.log('hello')</code></pre>`

const isEditorReady = ref(false)
const html = ref('')
const selectedNode = ref(null)
const selectedApiId = ref('')
const selectedVariableId = ref('')
const selectedVariables = ref([])
const loading = ref(false)

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      document: false,
    }),
    CustomDocument,
    DataSourceNode,
  ],
  content: sampleHtml,
  onTransaction: ({ editor }) => {
    html.value = editor.getHTML()
  },
  onCreate: ({ editor }) => {
    html.value = editor.getHTML()
    isEditorReady.value = true
  },
  onSelectionUpdate: ({ editor }) => {
    const { from, to } = editor.state.selection
    let node = null
    let pos = -1
    editor.state.doc.nodesBetween(from, to, (n, p) => {
      if (n.type.name === 'dataSource') {
        node = n
        pos = p
      }
    })
    if (node) {
        selectedNode.value = { ...node, pos };
    } else {
        selectedNode.value = null;
    }
  },
})

watch(selectedNode, async (newNode) => {
  if (newNode) {
    selectedApiId.value = newNode.attrs.apiId
    selectedVariableId.value = newNode.attrs.variableId
    if (newNode.attrs.apiId) {
      await fetchVariables(newNode.attrs.apiId)
    } else {
      selectedVariables.value = []
    }
  } else {
    selectedApiId.value = ''
    selectedVariableId.value = ''
    selectedVariables.value = []
  }
})

async function fetchVariables(apiId) {
  if (!apiId) return
  loading.value = true
  try {
    const response = await fetch(`http://localhost:3001/api/workflow/crawler/test/${apiId}`)
    if (response.ok) {
      const data = await response.json()
      selectedVariables.value = Object.keys(data)
    } else {
      selectedVariables.value = []
    }
  } catch (error) {
    console.error('Error fetching variables:', error)
    selectedVariables.value = []
  } finally {
    loading.value = false
  }
}

function addDataSource() {
  if (!isEditorReady.value) return

  const currentCounter = editor.value.state.doc.attrs.dataSourceCounter || 0
  const newCounter = currentCounter + 1
  const newVariableId = `var${newCounter}`

  editor.value.chain().focus().insertContent({
    type: 'dataSource',
    attrs: { apiId: 'test', variableId: newVariableId },
  }).run()

  editor.value.commands.command(({ tr }) => {
    tr.setDocAttribute('dataSourceCounter', newCounter)
    return true
  })
}

function updateDataSource() {
  if (selectedNode.value) {
    editor.value.chain().updateAttributes('dataSource', { apiId: selectedApiId.value }).run()
    fetchVariables(selectedApiId.value)
  }
}

function updateVariableId() {
  if (selectedNode.value) {
    editor.value.chain().updateAttributes('dataSource', { variableId: selectedVariableId.value }).run()
  }
}

function selectVariable(variable) {
  selectedVariableId.value = variable
  updateVariableId()
  nextTick(() => {
      if(selectedNode.value) {
          const { pos } = selectedNode.value
          editor.value.commands.setNodeSelection(pos)
      }
  })
}

const fileInput = ref(null)

function importContent() {
  fileInput.value.click()
}

function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target.result
    editor.value.commands.setContent(content)
  }
  reader.readAsText(file)
}

function exportContent() {
  const html = editor.value.getHTML()
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'report.html'
  a.click()
  URL.revokeObjectURL(url)
}

function isActive(type, attrs = {}) {
  return editor.value?.isActive(type, attrs) ?? false
}

function resetSample() {
  if (!isEditorReady.value) return
  editor.value.commands.setContent(sampleHtml)
}

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

function toggleH1() {
  if (!isEditorReady.value) return
  editor.value.chain().focus().toggleHeading({ level: 1 }).run()
}

function toggleH2() {
  if (!isEditorReady.value) return
  editor.value.chain().focus().toggleHeading({ level: 2 }).run()
}

function toggleH3() {
  if (!isEditorReady.value) return
  editor.value.chain().focus().toggleHeading({ level: 3 }).run()
}

function toggleBold() {
  if (!isEditorReady.value) return
  editor.value.chain().focus().toggleBold().run()
}

function toggleItalic() {
  if (!isEditorReady.value) return
  editor.value.chain().focus().toggleItalic().run()
}

function toggleList() {
  if (!isEditorReady.value) return
  editor.value.chain().focus().toggleBulletList().run()
}

function toggleCode() {
  if (!isEditorReady.value) return
  editor.value.chain().focus().toggleCodeBlock().run()
}
</script>

<style scoped>
.split {
  display: flex;
  height: 100vh;
}
.left, .right {
  flex: 1;
  padding: 12px;
  box-sizing: border-box;
}
.left {
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}
.editor-card, .properties-card, .preview-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-body, .properties-body {
  padding: 8px 0;
  flex: 1;
  min-height: 0; /* allow proper flex scrolling */
}

.editor-content {
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color, #e5e7eb);
  border-radius: 6px;
  overflow: auto;
}

/* Remove default focus outline / black border when editor is focused */
.editor-content:focus,
.editor-content:focus-within,
.editor-content:focus-visible,
.editor-content .ProseMirror:focus {
  outline: none !important;
  box-shadow: none !important;
  border-color: var(--el-border-color, #e5e7eb) !important;
}

/* Override ProseMirror's webkit focus ring with light blue */
:deep(.ProseMirror-focused) {
  outline: none !important;
}

.preview {
  padding: 12px;
  overflow: auto;
}
.preview pre {
  background: #0f172a;
  color: #e6eef8;
  padding: 12px;
  border-radius: 6px;
}

.variables-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.variable-item {
  padding: 4px 8px;
  cursor: pointer;
}

.variable-item:hover {
  background-color: #f0f0f0;
}

.variable-item.is-selected {
  background-color: #e0e0e0;
}

.loading {
  padding: 4px 8px;
}
</style>
