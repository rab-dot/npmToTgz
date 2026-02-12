const fs = require("fs");
const path = require("path");

const BasePath = "E:/packages/vite-7";
const yarnLockPath = path.join(BasePath, "yarn.lock");
const yarnCachePath = path.resolve("C:/yarn-cache");
const tgzOutputPath = path.join(BasePath, "node_modules_tgz");
const errorLogPath = path.join(BasePath, "error.txt");

function logError(message) {
  fs.appendFileSync(errorLogPath, message + "\n", "utf8");
}

function parseYarnLock(lockContent) {
  const packages = [];

  const lines = lockContent.split("\n");

  let currentName = null;
  let currentVersion = null;

  for (let line of lines) {
    // Новый пакет (строка без отступа и заканчивается :)
    if (!line.startsWith(" ") && line.trim().endsWith(":")) {
      const rawKey = line.split(":")[0].trim().replace(/"/g, "");
      const firstEntry = rawKey.split(",")[0];

      const atIndex = firstEntry.lastIndexOf("@");
      currentName = firstEntry.substring(0, atIndex);
      currentVersion = null;
    }

    // Строка version "x.x.x"
    if (line.trim().startsWith("version")) {
      const match = line.match(/version\s+"(.+)"/);
      if (match && currentName) {
        currentVersion = match[1];

        packages.push({
          name: currentName,
          version: currentVersion,
        });
      }
    }
  }

  return packages;
}

function copyTgz(packageName, packageVersion) {
  const cachePackageName = packageName.replace("/", "-");
  const tgzName = `${cachePackageName}-${packageVersion}.tgz`;

  const sourceTgzPath = path.join(yarnCachePath, tgzName);

  const packageFolder = packageName.startsWith("@")
    ? path.join(
        tgzOutputPath,
        packageName.split("/")[0],
        packageName.split("/")[1],
      )
    : path.join(tgzOutputPath, packageName);

  const destinationTgzPath = path.join(
    packageFolder,
    `${packageName.split("/").pop()}-${packageVersion}.tgz`,
  );

  try {
    fs.mkdirSync(packageFolder, { recursive: true });
    fs.copyFileSync(sourceTgzPath, destinationTgzPath);
    console.log(`Copied ${tgzName}`);
  } catch (error) {
    const errorMessage = `Error copying ${tgzName}: ${error.message}`;
    console.error(errorMessage);
    logError(errorMessage);
  }
}

function main() {
  const lockContent = fs.readFileSync(yarnLockPath, "utf8");
  const packages = parseYarnLock(lockContent);

  console.log(`Found ${packages.length} packages in yarn.lock`);

  for (const pkg of packages) {
    copyTgz(pkg.name, pkg.version);
  }
}

main();
