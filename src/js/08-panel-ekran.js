/* ==================== YÖNETİM PANELİ · ekran ==================== */
const DKEY="planpres-dash";
function dashF(){if(!ui.dash){let v=null;try{v=JSON.parse(localStorage.getItem(DKEY)||"null")}catch(e){}ui.dash=v&&typeof v==="object"?v:{preset:"all",from:"",to:"",machine:"",product:""}}return ui.dash}
function setDashF(p){Object.assign(dashF(),p);try{localStorage.setItem(DKEY,JSON.stringify(ui.dash))}catch(e){}const sy=window.scrollY;render();window.scrollTo(0,sy)}
function presetRange(p,t0){const d=parseISO(t0),add=n=>{const x=new Date(d);x.setDate(x.getDate()+n);return iso(x)};
  if(p==="p7")return{from:add(-6),to:t0};if(p==="p30")return{from:add(-29),to:t0};if(p==="n30")return{from:t0,to:add(30)};
  if(p==="month"){const a=new Date(d.getFullYear(),d.getMonth(),1),b=new Date(d.getFullYear(),d.getMonth()+1,0);return{from:iso(a),to:iso(b)}}return{from:"",to:""}}
const pct1=v=>v==null?"–":nf1.format(v*100)+"%";
const tl=v=>v==null?"–":(Math.abs(v)>=1e5?nf0.format(v):new Intl.NumberFormat("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v))+" TL";
function emptyBox(title,detail,fix,fixLabel){return`<div class="ch-empty"><b>${esc(title)}</b><span>${esc(detail)}</span>${fix?`<button class="btn btn-sm" type="button" data-go="${esc(fix)}">${esc(fixLabel||"Veriyi tamamla")}</button>`:""}</div>`}
function dataTable(head,rows){return`<details class="ch-table"><summary>Tabloyu göster</summary><div class="tbl-wrap"><table><thead><tr>${head.map(h=>`<th class="${h.r?"r":""}">${esc(h.l)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${head[i].r?"r num":""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>`}

function vYonetim(R){Chart.specs=[];const t0=today(),F=dashF();
  if(F.preset&&F.preset!=="custom")Object.assign(F,presetRange(F.preset,t0));
  const f=Dash.parseF(F),pp=Dash.partProducts(S,R);
  const O=Dash.orders(S,f,t0),P=Dash.production(S,f,pp),OE=Dash.oee(S,P.recs),MP=Dash.machinePlan(S,R,f,pp,t0),ST=Dash.stock(R,f),C=Dash.cost(S,R),G=Dash.gaps(S,R);
  const goMachine=c=>setDashF({machine:F.machine===c?"":c}),goProduct=c=>setDashF({product:F.product===c?"":c});
  const prods=[...new Set(S.orders.map(o=>o.product))].sort((a,b)=>a.localeCompare(b,"tr",{numeric:true}));
  const groups=[...new Set(prods.map(p=>String(p).includes("-")?String(p).split("-")[0]+"-":"").filter(Boolean))];
  const anyF=f.from||f.to||f.machine||f.product;
  const badG=G.filter(g=>g.sev==="bad").length,warnG=G.filter(g=>g.sev==="warn").length;
  const sevPill={bad:"pill-bad",warn:"pill-warn",info:"pill-info",ok:"pill-ok"},sevTxt={bad:"Eksik",warn:"Kısmi",info:"Bilgi",ok:"Tamam"};

  // KPI'lar
  const loadT=MP.reduce((a,m)=>a+m.load,0),capT=MP.reduce((a,m)=>a+m.cap,0);
  const crit=ST.filter(r=>r.hasCard&&(r.level==="bad"||r.level==="warn")),noCardSt=ST.filter(r=>!r.hasCard).length;
  const cProds=C.products.filter(p=>Dash.prodMatch(p.code,f.product)),cOk=cProds.filter(p=>p.total!=null),cTot=cOk.reduce((a,p)=>a+p.total,0);
  const kpi=(label,val,foot,cls)=>`<div class="kpi ${cls||""}"><span class="kpi-label">${label}</span><span class="kpi-val">${val}</span><span class="kpi-foot">${foot}</span></div>`;

  // 1 · Üretim gerçekleşmeleri
  const sGood={name:"Sağlam",color:COL.c1},sScrap={name:"Fire",color:COL.c2};
  const prodHtml=P.recs.length?`<div class="ch-split"><div class="ch-main">${Chart.legend([sGood,sScrap])}${Chart.slot("vbar",{cats:P.days.map(d=>({key:d.date,label:fmtD(d.date),short:fmtDs(parseISO(d.date))})),series:[{...sGood,values:P.days.map(d=>d.good)},{...sScrap,values:P.days.map(d=>d.scrap)}],unit:" ad"},"Günlük üretim")}</div>
      <div class="oee">${[["OEE",OE.OEE],["Kullanılabilirlik",OE.A],["Performans",OE.P],["Kalite",OE.Q]].map(([l,v],i)=>`<div class="oee-t ${i?"":"oee-main"}"><span>${l}</span><b>${v==null?"Hesaplanamıyor":pct1(v)}</b></div>`).join("")}
        ${OE.why.length?`<div class="hint">${esc(OE.why.join(" · "))}</div>`:""}<div class="hint">Fire oranı ${pct1(P.T.scrapRate)} · çalışma ${nf1.format(OE.run)} sa · duruş ${nf1.format(OE.down)} sa</div></div></div>
      ${P.reasons.length?`<h3 class="ch-sub">Duruş nedenleri (saat)</h3>${Chart.slot("hbar",{rows:P.reasons.slice(0,8).map(([k,v])=>({key:k,label:k,values:[v]})),series:[{name:"Duruş",color:COL.c4}],fmt:v=>nf1.format(v),unit:" sa"},"Duruş nedenleri")}`:""}
      ${dataTable([{l:"Tarih"},{l:"Sağlam",r:1},{l:"Fire",r:1}],P.days.map(d=>[fmtD(d.date),nf0.format(d.good),nf0.format(d.scrap)]))}`
    :emptyBox("Üretim gerçekleşmesi verisi yok",(S.production||[]).length?"Seçili filtrelerde üretim kaydı yok.":"Sistemde hiç üretim kaydı yok. Sahte veri gösterilmez; Üretim Girişi ekranından günlük sağlam/fire adetlerini, çalışma ve duruş sürelerini girin ya da Excel ile yükleyin.",(S.production||[]).length?null:"uretim","Üretim Girişi'ne git");

  // 2 · Makine performansı
  const utilColor=u=>u==null?COL.muted:u>1?COL.bad:u>0.85?COL.warn:COL.c1;
  const mpRows=MP.filter(m=>m.cap>0).sort((a,b)=>(b.util||0)-(a.util||0));
  const mxU=Math.max(1.05,...mpRows.map(m=>m.util||0));
  const oeeByM=Object.entries(P.byM).map(([m,recs])=>({m,o:Dash.oee(S,recs)})).filter(x=>x.o.OEE!=null).sort((a,b)=>b.o.OEE-a.o.OEE);
  const machHtml=(mpRows.length?`<h3 class="ch-sub">Plan doluluğu <span class="hint">· kesikli çizgi %100 kapasite · çubuğa tıklayınca makine filtrelenir</span></h3>${Chart.slot("hbar",{rows:mpRows.map(m=>({key:m.code,label:m.code,sub:`${m.ton} ton${m.robot?" · robot":""} · ${m.jobs} iş`,values:[m.util||0],color:utilColor(m.util),valueText:`${pct(m.util||0)}${m.util>1?" ⚠":""}`,tipExtra:`<div class="t-f">${nf1.format(m.load)} / ${nf0.format(m.cap)} saat</div>`})),series:[{name:"Plan doluluğu",color:COL.c1}],fmt:v=>pct(v),ref:1,refLabel:"%100 kapasite",max:mxU,onClick:goMachine},"Plan doluluğu")}
      <div class="ch-legend"><span><i style="background:var(--s1)"></i>%85'e kadar</span><span><i style="background:var(--warn)"></i>%85–100 · yoğun</span><span><i style="background:var(--bad)"></i>%100 üstü · kapasite aşıyor</span></div>`:emptyBox("Plan doluluğu yok","Seçili filtrelerde planlanmış iş ya da kapasitesi tanımlı makine yok.",null))
    +`<h3 class="ch-sub">Gerçekleşen verim (OEE)</h3>`+(oeeByM.length?Chart.slot("hbar",{rows:oeeByM.map(x=>({key:x.m,label:x.m,sub:`K ${pct1(x.o.A)} · P ${pct1(x.o.P)} · Ka ${pct1(x.o.Q)}`,values:[x.o.OEE]})),series:[{name:"OEE",color:COL.c3}],fmt:v=>pct1(v),max:1,onClick:goMachine},"OEE")
      :emptyBox("OEE hesaplanamıyor",P.recs.length?"Üretim kayıtlarında çalışma/duruş süresi ya da kalıp çevrim süresi eksik.":"Üretim gerçekleşmesi girilmeden makine verimi ölçülemez. Yukarıdaki plan doluluğu sadece plandır.",P.recs.length?"uretim":null));

  // 3 · Açık siparişler
  const sOrd={name:"Kalan sipariş",color:COL.c1};
  const topP=O.prods.slice().sort((a,b)=>(b.net??b.qty)-(a.net??a.qty)).slice(0,12);
  const ordHtml=O.lines?`<h3 class="ch-sub">Termine göre (haftalık)${O.est?` <span class="pill pill-warn">${O.est} termin tahmini</span>`:""}</h3>${Chart.slot("vbar",{cats:O.buckets.map(b=>({key:b.key,label:b.label,short:b.short,color:b.late?COL.bad:null})),series:[{...sOrd,values:O.buckets.map(b=>b.qty)}],unit:" ad"},"Termine göre sipariş")}
      ${O.overdue?`<div class="hint"><span class="pill pill-bad">Gecikmiş</span> ${O.overdue} satır · ${nf0.format(O.overQty)} adet termini geçmiş</div>`:""}
      <h3 class="ch-sub">En yüksek net ihtiyaç <span class="hint">· tıklayınca ürün filtrelenir</span></h3>${Chart.slot("hbar",{rows:topP.map(p=>({key:p.code,label:p.code,sub:`${p.lines} sipariş · stok ${p.stock==null?"bilinmiyor":nf0.format(p.stock)}`,values:p.net==null?[0,p.qty]:[p.net,0],valueText:p.net==null?`${nf0.format(p.qty)} (stok yok)`:nf0.format(p.net)})),series:[{name:"Net ihtiyaç",color:COL.c1},{name:"Kalan (stok bilinmiyor)",color:COL.muted}],onClick:goProduct},"Net ihtiyaç")}
      ${O.agingN?`<h3 class="ch-sub">Sipariş yaşı (adet)</h3>${Chart.slot("hbar",{rows:Object.entries(O.aging).map(([k,v])=>({key:k,label:k,values:[v]})),series:[{name:"Kalan sipariş",color:COL.c1}],unit:" ad"},"Sipariş yaşı")}`:""}
      ${dataTable([{l:"Mamul"},{l:"Satır",r:1},{l:"Kalan",r:1},{l:"Stok",r:1},{l:"Net ihtiyaç",r:1},{l:"En erken termin"}],O.prods.slice().sort((a,b)=>(b.net??b.qty)-(a.net??a.qty)).map(p=>[`<span class="code">${esc(p.code)}</span>`,p.lines,nf0.format(p.qty),p.stock==null?"–":nf0.format(p.stock),p.net==null?"–":nf0.format(p.net),fmtD(p.due)]))}`
    :emptyBox("Açık sipariş yok","Seçili filtrelerde sipariş bulunamadı.",null);

  // 4 · Kritik stoklar
  const critTop=crit.slice(0,10);
  const stHtml=ST.length?(critTop.length?Chart.legend([{name:"Stok + yolda",color:COL.c3},{name:"Dönem ihtiyacı",color:COL.c2}])+Chart.slot("hbar",{rows:critTop.map(r=>({key:r.code,label:r.code,sub:`${r.type} · ${r.status}${r.orderBy?` · son sipariş ${fmtD(r.orderBy)}`:""}`,values:[r.stock+r.inc,r.fGross],valueText:`${r.order>0?`${nf0.format(Math.ceil(r.order))} ${r.unit} sipariş`:"sipariş yok"}`})),series:[{name:"Stok + yolda",color:COL.c3},{name:"Dönem ihtiyacı",color:COL.c2}],fmt:v=>Chart.short(v),grouped:true},"Kritik stok"):`<div class="ch-ok"><span class="pill pill-ok">Yeterli</span> Stok kartı olan malzemelerde kritik durum yok.</div>`)
      +(noCardSt?`<div class="hint" style="margin-top:8px"><span class="pill pill-warn">Bilinmiyor</span> ${noCardSt} malzemenin stok kartı yok; durumu değerlendirilemiyor. <button class="btn btn-sm" type="button" data-go="malzemeler">Stokları gir</button></div>`:"")
      +dataTable([{l:"Malzeme"},{l:"Tip"},{l:"Dönem ihtiyacı",r:1},{l:"Stok",r:1},{l:"Yolda",r:1},{l:"Sipariş önerisi",r:1},{l:"Son sipariş"},{l:"Durum"}],ST.map(r=>[`<span class="code">${esc(r.code)}</span>`,esc(r.type),`${Chart.short(r.fGross)} ${r.unit}`,r.hasCard?nf0.format(r.stock):"–",r.hasCard?nf0.format(r.inc):"–",r.order>0?nf0.format(Math.ceil(r.order)):"–",r.orderBy?fmtD(r.orderBy):"–",pill(r.hasCard?r.level:"warn",r.hasCard?r.status:"Stok kartı yok")]))
    :emptyBox("Malzeme ihtiyacı hesaplanamadı","Gramaj ya da reçetede satınalma kalemi girilmediği için MRP'de malzeme yok.","kaliplar","Gramajları gir");

  // 5 · Maliyet
  const sMat={name:"Hammadde + boya",color:COL.c1},sMach={name:"Makine",color:COL.c2},sBuy={name:"Satınalma kalemleri",color:COL.c3};
  const cTop=cOk.slice().sort((a,b)=>b.total-a.total).slice(0,10);
  const missCount={};cProds.filter(p=>p.total==null).forEach(p=>p.miss.forEach(m=>{const k=/ fiyatı$/.test(m)?"malzeme fiyatı":/ saat maliyeti$/.test(m)?"makine saat maliyeti":/kalıp\/reçete$/.test(m)?"alt parça kalıbı/reçetesi":m;missCount[k]=(missCount[k]||0)+1}));
  const mCost=MP.filter(m=>m.hourCost!=null&&m.load>0).map(m=>({code:m.code,v:m.load*m.hourCost})).sort((a,b)=>b.v-a.v);
  const buyVal=C.buyRows.filter(r=>r.value!=null),buyTot=buyVal.reduce((a,r)=>a+r.value,0);
  const costHtml=`<div class="cost-cov"><b>${cOk.length} / ${cProds.length}</b> mamulde maliyet hesaplanabiliyor${Object.keys(missCount).length?`<div class="hint">Eksikler: ${Object.entries(missCount).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${esc(k)} (${n} mamul)`).join(" · ")}</div>`:""}</div>`
    +(cTop.length?`<h3 class="ch-sub">Açık ihtiyacın maliyeti · mamul bazında</h3>${Chart.legend([sMat,sMach,sBuy])}${Chart.slot("hbar",{rows:cTop.map(p=>({key:p.code,label:p.code,sub:`birim ${tl(p.unit)} · ${nf0.format(p.need)} adet`,values:[p.mat*p.need,p.mach*p.need,p.buy*p.need],valueText:tl(p.total)})),series:[sMat,sMach,sBuy],fmt:tl,onClick:goProduct},"Mamul maliyeti")}`
      :emptyBox("Mamul maliyeti hesaplanamıyor","Sahte fiyat kullanılmaz. Malzemelere birim fiyat, makinelere saat maliyeti ve kalıplara gramaj girildiğinde mamul maliyetleri burada görünür.","malzemeler","Fiyatları gir"))
    +(mCost.length?`<h3 class="ch-sub">Planlanan makine maliyeti</h3>${Chart.slot("hbar",{rows:mCost.map(m=>({key:m.code,label:m.code,values:[m.v]})),series:[{name:"Plan saati × saat maliyeti",color:COL.c2}],fmt:tl,onClick:goMachine},"Makine maliyeti")}`:"")
    +(C.buyRows.length?`<div class="hint" style="margin-top:10px">Satınalma önerisi tutarı: <b>${buyVal.length?tl(buyTot):"hesaplanamıyor"}</b> ${buyVal.length<C.buyRows.length?`(${C.buyRows.length-buyVal.length} kalemin fiyatı yok)`:""}</div>`:"")
    +(cProds.length?dataTable([{l:"Mamul"},{l:"Net ihtiyaç",r:1},{l:"Birim maliyet",r:1},{l:"Toplam",r:1},{l:"Eksik"}],cProds.slice().sort((a,b)=>(b.total??-1)-(a.total??-1)).map(p=>[`<span class="code">${esc(p.code)}</span>`,nf0.format(p.need),tl(p.unit),tl(p.total),esc(p.miss.slice(0,3).join(", ")+(p.miss.length>3?" …":""))])):"");

  $("#view").innerHTML=`
  ${S.demo?`<div class="panel"><div class="panel-body hint"><span class="pill pill-warn">Örnek veri</span> Bu panel şu an örnek verileri gösteriyor. Örnek veride üretim gerçekleşmesi ve fiyat yoktur.</div></div>`:""}
  <div class="panel dash-filters"><div class="panel-body df-row">
    <div class="field"><label for="dfp">Tarih</label><select id="dfp" class="sel">${[["all","Tümü"],["p7","Son 7 gün"],["p30","Son 30 gün"],["month","Bu ay"],["n30","Önümüzdeki 30 gün"],["custom","Özel aralık"]].map(([k,t])=>`<option value="${k}" ${F.preset===k?"selected":""}>${t}</option>`).join("")}</select></div>
    <div class="field"><label for="dff">Başlangıç</label><input id="dff" type="date" class="sel" value="${esc(F.from||"")}"></div>
    <div class="field"><label for="dft">Bitiş</label><input id="dft" type="date" class="sel" value="${esc(F.to||"")}"></div>
    <div class="field"><label for="dfm">Makine</label><select id="dfm" class="sel"><option value="">Tüm makineler</option>${S.machines.map(m=>`<option ${F.machine===m.code?"selected":""}>${esc(m.code)}</option>`).join("")}</select></div>
    <div class="field"><label for="dfu">Ürün / grup</label><input id="dfu" class="sel" list="dful" value="${esc(F.product||"")}" placeholder="Tüm ürünler" autocomplete="off"><datalist id="dful">${groups.map(g=>`<option value="${esc(g)}">${esc(g)} grubu</option>`).join("")}${prods.slice(0,600).map(p=>`<option value="${esc(p)}">`).join("")}</datalist></div>
    <div class="field df-act">${anyF?`<button class="btn" type="button" id="dfc">Filtreleri temizle</button>`:""}</div>
  </div><div class="df-note hint">Tarih filtresi siparişlerde termine, planda iş saatlerine, üretimde kayıt tarihine, MRP'de ihtiyaç gününe uygulanır.</div></div>

  <details class="panel gaps" ${badG?"open":""}><summary class="panel-head"><div><h2 class="panel-title">Veri durumu</h2><div class="panel-sub">${badG?`${badG} alan eksik`:"Eksik alan yok"}${warnG?` · ${warnG} alan kısmi`:""} · panel yalnızca gerçek kayıtları kullanır, eksikler tahminle doldurulmaz</div></div></summary>
    <div class="gap-list">${G.map(g=>`<div class="gap"><span class="pill ${sevPill[g.sev]}">${sevTxt[g.sev]}</span><div class="gap-t"><b>${esc(g.title)}</b>${g.total?` <span class="num hint">${nf0.format(g.have)} / ${nf0.format(g.total)}</span>`:""}<div class="hint">${esc(g.detail)}</div></div>${g.fix&&g.sev!=="ok"?`<button class="btn btn-sm" type="button" data-go="${esc(g.fix)}">Tamamla</button>`:""}</div>`).join("")}</div></details>

  <section class="kpis dash-kpis">
    ${kpi("Açık sipariş",nf0.format(O.qty),`${nf0.format(O.lines)} satır · ${nf0.format(O.customers)} müşteri`)}
    ${kpi("Net ihtiyaç",nf0.format(O.net),O.netUnknown?`${O.netUnknown} üründe stok bilinmiyor`:`${O.products} ürün · stok düşülmüş`)}
    ${kpi("Plan doluluğu",capT?pct(loadT/capT):"–",`${nf0.format(loadT)} saat planlı iş`,capT&&loadT/capT>1?"is-bad":"")}
    ${kpi("Gerçekleşen üretim",P.recs.length?nf0.format(P.T.good):"Veri yok",P.recs.length?`fire ${pct1(P.T.scrapRate)} · OEE ${OE.OEE==null?"–":pct1(OE.OEE)}`:"Üretim Girişi'nden kayıt girin",P.recs.length?"":"is-muted")}
    ${kpi("Kritik stok",nf0.format(crit.length),noCardSt?`${noCardSt} kalemin stok kartı yok`:"stok kartı olan kalemler",crit.length?"is-bad":"")}
    ${kpi("İhtiyaç maliyeti",cOk.length?tl(cTot):"Veri yok",cProds.length?`${cOk.length}/${cProds.length} mamulde hesaplanabildi`:"ihtiyaç yok",cOk.length?"":"is-muted")}
  </section>

  <section class="dash-grid">
    <div class="panel ch-card span2"><div class="panel-head"><h2 class="panel-title">Üretim gerçekleşmeleri</h2><span class="panel-sub">Üretim Girişi kayıtları · ${nf0.format(P.recs.length)} kayıt</span></div><div class="panel-body">${prodHtml}</div></div>
    <div class="panel ch-card"><div class="panel-head"><h2 class="panel-title">Makine performansı</h2><span class="panel-sub">Plan: takvim · Gerçekleşen: üretim kayıtları</span></div><div class="panel-body">${machHtml}</div></div>
    <div class="panel ch-card"><div class="panel-head"><h2 class="panel-title">Açık siparişler</h2><span class="panel-sub">${nf0.format(O.products)} ürün · ${nf0.format(O.qty)} adet kalan</span></div><div class="panel-body">${ordHtml}</div></div>
    <div class="panel ch-card"><div class="panel-head"><h2 class="panel-title">Kritik stoklar</h2><span class="panel-sub">MRP · seçili dönemin ihtiyacı</span></div><div class="panel-body">${stHtml}</div></div>
    <div class="panel ch-card"><div class="panel-head"><h2 class="panel-title">Maliyet analizi</h2><span class="panel-sub">Standart maliyet: gramaj × fiyat + çevrim × saat maliyeti + reçete kalemleri</span></div><div class="panel-body">${costHtml}</div></div>
  </section>`;
  const v=$("#view");Chart.mountAll(v);
  v.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
  $("#dfp").onchange=e=>{const p=e.target.value;setDashF(p==="custom"?{preset:"custom"}:{preset:p,...presetRange(p,t0)})};
  $("#dff").onchange=e=>setDashF({preset:"custom",from:e.target.value});$("#dft").onchange=e=>setDashF({preset:"custom",to:e.target.value});
  $("#dfm").onchange=e=>setDashF({machine:e.target.value});$("#dfu").onchange=e=>setDashF({product:e.target.value.trim()});
  const c=$("#dfc");if(c)c.onclick=()=>setDashF({preset:"all",from:"",to:"",machine:"",product:""});
}
let dashRT;window.addEventListener("resize",()=>{if(current!=="yonetim")return;clearTimeout(dashRT);dashRT=setTimeout(()=>Chart.mountAll($("#view")),150)});

