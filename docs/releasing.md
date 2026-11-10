# Preparing a Daily Life release

From the repository root, run:

```sh
node scripts/prepare-release.mjs 20261110-shortlabel1 "One sentence describing the change."
```

The helper updates the app build identifier, `release.json`, and the service worker's offline asset list from the local scripts and stylesheets in `index.html`. Keep the label short, lowercase, and unique for that release. Review the three changed files, then commit and push using the repository's configured GitHub Pages publishing method.

The app update banner appears after a new service worker is ready. It waits for the user to tap **Reload now**, and the active cache stays in place if required core files fail to download.
