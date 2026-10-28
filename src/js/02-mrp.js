/* ---------- MRP: time-phased material requirements from the schedule ---------- */
function mrp(R){const t0=today(),reqs={},noW=new Set(),prodStart={};
  const dayAt=s=>s.startDT||R.days[0];
  const add=(code,type,date,qty,ref,meta)=>{code=String(code||"").trim();if(!code||!(qty>0))return;const r=(reqs[code]=reqs[code]||{code,type,items:[]});
    if(meta){r.unit=r.unit||(meta.unit==="gr"?"kg":meta.unit);r.name=r.name||meta.name}r.items.push({date,qty,ref})};
  for(const m of S.machines){if(!netHours(m))continue;for(const s of R.lanes[m.code]||[]){const d=iso(dayAt(s));const fr=s.job.need?s.need/s.job.need:1;
    if(!(+s.mold.partG>0))noW.add(`${s.mold.code} (${s.part})`);
    add(s.mat,"Hammadde",d,s.kgMain*fr,{seg:s,m:m.code});
    if(String(s.mold.mbCode||"").trim())add(s.mold.mbCode,"Boya",d,s.kgMb*fr,{seg:s,m:m.code});
    (s.products||[]).forEach(p=>{if(!prodStart[p]||d<prodStart[p])prodStart[p]=d})}}
  for(const [code,v] of Object.entries(R.buy)){const conv=v.unit==="gr"?0.001:1;
    for(const [root,q] of Object.entries(v.byProd||{})){const P=R.prod[root]||{};let d=prodStart[root]||P.due||t0;if(d<t0)d=t0;add(code,v.cat,d,q*conv,{product:root},v)}}
  const cards={};(S.materials||[]).forEach(c=>cards[String(c.code).trim()]=c);
  const lim=new Date();lim.setDate(lim.getDate()+3);const limIso=iso(lim);
  const rows=Object.values(reqs).map(r=>{const c=cards[r.code];const stock=c?+c.stock||0:0,inc=c?+c.incoming||0:0,incD=c&&c.incomingDate?c.incomingDate:"",safety=c?+c.safety||0:0,lead=c?+c.lead||0:0,moq=c?+c.moq||0:0;
    const type=c&&c.mtype?c.mtype:r.type;r.items.sort((a,b)=>a.date.localeCompare(b.date));
    let bal=stock+(incD?0:inc),incAdded=!incD,short=null,stockout=null;
    for(const it of r.items){if(!incAdded&&incD<=it.date){bal+=inc;incAdded=true}bal-=it.qty;it.bal=bal;
      if(bal<safety-1e-9&&!short)short=it.date;
      if(bal<-1e-9){if(!stockout)stockout=it.date;const j=it.ref&&it.ref.seg&&it.ref.seg.job;if(j){j.matShort=j.matShort||[];if(!j.matShort.includes(r.code))j.matShort.push(r.code)}}}
    const gross=r.items.reduce((a,x)=>a+x.qty,0),net=Math.max(0,gross+safety-stock-inc),order=net>0?Math.max(net,moq):0;
    let orderBy=null;if(short&&order>0){const d=parseISO(short);d.setDate(d.getDate()-lead);orderBy=iso(d)}
    let level="ok",status="Yeterli";
    if(order===0&&stockout){level="warn";status="Yoldaki geç geliyor"}
    if(order>0){level="warn";status=c?"Sipariş planla":"Stok kartı yok";if(orderBy&&orderBy<t0){level="bad";status="Sipariş geç kaldı"}else if(orderBy&&orderBy<=limIso){level="bad";status="Hemen sipariş ver"}}
    return{code:r.code,name:(c&&c.name)||r.name||"",type,unit:r.unit||(type==="Hammadde"||type==="Boya"?"kg":"adet"),items:r.items,gross,stock,inc,incD,safety,net,order,short,stockout,orderBy,lead,level,status,hasCard:!!c}});
  const rank={bad:0,warn:1,ok:2};rows.sort((a,b)=>rank[a.level]-rank[b.level]||(a.short||"9").localeCompare(b.short||"9")||b.gross-a.gross);
  return{rows,noWeight:[...noW],toOrder:rows.filter(r=>r.order>0).length,late:rows.filter(r=>r.level==="bad").length}}
function vMrp(R){const M=R.mrp;const fq=(r,v)=>r.unit==="kg"&&Math.abs(v)<10?nf1.format(v):nf0.format(v);
  $("#view").innerHTML=`${M.noWeight.length?`<div class="panel"><div class="panel-body"><b>Gramajı girilmemiş ${M.noWeight.length} kalıp</b> hammadde hesabına girmiyor. Kalıplar ekranından parça ve yolluk gramajını girin.<div class="hint" style="margin-top:6px">${M.noWeight.slice(0,30).map(esc).join(", ")}${M.noWeight.length>30?" …":""}</div></div></div>`:""}
  <section class="kpis kpis-3">
    <div class="kpi"><span class="kpi-label">Takip edilen malzeme</span><span class="kpi-val">${M.rows.length}</span><span class="kpi-foot">${M.rows.filter(r=>!r.hasCard).length} kalemin stok kartı yok</span></div>
    <div class="kpi ${M.toOrder?"is-bad":""}"><span class="kpi-label">Sipariş gereken</span><span class="kpi-val">${M.toOrder}</span><span class="kpi-foot">Net ihtiyacı olan kalem</span></div>
    <div class="kpi ${M.late?"is-bad":""}"><span class="kpi-label">Acil</span><span class="kpi-val">${M.late}</span><span class="kpi-foot">Son sipariş tarihi geçmiş ya da 3 gün içinde</span></div></section>
  <div class="panel"><div class="panel-head"><div><h2 class="panel-title">Malzeme ihtiyaç planı</h2><div class="panel-sub">Plandaki işlerin başlangıç günlerine göre · eldeki ve yoldaki miktar düşülür · satıra tıklayınca tüketim detayı açılır</div></div>
    <div class="toolbar"><button class="btn" type="button" id="goMat">Stokları düzenle</button><button class="btn btn-primary" type="button" id="copyPo">Satınalma listesini kopyala</button></div></div>
  <div class="tbl-wrap"><table><thead><tr><th>Malzeme</th><th>Tip</th><th class="r">Brüt ihtiyaç</th><th class="r">Stok</th><th class="r">Yolda</th><th class="r">Net ihtiyaç</th><th>İlk eksik</th><th class="r">Sipariş önerisi</th><th>Son sipariş</th><th>Durum</th></tr></thead><tbody>
  ${M.rows.map(r=>`<tr class="clickable" data-code="${esc(r.code)}" tabindex="0"><td><span class="code">${esc(r.code)}</span>${r.hasCard?"":` <span class="mchip">stok kartı yok</span>`}${r.name?`<div class="hint">${esc(r.name)}</div>`:""}</td>
    <td>${r.type==="Hammadde"?`<span class="mat"><i style="background:${matColor(r.code)}"></i>Hammadde</span>`:esc(r.type)}</td>
    <td class="r num">${fq(r,r.gross)} ${r.unit}</td><td class="r num">${fq(r,r.stock)}</td><td class="r num">${fq(r,r.inc)}${r.incD?`<div class="hint">${fmtD(r.incD)}</div>`:""}</td>
    <td class="r num">${r.net>0?`<b>${fq(r,r.net)}</b>`:"–"}</td><td class="num">${r.short?fmtD(r.short):"–"}</td><td class="r num">${r.order>0?`<b>${nf0.format(Math.ceil(r.order))}</b> ${r.unit}`:"–"}</td>
    <td class="num">${r.orderBy?fmtD(r.orderBy):"–"}</td><td>${pill(r.level,r.status)}</td></tr>
    ${ui.mrpOpen===r.code?`<tr class="mrp-detail"><td colspan="10"><div class="tbl-wrap"><table><thead><tr><th>İhtiyaç günü</th><th>Kaynak</th><th class="r">Tüketim</th><th class="r">Kalan stok</th></tr></thead><tbody>
      ${r.items.map(it=>`<tr><td class="num">${fmtD(it.date)}</td><td>${it.ref.seg?`<span class="code">${esc(it.ref.seg.part)}</span> · ${esc(it.ref.m)}`:`Mamul <span class="code">${esc(it.ref.product)}</span>`}</td><td class="r num">${fq(r,it.qty)}</td><td class="r num" style="${it.bal<0?"color:var(--bad);font-weight:700":""}">${fq(r,it.bal)}</td></tr>`).join("")}
      </tbody></table></div><div class="hint" style="padding:6px 12px">Tedarik süresi ${r.lead} gün · emniyet stoğu ${fq(r,r.safety)} ${r.unit}</div></td></tr>`:""}`).join("")||`<tr><td colspan="10" class="empty">Plandaki işler için malzeme ihtiyacı bulunamadı. Kalıplara hammadde ve gramaj, ürün ağacına satınalma kalemleri girildiğinde burada görünür.</td></tr>`}
  </tbody></table></div></div>
  <p class="note">Stok, yoldaki satınalma, tedarik süresi ve emniyet stoğu Malzemeler ekranından girilir; stok kartı olmayan malzemenin stoğu 0 kabul edilir. Son sipariş tarihi = ilk eksik günü − tedarik süresi. Malzemesi yetmeyen işler Plan ve Takvim'de "Malzeme eksik" olarak işaretlenir.</p>`;
  const v=$("#view");
  v.querySelectorAll("tr[data-code]").forEach(tr=>{const f=()=>{ui.mrpOpen=ui.mrpOpen===tr.dataset.code?null:tr.dataset.code;vMrp(R)};tr.onclick=f;tr.onkeydown=e=>{if(e.key==="Enter")f()}});
  $("#goMat").onclick=()=>go("malzemeler");
  $("#copyPo").onclick=()=>{const L=M.rows.filter(r=>r.order>0);if(!L.length){toast("Sipariş gereken kalem yok");return}
    const txt=["Malzeme\tAd\tMiktar\tBirim\tSon sipariş\tİhtiyaç tarihi",...L.map(r=>[r.code,r.name,Math.ceil(r.order),r.unit,r.orderBy?fmtD(r.orderBy):"",r.short?fmtD(r.short):""].join("\t"))].join("\n");
    const fallback=()=>{modal("Satınalma listesi",`<div class="modal-body"><div class="field full"><textarea id="poTxt" readonly>${esc(txt)}</textarea><span class="hint">Metin seçili; kopyalayıp Excel'e ya da e-postaya yapıştırabilirsiniz.</span></div></div>`,`<button class="btn" type="button" id="poC">Kapat</button>`);$("#poC").onclick=closeModal;const t=$("#poTxt");t.focus();t.select()};
    try{navigator.clipboard.writeText(txt).then(()=>toast(`${L.length} kalem panoya kopyalandı; Excel'e yapıştırabilirsiniz`),fallback)}catch(e){fallback()}};
}

