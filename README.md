# Mengclick

A lightweight Chrome extension for automatic clicking in individual tabs. No dependencies or build step.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**, then choose the `extension/` folder. For a release ZIP, extract it first and select the extracted folder containing `manifest.json`.

## Use

1. Open a website and select the Mengclick extension.
2. Choose **Mouse** or **Element**, then set an interval of at least 1 second.
3. In mouse mode, select **Start clicking**, then move the cursor over the page if no position has been recorded yet. In element mode, select **Select an element**, then click the desired element on the page.
4. Reopen the extension to stop clicking. Each tab runs independently.

The popup shows the number of clicks and elapsed session time for the current tab. Both reset when a new clicking session starts. Use the reset icon in the session section to reset only the count without stopping. Elapsed time includes periods when a selected element is unavailable; it stops when clicking is stopped.

Changing the interval or mode stops clicking. Active sessions attempt to resume after refresh or navigation within the same hostname; navigation to a different hostname stops the session. Restoring an element depends on its selector matching the new page. The extension requests access to HTTP and HTTPS sites so it can resume after navigation.

## Limitations

Chrome can throttle timers in background tabs. Clicks are synthetic and may be ignored by some sites. Chrome internal pages and the Chrome Web Store cannot be used. A recreated element can only be found again if its generated selector still identifies it. Element selection and clicking do not support targets inside iframes or shadow roots. Mouse mode needs a known cursor position inside the page before its first click.

## Project structure

- `extension/` — unpacked Chrome extension and assets.
- `docs/` — project requirements and release notes template.
- `dist/` — generated release archives.

See [CONTEXT.md](docs/CONTEXT.md) for the agreed requirements and [RELEASE_TEMPLATE.md](docs/RELEASE_TEMPLATE.md) for release notes.

## Releasing

The GitHub Actions release workflow packages `extension/` and publishes a GitHub Release when a version tag such as `v1.0.0` is pushed. The tag must point to a commit already on `main` and match the version in `extension/manifest.json`. Merging into `main` alone does not create a release; push the version tag after merging. The workflow can also be run manually from the Actions tab with an existing tag after the workflow is on the default branch. It needs permission to write repository contents. Edit `docs/RELEASE_TEMPLATE.md` before tagging to customize the release notes.
