# TextEditor

A local-first desktop writing application for authors. Built with Electron, React, TypeScript, TipTap, and SQLite.

## Features

- **Book Projects** — Each project is a portable SQLite `.db` file you can save anywhere
- **Manuscript** — Chapters and scenes with drag-and-drop reordering
- **Wiki** — Characters, locations, and lore entries with rich metadata
- **Rich Text Editor** — TipTap with entity mentions, autosave, and export
- **100% Offline** — No accounts, no cloud, no telemetry

## Tech Stack

- Electron + React + TypeScript
- TipTap (rich text)
- SQLite via better-sqlite3
- Tailwind CSS + shadcn/ui
- dnd-kit (drag and drop)
- Zustand (state management)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run dist        # Mac + Windows
npm run dist:mac    # macOS only
npm run dist:win    # Windows only
```

## License

MIT
