import {request} from './core';
export function httpsCallable(_functions,name){return async(data)=>({data:await request(`/api/actions/${encodeURIComponent(name)}`,{method:'POST',body:data||{}})});}
export const functions={kind:'mongo-api'};
