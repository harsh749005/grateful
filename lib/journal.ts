// @ts-nocheck
// Journal logic (capture, memories, timeline, Supabase sync), carried over as one module.
import { createClient } from '@supabase/supabase-js';
let started = false;

export function startJournal() {
if (started) return;
started = true;

var $=function(s){return document.querySelector(s)};
var KEY='grateful.memories.v1',DRAFT='grateful.draft.v1';
var mems=[],imgs=[],trigger=null,saving=false,PK='grateful.prefs.v1',prefs={quick:'text',layout:'slide'},isMobile=/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&matchMedia('(pointer:coarse)').matches);
try{var sp=JSON.parse(localStorage.getItem(PK)||'{}');if(sp.quick==='photo')prefs.quick='photo';if(sp.layout==='grid')prefs.layout='grid'}catch(e){}
mems=[];
function persist(){try{localStorage.setItem(KEY,JSON.stringify(mems));return true}catch(e){return false}}

function show(v){
  ['home','memV','tlV'].forEach(function(id){$('#'+id).classList.toggle('on',id===v)});
  $('#navMem').classList.toggle('on',v==='memV');
  window.scrollTo(0,0);$('#navTl').classList.toggle('on',v==='tlV');if(v==='memV')render();if(v==='tlV')renderTl();
}
$('#logo').onclick=function(){show('home')};
$('#navMem').onclick=function(){show('memV')};$('#navTl').onclick=function(){show('tlV')};
$('#cue').onclick=function(){show('memV')};

function fmt(t){return new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).toUpperCase()}
function renderOld(){
  var q=$('#q').value.trim().toLowerCase(),g=$('#grid');g.innerHTML='';
  var list=mems.filter(function(m){return !q||(m.text||'').toLowerCase().indexOf(q)>-1});
  $('#empty').hidden=mems.length>0;
  if(mems.length&&!list.length){g.innerHTML='<p class="dim" style="grid-column:1/-1">Nothing matches that yet.</p>'}
  list.forEach(function(m,i){
    var c=document.createElement('article');c.className='card';c.style.animationDelay=Math.min(i*60,360)+'ms';
    var ims=m.images||(m.image?[m.image]:[]);if(ims.length){var w=document.createElement('div');w.className='ph'+(ims.length>1?' n':'');ims.forEach(function(s,j){var im=new Image();im.src=s;im.alt='Saved moment photo '+(j+1);w.appendChild(im)});c.appendChild(w)}
    var b=document.createElement('div');b.className='b';
    if(m.text){var p=document.createElement('p');p.textContent=m.text;b.appendChild(p)}
    var d=document.createElement('span');d.className='mono dim';d.textContent=fmt(m.created);b.appendChild(d);c.appendChild(b);
    var x=document.createElement('button');x.className='del';x.setAttribute('aria-label','Delete memory');x.textContent='×';
    x.onclick=function(){if(confirm('Delete this memory?')){mems=mems.filter(function(k){return k.id!==m.id});persist();render()}};
    c.appendChild(x);g.appendChild(c);
  });
}
$('#q').oninput=render;

function dirty(){return $('#txt').value.trim()||imgs.length}
function upd(){$('#save').disabled=!dirty()||saving}
function draft(){if(editId)return;try{localStorage.setItem(DRAFT,$('#txt').value)}catch(e){}}
function openM(e,noFocus){
  trigger=e&&e.currentTarget||document.activeElement;
  var b=$('#bk');b.style.display='grid';
  try{if(!editId&&!$('#txt').value)$('#txt').value=localStorage.getItem(DRAFT)||''}catch(e2){}
  requestAnimationFrame(function(){b.classList.add('show');if(!noFocus)$('#txt').focus()});
  document.body.style.overflow='hidden';upd();
}
function closeM(force){
  if(!force&&!editId&&dirty()&&!confirm('Close without saving? Your text is kept as a draft, but the photo will be discarded.'))return;
  if(editId){setTimeout(resetEdit,320)}else if(!force&&imgs.length){imgs=[];drawImgs()}
  var b=$('#bk');b.classList.remove('show');document.body.style.overflow='';
  setTimeout(function(){b.style.display='none'},300);
  if(trigger&&trigger.focus)trigger.focus();
}
document.querySelectorAll('.open,#plus').forEach(function(el){el.addEventListener('click',function(e){
  if(isMobile&&prefs.quick==='photo'){trigger=e.currentTarget;$('#err').textContent='';$('#f2').click()}else openM(e)})});
$('#x').onclick=function(){closeM()};
$('#bk').addEventListener('mousedown',function(e){if(e.target===this)closeM()});
document.addEventListener('keydown',function(e){
  if($('#bk').style.display!=='grid')return;
  if(e.key==='Escape')closeM();
  if(e.key==='Tab'){var f=[].slice.call($('#modal').querySelectorAll('button:not([disabled]),textarea')).filter(function(n){return n.offsetParent});
    var a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
});
$('#txt').oninput=function(){draft();upd()};

function drawImgs(){var pv=$('#pv');pv.innerHTML='';pv.style.display=imgs.length?'grid':'none';
  imgs.forEach(function(d,i){var t=document.createElement('div');t.className='th';var im=new Image();im.src=d;im.alt='Selected photo '+(i+1);
    var b=document.createElement('button');b.textContent='×';b.setAttribute('aria-label','Remove photo '+(i+1));b.onclick=function(){imgs.splice(i,1);drawImgs()};
    t.appendChild(im);t.appendChild(b);pv.appendChild(t)});
  $('#addl').textContent=imgs.length?'Add more photos':'Add a photo';$('#cam').textContent=imgs.length?'Take another':'Take photo';upd()}
function pick(file,done){
  $('#err').textContent='';
  if(!file)return;
  if(!/^image\/(jpeg|png|webp|gif|heic|heif)$/i.test(file.type)){$('#err').textContent='Please choose a JPG, PNG, WebP or GIF image.';if(done)done();return}
  if(file.size>25*1024*1024){$('#err').textContent='That image is over 25 MB. Try a smaller one.';if(done)done();return}
  var u=URL.createObjectURL(file),i=new Image();
  i.onload=function(){
    var M=1100,s=Math.min(1,M/Math.max(i.width,i.height)),c=document.createElement('canvas');
    c.width=Math.round(i.width*s);c.height=Math.round(i.height*s);c.getContext('2d').drawImage(i,0,0,c.width,c.height);
    if(imgs.length>=8){$('#err').textContent='Up to 8 photos per moment.'}else imgs.push(c.toDataURL('image/jpeg',.72));
    URL.revokeObjectURL(u);drawImgs();if(done)done();
  };
  i.onerror=function(){$('#err').textContent='This image couldn’t be read. Try another format.';URL.revokeObjectURL(u);if(done)done()};
  i.src=u;
}
$('#add').onclick=function(){$('#f1').click()};
$('#cam').onclick=function(){$('#f2').click()};
['#f1','#f2'].forEach(function(s){$(s).onchange=function(){
  var fs=[].slice.call(this.files);this.value='';var closed=$('#bk').style.display!=='grid';
  fs.forEach(function(f,i){pick(f,closed&&i===fs.length-1?function(){openM({currentTarget:trigger},true)}:null)})}});


$('#save').onclick=function(){
  if(!dirty())return;
  var m={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),text:$('#txt').value.trim(),images:imgs.slice(),created:Date.now()};
  mems.unshift(m);
  if(!persist()){mems.shift();$('#err').textContent='Browser storage is full, so this couldn’t be saved. Delete an older memory and retry.';return}
  $('#txt').value='';imgs=[];drawImgs();try{localStorage.removeItem(DRAFT)}catch(e){}
  var k=$('#kept');k.classList.add('show');setTimeout(function(){k.classList.remove('show')},1600);
  closeM(true);render();
};
var sb=$('#sbk'),gear=$('#gear');
function syncSeg(){document.querySelectorAll('#seg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===prefs.quick))});
  $('#sinfo').textContent=isMobile?'Photo mode: tap Capture a moment, snap the picture, then save. You can take several.':'This applies on phones and tablets only. On this device you will always get the note card.'}
function openS(){sb.style.display='grid';syncSeg();requestAnimationFrame(function(){sb.classList.add('show');$('#seg button').focus()});document.body.style.overflow='hidden'}
function closeS(){sb.classList.remove('show');document.body.style.overflow='';setTimeout(function(){sb.style.display='none'},300);gear.focus()}
gear.onclick=openS;$('#sx').onclick=closeS;
sb.addEventListener('mousedown',function(e){if(e.target===sb)closeS()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&sb.style.display==='grid')closeS()});
document.querySelectorAll('#seg button').forEach(function(b){b.onclick=function(){prefs.quick=b.dataset.v;try{localStorage.setItem(PK,JSON.stringify(prefs))}catch(e){}syncSeg()}});
var editId=null,cur=null,vTrig=null,tl={y:null,m:null,d:null};
var MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function savePrefs(){try{localStorage.setItem(PK,JSON.stringify(prefs))}catch(e){}}
function mk(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function imgsOf(m){return m.images||(m.image?[m.image]:[])}
function toLocal(ts){var d=new Date(ts-new Date(ts).getTimezoneOffset()*6e4);return d.toISOString().slice(0,16)}
function toast(){var k=$('#kept');k.classList.add('show');setTimeout(function(){k.classList.remove('show')},1600)}
function makeCard(m,i){
  var c=mk('article','card'),ims=imgsOf(m);c.style.animationDelay=Math.min(i*60,360)+'ms';
  if(ims.length){var w=mk('div','ph'),im=new Image();im.src=ims[0];im.alt='Saved moment photo';w.appendChild(im);c.appendChild(w);if(ims.length>1)c.appendChild(mk('span','cnt mono','1 / '+ims.length))}
  var b=mk('div','b');if(m.text)b.appendChild(mk('p',null,m.text));b.appendChild(mk('span','mono dim',fmt(m.created)));c.appendChild(b);
  var e=mk('button','exp');e.setAttribute('aria-label','See all photos and the full text');
  e.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  e.onclick=function(){openV(m,e)};c.appendChild(e);return c}
function renderMem(){
  mems.sort(function(a,b){return b.created-a.created});
  var q=$('#q').value.trim().toLowerCase(),g=$('#grid');g.innerHTML='';
  var list=mems.filter(function(m){return !q||(m.text||'').toLowerCase().indexOf(q)>-1});
  $('#empty').hidden=mems.length>0;
  if(mems.length&&!list.length)g.innerHTML='<p class="dim" style="grid-column:1/-1">Nothing matches that yet.</p>';
  list.forEach(function(m,i){g.appendChild(makeCard(m,i))})}
function render(){renderMem();renderTl()}
function renderTl(){
  var box=$('#tlBody'),cr=$('#crumbs');box.innerHTML='';cr.innerHTML='';
  var S=mems.slice().sort(function(a,b){return b.created-a.created});
  function sel(y,m,d){return S.filter(function(x){var t=new Date(x.created);return(y==null||t.getFullYear()===y)&&(m==null||t.getMonth()===m)&&(d==null||t.getDate()===d)})}
  if(tl.y!=null&&!sel(tl.y,tl.m,tl.d).length)tl={y:null,m:null,d:null};
  function crumb(t,fn){var b=mk('button','mono link'+(fn?'':' on'),t);if(fn)b.onclick=fn;cr.appendChild(b)}
  function go(y,m,d){return function(){tl={y:y,m:m,d:d};renderTl()}}
  crumb('All years',tl.y==null?null:go(null,null,null));
  if(tl.y!=null)crumb(String(tl.y),tl.m==null?null:go(tl.y,null,null));
  if(tl.m!=null)crumb(MN[tl.m],tl.d==null?null:go(tl.y,tl.m,null));
  if(tl.d!=null)crumb(String(tl.d),null);
  if(!S.length){box.appendChild(mk('p','dim','No memories yet. Capture one and it will appear here.'));return}
  function tiles(list,kf,label,pick){
    var o={},ks=[];list.forEach(function(m){var k=kf(new Date(m.created));if(!(k in o)){o[k]=0;ks.push(k)}o[k]++});
    var t=mk('div','tl');ks.forEach(function(k,i){var b=mk('button','tile');b.style.animationDelay=Math.min(i*40,300)+'ms';b.appendChild(mk('b',null,label(k)));b.appendChild(mk('span','mono dim',o[k]+(o[k]>1?' moments':' moment')));b.onclick=function(){pick(k)};t.appendChild(b)});box.appendChild(t)}
  if(tl.y==null)tiles(S,function(t){return t.getFullYear()},String,function(k){go(k,null,null)()});
  else if(tl.m==null)tiles(sel(tl.y),function(t){return t.getMonth()},function(k){return MN[k]},function(k){go(tl.y,k,null)()});
  else if(tl.d==null)tiles(sel(tl.y,tl.m),function(t){return t.getDate()},function(k){return new Date(tl.y,tl.m,k).toLocaleDateString(undefined,{weekday:'short',day:'numeric'})},function(k){go(tl.y,tl.m,k)()});
  else{var g=mk('div','grid');sel(tl.y,tl.m,tl.d).forEach(function(m,i){g.appendChild(makeCard(m,i))});box.appendChild(g)}}
function drawV(){
  var ims=imgsOf(cur),box=$('#vimgs');box.innerHTML='';box.className=prefs.layout==='grid'?'bx':'sl';box.style.display=ims.length?'':'none';
  ims.forEach(function(s,i){var im=new Image();im.src=s;im.alt='Photo '+(i+1)+' of '+ims.length;box.appendChild(im)});
  $('#vtext').textContent=cur.text||'';$('#vdate').textContent=fmt(cur.created);$('#vlay').style.display=ims.length>1?'':'none';
  document.querySelectorAll('#vlay button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.l===prefs.layout))})}
function openV(m,t){cur=m;vTrig=t;drawV();var v=$('#vbk');v.style.display='grid';requestAnimationFrame(function(){v.classList.add('show');$('#vx').focus()});document.body.style.overflow='hidden'}
function closeV(skip){var v=$('#vbk');v.classList.remove('show');document.body.style.overflow='';setTimeout(function(){v.style.display='none'},300);if(skip!==true&&vTrig&&vTrig.focus)vTrig.focus()}
$('#vx').onclick=function(){closeV()};$('#vbk').addEventListener('mousedown',function(e){if(e.target===this)closeV()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('#vbk').style.display==='grid')closeV()});
document.querySelectorAll('#vlay button').forEach(function(b){b.onclick=function(){prefs.layout=b.dataset.l;savePrefs();drawV()}});
$('#vdel').onclick=function(){if(!confirm('Delete this memory?'))return;var id=cur.id;mems=mems.filter(function(k){return k.id!==id});persist();closeV();render()};
function startEdit(m,t){editId=m.id;imgs=imgsOf(m).slice();$('#txt').value=m.text||'';$('#when').value=toLocal(m.created);$('#whenRow').hidden=false;$('#mt').textContent='Edit this moment.';$('#save').textContent='Save changes ↗';drawImgs();openM({currentTarget:t||document.body})}
function resetEdit(){editId=null;$('#txt').value='';imgs=[];drawImgs();$('#whenRow').hidden=true;$('#mt').textContent='Keep this moment.';$('#save').textContent='Save this moment ↗'}
$('#vedit').onclick=function(){var m=cur,t=vTrig;closeV(true);startEdit(m,t)};
var oldSave=$('#save').onclick;
$('#save').onclick=function(){
  if(!editId){oldSave();return}
  var m=mems.filter(function(k){return k.id===editId})[0];if(!m||!dirty())return;
  var o={t:m.text,i:m.images,im:m.image,c:m.created};
  m.text=$('#txt').value.trim();m.images=imgs.slice();delete m.image;var t=new Date($('#when').value).getTime();if(t)m.created=t;
  if(!persist()){m.text=o.t;m.images=o.i;if(o.im)m.image=o.im;m.created=o.c;$('#err').textContent='Browser storage is full, so the changes couldn’t be saved. Remove a photo and retry.';return}
  toast();closeM(true);render()};
var lay=document.querySelectorAll('#lay button');
function syncLay(){lay.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===prefs.layout))})}
lay.forEach(function(b){b.onclick=function(){prefs.layout=b.dataset.v;savePrefs();syncLay()}});
gear.addEventListener('click',syncLay);syncLay();
var BUCKET='memory-photos';
var PEND='grateful.pending.v1';
var sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string),uid=null,urlToPath={};
async function loadMems(){
  var r=await sb.from('memories').select('*').order('created_at',{ascending:false});
  if(r.error){alert('Couldn\u2019t load your memories: '+r.error.message);return}
  var all=[],urlOf={};r.data.forEach(function(x){(x.image||[]).forEach(function(p){all.push(p)})});
  if(all.length){var s=await sb.storage.from(BUCKET).createSignedUrls(all,86400);(s.data||[]).forEach(function(o){if(o.signedUrl){urlOf[o.path]=o.signedUrl;urlToPath[o.signedUrl]=o.path}})}
  mems=r.data.map(function(x){var ps=x.image||[];return{id:x.id,text:x.text||'',_paths:ps,images:ps.map(function(p){return urlOf[p]}).filter(Boolean),created:Date.parse(x.created_at)}});
}
$('#save').onclick=async function(){
  if(saving||!dirty())return;
  if(!uid){try{localStorage.setItem(PEND,JSON.stringify({t:$('#txt').value,i:imgs}))}catch(e){}showAuth(true);return}
  var btn=$('#save'),lbl=btn.textContent;saving=true;btn.disabled=true;btn.textContent='Saving\u2026';$('#err').textContent='';
  try{
    var id=editId||crypto.randomUUID(),paths=[];
    for(var i=0;i<imgs.length;i++){var s=imgs[i];
      if(s.indexOf('data:')===0){var p=uid+'/'+id+'/'+Date.now()+'-'+i+'.jpg',blob=await(await fetch(s)).blob();
        var up=await sb.storage.from(BUCKET).upload(p,blob,{contentType:'image/jpeg'});if(up.error)throw up.error;paths.push(p)}
      else if(urlToPath[s])paths.push(urlToPath[s])}
    var txt=$('#txt').value.trim(),row={text:txt||null,image:paths},old=null;
    if(editId){var t=new Date($('#when').value).getTime();if(t)row.created_at=new Date(t).toISOString();old=mems.filter(function(k){return k.id===editId})[0]}
    var r=editId?await sb.from('memories').update(row).eq('id',id):await sb.from('memories').insert(Object.assign({id:id},row));
    if(r.error)throw r.error;
    if(old&&old._paths){var gone=old._paths.filter(function(p){return paths.indexOf(p)<0});if(gone.length)await sb.storage.from(BUCKET).remove(gone)}
    if(!editId){$('#txt').value='';imgs=[];drawImgs();try{localStorage.removeItem(DRAFT)}catch(e){}}
    toast();closeM(true);await loadMems();render();
  }catch(e){$('#err').textContent='Couldn\u2019t save yet: '+(e.message||'network problem')+'. Your text and photos are still here \u2014 tap Save to retry.'}
  finally{saving=false;btn.textContent=lbl;upd()}
};
$('#vdel').onclick=async function(){
  if(!confirm('Delete this memory?'))return;var m=cur;
  var r=await sb.from('memories').delete().eq('id',m.id);if(r.error){alert('Couldn\u2019t delete: '+r.error.message);return}
  if(m._paths&&m._paths.length)await sb.storage.from(BUCKET).remove(m._paths);
  closeV();await loadMems();render()};
function showAuth(on){$('#auth').style.display=on?'grid':'none';if(on){$('#aMsg').textContent='';setTimeout(function(){$('#aMail').focus()},60)}}
async function boot(s){
  if(!s){uid=null;mems=[];$('#acct').textContent='You\u2019re browsing as a guest.';$('#signout').textContent='Sign in';render();return}
  uid=s.user.id;$('#acct').textContent=s.user.email;$('#signout').textContent='Sign out';showAuth(false);await loadMems();render();
  var raw=null;try{raw=localStorage.getItem(PEND);localStorage.removeItem(PEND)}catch(e){}
  if(raw){try{var d=JSON.parse(raw);$('#txt').value=d.t||'';imgs=d.i||[];drawImgs();if($('#bk').style.display!=='grid')openM({currentTarget:document.body},true);$('#save').click()}catch(e){}}}
sb.auth.onAuthStateChange(function(ev,s){if(ev==='SIGNED_OUT'||!s){setTimeout(function(){boot(null)},0)}else if(s.user.id!==uid){setTimeout(function(){boot(s)},0)}});
async function cred(up){
  var e=$('#aMail').value.trim(),p=$('#aPass').value,m=$('#aMsg');m.textContent='';
  if(!e||p.length<6){m.textContent='Enter your email and a password of at least 6 characters.';return}
  m.textContent=up?'Creating your account\u2026':'Signing in\u2026';
  var r=up?await sb.auth.signUp({email:e,password:p}):await sb.auth.signInWithPassword({email:e,password:p});
  if(r.error){m.textContent=r.error.message;return}
  m.textContent=(up&&!r.data.session)?'Check your email to confirm your account, then sign in.':''}
$('#aIn').onclick=function(){cred(false)};$('#aUp').onclick=function(){cred(true)};
$('#aPass').addEventListener('keydown',function(e){if(e.key==='Enter')cred(false)});
$('#aG').onclick=async function(){var r=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(r.error)$('#aMsg').textContent=r.error.message};
$('#signout').onclick=async function(){closeS();if(uid)await sb.auth.signOut();else showAuth(true)};
$('#aG').onclick=async function(){var r=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(r.error)$('#aMsg').textContent=r.error.message};
$('#aNo').onclick=function(){try{localStorage.removeItem(PEND)}catch(e){}showAuth(false)};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('#auth').style.display==='grid'){e.stopImmediatePropagation();$('#aNo').click()}},true);
render();

}
