// Configuration
const CONFIG = {
    GEMINI_API_KEY: 'AIzaSyCTXQs7wWnAsekXkYban3EJvuBPwm0qDRM',
    API_BASE_URL: 'http://localhost:8000/api'
};

// Learning path functions will be available from learning_path.js script

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
    initializeLearningPathSearch();

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
    static STORAGE_KEY = 'aetherlearn-chat-messages';

    constructor() {
        this.chatForm = document.querySelector('#chatForm');
        this.chatMessages = document.querySelector('#chatMessages');
        this.chatInput = document.querySelector('#chatInput');
        this.clearButton = document.querySelector('.action-btn[title="Clear Chat"]');
        
        // Initialize storage
        this.initializeStorage();
        
        this.setupEventListeners();
        this.setupInputHandling();
        this.loadSavedMessages();
    }

    initializeStorage() {
        try {
            if (!sessionStorage.getItem(AIChat.STORAGE_KEY)) {
                sessionStorage.setItem(AIChat.STORAGE_KEY, JSON.stringify([]));
            }
            // Validate stored data
            const stored = sessionStorage.getItem(AIChat.STORAGE_KEY);
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) {
                throw new Error('Invalid storage format');
            }
        } catch (error) {
            console.error('Storage initialization error:', error);
            sessionStorage.setItem(AIChat.STORAGE_KEY, JSON.stringify([]));
        }
    }

    getStoredMessages() {
        try {
            const stored = sessionStorage.getItem(AIChat.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading messages:', error);
            return [];
        }
    }

    storeMessages(messages) {
        try {
            sessionStorage.setItem(AIChat.STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error('Error storing messages:', error);
        }
    }

    loadSavedMessages() {
        // Keep the welcome message
        const welcomeMessage = this.chatMessages.firstElementChild;
        this.chatMessages.innerHTML = '';
        this.chatMessages.appendChild(welcomeMessage);

        // Load messages from session storage
        const messages = this.getStoredMessages();
        messages.forEach(message => {
            this.addMessage(message.type, message.content, false);
        });
    }

    setupEventListeners() {
        if (this.chatForm) {
            this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearChat());
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
                this.adjustTextareaHeight();
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
                            text: `You are AetherLearn's AI Learning Companion - an advanced educational assistant powered by Gemini API and integrated with cutting-edge learning technologies. You're part of a revolutionary platform that democratizes access to high-quality education through AI-driven personalization and comprehensive resource aggregation.

## ABOUT AETHERLEARN PLATFORM

**Core Mission**: AetherLearn revolutionizes digital education by combining advanced AI with robust resource aggregation, ensuring learners have free and easy access to diverse, high-quality educational materials from across the web.

**Unique Value Proposition**: Unlike static content libraries, AetherLearn leverages AI to deeply understand individual learning styles and dynamically transforms content into hyper-personalized experiences that adapt to each user's needs for faster understanding and tangible results.

**Platform Architecture**:
- **Frontend**: HTML5, CSS3, JavaScript with React.js and TailwindCSS
- **Backend**: Node.js and Express.js with TypeScript, Python FastAPI
- **Database**: Firebase (NoSQL) with Redis caching, MongoDB for user-generated content
- **AI Processing**: Vertex AI Generative Models, Gemini API for conversational support
- **Resource Discovery**: Google Custom Search API for real web resource aggregation

## CORE PLATFORM FEATURES

**1. AI-Powered Learning Dashboard**
- Personalized dashboard with adaptive modules
- Real-time progress tracking across all learning activities
- Intelligent recommendations based on learning patterns

**2. Dynamic Content Aggregation System**
- Scans, assesses, and continuously updates educational materials from multiple sources
- Uses Google Custom Search API to find real, accessible web resources
- Vertex AI Gemini analyzes and categorizes content for educational quality

**3. Universal Search Engine**
- Smart filtering combines platform content with aggregated open educational resources
- 3-stage processing: Search Processing → Resource Discovery → Learning Path Results
- Real-time progress tracking through radar visualization

**4. Advanced AI Learning Tools** (All powered by Vertex AI):

   **a) Flashcard Generator**
   - Extracts key concepts from any content, URL, or topic
   - Creates question-answer pairs with difficulty customization
   - Supports beginner, intermediate, and advanced difficulty levels
   - Interactive flip-card interface with progress tracking

   **b) Quiz Generator**
   - Creates multiple-choice, true/false, and short-answer questions
   - Adapts complexity based on user skill level
   - Provides detailed explanations for each answer
   - Real-time scoring and performance analytics

   **c) Mind Map Generator**
   - Visualizes knowledge hierarchically with up to 4 depth levels
   - Creates interactive D3.js visualizations
   - Supports simple, medium, and complex complexity settings
   - Enables conceptual relationship mapping

   **d) AI Project Mentor**
   - Generates personalized project ideas based on user skills and interests
   - Provides detailed project roadmaps and guidance
   - Offers challenge identification and solution strategies
   - Includes best practices and evaluation criteria

**5. Personalized Learning Path Creator**
- Develops fully customized course pathways
- Adapts to different learning styles (visual, auditory, kinesthetic)
- Integrates real web resources from Google Custom Search
- Includes estimated completion times and difficulty progression

**6. Community Hub & Collaboration**
- Peer learning and resource sharing
- Study groups and mentorship programs
- User-generated content integration
- Social learning tools and discussions

**7. Advanced Accessibility Features**
- Multilingual support for 50+ languages
- Screen reader optimization
- Dyslexia-friendly fonts and layouts
- Offline capabilities for uninterrupted learning

## YOUR CAPABILITIES AS AI COMPANION

**Technical Expertise**: You can provide in-depth assistance with:
- Programming (Python, JavaScript, React, Node.js, TypeScript)
- Web Development (HTML5, CSS3, Frontend/Backend development)
- AI/ML concepts (Vertex AI, Gemini API, machine learning models)
- Database technologies (Firebase, MongoDB, Redis)
- Cloud platforms (Google Cloud, deployment strategies)
- API integration and microservices architecture

**Learning Support**:
- Create step-by-step learning roadmaps for any technical topic
- Explain complex concepts using multiple learning styles
- Recommend specific AetherLearn tools for different learning tasks
- Provide code examples and practical implementations
- Suggest project ideas aligned with user skill levels

**Platform Integration**: You can:
- Guide users to appropriate AI tools within AetherLearn
- Explain how to use flashcard generators, quiz creators, mind maps
- Help users navigate the learning path creation process
- Recommend best practices for using the resource aggregator
- Assist with community features and collaboration tools

**Problem-Solving Approach**:
- Break down complex technical challenges into manageable steps
- Provide multiple solution approaches
- Offer debugging strategies and troubleshooting tips
- Connect theoretical knowledge to practical applications
- Suggest relevant resources from AetherLearn's aggregated content

## RESPONSE GUIDELINES

**Communication Style**:
- Friendly and approachable, like a knowledgeable mentor
- Enthusiastic about learning with technical depth
- Professional yet warm, adapting to user's technical level
- Use appropriate technical terminology with clear explanations
- **Use emojis sparingly and strategically to enhance communication without overwhelming the content**

**Content Structure**:
- Use markdown formatting for clear organization
- Include code examples when relevant
- Provide step-by-step instructions for complex topics
- Suggest specific AetherLearn tools that can help
- Include practical applications and real-world examples
- **Add occasional emojis to highlight key points and maintain engagement, but prioritize clarity over decoration**

**Tool Recommendations**:
- When users need study materials → Suggest Flashcard Generator
- For knowledge visualization → Recommend Mind Map Generator
- For assessment needs → Direct to Quiz Generator
- For project applications → Recommend AI Project Mentor
- For comprehensive learning → Guide to Learning Path Creator

**Technical Support**:
- Provide accurate, up-to-date information
- Include relevant code snippets and examples
- Explain both concepts and implementation details
- Connect learning objectives to practical outcomes
- Never hallucinate technical specifications

**Encouraging Growth**:
- Acknowledge user's current level and build confidence
- Provide achievable next steps and milestones
- Celebrate learning progress and breakthroughs
- Maintain optimism while being realistic about challenges


For non-relevant questions, politely redirect to learning topics while maintaining helpfulness and the educational focus of AetherLearn.

## CURRENT USER QUERY
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
                if (typeof hljs !== 'undefined') {
                    if (lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return hljs.highlightAuto(code).value;
                }
                return code; // Return unhighlighted code if hljs is not available
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
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(block);
                }
            });
        }

        // Store message if needed
        if (store) {
            const messages = this.getStoredMessages();
            messages.push({ type, content, timestamp: Date.now() });
            this.storeMessages(messages);
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
        
        // Clear messages from session storage
        sessionStorage.removeItem(AIChat.STORAGE_KEY);
        this.initializeStorage();
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

// Search functionality is now handled by learning_path_search.js
// This section has been removed to avoid conflicts

// Search Process Flow Implementation
document.addEventListener('DOMContentLoaded', function() {
    // Get search form elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.querySelector('.hero-search-button');
    const searchProcessContainer = document.getElementById('searchProcessContainer');
    
    // Get search process stages
    const searchProcessingStage = document.getElementById('searchProcessingStage');
    const resourceDiscoveryStage = document.getElementById('resourceDiscoveryStage');
    const learningPathResultsStage = document.getElementById('learningPathResultsStage');
    
    // Progress elements
    const analysisProgressBar = document.getElementById('analysisProgressBar')?.querySelector('.progress-fill');
    const analysisProgressText = document.getElementById('analysisProgress');
    const discoveryProgressBar = document.getElementById('discoveryProgressBar')?.querySelector('.progress-fill');
    const discoveryProgressText = document.getElementById('discoveryProgress');

    // Get close buttons
    const closeButtons = document.querySelectorAll('.close-process-btn');
    
    // Process step elements
    const processSteps = document.querySelectorAll('.process-step');
    
    // Resource discovery elements
    const resourceDots = document.getElementById('resourceDots');
    const resourcesFoundElement = document.getElementById('resourcesFound');
    const sourcesScannedElement = document.getElementById('sourcesScanned');
    const avgQualityScoreElement = document.getElementById('avgQualityScore');
    const discoveryFeed = document.getElementById('discoveryFeed');
    
    // Search button click handler
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query) {
                startSearchProcess(query);
            }
        });
    }
    
    // Enter key in search input
    if (searchInput) {
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    startSearchProcess(query);
                }
            }
        });
    }
    
    // Close button click handlers
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeSearchProcess();
        });
    });
    
    // Start the search process
    function startSearchProcess(query) {
        // Set the search query in all relevant places
        document.getElementById('searchQueryText').textContent = query;
        document.getElementById('resultQueryText').textContent = query;
        
        // Show the search process container
        searchProcessContainer.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Show the first stage
        searchProcessingStage.style.display = 'block';
        
        // Start the analysis progress simulation
        simulateAnalysisProgress();
    }
    
    // Close the search process
    function closeSearchProcess() {
        searchProcessContainer.style.display = 'none';
        searchProcessingStage.style.display = 'none';
        resourceDiscoveryStage.style.display = 'none';
        learningPathResultsStage.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
        
        // Reset progress
        resetProgress();
    }
    
    // Reset all progress indicators
    function resetProgress() {
        if (analysisProgressBar) analysisProgressBar.style.width = '0%';
        if (analysisProgressText) analysisProgressText.textContent = '0';
        if (discoveryProgressBar) discoveryProgressBar.style.width = '0%';
        if (discoveryProgressText) discoveryProgressText.textContent = '0';
        
        processSteps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            
            const statusIcon = step.querySelector('.step-status i');
            if (statusIcon) {
                statusIcon.className = index === 0 ? 'fas fa-check-circle' : 
                                      index === 1 ? 'fas fa-spinner fa-spin' : 'fas fa-circle';
            }
        });
        
        // Clear resource dots and feed
        if (resourceDots) resourceDots.innerHTML = '';
        if (discoveryFeed) discoveryFeed.innerHTML = '';
        if (resourcesFoundElement) resourcesFoundElement.textContent = '0';
        if (sourcesScannedElement) sourcesScannedElement.textContent = '0';
        if (avgQualityScoreElement) avgQualityScoreElement.textContent = '0';
    }
    
    // Simulate the analysis progress
    function simulateAnalysisProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            
            if (analysisProgressBar) analysisProgressBar.style.width = `${progress}%`;
            if (analysisProgressText) analysisProgressText.textContent = progress;
            
            // Update process steps
            if (progress === 30) {
                updateProcessStep(0, 'completed');
                updateProcessStep(1, 'active');
            } else if (progress === 70) {
                updateProcessStep(1, 'completed');
                updateProcessStep(2, 'active');
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                updateProcessStep(2, 'completed');
                
                // Move to the next stage after a short delay
                setTimeout(() => {
                    searchProcessingStage.style.display = 'none';
                    resourceDiscoveryStage.style.display = 'block';
                    simulateResourceDiscovery();
                }, 1000);
            }
        }, 30); // Speed of progress simulation
    }
    
    // Update a process step's status
    function updateProcessStep(stepIndex, status) {
        if (stepIndex < processSteps.length) {
            const step = processSteps[stepIndex];
            
            // Remove existing status classes
            step.classList.remove('active', 'completed');
            
            // Add the new status class
            if (status) {
                step.classList.add(status);
            }
            
            // Update the status icon
            const statusIcon = step.querySelector('.step-status i');
            if (statusIcon) {
                statusIcon.className = status === 'completed' ? 'fas fa-check-circle' : 
                                    status === 'active' ? 'fas fa-spinner fa-spin' : 'fas fa-circle';
            }
        }
    }
    
    // Simulate resource discovery process
    function simulateResourceDiscovery() {
        let resources = 0;
        let sources = 0;
        let quality = 0;
        let progress = 0;
        
        // Resource types and their probabilities
        const resourceTypes = [
            { type: 'video', probability: 0.4 },
            { type: 'article', probability: 0.4 },
            { type: 'interactive', probability: 0.2 }
        ];
        
        // Resource names for simulation
        const resourceNames = [
            { type: 'video', title: 'Introduction to the Topic', source: 'YouTube Learning' },
            { type: 'video', title: 'Advanced Concepts Explained', source: 'Educational Videos' },
            { type: 'video', title: 'Step-by-Step Tutorial', source: 'Tech Academy' },
            { type: 'video', title: 'Expert Interview', source: 'Knowledge Channel' },
            { type: 'article', title: 'Comprehensive Guide', source: 'TechDocs' },
            { type: 'article', title: 'Best Practices Overview', source: 'DevHub' },
            { type: 'article', title: 'Research Paper Analysis', source: 'Academic Journal' },
            { type: 'article', title: 'Industry Case Study', source: 'Professional Blog' },
            { type: 'interactive', title: 'Hands-on Practice Exercise', source: 'Interactive Learning' },
            { type: 'interactive', title: 'Coding Challenge', source: 'Code Practice' },
            { type: 'interactive', title: 'Interactive Visualization', source: 'Visual Learning' }
        ];
        
        // Update discovery stats periodically
        const interval = setInterval(() => {
            progress += 1;
            
            // Periodically add resources
            if (progress % 5 === 0 && progress < 95) {
                resources += Math.floor(Math.random() * 2) + 1;
                sources += 1;
                
                // Update the quality score (gradually increasing)
                quality = Math.min(9.8, quality + 0.1);
                
                // Add a resource dot to the radar
                addResourceDot();
                
                // Add a feed item
                const randomResource = getRandomResource(resourceNames);
                addFeedItem(randomResource.type, randomResource.title, randomResource.source);
            }
            
            // Update the UI
            if (resourcesFoundElement) resourcesFoundElement.textContent = resources;
            if (sourcesScannedElement) sourcesScannedElement.textContent = sources;
            if (avgQualityScoreElement) avgQualityScoreElement.textContent = quality.toFixed(1);
            
            if (discoveryProgressBar) discoveryProgressBar.style.width = `${progress}%`;
            if (discoveryProgressText) discoveryProgressText.textContent = progress;
            
            if (progress >= 100) {
                clearInterval(interval);
                
                // Move to the final stage after a short delay
                setTimeout(() => {
                    resourceDiscoveryStage.style.display = 'none';
                    learningPathResultsStage.style.display = 'block';
                }, 1000);
            }
        }, 100); // Speed of discovery simulation
        
        // Add a resource dot to the radar visualization
        function addResourceDot() {
            if (!resourceDots) return;
            
            // Determine resource type
            const rand = Math.random();
            let resourceType = 'article';
            let cumProb = 0;
            
            for (const type of resourceTypes) {
                cumProb += type.probability;
                if (rand <= cumProb) {
                    resourceType = type.type;
                    break;
                }
            }
            
            const dot = document.createElement('div');
            dot.className = `resource-dot ${resourceType}`;
            
            // Position the dot randomly in the radar
            const angle = Math.random() * Math.PI * 2; // Random angle
            const distance = Math.random() * 40 + 10; // Random distance from center (%)
            const x = 50 + Math.cos(angle) * distance; // x position (%)
            const y = 50 + Math.sin(angle) * distance; // y position (%)
            
            dot.style.left = `${x}%`;
            dot.style.top = `${y}%`;
            
            resourceDots.appendChild(dot);
        }
        
        // Add an item to the discovery feed
        function addFeedItem(type, title, source) {
            if (!discoveryFeed) return;
            
            const feedItem = document.createElement('div');
            feedItem.className = 'discovery-feed-item';
            feedItem.style.animationDelay = `${Math.random() * 0.3}s`;
            
            let icon = '';
            switch (type) {
                case 'video':
                    icon = 'fas fa-play-circle';
                    break;
                case 'article':
                    icon = 'fas fa-file-alt';
                    break;
                case 'interactive':
                    icon = 'fas fa-laptop-code';
                    break;
                default:
                    icon = 'fas fa-link';
            }
            
            const quality = (Math.random() * 2 + 3).toFixed(1); // Random quality between 3.0 and 5.0
            
            feedItem.innerHTML = `
                <div class="feed-item-content">
                    <div class="feed-item-icon ${type}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="feed-item-text">
                        <h4>${title}</h4>
                        <p>Source: ${source}</p>
                        <div class="feed-item-meta">
                            <span><i class="fas fa-star"></i> ${quality}</span>
                            <span><i class="fas fa-check-circle"></i> Verified</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Add to the beginning of the feed (newest first)
            discoveryFeed.insertBefore(feedItem, discoveryFeed.firstChild);
            
            // Limit the number of items in the feed
            if (discoveryFeed.children.length > 10) {
                discoveryFeed.removeChild(discoveryFeed.lastChild);
            }
        }
        
        // Get a random resource from the list
        function getRandomResource(resources) {
            return resources[Math.floor(Math.random() * resources.length)];
        }
    }
});

// Study Plan Generator Functionality
document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const studyPlanModal = document.getElementById('studyPlanModal');
  const closeStudyPlanBtn = document.getElementById('closeStudyPlanModal');
  const generateStudyPlanBtn = document.querySelector('.secondary-button');
  const closeResultBtn = document.getElementById('closeResultBtn');
  const processingStep = document.getElementById('processingStep');
  const resultStep = document.getElementById('resultStep');
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.getElementById('aiProgressText');
  const processingSteps = document.querySelectorAll('.processing-step');
  
  // Progress simulation with loading text animation
  function simulateProcessing() {
    let progress = 0;
    const stepThresholds = [25, 50, 75, 100];
    let currentStep = 0;

    // Get loading animation elements
    const loadingIcon = document.querySelector('.loading-icon');
    const loadingText = document.querySelector('.loading-text');
    
    // Initialize loading state
    if (loadingText) {
      loadingText.textContent = 'Processing: 0%';
      loadingText.classList.remove('fade-in');
      setTimeout(() => loadingText.classList.add('fade-in'), 300);
    }
    
    const progressInterval = setInterval(() => {
      progress += 2;
      progress = Math.min(progress, 100);
      
      // Update UI with percentage
      progressFill.style.width = `${progress}%`;
      if (progressText) {
        progressText.textContent = `${Math.round(progress)}%`;
        progressText.classList.add('fade-in');
      }
      
      // Update loading text with percentage
      if (loadingText) {
        loadingText.textContent = `Processing: ${Math.round(progress)}%`;
      }
      
      // Check if we've reached a new threshold
      if (progress >= stepThresholds[currentStep]) {
        if (currentStep < 3) {
          // Update step status
          updateProcessingStep(currentStep, 'completed');
          updateProcessingStep(currentStep + 1, 'active');
        } else {
          // Complete final step and transition to results
          updateProcessingStep(currentStep, 'completed');
          if (loadingText) loadingText.classList.remove('fade-in');
          if (loadingIcon) loadingIcon.style.animation = 'none';
          setTimeout(showResults, 800);
          clearInterval(progressInterval);
        }
        currentStep++;
      }
    }, 100);
  }
  
  // Update step status with optimized icon handling
  function updateProcessingStep(index, status) {
    const step = processingSteps[index];
    if (!step) return;

    const statusIcon = step.querySelector('.step-status i');
    step.classList.remove('active', 'completed');
    
    const iconMap = {
      active: {
        class: 'active',
        icon: 'fas fa-spinner fa-spin'
      },
      completed: {
        class: 'completed',
        icon: 'fas fa-check'
      },
      pending: {
        class: '',
        icon: 'fas fa-circle'
      }
    };

    const { class: className, icon } = iconMap[status] || iconMap.pending;
    if (className) step.classList.add(className);
    if (statusIcon) statusIcon.className = icon;

    // Update the progress text position to stay under brain icon
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
      progressContainer.style.transform = 'translateY(-15px)';
    }
  }

  // Show results with optimized animations
  function showResults() {
    processingStep.style.display = 'none';
    resultStep.style.display = 'block';
    
    // Ensure results step scrolls to top when opened
    resultStep.scrollTop = 0;

    const elements = document.querySelectorAll('.week-node, .path-connection');
    elements.forEach((el, i) => {
      setTimeout(() => {
        if (el.classList.contains('week-node')) {
          el.style.cssText = 'opacity: 1; transform: scale(1);';
        } else {
          el.style.maxWidth = '100%';
        }
      }, i * 100);
    });

    initializeModules();
  }

  // Initialize modules with event delegation
  function initializeModules() {
    const moduleContainer = document.querySelector('.modules-container');
    if (!moduleContainer) return;

    moduleContainer.addEventListener('click', (e) => {
      const header = e.target.closest('.module-header');
      if (!header) return;

      const moduleItem = header.parentElement;
      const moduleToggle = header.querySelector('.module-toggle i');
      const isExpanded = moduleItem.classList.toggle('expanded');
      
      moduleToggle.className = `fas fa-chevron-${isExpanded ? 'down' : 'right'}`;
    });
  }
  
  // Modal control with state management
  const modalController = {
    open() {
      studyPlanModal?.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.reset();
      
      // Ensure modal body is scrolled to the top when opening
      setTimeout(() => {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
      }, 10);
      
      simulateProcessing();
    },

    close() {
      studyPlanModal?.classList.remove('active');
      document.body.style.overflow = 'auto';
      this.reset();
    },

    reset() {
      if (processingStep) processingStep.style.display = 'block';
      if (resultStep) resultStep.style.display = 'none';
      if (progressFill) progressFill.style.width = '0%';
      if (progressText) progressText.textContent = '0';
      
      processingSteps?.forEach((step, index) => {
        updateProcessingStep(index, index === 0 ? 'active' : 'pending');
      });
    }
  };

  // Event listeners with null checks
  generateStudyPlanBtn?.addEventListener('click', () => modalController.open());
  closeStudyPlanBtn?.addEventListener('click', () => modalController.close());
  closeResultBtn?.addEventListener('click', () => modalController.close());

  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && studyPlanModal?.classList.contains('active')) {
      modalController.close();
    }
  });
});
