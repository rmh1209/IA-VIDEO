/* ===== Carte de séance à partager : image générée sur le téléphone, rien n'est envoyé par Fonte ===== */
async function shareCardBlob(w) {
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* polices système */ }
  const D = "'Barlow Condensed','Arial Narrow',sans-serif", B = "Barlow,system-ui,sans-serif";
  const fit = (txt, max, font) => { g.font = font; let t = String(txt); if (g.measureText(t).width <= max) return t; while (t.length > 1 && g.measureText(t + "…").width > max) t = t.slice(0, -1); return t + "…"; };
  g.fillStyle = "#12171E"; g.fillRect(0, 0, W, H);
  // la barre et ses disques, comme le logo
  const plates = ["#E05A55", "#5C8BDA", "#E0AE1C", "#4FAF6E"], hs = [210, 180, 150, 120];
  g.fillStyle = "#3A4552"; g.fillRect(150, 196, W - 300, 18);
  plates.forEach((col, k) => { g.fillStyle = col; const x = 80 + k * 46, h = hs[k]; g.beginPath(); g.roundRect(x, 205 - h / 2, 38, h, 8); g.fill(); g.beginPath(); g.roundRect(W - 118 - k * 46, 205 - h / 2, 38, h, 8); g.fill(); });
  g.fillStyle = "#ECEFEA"; g.font = `800 112px ${D}`; g.fillText("Séance terminée", 80, 430);
  const when = new Date(w.startedAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  g.fillStyle = "#9AA5B1"; g.font = `500 46px ${B}`; g.fillText(fit(`${w.name} · ${when}`, W - 160, `500 46px ${B}`), 80, 500);
  // chiffres de la séance
  const stats = [["Durée", mmss(w.dur || 0)], ["Séries", String(w.nsets || 0)], ["Volume", `${f0(w.vol || 0)} kg`]];
  stats.forEach(([k, v], i) => {
    const x = 80 + i * 310;
    g.fillStyle = "#1B222C"; g.beginPath(); g.roundRect(x, 560, 290, 190, 22); g.fill();
    g.fillStyle = "#9AA5B1"; g.font = `500 36px ${B}`; g.fillText(k, x + 28, 620);
    g.fillStyle = "#ECEFEA"; g.font = `800 76px ${D}`; g.fillText(fit(v, 240, `800 76px ${D}`), x + 28, 712);
  });
  // records, ou les exercices de la séance
  let y = 840;
  const prs = (w.prs || []).slice(0, 3);
  g.fillStyle = prs.length ? "#E0AE1C" : "#ECEFEA"; g.font = `800 56px ${D}`;
  g.fillText(prs.length ? `${(w.prs || []).length} record${(w.prs || []).length > 1 ? "s" : ""} battu${(w.prs || []).length > 1 ? "s" : ""}` : "Au programme", 80, y);
  y += 70;
  const lines = prs.length ? prs.map(p => `${p.n} : ${f1(p.w)} kg × ${p.r}`) : w.ex.slice(0, 4).map(x => `${x.n} : ${x.sets.length} série${x.sets.length > 1 ? "s" : ""}`);
  g.fillStyle = "#ECEFEA"; g.font = `500 44px ${B}`;
  lines.forEach(t => { g.fillText(fit(t, W - 160, `500 44px ${B}`), 80, y); y += 64; });
  // palier
  try {
    const p = ptsNow(workouts.some(x => x.id === w.id) ? workouts : [w, ...workouts]);
    g.fillStyle = "#1B222C"; g.beginPath(); g.roundRect(80, H - 250, W - 160, 110, 22); g.fill();
    g.fillStyle = "#9AA5B1"; g.font = `500 38px ${B}`; g.fillText("Palier", 116, H - 182);
    g.fillStyle = "#ECEFEA"; g.font = `800 56px ${D}`; g.fillText(fit(`${p.tier.n} · ${f0(p.total)} points`, W - 380, `800 56px ${D}`), 270, H - 178);
  } catch (e) { /* paliers indisponibles */ }
  g.fillStyle = "#6D7885"; g.font = `600 36px ${B}`; g.fillText("Fonte · programme et carnet de musculation", 80, H - 70);
  return new Promise(ok => c.toBlob(ok, "image/png"));
}
async function shareWorkout(w) {
  if (!w) return;
  let blob;
  try { blob = await shareCardBlob(w); } catch (e) { blob = null; }
  if (!blob) { toast("Image impossible à créer sur cet appareil."); return; }
  const file = typeof File === "function" ? new File([blob], "seance-fonte.png", { type: "image/png" }) : null;
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Ma séance Fonte", text: "Séance terminée avec Fonte." }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  if (downloads) {
    try { const r = await downloads.save({ filename: "seance-fonte.png", data: blob }); if (r && r.status === "saved") toast("Image enregistrée : partage-la où tu veux."); }
    catch (e) { if (!(e && e.code === "declined")) toast("Le partage n'est pas disponible dans cette vue."); }
  } else toast("Le partage n'est pas disponible dans cette vue.");
}
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="share-w"]');
  if (!b) return;
  const w = b.dataset.id ? workouts.find(x => x.id === b.dataset.id) : pendingSave;
  shareWorkout(w);
});
