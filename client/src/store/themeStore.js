import { create } from "zustand";

// Monaco theme definitions. Applied via monaco.editor.defineTheme + setTheme
// in CodeEditor.jsx. `appClass` toggles a root CSS class for the small set
// of chrome colors (panels, borders) that live outside Monaco.
export const THEMES = {
  "dark-modern": {
    label: "Dark Modern",
    monacoBase: "vs-dark",
    appClass: "",
    rules: [],
    colors: {},
  },
  light: {
    label: "Light",
    monacoBase: "vs",
    appClass: "theme-light",
    rules: [],
    colors: {},
  },
  "high-contrast": {
    label: "High Contrast",
    monacoBase: "hc-black",
    appClass: "theme-hc",
    rules: [],
    colors: {},
  },
  "neon-green": {
    label: "Neon Green",
    monacoBase: "vs-dark",
    appClass: "theme-neon",
    rules: [{ token: "", foreground: "39ff14" }],
    colors: { "editor.background": "#0a0e0a", "editor.foreground": "#39ff14" },
  },
  monokai: {
    label: "Monokai",
    monacoBase: "vs-dark",
    appClass: "",
    rules: [
      { token: "comment", foreground: "88846f" },
      { token: "string", foreground: "e6db74" },
      { token: "keyword", foreground: "f92672" },
      { token: "number", foreground: "ae81ff" },
    ],
    colors: { "editor.background": "#272822", "editor.foreground": "#f8f8f2" },
  },
  dracula: {
    label: "Dracula",
    monacoBase: "vs-dark",
    appClass: "",
    rules: [
      { token: "comment", foreground: "6272a4" },
      { token: "string", foreground: "f1fa8c" },
      { token: "keyword", foreground: "ff79c6" },
      { token: "number", foreground: "bd93f9" },
    ],
    colors: { "editor.background": "#282a36", "editor.foreground": "#f8f8f2" },
  },
};

const STORAGE_KEY = "collab-editor-theme";

export const useThemeStore = create((set) => ({
  themeId: localStorage.getItem(STORAGE_KEY) || "dark-modern",

  setTheme(themeId) {
    if (!THEMES[themeId]) return;
    localStorage.setItem(STORAGE_KEY, themeId);
    set({ themeId });
  },
}));

export default useThemeStore;
