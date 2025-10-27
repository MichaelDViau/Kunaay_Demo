(function () {
  const typeLabels = {
    rental: 'Rentals',
    sale: 'For Sale'
  };

  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => escapeMap[char] || char);
  }

  function createListingCard(listing) {
    const images = (listing.images && listing.images.length > 0)
      ? listing.images
      : ['assets/img/photos/indexheaderimage.jpg'];
    const label = typeLabels[listing.category] || listing.category || 'Listing';
    const card = document.createElement('div');
    card.className = 'col-lg-4 col-md-6 col-sm-12';
    const slides = images.map((src) => `
          <div>
            <a href="listing.html?slug=${encodeURIComponent(listing.slug)}">
              <img src="${src}" class="img-fluid mx-auto" alt="${escapeHtml(listing.title)} photo" decoding="async" loading="lazy">
            </a>
          </div>
        `).join('');
    const locationBlock = listing.location
      ? `
            <div class="listing-card-info-icon" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;">
              <div class="inc-fleat-icon" style="display:flex;align-items:center;">
                <img src="assets/img/add.svg" width="18" alt="Location icon" decoding="async" loading="lazy">
              </div>
              <span>${escapeHtml(listing.location)}</span>
            </div>
        `
      : '';
    const summaryBlock = listing.summary
      ? `<p style="margin:0; color:#596579;">${escapeHtml(listing.summary)}</p>`
      : '';
    card.innerHTML = `
      <div class="property-listing property-2">
        <div class="listing-img-wrapper">
          <div class="_exlio_125">${escapeHtml(String(label).toUpperCase())}</div>
          <div class="list-img-slide">
            <div class="click">
${slides}
            </div>
          </div>
        </div>
        <div class="listing-detail-wrapper" style="text-align:center;">
          <div class="listing-short-detail-wrap">
            <div class="_card_list_flex mb-2"><div class="_card_flex_01"></div></div>
            <div class="_card_list_flex">
              <div class="_card_flex_01">
                <h4 class="listing-name verified" style="margin:0;">
                  <a href="listing.html?slug=${encodeURIComponent(listing.slug)}" class="prt-link-detail">${escapeHtml(listing.title)}</a>
                </h4>
              </div>
            </div>
          </div>
        </div>
        <div class="price-features-wrapper" style="text-align:center;">
          <div class="list-fx-features" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
${locationBlock}
            ${summaryBlock}
          </div>
        </div>
        <div class="listing-detail-footer">
          <div class="footer-flex">
            <a href="listing.html?slug=${encodeURIComponent(listing.slug)}" class="prt-view">View Detail</a>
          </div>
        </div>
      </div>
    `;
    return card;
  }

  function initializeSlides(scope) {
    const $ = window.jQuery;
    if (!$ || typeof $.fn === 'undefined' || typeof $.fn.slick !== 'function') {
      return;
    }
    const elements = scope.querySelectorAll('.click');
    elements.forEach((el) => {
      const $el = $(el);
      if (!$el.hasClass('slick-initialized')) {
        $el.slick({
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          autoplay: true,
          fade: true,
          dots: true,
          autoplaySpeed: 4000
        });
      }
    });
  }

  async function renderListings(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="col-12"><p>Loading listings…</p></div>';
    const params = new URLSearchParams();
    if (options.type) {
      params.set('type', options.type);
    }
    if (options.limit) {
      params.set('limit', options.limit);
    }
    try {
      const response = await fetch(`/api/listings${params.toString() ? `?${params.toString()}` : ''}`);
      const data = await response.json();
      container.innerHTML = '';
      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<div class="col-12"><p>No listings available yet. Check back soon.</p></div>';
        return;
      }
      const fragment = document.createDocumentFragment();
      data.forEach((listing) => {
        fragment.appendChild(createListingCard(listing));
      });
      container.appendChild(fragment);
      requestAnimationFrame(() => initializeSlides(container));
    } catch (error) {
      container.innerHTML = '<div class="col-12"><p class="text-danger">Unable to load listings right now.</p></div>';
    }
  }

  function renderDetailPage() {
    const detailContainer = document.getElementById('listing-detail');
    if (!detailContainer) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug) {
      detailContainer.innerHTML = '<p>Listing not found.</p>';
      return;
    }
    detailContainer.innerHTML = '<p>Loading listing…</p>';
    fetch(`/api/listings/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Listing not found');
        }
        return res.json();
      })
      .then((listing) => {
        const gallery = (listing.images || []).map((src) => `
          <div class="single_img">
            <img src="${src}" alt="${escapeHtml(listing.title)} photo" class="img-fluid" decoding="async" loading="lazy"/>
          </div>
        `).join('');
        const locationBlock = listing.location
          ? `
                <div class="listing-card-info-icon" style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;margin-bottom:1rem;">
                  <div class="inc-fleat-icon" style="display:flex;align-items:center;">
                    <img src="assets/img/add.svg" width="18" alt="Location icon" decoding="async" loading="lazy">
                  </div>
                  <span>${escapeHtml(listing.location)}</span>
                </div>
            `
          : '';
        detailContainer.innerHTML = `
          <div class="property_block_wrap">
            <div class="property_block_wrap_header">
              <h2>${escapeHtml(listing.title)}</h2>
              <span class="badge badge-info" style="text-transform:uppercase;">${escapeHtml((listing.category || '').toUpperCase())}</span>
            </div>
            <div class="property_block_wrap_body">
              <div class="property_info_detail_wrap">
                ${locationBlock}
                <p class="mb-4" style="font-size:1.1rem;color:#465065;">${escapeHtml(listing.summary)}</p>
                <p>${escapeHtml(listing.description).replace(/\n/g, '<br>')}</p>
              </div>
              ${gallery ? `<div class="property_gallery_grid">${gallery}</div>` : ''}
            </div>
          </div>
        `;
      })
      .catch(() => {
        detailContainer.innerHTML = '<p>We could not load this listing. It may have been removed.</p>';
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderListings('featured-rentals', { type: 'rental', limit: 3 });
    renderListings('featured-sales', { type: 'sale', limit: 3 });
    renderListings('rentals-list', { type: 'rental' });
    renderListings('sales-list', { type: 'sale' });
    renderDetailPage();
  });
})();
