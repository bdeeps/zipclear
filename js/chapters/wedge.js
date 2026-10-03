// Chapter 4: the slider as a wedge. Going down, the diamond is a double wedge driven between the rows.
// Going up, the two side walls are wedges that squeeze the rows together. Forces from js/zipmath.js:
// sideways force on each row = pull ÷ (2·tan(φ + λ)), with tan λ = μ (the standard wedge with friction).
import { THREE, approach, clamp } from '../kit.js';
import { makeZip, board, panelBg, force, rows, fitNarrow, fmtN, wedge, pullForce, Q1, CROSS, COL, inReel, D2R } from '../zip.js';

const S = 0.36, Y0 = 4.8, X0 = 3.1;

export default {
  id: 'wedge',
  short: 'The wedge',
  title: 'A gentle pull, a strong lock',
  subtitle: 'The slider is two wedges back to back. It frees one tooth at a time, so it never fights the whole zip.',
  view: { pos: [0, 5.2, 13.6], target: [0, 5.0, 0] },
  learn: `<p>A closed zip can take a sideways pull of hundreds of newtons. Yet you open it with a pull of a few newtons, about the weight of a mobile phone. How?</p>
    <p>Partly, the slider is a <b>wedge</b>, one of the simple machines (<a href="https://glassbox.how/forceclear/">ForceClear</a> has more on forces). When you pull the slider down, the <b>diamond</b> drives between the two rows. Your pull along the zip becomes a push <i>sideways</i> on each row. For a wedge with half-angle φ, each row feels pull ÷ (2 × tan φ). A slim wedge gives a big sideways push for a small pull. A blunt one gives less.</p>
    <p><b>Friction</b> eats into that. With friction μ the rule becomes pull ÷ (2 × tan(φ + λ)), where tan λ = μ (see <a href="https://glassbox.how/frictionclear/">FrictionClear</a>). That is why rubbing a stiff zip with candle wax, soap or a pencil lead helps so much.</p>
    <p>Why not make the wedge very slim? Try it. Below about 20° the heads have not swung clear of each other by the time the rows meet, and they collide. And a slim wedge needs a long slider. Real sliders settle near 25°.</p>
    <p>The bigger secret is this: the slider only ever deals with <b>one tooth at a time</b>. It bends the tape and lets a single head tip out. It never has to beat the whole locked chain. When the slider goes up, the side walls are the wedges, and they press each head home in the same way.</p>
    <p class="tip"><b>Try it:</b> make the metal gritty and watch the pull climb. Then wax it. Then slim the wedge and see what you gain.</p>`,
  terms: [
    { t: 'Wedge', d: 'A simple machine: a slope that turns a push in one direction into a push at right angles to it.' },
    { t: 'Mechanical advantage', d: 'How many times a machine multiplies your force. For a slim wedge it is more than 1.' },
    { t: 'Half-angle (φ)', d: 'The angle between the middle line of a wedge and one of its faces.' },
    { t: 'Friction coefficient (μ)', d: 'A number for how much two surfaces resist sliding. Waxed metal is about 0.1, dry brass about 0.35.' },
    { t: 'Newton (N)', d: 'The unit of force. A 100 gram apple weighs about 1 N.' },
  ],
  defaults: { phi: 25, mu: 0.2, run: true },
  controls: [
    { key: 'phi', type: 'range', label: 'Half-angle of the wedge', min: 20, max: 40, step: 1, ends: ['slim', 'blunt'], fmt: (v) => Math.round(v) + '°' },
    { key: 'mu', type: 'range', label: 'Friction', min: 0.05, max: 0.6, step: 0.01, ends: ['waxed', 'gritty'], fmt: (v) => 'μ = ' + v.toFixed(2) },
    { key: 'run', type: 'toggle', label: 'Keep sliding' },
  ],
  quiz: [
    { q: 'What does the diamond turn your downward pull into?', options: ['Heat only', 'A sideways push on each row of teeth', 'A twist of the pull tab', 'Nothing'], answer: 1, why: 'It is a wedge. A push along a wedge comes out as a push at right angles to its faces.' },
    { q: 'Why does wax make a stiff zip easier?', options: ['It makes the teeth bigger', 'It lowers friction, so less of your pull is wasted rubbing', 'It glues the teeth', 'It bends the tape'], answer: 1, why: 'The sideways push is pull ÷ (2 × tan(φ + λ)). Less friction means a smaller λ and more push for the same pull.' },
    { q: 'A zip holds hundreds of newtons sideways but opens with a few. Why?', options: ['The slider is very strong', 'The slider frees one tooth at a time by bending the tape, instead of fighting the whole chain', 'Sideways forces are always weaker', 'The teeth are magnets'], answer: 1, why: 'Pulling sideways loads every tooth at once, and they are all locked. The slider unlocks them singly.' },
  ],
  reel: [
    { ms: 5800, caption: 'The slider is a wedge: a gentle pull along the zip becomes a firm push sideways.', set: { phi: 25, run: true }, anim: { mu: [0.5, 0.1] }, view: { pos: [1.2, 4.6, 8.4], target: [1.2, 4.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    stage.floor.visible = false;
    const holder = new THREE.Group(); holder.scale.setScalar(S); stage.root.add(holder);
    const frame = new THREE.Group(); holder.add(frame);            // rides with the slider: arrows and labels
    let zip = null, built = 0;
    const rebuild = (phi) => {
      if (zip) { holder.remove(zip.g); zip.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose?.(); }); }
      zip = makeZip({ kind: 'metal', n: 34, A: phi }); holder.add(zip.g);
      zip.slider.see(true); zip.slider.pull.visible = false; built = phi;
    };
    rebuild(25);
    const aPull = force(COL.hot, 0.22, 1.4), aL = force(COL.push, 0.22, 1.4), aR = force(COL.push, 0.22, 1.4); frame.add(aPull, aL, aR);
    const lbl = {
      pull: stage.label('Your pull', [3.4, -9.5, 3], frame, 'hot'),
      side: stage.label('Push on each row', [-10.5, 4.4, 3], frame),
      state: stage.label('', [0, -12, 3], frame, 'hot'),
    };
    const cur = { phi: 25, mu: 0.2 };
    const chart = board(stage.root, 6.4, 4.4, 720, 496, (c, w, h) => {
      panelBg(c, w, h);
      c.fillStyle = '#e8eef8'; c.font = 'bold 28px sans-serif'; c.fillText('Sideways push per newton of pull', 26, 44);
      c.font = '21px sans-serif'; c.fillStyle = 'rgba(255,255,255,.62)'; c.fillText('1 ÷ (2 × tan(φ + λ)),  tan λ = μ', 26, 74);
      const x0 = 80, y0 = h - 70, cw = w - 118, ch = h - 178, GM = 2;
      const X = (p) => x0 + (cw * (p - 10)) / 40, Y = (v) => y0 - (ch * Math.min(v, GM)) / GM;
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2; c.fillStyle = 'rgba(255,255,255,.65)'; c.font = '20px sans-serif';
      for (const v of [0, 0.5, 1, 1.5, 2]) { c.beginPath(); c.moveTo(x0, Y(v)); c.lineTo(x0 + cw, Y(v)); c.stroke(); c.fillText(v.toFixed(1), x0 - 44, Y(v) + 7); }
      for (const p of [10, 20, 30, 40, 50]) c.fillText(p + '°', X(p) - 14, y0 + 30);
      c.fillText('half-angle φ', x0 + cw - 120, y0 + 56);
      // Below 20° the heads collide in the model, so that part of the curve is out of reach.
      c.fillStyle = 'rgba(255,90,138,.16)'; c.fillRect(X(10), y0 - ch, X(20) - X(10), ch);
      c.fillStyle = '#ff5a8a'; c.font = 'bold 19px sans-serif'; c.fillText('teeth collide', X(10) + 8, y0 - 12);
      const curve = (mu, color, dash) => {
        c.strokeStyle = color; c.lineWidth = 5; c.setLineDash(dash); c.beginPath();
        for (let p = 10, first = true; p <= 50; p += 0.5) { const v = wedge(p, mu).gain; first ? c.moveTo(X(p), Y(v)) : c.lineTo(X(p), Y(v)); first = false; }
        c.stroke(); c.setLineDash([]);
      };
      curve(0, 'rgba(255,255,255,.45)', [10, 8]); curve(cur.mu, '#ffb547', []);
      c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '19px sans-serif'; c.fillText('no friction', X(36), Y(wedge(36, 0).gain) - 12);
      const v = wedge(cur.phi, cur.mu).gain;
      c.fillStyle = '#8ef0ff'; c.beginPath(); c.arc(X(cur.phi), Y(v), 12, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
      c.font = 'bold 24px sans-serif'; c.fillText('× ' + v.toFixed(2), X(cur.phi) + 18, Y(v) - 14);
    }, [-3.7, 2.2, 0.5], 0);
    let ph = 0, dir = -1, m = 0, pending = null, wait = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const phi = Math.round(s.phi);
        // Rebuild the slider when the angle settles (not on every pixel of a drag).
        if (phi !== built) { if (pending !== phi) { pending = phi; wait = 0; } wait += dt; if (wait > 0.12 || inReel()) rebuild(phi); }
        const span = zip.k.P * 3;
        if (s.run) { ph += dt * 0.42; }
        const tri = Math.abs(((ph % 2) + 2) % 2 - 1);                 // 1 → 0 → 1
        dir = ((ph % 2) + 2) % 2 < 1 ? -1 : 1;
        m = zip.mOf(0.5) + span * (tri - 0.5);
        zip.set(m);
        holder.position.set(X0, Y0 - m * S, 0);
        frame.position.y = m;
        const w = wedge(s.phi, s.mu), F = pullForce(s.phi, s.mu), a = s.phi * D2R, Q = Q1 / Math.cos(a);
        const sl = zip.slider, k = 1.5;                                 // mm of arrow per newton
        const opening = dir < 0;
        aPull.aim([0, opening ? -sl.Lm - 0.5 : sl.Lt + 0.5, 3.2], [0, dir, 0], clamp(F * k, 2, 14));
        if (opening) {
          const y = sl.tipY + 1.6, x = (y - sl.tipY) * Math.tan(a);
          aL.aim([-x, y, 3.2], [-Math.cos(a), -Math.sin(a), 0], Q * k * 2.2); aR.aim([x, y, 3.2], [Math.cos(a), -Math.sin(a), 0], Q * k * 2.2);
        } else {
          const p = zip.path(zip.path.s1 * 0.6), x = p.x - zip.k.LEG - 0.9 - Q * k * 2.2 * Math.cos(a), y = p.y - Q * k * 2.2 * Math.sin(a);
          aL.aim([x, y, 3.2], [Math.cos(a), Math.sin(a), 0], Q * k * 2.2); aR.aim([-x, y, 3.2], [-Math.cos(a), Math.sin(a), 0], Q * k * 2.2);
        }
        lbl.pull.position.set(4.2, opening ? -sl.Lm - 5 : sl.Lt + 6, 3);
        lbl.side.position.set(-11, opening ? sl.tipY + 0.5 : 0.5, 3);
        if (cur.phi !== s.phi || cur.mu !== s.mu) { cur.phi = s.phi; cur.mu = s.mu; chart.redraw(); }
        const narrow = fitNarrow(stage, [lbl.side, lbl.pull], -0.14);
        const msg = narrow ? (opening ? 'Opening' : 'Closing') : opening ? 'Opening: the diamond wedges the rows apart' : 'Closing: the side walls wedge the rows together';
        if (lbl.state.element.textContent !== msg) lbl.state.element.textContent = msg;
        chart.mesh.visible = !narrow;
        chart.place(inReel(), [1.2, 0.2, 1.5], 0.8);
        holder.position.x = narrow ? 0 : inReel() ? 1.2 : X0;
      },
      dispose() { stage.floor.visible = true; },
      readout: (s) => {
        const w = wedge(s.phi, s.mu), F = pullForce(s.phi, s.mu);
        return rows(`A pull of about ${fmtN(F)}`, [
          ['Sideways push per newton of pull', '× ' + w.gain.toFixed(2), w.gain >= 1 ? 'ok' : ''],
          ['The same wedge with no friction', '× ' + w.ideal.toFixed(2)],
          ['Lost to rubbing', Math.round((1 - w.eff) * 100) + '%'],
          ['The closed chain holds, sideways', `${CROSS.metal} N per 25 mm`],
          ['That is', `${Math.round(CROSS.metal / F)} times your pull`],
        ], 3, 'The pull is a model: about 1 N to tip each tooth out, plus the tapes rubbing in the slider.');
      },
    };
  },
};
