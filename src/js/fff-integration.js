/**
 * ASJ Espelette — Integration FFF
 * Charge et affiche le calendrier, resultats et prochains matchs
 * depuis le proxy PHP (qui recupere les donnees de la FFF)
 */

(function () {
    var PROXY = '/admin/fff-proxy.php';
    var lang = document.documentElement.lang === 'eu' ? 'eu' : 'fr';

    // --- Prochains matchs (page accueil) ---
    var prochainsMatchsEl = document.getElementById('prochains-matchs');
    if (prochainsMatchsEl) {
        fetch(PROXY + '?action=prochains-matchs&limit=5')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.prochains_matchs || data.prochains_matchs.length === 0) {
                    prochainsMatchsEl.innerHTML = '<p class="fff-empty">' +
                        (lang === 'eu' ? 'Ez dago hurrengo partidarik programatua.' : 'Aucun match programme prochainement.') +
                        '</p>';
                    return;
                }
                var html = '';
                data.prochains_matchs.forEach(function (m) {
                    var dateStr = formatDateFFF(m.date, lang);
                    var heureStr = formatHeure(m.date);
                    var equipesStr = m.equipes.map(function (e) { return escHtml(e.nom); }).join(' vs ');

                    html += '<div class="fff-match-card fff-upcoming">' +
                        '<div class="fff-match-date">' +
                            '<span class="fff-date">' + dateStr + '</span>' +
                            '<span class="fff-heure">' + heureStr + '</span>' +
                        '</div>' +
                        '<div class="fff-match-equipes">' + equipesStr + '</div>';
                    if (m.terrain) {
                        html += '<div class="fff-match-lieu">' + escHtml(m.terrain.nom) + '</div>';
                    }
                    html += '</div>';
                });
                prochainsMatchsEl.innerHTML = html;
            })
            .catch(function () {
                prochainsMatchsEl.innerHTML = '<p class="fff-empty">' +
                    (lang === 'eu' ? 'Ezin dira datuak kargatu.' : 'Impossible de charger les donnees.') +
                    '</p>';
            });
    }

    // --- Resultats derniers matchs (page accueil) ---
    var derniersResultatsEl = document.getElementById('derniers-resultats');
    if (derniersResultatsEl) {
        fetch(PROXY + '?action=resultats&equipe=senior1')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.matchs || data.matchs.length === 0) return;
                var html = '';
                // Afficher les 3 derniers matchs joues
                var joues = data.matchs.filter(function (m) { return m.statut === 'joue' || m.statut === 'joué'; });
                joues.slice(-3).reverse().forEach(function (m) {
                    html += renderMatchResult(m, lang);
                });
                derniersResultatsEl.innerHTML = html;
            })
            .catch(function () {});
    }

    // --- Page calendrier / resultats ---
    var calendrierEl = document.getElementById('fff-calendrier');
    if (calendrierEl) {
        var equipeSelect = document.getElementById('fff-equipe-select');
        var currentEquipe = (equipeSelect && equipeSelect.value) || 'senior1';

        function loadResultats(equipe) {
            calendrierEl.innerHTML = '<div class="fff-loading">' +
                (lang === 'eu' ? 'Kargatzen...' : 'Chargement...') + '</div>';

            fetch(PROXY + '?action=resultats&equipe=' + equipe)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (!data.matchs || data.matchs.length === 0) {
                        calendrierEl.innerHTML = '<p class="fff-empty">' +
                            (lang === 'eu' ? 'Ez dago emaitzarik.' : 'Aucun resultat disponible.') + '</p>';
                        return;
                    }

                    var html = '<div class="fff-resultats-list">';

                    // Grouper par mois
                    var parMois = {};
                    data.matchs.forEach(function (m) {
                        var moisKey = m.date ? m.date.substring(0, 7) : 'sans-date';
                        if (!parMois[moisKey]) parMois[moisKey] = [];
                        parMois[moisKey].push(m);
                    });

                    Object.keys(parMois).sort().forEach(function (moisKey) {
                        var moisLabel = formatMois(moisKey, lang);
                        html += '<h3 class="fff-mois-title">' + moisLabel + '</h3>';

                        parMois[moisKey].forEach(function (m) {
                            html += renderMatchResult(m, lang);
                        });
                    });

                    html += '</div>';
                    calendrierEl.innerHTML = html;
                })
                .catch(function () {
                    calendrierEl.innerHTML = '<p class="fff-error">' +
                        (lang === 'eu' ? 'Errorea datuak kargatzean.' : 'Erreur lors du chargement.') + '</p>';
                });
        }

        // Charger les resultats au demarrage
        loadResultats(currentEquipe);

        // Ecouter le changement d'equipe
        if (equipeSelect) {
            equipeSelect.addEventListener('change', function () {
                loadResultats(this.value);
            });
        }
    }

    // --- Calendrier planning (tous les sites) ---
    var planningEl = document.getElementById('fff-planning');
    if (planningEl) {
        fetch(PROXY + '?action=calendrier&mois_avant=0&mois_apres=3')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.sites || data.sites.length === 0) {
                    planningEl.innerHTML = '<p class="fff-empty">' +
                        (lang === 'eu' ? 'Ez dago hurrengo partidarik.' : 'Aucun match programme.') + '</p>';
                    return;
                }

                var html = '';
                data.sites.forEach(function (s) {
                    if (s.annule) return;
                    var dateStr = s.date ? formatDateFFF(s.date, lang) : (lang === 'eu' ? 'Data zehazteke' : 'Date a definir');
                    var heureStr = s.date ? formatHeure(s.date) : '';
                    var equipesStr = s.equipes.map(function (e) { return escHtml(e.nom); }).join(', ');

                    html += '<div class="fff-planning-item">' +
                        '<div class="fff-planning-date">' +
                            '<span class="fff-date">' + dateStr + '</span>' +
                            (heureStr ? '<span class="fff-heure">' + heureStr + '</span>' : '') +
                        '</div>' +
                        '<div class="fff-planning-detail">' +
                            '<div class="fff-planning-equipes">' + equipesStr + '</div>';
                    if (s.terrain) {
                        html += '<div class="fff-planning-lieu">' + escHtml(s.terrain.nom) + '</div>';
                    }
                    html += '</div></div>';
                });
                planningEl.innerHTML = html;
            })
            .catch(function () {
                planningEl.innerHTML = '<p class="fff-error">' +
                    (lang === 'eu' ? 'Errorea datuak kargatzean.' : 'Erreur lors du chargement.') + '</p>';
            });
    }


    // ========================================
    // RENDU D'UN MATCH
    // ========================================

    function renderMatchResult(m, lang) {
        var dateStr = formatDateFFF(m.date, lang);
        var isPlayed = (m.statut === 'joue' || m.statut === 'joué');
        var statusClass = isPlayed ? 'fff-played' : 'fff-upcoming';

        var html = '<div class="fff-match-card ' + statusClass + '">' +
            '<div class="fff-match-header">' +
                '<span class="fff-match-competition">' + escHtml(m.competition) + '</span>' +
                (m.journee ? '<span class="fff-match-journee">J' + m.journee + '</span>' : '') +
            '</div>' +
            '<div class="fff-match-content">' +
                '<div class="fff-team fff-team-home">' +
                    (m.domicile.logo ? '<img src="' + m.domicile.logo + '" alt="" class="fff-team-logo" loading="lazy">' : '') +
                    '<span class="fff-team-name">' + escHtml(m.domicile.nom) + '</span>' +
                '</div>' +
                '<div class="fff-score">';

        if (isPlayed && m.domicile.buts !== null) {
            html += '<span class="fff-score-num">' + m.domicile.buts + '</span>' +
                    '<span class="fff-score-sep">-</span>' +
                    '<span class="fff-score-num">' + m.exterieur.buts + '</span>';
        } else {
            var heureStr = formatHeure(m.date);
            html += '<span class="fff-score-time">' + heureStr + '</span>';
        }

        html += '</div>' +
                '<div class="fff-team fff-team-away">' +
                    (m.exterieur.logo ? '<img src="' + m.exterieur.logo + '" alt="" class="fff-team-logo" loading="lazy">' : '') +
                    '<span class="fff-team-name">' + escHtml(m.exterieur.nom) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="fff-match-footer">' +
                '<span class="fff-match-date">' + dateStr + '</span>' +
            '</div>' +
        '</div>';

        return html;
    }


    // ========================================
    // HELPERS
    // ========================================

    function escHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDateFFF(dateStr, lang) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var jours = {
            fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
            eu: ['igandea', 'astelehena', 'asteartea', 'asteazkena', 'osteguna', 'ostirala', 'larunbata']
        };
        var mois = {
            fr: ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
                 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'],
            eu: ['urtarila', 'otsaila', 'martxoa', 'apirila', 'maiatza', 'ekaina',
                 'uztaila', 'abuztua', 'iraila', 'urria', 'azaroa', 'abendua']
        };

        var j = jours[lang] || jours.fr;
        var m = mois[lang] || mois.fr;

        if (lang === 'eu') {
            return j[d.getDay()] + ', ' + d.getFullYear() + 'ko ' + m[d.getMonth()] + 'ren ' + d.getDate() + 'a';
        }
        return j[d.getDay()] + ' ' + d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
    }

    function formatHeure(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var h = d.getHours().toString().padStart(2, '0');
        var m = d.getMinutes().toString().padStart(2, '0');
        return h + ':' + m;
    }

    function formatMois(moisKey, lang) {
        if (!moisKey || moisKey === 'sans-date') return lang === 'eu' ? 'Datarik gabe' : 'Sans date';
        var parts = moisKey.split('-');
        var mois = {
            fr: ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
                 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
            eu: ['Urtarila', 'Otsaila', 'Martxoa', 'Apirila', 'Maiatza', 'Ekaina',
                 'Uztaila', 'Abuztua', 'Iraila', 'Urria', 'Azaroa', 'Abendua']
        };
        var m = mois[lang] || mois.fr;
        var idx = parseInt(parts[1], 10) - 1;
        return m[idx] + ' ' + parts[0];
    }
})();
