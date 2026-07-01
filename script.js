// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Navbar: transparent on hero, fixed light bar after scrolling.
const navbar = document.querySelector('.navbar');
const navLogo = document.querySelector('.nav-logo');

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

// Industry filter accordion
document.querySelectorAll('.industry-filter-group').forEach(group => {
    const toggle = group.querySelector('.industry-toggle');
    const list = group.querySelector('.industry-filter-list');
    const icon = group.querySelector('.industry-toggle-icon');

    if (!toggle || !list || !icon) {
        return;
    }

    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        const nextState = !expanded;

        toggle.setAttribute('aria-expanded', String(nextState));
        list.hidden = !nextState;
        icon.textContent = nextState ? '-' : '+';
    });
});

// Creative disciplines accordion
document.querySelectorAll('.discipline-card').forEach(card => {
    const toggle = card.querySelector('.discipline-toggle');
    const list = card.querySelector('.discipline-list');
    const icon = card.querySelector('.discipline-icon');

    if (!toggle || !list || !icon) {
        return;
    }

    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        const nextState = !expanded;

        toggle.setAttribute('aria-expanded', String(nextState));
        list.hidden = !nextState;
        icon.innerHTML = nextState ? '&#65124;' : '&#65125;';
    });
});
