// Chapter 6: the three kinds of zip, their sizes, and the pin that locks a slider.
// Shapes and sizes are in js/zipmath.js. The same path and the same slider-fitting code build all three.
import { THREE, approach, clamp } from '../kit.js';
import { makeZip, rows, fitNarrow, mm, SIZES, KINDS, inReel } from '../zip.js';

const S0 = 0.145, LEN = 30;                  // scene units per mm at size 5, and the length of chain to draw (mm)
const NOTE = {
  metal: 'Strong and hard-wearing. Jeans, leather jackets, boots.',
  moulded: 'Chunky, light and rust-proof. Anoraks, school bags, tents.',
  coil: 'Fine, flexible and cheap. Most bags, trousers and dresses. The invisible zip is a coil turned inside out.',
};

export default {
  id: 'kinds',
  short: 'Kinds and sizes',
  title: 'Metal, plastic and coil',
  subtitle: 'Three ways to make a tooth, four common sizes, and a pin that stops your jeans unzipping.',
  view: { pos: [0, 4.9, 14.2], target: [0, 4.7, 0] },
  learn: `<p>Every zip works the way you have just seen, but the teeth are made in three ways.</p>
    <p><b>Metal</b> teeth are stamped from brass, aluminium or nickel wire and clamped on the tape one by one. <b>Moulded plastic</b> teeth are injected straight on to the tape as blobs of tough plastic. Each is shaped like a mushroom, and a head is wider than the gap between two heads across the way. A <b>coil</b> zip has no separate teeth at all. One long nylon thread is wound into a spiral and sewn to the tape, and each loop is pressed flat at its tip to make a head. Coil is the commonest zip in the world. Turn it to the back of the tape and you have the <b>invisible zip</b> of a dress.</p>
    <p>The <b>size number</b> is roughly the width of the closed chain in millimetres: <b>#3</b> for dresses and pencil cases, <b>#5</b> for jackets and bags, <b>#8</b> and <b>#10</b> for luggage, tents and boat covers.</p>
    <p>Why do jeans stay shut? An <b>auto-lock</b> slider hides a small sprung <b>pin</b>. When the pull tab lies flat, the pin drops through the slider into a gap between two teeth, and the slider cannot move. Lift the tab to pull, and the pin lifts with it. A bag slider usually has no lock, so it runs freely either way.</p>
    <p>Other fasteners make other bargains. A <b>button</b> holds at one point. A <b>press stud</b> pops open under a tug. <b>Velcro</b> grips anywhere but is loud and collects fluff. Only a zip closes a long edge, tooth by tooth, flat and strong. India makes zips by the million, from YKK's plant at Bawal in Haryana to small makers in the garment towns, and the roadside repairer who swaps a slider in a minute.</p>
    <p class="tip"><b>Try it:</b> switch between the three kinds with the slider see-through. Then lay the pull tab flat and try to slide it.</p>`,
  terms: [
    { t: 'Coil zip', d: 'A zip whose teeth are the loops of one long plastic spiral sewn to the tape.' },
    { t: 'Moulded plastic zip', d: 'A zip whose teeth are injection-moulded directly on to the tape.' },
    { t: 'Invisible zip', d: 'A coil zip sewn with the coil behind the tape, so only a seam and a small pull show.' },
    { t: 'Size number', d: 'A trade number, such as #5, roughly equal to the width of the closed chain in millimetres.' },
    { t: 'Auto-lock slider', d: 'A slider with a sprung pin that drops between the teeth whenever the pull tab is let go.' },
    { t: 'Separating zip', d: 'A zip whose two halves come fully apart, using a pin and a box at the bottom. Jackets use them.' },
  ],
  defaults: { kind: 'metal', size: 5, pos: 0.5, see: true, lock: 'free' },
  controls: [
    { key: 'kind', type: 'seg', label: 'Kind of teeth', options: [{ v: 'metal', label: 'Metal' }, { v: 'moulded', label: 'Moulded plastic' }, { v: 'coil', label: 'Coil' }] },
    { key: 'size', type: 'seg', label: 'Size', options: [{ v: 3, label: '#3' }, { v: 5, label: '#5' }, { v: 8, label: '#8' }, { v: 10, label: '#10' }] },
    { key: 'pos', type: 'range', label: 'Slide the slider', min: 0, max: 1, step: 0.002, ends: ['open', 'zipped up'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'lock', type: 'seg', label: 'Pull tab', options: [{ v: 'free', label: 'Lifted: free' }, { v: 'locked', label: 'Flat: locked' }] },
    { key: 'see', type: 'toggle', label: 'See-through slider' },
  ],
  quiz: [
    { q: 'What are the teeth of a coil zip?', options: ['Brass stampings', 'The loops of one long nylon spiral', 'Tiny magnets', 'Moulded blobs'], answer: 1, why: 'A single plastic thread is wound into a spiral, and each loop has a flattened head that locks between two loops of the other spiral.' },
    { q: 'What does the 5 in a #5 zip tell you?', options: ['It has 5 teeth per centimetre', 'The closed chain is roughly 5 to 6 mm wide', 'It is 5 inches long', 'It is grade 5 steel'], answer: 1, why: 'The size number is roughly the width of the meshed teeth in millimetres. A #10 is about twice as wide as a #5.' },
    { q: 'How does an auto-lock slider stay where you leave it?', options: ['Friction only', 'A sprung pin drops into a gap between two teeth when the tab lies flat', 'The diamond expands', 'A magnet in the pull'], answer: 1, why: 'The pin is linked to the pull tab. Lift the tab and the pin lifts out, so the slider can run.' },
  ],
  reel: [
    { ms: 5400, caption: 'Metal, moulded plastic or a nylon coil: three kinds of teeth, one idea.', set: { kind: 'coil', size: 5, lock: 'free', see: true }, anim: { pos: [0.25, 0.75] }, view: { pos: [0, 6.2, 7.2], target: [0, 6.0, 0] }, spin: 0.2 },
  ],

  build({ stage }) {
    const holder = new THREE.Group(); stage.root.add(holder);
    let zip = null, built = '', m = 0;
    const lblHolder = new THREE.Group(); holder.add(lblHolder);
    const lbl = {
      pin: stage.label('Locking pin', [-9, -3, 3], lblHolder, 'hot'),
      kind: stage.label('', [13, 6, 3], lblHolder),
    };
    const rebuild = (kind) => {
      if (zip) { holder.remove(zip.g); zip.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose?.(); }); }
      zip = makeZip({ kind, n: Math.round(LEN / KINDS[kind].P), pin: true, tapeW: 11, tail: 6 }); holder.add(zip.g);
      built = kind; see = null; m = zip.mOf(0.5);
    };
    let see = null, pinUp = 1, pull = 1, scale = 1, lockedM = null;
    rebuild('metal');
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.kind !== built) rebuild(s.kind);
        const { k, slider } = zip;
        const f = SIZES[s.size] / SIZES[5];
        scale = inReel() ? f : approach(scale, f, 8, dt);
        holder.scale.setScalar(S0 * scale);
        const narrow = fitNarrow(stage, [lbl.kind], -0.1);
        holder.position.set(narrow || inReel() ? 0 : 2.0, (inReel() ? 2.2 : 0.7) + (6 + k.P) * S0 * scale, 0);
        // Locked: the pin can only drop where there is a gap between two left teeth, so the slider
        // settles at the nearest one and stays there, whatever the slide control says.
        const locked = s.lock === 'locked';
        if (locked) {
          if (lockedM === null) { const i = Math.round((m + slider.pinY) / k.P - 0.5); lockedM = clamp((i + 0.5) * k.P - slider.pinY, zip.mMin, zip.mMax); }
          m = approach(m, lockedM, 12, dt);
        } else { lockedM = null; m = inReel() ? zip.mOf(s.pos) : approach(m, zip.mOf(s.pos), 10, dt); }
        pinUp = approach(pinUp, locked && Math.abs(m - (lockedM ?? m)) < 0.15 ? 0 : 1, 10, dt);
        pull = approach(pull, locked ? 0 : 1, 9, dt);
        slider.setPin(pinUp); slider.setPull(pull);
        zip.set(m);
        if (see !== s.see) { see = s.see; slider.see(see); }
        lblHolder.position.y = m;
        lbl.pin.visible = s.see;
        const name = KINDS[s.kind].name; if (lbl.kind.element.textContent !== name) lbl.kind.element.textContent = name;
      },
      readout: (s) => {
        const k = KINDS[s.kind], f = SIZES[s.size] / SIZES[5];
        return rows(`${k.name}, size #${s.size}`, [
          ['Closed chain is about', mm(SIZES[s.size], 1) + ' wide'],
          ['Teeth on each tape', `about ${Math.round(100 / (k.P * f))} per 10 cm`],
          ['Slider', s.lock === 'locked' ? 'locked by its pin' : 'free to run', s.lock === 'locked' ? 'no' : 'ok'],
        ], 3, k.made + '. ' + NOTE[s.kind]);
      },
    };
  },
};
