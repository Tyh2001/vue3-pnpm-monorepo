const fs = require('fs');
const path = require('path');
const { getPackages, scanImports, isSDKPackage, packagesDir } = require('./utils/deps');
const whitelist = require('./utils/whitelist');

function checkPackage(pkgName) {
  const pkgPath = path.join(packagesDir, pkgName, 'package.json');
  if (!fs.existsSync(pkgPath)) return { ghostDeps: [], redundantDeps: [], overlappingDeps: [] };

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const isSDK = isSDKPackage(pkgPath);
  const used = scanImports(pkgName);

  const ghostDeps = [];        // 用了但没声明
  const redundantDeps = [];     // 声明了但没用
  const overlappingDeps = [];   // 根目录和子包都声明了（需要人工判断）

  // 1. 幽灵依赖：使用了但未声明（白名单除外）
  for (const dep of used) {
    if (whitelist[dep]) continue;
    const declared = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
    if (!declared) {
      ghostDeps.push(dep);
    }
  }

  // 2. 冗余依赖：声明了但没用（白名单除外）
  for (const dep of Object.keys(pkg.dependencies || {})) {
    if (whitelist[dep]) continue;
    if (!used.has(dep)) {
      redundantDeps.push(dep);
    }
  }

  // 3. 重叠依赖：根目录和子包都声明了
  // 根目录的依赖在 node_modules/.pnpm 下面，需要扫描
  const rootNodeModules = path.join(process.cwd(), 'node_modules');
  for (const dep of Object.keys(pkg.dependencies || {})) {
    if (whitelist[dep]) continue;
    // 检查是否在根目录的 node_modules 中存在且来自提升
    const rootDepPath = path.join(rootNodeModules, dep);
    if (fs.existsSync(rootDepPath)) {
      // 存在于根目录，说明可能是提升上来的
      overlappingDeps.push(dep);
    }
  }

  return { ghostDeps, redundantDeps, overlappingDeps, isSDK };
}

function main() {
  console.log('🔍 检查依赖问题...\n');

  const packages = getPackages();
  let totalGhost = 0;
  let totalRedundant = 0;
  let totalOverlapping = 0;

  for (const pkgName of packages) {
    const { ghostDeps, redundantDeps, overlappingDeps, isSDK } = checkPackage(pkgName);
    const pkgType = isSDK ? ' [SDK]' : ' [App]';

    console.log(`📦 ${pkgName}${pkgType}`);
    console.log('─'.repeat(40));

    if (ghostDeps.length > 0) {
      console.log(`  👻 幽灵依赖 (使用但未声明): ${ghostDeps.join(', ')}`);
      totalGhost += ghostDeps.length;
    }

    if (redundantDeps.length > 0) {
      console.log(`  ⚠️  冗余依赖 (声明但未使用): ${redundantDeps.join(', ')}`);
      totalRedundant += redundantDeps.length;
    }

    if (overlappingDeps.length > 0) {
      console.log(`  🔄 重叠依赖 (根目录和子包都声明): ${overlappingDeps.join(', ')}`);
      totalOverlapping += overlappingDeps.length;
    }

    if (ghostDeps.length === 0 && redundantDeps.length === 0 && overlappingDeps.length === 0) {
      console.log(`  ✅ 无依赖问题`);
    }

    console.log('');
  }

  console.log('='.repeat(40));
  console.log(`总结: 幽灵依赖 ${totalGhost} 个，冗余依赖 ${totalRedundant} 个，重叠依赖 ${totalOverlapping} 个`);
  console.log('\n📝 说明:');
  console.log('  幽灵依赖: 自动修复（补全到 package.json）');
  console.log('  冗余依赖: 自动修复（从 package.json 移除）');
  console.log('  重叠依赖: 人工判断（脚本不自动处理）');

  if (totalGhost > 0 || totalRedundant > 0 || totalOverlapping > 0) {
    process.exit(1);
  }
}

main();
