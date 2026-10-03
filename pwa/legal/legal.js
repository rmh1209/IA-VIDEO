/* Pages légales : remplit les informations de l'éditeur et signale en rouge ce qui reste à compléter. */
(() => {
  const E = window.FONTE_EDITEUR || {};
  const LABELS = { nom: "nom de l'éditeur", statut: "statut juridique", adresse: "adresse", email: "e-mail de contact", telephone: "téléphone", siret: "numéro SIRET", rcs: "", tva: "régime de TVA", directeur: "directeur de la publication", mediateur: "médiateur de la consommation", mediateurSite: "site du médiateur", portail: "" };
  document.querySelectorAll("[data-e]").forEach(el => {
    const k = el.dataset.e, v = String(E[k] || "").trim();
    if (v) {
      if (k === "email") { const a = document.createElement("a"); a.href = "mailto:" + v; a.textContent = v; el.replaceChildren(a); }
      else if (k === "mediateurSite") { const a = document.createElement("a"); a.href = /^https?:/.test(v) ? v : "https://" + v; a.textContent = v; a.rel = "noopener"; el.replaceChildren(a); }
      else if (k === "portail") { const a = document.createElement("a"); a.href = v; a.textContent = "page de gestion de l'abonnement"; a.rel = "noopener"; el.replaceChildren(a); }
      else el.textContent = v;
    } else if (LABELS[k]) { el.textContent = `[à compléter : ${LABELS[k]}]`; el.classList.add("todo"); }
    else el.closest("[data-opt]") ? el.closest("[data-opt]").remove() : el.remove();
  });
  // retour : vers la page précédente de l'appli si on en vient, sinon vers l'accueil
  const back = document.querySelector(".lg-back");
  if (back && document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) back.addEventListener("click", e => { e.preventDefault(); history.back(); });
})();
