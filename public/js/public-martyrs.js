/**
 * QSF Public-Facing Martyrs (شہداءِ ملت) Historical Memorial Archive Controller
 * - Read-only public access (Zero administrative buttons, zero private family contacts, zero internal audit logs)
 * - Complete Bilingual English (LTR) & Urdu (RTL Nastaliq) support synced with window.FoundationI18n
 * - Clean SEO URLs: /martyrs, /martyrs/:slug, /martyrs/war/:slug
 */
(function () {
  'use strict';

  const API_BASE = '/api/public/martyrs';
  const LOC_COLLAPSED_KEY = 'qsf_public_martyrs_loc_collapsed';

  const L = {
    en: {
      heroKicker: 'QSF HISTORICAL MEMORIAL ARCHIVE',
      pageTitle: 'Martyrs',
      pageSubtitle: 'Preserving the verified biographies, photographs, and historical conflict records of the martyrs.',
      allMartyrs: 'All Martyrs',
      warsAndConflicts: 'Wars & Conflicts',
      searchMartyrs: 'Search Martyrs',
      searchPlaceholder: 'Search martyr name, father\'s name, village...',
      dateOfBirth: 'Date of Birth',
      dateOfMartyrdom: 'Date of Martyrdom',
      placeOfMartyrdom: 'Place of Martyrdom',
      ageAtMartyrdom: 'Age at Martyrdom',
      yearsOld: 'years',
      biography: 'Biography',
      homeVillage: 'Home Village',
      associatedConflict: 'Associated Conflict',
      photoGallery: 'Photo Gallery',
      viewProfile: 'View Profile',
      historicalArchive: 'Historical Archive',
      locations: 'Locations',
      allLocations: 'All Locations',
      findLocation: 'Find village, tehsil, district...',
      scopeHome: 'Home',
      scopeMartyrdom: 'Martyrdom',
      scopeBoth: 'Both',
      filters: 'Filters',
      resetFilters: 'Reset Filters',
      applyFilters: 'Apply Filters',
      cancel: 'Cancel',
      allWars: 'All Wars & Conflicts',
      allTehsils: 'All Tehsils / Regions',
      allDistricts: 'All Districts',
      sortNewest: 'Martyrdom Date (Newest)',
      sortOldest: 'Martyrdom Date (Oldest)',
      sortNameAsc: 'Name (A → Z)',
      sortNameDesc: 'Name (Z → A)',
      sortRecent: 'Recently Added',
      showingRecords: (start, end, total) => `Showing <strong>${start}–${end}</strong> of <strong>${total}</strong> publicly listed martyr${total === 1 ? '' : 's'}`,
      inLocation: (loc) => ` in <strong style="color:#881337;">${loc}</strong>`,
      sonOf: 'S/O',
      daughterOf: 'D/O',
      fatherName: 'Father\'s Name',
      placeOfBirth: 'Place of Birth',
      notAvailable: 'Not Available',
      noMartyrsFound: 'No Martyr Profiles Match Current Selection',
      noMartyrsSub: 'Adjust your search query, location selection, or conflict filter to view memorial records.',
      backToAllMartyrs: 'Back to All Martyrs',
      backToWars: 'Back to Wars & Conflicts',
      personalRecord: 'Personal & Geographical Record',
      fullName: 'Full Name',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      sourcesHeading: 'Historical References & Source Information',
      noSources: 'No additional external source citations listed.',
      noPhotos: 'No additional gallery photographs available.',
      noBiography: 'Detailed biography is being compiled for this memorial record.',
      fallbackToEnNote: 'Showing English record (Urdu translation not yet entered)',
      fallbackToUrNote: 'Showing Urdu record (English translation not yet entered)',
      viewConflictArchive: 'View Historical Conflict Record',
      affectedLocations: 'Affected Villages & Locations',
      clickLocationFilter: 'Click any location to view martyrs from that area',
      reasonCause: 'Documented Reason / Cause',
      historicalBackground: 'Historical Background',
      detailedDescription: 'Detailed Historical Description',
      ceasefireAccord: 'Ceasefire & Peace Agreement Record',
      linkedEpisodes: 'Linked Conflict Episodes & Incidents',
      martyrsInConflict: 'Martyrs Recorded in This Conflict',
      reportedToll: 'Reported Casualties',
      reportedInjuries: 'Reported Injuries',
      mainLocation: 'Main Location',
      startDate: 'Start Date',
      endDate: 'End Date',
      ongoing: 'Ongoing',
      totalMartyrsLabel: 'Publicly Listed Martyrs',
      publishedLabel: 'Published',
      incidentDateLabel: 'Incident Date',
      prev: 'Prev',
      next: 'Next',
      pageOf: (p, tp, tot) => `Page <strong>${p}</strong> of <strong>${tp}</strong> (${tot} total)`,
      dateFrom: 'Date From',
      dateTo: 'Date To',
      locationMatchScope: 'Location Filter Type'
    },
    ur: {
      heroKicker: 'قصرِ شبیر فاؤنڈیشن · تاریخی و یادگاری ریکارڈ',
      pageTitle: 'شہداءِ ملت',
      pageSubtitle: 'شہداء کی سوانحِ حیات، تصاویر اور تاریخی معرکوں کا مستند اور باوقار ریکارڈ۔',
      allMartyrs: 'تمام شہداء',
      warsAndConflicts: 'جنگیں اور معرکے',
      searchMartyrs: 'شہداء تلاش کریں',
      searchPlaceholder: 'شہید کا نام، والد کا نام یا گاؤں تلاش کریں...',
      dateOfBirth: 'تاریخِ پیدائش',
      dateOfMartyrdom: 'تاریخِ شہادت',
      placeOfMartyrdom: 'مقامِ شہادت',
      ageAtMartyrdom: 'بوقتِ شہادت عمر',
      yearsOld: 'سال',
      biography: 'سوانحِ حیات',
      homeVillage: 'آبائی گاؤں',
      associatedConflict: 'متعلقہ معرکہ',
      photoGallery: 'تصاویر',
      viewProfile: 'پروفائل دیکھیں',
      historicalArchive: 'تاریخی ریکارڈ',
      locations: 'علاقہ جات و دیہات',
      allLocations: 'تمام علاقے',
      findLocation: 'گاؤں، تحصیل یا ضلع تلاش کریں...',
      scopeHome: 'آبائی گاؤں',
      scopeMartyrdom: 'مقامِ شہادت',
      scopeBoth: 'دونوں',
      filters: 'فلٹرز',
      resetFilters: 'فلٹر صاف کریں',
      applyFilters: 'فلٹر لاگو کریں',
      cancel: 'منسوخ کریں',
      allWars: 'تمام جنگیں اور معرکے',
      allTehsils: 'تمام تحصیلیں',
      allDistricts: 'تمام اضلاع',
      sortNewest: 'تاریخِ شہادت (تازہ ترین)',
      sortOldest: 'تاریخِ شہادت (قدیم ترین)',
      sortNameAsc: 'نام (الف تا ی)',
      sortNameDesc: 'نام (ی تا الف)',
      sortRecent: 'حال ہی میں شامل کردہ',
      showingRecords: (start, end, total) => `کل <strong>${total}</strong> شہداء میں سے <strong>${start}–${end}</strong> دکھائے جا رہے ہیں`,
      inLocation: (loc) => ` — علاقہ: <strong style="color:#881337;">${loc}</strong>`,
      sonOf: 'ولد',
      daughterOf: 'بنت',
      fatherName: 'والد کا نام',
      placeOfBirth: 'مقامِ پیدائش',
      notAvailable: 'دستیاب نہیں',
      noMartyrsFound: 'منتخب فلٹر کے مطابق کوئی ریکارڈ نہیں ملا',
      noMartyrsSub: 'تلاش یا علاقے کا فلٹر تبدیل کر کے دوبارہ کوشش کریں۔',
      backToAllMartyrs: 'تمام شہداء کی فہرست پر واپس جائیں',
      backToWars: 'جنگیں اور معرکے پر واپس جائیں',
      personalRecord: 'ذاتی اور علاقائی کوائف',
      fullName: 'پورا نام',
      gender: 'جنس',
      male: 'مرد',
      female: 'خاتون',
      other: 'دیگر',
      sourcesHeading: 'تاریخی حوالہ جات اور مستند ذرائع',
      noSources: 'اس ریکارڈ کے لیے اضافی حوالہ جات درج نہیں۔',
      noPhotos: 'اضافی تصاویر موجود نہیں۔',
      noBiography: 'اس شہید کی تفصیلی سوانحِ حیات مرتب کی جا رہی ہے۔',
      fallbackToEnNote: 'انگریزی ریکارڈ دکھایا جا رہا ہے (اردو ترجمہ زیرِ اندراج ہے)',
      fallbackToUrNote: 'اردو ریکارڈ دکھایا جا رہا ہے',
      viewConflictArchive: 'معرکے کا مکمل تاریخی ریکارڈ دیکھیں',
      affectedLocations: 'متاثرہ دیہات اور علاقے',
      clickLocationFilter: 'کسی بھی علاقے کے شہداء دیکھنے کے لیے اس پر کلک کریں',
      reasonCause: 'وجہ / پسِ منظر',
      historicalBackground: 'تاریخی پس منظر',
      detailedDescription: 'تفصیلی تاریخی مضمون',
      ceasefireAccord: 'جنگ بندی اور امن معاہدہ',
      linkedEpisodes: 'منسلک واقعات اور معرکے',
      martyrsInConflict: 'اس معرکے میں درج شہداء',
      reportedToll: 'رپورٹ شدہ شہادتیں',
      reportedInjuries: 'زخمیوں کی تعداد',
      mainLocation: 'مرکزی مقام',
      startDate: 'تاریخِ آغاز',
      endDate: 'تاریخِ اختتام',
      ongoing: 'جاری',
      totalMartyrsLabel: 'درج شدہ شہداء',
      publishedLabel: 'تاریخِ اشاعت',
      incidentDateLabel: 'تاریخِ واقعہ',
      prev: 'پچھلا',
      next: 'اگلا',
      pageOf: (p, tp, tot) => `صفحہ <strong>${p}</strong> از <strong>${tp}</strong> (کل ${tot})`,
      dateFrom: 'تاریخ سے',
      dateTo: 'تاریخ تک',
      locationMatchScope: 'علاقہ فلٹر کی قسم'
    }
  };

  const CATEGORY_UR_MAP = {
    'War / Long-term Conflict': 'طویل جنگ / تنازعہ',
    'Conflict Episode': 'معرکہ / جھڑپ',
    'Sectarian Clash': 'مسلح تصادم',
    'Targeted Attack': 'ٹارگٹڈ حملہ',
    'Convoy Attack': 'قافلے پر حملہ',
    'Bombing': 'بم دھماکہ',
    'Other Incident': 'تاریخی واقعہ'
  };

  const state = {
    section: 'martyrs', // 'martyrs' | 'profile' | 'wars' | 'war-detail'
    activeProfileSlug: null,
    activeProfileData: null,
    activeWarSlug: null,
    activeWarData: null,

    summary: { total_martyrs: 0, total_wars: 0, total_locations: 0 },
    wars: [],
    locationTree: [],
    locationsById: new Map(),
    totalTreeMartyrs: 0,

    locSidebarCollapsed: localStorage.getItem(LOC_COLLAPSED_KEY) === '1',
    locMobileOpen: false,
    locSearchQuery: '',
    locExpanded: new Set(),
    locExpandedInit: false,

    filter: createDefaultFilter(),
    martyrsList: [],
    pagination: { total: 0, page: 1, limit: 12, totalPages: 1 },
    lightbox: { items: [], index: 0 },
    searchTimer: null
  };

  function createDefaultFilter() {
    return {
      search: '',
      war_id: '',
      location_id: '',
      location_scope: 'residential',
      district: '',
      tehsil: '',
      date_from: '',
      date_to: '',
      sort: 'martyrdom_desc',
      page: 1,
      limit: 12
    };
  }

  function getLang() {
    return (window.FoundationI18n && window.FoundationI18n.currentLang === 'ur') ? 'ur' : 'en';
  }

  function isUr() {
    return getLang() === 'ur';
  }

  function dict() {
    return isUr() ? L.ur : L.en;
  }

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pickBi(enVal, urVal) {
    const en = enVal != null && String(enVal).trim() !== '' ? String(enVal).trim() : null;
    const ur = urVal != null && String(urVal).trim() !== '' ? String(urVal).trim() : null;
    if (isUr()) {
      return { text: ur || en || '', usedFallback: !ur && Boolean(en), missing: !ur && !en };
    }
    return { text: en || ur || '', usedFallback: !en && Boolean(ur), missing: !en && !ur };
  }

  function fmtDate(val) {
    if (!val) return dict().notAvailable;
    const s = String(val).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const [y, m, d] = s.split('-').map(Number);
    if (isUr()) {
      const urMonths = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
      return `${d} ${urMonths[m - 1] || ''} ${y}`;
    }
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d).padStart(2, '0')} ${enMonths[m - 1] || ''} ${y}`;
  }

  function fmtCategory(cat) {
    if (!cat) return '';
    return isUr() ? (CATEGORY_UR_MAP[cat] || cat) : cat;
  }

  async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    return data;
  }

  function updateSeoMeta({ title, description, urlPath }) {
    const fullUrl = `${window.location.origin}${urlPath || window.location.pathname}`;
    if (title) document.title = title;
    const descEl = document.getElementById('pageSeoDesc');
    if (descEl && description) descEl.setAttribute('content', description);
    const canEl = document.getElementById('pageCanonicalUrl');
    if (canEl) canEl.setAttribute('href', fullUrl);
    const ogT = document.getElementById('ogTitle');
    if (ogT && title) ogT.setAttribute('content', title);
    const ogD = document.getElementById('ogDesc');
    if (ogD && description) ogD.setAttribute('content', description);
    const ogU = document.getElementById('ogUrl');
    if (ogU) ogU.setAttribute('content', fullUrl);
  }

  function syncHeroTextAndStats() {
    const d = dict();
    const kicker = document.getElementById('pmHeroKicker');
    const title = document.getElementById('pmHeroTitle');
    const sub = document.getElementById('pmHeroSubtitle');
    const tabM = document.getElementById('pmTabMartyrsLabel');
    const tabW = document.getElementById('pmTabWarsLabel');
    const statMLabel = document.getElementById('pmStatMartyrsLabel');
    const statWLabel = document.getElementById('pmStatWarsLabel');
    const statMCount = document.getElementById('pmStatMartyrsCount');
    const statWCount = document.getElementById('pmStatWarsCount');

    if (kicker) kicker.textContent = d.heroKicker;
    if (title) title.textContent = `${d.pageTitle} (${isUr() ? 'Martyrs' : 'شہداءِ ملت'})`;
    if (sub) sub.textContent = d.pageSubtitle;
    if (tabM) tabM.textContent = d.allMartyrs;
    if (tabW) tabW.textContent = d.warsAndConflicts;
    if (statMLabel) statMLabel.textContent = d.totalMartyrsLabel;
    if (statWLabel) statWLabel.textContent = d.warsAndConflicts;
    if (statMCount) statMCount.textContent = String(state.summary.total_martyrs || 0);
    if (statWCount) statWCount.textContent = String(state.summary.total_wars || 0);

    const btnM = document.getElementById('pmTabMartyrsBtn');
    const btnW = document.getElementById('pmTabWarsBtn');
    if (btnM) btnM.classList.toggle('active', state.section === 'martyrs' || state.section === 'profile');
    if (btnW) btnW.classList.toggle('active', state.section === 'wars' || state.section === 'war-detail');
  }

  function indexLocationTree(nodes) {
    for (const n of nodes) {
      state.locationsById.set(Number(n.id), n);
      if (!state.locExpandedInit) {
        if (['Country', 'Province'].includes(n.location_type) || n.name_en === 'Kurram District' || (n.district === 'Kurram District' && n.location_type === 'Tehsil')) {
          state.locExpanded.add(Number(n.id));
        }
      }
      if (n.children && n.children.length) indexLocationTree(n.children);
    }
  }

  async function loadBootstrap() {
    const qs = new URLSearchParams();
    qs.set('location_scope', state.filter.location_scope || 'residential');
    if (state.filter.war_id) qs.set('war_id', state.filter.war_id);

    const data = await apiGet(`/bootstrap?${qs.toString()}`);
    state.summary = data.summary || state.summary;
    state.wars = data.wars || [];
    state.locationTree = data.location_tree || [];
    state.totalTreeMartyrs = Number(data.total_active_martyrs) || 0;
    state.locationsById.clear();
    indexLocationTree(state.locationTree);
    state.locExpandedInit = true;
    syncHeroTextAndStats();
  }

  // =========================================================================
  // URL ROUTER (/martyrs, /martyrs/:slug, /martyrs/war/:slug)
  // =========================================================================
  async function handleRouteFromUrl(pushHistory = false, targetUrl = null) {
    if (targetUrl && pushHistory) {
      window.history.pushState({}, '', targetUrl);
    }
    const path = window.location.pathname.replace(/\/+$/, '') || '/martyrs';
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('lang') === 'ur' && window.FoundationI18n && window.FoundationI18n.currentLang !== 'ur') {
      window.FoundationI18n.setLanguage('ur', false);
    } else if (urlParams.get('lang') === 'en' && window.FoundationI18n && window.FoundationI18n.currentLang !== 'en') {
      window.FoundationI18n.setLanguage('en', false);
    }

    if (!state.locationTree.length) {
      await loadBootstrap();
    }

    if (path.startsWith('/martyrs/war/')) {
      const warSlug = decodeURIComponent(path.slice('/martyrs/war/'.length));
      state.section = 'war-detail';
      state.activeWarSlug = warSlug;
      syncHeroTextAndStats();
      await loadAndRenderPublicWarDetail(warSlug);
      return;
    }

    if (path === '/martyrs/wars') {
      state.section = 'wars';
      syncHeroTextAndStats();
      renderPublicWarsList();
      return;
    }

    if (path.startsWith('/martyrs/') && path !== '/martyrs') {
      const profileSlug = decodeURIComponent(path.slice('/martyrs/'.length));
      state.section = 'profile';
      state.activeProfileSlug = profileSlug;
      syncHeroTextAndStats();
      await loadAndRenderPublicProfile(profileSlug);
      return;
    }

    state.section = 'martyrs';
    syncHeroTextAndStats();
    await loadAndRenderPublicMartyrsList();
  }

  async function switchSection(sec) {
    if (sec === 'wars') {
      state.section = 'wars';
      window.history.pushState({}, '', '/martyrs/wars');
      syncHeroTextAndStats();
      renderPublicWarsList();
    } else {
      state.section = 'martyrs';
      window.history.pushState({}, '', '/martyrs');
      syncHeroTextAndStats();
      await loadAndRenderPublicMartyrsList();
    }
  }

  // =========================================================================
  // 1. PUBLIC ALL MARTYRS DIRECTORY + LOCATIONS SIDEBAR
  // =========================================================================
  async function loadAndRenderPublicMartyrsList() {
    const root = document.getElementById('publicMartyrsMainRoot');
    if (!root) return;
    const d = dict();

    const f = state.filter;
    const qs = new URLSearchParams();
    if (f.search) qs.set('search', f.search);
    if (f.war_id) qs.set('war_id', f.war_id);
    if (f.location_id) qs.set('location_id', f.location_id);
    if (f.location_scope) qs.set('location_scope', f.location_scope);
    if (f.district) qs.set('district', f.district);
    if (f.tehsil) qs.set('tehsil', f.tehsil);
    if (f.date_from) qs.set('date_from', f.date_from);
    if (f.date_to) qs.set('date_to', f.date_to);
    qs.set('sort', f.sort || 'martyrdom_desc');
    qs.set('page', String(f.page || 1));
    qs.set('limit', String(f.limit || 12));

    try {
      const [_, listRes] = await Promise.all([
        loadBootstrap(),
        apiGet(`/list?${qs.toString()}`)
      ]);

      state.martyrsList = listRes.martyrs || [];
      state.pagination = listRes.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 };

      updateSeoMeta({
        title: isUr()
          ? 'شہداءِ ملت — تمام شہداء کا تاریخی ریکارڈ | قصرِ شبیر فاؤنڈیشن'
          : 'Martyrs (شہداءِ ملت) — All Martyrs Historical Archive | Qasr-e-Shabbir Foundation',
        description: d.pageSubtitle,
        urlPath: '/martyrs'
      });

      renderPublicMartyrsView();
    } catch (err) {
      root.innerHTML = `<div class="martyr-editorial-section" style="color:#991B1B;">${esc(err.message)}</div>`;
    }
  }

  function getSelectedLocationLabel() {
    if (!state.filter.location_id) return '';
    const node = state.locationsById.get(Number(state.filter.location_id));
    if (!node) return '';
    return isUr() ? (node.name_ur || node.name_en) : node.name_en;
  }

  function getActiveFilterCount() {
    const f = state.filter;
    let c = 0;
    if (f.search) c++;
    if (f.war_id) c++;
    if (f.location_id) c++;
    if (f.district) c++;
    if (f.tehsil) c++;
    if (f.date_from || f.date_to) c++;
    return c;
  }

  function buildActiveFilterChips() {
    const f = state.filter;
    const d = dict();
    const chips = [];
    if (f.war_id) {
      const w = state.wars.find(x => String(x.id) === String(f.war_id));
      const wTitle = w ? pickBi(w.name, w.name_ur).text : `#${f.war_id}`;
      chips.push({ key: 'war_id', label: `${d.associatedConflict}: ${wTitle}` });
    }
    if (f.location_id) {
      chips.push({ key: 'location_id', label: `${d.locations}: ${getSelectedLocationLabel()}` });
    }
    if (f.search) {
      chips.push({ key: 'search', label: `${d.searchMartyrs}: "${f.search}"` });
    }
    if (f.tehsil) {
      chips.push({ key: 'tehsil', label: f.tehsil });
    }
    if (f.district) {
      chips.push({ key: 'district', label: f.district });
    }
    if (f.date_from || f.date_to) {
      chips.push({ key: 'date_range', label: `${f.date_from || '…'} – ${f.date_to || '…'}` });
    }
    return chips;
  }

  function renderPublicMartyrsView() {
    const root = document.getElementById('publicMartyrsMainRoot');
    if (!root) return;
    const d = dict();
    const f = state.filter;
    const pg = state.pagination;
    const martyrs = state.martyrsList;
    const startIdx = pg.total === 0 ? 0 : (pg.page - 1) * pg.limit + 1;
    const endIdx = Math.min(pg.total, pg.page * pg.limit);
    const selLocLabel = getSelectedLocationLabel();
    const activeChips = buildActiveFilterChips();

    root.innerHTML = `
      <div class="martyrs-loc-mobile-backdrop ${state.locMobileOpen ? 'open' : ''}" id="pmLocMobileBackdrop" onclick="window.QSFPublicMartyrs.toggleMobileLocDrawer(false)"></div>

      <div class="martyrs-workspace-split">
        <!-- DEDICATED PUBLIC LOCATIONS SIDEBAR (READ-ONLY) -->
        <aside class="martyrs-locations-sidebar ${state.locSidebarCollapsed ? 'collapsed' : ''} ${state.locMobileOpen ? 'mobile-open' : ''}" id="pmLocationsSidebar" aria-label="${esc(d.locations)}">
          <div class="martyrs-loc-header">
            <div class="martyrs-loc-header-title">
              <i class="fas fa-map-location-dot"></i>
              <span>${esc(d.locations)}</span>
            </div>
            <button type="button" class="martyrs-loc-toggle-btn" onclick="window.QSFPublicMartyrs.toggleLocationsSidebar()" title="${esc(d.locations)}">
              <i class="fas ${state.locSidebarCollapsed ? (isUr() ? 'fa-angles-left' : 'fa-angles-right') : (isUr() ? 'fa-angles-right' : 'fa-angles-left')}"></i>
            </button>
          </div>

          <div class="martyrs-loc-body">
            <div class="martyrs-loc-controls">
              <input type="text" id="pmLocSearchInput" class="martyrs-loc-search"
                placeholder="${esc(d.findLocation)}"
                value="${esc(state.locSearchQuery)}" />
              <div class="martyrs-loc-scope-tabs">
                <button type="button" class="martyrs-loc-scope-btn ${f.location_scope === 'residential' ? 'active' : ''}" onclick="window.QSFPublicMartyrs.setLocationScope('residential')">${esc(d.scopeHome)}</button>
                <button type="button" class="martyrs-loc-scope-btn ${f.location_scope === 'martyrdom' ? 'active' : ''}" onclick="window.QSFPublicMartyrs.setLocationScope('martyrdom')">${esc(d.scopeMartyrdom)}</button>
                <button type="button" class="martyrs-loc-scope-btn ${f.location_scope === 'either' ? 'active' : ''}" onclick="window.QSFPublicMartyrs.setLocationScope('either')">${esc(d.scopeBoth)}</button>
              </div>
            </div>

            <div class="martyrs-loc-tree-scroll" id="pmLocTreeContainer">
              <div class="martyrs-loc-row ${!f.location_id ? 'active' : ''}" onclick="window.QSFPublicMartyrs.selectLocation('')">
                <span class="martyrs-loc-row-left">
                  <i class="fas fa-globe" style="color:#881337; width:14px;"></i>
                  <span class="martyrs-loc-name" style="font-weight:700;">${esc(d.allLocations)}</span>
                </span>
                <span class="martyrs-loc-count ${state.totalTreeMartyrs > 0 ? 'has-records' : ''}">${state.totalTreeMartyrs}</span>
              </div>
              ${renderPublicLocationTreeNodes(state.locationTree, 0)}
            </div>
          </div>
        </aside>

        <!-- FULL-WIDTH PUBLIC MARTYRS ARCHIVE LISTING -->
        <div class="martyrs-workspace-main">
          <!-- Public Search & Filter Toolbar -->
          <div class="martyrs-directory-toolbar" style="gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button type="button" class="btn-public-martyr martyrs-mobile-loc-btn" onclick="window.QSFPublicMartyrs.toggleMobileLocDrawer(true)">
                <i class="fas fa-map-location-dot"></i> ${esc(d.locations)}
              </button>
              <span style="font-size: 0.88rem; color: #334155;">
                ${d.showingRecords(startIdx, endIdx, pg.total)}
                ${selLocLabel ? d.inLocation(esc(selLocLabel)) : ''}
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; justify-content: flex-end;">
              <div style="position: relative; min-width: 240px; max-width: 340px; flex: 1;">
                <input type="text" id="pmQuickSearchInput" class="form-control"
                  style="height: 36px; padding-inline-start: 34px; font-size: 0.84rem;"
                  placeholder="${esc(d.searchPlaceholder)}"
                  value="${esc(f.search)}" />
                <i class="fas fa-search" style="position: absolute; top: 50%; transform: translateY(-50%); inset-inline-start: 11px; color: #94A3B8; font-size: 0.82rem;"></i>
              </div>

              <select id="pmQuickWarSelect" class="form-control" style="width: auto; max-width: 260px; height: 36px; padding: 4px 10px; font-size: 0.82rem;">
                <option value="">${esc(d.allWars)}</option>
                ${state.wars.map(w => {
                  const wName = pickBi(w.name, w.name_ur).text;
                  return `<option value="${w.id}" ${String(f.war_id) === String(w.id) ? 'selected' : ''}>${esc(wName)} (${w.total_martyrs})</option>`;
                }).join('')}
              </select>

              <select id="pmQuickSortSelect" class="form-control" style="width: auto; height: 36px; padding: 4px 10px; font-size: 0.82rem;">
                <option value="martyrdom_desc" ${f.sort === 'martyrdom_desc' ? 'selected' : ''}>${esc(d.sortNewest)}</option>
                <option value="martyrdom_asc" ${f.sort === 'martyrdom_asc' ? 'selected' : ''}>${esc(d.sortOldest)}</option>
                <option value="name_asc" ${f.sort === 'name_asc' ? 'selected' : ''}>${esc(d.sortNameAsc)}</option>
                <option value="name_desc" ${f.sort === 'name_desc' ? 'selected' : ''}>${esc(d.sortNameDesc)}</option>
                <option value="recent" ${f.sort === 'recent' ? 'selected' : ''}>${esc(d.sortRecent)}</option>
              </select>

              <button type="button" class="btn-public-martyr" style="height: 36px;" onclick="window.QSFPublicMartyrs.openFiltersModal()">
                <i class="fas fa-sliders"></i> ${esc(d.filters)} ${getActiveFilterCount() > 0 ? `(${getActiveFilterCount()})` : ''}
              </button>
            </div>
          </div>

          ${activeChips.length ? `
            <div class="martyrs-active-chips">
              ${activeChips.map(ch => `
                <span class="martyrs-active-chip">
                  ${esc(ch.label)}
                  <button type="button" onclick="window.QSFPublicMartyrs.clearSingleFilter('${esc(ch.key)}')">&times;</button>
                </span>
              `).join('')}
              <button type="button" class="btn-public-martyr" style="padding: 2px 10px; font-size: 0.74rem; height: 24px;" onclick="window.QSFPublicMartyrs.resetAllFilters()">
                ${esc(d.resetFilters)}
              </button>
            </div>
          ` : ''}

          ${martyrs.length === 0 ? `
            <div class="martyr-editorial-section" style="text-align: center; padding: 52px 24px;">
              <i class="fas fa-monument" style="font-size: 2.2rem; color: #CBD5E1; margin-bottom: 12px;"></i>
              <h3 style="margin: 0 0 6px; color: #334155;">${esc(d.noMartyrsFound)}</h3>
              <p style="margin: 0 0 18px; color: #64748B; font-size: 0.88rem;">${esc(d.noMartyrsSub)}</p>
              ${getActiveFilterCount() > 0 ? `
                <button type="button" class="btn-public-martyr primary" onclick="window.QSFPublicMartyrs.resetAllFilters()">
                  <i class="fas fa-rotate-left"></i> ${esc(d.resetFilters)}
                </button>
              ` : ''}
            </div>
          ` : `
            <div class="martyrs-cards-grid" id="publicMartyrsCardsGrid">
              ${martyrs.map(renderPublicMartyrCard).join('')}
            </div>
            ${renderPublicPaginationBar(pg)}
          `}
        </div>
      </div>
    `;

    // Wire inputs
    const locInput = document.getElementById('pmLocSearchInput');
    if (locInput) {
      locInput.addEventListener('input', () => {
        state.locSearchQuery = locInput.value;
        const box = document.getElementById('pmLocTreeContainer');
        if (box) {
          box.innerHTML = `
            <div class="martyrs-loc-row ${!state.filter.location_id ? 'active' : ''}" onclick="window.QSFPublicMartyrs.selectLocation('')">
              <span class="martyrs-loc-row-left">
                <i class="fas fa-globe" style="color:#881337; width:14px;"></i>
                <span class="martyrs-loc-name" style="font-weight:700;">${esc(dict().allLocations)}</span>
              </span>
              <span class="martyrs-loc-count ${state.totalTreeMartyrs > 0 ? 'has-records' : ''}">${state.totalTreeMartyrs}</span>
            </div>
            ${renderPublicLocationTreeNodes(state.locationTree, 0)}
          `;
        }
      });
    }

    const searchInput = document.getElementById('pmQuickSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(state.searchTimer);
        state.searchTimer = setTimeout(() => {
          state.filter.search = searchInput.value.trim();
          state.filter.page = 1;
          loadAndRenderPublicMartyrsList();
        }, 320);
      });
    }

    const warSel = document.getElementById('pmQuickWarSelect');
    if (warSel) {
      warSel.addEventListener('change', () => {
        state.filter.war_id = warSel.value;
        state.filter.page = 1;
        loadAndRenderPublicMartyrsList();
      });
    }

    const sortSel = document.getElementById('pmQuickSortSelect');
    if (sortSel) {
      sortSel.addEventListener('change', () => {
        state.filter.sort = sortSel.value;
        state.filter.page = 1;
        loadAndRenderPublicMartyrsList();
      });
    }
  }

  function renderPublicLocationTreeNodes(nodes, depth) {
    if (!nodes || !nodes.length) return '';
    const q = String(state.locSearchQuery || '').trim().toLowerCase();
    const activeId = String(state.filter.location_id || '');

    const matchesNode = node => {
      if (!q) return true;
      const hit = (node.name_en || '').toLowerCase().includes(q)
        || (node.name_ur || '').toLowerCase().includes(q)
        || (node.alt_names || '').toLowerCase().includes(q)
        || (node.tehsil || '').toLowerCase().includes(q)
        || (node.district || '').toLowerCase().includes(q);
      if (hit) return true;
      return (node.children || []).some(matchesNode);
    };

    return nodes.filter(matchesNode).map(node => {
      const hasKids = node.children && node.children.length > 0;
      const expanded = q ? true : state.locExpanded.has(Number(node.id));
      const isSelected = activeId === String(node.id);
      const isCountryOrProv = node.location_type === 'Country' || node.location_type === 'Province';
      const levelClass = node.location_type === 'District' ? 'level-district'
        : node.location_type === 'Tehsil' ? 'level-tehsil'
        : isCountryOrProv ? ''
        : 'level-village';

      const label = isUr() ? (node.name_ur || node.name_en) : node.name_en;
      const countNum = Number(node.martyr_count) || 0;
      const chevronDir = expanded ? 'down' : (isUr() ? 'left' : 'right');

      return `
        <div data-loc-node="${node.id}">
          <div class="martyrs-loc-row ${levelClass} ${isSelected ? 'active' : ''}" data-loc-id="${node.id}" data-loc-name="${esc(node.name_en)}"
            onclick="window.QSFPublicMartyrs.selectLocation(${node.id})">
            <span class="martyrs-loc-row-left">
              ${hasKids
                ? `<span class="martyrs-loc-caret" onclick="event.stopPropagation(); window.QSFPublicMartyrs.toggleLocNodeExpand(${node.id})"><i class="fas fa-chevron-${chevronDir}"></i></span>`
                : `<span class="martyrs-loc-caret"><i class="fas fa-circle" style="font-size:0.32rem;"></i></span>`
              }
              <span class="martyrs-loc-name" title="${esc(node.name_en)}${node.name_ur ? ' · ' + esc(node.name_ur) : ''}${node.alt_names ? ' · ' + esc(node.alt_names) : ''}">${esc(label)}</span>
            </span>
            <span class="martyrs-loc-count ${countNum > 0 ? 'has-records' : ''}">${countNum}</span>
          </div>
          ${hasKids && expanded ? `<div>${renderPublicLocationTreeNodes(node.children, depth + 1)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderPublicMartyrCard(m) {
    const d = dict();
    const nameBi = pickBi(m.full_name, m.full_name_ur);
    const fatherBi = pickBi(m.father_name, m.father_name_ur);
    const marLocBi = pickBi(
      [m.martyrdom_location_name || m.place_of_martyrdom, m.martyrdom_tehsil].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
      [m.martyrdom_location_name_ur || m.place_of_martyrdom_ur, m.martyrdom_tehsil_ur].filter((v, i, a) => v && a.indexOf(v) === i).join('، ')
    );
    const homeLocBi = pickBi(
      [m.residence_location_name || m.city, m.residence_tehsil].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
      [m.residence_location_name_ur || m.city_ur, m.residence_tehsil_ur].filter((v, i, a) => v && a.indexOf(v) === i).join('، ')
    );
    const warBi = pickBi(m.primary_war_name, m.primary_war_name_ur);
    const profileUrl = `/martyrs/${encodeURIComponent(m.slug || String(m.id))}`;
    const relPrefix = m.gender === 'female' ? d.daughterOf : d.sonOf;

    return `
      <article class="martyr-profile-card" data-public-martyr-id="${m.id}" data-public-martyr-slug="${esc(m.slug)}" onclick="window.QSFPublicMartyrs.openProfile('${esc(m.slug || m.id)}')">
        <div class="martyr-card-avatar">
          ${m.profile_photo_url
            ? `<img src="${esc(m.profile_photo_url)}" alt="${esc(nameBi.text)}" loading="lazy" />`
            : `<i class="fas fa-user"></i>`
          }
        </div>
        <div class="martyr-card-info">
          <h3 class="martyr-card-name ${isUr() ? 'martyr-urdu' : ''}">${esc(nameBi.text)}</h3>
          ${fatherBi.text ? `<div class="martyr-card-father ${isUr() ? 'martyr-urdu' : ''}">${esc(relPrefix)} ${esc(fatherBi.text)}</div>` : ''}
          <div class="martyr-card-details">
            ${m.date_of_birth ? `<span><i class="fas fa-cake-candles"></i> ${esc(d.dateOfBirth)}: ${esc(fmtDate(m.date_of_birth))}</span>` : ''}
            <span><i class="fas fa-calendar-day"></i> ${esc(d.dateOfMartyrdom)}: <strong>${esc(fmtDate(m.date_of_martyrdom))}</strong></span>
            ${marLocBi.text ? `<span><i class="fas fa-location-dot"></i> ${esc(d.placeOfMartyrdom)}: ${esc(marLocBi.text)}</span>` : ''}
            ${homeLocBi.text ? `<span><i class="fas fa-house"></i> ${esc(d.homeVillage)}: ${esc(homeLocBi.text)}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
            ${warBi.text ? `
              <span class="martyr-card-war-link" style="margin-top:0;" onclick="event.stopPropagation(); window.QSFPublicMartyrs.openWarDetail('${esc(m.primary_war_slug || m.primary_war_id)}')" title="${esc(d.associatedConflict)}">
                <i class="fas fa-landmark"></i> ${esc(warBi.text)}
              </span>
            ` : '<span></span>'}
            <a href="${profileUrl}" class="btn-public-martyr" style="padding: 3px 10px; font-size: 0.74rem;" onclick="event.stopPropagation(); event.preventDefault(); window.QSFPublicMartyrs.openProfile('${esc(m.slug || m.id)}')">
              ${esc(d.viewProfile)} <i class="fas ${isUr() ? 'fa-arrow-left' : 'fa-arrow-right'}" style="font-size: 0.68rem;"></i>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function renderPublicPaginationBar(pg) {
    const d = dict();
    const pages = [];
    for (let i = 1; i <= pg.totalPages; i++) {
      if (i === 1 || i === pg.totalPages || Math.abs(i - pg.page) <= 2) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return `
      <div class="martyr-pagination-bar">
        <div style="font-size: 0.82rem; color: #475569;">
          ${d.pageOf(pg.page, pg.totalPages, pg.total)}
        </div>
        <div class="martyr-page-btns">
          <button type="button" class="martyr-page-btn" ${pg.page <= 1 ? 'disabled' : ''} onclick="window.QSFPublicMartyrs.goToPage(${pg.page - 1})">${esc(d.prev)}</button>
          ${pages.map(p => p === '...'
            ? `<span style="padding: 0 4px; color: #94A3B8;">…</span>`
            : `<button type="button" class="martyr-page-btn ${p === pg.page ? 'active' : ''}" onclick="window.QSFPublicMartyrs.goToPage(${p})">${p}</button>`
          ).join('')}
          <button type="button" class="martyr-page-btn" ${pg.page >= pg.totalPages ? 'disabled' : ''} onclick="window.QSFPublicMartyrs.goToPage(${pg.page + 1})">${esc(d.next)}</button>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 2. INDIVIDUAL PUBLIC MARTYR DIGITAL MEMORIAL PROFILE (/martyrs/:slug)
  // =========================================================================
  async function openProfile(slugOrId) {
    state.section = 'profile';
    state.activeProfileSlug = String(slugOrId);
    const targetUrl = `/martyrs/${encodeURIComponent(state.activeProfileSlug)}`;
    window.history.pushState({}, '', targetUrl);
    syncHeroTextAndStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await loadAndRenderPublicProfile(state.activeProfileSlug);
  }

  async function loadAndRenderPublicProfile(slugOrId) {
    const root = document.getElementById('publicMartyrsMainRoot');
    if (!root) return;
    root.innerHTML = `<div style="padding: 48px 20px; text-align: center; color: #64748B;"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    try {
      const data = await apiGet(`/profile/${encodeURIComponent(slugOrId)}`);
      state.activeProfileData = data;
      renderLoadedPublicProfile();
    } catch (err) {
      root.innerHTML = `
        <div class="martyr-editorial-section" style="text-align: center; padding: 48px 24px;">
          <h3 style="color: #991B1B; margin: 0 0 10px;">${esc(err.message)}</h3>
          <button type="button" class="btn-public-martyr primary" onclick="window.QSFPublicMartyrs.switchSection('martyrs')">
            <i class="fas ${isUr() ? 'fa-arrow-right' : 'fa-arrow-left'}"></i> ${esc(dict().backToAllMartyrs)}
          </button>
        </div>
      `;
    }
  }

  function renderLoadedPublicProfile() {
    const root = document.getElementById('publicMartyrsMainRoot');
    const data = state.activeProfileData;
    if (!root || !data || !data.martyr) return;

    const d = dict();
    const m = data.martyr;
    const wars = data.wars || [];
    const photos = data.photos || [];
    const sources = data.sources || [];

    const nameBi = pickBi(m.full_name, m.full_name_ur);
    const secondaryName = isUr() ? (m.full_name && m.full_name !== nameBi.text ? m.full_name : '') : (m.full_name_ur && m.full_name_ur !== nameBi.text ? m.full_name_ur : '');
    const fatherBi = pickBi(m.father_name, m.father_name_ur);
    const birthPlaceBi = pickBi(m.place_of_birth, m.place_of_birth_ur);
    const homeBi = pickBi(
      [m.residence_location_name || m.city, m.residence_tehsil, m.district, m.province_state].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
      [m.residence_location_name_ur || m.city_ur, m.residence_tehsil_ur, m.district_ur, m.province_state_ur].filter((v, i, a) => v && a.indexOf(v) === i).join('، ')
    );
    const marBi = pickBi(
      [m.martyrdom_location_name || m.place_of_martyrdom, m.martyrdom_tehsil, m.martyrdom_district].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
      [m.martyrdom_location_name_ur || m.place_of_martyrdom_ur, m.martyrdom_tehsil_ur, m.martyrdom_district_ur].filter((v, i, a) => v && a.indexOf(v) === i).join('، ')
    );
    const warBi = pickBi(m.primary_war_name, m.primary_war_name_ur);
    const bioBi = pickBi(m.biography_html, m.biography_ur);
    const relPrefix = m.gender === 'female' ? d.daughterOf : d.sonOf;
    const genderLabel = m.gender === 'female' ? d.female : m.gender === 'other' ? d.other : d.male;

    const lbItems = [];
    if (m.profile_photo_url) lbItems.push({ image_url: m.profile_photo_url, caption: nameBi.text });
    photos.forEach(p => lbItems.push({ image_url: p.image_url, caption: p.caption || nameBi.text }));
    window.__qsfPublicMartyrPhotos = lbItems;

    updateSeoMeta({
      title: `${nameBi.text} — ${d.pageTitle} | Qasr-e-Shabbir Foundation`,
      description: String(bioBi.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 175) || `${nameBi.text} — ${d.historicalArchive}`,
      urlPath: `/martyrs/${encodeURIComponent(m.slug || String(m.id))}`
    });

    const bioDir = isUr() && !bioBi.usedFallback ? 'rtl' : (!isUr() && !bioBi.usedFallback ? 'ltr' : (isUr() ? 'ltr' : 'rtl'));

    root.innerHTML = `
      <div class="martyr-page-topbar">
        <button type="button" class="btn-public-martyr" onclick="window.QSFPublicMartyrs.switchSection('martyrs')">
          <i class="fas ${isUr() ? 'fa-arrow-right' : 'fa-arrow-left'}"></i> ${esc(d.backToAllMartyrs)}
        </button>
      </div>

      <header class="martyr-memorial-header" data-public-profile-header="1">
        <div class="martyr-memorial-portrait" ${m.profile_photo_url ? `onclick="window.QSFPublicMartyrs.openLightbox(window.__qsfPublicMartyrPhotos, 0)"` : ''}>
          ${m.profile_photo_url
            ? `<img src="${esc(m.profile_photo_url)}" alt="${esc(nameBi.text)}" />`
            : `<i class="fas fa-user"></i>`
          }
        </div>
        <div class="martyr-memorial-identity">
          <div class="martyr-memorial-kicker">
            ${esc(d.historicalArchive)} · ${esc(d.pageTitle)}
          </div>
          <h1 class="martyr-memorial-name ${isUr() ? 'martyr-urdu' : ''}" id="publicProfileMainName">${esc(nameBi.text)}</h1>
          ${secondaryName ? `<div style="font-size: 0.96rem; color: #64748B; font-weight: 600; margin-top: -2px; margin-bottom: 6px;">${esc(secondaryName)}</div>` : ''}
          <p class="martyr-memorial-sub ${isUr() ? 'martyr-urdu' : ''}">
            ${fatherBi.text ? `${esc(relPrefix)} <strong>${esc(fatherBi.text)}</strong>` : `${esc(d.fatherName)}: <strong>${esc(d.notAvailable)}</strong>`}
          </p>
          ${warBi.text ? `
            <div style="margin: -4px 0 14px;">
              <span class="martyr-card-war-link" style="margin-top: 0; cursor: pointer; font-size: 0.8rem; padding: 4px 10px;" onclick="window.QSFPublicMartyrs.openWarDetail('${esc(m.primary_war_slug || m.primary_war_id)}')">
                <i class="fas fa-landmark" style="margin-inline-end: 4px;"></i> ${esc(warBi.text)}
              </span>
            </div>
          ` : ''}
          <div class="martyr-memorial-keyfacts">
            <div class="martyr-keyfact">
              <small>${esc(d.dateOfBirth)}</small>
              <strong>${esc(fmtDate(m.date_of_birth))}</strong>
            </div>
            <div class="martyr-keyfact">
              <small>${esc(d.dateOfMartyrdom)}</small>
              <strong style="color: #881337;">${esc(fmtDate(m.date_of_martyrdom))}</strong>
            </div>
            <div class="martyr-keyfact">
              <small>${esc(d.ageAtMartyrdom)}</small>
              <strong>${m.age_at_death != null ? `${m.age_at_death} ${esc(d.yearsOld)}` : esc(d.notAvailable)}</strong>
            </div>
            <div class="martyr-keyfact">
              <small>${esc(d.placeOfMartyrdom)}</small>
              <strong>${esc(marBi.text || d.notAvailable)}</strong>
            </div>
          </div>
        </div>
      </header>

      <div class="martyr-profile-2col">
        <div>
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading"><span><i class="fas fa-id-card"></i> ${esc(d.personalRecord)}</span></h3>
            <dl class="martyr-info-dl">
              <div class="martyr-info-pair"><dt>${esc(d.fullName)}</dt><dd>${esc(nameBi.text)}</dd></div>
              <div class="martyr-info-pair"><dt>${esc(d.fatherName)}</dt><dd>${esc(fatherBi.text || d.notAvailable)}</dd></div>
              <div class="martyr-info-pair"><dt>${esc(d.gender)}</dt><dd>${esc(genderLabel)}</dd></div>
              <div class="martyr-info-pair"><dt>${esc(d.dateOfBirth)}</dt><dd>${esc(fmtDate(m.date_of_birth))}</dd></div>
              <div class="martyr-info-pair"><dt>${esc(d.dateOfMartyrdom)}</dt><dd style="color:#881337;">${esc(fmtDate(m.date_of_martyrdom))}</dd></div>
              <div class="martyr-info-pair"><dt>${esc(d.placeOfBirth)}</dt><dd>${esc(birthPlaceBi.text || d.notAvailable)}</dd></div>
              <div class="martyr-info-pair"><dt>${esc(d.homeVillage)}</dt><dd>${esc(homeBi.text || d.notAvailable)}</dd></div>
              <div class="martyr-info-pair"><dt>${esc(d.placeOfMartyrdom)}</dt><dd style="color:#881337;">${esc(marBi.text || d.notAvailable)}</dd></div>
            </dl>
          </section>

          <section class="martyr-editorial-section" id="publicProfileBiographySection">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-feather-pointed"></i> ${esc(d.biography)}</span>
              ${bioBi.usedFallback ? `<span class="public-fallback-note" data-fallback-indicator="1"><i class="fas fa-language"></i> ${esc(isUr() ? d.fallbackToEnNote : d.fallbackToUrNote)}</span>` : ''}
            </h3>
            ${bioBi.text ? `
              <div class="martyr-richtext-content ${bioDir === 'rtl' ? 'martyr-urdu' : ''}" dir="${bioDir}">
                ${bioBi.text}
              </div>
            ` : `<p style="color: #94A3B8; font-size: 0.88rem; margin: 0;">${esc(d.noBiography)}</p>`}
          </section>

          ${renderPublicSourcesSection(sources)}

          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-images"></i> ${esc(d.photoGallery)} (${photos.length})</span>
            </h3>
            ${photos.length === 0 ? `
              <p style="color: #94A3B8; font-size: 0.86rem; margin: 0;">${esc(d.noPhotos)}</p>
            ` : `
              <div class="martyr-gallery-grid">
                ${photos.map((p, idx) => `
                  <figure class="martyr-gallery-tile" style="margin: 0;" onclick="window.QSFPublicMartyrs.openLightbox(window.__qsfPublicMartyrPhotos, ${m.profile_photo_url ? idx + 1 : idx})">
                    <img src="${esc(p.image_url)}" alt="${esc(p.caption || nameBi.text)}" loading="lazy" />
                    ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}
                  </figure>
                `).join('')}
              </div>
            `}
          </section>
        </div>

        <div>
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-landmark"></i> ${esc(d.associatedConflict)}</span>
            </h3>
            ${wars.map(w => {
              const wTitle = pickBi(w.name, w.name_ur).text;
              const wLoc = pickBi(
                [w.location, w.tehsil, w.district].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
                [w.location_ur || w.location, w.tehsil_ur || w.tehsil, w.district_ur || w.district].filter((v, i, a) => v && a.indexOf(v) === i).join('، ')
              ).text;
              return `
                <div class="martyr-linked-war-box">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
                    <span style="font-size: 0.7rem; font-weight: 800; color: #881337;">${esc(fmtCategory(w.category) || d.associatedConflict)}</span>
                  </div>
                  <h4 class="${isUr() ? 'martyr-urdu' : ''}" style="margin: 0 0 6px;">${esc(wTitle)}</h4>
                  <div style="font-size: 0.8rem; color: #475569; margin-bottom: 10px;">
                    <div><i class="fas fa-location-dot" style="color:#881337; width:14px;"></i> ${esc(wLoc || '—')}</div>
                    <div><i class="fas fa-calendar-days" style="color:#881337; width:14px;"></i> ${esc(fmtDate(w.start_date))} – ${w.end_date ? esc(fmtDate(w.end_date)) : esc(d.ongoing)}</div>
                  </div>
                  <button type="button" class="btn-public-martyr" style="width: 100%; justify-content: center;" onclick="window.QSFPublicMartyrs.openWarDetail('${esc(w.slug || w.id)}')">
                    ${esc(d.viewConflictArchive)} <i class="fas ${isUr() ? 'fa-arrow-left' : 'fa-arrow-right'}"></i>
                  </button>
                </div>
              `;
            }).join('')}
          </section>
        </div>
      </div>
    `;
  }

  function renderPublicSourcesSection(sources) {
    const d = dict();
    const list = Array.isArray(sources) ? sources : [];
    return `
      <section class="martyr-editorial-section" data-public-sources="1">
        <h3 class="martyr-section-heading">
          <span><i class="fas fa-newspaper"></i> ${esc(d.sourcesHeading)} (${list.length})</span>
        </h3>
        ${list.length === 0 ? `
          <p style="color: #94A3B8; font-size: 0.86rem; margin: 0;">${esc(d.noSources)}</p>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${list.map(s => `
              <div class="martyr-source-item" style="padding: 12px 14px; border: 1px solid #E2E8F0; border-inline-start: 3px solid #881337; border-radius: 4px; background: #F8FAFC;" dir="ltr">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
                  <div style="font-weight: 700; color: #0F172A; font-size: 0.9rem;">
                    ${s.source_url
                      ? `<a href="${esc(s.source_url)}" target="_blank" rel="noopener noreferrer" style="color: #881337;">${esc(s.source_title)} <i class="fas fa-arrow-up-right-from-square" style="font-size: 0.72rem; margin-left: 4px;"></i></a>`
                      : esc(s.source_title)
                    }
                  </div>
                  ${s.publisher ? `<span style="background: #E2E8F0; color: #1E293B; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 3px;">${esc(s.publisher)}</span>` : ''}
                </div>
                <div style="display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.76rem; color: #475569; margin-top: 6px;">
                  ${s.publication_date ? `<span><i class="fas fa-calendar-check" style="color:#881337;"></i> ${esc(d.publishedLabel)}: <strong>${esc(fmtDate(s.publication_date))}</strong></span>` : ''}
                  ${s.incident_date ? `<span><i class="fas fa-calendar-day" style="color:#881337;"></i> ${esc(d.incidentDateLabel)}: <strong>${esc(fmtDate(s.incident_date))}</strong></span>` : ''}
                  ${s.reported_casualties ? `<span><i class="fas fa-chart-simple" style="color:#881337;"></i> <strong>${esc(s.reported_casualties)}</strong></span>` : ''}
                </div>
                ${s.source_notes ? `<div style="margin-top: 6px; font-size: 0.8rem; color: #334155;">${esc(s.source_notes)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </section>
    `;
  }

  // =========================================================================
  // 3. PUBLIC WARS & CONFLICTS ARCHIVE & WAR DETAIL VIEW (/martyrs/war/:slug)
  // =========================================================================
  function renderPublicWarsList() {
    const root = document.getElementById('publicMartyrsMainRoot');
    if (!root) return;
    const d = dict();

    updateSeoMeta({
      title: `${d.warsAndConflicts} — ${d.pageTitle} | Qasr-e-Shabbir Foundation`,
      description: d.pageSubtitle,
      urlPath: '/martyrs/wars'
    });

    root.innerHTML = `
      <div class="martyr-wars-grid">
        ${state.wars.map(w => {
          const wTitle = pickBi(w.name, w.name_ur).text;
          const wDesc = pickBi(w.short_description, w.short_description_ur).text;
          const wLoc = pickBi(
            [w.location, w.tehsil, w.district].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
            [w.location_ur || w.location, w.tehsil, w.district].filter((v, i, a) => v && a.indexOf(v) === i).join('، ')
          ).text;
          const wToll = pickBi(w.reported_casualties, w.reported_casualties_ur).text;
          const parentTitle = pickBi(w.parent_war_name, w.parent_war_name_ur).text;
          return `
            <article class="martyr-war-card" onclick="window.QSFPublicMartyrs.openWarDetail('${esc(w.slug || w.id)}')" style="cursor:pointer;">
              <div class="martyr-war-cover">
                ${w.cover_image_url
                  ? `<img src="${esc(w.cover_image_url)}" alt="${esc(wTitle)}" loading="lazy" />`
                  : `<div class="martyr-war-cover-placeholder"><i class="fas fa-landmark" style="font-size: 2rem;"></i><span style="font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase;">${esc(d.historicalArchive)}</span></div>`
                }
                <div style="position: absolute; top: 10px; inset-inline-start: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
                  ${w.category ? `<span class="martyr-status-tag" style="background: rgba(15,23,42,0.82); color:#FFF;">${esc(fmtCategory(w.category))}</span>` : ''}
                </div>
                <div class="martyr-war-count-chip">
                  <i class="fas fa-users" style="margin-inline-end: 4px;"></i> ${esc(d.totalMartyrsLabel)}: ${Number(w.total_martyrs) || 0}
                </div>
              </div>
              <div class="martyr-war-card-body">
                ${parentTitle ? `
                  <div style="font-size: 0.74rem; color: #881337; font-weight: 700; margin-bottom: 5px;">
                    <i class="fas fa-sitemap"></i> ${esc(parentTitle)}
                  </div>
                ` : ''}
                <h3 class="martyr-war-card-title ${isUr() ? 'martyr-urdu' : ''}">${esc(wTitle)}</h3>
                <div class="martyr-war-meta">
                  <span><i class="fas fa-location-dot"></i> ${esc(wLoc)}</span>
                  <span><i class="fas fa-calendar-days"></i> ${esc(fmtDate(w.start_date))} – ${w.end_date ? esc(fmtDate(w.end_date)) : esc(d.ongoing)}</span>
                  ${wToll ? `<span><i class="fas fa-chart-simple"></i> ${esc(wToll)}</span>` : ''}
                </div>
                <p class="martyr-war-desc ${isUr() ? 'martyr-urdu' : ''}">
                  ${wDesc ? esc(wDesc.slice(0, 190)) + (wDesc.length > 190 ? '…' : '') : ''}
                </p>
                <div class="martyr-war-card-footer">
                  <span class="btn-public-martyr primary" style="padding: 5px 12px; font-size: 0.78rem;">
                    <i class="fas fa-book-open"></i> ${esc(d.historicalArchive)}
                  </span>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  async function openWarDetail(slugOrId) {
    state.section = 'war-detail';
    state.activeWarSlug = String(slugOrId);
    window.history.pushState({}, '', `/martyrs/war/${encodeURIComponent(state.activeWarSlug)}`);
    syncHeroTextAndStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await loadAndRenderPublicWarDetail(state.activeWarSlug);
  }

  async function loadAndRenderPublicWarDetail(slugOrId) {
    const root = document.getElementById('publicMartyrsMainRoot');
    if (!root) return;
    root.innerHTML = `<div style="padding: 48px 20px; text-align: center; color: #64748B;"><i class="fas fa-circle-notch fa-spin"></i></div>`;

    try {
      const data = await apiGet(`/wars/${encodeURIComponent(slugOrId)}`);
      state.activeWarData = data;
      renderLoadedPublicWarDetail();
    } catch (err) {
      root.innerHTML = `
        <div class="martyr-editorial-section" style="text-align: center; padding: 48px 24px;">
          <h3 style="color: #991B1B; margin: 0 0 10px;">${esc(err.message)}</h3>
          <button type="button" class="btn-public-martyr primary" onclick="window.QSFPublicMartyrs.switchSection('wars')">
            ${esc(dict().backToWars)}
          </button>
        </div>
      `;
    }
  }

  function renderLoadedPublicWarDetail() {
    const root = document.getElementById('publicMartyrsMainRoot');
    const data = state.activeWarData;
    if (!root || !data || !data.war) return;

    const d = dict();
    const w = data.war;
    const childEpisodes = data.child_episodes || [];
    const affectedLocs = data.affected_locations || [];
    const sources = data.sources || [];
    const martyrs = data.martyrs || [];

    const titleBi = pickBi(w.name, w.name_ur);
    const shortBi = pickBi(w.short_description, w.short_description_ur);
    const reasonBi = pickBi(w.reason_cause, w.reason_cause_ur);
    const bgBi = pickBi(w.historical_background, w.historical_background_ur);
    const detBi = pickBi(w.detailed_article, w.detailed_article_ur);
    const tollBi = pickBi(w.reported_casualties, w.reported_casualties_ur);
    const ceaseBi = pickBi(w.ceasefire_info, w.ceasefire_info_ur);
    const locBi = pickBi(
      [w.location, w.tehsil, w.district, w.province].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
      [w.location_ur || w.location, w.tehsil_ur || w.tehsil, w.district_ur || w.district].filter((v, i, a) => v && a.indexOf(v) === i).join('، ')
    );
    const parentBi = pickBi(w.parent_war_name, w.parent_war_name_ur);

    updateSeoMeta({
      title: `${titleBi.text} — ${d.historicalArchive} | Qasr-e-Shabbir Foundation`,
      description: shortBi.text || titleBi.text,
      urlPath: `/martyrs/war/${encodeURIComponent(w.slug || String(w.id))}`
    });

    root.innerHTML = `
      <div class="martyr-page-topbar">
        <button type="button" class="btn-public-martyr" onclick="window.QSFPublicMartyrs.switchSection('wars')">
          <i class="fas ${isUr() ? 'fa-arrow-right' : 'fa-arrow-left'}"></i> ${esc(d.backToWars)}
        </button>
      </div>

      <section class="martyr-war-hero">
        <div class="martyr-war-hero-media">
          ${w.cover_image_url ? `<img src="${esc(w.cover_image_url)}" alt="${esc(titleBi.text)}" />` : ''}
          <div class="martyr-war-hero-overlay">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${w.category ? `<span class="martyr-status-tag" style="background: rgba(255,255,255,0.2); color: #FFF;">${esc(fmtCategory(w.category))}</span>` : ''}
            </div>
            <h2 class="${isUr() ? 'martyr-urdu' : ''}">${esc(titleBi.text)}</h2>
            ${shortBi.text ? `<p class="${isUr() ? 'martyr-urdu' : ''}" style="margin: 4px 0 0; font-size: 0.94rem; opacity: 0.94; max-width: 900px;">${esc(shortBi.text)}</p>` : ''}
          </div>
        </div>

        <div class="martyr-war-hero-meta-strip">
          <div class="martyr-war-hero-meta-cell">
            <small>${esc(d.mainLocation)}</small>
            <strong>${esc(locBi.text || '—')}</strong>
          </div>
          <div class="martyr-war-hero-meta-cell">
            <small>${esc(d.startDate)}</small>
            <strong>${esc(fmtDate(w.start_date))}</strong>
          </div>
          <div class="martyr-war-hero-meta-cell">
            <small>${esc(d.endDate)}</small>
            <strong>${w.end_date ? esc(fmtDate(w.end_date)) : esc(d.ongoing)}</strong>
          </div>
          <div class="martyr-war-hero-meta-cell count-cell">
            <small>${esc(d.totalMartyrsLabel)}</small>
            <strong>${Number(w.total_martyrs) || 0}</strong>
          </div>
        </div>

        ${(parentBi.text || tollBi.text || w.reported_injuries) ? `
          <div style="padding: 12px 22px; background: #FFF1F2; border-top: 1px solid #FECDD3; display: flex; flex-wrap: wrap; gap: 18px; align-items: center; font-size: 0.84rem; color: #0F172A;">
            ${parentBi.text ? `
              <div>
                <a href="#" onclick="event.preventDefault(); window.QSFPublicMartyrs.openWarDetail('${esc(w.parent_war_slug || w.parent_war_id)}')" style="color:#881337; font-weight:800;">
                  <i class="fas fa-sitemap"></i> ${esc(parentBi.text)}
                </a>
              </div>
            ` : ''}
            ${tollBi.text ? `
              <div>
                <span style="color:#64748B; font-weight:600;">${esc(d.reportedToll)}:</span>
                <strong style="color:#881337; margin-inline-start:4px;">${esc(tollBi.text)}</strong>
              </div>
            ` : ''}
            ${w.reported_injuries ? `
              <div>
                <span style="color:#64748B; font-weight:600;">${esc(d.reportedInjuries)}:</span>
                <strong style="margin-inline-start:4px;">${esc(w.reported_injuries)}</strong>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </section>

      ${childEpisodes.length > 0 ? `
        <section class="martyr-editorial-section">
          <h3 class="martyr-section-heading">
            <span><i class="fas fa-sitemap"></i> ${esc(d.linkedEpisodes)} (${childEpisodes.length})</span>
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
            ${childEpisodes.map(ep => {
              const epTitle = pickBi(ep.name, ep.name_ur).text;
              const epToll = pickBi(ep.reported_casualties, ep.reported_casualties_ur).text;
              return `
                <div style="padding: 11px 14px; border: 1px solid #E2E8F0; border-radius: 4px; background: #F8FAFC; cursor: pointer;" onclick="window.QSFPublicMartyrs.openWarDetail('${esc(ep.slug || ep.id)}')">
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="font-size: 0.68rem; font-weight: 800; color: #881337;">${esc(fmtCategory(ep.category))}</span>
                    <span style="font-size: 0.72rem; color: #64748B;">${esc(fmtDate(ep.start_date))}</span>
                  </div>
                  <div class="${isUr() ? 'martyr-urdu' : ''}" style="font-weight: 700; color: #0F172A; font-size: 0.88rem; margin-bottom: 4px;">${esc(epTitle)}</div>
                  <div style="font-size: 0.76rem; color: #475569; display: flex; justify-content: space-between;">
                    <span>${esc(epToll || '—')}</span>
                    <strong style="color: #881337;">${Number(ep.total_martyrs) || 0}</strong>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      ${affectedLocs.length > 0 ? `
        <section class="martyr-editorial-section">
          <h3 class="martyr-section-heading">
            <span><i class="fas fa-map-location-dot"></i> ${esc(d.affectedLocations)} (${affectedLocs.length})</span>
            <span style="font-size: 0.74rem; color: #64748B; font-weight: 500;">${esc(d.clickLocationFilter)}</span>
          </h3>
          <div class="martyr-affected-locs-wrap">
            ${affectedLocs.map(al => {
              const alName = isUr() ? (al.name_ur || al.name_en) : al.name_en;
              return `
                <button type="button" class="martyr-affected-loc-chip" onclick="window.QSFPublicMartyrs.filterByWarAndLocation(${w.id}, ${al.id})">
                  <i class="fas fa-location-dot" style="color: #881337;"></i>
                  <span>${esc(alName)}</span>
                  <span class="cnt">${al.martyr_count}</span>
                </button>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      ${reasonBi.text ? `
        <section class="martyr-editorial-section">
          <h3 class="martyr-section-heading">
            <span><i class="fas fa-file-lines"></i> ${esc(d.reasonCause)}</span>
          </h3>
          <div class="martyr-richtext-content ${isUr() && !reasonBi.usedFallback ? 'martyr-urdu' : ''}">
            ${reasonBi.text}
          </div>
        </section>
      ` : ''}

      ${bgBi.text ? `
        <section class="martyr-editorial-section">
          <h3 class="martyr-section-heading">
            <span><i class="fas fa-scroll"></i> ${esc(d.historicalBackground)}</span>
          </h3>
          <div class="martyr-richtext-content ${isUr() && !bgBi.usedFallback ? 'martyr-urdu' : ''}">
            ${bgBi.text}
          </div>
        </section>
      ` : ''}

      ${detBi.text ? `
        <section class="martyr-editorial-section">
          <h3 class="martyr-section-heading">
            <span><i class="fas fa-book-open"></i> ${esc(d.detailedDescription)}</span>
          </h3>
          <div class="martyr-richtext-content ${isUr() && !detBi.usedFallback ? 'martyr-urdu' : ''}">
            ${detBi.text}
          </div>
        </section>
      ` : ''}

      ${ceaseBi.text ? `
        <section class="martyr-editorial-section">
          <h3 class="martyr-section-heading">
            <span><i class="fas fa-handshake"></i> ${esc(d.ceasefireAccord)}</span>
          </h3>
          <div class="martyr-richtext-content ${isUr() && !ceaseBi.usedFallback ? 'martyr-urdu' : ''}">
            ${esc(ceaseBi.text)}
          </div>
        </section>
      ` : ''}

      ${renderPublicSourcesSection(sources)}

      <section class="martyr-editorial-section">
        <h3 class="martyr-section-heading">
          <span><i class="fas fa-monument"></i> ${esc(d.martyrsInConflict)} (${martyrs.length})</span>
        </h3>
        ${martyrs.length === 0 ? `
          <p style="color: #64748B; font-size: 0.88rem; margin: 0;">${esc(d.noMartyrsFound)}</p>
        ` : `
          <div class="martyrs-cards-grid">
            ${martyrs.map(renderPublicMartyrCard).join('')}
          </div>
        `}
      </section>
    `;
  }

  // =========================================================================
  // 4. PUBLIC FILTERS POPUP & LOCATION CONTROLS
  // =========================================================================
  function openFiltersModal() {
    const modal = document.getElementById('publicMartyrFiltersModal');
    const body = document.getElementById('publicMartyrFiltersBody');
    const heading = document.getElementById('pmFiltersModalHeading');
    if (!modal || !body) return;
    const d = dict();
    const f = state.filter;
    if (heading) heading.textContent = d.filters;

    const allNodes = Array.from(state.locationsById.values());
    const tehsils = allNodes.filter(l => l.location_type === 'Tehsil');
    const villages = allNodes.filter(l => ['Town', 'Village', 'Area', 'Locality'].includes(l.location_type));

    body.innerHTML = `
      <form id="pmFiltersPopupForm" novalidate>
        <div class="martyr-form-grid-2" style="margin-bottom: 14px;">
          <div>
            <label class="form-label" for="pmFpSearch">${esc(d.searchMartyrs)}</label>
            <input type="text" id="pmFpSearch" class="form-control" placeholder="${esc(d.searchPlaceholder)}" value="${esc(f.search)}" />
          </div>
          <div>
            <label class="form-label" for="pmFpWar">${esc(d.associatedConflict)}</label>
            <select id="pmFpWar" class="form-control">
              <option value="">${esc(d.allWars)}</option>
              ${state.wars.map(w => `<option value="${w.id}" ${String(f.war_id) === String(w.id) ? 'selected' : ''}>${esc(pickBi(w.name, w.name_ur).text)} (${w.total_martyrs})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="pmFpTehsil">${esc(d.allTehsils)}</label>
            <select id="pmFpTehsil" class="form-control">
              <option value="">${esc(d.allTehsils)}</option>
              ${tehsils.map(t => `<option value="${esc(t.name_en)}" ${f.tehsil === t.name_en ? 'selected' : ''}>${esc(isUr() ? (t.name_ur || t.name_en) : t.name_en)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="pmFpLocationId">${esc(d.homeVillage)} / ${esc(d.placeOfMartyrdom)}</label>
            <select id="pmFpLocationId" class="form-control">
              <option value="">${esc(d.allLocations)}</option>
              ${villages.map(v => `<option value="${v.id}" ${String(f.location_id) === String(v.id) ? 'selected' : ''}>${esc(isUr() ? (v.name_ur || v.name_en) : v.name_en)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="pmFpScope">${esc(d.locationMatchScope)}</label>
            <select id="pmFpScope" class="form-control">
              <option value="residential" ${f.location_scope === 'residential' ? 'selected' : ''}>${esc(d.scopeHome)}</option>
              <option value="martyrdom" ${f.location_scope === 'martyrdom' ? 'selected' : ''}>${esc(d.scopeMartyrdom)}</option>
              <option value="either" ${f.location_scope === 'either' ? 'selected' : ''}>${esc(d.scopeBoth)}</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label class="form-label" for="pmFpDateFrom">${esc(d.dateFrom)}</label>
              <input type="date" id="pmFpDateFrom" class="form-control" value="${esc(f.date_from)}" />
            </div>
            <div>
              <label class="form-label" for="pmFpDateTo">${esc(d.dateTo)}</label>
              <input type="date" id="pmFpDateTo" class="form-control" value="${esc(f.date_to)}" />
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
          <button type="button" class="btn-public-martyr" onclick="window.QSFPublicMartyrs.resetAllFilters()">
            <i class="fas fa-rotate-left"></i> ${esc(d.resetFilters)}
          </button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-public-martyr" onclick="window.QSFPublicMartyrs.closeFiltersModal()">${esc(d.cancel)}</button>
            <button type="submit" class="btn-public-martyr primary">
              <i class="fas fa-check"></i> ${esc(d.applyFilters)}
            </button>
          </div>
        </div>
      </form>
    `;

    modal.classList.remove('hidden');

    document.getElementById('pmFiltersPopupForm').addEventListener('submit', e => {
      e.preventDefault();
      state.filter.search = document.getElementById('pmFpSearch').value.trim();
      state.filter.war_id = document.getElementById('pmFpWar').value;
      state.filter.tehsil = document.getElementById('pmFpTehsil').value;
      state.filter.location_id = document.getElementById('pmFpLocationId').value;
      state.filter.location_scope = document.getElementById('pmFpScope').value;
      state.filter.date_from = document.getElementById('pmFpDateFrom').value;
      state.filter.date_to = document.getElementById('pmFpDateTo').value;
      state.filter.page = 1;
      closeFiltersModal();
      loadAndRenderPublicMartyrsList();
    });
  }

  function closeFiltersModal() {
    const modal = document.getElementById('publicMartyrFiltersModal');
    if (modal) modal.classList.add('hidden');
  }

  function toggleLocNodeExpand(locId) {
    const id = Number(locId);
    if (state.locExpanded.has(id)) state.locExpanded.delete(id);
    else state.locExpanded.add(id);
    const box = document.getElementById('pmLocTreeContainer');
    if (box) {
      box.innerHTML = `
        <div class="martyrs-loc-row ${!state.filter.location_id ? 'active' : ''}" onclick="window.QSFPublicMartyrs.selectLocation('')">
          <span class="martyrs-loc-row-left">
            <i class="fas fa-globe" style="color:#881337; width:14px;"></i>
            <span class="martyrs-loc-name" style="font-weight:700;">${esc(dict().allLocations)}</span>
          </span>
          <span class="martyrs-loc-count ${state.totalTreeMartyrs > 0 ? 'has-records' : ''}">${state.totalTreeMartyrs}</span>
        </div>
        ${renderPublicLocationTreeNodes(state.locationTree, 0)}
      `;
    }
  }

  function toggleLocationsSidebar() {
    state.locSidebarCollapsed = !state.locSidebarCollapsed;
    localStorage.setItem(LOC_COLLAPSED_KEY, state.locSidebarCollapsed ? '1' : '0');
    const sb = document.getElementById('pmLocationsSidebar');
    if (sb) sb.classList.toggle('collapsed', state.locSidebarCollapsed);
  }

  function toggleMobileLocDrawer(open) {
    state.locMobileOpen = Boolean(open);
    const sb = document.getElementById('pmLocationsSidebar');
    const bd = document.getElementById('pmLocMobileBackdrop');
    if (sb) sb.classList.toggle('mobile-open', state.locMobileOpen);
    if (bd) bd.classList.toggle('open', state.locMobileOpen);
  }

  function selectLocation(locId) {
    state.filter.location_id = locId ? String(locId) : '';
    state.filter.page = 1;
    state.locMobileOpen = false;
    loadAndRenderPublicMartyrsList();
  }

  function setLocationScope(scope) {
    if (!['residential', 'martyrdom', 'either'].includes(scope)) return;
    state.filter.location_scope = scope;
    state.filter.page = 1;
    loadAndRenderPublicMartyrsList();
  }

  function filterByWarAndLocation(warId, locId) {
    state.filter = createDefaultFilter();
    state.filter.war_id = String(warId);
    state.filter.location_id = String(locId);
    state.filter.location_scope = 'either';
    state.section = 'martyrs';
    window.history.pushState({}, '', '/martyrs');
    syncHeroTextAndStats();
    loadAndRenderPublicMartyrsList();
  }

  function clearSingleFilter(key) {
    if (key === 'date_range') {
      state.filter.date_from = '';
      state.filter.date_to = '';
    } else if (key in state.filter) {
      state.filter[key] = '';
    }
    state.filter.page = 1;
    loadAndRenderPublicMartyrsList();
  }

  function resetAllFilters() {
    state.filter = createDefaultFilter();
    closeFiltersModal();
    loadAndRenderPublicMartyrsList();
  }

  function goToPage(pageNum) {
    state.filter.page = Math.max(1, Number(pageNum) || 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadAndRenderPublicMartyrsList();
  }

  // =========================================================================
  // 5. LIGHTBOX VIEWER
  // =========================================================================
  function openLightbox(items, startIdx = 0) {
    if (!Array.isArray(items) || !items.length) return;
    state.lightbox.items = items;
    state.lightbox.index = Math.max(0, Math.min(items.length - 1, Number(startIdx) || 0));
    renderLightboxFrame();
    const modal = document.getElementById('publicMartyrLightboxModal');
    if (modal) modal.classList.remove('hidden');
  }

  function renderLightboxFrame() {
    const item = state.lightbox.items[state.lightbox.index];
    if (!item) return;
    const img = document.getElementById('publicMartyrLightboxImg');
    const cap = document.getElementById('publicMartyrLightboxCaption');
    if (img) img.src = item.image_url;
    if (cap) {
      const counter = state.lightbox.items.length > 1 ? `(${state.lightbox.index + 1} / ${state.lightbox.items.length}) ` : '';
      cap.textContent = `${counter}${item.caption || ''}`;
    }
  }

  function stepLightbox(delta) {
    const n = state.lightbox.items.length;
    if (!n) return;
    state.lightbox.index = (state.lightbox.index + delta + n) % n;
    renderLightboxFrame();
  }

  function closeLightbox() {
    const modal = document.getElementById('publicMartyrLightboxModal');
    if (modal) modal.classList.add('hidden');
  }

  // Re-render current view immediately when user switches English <-> Urdu
  window.addEventListener('foundation:languageChanged', () => {
    syncHeroTextAndStats();
    if (!state.locExpandedInit) return;
    if (state.section === 'profile' && state.activeProfileData) {
      renderLoadedPublicProfile();
    } else if (state.section === 'wars') {
      renderPublicWarsList();
    } else if (state.section === 'war-detail' && state.activeWarData) {
      renderLoadedPublicWarDetail();
    } else {
      renderPublicMartyrsView();
    }
  });

  window.addEventListener('popstate', () => {
    handleRouteFromUrl(false);
  });

  document.addEventListener('keydown', e => {
    const lb = document.getElementById('publicMartyrLightboxModal');
    if (lb && !lb.classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
      return;
    }
    if (e.key === 'Escape') {
      closeFiltersModal();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    handleRouteFromUrl(false);
  });

  window.QSFPublicMartyrs = {
    switchSection,
    openProfile,
    openWarDetail,
    openFiltersModal,
    closeFiltersModal,
    toggleLocNodeExpand,
    toggleLocationsSidebar,
    toggleMobileLocDrawer,
    selectLocation,
    setLocationScope,
    filterByWarAndLocation,
    clearSingleFilter,
    resetAllFilters,
    goToPage,
    openLightbox,
    stepLightbox,
    closeLightbox
  };
})();
