import axios from "axios";
import urljoin from "url-join";
import semver from "semver";

// 获取npm信息
function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urljoin(registryUrl, npmName);
  return axios.get(npmInfoUrl).then(res => {
    if (res.status === 200) {
      return res.data;
    }
    return null;
  }).catch(err => {
    return Promise.reject(err);
  });
}
// 获取npm版本
async function getNpmversions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}
// 获取满足条件的版本号
function getSemverVersions(baseVersion, versions) {
  return versions
  .filter(version => semver.satisfies(version, `^${baseVersion}`))
  .sort((a, b) => semver.gt(b, a));
}
// 获取最新的版本号
async function getNpmSemverVersion(baseVersion,npmName, registry) {
  const versions = await getNpmversions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
  return null;
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? "https://registry.npmjs.org" : "https://registry.npmmirror.com";
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmversions(npmName, registry);
  if (versions) {
    return versions.sort((a, b) =>
			semver.gt(b, a) ? 1 : semver.lt(b, a) ? -1 : 0
		)[0]
  }
  return null;
}

export { 
  getNpmInfo,
  getNpmversions,
  getNpmSemverVersion,
  getSemverVersions,
  getDefaultRegistry,
  getNpmLatestVersion
};
