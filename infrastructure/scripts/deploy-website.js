#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const DEFAULT_SOURCE = path.join(repoRoot, "services", "frontend");
const DEFAULT_TARGET = path.join(repoRoot, "infrastructure", "deployments", "frontend");

function printHelp() {
  console.log(`
Usage: node deploy-website.js [options]

Options:
  --source <dir>    Source folder (default: ${DEFAULT_SOURCE})
  --target <dir>    Deployment output (default: ${DEFAULT_TARGET})
  --clean           Remove target before copying
  --pre "<cmd>"     Run command before copying
  --post "<cmd>"    Run command after copying
  --help            Show this help
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    source: DEFAULT_SOURCE,
    target: DEFAULT_TARGET,
    clean: false,
    pre: "",
    post: "",
  };
  for (let idx = 0; idx < args.length; idx++) {
    switch (args[idx]) {
      case "--help":
        printHelp();
        process.exit(0);
      case "--source":
        opts.source = path.resolve(repoRoot, args[idx + 1]);
        idx++;
        break;
      case "--target":
        opts.target = path.resolve(repoRoot, args[idx + 1]);
        idx++;
        break;
      case "--clean":
        opts.clean = true;
        break;
      case "--pre":
        opts.pre = args[idx + 1];
        idx++;
        break;
      case "--post":
        opts.post = args[idx + 1];
        idx++;
        break;
      default:
        throw new Error(`Unknown argument: ${args[idx]}`);
    }
  }
  return opts;
}

function deleteFolder(target) {
  if (!fs.existsSync(target)) return;
  if (fs.rmSync) {
    fs.rmSync(target, { recursive: true, force: true });
    return;
  }
  const entries = fs.readdirSync(target);
  for (const entry of entries) {
    const child = path.join(target, entry);
    const stats = fs.lstatSync(child);
    if (stats.isDirectory()) {
      deleteFolder(child);
    } else {
      fs.unlinkSync(child);
    }
  }
  fs.rmdirSync(target);
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function runCommand(command) {
  if (!command) return;
  console.log("Running:", command);
  execSync(command, { stdio: "inherit", cwd: repoRoot });
}

function main() {
  const opts = parseArgs();
  if (!fs.existsSync(opts.source)) {
    throw new Error(`Source does not exist: ${opts.source}`);
  }

  runCommand(opts.pre);

  if (opts.clean) {
    console.log("Cleaning target:", opts.target);
    deleteFolder(opts.target);
  }

  console.log(`Copying ${opts.source} to ${opts.target}`);
  copyRecursive(opts.source, opts.target);

  runCommand(opts.post);
  console.log("Website deployment artifacts are in", opts.target);
}

main();
