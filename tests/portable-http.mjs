import {spawn} from 'node:child_process';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {once} from 'node:events';
const temp=await mkdtemp(path.join(tmpdir(),'biomed-http-'));
assert.ok(path.resolve(temp).startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(temp).startsWith('biomed-http-'));
await mkdir('test-results',{recursive:true});
const results=[];let child,base,logs='';
async function start(options={}){child=spawn(process.execPath,['dist/server.mjs'],{env:{...process.env,...options,PORT:'0',HOST:'127.0.0.1',DATA_DIR:temp},stdio:['ignore','pipe','pipe']});child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('启动超时 '+logs)),15000);child.once('exit',code=>{clearTimeout(timer);reject(Error('服务退出 '+code+' '+logs));});child.stdout.on('data',data=>{const match=String(data).match(/ready on port (\d+)/);if(match){base='http://127.0.0.1:'+match[1];clearTimeout(timer);resolve();}});});}
async function stop(){if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}child=null;}
async function scenario(name,fn){try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL '+name+': '+e.message);}}
const request=(url,body,token,extra={})=>fetch(base+url,{method:body===undefined?'GET':'POST',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{'X-BioMed-Session':token}:{}),...extra},...(body!==undefined?{body:JSON.stringify(body)}:{})});
const input={topic:'干扰素STAT1病毒研究',query:'STAT1 AND interferon AND virus',questions:'负反馈机制是什么？',yearStart:2020,yearEnd:2026,limit:3,mode:'retrieval'};
let a,b,run;
try{
 await start();
 await scenario('健康检查和完整前端资源',async()=>{for(const url of ['/healthz','/','/app.js','/app.css'])assert.equal((await fetch(base+url)).status,200);const html=await(await fetch(base+'/')).text();assert.match(html,/BioMed/);return '200；包含真实JS和CSS';});
 await scenario('存档明确注明未调用AI',async()=>{const r=await fetch(base+'/retrieval-snapshot.json'),d=await r.json();assert.equal(r.status,200);assert.match(d.kind,/没有调用模型/);return d.results.length+'个历史检索主题';});
 await scenario('初始化两个隔离的匿名空间',async()=>{a=await(await request('/api/session')).json();b=await(await request('/api/session')).json();assert.notEqual(a.token,b.token);assert.equal(a.token.length,64);return '随机256位会话，未使用用户账号';});
 await scenario('缺会话和伪造会话不可读历史',async()=>{assert.equal((await request('/api/research')).status,401);assert.equal((await request('/api/research',undefined,'f'.repeat(64))).status,401);});
 await scenario('免费任务无需密钥即可创建，尚不进行检索',async()=>{const r=await request('/api/research',input,a.token);assert.equal(r.status,201);run=(await r.json()).run;assert.equal(run.mode,'retrieval');assert.equal(run.stage,'search');assert.equal(run.papers.length,0);assert.ok(!JSON.stringify(run).includes('key'));return run.id;});
 await scenario('自己的任务可读取，另一空间不可读',async()=>{assert.equal((await request('/api/research/'+run.id,undefined,a.token)).status,200);assert.equal((await request('/api/research/'+run.id,undefined,b.token)).status,404);const h=await(await request('/api/research',undefined,b.token)).json();assert.equal(h.runs.length,0);});
 await scenario('过期revision在外部请求前被拒绝',async()=>{assert.equal((await request('/api/research/'+run.id,{revision:999},a.token)).status,409);});
 await scenario('暂停会保存并递增版本',async()=>{const r=await request('/api/research/'+run.id,{action:'pause',revision:run.revision},a.token);assert.equal(r.status,200);run=(await r.json()).run;assert.equal(run.status,'paused');return run.revision;});
 await scenario('重启后恢复同一空间与任务',async()=>{await stop();logs='';await start();const s=await(await request('/api/session',undefined,a.token)).json();assert.equal(s.token,a.token);const d=await(await request('/api/research/'+run.id,undefined,a.token)).json();assert.equal(d.run.revision,run.revision);});
 await scenario('错误输入与AI无密钥都不创建任务',async()=>{for(const body of [{...input,query:''},{...input,yearStart:2026,yearEnd:2020},{...input,limit:0},{...input,questions:'一\n二\n三\n四\n五\n六'},{...input,mode:'ai'}])assert.equal((await request('/api/research',body,a.token)).status,400);const h=await(await request('/api/research',undefined,a.token)).json();assert.equal(h.runs.length,1);});
 await scenario('跨站写入拒绝',async()=>{assert.equal((await request('/api/research',input,a.token,{Origin:'https://evil.example'})).status,403);});
 await scenario('畸形JSON和超大请求可见失败',async()=>{for(const value of [null,[],'text'])assert.equal((await request('/api/research',value,a.token)).status,400);assert.equal((await fetch(base+'/api/research',{method:'POST',headers:{'X-BioMed-Session':a.token},body:'{'})).status,400);assert.equal((await fetch(base+'/api/verify',{method:'POST',body:'x'.repeat(30001)})).status,413);});
 await scenario('空核验与书籍返回可解释状态',async()=>{const empty=await(await request('/api/verify',{})).json();assert.equal(empty.status,'suspect');const book=await(await request('/api/verify',{mode:'batch',text:'[1] 张三. 医学研究方法[M]. 北京: 测试出版社, 2020.'})).json();assert.equal(book.status,'unsupported');});
 await scenario('数据目录和任意路径不可公开下载',async()=>{for(const url of ['/data/biomed.sqlite','/server.mjs','/.env','/lib/research.mjs'])assert.equal((await fetch(base+url)).status,404);});
 await scenario('撤销空间凭据后无法再访问',async()=>{const r=await fetch(base+'/api/session',{method:'DELETE',headers:{'X-BioMed-Session':a.token}});assert.equal(r.status,200);assert.equal((await request('/api/research/'+run.id,undefined,a.token)).status,401);assert.equal((await request('/api/research',undefined,b.token)).status,200);});
 await scenario('反向代理Host变化时允许配置域名，继续拒绝其他来源',async()=>{await stop();logs='';await start({PUBLIC_ORIGIN:'https://biomed.example.test'});assert.equal((await request('/api/research',input,b.token,{Origin:'https://biomed.example.test'})).status,201);assert.equal((await request('/api/research',input,b.token,{Origin:'https://other.example.test'})).status,403);return '正确公开来源201，其他来源403';});
 if(process.env.BIOMED_LIVE_TEST==='1')await scenario('真实公开检索与身份核验完整免费流程',async()=>{const created=await request('/api/research',input,b.token);assert.equal(created.status,201);let r=(await created.json()).run;while(r.stage!=='complete'&&r.stage!=='no_results'){const response=await request('/api/research/'+r.id,{revision:r.revision},b.token);const d=await response.json();assert.equal(response.status,200,JSON.stringify(d));r=d.run;}assert.equal(r.mode,'retrieval');assert.ok(!r.review);assert.equal(r.stage,'complete');assert.ok(r.papers.length);assert.ok(r.papers.every(p=>p.identity));assert.ok(r.papers.every(p=>!p.reading));await writeFile('test-results/live-free-run.json',JSON.stringify(r,null,2));return {papers:r.papers.length,identities:r.papers.map(p=>p.identity.status),sources:r.executions.map(e=>({source:e.source,ok:e.ok,hits:e.hits,fetched:e.fetched})),noModel:true};});
}finally{await stop();await rm(temp,{recursive:true,force:true});}
await mkdir('test-results',{recursive:true});
const report={at:new Date().toISOString(),kind:'独立Node生产构建HTTP测试；仅在BIOMED_LIVE_TEST=1时执行真实公开检索；不使用模型密钥',total:results.length,passed:results.filter(r=>r.status==='PASS').length,results};
await writeFile('test-results/portable-http.json',JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,passed:report.passed}));process.exitCode=report.passed===report.total?0:1;
