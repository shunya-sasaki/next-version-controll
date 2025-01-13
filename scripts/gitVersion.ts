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
      version = `${major}.${minor}.${
        patch + 1
      }.dev${commitCount}+${currentHash}`;
    }
  } else {
    version = `${major}.${minor}.${patch + 1}.dev${commitCount}+${currentHash}`;
  }
  return version;
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

const environment = process.argv[2];
const version = getGitVersion();
updateVersion(version, environment);
updatePackageJson(version);
