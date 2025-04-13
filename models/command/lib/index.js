'use strict';
import semver from "semver";
import colors from "colors";
import log from "@yellowman-cli-dev/log";

const LOWEST_NODE_VERSION = "12.0.0";
class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error("参数不能为空");
    }
    if (!Array.isArray(argv)) {
      throw new Error("参数必须为数组！");
    }
    if (argv.length < 1) {
      throw new Error("参数列表为空！");
    }
    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      // 校验node版本
      chain = chain.then(() => {
        this.checkNodeVersion();
      })
      // 检验参数初始化
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());
      chain.catch(err => {
        log.error(err.message);
      })
    })
  }
  // 校验node版本
  checkNodeVersion() {
    const currentVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    // 如果当前版本号没有大于最低版本号
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`yellowman-cli 需要安装 v${lowestVersion} 以上版本的 node.js`));
    }
  }
  // 参数初始化
  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  init() {
    throw new Error("init必须实现！");
  }

  exec() {
    throw new Error("exec必须实现！");
  }
}

export default Command;