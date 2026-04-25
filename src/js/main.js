/**
 * ASJ Espelette — Main JavaScript
 * Navigation mobile, cookie banner, utilitaires
 */

document.addEventListener('DOMContentLoaded', function () {

    // --- Navigation mobile ---
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function () {
            mainNav.classList.toggle('is-open');
            // Animation hamburger
            menuToggle.classList.toggle('is-active');
        });

        // Fermer le menu au clic sur un lien
        mainNav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                mainNav.classList.remove('is-open');
                menuToggle.classList.remove('is-active');
            });
        });
    }

    // --- Cookie banner ---
    var cookieConsent = localStorage.getItem('asje-cookie-consent');

    if (!cookieConsent) {
        var isEuskara = document.documentElement.lang === 'eu';
        var message = isEuskara
            ? 'Webgune honek cookie teknikoak erabiltzen ditu bere funtzionamendu egokirako.'
            : 'Ce site utilise uniquement des cookies techniques n\u00e9cessaires \u00e0 son fonctionnement.';
        var moreLink = isEuskara ? 'Xehetasun gehiago' : 'En savoir plus';
        var btnText = isEuskara ? 'Onartu' : 'J\'ai compris';
        var legalPath = isEuskara ? '/eu/lege-aipamenak.html' : '/fr/politique-cookies.html';

        var banner = document.createElement('div');
        banner.className = 'cookie-banner';
        banner.setAttribute('role', 'alert');
        banner.innerHTML =
            '<span class="cookie-banner__text">' + message +
            ' <a href="' + legalPath + '">' + moreLink + '</a></span>' +
            '<button class="cookie-banner__btn" type="button">' + btnText + '</button>';

        document.body.appendChild(banner);
        document.body.classList.add('has-cookie-banner');

        banner.querySelector('.cookie-banner__btn').addEventListener('click', function () {
            localStorage.setItem('asje-cookie-consent', 'accepted');
            banner.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            banner.style.opacity = '0';
            banner.style.transform = 'translateY(20px)';
            setTimeout(function () {
                banner.remove();
                document.body.classList.remove('has-cookie-banner');
            }, 250);
        });
    }

    // --- View tabs (Calendrier / Résultats) ---
    // Générique : toute nav.view-tabs avec .view-tab[data-view] switche les .view-panel[id="<prefix>-<view>"]
    document.querySelectorAll('.view-tabs').forEach(function (nav) {
        var prefix = nav.id.replace(/-tabs$/, '');
        nav.addEventListener('click', function (e) {
            var btn = e.target.closest('.view-tab');
            if (!btn || !btn.dataset.view) return;
            var view = btn.dataset.view;
            nav.querySelectorAll('.view-tab').forEach(function (b) {
                var active = b.dataset.view === view;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            document.querySelectorAll('.view-panel').forEach(function (panel) {
                if (panel.id.indexOf(prefix + '-') === 0) {
                    var match = panel.id === prefix + '-' + view;
                    panel.classList.toggle('is-active', match);
                    panel.hidden = !match;
                }
            });
        });
    });

    // --- Année courante dans le footer ---
    var currentYear = new Date().getFullYear();
    document.querySelectorAll('.js-year').forEach(function (el) {
        el.textContent = currentYear;
    });

    // --- News carousels (scroll-snap + prev/next + dots) ---
    document.querySelectorAll('.news-carousel').forEach(function (carousel) {
        var track = carousel.querySelector('.news-carousel__track');
        var btnPrev = carousel.querySelector('.news-carousel__btn--prev');
        var btnNext = carousel.querySelector('.news-carousel__btn--next');
        var dotsHost = carousel.querySelector('.news-carousel__dots');
        if (!track) return;

        function cardStep() {
            var firstCard = track.querySelector('.news-card');
            if (!firstCard) return track.clientWidth * 0.9;
            var styles = getComputedStyle(track);
            var gap = parseFloat(styles.columnGap || styles.gap || 0);
            return firstCard.getBoundingClientRect().width + gap;
        }

        function scrollTarget(target) {
            try { track.scrollTo({ left: target, behavior: 'smooth' }); }
            catch (e) { track.scrollLeft = target; }
        }

        function scrollByStep(dir) {
            var step = cardStep();
            var maxScroll = track.scrollWidth - track.clientWidth;
            var current = track.scrollLeft;
            var target;

            if (dir > 0 && current >= maxScroll - 4) target = 0;
            else if (dir < 0 && current <= 4) target = maxScroll;
            else target = Math.max(0, Math.min(maxScroll, current + dir * step));

            scrollTarget(target);
            updateState();
        }

        if (btnPrev) btnPrev.addEventListener('click', function () { scrollByStep(-1); });
        if (btnNext) btnNext.addEventListener('click', function () { scrollByStep(1); });

        function renderDots() {
            if (!dotsHost) return;
            var cards = track.querySelectorAll('.news-card');
            var perView = Math.max(1, Math.round(track.clientWidth / cardStep()));
            var pageCount = Math.max(1, Math.ceil(cards.length / perView));
            if (pageCount <= 1) { dotsHost.innerHTML = ''; return; }
            var activePage = Math.round(track.scrollLeft / (perView * cardStep()));
            var html = '';
            for (var i = 0; i < pageCount; i++) {
                html += '<button type="button" class="news-carousel__dot' + (i === activePage ? ' is-active' : '') +
                    '" data-page="' + i + '" aria-label="Page ' + (i + 1) + '"></button>';
            }
            dotsHost.innerHTML = html;
            dotsHost.querySelectorAll('.news-carousel__dot').forEach(function (dot) {
                dot.addEventListener('click', function () {
                    var p = parseInt(dot.dataset.page, 10);
                    track.scrollTo({ left: p * perView * cardStep(), behavior: 'smooth' });
                });
            });
        }

        function updateState() {
            var scrollLeft = track.scrollLeft;
            var maxScroll = track.scrollWidth - track.clientWidth;
            carousel.classList.toggle('is-start', scrollLeft <= 4);
            carousel.classList.toggle('is-end', scrollLeft >= maxScroll - 4);
            if (dotsHost) {
                var step = cardStep();
                if (step > 0) {
                    var perView = Math.max(1, Math.round(track.clientWidth / step));
                    var activePage = Math.round(scrollLeft / (perView * step));
                    dotsHost.querySelectorAll('.news-carousel__dot').forEach(function (d, i) {
                        d.classList.toggle('is-active', i === activePage);
                    });
                }
            }
        }

        track.addEventListener('scroll', updateState, { passive: true });
        window.addEventListener('resize', function () { renderDots(); updateState(); });

        // Observer : le content.js remplace le HTML du track async, donc on re-init quand les cards changent
        var mo = new MutationObserver(function () { renderDots(); updateState(); });
        mo.observe(track, { childList: true });

        renderDots();
        updateState();
    });

    // --- Top app bar scroll elevation + FAB show/hide ---
    var header = document.querySelector('.site-header');
    var fab = document.querySelector('.md-fab');
    var lastScrollY = window.scrollY;
    var fabHideTimer = null;

    function onScroll() {
        var y = window.scrollY;
        if (header) header.classList.toggle('is-scrolled', y > 4);
        if (fab) {
            var delta = y - lastScrollY;
            if (y < 100) {
                fab.classList.remove('is-hidden');
            } else if (delta > 6) {
                fab.classList.add('is-hidden');
            } else if (delta < -6) {
                fab.classList.remove('is-hidden');
            }
        }
        lastScrollY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // --- Smooth scroll pour ancres ---
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});
