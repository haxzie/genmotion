import { BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from "electron";
import { IPC, type TabCommand } from "./shared";
import { activeSession } from "./session-registry";
import { WEB_URL } from "./auth";

/**
 * The application menu — Electron's defaults, plus the tab shortcuts.
 *
 * Shortcuts live here rather than in a renderer key listener because the
 * code view's editor swallows keys before a `window` listener sees them, and
 * because ⌘W has to mean two different things: close the tab in front, or —
 * on the Home tab, where there is nothing to close — the window, as it always
 * did.
 */
export function installMenu(getWindow: () => BrowserWindow | null): void {
  const isMac = process.platform === "darwin";

  const send = (command: TabCommand) => {
    const window = getWindow();
    if (!window || window.isDestroyed()) return;
    window.webContents.send(IPC.tabCommand, command);
  };

  const selectTab: MenuItemConstructorOptions[] = Array.from({ length: 9 }, (_, i) => ({
    label: i === 0 ? "Home" : i === 8 ? "Last Tab" : `Tab ${i + 1}`,
    accelerator: `CmdOrCtrl+${i + 1}`,
    click: () => send({ select: i + 1 }),
  }));

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: "appMenu" } as MenuItemConstructorOptions] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Close Tab",
          accelerator: "CmdOrCtrl+W",
          click: () => {
            // Nothing to close on Home: fall back to closing the window.
            if (activeSession()) send("close");
            else getWindow()?.close();
          },
        },
        { type: "separator" },
        isMac ? { role: "close", label: "Close Window", accelerator: "Shift+CmdOrCtrl+W" } : { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    {
      label: "Tabs",
      submenu: [
        { label: "Next Tab", accelerator: "Control+Tab", click: () => send("next") },
        { label: "Previous Tab", accelerator: "Control+Shift+Tab", click: () => send("prev") },
        { type: "separator" },
        ...selectTab,
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [{ label: "GenMotion Website", click: () => void shell.openExternal(WEB_URL) }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
