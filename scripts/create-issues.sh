#!/usr/bin/env bash
# Seed a new site's backlog. Everything here is a task for the artist, phrased
# so they can hand it to Copilot or just do it themselves.
set -euo pipefail
REPO="${1:?usage: $0 <owner>/<repo>}"

issue() { gh issue create --repo "$REPO" --title "$1" --body "$2"; }

issue "Write your bio" \
"Edit \`content/_about/info.md\`. Fill in \`name\`, \`tagline\`, \`instagram\`
and \`email\`, then write a few paragraphs below the \`---\`.

Drop a portrait photo into the same folder and it appears on the about page."

issue "Upload your first series" \
"Make a folder in \`content/\` — the folder name becomes the project. Put your
AVIF images in it plus an \`info.md\` with \`title\`, \`year\` and \`summary\`.

Then delete \`content/welcome/\`, which is only there as an example."

issue "Pick your fonts and colours" \
"Open an issue describing the look you want and assign it to Copilot, or edit
\`app/globals.css\` directly. Don't touch \`app/projects/items/\` — it is
regenerated from \`content/\` on every build."

issue "Decide on a custom domain (optional)" \
"The site lives at the github.io address for free. A custom domain costs about
10 EUR a year and is set under Settings > Pages. Everything else stays free."
