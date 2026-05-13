/**
 * Affichage dynamique des éducateurs (page Le Club / Kluba).
 * Récupère la liste depuis /admin/api.php?action=coachs et la rend dans
 * #coachs-grid en respectant la langue de la page (data-lang).
 *
 * Affiche pour chaque coach : photo (ou initiales), nom, fonction,
 * équipes encadrées (libellés FR ou EU selon la langue).
 */
(function () {
    'use strict';

    var grid = document.getElementById('coachs-grid');
    if (!grid) return;

    var lang = grid.dataset.lang || 'fr';
    var emptyMsg = lang === 'eu'
        ? 'Hezitzaileen zerrenda laster eguneratuko da.'
        : 'La liste des éducateurs sera mise à jour prochainement.';

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function getInitials(prenom, nom) {
        var first = (prenom || '').trim().charAt(0);
        var last = (nom || '').trim().charAt(0);
        return ((first + last).toUpperCase()) || '?';
    }

    // Charge en parallèle équipes (pour les libellés) et coachs
    Promise.all([
        fetch('/admin/api.php?action=equipes').then(function (r) { return r.ok ? r.json() : null; }),
        fetch('/admin/api.php?action=coachs').then(function (r) { return r.ok ? r.json() : []; }),
    ]).then(function (results) {
        var equipesCfg = results[0];
        var coachs = results[1];
        var labelByKey = {};
        if (equipesCfg && Array.isArray(equipesCfg.equipes)) {
            equipesCfg.equipes.forEach(function (eq) {
                labelByKey[eq.key] = lang === 'eu' && eq.label_eu ? eq.label_eu : (eq.label_fr || eq.key);
            });
        }

        if (!Array.isArray(coachs) || !coachs.length) {
            grid.innerHTML = '<p class="placeholder-text">' + emptyMsg + '</p>';
            return;
        }

        var html = '';
        coachs.forEach(function (c) {
            var fonction = lang === 'eu' && c.fonction_eu ? c.fonction_eu : (c.fonction_fr || '');
            var nameLine = (c.prenom + ' ' + c.nom).trim() || ' ';
            var equipesLabels = (c.equipes || [])
                .map(function (k) { return labelByKey[k] || k; })
                .join(' · ');

            var photoHtml = c.photo
                ? '<img src="/admin/uploads/coachs/' + encodeURIComponent(c.photo)
                    + '" alt="" loading="lazy">'
                : '<span class="coach-photo-placeholder" aria-hidden="true">'
                    + escapeHtml(getInitials(c.prenom, c.nom)) + '</span>';

            html += '<div class="coach-card">' +
                '<div class="coach-photo">' + photoHtml + '</div>' +
                '<div class="coach-info">' +
                    '<h3>' + escapeHtml(nameLine) + '</h3>' +
                    '<p class="coach-category">' + escapeHtml(fonction) +
                        (equipesLabels ? ' &mdash; ' + escapeHtml(equipesLabels) : '') +
                    '</p>' +
                '</div>' +
            '</div>';
        });
        grid.innerHTML = html;
    }).catch(function () {
        grid.innerHTML = '<p class="placeholder-text">' + emptyMsg + '</p>';
    });
})();
