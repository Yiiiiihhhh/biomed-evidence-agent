import { callModel } from '@/lib/research.mjs';
import { errorResponse,json,readBody } from '@/lib/server';
export async function POST(request:Request){try{const b=await readBody(request);await callModel(b.key,'只输出 {"ok":true}',{probe:true});return json({ok:true,message:'实际调用成功，可以开始研究。'});}catch(e){return errorResponse(e);}}
