/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. https://api.pamildori.uz (set in .env.production). */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
