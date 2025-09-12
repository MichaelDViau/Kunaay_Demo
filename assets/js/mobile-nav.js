document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.nav-header');
  if (!header) return;

  // Remove existing nav toggle if present
  var oldToggle = header.querySelector('.nav-toggle');
  if (oldToggle) {
    oldToggle.remove();
  }

  // Create hamburger button
  var btn = document.createElement('button');
  btn.className = 'mobile-menu-btn';
  btn.innerHTML = '<span></span><span></span><span></span>';
  header.appendChild(btn);

  // Create overlay with links
  var overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  overlay.innerHTML = '\n    <a href="index.html">HOME</a>\n    <a href="rentals.html">RENTALS</a>\n    <a href="sales.html">SALES</a>\n    <a href="aboutUs.html">ABOUT US</a>\n    <a href="contact.html">CONTACT</a>\n  ';
  document.body.appendChild(overlay);

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
