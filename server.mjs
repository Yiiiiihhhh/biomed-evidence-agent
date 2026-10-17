import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {storage} from './lib/runtime.mjs';
import {requestContext} from './lib/portable-auth.mjs';
import * as research from './app/api/research/route.ts';
import * as detail from './app/api/research/[id]/route.ts';
import * as verify from './app/api/verify/route.ts';
import * as query from './app/api/query/route.ts';
import * as model from './app/api/model-test/route.ts';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const staticPaths=new Map([['/',['index.html','text/html;charset=utf-8']],['/app.js',['app.js','text/javascript;charset=utf-8']],['/app.css',['app.css','text/css;charset=utf-8']],['/retrieval-snapshot.json',['retrieval-snapshot.json','application/json;charset=utf-8']]]);
const limits=new Map();let active=0;
function permit(id,max){const now=Date.now(),old=limits.get(id);if(!old||old.until<now){limits.set(id,{n:1,until:now+60000});return true;}return ++old.n<=max;}
const cleanup=setInterval(()=>{for(const [key,v] of limits)if(v.until<Date.now())limits.delete(key);storage.cleanup();},60000);cleanup.unref();
const baseHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",'Cache-Control':'no-store'};
function send(res,status,data){res.writeHead(status,{...baseHeaders,'Content-Type':'application/json;charset=utf-8'});res.end(JSON.stringify(data));}
const server=createServer(async(req,res)=>{
  let admitted=false;
  try{
    const authority=req.headers.host||'localhost';
    if(!/^[a-zA-Z0-9.:\[\]-]+$/.test(authority))return send(res,400,{error:'请求地址无效。'});
    const publicOrigin=process.env.PUBLIC_ORIGIN?.replace(/\/$/,'');
    const url=new URL(req.url,publicOrigin||`http://${authority}`);
    if(url.pathname==='/healthz')return send(res,200,{ok:true,app:'biomed',version:'1.0.0'});
    if(!url.pathname.startsWith('/api/')){
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'请求方法不支持。'});
      const item=staticPaths.get(url.pathname);if(!item)return send(res,404,{error:'页面不存在。'});
      const bytes=await readFile(root+item[0]);res.writeHead(200,{...baseHeaders,'Content-Type':item[1]});return res.end(req.method==='HEAD'?undefined:bytes);
    }
    // Cross-site writes are blocked before parsing bodies or performing paid calls.
    const origin=req.headers.origin;
    const allowed=publicOrigin?[publicOrigin]:[`http://${authority}`,`https://${authority}`];
    if((origin&&!allowed.includes(origin))||req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'请求来源不允许。',code:'ORIGIN'});
    if(req.method==='OPTIONS')return send(res,405,{error:'不接受跨站 API 请求。'});
    const token=String(req.headers['x-biomed-session']||'');
    const who=storage.findSession(token);
    const fingerprint=createHash('sha256').update(who?.userId||req.socket.remoteAddress||'anonymous').digest('hex');
    if(!permit('global',180)||!permit(fingerprint,45)||active>=8)return send(res,429,{error:'当前请求较多，请稍后重试。',code:'RATE_LIMIT'});
    active++;admitted=true;
    if(url.pathname==='/api/session'){
      if(req.method==='GET'){const session=who?{token,user:who}:storage.newSession();return send(res,200,{token:session.token,user:{displayName:session.user.displayName},retentionDays:30});}
      if(req.method==='DELETE'){storage.revoke(token);return send(res,200,{ok:true});}
      return send(res,405,{error:'请求方法不支持。'});
    }
    const chunks=[];let length=0;
    for await(const chunk of req){length+=chunk.length;if(length>30000)return send(res,413,{error:'输入过长，请缩小内容范围。',code:'TOO_LARGE'});chunks.push(chunk);}
    const method=req.method||'GET';
    const request=new Request(url,{method,headers:{...req.headers,...(origin?{origin:url.origin}:{})},...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(chunks)}:{})});
    const match=url.pathname.match(/^\/api\/research\/([a-f0-9-]{36})$/);
    const routes={'/api/research':research,'/api/verify':verify,'/api/query':query,'/api/model-test':model};
    const route=match?detail:routes[url.pathname];if(!route)return send(res,404,{error:'接口不存在。'});
    const handler=route[method];if(!handler)return send(res,405,{error:'请求方法不支持。'});
    const result=await requestContext.run({user:who},()=>handler(request,{params:Promise.resolve({id:match?.[1]})}));
    res.writeHead(result.status,{...baseHeaders,...Object.fromEntries(result.headers)});res.end(Buffer.from(await result.arrayBuffer()));
  }catch{
    // Do not log request bodies, model replies, session tokens, API keys or topics.
    if(!res.headersSent)send(res,500,{error:'本次操作未完成，请稍后重试。已有结果会保留。',code:'INTERNAL'});else res.end();
  }finally{if(admitted)active--;}
});
server.requestTimeout=150000;server.headersTimeout=15000;
server.listen(Number(process.env.PORT||7860),process.env.HOST||'0.0.0.0',()=>console.log(`BioMed ready on port ${server.address().port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(cleanup);server.close(()=>{storage.close();process.exit(0);});setTimeout(()=>process.exit(0),5000).unref();});
