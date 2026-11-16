/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: 'server' | 'local';
  readonly VITE_SERVER_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
