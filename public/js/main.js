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

  // 4. Fetch initial foundation data on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchBootstrapData);
  } else {
    fetchBootstrapData();
  }

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

    // A. Render Categories (In-place update avoids CLS and layout shifts)
    const categoriesContainer = document.getElementById('categoriesGrid');
    if (categoriesContainer && data.categories && data.categories.length > 0) {
      const cards = categoriesContainer.querySelectorAll('.category-card');
      if (cards.length === data.categories.length) {
        data.categories.forEach((cat, idx) => {
          const card = cards[idx];
          const titleEl = card.querySelector('.category-title');
          const descEl = card.querySelector('.category-desc');
          const iconI = card.querySelector('.category-icon-wrapper i');
          if (titleEl) titleEl.textContent = isUrdu ? cat.name_ur : cat.name_en;
          if (descEl) descEl.textContent = isUrdu ? cat.description_ur : cat.description_en;
          if (iconI && cat.icon) iconI.className = `fas fa-${cat.icon}`;
          card.onclick = () => window.location.href = `/projects?category=${cat.slug}`;
        });
      } else {
        categoriesContainer.innerHTML = data.categories.map(cat => `
          <div class="category-card" onclick="window.location.href='/projects?category=${cat.slug}'">
            <div class="category-icon-wrapper">
              <i class="fas fa-${cat.icon || 'heart'}"></i>
            </div>
            <h3 class="category-title">${isUrdu ? cat.name_ur : cat.name_en}</h3>
            <p class="category-desc">${isUrdu ? cat.description_ur : cat.description_en}</p>
          </div>
        `).join('');
      }
    }

    // B. Render Featured Projects (In-place update avoids CLS and guarantees clickability)
    const projectsContainer = document.getElementById('featuredProjectsGrid');
    if (projectsContainer && data.projects && data.projects.length > 0) {
      const cards = projectsContainer.querySelectorAll('.project-card');
      if (cards.length === data.projects.length) {
        data.projects.forEach((p, idx) => {
          const card = cards[idx];
          const title = isUrdu ? p.title_ur : p.title_en;
          const desc = isUrdu ? p.short_desc_ur : p.short_desc_en;
          const catName = isUrdu ? p.category_name_ur : p.category_name_en;
          const tag = card.querySelector('.project-category-tag');
          const titleEl = card.querySelector('.project-title');
          const descEl = card.querySelector('.project-desc');
          const btn = card.querySelector('.btn-card-donate span');
          if (tag) tag.textContent = catName;
          if (titleEl) titleEl.textContent = title;
          if (descEl) descEl.textContent = desc;
          if (btn) btn.textContent = isUrdu ? 'تفصیل و عطیہ' : 'Learn & Support';
          card.onclick = () => window.location.href = `/project/${p.slug}`;
        });
      } else {
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
            <div class="project-card" onclick="window.location.href='/project/${p.slug}'" style="cursor: pointer;">
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
                  <a href="/project/${p.slug}" class="btn-card-donate" onclick="event.stopPropagation()" aria-label="Learn & Support ${title}">
                    <span>${isUrdu ? 'تفصیل و عطیہ' : 'Learn & Support'}</span>
                  </a>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // C. Render Latest News (Only if container empty or Urdu language selected)
    const newsContainer = document.getElementById('latestNewsGrid');
    if (newsContainer && data.news && data.news.length > 0 && (isUrdu || newsContainer.children.length === 0)) {
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
        const customLogo = data.settings.site_logo_url;
        const isOfficialEmblem = customLogo.includes('Qasr-e-Shabir') || customLogo.includes('logo_header') || customLogo.includes('logo.svg');
        const headerLogoSrc = isOfficialEmblem ? '/media/branding/logo_header_58.webp' : customLogo;
        
        document.querySelectorAll('.header-logo-img, .footer-logo-img').forEach(img => {
          if (!img.src.includes(headerLogoSrc)) {
            img.src = headerLogoSrc;
          }
          img.onerror = function() {
            this.onerror = null;
            this.src = '/media/branding/logo.svg';
          };
        });

        document.querySelectorAll('.modal-logo, .sidebar-logo, .admin-login-logo').forEach(img => {
          if (!img.src.includes(headerLogoSrc)) {
            img.src = headerLogoSrc;
          }
          img.onerror = function() {
            this.onerror = null;
            this.src = '/media/branding/logo.svg';
          };
        });

        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon && !favicon.href.includes('favicon')) {
          favicon.removeAttribute('type');
          favicon.href = customLogo;
        }
      }
      if (data.settings.site_flag_url) {
        const customFlag = data.settings.site_flag_url;
        const isOfficialFlag = customFlag.includes('flag') && !customFlag.includes('custom');
        const flagSrc = isOfficialFlag ? '/media/branding/flag_header_58.webp' : customFlag;
        document.querySelectorAll('.flag-svg-display, .footer-flag-img').forEach(img => {
          if (!img.src.includes(flagSrc)) {
            img.src = flagSrc;
          }
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
        const heroImg = heroBgEl.querySelector('img');
        if (heroImg) {
          if (!heroImg.src.includes(data.settings.hero_bg_image)) {
            heroImg.src = data.settings.hero_bg_image;
          }
        } else {
          const curBg = heroBgEl.style.backgroundImage || '';
          if (!curBg.includes(data.settings.hero_bg_image)) {
            heroBgEl.style.backgroundImage = `url('${data.settings.hero_bg_image}')`;
          }
        }
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

      // G. Configure WhatsApp Floating Chat Button from Dashboard Settings
      const whatsappBtn = document.getElementById('whatsappFloatBtn');
      if (whatsappBtn) {
        if (data.settings.whatsapp_enabled === '0') {
          whatsappBtn.style.display = 'none';
        } else {
          whatsappBtn.style.display = 'flex';
          const rawNum = data.settings.whatsapp_number || data.settings.contact_phone || '923000817702';
          const cleanPhone = rawNum.replace(/[^0-9]/g, '');
          const rawMsg = data.settings.whatsapp_message || 'Assalam-o-Alaikum, I want to inquire about Qasr-e-Shabbir Foundation welfare projects.';
          whatsappBtn.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rawMsg)}`;
        }
      }
    }

    // H. Render Dynamic Scrolling Announcement Bar
    renderAnnouncementsBar(data.announcements, isUrdu);

    // I. Render Dynamic Dual-Row Header Menus & Mobile Accordions
    renderHeaderMenus(data.menus, isUrdu);

    // J. Render Dynamic Multi-Slide Hero Carousel (Optional Text, Headings & Buttons)
    if (data.slides && data.slides.length > 0) {
      renderHeroSlider(data.slides, isUrdu);
    }
  }

  function renderAnnouncementsBar(announcements, isUrdu) {
    const marqueeEl = document.getElementById('announcementMarquee');
    const trackEl = document.getElementById('announcementTrack');
    if (!marqueeEl) return;

    if (!announcements || announcements.length === 0) {
      marqueeEl.innerHTML = '<span class="announcement-item-link">Welcome to Qasr-e-Shabbir Foundation</span>';
      return;
    }

    // Direction: LTR for English, RTL for Urdu
    if (isUrdu) {
      marqueeEl.className = 'announcement-marquee-content marquee-rtl';
      if (trackEl) trackEl.setAttribute('dir', 'rtl');
    } else {
      marqueeEl.className = 'announcement-marquee-content marquee-ltr';
      if (trackEl) trackEl.setAttribute('dir', 'ltr');
    }

    // Build items with separator
    const itemsHtml = announcements.map(a => {
      const text = isUrdu ? (a.content_ur || a.content_en) : a.content_en;
      if (a.link_url) {
        return `<a href="${a.link_url}" class="announcement-item-link">${escapeHtml(text)} <i class="fas fa-arrow-right" style="font-size:0.75rem;"></i></a>`;
      }
      return `<span class="announcement-item-link">${escapeHtml(text)}</span>`;
    }).join('<span style="opacity: 0.5; margin: 0 16px;">✦</span>');

    // Duplicate 3 times for continuous seamless scrolling loop
    marqueeEl.innerHTML = `${itemsHtml}<span style="opacity: 0.5; margin: 0 16px;">✦</span>${itemsHtml}<span style="opacity: 0.5; margin: 0 16px;">✦</span>${itemsHtml}`;
  }

  function renderHeaderMenus(menus, isUrdu) {
    if (!menus || menus.length === 0) return;

    const slotMap = {
      'slotMenu1': menus.find(m => m.row_num === 1 && m.col_side === 'left'),
      'slotMenu2': menus.find(m => m.row_num === 1 && m.col_side === 'right'),
      'slotMenu3': menus.find(m => m.row_num === 2 && m.col_side === 'left'),
      'slotMenu4': menus.find(m => m.row_num === 2 && m.col_side === 'right')
    };

    // Render 4 desktop slots INLINE (Desktop: In-line Setup, No Dropdowns)
    Object.entries(slotMap).forEach(([slotId, m]) => {
      const slotEl = document.getElementById(slotId);
      if (!slotEl) return;

      if (!m || m.is_active === 0) {
        slotEl.style.visibility = 'hidden';
        return;
      }

      slotEl.style.visibility = 'visible';
      const title = isUrdu ? (m.title_ur || m.title_en) : m.title_en;
      const items = Array.isArray(m.items) ? m.items.filter(it => it.is_active === 1) : [];

      if (items.length > 0) {
        slotEl.innerHTML = `
          <nav class="nav-inline-group" aria-label="${escapeHtml(title)}">
            ${items.map(it => `
              <a href="${it.page_url}" class="nav-inline-link" ${it.open_new_tab ? 'target="_blank" rel="noopener"' : ''}>
                <span>${escapeHtml(isUrdu ? (it.title_ur || it.title_en) : it.title_en)}</span>
              </a>
            `).join('')}
          </nav>
        `;
      } else {
        slotEl.innerHTML = `
          <nav class="nav-inline-group">
            <span class="nav-inline-link">${escapeHtml(title)}</span>
          </nav>
        `;
      }
    });

    // Render Mobile Accordions
    const accordionContainer = document.getElementById('mobileMenuAccordion');
    if (accordionContainer) {
      const activeMenus = menus.filter(m => m.is_active === 1);
      accordionContainer.innerHTML = activeMenus.map((m, idx) => {
        const title = isUrdu ? (m.title_ur || m.title_en) : m.title_en;
        const items = Array.isArray(m.items) ? m.items.filter(it => it.is_active === 1) : [];
        const isFirst = idx === 0;

        return `
          <div class="mobile-accordion-item">
            <button type="button" class="mobile-accordion-btn ${isFirst ? 'expanded' : ''}" onclick="toggleMobileAccordion(this)">
              <span>${escapeHtml(title)}</span>
              ${items.length > 0 ? '<i class="fas fa-chevron-down mobile-accordion-icon"></i>' : ''}
            </button>
            <div class="mobile-accordion-panel ${isFirst ? 'show' : ''}">
              ${items.map(it => `
                <a href="${it.page_url}" class="mobile-panel-link" ${it.open_new_tab ? 'target="_blank" rel="noopener"' : ''}>
                  ${escapeHtml(isUrdu ? (it.title_ur || it.title_en) : it.title_en)}
                </a>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // =========================================================================
  // MULTI-SLIDE HERO CAROUSEL ENGINE (OPTIONAL TEXT & BUTTONS)
  // =========================================================================
  let heroAutoTimer = null;
  let currentHeroSlideIndex = 0;
  let activeHeroSlides = [];

  function renderHeroSlider(slides, isUrdu) {
    const track = document.getElementById('heroSliderTrack');
    const dotsContainer = document.getElementById('heroSliderDots');
    const prevBtn = document.getElementById('heroSliderPrev');
    const nextBtn = document.getElementById('heroSliderNext');
    const heroSection = document.getElementById('heroSection') || document.querySelector('.hero-section');
    if (!track) return;

    if (!Array.isArray(slides) || slides.length === 0) return;

    activeHeroSlides = slides;
    currentHeroSlideIndex = 0;

    // Render multi-slides with optional text & button controls
    track.innerHTML = slides.map((slide, idx) => {
      const title = isUrdu ? (slide.title_ur || slide.title_en) : slide.title_en;
      const eyebrow = isUrdu ? (slide.eyebrow_ur || slide.eyebrow_en) : slide.eyebrow_en;
      const subtitle = isUrdu ? (slide.subtitle_ur || slide.subtitle_en) : slide.subtitle_en;
      const desc = isUrdu ? (slide.description_ur || slide.description_en) : slide.description_en;
      const btn1Text = isUrdu ? (slide.btn1_text_ur || slide.btn1_text_en) : slide.btn1_text_en;
      const btn2Text = isUrdu ? (slide.btn2_text_ur || slide.btn2_text_en) : slide.btn2_text_en;

      // Optional text rule: if no text/buttons given, omit overlay and text card for clean banner display
      const hasContent = Boolean(title || subtitle || desc || eyebrow || btn1Text || btn2Text);

      return `
        <div class="hero-slide ${idx === 0 ? 'active' : ''}" data-index="${idx}" role="group" aria-roledescription="slide" aria-label="Slide ${idx + 1} of ${slides.length}">
          <div class="hero-backdrop-image">
            <picture>
              ${slide.image_mobile_url ? `<source media="(max-width: 640px)" srcset="${slide.image_mobile_url}" type="image/webp">` : ''}
              <img src="${slide.image_url}" alt="${escapeHtml(title || 'Qasr-e-Shabbir Foundation')}" class="hero-bg-img" loading="${idx === 0 ? 'eager' : 'lazy'}" decoding="async" />
            </picture>
          </div>
          ${hasContent ? `
            <div class="hero-bg-overlay"></div>
            <div class="container hero-layout">
              <div class="hero-content-card">
                ${eyebrow ? `<span class="hero-eyebrow">${escapeHtml(eyebrow)}</span>` : ''}
                ${title ? `<h1 class="hero-title">${escapeHtml(title)}</h1>` : ''}
                ${subtitle ? `<p class="hero-subtitle">${escapeHtml(subtitle)}</p>` : ''}
                ${desc ? `<p class="hero-text">${escapeHtml(desc)}</p>` : ''}
                ${(btn1Text || btn2Text) ? `
                  <div class="hero-actions">
                    ${btn1Text ? `
                      <a href="${slide.btn1_link || '/donate'}" class="btn-primary trigger-donate-modal">
                        <i class="fas fa-heart"></i>
                        <span>${escapeHtml(btn1Text)}</span>
                      </a>
                    ` : ''}
                    ${btn2Text ? `
                      <a href="${slide.btn2_link || '/about'}" class="btn-secondary">
                        <span>${escapeHtml(btn2Text)}</span>
                      </a>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Indicator dots
    if (dotsContainer) {
      if (slides.length > 1) {
        dotsContainer.style.display = 'flex';
        dotsContainer.innerHTML = slides.map((_, idx) => `
          <button type="button" class="hero-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Go to slide ${idx + 1}" onclick="goToHeroSlide(${idx})"></button>
        `).join('');
      } else {
        dotsContainer.style.display = 'none';
      }
    }

    // Toggle arrows
    if (prevBtn && nextBtn) {
      const showArrows = slides.length > 1;
      prevBtn.style.display = showArrows ? 'flex' : 'none';
      nextBtn.style.display = showArrows ? 'flex' : 'none';
    }

    startHeroSliderAuto();

    if (heroSection) {
      heroSection.onmouseenter = pauseHeroSliderAuto;
      heroSection.onmouseleave = startHeroSliderAuto;

      // Mobile Touch Swipe
      let touchStartX = 0;
      let touchEndX = 0;
      heroSection.ontouchstart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
      };
      heroSection.ontouchend = (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 40) {
          if (diff < 0) {
            nextHeroSlide();
          } else {
            prevHeroSlide();
          }
        }
      };
    }
  }

  function goToHeroSlide(idx) {
    if (!activeHeroSlides || activeHeroSlides.length === 0) return;
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');

    currentHeroSlideIndex = (idx + activeHeroSlides.length) % activeHeroSlides.length;

    slides.forEach((sl, i) => {
      sl.classList.toggle('active', i === currentHeroSlideIndex);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentHeroSlideIndex);
    });
  }

  window.goToHeroSlide = goToHeroSlide;

  function nextHeroSlide() {
    goToHeroSlide(currentHeroSlideIndex + 1);
  }

  function prevHeroSlide() {
    goToHeroSlide(currentHeroSlideIndex - 1);
  }

  window.nextHeroSlide = nextHeroSlide;
  window.prevHeroSlide = prevHeroSlide;

  function startHeroSliderAuto() {
    pauseHeroSliderAuto();
    if (activeHeroSlides && activeHeroSlides.length > 1) {
      heroAutoTimer = setInterval(nextHeroSlide, 5000);
    }
  }

  function pauseHeroSliderAuto() {
    if (heroAutoTimer) {
      clearInterval(heroAutoTimer);
      heroAutoTimer = null;
    }
  }

  window.toggleMobileAccordion = function(btn) {
    const panel = btn.nextElementSibling;
    const isExpanded = btn.classList.toggle('expanded');
    if (panel) {
      panel.classList.toggle('show', isExpanded);
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 6. Mobile Nav Drawer Toggle
  const mobileToggleBtn = document.getElementById('mobileToggle');
  const mobileDrawer = document.getElementById('mobileNavDrawer');
  const mobileBackdrop = document.getElementById('mobileNavBackdrop');
  const mobileCloseBtn = document.getElementById('mobileNavCloseBtn');

  function openMobileNav() {
    if (mobileDrawer) mobileDrawer.classList.add('open');
    if (mobileBackdrop) mobileBackdrop.classList.add('active');
  }

  function closeMobileNav() {
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    if (mobileBackdrop) mobileBackdrop.classList.remove('active');
  }

  if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', openMobileNav);
  if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileNav);
  if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMobileNav);

  // Close mobile nav on link click
  if (mobileDrawer) {
    mobileDrawer.addEventListener('click', (e) => {
      if (e.target.closest('.mobile-panel-link, .btn-donate-mobile-drawer')) {
        closeMobileNav();
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

  // 9. Hero Slider Arrow Button Listeners
  const prevSlideBtn = document.getElementById('heroSliderPrev');
  const nextSlideBtn = document.getElementById('heroSliderNext');
  if (prevSlideBtn) prevSlideBtn.addEventListener('click', prevHeroSlide);
  if (nextSlideBtn) nextSlideBtn.addEventListener('click', nextHeroSlide);

  // 10. Scroll-To-Top (Topup) Button behavior - Guaranteed reliable detection
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    function handleScrollTopVisibility() {
      const scrollPos = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollPos > 160) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }

    window.addEventListener('scroll', handleScrollTopVisibility, { passive: true });
    document.addEventListener('scroll', handleScrollTopVisibility, { passive: true });
    // Check immediately on load in case page loaded mid-scroll
    setTimeout(handleScrollTopVisibility, 100);

    scrollTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
