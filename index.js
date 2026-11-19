const fs = require("fs");
const path = require("path");

const BasePath = "E:/packages/wavesurfer";
const yarnLockPath = path.join(BasePath, "yarn.lock");
const yarnCachePath = path.resolve("E:/yarn-cache");
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
  let currentResolvedName = null;

  for (let line of lines) {
    // Новый пакет (строка без отступа и заканчивается :)
    if (!line.startsWith(" ") && line.trim().endsWith(":")) {
      const rawLine = line.trim().slice(0, -1).replace(/"/g, "");
      const firstEntry = rawLine.split(",")[0].trim();

      // Если в заголовке используется npm: алиас (например, "string-width-cjs@npm:string-width@^4.2.0")
      let targetSpec = firstEntry;
      if (targetSpec.includes("@npm:")) {
        targetSpec = targetSpec.split("@npm:")[1];
      }

      const atIndex = targetSpec.lastIndexOf("@");
      currentName = atIndex > 0 ? targetSpec.substring(0, atIndex) : targetSpec;
      currentVersion = null;
      currentResolvedName = null;
    }

    // Строка version "x.x.x"
    if (line.trim().startsWith("version")) {
      const match = line.match(/version\s+"(.+)"/);
      if (match) {
        currentVersion = match[1];
      }
    }

    // Строка resolved "https://..."
    if (line.trim().startsWith("resolved")) {
      const match = line.match(/resolved\s+"(.+)"/);
      if (match) {
        const cleanUrl = match[1].split("#")[0];
        if (cleanUrl.includes("/-/")) {
          const urlPath = cleanUrl.split("/-/")[0];
          const segments = urlPath.split("/");
          let resolvedPkgName = segments[segments.length - 1];
          if (
            segments.length >= 2 &&
            segments[segments.length - 2].startsWith("@")
          ) {
            resolvedPkgName = `${segments[segments.length - 2]}/${resolvedPkgName}`;
          }
          currentResolvedName = resolvedPkgName;
        }
      }
    }

    // Конец блока (пустая строка) или переход к следующему пакету
    if (
      line.trim() === "" &&
      currentVersion &&
      (currentResolvedName || currentName)
    ) {
      packages.push({
        name: currentResolvedName || currentName,
        version: currentVersion,
      });
      currentName = null;
      currentVersion = null;
      currentResolvedName = null;
    }
  }

  // Обработка последнего блока, если файл не заканчивается пустой строкой
  if (currentVersion && (currentResolvedName || currentName)) {
    packages.push({
      name: currentResolvedName || currentName,
      version: currentVersion,
    });
  }

  // Удаляем дубликаты пакетов одной и той же версии
  const unique = [];
  const seen = new Set();
  for (const pkg of packages) {
    const key = `${pkg.name}@${pkg.version}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(pkg);
    }
  }

  return unique;
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
  if (fs.existsSync(errorLogPath)) {
    fs.unlinkSync(errorLogPath);
  }

  const lockContent = fs.readFileSync(yarnLockPath, "utf8");
  const packages = parseYarnLock(lockContent);

  console.log(`Found ${packages.length} packages in yarn.lock`);

  for (const pkg of packages) {
    copyTgz(pkg.name, pkg.version);
  }
}

main();
