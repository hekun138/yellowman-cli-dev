'use strict';
import { isObject } from "@yellowman-cli-dev/utils";
import { packageDirectorySync } from "pkg-dir";
import { resolve } from "path";
import fse from "fs-extra";
import { createRequire } from "module";
import npminstall from "npminstall";
import formatPath from "@yellowman-cli-dev/format-path";
import { getDefaultRegistry, getNpmLatestVersion } from "@yellowman-cli-dev/get-npm-info";
import { pathExistsSync } from "path-exists";
import npmlog from "npmlog";
const require = createRequire(import.meta.url);

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类的options参数不能为空！");
    }
    if (!isObject(options)) {
      throw new Error("Package类的options参数必须为对象！");
    }
    // package的目标路径
    this.targetPath = options.targetPath;
    // package的缓存路径
    this.storeDir = options.storeDir;
    // package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace("/", "+")
    
    // _@imooc-cli_init@1.1.2@@imooc-cli/
    // @imooc-cli/init 1.1.2
    // _@imooc-cli_init@1.1.2@@imooc-cli/
  }

  // 这里不需要拼接全路径地址，通过软链可以直接获取到
  get cacheFilePath() {
    // return resolve(
    //   this.storeDir, 
    //   `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    // );
    return resolve(this.storeDir, `${this.packageName}`)
  }

  async prepare() {
    if (this.storeDir && !pathExistsSync(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }
  // ⚠️FIX:BUG
  // 获取指定版本的缓存路径: 必须从 .store 中去拼接版本号获取，默认的软链指向的始终是旧版本的
  getSpecificCacheFilePath(packageVersion) {
    return resolve(
			this.storeDir,
			'.store',
			`${this.cacheFilePathPrefix}@${packageVersion}/node_modules/${this.packageName}`
		)
  }

  // 判断当前Package是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return pathExistsSync(this.cacheFilePath);
    } else {
      return pathExistsSync(this.targetPath);
    }
  }

  // 安装Package
  install() {
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [
        { name: this.packageName, version: this.packageVersion },
      ]
    })
  }

  // 更新
  async update() {
    await this.prepare();
    // 1. 获取最新的npm模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 2. 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    npmlog.verbose("最新版本号:", latestPackageVersion);
    npmlog.verbose('最新版本号在本地的拼接路径', latestFilePath)
		npmlog.verbose('最新版本号在本地是否存在', pathExistsSync(latestFilePath))
    // 3. 如果不存在着，则直接安装最新版本
    if (!pathExistsSync(latestFilePath)) {
      console.log(!pathExistsSync(latestFilePath));
      return npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{
          name: this.packageName,
          version: latestPackageVersion,
        }]
      });
      this.packageVersion = latestPackageVersion;
    } else{
      // 	更新了最新版本后，修改版本号
      this.packageVersion = latestPackageVersion;
    }
  }

  // 获取入口文件的路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1. 获取package.json所在目录
      const dir = packageDirectorySync({cwd: targetPath});
      if (dir) {
        // 2. 读取package.json
        const pkgFile = require(resolve(dir, "package.json"));
        // 3. 寻找main/lib
        if (pkgFile && pkgFile.main) {
          return formatPath(resolve(dir, pkgFile.main));
        }
        return null;
        // 4. 路径的兼容(macOS/windows)
      }
      return null;
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
  }
}

export default Package;