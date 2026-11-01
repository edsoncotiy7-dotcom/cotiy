/* Excel y respaldo. Usa los datos que ya cargó app.js. */
function dl(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
const hoyStr=()=>new Date().toISOString().slice(0,10);
function rango(){const d=$("xd").value,h=$("xh").value;return[d?new Date(d+"T00:00:00").getTime():0,h?new Date(h+"T00:00:00").getTime()+864e5:Infinity]}

$("xl").onclick=async()=>{
  if(typeof XLSX==="undefined"){toast("Preparando el Excel…");try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")}catch(x){}}
  if(typeof XLSX==="undefined")return toast("No se pudo cargar el generador de Excel. Revisa tu conexión a internet.");
  const[a,b]=rango(),wb=XLSX.utils.book_new();
  const hoja=(n,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{Aviso:"Sin datos"}]),n);
  const en=x=>x.at>=a&&x.at<b,asc=(x,y)=>x.at-y.at;
  hoja("Ventas",sales.filter(en).sort(asc).map(s=>({Fecha:fdt(s.at),Cajero:s.byName,Detalle:(s.items||[]).map(i=>i.qty+" x "+i.name).join(", "),"Forma de pago":s.pay,Cliente:s.cust||"","Pagó con":s.recv??"",Vuelto:s.change??"",Total:s.total})));
  hoja("Inventario",products.map(p=>({Producto:p.name,Color:p.color,Calibre:p.gauge,Precio:+p.price,Existencias:stock(p.id)})));
  hoja("Deudores",debtors().map(x=>({Cliente:x.name,"Total fiado":x.d,Abonado:x.p,Saldo:x.bal})));
  hoja("Abonos",pays.filter(en).sort(asc).map(p=>({Fecha:fdt(p.at),Cliente:p.name,Monto:p.amount,"Forma de pago":p.pay,Registró:p.by})));
  hoja("Cierres de caja",arq.filter(en).sort(asc).map(c=>({Fecha:fdt(c.at),Usuario:c.by,"Fondo inicial":c.fondo,"Efectivo esperado":c.exp,"Efectivo contado":c.counted,Diferencia:c.diff,"No. de ventas":c.nsales||0,"Por cobrar":c.debt||0})));
  XLSX.writeFile(wb,"Hilos-Cotiy-"+hoyStr()+".xlsx");toast("Excel descargado");
};

$("bk").onclick=()=>{
  const m=arr=>Object.fromEntries(arr.map(({id,...r})=>[id,r]));
  const d={version:1,fecha:Date.now(),staff:CLOUD?{}:m(staff),products:m(products),entries:m(entries),sales:m(sales),pays:m(pays),arq:m(arq),config:{brand:{name:brand.name,logo:brand.logo}}};
  dl("respaldo-hilos-cotiy-"+hoyStr()+".json",new Blob([JSON.stringify(d)],{type:"application/json"}));toast("Respaldo descargado");
};

$("rs").onchange=async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  let d;try{d=JSON.parse(await f.text())}catch(x){return toast("Archivo no válido.")}
  if(!await sure("¿Restaurar el respaldo? Se agregarán o reemplazarán los datos del archivo."))return;
  let n=0;
  try{for(const col of(CLOUD?["products","entries","sales","pays","arq","config"]:["staff","products","entries","sales","pays","arq","config"]))for(const[id,v]of Object.entries(d[col]||{})){await db.doc(col+"/"+id).set(v);n++}toast("Respaldo restaurado ("+n+" registros)")}
  catch(x){toast("Error al restaurar. Revisa tu conexión.")}
};

/* Subir a la nube los datos que estaban guardados solo en este navegador (modo local anterior) */
$("mg").onclick=async()=>{
  let d;try{d=JSON.parse(localStorage.getItem("cotiy_db")||"{}")}catch(x){return toast("No se pudieron leer los datos de este navegador.")}
  if(!await sure("¿Subir a la nube los datos guardados en este navegador? Las cuentas con PIN no se suben."))return;
  let n=0;
  try{for(const col of["products","entries","sales","pays","arq","config"])for(const[id,v]of Object.entries(d[col]||{})){await db.doc(col+"/"+id).set(v);n++}toast("Datos subidos ("+n+" registros)")}
  catch(x){toast("Error al subir. Revisa tu conexión y permisos.")}
};
