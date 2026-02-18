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
    var cookieBannerId = 'asje-cookie-banner';
    var cookieConsent = localStorage.getItem('asje-cookie-consent');

    if (!cookieConsent) {
        var banner = document.createElement('div');
        banner.id = cookieBannerId;
        banner.setAttribute('role', 'alert');
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a1a1a;color:#fff;padding:1rem;text-align:center;z-index:3000;font-size:0.9rem;';

        var isEuskara = document.documentElement.lang === 'eu';
        var message = isEuskara
            ? 'Webgune honek cookie teknikoak erabiltzen ditu bere funtzionamendu egokirako. '
            : 'Ce site utilise des cookies techniques n\u00e9cessaires \u00e0 son fonctionnement. ';
        var btnText = isEuskara ? 'Onartu' : 'Accepter';

        banner.innerHTML = message + '<button id="cookie-accept" style="margin-left:1rem;padding:0.4rem 1.2rem;background:#0070A0;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;">' + btnText + '</button>';

        document.body.appendChild(banner);

        document.getElementById('cookie-accept').addEventListener('click', function () {
            localStorage.setItem('asje-cookie-consent', 'accepted');
            banner.remove();
        });
    }

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
