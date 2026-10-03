// Chapter 2: three teeth, close up. Two teeth of the left row with one tooth of the right row between
// them, drawn as a slice through the middle so the bump and the hollow show.
// The lock is geometry: see playAt() and NEED in js/zipmath.js.
import { THREE, M, approach, smooth, clamp, sphere } from '../kit.js';
import { KINDS, toothGeometry, makeRibbon, force, rows, fitNarrow, mm, playAt, freeRadius, COL, CROSS, inReel } from '../zip.js';

const S = 1.0, k = KINDS.metal, YC = 4.2, XC = 0.5;
const R_MIN = 4;                                   // mm: the tightest bend the control allows
const PER_TOOTH = CROSS.metal / (25 / (k.P / 2));  // N: share of the crosswise strength carried by one head

export default {
  id: 'teeth',
  short: 'Bump and hollow',
  title: 'Why locked teeth cannot pull apart',
  subtitle: 'Every tooth has a bump on top and a hollow underneath. Stack them and they trap each other.',
  view: { pos: [0, 5.2, 15.2], target: [0, 5.0, 0] },
  learn: `<p>Here are three teeth from a closed zip, sliced through the middle. Two belong to the left tape and the one between them belongs to the right tape.</p>
    <p>Each tooth has two <b>legs</b> that grip the cord of its tape, and a <b>head</b> that reaches past the middle of the chain. On top of the head is a small <b>bump</b>. Underneath is a <b>hollow</b> of the same shape. In a closed zip the heads are stacked like a pile of cups: every bump sits in the hollow of the tooth above.</p>
    <p>Now pull the tapes apart sideways. The middle tooth wants to slide out, but to do that it would have to <b>climb over</b> the bump below it, and at the same moment <b>drop off</b> the bump it is holding from above. It needs spare room, or <b>play</b>, of about two bump heights. It has almost none, because its neighbours are fixed to one tape, exactly one pitch apart. Pulling harder only pulls that tape straighter and tighter. So the zip holds.</p>
    <p>There is one way out. <b>Bend</b> the left tape so its teeth are on the outside of the curve, and the two heads fan apart. The gap between them grows by pitch × height ÷ radius: here 2.6 mm × 1.9 mm ÷ the radius of the bend. Bend it tightly enough and the middle tooth is free. Hold that thought: it is exactly what the slider does.</p>
    <p class="tip"><b>Try it:</b> tug sideways with the tape straight. Then bend the tape a little at a time and tug again. Find the bend where the tooth first escapes.</p>`,
  terms: [
    { t: 'Head', d: 'The end of a tooth that reaches into the middle of the chain and carries the bump and the hollow.' },
    { t: 'Bump and hollow', d: 'A small dome on top of each head and a matching dent underneath. The bump of one tooth sits in the hollow of the next.' },
    { t: 'Legs', d: 'The two jaws of a metal tooth, squeezed shut on the corded edge of the tape.' },
    { t: 'Play', d: 'Spare room to move. A locked tooth has a few hundredths of a millimetre.' },
    { t: 'Crosswise strength', d: 'How hard you must pull a closed zip apart sideways before it fails.' },
  ],
  defaults: { fan: 0, pull: 0, apart: 0 },
  controls: [
    { key: 'pull', type: 'range', label: 'Tug the tapes apart sideways', min: 0, max: 1, step: 0.01, ends: ['no pull', 'hard'], fmt: (v) => Math.round(v * PER_TOOTH) + ' N on this tooth' },
    { key: 'fan', type: 'range', label: 'Bend the left tape', min: 0, max: 1, step: 0.005, ends: ['straight', 'tight bend'], fmt: (v) => (v < 0.02 ? 'straight' : 'radius ' + (R_MIN / v).toFixed(1) + ' mm') },
    { key: 'apart', type: 'range', label: 'Lift the stack apart', min: 0, max: 1, step: 0.01, ends: ['stacked', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
  ],
  quiz: [
    { q: 'What stops the middle tooth sliding out sideways?', options: ['Glue between the teeth', 'It would have to climb over one bump and drop off another, and it has no room to', 'The slider is still holding it', 'Friction alone'], answer: 1, why: 'Its bump is in the hollow above and the bump below is in its hollow. With the neighbours one pitch apart, there is no play to lift it clear.' },
    { q: 'You pull a closed zip apart sideways, harder and harder. What happens to the lock?', options: ['It loosens', 'Nothing changes or it gets tighter, because the tapes are pulled straight', 'The teeth melt', 'The slider moves up'], answer: 1, why: 'A sideways pull keeps the tapes straight, and straight tapes keep the heads packed. The zip only gives when teeth tear off or bend.' },
    { q: 'How can a tooth be freed without breaking anything?', options: ['Bend its neighbours\' tape so their heads fan apart', 'Heat it', 'Twist the pull tab', 'Pull along the zip'], answer: 0, why: 'Teeth on the outside of a bend splay apart. The gap grows by pitch × height ÷ radius, and soon it is wide enough.' },
  ],
  reel: [
    { ms: 5600, caption: 'Each tooth has a bump on top and a hollow underneath, stacked like cups.', set: { fan: 0, pull: 0 }, anim: { apart: [1, 0] }, view: { pos: [0, 5.6, 9.5], target: [0, 5.6, 0] }, spin: 0 },
    { ms: 5600, caption: 'Pull sideways and the tooth has no room to climb over the bump. Locked.', set: { fan: 0, apart: 0 }, anim: { pull: [0, 1] }, view: { pos: [0, 5.6, 9.5], target: [0, 5.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); g.scale.setScalar(S); g.position.set(XC, YC, 0); stage.root.add(g);
    const brass = () => M.metal(COL.brass, { roughness: 0.32, metalness: 0.85 });
    const geoL = toothGeometry(k, -1), geoR = toothGeometry(k, 1);
    const mk = (geo, color) => { const m = new THREE.Mesh(geo, brass()); if (color) m.material.color.setHex(color); m.castShadow = true; const h = new THREE.Group(); h.add(m); g.add(h); h.mat = m.material; return h; };
    const L0 = mk(geoL), L1 = mk(geoL), R0 = mk(geoR, 0xe9cf8a);
    const TW = 3.6, K = 26;
    const tapeMat = M.matte(COL.tape, { side: THREE.DoubleSide }), cordMat = M.matte(COL.cord, { side: THREE.DoubleSide });
    const tapeL = makeRibbon(K, 0, tapeMat), cordL = makeRibbon(K, 0.42, cordMat), tapeR = makeRibbon(2, 0, tapeMat), cordR = makeRibbon(2, 0.42, cordMat);
    g.add(tapeL.mesh, cordL.mesh, tapeR.mesh, cordR.mesh);
    const hit = sphere(0.22, M.glow(COL.bad)); g.add(hit);
    const hit2 = sphere(0.22, M.glow(COL.bad)); g.add(hit2);
    const aL = force(COL.push, 0.16, 0.9), aR = force(COL.push, 0.16, 0.9); g.add(aL, aR);
    const L = (t, pos, parent, cls) => stage.label(t, pos, parent, cls);
    const lbl = {
      bump: L('Bump', [k.U0, k.T / 2 + k.B + 0.5, 1.4], L0, 'hot'),
      hollow: L('Hollow', [k.U0, -k.T / 2 - 0.55, 1.4], L1, 'hot'),
      head: L('Head', [-(k.U0 + 0.2), 0, 1.4], R0),
      legs: L('Legs grip the cord', [-2.9, 0, 1.4], L0),
      tapeL: L('Left tape', [-k.U0 - 2.4, -3.1, 0], g),
      tapeR: L('Right tape', [k.U0 + 2.4, -3.1, 0], g),
      state: L('', [k.U0 + 2.2, 2.4, 1.4], g, 'hot'),
    };
    let fan = 0, ap = 0, dx = 0, lifted = false, free = false, play = k.C0, R = Infinity, blocked = 0;
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fan = inReel() ? s.fan : approach(fan, s.fan, 10, dt); ap = inReel() ? s.apart : approach(ap, s.apart, 10, dt);
        R = fan < 0.02 ? Infinity : R_MIN / fan;
        play = playAt(k, R);
        const lift = smooth(ap) * 1.7;
        lifted = lift > k.B * 1.1; free = play >= k.NEED || lifted;
        // The left tape: an arc of radius R through the two left teeth, centred on the middle tooth.
        const cordAt = (d) => {
          if (!isFinite(R)) return { x: -k.U0, y: d, phi: 0 };
          const p = d / R; return { x: -k.U0 - R * (1 - Math.cos(p)), y: R * Math.sin(p), phi: p };
        };
        [[L0, -k.P / 2, -lift], [L1, k.P / 2, lift]].forEach(([t, d, off]) => { const c = cordAt(d); t.position.set(c.x, c.y + off, 0); t.rotation.z = c.phi; });
        for (let i = 0; i < K; i++) {
          const d = -k.P * 1.45 + (k.P * 2.9 * i) / (K - 1), c = cordAt(d), off = lift * clamp(d / (k.P / 2), -1, 1);
          const ux = Math.cos(c.phi), uy = Math.sin(c.phi);
          tapeL.put(i, c.x - TW, c.y + off, c.x + ux * 0.35, c.y + off + uy * 0.35);
          cordL.put(i, c.x - ux * 0.5, c.y + off - uy * 0.5, c.x + ux * 0.5, c.y + off + uy * 0.5);
        }
        tapeL.done(); cordL.done();
        // The middle tooth: it slides out only if it has the play to clear both bumps.
        const want = free ? s.pull * 3.6 : 0.07 * clamp(s.pull * 5, 0, 1);
        dx = inReel() ? want : approach(dx, want, free ? 6 : 20, dt);
        blocked = !free && s.pull > 0.12 ? 1 : 0;
        const jit = blocked ? 0.012 * Math.sin(time * 40) * s.pull : 0;
        R0.position.set(k.U0 + dx + jit, 0, 0);
        for (const [r, z] of [[tapeR, 0], [cordR, 0.42]]) {
          const x0 = z ? k.U0 + dx - 0.5 : k.U0 + dx - 0.35, x1 = z ? k.U0 + dx + 0.5 : k.U0 + dx + TW;
          r.put(0, x0, -k.P * 0.95, x1, -k.P * 0.95); r.put(1, x0, k.P * 0.95, x1, k.P * 0.95); r.done();
        }
        // Where it is caught: the wall of each hollow against the side of each bump.
        const pulse = 0.75 + 0.25 * Math.sin(time * 9);
        hit.visible = hit2.visible = !!blocked;
        hit.position.set(0.55, -k.T / 2 + 0.2, k.Z / 2 + 0.1); hit2.position.set(0.57, k.T / 2 + 0.22, k.Z / 2 + 0.1);
        hit.scale.setScalar(pulse); hit2.scale.setScalar(pulse);
        R0.mat.color.setHex(blocked ? 0xff9d86 : 0xe9cf8a);
        const len = 0.6 + s.pull * 3.2;
        aL.aim([-k.U0 - TW + 0.4, 0, 0.6], [-1, 0, 0], s.pull > 0.03 ? len : 0);
        aR.aim([k.U0 + dx + TW - 0.4, 0, 0.6], [1, 0, 0], s.pull > 0.03 ? len : 0);
        const msg = lift > 0.3 ? '' : free ? (dx > 0.6 ? 'Free: it slides out' : 'Room to slip out') : blocked ? 'Blocked by the bumps' : 'Locked';
        if (lbl.state.element.textContent !== msg) lbl.state.element.textContent = msg;
        lbl.state.visible = !!msg;
        lbl.state.element.style.setProperty('--c', free ? '#5ce1a9' : '#ff5a8a');
        const narrow = fitNarrow(stage, [lbl.legs, lbl.tapeL, lbl.tapeR, lbl.head], -0.1);
        g.position.x = narrow || inReel() ? 0 : XC; g.position.y = inReel() ? 5.6 : YC; g.scale.setScalar(narrow ? 0.9 : S);
        lbl.hollow.visible = lbl.bump.visible = lift > 0.9;
      },
      readout: (s) => rows(lifted ? 'Lifted apart to show the shapes' : free ? '<span class="ok">Free to slip out</span>' : '<span class="no">Locked</span>', [
        ['Play between the two heads', lifted ? 'lifted apart' : mm(play), free ? 'ok' : 'no'],
        ['Play needed: two bump heights', mm(k.NEED)],
        ['Left tape', isFinite(R) ? `bent to ${R.toFixed(1)} mm radius` : 'straight'],
        ['Sideways tug on this tooth', Math.round(s.pull * PER_TOOTH) + ' N'],
      ], 3, `It comes free at a bend of ${freeRadius(k).toFixed(1)} mm or tighter.`),
    };
  },
};
