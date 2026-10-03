/* Informations sur l'éditeur de Fonte, reprises dans les pages légales.
   Avec le serveur (paquet fonte-en-ligne), on les renseigne plutôt dans wrangler.jsonc (rubrique vars, EDITEUR_...) :
   le serveur remplace alors ce fichier. Sans serveur, remplis-les directement ici. */
window.FONTE_EDITEUR = {
  nom: "",           // ton nom et prénom, ou le nom de ton entreprise
  statut: "",        // ex. : entrepreneur individuel (micro-entreprise)
  adresse: "",       // adresse postale complète
  email: "",         // adresse de contact
  telephone: "",
  siret: "",
  rcs: "",           // facultatif : ex. RCS Lyon 123 456 789
  tva: "",           // ex. : TVA non applicable, art. 293 B du CGI (franchise), ou ton numéro de TVA
  directeur: "",     // directeur ou directrice de la publication (souvent toi)
  mediateur: "",     // médiateur de la consommation choisi (obligatoire pour vendre aux particuliers)
  mediateurSite: "", // site internet du médiateur
  portail: ""        // facultatif : lien de connexion au portail client Stripe (résilier sans son téléphone)
};
