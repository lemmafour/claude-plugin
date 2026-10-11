---
name: lemmafour-publish
description: Turn Markdown into a print-quality, accessible PDF with Lemmafour. Use when the user wants a PDF (or a printable, shareable or accessible document) from notes, worksheets, answer keys, reports, papers, lecture notes, resumes, letters or memos, especially with LaTeX math, tables or code. Also use to check a document against PDF/UA-1 accessibility.
license: MIT
compatibility: Uses the Lemmafour connector's render_pdf tool when it is connected. Otherwise runs scripts/lemmafour.mjs, which needs Node 18 or newer and internet access to mcp.lemmafour.com.
---

# Lemmafour publish

Lemmafour typesets Markdown with LaTeX math into PDFs using Typst. Documents are processed
in memory and never stored.

## Workflow

1. Write the whole document as Markdown with YAML frontmatter (see below).
2. Put every layout wish in the frontmatter (see "Layout settings" below): template,
   columns, margins, paper, contents, numbering. Choose the template from the request:
   worksheets, quizzes and answer keys `assignment`; CVs `resume`; reports `report`.
3. Before rendering, re-read the Markdown against "Math that renders" below. Mistakes
   there print raw LaTeX in the PDF.
4. Make the PDF the first way that is available:
   - **The Lemmafour connector** (its `render_pdf` tool is listed): call `render_pdf` once
     with the Markdown and every layout wish in `settings`. It shows the PDF in the chat
     with a Download button, and it signs the user in when a choice needs a Lemmafour plan.
     Reuse the `appliedSettings` it returns when you revise. `validate_accessibility`
     checks a document without making a file.
   - **The script**, where you can run commands and reach the internet (Claude Code, other
     coding agents): write the document to a `.md` file in the user's working folder,
     never inside this skill's folder. Run, from that folder:
     `node ${CLAUDE_SKILL_DIR}/scripts/lemmafour.mjs render doc.md --out doc.pdf`
     (the script is `scripts/lemmafour.mjs` next to this file). Add `--free` when the user
     has no Lemmafour plan, so paid choices become free ones instead of an error. For an
     accessible PDF, run `... lemmafour.mjs validate doc.md` first and fix every error.
5. Read the result. `appliedSettings` shows the layout used and the notes any setting
   Lemmafour translated: keep the frontmatter in sync with them. If the render failed, fix
   the document using the diagnostics (below) and try again. Stop after three attempts and
   show the user the remaining diagnostics.
6. Tell the user where the PDF is, its page count, and any warnings worth knowing.

The script needs Node 18 or newer and no packages. Run one command per call: the exit code
tells you whether that step worked. It sends the `.md` file and the images it references
to mcp.lemmafour.com and nothing else.

## Frontmatter

```yaml
---
title: Fractions practice        # required for accessible PDFs
author: Ms Rivera
date: 2026-10-04                 # YYYY-MM-DD; required for PDF/A profiles
language: en                     # BCP 47 tag: en, en-GB, de, fr, ja ...
template: assignment             # or pass --template
pdfProfile: tagged               # or pass --profile
---
```

Always set `title` and `language`. The template prints the title, author and date at the
top of the first page, so **don't add a `#` heading that repeats the title**. Use `#` for
the document's top-level sections (PDF/UA requires the first heading to be level 1) and
`##` below them; a short document may have no headings at all.

## Layout settings

All in the frontmatter (or `render_pdf`'s `settings`, or the script's `--set key=value`).
Leave out what the user didn't ask for; the template decides the rest.

| Setting | Values | |
|---|---|---|
| `columns` | 1, 2, 3 | free on every template |
| `margins` | compact, normal, wide | free |
| `paper` | a4 (default), us-letter | free; use us-letter for the US and Canada |
| `toc`, `tocDepth` | true/false, 1-6 | free; a table of contents |
| `titlePage` | true/false | free; title, author and date on their own page |
| `headingNumbers`, `equationNumbers` | true/false | free |
| `pageNumbering` | 1, i, I, a, A | free |
| `header`, `footer` | text | free; running text on every page |
| `theme` | classroom-clear, exam-compact, modern-report, accessible-high-contrast, minimal | free; other themes paid |
| `themeDensity` | compact, standard, editorial | free; compact fits more on a page |
| `fontSize`, `lineSpacing` | 8-16 pt; 0.65 normal, 1.0 one-and-a-half, 1.5 double | paid |

Two columns don't need the paid `article` template: `columns: 2` works on any template.
Pandoc or LaTeX names (`classoption: twocolumn`, `geometry: margin=1in`, `fontsize: 11pt`,
`numbersections`) are translated and reported in `notes`; unknown names are reported in
`warnings` with a suggestion.

## Templates and profiles

- Free templates: `assignment` (default), `report`, `readme`, `resume`, `minimal`.
- Paid templates (Day Pass or Pro): `article`, `proposal`, `memo`, `specification`,
  `manual`, `lecture-notes`, `archival`.
- Profiles: `tagged` (default, free), `pdf-ua-1` (accessible), `pdf-a-2u` (archival),
  `pdf-a-2a-ua-1` (both). Every profile except `tagged` is paid.
- With the connector, paid choices preview for free; the download asks the user to sign in
  to a Day Pass or Pro. The script has no account: a paid choice fails with an `access.*`
  diagnostic whose `fix` names the free alternative, every paid choice listed at once.
  Apply the fixes (or render with `--free`) and tell the user what changed, or make the PDF
  with the connector so they can use their plan (https://lemmafour.com/pricing/). Never
  pretend a paid feature was applied.
- Validation is always free, even for paid templates.

## Math that renders

- Inline math is `$...$` and display math is `$$...$$`, in LaTeX syntax.
- **No space just inside the dollar signs.** `$\frac{2}{3} + \frac{1}{4} = $ ____` is
  *not* math: the closing `$` follows a space, so the whole thing prints as raw LaTeX.
  Write `$\frac{2}{3} + \frac{1}{4} =$ ____` instead. The same goes for `$ x$`.
- A dollar sign that means money needs a backslash: `costs \$5`.
- Fraction size: inline `\frac` is set small, as in LaTeX. Inline `\dfrac` is full size but
  makes its line taller. For young readers (worksheets, answer keys), put each problem's
  math on its own line as display math, `$$\frac{2}{3} + \frac{1}{4} = \underline{\qquad}$$`,
  or use `\dfrac` consistently in every problem. Don't mix the two in one list.
- Write the answer blank outside the math (`=$ ____`) or as `\underline{\qquad}` inside it.

## Writing the Markdown

Lemmafour Markdown is CommonMark plus GitHub tables, task lists, strikethrough and
footnotes, LaTeX math, definition lists and a few directives of its own. These are the
parts you cannot guess:

| To get | Write |
|---|---|
| A page break | `::pagebreak[]` on its own line (`::pagebreak[]{to=odd}`; `::columnbreak[]`) |
| A line break | A new line: every line break inside a paragraph prints. Don't wrap long lines |
| A callout | `:::note` … `:::` (tip, important, warning, caution, theorem, worked-example, solution, answer-key); a title: `:::tip{title="Exam tip"}` |
| A worksheet or quiz question | `:::question{marks=1}`, the question, then options `- [ ] …` with `- [x]` on the correct one, then `:::`. Options sit 4, 2 or 1 per row to fit the column; questions are numbered and kept with their options |
| Answer space | `::answer[]{lines=3}` inside the question (`style=box` for a box) |
| Answers | The setting `answers`: `hide` (student copy, default), `show` (marked in place) or `end` (an answer list on the last page). Don't write answers into the student sheet |
| A numbered equation | `$$ E = mc^2 $$ {#eq:energy}`, cited as `@eq:energy` |
| Section and figure references | `# Method {#sec:method}`, `![Alt](img.png){#fig:plot}`; `@sec:method`, `@fig:plot` |
| A figure's size | `:::figure{width=60}` … `:::` around the image (percent of the text width) |
| Keep a block on one page | `:::keep` … `:::`; `:::landscape` turns pages sideways |
| Sub- and superscript | `H<sub>2</sub>O`, `x<sup>2</sup>`, or math `$\mathrm{H_2O}$` |
| Highlight, underline | `<mark>text</mark>`, `<u>text</u>` |
| A table of contents | The setting `toc: true`, not a `[TOC]` marker |

- Chemistry and units are plain LaTeX: `$\mathrm{CO_2}$`, `$9.8\,\mathrm{m/s^2}$`.
- Habits from LaTeX, Pandoc, Quarto and Obsidian (`\newpage`, `\textbf{}`, `\label`/`\eqref`,
  `\SI{}`, `\ce{}`, `~sub~`, `::: {.callout-note}`, `> [!info] Title`) are translated, and
  the script lists each translation in `notes`. Write the Lemmafour form when you revise.
- For a whole Pandoc, Quarto, Obsidian or MyST file, add `--flavor pandoc` (or quarto,
  obsidian, myst); `.qmd` files are read as Quarto automatically.
- Tables, fenced code blocks with a language, footnotes, task lists and block quotes work as
  in GitHub Markdown.
- Images: `![A labelled number line from 0 to 1](images/line.png)`. Use relative paths next
  to the `.md` file; the script uploads PNG, JPEG, GIF, WebP and SVG files it finds
  (at most 64 images, 4 MB each, 12 megapixels each). Never encode images as base64
  yourself; let the script read the files. For a diagram you draw, write an `.svg` file next
  to the `.md`. Remote image URLs are not fetched: download the image first, or the result
  lists it under `missingImages` for the user to add in the Lemmafour editor.
- Not rendered by the API: Mermaid and Vega diagrams (use an exported image), and `[@key]`
  citations (use footnotes). Tabs don't line text up; use a table.
- Keep documents under 50 pages per render (split longer ones into parts). The Markdown
  file may be at most 2 MB.

## Accessibility (PDF/UA-1)

For an accessible PDF, use the profile `pdf-ua-1` (paid) or at least validate (free). The
checker needs:

- `title` and `language` in the frontmatter;
- a first heading at level 1 (`#`) and no skipped levels;
- alt text for every informative image (the text inside `![...]`); leave it empty,
  `![](rule.svg)`, only for a purely decorative image;
- alt text for equations. In an English document, Lemmafour describes a formula without
  alt text by reading it aloud ("x equals the fraction with numerator ...") and reports it
  in one warning. Write your own where the meaning matters more than the symbols, and for
  every formula in a document in another language: `$x^2$ {alt="x squared"}` inline,
  `$$ ... $$ {alt="..."}` for display math, or `alt="..."` on an `:::equation` block;
- descriptive link text (not "click here").

## Reading the result

The script prints one JSON object:

```json
{ "ok": false, "status": 422, "error": { "code": "render.failed", "message": "..." },
  "diagnostics": [ { "severity": "error", "code": "accessibility.title_missing",
    "message": "...", "hints": ["..."], "range": { "startLine": 3 },
    "fix": { "frontmatter": { "key": "template", "value": "assignment" } } } ] }
```

- `range.startLine` is the line in your `.md` file.
- `fix.frontmatter` is a machine-applicable fix: set that key to that value and retry.
- `hints` say what to change otherwise.
- Warnings never block the PDF; mention important ones to the user.
- `render.too_long_for_api`: split the document, or suggest opening it in the Lemmafour
  editor (https://lemmafour.com/tools/markdown-to-pdf/), which renders up to 1,000 pages
  on the user's device.
- Exit code 2 means a usage, network or sign-in problem, not a document problem.

## Configuration

- The script sends no credentials. Free features need no account; for a plan's features,
  use the connector.
- `LEMMAFOUR_API_URL`: the API base URL (default `https://mcp.lemmafour.com`), for testing
  against another Lemmafour server.
