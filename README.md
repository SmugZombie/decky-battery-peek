# Battery Peek

A lightweight Decky Loader starter plugin that places a tiny always-on-top battery overlay in the top corner while you play.

## What it does

- Reads battery data from `/sys/class/power_supply/BAT1`
- Draws a small floating pill with the battery indicator and percentage
- Keeps pointer events disabled so it should not interfere with gameplay input
- Includes a small Decky settings panel so you can toggle:
  - overlay on/off
  - percentage on/off
  - compact mode
  - top-left vs top-right

## Notes

This is meant as a starter project for you to test and tweak.

I was able to base the project layout on the official Decky plugin template repo structure and metadata, but this package is **not prebuilt here** because the build depends on Decky npm packages that are not available in this environment. The source is ready for you to build locally on the Steam Deck or another machine.

## Build

```bash
pnpm install
pnpm run build
```

After building, install it through Decky developer mode as a local plugin zip/folder depending on your workflow.

## Suggested tweaks

- bottom corner placement
- icon-only mode
- color changes at low battery thresholds
- optional charge-time / remaining-time display
- hide overlay while charging
- add a settings backend instead of localStorage
