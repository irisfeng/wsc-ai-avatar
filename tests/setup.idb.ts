/**
 * vitest setup file — plugs an in-memory IndexedDB into Node so storage.ts
 * can be exercised end-to-end without a browser.
 */
import 'fake-indexeddb/auto';
