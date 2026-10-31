import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseEnv} from 'node:util';
import {DATA} from './config.mjs';
import {slugOK,HttpError} from './security.mjs';
import {validateEnvironment} from './sites.mjs';
const limit=64*1024;
function target(slug){if(!slugOK(slug))throw new HttpError(400,'INVALID_SITE');return path.join(DATA,'node-envfiles',slug,'.env');}
function regular(file){const st=fs.lstatSync(file,{throwIfNoEntry:false});if(st&&(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>limit))throw new HttpError(409,'NODE_ENV_FILE_PATH_REVIEW_REQUIRED');return st;}
function directory(dir){const st=fs.lstatSync(dir,{throwIfNoEntry:false});if(st&&(!st.isDirectory()||st.isSymbolicLink()))throw new HttpError(409,'NODE_ENV_FILE_PATH_REVIEW_REQUIRED');}
export function parseNodeEnv(text){if(typeof text!=='string'||Buffer.byteLength(text)>limit||text.includes('\0'))throw new HttpError(400,'NODE_ENV_FILE_LIMIT_64KIB');let values;try{values=parseEnv(text);const {PORT,...checked}=values;validateEnvironment(checked);}catch{throw new HttpError(400,'NODE_ENV_FILE_INVALID_OR_RESERVED_VARIABLE');}return values;}
export function readNodeEnv(slug){const file=target(slug);directory(path.dirname(path.dirname(file)));directory(path.dirname(file));return regular(file)?parseNodeEnv(fs.readFileSync(file,'utf8')):{};}
export function hasNodeEnv(slug){const file=target(slug);directory(path.dirname(path.dirname(file)));directory(path.dirname(file));return !!regular(file);}
export function saveNodeEnv(slug,text){parseNodeEnv(text);const file=target(slug),dir=path.dirname(file);directory(path.dirname(dir));directory(dir);fs.mkdirSync(dir,{recursive:true,mode:0o700});const before=regular(file);if(before)fs.copyFileSync(file,path.join(DATA,'node-env-before-'+slug+'-'+crypto.randomBytes(8).toString('hex')+'.private'),fs.constants.COPYFILE_EXCL);const temp=path.join(dir,'.env-'+crypto.randomBytes(8).toString('hex'));try{fs.writeFileSync(temp,text,{mode:0o600,flag:'wx'});fs.renameSync(temp,file);fs.chmodSync(file,0o600);}finally{fs.rmSync(temp,{force:true});}return {saved:true};}
