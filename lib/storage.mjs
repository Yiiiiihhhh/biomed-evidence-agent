import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
export function openStorage(file){
  if(file!==':memory:')mkdirSync(dirname(file),{recursive:true});
  const db=new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY,value TEXT NOT NULL,etag TEXT NOT NULL,updated INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY,owner TEXT NOT NULL,expires INTEGER NOT NULL);');
  const hash=s=>createHash('sha256').update(s).digest('hex');
  const retention=30*24*3600*1000;
  const bucket={
    async get(key){const row=db.prepare('SELECT value,etag FROM records WHERE key=?').get(key);return row?{etag:row.etag,json:async()=>JSON.parse(row.value)}:null;},
    async put(key,value,options){const etag=randomUUID(),now=Date.now();if(options?.onlyIf?.etagMatches!==undefined){const r=db.prepare('UPDATE records SET value=?,etag=?,updated=? WHERE key=? AND etag=?').run(value,etag,now,key,options.onlyIf.etagMatches);return r.changes?{etag}:null;}db.prepare('INSERT INTO records(key,value,etag,updated) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,etag=excluded.etag,updated=excluded.updated').run(key,value,etag,now);return {etag};},
    async list({prefix,limit=100}){return {objects:db.prepare('SELECT key FROM records WHERE substr(key,1,?)=? ORDER BY updated DESC LIMIT ?').all(prefix.length,prefix,Math.min(limit,100)).map(({key})=>({key}))};},
    async delete(key){db.prepare('DELETE FROM records WHERE key=?').run(key);}
  };
  function cleanup(){const now=Date.now();db.prepare('DELETE FROM sessions WHERE expires<?').run(now);db.prepare('DELETE FROM records WHERE updated<?').run(now-retention);}
  function findSession(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;const s=db.prepare('SELECT owner,expires FROM sessions WHERE hash=?').get(hash(token));return s&&s.expires>Date.now()?{userId:s.owner,displayName:'访客研究者'}:null;}
  function newSession(){cleanup();if(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n>=5000)throw new Error('SESSION_CAPACITY');const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),randomUUID(),Date.now()+retention);return {token,user:findSession(token)};}
  function revoke(token){if(typeof token==='string')db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(token));}
  cleanup();return {bucket,findSession,newSession,revoke,cleanup,close:()=>db.close()};
}
