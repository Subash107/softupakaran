#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const DEFAULT_DIRS = ["services/frontend", "services/backend"];

function printHelp() {
  console.log(`
Usage: node watch-folders.js [options]

Options:
  --dirs <list>     Comma-separated folders to watch (relative to repo root)
  --cmd "<command>" Command to run when changes are detected
  --debounce <ms>   Debounce delay for batching events (default: 400)
  --help            Show this help
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    dirs: process.env.WATCH_DIRS ? process.env.WATCH_DIRS.split(",") : DEFAULT_DIRS.slice(),
    command: process.env.WATCH_CMD || "",
    debounce: 400,
  };
  for (let idx = 0; idx < args.length; idx++) {
    switch (args[idx]) {
      case "--help":
        printHelp();
        process.exit(0);
      case "--dirs":
        opts.dirs = args[idx + 1].split(",").map((part) => part.trim()).filter(Boolean);
        idx++;
        break;
      case "--cmd":
        opts.command = args[idx + 1];
        idx++;
        break;
      case "--debounce":
        opts.debounce = Number(args[idx + 1]);
        if (Number.isNaN(opts.debounce) || opts.debounce < 0) {
          throw new Error("Debounce must be a positive number");
        }
        idx++;
        break;
      default:
        throw new Error(`Unknown argument: ${args[idx]}`);
    }
  }
  return opts;
}

function resolveDirs(dirList) {
  return dirList
    .map((dir) => path.resolve(repoRoot, dir))
    .filter((dir) => {
      if (!fs.existsSync(dir)) {
        console.warn(`Skipping missing watch directory: ${dir}`);
        return false;
      }
      if (!fs.statSync(dir).isDirectory()) {
        console.warn(`Skipping non-directory watch target: ${dir}`);
        return false;
      }
      return true;
    });
}

function main() {
  const opts = parseArgs();
  const watchDirs = resolveDirs(opts.dirs);
  if (!watchDirs.length) {
    throw new Error("No watch directories available.");
  }

  console.log("Watching:", watchDirs.join(", "));
  if (opts.command) {
    console.log("On change running:", opts.command);
  }

  let timer = null;
  const changedFiles = new Set();

  function scheduleRun(eventType, fileName, dirPath) {
    const label = `${eventType}:${fileName || ""}`;
    changedFiles.add(label);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const summary = Array.from(changedFiles).join("; ");
      console.log(`[${new Date().toISOString()}] Detected changes: ${summary}`);
      changedFiles.clear();
      timer = null;
      if (opts.command) {
        const child = spawn(opts.command, { shell: true, stdio: "inherit" });
        child.on("exit", (code) => {
          if (code !== 0) {
            console.warn(`Command exited with ${code}`);
          }
        });
      }
    }, opts.debounce);
  }

  const watchers = watchDirs.map((dir) => {
    try {
      return fs.watch(dir, { recursive: true }, (eventType, fileName) => {
        scheduleRun(eventType, fileName, dir);
      });
    } catch (err) {
      console.warn(`Failed to watch ${dir}: ${err.message}`);
      return null;
    }
  }).filter(Boolean);

  process.on("SIGINT", () => {
    console.log("Stopping watchers...");
    watchers.forEach((watcher) => watcher.close());
    process.exit(0);
  });

  process.stdin.resume();
}

main();
