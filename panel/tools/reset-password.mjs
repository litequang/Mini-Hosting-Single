import fs from 'node:fs';
import path from 'node:path';
import {makePassword,setPassword} from '../src/security.mjs';
import {ensureDirs,DATA} from '../src/config.mjs';
ensureDirs();const password=makePassword();setPassword(password);fs.writeFileSync(path.join(DATA,'initial-password'),password+'\n',{mode:0o600});console.log('Password reset. Read private initial-password locally; restart mhs-panel to invalidate sessions.');
