# Bar chart

**Best for:** quantitative comparison across categories. The dumbbell variant is
here too, for when the change is the story.

## Layout

- **Bars grow from the baseline**, in the order the story needs rather than
  alphabetically. A bar's length is its value, so a bar that fades in at full
  length has told you the answer before the eye arrives.
- **Every bar carries its number** via `value()`. Nobody pauses a video to
  measure a bar against a gridline.
- **One accent bar.** The others are `muted`. If two bars deserve accent, the
  chart has two subjects and should be two charts.
- Category names in the mono below the baseline, the accent one picked out.
- Grid rules at 6% ink, or none. The numbers on the bars do the work the grid
  would have done.

## The dumbbell variant

Two dots and the line between them: before as a pale `ink` dot, after as the
bar or a solid dot, with a 2px connector. Use it when the delta is the point and
the absolute values are only context. Reveal the link, then the before dot, then
grow the after bar, so the gap opens on screen.

## Budget

Eight bars. Four is usually better.

## The reveal

Axis, category names, then the bars 8 frames apart, then the numbers. Growing
the bars in sequence is what makes it a comparison rather than a block.

## Anti-patterns

- A y axis starting anywhere but zero.
- Bars in alphabetical order when the ranking is the finding.
- Horizontal bars for short category names: that is a Gantt layout with no time.
