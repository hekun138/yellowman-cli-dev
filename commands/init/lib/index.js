'use strict';
import getProjectTemplate from "./getProjectTemplate.js";
import Command from "@yellowman-cli-dev/command";
import Package from "@yellowman-cli-dev/Package";
import log from "@yellowman-cli-dev/log";
import { spinnerStart, sleep, execAsync } from "@yellowman-cli-dev/utils";
import fs from "fs";
import fse from "fs-extra";
import inquirer from "inquirer";
import semver from "semver";
import path from "path";
import userHome from "user-home";
import kebabCase from "kebab-case";
import { glob, globSync } from "glob";
import ejs from "ejs";

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";

const WHITE_COMMAND = ["npm", "cnpm"];

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    log.verbose("projectName", this.projectName);
    log.verbose("force", this._argv[1]["force"]);
  }

  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 2. 下载模板
        log.verbose("projectInfo", projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        // 3. 安装模板
        await this.installTemplate();
      }
    } catch(e) {
      log.error(e.message);
    }
  }

  async installTemplate() {
    log.verbose("templateInfo", this.templateInfo);
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }

      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error("无法识别项目模板类型！")
      }
    } else {
      throw new Error("项目模板信息不存在！");
    }
  }

  async ejsRender(options) {
    const dir = process.cwd();
    const files = globSync("**", {
      cwd: dir,
      nodir: true,
      ignore: options.ignore || "",
    });
    if (files) { 
      Promise.all(files.map(file => {
        const filePath = path.join(dir, file);
        return new Promise((resolve, reject) => {
          console.log(this.projectInfo, "projectproject");
          ejs.renderFile(filePath, this.projectInfo, (err, html) => {
            console.log(err, html);
            if (err) {
              reject(err);
            } else {
              fse.writeFileSync(filePath, html);
              resolve(html);
            }
          })
        })
      }))
      .then(() => {})
      .catch((error) => {
        console.log(error);
        // throw new Error(error.message)
      });
      return files;
    } else {
      files = [];
    }
  }

  async installNormalTemplate() {
    log.verbose("templateNpm", this.templateNpm);
    // 拷贝模板代码至当前目录
    let spinner = spinnerStart("正在安装模板...");
    await sleep();
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, "template");
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch(e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success("模板安装成功");
    }
    const ignore = ["node_modules/**"];
    await this.ejsRender({ignore});
    // 依赖安装
    const { installCommand, startCommand } = this.templateInfo;
    await this.execCommand(installCommand, "依赖安装过程失败！");
    // 启动命令执行
    await this.execCommand(startCommand, "启动执行命令失败！");
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  async execCommand(command, errMsg) {
    let ret;
    const cmdArray = command.split(" ");
    const cmd = this.checkCommand(cmdArray[0]);
    if (!cmd) {
      throw new Error("命令不存在！命令：" + command);
    }
    const args = cmdArray.slice(1);
    ret = await execAsync(cmd, args, {
      stdio: "inherit",
      cwd: process.cwd()
    });

    if (ret !== 0) {
      throw new Error(errMsg);
    }
    return ret;
  }

  async installCustomTemplate() {
    console.log("安装自定义模板");
    console.log(this.templateNpm);
  }

  async downloadTemplate() {
    // 1. 通过项目目标API获取项目模板信息
    // 1.1 通过egg.js搭建一套后端系统
    // 1.2 通过npm存储项目模板
    // 1.3 将项目模板信息存储到mongodb数据库中
    // 1.4 通过egg.js获取mmongodb中的数据并且通过API返回
    // console.log(this.projectInfo, "projectInfo");
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(item => item.npmName === projectTemplate);
    const targetPath = path.resolve(userHome, ".yellowman-cli-dev", "template");
    const storeDir = path.resolve(userHome, ".yellowman-cli-dev", "template", "node_modules");
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version
    });

    if (! await templateNpm.exists()) {
      const spinner = spinnerStart("正在下载模板...");
      await sleep();
      try {
        await templateNpm.install();
      } catch(e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("下载模板成功");
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart("正在更新模板...");
      await sleep();
      try {
        await templateNpm.update();
      } catch(e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("更新模板成功");
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  async prepare() {
    // 0. 判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error("项目模板不存在")
    }
    this.template = template;
    // 1. 判断当前目录是否为空
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this._argv[1]["force"]) {
        // 1.1 讯问是否继续创建
        ifContinue = (await inquirer.prompt({
          type: "confirm",
          name: "ifContinue",
          default: false,
          message: "当前文件夹不为空，是否继续创建项目？"
        })).ifContinue;
        // 如果不继续，终止
        if (!ifContinue) {
          return;
        }
      }
      // 2. 是否启动强制更新
      if (ifContinue || this._argv[1]["force"]) {
        // 给用户做二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录下的文件？"
        })
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }

    return this.getProjectInfo();   
  }

  async getProjectInfo() {
    let projectInfo = {}
    // 3. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [{
        name: "项目",
        value: TYPE_PROJECT,
      }, {
        name: "组件",
        value: TYPE_COMPONENT
      }]
    })
    // 4. 获取项目的基本信息
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt([{
        type: "input",
        name: "projectName",
        message: "请输入项目名称",
        default: "",
        validate: function(v) {
          // 1.首字母必须为英文字符
          // 2.尾字符必须为英文或数字，不能为字符
          // 3.字符仅允许""-_"
          // \w=a-zA-Z0-9_
          // 合法：a, a-b, a_b, a-b-c, a_b_c, a-b1-c1, a_b1_c1
          // 不合法：1, a_, a-, a_1, a-1
          return new Promise((resolve) => {
            setTimeout(function() {
              if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
                resolve("请输入合法的项目名称");
                return;
              }
              resolve(true);
            }, 0);
          });
        },
        filter: function(v) {
          return v;
        }
        }, {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate: function(v) {
            return new Promise((resolve) => {
              setTimeout(function() {
                if (!(!!semver.valid(v))) {
                  resolve("请输入合法的版本号");
                  return;
                }
                resolve(true);
              }, 0);
            });
          },
          filter: function(v) {
            if (!!semver.valid(v)) {
              return semver.valid(v);
            } else {
              return v;
            }
          }
        }, {
          type: "list",
          name: "projectTemplate",
          message: "请选择项目模板",
          choices: this.createTemplateChoice()
        }
      ]);
      projectInfo = {
        type,
        ...project,
      }
    } else if (type === TYPE_COMPONENT) {

    }

    log.verbose("type", type);
    // AbcEfg => abc-efg
    // 生成classname
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = kebabCase(projectInfo.projectName).replace(/^-/, "");
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    // return 项目的基本信息(object)
    return projectInfo;
  }

  createTemplateChoice() {
    return this.template.map(item => ({
      name: item.name,
      value: item.npmName
    }));
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    fileList = fileList.filter(file => (
      !file.startsWith(".") && ["node_modules"].indexOf(file) < 0
    ));
    return !fileList || fileList.length <= 0;
  }

}

function init(argv) {
  // console.log("init", projectName, cmdObj.force, process.env.CLI_TARGET_PATH);
  return new InitCommand(argv);
}

export default init;

