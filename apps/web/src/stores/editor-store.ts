"use client";

import { create } from "zustand";

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

interface EditorState {
  selectedSceneIds: string[];
  /** Assets the user picked as chat context (mirrors scene selection). */
  selectedAssetIds: string[];
  /** Set while the AI is streaming a response; timeline edits are soft-locked. */
  aiBusy: boolean;
  setAiBusy(busy: boolean): void;
  /** A pending "Fix with AI" request, consumed by the chat panel. */
  fixRequest: FixRequest | null;
  requestFix(request: FixRequest): void;
  consumeFixRequest(): FixRequest | null;
  /** Click: select only this scene. Shift-click: toggle it in the selection. */
  selectScene(id: string, additive?: boolean): void;
  deselectScene(id: string): void;
  clearSelection(): void;
  /** Drop selections that no longer exist after scenes change. */
  pruneSelection(existingIds: string[]): void;
  /** Click: select only this asset. Shift-click: toggle it in the selection. */
  selectAsset(id: string, additive?: boolean): void;
  deselectAsset(id: string): void;
  clearAssetSelection(): void;
  /** Elements picked from the preview inspector, attached as chat context. */
  selectedElements: ElementContext[];
  addElement(element: ElementContext): void;
  removeElement(id: string): void;
  clearElements(): void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedSceneIds: [],
  selectedAssetIds: [],
  aiBusy: false,
  setAiBusy(aiBusy) {
    set({ aiBusy });
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
  selectScene(id, additive = false) {
    set((state) => {
      if (!additive) return { selectedSceneIds: [id] };
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
}));
