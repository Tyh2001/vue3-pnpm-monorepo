const fs = require('fs');
const path = require('path');

const workspaceDir = path.resolve(__dirname, '../..');
const packagesDir = path.join(workspaceDir, 'packages');

// 获取所有 package 目录
function getPackages() {
  if (!fs.existsSync(packagesDir)) return [];
  return fs.readdirSync(packagesDir)
    .filter(name => {
      const pkgPath = path.join(packagesDir, name, 'package.json');
      return fs.existsSync(pkgPath);
    });
}

// 扫描源码中的 import 语句，提取依赖名
function scanImports(pkgName) {
  const imports = new Set();
  const pkgRootDir = path.join(packagesDir, pkgName);

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (file !== 'node_modules' && !file.startsWith('.') && file !== 'dist') {
          walk(filePath);
        }
      } else if (/\.(ts|tsx|js|jsx|vue)$/.test(file)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const importRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const dep = match[1] || match[2];
          if (dep && !dep.startsWith('.') && !dep.startsWith('@/') && !dep.startsWith('/')) {
            const pkgName = dep.startsWith('@') ? dep.split('/').slice(0, 2).join('/') : dep.split('/')[0];
            imports.add(pkgName);
          }
        }
      }
    }
  }

  walk(pkgRootDir);
  return imports;
}

// 获取 package.json 中的依赖声明（返回 Object）
function getDeclaredDepsObj(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const deps = {};
  if (pkg.dependencies) Object.assign(deps, pkg.dependencies);
  return deps;
}

// 获取 package.json 中的依赖声明（返回 Set）
function getDeclaredDepsSet(pkgPath) {
  return new Set(Object.keys(getDeclaredDepsObj(pkgPath)));
}

// 获取根目录的生产依赖（dependencies）
function getRootProdDeps() {
  const rootPkgPath = path.join(workspaceDir, 'package.json');
  if (!fs.existsSync(rootPkgPath)) return {};
  const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  return pkg.dependencies || {};
}

// 获取根目录的所有依赖
function getRootDeps() {
  const rootPkgPath = path.join(workspaceDir, 'package.json');
  if (!fs.existsSync(rootPkgPath)) return {};
  const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  const deps = {};
  if (pkg.dependencies) Object.assign(deps, pkg.dependencies);
  if (pkg.devDependencies) Object.assign(deps, pkg.devDependencies);
  return deps;
}

// 判断是否为 SDK 包（需要独立发布的包）
function isSDKPackage(pkgPath) {
  if (!fs.existsSync(pkgPath)) return false;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  // 有 publishConfig 字段，或是有 scope 前缀的包（通常是待发布的内部包）
  // workspace:* 的包（如 @vue3-pnpm-monorepo/my-utils）如果是给其他子包用的，也是 SDK
  return !!pkg.publishConfig || pkg.name.startsWith('@');
}

module.exports = {
  workspaceDir,
  packagesDir,
  getPackages,
  scanImports,
  getDeclaredDepsObj,
  getDeclaredDepsSet,
  getRootDeps,
  getRootProdDeps,
  isSDKPackage,
};
