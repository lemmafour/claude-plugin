# Lemmafour

Lemmafour typesets Markdown with LaTeX math, tables and code into print-quality,
accessible PDFs: worksheets and quizzes with answer keys, reports, papers, lecture notes,
resumes and letters. Ask Claude for a document as a PDF and Lemmafour sets it with real
math typography, tagged for screen readers.

This plugin has two parts:

- **The Lemmafour connector** (`.mcp.json`, `https://mcp.lemmafour.com/mcp`): the
  `render_pdf` tool shows the PDF in the chat with a Download button, and
  `validate_accessibility` checks a document against PDF/UA-1.
- **The `lemmafour-publish` skill**: how to write Markdown that renders right (math,
  questions and answer keys, layout settings, accessibility), and a small Node script,
  `skills/lemmafour-publish/scripts/lemmafour.mjs`, that agents which can run commands use
  when the connector is not connected.

## Use it

Ask for what you need, for example: "Make a one-page fractions worksheet with an answer
key at the end", or "Turn these notes into a two-column handout as a PDF". Claude writes
the Markdown and Lemmafour makes the PDF. Ask for changes and Claude makes a new version.

Free templates and settings work without an account. Some templates, themes and the
accessible and archival PDF profiles need a Lemmafour Day Pass or Pro plan: the preview
is free, and the connector asks you to sign in to Lemmafour when you download. Plans:
https://lemmafour.com/pricing

## Data

- **What is sent:** the Markdown document Claude writes, the settings, and any images the
  document uses, to Lemmafour at `mcp.lemmafour.com`. The connector sends them through
  Claude; the script sends them directly over HTTPS. Nothing else is read or sent.
- **What is kept:** nothing. Documents and PDFs are processed in memory and never stored.
  Lemmafour logs only metadata, such as the template, page count and error codes.
- **Accounts:** signing in (for a plan's features) uses Lemmafour's OAuth sign-in in your
  browser. The script never reads or sends credentials.
- **Download links:** in chats that take no files from tools, the PDF comes as a link to
  `mcp.lemmafour.com/save` that carries the document in the link itself; that page has
  Lemmafour make the PDF and stores nothing.

Privacy policy: https://lemmafour.com/privacy#ai-assistants · Terms:
https://lemmafour.com/terms · Help: https://lemmafour.com/contact

## Install

- **claude.ai, Claude Desktop and Cowork:** Customize → Plugins, then find Lemmafour in
  Discover, and connect the Lemmafour connector from the plugin's Connectors tab.
- **Claude Code:** `/plugin` and find Lemmafour, or add this repository as a marketplace:
  `claude plugin marketplace add lemmafour/claude-plugin`, then `claude plugin install lemmafour@lemmafour`.
- **Other agents that support Agent Skills:** copy `skills/lemmafour-publish` into the
  agent's skills folder; the script needs Node 18 or newer.

## License

MIT. See `LICENSE`. The license covers the files in this plugin; the Lemmafour service
has its own terms.
