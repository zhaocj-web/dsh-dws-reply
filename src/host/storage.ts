import { readFile, rename, writeFile } from 'node:fs/promises';
import { hasErrorCode } from '../shared/errors';
export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    if (hasErrorCode(e, 'ENOENT')) return fallback;
    throw e;
  }
}
export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const temp = path + '.tmp';
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(temp, path);
}
