import { verify } from '@/lib/citation/sources.mjs';
import { authorKey,doiNorm,parse } from '@/lib/citation/core.mjs';
import { errorResponse,json,readBody } from '@/lib/server';
export async function POST(request:Request){try{const b=await readBody(request);let entry;
  if(b.mode==='batch'){const entries=parse(String(b.text||'').slice(0,20000));if(entries.length!==1)return json({error:'每次请求请发送一条参考文献。'},400);entry=entries[0];}
  else{const title=String(b.title||'').trim(),authors=String(b.author||'').trim(),year=Number(b.year),doi=doiNorm(String(b.doi||'').trim());const problems=[];if(!title||title.length>1000)problems.push('题名');if(!authors||authors.length>200)problems.push('第一作者');if(!Number.isInteger(year)||year<1800||year>new Date().getUTCFullYear()+1)problems.push('年份');if(doi&&!/^10\.\d{4,9}\/\S+$/.test(doi))problems.push('DOI格式');entry={mode:doi?'fields':'title',raw:`${authors}. ${title}. ${year}. ${doi}`,label:'单条',title,authors,author:authorKey(authors),year,doi,journal:'',volume:'',issue:'',pages:'',type:'J',problems};}
  const result=await verify(entry);return json(result);
 }catch(e){return errorResponse(e);}}
