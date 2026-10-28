/* ---------- material colours ---------- */
const MATC={PP:"var(--m-pp)",ABS:"var(--m-abs)",PA6:"var(--m-pa)",PA:"var(--m-pa)",HDPE:"var(--m-hdpe)"};
const EXTRA=["var(--m-x1)","var(--m-x2)"];
const HUES=[208,28,268,145,340,186,48,300,95,0,232,165,15,120,250,320];const matSeen={};
function matColor(m){if(MATC[m])return MATC[m];if(matSeen[m]==null)matSeen[m]=Object.keys(matSeen).length;const i=matSeen[m];return`hsl(${HUES[i%HUES.length]} ${i>=HUES.length?40:52}% ${i>=HUES.length?36:44}%)`}
const matTag=m=>`<span class="mat"><i style="background:${matColor(m)}"></i>${esc(m)}</span>`;
const pill=(lvl,t)=>`<span class="pill pill-${lvl}">${esc(t)}</span>`;
const shortPill=j=>j.matShort&&j.matShort.length?` <span class="pill pill-warn" title="Eksik: ${esc(j.matShort.join(", "))}">Malzeme eksik</span>`:"";
const needTxt=j=>j.members&&!j.segNo?j.members.map(x=>nf0.format(x.need)).join(" + "):nf0.format(j.need);
const modeTag=m=>{m=m||"Otomatik";return`<span class="mode ${m==="Robotlu"?"is-r":m==="Operatörlü"?"is-o":""}">${esc(m)}</span>`};

