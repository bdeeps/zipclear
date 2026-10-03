// Chapter 3: the slider at work, slowly. The camera rides with the slider; the zip moves past it.
// Every tooth follows its tape exactly (js/zipmath.js): the throat bends the tape, the bend fans the
// heads apart, and the heads of the other row tip into the gaps.
import { approach, clamp } from '../kit.js';
import { makeZip, rows, fitNarrow, mm, playAt, inReel } from '../zip.js';

const S = 0.4, Y0 = 4.3;

export default {
  id: 'slider',
  short: 'The slider',
  title: 'How the slider meshes the teeth',
  subtitle: 'A Y-shaped channel bends each tape, and the bend opens the gaps just long enough.',
  view: { pos: [0.9, 5.2, 13.2], target: [0.9, 5.0, 0] },
  learn: `<p>Here is the slider with its front plate made of glass. The camera rides along with it.</p>
    <p>Follow one row in from the top. The side wall, the <b>flange</b>, steers its tape round a gentle <b>bend</b>. The teeth are on the <i>outside</i> of that bend, so their heads <b>fan apart</b>, the way your fingers spread when you bend your hand back. For a moment each gap is wider than normal.</p>
    <p>The other row is doing the same thing, half a pitch behind. So as the two rows converge, each head finds an open gap in front of it and <b>tips in</b>, its hollow coming down over the bump of the tooth before. Left, right, left, right: one tooth at a time.</p>
    <p>Then the channel runs <b>straight</b>. The tapes straighten, the fans close, and every head is squeezed between its two neighbours. Past the mouth of the slider nothing can bend the tape that way again, so the teeth stay locked.</p>
    <p>Run it backwards and the <b>diamond</b> does the opposite job. It drives between the rows and forces each tape round the bend, so the heads fan open and let go one by one. The bright teeth are the ones in the bend.</p>
    <p class="tip"><b>Try it:</b> turn off the automatic run and drag the slider yourself, a tooth at a time. Find the exact moment a head drops into place.</p>`,
  terms: [
    { t: 'Throat', d: 'One of the two openings at the top of the slider. Each row of teeth goes in through its own throat.' },
    { t: 'Mouth', d: 'The single opening at the bottom of the slider, where the meshed chain comes out.' },
    { t: 'Flange', d: 'The side wall of the slider. It presses on the backs of the teeth and steers the tape.' },
    { t: 'Diamond', d: 'The wedge in the fork of the Y. It parts the rows when the slider moves down.' },
    { t: 'Play', d: 'The spare room a part has to move in. Locked teeth have almost none.' },
  ],
  defaults: { pos: 0.35, run: true, speed: 1.5, see: true, dir: 1 },
  controls: [
    { key: 'run', type: 'toggle', label: 'Run by itself' },
    { key: 'speed', type: 'log', label: 'Speed', min: 0.3, max: 40, ends: ['one tooth at a time', 'a blur'], fmt: (v) => (v < 10 ? v.toFixed(1) : Math.round(v)) + ' teeth a second' },
    { key: 'pos', type: 'range', label: 'Slide the slider', min: 0, max: 1, step: 0.0005, ends: ['open', 'zipped up'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'see', type: 'toggle', label: 'See-through slider' },
  ],
  quiz: [
    { q: 'Why do the heads fan apart inside the slider?', options: ['A spring pushes them', 'The tape is bent with the teeth on the outside of the bend', 'They are magnetic', 'The slider heats them'], answer: 1, why: 'Teeth are rigid and fixed to the tape. Bend the tape and they splay out like the pages of a bent book.' },
    { q: 'What does the diamond do when you unzip?', options: ['Nothing', 'It cuts the thread', 'It drives between the rows and bends each tape so the teeth let go', 'It locks the slider'], answer: 2, why: 'The diamond is a wedge. It forces each row round the bend, which opens the gaps and frees the teeth one at a time.' },
    { q: 'Why do the teeth stay locked once they leave the mouth of the slider?', options: ['Glue', 'The tape is straight again, so the gaps have closed and no head can climb out', 'The pull tab holds them', 'Air pressure'], answer: 1, why: 'With the tape straight, each head is held between two neighbours with almost no play. Only the slider can bend the tape the right way.' },
  ],
  reel: [
    { ms: 6400, caption: 'Inside the slider, each tape bends, and the bend fans its teeth apart.', set: { run: false, see: true }, anim: { pos: [0.40, 0.47] }, view: { pos: [0.3, 5.6, 9.6], target: [0.3, 5.6, 0] }, spin: 0 },
    { ms: 6400, caption: 'Each head tips into the open gap across the way, one tooth at a time.', set: { run: false, see: true }, anim: { pos: [0.47, 0.51] }, view: { pos: [0.3, 4.9, 5.6], target: [0.3, 4.9, 0] }, spin: 0 },
    { ms: 5400, caption: 'Slide it back and the diamond wedges the rows apart again.', set: { run: false, see: true }, anim: { pos: [0.51, 0.43] }, view: { pos: [0.3, 5.6, 9.6], target: [0.3, 5.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const zip = makeZip({ kind: 'metal', n: 44 });
    zip.g.scale.setScalar(S); stage.root.add(zip.g);
    stage.floor.visible = false;
    const { k, slider } = zip;
    slider.pull.visible = false;                       // the pull tab would hide the teeth: leave it off here
    const L = (t, pos, cls) => stage.label(t, pos, slider.g, cls);
    const lbl = {
      diamond: L('Diamond', [0, slider.Lt + 1.6, 3], 'hot'),
      bend: L('Bend: heads fan apart', [-11, 2.4, 3], 'hot'),
      tip: L('Heads tip in', [7.6, 0.4, 3]),
      lock: L('Straight: locked', [8.6, -5.4, 3]),
      flange: L('Flange', [-7.6, -2.6, 3]),
      throat: L('Throat', [8.6, slider.Lt + 0.6, 3]),
      mouth: L('Mouth', [-6.2, -slider.Lm - 1, 3]),
    };
    let m = zip.mOf(0.35), see = null, dir = 1, shown = 0.35;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.run && !inReel()) {
          // Run between 15% and 85%, turning round at each end.
          s.pos = clamp(s.pos + (dir * s.speed * (k.P / 2) * dt) / (zip.mMax - zip.mMin), 0.15, 0.85);
          if (s.pos >= 0.85) dir = -1; if (s.pos <= 0.15) dir = 1;
          m = zip.mOf(s.pos);
        } else m = inReel() ? zip.mOf(s.pos) : approach(m, zip.mOf(s.pos), 14, dt);
        shown = s.pos;
        zip.set(m);
        if (see !== s.see) { see = s.see; slider.see(see); }
        const narrow = fitNarrow(stage, [lbl.flange, lbl.throat, lbl.mouth, lbl.tip], -0.08);
        if (narrow) { lbl.bend.element.textContent = 'Bend'; lbl.lock.element.textContent = 'Locked'; }
        zip.g.position.set(narrow ? 0 : inReel() ? 0.3 : 2.9, Y0 - m * S, 0);
      },
      dispose() { stage.floor.visible = true; },
      readout: (s) => rows(`${zip.meshed(m)} of ${2 * zip.n} teeth meshed`, [
        ['Play in the bend', mm(playAt(k, k.R)), 'ok'],
        ['Play needed to get in or out', mm(k.NEED)],
        ['Play in the straight chain', mm(playAt(k, Infinity)), 'no'],
        ['The throat bends the tape to', `${k.R} mm radius`],
        ['At a brisk pull of 0.5 m/s', `${Math.round(500 / (k.P / 2))} teeth a second`],
      ], 3, s.run ? 'Bright teeth are in the bend, where they tip in or out.' : 'Drag the slider slowly and watch one head at a time.'),
    };
  },
};
