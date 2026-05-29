# Design Rules

## Desired Response Format

From `interaction.md`: bullet points for lists, short paragraphs (1–3 sentences), hyperlinks on their own line at the end of the response. The few-shot example in `_build_prompt()` enforces this at LLM-prompt level.

## ChatWidget UI Constraints

- All styles are inline — no external UI library
- Dark theme: `#060b14` background, `#1d6ef5` blue accent
- Mobile responsive: `width: 'min(360px, calc(100vw - 32px))'`
- XSS-safe link rendering: only `http://`, `https://`, or `/` paths allowed in `[text](url)` markdown
