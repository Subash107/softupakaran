#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { URL } = require("url");

const DEFAULT_URL = process.env.UPLOAD_URL || "http://localhost:4000/api/admin/uploads/product-image";
const DEFAULT_TIMEOUT = Number(process.env.UPLOAD_TIMEOUT) || 60000;

function printHelp() {
  console.log(`
Usage: node upload-file.js --file <path> [options]

Options:
  --file <path>          Local file to upload (required)
  --url <target>         Upload endpoint (default: ${DEFAULT_URL})
  --field <name>         Form field name for the file (default: image)
  --admin-token <value>  Adds X-Admin-Token header
  --bearer-token <value> Adds Authorization: Bearer token
  --form key=value       Adds a text field alongside the file (repeat as needed)
  --header key=value     Additional header to include (repeat as needed)
  --timeout <ms>         HTTP timeout (default: ${DEFAULT_TIMEOUT})
  --debug                Show extra progress output
  --help                 Show this help
`);
}

function ensureValue(argName, args, index) {
  if (index + 1 >= args.length) {
    throw new Error(`Missing value for ${argName}`);
  }
  return args[index + 1];
}

function parseKeyValue(text) {
  const [key, ...rest] = text.split("=");
  if (!key) throw new Error(`Invalid key=value pair: ${text}`);
  return { key: key.trim(), value: rest.join("=").trim() };
}

function parseArgs() {
  const raw = process.argv.slice(2);
  const opts = {
    file: null,
    url: DEFAULT_URL,
    fieldName: "image",
    adminToken: process.env.ADMIN_TOKEN || "",
    bearerToken: "",
    headers: [],
    formFields: [],
    timeout: DEFAULT_TIMEOUT,
    debug: false,
  };

  for (let idx = 0; idx < raw.length; idx++) {
    const arg = raw[idx];
    switch (arg) {
      case "--help":
        printHelp();
        process.exit(0);
        break;
      case "--file":
        opts.file = ensureValue("--file", raw, idx);
        idx++;
        break;
      case "--url":
        opts.url = ensureValue("--url", raw, idx);
        idx++;
        break;
      case "--field":
      case "--field-name":
        opts.fieldName = ensureValue(arg, raw, idx);
        idx++;
        break;
      case "--admin-token":
        opts.adminToken = ensureValue(arg, raw, idx);
        idx++;
        break;
      case "--bearer-token":
        opts.bearerToken = ensureValue(arg, raw, idx);
        idx++;
        break;
      case "--form":
      case "-F":
        opts.formFields.push(parseKeyValue(ensureValue(arg, raw, idx)));
        idx++;
        break;
      case "--header":
      case "-H":
        opts.headers.push(parseKeyValue(ensureValue(arg, raw, idx)));
        idx++;
        break;
      case "--timeout":
        opts.timeout = Number(ensureValue(arg, raw, idx));
        if (Number.isNaN(opts.timeout) || opts.timeout <= 0) {
          throw new Error("Timeout must be a positive number");
        }
        idx++;
        break;
      case "--debug":
        opts.debug = true;
        break;
      default:
        throw new Error(`Unknown option ${arg}. Use --help for usage.`);
    }
  }

  if (!opts.file) {
    throw new Error("The --file flag is required.");
  }

  return opts;
}

function guessMime(name) {
  const ext = path.extname(name).toLowerCase();
  const map = {
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".json": "application/json",
    ".csv": "text/csv",
  };
  return map[ext] || "application/octet-stream";
}

function buildTextFields(boundary, formFields = []) {
  if (!formFields.length) return Buffer.alloc(0);
  const chunks = formFields.map((entry) => {
    return Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${entry.key}"\r\n\r\n` +
        `${entry.value}\r\n`
    );
  });
  return Buffer.concat(chunks);
}

async function main() {
  const opts = parseArgs();
  const filePath = path.resolve(opts.file);
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) throw new Error("The provided path is not a file.");

  const target = new URL(opts.url);
  const boundary = `----softupakaran-${Date.now()}`;
  const metaBuffer = buildTextFields(boundary, opts.formFields);
  const fileName = path.basename(filePath);
  const mimeType = guessMime(fileName);
  const headerBuffer = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${opts.fieldName}"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
  );
  const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const totalLength = metaBuffer.length + headerBuffer.length + stats.size + footerBuffer.length;

  const httpModule = target.protocol === "https:" ? https : http;
  const requestOptions = {
    method: "POST",
    hostname: target.hostname,
    port: target.port || (target.protocol === "https:" ? 443 : 80),
    path: `${target.pathname}${target.search}`,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": totalLength,
    },
    timeout: opts.timeout,
  };

  if (opts.adminToken) {
    requestOptions.headers["X-Admin-Token"] = opts.adminToken;
  }
  if (opts.bearerToken) {
    requestOptions.headers.Authorization = `Bearer ${opts.bearerToken}`;
  }
  opts.headers.forEach((entry) => {
    requestOptions.headers[entry.key] = entry.value;
  });

  if (opts.debug) {
    console.log("Uploading", fileName, "to", opts.url);
    console.log("Extras:", {
      field: opts.fieldName,
      metadata: opts.formFields,
      headers: requestOptions.headers,
    });
  }

  const req = httpModule.request(requestOptions, (res) => {
    let body = "";
    res.on("data", (chunk) => {
      body += chunk.toString();
    });
    res.on("end", () => {
      const status = res.statusCode || 0;
      const final = {
        status,
        ok: status >= 200 && status < 300,
        body: body || "",
      };
      try {
        final.json = body ? JSON.parse(body) : null;
      } catch (err) {
        final.json = null;
      }
      if (!final.ok) {
        console.error("Upload failed:", status, final.body);
        process.exit(1);
      }
      console.log("Upload succeeded:", final.json || final.body || `HTTP ${status}`);
    });
  });

  req.on("timeout", () => {
    req.abort();
    console.error("Upload timed out.");
    process.exit(1);
  });

  req.on("error", (err) => {
    console.error("Upload error:", err.message);
    process.exit(1);
  });

  if (metaBuffer.length) {
    req.write(metaBuffer);
  }
  req.write(headerBuffer);
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(req, { end: false });
  fileStream.on("error", (err) => {
    console.error("Failed to read file:", err.message);
    req.destroy(err);
  });
  fileStream.on("end", () => {
    req.end(footerBuffer);
  });
}

main().catch((err) => {
  console.error("upload-file.js failed:", err.message);
  process.exit(1);
});
