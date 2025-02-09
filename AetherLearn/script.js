// Loading Screen
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }, 500);
    }

    // Initialize features based on current page
    initializePage();
});

function initializePage() {
    // Get current page
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('ai-assistant')) {
        initializeAIChat();
    } else if (currentPath.includes('topics')) {
        initializeTopicFilters();
    } else if (currentPath.includes('resources')) {
        initializeResourceFilters();
    }

    // Initialize common features
    initializeSearch();

    // Add new initializations
    initializeMobileMenu();
    initializeScrollReveal();
    initializePageTransitions();
    
    // Add data-scroll attributes to elements that should animate on scroll
    const elementsToAnimate = [
        '.topic-card',
        '.course-card',
        '.feature-card',
        '.category-card',
        '.ai-feature',
        '.path-card'
    ];
    
    elementsToAnimate.forEach(selector => {
        document.querySelectorAll(selector).forEach((el, index) => {
            el.setAttribute('data-scroll', '');
            el.style.transitionDelay = `${index * 0.1}s`;
        });
    });
}

// AI Assistant Chat Functionality
function initializeAIChat() {
    const chatForm = document.querySelector('.chat-form');
    const chatMessages = document.querySelector('.chat-messages');
    const quickActions = document.querySelectorAll('.quick-action-btn');

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = chatForm.querySelector('input');
            const message = input.value.trim();

            if (message) {
                // Add user message
                addMessage('user', message);
                input.value = '';

                // Simulate AI response
                simulateTyping();
                setTimeout(() => {
                    addMessage('ai', getAIResponse(message));
                }, 1500);
            }
        });
    }

    if (quickActions) {
        quickActions.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.querySelector('span').textContent;
                addMessage('user', action);
                simulateTyping();
                setTimeout(() => {
                    addMessage('ai', getQuickActionResponse(action));
                }, 1500);
            });
        });
    }
}

function addMessage(type, content) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = `<i class="fas fa-${type === 'ai' ? 'robot' : 'user'}"></i>`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function simulateTyping() {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Topic Filtering Functionality
function initializeTopicFilters() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    const topicCards = document.querySelectorAll('.topic-card');

    if (categoryBtns && topicCards) {
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                
                // Update active button
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter topics
                topicCards.forEach(card => {
                    if (category === 'all' || card.dataset.category === category) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
}

// Resource Filtering Functionality
function initializeResourceFilters() {
    const filters = document.querySelectorAll('.filter-group select');
    if (filters) {
        filters.forEach(filter => {
            filter.addEventListener('change', updateResourceList);
        });
    }
}

function updateResourceList() {
    // This would typically involve an API call
    // For now, we'll just simulate loading
    const resourcesGrid = document.querySelector('.resources-grid');
    if (resourcesGrid) {
        resourcesGrid.style.opacity = '0.5';
        setTimeout(() => {
            resourcesGrid.style.opacity = '1';
        }, 500);
    }
}

// Search Functionality
function initializeSearch() {
    const searchInputs = document.querySelectorAll('.search-bar input');
    
    searchInputs.forEach(input => {
        input.addEventListener('input', debounce(handleSearch, 300));
    });
}

function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    // Implement search logic here
    // This would typically involve an API call
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Mock AI Responses
function getAIResponse(message) {
    // Implement more sophisticated response logic
    return `I understand you're asking about "${message}". Let me help you with that...`;
}

function getQuickActionResponse(action) {
    // Implement responses for quick actions
    return `I'll help you ${action.toLowerCase()}. Let's get started...`;
}

// AI Search Functionality
const aiSearchInput = document.querySelector('.ai-search-input');
const aiSearchButton = document.querySelector('.ai-search-button');
const searchSuggestions = document.querySelector('.search-suggestions');

const demoSuggestions = [
    { text: 'Web Development Bootcamp', icon: 'fa-code', category: 'Course' },
    { text: 'Data Science Masterclass', icon: 'fa-chart-bar', category: 'Course' },
    { text: 'AI and Machine Learning for Beginners', icon: 'fa-robot', category: 'Course' },
    { text: 'Mobile App Development with React Native', icon: 'fa-mobile-alt', category: 'Course' },
    { text: 'Python for Data Analysis', icon: 'fa-python', category: 'Course' },
    { text: 'JavaScript Fundamentals', icon: 'fa-js', category: 'Course' },
    { text: 'HTML and CSS Basics', icon: 'fa-html5', category: 'Course' },
    { text: 'React.js Crash Course', icon: 'fa-react', category: 'Course' },
    { text: 'Node.js and Express.js', icon: 'fa-node-js', category: 'Course' },
    { text: 'Learn to build REST APIs', icon: 'fa-server', category: 'Tutorial' },
    { text: 'Build a personal portfolio website', icon: 'fa-laptop-code', category: 'Project' },
    { text: 'Create a data visualization dashboard', icon: 'fa-chart-pie', category: 'Project' },
    { text: 'eBook: The Ultimate Guide to Web Development', icon: 'fa-book-open', category: 'eBook' },
    { text: 'Article: Top 10 AI Trends in 2025', icon: 'fa-newspaper', category: 'Article' }
];

function showSearchSuggestions() {
    searchSuggestions.innerHTML = demoSuggestions
        .map(suggestion => `
            <div class="suggestion-item">
                <i class="fas ${suggestion.icon}"></i>
                <span>${suggestion.text}</span>
                <span class="suggestion-category">${suggestion.category}</span>
            </div>
        `)
        .join('');
    searchSuggestions.classList.add('active');
}

function hideSearchSuggestions() {
    searchSuggestions.classList.remove('active');
}

aiSearchInput.addEventListener('focus', showSearchSuggestions);
aiSearchInput.addEventListener('blur', () => {
    setTimeout(hideSearchSuggestions, 200);
});

aiSearchButton.addEventListener('click', () => {
    const searchQuery = aiSearchInput.value.trim();
    const hero = document.getElementById('hero');
    if (searchQuery) {
        // Remove previous search results if any
        const existingResults = hero.querySelector('.search-results-container');
        if (existingResults) {
            hero.removeChild(existingResults);
        }

        // Show loading state
        aiSearchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Results...';
        aiSearchButton.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Reset button state
            aiSearchButton.innerHTML = '<i class="fas fa-magic"></i> Create Learning Path';
            aiSearchButton.disabled = false;
            
            showSearchResults(searchQuery); // Call function to display results

        }, 2000);
    }
});
      
function showSearchResults(query) {
    const searchResultsContainer = document.createElement('div');
    searchResultsContainer.classList.add('search-results-container');
    searchResultsContainer.innerHTML = `
        <h3>Search Results for "${query}"</h3>
        <div class="search-result-item">
            <i class="fas fa-book-open"></i>
            <span>eBook: The Ultimate Guide to Web Development</span>
            <span class="result-category">eBook</span>
        </div>
        <div class="search-result-item">
            <i class="fas fa-chart-bar"></i>
            <span>Course: Data Science Masterclass</span>
            <span class="result-category">Course</span>
        </div>
        <div class="search-result-item">
            <i class="fas fa-newspaper"></i>
            <span>Article: Top 10 AI Trends in 2025</span>
            <span class="result-category">Article</span>
        </div>
        <div class="search-result-item">
            <i class="fas fa-code"></i>
            <span>Learning Path: Web Development Bootcamp</span>
            <span class="result-category">Learning Path</span>
        </div>
    `;
    hero.appendChild(searchResultsContainer); // Append to hero section
}

// Mobile Menu Handler
function initializeMobileMenu() {
    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.className = 'mobile-menu-btn';
    mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    
    const nav = document.querySelector('nav');
    const navLinks = document.querySelector('.nav-links');
    
    if (nav && navLinks) {
        nav.insertBefore(mobileMenuBtn, navLinks);
        
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuBtn.innerHTML = navLinks.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
    }
}

// Scroll Reveal
function initializeScrollReveal() {
    const scrollElements = document.querySelectorAll('[data-scroll]');
    
    const elementInView = (el, percentageScroll = 100) => {
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <= 
            ((window.innerHeight || document.documentElement.clientHeight) * (percentageScroll/100))
        );
    };
    
    const displayScrollElement = (element) => {
        element.classList.add('is-visible');
    };
    
    const hideScrollElement = (element) => {
        element.classList.remove('is-visible');
    };
    
    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 90)) {
                displayScrollElement(el);
            } else {
                hideScrollElement(el);
            }
        });
    };
    
    window.addEventListener('scroll', handleScrollAnimation);
}

// Page Transition
function initializePageTransitions() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.href.includes(window.location.origin)) {
            e.preventDefault();
            document.body.classList.add('page-transition');
            
            setTimeout(() => {
                window.location = link.href;
            }, 300);
        }
    });
}

