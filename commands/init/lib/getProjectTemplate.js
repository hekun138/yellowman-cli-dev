import request from "@yellowman-cli-dev/request";

export default function() {
  return request({
    url: "/project/template",
  })
}

request.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    return Promise.reject(error);
  }
)