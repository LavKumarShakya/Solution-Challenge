// Remove loading screen when page is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
});

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
      
      