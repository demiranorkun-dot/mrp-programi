(function(){
"use strict";
const KEY="planpres-v1";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nf0=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat("tr-TR",{minimumFractionDigits:1,maximumFractionDigits:1});
const pct=v=>nf0.format(Math.round(v*100))+"%";
const nfQ=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:4});
const CATS=["Yarı mamul","Hammadde","Boya","Bağlantı elemanı","Ambalaj","Etiket","Diğer"];
const catFromText=t=>{t=String(t||"").toLocaleLowerCase("tr").replace(/ı/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g").replace(/ç/g,"c").replace(/ü/g,"u").replace(/ö/g,"o");
  if(/civata|somun|vida|pul\b|rondela|percin|saplama|klips|pim\b|baglanti|insert/.test(t))return"Bağlantı elemanı";
  if(/poset|koli|kutu|ambalaj|strec|bant\b|naylon|karton|palet|viyol|separat|cuval/.test(t))return"Ambalaj";
  if(/etiket|barkod/.test(t))return"Etiket";
  if(/boya|masterbatch|^mb|pigment/.test(t))return"Boya";
  if(/^hm[.\- ]|hammadde|granul|polipro|^abs|^pa6|hdpe|ldpe|polikarbonat/.test(t))return"Hammadde";
  if(/yari ?mamul|^uretim/.test(t))return"Yarı mamul";return""};
const inferCat=o=>catFromText(`${o.part||""} ${o.name||""}`)||((typeof S!=="undefined"&&S.molds.some(k=>k.part===o.part))||/-\d+$/.test(String(o.part||"").trim())?"Yarı mamul":"");
const catOf=b=>b.cat||(b.type==="Satınalma"?(inferCat(b)!=="Yarı mamul"&&inferCat(b))||"Diğer":"Yarı mamul");
const isProd=b=>catOf(b)==="Yarı mamul";
const defUnit=b=>{const c=catOf(b);return c==="Hammadde"||c==="Boya"?"kg":"adet"};
const catKey=c=>({"Yarı mamul":"yari","Hammadde":"hm","Boya":"boya","Bağlantı elemanı":"bag","Ambalaj":"amb","Etiket":"etk"})[c]||"dig";
const uid=()=>Math.random().toString(36).slice(2,10);
const iso=d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};
const parseISO=s=>{const [y,m,d]=String(s).split("-").map(Number);return new Date(y,(m||1)-1,d||1)};
const fmtD=s=>{if(!s)return"–";const d=typeof s==="string"?parseISO(s):s;return d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"})};
const fmtDs=d=>d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"});
const fmtDT=d=>d&&!isNaN(d)?d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}):"–";
const num=v=>{if(typeof v==="number")return v;const s=String(v??"").trim().replace(/\s/g,"").replace("%","");if(!s)return NaN;
  const t=s.includes(",")?s.replace(/\./g,"").replace(",","."):(/^-?\d{1,3}(\.\d{3})+$/.test(s)?s.replace(/\./g,""):s);return Number(t)};

function today(){return iso(new Date())}
function demo(){
  const M=(code,ton,robot)=>({id:uid(),code,ton,shifts:3,hours:7.5,eff:0.85,robot:robot?"Var":"Yok"});
  const K=(code,part,cav,cycle,partG,runnerG,mat,mb,machines,mode)=>({id:uid(),code,part,cav,cycle,partG,runnerG,mat,mb,machines:machines.split(","),mode:mode||"Otomatik"});
  const B=(product,part,qty,type)=>({id:uid(),product,part,qty,type});
  const O=(no,customer,product,qty,dueOff,extra,prio)=>{const d=new Date();d.setDate(d.getDate()+dueOff);return{id:uid(),no,customer,product,qty,due:iso(d),extra,prio}};
  return{demo:true,settings:{horizon:22,start:"",bonus:2,changeover:2,saturday:false,robotPay:1},
    machines:[M("M01",120),M("M02",150),M("M03",200,1),M("M04",250),M("M05",300,1),M("M06",350,1),M("M07",450,1),M("M08",560,1)],
    molds:[K("K-101","U100-1",4,28,18,6,"PP",.02,"M01,M02,M03"),K("K-102","U100-2",2,35,42,8,"PP",.02,"M02,M03,M04"),
      K("K-103","U200-1",1,55,320,25,"ABS",0,"M05,M06","Robotlu"),K("K-104","U200-2",8,22,6,10,"ABS",0,"M01,M02"),
      K("K-105","U300-1",2,60,610,40,"PP",.02,"M07,M08","Robotlu"),K("K-106","U300-2",4,30,35,12,"PA6",0,"M03,M04,M05","Operatörlü"),
      K("K-107","U400-1",16,18,2.5,8,"HDPE",.02,"M01,M02,M03"),K("K-108","U400-2",1,75,1150,60,"PP",0,"M08","Robotlu"),
      K("K-109","U500-1",2,45,140,18,"ABS",0,"M04,M05,M06","Robotlu"),K("K-110","U500-2",4,25,22,9,"PP",.02,"M01,M02,M03"),
      K("K-111","U600-1",2,40,95,14,"PA6",0,"M04,M05,M06"),K("K-112","U600-2",8,20,4,7,"HDPE",.02,"M02,M03")],
    bom:[B("U100","U100-1",1,"Üretim"),B("U100","U100-2",2,"Üretim"),B("U100","VIDA-M4",4,"Satınalma"),
      B("U200","U200-1",1,"Üretim"),B("U200","U200-2",4,"Üretim"),B("U200","ETIKET-01",1,"Satınalma"),
      B("U300","U300-1",1,"Üretim"),B("U300","U300-2",2,"Üretim"),B("U400","U400-1",6,"Üretim"),B("U400","U400-2",1,"Üretim"),
      B("U500","U500-1",1,"Üretim"),B("U500","U500-2",2,"Üretim"),B("U500","VIDA-M4",2,"Satınalma"),
      B("U600","U600-1",1,"Üretim"),B("U600","U600-2",4,"Üretim"),
      ...["U100","U200","U300","U400","U500","U600"].flatMap(p=>[
        {id:uid(),product:p,part:"POSET-20x30",name:"Poşet 20x30",cat:"Ambalaj",qty:1,unit:"adet",scrap:.02},
        {id:uid(),product:p,part:"KOLI-40",name:"Koli 40x30x30 (50'li)",cat:"Ambalaj",qty:.02,unit:"adet"},
        {id:uid(),product:p,part:"ETIKET-KOLI",name:"Koli etiketi",cat:"Etiket",qty:.02,unit:"adet"}]),
      {id:uid(),product:"U300",part:"CIVATA-M5x16",name:"Cıvata M5x16",cat:"Bağlantı elemanı",qty:2,unit:"adet",scrap:.01},
      {id:uid(),product:"U300",part:"SOMUN-M5",name:"Somun M5",cat:"Bağlantı elemanı",qty:2,unit:"adet",scrap:.01}],
    orders:[O("SP-001","Müşteri A","U100",12000,25,.10,1),O("SP-002","Müşteri B","U200",4000,20,0,1),
      O("SP-003","Müşteri C","U100",10000,41,.05,2),O("SP-004","Müşteri A","U300",6000,35,.15,2),
      O("SP-005","Müşteri D","U400",9000,30,0,1),O("SP-006","Müşteri B","U300",5000,50,.10,3),
      O("SP-007","Müşteri E","U500",18000,38,.05,2),O("SP-008","Müşteri C","U600",14000,45,0,2),
      O("SP-009","Müşteri D","U200",3000,52,0,3)],
    materials:[
      {id:uid(),code:"PP",name:"Polipropilen homopolimer",mtype:"Hammadde",stock:15000,incoming:8000,incomingDate:"",lead:10,safety:2000,moq:5000},
      {id:uid(),code:"ABS",name:"ABS genel amaçlı",mtype:"Hammadde",stock:8000,incoming:0,incomingDate:"",lead:7,safety:500,moq:1000},
      {id:uid(),code:"PA6",name:"Poliamid 6",mtype:"Hammadde",stock:1200,incoming:1500,incomingDate:(()=>{const d=new Date();d.setDate(d.getDate()+6);return iso(d)})(),lead:14,safety:300,moq:1000},
      {id:uid(),code:"HDPE",name:"Yüksek yoğunluklu PE",mtype:"Hammadde",stock:900,incoming:0,incomingDate:"",lead:7,safety:200,moq:500},
      {id:uid(),code:"VIDA-M4",name:"M4 vida",mtype:"Bağlantı elemanı",stock:150000,incoming:0,incomingDate:"",lead:10,safety:10000,moq:0},
      {id:uid(),code:"ETIKET-01",name:"Ürün etiketi",mtype:"Etiket",stock:3000,incoming:0,incomingDate:"",lead:3,safety:500,moq:5000},
      {id:uid(),code:"POSET-20x30",name:"Poşet 20x30",mtype:"Ambalaj",stock:40000,incoming:0,incomingDate:"",lead:7,safety:5000,moq:10000},
      {id:uid(),code:"KOLI-40",name:"Koli 40x30x30",mtype:"Ambalaj",stock:300,incoming:500,incomingDate:"",lead:5,safety:100,moq:500},
      {id:uid(),code:"CIVATA-M5x16",name:"Cıvata M5x16",mtype:"Bağlantı elemanı",stock:30000,incoming:0,incomingDate:"",lead:10,safety:5000,moq:10000}],
    overrides:{}};
}
let S;
function load(){try{const t=localStorage.getItem(KEY);if(t){S=JSON.parse(t);return}}catch(e){}S=demo()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
load();

