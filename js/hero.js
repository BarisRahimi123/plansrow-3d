// PLANSROW HERO — scroll-driven layered building reveal.
// A point cloud assembles into a realistic curtain-wall office block, then scroll
// peels it back layer by layer: glass skin → steel structure → MEP → foundation → BIM.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('heroCanvas');
const hero   = document.getElementById('hero');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;

if (canvas && hero) init();

function init() {
  /* ── building dimensions ── */
  const W = 46, D = 30, FLOORS = 7, FH = 4.4;     // width, depth, floors, floor height
  const H = FLOORS * FH;                           // total height ≈ 30.8
  const cx = 0, cz = 0;                            // plan center
  const hw = W / 2, hd = D / 2;
  const PH = { w: 16, h: 4.4, d: 12, y: H + 2.2 }; // rooftop mechanical penthouse
  // structural column grid
  const COLX = [-18, -9, 0, 9, 18];
  const COLZ = [-12, 0, 12];
  // masses used for point-cloud sampling + BIM wireframe
  const masses = [
    { c: [0, H / 2, 0], s: [W, H, D] },
    { c: [0, PH.y, 0],  s: [PH.w, PH.h, PH.d] },
  ];

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0e0d0c, 0.0045);

  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 1200);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;

  // environment map → realistic reflections on glass + steel
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // lights — building reads bright against the dark hero, like a lit night render
  scene.add(new THREE.HemisphereLight(0xdfe9ef, 0x20242a, 1.1));
  const key = new THREE.DirectionalLight(0xfff4e8, 3.6); key.position.set(52, 76, 40); scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd2e0, 1.1); fill.position.set(-44, 28, -16); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xED2422, 1.4); rim.position.set(-34, 34, -58); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x7fb4ff, 0.8); rim2.position.set(40, 20, -50); scene.add(rim2);

  const world = new THREE.Group();
  world.position.y = -2;                 // sit the building a touch lower in frame
  scene.add(world);

  /* shared materials (one per visual type → cheap layer fades) */
  const M = {
    glass:  new THREE.MeshPhysicalMaterial({ color: 0x4a6c84, metalness: 0.1, roughness: 0.12, transparent: true, opacity: 0, envMapIntensity: 2.0, clearcoat: 1.0, clearcoatRoughness: 0.1, depthWrite: false }),
    mull:   new THREE.MeshStandardMaterial({ color: 0x53585e, metalness: 0.35, roughness: 0.45, transparent: true, opacity: 0, envMapIntensity: 1.0 }),
    band:   new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.25, roughness: 0.55, transparent: true, opacity: 0, envMapIntensity: 0.8 }),
    stone:  new THREE.MeshStandardMaterial({ color: 0xc2bcb0, metalness: 0.0, roughness: 0.9, transparent: true, opacity: 0 }),
    roof:   new THREE.MeshStandardMaterial({ color: 0x6a6f74, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0, envMapIntensity: 0.9 }),
    unit:   new THREE.MeshStandardMaterial({ color: 0xc6cccf, metalness: 0.25, roughness: 0.55, transparent: true, opacity: 0 }),
    steel:  new THREE.MeshStandardMaterial({ color: 0xc3ccd0, metalness: 0.3, roughness: 0.45, transparent: true, opacity: 0, envMapIntensity: 1.1 }),
    slab:   new THREE.MeshStandardMaterial({ color: 0xcdd0ce, metalness: 0.1, roughness: 0.8, transparent: true, opacity: 0 }),
    conc:   new THREE.MeshStandardMaterial({ color: 0x8a847b, metalness: 0.0, roughness: 0.95, transparent: true, opacity: 0 }),
    chw:    new THREE.MeshStandardMaterial({ color: 0x3a93e6, metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0 }),
    hw:     new THREE.MeshStandardMaterial({ color: 0xe8443a, metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0 }),
    san:    new THREE.MeshStandardMaterial({ color: 0x57c95b, metalness: 0.15, roughness: 0.45, transparent: true, opacity: 0 }),
    gas:    new THREE.MeshStandardMaterial({ color: 0xf2cf48, metalness: 0.2, roughness: 0.4, transparent: true, opacity: 0 }),
    duct:   new THREE.MeshStandardMaterial({ color: 0xc4cacd, metalness: 0.25, roughness: 0.45, transparent: true, opacity: 0 }),
    equip:  new THREE.MeshStandardMaterial({ color: 0xcfd4d6, metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0, emissive: 0xED2422, emissiveIntensity: 0 }),
  };

  const add = (group, geo, mat, x, y, z, rotY) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rotY) m.rotation.y = rotY; group.add(m); return m;
  };

  /* ───────────── LAYER: point cloud ───────────── */
  const COUNT = reduce ? 4000 : (isMobile ? 7000 : 14000);
  const targets = new Float32Array(COUNT * 3), starts = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT);
  const surfArea = masses.reduce((a, m) => a + boxArea(m.s), 0);
  for (let i = 0; i < COUNT; i++) {
    let p; const r = Math.random();
    if (r < 0.14)      p = [(Math.random() - 0.5) * 150, 0, (Math.random() - 0.5) * 110];     // ground
    else if (r < 0.40) { const f = Math.floor(Math.random() * FLOORS); p = [cx + (Math.random()-0.5)*W, 0.5 + f*FH, cz + (Math.random()-0.5)*D]; } // floor slabs
    else { const m = pickMass(masses, surfArea); p = pointOnBox(m.c, m.s); }                  // facades + roof
    targets[i*3]=p[0]; targets[i*3+1]=p[1]; targets[i*3+2]=p[2];
    const a = Math.random()*Math.PI*2, b = Math.acos(2*Math.random()-1), rad = 70 + Math.random()*60;
    starts[i*3]=Math.sin(b)*Math.cos(a)*rad; starts[i*3+1]=Math.abs(Math.cos(b)*rad)*0.7+4; starts[i*3+2]=Math.sin(b)*Math.sin(a)*rad;
    seed[i]=Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT*3), 3));
  const ptMat = new THREE.PointsMaterial({ size: isMobile?0.4:0.3, map: makeDot(), transparent:true, color:0xED2422, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.95 });
  world.add(new THREE.Points(geo, ptMat));

  /* ───────────── LAYER: architectural skin (curtain wall) ───────────── */
  const skin = new THREE.Group();
  // reflective glass volume (inset slightly)
  add(skin, new THREE.BoxGeometry(W-0.6, H-FH*0.1, D-0.6), M.glass, 0, H/2, 0);
  // vertical mullions / fins
  const finStep = isMobile ? 3.4 : 2.3;
  const finGX = new THREE.BoxGeometry(0.18, H, 0.5);   // fins on ±Z facades (run along X)
  const finGZ = new THREE.BoxGeometry(0.5, H, 0.18);   // fins on ±X facades (run along Z)
  for (let x = -hw + 1; x <= hw - 1; x += finStep) { add(skin, finGX, M.mull, x, H/2, hd); add(skin, finGX, M.mull, x, H/2, -hd); }
  for (let z = -hd + 1; z <= hd - 1; z += finStep) { add(skin, finGZ, M.mull, hw, H/2, z); add(skin, finGZ, M.mull, -hw, H/2, z); }
  // corner / edge mullions (vertical accents)
  [[hw,hd],[hw,-hd],[-hw,hd],[-hw,-hd]].forEach(([x,z]) => add(skin, new THREE.BoxGeometry(0.6,H,0.6), M.mull, x, H/2, z));
  // horizontal spandrel bands at every floor line
  const bandX = new THREE.BoxGeometry(W, 0.9, 0.34), bandZ = new THREE.BoxGeometry(0.34, 0.9, D);
  for (let f = 1; f < FLOORS; f++) { const y = f*FH; add(skin, bandX, M.band, 0, y, hd); add(skin, bandX, M.band, 0, y, -hd); add(skin, bandZ, M.band, hw, y, 0); add(skin, bandZ, M.band, -hw, y, 0); }
  // parapet cap
  add(skin, new THREE.BoxGeometry(W+0.6, 1.0, D+0.6), M.band, 0, H+0.4, 0);
  // stone-clad ground floor piers (entrance)
  for (let x = -hw + 4; x <= hw - 4; x += 8) add(skin, new THREE.BoxGeometry(2.2, FH, 1.0), M.stone, x, FH/2, hd-0.2);
  // rooftop mechanical penthouse + louvered units
  add(skin, new THREE.BoxGeometry(PH.w, PH.h, PH.d), M.roof, 0, PH.y, 0);
  for (let i = 0; i < 5; i++) add(skin, new THREE.BoxGeometry(3, 2.2, 3), M.unit, -8 + i*4, H + 1.1, -7);
  world.add(skin);

  /* ───────────── LAYER: steel structure ───────────── */
  const structure = new THREE.Group();
  const colG = new THREE.BoxGeometry(0.8, H, 0.8);
  COLX.forEach(x => COLZ.forEach(z => add(structure, colG, M.steel, x, H/2, z)));
  const beamX = new THREE.BoxGeometry(W-2, 0.55, 0.5), beamZ = new THREE.BoxGeometry(0.5, 0.55, D-2);
  const slabG = new THREE.BoxGeometry(W-2.4, 0.3, D-2.4);
  for (let f = 1; f <= FLOORS; f++) {
    const y = f*FH;
    add(structure, slabG, M.slab, 0, y, 0);                          // floor slab
    add(structure, beamX, M.steel, 0, y, hd-1); add(structure, beamX, M.steel, 0, y, -(hd-1)); add(structure, beamX, M.steel, 0, y, 0);
    COLX.forEach(x => add(structure, beamZ, M.steel, x, y, 0));      // beams along column lines
  }
  // X-bracing in the two end bays (±X faces), every other floor
  const bracePlanes = [hw-0.6, -(hw-0.6)];
  for (let f = 0; f < FLOORS; f += 2) {
    const y0 = f*FH, y1 = (f+1)*FH;
    bracePlanes.forEach(x => { strut(structure, [x,y0,-12],[x,y1,0], 0.28, M.steel); strut(structure, [x,y0,12],[x,y1,0], 0.28, M.steel); strut(structure, [x,y1,-12],[x,y0,0], 0.28, M.steel); strut(structure, [x,y1,12],[x,y0,0], 0.28, M.steel); });
  }
  world.add(structure);

  /* ───────────── LAYER: MEP ───────────── */
  const mep = new THREE.Group();
  function pipe(y, z, r, mat) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, W-4, 12), mat); c.rotation.z = Math.PI/2; c.position.set(0, y, z); mep.add(c); }
  function riser(x, z, r, mat) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H-2, 12), mat); c.position.set(x, H/2, z); mep.add(c); }
  [2, 4, 6].forEach(f => {
    const y = f*FH - 0.8;
    add(mep, new THREE.BoxGeometry(W-6, 1.3, 1.7), M.duct, 0, y, 6);      // supply duct
    add(mep, new THREE.BoxGeometry(W-8, 1.0, 1.3), M.duct, 0, y-0.2, -7); // return duct
    pipe(y-1.1, 8.4, 0.3, M.chw); pipe(y-1.1, 9.0, 0.24, M.hw);
    pipe(y-1.1, -9.0, 0.34, M.san); pipe(y-1.1, -8.2, 0.18, M.gas);
  });
  riser(17, -11, 0.4, M.chw); riser(-17, 11, 0.4, M.hw); riser(16, 11, 0.34, M.san);
  world.add(mep);

  /* rooftop equipment — highlighted in the DATA / metadata stage */
  const equip = new THREE.Group();
  const ry = H + 2.1;                                                 // sits on the main roof
  add(equip, new THREE.BoxGeometry(36, 0.4, 26), M.duct, 0, H + 0.3, 0);   // roof curb/pad
  // AHU-1 (rooftop air handling unit) with fan cowls
  add(equip, new THREE.BoxGeometry(10, 3.4, 5.2), M.equip, -6, ry + 1.2, 3);
  add(equip, new THREE.BoxGeometry(1.8, 1.3, 1.8), M.equip, -3, ry + 3.4, 3);
  add(equip, new THREE.BoxGeometry(1.8, 1.3, 1.8), M.equip, -9, ry + 3.4, 3);
  add(equip, new THREE.BoxGeometry(4, 1.2, 1.2), M.duct, 0.5, ry + 0.6, 3); // supply takeoff
  // Boiler B-1 (cylindrical) + flue
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 5, 18), M.equip);
  boiler.position.set(9, ry + 1.4, -4); equip.add(boiler);
  add(equip, new THREE.BoxGeometry(1, 2.4, 1), M.equip, 9, ry + 4.4, -4); // flue stack
  world.add(equip);

  /* ───────────── LAYER: foundation ───────────── */
  const foundation = new THREE.Group();
  add(foundation, new THREE.BoxGeometry(W+4, 1.6, D+4), M.conc, 0, -1.6, 0); // mat slab
  COLX.forEach(x => COLZ.forEach(z => { add(foundation, new THREE.BoxGeometry(3, 2, 3), M.conc, x, -2.6, z); add(foundation, new THREE.BoxGeometry(1.3, 2.6, 1.3), M.conc, x, -0.7, z); }));
  add(foundation, new THREE.BoxGeometry(W+1, 2.4, 2), M.conc, 0, -1, hd);     // grade beams
  add(foundation, new THREE.BoxGeometry(W+1, 2.4, 2), M.conc, 0, -1, -hd);
  world.add(foundation);

  /* ───────────── LAYER: BIM wireframe ───────────── */
  const wire = new THREE.Group(); const wireMats = [];
  masses.forEach(m => { const mw = new THREE.LineBasicMaterial({ color: 0xF4F6F2, transparent: true, opacity: 0 }); wireMats.push(mw);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(m.s[0], m.s[1], m.s[2])), mw); e.position.set(m.c[0], m.c[1], m.c[2]); wire.add(e); });
  for (let f = 1; f < FLOORS; f++) { const y = f*FH; const mw = new THREE.LineBasicMaterial({ color: 0xED2422, transparent: true, opacity: 0 }); wireMats.push(mw);
    wire.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-hw,y,-hd), new THREE.Vector3(hw,y,-hd), new THREE.Vector3(hw,y,hd), new THREE.Vector3(-hw,y,hd), new THREE.Vector3(-hw,y,-hd)]), mw)); }
  world.add(wire);

  /* ───────────── interaction state ───────────── */
  let tmx=0, tmy=0, mx=0, my=0, sp=0, tp=0;
  const hud = { pts: document.getElementById('hudPoints'), model: document.getElementById('hudModel') };
  const stages = [...document.querySelectorAll('.hero__stages .stage')];
  const ticks  = [...document.querySelectorAll('.hero__rail .rail__tick')];
  const annos  = [...document.querySelectorAll('.hero__annos .anno')];
  const cards  = [...document.querySelectorAll('.hero__cards .datacard')];

  addEventListener('mousemove', e => { tmx = e.clientX/innerWidth-0.5; tmy = e.clientY/innerHeight-0.5; }, { passive: true });
  function readScroll() { const s = hero.offsetHeight - innerHeight; tp = s > 0 ? clamp(-hero.getBoundingClientRect().top / s, 0, 1) : 0; }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', () => { camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); readScroll(); });
  readScroll();

  const clock = new THREE.Clock();
  if (reduce) { renderFrame(0.50, 100); setStage('structure'); return; }

  let raf = null, dbg = null;
  function loop() { sp += (tp - sp) * 0.08; renderFrame(dbg != null ? dbg : sp, clock.getElapsedTime()); raf = requestAnimationFrame(loop); }

  function renderFrame(p, t) {
    // intro assembly is TIME-driven (plays once on load) so the hero opens on the
    // finished building; scroll then peels it back. assembleT = max(time, early scroll).
    const a = Math.max(clamp(t/2.6, 0, 1), clamp(p/0.06, 0, 1));
    const ease = 1 - Math.pow(1-a, 3);
    const arr = geo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const kk = Math.min(1, ease*(0.55+seed[i]*0.45)), ix = i*3, drift = (1-kk)*2.4;
      arr[ix]  = lerp(starts[ix],  targets[ix],  kk) + Math.sin(t*0.6+seed[i]*9)*drift;
      arr[ix+1]= lerp(starts[ix+1],targets[ix+1],kk) + Math.cos(t*0.5+seed[i]*7)*drift;
      arr[ix+2]= lerp(starts[ix+2],targets[ix+2],kk) + Math.sin(t*0.7+seed[i]*5)*drift;
    }
    geo.attributes.position.needsUpdate = true;

    // ARCHITECTURE: skin present once assembled, peels away as the MEP stage begins (~0.14)
    const skinAppear = smooth(clamp((a-0.6)/0.4, 0, 1));
    const peel = smooth(clamp((p-0.14)/0.16, 0, 1));
    const skinO = skinAppear * (1 - peel);
    ptMat.opacity = a * (1 - skinAppear) * 0.95 + 0.07 * smooth(clamp((p-0.9)/0.1, 0, 1));
    M.glass.opacity = skinO*0.82; M.mull.opacity = skinO*0.95; M.band.opacity = skinO*0.95;
    M.stone.opacity = skinO*0.95; M.roof.opacity = skinO*0.95; M.unit.opacity = skinO*0.95;

    // stage dimmers
    const atData  = smooth(clamp((p-0.62)/0.12, 0, 1));   // metadata focus ramp
    const atOutro = smooth(clamp((p-0.86)/0.10, 0, 1));

    // MEP: arrives first (0.16), stays through later stages, recedes a touch at metadata, off at twin
    const mepO = smooth(clamp((p-0.16)/0.12,0,1)) * (1 - 0.45*atData) * (1 - 0.7*atOutro);
    M.chw.opacity = M.hw.opacity = M.san.opacity = M.gas.opacity = M.duct.opacity = mepO;

    // STRUCTURE: slabs give floor context with MEP; full frame + footings at the structure stage
    const slabO  = smooth(clamp((p-0.18)/0.12,0,1)) * (1 - 0.5*atData) * (1 - 0.6*atOutro);
    const steelO = smooth(clamp((p-0.34)/0.12,0,1)) * (1 - 0.5*atData) * (1 - 0.6*atOutro);
    const foundO = smooth(clamp((p-0.40)/0.12,0,1)) * (1 - 0.5*atData) * (1 - 0.6*atOutro);
    M.slab.opacity = slabO*0.9; M.steel.opacity = steelO; M.conc.opacity = foundO*0.95;

    // EQUIPMENT (AHU + boiler): visible with MEP, spotlit during metadata
    const equipO = smooth(clamp((p-0.16)/0.12,0,1)) * (1 - 0.6*atOutro);
    M.equip.opacity = Math.max(equipO, atData*(1-atOutro));
    M.equip.emissiveIntensity = 0.4 * atData * (1 - atOutro);

    // DIGITAL TWIN wireframe overlay
    const wireO = smooth(clamp((p-0.84)/0.12,0,1));
    wireMats.forEach(m => m.opacity = wireO * (m.color.getHex() === 0xED2422 ? 0.55 : 0.85));

    // camera: 3/4 corner orbit → dip to show footings at structure → push up to rooftop for metadata
    mx += (tmx-mx)*0.05; my += (tmy-my)*0.05;
    const sP = smooth(p);
    const az = lerp(0.62, -0.30, sP) + mx*0.4;                       // sweep across the corner
    const dip = smooth(clamp((p-0.40)/0.12,0,1)) * (1 - atData);     // lower gaze during structure (footings)
    const fc  = atData * (1 - smooth(clamp((p-0.86)/0.08,0,1)));     // metadata closeup on rooftop equipment
    const baseRad = lerp(82, 58, sP);
    const rad = lerp(baseRad, 40, fc);                              // zoom in for metadata
    const tx = -7;                                                  // building sits right of the text
    camera.position.x = tx + Math.sin(az)*rad;
    camera.position.z = Math.cos(az)*rad;
    camera.position.y = (lerp(26, 18, sP) - dip*8) + fc*16 - my*5;  // rise for the rooftop view
    camera.lookAt(tx, lerp(15 - dip*11, 30, fc), 0);                // low for footings, high for equipment
    world.rotation.y = mx*0.1;

    renderer.render(scene, camera);

    if (hud.pts) hud.pts.textContent = Math.round((0.2+0.8*a)*COUNT).toLocaleString();
    const layer = p<0.06?'POINT_CLOUD':p<0.16?'ARCHITECTURE':p<0.40?'MEP_SYSTEMS':p<0.62?'STRUCTURE':p<0.84?'METADATA':'DIGITAL_TWIN';
    if (hud.model) hud.model.textContent = layer;
    setStage(stageFor(p));
  }

  function stageFor(p) { return p<0.16?'intro':p<0.40?'mep':p<0.62?'structure':p<0.84?'data':'outro'; }
  let lastStage = '';
  function setStage(name) {
    if (name === lastStage) return; lastStage = name;
    stages.forEach(s => s.classList.toggle('is-active', s.dataset.stage === name));
    ticks.forEach(tk => tk.classList.toggle('is-active', tk.dataset.stage === name));
    annos.forEach(a => a.classList.toggle('is-on', a.dataset.for === name));
    cards.forEach(c => c.classList.toggle('is-on', c.dataset.for === name));
  }

  window.__heroRender = (pp) => { dbg = pp; renderFrame(pp, 100); }; // debug: pin a stage
  window.__heroLive = () => { dbg = null; };

  loop();
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { if (!raf) loop(); } else { cancelAnimationFrame(raf); raf = null; } }), { threshold: 0 }).observe(hero);
}

/* ── helpers ── */
function strut(group, a, b, thick, mat) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), len = va.distanceTo(vb);
  const m = new THREE.Mesh(new THREE.BoxGeometry(thick, len, thick), mat);
  m.position.copy(va).lerp(vb, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), vb.clone().sub(va).normalize());
  group.add(m);
}
function lerp(a,b,t){ return a+(b-a)*t; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function smooth(t){ return t*t*(3-2*t); }
function boxArea(s){ return 2*(s[0]*s[1]+s[1]*s[2]+s[0]*s[2]); }
function pickMass(masses, total){ let r = Math.random()*total; for (const m of masses){ r -= boxArea(m.s); if (r<=0) return m; } return masses[0]; }
function pointOnBox(c, s){
  const hx=s[0]/2, hy=s[1]/2, hz=s[2]/2;
  const faces=[s[1]*s[2],s[1]*s[2],s[0]*s[2],s[0]*s[2],s[0]*s[1],s[0]*s[1]];
  const tot=faces.reduce((a,b)=>a+b,0); let r=Math.random()*tot, f=0;
  for(; f<6; f++){ r-=faces[f]; if(r<=0) break; }
  const u=Math.random()-0.5, v=Math.random()-0.5;
  switch(f){
    case 0: return [c[0]+hx, c[1]+u*s[1], c[2]+v*s[2]];
    case 1: return [c[0]-hx, c[1]+u*s[1], c[2]+v*s[2]];
    case 2: return [c[0]+u*s[0], c[1]+hy, c[2]+v*s[2]];
    case 3: return [c[0]+u*s[0], c[1]-hy, c[2]+v*s[2]];
    case 4: return [c[0]+u*s[0], c[1]+v*s[1], c[2]+hz];
    default:return [c[0]+u*s[0], c[1]+v*s[1], c[2]-hz];
  }
}
function makeDot(){
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.35,'rgba(255,180,178,.9)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.beginPath(); x.arc(32,32,32,0,Math.PI*2); x.fill();
  return new THREE.CanvasTexture(c);
}
