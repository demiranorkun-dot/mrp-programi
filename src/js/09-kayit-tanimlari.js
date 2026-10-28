/* ---------- generic CRUD ---------- */
const DEF={
  siparisler:{list:()=>S.orders,title:"Sipariş",cols:[
      {k:"no",l:"Sipariş No",code:1},{k:"customer",l:"Müşteri"},{k:"product",l:"Mamul",code:1},{k:"qty",l:"Adet",n:1},{k:"due",l:"Termin",d:1},{k:"extra",l:"Stok payı",p:1},{k:"stock",l:"Eldeki stok",n:1},{k:"prio",l:"Öncelik",n:1}],
    fields:[{k:"no",l:"Sipariş No",req:1},{k:"customer",l:"Müşteri"},{k:"product",l:"Mamul kodu",req:1,list:()=>[...new Set(S.bom.map(b=>b.product))]},{k:"qty",l:"Sipariş adedi",type:"number",req:1},
      {k:"due",l:"Termin",type:"date",req:1},{k:"extra",l:"Stok payı (%)",type:"number",pct:1,hint:"Siparişin üzerine üretilecek pay"},{k:"stock",l:"Eldeki mamul stoğu",type:"number",hint:"Aynı mamulün tüm siparişlerinden bir kez düşülür"},{k:"orderDate",l:"Sipariş tarihi",type:"date"},{k:"prio",l:"Öncelik",type:"number"}],
    paste:["no","customer","product","qty","due","extra","stock","orderDate"],pasteHint:"Sipariş No · Müşteri · Mamul · Adet · Termin (gg.aa.yyyy) · Stok payı % · Eldeki stok · Sipariş tarihi"},
  agac:{list:()=>S.bom,title:"Reçete satırı",cols:[{k:"product",l:"Mamul",code:1},{k:"part",l:"Bileşen",code:1},{k:"name",l:"Bileşen adı"},{k:"cat",l:"Grup",f:b=>catOf(b)},{k:"qty",l:"Miktar",f:b=>nfQ.format(+b.qty||0)},{k:"unit",l:"Birim",f:b=>b.unit||defUnit(b)},{k:"scrap",l:"Fire",p:1}],
    fields:[{k:"product",l:"Mamul kodu",req:1,list:()=>[...new Set([...S.orders.map(o=>o.product),...S.bom.map(b=>b.product)])]},{k:"part",l:"Bileşen kodu",req:1,list:()=>[...new Set([...S.molds.map(k=>k.part),...(S.materials||[]).map(m=>m.code)])]},{k:"name",l:"Bileşen adı"},
      {k:"cat",l:"Kalem grubu",opts:CATS,hint:"Yarı mamul enjeksiyonda üretilir; diğerleri satınalma ihtiyacına (MRP) girer"},{k:"qty",l:"Mamul başına miktar",type:"number",req:1,hint:"Örn. 50'li koli için 0,02"},{k:"unit",l:"Birim",opts:["adet","kg","gr","m","lt"]},{k:"scrap",l:"Fire (%)",type:"number",pct:1,hint:"İhtiyaç bu oranda artırılır"}],
    paste:["product","part","name","cat","qty","unit","scrap"],pasteHint:"Mamul · Bileşen kodu · Bileşen adı · Grup (Yarı mamul/Hammadde/Boya/Bağlantı elemanı/Ambalaj/Etiket/Diğer) · Miktar · Birim · Fire %"},
  kaliplar:{list:()=>S.molds,title:"Kalıp",cols:[{k:"code",l:"Kalıp",code:1},{k:"part",l:"Parça",code:1},{k:"cav",l:"Göz",n:1},{k:"cycle",l:"Çevrim sn",n:1},{k:"partG",l:"Parça g",n:1},{k:"runnerG",l:"Yolluk g",n:1},{k:"mat",l:"Hammadde",mat:1},{k:"mode",l:"Çalışma",f:k=>k.mode||"Otomatik"},{k:"mb",l:"MB",p:1},{k:"mbCode",l:"Boya",code:1},{k:"machines",l:"Uygun makineler",ms:1},{k:"_rate",l:"Adet/saat",n:1,f:k=>(+k.cycle>0)?3600/k.cycle*(+k.cav||1):0}],
    fields:[{k:"code",l:"Kalıp kodu",req:1},{k:"part",l:"Ürettiği parça",req:1},{k:"cav",l:"Göz sayısı",type:"number",req:1},{k:"cycle",l:"Çevrim süresi (sn)",type:"number",req:1},
      {k:"partG",l:"Parça gramajı (g)",type:"number"},{k:"runnerG",l:"Yolluk / vuruş (g)",type:"number"},{k:"mat",l:"Hammadde",req:1,list:()=>[...new Set(S.molds.map(m=>m.mat))]},{k:"mb",l:"Masterbatch (%)",type:"number",pct:1},
      {k:"mbCode",l:"Boya / masterbatch kodu",hint:"Boşsa boyasız; oran girilmemişse Ayarlar'daki varsayılan oran kullanılır"},{k:"mode",l:"Çalışma şekli",opts:["Otomatik","Robotlu","Operatörlü"]},{k:"machines",l:"Uygun makineler",ms:1,full:1}],
    paste:["code","part","cav","cycle","partG","runnerG","mat","mb","machines","mode","mbCode"],pasteHint:"Kalıp · Parça · Göz · Çevrim sn · Parça g · Yolluk g · Hammadde · MB % · Uygun makineler (M01,M02) · Çalışma (Otomatik/Robotlu/Operatörlü) · Boya kodu"},
  makineler:{list:()=>S.machines,title:"Makine",cols:[{k:"code",l:"Makine",code:1},{k:"ton",l:"Tonaj",n:1},{k:"shifts",l:"Vardiya",n:1},{k:"hours",l:"Saat/vardiya",n:1},{k:"eff",l:"Verim",p:1},{k:"robot",l:"Robot",f:m=>hasRobot(m)?"Var":"Yok"},{k:"rPart",l:"Çalışan iş",code:1},{k:"rRemain",l:"Kalan",f:m=>m.rPart?(m.rRemain===""||m.rRemain==null?"tümü":nf0.format(m.rRemain)):""},{k:"_net",l:"Net saat/gün",n:1,f:m=>netHours(m),dec:1},{k:"hourCost",l:"TL / saat",f:m=>m.hourCost===""||m.hourCost==null?"":nfQ.format(+m.hourCost)}],
    fields:[{k:"code",l:"Makine kodu",req:1,hint:"Kısa ve benzersiz, örn. M09"},{k:"ton",l:"Tonaj",type:"number"},{k:"shifts",l:"Vardiya / gün",type:"number",def:3},{k:"hours",l:"Saat / vardiya",type:"number",def:7.5},{k:"eff",l:"Verim (%)",type:"number",pct:1,def:.85,hint:"Duruş ve kalıp değişimleri payı"},{k:"robot",l:"Robot",opts:["Yok","Var"]},{k:"rPart",l:"Şu an çalışan parça",list:()=>S.molds.map(k=>k.part),hint:"Boş bırakırsanız makine boş kabul edilir"},{k:"rRemain",l:"Bu iş için kalan adet",type:"number",hint:"Boşsa parçanın sipariş ihtiyacının tamamı"},{k:"hourCost",l:"Saat maliyeti (TL)",type:"number",hint:"Makine, işçilik ve enerji dahil saat başına maliyet. Maliyet analizinde kullanılır."}],
    paste:["code","ton","shifts","hours","eff","robot","hourCost"],pasteHint:"Makine · Tonaj · Vardiya · Saat/vardiya · Verim % · Robot (Var/Yok) · Saat maliyeti TL"},
  uretim:{list:()=>S.production||(S.production=[]),title:"Üretim kaydı",cols:[{k:"date",l:"Tarih",d:1},{k:"shift",l:"Vardiya"},{k:"machine",l:"Makine",code:1},{k:"part",l:"Parça",code:1},{k:"good",l:"Sağlam",n:1},{k:"scrap",l:"Fire",n:1},{k:"runH",l:"Çalışma sa",f:r=>r.runH===""||r.runH==null?"":nf1.format(+r.runH)},{k:"downH",l:"Duruş sa",f:r=>r.downH===""||r.downH==null?"":nf1.format(+r.downH)},{k:"reason",l:"Duruş nedeni"}],
    fields:[{k:"date",l:"Üretim tarihi",type:"date",req:1},{k:"shift",l:"Vardiya",opts:["1","2","3"]},{k:"machine",l:"Makine",req:1,list:()=>S.machines.map(m=>m.code)},{k:"part",l:"Parça kodu",req:1,list:()=>S.molds.map(k=>k.part)},
      {k:"good",l:"Sağlam adet",type:"number",req:1},{k:"scrap",l:"Fire adet",type:"number",hint:"Fire yoksa 0 yazın"},{k:"runH",l:"Çalışma süresi (saat)",type:"number",hint:"Makinenin bu işte fiilen bastığı süre"},{k:"downH",l:"Duruş süresi (saat)",type:"number",hint:"Duruş yoksa 0 yazın; boş kalırsa kullanılabilirlik hesaplanmaz"},
      {k:"reason",l:"Duruş nedeni",list:()=>["Kalıp değişimi","Arıza","Malzeme bekleme","Operatör yok","Kalite / ayar","Planlı bakım","Elektrik / hava"]}],
    paste:["date","shift","machine","part","good","scrap","runH","downH","reason"],pasteHint:"Tarih · Vardiya · Makine · Parça · Sağlam · Fire · Çalışma saat · Duruş saat · Duruş nedeni"}
};
DEF.malzemeler={list:()=>S.materials||(S.materials=[]),title:"Malzeme",cols:[{k:"code",l:"Kod",code:1},{k:"name",l:"Ad"},{k:"mtype",l:"Tip",f:r=>r.mtype||"Hammadde"},{k:"stock",l:"Stok",n:1},{k:"incoming",l:"Yolda",n:1},{k:"incomingDate",l:"Geliş",d:1},{k:"lead",l:"Tedarik gün",n:1},{k:"safety",l:"Emniyet stoğu",n:1},{k:"moq",l:"Min. sipariş",n:1},{k:"price",l:"Birim fiyat TL",f:r=>r.price===""||r.price==null?"":nfQ.format(+r.price)}],
  fields:[{k:"code",l:"Malzeme kodu",req:1,hint:"Kalıplardaki hammadde / boya kodu ya da ürün ağacındaki satınalma kodu ile aynı olmalı"},{k:"name",l:"Malzeme adı"},{k:"mtype",l:"Tip",opts:["Hammadde","Boya","Bağlantı elemanı","Ambalaj","Etiket","Yarı mamul","Diğer"]},{k:"stock",l:"Eldeki stok",type:"number",hint:"Hammadde ve boya için kg, parça için adet"},{k:"incoming",l:"Yoldaki / açık satınalma",type:"number"},{k:"incomingDate",l:"Yoldakinin geliş tarihi",type:"date",hint:"Boşsa hemen kullanılabilir sayılır"},{k:"lead",l:"Tedarik süresi (gün)",type:"number"},{k:"safety",l:"Emniyet stoğu",type:"number"},{k:"moq",l:"Minimum sipariş miktarı",type:"number"},{k:"price",l:"Birim fiyat (TL)",type:"number",hint:"Hammadde ve boya için TL/kg, diğerleri için TL/adet. Maliyet analizinde kullanılır."}],
  paste:["code","name","mtype","stock","incoming","incomingDate","lead","safety","moq","price"],pasteHint:"Kod · Ad · Tip (Hammadde/Boya/Bağlantı elemanı/Ambalaj/Etiket/Diğer) · Stok · Yolda · Geliş tarihi · Tedarik gün · Emniyet stoğu · Min. sipariş · Birim fiyat TL"};
DEF.kaliplar.importExtra=[{k:"_auto",l:"Otomatik çalışır mı? (Evet/Hayır)"}];
function cell(c,r){const v=c.f?c.f(r):r[c.k];
  if(c.ms)return(v||[]).map(x=>`<span class="mchip">${esc(x)}</span>`).join("");
  if(c.mat)return matTag(v);
  if(c.d)return`<span class="num">${fmtD(v)}</span>`;
  if(c.p)return`<span class="num">${pct(+v||0)}</span>`;
  if(c.n)return`<span class="num">${c.dec?nf1.format(+v||0):nf0.format(+v||0)}</span>`;
  return c.code?`<span class="code">${esc(v)}</span>`:esc(v)}
function vCrud(id){
  const d=DEF[id];const q=(ui.q[id]||"").toLowerCase();
  const rows=d.list().filter(r=>!q||d.cols.some(c=>String(c.f?"":Array.isArray(r[c.k])?r[c.k].join(","):r[c.k]??"").toLowerCase().includes(q)));
  $("#view").innerHTML=(id==="kaliplar"?famPanel():id==="agac"?recipePanel():"")+`<div class="panel"><div class="panel-head"><div><h2 class="panel-title">${esc(d.title)} listesi</h2><div class="panel-sub">${d.list().length} kayıt · satıra tıklayıp düzenleyin</div></div>
    <div class="toolbar"><input class="search" id="q-${id}" type="search" placeholder="Ara" value="${esc(ui.q[id]||"")}" aria-label="Ara">
    <button class="btn" type="button" id="pasteBtn"><svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>Excel'den yapıştır</button>
    <button class="btn" type="button" id="fileBtn"><svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v5h16v-5"/></svg>Excel dosyası</button><input type="file" id="fileIn" accept=".xlsx,.xls,.xlsm,.csv" hidden>
    <button class="btn btn-primary" type="button" id="addBtn"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Yeni ${esc(d.title.toLowerCase())}</button></div></div>
    <div class="tbl-wrap"><table><thead><tr>${d.cols.map(c=>`<th class="${c.n||c.p?"r":""}">${esc(c.l)}</th>`).join("")}</tr></thead><tbody>
    ${rows.map(r=>`<tr class="clickable" data-id="${esc(r.id)}" tabindex="0">${d.cols.map(c=>`<td class="${c.n||c.p?"r":""}">${cell(c,r)}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="${d.cols.length}" class="empty">${q?"Aramaya uyan kayıt yok.":"Henüz kayıt yok. Yeni ekleyin ya da Excel'den yapıştırın."}</td></tr>`}
    </tbody></table></div></div>`;
  const qi=$("#q-"+id);qi.oninput=()=>{ui.q[id]=qi.value;const pos=qi.selectionStart;vCrud(id);const n=$("#q-"+id);n.focus();n.setSelectionRange(pos,pos)};
  $("#addBtn").onclick=()=>openForm(id,null,id==="uretim"?{date:today(),shift:"1"}:undefined);
  if(id==="kaliplar")$("#view").querySelectorAll("[data-fam]").forEach(c=>c.onchange=()=>{S.family=S.family||{};if(c.checked)S.family[c.dataset.fam]=true;else delete S.family[c.dataset.fam];save();renderNav();
    toast(c.checked?`Kalıp ${c.dataset.fam} aile kalıbı: parçaları birlikte basılacak`:`Kalıp ${c.dataset.fam} ayrı ayrı planlanacak`)});
  if(id==="agac"){const rp=$("#recP");if(rp)rp.onchange=()=>{ui.recProd=rp.value.trim();vCrud(id)};const ra=$("#recAdd");if(ra)ra.onclick=()=>openForm("agac",null,{product:ui.recProd})}
  $("#pasteBtn").onclick=()=>openPaste(id);
  $("#fileBtn").onclick=()=>$("#fileIn").click();
  $("#fileIn").onchange=e=>{const f=e.target.files[0];if(f)openFile(id,f)};
  $("#view").querySelectorAll("tr[data-id]").forEach(tr=>{const open=()=>openForm(id,d.list().find(r=>r.id===tr.dataset.id));tr.onclick=open;tr.onkeydown=e=>{if(e.key==="Enter")open()}});
}
const vSiparis=()=>vCrud("siparisler"),vAgac=()=>vCrud("agac"),vKalip=()=>vCrud("kaliplar"),vMakine=()=>vCrud("makineler");

function closeModal(){$("#modalRoot").innerHTML=""}
function modal(title,body,foot){
  $("#modalRoot").innerHTML=`<div class="modal-bg" id="mbg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="modal-head"><h2 id="mt">${esc(title)}</h2><button class="btn btn-ghost" type="button" id="mx" style="margin-left:auto" aria-label="Kapat">✕</button></div>${body}<div class="modal-foot">${foot}</div></div></div>`;
  $("#mx").onclick=closeModal;$("#mbg").onclick=e=>{if(e.target.id==="mbg")closeModal()};
  const f=$("#modalRoot").querySelector("input,select,textarea");if(f)f.focus();
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
function openForm(id,rec,pre){
  const d=DEF[id];const isNew=!rec;const r=rec||pre||{};
  const body=`<form id="frm" class="modal-body">${d.fields.map(f=>{const v=r[f.k];const fid="f-"+f.k;
    if(f.ms){return`<div class="field full"><label>${esc(f.l)}</label><div class="checks">${S.machines.map(m=>`<label><input type="checkbox" name="ms" value="${esc(m.code)}" ${(v||[]).includes(m.code)?"checked":""}>${esc(m.code)}</label>`).join("")}</div><span class="hint">Bu kalıbın bağlanabildiği makineler</span></div>`}
    if(f.opts)return`<div class="field"><label for="${fid}">${esc(f.l)}</label><select id="${fid}" name="${f.k}">${f.opts.map(o=>`<option ${o===(v||f.opts[0])?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`;
    const val=f.pct&&v!=null&&v!==""?Math.round(v*1000)/10:(v??"");
    const dl=f.list?`<datalist id="dl-${f.k}">${f.list().map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`:"";
    return`<div class="field ${f.full?"full":""}"><label for="${fid}">${esc(f.l)}${f.req?" *":""}</label><input id="${fid}" name="${f.k}" type="${f.type==="date"?"date":"text"}" ${f.type==="number"?'inputmode="decimal"':""} value="${esc(val)}" ${f.list?`list="dl-${f.k}"`:""} autocomplete="off">${dl}${f.hint?`<span class="hint">${esc(f.hint)}</span>`:""}</div>`}).join("")}
    <div class="field full err" id="ferr" hidden></div></form>`;
  const foot=`<button class="btn btn-primary" type="submit" form="frm">${isNew?"Ekle":"Kaydet"}</button><button class="btn" type="button" id="fc">Vazgeç</button>${isNew?"":`<span style="margin-left:auto;display:flex;gap:8px;align-items:center" id="delWrap"><button class="btn btn-danger" type="button" id="fdel">Sil</button></span>`}`;
  modal((isNew?"Yeni ":"")+d.title+(isNew?"":" düzenle"),body,foot);
  $("#fc").onclick=closeModal;
  if(!isNew)$("#fdel").onclick=()=>{$("#delWrap").innerHTML=`<span class="hint">Silinsin mi?</span><button class="btn btn-danger" type="button" id="fdel2">Evet, sil</button>`;
    $("#fdel2").onclick=()=>{const L=d.list();L.splice(L.indexOf(rec),1);S.demo=S.demo&&true;save();closeModal();render();toast("Kayıt silindi")}};
  $("#frm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);const out={};const errs=[];
    for(const f of d.fields){if(f.ms){out[f.k]=fd.getAll("ms");continue}
      let v=(fd.get(f.k)??"").toString().trim();
      if(f.req&&!v){errs.push(`${f.l} boş olamaz`);continue}
      if(f.type==="number"){if(v===""){out[f.k]=f.pct?0:"";continue}const n=num(v);if(isNaN(n)){errs.push(`${f.l} sayı olmalı`);continue}out[f.k]=f.pct?n/100:n}else out[f.k]=v}
    const keyF=d.fields[0].k;if(id!=="agac"&&id!=="uretim"&&out[keyF]&&d.list().some(x=>x!==rec&&x[keyF]===out[keyF]))errs.push(`${out[keyF]} zaten kayıtlı`);
    if(errs.length){const el=$("#ferr");el.hidden=false;el.textContent=errs.join(" · ");return}
    if(isNew)d.list().push({id:uid(),...out});else Object.assign(rec,out);
    save();closeModal();render();toast(isNew?"Kayıt eklendi":"Değişiklikler kaydedildi")};
}
function parseDate(s){s=String(s).trim();let m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);if(m){const y=m[3].length===2?2000+ +m[3]:+m[3];return iso(new Date(y,m[2]-1,+m[1]))}
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?s.slice(0,10):""}
function normOpt(f,v){v=String(v||"").trim();
  if(f.k==="robot")return(/var|evet|robot|^e$|^x$|^1$/i.test(v)&&!/yok|hay/i.test(v))?"Var":"Yok";
  if(f.k==="mode")return/rob/i.test(v)?"Robotlu":/op|man|elle/i.test(v)?"Operatörlü":"Otomatik";
  if(f.k==="mtype"){const c=catFromText(v);return c||(v&&/par|kom|sat|aksesuar/i.test(v)?"Diğer":"Hammadde")}
  if(f.k==="cat"){const c=catFromText(v);return c||(/^yar|^üre|^ure/i.test(v)?"Yarı mamul":"")}
  const hit=f.opts.find(o=>o.toLowerCase().slice(0,3)===v.toLowerCase().slice(0,3));return hit||f.opts[0]}
const nrm=s=>String(s??"").toLocaleLowerCase("tr").replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c").replace(/[^a-z0-9]/g,"");
const SYN={
  siparisler:{_sheet:["siparisler","siparis","aciksiparisler"],no:["siparisno","sipno","evrakno","belgeno","evraksirano"],customer:["musteri","cariismi","cariadi","cariunvani","cari","unvan"],product:["mamulkodu","stokkodu","kodu","urunkodu","mamul"],qty:["kalansiparismiktari","kalanmiktar","kalanadet","kalan","siparisadet","siparismiktar","miktar","adet"],due:["termin","termintarihi","teslimtarihi","sevktarihi"],extra:["stokfazlasi","stokpayi"],stock:["stokeldekimiktar","eldekimiktar","eldekistok","stokmiktari"],orderDate:["siparistarihi","evraktarihi"]},
  agac:{_sheet:["mamulrecetesi","urunagaci","agac","bom","urunagaclari","recetesatirlari"],product:["mamulkodu","mamul","anaurun"],part:["bilesenkodu","altparcakodu","altparca","bilesen","parca"],name:["bilesenadi","altparcaadi","malzemeadi","stokadi","aciklama"],cat:["kalemgrubu","grup","grubu","malzemegrubu","tip","tur"],qty:["mamulbasinamiktar","mamulbasinaadet","mamulbasina","miktar","adet","carpan"],unit:["birim","birimi"],scrap:["fire","fireorani","kayip"]},
  kaliplar:{_sheet:["kaliplar","kalip","urunrecetesi","recete"],code:["kalipkodu","kalipno","kalip"],part:["parcakodu","urunkodu","parca","stokkodu"],cav:["gozsayisi","goz","kavite"],cycle:["cevrimsn","cevrimsuresi","cevrim","cycle"],partG:["parcagramajig","parcagramaji","gramaj","agirlik"],runnerG:["yollukvurusg","yollukvurus","yollukgramaji","yolluk"],mat:["hammadde1kodu","hammaddekodu","hammadde","hammadde1","malzeme"],mb:["masterbatch","mb","boyaorani"],machines:["uygunmakineler","anamakine","alternatifmakine","makineler","makine"],mode:["calismasekli","calisma","robotlu","robot"],_auto:["otomatik","otomatikcalisma","otomatikmi"],mbCode:["boyakodu","masterbatchkodu","boya"]},
  makineler:{_sheet:["makineler","makinelistesi","makine"],code:["makinekodu","makineno","makine"],ton:["tonaj","ton"],shifts:["vardiyagun","vardiyasayisi","vardiya"],hours:["saatvardiya","vardiyasaati","saat"],eff:["verim","oee"],robot:["robot"],hourCost:["saatmaliyeti","saatlikmaliyet","makinesaatmaliyeti","tlsaat","saatucreti"]},
  uretim:{_sheet:["uretimgirisi","uretimkayitlari","uretim","gerceklesen","gerceklesme"],date:["uretimtarihi","tarih","date"],shift:["vardiya","vardiyano"],machine:["makinekodu","makineno","makine"],part:["parcakodu","stokkodu","urunkodu","parca","kodu"],good:["saglamadet","saglammiktar","saglam","uretilenmiktar","uretimmiktari","uretilen","miktar","adet"],scrap:["fireadet","firemiktari","fire","hurda","red"],runH:["calismasuresi","calismasaati","calisma"],downH:["durussuresi","durussaati","durus"],reason:["durusnedeni","neden","aciklama"]}
};
SYN.malzemeler={_sheet:["malzemeler","stoklar","stok","hammadde","malzeme"],code:["stokkodu","malzemekodu","hammaddekodu","kodu","kod"],name:["stokadi","stokismi","malzemeadi","ismi","adi","aciklama"],mtype:["malzemetipi","tip","tur","cinsi"],stock:["eldekimiktar","stokeldekimiktar","stokmiktari","mevcut","bakiye","stok","miktar"],incoming:["yoldaki","yoldakimiktar","bekleyensatinalma","aciksatinalma","verilensiparis","bekleyensiparis","yolda"],incomingDate:["gelistarihi","teslimtarihi","termin"],lead:["tedariksuresi","teminsuresi","leadtime","tedarikgun"],safety:["emniyetstogu","minimumstok","minstok","emniyet"],moq:["minsiparis","minimumsiparis","minsiparismiktari","moq"],price:["birimfiyat","birimfiyati","alisfiyati","fiyat","birimmaliyet","maliyet"]};
