import { storage } from './runtime.mjs';
import { getWorkspaceUser } from './portable-auth.mjs';
import { ResearchError } from './research.mjs';

export async function readBody(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new ResearchError('ORIGIN','请求来源不允许。',403);
  const raw = await request.text();
  if (raw.length > 30000) throw new ResearchError('TOO_LARGE','输入过长，请缩小内容范围。',413);
  try { const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();return parsed; } catch { throw new ResearchError('INPUT','请求格式错误，请提交JSON对象。'); }
}
export function json(data: unknown, status=200) { return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
export function errorResponse(e: unknown) { return e instanceof ResearchError ? json({error:e.message,code:e.code},e.status) : json({error:'本次操作未完成，请稍后重试。已有结果会保留。',code:'INTERNAL'},500); }
export async function owner() {
  const u=await getWorkspaceUser();
  if(!u)throw new ResearchError('SIGN_IN','工作空间已过期，请刷新页面后重试。',401);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(u.userId));
  return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function bucket() { return storage.bucket; }
export function runKey(ownerId:string,id:string) { if(!/^[a-f0-9-]{36}$/.test(id))throw new ResearchError('NOT_FOUND','研究记录不存在。',404);return `research/${ownerId}/${id}.json`; }
export async function loadRun(ownerId:string,id:string) {const object=await bucket().get(runKey(ownerId,id));if(!object)throw new ResearchError('NOT_FOUND','找不到这项研究，或你没有访问权限。',404);return {run:await object.json<any>(),etag:object.etag};}
export async function saveRun(ownerId:string,run:any,etag?:string) {const next={...run,updatedAt:new Date().toISOString(),revision:(run.revision||0)+1};const stored=await bucket().put(runKey(ownerId,run.id),JSON.stringify(next),{httpMetadata:{contentType:'application/json'},...(etag?{onlyIf:{etagMatches:etag}}:{})});if(!stored)throw new ResearchError('CONFLICT','另一个窗口已更新这项研究，请刷新后继续。',409);Object.assign(run,next);return stored.etag;}
