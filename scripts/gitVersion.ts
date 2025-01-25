/**
 * This script is used to update the version of the package.json and .env files.
 */
import { execSync } from "child_process";
import fs from "fs";

interface GitStatus {
  version: string;
  major: number;
  minor: number;
  patch: number;
  commitCount: number;
  currentHash: string;
  latestTag: string;
  latestTagHash: string;
  hasChanges: boolean;
}

const getGitStatus = () => {
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
  const latestTagHash = execSync(`git rev-parse --short ${latestTag}`, {
    encoding: "utf-8",
  }).trim();
  const status = execSync("git status -s", { encoding: "utf-8" }).trim();
  const hasChanges = status === "" ? false : true;
  let version = "";
  if (commitCount === 0) {
    if (!hasChanges) {
      version = `${major}.${minor}.${patch}`;
    } else {
      version = `${major}.${minor}.${
        patch + 1
      }.dev${commitCount}+${currentHash}`;
    }
  } else {
    version = `${major}.${minor}.${patch + 1}.dev${commitCount}+${currentHash}`;
  }
  const gitStatus: GitStatus = {
    version,
    major,
    minor,
    patch,
    commitCount,
    currentHash,
    latestTag,
    latestTagHash,
    hasChanges,
  };
  return gitStatus;
};

const updateVersion = (version: string, environment: string) => {
  const envFilePath =
    environment === "development" ? ".env.development" : ".env.production";
  let envContent = "";
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, { encoding: "utf8" });
  }
  let isUpdate = false;
  const updatedContent = envContent
    .split("\n")
    .map((line) => {
      if (line.startsWith("NEXT_PUBLIC_GIT_VERSION=")) {
        isUpdate = true;
        return `NEXT_PUBLIC_GIT_VERSION=${version}`;
      } else {
        return line;
      }
    })
    .filter(Boolean)
    .join("\n");
  const outputContent = isUpdate
    ? updatedContent
    : `NEXT_PUBLIC_GIT_VERSION=${version}\n${envContent}`;
  fs.writeFileSync(envFilePath, outputContent);
};

const updatePackageJson = (version: string) => {
  const targetJsonPaths = ["package.json", "package-lock.json"];
  targetJsonPaths.map((targetJsonPath) => {
    const packageJson = JSON.parse(fs.readFileSync(targetJsonPath, "utf8"));
    packageJson.version = version;
    if (targetJsonPath === "package-lock.json") {
      packageJson.packages[""].version = version;
    }
    fs.writeFileSync(targetJsonPath, JSON.stringify(packageJson, null, 2));
  });
};

const deleteTag = (latestTag: string) => {
  execSync(`git tag -d ${latestTag}`);
};

const commit = (message: string, verify: boolean = true) => {
  if (verify) {
    execSync(`git commit -am "${message}"`);
  } else {
    execSync(`git commit --no-verify -m "${message}"`);
  }
};

const add = (fileName: string) => {
  execSync(`git add ${fileName}`);
};

const tag = (tag: string) => {
  execSync(`git tag -a ${tag} -m ""`);
};

const pushTag = () => {
  execSync("git push --tags");
};
const push = () => {
  execSync("git push --no-verify");
};

const environment = process.argv[2];
const gitStatus = getGitStatus();
const version = gitStatus.version;
if (environment === "development" || environment === "production") {
  updateVersion(version, environment);
  updatePackageJson(version);
  updatePackageJson(version);
  add(".env.development");
  add(".env.production");
  add("package.json");
  add("package-lock.json");
} else if (
  gitStatus.commitCount === 0 &&
  !gitStatus.hasChanges &&
  gitStatus.latestTagHash == gitStatus.currentHash
) {
  console.log("No changes since last tag.)");
  console.log("Start updating package.json.");
  updateVersion(version, "development");
  updateVersion(version, "production");
  add(".env.development");
  add(".env.production");
  updatePackageJson(version);
  console.log("Updated package.json.");
  add("package.json");
  add("package-lock.json");
  console.log("Added package.json and package-lock.json.");
  deleteTag(gitStatus.latestTag);
  commit(`Release ${gitStatus.latestTag}`);
  tag(gitStatus.latestTag);
  push();
  pushTag();
} else {
  console.log("");
  console.log(
    "[ERROR] Please commit your changes and tag berfore running this script!"
  );
  console.log("");
}
