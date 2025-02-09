// Globe Animation
const initGlobe = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true,
        antialias: true 
    });

    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    const container = document.getElementById('globe-container');
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Create the globe
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0x40E0D0,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const globe = new THREE.Mesh(geometry, material);

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(2.2, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x40E0D0,
        transparent: true,
        opacity: 0.1
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    scene.add(globe);
    scene.add(glow);
    camera.position.z = 5;

    // Add parallax effect
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - window.innerWidth / 2) * 0.0005;
        mouseY = (event.clientY - window.innerHeight / 2) * 0.0005;
    });

    function animate() {
        requestAnimationFrame(animate);
        
        // Smooth rotation
        globe.rotation.y += 0.002;
        globe.rotation.x += 0.001;
        
        // Parallax effect
        globe.rotation.x += mouseY;
        globe.rotation.y += mouseX;
        
        glow.rotation.x = globe.rotation.x;
        glow.rotation.y = globe.rotation.y;
        
        renderer.render(scene, camera);
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth / 2, window.innerHeight);
    });

    // Start animation
    animate();
};

// Initialize globe when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initGlobe();
    
    // Handle loading screen
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 300);
});