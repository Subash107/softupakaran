
document.querySelectorAll(".navbar button, .navbar a").forEach(el => {
  el.addEventListener("mousemove", e => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = -(y / rect.height - 0.5) * 12;
    const rotateY = (x / rect.width - 0.5) * 12;

    el.style.transform =
      `perspective(800px)
       rotateX(${rotateX}deg)
       rotateY(${rotateY}deg)
       translateY(-3px)`;
  });

  el.addEventListener("mouseleave", () => {
    el.style.transform =
      "perspective(800px) rotateX(0) rotateY(0) translateY(0)";
  });
});

// Mobile tap press feedback
document.querySelectorAll(".navbar button, .navbar a").forEach(el => {
  el.addEventListener("touchstart", () => {
    el.classList.add("touch-press");
  }, { passive: true });

  el.addEventListener("touchend", () => {
    el.classList.remove("touch-press");
  });

  el.addEventListener("touchcancel", () => {
    el.classList.remove("touch-press");
  });
});
