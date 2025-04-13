'use strict';

import npmlog from "npmlog";

npmlog.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'; // 判断debug模式

npmlog.heading = "yellowman"; // 修改前缀
npmlog.addLevel("success", 2000, { fg: "green", bold: true }); //添加自定义命令

export default npmlog
