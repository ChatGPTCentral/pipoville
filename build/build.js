const fs = require('fs');

const SUPABASE_URL = 'https://caevwgkbmezevykdpboe.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZXZ3Z2tibWV6ZXZ5a2RwYm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODM3MjgsImV4cCI6MjA5NTU1OTcyOH0.RSTInwo9Ih8RgZk6SjPKFCvmS5AspEyqKy9PcUi16pc';
const DOC_ID = 'whitepaper-g';
// Public CORS-enabled URL of build/template.html (baked at build time; pin to an immutable commit SHA).
const TEMPLATE_URL = process.env.TEMPLATE_URL || 'TEMPLATE_URL_PLACEHOLDER';

let html = fs.readFileSync('build/whitepaper-g.raw.html', 'utf8');

// --- 1. Extract helmet <style> CSS (strip @font-face; fonts come from Google Fonts) ---
const styleMatch = html.match(/<helmet>[\s\S]*?<style>([\s\S]*?)<\/style>/);
let css = styleMatch ? styleMatch[1] : '';
css = css.replace(/@font-face\s*\{[^}]*\}/g, '').trim();

// --- 2. Isolate the pages (drop DC widget, wrappers, trailing runtime script) ---
const firstSection = html.indexOf('<section class="page"');
const lastSectionEnd = html.lastIndexOf('</section>') + '</section>'.length;
let pages = html.slice(firstSection, lastSectionEnd);

// --- 3. Resolve template bindings ---
const bind = {
  zName: 'Zoltan', tName: 'Tsvetelin', mName: 'Marc Duke', aName: 'Alex Fiore',
  zLi: '#', tLi: '#', mLi: '#', aLi: '#',
  zLiLabel: 'Connect on LinkedIn', tLiLabel: 'Connect on LinkedIn',
  mLiLabel: 'Connect on LinkedIn', aLiLabel: 'Connect on LinkedIn',
  zLiRaw: '', tLiRaw: '', mLiRaw: '', aLiRaw: ''
};
pages = pages.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) =>
  Object.prototype.hasOwnProperty.call(bind, key) ? bind[key] : '');

// --- 4. <image-slot> face placeholders -> initials avatars ---
const initials = { zoltan: 'Z', tsvetelin: 'T', mark: 'M', alex: 'A' };
pages = pages.replace(/<image-slot\s+id="face-([a-z]+)"[^>]*>\s*<\/image-slot>/g, (m, who) => {
  const ini = initials[who] || '';
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;` +
         `background:#F5F0E8;color:#111111;font-family:'Inter',sans-serif;font-weight:700;` +
         `font-size:38px;letter-spacing:-0.02em;user-select:none">${ini}</div>`;
});

// --- 5. AI Central logo <img> -> lightweight text lockup (keeps height) ---
pages = pages.replace(
  /<img src="assets\/logo-full-(light|dark)-bg\.png" alt="AI Central" style="height:(\d+(?:\.\d+)?)px;width:auto;display:block">/g,
  (m, variant, h) => {
    const ink = variant === 'light' ? '#111111' : '#FFFDFA';
    const fs2 = (parseFloat(h) * 0.92).toFixed(1);
    return `<span style="display:inline-block;font-family:'Montserrat','Inter',sans-serif;` +
           `font-weight:700;font-size:${fs2}px;line-height:1;letter-spacing:0.04em;` +
           `color:${ink};white-space:nowrap">AI CENTRAL</span>`;
  });

// --- 6. Remove the (asset-less) paper-texture overlay divs ---
pages = pages.replace(
  /<div style="position:absolute;inset:0;background:url\('assets\/bg-paper-texture-default\.png'\)[^"]*"[^>]*><\/div>/g,
  '');

// --- 7. Trim editor-only labels + collapse pretty-print whitespace ---
pages = pages.replace(/\s*data-screen-label="[^"]*"/g, '');
pages = pages.replace(/>\s*\n\s*</g, '><').replace(/\n\s+/g, ' ');

// ===== OUTPUTS =====
// (a) The heavy page markup -> stored in Supabase, fetched by the loader at runtime.
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/template.html', pages);

// (b) The tiny loader that ships to Vercel.
const CONFIG = { url: SUPABASE_URL, anon: SUPABASE_ANON, docId: DOC_ID, templateUrl: TEMPLATE_URL };

const editorCSS = `
#wp-bar{position:fixed;top:0;left:0;right:0;z-index:1000;display:flex;align-items:center;gap:14px;
  padding:9px 16px;background:#111;color:#FFFDFA;font-family:'Inter',sans-serif;font-size:13px;
  box-shadow:0 2px 10px rgba(0,0,0,.25);border-bottom:2px solid #FED600}
#wp-bar .wp-brand{display:flex;align-items:center;gap:9px;font-weight:700;letter-spacing:.02em}
#wp-bar .wp-dot{width:9px;height:9px;background:#FED600;display:inline-block}
#wp-bar .wp-spacer{flex:1}
#wp-bar button{font-family:'Inter',sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;
  border:1.5px solid #FED600;background:#FED600;color:#111;padding:6px 14px;border-radius:2px}
#wp-bar button.ghost{background:transparent;color:#FFFDFA;border-color:#4A4A4A}
#wp-bar button.ghost:hover{border-color:#FFFDFA}
#wp-bar button:disabled{opacity:.45;cursor:default}
#wp-bar input{font-family:'Inter',sans-serif;font-size:13px;padding:6px 10px;border:1.5px solid #4A4A4A;
  background:#1d1d1d;color:#FFFDFA;border-radius:2px;width:180px}
#wp-status{font-size:11.5px;font-weight:500;color:#B9B4AC;letter-spacing:.02em;white-space:nowrap}
#wp-status.ok{color:#7CD07C}#wp-status.err{color:#FF8A8A}#wp-status.saving{color:#FED600}
#wp-loading{max-width:640px;margin:140px auto;padding:0 24px;font-family:'Inter',sans-serif;color:#4A4A4A;text-align:center}
body{padding-top:96px}
body.wp-editing [data-eid]{outline:1px dashed rgba(17,17,17,.28);outline-offset:2px;cursor:text;border-radius:1px}
body.wp-editing [data-eid]:hover{outline:1.5px dashed #C9A400;background:rgba(254,214,0,.10)}
body.wp-editing [data-eid]:focus{outline:2px solid #111;background:rgba(254,214,0,.16)}
@media print{#wp-bar{display:none !important}body{padding-top:0 !important}
  body.wp-editing [data-eid]{outline:none !important;background:none !important}}
`;

const runtime = `
(function(){
  var CFG = ${JSON.stringify(CONFIG)};
  var PW = null;
  var INLINE = {STRONG:1,EM:1,B:1,I:1,A:1,SPAN:1,BR:1,SUP:1,SUB:1,U:1,SMALL:1,MARK:1,CODE:1,IMG:1};
  var editables = [];

  function isEditableBlock(el){
    if(!el.textContent || !el.textContent.trim()) return false;
    var k = el.children;
    for(var i=0;i<k.length;i++){ if(!INLINE[k[i].tagName]) return false; }
    return true;
  }
  function assignEids(){
    var pages = document.querySelectorAll('section.page'), n = 0;
    for(var p=0;p<pages.length;p++){
      var all = pages[p].querySelectorAll('*');
      for(var i=0;i<all.length;i++){
        var el = all[i];
        if(el.hasAttribute('data-eid')) continue;
        if(isEditableBlock(el)){
          el.setAttribute('data-eid','e'+(n++));
          el.dataset.orig = el.innerHTML;
          editables.push(el);
        }
      }
    }
  }
  function applyContent(map){
    if(!map) return;
    Object.keys(map).forEach(function(eid){
      var el = document.querySelector('[data-eid="'+eid+'"]');
      if(el) el.innerHTML = map[eid];
    });
  }
  function collectOverrides(){
    var out = {};
    for(var i=0;i<editables.length;i++){
      var el = editables[i];
      if(el.innerHTML !== el.dataset.orig) out[el.getAttribute('data-eid')] = el.innerHTML;
    }
    return out;
  }
  function headers(extra){
    var h = {'apikey':CFG.anon,'Authorization':'Bearer '+CFG.anon};
    if(extra) for(var k in extra) h[k]=extra[k];
    return h;
  }
  function loadTemplate(){
    return fetch(CFG.templateUrl, {cache:'no-cache'})
      .then(function(r){ if(!r.ok) throw new Error('template '+r.status); return r.text(); });
  }
  function loadContent(){
    return fetch(CFG.url+'/rest/v1/gta_whitepaper?id=eq.'+CFG.docId+'&select=content,updated_at',
      {headers:headers()})
      .then(function(r){ return r.ok?r.json():[]; })
      .then(function(rows){ return rows&&rows[0]?rows[0]:null; })
      .catch(function(){ return null; });
  }
  function saveContent(map, pw){
    return fetch(CFG.url+'/rest/v1/rpc/gta_whitepaper_save',
      {method:'POST',headers:headers({'Content-Type':'application/json'}),
       body:JSON.stringify({p_id:CFG.docId,p_content:map,p_password:pw})})
      .then(function(r){
        if(r.status>=200&&r.status<300) return {ok:true};
        return r.json().then(function(e){return {ok:false,error:(e&&e.message)||('HTTP '+r.status)};})
                       .catch(function(){return {ok:false,error:'HTTP '+r.status};});
      });
  }

  var statusEl, editBtn, saveBtn, exitBtn, pwWrap, pwInput, pwGo, doc;
  function setStatus(t,c){ statusEl.textContent=t; statusEl.className=''; if(c) statusEl.classList.add(c); }
  function fmtTime(iso){ if(!iso) return ''; try{ return new Date(iso).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }

  var editing=false, saveTimer=null, lastSaved='';
  function enterEdit(){
    editing=true; document.body.classList.add('wp-editing');
    for(var i=0;i<editables.length;i++) editables[i].setAttribute('contenteditable','true');
    editBtn.style.display='none'; pwWrap.style.display='none';
    saveBtn.style.display=''; exitBtn.style.display='';
    setStatus('Edit mode - changes save automatically','ok');
  }
  function exitEdit(){
    editing=false; document.body.classList.remove('wp-editing');
    for(var i=0;i<editables.length;i++) editables[i].removeAttribute('contenteditable');
    saveBtn.style.display='none'; exitBtn.style.display='none'; editBtn.style.display='';
    setStatus(lastSaved?('Viewing - last updated '+lastSaved):'Viewing','');
  }
  function doSave(){
    if(!PW) return;
    setStatus('Saving...','saving');
    saveContent(collectOverrides(), PW).then(function(res){
      if(res.ok){ lastSaved=fmtTime(new Date().toISOString()); setStatus('Saved '+String.fromCharCode(10003)+' - '+lastSaved,'ok'); }
      else setStatus('Save failed: '+res.error,'err');
    });
  }
  function scheduleSave(){
    if(!editing) return;
    setStatus('Editing...','saving');
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer=setTimeout(doSave,1400);
  }
  function tryUnlock(){
    var pw = pwInput.value; if(!pw){ pwInput.focus(); return; }
    setStatus('Checking...','saving');
    saveContent(collectOverrides(), pw).then(function(res){
      if(res.ok){ PW=pw; enterEdit(); } else { setStatus('Wrong password','err'); pwInput.select(); }
    });
  }
  function buildBar(){
    var bar=document.createElement('div'); bar.id='wp-bar'; bar.className='no-print';
    bar.innerHTML=
      '<span class="wp-brand"><span class="wp-dot"></span>GTA AI Quarterly - Preview</span>'+
      '<span id="wp-status">Loading...</span><span class="wp-spacer"></span>'+
      '<span id="wp-pw" style="display:none"><input id="wp-pw-input" type="password" placeholder="Editor password" autocomplete="off"/> <button id="wp-pw-go">Unlock</button></span>'+
      '<button id="wp-edit" class="ghost">Edit text</button>'+
      '<button id="wp-save" style="display:none">Save now</button>'+
      '<button id="wp-exit" class="ghost" style="display:none">Done</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    statusEl=document.getElementById('wp-status');
    editBtn=document.getElementById('wp-edit'); saveBtn=document.getElementById('wp-save');
    exitBtn=document.getElementById('wp-exit'); pwWrap=document.getElementById('wp-pw');
    pwInput=document.getElementById('wp-pw-input'); pwGo=document.getElementById('wp-pw-go');
    editBtn.addEventListener('click', function(){ pwWrap.style.display=(pwWrap.style.display==='none')?'':'none'; if(pwWrap.style.display!=='none') pwInput.focus(); });
    pwGo.addEventListener('click', tryUnlock);
    pwInput.addEventListener('keydown', function(e){ if(e.key==='Enter') tryUnlock(); });
    saveBtn.addEventListener('click', doSave);
    exitBtn.addEventListener('click', function(){ if(saveTimer) clearTimeout(saveTimer); doSave(); exitEdit(); });
    document.addEventListener('input', function(e){ if(editing && e.target.closest('[data-eid]')) scheduleSave(); });
  }
  function init(){
    buildBar();
    doc = document.getElementById('wp-doc');
    setStatus('Loading document...','saving');
    loadTemplate().then(function(base){
      doc.innerHTML = base;
      assignEids();
      return loadContent();
    }).then(function(row){
      if(row){ applyContent(row.content); lastSaved=fmtTime(row.updated_at); }
      var el=document.getElementById('wp-loading'); if(el) el.remove();
      setStatus(lastSaved?('Viewing - last updated '+lastSaved):'Viewing (no edits yet)','');
    }).catch(function(err){
      setStatus('Could not load document','err');
      var el=document.getElementById('wp-loading'); if(el) el.textContent='Could not load the document. Please refresh. ('+err.message+')';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
`;

const loader = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GTA AI Quarterly Report - Session 01 - The 10/90 Divide</title>
<meta name="description" content="An AI Central field report, produced in partnership with Tech London Advocates. Five practitioners, five deployed AI agents, zero hype.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
<style>
${css}
${editorCSS}
</style>
</head>
<body>
<div id="wp-loading">Loading the GTA AI Quarterly report...</div>
<div id="wp-doc"></div>
<script>
${runtime}
</script>
</body>
</html>`;

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', loader);

console.log('loader public/index.html:', loader.length, 'bytes');
console.log('template build/template.html:', pages.length, 'bytes');
console.log('template pages:', (pages.match(/<section class="page"/g) || []).length);
console.log('leftover tokens/slots/assets in template:',
  (pages.match(/\{\{[^}]*\}\}/g)||[]).length,
  (pages.match(/<image-slot/g)||[]).length,
  (pages.match(/assets\//g)||[]).length);
