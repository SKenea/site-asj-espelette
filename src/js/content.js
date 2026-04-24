/**
 * ASJ Espelette — Chargement dynamique du contenu
 * Charge les articles et la galerie depuis l'API JSON
 */

(function () {
    var API = '/admin/api.php';
    var lang = document.documentElement.lang === 'eu' ? 'eu' : 'fr';

    var CATEGORY_LABELS = {
        'vie-club':    { fr: 'Vie du club',   eu: 'Klubaren bizia' },
        'evenements':  { fr: 'Ev&eacute;nements',   eu: 'Ekitaldiak' },
        'partenariat': { fr: 'Partenariat',   eu: 'Akordioa' }
    };

    function renderCategory(catKey) {
        if (!catKey || !CATEGORY_LABELS[catKey]) return '';
        var label = CATEGORY_LABELS[catKey][lang] || CATEGORY_LABELS[catKey].fr;
        return '<span class="news-category news-category-' + catKey + '">' + label + '</span>';
    }

    // --- Articles (page accueil) ---
    var newsGrid = document.getElementById('news-grid');
    if (newsGrid) {
        fetch(API + '?action=articles')
            .then(function (r) { return r.json(); })
            .then(function (articles) {
                if (!articles || articles.length === 0) return;
                var html = '';
                // Afficher les 5 derniers articles
                articles.slice(0, 5).forEach(function (a) {
                    var t = a[lang] || a.fr;
                    var imgSrc = a.image
                        ? (a.image.startsWith('http') ? a.image : '/admin/uploads/' + a.image)
                        : '/src/img/backgrounds/placeholder.jpg';
                    var dateStr = formatDate(a.date, lang);

                    html += '<article class="news-card">' +
                        '<div class="news-card-img">' +
                            '<img src="' + imgSrc + '" alt="' + escHtml(t.title) + '" loading="lazy">' +
                        '</div>' +
                        '<div class="news-card-body">' +
                            '<div class="news-meta">' +
                                '<time datetime="' + a.date + '">' + dateStr + '</time>' +
                                renderCategory(a.category) +
                            '</div>' +
                            '<h3>' + escHtml(t.title) + '</h3>' +
                            '<p>' + escHtml(t.summary || '') + '</p>' +
                        '</div>' +
                    '</article>';
                });
                newsGrid.innerHTML = html;
            })
            .catch(function () {
                // Fallback silencieux : le contenu statique reste affiche
            });
    }

    // --- Galerie ---
    var galerieGrid = document.getElementById('galerie-grid');
    if (galerieGrid && galerieGrid.dataset.dynamic !== 'false') {
        fetch(API + '?action=galerie')
            .then(function (r) { return r.json(); })
            .then(function (photos) {
                if (!photos || photos.length === 0) return;
                var html = '';
                photos.forEach(function (p) {
                    var t = p[lang] || p.fr;
                    var dateStr = formatDate(p.date, lang);
                    html += '<div class="galerie-item" data-category="' + (p.category || 'evenements') + '">' +
                        '<img src="/admin/uploads/' + p.filename + '" alt="' + escHtml(t.label || '') + '" loading="lazy">' +
                        '<div class="galerie-caption">' +
                            '<span class="galerie-date">' + dateStr + '</span>' +
                            '<span class="galerie-label">' + escHtml(t.label || p.category) + '</span>' +
                        '</div>' +
                    '</div>';
                });
                galerieGrid.innerHTML = html;

                // Re-init galerie filters + lightbox si galerie.js est charge
                if (window.initGalerie) window.initGalerie();
            })
            .catch(function () {});
    }

    // --- Helpers ---
    function escHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(dateStr, lang) {
        if (!dateStr) return '';
        var parts = dateStr.split('-');
        var months = {
            fr: ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
                 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'],
            eu: ['urtarila', 'otsaila', 'martxoa', 'apirila', 'maiatza', 'ekaina',
                 'uztaila', 'abuztua', 'iraila', 'urria', 'azaroa', 'abendua']
        };
        var m = months[lang] || months.fr;
        var monthIdx = parseInt(parts[1], 10) - 1;
        if (lang === 'eu') {
            return parts[0] + 'ko ' + m[monthIdx] + 'ren ' + parseInt(parts[2], 10) + 'a';
        }
        return parseInt(parts[2], 10) + ' ' + m[monthIdx] + ' ' + parts[0];
    }
})();
