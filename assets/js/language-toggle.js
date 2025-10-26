(function () {
  var DEFAULT_LANGUAGE = 'en';
  var TARGET_LANGUAGE = 'es';
  var STORAGE_KEY = 'preferredLanguage';
  var currentLanguage = DEFAULT_LANGUAGE;
  var button;

  function normaliseLanguage(value) {
    if (!value) {
      return DEFAULT_LANGUAGE;
    }

    var normalised = String(value).toLowerCase();
    if (normalised !== DEFAULT_LANGUAGE && normalised !== TARGET_LANGUAGE) {
      return DEFAULT_LANGUAGE;
    }

    return normalised;
  }

  function loadStoredLanguage() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        currentLanguage = normaliseLanguage(stored);
        return;
      }
    } catch (err) {
      /* storage is optional */
    }

    currentLanguage = DEFAULT_LANGUAGE;
  }

  function persistLanguage(lang) {
    try {
      if (lang === DEFAULT_LANGUAGE) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, lang);
      }
    } catch (err) {
      /* storage is optional */
    }
  }

  function updateButtonLabel() {
    if (!button) {
      return;
    }

    button.textContent = currentLanguage === DEFAULT_LANGUAGE ? 'Spanish' : 'English';
  }

  function setCookie(name, value, domain) {
    var expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    var cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';

    if (domain) {
      cookie += ';domain=' + domain;
    }

    document.cookie = cookie;
  }

  function applyGoogleCookies(lang) {
    var value = '/' + DEFAULT_LANGUAGE + '/' + (lang === DEFAULT_LANGUAGE ? DEFAULT_LANGUAGE : lang);

    setCookie('googtrans', value);

    if (window.location.hostname) {
      setCookie('googtrans', value, window.location.hostname);
    }
  }

  function fireChangeEvent(element) {
    try {
      element.dispatchEvent(new Event('change'));
    } catch (err) {
      var evt = document.createEvent('HTMLEvents');
      evt.initEvent('change', true, true);
      element.dispatchEvent(evt);
    }
  }

  function triggerTranslate(lang) {
    applyGoogleCookies(lang);

    var targetValue = lang === DEFAULT_LANGUAGE ? DEFAULT_LANGUAGE : lang;
    var attempts = 0;
    var maxAttempts = 80;

    function applyTranslation() {
      var select = document.querySelector('select.goog-te-combo');

      if (!select) {
        if (attempts < maxAttempts) {
          attempts += 1;
          window.setTimeout(applyTranslation, 250);
        }
        return;
      }

      if (select.value !== targetValue) {
        select.value = targetValue;
      }

      fireChangeEvent(select);
    }

    applyTranslation();
  }

  function setLanguage(lang) {
    currentLanguage = normaliseLanguage(lang);
    persistLanguage(currentLanguage);
    updateButtonLabel();
    triggerTranslate(currentLanguage);
  }

  window.googleTranslateElementInit = function () {
    if (typeof google === 'undefined' || !google.translate) {
      return;
    }

    new google.translate.TranslateElement(
      {
        pageLanguage: DEFAULT_LANGUAGE,
        includedLanguages: DEFAULT_LANGUAGE + ',' + TARGET_LANGUAGE,
        autoDisplay: false,
      },
      'google_translate_element'
    );

    if (currentLanguage !== DEFAULT_LANGUAGE) {
      triggerTranslate(currentLanguage);
    } else {
      triggerTranslate(DEFAULT_LANGUAGE);
      updateButtonLabel();
    }
  };

  loadStoredLanguage();

  document.addEventListener('DOMContentLoaded', function () {
    button = document.getElementById('language-toggle');

    if (!button) {
      return;
    }

    updateButtonLabel();

    button.addEventListener('click', function () {
      var nextLanguage = currentLanguage === DEFAULT_LANGUAGE ? TARGET_LANGUAGE : DEFAULT_LANGUAGE;
      setLanguage(nextLanguage);
    });
  });
})();
