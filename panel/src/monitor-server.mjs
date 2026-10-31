import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DATA,ensureDirs,readJson} from './config.mjs';
import {createLanMonitor,createRemoteMonitor} from './lan-monitor.mjs';
export function startMonitor(){
 ensureDirs();
 if(readJson(path.join(DATA,'settings.json'),{}).lanMonitorEnabled===true)createLanMonitor().on('error',()=>console.error('MHS_LAN_MONITOR_UNAVAILABLE')).listen(Number(process.env.MHS_MONITOR_PORT||9091),'0.0.0.0',()=>console.log('MHS LAN read-only Monitor ready'));
 createRemoteMonitor().listen(Number(process.env.MHS_REMOTE_MONITOR_PORT||9092),'127.0.0.1',()=>console.log('MHS Access read-only Monitor ready'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)startMonitor();
