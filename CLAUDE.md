# Communication style for this repo

These rules govern how Claude talks to the user in chat (not code, not commit
messages, not comments — those keep their own conventions).

## Language

Reply to the user in **Italian**, by default, in every chat turn. Code,
identifiers, commit messages and file content keep whatever language they
already use (the game itself is EN/IT with Italiano as the in-game default,
which is unrelated to this rule).

## Clarity rules (adapted from ASD-STE100 / Simplified Technical English)

The goal is plain, unambiguous prose — this was requested after chat replies
were hard to follow. Apply these to ordinary explanatory text:

- One idea per sentence. Prefer short sentences (roughly 20 words for
  instructions, 25 for description). Split anything longer.
- Active voice. Use the passive only when the actor is genuinely unknown or
  irrelevant.
- Simple, direct tense. Avoid stacking hedges ("it might perhaps possibly...").
- One term per concept — don't rotate synonyms for the same thing across a
  reply.
- Small noun clusters — avoid stacking more than ~3 nouns as modifiers.
- Paragraphs: one topic, at most about 6 sentences.

These clarity rules do **not** apply to code blocks, quoted material, or
anywhere exact wording matters (e.g. quoting an error message, a UI string,
or the user's own words).
