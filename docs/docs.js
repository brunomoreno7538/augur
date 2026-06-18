"use strict";
const SETS = {
  divine:new Set(["divine"]), chaos:new Set(["chaos"]), certain:new Set(["certain"]),
  kw:new Set(["summon","ritual","divined","forget","give","when","otherwise","while","repeat","for","in","break","continue","attempt","rescue","believe","because","is","include"]),
  builtin:new Set(["gather","thrice","sort","filter","map","classify","pick","extract","count","sum","reverse","unique","take","skip","by","with","into","from","upon","as","fetch","serve","commune","inscribe","recall","revise","banish","query","proclaim","whisper","ask","read","write","forever","not","and","or","to"]),
  config:new Set(["oracle","temperature","model","budget"]),
  lit:new Set(["yes","no","naught"]),
};
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function cls(w){
  if(SETS.divine.has(w))return"t-divine";if(SETS.chaos.has(w))return"t-chaos";if(SETS.certain.has(w))return"t-certain";
  if(SETS.kw.has(w))return"t-kw";if(SETS.builtin.has(w))return"t-builtin";if(SETS.config.has(w))return"t-config";if(SETS.lit.has(w))return"t-lit";
  return null;
}
function hl(raw){
  const re=/(\/\/\/?[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
  let out="",last=0,m;
  while((m=re.exec(raw))){
    out+=esc(raw.slice(last,m.index));
    if(m[1])out+=`<span class="t-com">${esc(m[1])}</span>`;
    else if(m[2])out+=`<span class="t-str">${esc(m[2])}</span>`;
    else if(m[3])out+=`<span class="t-num">${esc(m[3])}</span>`;
    else{const w=m[4];let c=cls(w);if(!c&&/^\s*\(/.test(raw.slice(m.index+w.length)))c="t-fn";out+=c?`<span class="${c}">${esc(w)}</span>`:esc(w);}
    last=re.lastIndex;
  }
  return out+esc(raw.slice(last));
}
function hlSh(raw){
  return raw.split("\n").map(line=>{
    const m=line.match(/(^|\s)#/);let code=line,com="";
    if(m){const i=m.index+m[1].length;code=line.slice(0,i);com=line.slice(i);}
    code=esc(code).replace(/(\s)(--?[a-z][\w-]*)/g,'$1<span class="t-config">$2</span>');
    return code+(com?`<span class="t-com">${esc(com)}</span>`:"");
  }).join("\n");
}
function copy(text,btn){
  const p=navigator.clipboard?.writeText(text);if(!p)return;
  p.then(()=>{btn.textContent="Copied";btn.classList.add("done");setTimeout(()=>{btn.textContent="Copy";btn.classList.remove("done");},1300);}).catch(()=>{});
}
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("pre code.aug,pre code.sh").forEach(el=>{
    const raw=el.textContent;el.dataset.raw=raw;
    el.innerHTML=el.classList.contains("sh")?hlSh(raw):hl(raw);
    const pre=el.parentElement;const b=document.createElement("button");
    b.className="copy";b.type="button";b.textContent="Copy";
    b.addEventListener("click",()=>copy(raw,b));pre.appendChild(b);
  });
  const burger=document.getElementById("burger");
  burger?.addEventListener("click",()=>document.body.classList.toggle("nav-open"));
  document.querySelector(".scrim")?.addEventListener("click",()=>document.body.classList.remove("nav-open"));

  const idx=window.AUGUR_DOCS||[];
  const input=document.getElementById("dsearch");
  const box=document.getElementById("dresults");
  let sel=-1,items=[];
  function render(q){
    const t=q.trim().toLowerCase();
    if(!t){box.classList.remove("open");return;}
    items=idx.map(d=>{
      const inTitle=d.title.toLowerCase().includes(t);
      const pos=d.text.toLowerCase().indexOf(t);
      if(!inTitle&&pos<0)return null;
      return {d,score:inTitle?0:1,pos};
    }).filter(Boolean).sort((a,b)=>a.score-b.score).slice(0,8);
    if(!items.length){box.innerHTML='<div class="dsearch-empty">No matches.</div>';box.classList.add("open");return;}
    box.innerHTML=items.map((it,i)=>`<a href="${it.d.url}" class="${i===sel?"sel":""}"><span class="grp">${esc(it.d.group)}</span>${esc(it.d.title)}</a>`).join("");
    box.classList.add("open");
  }
  input?.addEventListener("input",()=>{sel=-1;render(input.value);});
  input?.addEventListener("keydown",(e)=>{
    const links=[...box.querySelectorAll("a")];
    if(e.key==="ArrowDown"){e.preventDefault();sel=Math.min(links.length-1,sel+1);}
    else if(e.key==="ArrowUp"){e.preventDefault();sel=Math.max(0,sel-1);}
    else if(e.key==="Enter"){if(links[sel])location.href=links[sel].getAttribute("href");return;}
    else if(e.key==="Escape"){box.classList.remove("open");input.blur();return;}
    else return;
    links.forEach((l,i)=>l.classList.toggle("sel",i===sel));
  });
  document.addEventListener("click",(e)=>{if(input&&!input.contains(e.target)&&!box.contains(e.target))box.classList.remove("open");});
});
