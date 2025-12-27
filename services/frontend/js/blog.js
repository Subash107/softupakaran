// Blog detail helper for blog.html.
(function () {
  const host = document.querySelector("[data-blog-article]");
  if (!host) return;

  const API_ROOT = (window.API_BASE || "")
    .toString()
    .trim()
    .replace(/\/+$/, "");

  function escapeHtml(text) {
    return String(text || "").replace(/[&<>"']/g, (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])
    );
  }

  function escapeAttr(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatBlogDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function showMessage(message) {
    host.innerHTML = `
      <div class="card inner blog-card placeholder">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderPost(post) {
    const title = escapeHtml(post.title || "Blog post");
    const date = formatBlogDate(post.published_at);
    const summary = post.summary ? `<p class="muted">${escapeHtml(post.summary)}</p>` : "";
    const image = post.featured_image
      ? `<figure class="blog-article__media"><img src="${escapeAttr(post.featured_image)}" alt="${escapeHtml(
          post.title || ""
        )}"></figure>`
      : "";
    const body = post.content ? String(post.content) : "<p>No content added yet.</p>";

    host.innerHTML = `
      <article class="blog-article">
        <header class="blog-article__header">
          ${date ? `<p class="blog-article__meta">Published ${escapeHtml(date)}</p>` : ""}
          <h1 class="blog-article__title">${title}</h1>
        </header>
        ${image}
        ${summary}
        <section class="blog-article__content">
          ${body}
        </section>
      </article>
    `;
  }

  async function loadPost(slug) {
    if (!slug) {
      showMessage("Blog slug is missing. Open this page from the blog feed.");
      return;
    }
    if (!API_ROOT) {
      showMessage(
        "API base URL is not configured. Make sure the <meta name=\"api-base\"> tag points to your backend."
      );
      return;
    }

    showMessage("Loading blog post...");

    try {
      const response = await fetch(`${API_ROOT}/api/public/blog-posts/${encodeURIComponent(slug)}`, {
        cache: "no-cache",
      });
      if (response.status === 404) {
        showMessage("Blog post not found. It may be unpublished.");
        return;
      }
      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(text || "Failed to load blog post");
      }
      const post = await response.json();
      renderPost(post);
    } catch (error) {
      console.error("Failed to load blog post:", error);
      showMessage("Unable to load the blog post right now. Try again later.");
    }
  }

  function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("slug") || "").trim();
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadPost(getSlugFromUrl());
  });
})();
