const API=import.meta.env.VITE_API_URL||'http://localhost:4000';
export function token(){return localStorage.getItem('tc_mongo_token')||'';}
export async function request(path,{method='GET',body,headers={}}={}){const h={...headers};if(token())h.Authorization=`Bearer ${token()}`;if(body!==undefined)h['Content-Type']='application/json';let res;try{res=await fetch(`${API}${path}`,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});}catch{return Promise.reject(new Error('Cannot reach TerraControl API. Start the MongoDB backend and check VITE_API_URL.'));}const payload=await res.json().catch(()=>({}));if(!res.ok){const e=new Error(payload.error||`Request failed (${res.status})`);e.code=`http/${res.status}`;throw e;}return payload;}
export const stamp=()=>new Date();
export const normalizePath=parts=>parts.filter(x=>x!==undefined&&x!==null).map(x=>String(x).replace(/^\/+|\/+$/g,'')).filter(Boolean).join('/');
