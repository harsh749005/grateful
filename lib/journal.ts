// @ts-nocheck
// Journal logic (capture, memories, timeline, Supabase sync), carried over as one module.
import { deleteMemory, fetchMemories, saveMemory } from './memoryRepository';
import { supabase } from './supabaseClient';
let started = false;

export function startJournal() {
if (started) return;
started = true;

var $=function(s){return document.querySelector(s)};
var DRAFT='grateful.draft.v1';
var mems=[],imgs=[],trigger=null,saving=false,PK='grateful.prefs.v1',prefs={quick:'text',layout:'slide'},isMobile=/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&matchMedia('(pointer:coarse)').matches);
try{var sp=JSON.parse(localStorage.getItem(PK)||'{}');if(sp.quick==='photo')prefs.quick='photo';if(sp.layout==='grid')prefs.layout='grid'}catch(e){}
mems=[];

function show(v){
  ['home','memV','tlV'].forEach(function(id){$('#'+id).classList.toggle('on',id===v)});
  $('#navMem').classList.toggle('on',v==='memV');
  window.scrollTo(0,0);$('#navTl').classList.toggle('on',v==='tlV');if(v==='memV')render();if(v==='tlV')renderTl();
}
$('#logo').onclick=function(){show('home')};
$('#navMem').onclick=function(){show('memV')};$('#navTl').onclick=function(){show('tlV')};
$('#cue').onclick=function(){show('memV')};

function fmt(t){return new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).toUpperCase()}
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


var settingsBackdrop=$('#sbk'),gear=$('#gear');
function syncSeg(){document.querySelectorAll('#seg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===prefs.quick))});
  $('#sinfo').textContent=isMobile?'Photo mode: tap Capture a moment, snap the picture, then save. You can take several.':'This applies on phones and tablets only. On this device you will always get the note card.'}
function openS(){settingsBackdrop.style.display='grid';syncSeg();requestAnimationFrame(function(){settingsBackdrop.classList.add('show');$('#seg button').focus()});document.body.style.overflow='hidden'}
function closeS(){settingsBackdrop.classList.remove('show');document.body.style.overflow='';setTimeout(function(){settingsBackdrop.style.display='none'},300);gear.focus()}
gear.onclick=openS;$('#sx').onclick=closeS;
settingsBackdrop.addEventListener('mousedown',function(e){if(e.target===settingsBackdrop)closeS()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&settingsBackdrop.style.display==='grid')closeS()});
document.querySelectorAll('#seg button').forEach(function(b){b.onclick=function(){prefs.quick=b.dataset.v;try{localStorage.setItem(PK,JSON.stringify(prefs))}catch(e){}syncSeg()}});
var editId=null,cur=null,vTrig=null,tl={y:null,m:null,d:null};
var MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function savePrefs(){try{localStorage.setItem(PK,JSON.stringify(prefs))}catch(e){}}
function mk(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function photosOf(m){return m.photoUrls}
function toLocal(ts){var d=new Date(ts-new Date(ts).getTimezoneOffset()*6e4);return d.toISOString().slice(0,16)}
function toast(){var k=$('#kept');k.classList.add('show');setTimeout(function(){k.classList.remove('show')},1600)}
function makeCard(m,i){
  var c=mk('article','card'),ims=photosOf(m);c.style.animationDelay=Math.min(i*60,360)+'ms';
  if(ims.length){var w=mk('div','ph'),im=new Image();im.src=ims[0];im.alt='Saved moment photo';w.appendChild(im);c.appendChild(w);if(ims.length>1)c.appendChild(mk('span','cnt mono','1 / '+ims.length))}
  var b=mk('div','b');if(m.text)b.appendChild(mk('p',null,m.text));b.appendChild(mk('span','mono dim',fmt(m.createdAt)));c.appendChild(b);
  var e=mk('button','exp');e.setAttribute('aria-label','See all photos and the full text');
  e.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  e.onclick=function(){openV(m,e)};c.appendChild(e);return c}
function renderMem(){
  mems.sort(function(a,b){return b.createdAt-a.createdAt});
  var q=$('#q').value.trim().toLowerCase(),g=$('#grid');g.innerHTML='';
  var list=mems.filter(function(m){return !q||(m.text||'').toLowerCase().indexOf(q)>-1});
  $('#empty').hidden=mems.length>0;
  if(mems.length&&!list.length)g.innerHTML='<p class="dim" style="grid-column:1/-1">Nothing matches that yet.</p>';
  list.forEach(function(m,i){g.appendChild(makeCard(m,i))})}
function render(){renderMem();renderTl()}
function renderTl(){
  var box=$('#tlBody'),cr=$('#crumbs');box.innerHTML='';cr.innerHTML='';
  var S=mems.slice().sort(function(a,b){return b.createdAt-a.createdAt});
  function sel(y,m,d){return S.filter(function(x){var t=new Date(x.createdAt);return(y==null||t.getFullYear()===y)&&(m==null||t.getMonth()===m)&&(d==null||t.getDate()===d)})}
  if(tl.y!=null&&!sel(tl.y,tl.m,tl.d).length)tl={y:null,m:null,d:null};
  function crumb(t,fn){var b=mk('button','mono link'+(fn?'':' on'),t);if(fn)b.onclick=fn;cr.appendChild(b)}
  function go(y,m,d){return function(){tl={y:y,m:m,d:d};renderTl()}}
  crumb('All years',tl.y==null?null:go(null,null,null));
  if(tl.y!=null)crumb(String(tl.y),tl.m==null?null:go(tl.y,null,null));
  if(tl.m!=null)crumb(MN[tl.m],tl.d==null?null:go(tl.y,tl.m,null));
  if(tl.d!=null)crumb(String(tl.d),null);
  if(!S.length){box.appendChild(mk('p','dim','No memories yet. Capture one and it will appear here.'));return}
  function tiles(list,kf,label,pick){
    var o={},ks=[];list.forEach(function(m){var k=kf(new Date(m.createdAt));if(!(k in o)){o[k]=0;ks.push(k)}o[k]++});
    var t=mk('div','tl');ks.forEach(function(k,i){var b=mk('button','tile');b.style.animationDelay=Math.min(i*40,300)+'ms';b.appendChild(mk('b',null,label(k)));b.appendChild(mk('span','mono dim',o[k]+(o[k]>1?' moments':' moment')));b.onclick=function(){pick(k)};t.appendChild(b)});box.appendChild(t)}
  if(tl.y==null)tiles(S,function(t){return t.getFullYear()},String,function(k){go(k,null,null)()});
  else if(tl.m==null)tiles(sel(tl.y),function(t){return t.getMonth()},function(k){return MN[k]},function(k){go(tl.y,k,null)()});
  else if(tl.d==null)tiles(sel(tl.y,tl.m),function(t){return t.getDate()},function(k){return new Date(tl.y,tl.m,k).toLocaleDateString(undefined,{weekday:'short',day:'numeric'})},function(k){go(tl.y,tl.m,k)()});
  else{var g=mk('div','grid');sel(tl.y,tl.m,tl.d).forEach(function(m,i){g.appendChild(makeCard(m,i))});box.appendChild(g)}}
function drawV(){
  var ims=photosOf(cur),box=$('#vimgs');box.innerHTML='';box.className=prefs.layout==='grid'?'bx':'sl';box.style.display=ims.length?'':'none';
  ims.forEach(function(s,i){var im=new Image();im.src=s;im.alt='Photo '+(i+1)+' of '+ims.length;box.appendChild(im)});
  $('#vtext').textContent=cur.text||'';$('#vdate').textContent=fmt(cur.createdAt);$('#vlay').style.display=ims.length>1?'':'none';
  document.querySelectorAll('#vlay button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.l===prefs.layout))})}
function openV(m,t){cur=m;vTrig=t;drawV();var v=$('#vbk');v.style.display='grid';requestAnimationFrame(function(){v.classList.add('show');$('#vx').focus()});document.body.style.overflow='hidden'}
function closeV(skip){var v=$('#vbk');v.classList.remove('show');document.body.style.overflow='';setTimeout(function(){v.style.display='none'},300);if(skip!==true&&vTrig&&vTrig.focus)vTrig.focus()}
$('#vx').onclick=function(){closeV()};$('#vbk').addEventListener('mousedown',function(e){if(e.target===this)closeV()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('#vbk').style.display==='grid')closeV()});
document.querySelectorAll('#vlay button').forEach(function(b){b.onclick=function(){prefs.layout=b.dataset.l;savePrefs();drawV()}});
function startEdit(m,t){editId=m.id;imgs=photosOf(m).slice();$('#txt').value=m.text||'';$('#when').value=toLocal(m.createdAt);$('#whenRow').hidden=false;$('#mt').textContent='Edit this moment.';$('#save').textContent='Save changes ↗';drawImgs();openM({currentTarget:t||document.body})}
function resetEdit(){editId=null;$('#txt').value='';imgs=[];drawImgs();$('#whenRow').hidden=true;$('#mt').textContent='Keep this moment.';$('#save').textContent='Save this moment ↗'}
$('#vedit').onclick=function(){var m=cur,t=vTrig;closeV(true);startEdit(m,t)};
var lay=document.querySelectorAll('#lay button');
function syncLay(){lay.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===prefs.layout))})}
lay.forEach(function(b){b.onclick=function(){prefs.layout=b.dataset.v;savePrefs();syncLay()}});
gear.addEventListener('click',syncLay);syncLay();
// ---------------------------------------------------------------------------
// Cloud sync: loading, saving and deleting memories (see memoryRepository.ts)
// ---------------------------------------------------------------------------
var PENDING_KEYING_KEY='grateful.pending.v1'; // a guest's unsaved moment, kept while they sign in
var userId=null;                       // set while someone is signed in

/** Reloads every memory from the database into `mems`. */
async function reloadMemories(){
  try{mems=await fetchMemories()}
  catch(error){alert('Couldn\u2019t load your memories: '+error.message)}
}
function clearDraft(){try{localStorage.removeItem(DRAFT)}catch(e){}}
/** Remembers what a guest typed so it can be saved right after they sign in. */
function stashPendingMoment(){try{localStorage.setItem(PENDING_KEYING_KEY,JSON.stringify({t:$('#txt').value,i:imgs}))}catch(e){}}

$('#save').onclick=async function(){
  if(saving||!dirty())return;
  if(!userId){stashPendingMoment();showAuth(true);return}
  var button=$('#save'),label=button.textContent;
  saving=true;button.disabled=true;button.textContent='Saving\u2026';$('#err').textContent='';
  try{
    var editedTime=editId?new Date($('#when').value).getTime():NaN;
    await saveMemory({
      userId:userId,
      text:$('#txt').value.trim(),
      photos:imgs,
      existing:editId?mems.find(function(m){return m.id===editId}):undefined,
      createdAt:editedTime||undefined
    });
    if(!editId){$('#txt').value='';imgs=[];drawImgs();clearDraft()}
    toast();closeM(true);await reloadMemories();render();
  }catch(error){
    $('#err').textContent='Couldn\u2019t save yet: '+(error.message||'network problem')+'. Your text and photos are still here \u2014 tap Save to retry.';
  }finally{saving=false;button.textContent=label;upd()}
};
$('#vdel').onclick=async function(){
  if(!confirm('Delete this memory?'))return;
  try{await deleteMemory(cur)}catch(error){alert('Couldn\u2019t delete: '+error.message);return}
  closeV();await reloadMemories();render();
};
function showAuth(on){$('#auth').style.display=on?'grid':'none';if(on){$('#aMsg').textContent='';setTimeout(function(){$('#aMail').focus()},60)}}
async function boot(s){
  if(!s){userId=null;mems=[];$('#acct').textContent='You\u2019re browsing as a guest.';$('#signout').textContent='Sign in';render();return}
  userId=s.user.id;$('#acct').textContent=s.user.email;$('#signout').textContent='Sign out';showAuth(false);await reloadMemories();render();
  var raw=null;try{raw=localStorage.getItem(PENDING_KEY);localStorage.removeItem(PENDING_KEY)}catch(e){}
  if(raw){try{var d=JSON.parse(raw);$('#txt').value=d.t||'';imgs=d.i||[];drawImgs();if($('#bk').style.display!=='grid')openM({currentTarget:document.body},true);$('#save').click()}catch(e){}}}
supabase.auth.onAuthStateChange(function(ev,s){if(ev==='SIGNED_OUT'||!s){setTimeout(function(){boot(null)},0)}else if(s.user.id!==userId){setTimeout(function(){boot(s)},0)}});
async function cred(up){
  var e=$('#aMail').value.trim(),p=$('#aPass').value,m=$('#aMsg');m.textContent='';
  if(!e||p.length<6){m.textContent='Enter your email and a password of at least 6 characters.';return}
  m.textContent=up?'Creating your account\u2026':'Signing in\u2026';
  var r=up?await supabase.auth.signUp({email:e,password:p}):await supabase.auth.signInWithPassword({email:e,password:p});
  if(r.error){m.textContent=r.error.message;return}
  m.textContent=(up&&!r.data.session)?'Check your email to confirm your account, then sign in.':''}
$('#aIn').onclick=function(){cred(false)};$('#aUp').onclick=function(){cred(true)};
$('#aPass').addEventListener('keydown',function(e){if(e.key==='Enter')cred(false)});
$('#signout').onclick=async function(){closeS();if(userId)await supabase.auth.signOut();else showAuth(true)};
$('#aG').onclick=async function(){var r=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(r.error)$('#aMsg').textContent=r.error.message};
$('#aNo').onclick=function(){try{localStorage.removeItem(PENDING_KEY)}catch(e){}showAuth(false)};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('#auth').style.display==='grid'){e.stopImmediatePropagation();$('#aNo').click()}},true);
render();

}