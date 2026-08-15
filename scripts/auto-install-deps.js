const fs = require('fs');
const path = require('path');
const { getPackages, scanImports, isSDKPackage, packagesDir } = require('./utils/deps');
const whitelist = require('./utils/whitelist');

function fixPackageDeps(pkgName, dryRun = false) {
  const pkgPath = path.join(packagesDir, pkgName, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const isSDK = isSDKPackage(pkgPath);
  const used = scanImports(pkgName);

  const missingDeps = [];    // 幽灵依赖，需要补全
  const redundantDeps = [];   // 冗余依赖，需要删除
  let hasOverlapping = false; // 是否有重叠依赖（不自动处理）

  // 1. 找出幽灵依赖
  for (const dep of used) {
    if (whitelist[dep]) continue;
    const declared = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
    if (!declared) {
      missingDeps.push(dep);
    }
  }

  // 2. 找出冗余依赖
  for (const dep of Object.keys(pkg.dependencies || {})) {
    if (whitelist[dep]) continue;
    if (!used.has(dep)) {
      redundantDeps.push(dep);
    }
  }

  // 3. 检查重叠依赖（只报告，不处理）
  const rootNodeModules = path.join(process.cwd(), 'node_modules');
  for (const dep of Object.keys(pkg.dependencies || {})) {
    if (whitelist[dep]) continue;
    const rootDepPath = path.join(rootNodeModules, dep);
    if (fs.existsSync(rootDepPath)) {
      hasOverlapping = true;
      break;
    }
  }

  if (missingDeps.length === 0 && redundantDeps.length === 0 && !hasOverlapping) {
    console.log(`✅ ${pkgName}: 无需修复`);
    return;
  }

  let hasChanges = false;

  // 修复重叠依赖：提示但不处理
  if (hasOverlapping) {
    console.log(`📦 ${pkgName}: 发现重叠依赖，需要人工判断`);
    console.log(`  💡 提示: 根目录和子包都声明了同一依赖，请确认是否需要保留`);
  }

  // 修复幽灵依赖：补全到 package.json
  if (missingDeps.length > 0) {
    console.log(`📦 ${pkgName}: 发现 ${missingDeps.length} 个幽灵依赖`);
    for (const dep of missingDeps) {
      console.log(`  → 添加 ${dep}`);
      if (!dryRun) {
        if (!pkg.dependencies) pkg.dependencies = {};
        // 尝试从根目录 node_modules 获取版本
        const rootDepPath = path.join(rootNodeModules, dep, 'package.json');
        if (fs.existsSync(rootDepPath)) {
          try {
            const rootPkg = JSON.parse(fs.readFileSync(rootDepPath, 'utf-8'));
            pkg.dependencies[dep] = `^${rootPkg.version}`;
            console.log(`    (版本: ^${rootPkg.version})`);
          } catch {
            pkg.dependencies[dep] = 'latest';
          }
        } else {
          pkg.dependencies[dep] = 'latest';
        }
        hasChanges = true;
      }
    }
  }

  // 修复冗余依赖：应用包删除，SDK 包保留
  if (redundantDeps.length > 0) {
    console.log(`📦 ${pkgName}: 发现 ${redundantDeps.length} 个冗余依赖`);
    if (!isSDK) {
      for (const dep of redundantDeps) {
        console.log(`  → 删除 ${dep}`);
        if (!dryRun) {
          delete pkg.dependencies[dep];
          hasChanges = true;
        }
      }
    } else {
      console.log(`  💡 SDK 包保留冗余依赖（可能将来用到）`);
    }
  }

  if (!dryRun && hasChanges) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  ✓ ${pkgName} package.json 已更新`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetPkg = args.find(arg => !arg.startsWith('--'));

  console.log(dryRun ? '🔍 [dry-run 模式] 检查依赖...\n' : '🔧 修复依赖问题...\n');

  if (targetPkg) {
    fixPackageDeps(targetPkg, dryRun);
  } else {
    const packages = getPackages();
    for (const pkg of packages) {
      fixPackageDeps(pkg, dryRun);
    }
  }

  if (!dryRun) {
    console.log('\n💡 运行 pnpm install 以安装新依赖');
  }
}

main();
