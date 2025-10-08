#!/usr/bin/env node
// Validate JSONL training batch files and sidecar metadata

import process from "node:process";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const argv = yargs(hideBin(process.argv))
  .option("dir", { type: "string", default: "tmp/ci_training_batches" })
  .argv;

function sha1Hex(str) {
  return crypto.createHash("sha1").update(str, "utf8").digest("hex");
}

function isISODateString(s) {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

function validateRecord(record) {
  const errors = [];
  if (typeof record.id !== "number") errors.push("id must be number");
  if (typeof record.external_id !== "string") {
    errors.push("external_id must be string");
  }
  if (typeof record.training_batch_id !== "string") {
    errors.push("training_batch_id must be string");
  }
  if (typeof record.error_type !== "string") {
    errors.push("error_type must be string");
  }
  if (typeof record.error !== "object" && typeof record.error !== "string") {
    errors.push("error must be object or string");
  }
  if (typeof record.payload !== "object") errors.push("payload must be object");
  if (!isISODateString(record.created_at)) {
    errors.push("created_at must be iso timestamp");
  }
  if (typeof record.training_priority !== "number") {
    errors.push("training_priority must be number");
  }
  if (typeof record.schema_version !== "string") {
    errors.push("schema_version must be string");
  }
  if (typeof record.metadata !== "object") {
    errors.push("metadata must be object");
  }
  if (!record.metadata || typeof record.metadata.exported_by !== "string") {
    errors.push("metadata.exported_by must be string");
  }
  if (!record.metadata || !isISODateString(record.metadata.exported_at)) {
    errors.push("metadata.exported_at must be iso timestamp");
  }
  return errors;
}

function main() {
  const dir = path.resolve(
    process.cwd(),
    argv.dir || "tmp/ci_training_batches",
  );
  if (!fs.existsSync(dir)) {
    console.error("Directory not found:", dir);
    process.exit(2);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  if (files.length === 0) {
    console.warn("No .jsonl files found in", dir);
    process.exit(0);
  }

  let total = 0;
  let failures = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const base = file.replace(/\.jsonl$/i, "");
    const metaPath = path.join(dir, base + ".meta.json");

    if (!fs.existsSync(metaPath)) {
      console.error("Missing metadata sidecar for", file);
      failures++;
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const computedChecksum = sha1Hex(content);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (!meta.checksum_sha1) {
      console.error("Meta missing checksum_sha1 for", file);
      failures++;
      continue;
    }
    if (meta.checksum_sha1 !== computedChecksum) {
      console.error(
        `Checksum mismatch for ${file} (meta=${meta.checksum_sha1} computed=${computedChecksum})`,
      );
      failures++;
      continue;
    }

    // validate each JSONL line
    const lines = content.split("\n").filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      total++;
      const line = lines[i];
      let obj;
      try {
        obj = JSON.parse(line);
      } catch (_e) {
        console.error(`JSON parse error in ${file} line ${i + 1}:`, e.message);
        failures++;
        continue;
      }
      const errs = validateRecord(obj);
      if (errs.length) {
        console.error(
          `Schema validation failed for ${file} line ${i + 1}:`,
          errs.join("; "),
        );
        failures++;
      }
    }
  }

  console.log(
    `Validated ${files.length} files, ${total} records, failures=${failures}`,
  );
  if (failures > 0) process.exit(3);
}

main().catch((err) => {
  console.error("validation script error:", err);
  process.exit(4);
});
