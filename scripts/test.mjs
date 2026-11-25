import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// 直接测试 TypeScript 源码，避免旧构建产物掩盖重构后的问题。
const directory = 'node_modules/.cache/dws-reply';
const testFile = `${directory}/core.test.mjs`;
await mkdir(directory, { recursive: true });
await build({
  entryPoints: ['test/core.test.js'],
  outfile: testFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  target: 'es2022',
});
const result = spawnSync(process.execPath, ['--test', resolve(testFile)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
