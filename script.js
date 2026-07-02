// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') {
            return;
        }

        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Navbar: transparent on hero, fixed light bar after scrolling.
const navbar = document.querySelector('.navbar');
const navLogo = document.querySelector('.nav-logo');
const hamburgerButton = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navMenuCloseButton = document.querySelector('.nav-menu-close');

const closeNavMenu = () => {
    if (!navMenu || !hamburgerButton) {
        return;
    }

    navMenu.classList.remove('is-open');
    navMenu.setAttribute('aria-hidden', 'true');
    hamburgerButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
};

const openNavMenu = () => {
    if (!navMenu || !hamburgerButton) {
        return;
    }

    navMenu.classList.add('is-open');
    navMenu.setAttribute('aria-hidden', 'false');
    hamburgerButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
};

if (hamburgerButton && navMenu && navMenuCloseButton) {
    hamburgerButton.addEventListener('click', () => {
        const isOpen = navMenu.classList.contains('is-open');
        if (isOpen) {
            closeNavMenu();
            return;
        }

        openNavMenu();
    });

    navMenuCloseButton.addEventListener('click', closeNavMenu);

    navMenu.addEventListener('click', (event) => {
        if (event.target === navMenu) {
            closeNavMenu();
        }
    });

    navMenu.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', closeNavMenu);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeNavMenu();
        }
    });
}

function updateNavbarState() {
    if (!navbar || !navLogo) {
        return;
    }

    const hasScrolled = window.scrollY > 12;
    navbar.classList.toggle('scrolled', hasScrolled);

    const lightLogo = navLogo.getAttribute('data-logo-light');
    const darkLogo = navLogo.getAttribute('data-logo-dark');
    navLogo.src = hasScrolled ? darkLogo : lightLogo;
}

window.addEventListener('scroll', updateNavbarState);
updateNavbarState();

// Contact form submission
document.querySelector('.contact-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    this.reset();
});

// Navbar active link highlighting on scroll
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.service-card, .portfolio-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Keep autoplay videos looping smoothly across mobile/browser pause behaviors.
const autoplayVideos = Array.from(document.querySelectorAll('video[autoplay]'));

const resumeVideoPlayback = (video) => {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
    }
};

const replaceVideoWithPosterFallback = (video) => {
    const posterSrc = video.getAttribute('poster');
    if (!posterSrc) {
        return;
    }

    const fallbackImage = document.createElement('img');
    fallbackImage.src = posterSrc;
    fallbackImage.alt = video.getAttribute('aria-label') || 'Section visual';
    fallbackImage.className = video.className;
    video.replaceWith(fallbackImage);
};

autoplayVideos.forEach((video) => {
    const loopSecondsValue = Number.parseFloat(video.dataset.loopSeconds || '');
    const customLoopSeconds = Number.isFinite(loopSecondsValue) && loopSecondsValue > 0 ? loopSecondsValue : null;
    const trimSecondsValue = Number.parseFloat(video.dataset.loopTrim || '');
    const loopTrimSeconds = Number.isFinite(trimSecondsValue) && trimSecondsValue > 0 ? trimSecondsValue : 0.06;

    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');

    video.addEventListener('loadeddata', () => resumeVideoPlayback(video));
    video.addEventListener('canplay', () => resumeVideoPlayback(video));
    video.addEventListener('error', () => replaceVideoWithPosterFallback(video));
    video.addEventListener('ended', () => {
        video.currentTime = 0;
        resumeVideoPlayback(video);
    });

    video.addEventListener('pause', () => {
        if (!document.hidden && !video.ended) {
            resumeVideoPlayback(video);
        }
    });

    video.addEventListener('timeupdate', () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) {
            return;
        }

        if (customLoopSeconds && video.currentTime >= Math.min(customLoopSeconds, video.duration)) {
            video.currentTime = 0;
            resumeVideoPlayback(video);
            return;
        }

        if (video.duration - video.currentTime < loopTrimSeconds) {
            video.currentTime = 0;
            resumeVideoPlayback(video);
        }
    });

    resumeVideoPlayback(video);
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        autoplayVideos.forEach((video) => resumeVideoPlayback(video));
    }
});

window.addEventListener('pageshow', () => {
    autoplayVideos.forEach((video) => resumeVideoPlayback(video));
});

// On mobile Safari, some videos need an extra play attempt once they are on-screen.
if (window.matchMedia('(max-width: 600px)').matches) {
    const mobileVideoObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                resumeVideoPlayback(entry.target);
            }
        });
    }, {
        threshold: 0.35
    });

    autoplayVideos.forEach((video) => mobileVideoObserver.observe(video));
}

// Industry filter accordion
const collapseIndustryByDefault = window.matchMedia('(max-width: 600px)').matches;

document.querySelectorAll('.industry-filter-group').forEach(group => {
    const toggle = group.querySelector('.industry-toggle');
    const list = group.querySelector('.industry-filter-list');
    const icon = group.querySelector('.industry-toggle-icon');

    if (!toggle || !list || !icon) {
        return;
    }

    if (collapseIndustryByDefault) {
        toggle.setAttribute('aria-expanded', 'false');
        list.hidden = true;
        icon.textContent = '+';
        group.classList.remove('active');
    }

    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        const nextState = !expanded;

        toggle.setAttribute('aria-expanded', String(nextState));
        list.hidden = !nextState;
        icon.textContent = nextState ? '-' : '+';
        group.classList.toggle('active', nextState);
    });
});

// Mobile work-strip starts one card in so users immediately see both scroll directions.
const workGrid = document.querySelector('.work-grid');
if (workGrid && window.matchMedia('(max-width: 600px)').matches) {
    const cards = Array.from(workGrid.querySelectorAll('.work-item'));
    const getCardByTitle = (title) => cards.find((card) => card.querySelector('h3')?.textContent.trim() === title);
    const setCenteredWorkCard = () => {
        const mobileCards = Array.from(workGrid.querySelectorAll('.work-item'));
        if (!mobileCards.length) {
            return;
        }

        const stripCenter = workGrid.scrollLeft + workGrid.clientWidth / 2;
        let closestCard = mobileCards[0];
        let smallestDistance = Number.POSITIVE_INFINITY;

        mobileCards.forEach((card) => {
            const cardCenter = card.offsetLeft + card.clientWidth / 2;
            const distance = Math.abs(cardCenter - stripCenter);

            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestCard = card;
            }
        });

        mobileCards.forEach((card) => {
            card.classList.toggle('is-centered', card === closestCard);
        });
    };

    const officeBarCard = getCardByTitle('The Office Bar');
    const featuredCard = getCardByTitle('1105 West Peachtree') || workGrid.querySelector('.work-item--active');
    const west12Card = getCardByTitle('40 West 12th');

    if (officeBarCard && featuredCard && west12Card) {
        const prioritized = [officeBarCard, featuredCard, west12Card];
        const remainder = cards.filter((card) => !prioritized.includes(card));

        [...prioritized, ...remainder].forEach((card) => workGrid.appendChild(card));
    }

    requestAnimationFrame(() => {
        const centeredCard = getCardByTitle('1105 West Peachtree') || workGrid.querySelector('.work-item--active') || workGrid.querySelector('.work-item:nth-child(2)');
        if (!centeredCard) {
            return;
        }

        const centeredOffset = centeredCard.offsetLeft - (workGrid.clientWidth - centeredCard.clientWidth) / 2;
        workGrid.scrollLeft = Math.max(0, centeredOffset);
        setCenteredWorkCard();
    });

    let ticking = false;
    workGrid.addEventListener('scroll', () => {
        if (ticking) {
            return;
        }

        ticking = true;
        requestAnimationFrame(() => {
            setCenteredWorkCard();
            ticking = false;
        });
    }, { passive: true });
}

// Creative disciplines accordion
const disciplineCards = Array.from(document.querySelectorAll('.discipline-card'));
const collapseDisciplinesByDefault = window.matchMedia('(max-width: 600px)').matches;

const setDisciplineState = (card, isExpanded) => {
    const toggle = card.querySelector('.discipline-toggle');
    const list = card.querySelector('.discipline-list');
    const icon = card.querySelector('.discipline-icon');

    if (!toggle || !list || !icon) {
        return;
    }

    toggle.setAttribute('aria-expanded', String(isExpanded));
    list.hidden = !isExpanded;
    icon.textContent = isExpanded ? '-' : '+';
    card.classList.toggle('active', isExpanded);
};

disciplineCards.forEach((card) => {
    const toggle = card.querySelector('.discipline-toggle');
    const initiallyExpanded = collapseDisciplinesByDefault ? false : toggle?.getAttribute('aria-expanded') === 'true';

    setDisciplineState(card, initiallyExpanded);

    if (!toggle) {
        return;
    }

    toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const nextState = !isExpanded;

        disciplineCards.forEach((otherCard) => {
            if (otherCard !== card) {
                setDisciplineState(otherCard, false);
            }
        });

        setDisciplineState(card, nextState);
    });
});

// Mobile clients list preview toggle (shows half list by default on small screens).
const clientsColumns = document.querySelector('.clients-columns');
const clientsViewMoreButton = document.querySelector('.clients-view-more');
const clientsMobileQuery = window.matchMedia('(max-width: 600px)');

if (clientsColumns && clientsViewMoreButton) {
    const originalClientLists = Array.from(clientsColumns.querySelectorAll(':scope > ul'));
    const allClientNames = originalClientLists.flatMap((list) => Array.from(list.querySelectorAll('li'), (item) => item.textContent.trim()));
    let generatedMobileLists = [];

    const ensureGeneratedMobileLists = () => {
        if (generatedMobileLists.length) {
            return generatedMobileLists;
        }

        generatedMobileLists = [document.createElement('ul'), document.createElement('ul')];
        generatedMobileLists.forEach((list) => {
            list.className = 'clients-mobile-list';
            clientsColumns.appendChild(list);
        });

        return generatedMobileLists;
    };

    const renderMobileClientColumns = (expanded) => {
        const mobileLists = ensureGeneratedMobileLists();
        const visibleNames = expanded ? allClientNames : allClientNames.slice(0, Math.ceil(allClientNames.length / 2));
        const splitIndex = Math.ceil(visibleNames.length / 2);
        const columnGroups = [visibleNames.slice(0, splitIndex), visibleNames.slice(splitIndex)];

        clientsColumns.classList.add('is-mobile-balanced');

        mobileLists.forEach((list, index) => {
            list.innerHTML = columnGroups[index].map((name) => `<li>${name}</li>`).join('');
        });
    };

    const resetClientsPreviewForViewport = () => {
        if (clientsMobileQuery.matches) {
            clientsColumns.classList.remove('is-expanded');
            renderMobileClientColumns(false);
            clientsViewMoreButton.setAttribute('aria-expanded', 'false');
            clientsViewMoreButton.textContent = 'View More';
            return;
        }

        clientsColumns.classList.remove('is-mobile-balanced');
        clientsColumns.classList.add('is-expanded');
        clientsViewMoreButton.setAttribute('aria-expanded', 'true');
        clientsViewMoreButton.textContent = 'View More';
    };

    resetClientsPreviewForViewport();

    clientsMobileQuery.addEventListener('change', resetClientsPreviewForViewport);

    clientsViewMoreButton.addEventListener('click', () => {
        if (!clientsMobileQuery.matches) {
            return;
        }

        const willExpand = !clientsColumns.classList.contains('is-expanded');
        clientsColumns.classList.toggle('is-expanded', willExpand);
        renderMobileClientColumns(willExpand);
        clientsViewMoreButton.setAttribute('aria-expanded', String(willExpand));
        clientsViewMoreButton.textContent = willExpand ? 'View Less' : 'View More';
    });
}
