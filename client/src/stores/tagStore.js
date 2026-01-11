import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const sortTagsByName = (tagList) => {
  return [...tagList].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export const useTagStore = defineStore('tag', () => {
  const tags = ref([])
  const loading = ref(false)
  const error = ref(null)

  const setTags = (tagList) => {
    tags.value = sortTagsByName(tagList)
  }

  const findTagIndex = (tagId) => tags.value.findIndex(tag => tag.id === tagId)

  const fetchTags = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get('/api/tags')
      const fetchedTags = Array.isArray(response.data?.tags) ? response.data.tags : []
      setTags(fetchedTags.map(tag => ({
        ...tag,
        sessionCount: typeof tag.sessionCount === 'number' ? tag.sessionCount : 0
      })))
      return { success: true, tags: tags.value }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to load tags.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const createTag = async (name) => {
    const trimmedName = name?.trim() || ''
    if (!trimmedName) {
      error.value = 'Tag name is required.'
      return { success: false, error: error.value }
    }

    error.value = null

    try {
      const response = await axios.post('/api/tags', { name: trimmedName })
      const newTag = {
        ...response.data?.tag,
        sessionCount: 0
      }
      setTags([...tags.value, newTag])
      return { success: true, tag: newTag }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to create tag.'
      return { success: false, error: error.value }
    }
  }

  const updateTag = async (tagId, name) => {
    const trimmedName = name?.trim() || ''
    if (!trimmedName) {
      error.value = 'Tag name is required.'
      return { success: false, error: error.value }
    }

    error.value = null

    try {
      const response = await axios.put(`/api/tags/${tagId}`, { name: trimmedName })
      const updatedTag = response.data?.tag || { id: tagId, name: trimmedName }
      const index = findTagIndex(tagId)

      if (index !== -1) {
        const sessionCount = tags.value[index]?.sessionCount ?? 0
        tags.value.splice(index, 1, {
          ...tags.value[index],
          ...updatedTag,
          sessionCount
        })
        setTags(tags.value)
      }

      return { success: true, tag: updatedTag }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to update tag.'
      return { success: false, error: error.value }
    }
  }

  const deleteTag = async (tagId) => {
    error.value = null

    try {
      await axios.delete(`/api/tags/${tagId}`)
      const filtered = tags.value.filter(tag => tag.id !== tagId)
      setTags(filtered)
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.error || 'Failed to delete tag.'
      return { success: false, error: error.value }
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    clearError
  }
})
