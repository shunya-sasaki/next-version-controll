import { execSync } from "child_process";
import fs from "fs";

const getGitVersion = () => {
  const latestTag = execSync("git describe --tags --abbrev=0", {
    encoding: "utf-8",
  }).trim();
  const tagVersion = latestTag.replace(/^v/, "");
  const versionNumbers = tagVersion.split(".");
  const major = parseInt(versionNumbers[0]);
  const minor = parseInt(versionNumbers[1]);
  const patch = parseInt(versionNumbers[2]);
  const commitCount = parseInt(
    execSync(`git rev-list --count ${latestTag}..HEAD`, {
      encoding: "utf-8",
    }).trim()
  );
  const currentHash = execSync("git rev-parse --short HEAD", {
    encoding: "utf-8",
  }).trim();
  const status = execSync("git status -s", { encoding: "utf-8" }).trim();
  let version = "";
  if (commitCount === 0) {
    if (status === "") {
      version = `${major}.${minor}.${patch}`;
    } else {
      version = `${major}.${minor}.${patch}.dev${commitCount}+${currentHash}`;
    }
  } else {
    version = `${major}.${minor}.${patch}.dev${commitCount}+${currentHash}`;
  }
  console.log(`Version: ${version}`);
  return version;
};

getGitVersion();
