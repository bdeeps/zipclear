// Chapter 1: the parts of a zip. A size 5 metal zip, drawn to scale (sizes in js/zipmath.js).
import { approach, smooth } from '../kit.js';
import { makeZip, COL, rows, fitNarrow, mm, SIZES } from '../zip.js';

const S = 0.1;                    // scene units per millimetre

export default {
  id: 'anatomy',
  short: 'Inside a zip',
  title: 'What a zip is made of',
  subtitle: 'Two tapes, two rows of teeth, and one small slider that does all the work.',
  view: { pos: [-0.6, 5.4, 11.2], target: [-0.6, 5.0, 0] },
  learn: `<p>A <b>zip</b> (Americans say zipper) looks simple, and it is. There are only four kinds of part.</p>
    <p>Two strips of woven cloth, the <b>tapes</b>, are sewn to your jacket or bag. Each tape has a thick corded edge, and clamped along that edge is a row of small <b>teeth</b>. The trade calls them elements. Look closely: the teeth of one row sit opposite the <i>gaps</i> of the other. The two rows are offset by <b>half a pitch</b>, like the two halves of a brick wall.</p>
    <p>The <b>slider</b> rides on both rows at once. Inside it is a channel shaped like the letter <b>Y</b>, with a wedge in the fork called the <b>diamond</b>. The <b>pull tab</b> is just a handle. Pull the slider up and the two rows go in at the top, one each side of the diamond, and come out of the bottom as one locked chain.</p>
    <p><b>Stops</b> keep the slider on. A <b>bottom stop</b> joins the two tapes for good. A <b>top stop</b> on each tape is too big to enter the slider. A jacket zip has to come fully apart, so its bottom stop is replaced by a <b>pin</b> on one tape and a <b>box</b> on the other.</p>
    <p class="tip"><b>Try it:</b> take the zip apart, then put it back, make the slider see-through and run it up and down. Watch which teeth are loose and which are locked.</p>`,
  terms: [
    { t: 'Tape', d: 'The woven strip that carries a row of teeth and is sewn to the cloth.' },
    { t: 'Tooth (element)', d: 'One of the small shaped pieces along the edge of a tape. Two rows of them lock together.' },
    { t: 'Chain', d: 'The two rows of teeth once they are meshed together.' },
    { t: 'Slider', d: 'The part you move. Its Y-shaped channel meshes the teeth one way and parts them the other way.' },
    { t: 'Diamond', d: 'The wedge inside the top of the slider that splits the two rows apart.' },
    { t: 'Pitch', d: 'The distance from one tooth to the next on the same tape.' },
    { t: 'Stops', d: 'Small clamps at the ends of the rows that keep the slider from running off.' },
  ],
  defaults: { explode: 0, zip: 0.45, see: false },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'zip', type: 'range', label: 'Slide the slider', min: 0, max: 1, step: 0.002, ends: ['open', 'zipped up'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'see', type: 'toggle', label: 'See-through slider' },
  ],
  quiz: [
    { q: 'How are the two rows of teeth lined up?', options: ['Tooth exactly opposite tooth', 'Each tooth opposite a gap in the other row', 'At random', 'One row has twice as many teeth'], answer: 1, why: 'The rows are offset by half a pitch, so every tooth has a gap waiting for it on the other side.' },
    { q: 'What is the diamond?', options: ['A jewel on the pull tab', 'The bottom stop', 'A wedge inside the slider that splits the two rows', 'The hole in the pull tab'], answer: 2, why: 'It sits in the fork of the Y-shaped channel. When the slider moves down, it drives between the rows.' },
    { q: 'Why does a jacket zip have a pin and a box instead of a bottom stop?', options: ['To look smarter', 'So the two sides can come completely apart', 'To make it waterproof', 'To lock the slider'], answer: 1, why: 'A bottom stop joins the tapes for ever. A pin that slots into a box lets you separate the two halves and join them again.' },
  ],
  reel: [
    { ms: 5600, caption: 'A zip is two rows of teeth, half a step out of line, and one slider.', set: { see: false, zip: 0.3 }, anim: { explode: [0, 1] }, view: { pos: [2.2, 5.9, 7.6], target: [0.6, 5.5, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const zip = makeZip({ kind: 'metal', n: 26 });
    zip.g.scale.setScalar(S); zip.g.position.set(0.6, 1.5, 0);
    stage.root.add(zip.g);
    const { k, slider } = zip;
    const L = (t, pos, parent = zip.g, cls) => stage.label(t, pos, parent, cls);
    const top = (zip.n + 0.3) * k.P;
    const lbl = {
      slider: L('Slider', [7.5, 1, 4], slider.g, 'hot'),
      pull: L('Pull tab', [-7.5, -9, 5], slider.g),
      diamond: L('Diamond', [0, slider.Lt + 2.5, 6], slider.g, 'hot'),
      teeth: L('Teeth (elements)', [-13, top * 0.72, 3]),
      tapeL: L('Tape', [-22, top * 0.42, 0]),
      cord: L('Corded edge', [15, top * 0.9, 0]),
      stopB: L('Bottom stop', [10, -5, 3]),
      stopT: L('Top stops', [0, top + 9, 3]),
      chain: L('Chain: the meshed teeth', [12, 5, 3]),
    };
    let ex = 0, m = zip.mOf(0.45), see = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        ex = approach(ex, s.explode, 8, dt);
        const e = smooth(ex);
        m = approach(m, zip.mOf(s.zip), 9, dt);
        zip.set(m, { teethZ: 7 * e });
        // The slider comes forward and opens like a sandwich, so the diamond shows between its plates.
        slider.g.position.z = 26 * e;
        slider.top.position.z = 7 * e; slider.bridge.position.z = 7 * e; slider.pull.position.z = slider.zt + 0.62 + 16 * e;
        slider.bottom.position.z = -7 * e; slider.flanges.position.z = 0;
        zip.bottomStop.position.z = 14 * e; zip.topStops.forEach((t) => { t.position.z = 14 * e; });
        const want = s.see ? 1 : 0; if (want !== see) { see = want; slider.see(!!see); }
        slider.setPull(e * 0.9);
        fitNarrow(stage, [lbl.cord, lbl.chain, lbl.pull, lbl.tapeL], -0.12);
        lbl.chain.visible = lbl.chain.visible && m > 14 && e < 0.2;
        lbl.diamond.visible = e > 0.3 || s.see;
        lbl.stopT.position.y = (zip.at(zip.sTop, -1).y);
      },
      readout: (s) => rows(s.explode > 0.05 ? 'Four kinds of part' : `${zip.meshed(m)} of ${2 * zip.n} teeth meshed`, [
        ['Size', `#5: chain about ${SIZES[5]} mm wide`],
        ['Teeth', `${zip.n} on each tape`],
        ['Pitch (tooth to tooth)', mm(k.P, 1)],
        ['Rows offset by', mm(k.P / 2, 1) + ' (half a pitch)'],
      ], 2),
    };
  },
};
