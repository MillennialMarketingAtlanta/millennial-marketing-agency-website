const fs = require('node:fs/promises');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const calendarPath = path.join(rootDir, 'content', 'calendar.json');
const contentDir = path.join(rootDir, 'content', 'blog');

function parseArgs() {
    const args = new Set(process.argv.slice(2));
    const explicitDate = [...args].find((arg) => arg.startsWith('--date='));
    return {
        explicitDate: explicitDate ? explicitDate.split('=')[1] : null
    };
}

function todayIsoDate(explicitDate) {
    if (explicitDate && /^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
        return explicitDate;
    }

    return new Date().toISOString().slice(0, 10);
}

function toTitleCase(value) {
    const text = String(value || '').trim();
    if (!text) {
        return 'Untitled Post';
    }

    return text
        .replace(/\s+/g, ' ')
        .split(' ')
        .map((word, index) => {
            const lower = word.toLowerCase();
            if (index === 0 || !['a', 'an', 'and', 'the', 'for', 'of', 'or', 'to', 'in', 'on', 'with', 'from', 'but', 'as', 'by'].includes(lower)) {
                return lower.charAt(0).toUpperCase() + lower.slice(1);
            }
            return lower;
        })
        .join(' ');
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 90);
}

function normalizeDescription(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return 'A fresh perspective on how thoughtful branding and positioning can strengthen a real estate or hospitality launch.';
    }

    return normalized.length > 160 ? `${normalized.slice(0, 157).trimEnd()}...` : normalized;
}

function buildPostDraft(topic, publishDate) {
    const title = toTitleCase(topic.topic);
    const slug = slugify(topic.topic);
    const description = normalizeDescription(topic.angle || topic.topic);

    const intro = [
        `In a market where attention is limited and expectations are high, ${topic.topic.toLowerCase()} matters more than many teams expect.`,
        `The most effective brands do not rely on a list of features or a polished launch moment alone. They build a clear point of view that helps audiences understand why the project matters and why it should be remembered.`
    ].join(' ');

    const body = `# ${title}

${intro}

## Why This Topic Matters

${topic.angle || topic.topic}. For ${topic.audience || 'brand leaders and marketing teams'}, the real opportunity is not simply to communicate information but to shape perception before a decision is made. A clear narrative helps buyers, partners, and stakeholders connect emotionally and strategically with the project.

## What Strong Positioning Looks Like

A compelling brand story usually begins with clarity. It answers who the audience is, what makes the experience distinct, and why the message should feel relevant right now. That clarity becomes the foundation for messaging, creative decisions, and the ways teams show up across digital channels.

## How to Apply This in Practice

- Start with the audience and the emotional promise behind the experience.
- Use the brand story to connect visuals, messaging, and launch moments.
- Keep the message consistent so the project feels coherent from first impression to conversion.
- Let the point of view guide decisions rather than letting the latest trend or feature set define them.

## Why It Matters for Growth

When a project is positioned with intention, the message becomes easier to absorb, easier to remember, and easier to act on. That is why thoughtful brand strategy often strengthens both attention and trust. It creates a more confident experience for the audience and a clearer foundation for the team behind the launch.

## The Takeaway

${topic.cta || 'Invite readers to start a thoughtful conversation about how their brand story can show up more clearly in the market.'} By focusing on the story behind the experience, brands can create a stronger impression before the first campaign even goes live.
`;

    return {
        title,
        slug,
        description,
        publishDate,
        body,
        fileName: `${publishDate}-${slug}.md`
    };
}

function buildFrontmatter(draft) {
    return `---
title: ${draft.title}
slug: ${draft.slug}
date: ${draft.publishDate}
description: ${draft.description}
author: Millennial Marketing Agency
featuredImage: assets/case-studies/1105-west-peachtree/01-40-west-interactive-building-r00-1.jpg
tags:
  - Brand Strategy
  - Real Estate Marketing
---

${draft.body}`;
}

async function writeDraftFile(draft) {
    const outputPath = path.join(contentDir, draft.fileName);
    await fs.mkdir(contentDir, { recursive: true });
    await fs.writeFile(outputPath, buildFrontmatter(draft), 'utf8');
    return outputPath;
}

async function main() {
    const { explicitDate } = parseArgs();
    const publishDate = todayIsoDate(explicitDate);
    const calendar = JSON.parse(await fs.readFile(calendarPath, 'utf8'));

    const dueEntries = calendar.filter((entry) => {
        const publishOn = String(entry.publishOn || '').trim();
        return entry.status === 'queued' && publishOn && publishOn <= publishDate;
    });

    if (dueEntries.length === 0) {
        console.log(`No queued posts due on ${publishDate}.`);
        return;
    }

    const createdFiles = [];
    for (const entry of dueEntries) {
        const draft = buildPostDraft(entry, entry.publishOn || publishDate);
        if (await exists(path.join(contentDir, draft.fileName))) {
            entry.status = 'drafted';
            entry.generatedFile = draft.fileName;
            entry.generatedAt = new Date().toISOString();
            continue;
        }

        await writeDraftFile(draft);
        entry.status = 'drafted';
        entry.generatedFile = draft.fileName;
        entry.generatedAt = new Date().toISOString();
        createdFiles.push(draft.fileName);
    }

    await fs.writeFile(calendarPath, `${JSON.stringify(calendar, null, 2)}\n`, 'utf8');
    console.log(`Generated ${createdFiles.length} post(s): ${createdFiles.join(', ') || 'none'}`);
}

async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    buildPostDraft
};
