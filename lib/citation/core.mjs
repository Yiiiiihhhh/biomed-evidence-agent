export const VERSION='1.0';
export const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/<[^>]*>/g,'').replace(/[^\p{L}\p{N}]/gu,'');
export const authorNorm=s=>norm(String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[ßẞ]/g,'ss'));
export const doiNorm=s=>String(s||'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').toLowerCase().replace(/[.,;。；]+$/,'');
export function similarity(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;if(a.length>1000||b.length>1000)return 0;let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+Number(a[i-1]!==b[j-1]));row=next;}return 1-row[b.length]/Math.max(a.length,b.length);}
export function authorKey(s){s=String(s||'').trim().replace(/\bet al\.?/gi,'');if(/[\u3400-\u9fff]/.test(s))return norm(s.split(/[,，;；]/)[0]);s=s.split(/[,，;；]/)[0].trim();const words=s.replace(/\./g,' ').split(/\s+/).filter(Boolean);if(words.length<2)return norm(s);if(words.slice(1).every(w=>/^[A-Z]{1,3}$/.test(w)))return norm(words[0]);if(words.slice(0,-1).every(w=>/^[A-Z]$/.test(w)))return norm(words.at(-1));return norm(words.at(-1));}
export function parse(text){text=String(text).replace(/\r/g,'').trim();if(!text)return [];const lines=text.split('\n');const blocks=[];let current='';const numbered=/^\s*(?:\[\d+\]|［\d+］|\d+[.、])\s*/;const hasNumbers=lines.some(l=>numbered.test(l));for(const line of lines){if(!line.trim()){if(current&&!hasNumbers){blocks.push(current);current='';}continue;}if(numbered.test(line)&&current){blocks.push(current);current='';}else if(current&&/\[(?:J|M|D|C|R|EB)(?:\/OL)?\]/i.test(current)&&/\[(?:J|M|D|C|R|EB)(?:\/OL)?\]/i.test(line)){blocks.push(current);current='';}current+=(current?'\n':'')+line;}if(current)blocks.push(current);return blocks.map((raw,i)=>parseOne(raw,i+1));}
function parseOne(raw,index){const normalized=raw.normalize('NFKC').replace(/\s+/g,' ').trim();const num=normalized.match(/^\s*(?:\[(\d+)\]|(\d+)[.、])\s*/);const body=normalized.replace(/^\s*(?:\[\d+\]|\d+[.、])\s*/,'');const marker=body.match(/\[([A-Z]+)(?:\/([A-Z]+))?\]/i);const doi=doiNorm(body.match(/10\.\d{4,9}\/[^\s<>]+/i)?.[0]||'');let before=marker?body.slice(0,marker.index):body;let tail=marker?body.slice(marker.index+marker[0].length).replace(/^[.。\s]+/,''):'';
if(!marker){const match=body.match(/^(.*?)\.\s+([^.,，]+)[,，]\s*((?:19|20)\d{2})(.*)$/);if(match){before=match[1];tail=match[2]+', '+match[3]+match[4];}}
const separator=before.search(/\.\s+|。|(?<=[\u3400-\u9fff])\./);const authors=separator>=0?before.slice(0,separator).trim():'';const title=separator>=0?before.slice(separator).replace(/^[.。\s]+/,'').replace(/[.。\s]+$/,''):'';const bibli=tail.match(/^(.+?)[,，]\s*((?:18|19|20|21)\d{2})(?:\s*[,，]\s*([^:：.。]*))?(?:\s*[:：]\s*([^。]*?))?(?=\.(?:\s|$)|。|\s*(?:DOI|https?:)|$)/i);let journal='',year=null,volume='',issue='',pages='';if(bibli){journal=bibli[1].trim();year=Number(bibli[2]);const vi=(bibli[3]||'').trim().match(/^([^()]*)(?:\(([^)]+)\))?/);volume=vi?.[1]?.trim()||'';issue=vi?.[2]?.trim()||'';pages=(bibli[4]||'').trim().replace(/\s*(?:DOI|https?:).*$/i,'').replace(/[.\s]+$/,'');}
const problems=[];if(!authors)problems.push('作者');if(!title)problems.push('标题');if(!journal)problems.push('期刊');if(!year)problems.push('年份');if(title.length>1000)problems.push('标题过长');return {raw,label:num?.[1]||num?.[2]||String(index),authors,author:authorKey(authors),title,journal,year,volume,issue,pages,doi,type:marker?.[1]?.toUpperCase()||'J',problems};}
function pageStart(v){return norm(String(v||'').split(/[-–—]/)[0]);}
export function compare(e,c){const score=Math.max(similarity(e.title,c.title),c.subtitle?similarity(e.title,c.title+': '+c.subtitle):0);const conflicts=[];const author=Boolean(e.author&&c.author&&authorNorm(e.author)===authorNorm(c.author));const year=Boolean(e.year&&c.year&&e.year===Number(c.year));const journal=e.mode==='title'?true:e.mode==='fields'?Boolean(e.doi&&c.doi&&doiNorm(e.doi)===doiNorm(c.doi)):similarity(e.journal,c.journal)>=.90;if(e.author&&c.author&&!author)conflicts.push('第一作者');if(e.year&&c.year&&!year)conflicts.push('年份');if(e.journal&&c.journal&&!journal)conflicts.push('期刊');for(const field of ['volume','issue'])if(e[field]&&c[field]&&norm(e[field])!==norm(c[field]))conflicts.push(field==='volume'?'卷号':'期号');if(e.pages&&c.pages&&pageStart(e.pages)!==pageStart(c.pages))conflicts.push('起始页／文章号');if(e.doi&&c.doi&&doiNorm(e.doi)!==doiNorm(c.doi))conflicts.push('DOI');return {score,conflicts,match:score>=.95&&author&&year&&journal&&!conflicts.length&&c.type==='journal-article'};}
export function decide(e,reports,now=new Date()){
  const base={...e,version:e.mode==='fields'?'1.1-fields':VERSION,checkedAt:now.toISOString(),reports};
  const result=(status,reason)=>({...base,status,reason});
  if(e.type!=='J')return result('unsupported','本轮仅核验期刊论文，该文献类型未核验。');
  if(e.problems.length)return result('suspect','解析不完整：请补充或检查'+e.problems.join('、')+'，待人工确认。');
  const candidates=reports.flatMap(r=>r.candidates||[]).map(c=>({c,...compare(e,c)}));
  const matched=candidates.find(x=>x.match);
  const direct=candidates.filter(x=>e.doi&&doiNorm(e.doi)===doiNorm(x.c.doi));
  // A second source omitting a separately stored subtitle is incomplete metadata,
  // not contrary evidence, when another source confirms the same DOI and main title.
  if(direct.some(x=>x.conflicts.length||x.c.type!=='journal-article'||(x.score<.95&&!(matched&&matched.c.subtitle&&doiNorm(matched.c.doi)===doiNorm(x.c.doi)&&norm(matched.c.title)===norm(x.c.title)))))return result('suspect','所填 DOI 对应的题录与引用信息不一致，待人工确认。');
  const sameWorkConflicts=matched&&candidates.some(x=>x.c.doi&&doiNorm(x.c.doi)===doiNorm(matched.c.doi)&&x.conflicts.length);
  if(sameWorkConflicts)return result('suspect','同一 DOI 的来源记录存在字段冲突，待人工确认。');
  const close=candidates.filter(x=>x.score>=.95);
  if(!matched&&close.some(x=>x.conflicts.length))return result('suspect','发现相近标题，但'+[...new Set(close.flatMap(x=>x.conflicts))].join('、')+'存在冲突，待人工确认。');
  if(matched&&reports.some(r=>r.ok&&(r.candidates||[]).some(c=>compare(e,c).match)))return result('pass','具体来源记录的题名、第一作者、年份及适用字段匹配；请展开查看来源覆盖与查询状态。');if(reports.length<2||reports.some(r=>!r.ok))return result('incomplete','公开来源查询未全部完成，请重试；本条不计为查无。');
  if(matched)return result('pass',e.mode==='fields'?'DOI 对应的期刊论文存在，题名、第一作者与年份匹配。':'标题、作者、年份、期刊一致，未发现明确字段冲突。');
  if(candidates.some(x=>x.score>=.75))return result('suspect','仅找到弱匹配或信息不足的候选，待人工确认。');
  if(e.year>=now.getUTCFullYear()-2)return result('suspect','新近发表题录可能尚未收录，待人工确认。');
  if(/[\u3400-\u9fff]/.test(e.title+e.journal))return result('suspect','中文题录未命中，公开来源覆盖可能不足，待人工确认。');
  if(reports.some(r=>!r.coverage||r.coverage.count<10))return result('suspect','未找到匹配，且期刊／年份覆盖不足，待人工确认。');
  return result('missing','本次公开来源未检出：两源检索已完成；这不代表论文不存在。');
}



