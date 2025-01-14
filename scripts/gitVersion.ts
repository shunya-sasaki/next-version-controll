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
    fs.writeFileSync(targetJsonPath, JSON.stringify(packageJson, null, 2));
  });
};

const deleteTag = (latestTag: string) => {
  execSync(`git tag -d ${latestTag}`);
};

const getMessageFromTag = (tag: string) => {
  const message = execSync(`git show ${tag} --no-patch --pretty=%s`, {
    encoding: "utf-8",
  }).trim();
  return message;
};

const commit = (message: string) => {
  execSync(`git commit -am "${message}"`);
};

const tag = (tag: string) => {
  execSync(`git tag -a ${tag} -m ""`);
};

const pushTag = () => {
  execSync("git push --tags");
};
const push = () => {
  execSync("git push");
};

const gitStatus = getGitStatus();
const version = gitStatus.version;
console.log(gitStatus);
if (
  gitStatus.commitCount === 0 &&
  !gitStatus.hasChanges &&
  gitStatus.latestTagHash == gitStatus.currentHash
) {
  console.log("No changes since last tag.)");
  console.log("Start updating package.json.");
  deleteTag(gitStatus.latestTag);
  console.log("Deleted tag: " + gitStatus.latestTag);
  updateVersion(version, "development");
  updateVersion(version, "production");
  console.log("Updated .env.development and .env.production");
  updatePackageJson(version);
  console.log("Updated package.json");
  commit(`Release ${gitStatus.latestTag}`);
  tag(gitStatus.latestTag);
  console.log("Tagged with: " + gitStatus.latestTag);
  pushTag();
  push();
} else {
  let environment = "development";
  if (process.argv.length === 3) {
    environment = process.argv[2];
  }
  updateVersion(version, environment);
  updatePackageJson(version);
}
