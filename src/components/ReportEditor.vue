<template>
  <TopLoadingBar :loading="isLoading" />
  <div class="split">
    <div class="left">
      <el-card class="editor-card">
        <template #header>
          <div class="toolbar">
            <div class="toolbar-left">
            当前报告：
              <el-select
                v-model="selectedReportId"
                placeholder="选择报告"
                size="small"
                style="width: 120px; margin-right: 8px;"
                @change="loadReport"
                :disabled="!isEditorReady"
                clearable
              >
                <el-option
                  v-for="report in reportsList"
                  :key="report.id"
                  :label="report.report_name"
                  :value="report.id"
                />
              </el-select>              
            </div>

            <div class="toolbar-right">
              <el-button-group>
                <el-button size="small" @click="saveReport" type="success" :disabled="!isEditorReady">保存</el-button>
                <el-button size="small" @click="deleteReport" type="danger" :disabled="!isEditorReady || !currentReportId">删除</el-button>
              </el-button-group>
               </div>
            <input type="file" ref="fileInput" @change="handleFileImport" style="display: none" accept=".html" />
          </div>
        </template>

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
              </el-button-group>
            </div>
            <div class="toolbar-right">
              <el-select
                v-model="selectedAgentId"
                placeholder="选择智能体"
                size="small"
                style="width: 150px;"
                :disabled="!isEditorReady"
              >
                <el-option
                  v-for="agent in agents"
                  :key="agent.uuid"
                  :label="agent.name"
                  :value="agent.uuid"
                />
              </el-select>
              <el-button-group>
                <el-button size="small" @click="addDataSource" :disabled="!isEditorReady" type="primary">Data Source</el-button>
              </el-button-group>
            </div>
            <input type="file" ref="fileInput" @change="handleFileImport" style="display: none" accept=".html" />
          </div>

        <div class="editor-wrapper card-body">
          <EditorContent class="editor-content" :editor="editor" />
        </div>
      </el-card>
    </div>
    <div class="right">
      <el-card v-if="selectedNode" class="properties-card">
        <template #header>
          <div>数据源属性</div>
        </template>
        <div class="properties-body">
          <el-form label-position="top">
            <el-form-item label="智能体 ID">
              <el-input v-model="selectedApiId" @change="updateDataSource" />
            </el-form-item>
            <el-form-item label="变量 Key">
              <el-input v-model="selectedVariableId" @change="updateVariableId" />
            </el-form-item>
            <el-form-item label="当前值">
              <el-input v-model="selectedValue" readonly />
            </el-form-item>
            <el-form-item label="关联图片">
              <img v-if="selectedImgBase64" :src="selectedImgBase64" style="max-width: 100%;" />
              <div v-else>无</div>
            </el-form-item>
            <el-form-item>
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
        <template #header>
          <div class="toolbar">
            <div class="toolbar-left">
              <el-button size="small" @click="refreshPreview" :disabled="isLoading">刷新</el-button>
            </div>
            <div class="toolbar-right">
              <el-button size="small" @click="exportContent" type="primary">导出</el-button>
            </div>
          </div>
        </template>
        <div class="preview" v-html="html"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import TopLoadingBar from './TopLoadingBar.vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import DataSourceNode from '../tiptap-extensions/DataSourceNode.js'
import { ElMessageBox, ElMessage } from 'element-plus'

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

// 新增数据模型
const reportsList = ref([]) // 存储报告列表
const selectedReportId = ref(null) // 当前选中的报告ID
const currentReportId = ref(null) // 当前编辑器加载的报告ID
const currentReportName = ref('') // 当前编辑器加载的报告名称
const agents = ref([]) // 存储智能体列表
const selectedAgentId = ref(null) // 当前选中的智能体ID
const storedAgentValues = ref({}); // 存储从localStorage加载的变量值
const isLoading = ref(false);
const selectedValue = ref(null);
const selectedImgBase64 = ref(null);

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
    updatePreview(editor.getHTML());
  },
  onCreate: ({ editor }) => {
    isEditorReady.value = true
    loadReportsList() // 编辑器准备好后加载报告列表
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

onMounted(async () => {
  await loadAgents();
  updatePreview(editor.value.getHTML());
});

function updatePreview(content) {
  const values = storedAgentValues.value;
  if (Object.keys(values).length === 0) {
    html.value = content;
    return;
  }

  let processedContent = content;
  const placeholders = processedContent.match(/<span data-type="dataSource"[^>]*>.*?<\/span>/g) || [];

  placeholders.forEach(placeholder => {
    const apiIdMatch = placeholder.match(/data-api-id="([^"]+)"/);
    const variableIdMatch = placeholder.match(/data-variable-id="([^"]+)"/);

    if (apiIdMatch && variableIdMatch) {
      const apiId = apiIdMatch[1];
      const variableId = variableIdMatch[1];
      const value = values[apiId]?.[variableId];

      if (value !== null && value !== undefined) {
        processedContent = processedContent.replace(placeholder, value);
      }
    }
  });
  html.value = processedContent;
}

async function loadAgents() {
  try {
    const response = await fetch('/api/agents');
    if (response.ok) {
      const data = await response.json();
      agents.value = data.list;
      if (agents.value.length > 0) {
        selectedAgentId.value = agents.value[0].uuid;
      }
      ElMessage.success(`智能体列表加载成功，共 ${agents.value.length} 个智能体！`);
    } else {
      ElMessage.error('加载智能体列表失败。');
    }
  } catch (error) {
    console.error('Error loading agents list:', error);
    ElMessage.error('加载智能体列表时发生错误。');
  }
}

watch(selectedNode, async (newNode) => {
  if (newNode) {
    selectedApiId.value = newNode.attrs.apiId
    selectedVariableId.value = newNode.attrs.variableId
    selectedValue.value = null;
    selectedImgBase64.value = null;

    const agentData = storedAgentValues.value[newNode.attrs.apiId];
    if (agentData) {
      selectedValue.value = agentData[newNode.attrs.variableId];
      if (agentData.shotId) {
        try {
          const response = await fetch(`/api/crawler/shot/${agentData.shotId}`);
          if (response.ok) {
            const imageData = await response.json();
            selectedImgBase64.value = `data:image/png;base64,${imageData.image_base64}`;
          }
        } catch (error) {
          console.error('Error fetching image:', error);
        }
      }
    }

    if (newNode.attrs.apiId) {
      await fetchVariables(newNode.attrs.apiId)
    } else {
      selectedVariables.value = []
    }
  }
  else {
    selectedApiId.value = ''
    selectedVariableId.value = ''
    selectedVariables.value = []
    selectedValue.value = null;
    selectedImgBase64.value = null;
  }
})

async function fetchVariables(apiId) {
}

function addDataSource() {
  if (!isEditorReady.value) return;
  if (!selectedAgentId.value) {
    ElMessage.warning('请先选择一个智能体。');
    return;
  }

  const selectedAgent = agents.value.find(agent => agent.uuid === selectedAgentId.value);
  const agentName = selectedAgent ? selectedAgent.name : 'agent';

  const currentCounter = editor.value.state.doc.attrs.dataSourceCounter || 0
  const newCounter = currentCounter + 1
  const newVariableId = `var${newCounter}`

  editor.value.chain().focus().insertContent({
    type: 'dataSource',
    attrs: { 
      apiId: selectedAgentId.value, 
      variableId: newVariableId, 
      agentName: agentName 
    },
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

async function refreshPreview() {
  if (!currentReportId.value) {
    ElMessage.warning('请先选择一个报告。');
    return;
  }
  const key = `agentValues_${currentReportId.value}`;
  localStorage.removeItem(key);
  storedAgentValues.value = {};
  updatePreview(editor.value.getHTML()); // Refresh preview to show placeholders
  isLoading.value = true;
  try {
    let content = editor.value.getHTML();
    const placeholders = content.match(/<span data-type="dataSource"[^>]*>.*?<\/span>/g) || [];
    const agentUuids = new Set();
    
    placeholders.forEach(placeholder => {
      const apiIdMatch = placeholder.match(/data-api-id="([^"]+)"/);
      if (apiIdMatch) {
        agentUuids.add(apiIdMatch[1]);
      }
    });

    if (agentUuids.size === 0) {
      updatePreview(content);
      ElMessage.success('预览已刷新！');
      return;
    }

    const agentDataPromises = Array.from(agentUuids).map(uuid =>
      fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid }),
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch data for agent ${uuid}`);
        }
        return response.json();
      })
    );

    const results = await Promise.all(agentDataPromises);
    const agentValues = results.reduce((acc, data) => {
      const uuid = data.agentUuid;
      if (uuid) {
        acc[uuid] = data.details.reduce((vars, item) => {
          if (item.vlmResult) {
            Object.assign(vars, item.vlmResult);
          }
          if (item.shotId) {
            vars.shotId = item.shotId;
          }
          return vars;
        }, {});
      }
      return acc;
    }, {});

    storedAgentValues.value = agentValues;
    localStorage.setItem(key, JSON.stringify(agentValues));
    
    updatePreview(content);
    ElMessage.success('预览已刷新并替换占位符！');
  } catch (error) {
    console.error('Error during preview refresh:', error);
    updatePreview(content); // Show preview with old values on error
    ElMessage.error('刷新预览时发生错误。');
  } finally {
    isLoading.value = false;
  }
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

// 加载报告列表
async function loadReportsList() {
  try {
    const response = await fetch('/api/reports');
    if (response.ok) {
      reportsList.value = await response.json();
      ElMessage.success(`报告列表加载成功，共 ${reportsList.value.length} 条报告！`);
    } else {
      ElMessage.error('加载报告列表失败。');
    }
  } catch (error) {
    console.error('Error loading reports list:', error);
    ElMessage.error('加载报告列表时发生错误。');
  }
}

async function loadReport(reportId) {
  // Clear old data first
  storedAgentValues.value = {};
  
  if (!reportId) {
    editor.value.commands.setContent(sampleHtml);
    currentReportId.value = null;
    currentReportName.value = '';
    selectedReportId.value = null;
    updatePreview(editor.value.getHTML());
    return;
  }

  // Load from localStorage
  const key = `agentValues_${reportId}`;
  const savedValues = localStorage.getItem(key);
  if (savedValues) {
    storedAgentValues.value = JSON.parse(savedValues);
  }

  try {
    const response = await fetch(`/api/reports/${reportId}`);
    if (response.ok) {
      const report = await response.json();
      editor.value.commands.setContent(report.report_content);
      currentReportId.value = report.id;
      currentReportName.value = report.report_name;
      ElMessage.success(`报告 \'${report.report_name}\' 加载成功！`);
      updatePreview(editor.value.getHTML());
    } else {
      ElMessage.error('加载报告内容失败。');
    }
  } catch (error) {
    console.error('Error loading report content:', error);
    ElMessage.error('加载报告内容时发生错误。');
  }
}

async function saveReport() {
  if (!isEditorReady.value) return;

  try {
    const reportName = currentReportName.value || (await ElMessageBox.prompt('请输入报告名称', '保存报告', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputPattern: /\S/,
      inputErrorMessage: '报告名称不能为空。',
    })).value;

    if (reportName) {
      const reportContent = editor.value.getHTML();
      const payload = {
        report_name: reportName,
        report_content: reportContent,
      };

      let url = '/api/reports';
      let method = 'POST';

      if (currentReportId.value) {
        payload.id = currentReportId.value; // 添加 ID 用于更新
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        currentReportId.value = result.reportId; // 更新当前报告ID
        currentReportName.value = reportName; // 更新当前报告名称
        ElMessage.success('报告保存成功！');
        loadReportsList(); // 重新加载报告列表以更新名称或新报告
      } else {
        const errorData = await response.json();
        ElMessage.error(`保存报告失败: ${errorData.message || response.statusText}`);
      }
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('保存操作已取消。');
    } else {
      console.error('Error saving report:', error);
      ElMessage.error('保存报告时发生意外错误。');
    }
  }
}

// 删除报告
async function deleteReport() {
  if (!currentReportId.value) {
    ElMessage.warning('请先选择一个报告进行删除。');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除报告 \'${currentReportName.value}\' 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const key = `agentValues_${currentReportId.value}`;
    localStorage.removeItem(key);

    const response = await fetch(`/api/reports/${currentReportId.value}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      ElMessage.success('报告删除成功！');
      editor.value.commands.setContent(sampleHtml); // 清空编辑器
      currentReportId.value = null;
      currentReportName.value = '';
      selectedReportId.value = null;
      loadReportsList(); // 重新加载报告列表
    } else {
      const errorData = await response.json();
      ElMessage.error(`删除报告失败: ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('删除操作已取消。');
    }
    else {
      console.error('Error deleting report:', error);
      ElMessage.error('删除报告时发生意外错误。');
    }
  }
}

function isActive(type, attrs = {}) {
  return editor.value?.isActive(type, attrs) ?? false
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
</script>

<style scoped>
.split {
  display: flex;
  height: 100vh;
  --padding-base: 12px;
  --padding-small: 8px;
  --padding-xs: 4px;
  --border-radius-base: 6px;
  --border-color: #e5e7eb;
  --background-color-hover: #f0f0f0;
  --background-color-selected: #e0e0e0;
  --pre-background-color: #0f172a;
  --pre-color: #e6eef8;
}
.left, .right {
  flex: 1;
  padding: var(--padding-base);
  box-sizing: border-box;
}
.left {
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--padding-small);
  flex-wrap: wrap;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: var(--padding-small);
  align-items: center;
}
.editor-card, .properties-card, .preview-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-body, .properties-body {
  padding: var(--padding-small) 0;
  flex: 1;
  min-height: 0; /* allow proper flex scrolling */
}

.editor-content {
  height: 100%;
  padding: var(--padding-base);
  box-sizing: border-box;
  border: 1px solid var(--el-border-color, var(--border-color));
  border-radius: var(--border-radius-base);
  overflow: auto;
}

/* Remove default focus outline / black border when editor is focused */
.editor-content:focus,
.editor-content:focus-within,
.editor-content:focus-visible,
.editor-content .ProseMirror:focus {
  outline: none !important;
  box-shadow: none !important;
  border-color: var(--el-border-color, var(--border-color)) !important;
}

/* Override ProseMirror's webkit focus ring with light blue */
:deep(.ProseMirror-focused) {
  outline: none !important;
}

.preview {
  padding: var(--padding-base);
  overflow: auto;
}
.preview pre {
  background: var(--pre-background-color);
  color: var(--pre-color);
  padding: var(--padding-base);
  border-radius: var(--border-radius-base);
}

.variables-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.variable-item {
  cursor: pointer;
}

.variable-item, .loading {
  padding: var(--padding-xs) var(--padding-small);
}

.variable-item:hover {
  background-color: var(--background-color-hover);
}

.variable-item.is-selected {
  background-color: var(--background-color-selected);
}
</style>
