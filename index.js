const fs = require('fs');
const path = require('path');

const BasePath = 'D:/packages/nextui'
const yarnCachePath = path.resolve('C:/yarn-cache');
const tgzOutputPath = path.join(BasePath,'node_modules_tgz');
const errorLogPath = path.join(BasePath, 'error.txt');
/* const errorLogPath = path.join(__dirname, 'error.txt'); */
const nodeModulesPath = path.resolve(BasePath,'node_modules');

function logError(message) {
  fs.appendFileSync(errorLogPath, message + '\n', 'utf8');
}

function copyAndRenameTgz(packageName, packageVersion, relativePath) {
  // Replace '/' with '-' for scoped packages
  const cachePackageName = packageName.replace('/', '-');
  const originalTgzName = `${cachePackageName}-${packageVersion}.tgz`;
  const newTgzName = `${packageName.split('/').pop()}-${packageVersion}.tgz`;
  const sourceTgzPath = path.join(yarnCachePath, originalTgzName);
  const destinationTgzPath = path.join(tgzOutputPath, relativePath, newTgzName);

  try {
    fs.mkdirSync(path.dirname(destinationTgzPath), { recursive: true });
    fs.copyFileSync(sourceTgzPath, destinationTgzPath);
    console.log(`Copied and renamed ${originalTgzName} to ${destinationTgzPath}`);
  } catch (error) {
    const errorMessage = `Error copying ${originalTgzName}: ${error.message}`;
    console.error(errorMessage);
    logError(errorMessage);
  }
}

function traverseNodeModules(currentPath, relativePath = '') {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const newRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('@')) {
        traverseNodeModules(fullPath, newRelativePath);
      } else {
        const packageJsonPath = path.join(fullPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = require(packageJsonPath);
          const packageName = packageJson.name;
          const packageVersion = packageJson.version;
          copyAndRenameTgz(packageName, packageVersion, newRelativePath);
        }
      }
    }
  }
}

traverseNodeModules(nodeModulesPath);