
document.addEventListener("mousemove", (e) => {
  const banners = document.querySelectorAll(".banner img, .hero img, .hero-banner img");
  banners.forEach((img) => {
    const speed = 0.02;
    const x = (window.innerWidth / 2 - e.clientX) * speed;
    const y = (window.innerHeight / 2 - e.clientY) * speed;
    img.style.transform = `scale(1.05) translate(${x}px, ${y}px)`;
  });
});
