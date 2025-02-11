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

// AI Assistant Chat Initialization
function initializeAIChat() {
    // Let the AIChat class handle everything
    new AIChat();
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

// AI Chat Integration
class AIChat {
    constructor() {
        this.chatForm = document.querySelector('#chatForm');
        this.chatMessages = document.querySelector('#chatMessages');
        this.suggestionsChips = document.querySelectorAll('.suggestion-chip');
        this.clearButton = document.querySelector('.action-btn[title="Clear Chat"]');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.chatForm) {
            this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (this.suggestionsChips) {
            this.suggestionsChips.forEach(btn => {
                btn.addEventListener('click', () => this.handleQuickAction(btn));
            });
        }

        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearChat());
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const textarea = this.chatForm.querySelector('textarea');
        const sendButton = this.chatForm.querySelector('.send-button');
        const message = textarea.value.trim();

        if (message) {
            // Disable input and show loading state
            textarea.disabled = true;
            sendButton.disabled = true;
            sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            // Add user message
            this.addMessage('user', message);

            try {
                // Make API call to Gemini
                const response = await this.getAIResponse(message);
                this.addMessage('ai', response);
            } catch (error) {
                this.addMessage('ai', error.message || 'Sorry, I encountered an error. Please try again.');
                console.error('AI Error:', error);
            } finally {
                // Re-enable input and restore send button
                textarea.disabled = false;
                sendButton.disabled = false;
                sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
                textarea.focus();
                textarea.value = '';
            }
        }
    }

    async handleQuickAction(btn) {
        const suggestion = btn.textContent.trim();
        this.addMessage('user', suggestion);
        
        try {
            // Make API call to Gemini
            const response = await this.getAIResponse(suggestion);
            this.addMessage('ai', response);
        } catch (error) {
            this.addMessage('ai', error.message || 'Sorry, I encountered an error. Please try again.');
            console.error('AI Error:', error);
        }
    }

    async getAIResponse(message) {
        try {
            const response = await fetch('http://localhost:3001/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    context: 'You are an AI learning assistant for AetherLearn. You help users learn various topics in technology, programming, and other subjects. Keep responses concise, friendly, and educational.'
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('API Error:', error);
            throw new Error('Sorry, I had trouble connecting to my AI service. Please try again in a moment.');
        }
    }

    formatResponse(text) {
        // Convert markdown-style code blocks to HTML
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        
        // Convert single backtick code to inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Convert URLs to links
        text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        
        // Convert bullet points
        text = text.replace(/^\s*[-*]\s(.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        return text;
    }

    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${type === 'ai' ? 'robot' : 'user'}"></i>
            </div>
            <div class="message-content">
                ${type === 'ai' ? this.formatResponse(content) : `<p>${content}</p>`}
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Add syntax highlighting for code blocks if response is from AI
        if (type === 'ai') {
            messageDiv.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai typing';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = this.chatMessages.querySelector('.typing');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    clearChat() {
        while (this.chatMessages.children.length > 1) {
            this.chatMessages.removeChild(this.chatMessages.lastChild);
        }
    }
}

// Initialize AI Chat when on AI Assistant page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('ai-assistant')) {
        const chat = new AIChat();
        // Remove any existing messages except the welcome message
        const chatMessages = document.querySelector('.chat-messages');
        while (chatMessages && chatMessages.children.length > 1) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
    }
});

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

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const suggestionsContainer = document.getElementById('searchSuggestions');

    // Dummy suggestions
    const dummySuggestions = [
        'Machine Learning Fundamentals',
        'Web Development with React',
        'Python Programming',
        'Data Science Basics',
        'JavaScript Advanced Concepts',
        'Mobile App Development',
        'Cloud Computing AWS',
        'Artificial Intelligence Ethics'
    ];

    if (searchInput && suggestionsContainer) {
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            
            if (value.length > 0) {
                const filteredSuggestions = dummySuggestions.filter(suggestion =>
                    suggestion.toLowerCase().includes(value)
                );
                
                displaySuggestions(filteredSuggestions);
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    function displaySuggestions(suggestions) {
        suggestionsContainer.innerHTML = suggestions
            .map(suggestion => `
                <div class="suggestion-item">${suggestion}</div>
            `)
            .join('');

        // Add click handlers for suggestions
        const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');
        suggestionItems.forEach(item => {
            item.addEventListener('click', () => {
                searchInput.value = item.textContent.trim();
                suggestionsContainer.style.display = 'none';
            });
        });
    }

    // Close search overlay
    closeSearchBtn?.addEventListener('click', () => {
        searchOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
            searchOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close if clicked outside search content
    searchOverlay?.addEventListener('click', (e) => {
        if (e.target === searchOverlay) {
            searchOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Handle search input
    searchInput?.addEventListener('input', debounce((e) => {
        const query = e.target.value;
        if (query.length >= 2) {
            // Implement search logic here
            console.log('Searching for:', query);
        }
    }, 300));
});

// Debounce helper function
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
