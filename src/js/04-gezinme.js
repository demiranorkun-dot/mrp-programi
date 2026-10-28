/* ---------- navigation ---------- */
const IC={
  yonetim:'<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  uretim:'<path d="M4 20V9l5 3V9l5 3V5h6v15z"/><path d="M8 16h2M13 16h2"/>',
  ozet:'<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  plan:'<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/>',
  takvim:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 13h5M8 17h9"/>',
  siparisler:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h7"/>',
  agac:'<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M5 16.5V14h14v2.5"/>',
  kaliplar:'<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M12 6v12M7 10h2M15 10h2"/>',
  makineler:'<rect x="2" y="9" width="20" height="9" rx="1.5"/><path d="M6 9V5h6v4M6 22v-4M18 22v-4M15 13h4"/>',
  hammadde:'<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>',
  mrp:'<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>',
  malzemeler:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  ayarlar:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
const VIEWS=[
  {g:"Planlama",id:"ozet",t:"Özet"},{id:"plan",t:"Üretim Planı"},{id:"takvim",t:"Makine Takvimi"},
  {g:"Kayıtlar",id:"siparisler",t:"Siparişler"},{id:"agac",t:"Mamul Reçetesi"},{id:"kaliplar",t:"Kalıplar"},{id:"makineler",t:"Makineler"},{id:"malzemeler",t:"Malzemeler"},
  {id:"uretim",t:"Üretim Girişi"},
  {g:"Raporlar",id:"yonetim",t:"Yönetim Paneli"},{id:"mrp",t:"Malzeme İhtiyacı"},{id:"ayarlar",t:"Ayarlar"}];
let current=(location.hash||"").slice(1);if(!VIEWS.some(v=>v.id===current))current="ozet";
const ui={q:{}};
function renderNav(){
  const counts={uretim:(S.production||[]).length,siparisler:S.orders.length,kaliplar:S.molds.length,makineler:S.machines.length,agac:S.bom.length,malzemeler:(S.materials||[]).length};
  $("#nav").innerHTML=VIEWS.map(v=>(v.g?`<div class="nav-group">${v.g}</div>`:"")+
    `<button type="button" data-v="${v.id}" ${v.id===current?'aria-current="page"':""}><svg viewBox="0 0 24 24" aria-hidden="true">${IC[v.id]}</svg>${v.t}${counts[v.id]!=null?`<span class="count">${counts[v.id]}</span>`:""}</button>`).join("");
  $("#demoChip").hidden=!S.demo;
  $("#sideFoot").textContent=S.demo?"Örnek verilerle çalışıyorsunuz. Ayarlar'dan temizleyebilirsiniz.":"Veriler bu tarayıcıda saklanır. Son yedek: "+(S.lastBackup?fmtDT(new Date(S.lastBackup)):"alınmadı");
}
$("#nav").addEventListener("click",e=>{const b=e.target.closest("button[data-v]");if(b)go(b.dataset.v)});
function go(v){current=v;try{history.replaceState(null,"","#"+v)}catch(e){}render();window.scrollTo(0,0)}
$("#planBtn").addEventListener("click",()=>{const r=compute();const late=r.jobs.filter(j=>j.level!=="ok").length;
  go("takvim");toast(`Plan güncellendi: ${r.jobs.length} iş, ${S.machines.filter(m=>m._jobs).length} makine${late?`, ${late} uyarı`:""}`)});

let tt;function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2600)}

