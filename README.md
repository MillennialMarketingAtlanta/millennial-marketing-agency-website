## Blog Workflow

This site now supports a generated blog layer without changing the public hosting model.

### Local commands

- `npm run build` generates static files in `blog/` from Markdown posts in `content/blog/`
- `npm run blog:draft:dry-run` validates the weekly topic queue without calling any AI APIs
- `npm run blog:draft` generates a new Markdown draft from the next queued topic in `content/calendar.json`

### Content structure

- `content/blog/*.md` contains the editorial source of truth
- `content/calendar.json` contains queued weekly topics for automation
- `blog/` is generated output and should be regenerated whenever content changes

### Weekly automation

The repository includes `.github/workflows/weekly-blog-draft.yml`.

Schedule: Mondays at 12:00 UTC (8:00 AM Eastern during daylight saving time).

The workflow currently runs in direct publish mode:

- checks `content/calendar.json` for a queued topic
- generates a new Markdown post
- rebuilds `blog/`
- commits and pushes changes to the default branch automatically

If no topics are queued, the workflow exits cleanly without failing.

Automated quality checks now run before a draft is saved or published:

- minimum word count (default: 900 words)
- at least one `##` section heading
- optional required headings list per topic
- description length between 140 and 160 characters (SEO guardrail)

You can customize checks per queued topic in `content/calendar.json`:

- `minWordCount`: integer override for that topic
- `requiredHeadings`: array of exact heading text values expected in the final markdown
- `descriptionMinLength`: integer lower bound override for description length
- `descriptionMaxLength`: integer upper bound override for description length

Set these before enabling the workflow:

- GitHub secret `ANTHROPIC_API_KEY`
- GitHub variable `ANTHROPIC_MODEL`
- GitHub secret `OPENAI_API_KEY`
- GitHub variable `OPENAI_MODEL`

If you want editorial review before publish, switch the workflow back to pull request mode.
