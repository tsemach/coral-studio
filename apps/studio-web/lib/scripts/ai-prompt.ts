// COR-17 fix: this used to be read from workshops/scripts/ai-prompt.md at
// request time via fs.readFile. That directory is deliberately untracked in
// git (it holds copyrighted script PDFs), so the file doesn't exist on a
// fresh clone or a Vercel deploy built from git, and every /scripts request
// threw. The prompt's content is static, so it's inlined here as a tracked
// constant instead.
export const AI_PROMPT_MARKDOWN = `Convert the raw play script below into a clean, valid JSON object following this exact schema:

**Schema Rules:**

* \`title\` (string): Title of the script or play.
* \`scene\` (string): Current scene heading or slugline.
* \`script_flow\` (array of objects): Chronological sequence of elements.
* For stage directions/actions: \`{"type": "action", "text": "..."}\`
* For spoken lines: \`{"type": "dialogue", "character": "...", "line": "..."}\`


* Output **only** raw JSON with no Markdown wrappers, commentary, or extra text.

**Example Structure:**

\`\`\`json
{
  "title": "Awakenings",
  "scene": "INT. WARD 5 - DAY",
  "script_flow": [
    {
      "type": "action",
      "text": "Sayer enters the room quietly."
    },
    {
      "type": "dialogue",
      "character": "SAYER",
      "line": "Excuse me."
    },
    {
      "type": "dialogue",
      "character": "WARD 5 PATIENT",
      "line": "We can't allow it."
    },
    {
      "type": "dialogue",
      "character": "LEONARD",
      "line": "He's all right."
    }
  ]
}

\`\`\`

**Script to parse:**
[Paste your script here]`
