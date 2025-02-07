document.addEventListener("DOMContentLoaded", () => {
    // Loading screen
    setTimeout(() => {
      document.getElementById("loading-screen").style.display = "none"
    }, 2000)
  
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault()
        document.querySelector(this.getAttribute("href")).scrollIntoView({
          behavior: "smooth",
        })
      })
    })
  
    // Animate elements on scroll
    const animateOnScroll = () => {
      const elements = document.querySelectorAll(".slide-in")
      elements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top
        const windowHeight = window.innerHeight
        if (elementTop < windowHeight - 100) {
          element.classList.add("fade-in")
        }
      })
    }
  
    window.addEventListener("scroll", animateOnScroll)
    animateOnScroll() // Initial check on page load
  
    // Slider functionality
    const slider = document.querySelector(".slider")
    let isDown = false
    let startX
    let scrollLeft
  
    slider.addEventListener("mousedown", (e) => {
      isDown = true
      slider.classList.add("active")
      startX = e.pageX - slider.offsetLeft
      scrollLeft = slider.scrollLeft
    })
  
    slider.addEventListener("mouseleave", () => {
      isDown = false
      slider.classList.remove("active")
    })
  
    slider.addEventListener("mouseup", () => {
      isDown = false
      slider.classList.remove("active")
    })
  
    slider.addEventListener("mousemove", (e) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - slider.offsetLeft
      const walk = (x - startX) * 3
      slider.scrollLeft = scrollLeft - walk
    })
  
    // Search functionality
    const searchInput = document.querySelector(".search-bar input")
    const searchButton = document.querySelector(".search-bar button")
  
    searchButton.addEventListener("click", performSearch)
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        performSearch()
      }
    })
  
    function performSearch() {
      const searchTerm = searchInput.value.toLowerCase()
      // In a real application, you would typically send this search term to a server
      // For this example, we'll just log it to the console
      console.log(`Searching for: ${searchTerm}`)
      // You could also add some visual feedback here, like a "Searching..." message
      alert(`Searching for: ${searchTerm}`)
    }
  
    // Add slide-in class to elements for animation
    document.querySelectorAll("section > *:not(h2)").forEach((el) => {
      el.classList.add("slide-in")
    })
  
    autoSlide()
  })
  
  function autoSlide() {
    const slider = document.querySelector(".slider")
    let scrollAmount = 0
    const slideTimer = setInterval(() => {
      slider.scrollLeft += 1
      scrollAmount += 1
      if (scrollAmount >= 300) {
        clearInterval(slideTimer)
        scrollAmount = 0
        slider.scrollLeft = 0
        autoSlide()
      }
    }, 15)
  }
  
  // This completes the JavaScript file and the entire set of HTML, CSS, and JavaScript for the landing page.
  // The page now includes all the requested sections, responsive design, animations, and interactive elements.
  // Users can search for courses, view popular courses in a slider, read testimonials, and sign up.
  // The design is modern and incorporates elements inspired by the example links provided.
  
  