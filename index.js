const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nodeModulesPath = path.resolve('D:/packages/chakra-ui/node_modules');

function packageDirectory(dirPath) {
  const packageJsonPath = path.join(dirPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = require(packageJsonPath);
    const packageName = packageJson.name;
    const packageVersion = packageJson.version;
    const packageTgzName = `${packageName.split('/').pop()}-${packageVersion}.tgz`;
    const packageTgzPath = path.join(path.dirname(dirPath), packageTgzName);

    // Run the pac command to create the .tgz archive
    try {
      execSync(`npm pack ${dirPath} -o ${packageTgzPath}`, { stdio: 'inherit' });
      console.log(`Packaged ${packageName} to ${packageTgzPath}`);
    } catch (error) {
      console.error(`Ошибка упаковки ${packageName}:`, error.message);
    }
  }
}

function traverseNodeModules(currentPath) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('@')) {
        // Handle scoped packages
        traverseNodeModules(fullPath);
      } else {
        packageDirectory(fullPath);
      }
    }
  }
}

traverseNodeModules(nodeModulesPath);