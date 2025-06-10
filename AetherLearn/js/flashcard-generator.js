/**
 * Flashcard Generator - Main JavaScript Module
 * Handles flashcard generation, display, and study functionality
 */

class FlashcardGenerator {
    constructor() {
        this.currentFlashcards = [];
        this.currentIndex = 0;
        this.studyMode = false;
        this.studyStats = {
            correct: 0,
            incorrect: 0,
            total: 0
        };
        
        this.initializeEventListeners();
        this.loadSavedFlashcards();
        this.loadDraftContent();
    }

    initializeEventListeners() {
        // Form submission
        const form = document.getElementById('flashcard-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Clear form button
        const clearBtn = document.getElementById('clear-form');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearForm());
        }

        // Study mode controls
        const studyModeBtn = document.getElementById('study-mode-btn');
        if (studyModeBtn) {
            studyModeBtn.addEventListener('click', () => this.toggleStudyMode());
        }

        const shuffleBtn = document.getElementById('shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => this.shuffleFlashcards());
        }

        const newFlashcardsBtn = document.getElementById('new-flashcards-btn');
        if (newFlashcardsBtn) {
            newFlashcardsBtn.addEventListener('click', () => this.startNewSession());
        }

        // Navigation controls
        const prevBtn = document.getElementById('prev-card');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousCard());
        }

        const nextBtn = document.getElementById('next-card');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextCard());
        }

        // Study action buttons
        const knowItBtn = document.getElementById('know-it');
        if (knowItBtn) {
            knowItBtn.addEventListener('click', () => this.markCard('correct'));
        }

        const needPracticeBtn = document.getElementById('need-practice');
        if (needPracticeBtn) {
            needPracticeBtn.addEventListener('click', () => this.markCard('partial'));
        }

        const dontKnowBtn = document.getElementById('dont-know');
        if (dontKnowBtn) {
            dontKnowBtn.addEventListener('click', () => this.markCard('incorrect'));
        }

        // Load saved flashcards
        const loadSavedBtn = document.getElementById('load-saved-btn');
        if (loadSavedBtn) {
            loadSavedBtn.addEventListener('click', () => this.loadSavedFlashcards());
        }

        // Auto-save draft content
        const contentInput = document.getElementById('content-input');
        if (contentInput) {
            contentInput.addEventListener('input', 
                this.debounce(() => this.saveDraftContent(), 1000)
            );
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        try {
            // Get form data
            const formData = new FormData(event.target);
            const content = formData.get('content');
            const numCards = parseInt(formData.get('num_cards'));
            const difficulty = formData.get('difficulty');
            const save = formData.get('save') === 'on';

            // Validate input
            const validatedContent = window.AIToolsUtils.ValidationUtils.validateContent(content);
            const validatedOptions = window.AIToolsUtils.ValidationUtils.validateOptions({
                numCards,
                difficulty,
                save
            });

            // Show loading state
            this.showLoadingState();

            // Generate flashcards
            const response = await window.aiToolsAPI.generateFlashcards(validatedContent, validatedOptions);

            // Hide loading and show results
            this.hideLoadingState();
            this.displayFlashcards(response.flashcards, response.metadata);

            // Clear draft content on successful generation
            window.AIToolsUtils.LocalStorageManager.clearDraftContent('flashcard');

            // Show success message
            window.messageManager.success('Flashcards generated successfully!');

        } catch (error) {
            this.hideLoadingState();
            console.error('Error generating flashcards:', error);
            window.messageManager.error(`Failed to generate flashcards: ${error.message}`);
        }
    }

    showLoadingState() {
        const inputSection = document.getElementById('input-section');
        const loadingSection = document.getElementById('loading-section');
        const flashcardsSection = document.getElementById('flashcards-section');

        if (inputSection) inputSection.style.display = 'none';
        if (flashcardsSection) flashcardsSection.style.display = 'none';
        
        window.loadingManager.show();
    }

    hideLoadingState() {
        const inputSection = document.getElementById('input-section');
        const loadingSection = document.getElementById('loading-section');

        window.loadingManager.hide();
        if (inputSection) inputSection.style.display = 'block';
    }

    displayFlashcards(flashcards, metadata) {
        console.log('🎯 DisplayFlashcards called with:', flashcards, metadata);
        
        this.currentFlashcards = flashcards || [];
        this.currentIndex = 0;
        this.studyMode = false;

        console.log(`📚 Current flashcards count: ${this.currentFlashcards.length}`);

        // Update UI
        this.updateFlashcardsDisplay();
        this.updateProgressDisplay();

        // Show flashcards section
        const flashcardsSection = document.getElementById('flashcards-section');
        if (flashcardsSection) {
            flashcardsSection.style.display = 'block';
            if (window.AIToolsUtils && window.AIToolsUtils.AnimationUtils) {
                window.AIToolsUtils.AnimationUtils.slideUp(flashcardsSection);
            }
        }

        // Update stats
        this.updateStatsDisplay();
        
        console.log('✅ Flashcards display completed');
    }

    updateFlashcardsDisplay() {
        const container = document.getElementById('flashcards-container');
        if (!container || !this.currentFlashcards.length) return;

        container.innerHTML = '';

        if (this.studyMode) {
            // Study mode: show one card at a time
            this.displaySingleCard(this.currentFlashcards[this.currentIndex]);
        } else {
            // Browse mode: show all cards in grid
            this.currentFlashcards.forEach((card, index) => {
                this.displayCardInGrid(card, index);
            });
        }
    }

    displaySingleCard(card) {
        const container = document.getElementById('flashcards-container');
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.minHeight = '300px';

        const cardElement = this.createFlashcardElement(card, 0, true);
        cardElement.style.maxWidth = '500px';
        cardElement.style.width = '100%';
        
        container.appendChild(cardElement);
    }

    displayCardInGrid(card, index) {
        const container = document.getElementById('flashcards-container');
        container.style.display = 'grid';
        container.style.minHeight = 'auto';

        const cardElement = this.createFlashcardElement(card, index, false);
        container.appendChild(cardElement);
    }

    createFlashcardElement(card, index, isStudyMode = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'flashcard';
        cardDiv.dataset.index = index;
        cardDiv.dataset.cardId = card.id;

        const height = isStudyMode ? '250px' : '200px';
        cardDiv.style.height = height;

        cardDiv.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <p>${this.escapeHtml(card.front || card.question || 'No question available')}</p>
                    ${card.hint ? `<small style="position: absolute; bottom: 10px; left: 10px; color: var(--text-muted); font-size: 0.75rem;">💡 Hint available</small>` : ''}
                </div>
                <div class="flashcard-back">
                    <p>${this.escapeHtml(card.back || card.answer || 'No answer available')}</p>
                    ${card.hint ? `<small style="position: absolute; bottom: 10px; left: 10px; color: var(--text-muted); font-size: 0.75rem;">💡 ${this.escapeHtml(card.hint)}</small>` : ''}
                    ${card.topic ? `<small style="position: absolute; top: 10px; right: 10px; color: var(--text-muted); font-size: 0.75rem;">${card.topic}</small>` : ''}
                </div>
            </div>
        `;

        // Add click event to flip card
        cardDiv.addEventListener('click', () => {
            cardDiv.classList.toggle('flipped');
        });

        // Add animation delay for grid display
        if (!isStudyMode) {
            cardDiv.style.opacity = '0';
            cardDiv.style.transform = 'translateY(20px)';
            setTimeout(() => {
                window.AIToolsUtils.AnimationUtils.slideUp(cardDiv, 300);
            }, index * 100);
        } else {
            window.AIToolsUtils.AnimationUtils.fadeIn(cardDiv, 500);
        }

        return cardDiv;
    }

    toggleStudyMode() {
        this.studyMode = !this.studyMode;
        
        if (this.studyMode) {
            this.startStudyMode();
        } else {
            this.exitStudyMode();
        }

        this.updateFlashcardsDisplay();
        this.updateStudyControls();
    }

    startStudyMode() {
        this.currentIndex = 0;
        this.studyStats = { correct: 0, incorrect: 0, total: 0 };
        
        // Update button text
        const studyModeBtn = document.getElementById('study-mode-btn');
        if (studyModeBtn) {
            studyModeBtn.innerHTML = '<i class="fas fa-stop"></i> Exit Study';
            studyModeBtn.classList.remove('btn-secondary');
            studyModeBtn.classList.add('btn-warning');
        }

        window.messageManager.success('Study mode activated! Use keyboard arrows or buttons to navigate.');
    }

    exitStudyMode() {
        // Update button text
        const studyModeBtn = document.getElementById('study-mode-btn');
        if (studyModeBtn) {
            studyModeBtn.innerHTML = '<i class="fas fa-play"></i> Study Mode';
            studyModeBtn.classList.remove('btn-warning');
            studyModeBtn.classList.add('btn-secondary');
        }

        // Show final stats if studied
        if (this.studyStats.total > 0) {
            const accuracy = Math.round((this.studyStats.correct / this.studyStats.total) * 100);
            window.messageManager.success(`Study session complete! Accuracy: ${accuracy}%`);
        }
    }

    updateStudyControls() {
        const studyControls = document.getElementById('study-controls');
        if (studyControls) {
            studyControls.style.display = this.studyMode ? 'flex' : 'none';
        }

        // Update navigation buttons
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-card');
        const nextBtn = document.getElementById('next-card');

        if (prevBtn) {
            prevBtn.disabled = this.currentIndex === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentIndex === this.currentFlashcards.length - 1;
        }
    }

    updateProgressDisplay() {
        const currentCardNum = document.getElementById('current-card-num');
        const totalCards = document.getElementById('total-cards');
        const studyScore = document.getElementById('study-score');

        if (currentCardNum) {
            currentCardNum.textContent = this.currentIndex + 1;
        }

        if (totalCards) {
            totalCards.textContent = this.currentFlashcards.length;
        }

        if (studyScore && this.studyStats.total > 0) {
            const accuracy = Math.round((this.studyStats.correct / this.studyStats.total) * 100);
            studyScore.textContent = accuracy;
        }
    }

    previousCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateFlashcardsDisplay();
            this.updateProgressDisplay();
            this.updateNavigationButtons();
        }
    }

    nextCard() {
        if (this.currentIndex < this.currentFlashcards.length - 1) {
            this.currentIndex++;
            this.updateFlashcardsDisplay();
            this.updateProgressDisplay();
            this.updateNavigationButtons();
        }
    }

    markCard(result) {
        if (!this.studyMode || !this.currentFlashcards[this.currentIndex]) return;

        const card = this.currentFlashcards[this.currentIndex];
        
        // Update stats
        this.studyStats.total++;
        if (result === 'correct') {
            this.studyStats.correct++;
        } else if (result === 'incorrect') {
            this.studyStats.incorrect++;
        }
        // 'partial' doesn't count as correct or incorrect

        // Update progress in backend
        this.updateCardProgress(card.id, result === 'correct');

        // Move to next card automatically
        setTimeout(() => {
            if (this.currentIndex < this.currentFlashcards.length - 1) {
                this.nextCard();
            } else {
                // End of deck
                this.showStudyComplete();
            }
        }, 500);

        this.updateProgressDisplay();
    }

    async updateCardProgress(cardId, correct) {
        try {
            // This would update the backend with study progress
            // For now, we'll just track locally
            console.log(`Card ${cardId} marked as ${correct ? 'correct' : 'incorrect'}`);
        } catch (error) {
            console.error('Failed to update card progress:', error);
        }
    }

    showStudyComplete() {
        const accuracy = Math.round((this.studyStats.correct / this.studyStats.total) * 100);
        let message = `Study session complete!\n\n`;
        message += `Cards studied: ${this.studyStats.total}\n`;
        message += `Correct: ${this.studyStats.correct}\n`;
        message += `Accuracy: ${accuracy}%`;

        if (accuracy >= 80) {
            message += `\n\n🎉 Excellent work!`;
        } else if (accuracy >= 60) {
            message += `\n\n👍 Good progress!`;
        } else {
            message += `\n\n📚 Keep studying!`;
        }

        window.messageManager.success(message, 8000);
        
        // Auto-exit study mode
        setTimeout(() => {
            this.toggleStudyMode();
        }, 2000);
    }

    shuffleFlashcards() {
        if (!this.currentFlashcards.length) return;

        // Fisher-Yates shuffle
        for (let i = this.currentFlashcards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.currentFlashcards[i], this.currentFlashcards[j]] = 
            [this.currentFlashcards[j], this.currentFlashcards[i]];
        }

        this.currentIndex = 0;
        this.updateFlashcardsDisplay();
        this.updateProgressDisplay();
        this.updateNavigationButtons();

        window.messageManager.success('Flashcards shuffled!');
    }

    startNewSession() {
        // Reset current session
        this.currentFlashcards = [];
        this.currentIndex = 0;
        this.studyMode = false;
        this.studyStats = { correct: 0, incorrect: 0, total: 0 };

        // Hide flashcards section
        const flashcardsSection = document.getElementById('flashcards-section');
        if (flashcardsSection) {
            window.AIToolsUtils.AnimationUtils.fadeOut(flashcardsSection);
        }

        // Show input section
        const inputSection = document.getElementById('input-section');
        if (inputSection) {
            inputSection.style.display = 'block';
            window.AIToolsUtils.AnimationUtils.fadeIn(inputSection);
        }

        // Clear form
        this.clearForm();
    }

    clearForm() {
        const form = document.getElementById('flashcard-form');
        if (form) {
            form.reset();
            
            // Reset to defaults
            document.getElementById('num-cards').value = '10';
            document.getElementById('difficulty').value = 'intermediate';
            document.getElementById('save-flashcards').checked = true;
        }

        // Clear draft content
        window.AIToolsUtils.LocalStorageManager.clearDraftContent('flashcard');

        window.messageManager.success('Form cleared!');
    }

    async loadSavedFlashcards() {
        try {
            const response = await window.aiToolsAPI.getSavedFlashcards();
            this.displaySavedFlashcards(response.flashcard_sets);
        } catch (error) {
            console.error('Failed to load saved flashcards:', error);
            // Silently fail - don't show error popup on page load
        }
    }

    displaySavedFlashcards(flashcardSets) {
        const grid = document.getElementById('saved-flashcards-grid');
        if (!grid) return;

        grid.innerHTML = '';

        if (!flashcardSets || flashcardSets.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fas fa-layer-group" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No saved flashcard sets found. Create your first set above!</p>
                </div>
            `;
            return;
        }

        flashcardSets.forEach((set, index) => {
            const setElement = this.createSavedFlashcardElement(set);
            setElement.style.opacity = '0';
            setElement.style.transform = 'translateY(20px)';
            grid.appendChild(setElement);

            // Animate in
            setTimeout(() => {
                window.AIToolsUtils.AnimationUtils.slideUp(setElement);
            }, index * 100);
        });
    }

    createSavedFlashcardElement(set) {
        const div = document.createElement('div');
        div.className = 'saved-flashcard-item';
        
        const createdDate = new Date(set.created_at).toLocaleDateString();
        const lastStudiedDate = set.last_studied ? 
            new Date(set.last_studied).toLocaleDateString() : 'Never';

        div.innerHTML = `
            <div class="saved-item-header">
                <h4 class="saved-item-title">${this.escapeHtml(set.title)}</h4>
                <span class="difficulty-badge ${set.difficulty}">${set.difficulty}</span>
            </div>
            <div class="saved-item-meta">
                <span><i class="fas fa-layer-group"></i> ${set.total_cards} cards</span>
                <span><i class="fas fa-calendar"></i> Created: ${createdDate}</span>
                <span><i class="fas fa-clock"></i> Last studied: ${lastStudiedDate}</span>
            </div>
            <div class="saved-item-actions">
                <button class="btn btn-small btn-primary load-set-btn" data-session-id="${set.session_id}">
                    <i class="fas fa-play"></i> Study
                </button>
                <button class="btn btn-small btn-secondary view-set-btn" data-session-id="${set.session_id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-small btn-danger delete-set-btn" data-session-id="${set.session_id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add event listeners
        const loadBtn = div.querySelector('.load-set-btn');
        const viewBtn = div.querySelector('.view-set-btn');
        const deleteBtn = div.querySelector('.delete-set-btn');

        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.loadFlashcardSet(set.session_id, true));
        }

        if (viewBtn) {
            viewBtn.addEventListener('click', () => this.loadFlashcardSet(set.session_id, false));
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteFlashcardSet(set.session_id));
        }

        return div;
    }

    async loadFlashcardSet(sessionId, startStudyMode = false) {
        try {
            const response = await window.aiToolsAPI.getFlashcardSet(sessionId);
            const flashcardSet = response.flashcard_set;

            this.displayFlashcards(flashcardSet.flashcards, {
                session_id: flashcardSet.session_id,
                title: flashcardSet.title
            });

            if (startStudyMode) {
                setTimeout(() => {
                    this.toggleStudyMode();
                }, 500);
            }

            window.messageManager.success('Flashcard set loaded!');

        } catch (error) {
            console.error('Failed to load flashcard set:', error);
            window.messageManager.error('Failed to load flashcard set');
        }
    }

    async deleteFlashcardSet(sessionId) {
        if (!confirm('Are you sure you want to delete this flashcard set? This action cannot be undone.')) {
            return;
        }

        try {
            await window.aiToolsAPI.deleteFlashcardSet(sessionId);
            this.loadSavedFlashcards(); // Refresh the list
            window.messageManager.success('Flashcard set deleted');
        } catch (error) {
            console.error('Failed to delete flashcard set:', error);
            window.messageManager.error('Failed to delete flashcard set');
        }
    }

    saveDraftContent() {
        const contentInput = document.getElementById('content-input');
        if (contentInput && contentInput.value.trim()) {
            window.AIToolsUtils.LocalStorageManager.saveDraftContent('flashcard', {
                content: contentInput.value,
                numCards: document.getElementById('num-cards')?.value,
                difficulty: document.getElementById('difficulty')?.value,
                save: document.getElementById('save-flashcards')?.checked
            });
        }
    }

    loadDraftContent() {
        const draft = window.AIToolsUtils.LocalStorageManager.loadDraftContent('flashcard');
        if (draft && draft.content) {
            const contentInput = document.getElementById('content-input');
            const numCardsSelect = document.getElementById('num-cards');
            const difficultySelect = document.getElementById('difficulty');
            const saveCheckbox = document.getElementById('save-flashcards');

            if (contentInput) contentInput.value = draft.content;
            if (numCardsSelect && draft.numCards) numCardsSelect.value = draft.numCards;
            if (difficultySelect && draft.difficulty) difficultySelect.value = draft.difficulty;
            if (saveCheckbox && typeof draft.save === 'boolean') saveCheckbox.checked = draft.save;

            window.messageManager.success('Draft content restored', 3000);
        }
    }

    updateStatsDisplay() {
        // Update total flashcards created
        const totalFlashcardsElement = document.getElementById('total-flashcards');
        if (totalFlashcardsElement) {
            const currentTotal = parseInt(totalFlashcardsElement.textContent) || 0;
            totalFlashcardsElement.textContent = currentTotal + this.currentFlashcards.length;
        }

        // Update study sessions
        const studySessionsElement = document.getElementById('study-sessions');
        if (studySessionsElement && this.studyMode) {
            const currentSessions = parseInt(studySessionsElement.textContent) || 0;
            studySessionsElement.textContent = currentSessions + 1;
        }
    }

    handleKeyboardShortcuts(event) {
        if (!this.studyMode) return;

        // Prevent default only for our shortcuts
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                this.previousCard();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.nextCard();
                break;
            case ' ':
                event.preventDefault();
                // Flip current card
                const currentCard = document.querySelector('.flashcard');
                if (currentCard) {
                    currentCard.classList.toggle('flipped');
                }
                break;
            case '1':
                event.preventDefault();
                this.markCard('correct');
                break;
            case '2':
                event.preventDefault();
                this.markCard('partial');
                break;
            case '3':
                event.preventDefault();
                this.markCard('incorrect');
                break;
            case 'Escape':
                event.preventDefault();
                if (this.studyMode) {
                    this.toggleStudyMode();
                }
                break;
        }
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('flashcard-form')) {
        window.flashcardGenerator = new FlashcardGenerator();
    }
});