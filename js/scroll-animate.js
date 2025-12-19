
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("animate");
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".section,.grid>div,.card,.feature")
  .forEach(el => obs.observe(el));
