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
    const image = listing.images && listing.images.length > 0 ? listing.images[0] : 'assets/img/photos/indexheaderimage.jpg';
    const label = typeLabels[listing.category] || listing.category || 'Listing';
    const card = document.createElement('div');
    card.className = 'col-lg-4 col-md-6 col-sm-12';
    card.innerHTML = `
      <div class="property-listing property-2">
        <div class="listing-img-wrapper">
          <div class="_exlio_125">${escapeHtml(label.toUpperCase())}</div>
          <a href="listing.html?slug=${encodeURIComponent(listing.slug)}">
            <img src="${image}" class="img-fluid mx-auto" alt="${escapeHtml(listing.title)} cover image">
          </a>
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
          <div class="list-fx-features" style="display:flex;flex-direction:column;align-items:center;gap:12px;">
            <p style="margin:0; color:#596579;">${escapeHtml(listing.summary)}</p>
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
            <img src="${src}" alt="${escapeHtml(listing.title)} photo" class="img-fluid"/>
          </div>
        `).join('');
        detailContainer.innerHTML = `
          <div class="property_block_wrap">
            <div class="property_block_wrap_header">
              <h2>${escapeHtml(listing.title)}</h2>
              <span class="badge badge-info" style="text-transform:uppercase;">${escapeHtml((listing.category || '').toUpperCase())}</span>
            </div>
            <div class="property_block_wrap_body">
              <div class="property_info_detail_wrap">
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
