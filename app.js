/* =========================================================
   SILUETEANDO — logica (tres paginas)
   Una sola pieza que se comporta segun body[data-pagina].
   La silueta dibujada en la pagina 2 se guarda en el navegador
   y la pagina 3 la recupera para que siga caminando.
   Todo del lado del navegador. Nada se sube a ningun lado.
   ========================================================= */

const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const color = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const PAGINA = document.body.dataset.pagina;

/* figura fantasma de fondo (motivo del paralaje y de la portada) */
const SVG_FIG = `<svg class="fig" viewBox="0 0 120 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <circle cx="60" cy="42" r="30"/>
  <path d="M60 78 C92 78 104 104 104 150 L96 300 L24 300 L16 150 C16 104 28 78 60 78 Z"/></svg>`;

/* ---------- silueta: modelo normalizado (0..1) + guardado ---------- */
const CLAVE = 'silueteando:silueta';
function guardarSilueta(s){ try{ sessionStorage.setItem(CLAVE, JSON.stringify(s)); }catch(e){} }
function cargarSilueta(){ try{ const r = sessionStorage.getItem(CLAVE); return r ? JSON.parse(r) : null; }catch(e){ return null; } }

/* dibuja una silueta guardada dentro de una caja (contain), de un color */
function rellenarSilueta(c, sil, caja, tinta, soloContorno){
  if(!sil) return;
  const a = sil.aspecto;
  let w = caja.w, h = caja.w/a;
  if(h > caja.h){ h = caja.h; w = caja.h*a; }
  const ox = caja.x + (caja.w-w)/2, oy = caja.y + (caja.h-h)/2;
  c.beginPath();
  sil.norm.forEach((p,i)=>{ const x=ox+p.x*w, y=oy+p.y*h; i ? c.lineTo(x,y) : c.moveTo(x,y); });
  c.closePath();
  if(soloContorno){ c.strokeStyle = tinta; c.lineWidth = 2; c.stroke(); }
  else { c.fillStyle = tinta; c.fill(); }
}

function ajustar(cv){
  const r = cv.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width*dpr); cv.height = Math.round(r.height*dpr);
  cv.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
  return r;
}

/* ---------- transicion con fundido entre paginas (delegado: vale para links creados despues) ---------- */
document.addEventListener('click', e=>{
  const a = e.target.closest('a.ir');
  if(!a || reducido) return;
  e.preventDefault();
  document.body.classList.add('yendo');
  setTimeout(()=> location.href = a.getAttribute('href'), 420);
});

/* =========================================================
   PAGINA 1 — PORTADA
   ========================================================= */
function initPortada(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="fondo">${SVG_FIG}</div>
    <h1 class="marca">${DATOS.meta.titulo}</h1>
    <p class="sub">${DATOS.meta.subtitulo}</p>
    <a class="btn ir entrar" href="pregunta.html">${DATOS.portada.entrada}</a>`;
}

/* =========================================================
   PAGINA 2 — PREGUNTA + DIBUJO
   ========================================================= */
function initPregunta(){
  const app = document.getElementById('app');
  const P = DATOS.pregunta, D = DATOS.dibujo;
  app.innerHTML = `
    <section class="panel">
      <div class="ficha bloque"><span class="reg">${DATOS.meta.registro}</span> · ${P.num}</div>
      <h2 class="titulo bloque">${P.texto}</h2>
      <p class="pie bloque">${P.pie}</p>
    </section>
    <section class="panel">
      <div class="ficha bloque"><span class="reg">${DATOS.meta.registro}</span> · ${D.num}</div>
      <h2 class="instruccion bloque">${D.instruccion}</h2>
      <p class="ayuda bloque">${D.ayuda}</p>
      <div class="tablero bloque"><canvas id="lienzo"></canvas><div class="marca-toque" id="marcaToque">Trazá acá</div></div>
      <div class="controles bloque">
        <button class="btn btn--ghost" id="btnOtra">Otra vez</button>
        <button class="btn" id="btnListo" disabled>Listo</button>
      </div>
      <p class="cierre-dibujo" id="cierreDibujo">${D.cierre}</p>
      <a class="btn ir seguir" id="seguir" href="desarrollo.html">${D.accion} →</a>
    </section>`;

  // aparicion de los dos paneles
  const io = new IntersectionObserver(es=> es.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); }), {threshold:.25});
  app.querySelectorAll('.panel').forEach(p=> io.observe(p));

  // --- dibujo ---
  const lienzo = document.getElementById('lienzo');
  const ctx = lienzo.getContext('2d');
  const tablero = lienzo.parentElement;
  const marca = document.getElementById('marcaToque');
  const btnListo = document.getElementById('btnListo');
  const btnOtra = document.getElementById('btnOtra');
  const cierreD = document.getElementById('cierreDibujo');
  const seguir = document.getElementById('seguir');
  let puntos = [], trazando = false;

  function pintarTrazo(){
    const r = lienzo.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
    if(!puntos.length) return;
    ctx.beginPath(); ctx.moveTo(puntos[0].x, puntos[0].y);
    for(let i=1;i<puntos.length;i++) ctx.lineTo(puntos[i].x, puntos[i].y);
    if(puntos.length>3) ctx.closePath();
    ctx.fillStyle = 'rgba(217,199,161,.22)'; ctx.fill();
    ctx.strokeStyle = color('--papel'); ctx.lineWidth = 2.5; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke();
  }
  const coord = e => { const r = lienzo.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; };

  tablero.addEventListener('pointerdown', e=>{ trazando=true; tablero.setPointerCapture(e.pointerId); marca.style.display='none'; puntos.push(coord(e)); pintarTrazo(); });
  tablero.addEventListener('pointermove', e=>{ if(!trazando) return; puntos.push(coord(e)); if(puntos.length>5) btnListo.disabled=false; pintarTrazo(); });
  const soltar = ()=> trazando=false;
  tablero.addEventListener('pointerup', soltar);
  tablero.addEventListener('pointercancel', soltar);

  btnOtra.addEventListener('click', ()=>{
    puntos=[]; btnListo.disabled=true; marca.style.display='';
    const r = lienzo.getBoundingClientRect(); ctx.clearRect(0,0,r.width,r.height);
    cierreD.classList.remove('on'); seguir.classList.remove('on');
  });

  btnListo.addEventListener('click', ()=>{
    if(puntos.length < 6) return;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    puntos.forEach(p=>{ minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y); });
    const bw=Math.max(1,maxX-minX), bh=Math.max(1,maxY-minY);
    const sil = { norm: puntos.map(p=>({x:(p.x-minX)/bw, y:(p.y-minY)/bh})), aspecto: bw/bh };
    guardarSilueta(sil);
    const r = lienzo.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
    rellenarSilueta(ctx, sil, {x:minX,y:minY,w:bw,h:bh}, color('--papel'));
    cierreD.classList.add('on'); seguir.classList.add('on');
  });

  // ajustar el lienzo cuando el panel entra en pantalla
  const ioT = new IntersectionObserver(es=> es.forEach(e=>{ if(e.isIntersecting){ ajustar(lienzo); pintarTrazo(); } }), {threshold:.2});
  ioT.observe(tablero);
  window.addEventListener('resize', ()=>{ ajustar(lienzo); pintarTrazo(); });
}

/* =========================================================
   PAGINA 3 — DESARROLLO con PARALAJE
   ========================================================= */
function initDesarrollo(){
  const scroll = document.getElementById('scroll');
  const sil = cargarSilueta();

  const lineasHTML = arr => (arr||[]).map(t=>`<p>${t}</p>`).join('');

  DATOS.desarrollo.forEach((s, i)=>{
    const sec = document.createElement('section');
    sec.className = 'seccion'; sec.dataset.tipo = s.tipo;
    const ficha = `<div class="ficha bloque"><span class="reg">${DATOS.meta.registro}</span> · ${s.num}</div>`;

    let cuerpo;
    if(s.tipo === 'cierre'){
      cuerpo = `${ficha}
        <h2 class="titulo bloque">${s.titulo}</h2>
        <div class="muro bloque"><canvas id="muroLienzo"></canvas></div>
        <p class="numerazo bloque">${DATOS.meta.numero}<small>desaparecidos</small></p>
        <div class="lineas bloque">${lineasHTML(s.lineas)}</div>
        <p class="pie bloque">${s.pie||''}</p>`;
    } else {
      cuerpo = `${ficha}
        <h2 class="titulo bloque">${s.titulo}</h2>
        <div class="lineas bloque">${lineasHTML(s.lineas)}</div>
        ${s.consigna ? `<span class="consigna bloque">${s.consigna}</span>` : ''}
        ${s.cita ? `<p class="cita bloque">${s.cita}</p>` : ''}
        ${s.pie ? `<p class="pie bloque">${s.pie}</p>` : ''}`;
    }

    // capa de fondo con figura fantasma (alterna de lado, distinta velocidad)
    const lado = (i % 2 === 0) ? 'left:-12%;' : 'right:-12%;';
    const alto = 70 + (i % 3) * 14;      // variacion de tamaño
    const vel  = 0.12 + (i % 4) * 0.04;  // distinta velocidad de paralaje
    const fondo = (s.tipo === 'cierre') ? '' :
      `<div class="fondo" data-vel="${vel.toFixed(2)}">
         <div style="position:absolute;top:14%;${lado}height:${alto}%;">${SVG_FIG}</div>
       </div>`;

    sec.innerHTML = `${fondo}<div class="contenido">${cuerpo}</div>`;
    scroll.appendChild(sec);
  });

  // aparicion + disparo del muro
  const io = new IntersectionObserver(es=> es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('visible'); if(e.target.dataset.tipo==='cierre') llegarAlMuro(); }
  }), {threshold:.25});
  document.querySelectorAll('.seccion').forEach(s=> io.observe(s));

  // arreglos compartidos; el loop de scroll (paralaje + companion) va mas abajo
  const fondos = [...document.querySelectorAll('.fondo')];
  const secciones = [...document.querySelectorAll('.seccion')];


  // --- la silueta que camina y se acerca/aleja con el scroll (viene de la pagina 2) ---
  const compEl = document.getElementById('companion');
  const mov    = compEl.querySelector('.mov');
  const compCv = compEl.querySelector('canvas');
  function dibujarCompanion(){
    if(!sil) return;
    const r = ajustar(compCv);
    const c = compCv.getContext('2d');
    c.clearRect(0,0,r.width,r.height);
    rellenarSilueta(c, sil, {x:6,y:4,w:r.width-12,h:r.height-8}, color('--papel'));
  }
  if(sil){ dibujarCompanion(); compEl.classList.add('on'); }

  // se acerca (crece, sube, se aclara) cuando una seccion queda centrada,
  // y se aleja en las transiciones entre secciones
  function moverCompanion(){
    if(!sil || !mov || compEl.classList.contains('llego')) return;
    const vh = window.innerHeight;
    let lejania = 1;
    secciones.forEach(s=>{
      const r = s.getBoundingClientRect();
      const centro = r.top + r.height/2;
      lejania = Math.min(lejania, Math.min(1, Math.abs(centro - vh/2) / (vh*0.85)));
    });
    const cerca = 1 - lejania;                  // 1 = una seccion bien centrada
    mov.style.transform = `translateY(${(-cerca*30).toFixed(1)}px) scale(${(0.8 + cerca*0.55).toFixed(3)})`;
    mov.style.opacity = (0.42 + cerca*0.58).toFixed(2);
  }

  // --- el muro de las 30.000 ---
  const muroLienzo = document.getElementById('muroLienzo');
  let muroPintado = false;

  function figuraGenerica(c, x, y, h, tinta){
    const w = h*0.42; c.fillStyle = tinta;
    c.beginPath(); c.arc(x, y + h*0.14, h*0.12, 0, Math.PI*2); c.fill();
    c.beginPath();
    c.moveTo(x - w*0.5, y + h);
    c.quadraticCurveTo(x - w*0.5, y + h*0.30, x, y + h*0.28);
    c.quadraticCurveTo(x + w*0.5, y + h*0.30, x + w*0.5, y + h);
    c.closePath(); c.fill();
  }
  function pintarMuro(){
    const r = ajustar(muroLienzo);
    const c = muroLienzo.getContext('2d');
    c.clearRect(0,0,r.width,r.height);
    const filas = 7, fh = r.height/(filas+.5), figAlto = fh*0.92;
    for(let f=0; f<filas; f++){
      const y = f*fh + fh*0.2, sep = figAlto*0.46, jitterFila = (f%2)*sep*0.5;
      for(let x=-sep; x < r.width+sep; x += sep){
        const jx = Math.sin((f*13.3 + x)*0.7) * sep*0.12;
        c.globalAlpha = Math.min(.4, 0.16 + ((f + x*0.013) % 1 + 1) % 1 * 0.14);
        figuraGenerica(c, x + jitterFila + jx, y, figAlto, color('--papel'));
      }
    }
    c.globalAlpha = 1;
    if(sil){
      const w = r.width*0.20, h = r.height*0.62, x = r.width*0.5 - w/2, y = r.height*0.5 - h/2;
      rellenarSilueta(c, sil, {x,y,w,h}, color('--papel'));
      rellenarSilueta(c, sil, {x,y,w,h}, color('--rojo'), true);
    }
  }
  function llegarAlMuro(){
    if(muroPintado) return; muroPintado = true;
    if(sil){ compEl.classList.add('llego'); }
    else {
      const aviso = document.createElement('p');
      aviso.className = 'sin-silueta bloque';
      aviso.innerHTML = 'Todavía no dibujaste tu silueta. <a class="ir" href="pregunta.html">Volvé a dibujarla</a> para sumarla.';
      muroLienzo.parentElement.insertAdjacentElement('afterend', aviso);
    }
    pintarMuro();
  }

  // --- loop de scroll: paralaje de fondos + acercamiento del companion ---
  if(!reducido){
    let pidiendo = false;
    function actualizar(){
      const vh = window.innerHeight;
      fondos.forEach(f=>{
        const r = f.parentElement.getBoundingClientRect();
        const desfase = (r.top + r.height/2) - vh/2;
        const vel = parseFloat(f.dataset.vel || '0.15');
        f.style.transform = `translate3d(0, ${(-desfase*vel).toFixed(1)}px, 0)`;
      });
      moverCompanion();
      pidiendo = false;
    }
    window.addEventListener('scroll', ()=>{ if(!pidiendo){ requestAnimationFrame(actualizar); pidiendo=true; } }, {passive:true});
    window.addEventListener('resize', actualizar);
    actualizar();
  }

  // resize de canvases
  let t; window.addEventListener('resize', ()=>{ clearTimeout(t); t = setTimeout(()=>{
    if(compEl.classList.contains('on')) dibujarCompanion();
    if(muroPintado) pintarMuro();
  }, 180); });
}

/* ---------- arranque segun la pagina ---------- */
if(PAGINA === 'portada') initPortada();
else if(PAGINA === 'pregunta') initPregunta();
else if(PAGINA === 'desarrollo') initDesarrollo();
