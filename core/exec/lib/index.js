'use strict';

import Package from "@yellowman-cli-dev/package";
import log from "@yellowman-cli-dev/log";
import { exec as spawn } from "@yellowman-cli-dev/utils";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const SETTINGS = {
  // init: "@yellowman-cli-dev/init",
  init: "@imooc-cli/init"
}

const CACHE_DIR = "dependencies/";

async function exec(...args) {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = "";
  let pkg; 
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);

  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest";
  // targetPath存在
  if (!targetPath) {
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath);
    log.verbose("storeDir", storeDir);
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storeDir,
    });
  
    if (await pkg.exists()) {
      // 更新package
      console.log("更新");
      await pkg.update();
    } else {
      // 安装package
      console.log("安装");
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }
  const rootFile = pkg.getRootFilePath();
  log.info("入口代码地址", rootFile);
  if (rootFile) {
    // require(rootFile).apply(null, arguments);
    try {
      // 在当前进程中调用
      // const execFile = (await import(rootFile)).default;
      // if (typeof execFile === "function") {
      //   execFile.call(null, args);
      // }
      // 在node子进程中调用
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach(key => {
        if (!key.startsWith("_") && key !== "parent") {
          o[key] = cmd[key];
        }
      })
      args[args.length - 1] = o;
      // 使用动态 import() 代替 require()
      let code = `
        import("${rootFile}").then(module => {
          module.default.call(null, ${JSON.stringify(args)});
        }).catch(err => {
          console.error(err);
          process.exit(1);
        });
      `;
      const child = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      child.on("error", e => {
        log.verbose(e.message);
        process.exit(1);
      });
      child.on("exit", e => {
        log.verbose("命令执行成功：" + e);
      })
    } catch(e) {
      log.error(e.message);
    }
  }
  // 1. targetPath -> modulePath
  // 2. modulePath -> Package
  // 3. Package.getRootFile(获取入口文件)
  // 4. Package.update / Package.install

  // 封装 -> 复用
}

export default exec;