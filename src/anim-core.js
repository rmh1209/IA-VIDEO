/* ===== Démonstrations animées : moteur. Chaque exercice est dessiné en SVG (silhouette, matériel, muscles ciblés en rouge)
   puis animé sur son tempo réel. Cinématique 2D : angles des segments, cinématique inverse à deux segments pour genoux et coudes. ===== */
const DEMO = (() => {
  const L = { shin: 44, thigh: 46, torso: 54, uarm: 33, farm: 31 };
  const NECK = 22, HR = 11, FL = 217;
  const SW = { torso: 15, thigh: 11, shin: 9, foot: 6, uarm: 9, farm: 8, neck: 7 };
  const OFF = [-3, -1.5];
  const rad = d => d * Math.PI / 180;
  const dir = d => [Math.cos(rad(d)), -Math.sin(rad(d))];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = v => Math.hypot(v[0], v[1]);
  const unit = v => { const n = len(v) || 1; return [v[0] / n, v[1] / n]; };
  const ang = v => Math.atan2(-v[1], v[0]) * 180 / Math.PI;
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const nrm = (a, b) => { const d = unit(sub(b, a)); return [-d[1], d[0]]; };
  const r1 = n => Math.round(n * 10) / 10;
  const escD = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* deux segments a puis b depuis F vers la cible T ; pick choisit le coude ou le genou parmi les deux solutions */
  function ik(F, T, a, b, pick) {
    let v = sub(T, F), d = len(v);
    if (d < 1e-6) { v = [0, 1]; d = 1e-6; }
    const u = [v[0] / d, v[1] / d];
    const dd = Math.min(Math.max(d, Math.abs(a - b) + 0.01), a + b - 0.01);
    const x = (a * a - b * b + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, a * a - x * x));
    const p = add(F, u, x), n = [-u[1], u[0]];
    const m1 = add(p, n, h), m2 = add(p, n, -h);
    let m;
    switch (pick) {
      case "back": m = m1[0] <= m2[0] ? m1 : m2; break;
      case "up": m = m1[1] <= m2[1] ? m1 : m2; break;
      case "down": m = m1[1] >= m2[1] ? m1 : m2; break;
      case "cw": m = m1; break;
      case "ccw": m = m2; break;
      default: m = m1[0] >= m2[0] ? m1 : m2;
    }
    return { m, t: add(F, u, dd) };
  }

  /* point : [x, y] absolu, ["articulation", dx, dy] relatif, ou { s: [a, b], a: position le long, n: décalage côté avant } */
  function at(J, s) {
    if (!s) return null;
    if (Array.isArray(s)) return typeof s[0] === "string" ? add(J[s[0]], [s[1] || 0, s[2] || 0]) : s;
    const A = J[s.s[0]], B = J[s.s[1]];
    return add(lerp2(A, B, s.a || 0), nrm(A, B), s.n || 0);
  }

  /* ---------- vue de profil ---------- */
  const fv = f => [dir(f), [Math.sin(rad(f)), Math.cos(rad(f))]];
  const fromToe = (toe, f) => { const [u, v] = fv(f); return add(add(toe, v, -6), u, -16); };
  function solve(P) {
    const J = {};
    const R = s => at(J, s);
    const T = P.torso ?? 90, root = P.root || "ankle";
    const leg = (hip, th, sh, aAt, tAt, f, kp) => {
      const ank = tAt ? fromToe(R(tAt), f) : aAt ? R(aAt) : null;
      if (ank) { const s = ik(hip, ank, L.thigh, L.shin, kp || "front"); return [s.m, s.t]; }
      const k = add(hip, dir(th), -L.thigh); return [k, add(k, dir(sh), -L.shin)];
    };
    if (root === "toe" || root === "ankle") {
      J.ankle = root === "toe" ? fromToe(P.at, P.foot ?? 0) : P.at;
      if (P.hipAt) { const s = ik(J.ankle, R(P.hipAt), L.shin, L.thigh, P.kp || "front"); J.knee = s.m; J.hip = s.t; }
      else { J.knee = add(J.ankle, dir(P.shin ?? 90), L.shin); J.hip = add(J.knee, dir(P.thigh ?? 90), L.thigh); }
      J.shoulder = add(J.hip, dir(T), L.torso);
    } else if (root === "knee") {
      J.knee = P.at; J.ankle = add(P.at, dir(P.shin ?? 90), -L.shin); J.hip = add(P.at, dir(P.thigh ?? 90), L.thigh);
      J.shoulder = add(J.hip, dir(T), L.torso);
    } else {
      if (root === "shoulder") { J.shoulder = P.at; J.hip = add(P.at, dir(T), -L.torso); }
      else { J.hip = P.at; J.shoulder = add(P.at, dir(T), L.torso); }
      [J.knee, J.ankle] = leg(J.hip, P.thigh ?? 90, P.shin ?? 90, P.ankleAt, P.toeAt, P.foot ?? 0, P.kp);
    }
    const [u, v] = fv(P.foot ?? 0);
    J.toe = add(add(J.ankle, v, 6), u, 16); J.heel = add(add(J.ankle, v, 6), u, -4);
    J.head = add(J.shoulder, dir(P.neck ?? T), NECK);
    const arm = (wAt, eAt, ua, fa, uaR, faR, ep, straight, uk, fk) => {
      const A = L.uarm * (uk ?? 1), B = L.farm * (fk ?? 1);
      if (wAt && eAt) return [R(eAt), R(wAt)];
      if (wAt) {
        const W = R(wAt);
        if (straight) { const d = unit(sub(W, J.shoulder)); return [add(J.shoulder, d, A), add(J.shoulder, d, A + B)]; }
        const s = ik(J.shoulder, W, A, B, ep || "down"); return [s.m, s.t];
      }
      const a1 = ua ?? (uaR != null ? T + uaR : 270), a2 = fa ?? (faR != null ? a1 + faR : a1);
      const e = add(J.shoulder, dir(a1), A); return [e, add(e, dir(a2), B)];
    };
    [J.elbow, J.wrist] = arm(P.wristAt, P.elbowAt, P.uarm, P.farm, P.uarmR, P.farmR, P.ep, P.straight, P.uaK, P.faK);
    J.L2 = P.thigh2 != null || P.shin2 != null || !!P.ankle2At || !!P.toe2At;
    if (J.L2) {
      const f2 = P.foot2 ?? P.foot ?? 0;
      [J.knee2, J.ankle2] = leg(J.hip, P.thigh2 ?? ang(sub(J.hip, J.knee)), P.shin2 ?? ang(sub(J.knee, J.ankle)), P.ankle2At, P.toe2At, f2, P.kp2);
      const [u2, v2] = fv(f2);
      J.toe2 = add(add(J.ankle2, v2, 6), u2, 16); J.heel2 = add(add(J.ankle2, v2, 6), u2, -4);
    }
    J.A2 = P.uarm2 != null || P.uarm2R != null || !!P.wrist2At;
    if (J.A2) [J.elbow2, J.wrist2] = arm(P.wrist2At, P.elbow2At, P.uarm2, P.farm2, P.uarm2R, P.farm2R, P.ep2, P.straight2, P.ua2K ?? P.uaK, P.fa2K ?? P.faK);
    return J;
  }

  const seg = (a, b, w, c) => `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke-width="${w}" class="${c}"/>`;
  const circ = (c, r, k) => `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r}" class="${k}"/>`;
  const ptsS = pts => pts.map(p => r1(p[0]) + "," + r1(p[1])).join(" ");

  /* muscles ciblés, dessinés en rouge sur le membre proche : [articulation de départ, d'arrivée, t0, t1, côté (1 avant, -1 arrière), largeur, décalage] */
  const HL = {
    quads: ["L", "knee", "hip", .2, .8, 1, 6, 2.2], ischios: ["L", "knee", "hip", .2, .8, -1, 6, 2.2],
    mollets: ["L", "ankle", "knee", .3, .78, -1, 5.5, 1.8],
    pecs: ["T", "hip", "shoulder", .62, .9, 1, 8, 3.2], abdos: ["T", "hip", "shoulder", .12, .56, 1, 8, 3.2],
    dos: ["T", "hip", "shoulder", .3, .92, -1, 8, 3.2],
    biceps: ["A", "elbow", "shoulder", .15, .75, 1, 5.5, 1.8], triceps: ["A", "elbow", "shoulder", .15, .75, -1, 5.5, 1.8]
  };
  function hlSide(J, mus, part) {
    let s = "";
    for (const m of mus) {
      const h = HL[m];
      if (h && h[0] === part) {
        const [, a, b, t0, t1, side, w, off] = h, n = nrm(J[a], J[b]);
        s += seg(add(lerp2(J[a], J[b], t0), n, side * off), add(lerp2(J[a], J[b], t1), n, side * off), w, "hl");
      } else if (m === "fessiers" && part === "L") {
        const nt = nrm(J.knee, J.hip), nb = nrm(J.hip, J.shoulder);
        const p1 = add(lerp2(J.knee, J.hip, .6), nt, -3), p3 = add(lerp2(J.hip, J.shoulder, .14), nb, -3.5);
        const p2 = add(J.hip, unit(add(nt, nb)), -4);
        s += `<polyline points="${ptsS([p1, p2, p3])}" stroke-width="8" class="hl"/>`;
      } else if (m === "epaules" && part === "A") {
        s += seg(J.shoulder, lerp2(J.shoulder, J.elbow, .38), 8.5, "hl") + circ(J.shoulder, 5.2, "hlf");
      }
    }
    return s;
  }

  function drawSide(J, P, mus) {
    const o = p => add(p, OFF);
    let s = "";
    if (!P.hideL2) {
      const k2 = J.L2 ? J.knee2 : o(J.knee), a2 = J.L2 ? J.ankle2 : o(J.ankle), hp = J.L2 ? J.hip : o(J.hip);
      s += seg(J.L2 ? J.heel2 : o(J.heel), J.L2 ? J.toe2 : o(J.toe), SW.foot, "bf") + seg(a2, k2, SW.shin, "bf") + seg(k2, hp, SW.thigh, "bf");
    }
    if (!P.hideA2) {
      const sh = J.A2 ? J.shoulder : o(J.shoulder), e2 = J.A2 ? J.elbow2 : o(J.elbow), w2 = J.A2 ? J.wrist2 : o(J.wrist);
      s += seg(sh, e2, SW.uarm, "bf") + seg(e2, w2, SW.farm, "bf");
    }
    s += seg(J.hip, J.shoulder, SW.torso, "bd") + hlSide(J, mus, "T");
    s += seg(J.shoulder, lerp2(J.shoulder, J.head, .5), SW.neck, "bd") + circ(J.head, HR, "hd");
    s += seg(J.heel, J.toe, SW.foot, "bd") + seg(J.ankle, J.knee, SW.shin, "bd") + seg(J.knee, J.hip, SW.thigh, "bd") + hlSide(J, mus, "L");
    if (!P.hideA1) s += seg(J.shoulder, J.elbow, SW.uarm, "bd") + seg(J.elbow, J.wrist, SW.farm, "bd") + hlSide(J, mus, "A");
    return s;
  }

  /* ---------- vue de face (ou de dos, ou de dessus pour un corps allongé) ---------- */
  function solveF(P) {
    const c = P.at || [160, 120], tk = P.torsoK ?? 1, J = { hipC: c };
    J.neckC = add(c, [0, -L.torso * tk]);
    J.shL = add(J.neckC, [-20, 0]); J.shR = add(J.neckC, [20, 0]);
    J.head = add(J.neckC, [0, -(NECK - 1) * (P.neckK ?? 1)]);
    J.hipL = add(c, [-9, 0]); J.hipR = add(c, [9, 0]);
    const st = P.stance ?? 11;
    J.ankleL = add(c, [-st, 88]); J.ankleR = add(c, [st, 88]);
    const armF = (A, sh, sg) => {
      if (A.e) return [add(sh, [sg * A.e[0], A.e[1]]), add(sh, [sg * A.h[0], A.h[1]])];
      const e = add(sh, [sg * Math.sin(rad(A.u[0])) * A.u[1], Math.cos(rad(A.u[0])) * A.u[1]]);
      return [e, add(e, [sg * Math.sin(rad(A.f[0])) * A.f[1], Math.cos(rad(A.f[0])) * A.f[1]])];
    };
    const AL = P.armL || { u: [6, L.uarm], f: [6, L.farm] }, AR = P.armR || AL;
    [J.elbowL, J.wristL] = armF(AL, J.shL, -1);
    [J.elbowR, J.wristR] = armF(AR, J.shR, 1);
    return J;
  }
  function drawF(J, P, mus) {
    let s = "";
    if (P.legs !== "none") for (const [h, a, sg] of [[J.hipL, J.ankleL, -1], [J.hipR, J.ankleR, 1]])
      s += seg(h, a, SW.thigh, "bd") + seg(add(a, [0, 4]), add(a, [sg * 6, 6]), SW.foot, "bd");
    s += `<polygon points="${ptsS([add(J.shL, [3, 1]), add(J.shR, [-3, 1]), add(J.hipR, [1, 0]), add(J.hipL, [-1, 0])])}" class="tf"/>`;
    const ch = (y, w) => seg(add(J.shL, [7, y]), add(J.shR, [-7, y]), w, "hl");
    if (mus.includes("pecs") || mus.includes("dos")) s += ch(9, 9);
    if (mus.includes("abdos")) s += seg(add(J.neckC, [0, 24]), add(J.hipC, [0, -7]), 9, "hl");
    s += seg(J.neckC, lerp2(J.neckC, J.head, .5), SW.neck, "bd") + circ(J.head, HR, "hd");
    for (const k of ["L", "R"]) {
      if (P["hide" + k]) continue;
      s += seg(J["sh" + k], J["elbow" + k], SW.uarm, "bd") + seg(J["elbow" + k], J["wrist" + k], SW.farm, "bd");
      if (mus.includes("epaules")) s += seg(J["sh" + k], lerp2(J["sh" + k], J["elbow" + k], .38), 8.5, "hl") + circ(J["sh" + k], 5.2, "hlf");
    }
    return s;
  }

  /* ---------- vue de dessus, debout (Pallof press) ---------- */
  function drawTop(P, mus) {
    const c = [186, 116], e = P.ext ?? 0;
    const shL = add(c, [-21, 0]), shR = add(c, [21, 0]), hand = add(c, [0, 16 + 42 * e]);
    const eL = ik(shL, hand, L.uarm, L.farm, "back").m, eR = ik(shR, hand, L.uarm, L.farm, "front").m;
    const pul = [52, c[1] + 16];
    let s = `<rect x="30" y="${pul[1] - 18}" width="20" height="36" rx="3" class="eqf"/>` + circ(pul, 4, "eqd");
    s += `<ellipse cx="${c[0] - 11}" cy="${c[1] + 9}" rx="5" ry="9" class="hf"/><ellipse cx="${c[0] + 11}" cy="${c[1] + 9}" rx="5" ry="9" class="hf"/>`;
    s += `<ellipse cx="${c[0]}" cy="${c[1]}" rx="27" ry="11" class="hd"/>`;
    if (mus.includes("abdos")) s += seg(add(c, [-23, -4]), add(c, [-23, 4]), 5, "hl") + seg(add(c, [23, -4]), add(c, [23, 4]), 5, "hl");
    s += seg(shL, eL, SW.uarm, "bd") + seg(eL, hand, SW.farm, "bd") + seg(shR, eR, SW.uarm, "bd") + seg(eR, hand, SW.farm, "bd");
    s += `<circle cx="${c[0]}" cy="${c[1] + 1}" r="9.5" class="hd ring"/>`;
    s += seg(pul, hand, 1.6, "ca") + circ(hand, 3.5, "eqd");
    return s;
  }

  /* ---------- matériel ---------- */
  const DB = (c, a, k = 1) => {
    const u = dir(a), n = [-u[1], u[0]], h = 9 * k, w = 6.5 * k;
    return seg(add(c, u, -h), add(c, u, h), 3 * k, "eqd") + seg(add(add(c, u, -h), n, -w), add(add(c, u, -h), n, w), 6.5 * k, "eqd") + seg(add(add(c, u, h), n, -w), add(add(c, u, h), n, w), 6.5 * k, "eqd");
  };
  const angOf = (it, J) => it.a === "farm" ? ang(sub(J.wrist, J.elbow)) : it.a === "farm+90" ? ang(sub(J.wrist, J.elbow)) + 90 : (it.a ?? 0);
  const EQ = {
    l: { d: (it, J) => seg(at(J, it.a), at(J, it.b), it.w ?? 4, it.c || "eq"), p: (it, J) => [[at(J, it.a), (it.w ?? 4) / 2], [at(J, it.b), (it.w ?? 4) / 2]] },
    pad: { d: (it, J) => seg(at(J, it.a), at(J, it.b), (it.w ?? 8) + 3, "eq") + seg(at(J, it.a), at(J, it.b), it.w ?? 8, "pf"), p: (it, J) => [[at(J, it.a), 6], [at(J, it.b), 6]] },
    c: { d: (it, J) => circ(at(J, it.c), it.r, it.k || "eqf"), p: (it, J) => [[at(J, it.c), it.r]] },
    r: { d: it => `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" rx="${it.rx ?? 2}" class="${it.k || "eqf"}"/>`, p: it => [[[it.x, it.y], 0], [[it.x + it.w, it.y + it.h], 0]] },
    p: { d: (it, J) => `<polygon points="${ptsS(it.pts.map(q => at(J, q)))}" class="${it.k || "eqf"}"/>`, p: (it, J) => it.pts.map(q => [at(J, q), 0]) },
    plate: { d: (it, J) => circ(at(J, it.c), it.r ?? 21, "eqf") + circ(at(J, it.c), 3.5, "eqd"), p: (it, J) => [[at(J, it.c), it.r ?? 21]] },
    bar: { d: (it, J) => circ(at(J, it.c), it.r ?? 3.2, "eqd"), p: (it, J) => [[at(J, it.c), 4]] },
    db: { d: (it, J) => DB(at(J, it.c), angOf(it, J), it.k), p: (it, J) => [[at(J, it.c), 12]] },
    dbe: { d: (it, J) => circ(at(J, it.c), 8, "eqd") + circ(at(J, it.c), 2.6, "eqh"), p: (it, J) => [[at(J, it.c), 8]] },
    bench: {
      d: it => `<rect x="${it.x1}" y="${it.y}" width="${it.x2 - it.x1}" height="7" rx="3" class="eqf"/>` + seg([it.x1 + 9, it.y + 7], [it.x1 + 9, FL], 3, "eq") + seg([it.x2 - 9, it.y + 7], [it.x2 - 9, FL], 3, "eq"),
      p: it => [[[it.x1, it.y], 0], [[it.x2, FL], 0]]
    },
    box: { d: it => `<rect x="${it.x}" y="${FL - it.h}" width="${it.w}" height="${it.h}" rx="2" class="eqf"/>`, p: it => [[[it.x, FL - it.h], 0], [[it.x + it.w, FL], 0]] },
    tower: { d: it => `<rect x="${it.x}" y="${it.top}" width="${it.w ?? 18}" height="${FL - it.top}" rx="2" class="eqf"/>`, p: it => [[[it.x, it.top], 0], [[it.x + (it.w ?? 18), FL], 0]] },
    cable: { d: (it, J) => seg(at(J, it.a), at(J, it.b), 1.6, "ca") + circ(at(J, it.a), 4, "eqd"), p: (it, J) => [[at(J, it.a), 4]] },
    rope: { d: (it, J) => { const w = at(J, it.c); return seg(w, add(w, [-4, 9]), 3, "eqd") + seg(w, add(w, [4, 9]), 3, "eqd"); }, p: (it, J) => [[at(J, it.c), 9]] },
    handle: { d: (it, J) => { const w = at(J, it.c); return seg(add(w, [0, -6]), add(w, [0, 6]), 4, "eqd"); }, p: (it, J) => [[at(J, it.c), 6]] },
    wall: {
      d: it => { let s = seg([it.x, it.top], [it.x, FL], 4, "eq"); const sg = it.side ?? -1; for (let y = it.top + 6; y < FL; y += 14) s += seg([it.x, y], [it.x + 8 * sg, y + 8], 1.4, "eq"); return s; },
      p: it => [[[it.x, it.top], 0], [[it.x + 9 * (it.side ?? -1), FL], 0]]
    },
    band: { d: (it, J) => { const a = at(J, it.a), b = at(J, it.b); return seg(add(a, [-2, 0]), add(b, [-3, 0]), 2.4, "band") + seg(add(a, [2, 0]), add(b, [3, 0]), 2.4, "band"); }, p: (it, J) => [[at(J, it.b), 3]] },
    bag: { d: (it, J) => { const w = at(J, it.c); return seg(w, add(w, [0, 6]), 2, "eqd") + `<rect x="${r1(w[0] - 10)}" y="${r1(w[1] + 5)}" width="20" height="24" rx="6" class="eqf"/>`; }, p: (it, J) => [[add(at(J, it.c), [0, 18]), 14]] },
    bottle: { d: (it, J) => { const w = at(J, it.c); return `<rect x="${r1(w[0] - 4.5)}" y="${r1(w[1] - 11)}" width="9" height="22" rx="3.5" class="eqb"/>` + `<rect x="${r1(w[0] - 2.5)}" y="${r1(w[1] - 14)}" width="5" height="4" rx="1" class="eqd"/>`; }, p: (it, J) => [[at(J, it.c), 13]] },
    mat: { d: it => `<rect x="${it.x1}" y="${FL - 3}" width="${it.x2 - it.x1}" height="3" rx="1.5" class="mat"/>`, p: () => [] },
    land: {
      d: (it, J) => { const w = at(J, it.c), u = unit(sub(w, it.pivot)), e = add(it.pivot, u, it.len); return seg(it.pivot, e, 4, "eqd") + circ(add(it.pivot, u, it.len - 16), 17, "eqf") + circ(add(it.pivot, u, it.len - 16), 3, "eqd"); },
      p: (it, J) => [[at(J, it.c), 18]]
    },
    chair: {
      d: it => `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="6" rx="2" class="eqf"/>` + seg([it.x + 4, it.y + 6], [it.x + 4, FL], 3, "eq") + seg([it.x + it.w - 4, it.y + 6], [it.x + it.w - 4, FL], 3, "eq") + (it.back ? seg([it.x + 3, it.y], [it.x + 3, it.y - it.back], 4, "eq") : ""),
      p: it => [[[it.x, it.y - (it.back || 0)], 0], [[it.x + it.w, FL], 0]]
    },
    txt: { d: () => "", p: () => [] }
  };
  const eqLayer = (sc, J, z) => (sc.eq || []).filter(it => (it.z || 0) === z).map(it => EQ[it.t].d(it, J)).join("");

  /* ---------- interpolation et lecture ---------- */
  function mix(a, b, t) {
    if (typeof a === "number" && typeof b === "number") return a + (b - a) * t;
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mix(v, b[i], t));
    if (a && b && typeof a === "object" && typeof b === "object") {
      const o = {};
      for (const k in a) o[k] = k in b ? mix(a[k], b[k], t) : a[k];
      for (const k in b) if (!(k in a)) o[k] = b[k];
      return o;
    }
    return t < .5 ? a : b;
  }
  function render(sc, P) {
    const vb = sc.vb;
    const fs = r1(vb[2] * .042), tag = sc.vlab ? `<text x="${r1(vb[0] + fs * .7)}" y="${r1(vb[1] + fs * 1.5)}" font-size="${fs}" class="vlab">${sc.vlab}</text>` : "";
    if (sc.view === "top") return tag + drawTop(P, sc.mus);
    const gr = sc.noGround || sc.view === "front" && sc.noFloor ? "" : seg([vb[0], FL], [vb[0] + vb[2], FL], 2, "gr");
    if (sc.view === "front") { const J = solveF(P); return gr + tag + eqLayer(sc, J, 0) + drawF(J, P, sc.mus) + eqLayer(sc, J, 1); }
    const J = solve(P);
    return gr + tag + eqLayer(sc, J, 0) + drawSide(J, P, sc.mus) + eqLayer(sc, J, 1);
  }
  function frameBox(sc) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const pt = (p, r) => { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); };
    if (sc.view === "top") return [24, 58, 256, 192];
    const samples = [];
    sc.F.forEach((f, i) => { samples.push(f, mix(f, sc.F[(i + 1) % sc.F.length], .5)); });
    for (const P of samples) {
      const J = sc.view === "front" ? solveF(P) : solve(P);
      for (const k in J) { const v = J[k]; if (Array.isArray(v) && typeof v[0] === "number") pt(v, k === "head" ? HR + 1 : 6); }
      for (const it of sc.eq || []) if (!it.nb) for (const [p, r] of EQ[it.t].p(it, J)) pt(p, r);
    }
    x0 -= 10; x1 += 10; y0 -= 10;
    if (!sc.noGround) y1 = Math.max(y1, FL + 8); else y1 += 10;
    let w = Math.max(x1 - x0, 190), h = Math.max(y1 - y0, 142);
    if (w / h > 4 / 3) h = w * 3 / 4; else w = h * 4 / 3;
    const cx = (x0 + x1) / 2;
    return [cx - w / 2, sc.noGround ? (y0 + y1) / 2 - h / 2 : y1 - h, w, h];
  }

  /* cadrage serré d'une seule position, pour les vignettes */
  function tightBox(sc, P) {
    if (sc.view === "top") return [26, 62, 200, 150];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const pt = (p, r) => { x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); };
    const J = sc.view === "front" ? solveF(P) : solve(P);
    for (const k in J) { const v = J[k]; if (Array.isArray(v) && typeof v[0] === "number") pt(v, k === "head" ? HR + 1 : 5); }
    for (const it of sc.eq || []) if (!it.nb && it.t !== "mat" && !(it.t === "r" && it.k === "mat")) for (const [p, r] of EQ[it.t].p(it, J)) pt(p, r);
    x0 -= 6; x1 += 6; y0 -= 6;
    if (!sc.noGround && y1 > FL - 40) y1 = Math.max(y1, FL + 3); else y1 += 6;
    let w = x1 - x0, h = y1 - y0;
    if (w / h > 4 / 3) h = w * 3 / 4; else w = h * 4 / 3;
    return [(x0 + x1) / 2 - w / 2, y1 - h, w, h];
  }

  const cache = {};
  function get(id) {
    if (id in cache) return cache[id];
    const key = DSC_MAP[id], S0 = key && DSC[key];
    if (!S0) return cache[id] = null;
    const ov = DSC_OV[id] || {};
    const sc = { ...S0, ...ov, id, key };
    sc.F = S0.f.map(f => ({ ...S0.base, ...f }));
    const ph = sc.ph || ["Descente contrôlée", "Remontée"];
    sc.tl = sc.tl || [[1, 1.6, ph[0]], [1, .3, ph[0]], [0, 1.2, ph[1]], [0, .6, ph[1]]];
    sc.total = sc.tl.reduce((s, x) => s + x[1], 0);
    sc.mus = (typeof EXI !== "undefined" && EXI[id] && EXI[id].m) || [];
    sc.th = sc.th ?? (sc.F.length > 1 ? 1 : 0);
    sc.vb = frameBox(sc);
    return cache[id] = sc;
  }
  function sample(sc, t) {
    let acc = 0, from = sc.tl[sc.tl.length - 1][0];
    for (const [to, d, l] of sc.tl) {
      if (t < acc + d) {
        const k = (t - acc) / d, e = .5 - .5 * Math.cos(Math.PI * k);
        return { P: from === to ? sc.F[to] : mix(sc.F[from], sc.F[to], e), label: l || "" };
      }
      acc += d; from = to;
    }
    return { P: sc.F[from], label: "" };
  }
  const svgOpen = (sc, extra) => `<svg class="fig" viewBox="${sc.vb.map(r1).join(" ")}" ${extra}>`;

  const thumbs = {};
  function thumb(id) {
    if (id in thumbs) return thumbs[id];
    const sc = get(id);
    if (!sc) return thumbs[id] = "";
    const tb = tightBox(sc, sc.F[sc.th]), full = { ...sc, vb: tb, vlab: "" };
    return thumbs[id] = `<svg class="fig" viewBox="${tb.map(r1).join(" ")}" aria-hidden="true" focusable="false">` + render(full, sc.F[sc.th]) + "</svg>";
  }

  const live = new Set();
  let raf = 0;
  const reduce = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  function paint(p) {
    const { P, label } = sample(p.sc, p.t);
    p.svg.innerHTML = render(p.sc, P);
    if (label && label !== p.lab) { p.lab = label; p.phase.textContent = label; }
  }
  function loop(now) {
    raf = 0;
    let any = false;
    for (const p of live) {
      if (!p.svg.isConnected) { live.delete(p); continue; }
      if (!p.on) continue;
      any = true;
      const dt = p.last ? Math.min(.1, (now - p.last) / 1000) : 0;
      p.last = now;
      p.t = (p.t + dt * p.speed) % p.sc.total;
      if (now - p.drawn >= 32) { p.drawn = now; paint(p); }
    }
    if (any) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  function mount(host, id, name) {
    unmount(host);
    const sc = get(id);
    if (!sc) { host.innerHTML = ""; return false; }
    const q = encodeURIComponent(name + " exécution technique");
    host.innerHTML = `<figure class="anim">
      <div class="anim-stage">${svgOpen(sc, `role="img" aria-label="Démonstration animée : ${escD(name)}"`)}</svg></div>
      <figcaption class="anim-cap">
        <div class="anim-ctl"><button type="button" class="anim-btn" data-demo="play">Pause</button><button type="button" class="anim-btn" data-demo="slow" aria-pressed="false">Ralenti</button><span class="anim-phase" aria-live="off"></span></div>
        <p class="anim-meta"><b>Matériel :</b> ${escD(sc.g || "aucun")}${sc.vlab ? ` · ${escD(sc.vlab)}` : ""} · <span class="anim-key">en rouge, les muscles qui travaillent</span></p>
        <a class="anim-yt" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">Voir des vidéos filmées de l'exercice</a>
      </figcaption></figure>`;
    const p = { sc, svg: host.querySelector("svg"), phase: host.querySelector(".anim-phase"), t: 0, on: !reduce(), speed: 1, last: 0, drawn: 0, lab: "" };
    const play = host.querySelector('[data-demo="play"]'), slow = host.querySelector('[data-demo="slow"]');
    const sync = () => { play.textContent = p.on ? "Pause" : "Lecture"; };
    play.addEventListener("click", e => { e.stopPropagation(); p.on = !p.on; p.last = 0; sync(); if (p.on) kick(); });
    slow.addEventListener("click", e => {
      e.stopPropagation();
      p.speed = p.speed === 1 ? .45 : 1;
      slow.setAttribute("aria-pressed", p.speed < 1 ? "true" : "false");
      if (!p.on) { p.on = true; p.last = 0; sync(); kick(); }
    });
    if (!p.on) { const ti = sc.tl.findIndex(x => x[0] === sc.th); p.t = sc.tl.slice(0, Math.max(0, ti + 1)).reduce((s, x) => s + x[1], 0) - .001; }
    sync();
    paint(p);
    if (!p.lab) p.phase.textContent = sc.tl[0][2] || "";
    host._demo = p;
    live.add(p);
    if (p.on) kick();
    return true;
  }
  function unmount(host) {
    if (host && host._demo) { live.delete(host._demo); host._demo = null; host.innerHTML = ""; }
  }

  return { has: id => !!get(id), thumb, mount, unmount, _t: { get, render, sample, solve, solveF } };
})();
