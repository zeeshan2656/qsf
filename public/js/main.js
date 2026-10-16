/**
 * QASR-E-SHABBIR FOUNDATION - CLIENT SCRIPT
 * Bilingual content rendering, API data hydration, and dynamic interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize i18n
  if (window.FoundationI18n) {
    window.FoundationI18n.init();
  }

  // 2. Global state
  let foundationData = {
    settings: {},
    categories: [],
    projects: [],
    news: [],
    stats: []
  };

  // 3. Language button click handler
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedLang = e.currentTarget.dataset.lang;
      if (window.FoundationI18n) {
        window.FoundationI18n.setLanguage(selectedLang);
      }
    });
  });

  // Listen for language change to re-render dynamic content
  window.addEventListener('foundation:languageChanged', (e) => {
    renderDynamicContent(foundationData, e.detail.lang);
  });

  // 4. Fetch initial foundation data from backend API
  fetchBootstrapData();

  async function fetchBootstrapData() {
    try {
      const res = await fetch('/api/public/bootstrap');
      const json = await res.json();
      if (json.success && json.data) {
        foundationData = json.data;
        const currentLang = window.FoundationI18n ? window.FoundationI18n.currentLang : 'en';
        renderDynamicContent(foundationData, currentLang);
      }
    } catch (err) {
      console.warn('[Data Load Warning] Using default static content while server hydrates:', err);
    }
  }

  // 5. Render Dynamic Content
  function renderDynamicContent(data, lang) {
    const isUrdu = lang === 'ur';

    // A. Render Categories
    const categoriesContainer = document.getElementById('categoriesGrid');
    if (categoriesContainer && data.categories && data.categories.length > 0) {
      categoriesContainer.innerHTML = data.categories.map(cat => `
        <div class="category-card" onclick="window.location.href='/projects?category=${cat.slug}'">
          <div class="category-icon-wrapper">
            <i class="fas fa-${cat.icon || 'heart'}"></i>
          </div>
          <h4 class="category-title">${isUrdu ? cat.name_ur : cat.name_en}</h4>
          <p class="category-desc">${isUrdu ? cat.description_ur : cat.description_en}</p>
        </div>
      `).join('');
    }

    // B. Render Featured Projects
    const projectsContainer = document.getElementById('featuredProjectsGrid');
    if (projectsContainer && data.projects && data.projects.length > 0) {
      projectsContainer.innerHTML = data.projects.map(p => {
        const title = isUrdu ? p.title_ur : p.title_en;
        const desc = isUrdu ? p.short_desc_ur : p.short_desc_en;
        const catName = isUrdu ? p.category_name_ur : p.category_name_en;
        const goal = parseFloat(p.goal_amount) || 0;
        const raised = parseFloat(p.raised_amount) || 0;
        const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 75;
        const benCount = p.beneficiaries_count || 126;
        const benLabel = isUrdu ? (p.beneficiaries_label_ur || 'طلباء') : (p.beneficiaries_label_en || 'Students');

        return `
          <div class="project-card">
            <div class="project-image-wrapper">
              <img src="${p.image_url || '/media/projects/orphan_education.webp'}" alt="${title}" class="project-image" loading="lazy" decoding="async" width="400" height="250" />
            </div>
            <div class="project-content">
              <span class="project-category-tag">${catName || (isUrdu ? 'تعلیمی کفالت' : 'Education')}</span>
              <h3 class="project-title">${title}</h3>
              <p class="project-desc">${desc}</p>
              
              <div class="project-progress-wrapper">
                <div class="project-progress-bar">
                  <div class="project-progress-fill" style="width: ${pct}%"></div>
                </div>
                <div class="project-meta-stats">
                  <span>${pct}% ${isUrdu ? 'مکمل' : 'Funded'}</span>
                  <span>PKR ${raised.toLocaleString()}</span>
                </div>
              </div>

              <div class="project-card-actions">
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-dark);">
                  <i class="fas fa-users" style="color: var(--primary); margin-inline-end: 4px;"></i>
                  ${benCount} ${benLabel}
                </span>
                <a href="/project/${p.slug}" class="btn-card-donate">
                  ${isUrdu ? 'تفصیل و عطیہ' : 'Learn & Support'}
                </a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // C. Render Latest News
    const newsContainer = document.getElementById('latestNewsGrid');
    if (newsContainer && data.news && data.news.length > 0) {
      newsContainer.innerHTML = data.news.map(article => {
        const title = isUrdu ? article.title_ur : article.title_en;
        const desc = isUrdu ? article.short_desc_ur : article.short_desc_en;
        const catName = isUrdu ? article.category_name_ur : article.category_name_en;
        const pubDate = article.published_at ? new Date(article.published_at).toLocaleDateString(isUrdu ? 'ur-PK' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

        return `
          <div class="news-card">
            <div class="news-thumb-wrapper">
              <img src="${article.image_url || '/media/news/news_1.webp'}" alt="${title}" class="news-thumb" loading="lazy" decoding="async" width="400" height="220" />
            </div>
            <div class="news-content">
              <div class="news-meta">
                <span class="news-category-badge">${catName || (isUrdu ? 'تازہ ترین' : 'Update')}</span>
                <span class="news-date">${pubDate}</span>
              </div>
              <h3 class="news-title">${title}</h3>
              <p class="news-desc">${desc}</p>
              <a href="/news/${article.slug}" class="news-read-more">
                ${isUrdu ? 'مزید پڑھیں ←' : 'Read More →'}
              </a>
            </div>
          </div>
        `;
      }).join('');
    }

    // D. Render Impact Stats
    const statsContainer = document.getElementById('impactStatsGrid');
    if (statsContainer && data.stats && data.stats.length > 0) {
      statsContainer.innerHTML = data.stats.map(s => `
        <div class="stat-item">
          <div class="stat-icon">
            <i class="fas fa-${s.icon || 'users'}"></i>
          </div>
          <div>
            <div class="stat-number">${s.number_val}${s.suffix || ''}</div>
            <div class="stat-label">${isUrdu ? s.label_ur : s.label_en}</div>
          </div>
        </div>
      `).join('');
    }

    // E. Render Hero & Branding Settings if customized in Admin
    if (data.settings) {
      if (data.settings.site_logo_url) {
        document.querySelectorAll('.header-logo-img, .footer-logo-img, .modal-logo, .sidebar-logo, .admin-login-logo, img[src*="logo"], img[alt*="Logo"], img[alt*="logo"]').forEach(img => {
          img.src = data.settings.site_logo_url;
          img.onerror = function() {
            this.onerror = null;
            this.src = '/media/branding/logo.svg';
          };
        });
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
          favicon.removeAttribute('type');
          favicon.href = data.settings.site_logo_url;
        }
      }
      if (data.settings.site_flag_url) {
        document.querySelectorAll('.flag-svg-display, .header-flag-img, .footer-flag-img').forEach(img => {
          img.src = data.settings.site_flag_url;
          img.onerror = function() {
            this.onerror = null;
            this.src = '/media/branding/flag.svg';
          };
        });
      }

      // E1. Dynamic Foundation Name & Official Branding from Database
      const orgNameEn = data.settings.foundation_name_en || 'Qasr-e-Shabbir Foundation';
      const orgNameUr = data.settings.foundation_name_ur || 'قصرِ شبیر فاؤنڈیشن';

      if (typeof translations !== 'undefined') {
        if (translations.en) translations.en.foundationName = orgNameEn;
        if (translations.ur) translations.ur.foundationName = orgNameUr;
      }

      const activeOrgName = isUrdu ? orgNameUr : orgNameEn;
      document.querySelectorAll('.brand-name, [data-i18n="foundationName"]').forEach(el => {
        el.textContent = activeOrgName;
      });

      if (data.settings.account_title) {
        document.querySelectorAll('.account-title-display').forEach(el => el.textContent = data.settings.account_title);
      }
      if (data.settings.easypaisa_title) {
        document.querySelectorAll('.easypaisa-title-display').forEach(el => el.textContent = data.settings.easypaisa_title);
      }
      if (data.settings.jazzcash_title) {
        document.querySelectorAll('.jazzcash-title-display').forEach(el => el.textContent = data.settings.jazzcash_title);
      }

      // E2. Dynamic Hero Section Layout Configuration
      const heroEyebrowEl = document.getElementById('heroEyebrow') || document.querySelector('.hero-eyebrow');
      const heroTitleEl = document.getElementById('heroHeading');
      const heroSubtitleEl = document.getElementById('heroSubtitle') || document.querySelector('.hero-subtitle');
      const heroTextEl = document.getElementById('heroText');
      const heroBtn1El = document.getElementById('heroBtn1');
      const heroBtn1TextEl = document.getElementById('heroBtn1Text') || (heroBtn1El ? heroBtn1El.querySelector('span') : null);
      const heroBtn2El = document.getElementById('heroBtn2');
      const heroBtn2TextEl = document.getElementById('heroBtn2Text') || (heroBtn2El ? heroBtn2El.querySelector('span') : null);
      const heroBgEl = document.getElementById('heroBackdropImage') || document.querySelector('.hero-backdrop-image');

      if (heroEyebrowEl) {
        const eyebrow = isUrdu ? (data.settings.hero_eyebrow_ur || 'خوش آمدید') : (data.settings.hero_eyebrow_en || 'WELCOME TO');
        if (eyebrow) heroEyebrowEl.textContent = eyebrow;
      }
      if (heroTitleEl) {
        const heading = isUrdu ? (data.settings.hero_heading_ur || 'قصرِ شبیر فاؤنڈیشن') : (data.settings.hero_heading_en || 'Qasr-e-Shabbir Foundation');
        if (heading) heroTitleEl.textContent = heading;
      }
      if (heroSubtitleEl) {
        const sub = isUrdu ? (data.settings.hero_subtitle_ur || 'روشن مستقبل کے لیے ایک ساتھ') : (data.settings.hero_subtitle_en || 'Together for a Brighter Tomorrow');
        if (sub) heroSubtitleEl.textContent = sub;
      }
      if (heroTextEl) {
        const desc = isUrdu 
          ? (data.settings.hero_text_ur || data.settings.hero_desc_ur || heroTextEl.textContent) 
          : (data.settings.hero_text_en || data.settings.hero_desc_en || heroTextEl.textContent);
        if (desc) heroTextEl.textContent = desc;
      }
      if (heroBtn1El && heroBtn1TextEl) {
        const btn1Text = isUrdu ? (data.settings.hero_btn1_text_ur || 'تعاون کریں') : (data.settings.hero_btn1_text_en || 'Support Our Cause');
        heroBtn1TextEl.textContent = btn1Text;
        if (data.settings.hero_btn1_link) heroBtn1El.href = data.settings.hero_btn1_link;
      }
      if (heroBtn2El && heroBtn2TextEl) {
        const btn2Text = isUrdu ? (data.settings.hero_btn2_text_ur || 'ہمارے بارے میں') : (data.settings.hero_btn2_text_en || 'Learn More');
        heroBtn2TextEl.textContent = btn2Text;
        if (data.settings.hero_btn2_link) heroBtn2El.href = data.settings.hero_btn2_link;
      }
      if (heroBgEl && data.settings.hero_bg_image) {
        heroBgEl.style.backgroundImage = `url('${data.settings.hero_bg_image}')`;
      }

      // F. Dynamic Sync of Address, Contact and Bank details from Dashboard
      const address = isUrdu ? (data.settings.contact_address_ur || data.settings.contact_address_en) : data.settings.contact_address_en;
      const phone = data.settings.contact_phone;
      const email = data.settings.contact_email;
      const bankName = data.settings.bank_name;
      const accTitle = data.settings.account_title;
      const accNumber = data.settings.account_number;
      const ibanNumber = data.settings.iban_number;
      const branchCode = data.settings.branch_code;
      const easypaisa = data.settings.easypaisa_number;
      const jazzcash = data.settings.jazzcash_number;

      document.querySelectorAll('.contact-address-display').forEach(el => { if (address) el.textContent = address; });
      document.querySelectorAll('.contact-phone-display').forEach(el => { 
        if (phone) {
          el.textContent = phone; 
          if (el.tagName === 'A') el.href = `tel:${phone.replace(/\s+/g, '')}`;
        }
      });
      document.querySelectorAll('.contact-email-display').forEach(el => { 
        if (email) {
          el.textContent = email; 
          if (el.tagName === 'A') el.href = `mailto:${email}`;
        }
      });
      document.querySelectorAll('.bank-name-display').forEach(el => { if (bankName) el.textContent = bankName; });
      document.querySelectorAll('.account-title-display').forEach(el => { if (accTitle) el.textContent = accTitle; });
      document.querySelectorAll('.account-number-display').forEach(el => { if (accNumber) el.textContent = accNumber; });
      document.querySelectorAll('.iban-display').forEach(el => { if (ibanNumber) el.textContent = ibanNumber; });
      document.querySelectorAll('.branch-code-display').forEach(el => { if (branchCode) el.textContent = branchCode; });
      document.querySelectorAll('.easypaisa-display').forEach(el => { if (easypaisa) el.textContent = easypaisa; });
      document.querySelectorAll('.jazzcash-display').forEach(el => { if (jazzcash) el.textContent = jazzcash; });
    }
  }

  // 6. Mobile Nav Toggle
  const mobileToggleBtn = document.getElementById('mobileToggle');
  const mainNav = document.getElementById('mainNav');
  if (mobileToggleBtn && mainNav) {
    mobileToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mainNav.classList.toggle('mobile-active');
      mobileToggleBtn.setAttribute('aria-expanded', isOpen);
      const icon = mobileToggleBtn.querySelector('i');
      if (icon) {
        icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
      }
    });

    // Close mobile nav when clicking a nav link
    mainNav.querySelectorAll('.nav-link, .btn-donate-mobile, .mobile-nav-search-btn').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('mobile-active');
        mobileToggleBtn.setAttribute('aria-expanded', 'false');
        const icon = mobileToggleBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      });
    });

    // Close when clicking outside header
    document.addEventListener('click', (e) => {
      if (!mainNav.contains(e.target) && !mobileToggleBtn.contains(e.target)) {
        if (mainNav.classList.contains('mobile-active')) {
          mainNav.classList.remove('mobile-active');
          mobileToggleBtn.setAttribute('aria-expanded', 'false');
          const icon = mobileToggleBtn.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
        }
      }
    });
  }

  // 7. Quick Donate Modal Trigger
  const donateTriggers = document.querySelectorAll('.trigger-donate-modal');
  const donateModal = document.getElementById('donateModal');
  const donateModalClose = document.getElementById('donateModalClose');

  donateTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (donateModal) donateModal.classList.add('active');
    });
  });

  if (donateModalClose && donateModal) {
    donateModalClose.addEventListener('click', () => {
      donateModal.classList.remove('active');
    });

    donateModal.addEventListener('click', (e) => {
      if (e.target === donateModal) {
        donateModal.classList.remove('active');
      }
    });
  }

  // 8. Contact Form Handler (if on contact page)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusDiv = document.getElementById('contactFormStatus');
      const submitBtn = contactForm.querySelector('button[type="submit"]');

      if (submitBtn) submitBtn.disabled = true;
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'status-alert info';
        statusDiv.textContent = window.FoundationI18n ? window.FoundationI18n.t('msgSending') : 'Sending...';
      }

      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());

      try {
        const res = await fetch('/api/public/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          if (statusDiv) {
            statusDiv.className = 'status-alert success';
            statusDiv.textContent = result.message || 'Message sent successfully!';
          }
          contactForm.reset();
        } else {
          if (statusDiv) {
            statusDiv.className = 'status-alert error';
            statusDiv.textContent = result.message || 'Error sending message.';
          }
        }
      } catch (err) {
        if (statusDiv) {
          statusDiv.className = 'status-alert error';
          statusDiv.textContent = 'Server connection error. Please try again.';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
