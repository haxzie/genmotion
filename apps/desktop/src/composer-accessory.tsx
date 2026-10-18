import { registerComposerAccessory } from "@/components/editor/chat-panel";
import { HarnessPicker } from "./harness-picker";
import { FolderAccess } from "./folder-access";
import { BrandPicker } from "./brand-picker";

/**
 * The desktop's controls in the composer's action row.
 *
 * All three answer the same question — what is running the turn, what it is
 * making this for, and what it can see — and none of them exists in the hosted
 * app, where there is no local harness and no filesystem to share.
 */
registerComposerAccessory(({ projectId }) => (
  <>
    <HarnessPicker placement="up" />
    <BrandPicker placement="up" projectId={projectId} />
    <FolderAccess hideWhenEmpty projectId={projectId} />
  </>
));
