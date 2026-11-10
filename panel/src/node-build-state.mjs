import path from 'node:path';
import {DATA,readJson} from './config.mjs';
import {HttpError} from './security.mjs';
export const buildJournal=slug=>path.join(DATA,'node-build-'+slug+'.json');
export function assertNodeBuildSettled(slug){
 const j=readJson(buildJournal(slug),null);
 if(j&&!['DONE','ROLLED_BACK'].includes(j.phase))throw new HttpError(409,'NODE_BUILD_RECOVERY_REQUIRED');
}
