/**
 * Affichage dynamique du bureau (page Le Club / Kluba).
 * Récupère la liste des membres depuis /admin/api.php?action=bureau
 * et la rend dans #bureau-grid en respectant la langue de la page (data-lang).
 */
(function () {
    'use strict';

    var grid = document.getElementById('bureau-grid');
    if (!grid) return;

    var lang = grid.dataset.lang || 'fr';
    var emptyMsg = lang === 'eu'
        ? 'Zuzendaritza eguneratzen ari da.'
        : 'La composition du bureau sera mise à jour prochainement.';

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    fetch('/admin/api.php?action=bureau')
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (members) {
            if (!Array.isArray(members) || !members.length) {
                grid.innerHTML = '<p class="placeholder-text">' + emptyMsg + '</p>';
                return;
            }
            var html = '';
            members.forEach(function (m) {
                var fonction = lang === 'eu' && m.fonction_eu ? m.fonction_eu : (m.fonction_fr || '');
                var nameLine = (m.prenom + ' ' + m.nom).trim() || ' ';
                var photoHtml = m.photo
                    ? '<img src="/admin/uploads/bureau/' + encodeURIComponent(m.photo)
                        + '" alt="" class="bureau-photo" loading="lazy">'
                    : '';
                html += '<div class="bureau-card">' +
                    photoHtml +
                    '<h3>' + escapeHtml(fonction) + '</h3>' +
                    '<p class="bureau-name">' + escapeHtml(nameLine) + '</p>' +
                '</div>';
            });
            grid.innerHTML = html;
        })
        .catch(function () {
            grid.innerHTML = '<p class="placeholder-text">' + emptyMsg + '</p>';
        });
})();
