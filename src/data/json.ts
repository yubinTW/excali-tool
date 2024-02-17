import { EXPORT_DATA_TYPES } from '../constants'
import { ImportedLibraryData } from './types'

export const isValidLibrary = (json: any): json is ImportedLibraryData => {
  return (
    typeof json === 'object' &&
    json &&
    json.type === EXPORT_DATA_TYPES.excalidrawLibrary &&
    (json.version === 1 || json.version === 2)
  )
}
