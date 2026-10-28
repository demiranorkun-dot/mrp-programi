/* ---------- views ---------- */
function render(){
  renderNav();
  const v=VIEWS.find(x=>x.id===current);
  $("#title").textContent=v.t;
  $("#crumb").textContent=(VIEWS.slice(0,VIEWS.indexOf(v)+1).reverse().find(x=>x.g)||{}).g||"";
  const R=compute();
  ({ozet:vOzet,plan:vPlan,takvim:vTakvim,siparisler:vSiparis,agac:vAgac,kaliplar:vKalip,makineler:vMakine,hammadde:vHammadde,mrp:vMrp,malzemeler:()=>vCrud("malzemeler"),uretim:()=>vCrud("uretim"),yonetim:vYonetim,ayarlar:vAyar})[current](R);
}

function vOzet(R){
  const H=+S.settings.horizon||22;
  const tot=S.orders.reduce((a,o)=>a+(+o.qty||0),0);
  const used=S.machines.filter(m=>netHours(m)>0);
  const avg=used.length?used.reduce((a,m)=>a+m._util,0)/used.length:0;
  const risk=R.jobs.filter(j=>j.level!=="ok");
  const hrs=R.jobs.reduce((a,j)=>a+j.hrs,0);
  const over=S.machines.filter(m=>m._util>1).length;
  $("#view").innerHTML=`
  <section class="kpis">
    <div class="kpi"><span class="kpi-label">Açık sipariş</span><span class="kpi-val">${S.orders.length}</span><span class="kpi-foot">${nf0.format(tot)} adet mamul</span></div>
    <div class="kpi"><span class="kpi-label">Üretilecek parça</span><span class="kpi-val">${R.jobs.length}</span><span class="kpi-foot">${Object.keys(R.buy).length} kalem satınalma</span></div>
    <div class="kpi"><span class="kpi-label">Makine saati</span><span class="kpi-val">${nf0.format(hrs)}</span><span class="kpi-foot">${H} iş günü ufukta</span></div>
    <div class="kpi"><span class="kpi-label">Ortalama doluluk</span><span class="kpi-val">${pct(avg)}</span><span class="kpi-foot">${over?`${over} makine ufku aşıyor`:"Ufku aşan makine yok"}</span></div>
    <div class="kpi ${risk.length?"is-bad":""}"><span class="kpi-label">Uyarı</span><span class="kpi-val">${risk.length}</span><span class="kpi-foot">${risk.length?"Gecikme veya makine sorunu":"Tüm işler termine yetişiyor"}</span></div>
    <div class="kpi ${R.mrp.late?"is-bad":""}"><span class="kpi-label">Malzeme</span><span class="kpi-val">${R.mrp.toOrder}</span><span class="kpi-foot">${R.mrp.toOrder?`kalem sipariş gerekiyor${R.mrp.late?`, ${R.mrp.late} acil`:""}`:"Eksik malzeme yok"}</span></div>
  </section>
  <section class="grid-2">
    <div class="panel"><div class="panel-head"><h2 class="panel-title">Makine doluluğu</h2><span class="panel-sub">${H} iş günlük plan ufkuna göre · kesik çizgi %85</span></div>
      <div class="panel-body"><div class="load-list">${S.machines.map(m=>{const u=m._util,c=u>1?"var(--bad)":u>.85?"var(--warn)":"var(--ok)";
        return`<div class="load-row"><span class="code">${esc(m.code)}</span><div class="load-bar" title="${nf1.format(m._days)} gün"><span style="width:${Math.min(100,u*100)}%;background:${c}"></span><i class="limit"></i></div><span class="num" style="text-align:right">${pct(u)}</span></div>`}).join("")}</div></div></div>
    <div class="panel"><div class="panel-head"><h2 class="panel-title">Dikkat gerektirenler</h2></div>
      ${risk.length?`<div class="tbl-wrap"><table><thead><tr><th>Parça</th><th>Makine</th><th>Termin</th><th>Durum</th></tr></thead><tbody>${risk.map(j=>`<tr><td class="code">${esc(j.part)}</td><td class="code">${esc(j.machine||"–")}</td><td class="num">${fmtD(j.due)}</td><td>${pill(j.level,j.status)}</td></tr>`).join("")}</tbody></table></div>`
      :`<div class="empty">Uyarı yok. Tüm parçalar uygun makinede ve termine yetişiyor.</div>`}
      ${R.missing.length?`<div class="panel-body err">Kalıbı tanımlı olmayan parçalar: ${R.missing.map(esc).join(", ")}</div>`:""}
      ${R.unmatched.length?`<div class="panel-body err">Ürün ağacı ve kalıbı bulunamayan mamuller (${R.unmatched.length}): ${R.unmatched.slice(0,40).map(esc).join(", ")}${R.unmatched.length>40?" …":""}</div>`:""}
      ${R.waits.length?`<div class="panel-body hint">Kalıp çakışması nedeniyle ertelenen işler (${R.waits.length}): ${R.waits.slice(0,12).map(s=>`${esc(s.part)} (${esc(s.mold.code)} kalıbı ${esc(s.waitBy)}'de, ${nf1.format(s.wait)} sa)`).join(", ")}${R.waits.length>12?" …":""}</div>`:""}
    </div>
  </section>
  <section class="panel"><div class="panel-head"><h2 class="panel-title">Hammadde ihtiyacı</h2><span class="panel-sub">Yolluk dahil, masterbatch ayrı</span><div class="toolbar"><button class="btn" type="button" data-go="hammadde">Detay</button></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Hammadde</th><th class="r">Ana hammadde (kg)</th><th class="r">Masterbatch (kg)</th><th class="r">Parça çeşidi</th></tr></thead><tbody>
    ${Object.entries(R.matTot).map(([k,v])=>`<tr><td>${matTag(k)}</td><td class="r num">${nf0.format(v.main)}</td><td class="r num">${nf1.format(v.mb)}</td><td class="r num">${v.parts}</td></tr>`).join("")}</tbody></table></div></section>`;
  $("#view").querySelector("[data-go]").onclick=()=>go("mrp");
}

function vPlan(R){
  const opts=S.machines.map(m=>m.code);
  $("#view").innerHTML=`
  <div class="panel"><div class="panel-head"><div><h2 class="panel-title">Parça bazlı plan</h2><div class="panel-sub">Öneri motoru uygun makineler içinde önce aynı hammaddeyi çalıştıranı, sonra en az yüklüsünü seçer. Beğenmediğiniz satırda makineyi elle değiştirin.</div></div></div>
  <div class="tbl-wrap"><table><thead><tr><th>Parça</th><th>Kalıp</th><th>Hammadde</th><th>Çalışma</th><th class="r">İhtiyaç</th><th class="r">Saat</th><th>Termin</th><th>Öneri</th><th>Makine</th><th>Başlangıç</th><th>Bitiş</th><th>Durum</th></tr></thead><tbody>
  ${R.jobs.map(j=>`<tr><td class="code">${esc(j.part)}</td><td class="code">${esc(j.mold.code)}</td><td>${matTag(j.mat)}</td><td>${modeTag(j.mold.mode)}</td>
    <td class="r num">${needTxt(j)}</td><td class="r num">${nf1.format(j.hrs)}</td><td class="num">${fmtD(j.due)}</td>
    <td class="code">${esc(j.suggested||"–")}</td>
    <td>${j.running?`<span class="mchip run-chip">▶ ${esc(j.machine)} · çalışıyor</span>`:`<select class="sel ${j.override?"override":""}" data-part="${esc(j.key)}" aria-label="${esc(j.part)} makinesi">
      <option value="">Öneriyi kullan</option>${opts.map(c=>`<option value="${esc(c)}" ${j.override&&j.machine===c?"selected":""}>${esc(c)}${j.compat.includes(c)?"":(j.needR&&j.listed.includes(c)?" (robot yok)":" (uyumsuz)")}</option>`).join("")}</select>`}</td>
    <td class="num">${fmtDT(j.startDT)}</td><td class="num">${fmtDT(j.end)}</td><td>${pill(j.level,j.status)}${shortPill(j)}</td></tr>`).join("")||`<tr><td colspan="12" class="empty">Plan için sipariş ve ürün ağacı gerekli.</td></tr>`}
  </tbody></table></div></div>`;
  $("#view").querySelectorAll("select[data-part]").forEach(s=>s.onchange=()=>{const p=s.dataset.part;if(s.value)S.overrides[p]=s.value;else delete S.overrides[p];save();render();toast(s.value?`${p} → ${s.value}`:`${p} öneriye döndü`)});
}

function vTakvim(R){
  const Z={hafta:40,gun:150,vardiya:420};if(!Z[ui.zoom])ui.zoom="gun";
  const DW=Z[ui.zoom],H=+S.settings.horizon||22,co=+S.settings.changeover||0;
  if(!S.machines.some(m=>m.code===ui.selM))ui.selM=(S.machines.find(m=>(R.lanes[m.code]||[]).length)||S.machines[0]||{}).code;
  const days=R.days.slice(0,R.span);
  const tIso=today();
  const mats=[...new Set(R.jobs.map(j=>j.mat))];
  const head=`<div class="g-head"><div class="g-label">Makine</div><div class="g-days">${days.map(d=>`<div class="g-day ${iso(d)===tIso?"today":""}" style="width:${DW}px"><b>${fmtDs(d)}</b>${d.toLocaleDateString("tr-TR",{weekday:"short"})}</div>`).join("")}</div></div>`;
  const rows=S.machines.map(m=>{const n=netHours(m);const lane=R.lanes[m.code]||[];let px=0;
    const bars=lane.map((j,ix)=>{let out="";
      if(j.wait>0.05&&j.L){const wx=Math.max(((j.coA??j.startA)-j.wait/j.L)*DW,px),ww=j.wait/j.L*DW;out+=`<div class="g-wait" style="left:${wx}px;width:${ww}px" title="Kalıp ${esc(j.waitBy||"")} makinesinde, boşalması bekleniyor"></div>`;px=wx+ww}
      if(j.coA!=null&&j.L){const cx=Math.max(j.coA*DW,px),cw=Math.max(3,co/j.L*DW);out+=`<div class="g-co" style="left:${cx}px;width:${cw}px" title="Kalıp değişimi"></div>`;px=cx+cw+1}
      const x=Math.max(j.startA!=null?j.startA*DW:0,px),w=Math.max(8,j.startA!=null?(j.endA-j.startA)*DW:8);px=x+w+1;
      const sel=ui.selM===m.code&&ui.selJob===j.key;
      out+=`<button type="button" class="g-bar ${j.level==="warn"?"late":""} ${sel?"sel":""} ${j.running?"run":""} ${j.matShort?"short":""}" data-m="${esc(m.code)}" data-j="${esc(j.key)}" data-sid="${esc(j.sid)}" style="left:${x}px;width:${w}px;background:${matColor(j.mat)}" title="${ix+1}. ${esc(j.part)}${j.segNo===1?" (1. kısım)":j.segNo===2?" (devam)":""} · ${esc(j.mold.code)} · ${esc(j.mat)}\n${nf0.format(j.need)} adet ÷ ${esc(j.mold.cav)} göz × ${esc(j.mold.cycle)} sn = ${nf1.format(j.hrs)} saat baskı\nBaşlangıç ${fmtDT(j.startDT)} · Bitiş ${fmtDT(j.end)}\nTermin ${fmtD(j.due)}${j.running?"\nMakinede şu an çalışıyor (sabit)":"\nSürükleyip başka yere bırakabilirsiniz"}${j.wait>0.05?`\nKalıp ${esc(j.waitBy)} makinesinde olduğu için ${nf1.format(j.wait)} saat bekliyor`:""}">${w>=44?(j.running&&j.segNo!==2?"▶ ":"")+esc(j.part)+(j.segNo===2?" ↻":""):""}${w>=70?`<small>${nf0.format(j.need)} ad</small>`:""}</button>`;
      return out}).join("");
    return`<div class="g-row ${ui.selM===m.code?"is-sel":""}" data-row="${esc(m.code)}"><div class="g-label" data-pick="${esc(m.code)}" role="button" tabindex="0"><b>${esc(m.code)}</b><span>${esc(m.ton)} ton${hasRobot(m)?" · robot":""} · ${pct(m._util)}</span></div><div class="g-track" style="width:${days.length*DW}px;background-size:${DW}px 100%">${bars}${R.span>H?`<div class="g-horizon" style="left:${H*DW}px" title="Plan ufku"></div>`:""}${!S.settings.start&&m._off?`<div class="g-now" style="left:${m._off*DW}px" title="Şimdi"></div>`:""}</div></div>`}).join("");
  $("#view").innerHTML=`
  <div class="panel"><div class="panel-head"><div><h2 class="panel-title">Makine takvimi</h2><div class="panel-sub">Başlangıç ${fmtD(R.start)} · taralı alan kalıp değişimi · işi sürükleyip başka sıraya ya da makineye bırakın · tıklayınca sırası aşağıda açılır</div></div>
    <div class="toolbar">${(Object.keys(S.overrides||{}).length||Object.keys(S.seq||{}).length||Object.keys(S.splits||{}).length)?`<span id="resetWrap"><button class="btn" type="button" id="resetMan">Elle düzenlemeleri sıfırla</button></span>`:""}<div class="seg" role="group" aria-label="Yakınlaştırma">${[["hafta","Hafta"],["gun","Gün"],["vardiya","Vardiya"]].map(([k,t])=>`<button type="button" data-z="${k}" aria-pressed="${ui.zoom===k}">${t}</button>`).join("")}</div></div></div>
  <div class="panel-body legend" style="padding-block:10px">${mats.map(m=>`<span><i class="sw" style="background:${matColor(m)}"></i>${esc(m)}</span>`).join("")}<span><i class="sw" style="outline:2px solid var(--bad);background:transparent"></i>Gecikme riski</span></div>
  <div class="gantt-wrap" id="gwrap"><div class="gantt">${head}${rows}</div></div></div>
  <div class="panel" id="seqPanel"></div>`;
  const drawSeq=()=>{const m=S.machines.find(x=>x.code===ui.selM);const p=$("#seqPanel");if(!m){p.innerHTML=`<div class="empty">Makine yok.</div>`;return}
    const n=netHours(m),lane=R.lanes[m.code]||[];const dayAt=h=>R.days[Math.min(R.days.length-1,Math.max(0,Math.floor(h/(n||1))))];
    p.innerHTML=`<div class="panel-head"><div><h2 class="panel-title">${esc(m.code)} iş sırası</h2><div class="panel-sub">${esc(m.ton)} ton${hasRobot(m)?" · robotlu":""} · ${lane.length} iş · ${nf1.format(m._load||0)} saat · doluluk ${pct(m._util||0)}</div></div>
      <div class="toolbar"><label class="hint" for="seqM">Makine</label><select id="seqM" class="sel">${S.machines.map(x=>`<option ${x.code===m.code?"selected":""}>${esc(x.code)}</option>`).join("")}</select></div></div>
      <div class="panel-body run-edit"><span class="run-label">Şu an çalışan iş</span>
        <input id="rp" class="sel" list="rpl" value="${esc(m.rPart||"")}" placeholder="Parça kodu" aria-label="Çalışan parça kodu" autocomplete="off" style="width:130px"><datalist id="rpl">${S.molds.filter(k=>(k.machines||[]).includes(m.code)).map(k=>`<option value="${esc(k.part)}">`).join("")}</datalist>
        <input id="rr" class="sel" inputmode="numeric" value="${esc(m.rRemain??"")}" placeholder="Kalan adet" aria-label="Kalan adet" style="width:110px">
        <button class="btn btn-sm btn-primary" id="rsave" type="button">Kaydet</button>${m.rPart?`<button class="btn btn-sm" id="rclear" type="button">Makine boş</button>`:""}
        <span class="hint">Çalışan iş planın başına sabitlenir. Kalan adet boşsa parçanın tüm ihtiyacı alınır.</span></div>
      <div class="tbl-wrap"><table><thead><tr><th class="r">#</th><th>Parça</th><th>Kalıp</th><th>Hammadde</th><th>Çalışma</th><th class="r">Adet</th><th class="r">Saat</th><th>Başlangıç</th><th>Bitiş</th><th>Termin</th><th>Durum</th><th></th></tr></thead><tbody>
      ${lane.map((j,i)=>`<tr class="${ui.selJob===j.key?"row-sel":""}" data-j="${esc(j.key)}"><td class="r num">${i+1}</td><td class="code">${esc(j.part)}${j.running&&j.segNo!==2?' <span class="mchip run-chip">▶ çalışıyor</span>':""}${j.segNo?` <span class="mchip">${j.segNo===1?"1. kısım":"devam"}</span>`:""}</td><td class="code">${esc(j.mold.code)}</td><td>${matTag(j.mat)}</td><td>${modeTag(j.mold.mode)}</td><td class="r num">${needTxt(j)}</td><td class="r num">${nf1.format(j.hrs)}</td><td class="num">${fmtDT(j.startDT)}</td><td class="num">${fmtDT(j.end)}</td><td class="num">${fmtD(j.due)}</td><td>${pill(j.level,j.status)}${shortPill(j)}${j.wait>0.05?`<div class="hint">Kalıp ${esc(j.waitBy)}'de, ${nf1.format(j.wait)} sa bekliyor</div>`:""}</td><td>${j.segNo===0?`<button class="btn btn-sm" type="button" data-split="${esc(j.key)}">Araya iş al</button>`:j.segNo===1?`<button class="btn btn-sm" type="button" data-merge="${esc(j.key)}">Birleştir</button>`:""}</td></tr>`).join("")||`<tr><td colspan="12" class="empty">Bu makineye atanmış iş yok.</td></tr>`}
      </tbody></table></div>`;
    $("#seqM").onchange=e=>{ui.selM=e.target.value;ui.selJob=null;vTakvim(R)};
    $("#rsave").onclick=()=>{const part=$("#rp").value.trim();const rr=$("#rr").value.trim();
      if(part&&!S.molds.some(k=>k.part===part)){toast(`${part} için kalıp kaydı yok. Önce Kalıplar'a ekleyin.`);return}
      const q=rr===""?"":Math.round(num(rr));if(rr!==""&&!(q>0)){toast("Kalan adet pozitif bir sayı olmalı");return}
      if(part&&S.machines.some(x=>x!==m&&x.rPart===part))toast(`Uyarı: ${part} başka bir makinede de çalışıyor görünüyor`);
      m.rPart=part;m.rRemain=part?q:"";if(S.splits)delete S.splits["RUN:"+m.code];save();render();toast(part?`${m.code}: ${part} çalışıyor olarak kaydedildi`:`${m.code} boş olarak kaydedildi`)};
    const rc=$("#rclear");if(rc)rc.onclick=()=>{m.rPart="";m.rRemain="";if(S.splits)delete S.splits["RUN:"+m.code];save();render();toast(`${m.code} boş olarak kaydedildi`)};
    p.querySelectorAll("[data-split]").forEach(b=>b.onclick=()=>openSplit(R,m.code,b.dataset.split));
    p.querySelectorAll("[data-merge]").forEach(b=>b.onclick=()=>{const part=b.dataset.merge;delete S.splits[part];
      for(const k of Object.keys(S.seq||{})){const L=S.seq[k];const i=L.indexOf(part+"#1");if(i>=0)L[i]=part;S.seq[k]=L.filter(x=>x!==part+"#2"&&x!==part+"#1")}
      save();render();toast("Bölünmüş iş birleştirildi")});
    const sr=p.querySelector("tr.row-sel");if(sr&&ui._scrollSeq){sr.scrollIntoView({block:"nearest"});ui._scrollSeq=false}};
  drawSeq();
  const v=$("#view");
  v.querySelectorAll("[data-z]").forEach(b=>b.onclick=()=>{ui.zoom=b.dataset.z;vTakvim(R)});
  const keepX=fn=>{const sx=$("#gwrap").scrollLeft;fn();const g=$("#gwrap");if(g)g.scrollLeft=sx};
  const rm=$("#resetMan");if(rm)rm.onclick=()=>{$("#resetWrap").innerHTML=`<span class="hint">Tüm elle makine, sıra ve bölme değişiklikleri silinsin mi?</span> <button class="btn btn-danger" type="button" id="resetMan2">Evet, sıfırla</button>`;
    $("#resetMan2").onclick=()=>{S.overrides={};S.seq={};S.splits={};save();render();toast("Plan otomatik sıraya döndü")}};
  let drag=null;
  const clearDrop=()=>{v.querySelectorAll(".g-row.drop").forEach(r=>r.classList.remove("drop"));v.querySelectorAll(".g-drop").forEach(x=>x.remove())};
  const dropIndex=(tr,rx,sid)=>{const bs=[...tr.querySelectorAll(".g-bar")].filter(b=>b.dataset.sid!==sid);let i=0;for(const b of bs){if(b.offsetLeft+b.offsetWidth/2<rx)i++}return{i,bs}};
  v.querySelectorAll(".g-bar").forEach(b=>{
    b.onpointerdown=e=>{if(e.button>0)return;drag={b,sid:b.dataset.sid,part:b.dataset.j,from:b.dataset.m,x0:e.clientX,y0:e.clientY,moved:false,locked:b.classList.contains("run")};try{b.setPointerCapture(e.pointerId)}catch(_){}};
    b.onpointermove=e=>{if(!drag||drag.b!==b)return;
      if(drag.locked){if(!drag.told&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>12){drag.told=true;toast("Makinede çalışan iş taşınamaz. Araya iş almak için alttaki listeyi kullanın.")}return}
      if(!drag.moved){if(Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<6)return;drag.moved=true;
        const g=b.cloneNode(true);g.classList.add("ghost");g.classList.remove("sel");g.style.width=Math.max(60,b.offsetWidth)+"px";g.innerHTML=esc(drag.part);document.body.append(g);drag.ghost=g;b.classList.add("dragging")}
      drag.ghost.style.left=(e.clientX+8)+"px";drag.ghost.style.top=(e.clientY-17)+"px";
      const el=document.elementFromPoint(e.clientX,e.clientY);const row=el&&el.closest(".g-row[data-row]");clearDrop();drag.to=null;
      if(row){const tr=row.querySelector(".g-track");row.classList.add("drop");const rx=e.clientX-tr.getBoundingClientRect().left;const {i,bs}=dropIndex(tr,rx,drag.sid);
        drag.to=row.dataset.row;drag.idx=i;const mk=document.createElement("div");mk.className="g-drop";
        mk.style.left=(bs.length?(i<bs.length?bs[i].offsetLeft-3:bs[bs.length-1].offsetLeft+bs[bs.length-1].offsetWidth+1):2)+"px";tr.append(mk)}};
    const end=e=>{if(!drag||drag.b!==b)return;const d=drag;drag=null;if(d.ghost)d.ghost.remove();b.classList.remove("dragging");clearDrop();
      if(!d.moved){ui.selM=d.from;ui.selJob=d.part;ui._scrollSeq=true;keepX(()=>vTakvim(R));return}
      if(!d.to||e.type==="pointercancel")return;
      S.seq=S.seq||{};const segIds=(R.lanes[d.from]||[]).filter(s=>s.key===d.part).map(s=>s.sid);
      if(d.to!==d.from){S.seq[d.from]=(R.lanes[d.from]||[]).map(s=>s.sid).filter(id=>!segIds.includes(id))}
      const tgt=(R.lanes[d.to]||[]).map(s=>s.sid).filter(id=>d.to===d.from?id!==d.sid:!segIds.includes(id));
      const moving=d.to===d.from?[d.sid]:[d.sid,...segIds.filter(id=>id!==d.sid)];tgt.splice(d.idx,0,...moving);S.seq[d.to]=tgt;
      const job=R.jobs.find(j=>j.key===d.part);let warn="";
      if(d.to!==d.from){S.overrides[d.part]=d.to;if(job&&!job.compat.includes(d.to))warn=job.needR&&job.listed.includes(d.to)?" · dikkat: bu iş robot gerektiriyor":" · dikkat: kalıp bu makine için uygun listede yok"}
      ui.selM=d.to;ui.selJob=d.part;save();keepX(()=>render());toast(`${d.part} → ${d.to}, ${d.idx+1}. sıra${warn}`)};
    b.onpointerup=end;b.onpointercancel=end;
    b.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();ui.selM=b.dataset.m;ui.selJob=b.dataset.j;ui._scrollSeq=true;keepX(()=>vTakvim(R))}};
  });
  v.querySelectorAll("[data-pick]").forEach(l=>{const f=()=>{ui.selM=l.dataset.pick;ui.selJob=null;const sx=$("#gwrap").scrollLeft;vTakvim(R);$("#gwrap").scrollLeft=sx};l.onclick=f;l.onkeydown=e=>{if(e.key==="Enter")f()}});
}

function openSplit(R,mc,part){
  const lane=R.lanes[mc]||[];const cur=lane.find(s=>s.sid===part);if(!cur)return;
  const others=R.jobs.filter(j=>!j.running&&j.key!==part&&j.part!==cur.part).sort((a,b)=>(a.due||"9").localeCompare(b.due||"9"));
  modal(`${cur.part} işini durdur, araya iş al`,`<form id="spf" class="modal-body">
    <div class="field full"><span class="hint">${esc(mc)} makinesindeki ${esc(cur.part)} (${nf0.format(cur.need)} adet) ikiye bölünür. Seçtiğiniz iş araya girer, kalan adet onun arkasından devam eder. Araya kalıp değişimi süreleri otomatik eklenir.</span></div>
    <div class="field"><label for="sp-q">Durdurmadan önce basılacak adet</label><input id="sp-q" name="q" inputmode="numeric" value="${Math.round(cur.need/2)}"><span class="hint">Örn. şu ana kadar basılan + bitirilmesi gereken kısım</span></div>
    <div class="field"><label for="sp-j">Araya alınacak iş</label><select id="sp-j" name="j">${others.map(j=>`<option value="${esc(j.key)}">${esc(j.part)} · ${esc(j.machine||"atanmadı")} · termin ${fmtD(j.due)}${j.compat.includes(mc)?"":" · uyumsuz"}</option>`).join("")}</select><span class="hint">Listede yoksa önce Siparişler'e acil siparişi ekleyin</span></div>
    <div class="field full err" id="sperr" hidden></div></form>`,
    `<button class="btn btn-primary" type="submit" form="spf">Durdur ve araya al</button><button class="btn" type="button" id="spc">Vazgeç</button>`);
  $("#spc").onclick=closeModal;
  $("#spf").onsubmit=e=>{e.preventDefault();const q=Math.round(num($("#sp-q").value));const u=$("#sp-j").value;const err=$("#sperr");
    if(!(q>0&&q<cur.need)){err.hidden=false;err.textContent=`Adet 1 ile ${nf0.format(cur.need-1)} arasında olmalı`;return}
    if(!u){err.hidden=false;err.textContent="Araya alınacak bir iş seçin";return}
    S.splits=S.splits||{};S.seq=S.seq||{};S.splits[part]=q;
    const uj=R.jobs.find(j=>j.key===u);
    if(uj&&uj.machine&&uj.machine!==mc&&S.seq[uj.machine])S.seq[uj.machine]=S.seq[uj.machine].filter(id=>id!==u&&!id.startsWith(u+"#"));
    if(uj&&uj.machine&&uj.machine!==mc){S.seq[uj.machine]=(R.lanes[uj.machine]||[]).map(s=>s.sid).filter(id=>id!==u&&!id.startsWith(u+"#"))}
    S.overrides[u]=mc;const ids=lane.map(s=>s.sid).filter(id=>id!==u&&!id.startsWith(u+"#"));const at=ids.indexOf(part);
    ids.splice(at,1,part+"#1",u,part+"#2");S.seq[mc]=ids;
    ui.selM=mc;ui.selJob=u;save();closeModal();render();toast(`${cur.part} ${nf0.format(q)} adette durdu, araya ${u} alındı`)};
}

function recipePanel(){const prods=[...new Set(S.bom.map(b=>b.product))].sort((a,b)=>a.localeCompare(b,"tr",{numeric:true}));if(!prods.length)return"";
  if(!prods.includes(ui.recProd))ui.recProd=prods[0];
  const bomBy={};S.bom.forEach(b=>{(bomBy[b.product]=bomBy[b.product]||[]).push(b)});
  const open=S.orders.filter(o=>o.product===ui.recProd).reduce((a,o)=>a+(+o.qty||0),0);
  const items=(bomBy[ui.recProd]||[]).slice().sort((a,b)=>CATS.indexOf(catOf(a))-CATS.indexOf(catOf(b)));
  const row=(b,mult,depth)=>{const c=catOf(b),q=(+b.qty||0)*(1+(+b.scrap||0)),u=b.unit||defUnit(b);const kids=depth<5?(bomBy[b.part]||[]):[];const mold=S.molds.find(k=>k.part===b.part);
    return`<div class="rc-row"><span class="rc-cat rc-${catKey(c)}" style="margin-left:${depth*18}px">${depth?"↳ ":""}${esc(c)}</span><span class="code">${esc(b.part)}</span><span class="rc-name">${esc(b.name||(mold?`Kalıp ${mold.code} · ${mold.mat||""}`:""))}</span>
      <span class="num rc-q">${nfQ.format(+b.qty||0)} ${esc(u)}${+b.scrap?` <span class="hint">+%${nfQ.format(b.scrap*100)}</span>`:""}</span><span class="num rc-t">${open?`${nfQ.format(Math.round(open*mult*q*100)/100)} ${esc(u)}`:"–"}</span></div>`+kids.map(k=>row(k,mult*q,depth+1)).join("")};
  const groups=CATS.map(c=>[c,items.filter(b=>catOf(b)===c).length]).filter(x=>x[1]);
  return`<div class="panel"><div class="panel-head"><div><h2 class="panel-title">Mamul reçetesi</h2><div class="panel-sub">${groups.map(([c,n])=>`${n} ${c.toLocaleLowerCase("tr")}`).join(" · ")||"Kalem yok"}${open?` · açık sipariş ${nf0.format(open)} adet`:""}</div></div>
    <div class="toolbar"><label class="hint" for="recP">Mamul</label><input id="recP" class="sel" list="recPl" value="${esc(ui.recProd)}" style="width:150px" autocomplete="off"><datalist id="recPl">${prods.map(p=>`<option value="${esc(p)}">`).join("")}</datalist><button class="btn btn-sm btn-primary" type="button" id="recAdd">Bu mamule kalem ekle</button></div></div>
    <div class="rc-wrap"><div class="rc-head"><span>Grup</span><span>Bileşen</span><span>Açıklama</span><span class="rc-q">Mamul başına</span><span class="rc-t">Açık sipariş için</span></div>
    ${items.length?items.map(b=>row(b,1,0)).join(""):`<div class="empty">Bu mamulün reçetesi yok.</div>`}</div></div>`}
function famPanel(){const g={};S.molds.forEach(k=>{const c=String(k.code).trim();if(!c)return;(g[c]=g[c]||[]);if(!g[c].some(x=>x.part===k.part))g[c].push(k)});
  const rows=Object.entries(g).filter(([c,v])=>v.length>1).sort((a,b)=>a[0].localeCompare(b[0],"tr",{numeric:true}));if(!rows.length)return"";
  const fam=S.family||{};const on=rows.filter(([c])=>fam[c]).length;
  return`<details class="panel fam" ${on?"":"open"}><summary class="panel-head"><div><h2 class="panel-title">Ortak kalıplar · ${rows.length}</h2><div class="panel-sub">Aynı kalıp koduna bağlı birden fazla parça. Tek baskıda birlikte çıkıyorsa "Aile kalıbı" olarak işaretleyin; planda tek iş olarak, aynı anda basılır. ${on} kalıp işaretli.</div></div></summary>
    <div class="tbl-wrap"><table><thead><tr><th>Kalıp</th><th>Parçalar (göz · çevrim)</th><th>Aile kalıbı</th></tr></thead><tbody>
    ${rows.map(([c,v])=>`<tr><td class="code">${esc(c)}</td><td style="white-space:normal">${v.map(k=>`<span class="mchip">${esc(k.part)} · ${esc(k.cav)} göz · ${esc(k.cycle)} sn</span>`).join(" ")}${new Set(v.map(k=>k.cycle)).size>1?` <span class="hint" style="color:var(--warn)">çevrim süreleri farklı</span>`:""}</td>
      <td><label class="fam-toggle"><input type="checkbox" data-fam="${esc(c)}" ${fam[c]?"checked":""}> Birlikte basılır</label></td></tr>`).join("")}
    </tbody></table></div>
    <div class="panel-body hint">Aile kalıbında her parçanın Göz Sayısı, o parçadan bir baskıda kaç adet çıktığını göstermeli (örn. 1 sol + 1 sağ ise her ikisine 1). Süre, ihtiyacı daha uzun süren parçaya göre hesaplanır.</div></details>`}

