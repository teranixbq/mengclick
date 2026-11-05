# Project context: Mengclick

## Goal

Build a Chrome extension that automatically clicks on web pages, including while the user switches to another tab or desktop. This document records the agreed requirements, not a guarantee that every behavior is supported by every website or Chrome version.

## Per-tab behavior

- Clicks occur only in the tab where the feature was started; the currently visible tab or desktop does not automatically become the target.
- Multiple tabs may run automatic clicking concurrently, each with its own state and settings.
- No **Only this tab** setting is needed: per-tab behavior is the default.
- Clicking continues until stopped or a reset condition occurs.

## Mouse mode

- Clicking follows the cursor position known within the target tab.
- When the user switches tabs or desktops, clicking continues at the last known coordinates in the target tab.
- When the cursor moves within the target tab again, the target follows it.
- The first click occurs immediately when the user presses Start.

## Element mode

- The user selects an element directly on the page with the mouse.
- Upon selection, the element is marked, clicked once, and automatic clicking starts immediately. The user does not need to press Start again after selecting it.
- Subsequent clicks follow the element if it moves, rather than remaining at the original coordinates.
- If the element disappears, clicking pauses. If the same element reappears, clicking resumes automatically while the feature remains active.

## Interval and controls

- The interval is specified in seconds, with a minimum of **1 second**.
- Changing the interval while clicking is running stops the process. The user must start it again for the new interval to take effect.
- The user can stop automatic clicking.

## Session statistics

- Show the click count and elapsed time for each tab's current session.
- Starting a new session resets both statistics. Stopping freezes elapsed time; time spent waiting for a missing element is included.
- The reset icon clears the click count without stopping the session or resetting elapsed time.

## Visual effects

- Both modes display a click effect and colored sparks at the clicked point.

## Reset

- Active sessions resume after refresh or navigation within the same hostname, subject to element availability.
- Navigating to a different hostname stops and resets the process for that tab.
- Closing the tab ends its process.

## Technical limitations to verify

- Chrome may throttle timers in background tabs; intervals may not be precise.
- Extension-generated clicks are synthetic. Some websites may ignore them or require genuine user interaction.
- The extension cannot continuously read the cursor position in another tab or on the desktop; mouse mode uses the last known position in the target tab.
- Finding an element again after it is recreated depends on available, stable element identifiers; success cannot always be guaranteed.
- Visual effects are visible only when the target page is visible.

## Status

Initial implementation created. See README.md for installation, usage, and current limitations.
