/* Tickets de venta: número correlativo, vista previa, impresión 58/80 mm e historial. */
const NEGOCIO={nombre:"VENTA DE HILOS COTIY",direccion:"Nahualá, Cantón Patzité",telefonos:["4051-7033","3143-1159"]};
const tkPad=n=>n?String(n).padStart(6,"0"):"------";
const tkW=()=>{try{return localStorage.getItem("cotiy_tkw")==="80"?80:58}catch(e){return 58}};

/* Número correlativo único: lo entrega la base de datos (atómico, no se repite entre dispositivos) */
async function nextTicket(){
  if(CLOUD){const n=await auth.rpc("next_ticket");if(!(Number(n)>0))throw new Error("ticket");return Number(n)}
  return Math.max(0,...sales.map(s=>+s.ticket||0))+1;
}

function ticketHTML(s,w,reprint){
  const d=new Date(s.at),fecha=d.toLocaleDateString("es-GT",{day:"2-digit",month:"2-digit",year:"numeric"}),hora=d.toLocaleTimeString("es-GT",{hour:"2-digit",minute:"2-digit",hour12:false});
  const items=(s.items||[]).map(i=>`<div class="tk-i"><div class="tk-d">${esc(i.name)}</div><div class="tk-r"><span>${esc(i.qty)} x ${Q(i.price)}</span><b>${Q(i.qty*i.price)}</b></div></div>`).join("");
  const sub=(s.items||[]).reduce((a,i)=>a+i.qty*i.price,0);
  let pago=`<div class="tk-r"><span>Forma de pago</span><span>${esc(s.pay)}</span></div>`;
  if(s.pay==="Efectivo"&&s.recv!=null)pago+=`<div class="tk-r"><span>Efectivo recibido</span><span>${Q(s.recv)}</span></div><div class="tk-r"><span>Cambio</span><span>${Q(s.change||0)}</span></div>`;
  if(s.pay==="Crédito")pago+=`<div class="tk-r"><span>Cliente</span><span>${esc(s.cust||"")}</span></div><div class="tk-c">*** VENTA A CRÉDITO ***</div>`;
  const obs=s.obs?`<div class="tk-o">${esc(s.obs)}</div>`:`<div class="tk-l"></div><div class="tk-l"></div>`;
  return `<div class="tk w${w}">
${brand.logo?`<img class="tk-logo" src="${esc(brand.logo)}" alt="">`:""}
<div class="tk-n">${esc(NEGOCIO.nombre)}</div>
<div class="tk-s">${esc(NEGOCIO.direccion)}</div>
<div class="tk-s">Tels: ${NEGOCIO.telefonos.map(esc).join(" / ")}</div>
<div class="tk-sep"></div>
<div class="tk-t">TICKET No. ${tkPad(s.ticket)}</div>
${reprint?'<div class="tk-c">** REIMPRESIÓN **</div>':""}
<div class="tk-r"><span>Fecha</span><span>${fecha}</span></div>
<div class="tk-r"><span>Hora</span><span>${hora}</span></div>
<div class="tk-r"><span>Atendió</span><span>${esc(s.byName||"")}</span></div>
<div class="tk-sep"></div>
<div class="tk-h"><span>DESCRIPCIÓN</span><span>SUBTOTAL</span></div>
${items}
<div class="tk-sep"></div>
<div class="tk-r"><span>Subtotal</span><span>${Q(sub)}</span></div>
<div class="tk-tot"><span>TOTAL</span><span>${Q(s.total)}</span></div>
${pago}
<div class="tk-sep"></div>
<div class="tk-ol">Observaciones:</div>${obs}
<div class="tk-sep"></div>
<div class="tk-g">¡GRACIAS POR SU COMPRA!</div>
<div class="tk-s">Vuelva pronto</div>
<div class="tk-s">Conserve este comprobante</div>
</div>`;
}

/* Impresión: solo se imprime el ticket (el resto de la página se oculta) con el ancho de papel elegido */
function printTicket(s,w,reprint){
  let box=$("tkprint");if(!box){box=document.createElement("div");box.id="tkprint";document.body.appendChild(box)}
  let st=$("tkpg");if(!st){st=document.createElement("style");st.id="tkpg";document.head.appendChild(st)}
  box.innerHTML=ticketHTML(s,w,reprint);
  // medir el alto real del ticket para que el papel tenga exactamente 58/80 mm de ancho y el largo necesario
  box.style.cssText="display:block;position:absolute;left:-9999px;top:0;width:"+w+"mm";
  const h=box.firstElementChild.getBoundingClientRect().height;box.style.cssText="";
  st.textContent="@page{size:"+w+"mm "+Math.max(60,Math.ceil(h*25.4/96)+6)+"mm;margin:0}";
  const done=()=>{box.innerHTML="";window.removeEventListener("afterprint",done)};
  window.addEventListener("afterprint",done);
  setTimeout(()=>window.print(),200);
}
const quickPrint=s=>printTicket(s,tkW(),false);

function showTicket(s,o={}){
  if(!s)return;let w=tkW();
  openModal(`<h3>Ticket ${s.ticket?"No. "+tkPad(s.ticket):""}</h3><div class="seg" id="tkw"><button data-w="58">Papel 58 mm</button><button data-w="80">Papel 80 mm</button></div><div class="tkprev"><div id="tkbox"></div></div><div class="row" style="margin-top:12px"><button class="sec" id="tkc">Cerrar</button><button id="tkpr">Imprimir ticket</button></div>`);
  const draw=()=>{$("tkbox").innerHTML=ticketHTML(s,w,o.reprint);document.querySelectorAll("#tkw button").forEach(b=>b.classList.toggle("on",+b.dataset.w===w))};
  document.querySelectorAll("#tkw button").forEach(b=>b.onclick=()=>{w=+b.dataset.w;try{localStorage.setItem("cotiy_tkw",String(w))}catch(e){}draw()});
  $("tkc").onclick=closeModal;$("tkpr").onclick=()=>printTicket(s,w,o.reprint);draw();
}

/* Historial de tickets (supervisor / administrador) */
function renderTickets(){
  if(!$("v-tickets")||!sup())return;
  const n=($("tn").value||"").replace(/\D/g,""),a=$("td1").value?new Date($("td1").value+"T00:00:00").getTime():0,b=$("td2").value?new Date($("td2").value+"T00:00:00").getTime()+864e5:Infinity,e=$("te").value;
  const names=[...new Set(sales.map(s=>s.byName).filter(Boolean))].sort(),cur=$("te").value;
  $("te").innerHTML='<option value="">Todos los empleados</option>'+names.map(x=>`<option ${x===cur?"selected":""}>${esc(x)}</option>`).join("");
  const L=sales.filter(s=>(!n||String(s.ticket||"").includes(n.replace(/^0+/,"")||"0"))&&s.at>=a&&s.at<b&&(!e||s.byName===e)).sort((x,y)=>(y.ticket||0)-(x.ticket||0)||y.at-x.at);
  const tot=L.reduce((s,x)=>s+x.total,0),by={};L.forEach(x=>{by[x.byName||"—"]=(by[x.byName||"—"]||0)+x.total});
  $("tsum").innerHTML=`<b>${L.length}</b> tickets · Total <b>${Q(tot)}</b>${Object.keys(by).length?`<div class="mut">${Object.entries(by).map(([k,v])=>esc(k)+": "+Q(v)).join(" · ")}</div>`:""}`;
  $("tl").innerHTML=L.length?`<table><tr><th>No.</th><th>Fecha</th><th>Empleado</th><th>Total</th><th></th></tr>${L.slice(0,200).map(s=>`<tr><td><b>${tkPad(s.ticket)}</b></td><td>${fdt(s.at)}<div class="mut">${esc(s.pay)}${s.cust?" · "+esc(s.cust):""}</div></td><td>${esc(s.byName||"")}</td><td><b>${Q(s.total)}</b></td><td style="white-space:nowrap"><button class="sec" data-v="${esc(s.id)}">Abrir</button> <button class="sec" data-p="${esc(s.id)}">Reimprimir</button></td></tr>`).join("")}</table>`:'<p class="mut">No hay tickets con esos filtros.</p>';
  $("tl").querySelectorAll("[data-v]").forEach(x=>x.onclick=()=>showTicket(sales.find(s=>s.id===x.dataset.v),{reprint:true}));
  $("tl").querySelectorAll("[data-p]").forEach(x=>x.onclick=()=>printTicket(sales.find(s=>s.id===x.dataset.p),tkW(),true));
}
["tn","td1","td2","te"].forEach(i=>{const x=$(i);if(x){x.oninput=renderTickets;x.onchange=renderTickets}});
if($("tclr"))$("tclr").onclick=()=>{["tn","td1","td2","te"].forEach(i=>$(i).value="");renderTickets()};
