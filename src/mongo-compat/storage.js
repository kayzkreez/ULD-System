import {request,token} from './core';
const API=import.meta.env.VITE_API_URL||'http://localhost:4000';
export function ref(_storage,path){return {path};}
export const storage={kind:'mongo-api'};
export async function uploadBytes(storageRef,file,options={}){const orgId=storageRef.path.split('/')[1];const category=storageRef.path.includes('/payroll/')?'payroll':'documents';const form=new FormData();form.append('file',file);form.append('orgId',orgId);form.append('category',category);form.append('storagePath',storageRef.path);const r=await fetch(`${API}/api/files`,{method:'POST',headers:token()?{Authorization:`Bearer ${token()}`}:{},body:form});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Upload failed');return {metadata:{...options,customMetadata:{...(options.customMetadata||{}),fileId:data.fileId}},ref:{path:data.fileId}};}
export async function getBlob(storageRef){const id=storageRef.path.split('/').at(-1);const r=await fetch(`${API}/api/files/${encodeURIComponent(id)}`,{headers:token()?{Authorization:`Bearer ${token()}`}:{}});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'Download failed');}return r.blob();}
