/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_SUI_NETWORK: string;
  readonly VITE_SUI_RPC_URL: string;
  readonly VITE_SUI_PACKAGE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
