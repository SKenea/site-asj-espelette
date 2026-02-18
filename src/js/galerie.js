/**
 * ASJ Espelette — Galerie
 * Filtrage par categorie + lightbox
 */

document.addEventListener('DOMContentLoaded', function () {

    // --- Filtres ---
    var filterBtns = document.querySelectorAll('.filter-btn');
    var galerieItems = document.querySelectorAll('.galerie-item');

    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var filter = this.getAttribute('data-filter');

            // Active state
            filterBtns.forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');

            // Filtrage
            galerieItems.forEach(function (item) {
                if (filter === 'all' || item.getAttribute('data-category') === filter) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // --- Lightbox ---
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightbox-img');
    var currentIndex = 0;

    function getVisibleItems() {
        return Array.from(galerieItems).filter(function (item) {
            return item.style.display !== 'none';
        });
    }

    function openLightbox(index) {
        var items = getVisibleItems();
        if (index < 0 || index >= items.length) return;
        currentIndex = index;
        var img = items[index].querySelector('img');
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.hidden = true;
        document.body.style.overflow = '';
    }

    // Clic sur image
    galerieItems.forEach(function (item) {
        item.addEventListener('click', function () {
            var items = getVisibleItems();
            var idx = items.indexOf(this);
            openLightbox(idx);
        });
    });

    // Boutons lightbox
    if (lightbox) {
        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox-prev').addEventListener('click', function () {
            var items = getVisibleItems();
            openLightbox((currentIndex - 1 + items.length) % items.length);
        });
        lightbox.querySelector('.lightbox-next').addEventListener('click', function () {
            var items = getVisibleItems();
            openLightbox((currentIndex + 1) % items.length);
        });

        // Fermer avec Escape
        document.addEventListener('keydown', function (e) {
            if (!lightbox.hidden) {
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowLeft') {
                    var items = getVisibleItems();
                    openLightbox((currentIndex - 1 + items.length) % items.length);
                }
                if (e.key === 'ArrowRight') {
                    var items = getVisibleItems();
                    openLightbox((currentIndex + 1) % items.length);
                }
            }
        });
    }
});
