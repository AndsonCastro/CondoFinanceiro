import { ClassicLevel } from 'classic-level';
import path from 'path';
import os from 'os';

const LEVELDB_PATH = path.join(os.tmpdir(), 'CondoFinanceiro', 'Default', 'Local Storage', 'leveldb');
const STORAGE_KEY  = 'condo_financeiro_v1';
// Chrome encodes the key as: _http_localhost_3000\x00\x01<keyname>
const CHROME_KEY   = `_http_localhost_3000\x00\x01${STORAGE_KEY}`;

const db = new ClassicLevel(LEVELDB_PATH, { keyEncoding: 'buffer', valueEncoding: 'buffer' });

try {
  // List all keys to find the right one
  let found = null;
  for await (const [key, value] of db.iterator()) {
    const keyStr = key.toString('utf8');
    if (keyStr.includes(STORAGE_KEY)) {
      // Chrome LevelDB: 0x00 prefix = UTF-16 LE, 0x01 prefix = Latin-1/ASCII
      if (value[0] === 0x00) {
        found = value.slice(2).toString('utf16le');
      } else {
        found = value.slice(1).toString('latin1');
      }
      break;
    }
  }
  if (found) {
    process.stdout.write(found);
  } else {
    process.stderr.write('NOT_FOUND');
    process.exit(1);
  }
} finally {
  await db.close();
}
