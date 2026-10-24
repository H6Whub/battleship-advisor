(function(){
'use strict';
const FLEET={ru:[4,3,3,2,2,2,1,1,1,1],cl:[5,4,3,3,2]};
const E=0,MS=1,HT=2,SK=3,BK=4;
const COL=['A','B','C','D','E','F','G','H','I','J'];
let G=g0(),pool=[],sunk=[],br=-1,bc=-1;
let mode='ru',alive=false,over=false;
let pinned=false,hlOn=true,chatSent=false;
let _ob=null,_iv=null,_db=null;
function g0(){return Array.from({length:10},()=>new Int8Array(10));}
function getRival(){
  for(const s of['.battlefield__rival .battlefield-table','.battlefield__wait .battlefield-table']){
    const t=document.querySelector(s);
    if(!t||t.closest('.battlefield')?.classList.contains('battlefield__self'))continue;
    const c=t.querySelectorAll('td.battlefield-cell');
    if(c.length===100)return Array.from(c);
  }
  const all=document.querySelectorAll('.battlefield-table');
  if(all.length>=2){
    const t=all[all.length-1];
    if(!t.closest('.battlefield')?.classList.contains('battlefield__self')){
      const c=t.querySelectorAll('td.battlefield-cell');
      if(c.length===100)return Array.from(c);
    }
  }
  return null;
}
function rdCell(td){
  const c=td.className;
  if(c.includes('__hit'))return c.includes('__done')?SK:HT;
  if(c.includes('__miss'))return MS;
  return E;
}
function detectMode(){
  try{if(localStorage.getItem('ships__classic')&&!localStorage.getItem('ships__default')){mode='cl';return FLEET.cl.slice();}}catch(_){}
  let tot=0;
  document.querySelectorAll('.battlefield__self .ship-box').forEach(s=>{tot+=+(s.dataset.length||1);});
  mode=tot>=19?'ru':'cl';
  return FLEET[mode].slice();
}
function isLive(){
  const rival=document.querySelector('.battlefield__rival,.battlefield__wait');
  if(!rival)return false;
  for(const n of['.notification__move-on','.notification__game-started-move-on','.notification__wait']){
    const el=document.querySelector(n);if(el&&!el.classList.contains('none'))return true;
  }
  const cells=rival.querySelectorAll('td.battlefield-cell');
  if(cells.length!==100)return false;
  for(const td of cells)if(td.className.includes('__hit')||td.className.includes('__miss'))return true;
  return false;
}
function endState(){
  const w=document.querySelector('.notification__game-over-win');
  const l=document.querySelector('.notification__game-over-lose');
  if(w&&!w.classList.contains('none'))return'win';
  if(l&&!l.classList.contains('none'))return'lose';
  return null;
}
function sendChat(){ // AD - удали эту функцию и её вызов чтобы отключить рекламу
  if(chatSent)return;
  try{
    const input=document.querySelector('input.chat-teletype');
    if(!input)return;
    const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    const send=(msg)=>new Promise(res=>{
      input.focus();set.call(input,msg);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      setTimeout(()=>{
        input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true}));
        input.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,bubbles:true}));
        setTimeout(res,500);
      },200);
    });
    send('Advisor: github.com/H6Whub/battleship-advisor').then(()=>
      send('Помощник: github.com/H6Whub/battleship-advisor')
    ).catch(()=>{});
    chatSent=true;
  }catch(_){}
}
function sync(){
  if(!over){
    const e=endState();
    if(e){over=true;br=-1;bc=-1;clearHL();ui.setPhase(false);ui.setFieldBtn(false);return true;}
  }
  if(!isLive()){
    if(alive){alive=false;br=-1;bc=-1;clearHL();ui.setPhase(false);ui.setFieldBtn(false);}
    return false;
  }
  const cells=getRival();
  if(!cells){if(alive)alive=false;return false;}
  if(!alive){
    alive=true;over=false;chatSent=false;
    pool=detectMode();sunk=[];
    ui.pulse();ui.setFieldBtn(true);
    setTimeout(sendChat,1500);
  }
  let ch=false;
  const ng=g0();
  cells.forEach(td=>{
    const el=td.querySelector('.battlefield-cell-content');if(!el)return;
    const r=+el.dataset.y,c=+el.dataset.x;if(isNaN(r)||isNaN(c))return;
    ng[r][c]=rdCell(td);if(ng[r][c]!==G[r][c])ch=true;
  });
  if(ch){G=ng;rebuild();}
  if(!over&&pool.length===0){over=true;br=-1;bc=-1;clearHL();ui.setPhase(false);ui.setFieldBtn(false);return true;}
  return ch;
}
function rebuild(){
  const vis=g0();sunk=[];
  for(let r=0;r<10;r++)for(let c=0;c<10;c++){
    if(G[r][c]!==SK||vis[r][c])continue;
    const grp=[],q=[[r,c]];
    while(q.length){
      const[cr,cc]=q.shift();
      if(cr<0||cr>9||cc<0||cc>9||vis[cr][cc]||G[cr][cc]!==SK)continue;
      vis[cr][cc]=1;grp.push([cr,cc]);q.push([cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]);
    }
    sunk.push({size:grp.length,cells:grp});
  }
  for(let r=0;r<10;r++)for(let c=0;c<10;c++)if(G[r][c]===BK)G[r][c]=E;
  for(const s of sunk)for(const[sr,sc]of s.cells)
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      const nr=sr+dr,nc=sc+dc;
      if(nr>=0&&nr<10&&nc>=0&&nc<10&&G[nr][nc]===E)G[nr][nc]=BK;
    }
  const base=FLEET[mode],tmp=sunk.map(s=>s.size);
  pool=base.filter(sz=>{const i=tmp.indexOf(sz);if(i>=0){tmp.splice(i,1);return false;}return true;});
}
function bl(v){return v===MS||v===SK||v===BK;}
function okH(r,c,sz){if(c+sz>10)return false;for(let i=0;i<sz;i++)if(bl(G[r][c+i]))return false;return true;}
function okV(r,c,sz){if(r+sz>10)return false;for(let i=0;i<sz;i++)if(bl(G[r+i][c]))return false;return true;}
function segs(){
  const vis={},res=[];
  for(let r=0;r<10;r++)for(let c=0;c<10;c++){
    if(G[r][c]!==HT||vis[r+','+c])continue;
    const cells=[],q=[[r,c]];
    while(q.length){
      const[cr,cc]=q.shift();const k=cr+','+cc;
      if(vis[k]||G[cr][cc]!==HT)continue;
      vis[k]=1;cells.push([cr,cc]);
      for(const[nr,nc]of[[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]])
        if(nr>=0&&nr<10&&nc>=0&&nc<10&&!vis[nr+','+nc]&&G[nr][nc]===HT)q.push([nr,nc]);
    }
    if(!cells.length)continue;
    const rows=cells.map(x=>x[0]),cols=cells.map(x=>x[1]);
    const minR=Math.min(...rows),maxR=Math.max(...rows),minC=Math.min(...cols),maxC=Math.max(...cols);
    let axis='?';if(cells.length>1)axis=rows.every(x=>x===rows[0])?'h':'v';
    res.push({cells,axis,len:cells.length,minR,maxR,minC,maxC});
  }
  return res;
}
function prob(){
  const P=Array.from({length:10},()=>new Float32Array(10));
  if(!pool.length)return P;
  const sg=segs();
  if(sg.length){
    for(const s of sg){
      const{cells,axis,len,minR,maxR,minC,maxC}=s;
      for(const sz of pool){
        if(sz<len)continue;
        if(axis!=='v'){
          const row=cells[0][0];
          for(let t=Math.max(0,maxC-sz+1);t<=Math.min(10-sz,minC);t++){
            if(!okH(row,t,sz)||!cells.every(([r2,c2])=>r2===row&&c2>=t&&c2<t+sz))continue;
            let ok=false;
            for(let i=0;i<sz;i++)if(G[row][t+i]===E){P[row][t+i]+=4;ok=true;}
            if(!ok&&sz===len){if(t>0&&G[row][t-1]===E)P[row][t-1]+=3;if(t+sz<10&&G[row][t+sz]===E)P[row][t+sz]+=3;}
          }
        }
        if(axis!=='h'){
          const col=cells[0][1];
          for(let t=Math.max(0,maxR-sz+1);t<=Math.min(10-sz,minR);t++){
            if(!okV(t,col,sz)||!cells.every(([r2,c2])=>c2===col&&r2>=t&&r2<t+sz))continue;
            let ok=false;
            for(let i=0;i<sz;i++)if(G[t+i][col]===E){P[t+i][col]+=4;ok=true;}
            if(!ok&&sz===len){if(t>0&&G[t-1][col]===E)P[t-1][col]+=3;if(t+sz<10&&G[t+sz][col]===E)P[t+sz][col]+=3;}
          }
        }
      }
    }
    let any=false;for(let r=0;r<10;r++)for(let c=0;c<10;c++)if(P[r][c]>0){any=true;break;}
    if(any)return P;
  }
  for(const sz of pool)for(let r=0;r<10;r++)for(let c=0;c<10;c++){
    if(okH(r,c,sz))for(let i=0;i<sz;i++)if(G[r][c+i]===E)P[r][c+i]++;
    if(okV(r,c,sz))for(let i=0;i<sz;i++)if(G[r+i][c]===E)P[r+i][c]++;
  }
  const mn=Math.min(...pool);
  if(mn>=2){
    let se=0,so=0;
    for(let r=0;r<10;r++)for(let c=0;c<10;c++)if(G[r][c]===E)(r+c)%2===0?(se+=P[r][c]):(so+=P[r][c]);
    const keep=se>=so?0:1;
    for(let r=0;r<10;r++)for(let c=0;c<10;c++)if((r+c)%2!==keep)P[r][c]=0;
  }
  return P;
}
function best(P){
  let mx=0,rr=-1,cc=-1;
  for(let r=0;r<10;r++)for(let c=0;c<10;c++)if(G[r][c]===E&&P[r][c]>mx){mx=P[r][c];rr=r;cc=c;}
  return{r:rr,c:cc,mx};
}
function injectCSS(){
  if(document.getElementById('bsa-css'))return;
  const s=document.createElement('style');s.id='bsa-css';
  s.textContent=`.bsa-best{outline:2px solid #666!important;outline-offset:-2px!important;background:rgba(0,0,0,0.15)!important;position:relative!important;z-index:999!important;cursor:crosshair!important;animation:bsa-p 1.2s ease-in-out infinite;}@keyframes bsa-p{0%,100%{outline-color:#444;}50%{outline-color:#999;}}`;
  document.head.appendChild(s);
}
function clearHL(){document.querySelectorAll('.bsa-best').forEach(el=>{el.classList.remove('bsa-best');el.style.outline='';el.style.background='';});}
function applyHL(){
  clearHL();
  if(!hlOn||br===-1||over||!alive)return;
  const cells=getRival();if(!cells)return;
  cells.forEach(td=>{
    const el=td.querySelector('.battlefield-cell-content');if(!el)return;
    if(+el.dataset.y===br&&+el.dataset.x===bc&&G[br][bc]===E)td.classList.add('bsa-best');
  });
}
function setHidden(v){
  const el=document.getElementById('bsa');if(!el)return;
  el.style.opacity=v?'0':'1';el.style.pointerEvents=v?'none':'auto';
  if(v)clearHL();else applyHL();
}
document.addEventListener('keydown',e=>{
  const el=document.getElementById('bsa');if(!el)return;
  if(e.code==='Backquote'&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();e.stopPropagation();setHidden(el.style.opacity==='0'?false:true);}
  if(e.code==='Escape'&&el.style.opacity!=='0'){e.preventDefault();e.stopPropagation();setHidden(true);}
},true);
function savePos(l,t){try{chrome.storage.local.set({bsa_pos:{l,t}});}catch(_){}}
function loadPos(el){try{chrome.storage.local.get('bsa_pos',d=>{if(!d.bsa_pos)return;el.style.right='auto';el.style.left=Math.min(d.bsa_pos.l,window.innerWidth-el.offsetWidth-10)+'px';el.style.top=Math.min(d.bsa_pos.t,window.innerHeight-el.offsetHeight-10)+'px';});}catch(_){}}
const ui={
  build(){
    if(document.getElementById('bsa'))return;
    injectCSS();
    const el=document.createElement('div');el.id='bsa';
    el.innerHTML=`<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap');
#bsa,#bsa *{-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;box-sizing:border-box;font-family:'IBM Plex Mono','Courier New',monospace;}
#bsa{position:fixed;top:16px;right:16px;z-index:2147483647;width:228px;background:#0e0e0e;border:1px solid #262626;border-radius:10px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.92),0 0 0 1px #000;}
#bsa-h{display:flex;align-items:center;gap:8px;padding:11px 12px;background:#131313;border-bottom:1px solid #1e1e1e;cursor:move;}
#bsa-anc{font-size:12px;opacity:.4;flex-shrink:0;animation:fl 4s ease-in-out infinite;}
@keyframes fl{0%,100%{transform:translateY(0);}50%{transform:translateY(-1.5px);}}
#bsa-name{font-size:9px;font-weight:700;letter-spacing:3px;color:#d5d5d5;text-transform:uppercase;flex:1;}
#bsa-ctrl{display:flex;gap:4px;padding:8px 10px;border-bottom:1px solid #1a1a1a;}
.btn{flex:1;padding:8px 3px;cursor:pointer;background:#1c1c1c;border:1px solid #323232;border-radius:5px;color:#c8c8c8;font-size:8px;text-transform:uppercase;letter-spacing:.6px;transition:background .1s,border-color .1s,color .1s;outline:none;}
.btn:hover:not(:disabled){background:#252525;border-color:#545454;color:#fff;}
.btn:active:not(:disabled){transform:scale(.96);}
.btn.on{background:#1e1e1e;border-color:#707070;color:#fff;}
.btn:disabled{background:#161616;border-color:#202020;color:#2e2e2e;cursor:not-allowed;}
#bsa-map{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;padding:9px 10px;}
.bm{border-radius:2px;aspect-ratio:1;}
.bm.e{background:#181818;}
.bm.m{background:#2a2a2a;}
.bm.h{background:#424242;}
.bm.s{background:#1c1c1c;}
.bm.t{animation:tgt 1s ease-in-out infinite alternate;}
@keyframes tgt{from{background:#646464;}to{background:#c8c8c8;box-shadow:0 0 5px rgba(180,180,180,.5);}}
#bsa-ph{display:none;margin:0 10px 8px;padding:3px 10px;border-radius:20px;font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#c5c5c5;border:1px solid #353535;background:#161616;text-align:center;}
#bsa-ph .d{display:inline-block;width:4px;height:4px;border-radius:50%;background:#d8d8d8;margin-right:5px;vertical-align:middle;animation:hot .5s ease-in-out infinite alternate;}
@keyframes hot{from{transform:scale(1);opacity:.5;}to{transform:scale(1.8);opacity:1;}}
#bsa-fleet{display:flex;flex-wrap:wrap;gap:4px 7px;padding:7px 10px;}
.bfl{display:flex;gap:2px;}
.bsq{width:9px;height:9px;border-radius:1px;}
.bsq.a{background:#3a3a3a;}
.bsq.d{background:#1a1a1a;opacity:.25;}
#bsa-foot{display:flex;gap:4px;padding:8px 10px;border-top:1px solid #1a1a1a;}
#bsa-don{flex:1;padding:8px 3px;cursor:pointer;background:#1c1c1c;border:1px solid #323232;border-radius:5px;color:#c8c8c8;font-size:8px;text-transform:uppercase;letter-spacing:.6px;text-align:center;text-decoration:none;transition:background .1s,border-color .1s,color .1s;display:block;}
#bsa-don:hover{background:#252525;border-color:#545454;color:#fff;}
</style>
<div id="bsa-h"><span id="bsa-anc">+</span><span id="bsa-name">Advisor</span></div>
<div id="bsa-ctrl">
  <button class="btn" id="btn-pin">PIN</button>
  <button class="btn" id="btn-hl">FIND</button>
</div>
<div id="bsa-map"></div>
<div id="bsa-ph"><span class="d"></span>TARGET</div>
<div id="bsa-fleet"></div>
<div id="bsa-foot">
  <a id="bsa-don" href="https://ko-fi.com/maixyyy" target="_blank" rel="noopener">SUPPORT THE PROJECT</a>
</div>`;
    document.body.appendChild(el);
    const map=el.querySelector('#bsa-map');
    for(let i=0;i<100;i++){const d=document.createElement('div');d.className='bm e';d.id='bm'+i;map.appendChild(d);}
    setTimeout(()=>loadPos(el),80);
    this._drag(el);
    el.querySelector('#btn-pin').addEventListener('click',()=>{pinned=!pinned;el.querySelector('#btn-pin').classList.toggle('on',pinned);try{chrome.storage.local.set({bsa_pin:pinned});}catch(_){}});
    el.querySelector('#btn-hl').addEventListener('click',()=>{if(el.querySelector('#btn-hl').disabled)return;hlOn=!hlOn;el.querySelector('#btn-hl').classList.toggle('on',!hlOn);if(!hlOn)clearHL();else applyHL();try{chrome.storage.local.set({bsa_hl:hlOn});}catch(_){}});
    try{chrome.storage.local.get(['bsa_pin','bsa_hl'],d=>{if(d.bsa_pin){pinned=true;el.querySelector('#btn-pin').classList.add('on');}if(d.bsa_hl===false){hlOn=false;el.querySelector('#btn-hl').classList.add('on');}});}catch(_){}
    el.querySelector('#btn-hl').disabled=true;
  },
  _drag(el){
    let sx,sy,sl,st,on=false;
    const h=el.querySelector('#bsa-h');
    h.addEventListener('mousedown',e=>{if(e.button!==0||pinned)return;on=true;sx=e.clientX;sy=e.clientY;const r=el.getBoundingClientRect();sl=r.left;st=r.top;el.style.right='auto';el.style.left=sl+'px';el.style.top=st+'px';document.body.style.userSelect='none';e.preventDefault();});
    document.addEventListener('mousemove',e=>{if(!on)return;el.style.left=Math.max(0,Math.min(window.innerWidth-el.offsetWidth,sl+e.clientX-sx))+'px';el.style.top=Math.max(0,Math.min(window.innerHeight-el.offsetHeight,st+e.clientY-sy))+'px';});
    document.addEventListener('mouseup',()=>{if(!on)return;on=false;document.body.style.userSelect='';const r=el.getBoundingClientRect();savePos(r.left,r.top);});
  },
  pulse(){const el=document.getElementById('bsa');if(!el)return;el.style.borderColor='#404040';setTimeout(()=>{if(el)el.style.borderColor='#262626';},350);},
  setFieldBtn(v){const b=document.querySelector('#btn-hl');if(!b)return;b.disabled=!v;if(!v){b.classList.remove('on');hlOn=true;}},
  setPhase(v){const ph=document.querySelector('#bsa-ph');if(ph)ph.style.display=v?'block':'none';},
  render(hasHits){
    for(let i=0;i<100;i++){
      const r=(i/10)|0,c=i%10;const d=document.getElementById('bm'+i);if(!d)continue;
      if(!alive){d.className='bm e';continue;}
      d.className=r===br&&c===bc?'bm t':G[r][c]===MS?'bm m':G[r][c]===HT?'bm h':G[r][c]===SK?'bm s':'bm e';
    }
    this.setPhase(hasHits&&alive&&!over);
    if(!alive||over)return;
    const fl=document.querySelector('#bsa-fleet');if(!fl)return;
    const base=FLEET[mode],tmp=sunk.map(s=>s.size);
    fl.innerHTML=base.map(sz=>{const i=tmp.indexOf(sz),dead=i>=0;if(dead)tmp.splice(i,1);return`<div class="bfl">${Array.from({length:sz},()=>`<div class="bsq ${dead?'d':'a'}"></div>`).join('')}</div>`;}).join('');
  },
};
function reset(){
  G=g0();pool=detectMode();sunk=[];br=-1;bc=-1;alive=false;over=false;chatSent=false;
  clearHL();ui.setFieldBtn(false);ui.setPhase(false);
  for(let i=0;i<100;i++){const d=document.getElementById('bm'+i);if(d)d.className='bm e';}
}
function render(){
  if(!alive||over){ui.render(false);clearHL();return;}
  const P=prob();const sg=segs();const{r,c}=best(P);
  br=r;bc=c;
  ui.render(sg.length>0);
  applyHL();
}
function tick(){const ch=sync();if(ch||br===-1)render();}
function start(){
  if(_ob)_ob.disconnect();
  _ob=new MutationObserver(()=>{clearTimeout(_db);_db=setTimeout(()=>{const ch=sync();if(ch)render();},80);});
  _ob.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  clearInterval(_iv);_iv=setInterval(tick,400);
}
function init(){pool=detectMode();ui.build();start();tick();}
const _pp=history.pushState.bind(history);
history.pushState=(...a)=>{_pp(...a);setTimeout(()=>{reset();tick();},800);};
window.addEventListener('hashchange',()=>setTimeout(()=>{reset();tick();},800));
window.addEventListener('popstate',()=>setTimeout(()=>{reset();tick();},800));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,600));
else setTimeout(init,300);
})();
