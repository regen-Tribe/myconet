---
bump: minor
title: An explorer's Dashboard says what the portal holds, and pages stop sliding sideways on phones
public:
  - Before you join, your Dashboard first says what this portal is and what you'll find in it (Members, Calendar, The space, and working together once you've joined), then the two steps to join. It fits one phone screen.
  - On a phone, pages no longer slide sideways when you scroll.
---
Sonia, testing on her phone (27 Nov): "this gives little background to what the protopia portal is - we should say what
people can find here, also always make sure we fit in one screen"; "on mobile when i scroll the margin goes to the right
so it is not mobile optimized"; "that goes for all screens - it scrolls to the sides".

- **Explorer's Dashboard card** (`m00-dashboard/DashboardV4.tsx`, styles in `m05-join/join-review.css`): the card opens
  with "<community>'s portal", one line on what it's for (the visitor Welcome's words), then four tiles: Members,
  Calendar, The space (links) and Work together ("Tasks and decisions, once you've joined", greyed). Below them,
  "Join in two short steps" and the steps; on a phone the steps show their titles only. The "Or look around first" line
  is gone (the tiles replace it), and the greeting is one line while this card shows. At 390×660 (an iPhone with
  Safari's bars) the whole card sits above the bottom tab bar. Decision #104.
- **No sideways panning on phones** (`app/globals.css`): every page scrolls inside `main.v4-main`, whose
  `overflow-y: auto` made it a scroller both ways, so on iPhone Safari a slightly diagonal swipe dragged the page
  sideways. Under 640px it now scrolls vertically only (`overflow-x: hidden`, `overscroll-behavior-x: none`), the
  root clips sideways too, and chip rows and strips keep their sideways swipe to themselves.
- **Start joining's steps** (`join-review.css`): the step's own scroll area also scrolled sideways, because the bottom
  bar reached 16px past it on each side. That area is vertical-only now and the bar stays inside it.

No migration.
