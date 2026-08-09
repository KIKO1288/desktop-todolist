---
name: "桌面清单"
description: "A quiet architect's punch list that lives on the Windows desktop."
colors:
  board: "#315c51"
  board-dark: "#24483f"
  paper: "#e9e2d3"
  paper-ink: "#24221f"
  paper-muted: "#5f594f"
  rule: "rgba(36, 34, 31, 0.3)"
  accent: "#98452c"
typography:
  title:
    fontFamily: "Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "clamp(23px, 7vw, 30px)"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "0.08em"
  body:
    fontFamily: "Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
  handwritten-progress:
    fontFamily: "Segoe Print, KaiTi, cursive"
    fontSize: "clamp(27px, 8vw, 38px)"
    fontWeight: 400
    lineHeight: 1
  error:
    fontFamily: "Microsoft YaHei UI, PingFang SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  square: "1px"
  clip: "7px 7px 3px 3px"
  arch: "15px 15px 0 0"
  round: "50%"
spacing:
  tight: "8px"
  edge: "14px"
  paper-gutter: "28px"
  control-column: "34px"
  clip-clearance: "42px"
  row: "52px"
components:
  paper-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    padding: "52px 28px 0"
  metal-clip:
    backgroundColor: "#777974"
    textColor: "{colors.board-dark}"
    rounded: "{rounded.clip}"
    height: "50px"
    width: "174px"
  window-close:
    backgroundColor: "transparent"
    textColor: "rgba(237, 231, 217, 0.82)"
    rounded: "{rounded.round}"
    size: "34px"
  add-field:
    backgroundColor: "transparent"
    textColor: "{colors.paper-ink}"
    typography: "{typography.body}"
    height: "48px"
    padding: "0"
  add-action:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.body}"
    padding: "7px 2px 7px 10px"
  task-checkbox:
    backgroundColor: "transparent"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.square}"
    size: "22px"
  task-row:
    backgroundColor: "transparent"
    textColor: "{colors.paper-ink}"
    typography: "{typography.body}"
    height: "52px"
    padding: "14px 8px 14px 0"
  task-row-completed:
    backgroundColor: "transparent"
    textColor: "{colors.paper-muted}"
    typography: "{typography.body}"
    height: "46px"
    padding: "14px 8px 14px 0"
  archive-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.body}"
    height: "62px"
    padding: "0 22px"
  layer-status:
    backgroundColor: "transparent"
    textColor: "{colors.board}"
    rounded: "{rounded.round}"
    size: "30px"
---

# Design System: 桌面清单

## Overview

**Creative North Star: "The Architect's Punch List"**

桌面清单 behaves like a small physical work board fixed to the Windows desktop: a gray-green clipboard frames one warm, fibrous sheet, and graphite rules turn every task into a field item waiting to be closed. The system is quiet, compact, and materially specific; it refuses the generic yellow sticky-note card.

Interaction marks feel written or stamped onto the sheet. Square checks close work, muted brick indicates action and completion, and the centered metal clip is both the visual anchor and the real drag grip.

**Key Characteristics:**

- Gray-green board framing a warm paper work surface.
- Graphite rules and square task controls optimized for scanning.
- Muted brick marks reserved for writing, completion, and recovery states.
- Physical depth from inset board edges, a lifted sheet, and a functional metal clip.
- Compact, keyboard-first operation without decorative chrome.

## Colors

The palette reads as workshop stationery: desaturated clipboard greens, aged paper neutrals, graphite ink, and one restrained brick marking color.

### Primary

- **Clipboard Green:** Owns the outer board, successful desktop attachment dot, and completed check mark.
- **Deep Clipboard Green:** Deepens apertures and the board's structural edge.

### Secondary

- **Muted Brick:** Marks the add action, archive stamp, focus, deletion warning, and attachment failure.

### Neutral

- **Warm Form Paper:** Carries all task content and receives the fibrous texture overlay.
- **Graphite Ink:** Provides primary text and square control strokes.
- **Soft Graphite:** Handles dates, placeholders, secondary copy, and completed task text.
- **Graphite Rule:** Divides writable rows without becoming a container border.

### Named Rules

**The Brick Is a Mark Rule.** Use muted brick only where a person would write, stamp, focus, or flag a problem; it is never a broad surface fill.

**The Paper Owns Content Rule.** Content controls remain transparent so the warm sheet and its ruled structure stay continuous.

## Typography

**Display Font:** Microsoft YaHei UI (with PingFang SC, Noto Sans CJK SC, system-ui, sans-serif fallbacks)  
**Body Font:** Microsoft YaHei UI (with PingFang SC, Noto Sans CJK SC, system-ui, sans-serif fallbacks)  
**Handwritten Font:** Segoe Print (with KaiTi and cursive fallbacks)

**Character:** The interface uses a sturdy native CJK sans for legibility and one deliberately imperfect handwritten fraction for human progress. Letterspacing on the title and date recalls labeled form stationery without turning the task list into display typography.

### Hierarchy

- **Title:** Heavy, centered, and tracked; used only for the product name.
- **Handwritten Progress:** Large, slightly rotated, and isolated between the heading and add line.
- **Body:** Regular-weight task text with a relaxed row line height and unrestricted wrapping for local task content.
- **Label:** Small, tracked date and supporting copy.
- **Error:** Compact explanatory copy placed directly beneath the add line.

### Named Rules

**The Handwritten Count Rule.** Reserve the handwritten face for the completed-over-total fraction; every actionable label and task remains in the native sans stack.

## Layout

The window is a single centered clipboard, 420 × 640px by default, resizable from 340 × 480px to 720 × 960px. A persistent board frame surrounds a full-height paper grid: heading, progress, add line, validation, scrollable active work, and bottom archive. The paper uses a 28px horizontal gutter, while task rows align to a 34px control column and a 30px trailing action column.

At heights of 560px or less, vertical clearances contract: the paper top padding drops to 44px, heading to 52px, progress to 38px, task rows to 46px, and archive toggle to 52px. Horizontal hierarchy does not rearrange.

**The Board Always Frames the Paper Rule.** Preserve a visible clipboard edge at every supported window size; the paper never becomes a full-bleed generic app canvas.

## Elevation & Depth

Depth is structural, not atmospheric decoration. The clipboard has two inset edge rings (`inset 0 0 0 2px rgba(16, 36, 31, 0.45), inset 0 0 0 5px rgba(255, 255, 255, 0.06)`), the paper lifts with `0 6px 18px rgba(15, 31, 27, 0.38)`, and the metal clip projects with `0 5px 8px rgba(21, 29, 26, 0.35)` plus a narrow top highlight.

### Shadow Vocabulary

- **Board Edge:** Paired inset rings communicate a thick molded board.
- **Paper Lift:** One dark, close shadow separates the sheet from the board.
- **Metal Structure:** A compact cast shadow and inset highlight give the drag grip physical weight.
- **Status Halo:** A 3px low-opacity ring makes the tiny desktop attachment state legible without adding a badge.

### Named Rules

**The Physical Depth Rule.** Shadows explain which physical layer sits above another; they never float ordinary rows, buttons, or labels.

## Shapes

The system contrasts almost-square work geometry with circular indicators. Task checks use a 1px corner, ruled rows are straight, and the paper itself has no rounded-card treatment. Circles are reserved for the window close affordance, desktop status, and stamped archive seal. The metal clip alone combines softened top corners, a shallow lower radius, and a raised arch.

**The Square Work Rule.** Tasks and writing surfaces stay rectilinear; round forms signal status, stamping, or window chrome rather than content containers.

## Components

### Metal Drag Clip

- **Shape:** A 174 × 50px centered steel plate with asymmetric softened corners, a raised arch, screw aperture, and horizontal grip scoring.
- **Color:** A four-stop gray metal gradient bordered in dark graphite.
- **Behavior:** Occupies the draggable window region; interactive controls explicitly opt out of dragging.

### Add Field

- **Style:** A 48px ruled row with a brick plus mark, transparent input, and right-aligned text action.
- **State:** The add action begins hidden and slides into place on focus or when text is present.
- **Focus / Error:** Focus uses the shared brick 2px outline; an empty submission places a dark-brick 12px message beneath the rule.

### Task Row

- **Shape:** A minimum 52px ruled row with square check, wrapping task copy, and circular delete affordance.
- **State:** New rows reveal left to right over 220ms. Delete stays hidden until row hover or keyboard focus.
- **Completed:** Completed rows contract to 46px, soften to secondary graphite, and receive a brick strike-through inside the archive.

### Archive Toggle

- **Style:** A full-width brick control on a slightly darker paper band, with circular stamp, count, and trailing chevron.
- **State:** The chevron rotates 180 degrees over 180ms when expanded; disclosure state and completed content persist locally.

### Desktop Attachment Status

- **Style:** A 30px transparent circular target containing a 7px clipboard-green dot with a quiet halo.
- **Error:** The dot and adjacent exclamation switch to brick; clicking retries desktop attachment.

### Window Close

- **Style:** A 34px transparent circular button in the board frame.
- **Hover / Focus:** Hover darkens the board behind the glyph; keyboard focus receives the shared brick outline.

## Do's and Don'ts

### Do:

- **Do** keep controls transparent wherever they sit on the paper so rules and texture remain continuous.
- **Do** align task content to the established square-check, text, and trailing-action columns.
- **Do** use brick for written action, completion, focus, destructive feedback, and attachment recovery.
- **Do** keep the metal clip centered, visible, and functional as the drag grip.
- **Do** reduce motion to effectively zero when the user requests reduced motion.

### Don't:

- **Don't** turn the interface into a yellow sticky note, generic rounded card, or conventional dashboard panel.
- **Don't** round task checks, rows, the paper sheet, or content containers into soft pills.
- **Don't** add shadows to ordinary task rows, text buttons, or the archive disclosure.
- **Don't** use the handwritten face for task text, dates, labels, or errors.
- **Don't** promote brick into a large background or decorative accent wash.
