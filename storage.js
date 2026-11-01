/* Almacenamiento local (localStorage) con la misma interfaz que la base de datos de Claude.
   Se usa automáticamente cuando la página se abre fuera de Claude (por ejemplo en VS Code). */
function localDb(){
  window.COTIY_LOCAL=true;
  const KEY="cotiy_db",subs={};
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return{}}};
  const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
  const snap=col=>{const d=load()[col]||{};return{docs:Object.keys(d).map(id=>({id,exists:true,data:()=>d[id]})),size:Object.keys(d).length}};
  const notify=col=>(subs[col]||[]).forEach(f=>f(snap(col)));
  const split=p=>{const i=p.indexOf("/");return[p.slice(0,i),p.slice(i+1)]};
  window.addEventListener("storage",e=>{if(e.key===KEY)Object.keys(subs).forEach(notify)});
  return{
    collection:col=>({onSnapshot(next){(subs[col]=subs[col]||[]).push(next);setTimeout(()=>next(snap(col)),0);return()=>{subs[col]=subs[col].filter(f=>f!==next)}}}),
    doc:p=>{const[col,id]=split(p);return{
      async get(){const d=(load()[col]||{})[id];return{id,exists:!!d,data:()=>d}},
      async set(data){const d=load();(d[col]=d[col]||{})[id]=data;save(d);notify(col)},
      async update(data){const d=load();if(!d[col]||!d[col][id])throw new Error("no existe");d[col][id]={...d[col][id],...data};save(d);notify(col)},
      async delete(){const d=load();if(d[col])delete d[col][id];save(d);notify(col)}}}
  };
}

/* Carga un script externo SIN bloquear el sistema (si no hay internet, el sistema igual arranca) */
function loadScript(src){return new Promise((ok,no)=>{const e=document.createElement("script");e.src=src;e.async=true;e.onload=ok;e.onerror=()=>no(new Error("no carga"));document.head.appendChild(e)})}

/* ---------- NUBE (Supabase): usuarios con contraseña + base de datos compartida ---------- */
const cloudOn=()=>{const c=window.COTIY_CONFIG||{};return!!(c.SUPABASE_URL&&c.SUPABASE_KEY)};
function openDb(){return localDb()}

function supaAuth(c){
  const U=c.SUPABASE_URL.replace(/\/$/,""),K=c.SUPABASE_KEY,SK="cotiy_session",MAIL="@"+(c.DOMINIO_CORREO||"gmail.com");
  let s=null;try{s=JSON.parse(localStorage.getItem(SK)||"null")}catch(e){}
  const save=x=>{s=x;try{x?localStorage.setItem(SK,JSON.stringify(x)):localStorage.removeItem(SK)}catch(e){}};
  const norm=u=>String(u||"").trim().toLowerCase().replace(/\s+/g,"");
  const mail=u=>"hilos.cotiy."+norm(u)+MAIL;            // correo interno (nunca se envía nada a él)
  const pwx=p=>String(p)+"#cotiy";                        // permite contraseñas cortas (Supabase exige 6+ caracteres)
  const toSess=j=>({access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Math.floor(Date.now()/1000)+(j.expires_in||3600),uid:j.user&&j.user.id});
  const now=()=>Math.floor(Date.now()/1000);
  const msg=r=>(r.j&&(r.j.msg||r.j.error_description||r.j.message||r.j.error))||("Error "+r.status);
  async function call(url,opt){const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),20000);try{const r=await fetch(url,{...opt,signal:ac.signal});let j=null;try{j=await r.json()}catch(e){}return{ok:r.ok,status:r.status,j}}finally{clearTimeout(tm)}}
  const isJwt=K.indexOf("eyJ")===0;   // las llaves nuevas "sb_publishable_..." no se envían como Bearer
  const anon=()=>({apikey:K,...(isJwt?{Authorization:"Bearer "+K}:{}),"Content-Type":"application/json"});
  async function refresh(){
    if(!s||!s.refresh_token)return false;
    try{const r=await call(U+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:anon(),body:JSON.stringify({refresh_token:s.refresh_token})});
      if(r.ok&&r.j.access_token){save(toSess(r.j));return true}
      if(r.status>=400&&r.status<500)save(null)}catch(e){}
    return false}
  async function token(){if(s&&s.expires_at-now()<60)await refresh();return s?s.access_token:null}
  async function hdr(extra){const t=await token();return{apikey:K,...((t||isJwt)?{Authorization:"Bearer "+(t||K)}:{}),"Content-Type":"application/json",...(extra||{})}}
  const api={
    norm,
    get logged(){return!!s},
    get uid(){return s&&s.uid},
    async signIn(user,pass){const r=await call(U+"/auth/v1/token?grant_type=password",{method:"POST",headers:anon(),body:JSON.stringify({email:mail(user),password:pwx(pass)})});
      if(!r.ok)throw new Error(r.status===400?"Usuario o contraseña incorrectos.":msg(r));save(toSess(r.j))},
    async signUp(user,pass){const r=await call(U+"/auth/v1/signup",{method:"POST",headers:anon(),body:JSON.stringify({email:mail(user),password:pwx(pass)})});
      if(!r.ok)throw new Error(/registered|exists/i.test(msg(r))?"Ese usuario ya existe.":msg(r));
      const j=r.j||{},id=(j.user&&j.user.id)||j.id;if(!id)throw new Error("El servidor no devolvió el usuario.");
      return{id,session:j.access_token?toSess(j):null}},
    useSession(x){save(x)},
    async signOut(){try{await fetch(U+"/auth/v1/logout",{method:"POST",headers:await hdr()})}catch(e){}save(null)},
    async changePassword(pw){const r=await call(U+"/auth/v1/user",{method:"PUT",headers:await hdr(),body:JSON.stringify({password:pwx(pw)})});if(!r.ok)throw new Error(msg(r))},
    async rest(path,opt={}){return call(U+"/rest/v1/"+path,{...opt,headers:await hdr(opt.headers)})},
    async restore(){if(!s)return false;if(s.expires_at-now()<60&&!await refresh())return false;return!!s},
    token,
    async rpc(fn,args){const r=await call(U+"/rest/v1/rpc/"+fn,{method:"POST",headers:await hdr(),body:JSON.stringify(args||{})});if(!r.ok)throw new Error(msg(r));return r.j},
    async profile(){const r=await api.rest("profiles?select=*&id=eq."+s.uid);if(!r.ok)throw new Error("net");return(r.j&&r.j[0])||null},
    async profiles(){const r=await api.rest("profiles?select=*&order=created_at.asc");if(!r.ok)throw new Error("No se pudo leer la lista de usuarios.");return r.j},
    async addProfile(p){const r=await api.rest("profiles",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(p)});if(!r.ok)throw new Error(msg(r))},
    async setProfile(id,patch){const r=await api.rest("profiles?id=eq."+id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(patch)});if(!r.ok)throw new Error(msg(r))},
    async hasAdmin(){const r=await call(U+"/rest/v1/rpc/has_admin",{method:"POST",headers:anon(),body:"{}"});if(!r.ok)throw new Error("net");return r.j===true},
    async claimAdmin(username,name,code){const r=await call(U+"/rest/v1/rpc/claim_admin",{method:"POST",headers:await hdr(),body:JSON.stringify({p_username:norm(username),p_name:name,p_code:code})});if(!r.ok)throw new Error(msg(r))},
    async publicBrand(){try{const r=await call(U+"/rest/v1/docs?col=eq.config&id=eq.brand&select=data",{headers:anon()});return r.ok&&r.j&&r.j[0]?r.j[0].data:null}catch(e){return null}}
  };
  return api;
}

function supaDb(c,auth){
  const cache={};let subs={},cur="1970-01-01T00:00:00+00:00",timer=null,ready=null,rtc=null;
  const snap=col=>{const d=cache[col]||{},ids=Object.keys(d);return{docs:ids.map(id=>({id,exists:true,data:()=>d[id]})),size:ids.length}};
  const notify=col=>(subs[col]||[]).forEach(f=>f(snap(col)));
  async function poll(){
    try{
      const r=await auth.rest("docs?select=col,id,data,deleted,updated_at&order=updated_at.asc&updated_at=gte."+encodeURIComponent(cur));
      if(!r.ok){if((r.status===401||r.status===403)&&!auth.logged&&window.cloudLost)window.cloudLost();return false}
      const changed=new Set();
      r.j.forEach(x=>{const m=cache[x.col]=cache[x.col]||{};
        if(x.deleted){if(m[x.id]){delete m[x.id];changed.add(x.col)}}
        else if(JSON.stringify(m[x.id])!==JSON.stringify(x.data)){m[x.id]=x.data;changed.add(x.col)}
        if(x.updated_at>cur)cur=x.updated_at});
      changed.forEach(notify);return true;
    }catch(e){return false}
  }
  function realtime(){
    if(c.REALTIME===false)return;
    (window.supabase?Promise.resolve():loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js")).then(()=>{if(!(window.supabase&&window.supabase.createClient)||!timer)return;
    try{rtc=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
      auth.token().then(t=>{if(t)rtc.realtime.setAuth(t);rtc.channel("docs-"+Math.random().toString(36).slice(2)).on("postgres_changes",{event:"*",schema:"public",table:"docs"},()=>poll()).subscribe()})}catch(e){}
    }).catch(()=>{});
  }
  async function write(col,id,data,deleted){
    const r=await auth.rest("docs?on_conflict=col,id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({col,id,data,deleted:!!deleted})});
    if(!r.ok)throw new Error(r.status===401||r.status===403?"Sin permiso":"write "+r.status);
    const m=cache[col]=cache[col]||{};if(deleted)delete m[id];else m[id]=data;notify(col);
  }
  const split=p=>{const i=p.indexOf("/");return[p.slice(0,i),p.slice(i+1)]};
  return{
    async start(){this.stop();cur="1970-01-01T00:00:00+00:00";
      while(auth.logged&&!(await poll())){if(window.toast)toast("Sin conexión con el servidor. Reintentando…");await new Promise(r=>setTimeout(r,3000))}
      timer=setInterval(poll,3000);realtime()},
    stop(){clearInterval(timer);timer=null;subs={};for(const k in cache)delete cache[k];try{rtc&&rtc.removeAllChannels()}catch(e){}rtc=null},
    collection:col=>({onSnapshot(next){(subs[col]=subs[col]||[]).push(next);setTimeout(()=>next(snap(col)),0);return()=>{subs[col]=(subs[col]||[]).filter(f=>f!==next)}}}),
    doc:p=>{const[col,id]=split(p);return{
      async get(){const d=(cache[col]||{})[id];return{id,exists:!!d,data:()=>d}},
      async set(data){await write(col,id,data)},
      async update(data){const o=(cache[col]||{})[id];if(!o)throw new Error("no existe");await write(col,id,{...o,...data})},
      async delete(){await write(col,id,{},true)}}}
  };
}
