import {request,normalizePath,stamp} from './core';
const API=import.meta.env.VITE_API_URL||'http://localhost:4000';
export const db={kind:'mongo-api'};
export function collection(_db,...parts){return {kind:'collection',path:normalizePath(parts)};}
export function doc(_db,...parts){if(parts.length===2&&parts[0]?.kind==='collection')return {kind:'document',path:normalizePath([parts[0].path,parts[1]])};return {kind:'document',path:normalizePath(parts)};}
export function orderBy(field,direction='asc'){return {type:'orderBy',field,direction};}
export function where(field,op,value){return {type:'where',field,op,value};}
export function query(ref,...constraints){return {...ref,constraints};}
export function serverTimestamp(){return stamp();}
function snapDoc(x){return {id:x.id,data:()=>({...x}),exists:()=>true};}
export async function getDoc(ref){const r=await request(`/api/data?path=${encodeURIComponent(ref.path)}`);return {id:ref.path.split('/').at(-1),exists:()=>!!r.exists,data:()=>r.data||{}};}
export async function getDocs(ref){const c=ref.constraints||[];const order=c.find(x=>x.type==='orderBy');const qs=new URLSearchParams({path:ref.path});if(order){qs.set('orderBy',order.field);qs.set('direction',order.direction);}const r=await request(`/api/data?${qs}`);return {docs:(r.docs||[]).map(snapDoc),empty:!(r.docs||[]).length,size:(r.docs||[]).length,forEach(fn){(r.docs||[]).forEach(x=>fn(snapDoc(x)));}};}
export async function setDoc(ref,data,options={}){return request('/api/data',{method:'PUT',body:{path:ref.path,data,merge:!!options.merge}});}
export async function addDoc(ref,data){const r=await request('/api/data',{method:'POST',body:{path:ref.path,data}});return {id:r.id,path:`${ref.path}/${r.id}`};}
export async function updateDoc(ref,data){return request('/api/data',{method:'PATCH',body:{path:ref.path,data}});}
export async function deleteDoc(ref){return request('/api/data',{method:'DELETE',body:{path:ref.path}});}
export function onSnapshot(ref,next,error){let active=true,last='';const load=async()=>{try{const r=ref.kind==='collection'?await getDocs(ref):await getDoc(ref);const signature=JSON.stringify(ref.kind==='collection'?r.docs.map(d=>({id:d.id,...d.data()})):(r.exists()?r.data():null));if(active&&signature!==last){last=signature;if(ref.kind==='collection')next(r);else next({exists:r.exists,data:r.data,id:r.id});}}catch(e){if(active&&error)error(e);}};load();const timer=setInterval(load,5000);return()=>{active=false;clearInterval(timer);};}
export function writeBatch(){const jobs=[];return {set(ref,data,options={}){jobs.push(()=>setDoc(ref,data,options));return this;},update(ref,data){jobs.push(()=>updateDoc(ref,data));return this;},delete(ref){jobs.push(()=>deleteDoc(ref));return this;},async commit(){for(const job of jobs)await job();}};}
