'use strict';

import axios from "axios";

const BASE_URL = process.env.YELLOWMAN_CLI_BASE_URL ? process.env.YELLOWMAN_CLI_BASE_URL : "http://127.0.0.1:7001";

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 500
})

export default request;