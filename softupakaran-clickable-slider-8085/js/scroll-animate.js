
// Scroll-trigger animation for product cards
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".product-card, .product-item, .card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.2
    }
  );

  cards.forEach((card) => observer.observe(card));
});
