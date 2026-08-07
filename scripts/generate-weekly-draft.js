const fs = require('node:fs/promises');
const path = require('node:path');
const matter = require('gray-matter');

const rootDir = path.resolve(__dirname, '..');
const calendarPath = path.join(rootDir, 'content', 'calendar.json');
const contentDir = path.join(rootDir, 'content', 'blog');
const isDryRun = process.argv.includes('--dry-run');
const defaultMinWordCount = 900;
const defaultDescriptionMinLength = 140;
const defaultDescriptionMaxLength = 160;

function stripMarkdown(source) {
    return source
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function countWords(markdownBody) {
    const normalized = stripMarkdown(markdownBody);
    if (!normalized) {
        return 0;
    }

    return normalized.split(/\s+/).length;
}

function normalizeHeading(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractHeadings(markdownBody) {
    const matches = markdownBody.match(/^#{1,6}\s+.+$/gm) || [];
    return matches.map((line) => line.replace(/^#{1,6}\s+/, '').trim());
}

function validateEditorialOutput(topic, editorialPass) {
    const minWordCount = Number.isFinite(topic.minWordCount) ? topic.minWordCount : defaultMinWordCount;
    const descriptionMinLength = Number.isFinite(topic.descriptionMinLength)
        ? topic.descriptionMinLength
        : defaultDescriptionMinLength;
    const descriptionMaxLength = Number.isFinite(topic.descriptionMaxLength)
        ? topic.descriptionMaxLength
        : defaultDescriptionMaxLength;
    const requiredHeadings = Array.isArray(topic.requiredHeadings)
        ? topic.requiredHeadings.filter(Boolean)
        : [];
    const bodyMarkdown = String(editorialPass.bodyMarkdown || '').trim();
    const description = String(editorialPass.description || '').trim();

    if (descriptionMinLength > descriptionMaxLength) {
        throw new Error(`Invalid description length configuration: min ${descriptionMinLength} is greater than max ${descriptionMaxLength}.`);
    }

    if (!description) {
        throw new Error('Editorial pass did not return description content.');
    }

    const descriptionLength = description.length;
    if (descriptionLength < descriptionMinLength || descriptionLength > descriptionMaxLength) {
        throw new Error(
            `Draft failed quality check: description length ${descriptionLength} is outside ${descriptionMinLength}-${descriptionMaxLength} characters.`
        );
    }

    if (!bodyMarkdown) {
        throw new Error('Editorial pass did not return bodyMarkdown content.');
    }

    const wordCount = countWords(bodyMarkdown);
    if (wordCount < minWordCount) {
        throw new Error(`Draft failed quality check: word count ${wordCount} is below minimum ${minWordCount}.`);
    }

    const headings = extractHeadings(bodyMarkdown);
    const normalizedHeadings = headings.map((heading) => normalizeHeading(heading));
    for (const requiredHeading of requiredHeadings) {
        const needle = normalizeHeading(requiredHeading);
        if (!needle) {
            continue;
        }

        if (!normalizedHeadings.includes(needle)) {
            throw new Error(`Draft failed quality check: missing required heading "${requiredHeading}".`);
        }
    }

    if (!/^##\s+/m.test(bodyMarkdown)) {
        throw new Error('Draft failed quality check: at least one section heading (##) is required.');
    }
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function extractTextFromAnthropic(responseJson) {
    return (responseJson.content || [])
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n')
        .trim();
}

function extractTextFromOpenAI(responseJson) {
    const choice = responseJson.choices && responseJson.choices[0];
    return choice && choice.message && choice.message.content ? choice.message.content.trim() : '';
}

function parseJsonFromModelText(text) {
    const normalized = String(text || '').trim();
    if (!normalized) {
        throw new Error('Model returned empty JSON payload.');
    }

    try {
        return JSON.parse(normalized);
    } catch {
        const fencedMatch = normalized.match(/```json\s*([\s\S]*?)```/i) || normalized.match(/```\s*([\s\S]*?)```/i);
        if (fencedMatch && fencedMatch[1]) {
            return JSON.parse(fencedMatch[1].trim());
        }
        throw new Error('Unable to parse JSON from model response.');
    }
}

async function loadCalendar() {
    const source = await fs.readFile(calendarPath, 'utf8');
    return JSON.parse(source);
}

async function saveCalendar(calendar) {
    await fs.writeFile(calendarPath, `${JSON.stringify(calendar, null, 2)}\n`);
}

async function createClaudeDraft(topic) {
    if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) {
        throw new Error('ANTHROPIC_API_KEY and ANTHROPIC_MODEL are required.');
    }

    const prompt = `You are writing a blog article for Millennial Marketing Agency, a female-founded Atlanta creative agency serving real estate, hospitality, and lifestyle brands.\n\nWrite a Markdown article with a clear argument, strong section headings, and a practical conclusion. Do not include frontmatter, code fences, or notes to the editor.\n\nTopic: ${topic.topic}\nPrimary keyword: ${topic.primaryKeyword}\nAudience: ${topic.audience}\nCTA goal: ${topic.cta}\nAngle: ${topic.angle}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL,
            max_tokens: 2400,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(`Anthropic request failed with ${response.status}`);
    }

    return extractTextFromAnthropic(await response.json());
}

async function createOpenAIDraft(topic) {
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
        throw new Error('OPENAI_API_KEY and OPENAI_MODEL are required for OpenAI draft generation.');
    }

    const prompt = `You are writing a blog article for Millennial Marketing Agency, a female-founded Atlanta creative agency serving real estate, hospitality, and lifestyle brands.

Write a Markdown article with a clear argument, strong section headings, and a practical conclusion. Do not include frontmatter, code fences, or notes to the editor.

Topic: ${topic.topic}
Primary keyword: ${topic.primaryKeyword}
Audience: ${topic.audience}
CTA goal: ${topic.cta}
Angle: ${topic.angle}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL,
            temperature: 0.7,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI draft request failed with ${response.status}`);
    }

    return extractTextFromOpenAI(await response.json());
}

async function createEditorialPass(topic, draftMarkdown) {
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
        throw new Error('OPENAI_API_KEY and OPENAI_MODEL are required.');
    }

    const prompt = `You are the editorial QA pass for Millennial Marketing Agency. Rewrite the supplied blog post for luxury-but-approachable brand voice, clearer structure, practical specificity, and SEO discipline.\n\nReturn valid JSON with this exact shape:\n{\n  "title": "...",\n  "description": "...",\n  "tags": ["tag 1", "tag 2"],\n  "bodyMarkdown": "..."\n}\n\nConstraints:\n- Description must be 140 to 160 characters.\n- Tags must be 2 to 4 short phrases.\n- bodyMarkdown must not contain frontmatter.\n- End with a soft consultation CTA.\n\nTopic metadata:\n${JSON.stringify(topic, null, 2)}\n\nDraft article:\n${draftMarkdown}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL,
            temperature: 0.7,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const text = extractTextFromOpenAI(await response.json());
    return parseJsonFromModelText(text);
}

async function createAnthropicEditorialPass(topic, draftMarkdown) {
    if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) {
        throw new Error('ANTHROPIC_API_KEY and ANTHROPIC_MODEL are required for Anthropic editorial generation.');
    }

    const prompt = `You are the editorial QA pass for Millennial Marketing Agency. Rewrite the supplied blog post for luxury-but-approachable brand voice, clearer structure, practical specificity, and SEO discipline.

Return valid JSON with this exact shape:
{
  "title": "...",
  "description": "...",
  "tags": ["tag 1", "tag 2"],
  "bodyMarkdown": "..."
}

Constraints:
- Description must be 140 to 160 characters.
- Tags must be 2 to 4 short phrases.
- bodyMarkdown must not contain frontmatter.
- End with a soft consultation CTA.

Topic metadata:
${JSON.stringify(topic, null, 2)}

Draft article:
${draftMarkdown}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL,
            max_tokens: 2400,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(`Anthropic editorial request failed with ${response.status}`);
    }

    const text = extractTextFromAnthropic(await response.json());
    return parseJsonFromModelText(text);
}

async function selectNextTopic(calendar) {
    return calendar.find((entry) => entry.status === 'queued');
}

async function main() {
    const calendar = await loadCalendar();
    const nextTopic = await selectNextTopic(calendar);

    if (!nextTopic) {
        throw new Error('No queued topics remain in content/calendar.json');
    }

    if (isDryRun) {
        console.log(`Dry run selected topic: ${nextTopic.topic}`);
        return;
    }

    let draftMarkdown;
    try {
        draftMarkdown = await createClaudeDraft(nextTopic);
    } catch (anthropicError) {
        console.warn(`Anthropic draft failed (${anthropicError.message}). Falling back to OpenAI draft generation.`);
        draftMarkdown = await createOpenAIDraft(nextTopic);
    }
    let editorialPass;
    try {
        editorialPass = await createEditorialPass(nextTopic, draftMarkdown);
    } catch (openAiError) {
        console.warn(`OpenAI editorial pass failed (${openAiError.message}). Falling back to Anthropic editorial generation.`);
        editorialPass = await createAnthropicEditorialPass(nextTopic, draftMarkdown);
    }
    validateEditorialOutput(nextTopic, editorialPass);
    const slug = nextTopic.slug || slugify(editorialPass.title || nextTopic.topic);
    const fileName = `${todayIsoDate()}-${slug}.md`;
    const frontmatter = matter.stringify(editorialPass.bodyMarkdown.trim(), {
        title: editorialPass.title,
        slug,
        date: todayIsoDate(),
        description: editorialPass.description,
        author: 'Millennial Marketing Agency',
        tags: editorialPass.tags
    });

    await fs.mkdir(contentDir, { recursive: true });
    await fs.writeFile(path.join(contentDir, fileName), frontmatter);

    nextTopic.status = 'drafted';
    nextTopic.generatedFile = fileName;
    nextTopic.generatedAt = new Date().toISOString();
    await saveCalendar(calendar);

    console.log(`Created weekly draft ${fileName}`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});