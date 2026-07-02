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
}

export const useEditorStore = create<EditorState>((set, get) => ({
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
}));
