// Chapter 5: why zips go wrong. A slider whose channel has spread leaves each bump only part of the way
// into its hollow (seatDepth in js/zipmath.js), so a sideways tug rides the teeth apart behind it.
// A missing tooth leaves its two neighbours across the way with nothing to lock on.
import { approach, clamp } from '../kit.js';
import { makeZip, makeJaws, force, rows, fitNarrow, mm, fmtN, seatDepth, holds, looseStrength, CROSS, COL, inReel } from '../zip.js';

const S = 0.115;
const MISS = { side: 1, i: 9 };            // which tooth is missing when the switch is on
const MISS_HOLD = 80;                      // N per 25 mm: with one tooth gone its neighbours can be worked loose (model value)
const TUG_MAX = 300;

export default {
  id: 'faults',
  short: 'When zips fail',
  title: 'Why a zip splits open behind the slider',
  subtitle: 'A slider a fraction of a millimetre too loose, a single lost tooth, a pinch of cloth.',
  view: { pos: [0, 5.4, 14.6], target: [0, 5.2, 0] },
  learn: `<p>You zip up a bag, and the teeth <b>split open again</b> behind the slider. The teeth look fine. The culprit is almost always the slider.</p>
    <p>The slider's whole job is to press each head <b>fully home</b>, so that every bump sits deep in its hollow. It can only do that if its channel is exactly the right size. Sliders are cast from a soft zinc alloy. After thousands of pulls, or one hard yank on a stuffed bag, the two plates and side walls <b>spread</b> by a few tenths of a millimetre. Now the rows come out of the mouth slightly apart, each bump sitting only on the edge of its hollow. The first sideways tug rides them out.</p>
    <p>The repair every roadside bag mender knows: <b>squeeze the slider</b> gently with pliers, one side and then the other, to close the channel back down. Go easy. Cast zinc is brittle and snaps if you crush it. If it has worn too far, a new slider costs very little, and the old teeth work again.</p>
    <p>A <b>missing tooth</b> is harder to cure. The two heads that should lock around it have nothing to hold, so the chain can be worked open at that spot. And <b>cloth caught</b> in the slider jams it for a simple reason: the channel has room for teeth and nothing else. Back the slider off and ease the cloth out sideways. Never force it.</p>
    <p class="tip"><b>Try it:</b> loosen the slider a little at a time and zip up again. Find how much wear it takes before a tug opens the chain. Then squeeze it with the pliers.</p>`,
  terms: [
    { t: 'Seat depth', d: 'How deep a bump sits in the hollow above it. Full depth here is 0.42 mm.' },
    { t: 'Channel', d: 'The space inside the slider that the teeth pass through.' },
    { t: 'Zinc alloy', d: 'The metal most sliders are die-cast from. It is cheap and casts fine detail, but it is soft and brittle.' },
    { t: 'Crosswise strength', d: 'The sideways pull a closed chain can take, tested on 25 mm of zip.' },
  ],
  defaults: { loose: 0.05, tug: 60, missing: false },
  controls: [
    { key: 'loose', type: 'range', label: 'How far the slider has spread', min: 0, max: 0.4, step: 0.01, ends: ['new', 'badly worn'], fmt: (v) => v.toFixed(2) + ' mm' },
    { key: 'tug', type: 'range', label: 'Sideways tug on the closed zip', min: 0, max: TUG_MAX, step: 5, ends: ['none', 'an overstuffed bag'], fmt: (v) => Math.round(v) + ' N per 25 mm' },
    { key: 'missing', type: 'toggle', label: 'One tooth missing' },
    { key: 'fix', type: 'buttons', label: 'Repair', items: [
      { label: 'Zip it up again', act: (s, inst) => inst.rezip() },
      { label: 'Squeeze the slider with pliers', act: (s, inst) => { s.loose = 0.03; inst.squeeze(); inst.rezip(1.7); } },
    ] },
  ],
  quiz: [
    { q: 'A zip keeps opening behind the slider. What is usually worn out?', options: ['The tape', 'The slider: its channel has spread, so it no longer presses the teeth fully together', 'The pull tab', 'The top stops'], answer: 1, why: 'A spread slider leaves each bump only partly in its hollow. The teeth themselves are usually fine.' },
    { q: 'Why does squeezing the slider with pliers often fix it?', options: ['It sharpens the teeth', 'It narrows the channel again, so the heads are pressed fully home', 'It magnetises the slider', 'It shortens the zip'], answer: 1, why: 'The fix puts back the few tenths of a millimetre that wear took away. Squeeze gently: cast zinc is brittle.' },
    { q: 'Why does a bit of cloth jam a slider so firmly?', options: ['Cloth is sticky', 'The channel has room for the teeth and nothing more', 'The diamond is sharp', 'The slider locks itself'], answer: 1, why: 'There is only a fraction of a millimetre of clearance inside. Anything extra wedges tight, and forcing it makes it worse.' },
  ],
  reel: [
    { ms: 5800, caption: 'A worn slider spreads by a few tenths of a millimetre, and the teeth split open behind it.', set: { missing: false, tug: 150 }, anim: { loose: [0.03, 0.4] }, act: (s, inst) => inst.reset(), view: { pos: [0, 5.9, 8.2], target: [0, 5.9, 0] }, spin: 0 },
    { ms: 5600, caption: 'Squeeze the slider gently with pliers and it presses the teeth home again.', set: { missing: false, tug: 150, loose: 0.03 }, act: (s, inst) => { inst.reset(true); inst.squeeze(); inst.rezip(1.7); }, view: { pos: [0, 5.9, 8.2], target: [0, 5.9, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const zip = makeZip({ kind: 'metal', n: 26 });
    zip.g.scale.setScalar(S); zip.g.position.set(1.9, 1.6, 0); stage.root.add(zip.g);
    const { k, slider } = zip;
    slider.see(true); slider.pull.visible = false;
    const jaws = makeJaws(slider.length - 2); slider.g.add(jaws); jaws.position.y = (slider.Lt - slider.Lm) / 2 - 1.5; jaws.visible = false;
    const aL = force(COL.push, 0.5, 2.6), aR = force(COL.push, 0.5, 2.6); zip.g.add(aL, aR);
    const mHome = zip.mOf(0.86);
    const lbl = {
      slider: stage.label('Slider', [slider.width / 2 + 6, 2, 3], slider.g),
      state: stage.label('', [0, -9, 3], zip.g, 'hot'),
      miss: stage.label('Missing tooth', [13, (MISS.i + 0.5) * k.P, 3], zip.g),
      tug: stage.label('Sideways tug', [-28, 26, 3], zip.g),
    };
    // seatAt: the looseness the slider had when it last passed over the chain (the teeth keep that fit).
    let m = mHome, amp = 0, split = false, zipLoose = 0.05, phase = 'rest', hold = 0, squeeze = 0, shown = 0.05, y0 = 0, y1 = 0, why = '';
    const api = {
      rezip(delay = 0) { if (phase === 'rest') { phase = 'wait'; hold = delay; } },
      squeeze() { squeeze = 1.6; },
      reset(open = false) { m = mHome; phase = 'rest'; split = open; amp = open ? 6 : 0; zipLoose = open ? 0.34 : 0.03; why = 'loose'; },
    };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        // The slider runs down and back up when asked, re-meshing the chain with whatever fit it has now.
        if (phase === 'wait') { hold -= dt; if (hold <= 0) phase = 'down'; }
        else if (phase === 'down') { m = Math.max(zip.mMin, m - dt * 46); if (m <= zip.mMin + 0.01) { phase = 'up'; split = false; amp = 0; } }
        else if (phase === 'up') { m = Math.min(mHome, m + dt * 36); zipLoose = s.loose; if (m >= mHome - 0.01) phase = 'rest'; }
        else if (inReel() || Math.abs(s.loose - zipLoose) > 0.001) zipLoose = approach(zipLoose, s.loose, 5, dt);
        const strength = looseStrength(k, 'metal', zipLoose), missHold = s.missing ? Math.min(strength, MISS_HOLD) : strength;
        if (phase === 'rest' && !split) {
          if (!holds(k, zipLoose)) { split = true; why = 'loose'; }
          else if (s.tug > missHold) { split = true; why = s.missing && s.tug <= strength ? 'missing' : 'loose'; }
        }
        // Once open, the gap runs from the bottom stop to the slider's mouth; with a missing tooth it starts there.
        const top = m - slider.Lm - 0.5, bot = -k.P * 0.2;
        const want = split && phase !== 'up' ? clamp(2.2 + s.tug / 40, 2.5, 7.5) * clamp((top - bot) / 30, 0, 1) : 0;
        amp = approach(amp, want, split ? 3.2 : 9, dt);
        if (why === 'missing' && phase === 'rest') { const c = (MISS.i + 0.5) * k.P, ext = 4 + (amp / 7.5) * 60; y0 = Math.max(bot, c - ext); y1 = Math.min(top, c + ext); }
        else { y0 = bot; y1 = top; }
        squeeze = Math.max(0, squeeze - dt);
        shown = approach(shown, s.loose, 6, dt);
        slider.setSpread(shown * 2.2);                       // drawn a little larger than life so the eye can catch it
        jaws.visible = squeeze > 0 && !!jaws.parent;
        jaws.gap(slider.width * 0.72 + shown * 2.2 + 9 * clamp(Math.abs(squeeze - 0.8) / 0.8, 0, 1));
        zip.set(m, {
          spread: zipLoose * 2.2, bulge: amp > 0.01 ? { y0, y1, amp } : null, missing: s.missing ? MISS : null, glow: false,
          tint: (c, i, side, p) => { if (amp > 0.3 && p.rel < 0 && p.y > y0 && p.y < y1) c.lerp({ r: 1, g: 0.35, b: 0.5 }, 0.55); },
        });
        const len = 1 + (s.tug / TUG_MAX) * 15, ym = m * 0.5;
        aL.aim([-(k.U0 + 13 + amp), ym, 2], [-1, 0, 0], s.tug > 4 ? len : 0); aR.aim([k.U0 + 13 + amp, ym, 2], [1, 0, 0], s.tug > 4 ? len : 0);
        lbl.tug.position.set(-(k.U0 + 22 + amp), ym + 5, 3); lbl.tug.visible = s.tug > 4;
        const msg = phase === 'wait' ? 'Squeezing the slider' : phase !== 'rest' ? 'Zipping up again' : split ? (why === 'missing' ? 'Opened at the missing tooth' : 'Split open behind the slider') : 'Holding';
        if (lbl.state.element.textContent !== msg) lbl.state.element.textContent = msg;
        lbl.state.element.style.setProperty('--c', split ? '#ff5a8a' : '#5ce1a9');
        lbl.miss.visible = s.missing;
        const narrow = fitNarrow(stage, [lbl.slider, lbl.tug], -0.1);
        zip.g.position.x = narrow || inReel() ? 0 : 1.9; zip.g.scale.setScalar(narrow ? S * 1.3 : S);
      },
      readout: (s) => {
        const d = seatDepth(k, zipLoose), strength = looseStrength(k, 'metal', zipLoose), hold = s.missing ? Math.min(strength, MISS_HOLD) : strength;
        return rows(split ? '<span class="no">Split open</span>' : '<span class="ok">Holding</span>', [
          ['Bump sits in its hollow by', mm(d) + ` of ${k.B}`, holds(k, zipLoose) ? 'ok' : 'no'],
          ['Sideways pull it can take', hold > 0 ? `about ${Math.round(hold / 5) * 5} N per 25 mm` : 'almost none', hold >= s.tug ? 'ok' : 'no'],
          ['Sideways tug now', Math.round(s.tug) + ' N per 25 mm'],
          ['A new chain takes', `about ${CROSS.metal} N per 25 mm`],
        ], 3, split ? 'Press “Zip it up again”. If the slider is still loose, it will split again.' : '');
      },
    };
  },
};
