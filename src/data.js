export const COLLECTIONS = [
  "projects","budgets","cashflow","tasks","milestones","plots","payroll",
  "procurement","risks","documents","decisions","customers","invoices","payments",
  "siteReports","changeOrders","leaveRequests","settings","notifications","auditLogs"
];

export const SEED = {
  projects: [
    {id:"PRJ-001",name:"Greenfields Estate",location:"Harare, Zimbabwe",manager:"Project Manager",stage:"Infrastructure",status:"Active",start:"2026-01-15",end:"2027-06-30",budget:1250000,actual:418000,progress:38},
    {id:"PRJ-002",name:"Riverside Residential",location:"Mashonaland East, Zimbabwe",manager:"Development Lead",stage:"Planning",status:"Planning",start:"2026-04-01",end:"2027-12-15",budget:840000,actual:67500,progress:14}
  ],
  budgets: [
    {id:"B-001",project:"Greenfields Estate",category:"Land acquisition & legal",item:"Land purchase and conveyancing",baseline:300000,committed:280000,actual:280000,forecast:300000,status:"Approved"},
    {id:"B-002",project:"Greenfields Estate",category:"Survey & professional fees",item:"Survey, geotechnical and design",baseline:85000,committed:46000,actual:42000,forecast:90000,status:"Approved"},
    {id:"B-003",project:"Greenfields Estate",category:"Earthworks",item:"Site clearing, cut/fill and compaction",baseline:125000,committed:74000,actual:48000,forecast:132000,status:"In review"}
  ],
  tasks: [], milestones: [], plots: [], payroll: [], procurement: [], risks: [],
  documents: [], decisions: [], cashflow: [], customers: [], invoices: [], payments: [],
  siteReports: [], changeOrders: [], leaveRequests: [], settings: [], notifications: [], auditLogs: []
};

export const MODULES = {
  "Projects": {key:"projects",title:"Projects",desc:"Project portfolio, development stages, ownership and progress.",fields:[
    ["name","Project name","text"],["location","Location","text"],["manager","Project manager","text"],
    ["stage","Stage","select","Feasibility,Land acquisition,Planning,Approvals,Infrastructure,Sales,Handover"],
    ["status","Status","select","Planning,Active,On hold,Completed"],["start","Start date","date"],["end","Target finish","date"],
    ["budget","Approved budget","number"],["actual","Actual cost to date","number"],["progress","Completion %","number"]
  ],cols:[["id","ID"],["name","Project"],["location","Location"],["manager","Manager"],["stage","Stage"],["status","Status"],["budget","Budget","money"],["actual","Actual","money"],["progress","Progress","percent"]]},
  "Budget & Costs": {key:"budgets",title:"Budget & Costs",desc:"Baseline, commitments, actuals, forecast and variance.",fields:[
    ["project","Project","project"],["category","Cost category","select","Land acquisition & legal,Survey & geotechnical,Planning & permits,Earthworks,Roads & transport,Stormwater & drainage,Water & sewer,Power & utilities,Telecoms,Structures,Landscaping,Professional fees,Marketing & sales,Finance & insurance,Project management,Contingency"],
    ["item","Cost item / scope","text"],["baseline","Baseline budget","number"],["committed","Committed costs","number"],["actual","Actual to date","number"],["forecast","Forecast at completion","number"],["status","Approval status","select","Draft,In review,Approved,Rejected"]
  ],cols:[["id","ID"],["project","Project"],["category","Category"],["item","Cost item"],["baseline","Baseline","money"],["committed","Committed","money"],["actual","Actual","money"],["forecast","Forecast","money"],["variance","Variance","money"],["status","Status"]]},
  "Cash Flow": {key:"cashflow",title:"Cash Flow",desc:"Monthly forecast of funding, sales receipts and project outflows.",fields:[
    ["project","Project","project"],["month","Month (YYYY-MM)","text"],["inflow","Expected inflows","number"],["outflow","Expected outflows","number"],["note","Notes / assumptions","text"]
  ],cols:[["id","ID"],["project","Project"],["month","Month"],["inflow","Inflows","money"],["outflow","Outflows","money"],["net","Net cash","money"],["note","Notes"]]},
  "Tasks & Schedule": {key:"tasks",title:"Tasks & Schedule",desc:"Work packages, accountable owners, deadlines and schedule health.",fields:[
    ["project","Project","project"],["title","Task / deliverable","text"],["owner","Owner","text"],["priority","Priority","select","High,Medium,Low"],
    ["start","Start date","date"],["due","Due date","date"],["progress","Completion %","number"],["status","Status","select","Not started,In progress,Blocked,Complete,On hold"],
    ["budget","Planned cost","number"],["actual","Actual cost","number"],["dependency","Dependency","text"]
  ],cols:[["id","ID"],["project","Project"],["title","Task"],["owner","Owner"],["priority","Priority"],["due","Due date"],["progress","Completion","percent"],["status","Status"],["health","Health"]]},
  "Milestones": {key:"milestones",title:"Milestones",desc:"Critical approvals, phase gates, dependencies and acceptance.",fields:[
    ["project","Project","project"],["title","Milestone / gate","text"],["due","Due date","date"],["owner","Owner","text"],
    ["progress","Completion %","number"],["status","Status","select","Not started,In progress,At risk,Complete"],["evidence","Acceptance evidence","text"]
  ],cols:[["id","ID"],["project","Project"],["title","Milestone"],["due","Due date"],["owner","Owner"],["progress","Progress","percent"],["status","Status"]]},
  "Plots & Sales": {key:"plots",title:"Plots & Sales",desc:"Parcel inventory, reservations, sales, buyer records and payment balance.",fields:[
    ["project","Project","project"],["block","Block / phase","text"],["area","Area (m²)","number"],["price","Selling price","number"],
    ["status","Plot status","select","Available,Reserved,Under offer,Sold,Transferred,On hold"],["buyer","Buyer / customer","text"],
    ["titleRef","Title / deed reference","text"],["paid","Amount paid","number"],["surveyRef","Survey reference","text"],["latitude","Latitude (map point)","number"],["longitude","Longitude (map point)","number"],["geometry","Parcel GeoJSON (optional)","textarea"]
  ],cols:[["id","Plot ID"],["project","Project"],["block","Block"],["area","Area m²"],["price","Price","money"],["status","Status"],["buyer","Buyer"],["titleRef","Title ref"],["paid","Paid","money"],["balance","Balance","money"]]},
  "Payroll & Payslips": {key:"payroll",title:"Payroll & Payslips",desc:"Payroll records and payslip calculation. Configure statutory rules with a qualified professional.",fields:[
    ["employeeCode","Employee ID","text"],["name","Employee name","text"],["department","Department","text"],["role","Job title","text"],["period","Pay period (YYYY-MM)","text"],
    ["basic","Basic salary","number"],["overtime","Overtime pay","number"],["allowances","Allowances / bonus","number"],["tax","PAYE / tax (manual)","number"],
    ["pension","Employee pension (manual)","number"],["other","Other deductions","number"],["status","Payment status","select","Draft,Approved,Paid,On hold"]
  ],cols:[["id","ID"],["employeeCode","Employee ID"],["name","Employee"],["department","Department"],["period","Period"],["gross","Gross","money"],["deductions","Deductions","money"],["net","Net pay","money"],["status","Status"]]},
  "Procurement": {key:"procurement",title:"Procurement",desc:"Supplier register, purchase orders, approval status and delivery dates.",fields:[
    ["project","Project","project"],["vendor","Supplier / contractor","text"],["description","Scope / item","text"],["amount","Order value","number"],
    ["ordered","Order date","date"],["due","Delivery due date","date"],["status","Status","select","Draft,Pending approval,Approved,Ordered,Part delivered,Delivered,Closed,Cancelled"],["invoiceRef","Invoice / PO reference","text"]
  ],cols:[["id","PO ID"],["project","Project"],["vendor","Supplier"],["description","Description"],["amount","Order value","money"],["ordered","Order date"],["due","Delivery due"],["status","Status"]]},
  "Risks & Issues": {key:"risks",title:"Risks & Issues",desc:"Risk scoring, issue ownership, mitigation actions and due dates.",fields:[
    ["project","Project","project"],["title","Risk / issue","text"],["category","Category","select","Regulatory,Land/title,Commercial,Construction,Environmental,Health & safety,Finance,Sales,Utilities,Other"],
    ["probability","Probability (1–5)","number"],["impact","Impact (1–5)","number"],["owner","Owner","text"],["due","Due date","date"],
    ["status","Status","select","Open,Monitoring,Mitigating,Escalated,Closed"],["response","Mitigation / response","textarea"]
  ],cols:[["id","ID"],["project","Project"],["title","Risk / issue"],["category","Category"],["probability","Probability"],["impact","Impact"],["score","Score"],["owner","Owner"],["due","Due date"],["status","Status"]]},
  "Documents & Permits": {key:"documents",title:"Documents & Permits",desc:"Track permits, plans, contracts, title references, expiry dates and file uploads.",fields:[
    ["project","Project","project"],["title","Document / permit","text"],["type","Type","select","Title,Permit,Plan,Contract,Invoice,Insurance,Environmental,Engineering,Health & safety,Other"],
    ["reference","Reference / file location","text"],["expiry","Expiry / renewal date","date"],["owner","Responsible owner","text"],
    ["status","Status","select","Draft,Pending,Submitted,Approved,Expired,Verified,Archived"]
  ],cols:[["id","ID"],["project","Project"],["title","Document / permit"],["type","Type"],["reference","Reference"],["expiry","Expiry"],["owner","Owner"],["status","Status"]]},
  "Decisions & Changes": {key:"decisions",title:"Decisions & Changes",desc:"Change requests, approval impact, decision owners and decision log.",fields:[
    ["project","Project","project"],["type","Type","select","Decision,Change request,Action,Approval,Variation"],["title","Description","text"],
    ["owner","Raised by / owner","text"],["date","Date raised","date"],["impact","Cost / schedule impact","text"],["status","Status","select","Open,Under review,Approved,Rejected,Closed"]
  ],cols:[["id","ID"],["project","Project"],["type","Type"],["title","Decision / change"],["owner","Owner"],["date","Raised"],["impact","Impact"],["status","Status"]]},
  "Customers & Buyers": {key:"customers",title:"Customers & Buyers",desc:"Lead, buyer and customer follow-up register. Keep personal data to the minimum required.",fields:[
    ["name","Customer name","text"],["phone","Phone","text"],["email","Email","email"],["project","Interested project","project"],
    ["plotId","Plot reference","text"],["source","Lead source","select","Referral,Website,Agent,Walk-in,Social media,Other"],["stage","Sales stage","select","New lead,Contacted,Qualified,Reserved,Contracted,Won,Lost"],["nextAction","Next action","text"],["nextDate","Follow-up date","date"]
  ],cols:[["id","ID"],["name","Customer"],["phone","Phone"],["project","Project"],["plotId","Plot"],["source","Source"],["stage","Stage"],["nextDate","Follow-up"]]},
   "Invoices & Payments": {key:"invoices",title:"Invoices & Payments",desc:"Invoice register, receivables and payment follow-up. Reconcile with the accounting ledger.",fields:[
    ["project","Project","project"],["type","Type","select","Customer invoice,Supplier invoice,Credit note"],["reference","Invoice reference","text"],["counterparty","Customer / supplier","text"],
    ["issueDate","Issue date","date"],["due","Due date","date"],["amount","Invoice amount","number"],["paid","Amount paid","number"],
    ["status","Status","select","Draft,Issued,Part paid,Paid,Overdue,Disputed"],["notes","Notes","text"]
  ],cols:[["id","ID"],["project","Project"],["type","Type"],["reference","Reference"],["counterparty","Counterparty"],["due","Due date"],["amount","Amount","money"],["paid","Paid","money"],["balance","Balance","money"],["status","Status"]]},
  "Site Reports": {key:"siteReports",title:"Site Reports",desc:"Daily/weekly progress, inspections, weather, safety and photographic evidence.",fields:[
    ["project","Project","project"],["reportDate","Report date","date"],["author","Prepared by","text"],["weather","Weather / site conditions","text"],
    ["workCompleted","Work completed","textarea"],["labour","Labour / equipment","text"],["safety","Safety incidents / observations","textarea"],
    ["quality","Quality / defects","textarea"],["blockers","Blockers / instructions","textarea"],["status","Review status","select","Draft,Submitted,Reviewed,Action required"]
  ],cols:[["id","ID"],["project","Project"],["reportDate","Date"],["author","Prepared by"],["workCompleted","Work completed"],["safety","Safety"],["status","Status"]]},
  "Payments": {key:"payments",title:"Payments",desc:"Track cash receipts and disbursements for reconciliation with bank and accounting records.",fields:[
    ["project","Project","project"],["direction","Direction","select","Receipt,Payment"],["date","Transaction date","date"],["reference","Receipt / bank reference","text"],
    ["counterparty","Customer / supplier","text"],["category","Category","select","Plot deposit,Plot instalment,Land purchase,Contractor payment,Professional fee,Utilities,Payroll,Tax,Loan drawdown,Equity contribution,Other"],
    ["amount","Amount","number"],["method","Method","select","Bank transfer,Cash,Mobile money,Card,Other"],["status","Status","select","Pending,Reconciled,Disputed,Cancelled"],["notes","Notes","text"]
  ],cols:[["id","ID"],["project","Project"],["direction","Direction"],["date","Date"],["reference","Reference"],["counterparty","Counterparty"],["category","Category"],["amount","Amount","money"],["method","Method"],["status","Status"]]},
  "Leave Requests": {key:"leaveRequests",title:"Leave Requests",desc:"Employee leave applications and approval tracking. HR access should be restricted.",fields:[
    ["employeeCode","Employee ID","text"],["employeeName","Employee name","text"],["type","Leave type","select","Annual,Sick,Family,Unpaid,Other"],
    ["start","Start date","date"],["end","End date","date"],["days","Working days","number"],["reason","Reason","textarea"],
    ["status","Status","select","Pending,Approved,Rejected,Cancelled"],["approver","Approver","text"]
  ],cols:[["id","ID"],["employeeCode","Employee ID"],["employeeName","Employee"],["type","Leave type"],["start","Start"],["end","End"],["days","Days"],["status","Status"]]}
};
