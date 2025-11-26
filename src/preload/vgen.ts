import { ipcRenderer } from 'electron'
import type { VGenFetchResult } from '../main/types/vgen'

export const vgenAPI = {
  fetchCommissions: (): Promise<VGenFetchResult> => ipcRenderer.invoke('vgen:fetchCommissions'),
  updateCommissions: (): Promise<{ success: boolean; count: number; error?: string }> => 
    ipcRenderer.invoke('vgen:updateCommissions'),
  updateServices: (): Promise<{ success: boolean; count: number; error?: string }> => 
    ipcRenderer.invoke('vgen:updateServices'),
  onUpdateProgress: (callback: (progress: { step: string; progress: number; message: string }) => void) => {
    ipcRenderer.on('vgen:updateProgress', (_event, progress) => callback(progress))
  },
  removeUpdateProgressListener: () => {
    ipcRenderer.removeAllListeners('vgen:updateProgress')
  }
}

