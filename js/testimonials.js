// Auto-advance the testimonials carousel
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on a page with testimonials
  const testimonialSection = document.querySelector("[x-data]");
  if (!testimonialSection) return;

  let currentSlide = 0;
  const totalSlides = 3;
  let autoplayInterval;

  // Function to advance to next slide
  const nextSlide = () => {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlide();
  };

  // Function to go to previous slide
  const prevSlide = () => {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlide();
  };

  // Function to update slide position
  const updateSlide = () => {
    const container = document.querySelector(".flex.transition-transform");
    if (container) {
      container.style.transform = `translateX(-${currentSlide * 100}%)`;
      updateDots();
    }
  };

  // Update the dots
  const updateDots = () => {
    const dots = document.querySelectorAll(".testimonials-dot");
    dots.forEach((dot, index) => {
      if (index === currentSlide) {
        dot.classList.add("bg-blue-600");
        dot.classList.remove("bg-gray-300");
      } else {
        dot.classList.remove("bg-blue-600");
        dot.classList.add("bg-gray-300");
      }
    });
  };

  // Set up auto-advance
  const startAutoplay = () => {
    autoplayInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
  };

  // Pause auto-advance on hover
  testimonialSection.addEventListener("mouseenter", () => {
    clearInterval(autoplayInterval);
  });

  // Resume auto-advance when mouse leaves
  testimonialSection.addEventListener("mouseleave", () => {
    startAutoplay();
  });

  // Handle navigation button clicks
  const prevButton = testimonialSection.querySelector(
    'button[aria-label="Previous testimonial"]'
  );
  const nextButton = testimonialSection.querySelector(
    'button[aria-label="Next testimonial"]'
  );

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      clearInterval(autoplayInterval);
      prevSlide();
      startAutoplay();
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      clearInterval(autoplayInterval);
      nextSlide();
      startAutoplay();
    });
  }

  // Handle dot navigation clicks
  const dots = testimonialSection.querySelectorAll(
    '[aria-label^="Go to testimonial"]'
  );
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      clearInterval(autoplayInterval);
      currentSlide = index;
      updateSlide();
      startAutoplay();
    });
  });

  // Start the autoplay
  startAutoplay();
});
