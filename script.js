document.addEventListener("DOMContentLoaded", () => {
    // Data for themes (since we're not using React)
    const THEMES = [
        "tokyo-night",
        "rose-pine",
        "vibrant"
    ];

    let currentThemeIndex = 0;
    const body = document.body;
    const themeToggleBtn = document.getElementById("theme-toggle");
    const sidebar = document.getElementById("sidebar");
    const mobileMenuBtn = document.getElementById("mobile-menu-button");
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll("main section[id]");
    const dropupToggleBtn = document.getElementById("dropup-toggle");
    const dropupMenu = document.getElementById("dropup-menu");
    const dropupLinks = document.querySelectorAll(".dropup-link");

    // Initialize with the first theme
    body.classList.add(THEMES[currentThemeIndex]);

    // Theme Toggle Logic
    const toggleTheme = () => {
        body.classList.remove(THEMES[currentThemeIndex]);
        currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
        body.classList.add(THEMES[currentThemeIndex]);
    };
    themeToggleBtn.addEventListener("click", toggleTheme);

    // Sidebar/Mobile Menu Logic
    mobileMenuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("-translate-x-full");
        sidebar.classList.toggle("translate-x-0");
    });

    // Close sidebar on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) { // Only on mobile
                sidebar.classList.remove("translate-x-0");
                sidebar.classList.add("-translate-x-full");
            }
        });
    });

    // Drop-up Menu Logic
    dropupToggleBtn.addEventListener("click", () => {
        dropupMenu.classList.toggle("open");
    });
    dropupLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const sectionId = e.target.getAttribute('data-section');
            document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
            dropupMenu.classList.remove("open");
        });
    });

    // Scroll-based section highlighting
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // Adjust this value as needed
    };

    const navObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const currentId = entry.target.id;
                navLinks.forEach(link => {
                    link.classList.remove("active");
                });
                const activeLink = document.querySelector(`.nav-link.${currentId}-link`);
                if (activeLink) {
                    activeLink.classList.add("active");
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        navObserver.observe(section);
    });

    // Drop-in animation Intersection Observer
    const dropInObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    dropInObserver.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.2,
        },
    );

    document.querySelectorAll(".drop-in-element").forEach((element) => {
        dropInObserver.observe(element);
    });

    // Initial check for active section on load
    const initialCheck = () => {
        const offset = window.innerHeight * 0.3;
        const scrollPosition = window.scrollY + offset;
        let currentSectionId = "home";
        for (let i = sections.length - 1; i >= 0; i--) {
            if (sections[i].offsetTop <= scrollPosition) {
                currentSectionId = sections[i].id;
                break;
            }
        }
        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${currentSectionId}`) {
                link.classList.add("active");
            }
        });
    };

    window.addEventListener("scroll", initialCheck);
    initialCheck();
});
