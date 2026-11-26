// Globals provided by the native shells (Capacitor, Electron) and browser APIs not yet in lib.dom.
interface Window {
  Capacitor?: any;
  reviveDesktop?: any;
  supabase?: any;
  BarcodeDetector?: any;
  webkitAudioContext?: typeof AudioContext;
  __syncReminders?: (force?: boolean) => Promise<number | void>;
  __canInstall?: boolean;
  __promptInstall?: () => Promise<boolean>;
  __revive?: any;
}
interface Navigator { standalone?: boolean }

// The app only queries HTML elements, most of them form fields. Queries are typed as
// HTMLInputElement (a superset of HTMLElement) so field access is checked rather than `any`.
interface ParentNode {
  querySelector(selectors: string): HTMLInputElement | null;
  querySelectorAll(selectors: string): NodeListOf<HTMLInputElement>;
}
interface Element {
  closest(selectors: string): HTMLElement | null;
}
