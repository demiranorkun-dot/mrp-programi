const pickCell=(map,r,k)=>Array.isArray(map[k])?map[k].map(i=>r[i]).filter(x=>x!==""&&x!=null).join(k==="machines"?",":"-"):(map[k]==null?"":r[map[k]]);
function autoMap(id,hdr){const d=DEF[id],syn=SYN[id],map={},used=new Set();const H=(hdr||[]).map(nrm);
  const keys=[...d.paste,...(d.importExtra||[]).map(x=>x.k)];
  for(const k of keys){const f=d.fields.find(x=>x.k===k);if(f&&f.ms){const ix=H.map((h,i)=>i).filter(i=>H[i]&&(syn[k]||[]).some(s=>H[i].includes(s))&&!/tonaj|sayisi|adet/.test(H[i]));if(ix.length){map[k]=ix;ix.forEach(i=>used.add(i))}}}
  for(const pass of [0,1])for(const k of keys){if(map[k]!=null)continue;for(const s of syn[k]||[]){const i=H.findIndex((h,ix)=>!used.has(ix)&&h&&(pass?h.includes(s):h===s));if(i>=0){map[k]=i;used.add(i);break}}}
  if(id==="siparisler"&&map.no==null){const a=H.indexOf("serino"),b=H.indexOf("sirano");if(a>=0&&b>=0)map.no=[a,b];else if(b>=0)map.no=b}
  return map}
function headerRow(id,rows){let best=0,bs=-1;for(let r=0;r<Math.min(10,rows.length);r++){const n=Object.keys(autoMap(id,rows[r])).length;if(n>bs){bs=n;best=r}}return best}
function pickSheet(id,names){const syn=SYN[id]._sheet;let best=0,bs=-1;names.forEach((n,i)=>{const x=nrm(n);let s=0;syn.forEach((y,j)=>{if(x===y)s=Math.max(s,10-j);else if(x.includes(y))s=Math.max(s,5-j*.1)});if(s>bs){bs=s;best=i}});return best}
function xDate(v){if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Math.round((v-25569)*86400000));return iso(new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()))}return parseDate(v)}
function convRow(id,get){const d=DEF[id];const o={};
  for(const k of d.paste){const f=d.fields.find(x=>x.k===k);const v=get(k);
    if(f.ms)o[k]=String(v??"").split(/[,;\s/]+/).filter(Boolean);
    else if(f.type==="date")o[k]=xDate(v);
    else if(f.type==="number"){const n=typeof v==="number"?v:num(v);o[k]=(v===""||v==null||isNaN(n))?"":(f.pct?(String(v).includes("%")||n>1?n/100:n):n)}
    else if(f.opts)o[k]=normOpt(f,v);
    else o[k]=String(v??"").trim();
    if(o[k]===""&&f.def!=null)o[k]=f.def}
  if(id==="agac"&&!o.cat)o.cat=inferCat(o)||"Diğer";
  if(id==="siparisler"&&!o.due&&o.orderDate){const dd=parseISO(o.orderDate);dd.setDate(dd.getDate()+(S.settings.leadDays==null?30:+S.settings.leadDays||0));o.due=iso(dd)}
  if(id==="kaliplar"){const a=String(get("_auto")??"").trim();
    const robotYes=/^(evet|e|var|x|1|robotlu)$/i.test(String(get("mode")??"").trim());
    if(robotYes)o.mode="Robotlu";else if(o.mode!=="Operatörlü")o.mode=(a&&/^(hay|yok|h$|0)/i.test(a))?"Operatörlü":"Otomatik"}
  return o}
const validRow=(id,o)=>DEF[id].fields.filter(f=>f.req&&!f.ms).every(f=>o[f.k]!==""&&o[f.k]!=null)&&(id!=="siparisler"||+o.qty>0);
const sheetRows=(wb,name)=>XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:"",blankrows:false});
function readWb(file,cb){if(!window.XLSX){toast("Excel okuyucu yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.");return}
  const rd=new FileReader();rd.onerror=()=>toast("Dosya okunamadı");
  rd.onload=()=>{let wb;try{wb=XLSX.read(new Uint8Array(rd.result),{type:"array"})}catch(e){toast("Bu dosya okunamadı ("+String(e&&e.message||e).slice(0,80)+"). Excel'de .xlsx olarak kaydedip tekrar deneyin.");return}
    try{cb(wb)}catch(e){toast("Dosya işlenirken hata: "+String(e&&e.message||e).slice(0,100))}};
  rd.readAsArrayBuffer(file)}
function openFile(id,file){readWb(file,wb=>mapDialog(id,wb,file.name))}
function mapDialog(id,wb,fname){
  const d=DEF[id];let si=pickSheet(id,wb.SheetNames),rows,hr,map,rep=false;
  const prep=()=>{rows=sheetRows(wb,wb.SheetNames[si]);hr=headerRow(id,rows);map=autoMap(id,rows[hr])};prep();
  const draw=()=>{const hdr=rows[hr]||[];
    const data=rows.slice(hr+1).map(r=>convRow(id,k=>pickCell(map,r,k))).filter(o=>validRow(id,o));
    const first=data[0]?d.paste.map(k=>Array.isArray(data[0][k])?data[0][k].join(","):(data[0][k]===""?"–":data[0][k])).join(" · "):"";
    const body=`<div class="modal-body">
      <div class="field full"><span class="hint">${esc(fname)} · sütunlar başlıklara göre otomatik eşleştirildi, yanlış olanı değiştirin</span></div>
      <div class="field"><label for="xs">Sayfa</label><select id="xs">${wb.SheetNames.map((n,i)=>`<option value="${i}" ${i===si?"selected":""}>${esc(n)}</option>`).join("")}</select></div>
      <div class="field"><label for="xh">Başlık satırı</label><select id="xh">${rows.slice(0,10).map((r,i)=>`<option value="${i}" ${i===hr?"selected":""}>${i+1}. satır</option>`).join("")}</select></div>
      ${[...d.paste,...(d.importExtra||[]).map(x=>x.k)].map(k=>{const f=d.fields.find(x=>x.k===k)||d.importExtra.find(x=>x.k===k);
        if(f.ms)return`<div class="field full"><label>${esc(f.l)} · birden fazla sütun seçilebilir</label><div class="checks">${hdr.map((h,i)=>String(h)===""?"":`<label><input type="checkbox" data-ms="${k}" value="${i}" ${(map[k]||[]).includes(i)?"checked":""}>${esc(h)}</label>`).join("")}</div></div>`;
        return`<div class="field"><label for="xm-${k}">${esc(f.l)}${f.req?" *":""}</label><select id="xm-${k}" data-k="${k}"><option value="">Kullanma</option>${hdr.map((h,i)=>`<option value="${i}" ${map[k]===i?"selected":""}>${esc(h||("Sütun "+(i+1)))}</option>`).join("")}</select></div>`}).join("")}
      <div class="field full"><label><input type="checkbox" id="xr" ${rep?"checked":""} style="width:auto;margin-right:6px">Mevcut ${esc(d.title.toLowerCase())} kayıtlarını silip bunlarla değiştir</label></div>
      <div class="field full hint">${data.length?`${data.length} satır aktarılacak. İlk satır: ${esc(first)}`:"Aktarılacak satır yok. Zorunlu (*) alanların sütunlarını seçin."}</div></div>`;
    modal(`Excel'den ${d.title.toLowerCase()} yükle`,body,`<button class="btn btn-primary" type="button" id="xgo" ${data.length?"":"disabled"}>${data.length} kaydı aktar</button><button class="btn" type="button" id="xc">Vazgeç</button>`);
    $("#xs").onchange=e=>{si=+e.target.value;prep();draw()};
    $("#xh").onchange=e=>{hr=+e.target.value;map=autoMap(id,rows[hr]);draw()};
    $("#xr").onchange=e=>{rep=e.target.checked};
    $("#modalRoot").querySelectorAll("select[data-k]").forEach(s=>s.onchange=()=>{if(s.value==="")delete map[s.dataset.k];else map[s.dataset.k]=+s.value;draw()});
    $("#modalRoot").querySelectorAll("input[data-ms]").forEach(c=>c.onchange=()=>{const k=c.dataset.ms;map[k]=[...$("#modalRoot").querySelectorAll(`input[data-ms="${k}"]:checked`)].map(x=>+x.value);if(!map[k].length)delete map[k];draw()});
    $("#xc").onclick=closeModal;
    $("#xgo").onclick=()=>{const L=d.list();if(rep)L.length=0;data.forEach(o=>L.push({id:uid(),...o}));S.demo=false;save();closeModal();render();toast(`${data.length} kayıt aktarıldı`)}};
  draw()}
function importAll(wb){const ids=["makineler","kaliplar","agac","siparisler"],best={};
  wb.SheetNames.forEach(n=>{let rows;try{rows=sheetRows(wb,n)}catch(e){return}if(!rows.length)return;
    for(const id of ids){const hr=headerRow(id,rows);const map=autoMap(id,rows[hr]);
      const data=rows.slice(hr+1).map(r=>convRow(id,k=>pickCell(map,r,k))).filter(o=>validRow(id,o));if(!data.length)continue;
      const sc=data.length+(SYN[id]._sheet.some(y=>nrm(n).includes(y))?1e6:0);
      if(!best[id]||sc>best[id].sc)best[id]={sc,data,n}}});
  const owner={};for(const id of ids){const b=best[id];if(!b)continue;const o=owner[b.n];if(!o||b.sc>best[o].sc)owner[b.n]=id}
  const res=[];for(const id of Object.values(owner)){const L=DEF[id].list();L.length=0;best[id].data.forEach(o=>L.push({id:uid(),...o}));res.push(`${best[id].data.length} ${DEF[id].title.toLowerCase()}`)}
  if(!res.length){toast("Dosyada tanınan bir liste bulunamadı. Sütun başlıklarını kontrol edin.");return}
  S.demo=false;S.overrides={};save();render();toast("Yüklendi: "+res.join(", "))}
function openPaste(id){
  const d=DEF[id];
  modal(`Excel'den ${d.title.toLowerCase()} aktar`,`<div class="modal-body"><div class="field full"><label for="pz">Excel'de satırları seçip kopyalayın, buraya yapıştırın</label><textarea id="pz" placeholder="${esc(d.pasteHint)}"></textarea><span class="hint">Sütun sırası: ${esc(d.pasteHint)}. Başlık satırı varsa otomatik atlanır.</span></div><div class="field full hint" id="pzInfo"></div></div>`,
    `<button class="btn btn-primary" type="button" id="pzGo" disabled>İçe aktar</button><button class="btn" type="button" id="pzC">Vazgeç</button>`);
  const ta=$("#pz");let parsed=[];
  ta.oninput=()=>{parsed=[];const lines=ta.value.split(/\r?\n/).filter(l=>l.trim());
    for(const l of lines){const c=l.split("\t").map(x=>x.trim());if(c.length<2)continue;
      const o={};d.paste.forEach((k,i)=>{const f=d.fields.find(x=>x.k===k);let v=c[i]??"";
        if(f&&f.ms)o[k]=v.split(/[,;\s]+/).filter(Boolean);
        else if(f&&f.type==="date")o[k]=parseDate(v);
        else if(f&&f.type==="number"){const n=num(v);o[k]=isNaN(n)?"":(f.pct?(String(v).includes("%")||n>1?n/100:n):n)}
        else if(f&&f.opts)o[k]=normOpt(f,v);
        else o[k]=v});
      const numK=d.fields.filter(f=>f.type==="number"&&f.req).map(f=>f.k);
      if(numK.length&&numK.every(k=>o[k]===""))continue;
      if(id==="agac"&&!o.cat)o.cat=inferCat(o)||"Diğer";
      parsed.push(o)}
    $("#pzInfo").textContent=parsed.length?`${parsed.length} satır okunacak. İlk satır: ${d.paste.map(k=>Array.isArray(parsed[0][k])?parsed[0][k].join(","):parsed[0][k]).join(" · ")}`:"Okunabilir satır bulunamadı. Sütunların sekmeyle ayrıldığından emin olun.";
    $("#pzGo").disabled=!parsed.length};
  $("#pzC").onclick=closeModal;
  $("#pzGo").onclick=()=>{parsed.forEach(o=>d.list().push({id:uid(),...o}));save();closeModal();render();toast(`${parsed.length} kayıt aktarıldı`)};
}

