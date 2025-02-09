document.addEventListener('DOMContentLoaded', () => {
    // Category filtering
    const categoryButtons = document.querySelectorAll('.category-btn');
    const topicCards = document.querySelectorAll('.topic-card');

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button state
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Filter topics
            const selectedCategory = button.dataset.category;
            topicCards.forEach(card => {
                if (selectedCategory === 'all' || card.dataset.category === selectedCategory) {
                    card.style.display = 'block';
                    setTimeout(() => card.style.opacity = '1', 10);
                } else {
                    card.style.opacity = '0';
                    setTimeout(() => card.style.display = 'none', 300);
                }
            });
        });
    });

    // Topic card hover effects
    topicCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const icon = card.querySelector('.topic-icon i');
            icon.style.transform = 'scale(1.2)';
        });

        card.addEventListener('mouseleave', () => {
            const icon = card.querySelector('.topic-icon i');
            icon.style.transform = 'scale(1)';
        });
    });

    // If we're on the topic details page, initialize the progress tracking
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        initializeProgress();
    }
});

function initializeProgress() {
    // Simulate progress update (replace with actual progress tracking)
    const progress = document.querySelector('.progress');
    const progressText = document.querySelector('.progress-text');
    
    // Example: Update progress every few seconds (for demo purposes)
    setInterval(() => {
        const currentWidth = parseInt(progress.style.width) || 0;
        const newWidth = (currentWidth + 1) % 101;
        progress.style.width = `${newWidth}%`;
        progressText.textContent = `${newWidth}% Complete`;
    }, 5000);
}