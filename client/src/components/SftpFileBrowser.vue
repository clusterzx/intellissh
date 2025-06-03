<template>
  <div class="flex flex-col h-full">
    <!-- Header with Connection Controls -->
    <div class="flex-shrink-0 p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
      <div class="text-white">
        <h3 class="text-sm font-medium">SFTP File Browser</h3>
        <p v-if="terminalStore.activeSession" class="text-xs text-slate-300">
          {{ terminalStore.activeSession.username }}@{{ terminalStore.activeSession.hostname }}
        </p>
      </div>
      
      <div class="flex items-center space-x-2">
        <button 
          v-if="!terminalStore.hasSftpConnection && !terminalStore.sftpConnectingStatus"
          @click="connectSftp" 
          class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-md shadow-sm transition-colors"
        >
          Connect
        </button>
        
        <button 
          v-if="terminalStore.sftpConnectingStatus"
          disabled
          class="px-3 py-1 bg-slate-600 text-white text-xs rounded-md shadow-sm opacity-70 cursor-not-allowed"
        >
          Connecting...
        </button>
        
        <button 
          v-if="terminalStore.hasSftpConnection"
          @click="disconnectSftp" 
          class="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs rounded-md shadow-sm transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
    
    <!-- Error Display -->
    <div v-if="terminalStore.sftpError" class="bg-red-500/10 m-3 p-3 rounded-md border border-red-500/30 text-red-400 text-sm">
      <div class="flex items-start">
        <div class="flex-shrink-0 pt-0.5">
          <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div class="ml-3">
          <p>{{ terminalStore.sftpError }}</p>
          <button @click="terminalStore.clearSftpError" class="text-xs text-red-400 hover:text-red-300 mt-1 underline">
            Dismiss
          </button>
        </div>
      </div>
    </div>
    
    <!-- Not Connected State -->
    <div v-if="!terminalStore.hasSftpConnection && !terminalStore.sftpConnectingStatus" class="flex-1 flex items-center justify-center p-6">
      <div class="text-center">
        <div class="bg-slate-700/50 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <svg class="h-8 w-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-white mb-2">No SFTP Connection</h3>
        <p class="text-slate-400 mb-4">
          Connect to browse files and transfer data securely
        </p>
        <button
          @click="connectSftp"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors"
          :disabled="!terminalStore.hasActiveSession"
        >
          Connect to SFTP
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="terminalStore.sftpConnectingStatus" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="spinner mx-auto mb-4 text-indigo-500 h-8 w-8 border-2"></div>
        <p class="text-white">Connecting to SFTP...</p>
      </div>
    </div>
    
    <!-- Connected State with File Browser -->
    <div v-if="terminalStore.hasSftpConnection" class="flex-1 flex flex-col overflow-hidden">
      <!-- Path Navigation -->
      <div class="flex items-center space-x-1 p-2 bg-slate-700/50 border-b border-slate-700">
        <button 
          @click="navigateToParentDirectory"
          class="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"
          :disabled="loading"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          @click="refreshDirectory"
          class="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md"
          :disabled="loading"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        
        <div class="flex-1 bg-slate-800 text-white px-2 py-1 text-sm rounded overflow-x-auto whitespace-nowrap">
          {{ terminalStore.currentDirectory || '/' }}
        </div>
      </div>
      
      <!-- Loading overlay -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
        <div class="spinner text-indigo-500 h-8 w-8 border-2"></div>
      </div>
      
      <!-- File Operations Toolbar -->
      <div class="p-2 bg-slate-800 border-b border-slate-700 flex flex-wrap gap-2">
        <button 
          @click="showUploadFileDialog = true"
          class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors flex items-center"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
        
        <button
          @click="showCreateDirectoryDialog = true"
          class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors flex items-center"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          New Folder
        </button>
        
        <button v-if="selectedItem" 
          @click="downloadSelectedItem"
          :disabled="!canDownload"
          :class="[
            'px-2 py-1 text-white text-xs rounded transition-colors flex items-center',
            canDownload ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 opacity-50 cursor-not-allowed'
          ]"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
        
        <button v-if="selectedItem" 
          @click="showDeleteDialog = true"
          class="px-2 py-1 bg-red-900 hover:bg-red-800 text-white text-xs rounded transition-colors flex items-center"
        >
          <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
      
      <!-- File List -->
      <div class="flex-1 overflow-auto">
        <table class="min-w-full border-collapse">
          <thead class="bg-slate-800 sticky top-0 z-10">
            <tr>
              <th class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
              <th class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Size</th>
              <th class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Modified</th>
              <th class="py-2 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700 bg-slate-800/50">
            <tr
              v-for="item in sortedDirectoryContents"
              :key="item.filename"
              @click="selectItem(item)"
              @dblclick="handleItemDoubleClick(item)"
              :class="[
                'cursor-pointer hover:bg-slate-700 transition-colors',
                selectedItem && selectedItem.filename === item.filename ? 'bg-slate-700' : ''
              ]"
            >
              <td class="py-2 px-3 whitespace-nowrap">
                <div class="flex items-center">
                  <svg v-if="item.attrs.isDirectory" class="h-4 w-4 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <svg v-else-if="item.attrs.isSymlink" class="h-4 w-4 mr-2 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.102 1.101" />
                  </svg>
                  <svg v-else class="h-4 w-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span class="text-white text-sm">{{ item.filename }}</span>
                </div>
              </td>
              <td class="py-2 px-3 whitespace-nowrap text-sm text-slate-300">
                {{ item.attrs.isDirectory ? '-' : formatFileSize(item.attrs.size) }}
              </td>
              <td class="py-2 px-3 whitespace-nowrap text-sm text-slate-300">
                {{ formatDate(item.attrs.mtime * 1000) }}
              </td>
              <td class="py-2 px-3 whitespace-nowrap text-sm text-slate-300">
                {{ getItemType(item) }}
              </td>
            </tr>
            <tr v-if="terminalStore.directoryContents.length === 0">
              <td colspan="4" class="py-4 text-center text-slate-400">
                This directory is empty
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Active Transfers -->
      <div v-if="hasActiveTransfers" class="flex-shrink-0 border-t border-slate-700 bg-slate-800 p-2">
        <div class="text-xs font-medium text-slate-300 mb-2">Active Transfers</div>
        <div class="space-y-2 max-h-32 overflow-y-auto">
          <div 
            v-for="transfer in terminalStore.activeTransfers.filter(t => t.status !== 'complete')" 
            :key="transfer.id"
            class="bg-slate-700 rounded-md p-2"
          >
            <div class="flex justify-between mb-1">
              <span class="text-xs text-white truncate max-w-[200px]">
                {{ transfer.type === 'upload' ? 'Uploading: ' : 'Downloading: ' }}
                {{ transfer.type === 'upload' ? 
                  transfer.localPath.split('/').pop() : 
                  transfer.remotePath.split('/').pop() 
                }}
              </span>
              <span class="text-xs text-slate-300">{{ transfer.progress }}%</span>
            </div>
            <div class="h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div 
                class="h-full bg-indigo-500" 
                :class="{'bg-red-500': transfer.status === 'error'}"
                :style="{width: `${transfer.progress}%`}"
              ></div>
            </div>
            <div v-if="transfer.error" class="mt-1 text-xs text-red-400">
              {{ transfer.error }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Upload File Dialog -->
    <div v-if="showUploadFileDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">Upload File</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">Current Directory</label>
          <div class="bg-slate-700 text-white px-3 py-2 rounded-md text-sm">
            {{ terminalStore.currentDirectory || '/' }}
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">Local File Path</label>
          <input 
            v-model="uploadLocalPath" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
            placeholder="/path/to/local/file.txt"
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showUploadFileDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="uploadFile"
            :disabled="!uploadLocalPath"
            :class="[
              'px-3 py-1.5 text-white text-sm rounded transition-colors', 
              uploadLocalPath ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-700 opacity-50 cursor-not-allowed'
            ]"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
    
    <!-- Create Directory Dialog -->
    <div v-if="showCreateDirectoryDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">Create New Folder</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">Current Directory</label>
          <div class="bg-slate-700 text-white px-3 py-2 rounded-md text-sm">
            {{ terminalStore.currentDirectory || '/' }}
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">Folder Name</label>
          <input 
            v-model="newDirectoryName" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
            placeholder="new_folder"
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showCreateDirectoryDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="createDirectory"
            :disabled="!newDirectoryName"
            :class="[
              'px-3 py-1.5 text-white text-sm rounded transition-colors', 
              newDirectoryName ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-700 opacity-50 cursor-not-allowed'
            ]"
          >
            Create
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">Confirm Delete</h3>
        <p class="text-slate-300 mb-4">
          Are you sure you want to delete 
          <span class="font-medium text-white">{{ selectedItem?.filename }}</span>?
          <br>
          <span class="text-red-400 text-sm">This action cannot be undone.</span>
        </p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showDeleteDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="deleteItem"
            class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
    
    <!-- Download Dialog -->
    <div v-if="showDownloadDialog" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 class="text-lg font-medium text-white mb-3">Download File</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">Remote File</label>
          <div class="bg-slate-700 text-white px-3 py-2 rounded-md text-sm">
            {{ getFullPath(selectedItem?.filename) }}
          </div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-300 mb-1">Local Destination Path</label>
          <input 
            v-model="downloadLocalPath" 
            type="text" 
            class="w-full bg-slate-700 text-white px-3 py-2 rounded-md text-sm"
            placeholder="/path/to/save/file.txt"
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showDownloadDialog = false" 
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="downloadFile"
            :disabled="!downloadLocalPath"
            :class="[
              'px-3 py-1.5 text-white text-sm rounded transition-colors', 
              downloadLocalPath ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-700 opacity-50 cursor-not-allowed'
            ]"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTerminalStore } from '@/stores/terminalStore'

const terminalStore = useTerminalStore()

// State
const loading = ref(false)
const selectedItem = ref(null)
const showUploadFileDialog = ref(false)
const showCreateDirectoryDialog = ref(false)
const showDeleteDialog = ref(false)
const showDownloadDialog = ref(false)
const uploadLocalPath = ref('')
const downloadLocalPath = ref('')
const newDirectoryName = ref('')

// Computed properties
const sortedDirectoryContents = computed(() => {
  if (!terminalStore.directoryContents.length) return []
  
  // First sort by type (directories first), then by name
  return [...terminalStore.directoryContents].sort((a, b) => {
    // Sort directories first
    if (a.attrs.isDirectory && !b.attrs.isDirectory) return -1
    if (!a.attrs.isDirectory && b.attrs.isDirectory) return 1
    
    // Then sort by name
    return a.filename.localeCompare(b.filename)
  })
})

const hasActiveTransfers = computed(() => {
  return terminalStore.activeTransfers && terminalStore.activeTransfers.length > 0
})

const canDownload = computed(() => {
  return selectedItem.value && selectedItem.value.attrs.isFile
})

// Methods
const connectSftp = async () => {
  if (!terminalStore.hasActiveSession) {
    terminalStore.sftpConnectionError = 'No active terminal session. Connect to SSH first.'
    return
  }
  
  try {
    loading.value = true
    await terminalStore.connectToSftp(terminalStore.activeSession.id)
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to connect to SFTP:', error)
  } finally {
    loading.value = false
  }
}

const disconnectSftp = () => {
  terminalStore.disconnectSftp()
  selectedItem.value = null
}

const listCurrentDirectory = async () => {
  try {
    loading.value = true
    await terminalStore.listDirectory(terminalStore.currentDirectory)
  } catch (error) {
    console.error('Failed to list directory:', error)
  } finally {
    loading.value = false
  }
}

const refreshDirectory = () => {
  listCurrentDirectory()
}

const navigateToDirectory = async (path) => {
  try {
    loading.value = true
    await terminalStore.listDirectory(path)
    selectedItem.value = null
  } catch (error) {
    console.error('Failed to navigate to directory:', error)
  } finally {
    loading.value = false
  }
}

const navigateToParentDirectory = () => {
  const currentPath = terminalStore.currentDirectory
  
  if (currentPath === '/' || currentPath === '.') {
    return
  }
  
  // Get parent directory path
  let parentPath
  if (currentPath.lastIndexOf('/') === 0) {
    parentPath = '/'
  } else {
    parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'))
  }
  
  navigateToDirectory(parentPath)
}

const selectItem = (item) => {
  selectedItem.value = item
}

const handleItemDoubleClick = (item) => {
  if (item.attrs.isDirectory) {
    // Get the path to navigate to
    const newPath = getFullPath(item.filename)
    navigateToDirectory(newPath)
  } else if (item.attrs.isFile) {
    // For files, show download dialog
    downloadSelectedItem()
  }
}

const getFullPath = (filename) => {
  const currentPath = terminalStore.currentDirectory
  
  if (currentPath === '/') {
    return `/${filename}`
  } else {
    return `${currentPath}/${filename}`
  }
}

const uploadFile = async () => {
  try {
    loading.value = true
    
    // Get the remote path
    const remotePath = getFullPath(uploadLocalPath.value.split('/').pop())
    
    // Start upload
    await terminalStore.uploadFile(uploadLocalPath.value, remotePath)
    
    // Close dialog and refresh directory
    showUploadFileDialog.value = false
    uploadLocalPath.value = ''
    
    // Refresh to show the new file
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to upload file:', error)
  } finally {
    loading.value = false
  }
}

const downloadSelectedItem = () => {
  if (!selectedItem.value || !selectedItem.value.attrs.isFile) {
    return
  }
  
  // Suggest a local path with the same filename
  downloadLocalPath.value = `/tmp/${selectedItem.value.filename}`
  
  // Show download dialog
  showDownloadDialog.value = true
}

const downloadFile = async () => {
  try {
    loading.value = true
    
    // Get the remote path
    const remotePath = getFullPath(selectedItem.value.filename)
    
    // Start download
    await terminalStore.downloadFile(remotePath, downloadLocalPath.value)
    
    // Close dialog
    showDownloadDialog.value = false
    downloadLocalPath.value = ''
  } catch (error) {
    console.error('Failed to download file:', error)
  } finally {
    loading.value = false
  }
}

const createDirectory = async () => {
  try {
    loading.value = true
    
    // Get the full path for the new directory
    const newDirPath = getFullPath(newDirectoryName.value)
    
    // Create the directory
    await terminalStore.createDirectory(newDirPath)
    
    // Close dialog and refresh directory
    showCreateDirectoryDialog.value = false
    newDirectoryName.value = ''
    
    // Refresh to show the new directory
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to create directory:', error)
  } finally {
    loading.value = false
  }
}

const deleteItem = async () => {
  try {
    loading.value = true
    
    // Get the full path
    const itemPath = getFullPath(selectedItem.value.filename)
    
    // Delete the item based on its type
    if (selectedItem.value.attrs.isDirectory) {
      await terminalStore.deleteDirectory(itemPath)
    } else {
      await terminalStore.deleteFile(itemPath)
    }
    
    // Close dialog and refresh directory
    showDeleteDialog.value = false
    selectedItem.value = null
    
    // Refresh to update the file list
    await listCurrentDirectory()
  } catch (error) {
    console.error('Failed to delete item:', error)
  } finally {
    loading.value = false
  }
}

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format date for display
const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

// Get item type for display
const getItemType = (item) => {
  if (item.attrs.isDirectory) return 'Directory'
  if (item.attrs.isSymlink) return 'Symlink'
  
  // Try to determine file type from extension
  const ext = item.filename.split('.').pop().toLowerCase()
  
  switch (ext) {
    case 'txt': return 'Text File'
    case 'pdf': return 'PDF Document'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return 'Image'
    case 'mp3':
    case 'wav': return 'Audio'
    case 'mp4':
    case 'avi':
    case 'mov': return 'Video'
    case 'js': return 'JavaScript'
    case 'ts': return 'TypeScript'
    case 'html': return 'HTML'
    case 'css': return 'CSS'
    case 'json': return 'JSON'
    case 'md': return 'Markdown'
    case 'py': return 'Python'
    case 'java': return 'Java'
    case 'c':
    case 'cpp': return 'C/C++'
    case 'php': return 'PHP'
    case 'sh': return 'Shell Script'
    case 'zip':
    case 'tar':
    case 'gz': return 'Archive'
    default: return 'File'
  }
}

// Lifecycle hooks
onMounted(() => {
  // Set up SFTP listeners
  terminalStore.setupSftpListeners()
})

// Watch for SSH session changes to handle disconnections
watch(() => terminalStore.hasActiveSession, (hasSession) => {
  if (!hasSession && terminalStore.hasSftpConnection) {
    // Disconnect SFTP if SSH session is disconnected
    terminalStore.disconnectSftp()
    selectedItem.value = null
  }
})
</script>
