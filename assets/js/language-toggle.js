(function () {
  const toggleSelector = '[data-language-toggle]';
  const translations = {
    text: (window.TRANSLATIONS_TEXT || {}),
    attributes: {
      'aria-label': {
        'Toggle menu': 'Abrir o cerrar el menú',
        'Switch site language to Spanish': 'Cambiar el idioma del sitio a español',
        'Switch site language to English': 'Cambiar el idioma del sitio a inglés',
        'Quick contact links': 'Enlaces de contacto rápido',
        'Visit Ku Naay on Facebook': 'Visitar Ku Naay en Facebook',
        'Chat with Ku Naay on WhatsApp': 'Chatear con Ku Naay en WhatsApp'
      }
    }
  };

  const state = {
    current: 'en',
    textNodes: [],
    attributeNodes: [],
    toggles: []
  };

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

  function normalizeText(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function getStoredLanguage() {
    try {
      return localStorage.getItem('preferredLanguage') || 'en';
    } catch (error) {
      return 'en';
    }
  }

  function setStoredLanguage(lang) {
    try {
      localStorage.setItem('preferredLanguage', lang);
    } catch (error) {
      /* no-op */
    }
  }

  function collectTextNodes(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node || !node.textContent || !node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          const parent = node.parentElement;
          if (parent) {
            if (SKIP_TAGS.has(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.matches && parent.matches(toggleSelector)) {
              return NodeFilter.FILTER_REJECT;
            }
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const original = node.textContent;
      const key = normalizeText(original);
      state.textNodes.push({ node, original, key });
    }
  }

  function collectAttributeNodes() {
    const attributeMaps = translations.attributes || {};
    Object.keys(attributeMaps).forEach((attr) => {
      const map = attributeMaps[attr];
      document.querySelectorAll(`[${attr}]`).forEach((element) => {
        if (element.matches && element.matches(toggleSelector)) {
          return;
        }
        const value = element.getAttribute(attr);
        if (!value) {
          return;
        }
        const key = value.trim();
        if (!(key in map)) {
          return;
        }
        state.attributeNodes.push({ element, attr, key, original: value });
      });
    });
  }

  function updateToggleText(lang) {
    const nextLabel = lang === 'es' ? 'English' : 'Español';
    const aria = lang === 'es'
      ? 'Cambiar el idioma del sitio a inglés'
      : 'Switch site language to Spanish';

    state.toggles.forEach((button) => {
      button.textContent = nextLabel;
      button.setAttribute('aria-label', aria);
      button.dataset.currentLang = lang;
    });
  }

  function applyLanguage(lang) {
    state.current = lang;
    const isSpanish = lang === 'es';

    state.textNodes.forEach((item) => {
      if (isSpanish) {
        const translation = translations.text[item.key];
        if (translation) {
          item.node.textContent = translation;
        }
      } else {
        item.node.textContent = item.original;
      }
    });

    state.attributeNodes.forEach((item) => {
      const map = translations.attributes[item.attr] || {};
      if (isSpanish) {
        const translation = map[item.key];
        if (translation) {
          item.element.setAttribute(item.attr, translation);
        }
      } else {
        item.element.setAttribute(item.attr, item.original);
      }
    });

    document.documentElement.setAttribute('lang', isSpanish ? 'es' : 'en');
    updateToggleText(lang);
    setStoredLanguage(lang);
  }

  function handleToggle(event) {
    event.preventDefault();
    const nextLang = state.current === 'es' ? 'en' : 'es';
    applyLanguage(nextLang);
  }

  function collectToggles() {
    const existing = new Set(state.toggles);
    document.querySelectorAll(toggleSelector).forEach((button) => {
      if (existing.has(button)) {
        return;
      }
      button.addEventListener('click', handleToggle);
      state.toggles.push(button);
    });
    updateToggleText(state.current);
  }

  document.addEventListener('DOMContentLoaded', () => {
    collectTextNodes(document.body);
    collectAttributeNodes();
    collectToggles();

    const initialLang = getStoredLanguage();
    applyLanguage(initialLang);
  });
})();
