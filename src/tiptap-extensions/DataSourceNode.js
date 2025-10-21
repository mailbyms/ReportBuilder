import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import DataSourceNodeView from './DataSourceNodeView.vue'

const DataSourceNode = Node.create({
  name: 'dataSource',

  group: 'inline',

  inline: true,

  atom: true,

  selectable: true,

  addAttributes() {
    return {
      apiId: {
        default: null,
        parseHTML: element => element.getAttribute('data-api-id'),
        renderHTML: attributes => {
          if (!attributes.apiId) {
            return {}
          }
          return { 'data-api-id': attributes.apiId }
        },
      },
      variableId: {
        default: null,
        parseHTML: element => element.getAttribute('data-variable-id'),
        renderHTML: attributes => {
          if (!attributes.variableId) {
            return {}
          }
          return { 'data-variable-id': attributes.variableId }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="dataSource"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-type': 'dataSource', ...HTMLAttributes }, `{{${HTMLAttributes['data-api-id']}.${HTMLAttributes['data-variable-id']}}}`]
  },

  addNodeView() {
    return VueNodeViewRenderer(DataSourceNodeView)
  },
})

export default DataSourceNode