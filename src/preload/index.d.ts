import { ElectronAPI } from '@electron-toolkit/preload'
import { dbAPI } from './db'
import { vgenAPI } from './vgen'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      db: typeof dbAPI
      vgen: typeof vgenAPI
    }
  }
}
