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
  const commitCount = execSync(`git rev-list --count ${latestTag}..HEAD`, {
    encoding: "utf-8",
  }).trim();
  const currentHash = execSync("git rev-parse --short HEAD", {
    encoding: "utf-8",
  }).trim();
  const status = execSync("git status -s", { encoding: "utf-8" }).trim();
  if (status === "") {
    console.log("No changes since last commit.");
  }

  console.log(`Current hash: ${currentHash}`);
  console.log(`Last tag version: ${major}.${minor}.${patch}}`);
  console.log(`Count of commits since last tag: ${commitCount}`);
};

getGitVersion();
