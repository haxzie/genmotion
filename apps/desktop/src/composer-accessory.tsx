import { registerComposerAccessory } from "@/components/editor/chat-panel";
import { HarnessPicker } from "./harness-picker";
import { FolderAccess } from "./folder-access";

/**
 * The desktop's controls in the composer's action row.
 *
 * Both answer the same question — what is running the turn, and what it can
 * see — and neither exists in the hosted app, where there is no local harness
 * and no filesystem to share.
 */
registerComposerAccessory(() => (
  <>
    <HarnessPicker placement="up" />
    <FolderAccess hideWhenEmpty />
  </>
));
