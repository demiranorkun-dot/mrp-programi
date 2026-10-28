function vHammadde(R){
  const rows=R.jobs.slice().sort((a,b)=>a.mat.localeCompare(b.mat)||b.kgMain-a.kgMain);
  $("#view").innerHTML=`
  <div class="panel"><div class="panel-head"><h2 class="panel-title">Hammaddeye göre toplam</h2><span class="panel-sub">Parça başı hammadde = parça gramajı + yolluk / göz sayısı</span></div>
  <div class="tbl-wrap"><table><thead><tr><th>Hammadde</th><th class="r">Ana hammadde (kg)</th><th class="r">Masterbatch (kg)</th><th class="r">Toplam (kg)</th></tr></thead><tbody>
  ${Object.entries(R.matTot).map(([k,v])=>`<tr><td>${matTag(k)}</td><td class="r num">${nf0.format(v.main)}</td><td class="r num">${nf1.format(v.mb)}</td><td class="r num">${nf0.format(v.main+v.mb)}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="panel"><div class="panel-head"><h2 class="panel-title">Parça kırılımı</h2></div>
  <div class="tbl-wrap"><table><thead><tr><th>Parça</th><th>Hammadde</th><th class="r">Adet</th><th class="r">g / adet</th><th class="r">Ana (kg)</th><th class="r">MB (kg)</th><th>Makine</th></tr></thead><tbody>
  ${rows.map(j=>`<tr><td class="code">${esc(j.part)}</td><td>${matTag(j.mat)}</td><td class="r num">${nf0.format(j.need)}</td><td class="r num">${nf1.format((+j.mold.partG||0)+(+j.mold.runnerG||0)/(+j.mold.cav||1))}</td><td class="r num">${nf0.format(j.kgMain)}</td><td class="r num">${nf1.format(j.kgMb)}</td><td class="code">${esc(j.machine||"–")}</td></tr>`).join("")}</tbody></table></div></div>
  ${Object.keys(R.buy).length?`<div class="panel"><div class="panel-head"><h2 class="panel-title">Satınalma ihtiyacı</h2><span class="panel-sub">Ürün ağacında Tip = Satınalma olan kalemler</span></div><div class="tbl-wrap"><table><thead><tr><th>Kalem</th><th class="r">Adet</th><th>En erken termin</th><th>Kullanıldığı mamuller</th></tr></thead><tbody>
  ${Object.entries(R.buy).map(([k,v])=>`<tr><td class="code">${esc(k)}</td><td class="r num">${nf0.format(v.need)}</td><td class="num">${fmtD(v.due)}</td><td>${[...v.products].map(esc).join(", ")}</td></tr>`).join("")}</tbody></table></div></div>`:""}`;
}

function vAyar(){
  const st=S.settings;
  $("#view").innerHTML=`
  <div class="panel"><div class="panel-head"><h2 class="panel-title">Plan ayarları</h2></div>
  <form class="panel-body settings-grid" id="setf">
    <div class="field"><label for="s-h">Plan ufku (iş günü)</label><input id="s-h" name="horizon" inputmode="numeric" value="${esc(st.horizon)}"><span class="hint">Doluluk bu süreye göre hesaplanır</span></div>
    <div class="field"><label for="s-s">Plan başlangıcı</label><input id="s-s" name="start" type="date" value="${esc(st.start||"")}"><span class="hint">Boş bırakılırsa plan şu andan başlar</span></div>
    <div class="field"><label for="s-t">Vardiya başlangıç saati</label><input id="s-t" name="shiftStart" type="time" value="${esc(st.shiftStart||"08:00")}"><span class="hint">Günün ilk vardiyasının başladığı saat. Makine, vardiya sayısı × vardiya saati kadar çalışır.</span></div>
    <div class="field"><label for="s-b">Aynı hammadde tercih payı (gün)</label><input id="s-b" name="bonus" inputmode="decimal" value="${esc(st.bonus)}"><span class="hint">Aynı hammaddeyi çalıştıran makine bu kadar gün daha dolu olsa da tercih edilir. 0 yazarsanız sadece yük dengelenir.</span></div>
    <div class="field"><label for="s-c">Kalıp değişim süresi (saat)</label><input id="s-c" name="changeover" inputmode="decimal" value="${esc(st.changeover)}"><span class="hint">Aynı makinede iki iş arasına eklenir</span></div>
    <div class="field"><label for="s-r">Robotlu makineyi koruma payı (gün)</label><input id="s-r" name="robotPay" inputmode="decimal" value="${esc(st.robotPay??1)}"><span class="hint">Robot gerektirmeyen bir parça, robotlu makineye ancak orası bu kadar gün daha boşsa verilir. Robotlu parçalar her zaman robotlu makineye gider.</span></div>
    <div class="field"><label for="s-mb">Varsayılan boya oranı (%)</label><input id="s-mb" name="mbDefault" inputmode="decimal" value="${esc(Math.round((st.mbDefault==null?0.02:st.mbDefault)*1000)/10)}"><span class="hint">Boya kodu olup oranı girilmemiş kalıplarda kullanılır</span></div>
    <div class="field"><label for="s-x">Planlamaya alınmayacak kodlar</label><input id="s-x" name="exclude" value="${esc(st.exclude||"")}" placeholder="Örn. KF-"><span class="hint">Bu öneklerle başlayan mamullerin siparişleri plana girmez. Birden fazlaysa virgülle ayırın.</span></div>
    <div class="field"><label for="s-l">Termin yoksa sipariş tarihine eklenecek gün</label><input id="s-l" name="leadDays" inputmode="numeric" value="${esc(st.leadDays??30)}"><span class="hint">Excel'de termin sütunu yoksa, yükleme sırasında termin sipariş tarihi + bu gün olarak hesaplanır</span></div>
    <div class="field"><label><input type="checkbox" name="useStock" ${st.useStock!==false?"checked":""} style="width:auto;margin-right:6px">Eldeki mamul stoğunu ihtiyaçtan düş</label></div>
    <div class="field"><label><input type="checkbox" name="autoBom" ${st.autoBom!==false?"checked":""} style="width:auto;margin-right:6px">Ürün ağacı yoksa alt parçaları koddan bul (KR-388 → KR-388-1, KR-388-2)</label></div>
    <div class="field"><label><input type="checkbox" name="saturday" ${st.saturday?"checked":""} style="width:auto;margin-right:6px">Cumartesi çalışılıyor</label></div>
    <div class="field" style="justify-content:end"><button class="btn btn-primary" type="submit" style="align-self:start">Ayarları kaydet</button></div>
  </form></div>
  <div class="panel"><div class="panel-head"><h2 class="panel-title">Veri</h2><span class="panel-sub">Kayıtlar yalnızca bu tarayıcıda tutulur · son yedek: ${S.lastBackup?fmtDT(new Date(S.lastBackup)):"hiç alınmadı"} · başka bilgisayarda devam etmek için yedeği orada yükleyin</span></div>
    <div class="panel-body" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center" id="dataBox">
      <button class="btn btn-primary" type="button" id="bkSave">Yedek al</button><button class="btn" type="button" id="bkLoad">Yedekten yükle</button><input type="file" id="bkIn" accept=".txt,.json,text/plain,application/json" hidden>
      <button class="btn" type="button" id="allBtn">Excel şablonundan tümünü yükle</button><input type="file" id="allIn" accept=".xlsx,.xls,.xlsm" hidden>
      <button class="btn" type="button" id="resetDemo">Örnek veriyi yeniden yükle</button>
      <button class="btn btn-danger" type="button" id="wipe">Tüm kayıtları temizle</button>
      <span class="hint" id="dataHint"></span>
    </div></div>
  <p class="note">Planlama mantığı: siparişler stok payıyla mamul ihtiyacına, ürün ağacı ile parça ihtiyacına çevrilir. Saatlik üretim 3600 / çevrim × göz sayısıdır. Net saat/gün = vardiya × saat × verim. İşler termin sırasıyla yerleştirilir; her iş uygun makineler arasından en düşük skoru alana verilir: makinedeki yük (gün), aynı hammadde varsa tercih payı kadar düşülür, plan ufku aşılıyorsa ceza eklenir. Robotlu kalıplar yalnızca robotu olan makinelere atanır; robot gerektirmeyen kalıplar robotlu makineyi ancak koruma payından daha büyük bir avantaj varsa kullanır.</p>`;
  $("#setf").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);
    st.horizon=Math.max(1,Math.round(num(fd.get("horizon"))||22));st.start=fd.get("start")||"";st.shiftStart=fd.get("shiftStart")||"08:00";st.bonus=num(fd.get("bonus"))||0;st.changeover=num(fd.get("changeover"))||0;st.saturday=!!fd.get("saturday");st.robotPay=num(fd.get("robotPay"));if(isNaN(st.robotPay))st.robotPay=1;st.exclude=String(fd.get("exclude")||"").trim();st.leadDays=Math.round(num(fd.get("leadDays")));if(isNaN(st.leadDays))st.leadDays=30;st.useStock=!!fd.get("useStock");st.autoBom=!!fd.get("autoBom");st.mbDefault=num(fd.get("mbDefault"))/100;if(isNaN(st.mbDefault))st.mbDefault=0.02;
    save();render();toast("Ayarlar kaydedildi")};
  const confirmBtn=(btn,label,fn)=>{btn.onclick=()=>{$("#dataHint").innerHTML="";const b=document.createElement("button");b.className="btn btn-danger";b.type="button";b.textContent=label;b.onclick=fn;$("#dataHint").append("Emin misiniz? ",b)}};
  $("#allBtn").onclick=()=>$("#allIn").click();
  $("#allIn").onchange=e=>{const f=e.target.files[0];if(f)readWb(f,importAll)};
  $("#bkSave").onclick=async()=>{const now=new Date(),pad=n=>String(n).padStart(2,"0");
    const name=`PlanPres_yedek_${iso(now)}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
    const txt=JSON.stringify({app:"PlanPres",version:1,savedAt:now.toISOString(),data:{...S,lastBackup:now.toISOString()}});
    let dl=null;try{dl=window.claude&&window.claude.use?await window.claude.use("downloads"):null}catch(e){}
    const fallback=()=>{modal("Yedek dosyası",`<div class="modal-body"><div class="field full"><textarea id="bkTxt" readonly>${esc(txt)}</textarea><span class="hint">Bu görünümde dosya indirilemedi. Metni kopyalayıp bir metin dosyasına yapıştırın ve ${esc(name)} adıyla kaydedin.</span></div></div>`,`<button class="btn" type="button" id="bkC">Kapat</button>`);$("#bkC").onclick=closeModal;const t=$("#bkTxt");t.focus();t.select()};
    if(!dl){fallback();return}
    try{await dl.save({filename:name,data:txt});S.lastBackup=now.toISOString();save();render();toast("Yedek kaydedildi")}
    catch(e){const c=e&&e.code;if(c==="declined")toast("Yedek kaydedilmedi");else if(c==="rate_limited")toast("Önceki kaydetme penceresi hâlâ açık");else fallback()}};
  $("#bkLoad").onclick=()=>$("#bkIn").click();
  $("#bkIn").onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();
    rd.onload=()=>{let o;try{o=JSON.parse(rd.result)}catch(_){toast("Dosya okunamadı: geçerli bir PlanPres yedeği değil");return}
      const d=o&&o.data;if(!d||!Array.isArray(d.machines)||!Array.isArray(d.molds)||!Array.isArray(d.orders)){toast("Bu dosya bir PlanPres yedeği değil");return}
      const when=o.savedAt?fmtDT(new Date(o.savedAt)):"tarihsiz";$("#dataHint").innerHTML="";
      const b=document.createElement("button");b.className="btn btn-danger";b.type="button";b.textContent="Evet, yedeği yükle";
      b.onclick=()=>{S=Object.assign({settings:{},machines:[],molds:[],bom:[],orders:[],overrides:{}},d);save();render();toast(`Yedek yüklendi (${when})`)};
      $("#dataHint").append(`${when} tarihli yedek: ${d.orders.length} sipariş, ${d.molds.length} kalıp, ${d.machines.length} makine. Mevcut veriler silinip bunlar yüklensin mi? `,b)};
    rd.onerror=()=>toast("Dosya okunamadı");rd.readAsText(f);e.target.value=""};
  confirmBtn($("#resetDemo"),"Evet, örnek veriyi yükle",()=>{S=demo();save();render();toast("Örnek veri yüklendi")});
  confirmBtn($("#wipe"),"Evet, temizle",()=>{S={demo:false,settings:S.settings,machines:[],molds:[],bom:[],orders:[],overrides:{}};save();render();toast("Kayıtlar temizlendi")});
}

render();
})();
