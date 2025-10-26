(function () {
  var DEFAULT_LANGUAGE = 'en';
  var STORAGE_KEY = 'preferredLanguage';
  var currentLanguage = DEFAULT_LANGUAGE;
  var button;

  function loadStoredLanguage() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        currentLanguage = stored;
      }
    } catch (err) {
      currentLanguage = DEFAULT_LANGUAGE;
    }
  }

  function persistLanguage(lang) {
    try {
      if (lang === DEFAULT_LANGUAGE) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, lang);
      }
    } catch (err) {
      /* swallow storage errors */
    }
  }

  loadStoredLanguage();

  function updateButtonLabel() {
    if (!button) return;
    button.textContent = currentLanguage === DEFAULT_LANGUAGE ? 'Spanish' : 'English';
  }

  function triggerTranslate(targetLang) {
    var attempts = 0;
    var maxAttempts = 40;

    function applyTranslation() {
      var select = document.querySelector('select.goog-te-combo');
      if (!select) {
        if (attempts < maxAttempts) {
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
    persistLanguage(lang);

    if (lang === DEFAULT_LANGUAGE) {
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

    if (currentLanguage !== DEFAULT_LANGUAGE) {
      setLanguage(currentLanguage);
    } else {
      updateButtonLabel();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    button = document.getElementById('language-toggle');
    if (!button) return;

    button.addEventListener('click', function () {
      var nextLanguage = currentLanguage === DEFAULT_LANGUAGE ? 'es' : DEFAULT_LANGUAGE;
      setLanguage(nextLanguage);
    });

    updateButtonLabel();
  });
})();
