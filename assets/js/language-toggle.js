(function () {
  var currentLanguage = 'en';
  var button;

  function updateButtonLabel() {
    if (!button) return;
    button.textContent = currentLanguage === 'en' ? 'Spanish' : 'English';
  }

  function triggerTranslate(targetLang) {
    var attempts = 0;

    function applyTranslation() {
      var select = document.querySelector('select.goog-te-combo');
      if (!select) {
        if (attempts < 20) {
          attempts += 1;
          window.setTimeout(applyTranslation, 200);
        }
        return;
      }
      select.value = targetLang;
      select.dispatchEvent(new Event('change'));
    }

    applyTranslation();
  }

  function setLanguage(lang) {
    currentLanguage = lang;
    if (lang === 'en') {
      triggerTranslate('');
    } else {
      triggerTranslate(lang);
    }
    updateButtonLabel();
  }

  window.initGoogleTranslate = function () {
    if (typeof google === 'undefined' || !google.translate) {
      return;
    }

    new google.translate.TranslateElement(
      {
        pageLanguage: 'en',
        includedLanguages: 'en,es',
        autoDisplay: false,
      },
      'google_translate_element'
    );

    updateButtonLabel();
  };

  document.addEventListener('DOMContentLoaded', function () {
    button = document.getElementById('language-toggle');
    if (!button) return;

    button.addEventListener('click', function () {
      setLanguage(currentLanguage === 'en' ? 'es' : 'en');
    });

    updateButtonLabel();
  });
})();
