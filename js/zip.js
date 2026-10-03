// ZipClear's shared 3D parts: a whole zip (tapes, teeth, stops and a slider built to fit them), single
// teeth for close-ups, chart boards, force arrows and small layout helpers.
// The numbers and the geometry of the tapes' path live in js/zipmath.js. Models are built in
// millimetres inside a group that each chapter scales, so every size here is a real size.
//   +y runs up the chain (the way you pull to close), x is across the zip, +z faces you.
import { THREE, M, box, arrow, clamp } from './kit.js';
import { KINDS, toothOutline, makePath, placeOutline } from './zipmath.js';

export * from './zipmath.js';

export const COL = { tape: 0x2f3f6e, cord: 0x55689f, brass: 0xd9b25f, steel: 0xc3c8d1, dark: 0x565c69, diamond: 0xff5a8a, flange: 0xffb547, hot: 0x8ef0ff, good: 0x5ce1a9, bad: 0xff5a8a, stop: 0xb48cff, pin: 0x5ce1a9, push: 0xffb547 };

// ---------------------------------------------------------------- layout and readout helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowScreen = () => window.innerWidth < 560 && !inReel();
// A readout: a headline and rows of [label, value, class]. A phone keeps only the first few rows.
export function rows(head, list, keep = 3, note = '') {
  return `<div class="big">${head}</div>` + (narrowScreen() ? list.slice(0, keep) : list).map(([a, b, cls]) => `<div class="row"><span>${a}</span><b${cls ? ` class="${cls}"` : ''}>${b}</b></div>`).join('') + (note && !narrowScreen() ? `<small>${note}</small>` : '');
}
// On a phone-width stage, hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y = -0.13, wideX = 0) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const sy = narrow ? y : 0, sx = narrow || inReel() ? 0 : wideX;
  if (!stage.shift || stage.shift[1] !== sy || stage.shift[0] !== sx) stage.setShift(sx, sy);
  return narrow;
}
export const fmtN = (F) => (!isFinite(F) ? 'no limit' : F >= 100 ? Math.round(F / 10) * 10 + ' N' : F >= 10 ? F.toFixed(0) + ' N' : F.toFixed(1) + ' N');
export const mm = (v, d = 2) => v.toFixed(d) + ' mm';

// A chart board: a canvas on a plane. Returns { mesh, redraw, place }.
export function board(root, w, h, pxW, pxH, draw, pos, rotY = 0) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(...pos); mesh.rotation.y = rotY; root.add(mesh);
  const b = { mesh, redraw, home: { p: new THREE.Vector3(...pos), r: rotY } };
  // In the tall video frame, and on a phone, the board moves to another place.
  b.place = (alt, pos2, scale = 1, rot = 0) => {
    if (alt) { mesh.position.set(...pos2); mesh.rotation.y = rot; mesh.scale.setScalar(scale); }
    else { mesh.position.copy(b.home.p); mesh.rotation.y = b.home.r; mesh.scale.setScalar(1); }
  };
  return b;
}
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,.9)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill(); }

// A straight arrow that can point any way: aim(from, dir, len), all in the parent's units.
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function force(color, r = 0.12, head = 0.7) {
  const a = arrow(color, 1, head, r);
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-9) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    a.visible = len > head * 0.4;
  };
  return a;
}
// A material whose see-through state can be switched.
export function seeMat(mat, opacity = 0.16) {
  mat.transparent = true;
  mat.see = (on, o = opacity) => { mat.opacity = on ? o : 1; mat.depthWrite = !on; };
  return mat;
}

// ---------------------------------------------------------------- geometry
const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
function shapeOf(points, holes = []) {
  const sh = new THREE.Shape(points.map(([a, b]) => new THREE.Vector2(a, b)));
  holes.forEach((h) => { const p = new THREE.Path(); p.setFromPoints(h.map(([a, b]) => new THREE.Vector2(a, b))); sh.holes.push(p); });
  return sh;
}
// A flat plate: an outline in the XY plane, from z0 to z1.
export function plateXY(points, z0, z1, mat, holes = []) {
  const g = new THREE.ExtrudeGeometry(shapeOf(points, holes), { depth: z1 - z0, bevelEnabled: false, curveSegments: 24 });
  g.translate(0, 0, z0);
  return shadowed(new THREE.Mesh(g, mat));
}
const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();

// One tooth as a solid: the outline from zipmath, as thick as the chain (k.Z). side −1 = left row.
export function toothGeometry(k = KINDS.metal, side = -1, opt = {}) {
  let pts = toothOutline(k, opt);
  if (side > 0) pts = mirror(pts);
  const bz = 0.07;
  const g = new THREE.ExtrudeGeometry(shapeOf(pts), { depth: k.Z - 2 * bz, bevelEnabled: true, bevelSize: bz, bevelOffset: -bz, bevelThickness: bz, bevelSegments: 1 });
  g.translate(0, 0, -k.Z / 2 + bz);
  return g;
}
function merge(geos) {
  const parts = geos.map((g) => g.toNonIndexed());
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal']) {
    const n = parts.reduce((a, p) => a + p.attributes[name].array.length, 0), arr = new Float32Array(n);
    let o = 0; parts.forEach((p) => { arr.set(p.attributes[name].array, o); o += p.attributes[name].array.length; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  geos.forEach((g) => g.dispose()); parts.forEach((g) => g.dispose());
  return out;
}
// One turn of a coil zip: a loop of thread from the cord out to a flattened head and back.
export function coilGeometry(k = KINDS.coil, side = -1) {
  const r = (k.P - k.T - 2 * k.C) / 2, uA = -k.LEG, uB = k.U0 - 0.1, uc = (uA + uB) / 2, a = (uB - uA) / 2, bz = k.Z / 2 - r, pts = [];
  for (let i = 0; i <= 28; i++) {
    const t = -Math.PI + (2 * Math.PI * i) / 28;
    // The thread crosses from the back of the tape to the front at the head, climbing one pitch per turn.
    pts.push(new THREE.Vector3(side * -(uc + a * Math.cos(t)), (k.P * t) / (2 * Math.PI) * (1 - 0.75 * Math.pow(Math.cos(t / 2), 6)), bz * Math.sin(t)));
  }
  const loop = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 7, false);
  const head = new THREE.SphereGeometry(0.5, 14, 10);
  head.scale((k.TIP + 0.15), k.T, k.Z * 0.62);
  head.translate(side * -(k.U0 + k.TIP / 2 - 0.05), 0, 0);
  return merge([loop, head]);
}

// A flat strip through K pairs of points, redrawn whenever the tape moves: put(i, x0, y0, x1, y1), done().
export function makeRibbon(K, z, mat) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(K * 6), nor = new Float32Array(K * 6), idx = [];
  for (let i = 0; i < K; i++) { nor[i * 6 + 2] = nor[i * 6 + 5] = 1; if (i < K - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.frustumCulled = false;
  return {
    mesh, geo,
    put(i, x0, y0, x1, y1) { pos[i * 6] = x0; pos[i * 6 + 1] = y0; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x1; pos[i * 6 + 4] = y1; pos[i * 6 + 5] = z; },
    done() { geo.attributes.position.needsUpdate = true; },
  };
}

// ---------------------------------------------------------------- the slider, cut to fit the teeth
// The channel is whatever shape the teeth sweep out as they follow the path, plus a little clearance:
// the side walls (flanges) press on the backs of the teeth, and the diamond fills the space the heads
// leave when the rows part. So the slider is a mould of the motion, which is how real ones are designed.
function sliderOutline(k, path, Lm, Lt) {
  const base = toothOutline(k), dense = [];
  base.forEach((p, i) => { const q = base[(i + 1) % base.length]; for (let j = 0; j < 10; j++) dense.push([p[0] + ((q[0] - p[0]) * j) / 10, p[1] + ((q[1] - p[1]) * j) / 10]); });
  const dy = 0.1, N = Math.round((Lm + Lt) / dy) + 1, mn = new Array(N).fill(1e9), mx = new Array(N).fill(-1e9);
  for (let rel = -Lm - k.P; rel < Lt + 8; rel += 0.03) {
    for (const [x, y] of placeOutline(dense, path(rel), -1)) {
      const i = Math.round((y + Lm) / dy); if (i < 0 || i >= N) continue;
      if (x < mn[i]) mn[i] = x; if (x > mx[i]) mx[i] = x;
    }
  }
  const ys = mn.map((_, i) => -Lm + i * dy);
  return { ys, mn, mx, N };
}

export function makeSlider(k, path, { Lm = 4.2, Lt = 7.6, pin = false } = {}) {
  const g = new THREE.Group(), e = sliderOutline(k, path, Lm, Lt), clr = 0.14, wall = 0.9, zh = k.Z / 2 + 0.16, plate = 0.75;
  const inner = e.ys.map((y, i) => [e.mn[i] - clr, y]), outer = inner.map(([x, y]) => [x - wall, y]);
  const bodyMat = seeMat(M.metal(COL.steel, { roughness: 0.34, side: THREE.DoubleSide }));
  const wallMat = seeMat(M.metal(COL.steel, { roughness: 0.34, side: THREE.DoubleSide }));
  const backMat = M.metal(COL.dark, { roughness: 0.5 });
  // Top and bottom plates: the outer outline, mirrored.
  const outline = [...outer, ...mirror(outer)];
  const top = plateXY(outline, zh, zh + plate, bodyMat), bottom = plateXY(outline, -zh - plate, -zh, backMat);
  // Flanges: lips on each plate that turn in towards each other and leave a slot for the tape.
  const slot = 0.42, strip = [...outer, ...[...inner].reverse()];
  const flanges = new THREE.Group();
  for (const pts of [strip, mirror(strip)]) { flanges.add(plateXY(pts, slot, zh, wallMat), plateXY(pts, -zh, -slot, wallMat)); }
  // The diamond: the wedge between the two throats. It joins the plates.
  let i0 = e.mx.findIndex((x, i) => x + clr < -0.02 && e.ys[i] > 0.3); if (i0 < 0) i0 = e.N - 2;
  const dl = []; for (let i = i0; i < e.N; i++) dl.push([Math.min(-0.02, e.mx[i] + clr), e.ys[i]]);
  const tipY = e.ys[i0] - 0.25;
  const diamondPts = [[0, tipY], ...mirror(dl).reverse(), ...dl.slice().reverse()];
  const diamondMat = M.plastic(COL.diamond, { roughness: 0.35, metalness: 0.3 });
  const diamond = plateXY(diamondPts, -zh, zh, diamondMat);
  // Half-angle of the wedge, measured on the model (it comes out close to the throat angle A).
  const j = Math.min(dl.length - 1, 30), halfAngle = dl.length > 4 ? Math.atan2(-dl[j][0], dl[j][1] - tipY) / (Math.PI / 180) : k.A;
  // The bridge (crown) on the front plate, and the pull tab hanging from it.
  const zt = zh + plate, by = Lt * 0.36;
  const bridge = new THREE.Group();
  const bar = box(1.7, 5.6, 0.7, bodyMat); bar.position.set(0, by - 1.2, zt + 1.25); bridge.add(bar);
  for (const y of [by + 1.25, by - 3.65]) { const post = box(1.7, 0.7, 1.3, bodyMat); post.position.set(0, y, zt + 0.6); bridge.add(post); }
  const pull = new THREE.Group(); pull.position.set(0, by + 0.5, zt + 0.62);
  const pw = 2.6, pl = 15;
  const tab = plateXY([[-1.5, 0.9], [1.5, 0.9], [pw, -2.5], [pw, -pl + 1.4], [pw - 1.4, -pl], [-pw + 1.4, -pl], [-pw, -pl + 1.4], [-pw, -2.5]], -0.35, 0.35, bodyMat,
    [[[-0.9, 0.35], [-0.9, -1.5], [0.9, -1.5], [0.9, 0.35]], [[-1.3, -pl + 4.4], [-1.3, -pl + 1.6], [1.3, -pl + 1.6], [1.3, -pl + 4.4]]]);
  pull.add(tab);
  g.add(bottom, flanges, diamond, top, bridge, pull);
  // A locking pin: a prong on a spring that drops through the front plate into a gap between teeth.
  let pinG = null;
  const pinX = -(k.U0 - 0.25), pinY = -Lm + 1.75;
  if (pin) {
    pinG = new THREE.Group(); pinG.position.set(pinX, pinY, 0);
    const prong = box(0.8, 0.72, k.Z / 2 + plate + 1.0, M.metal(COL.pin, { roughness: 0.35, metalness: 0.5 })); prong.position.z = (k.Z / 2 + plate + 1.0) / 2;
    const arm = box(0.8, by + 0.4 - pinY, 0.5, M.metal(COL.pin, { roughness: 0.35, metalness: 0.5 })); arm.position.set(0, (by + 0.4 - pinY) / 2, k.Z / 2 + plate + 0.95);
    const arm2 = box(Math.abs(pinX) + 0.4, 0.8, 0.5, M.metal(COL.pin, { roughness: 0.35, metalness: 0.5 })); arm2.position.set(-pinX / 2, by + 0.4 - pinY, k.Z / 2 + plate + 0.95);
    pinG.add(prong, arm, arm2); g.add(pinG);
  }
  const api = {
    g, top, bottom, flanges, diamond, bridge, pull, pinG, Lm, Lt, halfAngle, tipY, pinX, pinY, zt,
    width: -2 * outer[outer.length - 1][0], mouth: -2 * inner[0][0], length: Lm + Lt,
    see(on, o = 0.13) { bodyMat.see(on, o); wallMat.see(on, 0.5); wallMat.color.setHex(on ? COL.flange : COL.steel); },
    // 0 = lying flat down the chain, 1 = lifted straight out, 2 = flat, pointing up the zip.
    setPull(a) { pull.rotation.x = -a * Math.PI / 2; },
    setPin(lift) { if (pinG) pinG.position.z = lift * (k.Z / 2 + 0.5); },
    // Spread: the channel has worn wider by this many mm (drawn 1:1, so it is subtle, as in life).
    setSpread(d) { flanges.children.forEach((f, i) => { f.position.x = (i < 2 ? -1 : 1) * d / 2; }); top.position.z = d * 0.6; bridge.position.z = d * 0.6; pull.position.z = zt + 0.62 + d * 0.6; },
  };
  return api;
}

// ---------------------------------------------------------------- a whole zip
// n teeth on each tape. Left teeth sit at 0, P, 2P … along their tape; right teeth are half a pitch on.
// set(m) puts the slider with its merge point m mm up the chain and places every tooth on its path.
export function makeZip({ kind = 'metal', n = 30, tapeW = 12, tail = 9, A, R, pin = false, bump = true } = {}) {
  const k = { ...KINDS[kind] }; if (A) k.A = A; if (R) k.R = R;
  const path = makePath(k);
  const g = new THREE.Group();
  const coil = kind === 'coil';
  const toothMat = coil ? M.plastic(0xffffff, { roughness: 0.4 }) : kind === 'moulded' ? M.plastic(0xffffff, { roughness: 0.42 }) : M.metal(0xffffff, { roughness: 0.32, metalness: 0.85 });
  const geoL = coil ? coilGeometry(k, -1) : toothGeometry(k, -1, { bump }), geoR = coil ? coilGeometry(k, 1) : toothGeometry(k, 1, { bump });
  const teeth = [new THREE.InstancedMesh(geoL, toothMat, n), new THREE.InstancedMesh(geoR, toothMat, n)];
  teeth.forEach((t) => { t.instanceMatrix.setUsage(THREE.DynamicDrawUsage); t.castShadow = true; t.frustumCulled = false; g.add(t); });
  const base = new THREE.Color(k.color), hot = new THREE.Color(COL.hot), open = new THREE.Color(k.color).multiplyScalar(0.72), tmpC = new THREE.Color();

  // Tapes: woven ribbons that follow the path, each with a thicker corded edge the teeth grip.
  const sA = -tail - k.P, sB = n * k.P + tail, K = Math.ceil((sB - sA) / 0.7) + 1;
  const tapeMat = M.matte(COL.tape, { side: THREE.DoubleSide }), cordMat = M.matte(COL.cord, { side: THREE.DoubleSide });
  const ribbon = (u0, u1, z, mat) => { const r = makeRibbon(K, z, mat); g.add(r.mesh); r.u0 = u0; r.u1 = u1; return r; };
  const tapes = [-1, 1].map((side) => ({ side, parts: [ribbon(-tapeW, 0.35, 0, tapeMat), ribbon(-0.5, 0.5, 0.42, cordMat), ribbon(-0.5, 0.5, -0.42, cordMat)] }));

  // Stops. The bottom stop clamps both tapes together; a top stop on each tape keeps the slider on.
  const stopMat = M.metal(COL.stop, { roughness: 0.35, metalness: 0.7 });
  const bottomStop = box(2 * (k.U0 + k.LEG) + 0.5, 2.6, k.Z + 0.5, stopMat); bottomStop.position.y = -k.P * 0.5 - 1.75; g.add(bottomStop);
  const topStops = [-1, 1].map(() => { const s = box(2.3, 1.7, k.Z + 0.4, stopMat); g.add(s); return s; });
  const sTop = (n - 0.5) * k.P + k.P * 0.95;

  const slider = makeSlider(k, path, { pin }); g.add(slider.g);
  // How far up a top stop can travel before it meets the slider's shoulder.
  let relTop = 0; while (path(relTop).y < slider.Lt + 0.9 && relTop < 40) relTop += 0.05;
  const mMin = slider.Lm - k.P * 0.5 - 0.35, mMax = sTop - relTop;

  const o3 = new THREE.Object3D();
  const cur = { m: 0 };
  // Where a point s mm along a tape sits. opts: spread (loose slider), bulge { y0, y1, amp }.
  function at(s, side, m, o) {
    const rel = s - m, p = path(rel);
    let x = p.x, y = p.y + m, phi = p.phi;
    if (rel < 0 && o) {
      if (o.spread) x -= (o.spread / 2) * clamp(-rel / 1.5, 0, 1);
      const b = o.bulge;
      if (b && b.amp > 0.001 && y > b.y0 && y < b.y1) {
        const t = (y - b.y0) / (b.y1 - b.y0), sn = Math.sin(Math.PI * t);
        x -= b.amp * sn * sn;
        phi += Math.atan((b.amp * 2 * sn * Math.cos(Math.PI * t) * Math.PI) / (b.y1 - b.y0));
      }
    }
    return { x: side < 0 ? x : -x, y, phi: side < 0 ? phi : -phi, rel };
  }
  const api = {
    g, k, path, slider, teeth, n, kind, mMin, mMax, sTop, bottomStop, topStops, tapes, at: (s, side, m = cur.m, o = cur.o) => at(s, side, m, o),
    toothS: (i, side) => (side < 0 ? i : i + 0.5) * k.P,
    // The merge point for a zip that is closed by fraction f (0 = open, 1 = shut).
    mOf: (f) => mMin + (mMax - mMin) * clamp(f, 0, 1),
    meshed: (m = cur.m) => clamp(Math.floor(m / (k.P / 2)) + 1, 0, 2 * n),
    set(m, o = {}) {
      m = clamp(m, mMin, mMax); cur.m = m; cur.o = o;
      slider.g.position.y = m;
      for (const [ti, side] of [[0, -1], [1, 1]]) {
        const mesh = teeth[ti];
        for (let i = 0; i < n; i++) {
          const s = api.toothS(i, side), p = at(s, side, m, o);
          const gone = o.missing && o.missing.side === side && o.missing.i === i;
          o3.position.set(p.x, p.y, o.teethZ || 0); o3.rotation.set(0, 0, p.phi); o3.scale.setScalar(gone ? 0.0001 : 1); o3.updateMatrix();
          mesh.setMatrixAt(i, o3.matrix);
          // Colour: bright while a tooth is in the throat, where it is tipping in or out.
          const inThroat = p.rel > -k.P * 0.25 && p.rel < path.s1 + k.P * 0.6;
          tmpC.copy(p.rel <= 0 ? base : open); if (o.glow !== false && inThroat) tmpC.lerp(hot, 0.75);
          if (o.tint) o.tint(tmpC, i, side, p);
          mesh.setColorAt(i, tmpC);
        }
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        const tape = tapes[ti];
        for (const part of tape.parts) {
          for (let i = 0; i < K; i++) {
            const s = sA + ((sB - sA) * i) / (K - 1), p = at(s, side, m, o);
            // u points towards the middle of the chain: (cos φ, sin φ) for the left tape, mirrored for the right.
            // Cloth cannot follow a 6 mm bend across its whole width, so the outer edge just keeps its distance.
            const ux = -side * Math.cos(p.phi), uy = -side * Math.sin(p.phi);
            if (part.u0 < -2) part.put(i, p.x - side * part.u0, p.y, p.x + ux * part.u1, p.y + uy * part.u1);
            else part.put(i, p.x + ux * part.u0, p.y + uy * part.u0, p.x + ux * part.u1, p.y + uy * part.u1);
          }
          part.done();
        }
        const tp = at(sTop, side, m, o); topStops[ti].position.set(tp.x - side * 0.3 * Math.cos(tp.phi), tp.y - side * 0.3 * Math.sin(tp.phi), 0); topStops[ti].rotation.z = tp.phi;
      }
    },
  };
  api.set(mMin);
  return api;
}

// ---------------------------------------------------------------- small extras
// A pair of pliers' jaws, for the worn-slider fix: two steel bars that close on the slider's sides.
export function makeJaws(len = 9) {
  const g = new THREE.Group(), mat = M.metal(0x8b93a3, { roughness: 0.45 });
  const a = box(3.2, len, 4.2, mat), b = box(3.2, len, 4.2, mat); g.add(a, b);
  g.gap = (w) => { a.position.x = -w / 2 - 1.6; b.position.x = w / 2 + 1.6; };
  g.gap(20);
  return g;
}
