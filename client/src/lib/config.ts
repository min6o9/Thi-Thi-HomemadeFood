/**
 * Application configuration loaded from environment variables.
 * All env vars must be prefixed with VITE_ to be exposed to the client.
 */

export const config = {
  /** Base URL for the API server */
  apiBaseUrl: (() => {
    const url = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (!url) {
      if (import.meta.env.DEV) {
        console.warn('[config] VITE_API_BASE_URL is not set — falling back to http://localhost:5000');
        return 'http://localhost:5000';
      }
      throw new Error('[config] VITE_API_BASE_URL must be set in production');
    }
    return url;
  })(),

  /** Whether development tools are enabled */
  enableDevTools: import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true',

  /** Maximum file upload size in bytes (5MB) */
  maxFileSize: 5 * 1024 * 1024,

  /** Allowed image MIME types */
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
} as const;
