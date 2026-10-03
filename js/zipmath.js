// ZipClear's numbers and geometry, with no 3D in it: tooth outlines, the path each tape takes through
// the slider, the play between teeth, and the wedge forces. Everything is in millimetres and newtons.
//
// Axes: the chain runs up +y, x is across the zip (left row at x < 0), z comes out of the cloth.
// A tooth has its own axes: u points from the tape's corded edge towards the middle of the chain,
// v points along the tape. A tooth is rigid and is clamped on the cord, so it follows the tape exactly:
// where the tape turns by an angle, the tooth turns by the same angle.

export const D2R = Math.PI / 180;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- the three kinds of zip
// Chain widths are the usual trade figures for a size 5: the size number is roughly the width of the
// closed chain in millimetres (UCAN and Wawak size charts give about 5.7 to 6.2 mm for a #5, 4.3 to 4.8
// for a #3, 7.3 to 8 for a #8 and 10 to 10.7 for a #10). Sundback's 1913 design had 10 to 11 teeth to
// the inch, a pitch of about 2.4 mm; 2.6 mm is used here.
// Makers do not publish tooth pitch, clearance or bump height, so P, C and B below are measured-style
// model values in the right range for a #5, chosen so the geometry closes without teeth overlapping.
//   P  pitch: distance between teeth on one tape        U0  cord to the middle of the chain
//   T  tooth thickness along the chain                  LEG how far the legs reach behind the cord
//   B  height of the bump (or how much wider a head is than the gap it sits behind)
//   C  clearance left between stacked teeth             TIP how far the head reaches past the middle
//   NEED how much the gap between two neighbouring heads must grow before a tooth of the other row can
//        slip out sideways. Metal: the tooth has to hop over the bump below it and let go of the bump
//        above it, so 2·B. Plastic and coil: a head is wider than the gap between two heads, by 2·T − P.
//   H    distance from the cord to the place where that gap is measured
export const KINDS = {
  metal: {
    name: 'Metal teeth', P: 2.6, U0: 1.9, LEG: 1.1, TIP: 1.05, T: 1.24, B: 0.42, C: 0.06, Z: 2.4, NEED: 0.84, H: 1.9, C0: 0.06,
    R: 6, A: 25, color: 0xd9b25f, made: 'Brass, aluminium or nickel teeth, stamped from wire and clamped on the tape',
  },
  moulded: {
    name: 'Moulded plastic', P: 3.3, U0: 2.0, LEG: 1.0, TIP: 0.95, T: 1.9, B: 0.5, C: 0.09, Z: 2.6, NEED: 0.5, H: 2.5, C0: 0, mush: true,
    R: 8, A: 25, color: 0xff7a59, made: 'Acetal plastic teeth, injection-moulded straight on to the tape',
  },
  coil: {
    name: 'Coil', P: 1.7, U0: 1.9, LEG: 1.1, TIP: 0.85, T: 1.02, B: 0.34, C: 0.06, Z: 2.0, NEED: 0.34, H: 2.3, C0: 0, mush: true,
    R: 7, A: 25, color: 0x8ef0ff, made: 'One long nylon or polyester thread, wound into a spiral and sewn to the tape',
  },
};
// Size number to closed chain width (mm), by kind. Trade charts differ a little from maker to maker.
export const SIZES = { 3: 4.5, 5: 6, 8: 8, 10: 10 };

// ---------------------------------------------------------------- one tooth, as an outline
// The classic Sundback scoop (US patent 1,219,881, 1917), drawn as a slice through its middle:
// a bump on top of the head and a hollow underneath, both on the chain's centre line.
// Points are [u, v] for a LEFT tooth, anticlockwise.
export function toothOutline(k = KINDS.metal, { bump = true } = {}) {
  const h = k.T / 2, u0 = k.U0, tip = u0 + k.TIP, leg = -k.LEG;
  if (k.mush) {
    // A mushroom: a narrow neck and a wide head. Heads of the other row sit round the neck.
    // The head is wider than half the pitch, so two heads of one row leave a gap narrower than a head.
    const neck = (k.P - k.T - 2 * k.C) / 2, n0 = u0 - k.TIP - 0.13, n1 = u0 - 0.08, hb = Math.min(h, (k.P - 2 * neck) / 2 - 0.25);
    return [[leg, -hb], [n0 - 0.25, -hb], [n0, -neck], [n1, -neck], [n1 + 0.2, -h + 0.12], [tip - 0.4, -h], [tip, -h + 0.45],
      [tip, h - 0.45], [tip - 0.4, h], [n1 + 0.2, h - 0.12], [n1, neck], [n0, neck], [n0 - 0.25, hb], [leg, hb]];
  }
  const b = bump ? k.B : 0, r = 0.5, r2 = 0.57, d = b ? b + 0.05 : 0;
  return [
    [leg, -h], [u0 - r2 - 0.12, -h], [u0 - r2 + 0.1, -h + d], [u0 + r2 - 0.1, -h + d], [u0 + r2 + 0.12, -h],     // the hollow
    [tip - 0.3, -h], [tip, -h + 0.3], [tip, h - 0.3], [tip - 0.3, h],
    [u0 + r + 0.08, h], [u0 + r - 0.12, h + b], [u0 - r + 0.12, h + b], [u0 - r - 0.08, h],                       // the bump
    [leg, h],
  ];
}

// ---------------------------------------------------------------- the path of a tape through the slider
// rel is distance along the tape, measured from the point inside the slider where the two rows have
// just become straight (rel < 0 is the closed chain below, rel > 0 is the open part above).
// The cord runs straight, bends outwards on a circle of radius R through angle A (the throat), runs
// straight along the diamond, then eases back to a gentler angle A2 above the slider.
// Returns the LEFT cord's x, y and the angle phi the tape has turned through (radians, anticlockwise).
export function makePath(k = KINDS.metal, { R = k.R, A = k.A, L1 = 9, R2 = 30, A2 = 10 } = {}) {
  const a = A * D2R, a2 = Math.min(A2, A) * D2R, s1 = R * a, s2 = s1 + L1, s3 = s2 + R2 * (a - a2);
  const x1 = -k.U0 - R * (1 - Math.cos(a)), y1 = R * Math.sin(a);
  const x2 = x1 - L1 * Math.sin(a), y2 = y1 + L1 * Math.cos(a);
  const cx = x2 + R2 * Math.cos(a), cy = y2 + R2 * Math.sin(a);         // centre of the easing arc (on the teeth's side)
  const x3 = cx - R2 * Math.cos(a2), y3 = cy - R2 * Math.sin(a2);
  const f = (rel) => {
    if (rel <= 0) return { x: -k.U0, y: rel, phi: 0 };
    if (rel <= s1) { const p = rel / R; return { x: -k.U0 - R * (1 - Math.cos(p)), y: R * Math.sin(p), phi: p }; }
    if (rel <= s2) { const d = rel - s1; return { x: x1 - d * Math.sin(a), y: y1 + d * Math.cos(a), phi: a }; }
    if (rel <= s3) { const p = a - (rel - s2) / R2; return { x: cx - R2 * Math.cos(p), y: cy - R2 * Math.sin(p), phi: p }; }
    const d = rel - s3; return { x: x3 - d * Math.sin(a2), y: y3 + d * Math.cos(a2), phi: a2 };
  };
  f.s1 = s1; f.s2 = s2; f.s3 = s3; f.R = R; f.A = A;
  return f;
}
// A tooth outline placed on the path: side −1 is the left row, +1 the right row (its mirror image).
export function placeOutline(outline, at, side = -1, dy = 0) {
  const c = Math.cos(at.phi), s = Math.sin(at.phi);
  return outline.map(([u, v]) => { const x = at.x + u * c - v * s, y = at.y + u * s + v * c; return [side < 0 ? x : -x, y + dy]; });
}

// ---------------------------------------------------------------- why the closed chain is locked
// In the straight chain the heads are stacked with only a hair of clearance, so a tooth has no room to
// climb over its neighbour's bump. Bend the tape on radius R with the teeth on the OUTSIDE of the bend
// and the heads fan apart: two teeth P apart at the cord are P·(R + h)/R apart at a distance h out,
// so the gap between them grows by P·h/R. That is all the slider's throat does.
export const playAt = (k, R) => k.C0 + (R > 0 && isFinite(R) ? (k.P * k.H) / R : 0);
export const locked = (k, R) => playAt(k, R) < k.NEED;
export const freeRadius = (k) => (k.P * k.H) / (k.NEED - k.C0);     // bend tighter than this and a tooth can leave

// ---------------------------------------------------------------- the wedge
// The slider's diamond is a double wedge with half-angle phi. Pulling the slider with force F drives
// it between the two rows. With friction mu = tan(lambda) on each face, the sideways force on each row
// is Q = F / (2·tan(phi + lambda)) (the standard wedge result; see any statics text, e.g. Meriam &
// Kraige, Engineering Mechanics: Statics, ch. 6). Without friction that is F / (2·tan phi).
export function wedge(phiDeg, mu) {
  const a = phiDeg * D2R + Math.atan(mu);
  const gain = a >= 89.5 * D2R ? 0 : 1 / (2 * Math.tan(a));          // sideways force on one row per newton of pull
  return { gain, ideal: 1 / (2 * Math.tan(phiDeg * D2R)), eff: gain / (1 / (2 * Math.tan(phiDeg * D2R))), jam: a >= 89.5 * D2R };
}
// Friction coefficients (dry, typical handbook ranges): brass on brass about 0.35, nylon or acetal on
// itself about 0.2, a waxed or soaped zip about 0.1 (Engineering Toolbox friction tables).
export const MU = { waxed: 0.1, plastic: 0.2, brass: 0.35, gritty: 0.6 };

// Force to prise ONE tooth out of the chain: it has to be tipped over its neighbour's bump, which
// stretches and bends the tape a little. Makers publish no figure for it, so Q1 is a model value picked
// so that the pull on the slider comes out at a few newtons, which is what a hand feels (and the order
// of the slider-pull limits used in zip test standards such as BS 3084 and ASTM D2062).
export const Q1 = 1.2;                     // N, sideways, per row, at the diamond
export const DRAG0 = 0.5;                  // N, the tapes rubbing through the slider's slots
export function pullForce(phiDeg, mu) {
  const w = wedge(phiDeg, mu);
  return w.jam ? Infinity : Q1 / w.gain + DRAG0 * (1 + 2 * mu);
}
// Crosswise strength: how hard you must pull the closed chain apart sideways before teeth tear off the
// tape or bend. Tested on 25 mm of chain (ASTM D2061, BS 3084, JIS S 3015). Published minimums vary by
// maker and grade, so these are round, typical orders of size for a size 5, not a specification.
export const CROSS = { metal: 500, moulded: 450, coil: 400 };     // N per 25 mm of chain

// ---------------------------------------------------------------- a loose slider
// A slider's job is to press each head fully home. If its channel has spread by `loose` mm, the two
// rows leave it that much short of home, so a bump is only (B − loose) deep in its hollow. Below about
// a third of the bump's height, a sideways tug rides it out: the chain opens behind the slider.
export const seatDepth = (k, loose) => Math.max(0, k.B - loose);
export const holds = (k, loose) => seatDepth(k, loose) >= k.B * 0.35;
// Sideways strength falls with the seat depth (a shallow bump is a ramp, not a wall).
export const looseStrength = (k, kind, loose) => (holds(k, loose) ? CROSS[kind] * Math.pow(seatDepth(k, loose) / k.B, 1.5) : 0);
