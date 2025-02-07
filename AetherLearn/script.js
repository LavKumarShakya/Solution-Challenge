document.addEventListener("DOMContentLoaded", () => {
    // Loading screen
    setTimeout(() => {
      document.getElementById("loading-screen").style.display = "none"
    }, 2000)
  
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
        })
        .catch(error => {
          console.log('ServiceWorker registration failed:', error);
        });
    }

    // Initialize Globe
    const initGlobe = () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 600 / 600, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      
      renderer.setSize(600, 600);
      document.getElementById('globe-container').appendChild(renderer.domElement);
      
      // Create globe
      const geometry = new THREE.SphereGeometry(5, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: 0x4169E1,
        transparent: true,
        opacity: 0.8,
        wireframe: true
      });
      const globe = new THREE.Mesh(geometry, material);
      
      // Add lights
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 3, 5);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x404040));
      
      scene.add(globe);
      camera.position.z = 15;
      
      // Animation
      const animate = () => {
        requestAnimationFrame(animate);
        globe.rotation.y += 0.005;
        renderer.render(scene, camera);
      };
      
      animate();
    };

    // Animate Stats Counter
    const animateCounter = () => {
      const counters = document.querySelectorAll('.counter');
      const speed = 200;
      
      counters.forEach(counter => {
        const updateCount = () => {
          const target = +counter.getAttribute('data-target');
          const count = +counter.innerText;
          const inc = target / speed;
          
          if (count < target) {
            counter.innerText = Math.ceil(count + inc);
            setTimeout(updateCount, 1);
          } else {
            counter.innerText = target;
          }
        };
        updateCount();
      });
    };

    // Feature Cards Video Preview
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
      const video = card.querySelector('video');
      
      card.addEventListener('mouseenter', () => {
        video.play();
      });
      
      card.addEventListener('mouseleave', () => {
        video.pause();
        video.currentTime = 0;
      });
    });

    // Enhanced floating chatbot with AI responses
    const chatWidget = document.createElement('div');
    chatWidget.id = 'chat-widget';
    chatWidget.innerHTML = `
      <div class="chat-icon">
        <i class="fas fa-comments"></i>
      </div>
      <div class="chat-window" style="display: none;">
        <div class="chat-header">
          <h3>AI Learning Assistant</h3>
          <button class="close-chat"><i class="fas fa-times"></i></button>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input">
          <input type="text" placeholder="Ask me anything about learning...">
          <button><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    `;
    document.body.appendChild(chatWidget);

    const chatIcon = chatWidget.querySelector('.chat-icon');
    const chatWindow = chatWidget.querySelector('.chat-window');
    const closeChat = chatWidget.querySelector('.close-chat');
    const chatInput = chatWidget.querySelector('.chat-input input');
    const chatSend = chatWidget.querySelector('.chat-input button');
    const chatMessages = chatWidget.querySelector('.chat-messages');

    // Chat Functionality
    chatIcon.addEventListener('click', () => {
      chatWindow.style.display = 'flex';
      chatIcon.style.display = 'none';
      addMessage("Hi! I'm your AI learning assistant. How can I help you today?", false);
    });

    closeChat.addEventListener('click', () => {
      chatWindow.style.display = 'none';
      chatIcon.style.display = 'flex';
    });

    const addMessage = (message, isUser = false) => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}`;
      messageDiv.textContent = message;
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const getAIResponse = (message) => {
      const responses = {
        'course': 'We have many courses available. What subject interests you?',
        'learn': 'Learning is easier with our AI-powered platform. We can create a personalized learning path for you.',
        'help': 'I can help you with course selection, learning strategies, and answering your questions.',
        'difficult': 'Don\'t worry! We can break down complex topics into simpler concepts.',
        'practice': 'We offer interactive exercises and real-world projects for practice.',
        'default': 'I\'m here to assist with your learning journey. Could you tell me more?'
      };

      const found = Object.entries(responses).find(([key]) => 
        message.toLowerCase().includes(key)
      );

      return found ? found[1] : responses.default;
    };

    const handleChat = () => {
      const message = chatInput.value.trim();
      if (message) {
        addMessage(message, true);
        setTimeout(() => {
          addMessage(getAIResponse(message), false);
        }, 1000);
        chatInput.value = '';
      }
    };

    chatSend.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleChat();
      }
    });

    // Initialize components
    initGlobe();
    animateCounter();
    
    // Add slide-in animations
    document.querySelectorAll("section > *:not(h2)").forEach((el) => {
      el.classList.add("slide-in");
    });

    // Animate elements on scroll
    const animateOnScroll = () => {
      const elements = document.querySelectorAll(".slide-in");
      elements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        if (elementTop < windowHeight - 100) {
          element.classList.add("fade-in");
        }
      });
    };

    window.addEventListener("scroll", animateOnScroll);
    animateOnScroll();
});