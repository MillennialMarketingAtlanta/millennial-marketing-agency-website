const fs = require('node:fs/promises');
const path = require('node:path');
const matter = require('gray-matter');
const { marked } = require('marked');

const siteUrl = 'https://millennial-marketing-agency-website.vercel.app';
const defaultBlogHeroImage = 'design-assets/Links/Zuzka_Vaclavik_636.jpg';
const rootDir = path.resolve(__dirname, '..');
const contentDir = path.join(rootDir, 'content', 'blog');
const outputDir = path.join(rootDir, 'blog');

marked.setOptions({
    gfm: true,
    breaks: false
});

function formatDate(dateValue) {
    const normalizedDateValue = dateValue instanceof Date
        ? dateValue.toISOString().slice(0, 10)
        : String(dateValue);
    const date = new Date(`${normalizedDateValue}T12:00:00Z`);
    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function normalizeDateValue(dateValue) {
    return dateValue instanceof Date
        ? dateValue.toISOString().slice(0, 10)
        : String(dateValue);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function slugFromFilename(fileName) {
    return fileName.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

function stripMarkdown(source) {
    return source
        .replace(/^#{1,6}\s+.*$/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function firstThreeSentences(source) {
    const normalized = source.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '';
    }

    const sentenceMatches = normalized.match(/[^.!?]+[.!?]+(?:['")\]]+)?/g);
    if (!sentenceMatches || sentenceMatches.length === 0) {
        return normalized;
    }

    return sentenceMatches.slice(0, 3).join(' ').trim();
}

function buildPreviewText(markdownBody) {
    return firstThreeSentences(stripMarkdown(markdownBody));
}

function buildStyledTitleHtml(title) {
    return escapeHtml(title);
}

function normalizeComparableText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function removeLeadingDuplicateHeadings(markdownBody, postTitle, postDescription) {
    const lines = markdownBody.split(/\r?\n/);
    let cursor = 0;

    while (cursor < lines.length && lines[cursor].trim() === '') {
        cursor += 1;
    }

    if (cursor < lines.length && /^#\s+/.test(lines[cursor])) {
        const headingText = lines[cursor].replace(/^#\s+/, '').trim();
        if (normalizeComparableText(headingText) === normalizeComparableText(postTitle)) {
            cursor += 1;
            while (cursor < lines.length && lines[cursor].trim() === '') {
                cursor += 1;
            }
        }
    }

    if (cursor < lines.length && /^##\s+/.test(lines[cursor])) {
        const subheadingText = lines[cursor].replace(/^##\s+/, '').trim();
        const normalizedSubheading = normalizeComparableText(subheadingText);
        const normalizedDescription = normalizeComparableText(postDescription);

        if (
            normalizedSubheading === normalizedDescription ||
            normalizedDescription.startsWith(normalizedSubheading) ||
            normalizedSubheading.startsWith(normalizedDescription)
        ) {
            cursor += 1;
            while (cursor < lines.length && lines[cursor].trim() === '') {
                cursor += 1;
            }
        }
    }

    return lines.slice(cursor).join('\n').trim();
}

function resolveAssetPath(rootPrefix, assetPath) {
    if (!assetPath) {
        return `${rootPrefix}${defaultBlogHeroImage}`;
    }

    if (/^https?:\/\//i.test(assetPath)) {
        return assetPath;
    }

    const trimmedPath = assetPath.replace(/^\//, '');
    return `${rootPrefix}${trimmedPath}`;
}

function buildShell({ title, description, pagePath, depth, bodyClass = '', content, heroLabel = 'BLOG', heroTitle = '', heroTitleLead = '', heroTitleMain = '', heroSubtitle = '', heroImage = defaultBlogHeroImage }) {
    const rootPrefix = '../'.repeat(depth);
    const canonicalUrl = `${siteUrl}${pagePath}`;
    const heroImagePath = resolveAssetPath(rootPrefix, heroImage);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="icon" type="image/png" href="${rootPrefix}assets/favicon.png">
    <link rel="apple-touch-icon" href="${rootPrefix}assets/favicon.png">
    <link rel="stylesheet" href="${rootPrefix}styles.css">
    <link rel="stylesheet" href="${rootPrefix}blog.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Pinyon+Script&display=swap" rel="stylesheet">
</head>
<body class="${bodyClass}">
    <section id="home" class="blog-shell-hero">
        <div class="hero-bg" aria-hidden="true" style="background-image: url('${escapeHtml(heroImagePath)}');"></div>
        <div class="hero-overlay"></div>

        <nav class="navbar">
            <div class="nav-container">
                <div class="logo">
                    <a href="${rootPrefix}index.html#home" aria-label="Millennial Marketing home">
                        <img src="${rootPrefix}MainLogo-White.png" alt="Millennial Marketing" class="logo-img nav-logo" data-logo-light="${rootPrefix}MainLogo-White.png" data-logo-dark="${rootPrefix}Fixed.svg">
                    </a>
                </div>
                <button class="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="site-menu">
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>

        <aside class="nav-menu" id="site-menu" aria-hidden="true">
            <div class="nav-menu-panel">
                <button class="nav-menu-close" type="button" aria-label="Close menu">
                    <span></span>
                    <span></span>
                </button>

                <nav class="nav-menu-links" aria-label="Primary">
                    <a href="${rootPrefix}index.html#home">Home <span aria-hidden="true">&#8594;</span></a>
                    <a href="${rootPrefix}index.html#disciplines">Services <span aria-hidden="true">&#8594;</span></a>
                    <a href="${rootPrefix}index.html#work">History of Success <span aria-hidden="true">&#8594;</span></a>
                    <a href="${rootPrefix}index.html#about">Who We Are <span aria-hidden="true">&#8594;</span></a>
                    <a href="${rootPrefix}meet-the-team.html">Meet the Team <span aria-hidden="true">&#8594;</span></a>
                    <a href="${rootPrefix}blog/">Blog <span aria-hidden="true">&#8594;</span></a>
                </nav>

                <div class="nav-menu-footer">
                    <p>Creative Marketing &amp;<br>Brand Strategy</p>
                    <div class="nav-menu-social">
                        <a href="https://www.linkedin.com/company/106850932/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M6.94 8.5V19H3.55V8.5h3.39ZM5.24 3C6.33 3 7 3.72 7 4.67c0 .93-.66 1.66-1.77 1.66h-.02c-1.07 0-1.74-.73-1.74-1.66C3.47 3.72 4.15 3 5.24 3ZM20.5 12.98V19h-3.39v-5.63c0-1.41-.5-2.37-1.77-2.37-.97 0-1.55.66-1.8 1.29-.09.23-.11.56-.11.89V19H10.04s.04-9.72 0-10.5h3.39v1.49c.45-.69 1.25-1.67 3.03-1.67 2.22 0 3.89 1.45 3.89 4.56Z"/>
                            </svg>
                        </a>
                        <a href="https://www.instagram.com/millennialmarketingatl/" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9Zm9.45 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7.35A4.65 4.65 0 1 1 7.35 12 4.66 4.66 0 0 1 12 7.35Zm0 1.8A2.85 2.85 0 1 0 14.85 12 2.85 2.85 0 0 0 12 9.15Z"/>
                            </svg>
                        </a>
                        <a href="mailto:ginger@millennialmarketingagency.com,christa@millennialmarketingagency.com" aria-label="Contact">
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.2l8 5.33 8-5.33V7H4Zm16 10V9.4l-7.45 4.97a1 1 0 0 1-1.1 0L4 9.4V17h16Z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </aside>

        <div class="blog-shell-hero-copy">
            ${heroLabel ? `<span>${escapeHtml(heroLabel)}</span>` : ''}
            ${heroTitleLead || heroTitleMain ? `<h1 class="blog-shell-hero-title"><em>${escapeHtml(heroTitleLead)}</em><strong>${escapeHtml(heroTitleMain)}</strong></h1>` : ''}
            ${heroTitle && !(heroTitleLead || heroTitleMain) ? `<h1 class="blog-shell-hero-title">${escapeHtml(heroTitle)}</h1>` : ''}
            ${heroSubtitle ? `<p class="blog-shell-hero-subtitle">${escapeHtml(heroSubtitle)}</p>` : ''}
        </div>
    </section>
    ${content}
    <footer class="footer" id="contact">
        <div class="footer-left">
            <nav class="footer-nav">
                <a href="${rootPrefix}index.html#disciplines">SERVICES</a>
                <a href="${rootPrefix}index.html#work">HISTORY OF SUCCESS</a>
                <a href="${rootPrefix}index.html#about">WHO WE ARE</a>
                <a href="${rootPrefix}meet-the-team.html">MEET THE TEAM</a>
                <a href="${rootPrefix}blog/">BLOG</a>
            </nav>

            <div class="footer-logo">
                <a href="${rootPrefix}index.html#home" aria-label="Millennial Marketing home">
                    <img src="${rootPrefix}MainLogo-Black.svg" alt="Millennial Marketing" class="logo-img footer-logo-img">
                </a>
            </div>

            <p class="footer-summary">A marketing and branding agency helping real estate, hospitality, and lifestyle brands tell their story with strategy and style.</p>

            <div class="footer-meta">
                <div class="footer-meta-row">
                    <span class="footer-meta-label">PHONE</span>
                    <span class="footer-meta-value">770-855-9870</span>
                </div>
                <div class="footer-meta-row">
                    <span class="footer-meta-label">ADDRESS</span>
                    <span class="footer-meta-value">1579 Monroe Drive NE, Suite 322<br>Atlanta, Georgia 30324</span>
                </div>
                <div class="footer-meta-row">
                    <span class="footer-meta-label">SOCIAL</span>
                    <div class="footer-social">
                        <a href="https://www.instagram.com/millennialmarketingatl/" target="_blank" rel="noopener noreferrer">Instagram</a>
                        <a href="mailto:ginger@millennialmarketingagency.com,christa@millennialmarketingagency.com">Email</a>
                        <a href="https://www.linkedin.com/company/106850932/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                    </div>
                </div>
            </div>

            <p class="footer-copy">&copy;2026 Millennial Marketing Agency</p>
        </div>

        <div class="footer-right">
            <img src="${rootPrefix}design-assets/Links/footer-photo-2026-08-23.png" alt="Styled interior still life">
        </div>
    </footer>
    <script src="${rootPrefix}script.js"></script>
</body>
</html>`;
}

function buildIndexPage(posts) {
    const cardsMarkup = posts.map((post) => `
                <article class="blog-card">
                    <div class="blog-card-meta">
                        <span>${escapeHtml(formatDate(post.date))}</span>
                        <span>${escapeHtml(post.tags.join(' / '))}</span>
                    </div>
                    <h3><a href="./${post.slug}/">${post.styledTitleHtml}</a></h3>
                    <p>${escapeHtml(post.previewText)}</p>
                    <a class="blog-card-link" href="./${post.slug}/">Read Article</a>
                </article>`).join('');

    const content = `
    <main class="blog-home">
        <section class="blog-archive">
            <div class="blog-grid">${cardsMarkup || ''}
            </div>
        </section>
    </main>`;

    return buildShell({
        title: 'Blog | Millennial Marketing Agency',
        description: 'Insights from Millennial Marketing Agency on brand strategy, real estate marketing, hospitality storytelling, and creative direction.',
        pagePath: '/blog/',
        depth: 1,
        bodyClass: 'blog-page',
        heroImage: defaultBlogHeroImage,
        heroLabel: '',
        heroTitleLead: 'On the',
        heroTitleMain: 'Blog',
        heroSubtitle: 'Perspectives and insights, thoughtfully considered.',
        content
    });
}

function buildPostPage(post, { newerPost, olderPost } = {}) {
    const cleanedBody = removeLeadingDuplicateHeadings(post.body, post.title, post.description);
    const articleHtml = marked.parse(cleanedBody);
    const postNavigation = newerPost || olderPost
        ? `<nav class="blog-post-nav" aria-label="Post navigation">
                ${newerPost ? `<a class="blog-post-nav-link blog-post-nav-link--next" href="../${newerPost.slug}/">Next</a>` : '<span class="blog-post-nav-spacer" aria-hidden="true"></span>'}
                ${olderPost ? `<a class="blog-post-nav-link blog-post-nav-link--prev" href="../${olderPost.slug}/">Previous</a>` : '<span class="blog-post-nav-spacer" aria-hidden="true"></span>'}
            </nav>`
        : '';
    const content = `
    <main class="blog-post-page">
        <article class="blog-post-article">
            <a class="blog-back-link" href="../">Back to Blog</a>
            <div class="blog-post-meta">
                <span>${escapeHtml(formatDate(post.date))}</span>
                <span>${escapeHtml(post.author)}</span>
                <span>${escapeHtml(post.tags.join(' / '))}</span>
            </div>
            <h1>${post.styledTitleHtml}</h1>
            <p class="blog-post-dek">${escapeHtml(post.description)}</p>
            <div class="blog-post-body">
                ${articleHtml}
            </div>
            <div class="blog-post-cta">
                <a href="../../index.html#contact">Schedule a consultation</a>
            </div>
            ${postNavigation}
        </article>
    </main>`;

    return buildShell({
        title: `${post.title} | Millennial Marketing Agency`,
        description: post.description,
        pagePath: `/blog/${post.slug}/`,
        depth: 2,
        bodyClass: 'blog-page blog-page--article',
        heroImage: defaultBlogHeroImage,
        heroLabel: '',
        heroTitleLead: 'On the',
        heroTitleMain: 'Blog',
        heroSubtitle: 'Perspectives and insights, thoughtfully considered.',
        content
    });
}

async function loadPosts() {
    const files = await fs.readdir(contentDir);
    const markdownFiles = files.filter((file) => file.endsWith('.md')).sort();

    const posts = await Promise.all(markdownFiles.map(async (fileName) => {
        const fullPath = path.join(contentDir, fileName);
        const source = await fs.readFile(fullPath, 'utf8');
        const { data, content } = matter(source);
        const slug = data.slug || slugFromFilename(fileName);

        if (!data.title || !data.date || !data.description) {
            throw new Error(`Missing required frontmatter in ${fileName}`);
        }

        return {
            title: data.title,
            date: normalizeDateValue(data.date),
            description: data.description,
            author: data.author || 'Millennial Marketing Agency',
            tags: Array.isArray(data.tags) ? data.tags : [],
            featuredImage: data.featuredImage || defaultBlogHeroImage,
            slug,
            body: content.trim(),
            styledTitleHtml: buildStyledTitleHtml(data.title),
            previewText: buildPreviewText(content.trim())
        };
    }));

    return posts.sort((left, right) => right.date.localeCompare(left.date));
}

async function main() {
    const posts = await loadPosts();

    if (posts.length === 0) {
        throw new Error('No blog posts found in content/blog');
    }

    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(path.join(outputDir, 'index.html'), buildIndexPage(posts));

    for (const post of posts) {
        const postIndex = posts.indexOf(post);
        const newerPost = postIndex > 0 ? posts[postIndex - 1] : null;
        const olderPost = postIndex < posts.length - 1 ? posts[postIndex + 1] : null;
        const postDir = path.join(outputDir, post.slug);
        await fs.mkdir(postDir, { recursive: true });
        await fs.writeFile(path.join(postDir, 'index.html'), buildPostPage(post, { newerPost, olderPost }));
    }

    console.log(`Generated ${posts.length} blog page(s) in ${path.relative(rootDir, outputDir)}`);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});