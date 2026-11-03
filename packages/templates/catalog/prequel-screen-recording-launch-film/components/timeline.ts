/**
 * Every timed event in the film, in one place, so the picture and the score
 * can never drift apart: every audio clip in project.json is cut to a frame
 * named here, so retiming a beat means moving its clip too.
 * Frames are local to each scene.
 */

export const FPS = 30;


/* ------------------------------------------- Demo film, scene 1: the ping */

export const PING_T = {
  length: 150,
  wake: [0, 14],        // the desktop surfaces out of black
  notify: 22,           // chime + the Slack banner slides in from the right edge
  push: [36, 104],      // the camera leans in until the message fills the frame
  cursor: [
    [0, 560, 600],       // idle, mid-desktop
    [20, 610, 560],
    [44, 640, 520],     // freezes when the banner lands
    [96, 0, 0],          // arrives at the start of "quick" (resolved in the scene)
  ] as [number, number, number][],
  mouseDown: 102,
  drag: [104, 116],     // selects the word "quick"
  release: 118,
};

/* ------------------------------------------- Demo film, scene 2: take one */

export const TAKE_T = {
  length: 210,
  // shot A: the capture toolbar; the cursor clicks Record
  a: { start: 0, end: 40, click: 30 },
  // shot B: the menu bar; the recording runs, Slack pings into the take, stop
  b: { start: 40, end: 124, ping: 62, click: 112, secondsEvery: 7 },
  // shot C: the thumbnail; dragged into the Trash
  c: { start: 124, end: 210, thumbIn: 128, grab: 146, drag: [150, 182], drop: 184 },
};

/* ------------------------------------------- Demo film, scene 3: again */

/** typing-rename-v3.wav is placed 12 frames in, so its first key lands on the shot's 3rd frame */
export const V3_TRIM = 12;

const AGAIN_SLOW = [
  { kind: "audio", start: 0, end: 40, click: 32, count: 2 },
  { kind: "erase", start: 40, end: 74, click: 66, count: 3 },
  { kind: "rename-v3", start: 74, end: 136, click: 128, count: 4 },
] as { kind: string; start: number; end: number; click: number; count: number }[];

const AGAIN_RAPID_LENGTHS = [8, 7, 6, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2];
const AGAIN_KINDS = ["record", "trash", "audio", "erase", "rename", "record", "erase", "trash", "audio"];
const againRapid: { kind: string; start: number; end: number; count: number }[] = [];
{
  let f = 136;
  AGAIN_RAPID_LENGTHS.forEach((len, i) => {
    againRapid.push({ kind: AGAIN_KINDS[i % AGAIN_KINDS.length]!, start: f, end: f + len, count: 5 + Math.round(Math.pow(i / (AGAIN_RAPID_LENGTHS.length - 1), 1.6) * 31) });
    f += len;
  });
}
const RAPID_END = againRapid[againRapid.length - 1]!.end;

export const AGAIN_T = {
  slow: AGAIN_SLOW,
  rapid: againRapid,
  /** the last rename: typed tired, with slips (typing-rename-final-2.wav starts here) */
  final: { start: RAPID_END, typeAt: RAPID_END + 8, enter: RAPID_END + 8 + 140, count: 37 },
  length: RAPID_END + 8 + 140 + 22,
};

/* ------------------------------------------- Demo film, scene 4: the edit */

export const EDIT_T = {
  length: 300,
  scrub: { start: 0, end: 70 },                              // dragging the playhead back and forth
  razor: { start: 70, end: 128, cuts: [84, 98, 112] },       // three cuts in the clip
  move: { start: 128, end: 180, grab: 140, drop: 168 },      // a clip lifted onto V2
  hours: { start: 180, lengths: [9, 7, 6, 5, 4, 3, 3] },     // the evening goes in cuts
  export: { start: 217, tick: [228, 250, 268, 284] },        // 99%, and the time remaining grows
};

/* ------------------------------------------- Demo film, scene 5: sent */

export const SENT_T = {
  length: 214,
  typeAt: 4,              // typing-slack-reply.wav starts here; its first key lands at +3
  enter: 84,              // sent
  rise: 10,               // the message slides up into the feed
  liftCam: [88, 132],     // camera rises from the composer to the message
  typing: [112, 140],     // "Maya Chen is typing…"
  reply: 142,             // the reply lands (knock)
  unfurl: 150,            // the link preview unfurls under it
  toCard: [146, 192],     // camera settles on the preview
  cursorIn: 168,
  click: 204,             // on https://prequel.sh
};

/* ------------------------------------------ Demo film, scene 6: prequel.sh */

export const SITE_T = {
  length: 190,
  push: [4, 74],          // from the headline down to "Download for Mac"
  click: 80,
  bubble: 90,             // Chrome's download bubble drops in
  progress: [94, 140],
  done: 142,
  toBubble: [96, 136],    // camera follows the download up to the toolbar
  open: 172,              // the cursor opens Prequel.dmg
};

/* -------------------------------------- Demo film, scene 7: record with Prequel */

export const REC_T = {
  length: 262,
  barIn: 4,               // Prequel's toolbar rises above the dock
  clickWindow: 40,        // window mode
  toWindow: [48, 96],     // camera pulls back to the Finder window
  hover: 80,              // the picker lights the window up
  push: [100, 132],       // in on Start recording
  start: 128,             // click: recording
  camIn: 136,             // the camera bubble pops up, bottom right
  camFrom: 3.0,           // seconds into the webcam take it starts at: as he turns to the lens
  toCam: [138, 162],      // a quick pan to it
  toPanel: [194, 222],    // a short look, then across to the recording panel
  stop: 232,              // click stop
};

/* -------------------------------------- Demo film, scene 8: the Prequel editor */

export const EDITOR_T = {
  length: 372,
  open: [0, 14],          // the editor window opens on the take
  toPreview: [14, 40],    // camera into the preview
  clickCam: 56,           // select the camera
  move: [60, 100],        // drag it to the top-left corner
  resize: [120, 140],     // pull the bottom-right handle out
  toPanel: [146, 178],    // camera across to the rail and panel
  clickBg: 172,           // the Background tool
  pick: 198,              // an Aurora wallpaper
  pullBack: [204, 236],   // wide: the new background reads
  clickExport: 258,       // the green Export
  modal: 262,             // the modal opens
  toModal: [268, 298],
  exportBtn: 300,         // the modal's Export: becomes the progress bar
  progress: [302, 344],   // fast
  toBtn: [300, 330],
};
