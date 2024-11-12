const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nodeModulesPath = path.resolve('D:/packages/chakra-ui/node_modules');
const tgzOutputPath = path.resolve('D:/packages/chakra-ui/node_modules_tgz');

function packageDirectory(dirPath, relativePath) {
  const packageJsonPath = path.join(dirPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = require(packageJsonPath);
    const packageName = packageJson.name;
    const packageVersion = packageJson.version;
    const packageTgzName = `${packageName.split('/').pop()}-${packageVersion}.tgz`;
    const packageTgzPath = path.join(tgzOutputPath, relativePath, packageTgzName);

    // Ensure the output directory exists
    fs.mkdirSync(path.dirname(packageTgzPath), { recursive: true });

    // Run the npm pack command to create the .tgz archive
    try {
      execSync(`npm pack`, { cwd: dirPath, stdio: 'inherit' });
      try {
        fs.renameSync(path.join(dirPath, packageTgzName), packageTgzPath);
      } catch (error) {
        console.error(`Ошибка перемещения файла ${packageTgzName}:`, error.message);
      }
      console.log(`Packaged ${packageName} to ${packageTgzPath}`);
    } catch (error) {
      console.error(`Ошибка упаковки ${packageName}:`, error.message);
    }
  }
}

function traverseNodeModules(currentPath, relativePath = '') {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const newRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('@')) {
        // Handle scoped packages
        traverseNodeModules(fullPath, newRelativePath);
      } else {
        packageDirectory(fullPath, newRelativePath);
      }
    }
  }
}

// Start the process
traverseNodeModules(nodeModulesPath);