import { describe, expect, it } from 'vitest'
import { sanitizeProjectUiState } from './projectUiState'
import type { CategoryDefinition, ProjectUiState, TreeNode } from './types'

const categories: CategoryDefinition[] = []

function sceneChapter(id: string): TreeNode {
  return {
    id,
    parentId: null,
    type: 'chapter',
    title: 'Chapter',
    sortOrder: 0,
    content: '',
    metadata: JSON.stringify({ structure: 'scenes' }),
    createdAt: '',
    updatedAt: ''
  }
}

function folder(id: string): TreeNode {
  return {
    id,
    parentId: null,
    type: 'folder',
    title: 'Folder',
    sortOrder: 0,
    content: '',
    metadata: JSON.stringify({ scope: 'manuscript' }),
    createdAt: '',
    updatedAt: ''
  }
}

const baseUi: ProjectUiState = {
  sectionOrder: [],
  selectedNodeId: null,
  selectedContainerId: null,
  selectedEntityId: null,
  selectedEntityType: null,
  selectedEntryId: null,
  selectedEntryCategoryId: null,
  expandedSections: ['manuscript'],
  expandedFolders: [],
  rightPanelOpen: false
}

describe('sanitizeProjectUiState expandedFolders', () => {
  it('keeps expanded scene chapter ids', () => {
    const chapter = sceneChapter('chapter-1')
    const ui = { ...baseUi, expandedFolders: [chapter.id] }
    const result = sanitizeProjectUiState(ui, [chapter], categories)
    expect(result.expandedFolders).toEqual([chapter.id])
  })

  it('keeps expanded folder ids', () => {
    const f = folder('folder-1')
    const ui = { ...baseUi, expandedFolders: [f.id] }
    const result = sanitizeProjectUiState(ui, [f], categories)
    expect(result.expandedFolders).toEqual([f.id])
  })

  it('drops simple chapter ids', () => {
    const chapter: TreeNode = {
      ...sceneChapter('chapter-simple'),
      metadata: JSON.stringify({ structure: 'simple' })
    }
    const ui = { ...baseUi, expandedFolders: [chapter.id] }
    const result = sanitizeProjectUiState(ui, [chapter], categories)
    expect(result.expandedFolders).toEqual([])
  })
})
