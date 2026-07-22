# Privacy Policy for Letterboxd Watchlist Notes

Last updated: July 22, 2026

Letterboxd Watchlist Notes is a Chrome extension that lets users attach personal notes to films in their Letterboxd watchlist. This policy explains what data the extension handles and how it is used.

## Data the extension handles

The extension handles only the Letterboxd data required to provide its note features:

- The signed-in Letterboxd username, read from Letterboxd's sign-in cookie.
- Film and list identifiers from Letterboxd pages.
- List-entry notes that the user reads, creates, or edits.
- The identifier of the Letterboxd list selected for notes.

The extension uses the browser's existing Letterboxd session when it reads or updates the selected list. It does not ask for, read, or store the user's Letterboxd password.

## How the data is used

The data is used only to:

- Identify the signed-in Letterboxd account and selected notes list.
- Load and display the correct note on Letterboxd film and watchlist pages.
- Save note changes to the user's selected Letterboxd list.

The extension does not use data for advertising, profiling, analytics, credit decisions, or any purpose unrelated to these features.

## Storage and retention

Notes are stored as list-entry notes in the Letterboxd list selected by the user. Their visibility follows the privacy setting of that Letterboxd list.

The selected list identifier and a temporary cache of the username and notes are stored in the browser's local storage. The extension treats the cache as expired after 24 hours and replaces it the next time notes are loaded. The cache is removed when the user changes the selected list or saves a note.

Users can remove a note through the extension, deselect the notes list from its Letterboxd list page, or clear Letterboxd's local site data in the browser. Notes stored in Letterboxd can also be edited or deleted through Letterboxd's list editor.

## Data sharing and transmission

The extension communicates only with `https://letterboxd.com` over HTTPS. Data is not sent to the extension developer, advertising networks, analytics services, or other third parties. The developer does not operate a server that receives extension data and cannot access users' notes or Letterboxd account information.

The extension's use of data is limited to its disclosed, user-facing note features and complies with the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Changes to this policy

This policy may be updated if the extension's functionality or data practices change. The latest version will be available at this URL with its revision date shown above.

## Contact

Questions or privacy requests can be submitted through the project's [GitHub issue tracker](https://github.com/LeonGeorgi/letterboxd-watchlist-notes/issues).
