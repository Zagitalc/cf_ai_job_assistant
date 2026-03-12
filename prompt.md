# PROMPTS.md

This document records the AI-assisted prompts used during the development of `cf_ai_job_assistant`, in line with the Cloudflare internship assignment guidance.

AI tools used:
- Claude (Anthropic)
- Codex

Only prompts are included below. Responses are intentionally omitted.

---

## Project Planning And Architecture

**Prompt**
> Propose several AI application ideas suitable for a Cloudflare-based assignment. Requirements: an LLM component, workflow or coordination, user input through chat or voice, and persistent state or memory.

**Prompt**
> I currently have a CV builder repository. Can I duplicate and rename it as a new repository, then adapt it into a Cloudflare-native AI application?

**Prompt**
> Draft a high-level migration strategy for moving an existing Express, MongoDB, OpenAI, and Puppeteer application to Cloudflare Workers, Durable Objects, Workers AI, and the Agents SDK.

**Prompt**
> Produce a full Cloudflare migration plan for the current CV maker so it becomes an AI-powered job application assistant built on Cloudflare infrastructure.

---

## Migration Plan And Phase Execution

**Prompt**
> Write a high-level implementation plan for an AI coding agent. Break the migration into phases and fully implement Phase 1, including exact file contents, commands, expected results, and a completion checklist.

**Prompt**
> Follow the migration document and transform the current CV maker into an AI-powered job application assistant built on Cloudflare infrastructure.

**Prompt**
> Implement this Cloudflare migration plan in the repository, preserving the existing React CV builder while replacing the backend stack with Cloudflare services.

---

## Cloudflare Environment And Authentication

**Prompt**
> Advise on the correct Cloudflare API token configuration for local Wrangler development with Workers AI, Browser Rendering, Durable Objects, and Pages.

**Prompt**
> Suggest the exact permissions and scoping needed for a custom Cloudflare token for this project.

**Prompt**
> Create local environment placeholder files for the project, add them to `.gitignore`, and separate placeholders from real secrets.

---

## Data Fixtures And Local Testing

**Prompt**
> Create a realistic mock CV for a senior software development engineer that matches the application schema and can be imported for testing and debugging.

**Prompt**
> Explain where a saved fixture will appear in the application after posting it to the local API, and clarify the expected user flow for loading it in the UI.

---

## Debugging And Cloudflare Runtime Issues

**Prompt**
> Review the Wrangler logs and identify why remote preview, Browser Rendering, or Workers AI bindings are failing in local development.

**Prompt**
> Diagnose why the Worker starts in local mode but fails in remote mode, and separate code issues from Cloudflare authentication or preview-session issues.

**Prompt**
> Resolve the Worker startup error caused by module loading in the local runtime.

**Prompt**
> Investigate why PDF export is unavailable and determine whether the issue is in application code, runtime configuration, or Cloudflare remote bindings.

**Prompt**
> Create a combined `npm run dev:remote` workflow that starts both the remote Worker and the React frontend with the correct feature flags.

---

## AI Review Debugging

**Prompt**
> Debug the AI review flow. The review endpoint is returning an invalid response shape, and the model output is not being parsed as valid JSON.

**Prompt**
> Add temporary debug logging to the AI review pipeline so the raw Workers AI response shape can be inspected before normalization and fallback logic.

**Prompt**
> Remove misleading intermediate review UI states, including premature low scores or completion messages while review generation is still in progress.

**Prompt**
> Refine the AI review prompt contract so the model returns compact, structured JSON that matches the expected schema and avoids truncation.

**Prompt**
> Investigate why the review is still falling back, even when the model appears to be returning structured content, and adjust parsing or output constraints accordingly.

---

## AI Assistant Debugging

**Prompt**
> Debug the assistant chat flow. The agent reports connection success, but the returned content is not being interpreted correctly by the client.

**Prompt**
> Add a clear chat action so persisted agent history can be reset during testing.

**Prompt**
> Add temporary debug logging for the AI assistant so raw model outputs, normalization, and fallback behavior can be inspected.

**Prompt**
> Fix the assistant pipeline so structured tailoring suggestions are parsed reliably and surfaced in the Suggested Patches UI.

**Prompt**
> Improve the assistant prompt so outputs stay concise, structured, and less likely to be truncated, while preserving valid field paths for CV edits.

---

## UI And Product Behavior

**Prompt**
> Keep AI Review and Assistant visible only when the runtime can support them, and provide clearer disabled or loading states to avoid confusing users.

**Prompt**
> Adjust the AI review panel so users do not see a score of zero before the review is complete.

**Prompt**
> Ensure assistant results are synchronized back into the client state so saved suggestions and patches appear after a successful response.

---

## Documentation And Submission

**Prompt**
> Rewrite the project README so it accurately reflects the Cloudflare architecture, local and remote development modes, environment handling, fixtures, and troubleshooting.

**Prompt**
> Commit the migration work and ensure that `node_modules`, generated build output, and secrets are not included before pushing.

**Prompt**
> Track `prompt.md` in git because it is required for submission.

**Prompt**
> Rewrite `prompt.md` into a concise, professional prompt log for submission, containing prompts only and no model responses.

---

## Git And Repository Maintenance

**Prompt**
> Diagnose a failed `git push` caused by repository size and tracked dependencies, and identify a safe path to remove heavy generated files from version control.

**Prompt**
> Push the final committed work to the GitHub repository after confirming that ignored secrets and local artifacts are excluded.

---

## Notes

- The React frontend was carried forward from the original OnClickCV project and adapted for the Cloudflare migration.
- AI assistance was used for architecture, implementation planning, debugging, prompt refinement, and documentation.
- This file is intentionally limited to prompt history and excludes model responses.
