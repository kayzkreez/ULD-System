import {request,token} from './core';
const API=import.meta.env.VITE_API_URL||'http://localhost:4000';
let currentUser=null;const listeners=new Set();
function saveSession(payload){localStorage.setItem('tc_mongo_token',payload.token);currentUser={...payload.user,emailVerified:true,displayName:payload.user.displayName||'',getIdToken:async()=>token()};listeners.forEach(fn=>fn(currentUser));return currentUser;}
async function refresh(){if(!token()){currentUser=null;return null;}try{const r=await request('/api/auth/me');currentUser={...r.user,emailVerified:true,displayName:r.user.displayName||'',getIdToken:async()=>token()};}catch{localStorage.removeItem('tc_mongo_token');currentUser=null;}return currentUser;}
export const auth={get currentUser(){return currentUser;}};
export function onAuthStateChanged(_auth,callback){listeners.add(callback);refresh().then(callback);return()=>listeners.delete(callback);}
export async function createUserWithEmailAndPassword(_auth,email,password){const r=await request('/api/auth/register',{method:'POST',body:{email,password,displayName:''}});return {user:saveSession(r)};}
export async function signInWithEmailAndPassword(_auth,email,password){const r=await request('/api/auth/login',{method:'POST',body:{email,password}});return {user:saveSession(r)};}
export async function signOut(){localStorage.removeItem('tc_mongo_token');currentUser=null;listeners.forEach(fn=>fn(null));}
export async function sendPasswordResetEmail(_auth,email){await request('/api/auth/reset',{method:'POST',body:{email}});}
export async function sendEmailVerification(user){if(user)user.emailVerified=true;}
export async function updateProfile(user,values){if(user){user.displayName=values.displayName||user.displayName;await request('/api/auth/profile',{method:'PATCH',body:{displayName:user.displayName}});await request('/api/data',{method:'PUT',body:{path:`users/${user.uid}`,data:{displayName:user.displayName,email:user.email},merge:true}});}}
export function setCurrentUser(user){currentUser=user;}
