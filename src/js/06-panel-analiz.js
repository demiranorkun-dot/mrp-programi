/* ==================== YÖNETİM PANELİ · analiz modülleri ====================
   Saf fonksiyonlar: yalnızca S (kayıtlar) ve R (compute() sonucu) okur, hiçbir şey yazmaz.
   Eksik veri asla 0 ya da tahminle doldurulmaz: hesaplanamayan değer null döner. */
const Dash={
  parseF(F){F=F||{};return{from:F.from||"",to:F.to||"",machine:F.machine||"",product:String(F.product||"").trim()}},
  inRange(d,f){if(!f.from&&!f.to)return true;if(!d)return false;d=String(d).slice(0,10);return(!f.from||d>=f.from)&&(!f.to||d<=f.to)},
  prodMatch(code,p){if(!p)return true;code=String(code||"").trim();return code===p||(p.endsWith("-")&&code.startsWith(p))},
  // parça -> hangi mamullerde kullanıldığı (plan + çok seviyeli reçete)
  partProducts(S,R){const m={};const add=(part,p)=>{(m[part]=m[part]||new Set()).add(p)};
    (R.jobs||[]).forEach(j=>(j.members||[{part:j.part}]).forEach(x=>(j.products||[]).forEach(p=>add(x.part,p))));
    const by={};S.bom.forEach(b=>{(by[b.part]=by[b.part]||[]).push(b.product)});
    const up=(part,seen)=>{const out=new Set();for(const p of by[part]||[]){if(seen.has(p))continue;seen.add(p);out.add(p);up(p,seen).forEach(x=>out.add(x))}return out};
    Object.keys(by).forEach(part=>up(part,new Set()).forEach(p=>add(part,p)));return m},
  partMatch(pp,part,p){if(!p)return true;if(Dash.prodMatch(part,p))return true;const s=pp[part];if(s)for(const x of s)if(Dash.prodMatch(x,p))return true;
    const base=String(part||"").replace(/-\d+$/,"");return base!==part&&Dash.prodMatch(base,p)},
  dueEst(o,lead){if(o.dueEst)return true;if(!o.orderDate||!o.due)return false;return Math.round((parseISO(o.due)-parseISO(o.orderDate))/864e5)===lead},
  weekStart(d){const x=parseISO(d);x.setDate(x.getDate()-(x.getDay()+6)%7);return iso(x)},
  workdays(from,to,sat){let n=0;const d=parseISO(from),e=parseISO(to);while(d<=e){const w=d.getDay();if(w!==0&&(sat||w!==6))n++;d.setDate(d.getDate()+1)}return n},

  /* açık siparişler: miktar, termin haftası, yaşlanma, mamul bazında net ihtiyaç */
  orders(S,f,t0){const lead=S.settings.leadDays==null?30:+S.settings.leadDays;
    const L=S.orders.filter(o=>Dash.prodMatch(o.product,f.product)&&Dash.inRange(o.due,f));
    const byP={},byW={},cust=new Set();let qty=0,est=0,overdue=0,overQty=0,agingN=0;const aging={"0–30 gün":0,"31–60 gün":0,"61–90 gün":0,"90+ gün":0};
    for(const o of L){const q=+o.qty||0;qty+=q;if(o.customer)cust.add(String(o.customer).trim());if(Dash.dueEst(o,lead))est++;
      const P=byP[o.product]=byP[o.product]||{code:o.product,qty:0,lines:0,stock:null,oldest:null,due:null};P.qty+=q;P.lines++;
      if(o.stock!==""&&o.stock!=null&&!isNaN(+o.stock))P.stock=Math.max(P.stock??0,+o.stock);
      if(o.orderDate&&(!P.oldest||o.orderDate<P.oldest))P.oldest=o.orderDate;if(o.due&&(!P.due||o.due<P.due))P.due=o.due;
      const late=!!o.due&&o.due<t0;if(late){overdue++;overQty+=q}
      const wk=!o.due?"none":late?"late":Dash.weekStart(o.due);byW[wk]=(byW[wk]||0)+q;
      if(o.orderDate){agingN++;const a=Math.floor((parseISO(t0)-parseISO(o.orderDate))/864e5);aging[a<=30?"0–30 gün":a<=60?"31–60 gün":a<=90?"61–90 gün":"90+ gün"]+=q}}
    const prods=Object.values(byP).map(p=>({...p,net:p.stock==null?null:Math.max(0,p.qty-p.stock)}));
    const net=prods.reduce((a,p)=>a+(p.net??0),0),netUnknown=prods.filter(p=>p.net==null).length;
    const weeks=Object.keys(byW).filter(k=>k!=="late"&&k!=="none").sort();
    const buckets=[...(byW.late?[{key:"late",label:"Gecikmiş",short:"Gecikmiş",qty:byW.late,late:true}]:[]),
      ...weeks.map(w=>({key:w,label:`${fmtD(w)} haftası`,short:fmtDs(parseISO(w)),qty:byW[w]})),...(byW.none?[{key:"none",label:"Terminsiz",short:"Yok",qty:byW.none}]:[])];
    return{lines:L.length,qty,customers:cust.size,products:prods.length,prods,net,netUnknown,est,overdue,overQty,buckets,aging,agingN}},

  /* üretim gerçekleşmeleri: yalnızca Üretim Girişi kayıtları */
  production(S,f,pp){const recs=(S.production||[]).filter(r=>Dash.inRange(r.date,f)&&(!f.machine||r.machine===f.machine)&&Dash.partMatch(pp,r.part,f.product));
    const T={good:0,scrap:0};const byDay={},byM={},byR={};
    for(const r of recs){const g=+r.good||0,s=+r.scrap||0;T.good+=g;T.scrap+=s;
      const D=byDay[r.date]=byDay[r.date]||{good:0,scrap:0};D.good+=g;D.scrap+=s;(byM[r.machine]=byM[r.machine]||[]).push(r);
      if(+r.downH>0){const k=String(r.reason||"").trim()||"Neden girilmemiş";byR[k]=(byR[k]||0)+(+r.downH)}}
    T.scrapRate=T.good+T.scrap>0?T.scrap/(T.good+T.scrap):null;
    return{recs,T,days:Object.keys(byDay).sort().map(d=>({date:d,...byDay[d]})),byM,reasons:Object.entries(byR).sort((a,b)=>b[1]-a[1])}},
  /* OEE = Kullanılabilirlik × Performans × Kalite. Gerekli alan boşsa bileşen null kalır. */
  oee(S,recs){const molds={};S.molds.forEach(k=>{if(!molds[k.part])molds[k.part]=k});
    let run=0,down=0,runN=0,downN=0,ideal=0,idealN=0,good=0,scrap=0;
    for(const r of recs){const g=+r.good||0,s=+r.scrap||0;good+=g;scrap+=s;const hasRun=r.runH!==""&&r.runH!=null&&!isNaN(+r.runH);
      if(hasRun){run+=+r.runH;runN++}if(r.downH!==""&&r.downH!=null&&!isNaN(+r.downH)){down+=+r.downH;downN++}
      const k=molds[r.part];if(hasRun&&k&&+k.cycle>0&&+k.cav>0){ideal+=(g+s)*(+k.cycle)/(+k.cav)/3600;idealN++}}
    const n=recs.length;const A=n&&runN===n&&downN===n&&run+down>0?run/(run+down):null;
    const P=n&&idealN===n&&run>0?ideal/run:null;const Q=good+scrap>0?good/(good+scrap):null;
    const why=[];if(n&&(runN<n||downN<n))why.push(`${n-Math.min(runN,downN)} kayıtta çalışma/duruş süresi boş`);if(n&&idealN<n)why.push(`${n-idealN} kayıtta çevrim süresi bulunamadı`);
    return{A,P,Q,OEE:A!=null&&P!=null&&Q!=null?A*P*Q:null,run,down,good,scrap,n,why}},

  /* makine plan yükü: takvimdeki iş saatleri, seçili tarih aralığına kırpılmış */
  machinePlan(S,R,f,pp,t0){const H=+S.settings.horizon||22;const fromT=f.from?parseISO(f.from).getTime():null,toT=f.to?parseISO(f.to).getTime()+864e5:null;
    const endH=iso(R.days[Math.min(R.days.length-1,H-1)]||new Date());const days=(f.from||f.to)?Dash.workdays(f.from||t0,f.to||endH,!!S.settings.saturday):H;
    return S.machines.filter(m=>!f.machine||m.code===f.machine).map(m=>{let load=0,jobs=0;
      for(const s of R.lanes[m.code]||[]){if(!s.startDT||!s.end)continue;const parts=s.members?s.members.map(x=>x.part):[s.part];
        if(f.product&&!parts.some(p=>Dash.partMatch(pp,p,f.product))&&!(s.products||[]).some(p=>Dash.prodMatch(p,f.product)))continue;
        const a=s.startDT.getTime(),b=s.end.getTime(),lo=fromT==null?a:Math.max(a,fromT),hi=toT==null?b:Math.min(b,toT);if(hi<=lo)continue;
        load+=s.hrs*(b>a?(hi-lo)/(b-a):1);jobs++}
      const cap=netHours(m)*days;return{code:m.code,ton:m.ton,robot:hasRobot(m),load,cap,util:cap>0?load/cap:null,jobs,hourCost:m.hourCost===""||m.hourCost==null||isNaN(+m.hourCost)?null:+m.hourCost}})},

  /* kritik stok: MRP satırları, filtreye göre o dönemdeki/makinedeki/üründeki tüketim */
  stock(R,f){const anyF=f.from||f.to||f.machine||f.product;
    return R.mrp.rows.map(r=>{let g=0;for(const it of r.items){if(!Dash.inRange(it.date,f))continue;const ref=it.ref||{};
        if(ref.seg){if(f.machine&&ref.m!==f.machine)continue;if(f.product&&!(ref.seg.products||[]).some(p=>Dash.prodMatch(p,f.product)))continue}
        else{if(f.machine)continue;if(f.product&&!Dash.prodMatch(ref.product,f.product))continue}g+=it.qty}
      return{...r,fGross:anyF?g:r.gross}}).filter(r=>r.fGross>0)},

  /* standart maliyet: parça = hammadde + boya + makine saati; mamul = reçete toplamı. Eksik kalem varsa toplam verilmez. */
  cost(S,R){const st=S.settings,mats={};(S.materials||[]).forEach(m=>{mats[String(m.code).trim()]=m});
    const price=c=>{const m=mats[String(c||"").trim()];return m&&m.price!==""&&m.price!=null&&!isNaN(+m.price)?+m.price:null};
    const mach={};S.machines.forEach(m=>mach[m.code]=m);const jobM={};(R.jobs||[]).forEach(j=>(j.members||[{part:j.part}]).forEach(x=>{if(j.machine)jobM[x.part]=j.machine}));
    const moldOf={};S.molds.forEach(k=>{if(!moldOf[k.part])moldOf[k.part]=k});const mbDef=st.mbDefault==null?0.02:+st.mbDefault;
    const partCost=part=>{const k=moldOf[part];if(!k)return{mat:null,mach:null,miss:["kalıp kaydı"]};const miss=[];let mat=null,machC=null;
      const gPer=(+k.partG||0)+(+k.runnerG||0)/(+k.cav||1),mbC=String(k.mbCode||"").trim(),mb=(+k.mb>0)?+k.mb:(mbC?mbDef:0);
      if(!(+k.partG>0))miss.push("gramaj");else{const pm=price(k.mat);if(pm==null)miss.push(`${k.mat||"hammadde"} fiyatı`);else{mat=gPer/1000*(1-mb)*pm;
        if(mbC){const pb=price(mbC);if(pb==null){miss.push(`${mbC} fiyatı`);mat=null}else mat+=gPer/1000*mb*pb}}}
      const mc=jobM[part]||(k.machines||[])[0],m=mach[mc];
      if(!m||m.hourCost===""||m.hourCost==null||isNaN(+m.hourCost))miss.push(`${mc||"makine"} saat maliyeti`);else if(!(+k.cycle>0&&+k.cav>0))miss.push("çevrim/göz");
      else machC=(+k.cycle)/(+k.cav)/3600/((+m.eff)||1)*(+m.hourCost);return{mat,mach:machC,miss,machine:mc}};
    const bomBy={};S.bom.forEach(b=>{(bomBy[b.product]=bomBy[b.product]||[]).push(b)});const memo={};
    const linesOf=p=>{if(bomBy[p])return bomBy[p];if(moldOf[p])return[{part:p,qty:1,cat:"Yarı mamul"}];
      if(st.autoBom!==false){const re=new RegExp("^"+String(p).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"-\\d+$");const subs=[...new Set(S.molds.filter(k=>re.test(k.part)).map(k=>k.part))];if(subs.length)return subs.map(s=>({part:s,qty:1,cat:"Yarı mamul"}))}return null};
    const prodCost=(p,depth)=>{if(memo[p])return memo[p];const o={mat:0,mach:0,buy:0,miss:new Set()};memo[p]=o;const lines=linesOf(p);
      if(!lines){o.miss.add("reçete");return o}
      for(const b of lines){const q=(+b.qty||0)*(1+(+b.scrap||0));
        if(isProd(b)){if(moldOf[b.part]){const c=partCost(b.part);c.miss.forEach(x=>o.miss.add(x));if(c.mat!=null)o.mat+=c.mat*q;if(c.mach!=null)o.mach+=c.mach*q}
          else if(bomBy[b.part]&&depth<6){const c=prodCost(b.part,depth+1);o.mat+=c.mat*q;o.mach+=c.mach*q;o.buy+=c.buy*q;c.miss.forEach(x=>o.miss.add(x))}
          else o.miss.add(`${b.part} kalıp/reçete`)}
        else{const pr=price(b.part);if(pr==null)o.miss.add(`${b.part} fiyatı`);else o.buy+=pr*q*((b.unit||"")==="gr"?0.001:1)}}
      return o};
    const products=Object.entries(R.prod).filter(([,P])=>P.qty>0).map(([code,P])=>{const c=prodCost(code,0);const ok=c.miss.size===0;const unit=c.mat+c.mach+c.buy;
      return{code,need:P.qty,mat:c.mat,mach:c.mach,buy:c.buy,unit:ok?unit:null,total:ok?unit*P.qty:null,miss:[...c.miss]}});
    const buyRows=R.mrp.rows.filter(r=>r.order>0).map(r=>({code:r.code,type:r.type,unit:r.unit,order:r.order,price:price(r.code),value:price(r.code)==null?null:price(r.code)*r.order}));
    return{products,buyRows,price}},

  /* veri eksikleri raporu */
  gaps(S,R){const G=[];const add=(sev,title,detail,have,total,fix)=>G.push({sev,title,detail,have,total,fix});
    const pr=(S.production||[]).length;
    add(pr?"ok":"bad","Üretim gerçekleşmeleri",pr?`${pr} kayıt var.`:"Hiç üretim kaydı yok. Gerçekleşen üretim, fire ve makine verimi (OEE) hesaplanamıyor.",pr,null,"uretim");
    if(pr){const o=Dash.oee(S,S.production);if(o.why.length)add("warn","Üretim kayıtlarında boş alan",o.why.join(" · ")+". Bu kayıtlar OEE'ye girmez.",null,null,"uretim")}
    const nm=S.molds.length,noW=S.molds.filter(k=>!(+k.partG>0)).length;
    add(!nm?"bad":noW===nm?"bad":noW?"warn":"ok","Parça gramajı",noW?`${noW} kalıpta parça gramajı yok. Bu parçaların hammadde ihtiyacı ve maliyeti hesaplanamıyor.`:"Tüm kalıplarda gramaj var.",nm-noW,nm,"kaliplar");
    const needP=Object.values(R.prod).filter(p=>p.qty>0).length;
    add(R.unmatched.length?"warn":"ok","Mamul reçetesi",R.unmatched.length?`İhtiyacı olan ${R.unmatched.length} mamul kalıba bağlanamıyor; plana, MRP'ye ve maliyete girmiyor.`:"İhtiyacı olan tüm mamuller kalıba bağlı.",needP-R.unmatched.length,needP,"agac");
    if((R.bomCycles||[]).length)add("bad","Ürün ağacında döngü",`${R.bomCycles.length} mamulün reçetesi kendine geri dönüyor (${R.bomCycles.slice(0,5).map(c=>c.path.join(" › ")).join("; ")}). Bu mamuller plana ve MRP'ye girmiyor.`,null,null,"agac");
    const rows=R.mrp.rows,noCard=rows.filter(r=>!r.hasCard).length;
    if(rows.length)add(noCard?"warn":"ok","Malzeme stok kartları",noCard?`MRP'de geçen ${noCard} malzemenin stok kartı yok; stokları 0 sayılıyor.`:"MRP'deki tüm malzemelerin stok kartı var.",rows.length-noCard,rows.length,"malzemeler");
    const mats={};(S.materials||[]).forEach(m=>mats[String(m.code).trim()]=m);const codes=[...new Set([...rows.map(r=>r.code),...S.molds.map(k=>String(k.mat||"").trim()).filter(Boolean)])];
    const noPrice=codes.filter(c=>{const m=mats[c];return!m||m.price===""||m.price==null||isNaN(+m.price)}).length;
    if(codes.length)add(noPrice===codes.length?"bad":noPrice?"warn":"ok","Malzeme birim fiyatı",noPrice?`${noPrice} malzemenin fiyatı yok. Maliyet analizi bu kalemler için yapılamıyor.`:"Tüm malzemelerin fiyatı var.",codes.length-noPrice,codes.length,"malzemeler");
    const noHC=S.machines.filter(m=>m.hourCost===""||m.hourCost==null||isNaN(+m.hourCost)).length;
    add(noHC===S.machines.length?"bad":noHC?"warn":"ok","Makine saat maliyeti",noHC?`${noHC} makinenin saat maliyeti yok. Makine maliyeti hesaplanamıyor.`:"Tüm makinelerin saat maliyeti var.",S.machines.length-noHC,S.machines.length,"makineler");
    const lead=S.settings.leadDays==null?30:+S.settings.leadDays,est=S.orders.filter(o=>Dash.dueEst(o,lead)).length;
    if(S.orders.length)add(est?"warn":"ok","Sipariş terminleri",est?`${est} siparişin termini gerçek değil; sipariş tarihi + ${lead} gün olarak tahmin edildi. Gecikme ve termin grafikleri tahmindir.`:"Terminler dosyadan geliyor.",S.orders.length-est,S.orders.length,null);
    const def=S.machines.filter(m=>+m.shifts===3&&+m.hours===7.5&&+m.eff===0.85).length;
    if(def)add("info","Makine kapasitesi",`${def} makine varsayılan değerlerde (3 vardiya × 7,5 saat, %85 verim). Gerçek değerler farklıysa doluluk yanlış görünür.`,S.machines.length-def,S.machines.length,"makineler");
    const run=S.machines.filter(m=>String(m.rPart||"").trim()).length;
    if(!run&&S.machines.length)add("info","Makinede çalışan işler","Hiçbir makinede çalışan iş girilmemiş; plan bütün makineler boşmuş gibi başlıyor.",0,S.machines.length,"takvim");
    const rank={bad:0,warn:1,info:2,ok:3};return G.sort((a,b)=>rank[a.sev]-rank[b.sev])}
};

