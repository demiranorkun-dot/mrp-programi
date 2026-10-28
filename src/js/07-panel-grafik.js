/* ==================== YÖNETİM PANELİ · grafik modülü (SVG / HTML, tema token'larıyla) ==================== */
const Chart={
  specs:[],
  tip(){let t=document.getElementById("chTip");if(!t){t=document.createElement("div");t.id="chTip";t.className="ch-tip";t.hidden=true;document.body.append(t)}return t},
  bind(root){const t=Chart.tip();root.querySelectorAll("[data-tip]").forEach(el=>{
    const show=e=>{t.innerHTML=el.getAttribute("data-tip");t.hidden=false;const w=t.offsetWidth,h=t.offsetHeight;
      t.style.left=Math.min(window.innerWidth-w-8,Math.max(8,e.clientX+14))+"px";t.style.top=(e.clientY-h-14<8?e.clientY+18:e.clientY-h-14)+"px"};
    el.addEventListener("pointerenter",show);el.addEventListener("pointermove",show);el.addEventListener("pointerleave",()=>{t.hidden=true})})},
  ticks(max){const raw=max/4,p=Math.pow(10,Math.floor(Math.log10(raw||1)));const step=[1,2,2.5,5,10].map(x=>x*p).find(x=>x>=raw)||p*10;const out=[];for(let v=0;v<=max+step*0.001;v+=step)out.push(v);if(out[out.length-1]<max)out.push(out[out.length-1]+step);return out},
  short(v){const a=Math.abs(v);return a>=1e6?nf1.format(v/1e6)+" M":a>=1e4?nf0.format(v/1e3)+" B":a>=1e3?nf1.format(v/1e3)+" B":nf0.format(v)},
  bar(x,y,w,h,color,round){if(h<=0)return"";const r=round?Math.min(4,w/2,h):0;
    return r?`<path d="M${x},${y+h}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h}Z" fill="${color}" class="ch-mark"/>`:`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" class="ch-mark"/>`},
  /* dikey çubuk (yığılmış): cats=[{key,label,short,color?}], series=[{name,color,values}] */
  vbar(el,{cats,series,fmt=v=>nf0.format(v),unit="",h=230,onClick}){const W=Math.max(260,el.clientWidth||600),padL=46,padR=6,padT=10,padB=30,ph=h-padT-padB,pw=W-padL-padR;
    const tot=cats.map((c,i)=>series.reduce((a,s)=>a+(s.values[i]||0),0)),tk=Chart.ticks(Math.max(1,...tot)),top=tk[tk.length-1];
    const step=pw/Math.max(1,cats.length),bw=Math.max(3,Math.min(44,step*0.68)),every=Math.max(1,Math.ceil(cats.length/Math.max(1,Math.floor(pw/58))));
    let g=tk.map(v=>{const y=padT+ph-v/top*ph;return`<line x1="${padL}" x2="${W-padR}" y1="${y}" y2="${y}" class="ch-grid"/><text x="${padL-7}" y="${y+4}" class="ch-ax" text-anchor="end">${Chart.short(v)}</text>`}).join("");
    cats.forEach((c,i)=>{const x=padL+step*i+(step-bw)/2;let y0=padT+ph;const last=series.map((s,si)=>s.values[i]>0?si:-1).reduce((a,b)=>Math.max(a,b),-1);
      series.forEach((s,si)=>{const v=s.values[i]||0;if(v<=0)return;const hh=v/top*ph;g+=Chart.bar(x,y0-hh,bw,hh,(series.length===1&&c.color)||s.color,si===last);y0-=hh});
      const tip=`<div class="t-h">${esc(c.label)}</div>`+series.map(s=>`<div><i style="background:${(series.length===1&&c.color)||s.color}"></i>${esc(s.name)} <b>${fmt(s.values[i]||0)}${unit}</b></div>`).join("")+(series.length>1?`<div class="t-f">Toplam <b>${fmt(tot[i])}${unit}</b></div>`:"");
      g+=`<rect x="${padL+step*i}" y="${padT}" width="${step}" height="${ph}" fill="transparent" class="ch-hit${onClick?" ch-click":""}" data-tip="${esc(tip)}" ${onClick?`data-click="${esc(c.key)}"`:""}/>`;
      if(i%every===0)g+=`<text x="${x+bw/2}" y="${h-padB+17}" class="ch-ax" text-anchor="middle">${esc(c.short||c.label)}</text>`});
    g+=`<line x1="${padL}" x2="${W-padR}" y1="${padT+ph}" y2="${padT+ph}" class="ch-base"/>`;
    el.innerHTML=`<svg width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(el.dataset.label||"")}">${g}</svg>`;Chart.bind(el);
    if(onClick)el.querySelectorAll("[data-click]").forEach(r=>r.addEventListener("click",()=>onClick(r.dataset.click)))},
  /* yatay çubuk (sıralama): rows=[{key,label,sub,values:[...],valueText,color?}] */
  hbar(el,{rows,series,fmt=v=>nf0.format(v),unit="",ref,refLabel,onClick,max,grouped}){const mx=max||Math.max(1e-9,...rows.map(r=>grouped?Math.max(...r.values.map(v=>v||0)):r.values.reduce((a,b)=>a+(b||0),0)),ref||0);
    el.innerHTML=`<div class="hb">${rows.map(r=>{const tot=r.values.reduce((a,b)=>a+(b||0),0);
      const segs=r.values.map((v,i)=>grouped?`<span class="hb-line"><span class="hb-seg" style="width:${Math.max(0,v||0)/mx*100}%;background:${series[i].color}"></span></span>`:v>0?`<span class="hb-seg" style="width:${v/mx*100}%;background:${(series.length===1&&r.color)||series[i].color}"></span>`:"").join("");
      const tip=`<div class="t-h">${esc(r.label)}</div>${r.sub?`<div class="t-f">${esc(r.sub)}</div>`:""}`+series.map((s,i)=>`<div><i style="background:${(series.length===1&&r.color)||s.color}"></i>${esc(s.name)} <b>${fmt(r.values[i]||0)}${unit}</b></div>`).join("")+(r.tipExtra||"");
      return`<div class="hb-row${onClick?" ch-click":""}" data-tip="${esc(tip)}" ${onClick?`data-click="${esc(r.key)}" tabindex="0" role="button"`:""}><span class="hb-label"><span class="code">${esc(r.label)}</span>${r.sub?`<small>${esc(r.sub)}</small>`:""}</span>
        <span class="hb-track${grouped?" grp":""}">${segs}${ref?`<i class="hb-ref" style="left:${ref/mx*100}%" title="${esc(refLabel||"")}"></i>`:""}</span><span class="hb-val num">${r.valueText!=null?r.valueText:fmt(tot)+unit}</span></div>`}).join("")}</div>`;
    Chart.bind(el);if(onClick)el.querySelectorAll("[data-click]").forEach(r=>{const f=()=>onClick(r.dataset.click);r.addEventListener("click",f);r.addEventListener("keydown",e=>{if(e.key==="Enter")f()})})},
  legend(series){return`<div class="ch-legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>`},
  mountAll(root){root.querySelectorAll("[data-ch]").forEach(el=>{const sp=Chart.specs[+el.dataset.ch];if(sp)Chart[sp.type](el,sp.opt)})},
  slot(type,opt,label){Chart.specs.push({type,opt});return`<div class="ch-box" data-ch="${Chart.specs.length-1}" data-label="${esc(label||"")}"></div>`}
};
const COL={c1:"var(--s1)",c2:"var(--s2)",c3:"var(--s3)",c4:"var(--s4)",ok:"var(--ok)",warn:"var(--warn)",bad:"var(--bad)",muted:"var(--muted)"};

