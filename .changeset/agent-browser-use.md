---
"@genmotion/desktop": minor
---

The agent can use a browser. It opens a real page, looks at it, clicks through
it, and photographs it: `browse_page` returns a site's visible text with a
screenshot of how it actually renders, `browse_act` clicks, types and scrolls
(past a cookie banner, onto the pricing page), `browse_capture` saves a
screenshot — of the whole page or of one element — into `assets/` as usable
footage, and `browse_inspect` reads the page's exact colours, typefaces and
logo files from its own stylesheets, so a video branded off a site gets the
real hex rather than one eyedropped out of a picture.

The editor has a Browser tab: watch the page the agent is on, live, with a dot
on the tab when it is looking at something while you are on another view. It
paints the moment you open it, keeps the last page on screen after the agent's
browser idles out, and stays open as long as you are watching.

The Browser tab is a browser: a tab strip, back/forward/reload and an address
bar, and **Take control** hands it your mouse and keyboard. That is how you
sign in to a service on the agent's behalf — GenMotion never sees the
password, and the session is kept in one profile shared by every project, with
a panel listing what is saved and a button to forget it.

The page in the Browser tab is laid out at the size of the panel, so it fills
it instead of sitting letterboxed inside it, and it re-lays out as you resize.

The agent can ask for the browser back. `request_takeover` puts a card in the
chat with a picture of the page and a Take over button: pressing it opens the
Browser tab with your mouse and keyboard wired to the page, and the agent waits
until you say you are done. Scrolling the page no longer needs you to take
control first.

Typing in the Browser tab works properly: punctuation types itself (a full
stop was being sent as Delete), accented characters are inserted, and the
editor's own shortcuts no longer swallow Space, the arrow keys or Delete while
you are driving a page.

