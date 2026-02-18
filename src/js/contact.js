/**
 * ASJ Espelette — Contact form
 * Validation cote client + anti-spam honeypot
 */

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Anti-spam honeypot
        var honeypot = form.querySelector('input[name="website"]');
        if (honeypot && honeypot.value !== '') {
            return; // Bot detected
        }

        // Validation basique
        var name = form.querySelector('#contact-name');
        var email = form.querySelector('#contact-email');
        var subject = form.querySelector('#contact-subject');
        var message = form.querySelector('#contact-message');

        var errors = [];

        if (!name.value.trim()) errors.push('name');
        if (!email.value.trim() || !isValidEmail(email.value)) errors.push('email');
        if (!subject.value.trim()) errors.push('subject');
        if (!message.value.trim()) errors.push('message');

        // Reset styles
        [name, email, subject, message].forEach(function (field) {
            field.style.borderColor = '';
        });

        if (errors.length > 0) {
            errors.forEach(function (field) {
                var el = form.querySelector('#contact-' + field);
                if (el) el.style.borderColor = '#c8102e';
            });

            var isEuskara = document.documentElement.lang === 'eu';
            alert(isEuskara
                ? 'Mesedez, bete eremu guztiak behar bezala.'
                : 'Veuillez remplir tous les champs correctement.');
            return;
        }

        // Ici, envoyer les donnees au backend
        // Pour l'instant, message de confirmation
        var isEuskara = document.documentElement.lang === 'eu';
        var confirmMsg = isEuskara
            ? 'Eskerrik asko zure mezuagatik! Laster erantzungo dizugu.'
            : 'Merci pour votre message ! Nous vous r\u00e9pondrons dans les meilleurs d\u00e9lais.';

        alert(confirmMsg);
        form.reset();
    });

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});
