(function () {
  const toggleId = 'language-toggle';
  let pendingLanguage = null;
  let comboObserved = false;

  function normalizeLang(lang) {
    if (!lang) {
      return 'en';
    }
    return lang.toLowerCase();
  }

  function getStoredLanguage() {
    try {
      return localStorage.getItem('preferredLanguage');
    } catch (error) {
      return null;
    }
  }

  function setStoredLanguage(lang) {
    try {
      localStorage.setItem('preferredLanguage', lang);
    } catch (error) {
      /* noop */
    }
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }

  function detectInitialLanguage() {
    const stored = getStoredLanguage();
    if (stored) {
      return normalizeLang(stored);
    }

    const cookieValue = getCookie('googtrans');
    if (cookieValue) {
      const segments = cookieValue.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last) {
        return normalizeLang(last);
      }
    }

    return 'en';
  }

  function updateButton(currentLang) {
    const button = document.getElementById(toggleId);
    if (!button) {
      return;
    }

    const lang = normalizeLang(currentLang);
    const nextLabel = lang === 'es' ? 'English' : 'Español';
    const ariaLabel =
      lang === 'es' ? 'Switch site language to English' : 'Cambiar el idioma del sitio a español';

    button.textContent = nextLabel;
    button.setAttribute('data-current-lang', lang);
    button.setAttribute('aria-label', ariaLabel);
    button.removeAttribute('aria-busy');

    document.documentElement.setAttribute('lang', lang === 'es' ? 'es' : 'en');
    setStoredLanguage(lang);
  }

  function applyLanguage(lang) {
    const combo = document.querySelector('.goog-te-combo');
    const normalized = normalizeLang(lang);

    if (combo) {
      if (combo.value !== normalized) {
        combo.value = normalized;
        combo.dispatchEvent(new Event('change'));
      }

      updateButton(normalized);
      pendingLanguage = null;
      return true;
    }

    pendingLanguage = normalized;
    return false;
  }

  function observeCombo() {
    if (comboObserved) {
      return;
    }

    comboObserved = true;

    const observer = new MutationObserver(() => {
      const combo = document.querySelector('.goog-te-combo');
      if (!combo) {
        return;
      }

      observer.disconnect();

      combo.addEventListener('change', () => {
        updateButton(combo.value || 'en');
      });

      if (pendingLanguage) {
        applyLanguage(pendingLanguage);
      } else {
        updateButton(combo.value || detectInitialLanguage());
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById(toggleId);
    if (!button) {
      return;
    }

    const initialLang = detectInitialLanguage();
    updateButton(initialLang);

    if (initialLang !== 'en') {
      applyLanguage(initialLang);
    }

    button.addEventListener('click', (event) => {
      event.preventDefault();
      const current = button.getAttribute('data-current-lang') || 'en';
      const next = current === 'es' ? 'en' : 'es';

      button.setAttribute('aria-busy', 'true');
      if (!applyLanguage(next)) {
        // If the translator widget is not ready yet, keep the busy state until it is applied.
        pendingLanguage = next;
      }
    });

    observeCombo();
  });

  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement(
      {
        pageLanguage: 'en',
        autoDisplay: false,
      },
      'google_translate_element'
    );
  };
})();
