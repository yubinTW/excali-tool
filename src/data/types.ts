import { LibraryItems } from '../types'
import { VERSIONS } from '../constants'

export interface ExportedLibraryData {
  type: string
  version: typeof VERSIONS.excalidrawLibrary
  source: string
  libraryItems: LibraryItems
}

export interface ImportedLibraryData extends Partial<ExportedLibraryData> {
  /** @deprecated v1 */
  library?: LibraryItems
}
