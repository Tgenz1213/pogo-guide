import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {createSoftDeleteAction} from './actions/softDeleteAction'

export default defineConfig({
  name: 'default',
  title: 'pogo-guide',

  projectId: '84tfhiiz',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
  document: {
    actions: (prev) =>
      prev.map((originalAction) =>
        originalAction.action === 'delete'
          ? createSoftDeleteAction(originalAction)
          : originalAction,
      ),
  },
})
