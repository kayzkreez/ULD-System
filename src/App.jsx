import React, { useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, sendEmailVerification, updateProfile
} from "./mongo-compat/auth";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, where, writeBatch
} from "./mongo-compat/firestore";
import { ref, uploadBytes, getBlob } from "./mongo-compat/storage";
import {
  LayoutDashboard, Building2, Wallet, CalendarDays, Map, Users, Truck, ShieldAlert,
  FileText, ClipboardList, Settings, Search, Bell, Plus, Download, Upload, Printer,
  ChevronDown, Menu, X, ArrowUpRight, ArrowDownRight, CircleCheck, Clock3,
  AlertTriangle, CircleDollarSign, Landmark, FileSpreadsheet, HardHat, Trash2,
  Pencil, MoreHorizontal, RotateCcw, Database, ChartNoAxesCombined, ListChecks,
  LogOut, LockKeyhole, Mail, Eye, EyeOff, UserPlus, KeyRound, FileUp, Check,
  RefreshCw, ShieldCheck, ReceiptText, MapPin, CalendarClock
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { auth, db, storage, functions, apiConfigured } from "./apiClient";
import { httpsCallable } from "./mongo-compat/functions";
import { COLLECTIONS, MODULES, SEED } from "./data";

const money=(v,c="USD")=>{try{return new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:0}).format(Number(v||0));}catch{return `${c} ${Number(v||0).toLocaleString()}`;}};
const today=()=>new Date().toISOString().slice(0,10);
const makeId=()=>crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const roleNames={owner:"Owner",admin:"Administrator",project_manager:"Project manager",finance:"Finance",hr:"HR / Payroll",engineer:"Engineer",sales:"Sales",auditor:"Auditor",viewer:"Read-only"};
const navGroups=[
 {section:"Workspace",items:[["Dashboard",LayoutDashboard],["Alerts & Notifications",Bell],["Projects",Building2],["Budget & Costs",Wallet],["Cash Flow",ChartNoAxesCombined],["Tasks & Schedule",CalendarDays],["Milestones",ListChecks]]},
 {section:"Land & Delivery",items:[["Plots & Sales",Map],["GIS / Site Map",MapPin],["Customers & Buyers",Users],["Procurement",Truck],["Payroll & Payslips",ReceiptText],["Leave Requests",CalendarClock],["Invoices & Payments",CircleDollarSign],["Payments",ReceiptText],["Site Reports",HardHat]]},
 {section:"Governance",items:[["Risks & Issues",ShieldAlert],["Documents & Permits",FileText],["Decisions & Changes",ClipboardList],["Audit Log",ShieldCheck]]},
 {section:"Administration",items:[["Team & Access",ShieldCheck],["Reports & Export",FileSpreadsheet],["Settings",Settings]]}
];
const roleCanEdit=(role,module)=>{
 if(["owner","admin"].includes(role)) return true;
 if(role==="project_manager") return ["Projects","Tasks & Schedule","Milestones","Plots & Sales","Procurement","Risks & Issues","Documents & Permits","Site Reports","Decisions & Changes"].includes(module);
 if(role==="finance") return ["Budget & Costs","Cash Flow","Invoices & Payments","Payments","Payroll & Payslips","Procurement","Reports & Export"].includes(module);
 if(role==="hr") return ["Payroll & Payslips","Leave Requests","Reports & Export","Documents & Permits"].includes(module);
 if(role==="engineer") return ["Tasks & Schedule","Milestones","Site Reports","Risks & Issues","Documents & Permits"].includes(module);
 if(role==="sales") return ["Plots & Sales","Customers & Buyers","Invoices & Payments"].includes(module);
 return false;
};
const canApproveRecord=(role,module)=>{
 if(["owner","admin"].includes(role)) return ["Budget & Costs","Procurement","Payroll & Payslips","Decisions & Changes","Site Reports"].includes(module);
 if(role==="finance") return ["Procurement"].includes(module);
 if(role==="project_manager") return ["Decisions & Changes","Site Reports"].includes(module);
 return false;
};
const canReadModule=(role,module)=>{
 if(module==="Team & Access") return ["owner","admin","auditor"].includes(role);
 if(module==="Audit Log") return ["owner","admin","auditor"].includes(role);
 if(module==="Payroll & Payslips") return ["owner","admin","finance","hr"].includes(role);
 if(module==="Leave Requests") return ["owner","admin","hr"].includes(role);
 if(["Budget & Costs","Cash Flow","Payments"].includes(module)) return ["owner","admin","finance","project_manager","auditor"].includes(role);
 if(module==="Invoices & Payments") return ["owner","admin","finance","sales","auditor"].includes(role);
 if(module==="Procurement") return ["owner","admin","project_manager","finance","auditor"].includes(role);
 if(module==="Customers & Buyers") return ["owner","admin","sales","project_manager","auditor"].includes(role);
 if(module==="Site Reports") return ["owner","admin","project_manager","engineer","auditor"].includes(role);
 if(module==="Plots & Sales"||module==="GIS / Site Map") return ["owner","admin","project_manager","sales","auditor"].includes(role);
 return true;
};
const safeNumber=v=>Number.isFinite(Number(v))?Number(v):0;
const fieldValue=(r,key)=>{
 if(key==="variance") return safeNumber(r.baseline)-safeNumber(r.forecast);
 if(key==="gross") return safeNumber(r.basic)+safeNumber(r.overtime)+safeNumber(r.allowances);
 if(key==="deductions") return safeNumber(r.tax)+safeNumber(r.pension)+safeNumber(r.other);
 if(key==="net") return r.basic!==undefined ? safeNumber(r.basic)+safeNumber(r.overtime)+safeNumber(r.allowances)-safeNumber(r.tax)-safeNumber(r.pension)-safeNumber(r.other) : safeNumber(r.inflow)-safeNumber(r.outflow);
 if(key==="balance") return safeNumber(r.amount??r.price)-safeNumber(r.paid);
 if(key==="score") return safeNumber(r.probability)*safeNumber(r.impact);
 if(key==="health"){if(r.status==="Complete")return "Complete";if(!r.due)return "Not scheduled";if(r.due<today())return "Overdue";if((new Date(r.due)-new Date(today()))/86400000<=7)return "At risk";return "On track";}
 return r[key];
};
function App(){
 const [user,setUser]=useState(null),[authLoading,setAuthLoading]=useState(true),[needsVerification,setNeedsVerification]=useState(false);
 const [orgId,setOrgId]=useState(""),[org,setOrg]=useState(null),[membership,setMembership]=useState(null);
 const [records,setRecords]=useState({}),[active,setActive]=useState("Dashboard"),[queryText,setQueryText]=useState("");
 const [projectFilter,setProjectFilter]=useState("All projects"),[modal,setModal]=useState(null),[form,setForm]=useState({});
 const [editId,setEditId]=useState(null),[toast,setToast]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [orgs,setOrgs]=useState([]),[sidebarOpen,setSidebarOpen]=useState(false),[userProfile,setUserProfile]=useState(null);
 const [fileBusy,setFileBusy]=useState(false),[fileList,setFileList]=useState([]);
 const [memberEmail,setMemberEmail]=useState(""),[memberRole,setMemberRole]=useState("viewer"),[team,setTeam]=useState([]);
 const [reportMonth,setReportMonth]=useState(new Date().toISOString().slice(0,7));
 useEffect(()=>{if(!apiConfigured){setAuthLoading(false);return;}return onAuthStateChanged(auth,async u=>{setUser(u);setError("");setAuthLoading(false);if(!u){setNeedsVerification(false);setOrgId("");setOrg(null);setMembership(null);setUserProfile(null);setOrgs([]);return;}
   if(!u.emailVerified){setNeedsVerification(true);return;}
   setNeedsVerification(false);
   try{
     if(u.emailVerified){try{await httpsCallable(functions,"acceptWorkspaceInvitations")({});}catch(inviteError){console.warn("Invitation acceptance check skipped",inviteError);}}
     const p=await getDoc(doc(db,"users",u.uid));const profile=p.exists()?p.data():{displayName:u.displayName||"",email:u.email};setUserProfile(profile);
     const ids=Array.isArray(profile.orgIds)?profile.orgIds:profile.lastOrgId?[profile.lastOrgId]:[];
     const found=[];for(const id of ids){try{const m=await getDoc(doc(db,"organizations",id,"members",u.uid));const o=await getDoc(doc(db,"organizations",id));if(m.exists()&&o.exists()&&m.data().active!==false)found.push({id,...o.data(),role:m.data().role});}catch{}}
     setOrgs(found);if(found.length===1) await selectOrg(found[0].id,u.uid,found[0]);else if(profile.lastOrgId&&found.some(x=>x.id===profile.lastOrgId)) await selectOrg(profile.lastOrgId,u.uid,found.find(x=>x.id===profile.lastOrgId));
   }catch(e){setError(friendlyError(e));}
 });},[]);
 async function selectOrg(id,uid=user?.uid,preloaded=null){
   try{const o=preloaded?{exists:()=>true,data:()=>preloaded}:await getDoc(doc(db,"organizations",id));const m=await getDoc(doc(db,"organizations",id,"members",uid));
     if(!o.exists()||!m.exists())throw new Error("You do not have active access to that workspace.");
     setOrgId(id);setOrg(o.data());setMembership(m.data());await setDoc(doc(db,"users",uid),{lastOrgId:id},{merge:true});
   }catch(e){setError(friendlyError(e));}
 }
 useEffect(()=>{
   if(!orgId||!user)return;
   const unsubs=[];
   for(const name of COLLECTIONS){
     const r=membership?.role;
     if(name==="payroll" && !["owner","admin","hr","finance"].includes(r)) continue;
     if(name==="leaveRequests" && !["owner","admin","hr"].includes(r)) continue;
     if(name==="auditLogs" && !["owner","admin","auditor"].includes(r)) continue;
     if(["budgets","cashflow","payments"] .includes(name) && !["owner","admin","finance","project_manager","auditor"].includes(r)) continue;
     if(name==="invoices" && !["owner","admin","finance","sales","auditor"].includes(r)) continue;
     if(name==="procurement" && !["owner","admin","project_manager","finance","auditor"].includes(r)) continue;
     if(name==="customers" && !["owner","admin","sales","project_manager","auditor"].includes(r)) continue;
     if(name==="siteReports" && !["owner","admin","project_manager","engineer","auditor"].includes(r)) continue;
     if(name==="plots" && !["owner","admin","project_manager","sales","auditor"].includes(r)) continue;
     const coll=collection(db,"organizations",orgId,name);
     const q=name==="projects"?query(coll,orderBy("updatedAt","desc")):coll;
     unsubs.push(onSnapshot(q,snap=>setRecords(prev=>({...prev,[name]:snap.docs.map(d=>({id:d.id,...d.data()}))})),e=>setError(`${name}: ${friendlyError(e)}`)));
   }
   const members=collection(db,"organizations",orgId,"members");
   unsubs.push(onSnapshot(members,async snap=>{
     const list=[];for(const d of snap.docs){let m=d.data();list.push({uid:d.id,...m});}
     setTeam(list);
   },e=>setError(friendlyError(e))));
   const orgRef=doc(db,"organizations",orgId);
   unsubs.push(onSnapshot(orgRef,s=>{if(s.exists())setOrg(s.data());}));
   return ()=>unsubs.forEach(fn=>fn());
 },[orgId,user?.uid,membership?.role]);
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),3200);return()=>clearTimeout(t);}},[toast]);
 const role=membership?.role||"viewer",currency=org?.currency||"USD";
 const rows=active==="Projects"?(records.projects||[]):active==="GIS / Site Map"?(records.plots||[]):active==="Budget & Costs"?(records.budgets||[]):active==="Cash Flow"?(records.cashflow||[]):active==="Tasks & Schedule"?(records.tasks||[]):active==="Milestones"?(records.milestones||[]):active==="Plots & Sales"?(records.plots||[]):active==="Payroll & Payslips"?(records.payroll||[]):active==="Procurement"?(records.procurement||[]):active==="Risks & Issues"?(records.risks||[]):active==="Documents & Permits"?(records.documents||[]):active==="Decisions & Changes"?(records.decisions||[]):active==="Customers & Buyers"?(records.customers||[]):active==="Invoices & Payments"?(records.invoices||[]):active==="Payments"?(records.payments||[]):active==="Site Reports"?(records.siteReports||[]):active==="Leave Requests"?(records.leaveRequests||[]):active==="Audit Log"?(records.auditLogs||[]):[];
 const projects=records.projects||[];
 const filtered=useMemo(()=>rows.filter(r=>{
   if(projectFilter!=="All projects"&&r.project!==projectFilter)return false;
   if(!queryText.trim())return true;
   return Object.values(r).some(v=>String(v??"").toLowerCase().includes(queryText.toLowerCase()));
 }),[rows,projectFilter,queryText]);
 const budgets=records.budgets||[],tasks=records.tasks||[],plots=records.plots||[],risks=records.risks||[],docs=records.documents||[];
 const totalBudget=budgets.reduce((s,r)=>s+safeNumber(r.baseline),0),totalForecast=budgets.reduce((s,r)=>s+safeNumber(r.forecast),0),totalActual=budgets.reduce((s,r)=>s+safeNumber(r.actual),0);
 const overdue=tasks.filter(t=>t.status!=="Complete"&&t.due&&t.due<today()).length;
 const openRisks=risks.filter(r=>r.status!=="Closed").length;
 function notify(message){setToast(message);}
 async function audit(action,collectionName,recordId,details={}){
   try{await addDoc(collection(db,"organizations",orgId,"auditLogs"),{actorUid:user.uid,actorEmail:user.email,actorName:user.displayName||user.email,action,collection:collectionName,recordId,details,createdAt:serverTimestamp(),createdAtClient:new Date().toISOString()});}catch(e){console.warn("Audit log failed",e);}
 }
 async function saveRecord(e){
   e.preventDefault();if(!roleCanEdit(role,active)){setError("Your role cannot edit this module.");return;}
   const config=Object.values(MODULES).find(m=>m.title===active);if(!config)return;
   setBusy(true);setError("");
   try{
     const id=editId||makeId();const clean={...form,id,updatedAt:serverTimestamp(),updatedBy:user.uid};
     if(!editId){clean.createdAt=serverTimestamp();clean.createdBy=user.uid;}
     for(const k of ["budget","actual","baseline","committed","forecast","inflow","outflow","progress","area","price","paid","basic","overtime","allowances","tax","pension","other","amount","probability","impact","days"]) if(clean[k]!==undefined&&clean[k]!=="")clean[k]=safeNumber(clean[k]);
     if(active==="Budget & Costs"&&(clean.forecast===undefined||clean.forecast===""))clean.forecast=safeNumber(clean.baseline);
     if(active==="Payroll & Payslips"){clean.gross=safeNumber(clean.basic)+safeNumber(clean.overtime)+safeNumber(clean.allowances);clean.deductions=safeNumber(clean.tax)+safeNumber(clean.pension)+safeNumber(clean.other);clean.net=clean.gross-clean.deductions;}
     const ref=doc(db,"organizations",orgId,config.key,id);
     await setDoc(ref,clean,{merge:true});
     await audit(editId?"update":"create",config.key,id,{title:clean.title||clean.name||clean.item||clean.id});
     setModal(null);setForm({});setEditId(null);notify(editId?"Record updated":"Record created");
   }catch(e){setError(friendlyError(e));}finally{setBusy(false);}
 }
 async function deleteRecord(row){
   const config=Object.values(MODULES).find(m=>m.title===active);if(!config||!roleCanEdit(role,active))return;
   if(!confirm(`Delete ${row.id}? This action is recorded and may not be reversible.`))return;
   try{await deleteDoc(doc(db,"organizations",orgId,config.key,row.id));await audit("delete",config.key,row.id,{title:row.title||row.name||row.item||row.id});notify("Record deleted");}
   catch(e){setError(friendlyError(e));}
 }
 async function saveOrg(e){e.preventDefault();setBusy(true);setError("");try{
   if(!user.emailVerified)throw new Error("Verify your email first. Open the verification link we emailed you, then sign out and sign back in.");
   const name=form.name?.trim();if(!name)throw new Error("Enter a workspace name.");
   const id=`org_${user.uid.slice(0,12)}_${makeId().slice(0,8).replaceAll("-","")}`;
   const orgData={name,location:form.location||"",currency:form.currency||"USD",ownerUid:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
   await setDoc(doc(db,"organizations",id),orgData);
   await setDoc(doc(db,"organizations",id,"members",user.uid),{uid:user.uid,email:user.email,displayName:user.displayName||user.email,role:"owner",active:true,createdAt:serverTimestamp()});
   const ids=[...new Set([...(userProfile?.orgIds||[]),id])];
   const userRef=doc(db,"users",user.uid);const userSnap=await getDoc(userRef);
   if(userSnap.exists()) await setDoc(userRef,{displayName:user.displayName||"",orgIds:ids,lastOrgId:id},{merge:true});
   else await setDoc(userRef,{displayName:user.displayName||"",email:user.email,orgIds:ids,lastOrgId:id,createdAt:serverTimestamp()});
   setOrgs(prev=>[...prev,{id,...orgData,role:"owner"}]);await selectOrg(id,user.uid,{id,...orgData});setModal(null);setForm({});notify("Workspace created");
 }catch(e){setError(friendlyError(e));}finally{setBusy(false);}}
 async function createDemoData(){
   if(!["owner","admin"].includes(role))return;
   if(!confirm("Add sample development records to this cloud workspace? Existing records will remain."))return;
   setBusy(true);try{const batch=writeBatch(db);const demo={
     projects:[{id:"PRJ-GREENFIELDS",name:"Greenfields Estate",location:"Harare, Zimbabwe",manager:"Project Manager",stage:"Infrastructure",status:"Active",start:"2026-01-15",end:"2027-06-30",budget:1250000,actual:418000,progress:38}],
     budgets:[{id:"B-LAND-001",project:"Greenfields Estate",category:"Land acquisition & legal",item:"Land purchase and conveyancing",baseline:300000,committed:280000,actual:280000,forecast:300000,status:"In review"}],
     tasks:[{id:"TASK-PLAN-001",project:"Greenfields Estate",title:"Confirm final subdivision plan",owner:"Planning Lead",priority:"High",start:"2026-10-01",due:"2026-11-05",progress:70,status:"In progress",budget:12000,actual:8400}],
     milestones:[{id:"MS-PLAN-001",project:"Greenfields Estate",title:"Subdivision plan approved",due:"2026-11-30",owner:"Planning Lead",progress:70,status:"In progress"}],
     risks:[{id:"RISK-PERMIT-001",project:"Greenfields Estate",title:"Permit approval delay",category:"Regulatory",probability:4,impact:5,owner:"Planning Lead",due:"2026-11-01",status:"Mitigating",response:"Weekly follow-up with authority."}],
     plots:[{id:"GF-001",project:"Greenfields Estate",block:"A",area:450,price:18000,status:"Available",buyer:"",titleRef:"",paid:0}]
   };
   for(const [coll,items] of Object.entries(demo))for(const item of items){const r=doc(db,"organizations",orgId,coll,item.id);batch.set(r,{...item,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),createdBy:user.uid});}
   await batch.commit();await audit("seed_demo","workspace",orgId,{collections:Object.keys(demo)});notify("Sample data added");
 }catch(e){setError(friendlyError(e));}finally{setBusy(false);}}
 async function uploadDocument(e){
   const file=e.target.files?.[0];if(!file)return;
   const isPayroll=active==="Payroll & Payslips";
   if(!["owner","admin","hr","finance"].includes(role)&&isPayroll){setError("Only HR, finance, owners and admins may upload payroll files.");return;}
   const allowed=["application/pdf","image/png","image/jpeg","image/webp","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
   if(!allowed.includes(file.type)){setError("Unsupported file type. Use PDF, PNG, JPEG, WebP or Word documents.");return;}
   const max=isPayroll?10:25;if(file.size>max*1024*1024){setError(`File exceeds ${max} MB limit.`);return;}
   setFileBusy(true);setError("");
   try{const path=`organizations/${orgId}/${isPayroll?"payroll":"documents"}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
     const storageRef=ref(storage,path);await uploadBytes(storageRef,file,{contentType:file.type,customMetadata:{uploadedBy:user.uid,orgId}});
     const collectionName="documents";
     await addDoc(collection(db,"organizations",orgId,collectionName),{title:file.name,type:isPayroll?"Payroll attachment":"File upload",reference:"Stored in private cloud storage",storagePath:path,owner:user.displayName||user.email,status:"Uploaded",createdAt:serverTimestamp(),updatedAt:serverTimestamp(),createdBy:user.uid});
     await audit("upload",collectionName,file.name,{storagePath:path,size:file.size});notify("File uploaded securely");
   }catch(e){setError(friendlyError(e));}finally{setFileBusy(false);e.target.value="";}
 }
 async function downloadStoredFile(row){
   if(!row.storagePath){setError("No stored file is linked to this record.");return;}
   try{
     const blob=await getBlob(ref(storage,row.storagePath));
     const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=row.title||"terracontrol-document";a.click();URL.revokeObjectURL(url);
     await audit("download","documents",row.id,{storagePath:row.storagePath});
   }catch(e){setError(friendlyError(e));}
 }
 async function approveRecord(row){
   const config=Object.values(MODULES).find(m=>m.title===active);
   if(!config||!canApproveRecord(role,active))return;
   if(!confirm(`Approve/review ${row.id}? This will record your user ID and timestamp.`))return;
   try{const fn=httpsCallable(functions,"approveWorkflowRecord");const result=await fn({orgId,collectionName:config.key,recordId:row.id});notify(`Record ${result.data.status.toLowerCase()}`);}
   catch(e){setError(friendlyError(e));}
 }
 async function deactivateMember(member){
   if(!["owner","admin"].includes(role)){setError("Only an owner or admin can manage members.");return;}
   if(member.role==="owner"){setError("Transfer ownership before deactivating the owner.");return;}
   const next=member.active===false;
   if(!confirm(`${next?"Reactivate":"Deactivate"} ${member.email||member.uid}?`))return;
   try{const fn=httpsCallable(functions,"deactivateWorkspaceMember");await fn({orgId,uid:member.uid,active:next});notify(next?"Member reactivated":"Member deactivated");}
   catch(e){setError(friendlyError(e));}
 }
 async function changeMemberRole(member,newRole){
   if(role!=="owner"){setError("Only the workspace owner can change member roles.");return;}
   try{const fn=httpsCallable(functions,"setWorkspaceMemberRole");await fn({orgId,uid:member.uid,role:newRole});notify("Member role updated");}
   catch(e){setError(friendlyError(e));}
 }
 async function inviteMember(e){
   e.preventDefault();setError("");setBusy(true);
   try{
     const inviteFn=httpsCallable(functions,"createWorkspaceInvitation");
     const result=await inviteFn({orgId,email:memberEmail.trim().toLowerCase(),role:memberRole});
     await audit("invitation_created","invitations",result.data.invitationId,{email:memberEmail.trim().toLowerCase(),role:memberRole});
     setToast(`Invitation created for ${memberEmail}. Ask them to register using that email.`);
     setMemberEmail("");
   }catch(e){setError(friendlyError(e));}
   finally{setBusy(false);}
 }
 function exportJson(){
   const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),organization:{id:orgId,...org},records},null,2)],{type:"application/json"});
   download(blob,`terracontrol-${orgId}-${today()}.json`);
 }
 function exportCsv(){
   let exportRows=rows;
   let fileBase=active.toLowerCase().replaceAll(/[^a-z0-9]+/g,"-");
   if(active==="Reports & Export"){
     exportRows=Object.entries(records).filter(([key])=>key!=="settings").flatMap(([collection,items])=>(items||[]).map(row=>({...row,sourceCollection:collection})));
     fileBase="terracontrol-all-accessible-records";
   }
   if(!exportRows.length){notify("No rows to export");return;}
   const keys=[...new Set(exportRows.flatMap(r=>Object.keys(r)))];
   const csv=[keys.join(","),...exportRows.map(r=>keys.map(k=>`"${String(fieldValue(r,k)??"").replaceAll('"','""')}"`).join(","))].join("\n");
   download(new Blob([csv],{type:"text/csv;charset=utf-8"}),`${fileBase}-${today()}.csv`);
 }
 function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
 function openCreate(){setEditId(null);setForm({status:"Draft",progress:0,probability:3,impact:3});setModal("record");}
 function openEdit(row){setEditId(row.id);setForm({...row});setModal("record");}
 function switchModule(name){setActive(name);setQueryText("");setProjectFilter("All projects");setSidebarOpen(false);setError("");}
 async function logout(){await signOut(auth);}
 if(!apiConfigured)return <SetupRequired/>;
 if(authLoading)return <div className="loading-screen"><div className="brand-mark"><Landmark/></div><h2>TerraControl</h2><p>Connecting to your MongoDB workspace…</p></div>;
 if(user&&needsVerification)return <VerifyEmailPage user={user} onError={setError} error={error} onSignOut={logout}/>;
 if(!user)return <AuthPage onError={setError} error={error} />;
 if(!orgId||!org)return <WorkspaceGate user={user} orgs={orgs} onSelect={selectOrg} onCreate={()=>{setForm({currency:"USD"});setModal("org");}} onLogout={logout} busy={busy} error={error} setError={setError} modal={modal} setModal={setModal} form={form} setForm={setForm} saveOrg={saveOrg}/>;

 const chart=[{name:"Baseline",amount:totalBudget},{name:"Forecast",amount:totalForecast},{name:"Actual",amount:totalActual}];
 const plotPie=[{name:"Available",value:plots.filter(p=>p.status==="Available").length},{name:"Reserved",value:plots.filter(p=>p.status==="Reserved").length},{name:"Sold / transferred",value:plots.filter(p=>["Sold","Transferred"].includes(p.status)).length},{name:"Other",value:plots.filter(p=>!["Available","Reserved","Sold","Transferred"].includes(p.status)).length}].filter(x=>x.value);
 const navVisible=navGroups.map(g=>({...g,items:g.items.filter(([n])=>canReadModule(role,n))}));
 return <div className="app-shell">
  <aside className={`sidebar ${sidebarOpen?"open":""}`}><div className="brand"><div className="brand-mark"><Landmark size={22}/></div><div><div className="brand-name">Terra<span>Control</span></div><div className="brand-sub">DEVELOPMENT OS</div></div><button className="icon-btn mobile-close" onClick={()=>setSidebarOpen(false)}><X size={18}/></button></div>
   <div className="workspace-switch"><div className="workspace-icon">{(org.name||"TD").slice(0,2).toUpperCase()}</div><div className="workspace-copy"><strong>{org.name}</strong><span>{org.location||"Workspace"} · {roleNames[role]||role}</span></div><ChevronDown size={15}/></div>
   <nav className="side-nav">{navVisible.map(group=><div className="nav-group" key={group.section}><div className="nav-section">{group.section}</div>{group.items.map(([name,Icon])=><button key={name} className={`nav-item ${active===name?"active":""}`} onClick={()=>switchModule(name)}><Icon size={17}/><span>{name}</span>{name==="Risks & Issues"&&openRisks>0&&<em>{openRisks}</em>}</button>)}</div>)}</nav>
   <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><HardHat size={18}/></div><strong>Build with control.</strong><p>Budgets, land, people and delivery in one connected workspace.</p><button onClick={()=>switchModule("Reports & Export")}>Open reports <ArrowUpRight size={14}/></button></div><div className="user-profile"><div className="avatar">{(user.displayName||user.email||"U").slice(0,2).toUpperCase()}</div><div><strong>{user.displayName||user.email}</strong><span>{roleNames[role]||role}</span></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={16}/></button></div></div>
  </aside>
  {sidebarOpen&&<div className="mobile-scrim" onClick={()=>setSidebarOpen(false)}/>}
  <main className="main-area"><header className="topbar"><div className="top-left"><button className="icon-btn mobile-menu" onClick={()=>setSidebarOpen(true)}><Menu size={19}/></button><div className="breadcrumb">Workspace <span>/</span><strong>{active}</strong></div></div><div className="top-actions"><label className="global-search"><Search size={16}/><input placeholder="Search current module..." value={queryText} onChange={e=>setQueryText(e.target.value)}/></label><button className="icon-btn" title="Notifications" onClick={()=>switchModule("Reports & Export")}><Bell size={18}/></button><div className="top-avatar">{(user.displayName||user.email||"U").slice(0,2).toUpperCase()}</div></div></header>
   <div className="page-content">
    {error&&<div className="inline-error"><AlertTriangle size={16}/><span>{error}</span><button onClick={()=>setError("")}><X size={15}/></button></div>}
    {active==="Dashboard"?<Dashboard db={records} org={org} currency={currency} chart={chart} plotPie={plotPie} setActive={switchModule} totalBudget={totalBudget} totalForecast={totalForecast} totalActual={totalActual} overdue={overdue} openRisks={openRisks} createDemo={createDemoData} role={role} busy={busy}/>:
    active==="GIS / Site Map"?<GISPage plots={records.plots||[]} projects={projects} currency={currency} setActive={switchModule}/>:
    active==="Alerts & Notifications"?<AlertsPage db={records} setActive={switchModule} currency={currency}/>:
    active==="Reports & Export"?<Reports db={records} currency={currency} exportJson={exportJson} exportCsv={exportCsv} print={()=>window.print()} month={reportMonth} setMonth={setReportMonth} setActive={switchModule}/>:
    active==="Settings"?<SettingsPage org={org} orgId={orgId} role={role} update={async vals=>{try{await updateDoc(doc(db,"organizations",orgId),{...vals,updatedAt:serverTimestamp()});await audit("update","organization",orgId,vals);notify("Workspace settings saved");}catch(e){setError(friendlyError(e));}}} exportJson={exportJson} createDemo={createDemoData} busy={busy}/>:
    active==="Team & Access"?<TeamPage team={team} role={role} inviteMember={inviteMember} memberEmail={memberEmail} setMemberEmail={setMemberEmail} memberRole={memberRole} setMemberRole={setMemberRole} orgId={orgId} busy={busy} onDeactivate={deactivateMember} onChangeRole={changeMemberRole}/>:
    active==="Audit Log"?<AuditLogPage rows={records.auditLogs||[]} />:
    <ModulePage active={active} rows={filtered} config={Object.values(MODULES).find(m=>m.title===active)} currency={currency} projects={projects} filterProject={projectFilter} setFilterProject={setProjectFilter} onCreate={openCreate} onEdit={openEdit} onDelete={deleteRecord} canEdit={roleCanEdit(role,active)} canDelete={["owner","admin"].includes(role)} canApprove={canApproveRecord(role,active)} onApprove={approveRecord} downloadFile={downloadStoredFile} exportCsv={exportCsv} queryText={queryText} setQueryText={setQueryText} print={()=>window.print()} upload={uploadDocument} fileBusy={fileBusy} />}
    <div className="footer-note"><span>TerraControl · {org.name}</span><span>Cloud data · Signed in as {roleNames[role]||role}</span></div>
   </div>
  </main>
  {modal==="record"&&<RecordModal title={`${editId?"Edit":"Add"} ${active}`} config={Object.values(MODULES).find(m=>m.title===active)} form={form} setForm={setForm} projects={projects} onClose={()=>setModal(null)} onSave={saveRecord} busy={busy}/>}
  {toast&&<div className="toast"><CircleCheck size={17}/>{toast}</div>}
 </div>;
}

function SetupRequired(){return <div className="auth-shell"><div className="auth-card setup-card"><div className="brand-mark"><Landmark size={22}/></div><h1>Connect TerraControl to MongoDB API</h1><p>TerraControl now uses a Node.js API backed by MongoDB. Configure and start the API server before signing in.</p><ol><li>Create a MongoDB Atlas cluster or use a secured MongoDB server.</li><li>Configure <code>server/.env</code> using <code>server/.env.example</code>.</li><li>Install backend dependencies with <code>npm install</code> inside <code>server</code>.</li><li>Start the API with <code>npm run dev</code> inside <code>server</code>.</li><li>Set <code>VITE_API_URL=/api</code> in the frontend environment.</li></ol><p className="muted">Never place service-account keys or Admin SDK credentials in browser code.</p></div></div>;}

function VerifyEmailPage({user,onError,error,onSignOut}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function resend(){setBusy(true);onError("");setMessage("");try{await sendEmailVerification(user);setMessage("Verification email sent. Check your inbox and spam folder.");}catch(e){onError(friendlyError(e));}finally{setBusy(false);}}
 return <div className="auth-shell"><div className="auth-brand"><div className="brand-mark"><Landmark size={23}/></div><div className="brand-name">Terra<span>Control</span></div><p>SECURE WORKSPACE</p></div><div className="auth-card"><div className="verify-icon"><Mail size={25}/></div><div className="auth-card-head"><h1>Verify your email</h1><p>We sent a verification link to <strong>{user.email}</strong>. Verify your address, then sign out and sign in again to continue.</p></div>{error&&<div className="inline-error">{error}</div>}{message&&<div className="success-message"><CircleCheck size={15}/>{message}</div>}<button className="btn primary auth-submit" onClick={resend} disabled={busy}><Mail size={16}/>{busy?"Sending…":"Resend verification email"}</button><button className="btn secondary auth-submit" onClick={onSignOut}>I've verified — sign out and sign in</button><div className="auth-security"><ShieldCheck size={15}/> Use a verified business email address</div></div><div className="auth-foot">TerraControl · Development operations platform</div></div>;
}

function AuthPage({onError,error}){
 const [mode,setMode]=useState("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[show,setShow]=useState(false),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();onError("");setBusy(true);try{
   if(mode==="register"){if(password.length<10)throw new Error("Use a password with at least 10 characters.");const cred=await createUserWithEmailAndPassword(auth,email.trim(),password);if(name.trim())await updateProfile(cred.user,{displayName:name.trim()});await setDoc(doc(db,"users",cred.user.uid),{displayName:name.trim(),email:cred.user.email,createdAt:serverTimestamp(),orgIds:[]});await sendEmailVerification(cred.user);}
   else if(mode==="login"){
     const cred=await signInWithEmailAndPassword(auth,email.trim(),password);
     if(!cred.user.emailVerified){await sendEmailVerification(cred.user);await signOut(auth);throw new Error("Please verify your email using the link sent to your inbox. A new verification email has been sent.");}
   }
   else {await sendPasswordResetEmail(auth,email.trim());onError("Password reset email sent. Check your inbox and spam folder.");}
 }catch(e){onError(friendlyError(e));}finally{setBusy(false);}}
 return <div className="auth-shell"><div className="auth-brand"><div className="brand-mark"><Landmark size={23}/></div><div className="brand-name">Terra<span>Control</span></div><p>LAND DEVELOPMENT MANAGEMENT</p></div><div className="auth-card"><div className="auth-card-head"><span className="eyebrow">SECURE WORKSPACE</span><h1>{mode==="register"?"Create your account":mode==="reset"?"Reset your password":"Welcome back"}</h1><p>{mode==="register"?"Set up your secure TerraControl login.":mode==="reset"?"We'll send you a password reset link.":"Sign in to manage your projects and operations."}</p></div>{error&&<div className="inline-error"><AlertTriangle size={15}/>{error}</div>}<form onSubmit={submit} className="auth-form">{mode==="register"&&<label>Full name<div className="input-icon"><Users size={16}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" required/></div></label>}<label>Email address<div className="input-icon"><Mail size={16}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required/></div></label>{mode!=="reset"&&<label>Password<div className="input-icon"><LockKeyhole size={16}/><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="register"?"At least 10 characters":"Your password"} required minLength={mode==="register"?10:1}/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>}{mode==="login"&&<button className="auth-link align-right" type="button" onClick={()=>setMode("reset")}>Forgot password?</button>}<button className="btn primary auth-submit" disabled={busy}>{busy?<RefreshCw className="spin" size={16}/>:mode==="reset"?<Mail size={16}/>:mode==="register"?<UserPlus size={16}/>:<LockKeyhole size={16}/>} {busy?"Please wait…":mode==="reset"?"Send reset email":mode==="register"?"Create account":"Sign in"}</button></form><div className="auth-switch">{mode==="login"?<>New to TerraControl? <button onClick={()=>{setMode("register");onError("");}}>Create an account</button></>:mode==="register"?<>Already have an account? <button onClick={()=>{setMode("login");onError("");}}>Sign in</button></>:<>Remembered your password? <button onClick={()=>{setMode("login");onError("");}}>Sign in</button></>}</div><div className="auth-security"><ShieldCheck size={15}/> Authentication handled by TerraControl API</div></div><div className="auth-foot">TerraControl · Development operations platform</div></div>;
}

function WorkspaceGate({user,orgs,onSelect,onCreate,onLogout,busy,error,setError,modal,setModal,form,setForm,saveOrg}){
 return <div className="auth-shell"><div className="auth-brand"><div className="brand-mark"><Landmark size={23}/></div><div className="brand-name">Terra<span>Control</span></div><p>WORKSPACE SETUP</p></div><div className="auth-card workspace-gate"><div className="auth-card-head"><span className="eyebrow">SIGNED IN AS {user.email?.toUpperCase()}</span><h1>Your workspace</h1><p>Create a company workspace or open one you already belong to.</p></div>{error&&<div className="inline-error">{error}</div>}{orgs.map(o=><button key={o.id} className="org-choice" onClick={()=>onSelect(o.id,user.uid,o)}><div className="workspace-icon">{(o.name||"TD").slice(0,2).toUpperCase()}</div><div><strong>{o.name}</strong><span>{o.location||"No location"} · {roleNames[o.role]||o.role}</span></div><ArrowUpRight size={16}/></button>)}<button className="btn primary auth-submit" onClick={onCreate}><Plus size={16}/> Create a new workspace</button><button className="auth-link logout-link" onClick={onLogout}>Sign out</button></div>{modal==="org"&&<div className="modal-backdrop"><div className="modal"><div className="modal-header"><div><div className="eyebrow">NEW WORKSPACE</div><h2>Create company workspace</h2></div><button className="icon-btn" onClick={()=>setModal(null)}><X size={18}/></button></div><form onSubmit={saveOrg}><div className="modal-fields"><label>Company / organization name<input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} required/></label><label>Operating location<input value={form.location||""} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Harare, Zimbabwe"/></label><label>Reporting currency<select value={form.currency||"USD"} onChange={e=>setForm({...form,currency:e.target.value})}><option value="USD">USD — US Dollar</option><option value="ZAR">ZAR — South African Rand</option><option value="GBP">GBP — Pound Sterling</option><option value="EUR">EUR — Euro</option><option value="ZWL">ZWL — verify currency status</option></select></label></div><div className="modal-footer"><span>You'll be the workspace owner.</span><div><button type="button" className="btn secondary" onClick={()=>setModal(null)}>Cancel</button><button className="btn primary" disabled={busy}>{busy?"Creating…":"Create workspace"}</button></div></div></form></div></div>}<div className="auth-foot">First workspace creator becomes its owner.</div></div>;
}

function Dashboard({db,org,currency,chart,plotPie,setActive,totalBudget,totalForecast,totalActual,overdue,openRisks,createDemo,role,busy}){
 const projects=db.projects||[],tasks=db.tasks||[],plots=db.plots||[],documents=db.documents||[],risks=db.risks||[];
 const sold=plots.filter(p=>["Sold","Transferred"].includes(p.status)).length;
 const paid=plots.reduce((s,p)=>s+safeNumber(p.paid),0);
 const variance=totalBudget-totalForecast;
 const recent=[...tasks].sort((a,b)=>(a.due||"").localeCompare(b.due||"")).slice(0,5);
 const colors=["#d4a94f","#6a8caf","#4b9a79","#a8b3c1"];
 return <div className="dashboard-page"><div className="page-heading"><div><div className="eyebrow">PORTFOLIO / LIVE OVERVIEW</div><h1>Development control centre <span>✦</span></h1><p>Welcome to {org.name}. Here's your current delivery and financial position.</p></div><div className="heading-actions"><button className="btn secondary" onClick={()=>window.print()}><Printer size={15}/> Print overview</button>{["owner","admin"].includes(role)&&<button className="btn primary" onClick={createDemo} disabled={busy}><Plus size={16}/> Add sample data</button>}</div></div>
 <div className="project-banner"><div className="banner-pattern"/><div className="banner-icon"><Landmark size={24}/></div><div className="banner-copy"><span>PORTFOLIO CONTROL CENTRE</span><h2>From raw land to ready-to-sell plots.</h2><p>Manage development costs, delivery, compliance and sales in one connected workspace.</p></div><div className="banner-meta"><div><span>Projects</span><strong>{projects.length.toString().padStart(2,"0")}</strong></div><div><span>Active projects</span><strong>{projects.filter(p=>p.status==="Active").length.toString().padStart(2,"0")}</strong></div></div></div>
 <div className="stats-grid"><StatCard label="Baseline budget" value={money(totalBudget,currency)} note="From cost plan lines" icon={Wallet} tone="blue"/><StatCard label="Actual spend" value={money(totalActual,currency)} note={`${totalBudget?Math.round(totalActual/totalBudget*100):0}% of baseline`} icon={CircleDollarSign} tone="gold"/><StatCard label="Forecast variance" value={money(variance,currency)} note={variance>=0?"Forecast under baseline":"Forecast over baseline"} icon={variance>=0?ArrowDownRight:ArrowUpRight} tone={variance>=0?"green":"red"}/><StatCard label="Plots sold / transferred" value={`${sold} / ${plots.length}`} note={`${money(paid,currency)} payments recorded`} icon={Map} tone="purple"/></div>
 <div className="content-grid main-charts"><section className="panel"><PanelHeader title="Budget performance" subtitle="Baseline vs forecast vs actual" action="View costs" onAction={()=>setActive("Budget & Costs")}/><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{top:8,right:10,left:4,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8edf3"/><XAxis dataKey="name" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false} tickFormatter={v=>v>=1000000?`${(v/1000000).toFixed(1)}m`:`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>money(v,currency)}/><Bar dataKey="amount" fill="#1f4e78" radius={[6,6,0,0]} barSize={42}/></BarChart></ResponsiveContainer></div><div className="budget-legend"><span><i className="dot navy"/> Baseline <strong>{money(totalBudget,currency)}</strong></span><span><i className="dot gold"/> Forecast <strong>{money(totalForecast,currency)}</strong></span><span><i className="dot green"/> Actual <strong>{money(totalActual,currency)}</strong></span></div></section>
 <section className="panel"><PanelHeader title="Plot inventory" subtitle="Availability and sales status" action="Open register" onAction={()=>setActive("Plots & Sales")}/><div className="pie-area"><div className="pie-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={plotPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={73} paddingAngle={4} stroke="none">{plotPie.map((p,i)=><Cell key={p.name} fill={colors[i%colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="pie-center"><strong>{plots.length}</strong><span>Total plots</span></div></div><div className="pie-legend">{plotPie.map((p,i)=><div key={p.name}><span><i style={{background:colors[i%colors.length]}}/>{p.name}</span><strong>{p.value}</strong></div>)}</div></div><div className="plot-footnote"><span>Recorded plot payments</span><strong>{money(paid,currency)}</strong></div></section></div>
 <div className="content-grid lower-grid"><section className="panel"><PanelHeader title="Upcoming delivery" subtitle="Nearest task deadlines" action="View tasks" onAction={()=>setActive("Tasks & Schedule")}/><div className="table-scroll"><table className="data-table"><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>Progress</th><th>Status</th></tr></thead><tbody>{recent.map(t=><tr key={t.id}><td><strong>{t.title}</strong><small>{t.project}</small></td><td>{t.owner||"—"}</td><td>{t.due||"—"}</td><td><MiniProgress value={t.progress}/></td><td><StatusPill value={t.status}/></td></tr>)}{!recent.length&&<tr><td colSpan="5">No tasks yet. Add tasks to start tracking delivery.</td></tr>}</tbody></table></div></section>
 <section className="panel"><PanelHeader title="Needs attention" subtitle="Items to review"/><div className="attention-list"><button className="attention-row" onClick={()=>setActive("Tasks & Schedule")}><div className="attention-symbol red"><Clock3 size={17}/></div><div><strong>{overdue} overdue tasks</strong><span>Past due and incomplete</span></div><ArrowUpRight size={16}/></button><button className="attention-row" onClick={()=>setActive("Risks & Issues")}><div className="attention-symbol gold"><ShieldAlert size={17}/></div><div><strong>{openRisks} open risks / issues</strong><span>Review mitigations</span></div><ArrowUpRight size={16}/></button><button className="attention-row" onClick={()=>setActive("Documents & Permits")}><div className="attention-symbol blue"><FileText size={17}/></div><div><strong>{documents.filter(d=>["Pending","Expired"].includes(d.status)).length} permits pending</strong><span>Check approval evidence</span></div><ArrowUpRight size={16}/></button><button className="attention-row" onClick={()=>setActive("Procurement")}><div className="attention-symbol purple"><Truck size={17}/></div><div><strong>{(db.procurement||[]).filter(p=>["Pending approval","Part delivered"].includes(p.status)).length} procurement items</strong><span>Approvals or deliveries</span></div><ArrowUpRight size={16}/></button></div></section></div>
 </div>;
}
function StatCard({label,value,note,icon:Icon,tone}){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;}
function PanelHeader({title,subtitle,action,onAction}){return <div className="panel-header"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>{action&&<button className="text-action" onClick={onAction}>{action}<ArrowUpRight size={14}/></button>}</div>;}
function StatusPill({value}){const s=String(value||"Draft").toLowerCase().replaceAll(/[^a-z0-9]+/g,"-");return <span className={`status-pill ${s}`}>{value||"Draft"}</span>;}
function MiniProgress({value}){return <div className="mini-progress"><span><i style={{width:`${Math.max(0,Math.min(100,safeNumber(value)))}%`}}/></span><b>{safeNumber(value)}%</b></div>;}

function ModulePage({active,rows,config,currency,projects,filterProject,setFilterProject,onCreate,onEdit,onDelete,canEdit,canDelete,canApprove,onApprove,downloadFile,exportCsv,print,upload,fileBusy,queryText,setQueryText}){
 const [payslipRow,setPayslipRow]=useState(null);
 if(!config)return <div className="empty-state">Module not available.</div>;
 const total=rows.reduce((s,r)=>s+safeNumber(r.forecast??r.baseline??r.amount??r.price??r.basic??0),0);
 return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">OPERATIONS / CONTROL</div><h1>{active}</h1><p>{config.desc}</p></div><div className="heading-actions"><button className="btn secondary" onClick={exportCsv}><Download size={15}/> CSV</button><button className="btn secondary" onClick={print}><Printer size={15}/> Print</button>{canEdit&&<button className="btn primary" onClick={onCreate}><Plus size={16}/> Add record</button>}</div></div>
 <div className="module-summary"><div><span>Records shown</span><strong>{rows.length}</strong></div><div><span>Aggregate value</span><strong>{money(total,currency)}</strong></div><div className="summary-tip"><ShieldCheck size={17}/><span>Role-based access is applied. Changes are logged where permitted.</span></div></div>
 <div className="panel table-panel"><div className="table-toolbar"><div className="toolbar-left"><div className="table-search"><Search size={15}/><input value={queryText} placeholder={`Search ${active.toLowerCase()}…`} aria-label="Search current records" onChange={e=>setQueryText(e.target.value)}/></div>{active!=="Projects"&&<select value={filterProject} onChange={e=>setFilterProject(e.target.value)}><option>All projects</option>{projects.map(p=><option key={p.id}>{p.name}</option>)}</select>}</div><div className="toolbar-right"><span className="rows-count">{rows.length} records</span>{active==="Documents & Permits"&&<label className="btn secondary upload-btn"><FileUp size={15}/>{fileBusy?"Uploading…":"Upload file"}<input type="file" hidden disabled={fileBusy} onChange={upload} accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"/></label>}</div></div>
 {rows.length===0?<div className="empty-table"><div className="empty-icon"><Database size={23}/></div><h3>No records found</h3><p>Create a record or adjust the project filter.</p>{canEdit&&<button className="btn primary" onClick={onCreate}><Plus size={15}/> Add first record</button>}</div>:
 <div className="table-scroll"><table className="data-table module-table"><thead><tr>{config.cols.map(([key,label])=><th key={key}>{label}</th>)}{active==="Documents & Permits"&&<th>File</th>}{canEdit&&<th>Actions</th>}{active==="Payroll & Payslips"&&<th>Payslip</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.id}>{config.cols.map(([key,label,type])=><td key={key}>{type==="money"?money(fieldValue(row,key),currency):type==="percent"?<MiniProgress value={fieldValue(row,key)}/>:key==="status"?<StatusPill value={fieldValue(row,key)}/>:key==="health"?<StatusPill value={fieldValue(row,key)}/>:key==="score"?<span className={`risk-score ${safeNumber(fieldValue(row,key))>=15?"high":safeNumber(fieldValue(row,key))>=8?"medium":"low"}`}>{fieldValue(row,key)}</span>:<span className={["title","name","item"].includes(key)?"cell-strong":""}>{fieldValue(row,key)||"—"}</span>}</td>)}{active==="Documents & Permits"&&<td>{row.storagePath?<button className="text-action" onClick={()=>downloadFile(row)}><Download size={14}/> Download</button>:"—"}</td>}{canEdit&&<td><div className="row-actions"><button title="Edit" onClick={()=>onEdit(row)}><Pencil size={15}/></button>{canDelete&&<button title="Delete" onClick={()=>onDelete(row)}><Trash2 size={15}/></button>}{canApprove&&row.status!=="Approved"&&row.status!=="Reviewed"&&["Budget & Costs","Procurement","Payroll & Payslips","Decisions & Changes","Site Reports"].includes(active)&&<button title="Approve / review" onClick={()=>onApprove(row)}><Check size={15}/></button>}</div></td>}{active==="Payroll & Payslips"&&<td><button className="text-action" onClick={()=>setPayslipRow(row)}>Preview</button></td>}</tr>)}</tbody></table></div>}
 <div className="table-footer"><span>Showing {rows.length} records</span><span>Cloud-synced workspace records</span></div></div>
 {active==="Payroll & Payslips"&&<div className="notice-card"><AlertTriangle size={18}/><div><strong>Payroll compliance warning</strong><p>PAYE, pension, NSSA, levies, taxable benefits, leave and overtime are jurisdiction-specific. This version supports explicit deduction entries; obtain professional validation before processing payroll.</p></div></div>}
 {active==="Plots & Sales"&&<div className="notice-card"><AlertTriangle size={18}/><div><strong>Title and transaction controls</strong><p>Record buyer due diligence, signed agreements, deposit receipts, payment schedules, transfer status and legal title evidence. This register does not validate land ownership or replace a conveyancer.</p></div></div>}
 {payslipRow&&<Payslip row={payslipRow} currency={currency} close={()=>setPayslipRow(null)}/>}
 </div>;
}

function RecordModal({title,config,form,setForm,projects,onClose,onSave,busy}){
 const update=(k,v)=>setForm(p=>({...p,[k]:v}));
 if(!config)return null;
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><div className="modal-header"><div><div className="eyebrow">RECORD MANAGEMENT</div><h2>{title}</h2></div><button className="icon-btn" onClick={onClose}><X size={18}/></button></div><form onSubmit={onSave}><div className="modal-fields">{config.fields.map(([key,label,type,opts])=><label key={key} className={type==="textarea"?"span-two":""}>{label}{type==="select"?<select value={form[key]??""} onChange={e=>update(key,e.target.value)} required={key==="project"}><option value="">Select…</option>{opts.split(",").map(v=><option key={v} value={v}>{v}</option>)}</select>:type==="project"?<select value={form[key]??""} onChange={e=>update(key,e.target.value)} required><option value="">Select project…</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select>:type==="textarea"?<textarea rows="3" value={form[key]??""} onChange={e=>update(key,e.target.value)}/>:<input type={type==="number"?"number":type==="date"?"date":type==="email"?"email":"text"} min={type==="number"?"0":undefined} step={type==="number"?"any":undefined} value={form[key]??""} onChange={e=>update(key,e.target.value)} required={["name","title","item","description"].includes(key)}/>}</label>)}</div><div className="modal-footer"><span><ShieldCheck size={14}/> Stored in your organisation's cloud database.</span><div><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn primary" disabled={busy}><Check size={15}/>{busy?"Saving…":"Save record"}</button></div></div></form></div></div>;
}
function Payslip({row,currency,close}){
 const gross=safeNumber(row.basic)+safeNumber(row.overtime)+safeNumber(row.allowances),ded=safeNumber(row.tax)+safeNumber(row.pension)+safeNumber(row.other);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><div className="modal payslip-modal"><div className="modal-header"><div><div className="eyebrow">PAYROLL / DOCUMENT</div><h2>Payslip preview</h2></div><button className="icon-btn" onClick={close}><X size={18}/></button></div><div className="payslip-preview"><div className="payslip-top"><div className="brand-mark small"><Landmark size={17}/></div><div><strong>TERRACONTROL PAYSLIP</strong><span>{row.name} · {row.period}</span></div></div>{[["Employee ID",row.employeeCode],["Department",row.department],["Basic pay",money(row.basic,currency)],["Overtime",money(row.overtime,currency)],["Allowances / bonus",money(row.allowances,currency)],["Gross earnings",money(gross,currency)],["PAYE / tax",money(row.tax,currency)],["Employee pension",money(row.pension,currency)],["Other deductions",money(row.other,currency)],["Total deductions",money(ded,currency)]].map(([k,v])=><div className="payslip-line" key={k}><span>{k}</span><strong>{v||"—"}</strong></div>)}<div className="net-pay"><span>NET PAY</span><strong>{money(gross-ded,currency)}</strong></div><p>Preview only. Validate statutory calculations before issuing an official payslip.</p><button className="btn secondary full" onClick={()=>window.print()}><Printer size={15}/> Print payslip</button></div></div></div>;
}
function AlertsPage({db,setActive,currency}){
 const tasks=db.tasks||[],docs=db.documents||[],invoices=db.invoices||[],risks=db.risks||[],payments=db.payments||[];
 const alerts=[];
 tasks.filter(t=>t.status!=="Complete"&&t.due&&t.due<today()).forEach(t=>alerts.push({id:`task-${t.id}`,level:"Critical",title:`Overdue task: ${t.title}`,detail:`${t.project||"Project"} · Owner ${t.owner||"unassigned"} · Due ${t.due}`,module:"Tasks & Schedule"}));
 tasks.filter(t=>t.status!=="Complete"&&t.due&&t.due>=today()&&(new Date(t.due)-new Date(today()))/86400000<=7).forEach(t=>alerts.push({id:`soon-${t.id}`,level:"Warning",title:`Task due soon: ${t.title}`,detail:`${t.project||"Project"} · Due ${t.due}`,module:"Tasks & Schedule"}));
 docs.filter(d=>d.status==="Expired"||(d.expiry&&d.expiry<today())).forEach(d=>alerts.push({id:`doc-${d.id}`,level:"Critical",title:`Expired document / permit: ${d.title}`,detail:`${d.project||"Project"} · Expiry ${d.expiry||"marked expired"}`,module:"Documents & Permits"}));
 docs.filter(d=>d.expiry&&d.expiry>=today()&&(new Date(d.expiry)-new Date(today()))/86400000<=30&&d.status!=="Expired").forEach(d=>alerts.push({id:`docsoon-${d.id}`,level:"Warning",title:`Document renewal approaching: ${d.title}`,detail:`${d.project||"Project"} · Expires ${d.expiry}`,module:"Documents & Permits"}));
 invoices.filter(i=>safeNumber(i.amount)>safeNumber(i.paid)&&i.due&&i.due<today()&&!["Paid","Cancelled"].includes(i.status)).forEach(i=>alerts.push({id:`inv-${i.id}`,level:"Critical",title:`Overdue invoice: ${i.reference||i.id}`,detail:`${i.counterparty||"Counterparty"} · Outstanding ${money(safeNumber(i.amount)-safeNumber(i.paid),currency)}`,module:"Invoices & Payments"}));
 risks.filter(r=>r.status!=="Closed"&&safeNumber(r.probability)*safeNumber(r.impact)>=15).forEach(r=>alerts.push({id:`risk-${r.id}`,level:"Critical",title:`High-scoring risk: ${r.title}`,detail:`${r.project||"Project"} · Score ${safeNumber(r.probability)*safeNumber(r.impact)}/25 · ${r.owner||"No owner"}`,module:"Risks & Issues"}));
 payments.filter(p=>p.status==="Pending").forEach(p=>alerts.push({id:`payment-${p.id}`,level:"Warning",title:`Payment awaiting reconciliation: ${p.reference||p.id}`,detail:`${p.project||"Project"} · ${money(p.amount,currency)}`,module:"Payments"}));
 (db.notifications||[]).filter(n=>n.status==="unread").forEach(n=>alerts.push({id:`notice-${n.id}`,level:"Warning",title:n.title||"Workspace notification",detail:n.createdAtClient||"New notification",module:n.collection==="payroll"?"Payroll & Payslips":n.collection==="budgets"?"Budget & Costs":n.collection==="procurement"?"Procurement":"Projects"}));
 return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">WORKSPACE / ATTENTION REQUIRED</div><h1>Alerts & Notifications</h1><p>In-app alerts generated from due dates, permits, outstanding invoices, risks and reconciliation status.</p></div><div className="heading-actions"><button className="btn secondary" onClick={()=>window.print()}><Printer size={15}/> Print alert list</button></div></div>
 <div className="module-summary"><div><span>Open alerts</span><strong>{alerts.length}</strong></div><div><span>Critical</span><strong>{alerts.filter(a=>a.level==="Critical").length}</strong></div><div><span>Warnings</span><strong>{alerts.filter(a=>a.level==="Warning").length}</strong></div><div className="summary-tip"><Bell size={17}/><span>These alerts update from live workspace records; email/SMS delivery is not configured.</span></div></div>
 <div className="panel alert-list-panel">{alerts.length?alerts.map(a=><button key={a.id} className="alert-item" onClick={()=>setActive(a.module)}><div className={`alert-level ${a.level==="Critical"?"critical":"warning"}`}>{a.level==="Critical"?<AlertTriangle size={17}/>:<Clock3 size={17}/>}</div><div className="alert-copy"><strong>{a.title}</strong><span>{a.detail}</span></div><StatusPill value={a.level}/><ArrowUpRight size={16}/></button>):<div className="empty-table"><div className="empty-icon"><CircleCheck size={23}/></div><h3>No alerts at the moment</h3><p>As records are added, this page will flag overdue work and items needing attention.</p></div>}</div>
 </div>;
}

function AuditLogPage({rows}){
 const sorted=[...rows].sort((a,b)=>String(b.createdAtClient||"").localeCompare(String(a.createdAtClient||""))).slice(0,500);
 return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">GOVERNANCE / TRACEABILITY</div><h1>Audit Log</h1><p>Recent create, update, delete, invitation and file actions. Access is restricted to owners, admins and auditors.</p></div><div className="heading-actions"><button className="btn secondary" onClick={()=>window.print()}><Printer size={15}/> Print</button></div></div><div className="panel table-panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Collection</th><th>Record</th><th>Details</th></tr></thead><tbody>{sorted.map(r=><tr key={r.id}><td>{r.createdAtClient||"—"}</td><td>{r.actorName||r.actorEmail||r.actorUid}</td><td><StatusPill value={r.action}/></td><td>{r.collection||"—"}</td><td>{r.recordId||"—"}</td><td>{JSON.stringify(r.details||{})}</td></tr>)}{!sorted.length&&<tr><td colSpan="6">No audit events yet.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing latest {sorted.length} events</span><span>Audit records are append-only for client users.</span></div></div></div>;
}

function GISPage({plots,projects,currency,setActive}){
 const mapped=plots.filter(p=>Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))&&p.latitude!==""&&p.longitude!==""&&Math.abs(Number(p.latitude))<=90&&Math.abs(Number(p.longitude))<=180);
 const center=mapped.length?[Number(mapped[0].latitude),Number(mapped[0].longitude)]:[-17.8252,31.0335];
 return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">LAND & DELIVERY / GIS</div><h1>GIS / Site Map</h1><p>Map parcel coordinate points and identify plots that still need survey coordinates.</p></div><div className="heading-actions"><button className="btn secondary" onClick={()=>setActive("Plots & Sales")}><Map size={15}/> Open plot register</button></div></div>
 <div className="module-summary"><div><span>Total plots</span><strong>{plots.length}</strong></div><div><span>Mapped coordinates</span><strong>{mapped.length}</strong></div><div><span>Coordinates missing</span><strong>{plots.length-mapped.length}</strong></div><div className="summary-tip"><MapPin size={17}/><span>Enter latitude and longitude in Plots & Sales to map parcel points.</span></div></div>
 <div className="panel gis-panel"><PanelHeader title="Parcel location map" subtitle="OpenStreetMap base layer · point locations only; not a cadastral boundary survey"/><div className="gis-map"><MapContainer center={center} zoom={mapped.length?14:6} scrollWheelZoom style={{height:"100%",width:"100%"}}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{mapped.map(p=><CircleMarker key={p.id} center={[Number(p.latitude),Number(p.longitude)]} radius={8} pathOptions={{color:"#17365d",fillColor:"#d4a94f",fillOpacity:.9}}><Popup><strong>{p.id}</strong><br/>{p.project}<br/>Block: {p.block||"—"}<br/>Area: {p.area||"—"} m²<br/>Status: {p.status||"—"}</Popup></CircleMarker>)}</MapContainer></div><div className="gis-caption"><MapPin size={15}/><span>Coordinates mark approximate points. Upload or store surveyed GeoJSON boundaries and verify projections, datum and title plans before using maps for legal or engineering decisions.</span></div></div>
 <div className="panel table-panel"><div className="panel-header"><div><h3>Plots without coordinates</h3><p>These records will not appear on the map until coordinates are added.</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Plot ID</th><th>Project</th><th>Block</th><th>Survey reference</th><th>Status</th></tr></thead><tbody>{plots.filter(p=>!mapped.includes(p)).map(p=><tr key={p.id}><td>{p.id}</td><td>{p.project}</td><td>{p.block||"—"}</td><td>{p.surveyRef||"—"}</td><td><StatusPill value={p.status}/></td></tr>)}{plots.length===mapped.length&&<tr><td colSpan="5">All plot records have coordinate points.</td></tr>}</tbody></table></div></div>
 </div>;
}

function Reports({db,currency,exportJson,exportCsv,print,month,setMonth,setActive}){
 const items=[["Projects",(db.projects||[]).length,"Portfolio records",Building2],["Budget lines",(db.budgets||[]).length,"Cost plan records",Wallet],["Plots",(db.plots||[]).length,"Parcel inventory",Map],["Tasks",(db.tasks||[]).length,"Delivery records",CalendarDays],["Payroll rows",(db.payroll||[]).length,"Payroll register",Users],["Open risks",(db.risks||[]).filter(x=>x.status!=="Closed").length,"Need monitoring",ShieldAlert]];
 const inMonth=(db.cashflow||[]).filter(x=>String(x.month||"").startsWith(month));
 const inflows=inMonth.reduce((s,x)=>s+safeNumber(x.inflow),0),outflows=inMonth.reduce((s,x)=>s+safeNumber(x.outflow),0);
 const forecast=(db.budgets||[]).reduce((s,x)=>s+safeNumber(x.forecast),0),actual=(db.budgets||[]).reduce((s,x)=>s+safeNumber(x.actual),0);
 return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">GOVERNANCE / OUTPUTS</div><h1>Reports & Export</h1><p>Financial overview, operating controls and data backup.</p></div><div className="heading-actions"><button className="btn secondary" onClick={print}><Printer size={15}/> Print</button><button className="btn primary" onClick={exportJson}><Download size={15}/> Full backup</button></div></div>
 <div className="report-grid">{items.map(([t,v,n,I])=><div className="report-card" key={t}><div className="report-card-icon"><I size={19}/></div><span>{t}</span><strong>{v}</strong><small>{n}</small></div>)}</div>
 <div className="content-grid reports-content"><section className="panel"><PanelHeader title="Financial control summary" subtitle="Based on records entered in this workspace"/><div className="finance-summary">{[["Forecast at completion",money(forecast,currency)],["Actual expenditure",money(actual,currency)],["Forecast less actual",money(forecast-actual,currency)],["Cash inflows · "+month,money(inflows,currency)],["Cash outflows · "+month,money(outflows,currency)],["Net cash movement",money(inflows-outflows,currency)]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div><div className="month-filter"><label>Cash flow month<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><button className="btn secondary" onClick={()=>setActive("Cash Flow")}>Open cash flow</button></div></section>
 <section className="panel"><PanelHeader title="Export & data management" subtitle="Keep secure backups and work with spreadsheets"/><div className="settings-actions"><button className="settings-action" onClick={exportJson}><div className="action-file"><Download size={19}/></div><div><strong>Export full JSON backup</strong><span>All accessible organisation records.</span></div><ArrowUpRight size={17}/></button><button className="settings-action" onClick={exportCsv}><div className="action-file"><FileSpreadsheet size={19}/></div><div><strong>Export active module to CSV</strong><span>Spreadsheet-friendly register export.</span></div><ArrowUpRight size={17}/></button></div><div className="check-list">{["Reconcile costs to invoices and accounting records","Refresh forecast at completion and cash flow","Confirm permits and title evidence","Review overdue tasks and risk mitigations","Review payroll permissions and approvals","Export a backup and store it securely"].map(x=><div key={x}><CircleCheck size={16}/><span>{x}</span></div>)}</div></section></div>
 <div className="notice-card"><AlertTriangle size={18}/><div><strong>Report integrity</strong><p>These reports are operational summaries, not audited financial statements. Reconcile them against approved source documents and the official accounting ledger.</p></div></div></div>;
}
function SettingsPage({org,orgId,role,update,exportJson,createDemo,busy}){
 const [form,setForm]=useState({name:org.name||"",location:org.location||"",currency:org.currency||"USD"});
 useEffect(()=>setForm({name:org.name||"",location:org.location||"",currency:org.currency||"USD"}),[org]);
 return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">ADMINISTRATION / CONFIGURATION</div><h1>Settings</h1><p>Configure workspace profile and understand security controls.</p></div><div className="heading-actions"><button className="btn secondary" onClick={exportJson}><Download size={15}/> Export backup</button></div></div><div className="settings-layout"><section className="panel settings-panel"><PanelHeader title="Workspace profile" subtitle="Only owners and administrators can change these settings."/><form className="settings-form" onSubmit={e=>{e.preventDefault();update(form);}}><label>Organization name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} disabled={!["owner","admin"].includes(role)} required/></label><label>Operating location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} disabled={!["owner","admin"].includes(role)}/></label><label>Reporting currency<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} disabled={!["owner","admin"].includes(role)}><option value="USD">USD — US Dollar</option><option value="ZAR">ZAR — South African Rand</option><option value="GBP">GBP — Pound Sterling</option><option value="EUR">EUR — Euro</option><option value="ZWL">ZWL — verify current status</option></select></label><div className="form-actions"><button className="btn primary" disabled={!["owner","admin"].includes(role)}>Save settings</button></div></form></section><section className="panel"><PanelHeader title="Security & operations" subtitle="Production controls to maintain"/><div className="security-note"><div className="security-icon"><ShieldCheck size={20}/></div><div><strong>Authentication and organisation isolation</strong><p>The Node API validates workspace membership and role-based access for database and file operations. Test every role and cross-workspace boundary before launch.</p></div></div><div className="settings-actions"><button className="settings-action" onClick={exportJson}><div className="action-file"><Download size={19}/></div><div><strong>Export organisation backup</strong><span>Download accessible records in JSON.</span></div><ArrowUpRight size={17}/></button><button className="settings-action" onClick={createDemo} disabled={busy||!["owner","admin"].includes(role)}><div className="action-file"><Database size={19}/></div><div><strong>Load sample records</strong><span>Useful for testing before entering real data.</span></div><ArrowUpRight size={17}/></button></div></section></div><div className="notice-card"><AlertTriangle size={18}/><div><strong>Security note</strong><p>Do not use sample data as real financial records. Keep MongoDB credentials and JWT secrets on the backend only. Add email verification, secure password reset, private durable file storage, backups, monitoring and API security tests before production launch.</p></div></div></div>;
}
function TeamPage({team,role,inviteMember,memberEmail,setMemberEmail,memberRole,setMemberRole,orgId,busy,onDeactivate,onChangeRole}){
 const [draftRoles,setDraftRoles]=useState({});
 return <div className="module-page"><div className="page-heading"><div><div className="eyebrow">ADMINISTRATION / ACCESS</div><h1>Team & Access</h1><p>Review workspace membership and role assignments.</p></div></div><div className="notice-card"><ShieldAlert size={18}/><div><strong>Server-side invitation controls</strong><p>Invitations are created by a Cloud Function with owner/admin permission checks. Send the invited person the app URL; they must register with the exact invited email and verify it before workspace access.</p></div></div><div className="panel table-panel"><div className="panel-header"><div><h3>Workspace members</h3><p>{team.length} member records</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>User ID</th>{["owner","admin"].includes(role)&&<th>Access</th>}{role==="owner"&&<th>Change role</th>}</tr></thead><tbody>{team.map(m=><tr key={m.uid}><td>{m.displayName||"—"}</td><td>{m.email||"—"}</td><td><StatusPill value={roleNames[m.role]||m.role}/></td><td>{m.active===false?"Inactive":"Active"}</td><td>{m.uid}</td>{["owner","admin"].includes(role)&&<td><button className="text-action" disabled={m.role==="owner"} onClick={()=>onDeactivate(m)}>{m.active===false?"Reactivate":"Deactivate"}</button></td>}{role==="owner"&&<td>{m.role==="owner"?"Owner":<div className="role-editor"><select value={draftRoles[m.uid]||m.role} onChange={e=>setDraftRoles({...draftRoles,[m.uid]:e.target.value})}><option value="admin">Administrator</option><option value="project_manager">Project manager</option><option value="finance">Finance</option><option value="hr">HR / Payroll</option><option value="engineer">Engineer</option><option value="sales">Sales</option><option value="auditor">Auditor</option><option value="viewer">Read-only</option></select><button className="text-action" onClick={()=>onChangeRole(m,draftRoles[m.uid]||m.role)}>Save</button></div>}</td>}</tr>)}</tbody></table></div></div><div className="panel invite-panel"><PanelHeader title="Member invitation" subtitle="Create a role-scoped invitation; send the invitee the app URL using your company email."/><form onSubmit={inviteMember} className="invite-form"><label>Email address<input type="email" value={memberEmail} onChange={e=>setMemberEmail(e.target.value)} placeholder="colleague@company.com" required/></label><label>Role<select value={memberRole} onChange={e=>setMemberRole(e.target.value)}><option value="project_manager">Project manager</option><option value="finance">Finance</option><option value="hr">HR / Payroll</option><option value="engineer">Engineer</option><option value="sales">Sales</option><option value="auditor">Auditor</option><option value="viewer">Read-only</option></select></label><button className="btn primary" disabled={!["owner","admin"].includes(role)||busy}><UserPlus size={15}/>{busy?"Creating…":"Create invitation"}</button></form></div></div>;
}
function friendlyError(e){
 const code=e?.code||"";
 if(code.includes("http/401")||code.includes("auth/invalid-credential"))return "Email or password is incorrect.";
 if(code.includes("http/409")||code.includes("auth/email-already-in-use"))return "That email already has an account. Sign in instead.";
 if(code.includes("auth/weak-password"))return "Choose a stronger password.";
 if(code.includes("auth/invalid-email"))return "Enter a valid email address.";
 if(code.includes("auth/too-many-requests"))return "Too many attempts. Wait a while and try again.";
 if(code.includes("permission-denied"))return "Permission denied. Check your workspace membership and API role permissions.";
 if(code.includes("unavailable"))return "Service temporarily unavailable. Check your connection and try again.";
 if(code.includes("http/403")||code.includes("storage/unauthorized"))return "You do not have permission to access this file.";
 return e?.message||"Something went wrong. Try again.";
}
export default App;
