# Belgium Brief — GitHub Pages upload

This folder contains only the static website and its prepared news data.

## Publish

1. Create a new GitHub repository for Belgium Brief.
2. Upload the contents of this folder to the repository's root (the files themselves, not an extra enclosing folder).
3. In the repository, open **Settings → Pages** and choose deployment from the `main` branch and `/ (root)`.
4. Wait for GitHub Pages to finish deployment, then open the URL shown on the Pages settings screen.

The included `news.json` is a snapshot of the latest prepared briefing. GitHub Pages serves these files but does not run the local news collector or translator. To update stories, run `Start Belgium Brief.bat` in the original project folder; it refreshes `GitHub Upload/news.json` too. Then upload that one file to the repository root using **Add file → Upload files** and commit the update.

## Social sharing thumbnail

The site includes `og-image.png` and Open Graph/Twitter card tags. The metadata is configured for `https://deepakmainframe.github.io/belgium-brief/`. Social platforms need an absolute image URL to fetch the preview reliably. After updating the repository with these files, share the live homepage URL.

The local Python environments, translation models, setup scripts, server scripts, and project notes are intentionally not included.

