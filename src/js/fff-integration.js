/**
 * ASJ Espelette — Intégration FFF (v3)
 * - Hero match card (prochain match club)
 * - Chips équipes (source : /admin/api.php?action=equipes)
 * - Sous-onglets Précédent / Ce week-end / Suivant
 * - Tableau classement (scraping SSR via proxy)
 */

(function () {
    'use strict';

    var PROXY = '/admin/fff-proxy.php';
    var API = '/admin/api.php';
    var CLUB_CODE = 523288;
    var CLUB_LOGO_OFFICIAL = 'https://cdn-transverse.azureedge.net/phlogos/BC' + CLUB_CODE + '.jpg';
    var lang = document.documentElement.lang === 'eu' ? 'eu' : 'fr';

    var T = {
        fr: {
            heroLabel: 'Prochain match',
            heroVs: 'vs',
            heroItineraire: 'Itinéraire',
            heroEmpty: 'Aucun match à venir.',
            previous: 'Précédent', thisWeekend: 'Ce week-end', next: 'Suivant',
            noUpcoming: 'Aucun match programmé prochainement.',
            loadError: 'Impossible de charger les données.',
            loading: 'Chargement…',
            noResults: 'Aucun résultat disponible.',
            noWeekend: 'Pas de match ce week-end.',
            noPrevious: 'Aucun match joué.',
            noNext: 'Aucun autre match programmé.',
            classementTitle: 'Classement',
            classementEmpty: 'Classement non disponible.',
            colPos: 'Pos', colTeam: 'Équipe', colPts: 'Pts', colJ: 'J',
            colGNP: 'G-N-P', colBP: 'BP', colBC: 'BC', colDiff: 'Diff',
            bilanPlayed: 'matchs joués', bilanWins: 'victoires', bilanDraws: 'nuls', bilanLosses: 'défaites',
            resultW: 'V', resultD: 'N', resultL: 'D',
            upcoming: 'À venir',
            saisonEnd: 'Saison terminée · Prochain match en septembre',
        },
        eu: {
            heroLabel: 'Hurrengo partida',
            heroVs: 'vs',
            heroItineraire: 'Ibilbidea',
            heroEmpty: 'Ez dago hurrengo partidarik.',
            previous: 'Aurrekoa', thisWeekend: 'Aste honetan', next: 'Hurrengoa',
            noUpcoming: 'Ez dago hurrengo partidarik programatua.',
            loadError: 'Ezin dira datuak kargatu.',
            loading: 'Kargatzen…',
            noResults: 'Ez dago emaitzarik.',
            noWeekend: 'Ez dago partidarik aste honetan.',
            noPrevious: 'Ez dago jokaturiko partidarik.',
            noNext: 'Ez dago beste partidarik.',
            classementTitle: 'Sailkapena',
            classementEmpty: 'Sailkapena ez dago erabilgarri.',
            colPos: 'Pos', colTeam: 'Taldea', colPts: 'Pts', colJ: 'J',
            colGNP: 'I-B-G', colBP: 'GA', colBC: 'GK', colDiff: 'Alde',
            bilanPlayed: 'partida jokatu', bilanWins: 'irabazi', bilanDraws: 'berdindu', bilanLosses: 'galdu',
            resultW: 'I', resultD: 'B', resultL: 'G',
            upcoming: 'Datozen',
            saisonEnd: 'Denboraldia amaituta · Hurrengo partida irailean',
        }
    }[lang];

    // ==================================================
    // HELPERS
    // ==================================================

    function escHtml(str) {
        if (str === null || str === undefined) return '';
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function isAsje(nom) {
        if (!nom) return false;
        var n = nom.toUpperCase();
        return n.indexOf('ESPELETTE') >= 0 || n.indexOf('EZPELETA') >= 0 || n.indexOf('A.S.J') >= 0;
    }

    function getInitials(nom) {
        if (!nom) return '?';
        return nom.replace(/[^A-Za-zÀ-ÿ' ]/g, '').trim().split(/\s+/)
            .filter(function (w) { return w.length > 2 || /^[A-Z]/.test(w); })
            .slice(0, 2)
            .map(function (w) { return w[0].toUpperCase(); })
            .join('') || nom[0].toUpperCase();
    }

    function teamLogoHtml(team, cssClass) {
        cssClass = cssClass || 'fff-team-logo';
        var nom = team && team.nom ? team.nom : '';
        var url = team && team.logo ? team.logo : null;
        if (isAsje(nom) && !url) url = CLUB_LOGO_OFFICIAL;
        var initials = getInitials(nom);
        var alt = nom ? 'Logo ' + nom : '';
        if (url) {
            return '<img src="' + escHtml(url) + '" alt="' + escHtml(alt) +
                '" class="' + cssClass + '" loading="lazy" ' +
                'onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'' +
                cssClass + '-fallback\',textContent:\'' + escHtml(initials).replace(/'/g, "\\'") + '\'}))">';
        }
        return '<span class="' + cssClass + '-fallback">' + escHtml(initials) + '</span>';
    }

    function formatDateShort(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var jours = {
            fr: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
            eu: ['Ig.', 'Al.', 'Ar.', 'Az.', 'Og.', 'Or.', 'Lr.'],
        };
        var mois = {
            fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
            eu: ['urt.', 'ots.', 'mar.', 'api.', 'mai.', 'eka.', 'uzt.', 'abu.', 'ira.', 'urr.', 'aza.', 'abe.'],
        };
        return (jours[lang] || jours.fr)[d.getDay()] + ' ' + d.getDate() + ' ' + (mois[lang] || mois.fr)[d.getMonth()];
    }

    function formatDateLong(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var jours = {
            fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
            eu: ['Igandea', 'Astelehena', 'Asteartea', 'Asteazkena', 'Osteguna', 'Ostirala', 'Larunbata'],
        };
        var mois = {
            fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
            eu: ['urtarrila', 'otsaila', 'martxoa', 'apirila', 'maiatza', 'ekaina', 'uztaila', 'abuztua', 'iraila', 'urria', 'azaroa', 'abendua'],
        };
        if (lang === 'eu') {
            return (jours.eu)[d.getDay()] + ' ' + d.getDate() + ' ' + mois.eu[d.getMonth()];
        }
        return jours.fr[d.getDay()] + ' ' + d.getDate() + ' ' + mois.fr[d.getMonth()];
    }

    function formatHeure(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function isJoue(m) { return m.statut === 'joue' || m.statut === 'joué' || m.joue === true; }

    function getAsjeOutcome(match) {
        if (!isJoue(match)) return null;
        var dom = match.domicile || {}, ext = match.exterieur || {};
        if (dom.buts === null || dom.buts === undefined) return null;
        var asjeHome = isAsje(dom.nom), asjeAway = isAsje(ext.nom);
        if (!asjeHome && !asjeAway) return null;
        if (dom.buts === ext.buts) return 'D';
        return ((asjeHome && dom.buts > ext.buts) || (asjeAway && ext.buts > dom.buts)) ? 'W' : 'L';
    }

    /** Renvoie [lundiThisWeek, dimancheThisWeek] au format YYYY-MM-DD */
    function getThisWeekendBounds() {
        var now = new Date();
        var day = now.getDay(); // 0 = dimanche, 1 = lundi, ...
        // Samedi = jour 6, dimanche = jour 0 ; on prend le samedi passé le plus proche ou celui à venir
        var sat = new Date(now);
        sat.setHours(0, 0, 0, 0);
        var daysToSat = (6 - day + 7) % 7; // nb de jours jusqu'au samedi à venir
        if (day === 0) { sat.setDate(sat.getDate() - 1); } // dimanche : samedi = hier
        else { sat.setDate(sat.getDate() + daysToSat); }
        var sun = new Date(sat);
        sun.setDate(sat.getDate() + 1);
        sun.setHours(23, 59, 59, 999);
        return [sat, sun];
    }

    // ==================================================
    // CARD MATCH (reprend la version précédente)
    // ==================================================

    function renderMatchCard(m, opts) {
        opts = opts || {};
        var played = isJoue(m);
        var outcome = getAsjeOutcome(m);
        var dom = m.domicile || {}, ext = m.exterieur || {};
        var cardClass = 'fff-match-card';
        if (opts.compact) cardClass += ' fff-match-card--compact';
        if (!played) cardClass += ' fff-upcoming';
        else if (outcome === 'W') cardClass += ' fff-win';
        else if (outcome === 'L') cardClass += ' fff-loss';
        else if (outcome === 'D') cardClass += ' fff-draw-result';
        else cardClass += ' fff-played';

        var badge = '';
        if (outcome === 'W') badge = '<span class="fff-result-badge fff-result-badge--V">' + T.resultW + '</span>';
        else if (outcome === 'D') badge = '<span class="fff-result-badge fff-result-badge--N">' + T.resultD + '</span>';
        else if (outcome === 'L') badge = '<span class="fff-result-badge fff-result-badge--D">' + T.resultL + '</span>';
        else if (!played) badge = '<span class="fff-result-badge fff-result-badge--upcoming">' + escHtml(T.upcoming.charAt(0)) + '</span>';

        var homeClass = 'fff-team fff-team-home' + (isAsje(dom.nom) ? ' fff-team--asje' : '');
        var awayClass = 'fff-team fff-team-away' + (isAsje(ext.nom) ? ' fff-team--asje' : '');
        var scoreHtml;
        if (played && dom.buts !== null && dom.buts !== undefined) {
            scoreHtml = '<div class="fff-score"><span class="fff-score-num">' + dom.buts +
                '</span><span class="fff-score-sep">·</span><span class="fff-score-num">' + ext.buts + '</span></div>';
        } else {
            scoreHtml = '<div class="fff-score"><span class="fff-score-time">' + formatHeure(m.date) + '</span></div>';
        }

        return '<article class="' + cardClass + '">' +
            '<div class="fff-match-header">' +
                '<span class="fff-match-competition">' + escHtml(m.competition || '') + '</span>' +
                (m.journee ? '<span class="fff-match-journee">J' + escHtml(String(m.journee)) + '</span>' : '') +
                badge +
            '</div>' +
            '<div class="fff-match-content">' +
                '<div class="' + homeClass + '">' + teamLogoHtml(dom) + '<span class="fff-team-name">' + escHtml(dom.nom || '') + '</span></div>' +
                scoreHtml +
                '<div class="' + awayClass + '">' + teamLogoHtml(ext) + '<span class="fff-team-name">' + escHtml(ext.nom || '') + '</span></div>' +
            '</div>' +
            '<div class="fff-match-footer">' +
                '<span class="fff-match-date">' + formatDateShort(m.date) + '</span>' +
            '</div>' +
        '</article>';
    }

    // ==================================================
    // HERO match
    // ==================================================

    function renderHeroMatch(match, equipeLabel) {
        var el = document.getElementById('fff-hero');
        if (!el) return;
        if (!match) {
            el.className = 'fff-hero fff-hero--empty';
            el.innerHTML = '<p>' + T.heroEmpty + '</p>';
            return;
        }
        el.className = 'fff-hero';
        var dom = match.domicile || {}, ext = match.exterieur || {};
        var played = isJoue(match);
        var terrainNom = (match.terrain && match.terrain.nom) || '';
        var tLoc = match.terrain && match.terrain.adresse
            ? (Array.isArray(match.terrain.adresse) ? match.terrain.adresse.join(', ') : match.terrain.adresse)
            : '';

        var mapUrl = terrainNom || tLoc
            ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([terrainNom, tLoc].filter(Boolean).join(' '))
            : null;

        var middleHtml;
        if (played && dom.buts !== null && dom.buts !== undefined) {
            middleHtml = '<span class="fff-hero__date">' + escHtml(formatDateLong(match.date)) + '</span>' +
                '<div class="fff-hero__score">' +
                    '<span class="fff-hero__score-num">' + dom.buts + '</span>' +
                    '<span class="fff-hero__score-sep">·</span>' +
                    '<span class="fff-hero__score-num">' + ext.buts + '</span>' +
                '</div>';
        } else {
            middleHtml = '<span class="fff-hero__date">' + escHtml(formatDateLong(match.date)) + '</span>' +
                '<span class="fff-hero__time">' + formatHeure(match.date) + '</span>';
        }

        el.innerHTML =
            '<div>' +
                '<span class="fff-hero__label">' + T.heroLabel + '</span>' +
                (equipeLabel ? '<span class="fff-hero__equipe-tag">' + escHtml(equipeLabel) + '</span>' : '') +
            '</div>' +
            '<div class="fff-hero__content">' +
                '<div class="fff-hero__team">' + teamLogoHtml(dom, 'fff-hero__team-logo') +
                    '<span class="fff-hero__team-name">' + escHtml(dom.nom || '?') + '</span></div>' +
                '<div class="fff-hero__middle">' + middleHtml + '</div>' +
                '<div class="fff-hero__team fff-hero__team--away">' + teamLogoHtml(ext, 'fff-hero__team-logo') +
                    '<span class="fff-hero__team-name">' + escHtml(ext.nom || '?') + '</span></div>' +
            '</div>' +
            '<div class="fff-hero__footer">' +
                (terrainNom || tLoc ? '<span class="fff-hero__lieu">📍 ' + escHtml(terrainNom || tLoc) + '</span>' : '<span></span>') +
                (mapUrl && !played ? '<a class="fff-hero__cta" href="' + mapUrl + '" target="_blank" rel="noopener">🗺️ ' + T.heroItineraire + '</a>' : '') +
            '</div>';
    }

    // ==================================================
    // BILAN (4 KPI)
    // ==================================================

    function renderBilan(matchs) {
        var played = 0, W = 0, D = 0, L = 0;
        matchs.forEach(function (m) {
            var o = getAsjeOutcome(m);
            if (o === null) return;
            played++;
            if (o === 'W') W++;
            else if (o === 'D') D++;
            else if (o === 'L') L++;
        });
        return '<div class="fff-bilan">' +
            '<div class="fff-bilan__kpi"><span class="fff-bilan__value">' + played + '</span><span class="fff-bilan__label">' + T.bilanPlayed + '</span></div>' +
            '<div class="fff-bilan__kpi"><span class="fff-bilan__value fff-bilan__value--victory">' + W + '</span><span class="fff-bilan__label">' + T.bilanWins + '</span></div>' +
            '<div class="fff-bilan__kpi"><span class="fff-bilan__value fff-bilan__value--draw">' + D + '</span><span class="fff-bilan__label">' + T.bilanDraws + '</span></div>' +
            '<div class="fff-bilan__kpi"><span class="fff-bilan__value fff-bilan__value--defeat">' + L + '</span><span class="fff-bilan__label">' + T.bilanLosses + '</span></div>' +
        '</div>';
    }

    // ==================================================
    // CLASSEMENT
    // ==================================================

    function renderClassement(rows) {
        if (!rows || !rows.length) {
            return '<p class="fff-empty">' + T.classementEmpty + '</p>';
        }
        var head = '<thead><tr>' +
            '<th>' + T.colPos + '</th>' +
            '<th>' + T.colTeam + '</th>' +
            '<th>' + T.colPts + '</th>' +
            '<th class="hide-sm">' + T.colJ + '</th>' +
            '<th class="hide-sm">' + T.colGNP + '</th>' +
            '<th class="hide-sm">' + T.colBP + '</th>' +
            '<th class="hide-sm">' + T.colBC + '</th>' +
            '<th>' + T.colDiff + '</th>' +
            '</tr></thead>';

        var body = '<tbody>' + rows.map(function (r) {
            var c = r.club || {};
            var asje = isAsje(c.nom);
            var logo = c.logo ? '<img class="fff-classement-logo" src="' + escHtml(c.logo) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'fff-classement-logo-fallback\',textContent:\'' + escHtml(getInitials(c.nom)).replace(/\'/g, "\\'") + '\'}))">'
                : '<span class="fff-classement-logo-fallback">' + escHtml(getInitials(c.nom)) + '</span>';
            var diff = r.difference;
            var diffClass = diff > 0 ? 'fff-classement-diff--pos' : (diff < 0 ? 'fff-classement-diff--neg' : '');
            var diffStr = diff > 0 ? '+' + diff : String(diff);
            return '<tr' + (asje ? ' class="is-asje"' : '') + '>' +
                '<td>' + r.position + '</td>' +
                '<td><div class="fff-classement-team">' + logo + '<span>' + escHtml(c.nom || '') + '</span></div></td>' +
                '<td class="fff-classement-pts">' + r.points + '</td>' +
                '<td class="hide-sm">' + r.joues + '</td>' +
                '<td class="hide-sm">' + r.gagnes + '-' + r.nuls + '-' + r.perdus + '</td>' +
                '<td class="hide-sm">' + r.buts_pour + '</td>' +
                '<td class="hide-sm">' + r.buts_contre + '</td>' +
                '<td class="' + diffClass + '">' + diffStr + '</td>' +
            '</tr>';
        }).join('') + '</tbody>';

        return '<div class="fff-classement-wrap">' +
            '<div class="fff-classement-head"><h3>' + T.classementTitle + '</h3></div>' +
            '<table class="fff-classement-table">' + head + body + '</table>' +
        '</div>';
    }

    // ==================================================
    // AGENDA — chargement équipes puis rendu
    // ==================================================

    var agendaContainer = document.getElementById('agenda-app');
    if (agendaContainer) initAgenda();

    function initAgenda() {
        var tabsHost = document.getElementById('fff-equipe-tabs');
        var subTabsHost = document.getElementById('fff-subview-tabs');
        var listHost = document.getElementById('fff-agenda-list');
        var bilanHost = document.getElementById('fff-bilan-host');
        var classementHost = document.getElementById('fff-classement');

        var state = { equipe: null, subview: 'weekend', matchs: [], equipes: [] };

        fetch(API + '?action=equipes').then(function (r) { return r.json(); }).then(function (cfg) {
            state.equipes = (cfg.equipes || []).filter(function (e) { return e.competition !== false; });
            if (!state.equipes.length) {
                listHost.innerHTML = '<p class="fff-empty">Configuration des équipes manquante.</p>';
                return;
            }
            state.equipes.sort(function (a, b) { return (a.ordre || 99) - (b.ordre || 99); });
            state.equipe = state.equipes[0].key;
            renderEquipeTabs();
            loadEquipe(state.equipe);
        }).catch(function () {
            listHost.innerHTML = '<p class="fff-error">' + T.loadError + '</p>';
        });

        function labelOf(eq) { return lang === 'eu' ? (eq.label_eu || eq.label_fr) : eq.label_fr; }

        function renderEquipeTabs() {
            if (!tabsHost) return;
            tabsHost.innerHTML = state.equipes.map(function (eq) {
                return '<button type="button" class="fff-tab' + (eq.key === state.equipe ? ' is-active' : '') +
                    '" data-equipe="' + escHtml(eq.key) + '" role="tab">' + escHtml(labelOf(eq)) + '</button>';
            }).join('');

            Array.prototype.forEach.call(tabsHost.querySelectorAll('.fff-tab'), function (btn) {
                btn.addEventListener('click', function () {
                    var key = btn.dataset.equipe;
                    if (key === state.equipe) return;
                    state.equipe = key;
                    Array.prototype.forEach.call(tabsHost.querySelectorAll('.fff-tab'), function (b) {
                        b.classList.toggle('is-active', b.dataset.equipe === key);
                    });
                    loadEquipe(key);
                });
            });
        }

        function setSubview(sv) {
            state.subview = sv;
            if (subTabsHost) {
                Array.prototype.forEach.call(subTabsHost.querySelectorAll('.view-tab'), function (b) {
                    b.classList.toggle('is-active', b.dataset.view === sv);
                });
            }
            renderList();
        }

        if (subTabsHost) {
            subTabsHost.addEventListener('click', function (e) {
                var btn = e.target.closest('.view-tab');
                if (btn && btn.dataset.view) setSubview(btn.dataset.view);
            });
        }

        function loadEquipe(key) {
            var eq = state.equipes.find(function (e) { return e.key === key; });
            listHost.innerHTML = '<div class="fff-loading">' + T.loading + '</div>';
            if (bilanHost) bilanHost.innerHTML = '';
            if (classementHost) classementHost.innerHTML = '<div class="fff-loading">' + T.loading + '</div>';

            // Parallèle : résultats + classement
            Promise.all([
                fetch(PROXY + '?action=resultats&equipe=' + encodeURIComponent(key)).then(function (r) { return r.json(); }),
                fetch(PROXY + '?action=classement&equipe=' + encodeURIComponent(key)).then(function (r) { return r.json(); }).catch(function () { return null; }),
            ]).then(function (data) {
                var resultats = data[0] || {};
                var classement = data[1] || {};
                state.matchs = resultats.matchs || [];

                // Hero : prochain match de cette équipe, sinon dernier match joué
                var futurs = state.matchs.filter(function (m) { return !isJoue(m) && m.date; })
                    .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
                var passes = state.matchs.filter(isJoue)
                    .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

                var heroMatch = futurs[0] || passes[0];
                renderHeroMatch(heroMatch, eq ? labelOf(eq) : '');

                renderList();

                if (classementHost) {
                    classementHost.innerHTML = renderClassement(classement.rows);
                }
            }).catch(function () {
                listHost.innerHTML = '<p class="fff-error">' + T.loadError + '</p>';
            });
        }

        function renderList() {
            if (!state.matchs.length) {
                listHost.innerHTML = '<p class="fff-empty">' + T.noResults + '</p>';
                if (bilanHost) bilanHost.innerHTML = '';
                return;
            }

            var now = new Date();
            var bounds = getThisWeekendBounds();
            var satStart = bounds[0], sunEnd = bounds[1];

            if (state.subview === 'previous') {
                var passes = state.matchs.filter(isJoue)
                    .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
                if (bilanHost) bilanHost.innerHTML = renderBilan(state.matchs);
                if (!passes.length) { listHost.innerHTML = '<p class="fff-empty">' + T.noPrevious + '</p>'; return; }
                listHost.innerHTML = passes.map(function (m) { return renderMatchCard(m); }).join('');
            } else if (state.subview === 'weekend') {
                if (bilanHost) bilanHost.innerHTML = '';
                var weekend = state.matchs.filter(function (m) {
                    if (!m.date) return false;
                    var d = new Date(m.date);
                    return d >= satStart && d <= sunEnd;
                });
                if (!weekend.length) { listHost.innerHTML = '<p class="fff-empty">' + T.noWeekend + '</p>'; return; }
                listHost.innerHTML = weekend.map(function (m) { return renderMatchCard(m); }).join('');
            } else if (state.subview === 'next') {
                if (bilanHost) bilanHost.innerHTML = '';
                var futurs = state.matchs.filter(function (m) {
                    if (isJoue(m) || !m.date) return false;
                    return new Date(m.date) > sunEnd;
                }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
                if (!futurs.length) { listHost.innerHTML = '<p class="fff-empty">' + T.noNext + '</p>'; return; }
                listHost.innerHTML = futurs.map(function (m) { return renderMatchCard(m); }).join('');
            }
        }
    }

    // ==================================================
    // PAGE ACCUEIL — prochains matchs + derniers résultats (inchangé)
    // ==================================================

    var prochainsMatchsEl = document.getElementById('prochains-matchs');
    if (prochainsMatchsEl) {
        fetch(PROXY + '?action=prochains-matchs&limit=5')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.prochains_matchs || !data.prochains_matchs.length) {
                    prochainsMatchsEl.innerHTML = '<p class="fff-empty">' + T.noUpcoming + '</p>';
                    return;
                }
                prochainsMatchsEl.innerHTML = data.prochains_matchs.map(function (s) {
                    return renderPlanningItem(s);
                }).join('');
            })
            .catch(function () {
                prochainsMatchsEl.innerHTML = '<p class="fff-empty">' + T.loadError + '</p>';
            });
    }

    var derniersResultatsEl = document.getElementById('derniers-resultats');
    if (derniersResultatsEl) {
        fetch(PROXY + '?action=resultats&equipe=senior1')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.matchs || !data.matchs.length) {
                    derniersResultatsEl.innerHTML = '<p class="fff-empty">' + T.noResults + '</p>';
                    return;
                }
                var joues = data.matchs.filter(isJoue);
                derniersResultatsEl.innerHTML = joues.slice(-3).reverse().map(function (m) {
                    return renderMatchCard(m, { compact: true });
                }).join('');

                var upcoming = data.matchs.filter(function (m) { return !isJoue(m) && m.date; })
                    .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
                if (upcoming.length) {
                    var days = (new Date(upcoming[0].date) - new Date()) / 86400000;
                    if (days > 0 && days < 14) renderCountdown(upcoming[0]);
                }
            })
            .catch(function () {
                derniersResultatsEl.innerHTML = '<p class="fff-empty">' + T.loadError + '</p>';
            });
    }

    function renderPlanningItem(s) {
        var dateStr = s.date ? formatDateShort(s.date) : (lang === 'eu' ? 'Data zehazteke' : 'Date à définir');
        var heureStr = s.date ? formatHeure(s.date) : '';
        var equipes = s.equipes && s.equipes.length
            ? s.equipes.map(function (e) { return escHtml(e.nom); }).join(', ')
            : escHtml(s.organisateur || '');
        var terrainNom = (s.terrain && s.terrain.nom) || '';
        if (!terrainNom && s.terrain && s.terrain.adresse && s.terrain.adresse.length) {
            terrainNom = s.terrain.adresse[s.terrain.adresse.length - 1];
        }
        return '<div class="fff-planning-item">' +
            '<div class="fff-planning-date">' +
                '<span class="fff-date">' + escHtml(dateStr) + '</span>' +
                (heureStr ? '<span class="fff-heure">' + heureStr + '</span>' : '') +
            '</div>' +
            '<div class="fff-planning-detail">' +
                '<div class="fff-planning-equipes">' + equipes + '</div>' +
                (terrainNom ? '<div class="fff-planning-lieu">📍 ' + escHtml(terrainNom) + '</div>' : '') +
            '</div>' +
        '</div>';
    }

    function renderCountdown(match) {
        var el = document.getElementById('hero-countdown');
        if (!el || !match || !match.date) return;
        var dom = match.domicile || {}, ext = match.exterieur || {};
        var target = new Date(match.date);
        el.innerHTML =
            '<div class="hero-countdown__label">' + T.heroLabel + '</div>' +
            '<div class="hero-countdown__match">' + escHtml((dom.nom || '?') + ' vs ' + (ext.nom || '?')) + '</div>' +
            '<div class="hero-countdown__time" id="countdown-timer"></div>';
        el.classList.add('is-visible');
        function tick() {
            var diff = target - new Date();
            if (diff <= 0) { el.classList.remove('is-visible'); return; }
            var d = Math.floor(diff / 86400000);
            var h = Math.floor((diff % 86400000) / 3600000);
            var mn = Math.floor((diff % 3600000) / 60000);
            var units = lang === 'eu' ? [[d,'egun'],[h,'ordu'],[mn,'min.']] : [[d,'jours'],[h,'heures'],[mn,'min.']];
            document.getElementById('countdown-timer').innerHTML = units.map(function (u) {
                return '<div class="hero-countdown__unit"><span class="hero-countdown__num">' + u[0] + '</span><span class="hero-countdown__name">' + u[1] + '</span></div>';
            }).join('');
        }
        tick();
        setInterval(tick, 60000);
    }
})();
