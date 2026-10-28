/* ---------- planning engine ---------- */
const netHours=m=>(+m.shifts||0)*(+m.hours||0)*(+m.eff||0);
const hasRobot=m=>!!m&&(m.robot===true||m.robot==="Var");
function workDays(start,count,sat){const out=[];const d=parseISO(start);while(out.length<count){const w=d.getDay();if(w!==0&&(sat||w!==6))out.push(new Date(d));d.setDate(d.getDate()+1)}return out}
function compute(){
  const st=S.settings, start=st.start||today();
  const mbr=k=>(+k.mb>0)?+k.mb:(String(k.mbCode||"").trim()?(st.mbDefault==null?0.02:+st.mbDefault):0);
  const prod={};const excl=String(st.exclude||"").split(/[,;\s]+/).filter(Boolean).map(x=>x.toUpperCase());
  for(const o of S.orders){if(excl.some(p=>String(o.product).toUpperCase().startsWith(p)))continue;
    const q=Math.ceil((+o.qty||0)*(1+(+o.extra||0)));if(!prod[o.product])prod[o.product]={gross:0,qty:0,due:null,stock:0};const P=prod[o.product];P.gross+=q;
    if(o.stock!==""&&o.stock!=null)P.stock=Math.max(P.stock,+o.stock||0);
    if(o.due&&(!P.due||o.due<P.due))P.due=o.due}
  for(const P of Object.values(prod))P.qty=st.useStock===false?P.gross:Math.max(0,P.gross-P.stock);
  // multi-level recipe explosion: semi-finished parts go to molding (or further down), everything else is bought
  const parts={},buy={},bomBy={};S.bom.forEach(b=>{(bomBy[b.product]=bomBy[b.product]||[]).push(b)});
  const molded=new Set(S.molds.map(k=>k.part));
  const put=(tgt,b,n,due,root)=>{const e=tgt[b.part]=tgt[b.part]||{need:0,due:null,products:new Set(),byProd:{},cat:catOf(b),unit:b.unit||defUnit(b),name:b.name||""};
    e.need+=n;e.products.add(root);e.byProd[root]=(e.byProd[root]||0)+n;if(due&&(!e.due||due<e.due))e.due=due};
  const explode=(pc,qty,due,root,depth)=>{for(const b of bomBy[pc]||[]){const n=qty*(+b.qty||0)*(1+(+b.scrap||0));if(!(n>0))continue;
    if(isProd(b)){if(molded.has(b.part)||!bomBy[b.part])put(parts,b,n,due,root);if(bomBy[b.part]&&depth<6)explode(b.part,n,due,root,depth+1)}
    else put(buy,b,n,due,root)}};
  for(const [pc,p] of Object.entries(prod)){if(p.qty&&bomBy[pc])explode(pc,p.qty,p.due,pc,0)}
  const bomProducts=new Set(S.bom.map(b=>b.product));const unmatched=[];let autoLinked=0;
  const addPart=(pc,part,n,due)=>{if(!parts[part])parts[part]={need:0,due:null,products:new Set()};parts[part].need+=n;parts[part].products.add(pc);if(due&&(!parts[part].due||due<parts[part].due))parts[part].due=due};
  for(const [pc,p] of Object.entries(prod)){if(bomProducts.has(pc)||!p.qty)continue;
    if(S.molds.some(k=>k.part===pc)){addPart(pc,pc,p.qty,p.due);continue}
    if(st.autoBom!==false){const re=new RegExp("^"+String(pc).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"-\\d+$");const subs=[...new Set(S.molds.filter(k=>re.test(k.part)).map(k=>k.part))];
      if(subs.length){subs.forEach(s=>addPart(pc,s,p.qty,p.due));autoLinked++;continue}}
    unmatched.push(pc)}
  const mByCode={};S.machines.forEach(m=>mByCode[m.code]=m);
  const jobs=[];const missing=[];
  for(const [part,v] of Object.entries(parts)){
    const mold=S.molds.find(k=>k.part===part);
    if(!mold){missing.push(part);continue}
    const rate=(+mold.cycle>0)?3600/(+mold.cycle)*(+mold.cav||1):0;
    const hrs=rate?v.need/rate:0; const gPer=(+mold.partG||0)+(+mold.runnerG||0)/(+mold.cav||1);
    const kg=v.need*gPer/1000;
    jobs.push({part,key:part,mold,need:v.need,due:v.due,products:[...v.products],rate,hrs,mat:mold.mat,kgMain:kg*(1-mbr(mold)),kgMb:kg*mbr(mold),needR:mold.mode==="Robotlu",listed:(mold.machines||[]).filter(c=>mByCode[c])});
    const jj=jobs[jobs.length-1];jj.compat=jj.listed.filter(c=>!jj.needR||hasRobot(mByCode[c]));
  }
  // family molds: parts from one mold are pressed together as one job
  const fam=S.family||{};const byCode={};jobs.forEach(j=>{const c=String(j.mold.code);if(fam[c])(byCode[c]=byCode[c]||[]).push(j)});
  for(const [c,g] of Object.entries(byCode)){if(g.length<2)continue;const f=g[0];
    let inter=f.compat.filter(x=>g.every(j=>j.compat.includes(x)));if(!inter.length)inter=[...new Set(g.flatMap(j=>j.compat))];
    const mj={...f,part:g.map(j=>j.part).join(" + "),key:"FAM:"+c,family:true,members:g.map(j=>({part:j.part,need:j.need,rate:j.rate})),
      need:Math.max(...g.map(j=>j.need)),hrs:Math.max(...g.map(j=>j.hrs)),kgMain:g.reduce((a,j)=>a+j.kgMain,0),kgMb:g.reduce((a,j)=>a+j.kgMb,0),
      due:g.map(j=>j.due).filter(Boolean).sort()[0]||null,products:[...new Set(g.flatMap(j=>j.products))],needR:g.some(j=>j.needR),compat:inter,listed:[...new Set(g.flatMap(j=>j.listed))]};
    for(const j of g)jobs.splice(jobs.indexOf(j),1);jobs.push(mj)}
  jobs.sort((a,b)=>(a.due||"9").localeCompare(b.due||"9")||b.hrs-a.hrs);
  const load={},mats={};S.machines.forEach(m=>{load[m.code]=0;mats[m.code]=new Set()});
  const co=+st.changeover||0, H=+st.horizon||22, bonus=+st.bonus||0, robotPay=st.robotPay==null?1:(+st.robotPay||0);
  // jobs already running on a machine: locked first on that machine
  const runs=[];
  for(const m of S.machines){const rp=String(m.rPart||"").trim();if(!rp)continue;
    const mold=S.molds.find(k=>k.part===rp);if(!mold)continue;
    const rate=(+mold.cycle>0)?3600/(+mold.cycle)*(+mold.cav||1):0;if(!rate)continue;
    const ji=jobs.findIndex(j=>j.part===rp||(j.members&&j.members.some(x=>x.part===rp)));const job=ji>=0?jobs[ji]:null;const rem=+m.rRemain>0?+m.rRemain:0;let qty=rem,famHrs=null;
    if(job){const mn=job.members?job.members.find(x=>x.part===rp).need:job.need;
      if(rem>0&&rem<mn){const f=(mn-rem)/mn;job.need*=f;job.hrs*=f;job.kgMain*=f;job.kgMb*=f;if(job.members)job.members.forEach(x=>x.need*=f)}
      else{qty=Math.max(rem,mn);if(job.members)famHrs=Math.max(job.hrs,rem/rate);jobs.splice(ji,1)}}
    if(!qty)continue;
    const gPer=(+mold.partG||0)+(+mold.runnerG||0)/(+mold.cav||1),kg=qty*gPer/1000;
    runs.push({part:rp,key:"RUN:"+m.code,mold,need:qty,due:job?job.due:null,products:job?job.products:[],rate,hrs:famHrs??qty/rate,mat:mold.mat,kgMain:kg*(1-mbr(mold)),kgMb:kg*mbr(mold),needR:mold.mode==="Robotlu",listed:[m.code],compat:[m.code],running:true,machine:m.code,suggested:m.code,compatible:true,override:false});
    load[m.code]+=famHrs??qty/rate;mats[m.code].add(mold.mat)}
  for(const j of jobs){
    let best=null,bestScore=Infinity;
    for(const c of j.compat){const m=mByCode[c],n=netHours(m);if(!n)continue;
      const l=load[c]/n, add=(j.hrs+(load[c]>0?co:0))/n;
      const sc=l-(mats[c].has(j.mat)?bonus:0)+(l+add>H?1000:0)+(!j.needR&&hasRobot(m)?robotPay:0);
      if(sc<bestScore){bestScore=sc;best=c}}
    j.suggested=best;
    const ov=S.overrides[j.key];
    j.machine=(ov&&mByCode[ov])?ov:best; j.override=!!(ov&&mByCode[ov]);
    j.compatible=j.machine?j.compat.includes(j.machine):false;
    if(j.machine){load[j.machine]+=j.hrs+(load[j.machine]>0?co:0);mats[j.machine].add(j.mat)}
  }
  jobs.unshift(...runs);
  // sequence per machine: group same material while respecting due order
  const lanes={};S.machines.forEach(m=>lanes[m.code]=[]);
  const seq=S.seq||{},splits=S.splits||{};
  jobs.filter(j=>j.machine).forEach(j=>{j.endH=0;const sp=+splits[j.key];
    if(sp>0&&sp<j.need){const a=Object.create(j);a.job=j;a.sid=j.key+"#1";a.segNo=1;a.need=sp;a.hrs=j.hrs*sp/j.need;
      const b=Object.create(j);b.job=j;b.sid=j.key+"#2";b.segNo=2;b.need=j.need-sp;b.hrs=j.hrs-a.hrs;lanes[j.machine].push(a,b)}
    else{const a=Object.create(j);a.job=j;a.sid=j.key;a.segNo=0;lanes[j.machine].push(a)}});
  const maxDays=[];
  for(const m of S.machines){const lane=lanes[m.code];const ord=seq[m.code]||[];
    const pos=s=>{if(s.running&&s.segNo!==2)return -1;const i=ord.indexOf(s.sid);return i<0?1e6:i};
    lane.sort((a,b)=>pos(a)-pos(b)||(a.due||"9").localeCompare(b.due||"9")||a.segNo-b.segNo)}
  // schedule all machines in time order so one mold is never on two machines at once
  // time base: 1 unit = one working day of a machine (shifts × hours, starting at shift start); production runs at efficiency
  const shiftH=(()=>{const [a,b]=String(st.shiftStart||"08:00").split(":").map(Number);return (a||0)+(b||0)/60})();
  const now=new Date(),nowH=now.getHours()+now.getMinutes()/60,startNow=!st.start;
  const isWork=d=>{const w=d.getDay();return w!==0&&(st.saturday||w!==6)};
  const dayLenOf=m=>(+m.shifts||0)*(+m.hours||0);
  const offOf=m=>{const L=dayLenOf(m);if(!startNow||!L||!isWork(now))return 0;return Math.min(1,Math.max(0,(nowH-shiftH)/L))};
  const busy={},waits=[];
  const stt=S.machines.map(m=>{const off=offOf(m);m._off=off;return{m,n:netHours(m),L:dayLenOf(m),lane:lanes[m.code],i:0,t:off,off}});
  for(;;){let p=null;for(const x of stt){if(!x.n||x.i>=x.lane.length)continue;if(!p||x.t<p.t)p=x}if(!p)break;
    const s=p.lane[p.i],n=p.n,L=p.L,coD=p.i>0?co/L:0,dur=s.hrs/n,mk=String(s.mold.code);const base=p.t+coD;let start=base,moved=true,by=null;
    const iv=(busy[mk]||[]).filter(x=>x[2]!==p.m.code).sort((a,b)=>a[0]-b[0]);
    while(moved){moved=false;for(const x of iv){if(start<x[1]-1e-9&&start+dur>x[0]+1e-9){start=x[1];by=x[2];moved=true}}}
    s.wait=(start-base)*L;s.waitBy=by;if(s.wait>0.05)waits.push(s);
    s.coA=p.i>0?start-coD:null;s.startA=start;s.endA=start+dur;s.L=L;s.net=n;
    s.coStart=p.i>0?(start-coD-p.off)*n:null;s.startH=(start-p.off)*n;s.endH=(start+dur-p.off)*n;
    s.job.net=n;s.job.L=L;s.job.endA=Math.max(s.job.endA||0,start+dur);
    (busy[mk]=busy[mk]||[]).push([start,start+dur,p.m.code]);p.t=start+dur;p.i++}
  for(const x of stt){const m=x.m;m._load=(x.t-x.off)*x.n;m._days=x.t-x.off;m._util=H?m._days/H:0;m._jobs=x.lane.length;maxDays.push(x.t)}
  const span=Math.max(H,Math.ceil(Math.max(0,...maxDays)));
  const days=workDays(start,span+1,!!st.saturday);
  const dayOf=(h,n)=>days[Math.min(days.length-1,Math.max(0,Math.ceil(h/n)-1))];
  const dtAt=(a,L,isEnd)=>{let i=Math.floor(a+1e-9),f=a-i;if(isEnd&&f<1e-6&&i>0){i-=1;f=1}if(f<0)f=0;const d=new Date(days[Math.min(days.length-1,Math.max(0,i))]);d.setHours(0,0,0,0);return new Date(d.getTime()+(shiftH+f*L)*3600000)};
  for(const j of jobs){
    if(!j.machine){j.status=j.needR&&j.listed.length?"Robotlu makine yok":"Makine yok";j.level="bad";continue}
    if(!j.L||j.endA==null){j.status="Makine kapasitesi 0";j.level="bad";continue}
    j.end=dtAt(j.endA,j.L,true);j.endIso=iso(j.end);
    if(!j.compatible){j.status=(j.needR&&j.listed.includes(j.machine))?"Robot gerekli":"Uyumsuz makine";j.level="bad"}
    else if(j.due&&j.endIso>j.due){j.status="Gecikme riski";j.level="warn"}
    else{j.status="Termine yetişir";j.level="ok"}
  }
  for(const m of S.machines)for(const s of lanes[m.code]){if(!s.L||s.startA==null){s.end=null;s.startDT=null;s.endIso="";continue}
    s.startDT=dtAt(s.startA,s.L);s.end=dtAt(s.endA,s.L,true);s.endIso=iso(s.end);if(!s.job.startDT||s.startDT<s.job.startDT)s.job.startDT=s.startDT}
  const matTot={};jobs.forEach(j=>{if(!matTot[j.mat])matTot[j.mat]={main:0,mb:0,parts:0};matTot[j.mat].main+=j.kgMain;matTot[j.mat].mb+=j.kgMb;matTot[j.mat].parts++});
  const out={jobs,lanes,days,span,start,buy,missing,matTot,prod,unmatched,autoLinked,waits};out.mrp=mrp(out);return out;
}

