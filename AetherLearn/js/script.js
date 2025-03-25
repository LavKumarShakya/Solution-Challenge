// Configuration
const CONFIG = {
    GEMINI_API_KEY: 'AIzaSyCTXQs7wWnAsekXkYban3EJvuBPwm0qDRM'
};

// Initialize page features
document.addEventListener('DOMContentLoaded', () => {
    // Initialize features first
    initializePage();
});

// Initialize page features
function initializePage() {
    // Get current page
    const currentPath = window.location.pathname;
    
    // Initialize common features
    initializeSearch();
    initializeMobileMenu();
    initializePageTransitions();

    // Initialize AI Assistant if we're on the AI assistant page
    if (currentPath.includes('ai-assistant')) {
        initializeAIChat();
    }
    
    // Only run course functionality if we're on the courses page
    if (currentPath.includes('courses')) {
        // Filter functionality
        const filters = {
            category: document.getElementById('category'),
            level: document.getElementById('level'),
            duration: document.getElementById('duration'),
            sort: document.getElementById('sort')
        };

        // Course filtering system
        Object.values(filters).forEach(filter => {
            if (filter) {
                filter.addEventListener('change', updateCourses);
            }
        });

        // Pagination functionality
        const paginationBtns = document.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                paginationBtns.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                // Update courses based on page
                updateCourses();
            });
        });

        // Course card hover effects
        const courseCards = document.querySelectorAll('.course-card');
        courseCards.forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                const thumbnail = card.querySelector('.course-thumbnail img');
                if (thumbnail) {
                    thumbnail.style.transform = 'scale(1.1)';
                }
            });

            card.addEventListener('mouseleave', (e) => {
                const thumbnail = card.querySelector('.course-thumbnail img');
                if (thumbnail) {
                    thumbnail.style.transform = 'scale(1)';
                }
            });
        });

        // Initialize images for course thumbnails - fixing issue with black screens
        const courseImages = document.querySelectorAll('.course-thumbnail img');
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        // Check if data-src exists, otherwise use the existing src attribute
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                        } else {
                            // Ensure the src attribute is properly loaded
                            const currentSrc = img.getAttribute('src');
                            if (currentSrc) {
                                // Force a reload of the image if needed
                                img.src = currentSrc;
                            }
                        }
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            });

            courseImages.forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
}

// Course filtering functionality
function updateCourses() {
    const courseGrid = document.querySelector('.course-grid');
    if (!courseGrid) return;

    // Add loading animation
    courseGrid.style.opacity = '0.5';
    courseGrid.style.pointerEvents = 'none';

    // Get current filter values
    const currentFilters = {
        category: document.getElementById('category')?.value,
        level: document.getElementById('level')?.value,
        duration: document.getElementById('duration')?.value,
        sort: document.getElementById('sort')?.value,
        page: document.querySelector('.pagination-btn.active')?.textContent || '1'
    };

    // Simulate API call with setTimeout
    setTimeout(() => {
        // Here you would typically make an API call to get filtered courses
        console.log('Applying filters:', currentFilters);

        // Remove loading state
        courseGrid.style.opacity = '1';
        courseGrid.style.pointerEvents = 'auto';

        // Trigger AOS refresh for smooth animations
        if (typeof AOS !== 'undefined') {
            AOS.refresh();
        }
    }, 500);
}

// AI Assistant Chat Initialization
function initializeAIChat() {
    return new Promise((resolve) => {
        // Initialize chat after a small delay to ensure DOM is ready
        setTimeout(() => {
            const chat = new AIChat();
            resolve(chat);
        }, 100);
    });
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
        this.chatInput = document.querySelector('#chatInput');
        this.clearButton = document.querySelector('.action-btn[title="Clear Chat"]');
        
        this.setupEventListeners();
        this.setupInputHandling();
        this.loadSavedMessages();
    }

    async loadSavedMessages() {
        // Keep the welcome message
        const welcomeMessage = this.chatMessages.firstElementChild;
        this.chatMessages.innerHTML = '';
        this.chatMessages.appendChild(welcomeMessage);

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'GET_CHAT_MESSAGES'
            });
        }
    }

    setupEventListeners() {
        if (this.chatForm) {
            this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearChat());
        }

        // Listen for service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'CHAT_MESSAGES') {
                    // Add saved messages to chat
                    event.data.data.forEach(message => {
                        this.addMessage(message.type, message.content, false);
                    });
                }
            });
        }

        // Add input handling for textarea auto-resize
        if (this.chatInput) {
            ['input', 'change'].forEach(event => {
                this.chatInput.addEventListener(event, () => this.adjustTextareaHeight());
            });

            // Handle Enter for submit (Shift+Enter or Ctrl+Enter for newline)
            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey || e.ctrlKey) {
                        // For Shift+Enter or Ctrl+Enter, insert a newline
                        const start = this.chatInput.selectionStart;
                        const end = this.chatInput.selectionEnd;
                        const value = this.chatInput.value;
                        
                        // Insert newline at cursor position
                        this.chatInput.value = value.substring(0, start) + '\n' + value.substring(end);
                        
                        // Move cursor after newline
                        this.chatInput.selectionStart = this.chatInput.selectionEnd = start + 1;
                        
                        e.preventDefault();
                    } else {
                        // Regular Enter sends the message
                        e.preventDefault();
                        e.stopPropagation();
                        const fakeSubmitEvent = new Event('submit', {
                            cancelable: true,
                            bubbles: true
                        });
                        this.handleSubmit(fakeSubmitEvent);
                    }
                }
            });

            // Prevent form from submitting normally
            this.chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
            }, true);
        }
    }

    setupInputHandling() {
        if (!this.chatInput) return;

        // Set initial height
        this.adjustTextareaHeight();

        // Clear extra whitespace on focus
        this.chatInput.addEventListener('focus', () => {
            this.chatInput.value = this.chatInput.value.trim();
        });
    }

    adjustTextareaHeight() {
        const textarea = this.chatInput;
        if (!textarea) return;

        // Reset height to auto to get proper scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate new height (with max-height limit)
        const maxHeight = 150;
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
        
        // Add scrollbar if content exceeds max height
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
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
                if (response) {
                    this.addMessage('ai', response);
                }
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
        const API_KEY = CONFIG.GEMINI_API_KEY;
        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        
        try {
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{
                            text: `You are AetherLearn's AI learning companion, a friendly and knowledgeable assistant passionate about helping users learn and grow across all disciplines. Your role is to provide engaging, personalized support while making learning fun and accessible.

    Personality Traits:
    - Friendly and approachable, like a knowledgeable friend
    - Enthusiastic about learning with an upbeat attitude
    - Professional yet warm in communication
    - Engaging with appropriate humor when suitable
    - Patient and understanding with all skill levels
    - Creative in suggesting learning approaches

    Key Capabilities:
    - Create personalized learning paths for any subject
    - Generate study materials (summaries, flashcards, mind maps)
    - Provide multi-style explanations (visual, theoretical, practical)
    - Find and recommend free educational resources
    - Help with content organization and study planning
    - Assist with various subjects beyond just technology
    - Support different learning preferences and styles
    - Offer step-by-step problem-solving guidance

    Available AI Tools:
    - Smart Study Assistant: Real-time explanations and solutions
    - Learning Path Creator: Personalized roadmap generation
    - Content Enhancer: Transform content into interactive materials
    - Resource Organizer: Smart bookmarking and progress tracking
    - Mind Map Generator: Visual concept mapping
    - Quiz Generator: Create personalized practice tests
    - Community Features: Study groups and resource sharing

    Focus Areas:
    - Technology & Programming
    - Science & Engineering
    - Arts & Digital Design
    - Business & Economics
    - Language Learning
    - Personal Development
    - Academic Subjects
    - Hobbies & Creative Skills

    Response Guidelines:
    - Use markdown formatting for clear structure
    - Include relevant examples and practical applications
    - Suggest appropriate AI tools for complex tasks
    - Break down complex topics into digestible parts
    - Provide links to free learning resources
    - Support answers with visuals when helpful
    - Keep an encouraging and positive tone
    - Be concise yet comprehensive
    - Do not hallucinate or generate false information

    For non-relevant or off-topic questions:
    - Respond with friendly humor while staying professional
    - Guide the conversation back to learning when appropriate
    - Maintain helpfulness while setting clear boundaries
    
    User's message: ${message}`
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Gemini API Error:', errorData);
                if (response.status === 403) {
                    throw new Error('Invalid API key. Please check your Gemini API key configuration.');
                }
                throw new Error('Failed to get response from Gemini API. Please try again.');
            }

            const data = await response.json();
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response format from Gemini API');
            }
            
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    formatResponse(text) {
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });

        try {
            const formattedHtml = marked.parse(text);
            return `<div class="markdown-content">${formattedHtml}</div>`;
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return `<p>${this.escapeHtml(text)}</p>`;
        }
    }

    formatUserMessage(text) {
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addMessage(type, content, store = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${type === 'ai' ? 'robot' : 'user'}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${type === 'ai' ?
                        this.formatResponse(content) :
                        `<div class="message-text"><p>${this.formatUserMessage(content)}</p></div>`
                    }
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        if (type === 'ai') {
            messageDiv.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }

        // Store message if needed
        if (store && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'STORE_CHAT_MESSAGE',
                data: { type, content }
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

        // Clear stored messages
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CLEAR_CHAT'
            });
        }
    }
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

aiSearchInput?.addEventListener('focus', showSearchSuggestions);
aiSearchInput?.addEventListener('blur', () => {
    setTimeout(hideSearchSuggestions, 200);
});

aiSearchButton?.addEventListener('click', () => {
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
    hero?.appendChild(searchResultsContainer);
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

// Initialize search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const suggestionsContainer = document.getElementById('searchSuggestions');

    // Dummy suggestions
    const dummySuggestions = [
        "Machine Learning Fundamentals",
        "Web Development with React",
        "Python Programming",
        "Mobile App Development",
        "Artificial Intelligence",
        "Cloud Computing AWS",
        "Data Science with Python",
        "Cybersecurity Basics",
        "Blockchain Technology",
        "DevOps & CI/CD",
        "Game Development with Unity",
        "Full-Stack Web Development"
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
                <div class="search-suggestion-item">
                    <i class="fas fa-search"></i>
                    ${suggestion}
                </div>
            `)
            .join('');

        // Don't add click handlers - suggestions are for display only
        const suggestionItems = suggestionsContainer.querySelectorAll('.search-suggestion-item');
        suggestionItems.forEach(item => {
            item.addEventListener('mouseover', () => {
                searchInput.value = item.textContent.trim();
            });
        });
    }

    // Close search overlay
    const searchOverlay = document.querySelector('.search-overlay');
    const closeSearchBtn = document.querySelector('.close-search');

    closeSearchBtn?.addEventListener('click', () => {
        searchOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    });


    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchOverlay?.classList.contains('active')) {
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
});
