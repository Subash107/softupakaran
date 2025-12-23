
document.addEventListener("scroll", () => {
  const header = document.querySelector("header, .navbar, .top-nav");
  if (!header) return;

  if (window.scrollY > 40) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});
