# Letterboxd Watchlist Notes

A Chrome extension for attaching personal notes to films in your Letterboxd watchlist. Notes are stored as list-entry notes in a Letterboxd list, so they remain part of your Letterboxd account instead of being sent to a separate service.

## Features

- Select any Letterboxd list as the note list.
- Read and edit a film's note directly from its film page.
- See notes at a glance on watchlist posters without blocking Letterboxd's native hover controls.
- Preserve line breaks in saved notes.
- Cache notes locally for up to 24 hours and invalidate the cache after changes.

## Local installation

Requirements: Node.js 22.13 or newer and pnpm 11.15.1.

1. Install dependencies with `pnpm install`.
2. Build the extension with `pnpm build`.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Choose **Load unpacked** and select this project directory.

After changing the source, run `pnpm dev`, then reload the extension from `chrome://extensions` and refresh the Letterboxd page.

## Usage

1. Create a Letterboxd list for your notes. A private list works well.
2. Open that list and choose **Use for watchlist notes** in the list actions.
3. Add a film to your watchlist.
4. Open the film page to add or edit its note.

The extension reads the signed-in Letterboxd username from Letterboxd's own session cookie. It communicates only with `letterboxd.com` and does not require separate login credentials.

See the [privacy policy](PRIVACY.md) for details about the data handled by the extension.

## Development

```sh
pnpm check
```

The check command verifies formatting, runs ESLint and TypeScript, executes the test suite, and creates a production build. Individual commands are also available:

- `pnpm format`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

The content script routes pages by responsibility:

- `src/film` mounts the film-page note editor.
- `src/list` mounts the note-list selector.
- `src/watchlist` renders read-only note cards on watchlist posters.
- `src/util/storage.ts` handles Letterboxd list parsing and API requests.
- `src/util/notes-store.ts` owns local configuration and cache persistence.

Letterboxd does not provide a public API for this workflow. DOM selectors and list request handling are covered by tests, but may need updates when Letterboxd changes its markup or private API.
