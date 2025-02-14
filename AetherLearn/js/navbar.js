document.addEventListener('DOMContentLoaded', async function() {
    const navbarContainer = document.getElementById('navbar-placeholder');
    try {
        const response = await fetch('navbar.html');
        if (!response.ok) {
            throw new Error('Failed to load navbar');
        }
        const html = await response.text();
        navbarContainer.innerHTML = html;

        // Set active nav link based on current page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || 
                (href === '/' && currentPage === 'index.html') ||
                (currentPage.startsWith(href.split('.')[0]))) {
                link.classList.add('active');
            }
        });

        // Initialize search functionality
        initializeSearch();
    } catch (error) {
        console.error('Error loading navbar:', error);
        navbarContainer.innerHTML = '<p>Error loading navigation. Please refresh the page.</p>';
    }
});

function initializeSearch() {
    const searchBtn = document.querySelector('.nav-search-btn');
    const searchOverlay = document.querySelector('.search-overlay');
    const closeSearchBtn = document.querySelector('.close-search');
    const searchInput = document.querySelector('.search-overlay-input');

    if (!searchBtn || !searchOverlay || !closeSearchBtn || !searchInput) {
        console.error('Search elements not found');
        return;
    }

    // Open search overlay
    searchBtn.addEventListener('click', () => {
        searchOverlay.classList.add('active');
        searchInput.focus();
        document.body.style.overflow = 'hidden';
    });

    // Close search overlay
    closeSearchBtn.addEventListener('click', closeSearch);

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
            closeSearch();
        }
    });

    // Close if clicked outside search content
    searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) {
            closeSearch();
        }
    });

    // Handle search input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                performSearch(query);
            }
        }, 300);
    });
}

function closeSearch() {
    const searchOverlay = document.querySelector('.search-overlay');
    const searchInput = document.querySelector('.search-overlay-input');
    
    searchOverlay.classList.remove('active');
    document.body.style.overflow = '';
    searchInput.value = '';
}

async function performSearch(query) {
    // TODO: Implement actual search functionality
    console.log('Searching for:', query);
    // This is where you would make an API call to your backend search service
    // and display the results in the search overlay
}