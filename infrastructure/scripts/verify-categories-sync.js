const fs = require("fs");
const path = require("path");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractValue(content, key) {
  const regex = new RegExp(`const\\s+${key}\\s*=\\s*([\\s\\S]*?)\\s*;`);
  const match = content.match(regex);
  if (!match) {
    throw new Error(`Failed to find 'const ${key} = ...;'`);
  }
  try {
    return new Function(`return (${match[1]});`)();
  } catch (err) {
    throw new Error(`Failed to evaluate ${key}: ${err.message}`);
  }
}

function normalize(str) {
  return String(str || "").trim();
}

function compareCategories(frontCategories, backendCategories) {
  const frontMap = new Map(frontCategories.map((c) => [normalize(c.id), c]));
  const issues = [];

  backendCategories.forEach((cat) => {
    const id = normalize(cat.id);
    if (!id) {
      issues.push("Backend category missing ID");
      return;
    }
    const front = frontMap.get(id);
    if (!front) {
      issues.push(`Backend category '${id}' missing in frontend defaults`);
      return;
    }
    ["name", "tag", "icon"].forEach((field) => {
      const frontValue = normalize(front[field]);
      const backendValue = normalize(cat[field]);
      if (frontValue !== backendValue) {
        issues.push(`Mismatch for '${id}' field '${field}': frontend='${frontValue}' backend='${backendValue}'`);
      }
    });
  });

  return issues;
}

function compareOrder(order, categories) {
  const ids = new Set(categories.map((c) => normalize(c.id)));
  const issues = [];
  order.forEach((id) => {
    if (!ids.has(normalize(id))) {
      issues.push(`Order lists unknown category '${id}'`);
    }
  });
  return issues;
}

function ensureNotes(notes, categories) {
  const ids = new Set(categories.map((c) => normalize(c.id)));
  const noteKeys = new Set(Object.keys(notes || {}).map(normalize));
  const issues = [];
  [...ids].forEach((id) => {
    if (!noteKeys.has(id)) {
      issues.push(`Missing note for category '${id}'`);
    }
  });
  return issues;
}

function main() {
  const root = path.resolve(__dirname, "..");
  const frontendPath = path.join(root, "frontend", "js", "app.js");
  const backendPath = path.join(root, "backend", "scripts", "update-sample-products.js");

  const frontend = read(frontendPath);
  const backend = read(backendPath);

  const categoryOrder = extractValue(frontend, "CATEGORY_ORDER");
  const defaultCategories = extractValue(frontend, "DEFAULT_CATEGORIES");
  const categoryNotes = extractValue(frontend, "CATEGORY_NOTES");

  const backendCategories = extractValue(backend, "categories");

  const categoryIssues = [
    ...compareCategories(defaultCategories, backendCategories),
    ...compareOrder(categoryOrder, defaultCategories),
    ...ensureNotes(categoryNotes, defaultCategories),
  ];

  if (categoryIssues.length) {
    console.error("Category sync issues found:");
    categoryIssues.forEach((issue) => console.error("- " + issue));
    process.exit(1);
  }

  console.log("Categories/notes/order are synchronized between frontend and backend.");
}

try {
  main();
} catch (err) {
  console.error("Verification failed:", err.message);
  process.exit(1);
}
