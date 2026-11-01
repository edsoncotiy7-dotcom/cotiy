window.COTIY_BOOTED=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const Q=n=>"Q"+Number(n||0).toLocaleString("es-GT",{minimumFractionDigits:2,maximumFractionDigits:2});
const rid=()=>Math.random().toString(36).slice(2,10);
const fdt=t=>new Date(t).toLocaleString("es-GT",{dateStyle:"short",timeStyle:"short"});
let brand={name:"Hilos Cotiy",logo:""},db,auth,CLOUD=cloudOn(),profiles=[],subbed=false,me=null,staff=[],products=[],entries=[],sales=[],pays=[],arq=[],cart=[],tab="vender",sel=null,sig="",ready={};
function toast(t){const e=$("toast");e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,3500)}
async function hp(p){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("cotiy:"+p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return"p:"+p}}
const put=(path,data)=>db.doc(path).set(data).catch(()=>{toast("No se pudo guardar. Revisa tu conexión o permisos.");throw 0});
function openModal(h){$("md").innerHTML=h;$("ov").hidden=false;return $("md")}
function closeModal(){$("ov").hidden=true}
$("ov").onclick=e=>{if(e.target===$("ov"))closeModal()};
const stock=pid=>{let n=0;entries.forEach(e=>{if(e.pid===pid)n+=+e.qty||0});sales.forEach(s=>(s.items||[]).forEach(i=>{if(i.pid===pid)n-=+i.qty||0}));return n};
const sup=()=>me&&(me.role==="supervisor"||me.role==="admin");
const adm=()=>me&&(me.role==="admin"||(!CLOUD&&me.role==="supervisor"));
const hasLocal=()=>{try{return!!localStorage.getItem("cotiy_db")}catch(e){return false}};
const d0=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime()};
const key=n=>String(n||"").trim().toLowerCase();

/* LOGIN */
function renderLogin(){if(CLOUD)return renderCloudLogin();
 const s=JSON.stringify(staff.map(x=>x.id+x.name))+brand.name+(brand.logo||"").length+(brand.size||0);if(s===sig&&!$("login").hidden)return;sig=s;
 const L=$("login");
 if(!staff.length){L.innerHTML=`<h1>${bt(1.6)}</h1><p class="mut">Primer uso: crea la cuenta del administrador</p><div class="card"><label>Nombre</label><input id="ln" value="Cotiy"><label>PIN (4 o más dígitos; podrás cambiarlo después)</label><input id="lp" type="password" inputmode="numeric" value="1234"><div style="height:12px"></div><button id="lgo" style="width:100%">Crear cuenta</button></div>`;
  $("lgo").onclick=async()=>{const n=$("ln").value.trim(),p=$("lp").value;if(!n||p.length<4)return toast("Escribe nombre y un PIN de 4+ dígitos.");await put("staff/"+rid(),{name:n,role:"admin",pin:await hp(p)})}}
 else{L.innerHTML=`<h1>${bt(1.6)}</h1><p class="mut">Selecciona tu cuenta e ingresa tu PIN</p><div class="users">${staff.map(u=>`<button data-u="${esc(u.id)}" class="${sel===u.id?"on":""}">${esc(u.name)}<div class="mut">${roleName(u.role)}</div></button>`).join("")}</div><input id="lp" type="password" inputmode="numeric" placeholder="PIN"><div style="height:12px"></div><button id="lgo" style="width:100%">Entrar</button>`;
  L.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>{sel=b.dataset.u;sig="";renderLogin()});
  const go=async()=>{const u=staff.find(x=>x.id===sel);if(!u)return toast("Elige una cuenta.");if(await hp($("lp").value)!==u.pin)return toast("PIN incorrecto.");me=u;try{sessionStorage.setItem("cotiyU",u.id)}catch(e){}tab="vender";refresh()};
  $("lgo").onclick=go;$("lp").onkeydown=e=>{if(e.key==="Enter")go()}}
 L.hidden=false;$("app").hidden=true}
$("out").onclick=()=>{if(CLOUD)return cloudLogout();try{sessionStorage.removeItem("cotiyU")}catch(e){}me=null;cart=[];sel=null;sig="";refresh()};

/* NAV */
function renderNav(){const t=[["vender","Vender"],["deudores","Deudores"],["caja","Caja"],["ventas","Ventas"]];if(sup())t.push(["tickets","Tickets"],["inv","Inventario"],["users","Cuentas"]);
 $("nav").innerHTML=t.map(x=>`<button data-t="${x[0]}" class="${tab===x[0]?"on":""}">${x[1]}</button>`).join("");
 $("nav").querySelectorAll("button").forEach(b=>b.onclick=()=>{tab=b.dataset.t;showTab()});showTab()}
function showTab(){if(tab==="users"&&CLOUD&&adm())loadProfiles();["vender","deudores","caja","ventas","tickets","inv","users"].forEach(n=>$("v-"+n).hidden=n!==tab);$("nav").querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.t===tab))}

/* VENDER */
const cartTotal=()=>cart.reduce((a,c)=>a+c.qty*c.price,0);
function renderSell(){
 $("tiles").innerHTML=products.map(p=>{const s=stock(p.id);return `<button class="tile ${s<=0?"out":""}" data-p="${esc(p.id)}" ${s<=0?"disabled":""}><div class="tn">${esc(p.name)}</div><div class="tm">${esc([p.color,p.gauge].filter(Boolean).join(" · "))}</div><div class="tp">${Q(p.price)}</div><div class="ts ${s>0&&s<=5?"low":""}">${s>0?s+" disponibles":"Agotado"}</div></button>`}).join("")||`<p class="mut">Aún no hay productos. ${sup()?"Agrégalos en Inventario.":"Pide al supervisor que los agregue."}</p>`;
 $("tiles").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.dataset.p),c=cart.find(x=>x.pid===p.id);if((c?c.qty:0)+1>stock(p.id))return toast("No hay más existencias.");c?c.qty++:cart.push({pid:p.id,name:[p.name,p.color,p.gauge].filter(Boolean).join(" "),qty:1,price:+p.price});renderSell()});
 $("cart").innerHTML=cart.map((c,i)=>`<div class="line"><div class="n">${esc(c.name)}<div class="mut">${Q(c.price)}</div></div><div class="q"><button class="sec" data-m="${i}">−</button><b>${c.qty}</b><button class="sec" data-a="${i}">+</button></div><b>${Q(c.qty*c.price)}</b></div>`).join("")||`<p class="mut">Toca un producto para agregarlo.</p>`;
 $("cart").querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{const c=cart[+b.dataset.m];if(--c.qty<=0)cart.splice(+b.dataset.m,1);renderSell()});
 $("cart").querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{const c=cart[+b.dataset.a];if(c.qty+1>stock(c.pid))return toast("No hay más existencias.");c.qty++;renderSell()});
 $("ctot").textContent=Q(cartTotal());$("pay").disabled=!cart.length;$("clr").disabled=!cart.length}
$("clr").onclick=()=>{cart=[];renderSell()};
$("pay").onclick=()=>{
 const total=cartTotal();let m="Efectivo";
 const md=openModal(`<h3>Cobrar</h3><div class="mut" style="text-align:center">Total a pagar</div><div class="big">${Q(total)}</div><div class="seg" id="mm">${["Efectivo","Transferencia","Tarjeta","Crédito"].map(x=>`<button data-m="${x}" class="${x===m?"on":""}">${x}</button>`).join("")}</div><div id="mb"></div><label>Observaciones (opcional, salen en el ticket)</label><input id="ob" maxlength="120"><div class="row" style="margin-top:14px"><button class="sec" id="no">Cancelar</button><button id="ok">Confirmar venta</button></div>`);
 let recv=0,cust="";
 const chk=()=>{const ok=$("ok");if(m==="Efectivo"){const v=parseFloat($("rc").value)||0;recv=v;const d=v-total;$("chv").innerHTML=v<=0?"":d>=0?`<span class="mut">Vuelto</span><br><span class="ok">${Q(d)}</span>`:`<span class="bad">Faltan ${Q(-d)}</span>`;ok.disabled=d<-0.004||v<=0}else if(m==="Crédito"){cust=$("cn").value;ok.disabled=!cust.trim()}else ok.disabled=false};
 const draw=()=>{const b=$("mb");
  if(m==="Efectivo"){b.innerHTML=`<label>El cliente paga con (Q)</label><input id="rc" type="number" inputmode="decimal" step="0.01" placeholder="0.00"><div class="row"><button class="sec" id="ex">Monto exacto</button></div><div id="chv" class="chg"></div>`;$("rc").oninput=chk;$("ex").onclick=()=>{$("rc").value=total;chk()};$("rc").focus()}
  else if(m==="Crédito"){const names=[...new Map(sales.filter(s=>s.pay==="Crédito").map(s=>[key(s.cust),s.cust])).values()];b.innerHTML=`<label>Nombre del cliente (deudor)</label><input id="cn" list="dl" placeholder="Nombre completo"><datalist id="dl">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist><p class="mut">Quedará registrado en Deudores.</p>`;$("cn").oninput=chk}
  else b.innerHTML="";
  md.querySelectorAll("#mm button").forEach(x=>x.classList.toggle("on",x.dataset.m===m));chk()};
 md.querySelectorAll("#mm button").forEach(x=>x.onclick=()=>{m=x.dataset.m;draw()});draw();
 $("no").onclick=closeModal;
 $("ok").onclick=async()=>{$("ok").disabled=true;const items=cart.map(c=>({...c}));
  let tk;try{tk=await nextTicket()}catch(e){toast("No se pudo obtener el número de ticket. Revisa tu conexión e inténtalo de nuevo.");$("ok").disabled=false;return}
  const sale={items,total,ticket:tk,obs:$("ob").value.trim(),pay:m,by:me.id,byName:me.name,at:Date.now()};if(m==="Efectivo"){sale.recv=recv;sale.change=Math.max(0,recv-total)}if(m==="Crédito")sale.cust=cust.trim();
  try{await put("sales/"+rid(),sale)}catch(e){$("ok").disabled=false;return}
  cart=[];renderSell();
  md.innerHTML=`<h3 class="ok" style="text-align:center">✔ Venta registrada</h3><div class="big">${Q(total)}</div>${m==="Efectivo"?`<div class="chg"><span class="mut">Entregar vuelto</span><br>${Q(sale.change)}</div>`:`<p class="mut" style="text-align:center">${m==="Crédito"?"Registrado a nombre de "+esc(sale.cust):"Pago por "+m}</p>`}<div class="row"><button class="sec" id="tkv">Ver ticket</button><button id="tkp">Imprimir ticket</button></div><button class="sec" id="cl" style="width:100%;margin-top:8px">Cerrar</button>`;$("cl").onclick=closeModal;$("tkv").onclick=()=>showTicket(sale);$("tkp").onclick=()=>quickPrint(sale)}};

/* DEUDORES */
function debtors(){const m={};sales.filter(s=>s.pay==="Crédito").forEach(s=>{const k=key(s.cust);(m[k]=m[k]||{k,name:s.cust,d:0,p:0}).d+=s.total});pays.forEach(p=>{if(m[p.k])m[p.k].p+=p.amount});return Object.values(m).map(x=>({...x,bal:x.d-x.p})).filter(x=>x.bal>0.004).sort((a,b)=>b.bal-a.bal)}
function renderDebt(){const L=debtors(),tot=L.reduce((a,x)=>a+x.bal,0);
 $("debt").innerHTML=L.length?`<p class="mut">Total por cobrar: <b>${Q(tot)}</b></p><table><tr><th>Cliente</th><th>Debe</th><th></th></tr>${L.map(x=>`<tr><td>${esc(x.name)}</td><td class="bad">${Q(x.bal)}</td><td><button class="sec" data-k="${esc(x.k)}">Abonar</button></td></tr>`).join("")}</table>`:`<p class="mut">No hay deudores. Para fiar una venta elige “Crédito” al pagar.</p>`;
 $("debt").querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const x=L.find(y=>y.k===b.dataset.k);let m="Efectivo";
  const md=openModal(`<h3>Abono de ${esc(x.name)}</h3><div class="mut">Saldo actual</div><div class="big">${Q(x.bal)}</div><label>Monto del abono (Q)</label><input id="am" type="number" inputmode="decimal" step="0.01"><button class="sec" id="all" style="margin-top:8px">Pagar todo</button><label>Forma de pago</label><div class="seg" id="mm">${["Efectivo","Transferencia"].map(t=>`<button data-m="${t}" class="${t===m?"on":""}">${t}</button>`).join("")}</div><div class="row" style="margin-top:14px"><button class="sec" id="no">Cancelar</button><button id="ok">Registrar abono</button></div>`);
  md.querySelectorAll("#mm button").forEach(t=>t.onclick=()=>{m=t.dataset.m;md.querySelectorAll("#mm button").forEach(z=>z.classList.toggle("on",z===t))});
  $("all").onclick=()=>$("am").value=x.bal.toFixed(2);$("no").onclick=closeModal;
  $("ok").onclick=async()=>{const a=parseFloat($("am").value);if(!(a>0)||a>x.bal+0.004)return toast("Monto no válido (máximo "+Q(x.bal)+").");try{await put("pays/"+rid(),{k:x.k,name:x.name,amount:a,pay:m,by:me.name,at:Date.now()});closeModal();toast("Abono registrado")}catch(e){}}})}

/* CAJA */
const since=()=>arq.reduce((m,a)=>Math.max(m,a.at||0),0);
function calc(){const t=since(),sm={Efectivo:0,Transferencia:0,Tarjeta:0,Crédito:0};sales.filter(s=>s.at>=t).forEach(s=>sm[s.pay]=(sm[s.pay]||0)+s.total);const ap={Efectivo:0,Transferencia:0};pays.filter(p=>p.at>=t).forEach(p=>ap[p.pay]=(ap[p.pay]||0)+p.amount);const fondo=parseFloat($("cf").value)||0;return{sm,ap,fondo,exp:fondo+sm.Efectivo+ap.Efectivo}}
function renderCaja(){const c=calc();
 $("cs").innerHTML=`<table><tr><td>Ventas en efectivo</td><td>${Q(c.sm.Efectivo)}</td></tr><tr><td>Abonos en efectivo</td><td>${Q(c.ap.Efectivo)}</td></tr><tr><td>Fondo inicial</td><td>${Q(c.fondo)}</td></tr><tr><th>Efectivo esperado en caja</th><th>${Q(c.exp)}</th></tr><tr><td class="mut">Transferencias (ventas + abonos)</td><td class="mut">${Q(c.sm.Transferencia+c.ap.Transferencia)}</td></tr><tr><td class="mut">Tarjeta</td><td class="mut">${Q(c.sm.Tarjeta)}</td></tr><tr><td class="mut">Ventas a crédito</td><td class="mut">${Q(c.sm.Crédito)}</td></tr></table>`;
 const v=$("cc").value;if(v==="")$("cr").innerHTML="";else{const d=(parseFloat(v)||0)-c.exp;$("cr").innerHTML=Math.abs(d)<0.005?`<span class="ok">Caja cuadrada ✔</span>`:d>0?`<span class="ok">Sobran ${Q(d)}</span>`:`<span class="bad">Faltan ${Q(-d)}</span>`}
 $("ch").innerHTML=arq.length?`<table><tr><th>Fecha</th><th>Usuario</th><th>Esperado</th><th>Contado</th><th>Dif.</th><th></th></tr>${arq.slice().sort((a,b)=>b.at-a.at).slice(0,15).map(a=>`<tr><td>${fdt(a.at)}</td><td>${esc(a.by)}</td><td>${Q(a.exp)}</td><td>${Q(a.counted)}</td><td class="${Math.abs(a.diff)<0.005?"ok":"bad"}">${Q(a.diff)}</td><td><button class="sec" data-c="${esc(a.id)}">Ver</button></td></tr>`).join("")}</table>`:`<p class="mut">Sin cierres guardados.</p>`;
 $("ch").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>showClose(arq.find(x=>x.id===b.dataset.c)))}
function showClose(a){if(!a)return;const SL=a.sales||sales.filter(s=>s.at>=(a.since||0)&&s.at<=a.at).map(s=>({at:s.at,t:s.total,pay:s.pay,by:s.byName,c:s.cust||"",i:(s.items||[]).map(i=>[i.name,i.qty,i.price])}));const r=(l,v,c)=>`<tr><td>${l}</td><td class="${c||""}">${v}</td></tr>`;
 openModal(`<h3>Cierre del ${fdt(a.at)}</h3><p class="mut">Por ${esc(a.by)} · ${a.nsales||0} ventas${a.since?" desde "+fdt(a.since):""}</p><table>${r("Fondo inicial",Q(a.fondo))}${r("Ventas en efectivo",Q(a.sm&&a.sm.ef))}${r("Abonos en efectivo",Q(a.ap&&a.ap.ef))}${r("Esperado",Q(a.exp))}${r("Contado",Q(a.counted))}${r("Diferencia",Q(a.diff),Math.abs(a.diff)<0.005?"ok":"bad")}${r("Transferencias",Q((a.sm?a.sm.tr:0)+(a.ap?a.ap.tr:0)))}${r("Tarjeta",Q(a.sm&&a.sm.ta))}${r("Ventas a crédito",Q(a.sm&&a.sm.cr))}${r("Por cobrar (deudores)",Q(a.debt))}</table><h3 style="margin-top:14px">Productos vendidos</h3><table>${(a.sold||[]).map(s=>`<tr><td>${esc(s.name)}</td><td>${s.qty}</td><td>${Q(s.amt)}</td></tr>`).join("")||"<tr><td class='mut'>Sin ventas</td></tr>"}</table><h3 style="margin-top:14px">Ventas de este cierre</h3><table>${SL.slice().sort((x,y)=>x.at-y.at).map(s=>`<tr><td>${fdt(s.at)}</td><td>${(s.i||[]).map(i=>esc(i[1]+" × "+i[0])).join(", ")}${s.c?`<div class="mut">${esc(s.c)}</div>`:""}</td><td>${esc(s.pay)}</td><td><b>${Q(s.t)}</b></td></tr>`).join("")||"<tr><td class='mut'>Sin ventas</td></tr>"}</table><h3 style="margin-top:14px">Existencias al cierre</h3><table>${(a.stock||[]).map(s=>`<tr><td>${esc(s.name)}</td><td>${s.qty}</td></tr>`).join("")}</table><button id="cl" style="width:100%;margin-top:14px">Cerrar</button>`);$("cl").onclick=closeModal}
$("cf").oninput=$("cc").oninput=renderCaja;
$("csave").onclick=async()=>{if($("cc").value==="")return toast("Escribe el efectivo contado.");const n=parseFloat($("cc").value)||0,t=since();if(!await sure("¿Cerrar caja y guardar el cierre?"))return;const c=calc(),now=Date.now(),cs=sales.filter(s=>s.at>=t&&s.at<=now);
 const sold={};cs.forEach(s=>(s.items||[]).forEach(i=>{const o=sold[i.pid]||(sold[i.pid]={name:i.name,qty:0,amt:0});o.qty+=i.qty;o.amt+=i.qty*i.price}));
 const D=debtors(),rec={at:now,since:t,by:me.name,fondo:c.fondo,exp:c.exp,counted:n,diff:n-c.exp,sm:{ef:c.sm.Efectivo,tr:c.sm.Transferencia,ta:c.sm.Tarjeta,cr:c.sm["Crédito"]},ap:{ef:c.ap.Efectivo,tr:c.ap.Transferencia},nsales:cs.length,sales:cs.map(s=>({at:s.at,t:s.total,pay:s.pay,by:s.byName,c:s.cust||"",i:(s.items||[]).map(i=>[i.name,i.qty,i.price])})),sold:Object.values(sold),stock:products.map(p=>({name:p.name,price:p.price,qty:stock(p.id)})),debt:D.reduce((a,x)=>a+x.bal,0),debtors:D.map(x=>({name:x.name,bal:x.bal}))};
 try{await put("arq/"+rid(),rec);toast("Caja cerrada y guardada");$("cc").value="";$("cf").value="";renderCaja()}catch(e){}};

/* VENTAS */
function renderSales(){const dv=$("vd").value,t=since();let L,lab;
 if(dv){const a=new Date(dv+"T00:00:00").getTime(),b=a+864e5;L=sales.filter(s=>s.at>=a&&s.at<b);lab="Ventas del "+new Date(a).toLocaleDateString("es-GT",{dateStyle:"long"})}else{L=sales.filter(s=>s.at>=t);lab="Ventas desde el último cierre de caja"}
 $("vt").innerHTML=lab+(sup()?": <b>"+Q(L.reduce((a,s)=>a+s.total,0))+"</b>":"");
 $("sl").innerHTML=`<table><tr><th>Fecha</th><th>Detalle</th><th>Pago</th><th>Total</th><th>Cajero</th><th></th></tr>${L.slice().sort((a,b)=>b.at-a.at).map(s=>`<tr><td>${s.ticket?"<b>#"+tkPad(s.ticket)+"</b><br>":""}${fdt(s.at)}</td><td>${(s.items||[]).map(i=>esc(i.qty+" × "+i.name)).join(", ")}${s.cust?`<div class="mut">${esc(s.cust)}</div>`:""}</td><td>${esc(s.pay)}</td><td><b>${Q(s.total)}</b></td><td class="mut">${esc(s.byName)}</td><td><button class="sec" data-tk="${esc(s.id)}">Ticket</button></td></tr>`).join("")}</table>${L.length?"":'<p class="mut">No hay ventas.</p>'}`;
 $("sl").querySelectorAll("[data-tk]").forEach(b=>b.onclick=()=>showTicket(sales.find(x=>x.id===b.dataset.tk),{reprint:true}))}

/* INVENTARIO */
function renderInv(){$("inv").innerHTML=`<table><tr><th>Producto</th><th>Precio</th><th>Stock</th><th></th></tr>${products.map(p=>{const s=stock(p.id);return `<tr><td>${esc(p.name)} <span class="mut">${esc([p.color,p.gauge].filter(Boolean).join(" · "))}</span></td><td>${Q(p.price)}</td><td class="${s<=5?"low":""}">${s}</td><td style="white-space:nowrap"><button class="sec" data-a="${esc(p.id)}">+ Stock</button> <button class="sec" data-p="${esc(p.id)}">Editar</button> <button class="sec" data-d="${esc(p.id)}">Quitar</button></td></tr>`}).join("")}</table>`;
 $("inv").querySelectorAll("[data-a]").forEach(b=>b.onclick=async()=>{const q=parseInt(await ask("Agregar existencias","Unidades a agregar (negativo para restar)","number"),10);if(!q)return;try{await put("entries/"+rid(),{pid:b.dataset.a,qty:q,at:Date.now(),by:me.name})}catch(e){}});
 $("inv").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.dataset.p),cur=stock(p.id);
 openModal(`<h3>Editar producto</h3><label>Nombre</label><input id="en" value="${esc(p.name)}"><div class="row"><div><label>Color</label><input id="ec" value="${esc(p.color)}"></div><div><label>Calibre</label><input id="eg" value="${esc(p.gauge)}"></div></div><div class="row"><div><label>Precio (Q)</label><input id="ep" type="number" step="0.01" min="0" value="${p.price}"></div><div><label>Existencias (actual: ${cur})</label><input id="es" type="number" min="0" value="${cur}"></div></div><div class="row" style="margin-top:14px"><button class="sec" id="no">Cancelar</button><button id="ok">Guardar cambios</button></div>`);
 $("no").onclick=closeModal;
 $("ok").onclick=async()=>{const pr=parseFloat($("ep").value),st=parseInt($("es").value,10);if(!$("en").value.trim()||!(pr>=0)||!(st>=0))return toast("Revisa nombre, precio y existencias.");
  try{await db.doc("products/"+p.id).update({name:$("en").value.trim(),color:$("ec").value.trim(),gauge:$("eg").value.trim(),price:pr});const d=st-stock(p.id);if(d)await put("entries/"+rid(),{pid:p.id,qty:d,at:Date.now(),by:me.name,adj:true});closeModal();toast("Producto actualizado")}catch(e){toast("No se pudo guardar.")}}});
 $("inv").querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{if(!await sure("¿Quitar este producto del catálogo?"))return;try{await db.doc("products/"+b.dataset.d).delete()}catch(e){toast("No se pudo quitar.")}})}
$("padd").onclick=async()=>{const name=$("pn").value.trim(),price=parseFloat($("pp").value),st=parseInt($("ps").value,10)||0;if(!name||!(price>=0))return toast("Escribe al menos nombre y precio.");const id=rid();
 try{await put("products/"+id,{name,color:$("pc").value.trim(),gauge:$("pg").value.trim(),price});if(st>0)await put("entries/"+rid(),{pid:id,qty:st,at:Date.now(),by:me.name});["pn","pc","pg","pp","ps"].forEach(i=>$(i).value="");toast("Producto guardado")}catch(e){}};

/* CUENTAS */
function renderUsers(){if(document.activeElement!==$("bn"))$("bn").value=brand.name||"";if(document.activeElement!==$("bs")){$("bs").value=brand.size||40;$("bsz").textContent=brand.size||40}if(CLOUD){renderUsersCloud();return}$("ul").innerHTML=`<table><tr><th>Nombre</th><th>Rol</th><th></th></tr>${staff.map(u=>`<tr><td>${esc(u.name)}</td><td>${roleName(u.role)}</td><td style="white-space:nowrap"><button class="sec" data-n="${esc(u.id)}">Cambiar PIN</button> ${u.id!==me.id?`<button class="sec" data-x="${esc(u.id)}">Eliminar</button>`:""}</td></tr>`).join("")}</table>`;
 $("ul").querySelectorAll("[data-n]").forEach(b=>b.onclick=async()=>{const p=await ask("Cambiar PIN","Nuevo PIN (4 o más dígitos)","password");if(!p||p.length<4)return;try{await db.doc("staff/"+b.dataset.n).update({pin:await hp(p)});toast("PIN actualizado")}catch(e){toast("No se pudo guardar.")}});
 $("ul").querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{if(!await sure("¿Eliminar esta cuenta?"))return;try{await db.doc("staff/"+b.dataset.x).delete()}catch(e){toast("No se pudo eliminar.")}})}
$("uadd").onclick=async()=>{if(CLOUD)return createCloudUser();const n=$("un").value.trim(),p=$("up").value;if(!n||p.length<4)return toast("Escribe nombre y un PIN de 4+ dígitos.");try{await put("staff/"+rid(),{name:n,role:$("ur").value,pin:await hp(p)});$("un").value=$("up").value="";toast("Cuenta creada")}catch(e){}};

/* MARCA Y DIÁLOGOS */
const bt=(k)=>(brand.logo?`<img src="${esc(brand.logo)}" alt="" style="height:${Math.round((brand.size||40)*(k||1))}px;width:auto;max-width:70vw;object-fit:contain;vertical-align:middle;border-radius:6px"> `:"🧵 ")+esc(brand.name||"Hilos Cotiy");
function ask(title,label,type,val){return new Promise(res=>{openModal(`<h3>${title}</h3><label>${label}</label><input id="aq" type="${type||"text"}" ${type==="number"?'inputmode="decimal" step="any"':""} value="${esc(val||"")}"><div class="row" style="margin-top:14px"><button class="sec" id="ano">Cancelar</button><button id="aok">Aceptar</button></div>`);$("aq").focus();let d=0;const f=v=>{if(d)return;d=1;closeModal();res(v)};$("ano").onclick=()=>f(null);$("aok").onclick=()=>f($("aq").value);$("aq").onkeydown=e=>{if(e.key==="Enter")f($("aq").value)}})}
function sure(t){return new Promise(res=>{openModal(`<h3>${t}</h3><div class="row" style="margin-top:14px"><button class="sec" id="cno">No</button><button id="cok">Sí, continuar</button></div>`);$("cno").onclick=()=>{closeModal();res(false)};$("cok").onclick=()=>{closeModal();res(true)}})}
$("bsave").onclick=async()=>{const n=$("bn").value.trim();if(!n)return toast("Escribe el nombre.");try{await put("config/brand",{name:n,logo:brand.logo||"",size:brand.size||40});toast("Nombre guardado")}catch(e){}};
$("bf").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=async()=>{const s=Math.min(1,192/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);let u=c.toDataURL("image/png");if(u.length>180000)u=c.toDataURL("image/jpeg",.8);try{await put("config/brand",{name:brand.name||"Hilos Cotiy",logo:u,size:brand.size||40});toast("Logo actualizado")}catch(x){}};im.onerror=()=>toast("No se pudo leer la imagen.");im.src=r.result};r.readAsDataURL(f);e.target.value=""};
$("bs").oninput=()=>{$("bsz").textContent=$("bs").value;brand.size=+$("bs").value;$("bh").innerHTML=bt()};
$("bs").onchange=async()=>{try{await put("config/brand",{name:brand.name||"Hilos Cotiy",logo:brand.logo||"",size:+$("bs").value});toast("Tamaño guardado")}catch(e){}};
$("brm").onclick=async()=>{try{await put("config/brand",{name:brand.name||"Hilos Cotiy",logo:"",size:brand.size||40});toast("Logo quitado")}catch(e){}};

$("vd").oninput=renderSales;$("vdx").onclick=()=>{$("vd").value="";renderSales()};

/* ---------- NUBE: usuarios con contraseña ---------- */
const roleName=r=>r==="admin"?"Administrador":r==="supervisor"?"Supervisor":"Cajero";
const okUser=u=>/^[a-z0-9._-]{3,}$/.test(u);
let chkT=null;
async function cloudStart(){
 const b=await auth.publicBrand();if(b)brand={name:b.name||"Hilos Cotiy",logo:b.logo||"",size:b.size||40};
 window.cloudLost=()=>{toast("Tu sesión venció. Entra de nuevo.");cloudLogout()};
 if(await auth.restore()){try{if(await cloudEnter())return}catch(e){toast("No se pudo conectar. Revisa tu internet.")}}
 renderLogin()}
async function cloudEnter(){
 const p=await auth.profile();
 if(!p||!p.active){toast("Tu cuenta no tiene acceso o fue desactivada.");await auth.signOut();$("login").dataset.mode="";renderLogin();return false}
 me={id:p.id,name:p.name,role:p.role,username:p.username};
 await db.start();startSubs();$("login").dataset.mode="";refresh();
 clearInterval(chkT);chkT=setInterval(async()=>{try{const q=await auth.profile();if(!q||!q.active){toast("Tu acceso fue desactivado.");cloudLogout();return}if(q.role!==me.role){me.role=q.role;refresh()}}catch(e){}},30000);
 if(adm())loadProfiles();return true}
async function cloudLogout(){
 clearInterval(chkT);db.stop();try{await auth.signOut()}catch(e){}
 me=null;cart=[];products=[];entries=[];sales=[];pays=[];arq=[];profiles=[];subbed=false;ready={};tab="vender";
 $("app").hidden=true;$("login").dataset.mode="";renderLogin()}
async function renderCloudLogin(){
 const L=$("login");$("app").hidden=true;
 if(L.dataset.mode==="cloud"&&!L.hidden)return;L.dataset.mode="cloud";
 L.innerHTML=`<h1>${bt(1.6)}</h1><p class="mut">Ingresa con tu usuario y contraseña</p><div class="card"><label>Usuario</label><input id="lu" autocapitalize="none" autocomplete="username"><label>Contraseña</label><input id="lp" type="password" autocomplete="current-password"><div style="height:12px"></div><button id="lgo" style="width:100%">Entrar</button><p class="mut" style="margin:12px 0 0">Si no puedes ingresar, verifica que las cuentas iniciales estén instaladas en la base de datos.</p></div>`;
 const go=async()=>{if(!$('lu').value.trim()||!$('lp').value)return toast("Escribe tu usuario y contraseña.");$('lgo').disabled=true;
  try{await auth.signIn($('lu').value,$('lp').value);if(!await cloudEnter()&&$('lgo'))$('lgo').disabled=false}catch(e){toast(e.message||"No se pudo entrar.");if($('lgo'))$('lgo').disabled=false}};
 $('lgo').onclick=go;$('lp').onkeydown=e=>{if(e.key==="Enter")go()};L.hidden=false;
}
async function loadProfiles(){try{profiles=await auth.profiles();renderUsers()}catch(e){}}
function renderUsersCloud(){
 if(!adm())return;
 $("ul").innerHTML=`<table><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th></th></tr>${profiles.map(u=>`<tr><td>${esc(u.name)}${u.active?"":' <span class="bad">(desactivado)</span>'}</td><td>${esc(u.username)}</td><td>${u.id===me.id?roleName(u.role):`<select data-r="${esc(u.id)}">${["admin","supervisor","cajero"].map(r=>`<option value="${r}" ${u.role===r?"selected":""}>${roleName(r)}</option>`).join("")}</select>`}</td><td style="white-space:nowrap">${u.id===me.id?"":`<button class="sec" data-act="${esc(u.id)}">${u.active?"Desactivar":"Activar"}</button>`}</td></tr>`).join("")}</table>`;
 $("ul").querySelectorAll("[data-r]").forEach(x=>x.onchange=async()=>{try{await auth.setProfile(x.dataset.r,{role:x.value});toast("Rol actualizado")}catch(e){toast(e.message||"No se pudo cambiar el rol.")}loadProfiles()});
 $("ul").querySelectorAll("[data-act]").forEach(b=>b.onclick=async()=>{const u=profiles.find(x=>x.id===b.dataset.act);if(!await sure(u.active?"¿Desactivar a "+esc(u.name)+"? Ya no podrá entrar al sistema.":"¿Activar a "+esc(u.name)+"?"))return;try{await auth.setProfile(u.id,{active:!u.active});toast(u.active?"Usuario desactivado":"Usuario activado")}catch(e){toast(e.message||"No se pudo cambiar.")}loadProfiles()})}
async function createCloudUser(){
 const name=$("un").value.trim(),user=auth.norm($("uu").value),pw=$("up").value,role=$("ur").value;
 if(!name||!okUser(user)||pw.length<4)return toast("Escribe nombre, usuario (3+ letras o números, sin espacios) y contraseña de 4+ caracteres.");
 try{const r=await auth.signUp(user,pw);await auth.addProfile({id:r.id,username:user,name,role,active:true});$("un").value=$("uu").value=$("up").value="";toast("Usuario creado");loadProfiles()}
 catch(e){toast(e.message||"No se pudo crear el usuario.")}}
$("pw").onclick=async()=>{const a=await ask("Cambiar mi contraseña","Nueva contraseña (4 o más caracteres)","password");if(!a)return;if(a.length<4)return toast("Mínimo 4 caracteres.");try{await auth.changePassword(a);toast("Contraseña actualizada")}catch(e){toast(e.message||"No se pudo cambiar.")}};

/* CONTROL */
function refresh(){
 if(!CLOUD){
 if(!ready.staff)return;
 if(me)me=staff.find(s=>s.id===me.id)||null;
 if(!me){try{const id=sessionStorage.getItem("cotiyU");me=staff.find(s=>s.id===id)||null}catch(e){}}
 }
 if(!me){$("app").hidden=true;renderLogin();return}
 if(!$("login").hidden){$("login").hidden=true;sig=""}
 const first=$("app").hidden;$("app").hidden=false;$("bh").innerHTML=bt();$("who").textContent=me.name+" · "+roleName(me.role);$("pw").hidden=!CLOUD;$("uu").hidden=!CLOUD;$("mg").hidden=!(CLOUD&&hasLocal());$("up").placeholder=CLOUD?"Contraseña (4+ caracteres)":"PIN (4+ dígitos)";document.querySelectorAll("[data-adm]").forEach(e=>e.hidden=!adm());
 if(first||!$("nav").innerHTML||!!$("nav").querySelector('[data-t="inv"]')!==sup())renderNav();
 if(!sup()&&(tab==="inv"||tab==="users")){tab="vender";showTab()}
 renderSell();renderDebt();renderCaja();renderSales();if(sup()){renderInv();renderUsers();if(typeof renderTickets==="function")renderTickets()}}
const sub=(p,f)=>db.collection(p).onSnapshot(s=>{f(s.docs.map(d=>({id:d.id,...d.data()})));ready[p]=1;refresh()},e=>toast("Sin acceso a "+p));
function startSubs(){
 if(subbed)return;subbed=true;
 if(!CLOUD)sub("staff",a=>staff=a);
 sub("products",a=>products=a.sort((x,y)=>String(x.name).localeCompare(String(y.name),"es",{numeric:true})));
 sub("config",a=>{const b=a.find(x=>x.id==="brand");brand={name:(b&&b.name)||"Hilos Cotiy",logo:(b&&b.logo)||"",size:(b&&b.size)||40}});
 sub("entries",a=>entries=a);sub("sales",a=>sales=a);sub("pays",a=>pays=a);sub("arq",a=>arq=a);
}
(async()=>{
 if(CLOUD){auth=supaAuth(window.COTIY_CONFIG);db=supaDb(window.COTIY_CONFIG,auth);await cloudStart();return}
 db=(typeof claude!=="undefined"&&claude.use)?await claude.use("db"):openDb();
 if(window.COTIY_LOCAL)toast("Modo local: los datos se guardan solo en este navegador.");
 if(window.COTIY_LOCAL&&/^https?:$/.test(location.protocol)&&!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){const w=document.createElement("div");w.className="card bad";w.style.cssText="margin:8px";w.textContent="⚠ Esta página está en modo local: lo que se registre NO lo verán otras personas ni otros teléfonos. Falta configurar Supabase en js/config.js (ver LEEME.txt).";document.body.prepend(w)}
 if(!db){$("login").innerHTML=`<h1>${bt(1.6)}</h1><p class="mut">Inicia sesión en Claude para abrir el sistema.</p>`;$("login").hidden=false;return}
 startSubs();
})();
