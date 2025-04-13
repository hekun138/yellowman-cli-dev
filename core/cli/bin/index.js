#! /usr/bin/env node

import importLocal from "import-local";
import { fileURLToPath } from 'url';
import npmlog  from "npmlog";
import core from '../lib/index.js';
const __filename = fileURLToPath(import.meta.url);

if (importLocal(__filename)) {
  npmlog.info("cli", "正在使用 yellowman-cli 本地版本");
} else {
  console.log(process.argv.slice(2))
  core(process.argv.slice(2));
}
