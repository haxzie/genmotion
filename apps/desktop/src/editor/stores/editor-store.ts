"use client";

import { createContext, createElement, useContext, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

export interface FixRequest {
  sceneId: string;
  message: string;
}

/** An element the user picked from the preview inspector, as chat context. */
export interface ElementContext {
  id: string;
  label: string;
  tag: string;
  text: string;
  /** The DOM id of the targeted element (if the scene gave it one). */
  elementId: string | null;
  sceneId: string | null;
  sceneName: string;
  timecode: string;
}

/** One mark the user drew, as the chat describes it to the agent. */
export interface MarkupMarkContext {
  /** 1-based; matches the badge burned into the picture. */
  n: number;
  kind: "pen" | "rect";
  /** Composition pixels. */
  box: { left: number; top: number; width: number; height: number };
  /** What was under the mark, when the preview could tell. */
  elements: Pick<ElementContext, "elementId" | "tag" | "text">[];
}

/** A marked-up frame from the preview's Draw tool, as chat context. */
export interface MarkupContext {
  id: string;
  label: string;
  /** Project-relative path of the picture with the marks burned in. */
  path: string;
  width: number;
  height: number;
  sceneId: string | null;
  sceneName: string;
  timecode: string;
  marks: MarkupMarkContext[];
}

/** What the pointer does on the preview. */
export type PreviewTool = "select" | "draw";

interface EditorState {
  /** Select: pick elements to comment on. Draw: mark the frame up freehand. */
  previewTool: PreviewTool;
  setPreviewTool(tool: PreviewTool): void;
  selectedSceneIds: string[];
  /** Assets the user picked as chat context (mirrors scene selection). */
  selectedAssetIds: string[];
  /** Timeline audio clips the user picked as chat context. */
  selectedAudioClipIds: string[];
  /** Set while the AI is streaming a response; timeline edits are soft-locked. */
  aiBusy: boolean;
  setAiBusy(busy: boolean): void;
  /** Scenes the AI is actively editing this turn — shown shimmering in the timeline. */
  editingSceneIds: string[];
  setEditingSceneIds(ids: string[]): void;
  /** A pending "Fix with AI" request, consumed by the chat panel. */
  fixRequest: FixRequest | null;
  requestFix(request: FixRequest): void;
  consumeFixRequest(): FixRequest | null;
  /** A message composed outside the composer (the preview's comment bubble),
   *  sent by the chat panel with whatever context is attached at the time. */
  promptRequest: string | null;
  requestPrompt(text: string): void;
  consumePrompt(): string | null;
  /** Click: select only this scene. Shift-click: toggle it in the selection. */
  selectScene(id: string, additive?: boolean): void;
  deselectScene(id: string): void;
  clearSelection(): void;
  /** Clear BOTH scene and audio-clip selection (empty-area click on the track). */
  clearAllSelection(): void;
  /** Drop selections that no longer exist after scenes change. */
  pruneSelection(existingIds: string[]): void;
  /** Click: select only this asset. Shift-click: toggle it in the selection. */
  selectAsset(id: string, additive?: boolean): void;
  deselectAsset(id: string): void;
  clearAssetSelection(): void;
  /** Click: select only this audio clip. Shift-click: toggle it. */
  selectAudioClip(id: string, additive?: boolean): void;
  deselectAudioClip(id: string): void;
  clearAudioClipSelection(): void;
  /** Drop audio-clip selections that no longer exist after clips change. */
  pruneAudioClipSelection(existingIds: string[]): void;
  /** Elements picked from the preview inspector, attached as chat context. */
  selectedElements: ElementContext[];
  addElement(element: ElementContext): void;
  removeElement(id: string): void;
  clearElements(): void;
  /** Marked-up frames from the preview's Draw tool, attached as chat context. */
  selectedMarkups: MarkupContext[];
  addMarkup(markup: MarkupContext): void;
  removeMarkup(id: string): void;
  clearMarkups(): void;
}

/**
 * One editor's selection and chat-handoff state.
 *
 * A factory rather than a module-level store: every open project tab has its
 * own editor, and a single shared store would let a selection in one tab
 * drive a delete or a "fix with AI" in another. The provider below makes one
 * per tab; the hooks read whichever is nearest.
 */
export function createEditorStore(): StoreApi<EditorState> {
  return createStore<EditorState>((set, get) => ({
  previewTool: "select",
  setPreviewTool(previewTool) {
    set({ previewTool });
  },
  selectedSceneIds: [],
  selectedAssetIds: [],
  selectedAudioClipIds: [],
  aiBusy: false,
  setAiBusy(aiBusy) {
    set({ aiBusy });
  },
  editingSceneIds: [],
  setEditingSceneIds(ids) {
    set((state) => {
      // Skip the update (and re-render) when the set is unchanged.
      if (
        state.editingSceneIds.length === ids.length &&
        ids.every((id) => state.editingSceneIds.includes(id))
      ) {
        return state;
      }
      return { editingSceneIds: ids };
    });
  },
  fixRequest: null,
  requestFix(fixRequest) {
    set({ fixRequest });
  },
  consumeFixRequest() {
    const request = get().fixRequest;
    if (request) set({ fixRequest: null });
    return request;
  },
  promptRequest: null,
  requestPrompt(promptRequest) {
    set({ promptRequest });
  },
  consumePrompt() {
    const text = get().promptRequest;
    if (text) set({ promptRequest: null });
    return text;
  },
  selectScene(id, additive = false) {
    set((state) => {
      if (!additive) {
        // Plain click: select only this — but clicking the already-selected one
        // deselects it (toggle off).
        return {
          selectedSceneIds: state.selectedSceneIds.includes(id) ? [] : [id],
        };
      }
      return state.selectedSceneIds.includes(id)
        ? { selectedSceneIds: state.selectedSceneIds.filter((s) => s !== id) }
        : { selectedSceneIds: [...state.selectedSceneIds, id] };
    });
  },
  deselectScene(id) {
    set((state) => ({
      selectedSceneIds: state.selectedSceneIds.filter((s) => s !== id),
    }));
  },
  clearSelection() {
    set({ selectedSceneIds: [] });
  },
  clearAllSelection() {
    set({ selectedSceneIds: [], selectedAudioClipIds: [] });
  },
  pruneSelection(existingIds) {
    set((state) => ({
      selectedSceneIds: state.selectedSceneIds.filter((id) =>
        existingIds.includes(id),
      ),
    }));
  },
  selectAsset(id, additive = false) {
    set((state) => {
      if (!additive) return { selectedAssetIds: [id] };
      return state.selectedAssetIds.includes(id)
        ? { selectedAssetIds: state.selectedAssetIds.filter((a) => a !== id) }
        : { selectedAssetIds: [...state.selectedAssetIds, id] };
    });
  },
  deselectAsset(id) {
    set((state) => ({
      selectedAssetIds: state.selectedAssetIds.filter((a) => a !== id),
    }));
  },
  clearAssetSelection() {
    set({ selectedAssetIds: [] });
  },
  selectAudioClip(id, additive = false) {
    set((state) => {
      if (!additive) {
        // Plain click: select only this — clicking the already-selected one
        // deselects it (toggle off).
        return {
          selectedAudioClipIds: state.selectedAudioClipIds.includes(id)
            ? []
            : [id],
        };
      }
      return state.selectedAudioClipIds.includes(id)
        ? {
            selectedAudioClipIds: state.selectedAudioClipIds.filter(
              (a) => a !== id,
            ),
          }
        : { selectedAudioClipIds: [...state.selectedAudioClipIds, id] };
    });
  },
  deselectAudioClip(id) {
    set((state) => ({
      selectedAudioClipIds: state.selectedAudioClipIds.filter((a) => a !== id),
    }));
  },
  clearAudioClipSelection() {
    set({ selectedAudioClipIds: [] });
  },
  pruneAudioClipSelection(existingIds) {
    set((state) => ({
      selectedAudioClipIds: state.selectedAudioClipIds.filter((id) =>
        existingIds.includes(id),
      ),
    }));
  },
  selectedElements: [],
  addElement(element) {
    set((state) => ({ selectedElements: [...state.selectedElements, element] }));
  },
  removeElement(id) {
    set((state) => ({
      selectedElements: state.selectedElements.filter((e) => e.id !== id),
    }));
  },
  clearElements() {
    set({ selectedElements: [] });
  },
  selectedMarkups: [],
  addMarkup(markup) {
    set((state) => ({ selectedMarkups: [...state.selectedMarkups, markup] }));
  },
  removeMarkup(id) {
    set((state) => ({
      selectedMarkups: state.selectedMarkups.filter((m) => m.id !== id),
    }));
  },
  clearMarkups() {
    set({ selectedMarkups: [] });
  },
  }));
}

export type EditorStoreApi = StoreApi<EditorState>;

const EditorStoreContext = createContext<EditorStoreApi | null>(null);

export function EditorStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createEditorStore);
  return createElement(EditorStoreContext.Provider, { value: store }, children);
}

/**
 * The tab's store itself, for imperative reads (`getState()`) inside event
 * handlers and effects. Deliberately the only way to get one — a static
 * `.getState` on the hook would silently read a store that is nobody's tab.
 */
export function useEditorStoreApi(): EditorStoreApi {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStore must be used inside an EditorStoreProvider");
  return store;
}

export function useEditorStore<T>(selector: (state: EditorState) => T): T {
  return useStore(useEditorStoreApi(), selector);
}
