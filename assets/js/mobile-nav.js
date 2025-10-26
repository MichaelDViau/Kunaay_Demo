document.addEventListener('DOMContentLoaded', function () {
  if (window.innerWidth > 1024) return;

  var container = document.querySelector('.header .container');
  if (!container) return;

  container.innerHTML = `
    <div class="mobile-header">
      <a href="index.html" class="mobile-logo"><img src="assets/img/logo.png" alt="Logo"></a>
      <button class="mobile-menu-btn" aria-label="Toggle menu"><span></span><span></span><span></span></button>
    </div>
  `;

  var overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  overlay.innerHTML = `
    <a href="index.html">HOME</a>
    <a href="rentals.html">RENTALS</a>
    <a href="sales.html">SALES</a>
    <a href="aboutUs.html">ABOUT US</a>
    <a href="contact.html">CONTACT</a>
    <a href="#" class="language-toggle-link" data-language-toggle data-current-lang="en" aria-label="Switch site language to Spanish">🇲🇽 Español</a>
  `;
  document.body.appendChild(overlay);

  var btn = container.querySelector('.mobile-menu-btn');

  function closeMenu() {
    overlay.classList.remove('open');
    btn.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    overlay.classList.toggle('open');
    btn.classList.toggle('active');
    document.body.classList.toggle('no-scroll', overlay.classList.contains('open'));
  });

  overlay.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
});
