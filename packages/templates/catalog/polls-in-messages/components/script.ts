import type { Msg, PollProps, Vote } from "./chat";
import { rowH } from "./brand";

const PAST = -400; // already on screen when the scene opens

/** The trip chat, before the poll. Shared by scene 1 and scene 2. */
export const BASE = (ats: number[]): Msg[] => [
  {
    id: "m1",
    from: "maya",
    name: true,
    text: "ok so are we actually\ndoing this trip or not [eyes]",
    h: rowH(2, true),
    at: ats[0],
  },
  { id: "m2", from: "jordan", name: true, text: "im in. 8 days in april [plane]", h: rowH(1, true), at: ats[1] },
  {
    id: "m3",
    from: "priya",
    name: true,
    text: "WAIT YES [raise]",
    h: rowH(1, true),
    at: ats[2],
    reaction: { at: ats[2] + 34, kind: "like" },
  },
  {
    id: "m4",
    from: "sam",
    name: true,
    text: "somewhere with good\nfood pls [ramen]",
    h: rowH(2, true),
    at: ats[3],
  },
  { id: "m5", from: "me", text: "ok everyone drop your picks [down]", h: rowH(1, false), at: ats[4] },
];

export const SCENE1_MSGS: Msg[] = BASE([16, 40, 62, 84, 104]);

/* ---------------- scene 2: the poll beat ---------------- */

export const POLL_AT = 110;
export const OPTIONS_AT = 118;
export const PRESS_AT = 158;

export const VOTES: Vote[] = [
  { who: "me", opt: 0, at: 160 },
  { who: "tess", opt: 0, at: 178 },
  { who: "jordan", opt: 1, at: 190 },
  { who: "priya", opt: 2, at: 202 },
  { who: "sam", opt: 0, at: 214 },
];

export const POLL: PollProps = {
  question: "Where are we going?",
  options: ["Tokyo [jp]", "Lisbon [pt]", "Mexico City [mx]"],
  votes: VOTES,
  optionsAt: OPTIONS_AT,
  press: { at: PRESS_AT, opt: 0 },
};

export const SCENE2_MSGS: Msg[] = [
  ...BASE([PAST, PAST, PAST, PAST, PAST]).map((m) =>
    m.reaction ? { ...m, reaction: { ...m.reaction, at: PAST } } : m,
  ),
  { id: "m6", from: "tess", name: true, text: "tokyo. thats it\nthats the msg [tower]", h: rowH(2, true), at: 8 },
  { id: "m7", from: "jordan", name: true, text: "lisbon is cheaper tho [sob]", h: rowH(1, true), at: 30 },
  { id: "m8", from: "priya", name: true, text: "MEXICO CITY?? [taco]", h: rowH(1, true), at: 50 },
  { id: "m9", from: "maya", name: true, text: "everyone STOP.\npoll incoming [chart]", h: rowH(2, true), at: 70 },
  { id: "m10", from: "maya", kind: "typing", h: 112, at: 88, until: 106 },
  {
    id: "poll",
    from: "maya",
    kind: "poll",
    h: 522,
    at: POLL_AT,
    reaction: { at: 232, kind: "heart" },
  },
  { id: "m12", from: "priya", name: true, text: "TOKYO BABYYY [party]", h: rowH(1, true), at: 218 },
  { id: "m13", from: "me", text: "booking flights tonight [fire]", h: rowH(1, false), at: 244 },
];

/* ---------------- scene 3: the result ---------------- */

const settled = (v: Vote): Vote => ({ ...v, at: PAST });

export const POLL_DONE: PollProps = {
  ...POLL,
  votes: VOTES.map(settled),
  optionsAt: PAST,
  press: undefined,
  idPrefix: "result",
};

export const SCENE3_MSGS: Msg[] = [
  { id: "m6", from: "tess", name: true, text: "tokyo. thats it\nthats the msg [tower]", h: rowH(2, true), at: PAST },
  { id: "m7", from: "jordan", name: true, text: "lisbon is cheaper tho [sob]", h: rowH(1, true), at: PAST },
  { id: "m8", from: "priya", name: true, text: "MEXICO CITY?? [taco]", h: rowH(1, true), at: PAST },
  { id: "m9", from: "maya", name: true, text: "everyone STOP.\npoll incoming [chart]", h: rowH(2, true), at: PAST },
  {
    id: "poll",
    from: "maya",
    kind: "poll",
    h: 522,
    at: PAST,
    reaction: { at: PAST, kind: "heart" },
  },
  { id: "m12", from: "priya", name: true, text: "TOKYO BABYYY [party]", h: rowH(1, true), at: PAST },
  { id: "m13", from: "me", text: "booking flights tonight [fire]", h: rowH(1, false), at: PAST },
];
