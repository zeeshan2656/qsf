/**
 * QSF Martyrs (شہداء) Management & Historical Memorial Archive – Frontend Controller v2.0
 * Features:
 *  - Full-width QSF Dashboard Workspace (no narrow boxed outer container)
 *  - Dedicated Collapsible & Scrollable Locations Sidebar (Pakistan -> KP -> Kurram -> Upper/Lower/Central -> Villages with live DB counts)
 *  - Header Filter Popup with active-filter count badge, Reset, and removable active filter chips
 *  - Dynamic Add New Location modal usable from Sidebar, Add War, and Add Martyr without losing form data
 *  - Upgraded War Form & Detail Page (Category, Reason/Cause + Source, Multiple Affected Locations, Detailed Article, Attribution & Activity History)
 *  - Upgraded Martyr Form & Digital Memorial Profile (Independent Residential, Birth & Martyrdom dependent location pickers, Immutable Creator & Last Updater Attribution, Granular Activity History)
 */
(function () {
  'use strict';

  const API_BASE = '/api/admin/martyrs';
  const RELATIONSHIPS = ['Father', 'Mother', 'Wife', 'Husband', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
  const WAR_CATEGORIES = ['War / Long-term Conflict', 'Conflict Episode', 'Sectarian Clash', 'Targeted Attack', 'Convoy Attack', 'Bombing', 'Other Incident'];
  const LOC_COLLAPSED_KEY = 'qsf_martyrs_loc_sidebar_collapsed';

  const state = {
    summary: {
      can_manage_family: false,
      is_full_admin: false,
      stats: { total_wars: 0, active_wars: 0, completed_wars: 0, archived_wars: 0, total_martyrs: 0, total_locations: 0 }
    },
    locationsFlat: [],
    locationTree: [],
    totalTreeMartyrs: 0,
    locSidebarCollapsed: localStorage.getItem(LOC_COLLAPSED_KEY) === '1',
    locMobileOpen: false,
    locSearchQuery: '',
    locExpanded: new Set(),
    locExpandedInitialized: false,

    warsList: [],
    warsCountries: [],
    warsFilter: { search: '', status: 'all', country: '' },
    warsViewMode: 'list',
    activeWarId: null,

    martyrsList: [],
    martyrsPagination: { total: 0, page: 1, limit: 12, totalPages: 1 },
    martyrsFacets: { countries: [], districts: [], tehsils: [] },
    martyrsFilter: createDefaultMartyrsFilter(),
    martyrsViewMode: 'list',
    activeMartyrId: null,

    formModeIntent: null,
    formState: createEmptyFormState(),
    warModalState: createEmptyWarModalState(),
    locModalCallback: null,
    lightbox: { items: [], index: 0 },
    dupTimer: null
  };

  function createDefaultMartyrsFilter() {
    return {
      search: '',
      father_name: '',
      war_id: '',
      country: '',
      province: '',
      district: '',
      tehsil: '',
      location_id: '',
      location_label: '',
      location_scope: 'residential', // 'residential' | 'martyrdom' | 'either'
      location: '',
      date_of_martyrdom: '',
      date_from: '',
      date_to: '',
      status: 'active',
      sort: 'recent',
      page: 1,
      limit: 12
    };
  }

  function createEmptyFormState(presetWarId = null) {
    return {
      editId: null,
      presetWarId: presetWarId ? Number(presetWarId) : null,
      primaryWarId: presetWarId ? Number(presetWarId) : null,
      additionalWarIds: [],
      profilePhotoUrl: '',
      full_name: '',
      full_name_ur: '',
      father_name: '',
      father_name_ur: '',
      mother_name: '',
      mother_name_ur: '',
      gender: 'male',
      date_of_birth: '',
      date_of_martyrdom: '',
      age_at_death: '',
      // Birth
      birth_location_id: null,
      place_of_birth: '',
      place_of_birth_ur: '',
      // Residential / Home
      residence_location_id: null,
      country_of_residence: 'Pakistan',
      province_state: 'Khyber Pakhtunkhwa',
      district: 'Kurram District',
      residence_tehsil: '',
      city: '',
      city_ur: '',
      residential_address: '',
      // Place of Martyrdom / Death
      martyrdom_location_id: null,
      country: 'Pakistan',
      martyrdom_province: 'Khyber Pakhtunkhwa',
      martyrdom_district: 'Kurram District',
      martyrdom_tehsil: '',
      place_of_martyrdom: '',
      place_of_martyrdom_ur: '',
      // Content
      biography_html: '',
      biography_ur: '',
      biography_dir: 'auto',
      religious_community: 'Not Specified',
      community_source_note: '',
      verification_status: 'verified',
      show_father_name_public: true,
      show_home_location_public: true,
      status: 'published',
      photos: [],
      family_members: [],
      sources: []
    };
  }

  function createEmptyWarModalState() {
    return {
      editId: null,
      cover_image_url: '',
      images: [],
      background_dir: 'auto',
      primary_location_id: null,
      affected_location_ids: [],
      onSaved: null
    };
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isUrdu(text) {
    return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(text || ''));
  }

  function resolveDir(explicitDir, contentText) {
    if (explicitDir === 'rtl' || explicitDir === 'ltr') return explicitDir;
    return isUrdu(contentText) ? 'rtl' : 'ltr';
  }

  function fmtDate(val) {
    if (!val) return '—';
    const s = String(val).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const [y, m, d] = s.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d).padStart(2, '0')} ${months[m - 1] || ''} ${y}`;
  }

  function fmtDateTime(val) {
    if (!val) return '—';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function toInputDate(val) {
    if (!val) return '';
    return String(val).slice(0, 10);
  }

  function computeAge(dob, dom) {
    if (!dob || !dom) return '';
    const b = new Date(dob + 'T00:00:00Z');
    const d = new Date(dom + 'T00:00:00Z');
    if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime()) || d < b) return '';
    let age = d.getUTCFullYear() - b.getUTCFullYear();
    const md = d.getUTCMonth() - b.getUTCMonth();
    if (md < 0 || (md === 0 && d.getUTCDate() < b.getUTCDate())) age--;
    return age >= 0 && age <= 140 ? String(age) : '';
  }

  function notify(msg, type = 'success') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console.log(`[Martyrs ${type}]`, msg);
    }
  }

  async function apiFetch(path, options = {}) {
    const opts = {
      credentials: 'same-origin',
      headers: { ...(options.headers || {}) },
      ...options
    };
    if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(`${API_BASE}${path}`, opts);
    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      data = { success: false, message: `Server returned HTTP ${res.status}` };
    }
    if (!res.ok || data.success === false) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }
    return data;
  }

  async function uploadImageFile(file, folder = 'martyrs') {
    const fd = new FormData();
    fd.append('image', file);
    const data = await apiFetch(`/upload-image?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      body: fd
    });
    return data.url;
  }

  async function refreshSummary() {
    try {
      const data = await apiFetch('/summary');
      state.summary = {
        can_manage_family: Boolean(data.can_manage_family),
        is_full_admin: Boolean(data.is_full_admin),
        stats: data.stats || state.summary.stats
      };
    } catch (err) {
      console.warn('[Martyrs summary]', err.message);
    }
  }

  async function fetchAllWarsForPicker() {
    const data = await apiFetch('/wars?status=all');
    state.warsList = data.wars || [];
    state.warsCountries = data.countries || [];
    return state.warsList;
  }

  async function fetchLocationsFlat() {
    const data = await apiFetch('/locations');
    state.locationsFlat = data.locations || [];
    return state.locationsFlat;
  }

  async function fetchLocationTree() {
    const qs = new URLSearchParams();
    qs.set('location_scope', state.martyrsFilter.location_scope || 'residential');
    if (state.martyrsFilter.war_id) qs.set('war_id', state.martyrsFilter.war_id);
    const data = await apiFetch(`/locations/tree?${qs.toString()}`);
    state.locationTree = data.tree || [];
    state.totalTreeMartyrs = Number(data.total_active_martyrs) || 0;

    if (!state.locExpandedInitialized) {
      const autoExpand = nodes => {
        for (const n of nodes) {
          if (['Country', 'Province'].includes(n.location_type) || n.name_en === 'Kurram District' || n.district === 'Kurram District' && n.location_type === 'Tehsil') {
            state.locExpanded.add(n.id);
          }
          if (n.children && n.children.length) autoExpand(n.children);
        }
      };
      autoExpand(state.locationTree);
      state.locExpandedInitialized = true;
    }
    return state.locationTree;
  }

  function statusBadgeHtml(status) {
    const s = String(status || 'active').toLowerCase();
    const label = s === 'active' ? 'Active' : s === 'completed' ? 'Completed' : s === 'archived' ? 'Archived' : s;
    const icon = s === 'active' ? 'fa-circle-dot' : s === 'completed' ? 'fa-circle-check' : 'fa-box-archive';
    return `<span class="martyr-status-tag ${esc(s)}"><i class="fas ${icon}"></i> ${esc(label)}</span>`;
  }

  function getActiveFilterCount() {
    const f = state.martyrsFilter;
    let count = 0;
    if (f.search) count++;
    if (f.father_name) count++;
    if (f.war_id) count++;
    if (f.location_id) count++;
    if (f.country) count++;
    if (f.province) count++;
    if (f.district) count++;
    if (f.tehsil) count++;
    if (f.location) count++;
    if (f.date_of_martyrdom) count++;
    if (f.date_from || f.date_to) count++;
    if (f.status && f.status !== 'active') count++;
    return count;
  }

  function updateHeaderFilterBadge() {
    const btn = document.getElementById('btnHeaderMartyrsFilter');
    if (!btn) return;
    const cnt = getActiveFilterCount();
    const existing = btn.querySelector('.martyrs-header-filter-badge');
    if (existing) existing.remove();
    if (cnt > 0) {
      const badge = document.createElement('span');
      badge.className = 'martyrs-header-filter-badge';
      badge.id = 'martyrsFilterCountBadge';
      badge.textContent = String(cnt);
      btn.appendChild(badge);
      btn.style.borderColor = '#881337';
      btn.style.color = '#881337';
    } else {
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  }

  function renderAttributionHtml(record) {
    if (!record) return '';
    const creator = record.created_by_name;
    const updater = record.updated_by_name;
    const hasUpdated = Boolean(record.last_updated_at && updater);
    if (!creator && !hasUpdated) return '';
    return `
      <div class="martyr-attribution-bar" data-attribution-bar="1">
        ${creator ? `
          <span class="martyr-attr-tag" data-attr-creator="1">
            <i class="fas fa-user-pen"></i> Added by: <strong>${esc(creator)}</strong>
            ${record.created_at ? `<span style="color:#94A3B8;">(${fmtDateTime(record.created_at)})</span>` : ''}
          </span>
        ` : ''}
        ${hasUpdated ? `
          <span class="martyr-attr-tag" data-attr-updater="1">
            <i class="fas fa-clock-rotate-left"></i> Last updated by: <strong>${esc(updater)}</strong>
            <span style="color:#94A3B8;">(${fmtDateTime(record.last_updated_at)})</span>
          </span>
        ` : ''}
      </div>
    `;
  }

  function renderSourcesSectionHtml(sources, headingLabel = 'Attached Historical Source References') {
    const list = Array.isArray(sources) ? sources : [];
    return `
      <section class="martyr-editorial-section" data-sources-section="1">
        <h3 class="martyr-section-heading">
          <span><i class="fas fa-newspaper"></i> ${esc(headingLabel)} (${list.length})</span>
          <span style="font-size: 0.72rem; color: #64748B; font-weight: 600;">Verified Public Archive Citations</span>
        </h3>
        ${list.length === 0 ? `
          <p style="color: #94A3B8; font-size: 0.85rem; margin: 0;">No external source references attached yet.</p>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${list.map(s => `
              <div class="martyr-source-item" style="padding: 12px 14px; border: 1px solid #E2E8F0; border-left: 3px solid #881337; border-radius: 4px; background: #F8FAFC;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
                  <div style="font-weight: 700; color: #0F172A; font-size: 0.9rem;">
                    ${s.source_url
                      ? `<a href="${esc(s.source_url)}" target="_blank" rel="noopener noreferrer" style="color: #881337; text-decoration: none;">${esc(s.source_title)} <i class="fas fa-arrow-up-right-from-square" style="font-size: 0.72rem; margin-left: 4px;"></i></a>`
                      : esc(s.source_title)
                    }
                  </div>
                  <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    ${s.publisher ? `<span style="background: #E2E8F0; color: #1E293B; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 3px;">${esc(s.publisher)}</span>` : ''}
                    <span class="martyr-status-tag ${s.verification_status === 'confirmed' ? 'completed' : 'active'}" style="font-size: 0.68rem;">${esc(s.verification_status || 'confirmed')}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.76rem; color: #475569; margin-top: 6px;">
                  ${s.publication_date ? `<span><i class="fas fa-calendar-check" style="color:#881337;"></i> Published: <strong>${fmtDate(s.publication_date)}</strong></span>` : ''}
                  ${s.incident_date ? `<span><i class="fas fa-calendar-day" style="color:#881337;"></i> Incident Date: <strong>${fmtDate(s.incident_date)}</strong></span>` : ''}
                  ${s.reported_casualties ? `<span><i class="fas fa-chart-simple" style="color:#881337;"></i> Reported Toll: <strong>${esc(s.reported_casualties)}</strong></span>` : ''}
                </div>
                ${s.source_notes ? `<div style="margin-top: 6px; font-size: 0.8rem; color: #334155; line-height: 1.45;">${esc(s.source_notes)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </section>
    `;
  }

  function renderActivityHistoryHtml(logs) {
    if (!logs || !logs.length) {
      return `<p style="color: #94A3B8; font-size: 0.84rem; margin: 0;">No activity history recorded yet.</p>`;
    }
    const iconFor = act => {
      if (act === 'created') return 'fa-plus';
      if (act === 'war_changed') return 'fa-landmark';
      if (act === 'location_changed') return 'fa-map-location-dot';
      if (act === 'photo_added' || act === 'photo_removed') return 'fa-images';
      if (act === 'family_updated') return 'fa-address-book';
      if (act === 'archived' || act === 'restored') return 'fa-box-archive';
      return 'fa-pen';
    };
    return `
      <div class="martyr-activity-list">
        ${logs.map(l => `
          <div class="martyr-activity-item">
            <div class="martyr-activity-dot"><i class="fas ${iconFor(l.action)}"></i></div>
            <div style="flex:1; min-width:0;">
              <div style="color:#0F172A; font-weight:600;">${esc(l.summary)}</div>
              <div class="martyr-activity-meta">
                By <strong>${esc(l.actor_name || 'System')}</strong>
                ${l.actor_role ? `<span>(${esc(l.actor_role)})</span>` : ''}
                · ${fmtDateTime(l.created_at)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Helper: Dependent Location Selectors Builder (Country -> Province -> District -> Tehsil -> Village/Locality)
  function getGeoOptions(country, province, district, tehsil) {
    const locs = state.locationsFlat || [];
    const countries = Array.from(new Set(locs.map(l => l.country).filter(Boolean))).sort();
    const provinces = Array.from(new Set(locs.filter(l => !country || l.country === country).map(l => l.province).filter(Boolean))).sort();
    const districts = Array.from(new Set(locs.filter(l => (!country || l.country === country) && (!province || l.province === province)).map(l => l.district).filter(Boolean)))
      .sort((a, b) => (a === 'Kurram District' ? -1 : b === 'Kurram District' ? 1 : a.localeCompare(b)));
    const tehsils = Array.from(new Set(locs.filter(l => (!country || l.country === country) && (!province || l.province === province) && (!district || l.district === district)).map(l => l.tehsil).filter(Boolean)))
      .sort((a, b) => {
        const order = { 'Upper Kurram': 1, 'Lower Kurram': 2, 'Central Kurram': 3 };
        return (order[a] || 99) - (order[b] || 99) || a.localeCompare(b);
      });
    const villages = locs.filter(l =>
      ['Town', 'Village', 'Area', 'Locality'].includes(l.location_type)
      && (!country || l.country === country)
      && (!province || l.province === province)
      && (!district || l.district === district)
      && (!tehsil || l.tehsil === tehsil)
    ).sort((a, b) => a.name_en.localeCompare(b.name_en));

    return { countries, provinces, districts, tehsils, villages };
  }

  function wireDependentLocationGroup(prefix, initVals, onVillageSelected) {
    const cEl = document.getElementById(`${prefix}Country`);
    const pEl = document.getElementById(`${prefix}Province`);
    const dEl = document.getElementById(`${prefix}District`);
    const tEl = document.getElementById(`${prefix}Tehsil`);
    const vEl = document.getElementById(`${prefix}VillageId`);
    if (!cEl || !pEl || !dEl || !tEl || !vEl) return () => {};

    const populate = (keepVals = false) => {
      const cVal = keepVals ? (initVals.country || '') : cEl.value;
      const pVal = keepVals ? (initVals.province || '') : pEl.value;
      const dVal = keepVals ? (initVals.district || '') : dEl.value;
      const tVal = keepVals ? (initVals.tehsil || '') : tEl.value;
      const vVal = keepVals ? String(initVals.location_id || '') : vEl.value;

      const { countries, provinces, districts, tehsils, villages } = getGeoOptions(cVal, pVal, dVal, tVal);

      cEl.innerHTML = `<option value="">— Country —</option>`
        + countries.map(x => `<option value="${esc(x)}" ${x === cVal ? 'selected' : ''}>${esc(x)}</option>`).join('');
      if (cVal && !countries.includes(cVal)) cEl.innerHTML += `<option value="${esc(cVal)}" selected>${esc(cVal)}</option>`;

      pEl.innerHTML = `<option value="">— Province —</option>`
        + provinces.map(x => `<option value="${esc(x)}" ${x === pVal ? 'selected' : ''}>${esc(x)}</option>`).join('');
      if (pVal && !provinces.includes(pVal)) pEl.innerHTML += `<option value="${esc(pVal)}" selected>${esc(pVal)}</option>`;

      dEl.innerHTML = `<option value="">— District —</option>`
        + districts.map(x => `<option value="${esc(x)}" ${x === dVal ? 'selected' : ''}>${esc(x)}</option>`).join('');
      if (dVal && !districts.includes(dVal)) dEl.innerHTML += `<option value="${esc(dVal)}" selected>${esc(dVal)}</option>`;

      tEl.innerHTML = `<option value="">— Tehsil / Region —</option>`
        + tehsils.map(x => `<option value="${esc(x)}" ${x === tVal ? 'selected' : ''}>${esc(x)}</option>`).join('');
      if (tVal && !tehsils.includes(tVal)) tEl.innerHTML += `<option value="${esc(tVal)}" selected>${esc(tVal)}</option>`;

      vEl.innerHTML = `<option value="">— Select Village / Locality —</option>`
        + villages.map(v => {
            const label = v.name_ur ? `${v.name_en} (${v.name_ur})` : v.name_en;
            const suffix = !tVal && v.tehsil ? ` · ${v.tehsil}` : '';
            const rev = v.verification_status === 'needs_review' ? ' [Review]' : '';
            return `<option value="${v.id}" ${String(v.id) === vVal ? 'selected' : ''}>${esc(label + suffix + rev)}</option>`;
          }).join('');
    };

    populate(true);

    cEl.addEventListener('change', () => { pEl.value = ''; dEl.value = ''; tEl.value = ''; vEl.value = ''; populate(false); });
    pEl.addEventListener('change', () => { dEl.value = ''; tEl.value = ''; vEl.value = ''; populate(false); });
    dEl.addEventListener('change', () => { tEl.value = ''; vEl.value = ''; populate(false); });
    tEl.addEventListener('change', () => { vEl.value = ''; populate(false); });
    vEl.addEventListener('change', () => {
      const loc = state.locationsFlat.find(x => String(x.id) === String(vEl.value));
      if (loc) {
        if (loc.country) cEl.value = loc.country;
        if (loc.province) pEl.value = loc.province;
        if (loc.district) dEl.value = loc.district;
        if (loc.tehsil) tEl.value = loc.tehsil;
        if (typeof onVillageSelected === 'function') onVillageSelected(loc);
      }
    });

    return (newLoc) => {
      if (newLoc) {
        initVals.country = newLoc.country || cEl.value;
        initVals.province = newLoc.province || pEl.value;
        initVals.district = newLoc.district || dEl.value;
        initVals.tehsil = newLoc.tehsil || tEl.value;
        initVals.location_id = newLoc.id;
        populate(true);
        if (typeof onVillageSelected === 'function') onVillageSelected(newLoc);
      } else {
        populate(false);
      }
    };
  }

  // =========================================================================
  // TAB ROUTER ENTRYPOINT
  // =========================================================================
  async function onTabActivated(tabId) {
    await refreshSummary();
    if (!state.locationsFlat.length) await fetchLocationsFlat();

    if (tabId === 'martyrs-wars') {
      if (state.warsViewMode === 'detail' && state.activeWarId) {
        await renderWarDetail(state.activeWarId);
      } else {
        state.warsViewMode = 'list';
        await loadAndRenderWarsList();
      }
    } else if (tabId === 'martyrs-all') {
      if (state.martyrsViewMode === 'profile' && state.activeMartyrId) {
        await renderMartyrProfile(state.activeMartyrId);
      } else {
        state.martyrsViewMode = 'list';
        await loadAndRenderMartyrsDirectory();
      }
      updateHeaderFilterBadge();
    } else if (tabId === 'martyrs-add') {
      if (!state.formModeIntent) {
        state.formState = createEmptyFormState();
      }
      state.formModeIntent = null;
      await Promise.all([fetchAllWarsForPicker(), fetchLocationsFlat()]);
      renderMartyrForm();
    }
  }

  // =========================================================================
  // 1. WARS ARCHIVE & WAR DETAIL PAGE
  // =========================================================================
  async function loadAndRenderWarsList() {
    const root = document.getElementById('martyrsWarsRoot');
    if (!root) return;
    state.warsViewMode = 'list';
    state.activeWarId = null;

    root.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748B;"><i class="fas fa-circle-notch fa-spin"></i> Loading wars &amp; historical archive...</div>`;

    try {
      const qs = new URLSearchParams();
      if (state.warsFilter.search) qs.set('search', state.warsFilter.search);
      if (state.warsFilter.status && state.warsFilter.status !== 'all') qs.set('status', state.warsFilter.status);
      if (state.warsFilter.country) qs.set('country', state.warsFilter.country);

      const [summaryRes, warsRes] = await Promise.all([
        apiFetch('/summary'),
        apiFetch(`/wars?${qs.toString()}`)
      ]);

      state.summary = {
        can_manage_family: Boolean(summaryRes.can_manage_family),
        is_full_admin: Boolean(summaryRes.is_full_admin),
        stats: summaryRes.stats || state.summary.stats
      };

      const wars = warsRes.wars || [];
      state.warsCountries = warsRes.countries || [];
      if (!state.warsFilter.search && state.warsFilter.status === 'all' && !state.warsFilter.country) {
        state.warsList = wars;
      }

      const st = state.summary.stats;
      root.innerHTML = `
        <div class="martyr-summary-strip">
          <div class="martyr-stat-item">
            <div class="martyr-stat-label">Recorded Wars / Incidents</div>
            <div class="martyr-stat-value">${st.total_wars}</div>
          </div>
          <div class="martyr-stat-item">
            <div class="martyr-stat-label">Active Conflicts</div>
            <div class="martyr-stat-value">${st.active_wars}</div>
          </div>
          <div class="martyr-stat-item">
            <div class="martyr-stat-label">Completed Records</div>
            <div class="martyr-stat-value">${st.completed_wars}</div>
          </div>
          <div class="martyr-stat-item">
            <div class="martyr-stat-label">Total Recorded Martyrs</div>
            <div class="martyr-stat-value" style="color: #881337;">${st.total_martyrs}</div>
          </div>
        </div>

        <div class="martyr-filter-bar">
          <div class="martyr-filter-grid">
            <div class="martyr-filter-field">
              <label for="mwFilterSearch">Search War / Conflict / Location</label>
              <input type="text" id="mwFilterSearch" class="form-control" placeholder="Name, code, district, tehsil..." value="${esc(state.warsFilter.search)}" />
            </div>
            <div class="martyr-filter-field">
              <label for="mwFilterStatus">Status</label>
              <select id="mwFilterStatus" class="form-control">
                <option value="all" ${state.warsFilter.status === 'all' ? 'selected' : ''}>All Statuses</option>
                <option value="active" ${state.warsFilter.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="completed" ${state.warsFilter.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="archived" ${state.warsFilter.status === 'archived' ? 'selected' : ''}>Archived</option>
              </select>
            </div>
            <div class="martyr-filter-field">
              <label for="mwFilterCountry">Country / Region</label>
              <select id="mwFilterCountry" class="form-control">
                <option value="">All Countries</option>
                ${state.warsCountries.map(c => `<option value="${esc(c)}" ${state.warsFilter.country === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
              </select>
            </div>
            <div class="martyr-filter-field" style="display: flex; gap: 8px;">
              <button type="button" class="btn-admin btn-admin-primary" id="btnMwApplyFilter" style="height: 36px; flex: 1;">
                <i class="fas fa-filter"></i> Filter
              </button>
              <button type="button" class="btn-admin btn-admin-secondary" id="btnMwResetFilter" style="height: 36px;">
                Reset
              </button>
            </div>
          </div>
          <div class="martyr-filter-actions">
            <span style="font-size: 0.8rem; color: #64748B;">
              Showing <strong>${wars.length}</strong> war / historical incident record${wars.length === 1 ? '' : 's'} (2007–2026). Martyr totals are calculated automatically from linked profiles.
            </span>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.openImportAuditModal()">
                <i class="fas fa-database"></i> Archive &amp; Demo Data
              </button>
              <button type="button" class="btn-admin btn-admin-primary" onclick="window.QSFMartyrs.openWarModal()">
                <i class="fas fa-plus"></i> Add New War / Incident
              </button>
            </div>
          </div>
        </div>

        ${wars.length === 0 ? `
          <div class="martyr-editorial-section" style="text-align: center; padding: 48px 24px;">
            <i class="fas fa-landmark" style="font-size: 2.2rem; color: #CBD5E1; margin-bottom: 12px;"></i>
            <h3 style="margin: 0 0 6px; color: #334155;">No Wars or Historical Incidents Recorded Yet</h3>
            <p style="margin: 0 0 18px; color: #64748B; font-size: 0.88rem;">Create a war, conflict, operation, or historical incident record to organize martyr memorial profiles.</p>
            <button type="button" class="btn-admin btn-admin-primary" onclick="window.QSFMartyrs.openWarModal()">
              <i class="fas fa-plus"></i> Create First War Record
            </button>
          </div>
        ` : `
          <div class="martyr-wars-grid">
            ${wars.map(renderWarCard).join('')}
          </div>
        `}
      `;

      document.getElementById('btnMwApplyFilter').addEventListener('click', () => {
        state.warsFilter.search = document.getElementById('mwFilterSearch').value.trim();
        state.warsFilter.status = document.getElementById('mwFilterStatus').value;
        state.warsFilter.country = document.getElementById('mwFilterCountry').value;
        loadAndRenderWarsList();
      });

      document.getElementById('mwFilterSearch').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btnMwApplyFilter').click();
      });

      document.getElementById('btnMwResetFilter').addEventListener('click', () => {
        state.warsFilter = { search: '', status: 'all', country: '' };
        loadAndRenderWarsList();
      });
    } catch (err) {
      root.innerHTML = `<div class="martyr-editorial-section" style="color: #991B1B;">Error loading wars archive: ${esc(err.message)}</div>`;
    }
  }

  function renderWarCard(w) {
    const urduTitle = isUrdu(w.name);
    const urduDesc = isUrdu(w.short_description);
    const locParts = [w.location, w.tehsil, w.district, w.country].filter((v, i, arr) => v && arr.indexOf(v) === i);
    const locText = locParts.join(', ') || 'Location not specified';
    const dateRange = w.start_date
      ? `${fmtDate(w.start_date)} – ${w.end_date ? fmtDate(w.end_date) : (w.status === 'active' ? 'Ongoing' : '—')}`
      : 'Dates not specified';
    const affCount = Array.isArray(w.affected_locations) ? w.affected_locations.length : 0;

    return `
      <article class="martyr-war-card" data-war-id="${w.id}">
        <div class="martyr-war-cover" onclick="window.QSFMartyrs.openWarDetail(${w.id})">
          ${w.cover_image_url
            ? `<img src="${esc(w.cover_image_url)}" alt="${esc(w.name)}" loading="lazy" />`
            : `<div class="martyr-war-cover-placeholder"><i class="fas fa-landmark" style="font-size: 2rem;"></i><span style="font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase;">Historical Archive</span></div>`
          }
          <div style="position: absolute; top: 10px; left: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
            ${statusBadgeHtml(w.status)}
            ${w.category ? `<span class="martyr-status-tag" style="background: rgba(15,23,42,0.78); color:#FFF;">${esc(w.category)}</span>` : ''}
          </div>
          <div class="martyr-war-count-chip" data-war-martyr-count="${w.id}">
            <i class="fas fa-users" style="margin-right: 4px;"></i> Total Martyrs: ${Number(w.total_martyrs) || 0}
          </div>
        </div>
        <div class="martyr-war-card-body">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom: 3px;">
            ${w.reference_code ? `<div style="font-size: 0.7rem; font-weight: 700; color: #64748B; letter-spacing: 0.05em;">REF: ${esc(w.reference_code)}</div>` : '<span></span>'}
            ${Number(w.source_count) > 0 ? `<span style="font-size: 0.68rem; font-weight: 700; color: #166534; background: #DCFCE7; padding: 1px 6px; border-radius: 3px;"><i class="fas fa-newspaper"></i> ${w.source_count} source${Number(w.source_count) === 1 ? '' : 's'}</span>` : ''}
          </div>
          <h3 class="martyr-war-card-title ${urduTitle ? 'martyr-urdu' : ''}" dir="${urduTitle ? 'rtl' : 'ltr'}" onclick="window.QSFMartyrs.openWarDetail(${w.id})">${esc(w.name)}</h3>
          ${w.parent_war_name ? `
            <div style="font-size: 0.72rem; color: #881337; font-weight: 700; margin-bottom: 5px; cursor: pointer;" onclick="window.QSFMartyrs.openWarDetail(${w.parent_war_id})">
              <i class="fas fa-sitemap"></i> Part of: ${esc(w.parent_war_name)}
            </div>
          ` : ''}
          <div class="martyr-war-meta">
            <span><i class="fas fa-location-dot"></i> ${esc(locText)}</span>
            ${affCount > 1 ? `<span><i class="fas fa-map-pin"></i> ${affCount} affected locations</span>` : ''}
            <span><i class="fas fa-calendar-days"></i> ${esc(dateRange)}</span>
            ${w.reported_casualties ? `<span><i class="fas fa-chart-simple"></i> Toll: ${esc(w.reported_casualties)}</span>` : `<span><i class="fas fa-clock"></i> ${esc(w.duration_label || '—')}</span>`}
          </div>
          <p class="martyr-war-desc ${urduDesc ? 'martyr-urdu' : ''}" dir="${urduDesc ? 'rtl' : 'ltr'}">
            ${w.short_description ? esc(w.short_description.slice(0, 180)) + (w.short_description.length > 180 ? '…' : '') : '<span style="color:#94A3B8;">No summary provided.</span>'}
          </p>
          <div class="martyr-war-card-footer">
            <button type="button" class="btn-admin btn-admin-primary" style="padding: 6px 12px; font-size: 0.78rem;" onclick="window.QSFMartyrs.openWarDetail(${w.id})">
              <i class="fas fa-book-open"></i> Open Archive
            </button>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-admin btn-admin-secondary" style="padding: 5px 10px; font-size: 0.76rem;" title="Edit War" onclick="window.QSFMartyrs.openWarModal(${w.id})">
                <i class="fas fa-pen"></i>
              </button>
              <button type="button" class="btn-admin btn-admin-secondary" style="padding: 5px 10px; font-size: 0.76rem;" title="${w.status === 'archived' ? 'Restore to Active' : 'Archive War'}" onclick="window.QSFMartyrs.toggleWarArchive(${w.id}, '${w.status === 'archived' ? 'active' : 'archived'}')">
                <i class="fas ${w.status === 'archived' ? 'fa-rotate-left' : 'fa-box-archive'}"></i>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  async function openWarDetail(warId) {
    state.warsViewMode = 'detail';
    state.activeWarId = Number(warId);
    const activeTab = document.querySelector('#tab-martyrs-wars.active');
    if (!activeTab && typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('martyrs-wars');
      return;
    }
    await renderWarDetail(state.activeWarId);
  }

  async function renderWarDetail(warId) {
    const root = document.getElementById('martyrsWarsRoot');
    if (!root) return;
    root.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748B;"><i class="fas fa-circle-notch fa-spin"></i> Loading war memorial archive...</div>`;

    try {
      const data = await apiFetch(`/wars/${warId}`);
      const w = data.war;
      const images = data.images || [];
      const affectedLocs = data.affected_locations || [];
      const childEpisodes = data.child_episodes || [];
      const sources = data.sources || [];
      const martyrs = data.martyrs || [];
      const activityLogs = data.activity_logs || [];
      const urduTitle = isUrdu(w.name);
      const bgDir = resolveDir(w.background_dir, w.historical_background || w.detailed_article || '');
      const locText = [w.location, w.tehsil, w.district, w.province, w.country].filter((v, i, a) => v && a.indexOf(v) === i).join(', ') || 'Not specified';

      const allWarImages = [];
      if (w.cover_image_url) allWarImages.push({ image_url: w.cover_image_url, caption: `${w.name} — Cover Photograph` });
      images.forEach(img => allWarImages.push({ image_url: img.image_url, caption: img.caption || w.name }));
      window.__qsfCurrentWarImages = allWarImages;

      root.innerHTML = `
        <div class="martyr-page-topbar">
          <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.backToWarsList()">
            <i class="fas fa-arrow-left"></i> Back to Wars Archive
          </button>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <button type="button" class="btn-admin btn-admin-primary" onclick="window.QSFMartyrs.openAddMartyrForm(${w.id})">
              <i class="fas fa-user-plus"></i> Add Martyr to This War
            </button>
            <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.openWarModal(${w.id})">
              <i class="fas fa-pen"></i> Edit War Details
            </button>
            <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.toggleWarArchive(${w.id}, '${w.status === 'archived' ? 'active' : 'archived'}')">
              <i class="fas ${w.status === 'archived' ? 'fa-rotate-left' : 'fa-box-archive'}"></i> ${w.status === 'archived' ? 'Restore' : 'Archive'}
            </button>
            ${state.summary.is_full_admin && Number(w.total_martyrs) === 0 ? `
              <button type="button" class="btn-admin btn-admin-danger" onclick="window.QSFMartyrs.permanentDeleteWar(${w.id}, '${esc(w.name)}')">
                <i class="fas fa-trash"></i> Permanent Delete
              </button>
            ` : ''}
          </div>
        </div>

        <section class="martyr-war-hero">
          <div class="martyr-war-hero-media">
            ${w.cover_image_url ? `<img src="${esc(w.cover_image_url)}" alt="${esc(w.name)}" />` : ''}
            <div class="martyr-war-hero-overlay">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ${statusBadgeHtml(w.status)}
                ${w.category ? `<span class="martyr-status-tag" style="background: rgba(255,255,255,0.18); color: #FFF; border-color: rgba(255,255,255,0.3);">${esc(w.category)}</span>` : ''}
                ${w.reference_code ? `<span style="font-size: 0.74rem; font-weight: 700; letter-spacing: 0.06em; opacity: 0.85;">REF: ${esc(w.reference_code)}</span>` : ''}
              </div>
              <h2 class="${urduTitle ? 'martyr-urdu' : ''}" dir="${urduTitle ? 'rtl' : 'ltr'}">${esc(w.name)}</h2>
              ${w.short_description ? `<p class="${isUrdu(w.short_description) ? 'martyr-urdu' : ''}" dir="${isUrdu(w.short_description) ? 'rtl' : 'ltr'}" style="margin: 4px 0 0; font-size: 0.92rem; opacity: 0.92; max-width: 900px;">${esc(w.short_description)}</p>` : ''}
            </div>
          </div>
          <div class="martyr-war-hero-meta-strip">
            <div class="martyr-war-hero-meta-cell">
              <small>Main Location</small>
              <strong>${esc(locText)}</strong>
            </div>
            <div class="martyr-war-hero-meta-cell">
              <small>Start Date</small>
              <strong>${fmtDate(w.start_date)}</strong>
            </div>
            <div class="martyr-war-hero-meta-cell">
              <small>End Date</small>
              <strong>${w.end_date ? fmtDate(w.end_date) : (w.status === 'active' ? 'Ongoing' : '—')}</strong>
            </div>
            <div class="martyr-war-hero-meta-cell">
              <small>Duration</small>
              <strong>${esc(w.duration_label || '—')}</strong>
            </div>
            <div class="martyr-war-hero-meta-cell count-cell">
              <small>Linked Profiles (Auto)</small>
              <strong id="warDetailTotalMartyrs">${Number(w.total_martyrs) || 0}</strong>
            </div>
          </div>
          ${(w.parent_war_name || w.reported_casualties || w.reported_injuries) ? `
            <div style="padding: 12px 22px; background: #FFF1F2; border-top: 1px solid #FECDD3; display: flex; flex-wrap: wrap; gap: 18px; align-items: center; font-size: 0.82rem; color: #0F172A;">
              ${w.parent_war_name ? `
                <div>
                  <span style="color:#64748B; font-weight:600;">Parent Conflict:</span>
                  <a href="#" onclick="event.preventDefault(); window.QSFMartyrs.openWarDetail(${w.parent_war_id})" style="color:#881337; font-weight:800; margin-left:4px;">
                    <i class="fas fa-sitemap"></i> ${esc(w.parent_war_name)}
                  </a>
                </div>
              ` : ''}
              ${w.reported_casualties ? `
                <div>
                  <span style="color:#64748B; font-weight:600;">Reported Casualties:</span>
                  <strong style="color:#881337; margin-left:4px;">${esc(w.reported_casualties)}</strong>
                  <span class="martyr-status-tag ${w.casualty_status === 'confirmed' ? 'completed' : 'active'}" style="margin-left:5px; font-size:0.68rem;">${esc(w.casualty_status || 'confirmed')}</span>
                </div>
              ` : ''}
              ${w.reported_injuries ? `
                <div>
                  <span style="color:#64748B; font-weight:600;">Reported Injuries:</span>
                  <strong style="margin-left:4px;">${esc(w.reported_injuries)}</strong>
                </div>
              ` : ''}
            </div>
          ` : ''}
          ${w.casualty_notes ? `
            <div style="padding: 8px 22px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 0.78rem; color: #475569;">
              <i class="fas fa-scale-balanced" style="color:#881337; margin-right:5px;"></i>
              <strong>Casualty Verification &amp; Source Comparison:</strong> ${esc(w.casualty_notes)}
            </div>
          ` : ''}
          <div style="padding: 10px 22px 14px;">${renderAttributionHtml(w)}</div>
        </section>

        ${childEpisodes.length > 0 ? `
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-sitemap"></i> Linked Conflict Episodes &amp; Major Incidents (${childEpisodes.length})</span>
              <span style="font-size: 0.74rem; color: #64748B; font-weight: 500;">Chronological episodes recorded under this conflict</span>
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
              ${childEpisodes.map(ep => `
                <div style="padding: 11px 14px; border: 1px solid #E2E8F0; border-radius: 4px; background: #F8FAFC; cursor: pointer;" onclick="window.QSFMartyrs.openWarDetail(${ep.id})">
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="font-size: 0.68rem; font-weight: 800; color: #881337; text-transform: uppercase;">${esc(ep.category || 'Episode')}</span>
                    <span style="font-size: 0.72rem; color: #64748B;">${fmtDate(ep.start_date)}</span>
                  </div>
                  <div style="font-weight: 700; color: #0F172A; font-size: 0.88rem; margin-bottom: 4px;">${esc(ep.name)}</div>
                  <div style="font-size: 0.76rem; color: #475569; display: flex; justify-content: space-between;">
                    <span>${esc(ep.reported_casualties || '—')}</span>
                    <strong style="color: #881337;">${Number(ep.total_martyrs) || 0} profiles</strong>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        ` : ''}

        ${affectedLocs.length > 0 ? `
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-map-location-dot"></i> Affected Locations (${affectedLocs.length})</span>
              <span style="font-size: 0.74rem; color: #64748B; font-weight: 500;">Click any location to filter martyrs from that area in this war</span>
            </h3>
            <div class="martyr-affected-locs-wrap">
              ${affectedLocs.map(al => `
                <button type="button" class="martyr-affected-loc-chip" onclick="window.QSFMartyrs.filterByWarAndLocation(${w.id}, ${al.id}, '${esc(al.name_en)}')">
                  <i class="fas fa-location-dot" style="color: #881337;"></i>
                  <span>${esc(al.name_en)}${al.tehsil && al.tehsil !== al.name_en ? ` <small style="font-weight:500; color:#64748B;">(${esc(al.tehsil)})</small>` : ''}</span>
                  <span class="cnt">${al.martyr_count}</span>
                </button>
              `).join('')}
            </div>
          </section>
        ` : ''}

        ${w.reason_cause ? `
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-file-lines"></i> Reason / Cause of Conflict</span>
              ${w.reason_source ? `<span style="font-size: 0.74rem; color: #64748B; font-weight: 600;">Source: ${esc(w.reason_source)}</span>` : ''}
            </h3>
            <div class="martyr-richtext-content ${isUrdu(w.reason_cause) ? 'martyr-urdu' : ''}" dir="${isUrdu(w.reason_cause) ? 'rtl' : 'ltr'}">
              ${w.reason_cause}
            </div>
          </section>
        ` : ''}

        ${w.historical_background ? `
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-scroll"></i> Historical Background</span>
              <span style="font-size: 0.72rem; color: #64748B; font-weight: 600;">${bgDir === 'rtl' ? 'Urdu / RTL' : 'English / LTR'}</span>
            </h3>
            <div class="martyr-richtext-content ${bgDir === 'rtl' ? 'martyr-urdu' : ''}" dir="${bgDir}">
              ${w.historical_background}
            </div>
          </section>
        ` : ''}

        ${w.detailed_article ? `
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-book-open"></i> Detailed Description / Historical Article</span>
            </h3>
            <div class="martyr-richtext-content ${isUrdu(w.detailed_article) ? 'martyr-urdu' : ''}" dir="${isUrdu(w.detailed_article) ? 'rtl' : 'ltr'}">
              ${w.detailed_article}
            </div>
          </section>
        ` : ''}

        ${w.ceasefire_info ? `
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-handshake"></i> Ceasefire / Jirga / Peace Agreement Record</span>
            </h3>
            <div class="martyr-richtext-content" style="font-size: 0.88rem; color: #1E293B; line-height: 1.55;">
              ${esc(w.ceasefire_info)}
            </div>
          </section>
        ` : ''}

        ${renderSourcesSectionHtml(sources, 'Historical Source Citations & News Reports')}

        ${images.length > 0 ? `
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading">
              <span><i class="fas fa-images"></i> Historical Photographs (${images.length})</span>
            </h3>
            <div class="martyr-gallery-grid">
              ${images.map((img, idx) => `
                <figure class="martyr-gallery-tile" style="margin: 0;" onclick="window.QSFMartyrs.openLightbox(window.__qsfCurrentWarImages, ${w.cover_image_url ? idx + 1 : idx})">
                  <img src="${esc(img.image_url)}" alt="${esc(img.caption || w.name)}" loading="lazy" />
                  ${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}
                </figure>
              `).join('')}
            </div>
          </section>
        ` : ''}

        <section class="martyr-editorial-section">
          <h3 class="martyr-section-heading">
            <span><i class="fas fa-monument"></i> Martyrs Recorded in This War (${martyrs.length})</span>
            <button type="button" class="btn-admin btn-admin-primary" style="padding: 5px 12px; font-size: 0.78rem;" onclick="window.QSFMartyrs.openAddMartyrForm(${w.id})">
              <i class="fas fa-plus"></i> Add Martyr
            </button>
          </h3>
          ${martyrs.length === 0 ? `
            <p style="color: #64748B; font-size: 0.88rem; margin: 6px 0 0;">No martyrs have been linked to this war yet.</p>
          ` : `
            <div class="martyrs-cards-grid">
              ${martyrs.map(m => renderMartyrCard(m, false)).join('')}
            </div>
          `}
        </section>

        ${activityLogs.length > 0 ? `
          <section class="martyr-editorial-section">
            <h3 class="martyr-section-heading"><span><i class="fas fa-clock-rotate-left"></i> Record Activity History</span></h3>
            ${renderActivityHistoryHtml(activityLogs)}
          </section>
        ` : ''}
      `;
    } catch (err) {
      root.innerHTML = `
        <div class="martyr-editorial-section" style="color: #991B1B;">
          <p>Failed to load war detail: ${esc(err.message)}</p>
          <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.backToWarsList()">Back to Wars</button>
        </div>
      `;
    }
  }

  function filterByWarAndLocation(warId, locationId, locationLabel) {
    state.martyrsFilter = createDefaultMartyrsFilter();
    state.martyrsFilter.war_id = String(warId);
    state.martyrsFilter.location_id = String(locationId);
    state.martyrsFilter.location_label = locationLabel || '';
    state.martyrsFilter.location_scope = 'either';
    state.martyrsViewMode = 'list';
    state.activeMartyrId = null;
    if (typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('martyrs-all');
    } else {
      loadAndRenderMartyrsDirectory();
    }
  }

  function backToWarsList() {
    state.warsViewMode = 'list';
    state.activeWarId = null;
    loadAndRenderWarsList();
  }

  async function toggleWarArchive(warId, targetStatus) {
    try {
      await apiFetch(`/wars/${warId}/status`, { method: 'PATCH', body: { status: targetStatus } });
      notify(`War status updated to ${targetStatus}.`, 'success');
      if (state.warsViewMode === 'detail' && state.activeWarId === Number(warId)) {
        await renderWarDetail(warId);
      } else {
        await loadAndRenderWarsList();
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function permanentDeleteWar(warId, warName) {
    if (!window.confirm(`Permanently delete war "${warName}"? This cannot be undone and only works when zero martyrs are linked.`)) return;
    try {
      await apiFetch(`/wars/${warId}?permanent=true`, { method: 'DELETE' });
      notify('War record permanently deleted.', 'success');
      await loadAndRenderWarsList();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // =========================================================================
  // 2. ALL MARTYRS FULL-WIDTH WORKSPACE + DEDICATED LOCATIONS SIDEBAR
  // =========================================================================
  async function loadAndRenderMartyrsDirectory() {
    const root = document.getElementById('martyrsAllRoot');
    if (!root) return;
    state.martyrsViewMode = 'list';
    state.activeMartyrId = null;

    const f = state.martyrsFilter;
    const qs = new URLSearchParams();
    if (f.search) qs.set('search', f.search);
    if (f.father_name) qs.set('father_name', f.father_name);
    if (f.war_id) qs.set('war_id', f.war_id);
    if (f.country) qs.set('country', f.country);
    if (f.province) qs.set('province', f.province);
    if (f.district) qs.set('district', f.district);
    if (f.tehsil) qs.set('tehsil', f.tehsil);
    if (f.location_id) qs.set('location_id', f.location_id);
    if (f.location_scope) qs.set('location_scope', f.location_scope);
    if (f.location) qs.set('location', f.location);
    if (f.date_of_martyrdom) qs.set('date_of_martyrdom', f.date_of_martyrdom);
    if (f.date_from) qs.set('date_from', f.date_from);
    if (f.date_to) qs.set('date_to', f.date_to);
    qs.set('status', f.status || 'active');
    qs.set('sort', f.sort || 'recent');
    qs.set('page', String(f.page || 1));
    qs.set('limit', String(f.limit || 12));

    try {
      const [warsList, locsFlat, tree, listRes] = await Promise.all([
        fetchAllWarsForPicker(),
        fetchLocationsFlat(),
        fetchLocationTree(),
        apiFetch(`/list?${qs.toString()}`)
      ]);

      const martyrs = listRes.martyrs || [];
      const pg = listRes.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 };
      state.martyrsList = martyrs;
      state.martyrsPagination = pg;
      state.martyrsFacets = listRes.facets || { countries: [], districts: [], tehsils: [] };

      const startIdx = pg.total === 0 ? 0 : (pg.page - 1) * pg.limit + 1;
      const endIdx = Math.min(pg.total, pg.page * pg.limit);
      const activeChips = buildActiveFilterChips();
      const scopeLabel = f.location_scope === 'martyrdom' ? 'Place of Martyrdom' : f.location_scope === 'either' ? 'Home or Martyrdom' : 'Residential Home';

      root.innerHTML = `
        <div class="martyrs-loc-mobile-backdrop ${state.locMobileOpen ? 'open' : ''}" id="martyrsLocMobileBackdrop" onclick="window.QSFMartyrs.toggleMobileLocDrawer(false)"></div>

        <div class="martyrs-workspace-split">
          <!-- DEDICATED LOCATIONS SIDEBAR -->
          <aside class="martyrs-locations-sidebar ${state.locSidebarCollapsed ? 'collapsed' : ''} ${state.locMobileOpen ? 'mobile-open' : ''}" id="martyrsLocationsSidebar" aria-label="Locations Hierarchy">
            <div class="martyrs-loc-header">
              <div class="martyrs-loc-header-title">
                <i class="fas fa-map-location-dot"></i>
                <span>Locations</span>
              </div>
              <button type="button" class="martyrs-loc-toggle-btn" id="btnToggleLocSidebar"
                title="${state.locSidebarCollapsed ? 'Expand Locations Sidebar' : 'Collapse Locations Sidebar'}"
                onclick="window.QSFMartyrs.toggleLocationsSidebar()">
                <i class="fas ${state.locSidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left'}"></i>
              </button>
            </div>

            <div class="martyrs-loc-body">
              <div class="martyrs-loc-controls">
                <input type="text" id="martyrsLocSearchInput" class="martyrs-loc-search"
                  placeholder="Find village, tehsil, district..."
                  value="${esc(state.locSearchQuery)}" />
                <div class="martyrs-loc-scope-tabs" title="Filter location counts by Residential Home vs Place of Martyrdom">
                  <button type="button" class="martyrs-loc-scope-btn ${f.location_scope === 'residential' ? 'active' : ''}" onclick="window.QSFMartyrs.setLocationScope('residential')">Home</button>
                  <button type="button" class="martyrs-loc-scope-btn ${f.location_scope === 'martyrdom' ? 'active' : ''}" onclick="window.QSFMartyrs.setLocationScope('martyrdom')">Martyrdom</button>
                  <button type="button" class="martyrs-loc-scope-btn ${f.location_scope === 'either' ? 'active' : ''}" onclick="window.QSFMartyrs.setLocationScope('either')">Both</button>
                </div>
              </div>

              <div class="martyrs-loc-tree-scroll" id="martyrsLocTreeContainer">
                <div class="martyrs-loc-row ${!f.location_id ? 'active' : ''}" onclick="window.QSFMartyrs.selectSidebarLocation('', '')">
                  <span class="martyrs-loc-row-left">
                    <i class="fas fa-globe" style="color:#881337; width:14px;"></i>
                    <span class="martyrs-loc-name" style="font-weight:700;">All Locations</span>
                  </span>
                  <span class="martyrs-loc-count ${state.totalTreeMartyrs > 0 ? 'has-records' : ''}">${state.totalTreeMartyrs}</span>
                </div>
                ${renderLocationTreeNodes(state.locationTree, 0)}
              </div>

              <div class="martyrs-loc-footer">
                <button type="button" class="btn-admin btn-admin-secondary" style="flex:1; justify-content:center; padding:5px 8px; font-size:0.74rem;" onclick="window.QSFMartyrs.openLocationModal()">
                  <i class="fas fa-plus"></i> Add Location
                </button>
                ${f.location_id ? `
                  <button type="button" class="btn-admin btn-admin-danger" style="padding:5px 9px; font-size:0.74rem;" onclick="window.QSFMartyrs.selectSidebarLocation('', '')" title="Clear location filter">
                    Clear
                  </button>
                ` : ''}
              </div>
            </div>
          </aside>

          <!-- FULL-WIDTH MAIN MARTYRS LISTING AREA (NO BOXED OUTER CONTAINER) -->
          <div class="martyrs-workspace-main">
            <div class="martyrs-directory-toolbar">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="btn-admin btn-admin-secondary martyrs-mobile-loc-btn" style="padding: 5px 10px; font-size: 0.78rem;" onclick="window.QSFMartyrs.toggleMobileLocDrawer(true)">
                  <i class="fas fa-map-location-dot"></i> Locations
                </button>
                <span style="font-size: 0.86rem; color: #334155;">
                  Showing <strong>${startIdx}–${endIdx}</strong> of <strong>${pg.total}</strong> martyr record${pg.total === 1 ? '' : 's'}
                  ${f.location_label ? ` in <strong style="color:#881337;">${esc(f.location_label)}</strong> <span style="font-size:0.76rem; color:#64748B;">(${scopeLabel})</span>` : ''}
                </span>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <select id="mdQuickSort" class="form-control" style="width: auto; height: 32px; padding: 2px 10px; font-size: 0.78rem;">
                  <option value="recent" ${f.sort === 'recent' ? 'selected' : ''}>Sort: Recently Added</option>
                  <option value="martyrdom_desc" ${f.sort === 'martyrdom_desc' ? 'selected' : ''}>Martyrdom Date (Newest)</option>
                  <option value="martyrdom_asc" ${f.sort === 'martyrdom_asc' ? 'selected' : ''}>Martyrdom Date (Oldest)</option>
                  <option value="name_asc" ${f.sort === 'name_asc' ? 'selected' : ''}>Name (A → Z)</option>
                  <option value="name_desc" ${f.sort === 'name_desc' ? 'selected' : ''}>Name (Z → A)</option>
                </select>
                <button type="button" class="btn-admin btn-admin-secondary" style="height: 32px; padding: 0 11px; font-size: 0.78rem;" onclick="window.QSFMartyrs.openImportAuditModal()" title="Historical Archive & Demo Data Controls">
                  <i class="fas fa-database"></i> Archive &amp; Demo Data
                </button>
                <button type="button" class="btn-admin btn-admin-secondary" style="height: 32px; padding: 0 11px; font-size: 0.78rem;" onclick="window.QSFMartyrs.openFiltersModal()">
                  <i class="fas fa-sliders"></i> Filters ${getActiveFilterCount() > 0 ? `(${getActiveFilterCount()})` : ''}
                </button>
              </div>
            </div>

            ${activeChips.length ? `
              <div class="martyrs-active-chips">
                ${activeChips.map(ch => `
                  <span class="martyrs-active-chip">
                    ${esc(ch.label)}
                    <button type="button" onclick="window.QSFMartyrs.clearSingleFilter('${esc(ch.key)}')" aria-label="Remove filter">&times;</button>
                  </span>
                `).join('')}
                <button type="button" class="btn-admin btn-admin-secondary" style="padding: 2px 9px; font-size: 0.74rem; height: 24px;" onclick="window.QSFMartyrs.resetAllMartyrsFilters()">
                  Reset All
                </button>
              </div>
            ` : ''}

            ${martyrs.length === 0 ? `
              <div class="martyr-editorial-section" style="text-align: center; padding: 48px 24px;">
                <i class="fas fa-monument" style="font-size: 2.2rem; color: #CBD5E1; margin-bottom: 12px;"></i>
                <h3 style="margin: 0 0 6px; color: #334155;">No Martyr Profiles Match Current Selection</h3>
                <p style="margin: 0 0 18px; color: #64748B; font-size: 0.88rem;">Adjust your location or header filters, or add a new martyr memorial profile.</p>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                  ${getActiveFilterCount() > 0 ? `<button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.resetAllMartyrsFilters()">Reset Filters</button>` : ''}
                  <button type="button" class="btn-admin btn-admin-primary" onclick="window.QSFMartyrs.openAddMartyrForm()">
                    <i class="fas fa-user-plus"></i> Add New Martyr
                  </button>
                </div>
              </div>
            ` : `
              <div class="martyrs-cards-grid">
                ${martyrs.map(m => renderMartyrCard(m, true)).join('')}
              </div>
              ${renderPaginationBar(pg)}
            `}
          </div>
        </div>
      `;

      // Wire sidebar search & quick sort
      const locSearchEl = document.getElementById('martyrsLocSearchInput');
      if (locSearchEl) {
        locSearchEl.addEventListener('input', () => {
          state.locSearchQuery = locSearchEl.value;
          const treeBox = document.getElementById('martyrsLocTreeContainer');
          if (treeBox) {
            treeBox.innerHTML = `
              <div class="martyrs-loc-row ${!state.martyrsFilter.location_id ? 'active' : ''}" onclick="window.QSFMartyrs.selectSidebarLocation('', '')">
                <span class="martyrs-loc-row-left">
                  <i class="fas fa-globe" style="color:#881337; width:14px;"></i>
                  <span class="martyrs-loc-name" style="font-weight:700;">All Locations</span>
                </span>
                <span class="martyrs-loc-count ${state.totalTreeMartyrs > 0 ? 'has-records' : ''}">${state.totalTreeMartyrs}</span>
              </div>
              ${renderLocationTreeNodes(state.locationTree, 0)}
            `;
          }
        });
      }

      const quickSort = document.getElementById('mdQuickSort');
      if (quickSort) {
        quickSort.addEventListener('change', () => {
          state.martyrsFilter.sort = quickSort.value;
          state.martyrsFilter.page = 1;
          loadAndRenderMartyrsDirectory();
        });
      }

      const limitSel = document.getElementById('mdPageLimitSelect');
      if (limitSel) {
        limitSel.addEventListener('change', () => {
          state.martyrsFilter.limit = Number(limitSel.value) || 12;
          state.martyrsFilter.page = 1;
          loadAndRenderMartyrsDirectory();
        });
      }

      updateHeaderFilterBadge();
    } catch (err) {
      root.innerHTML = `<div class="martyr-editorial-section" style="color: #991B1B;">Error loading martyrs directory: ${esc(err.message)}</div>`;
    }
  }

  function renderLocationTreeNodes(nodes, depth) {
    if (!nodes || !nodes.length) return '';
    const q = String(state.locSearchQuery || '').trim().toLowerCase();
    const activeId = String(state.martyrsFilter.location_id || '');

    const matchesOrHasMatch = node => {
      if (!q) return true;
      const selfHit = (node.name_en || '').toLowerCase().includes(q)
        || (node.name_ur || '').toLowerCase().includes(q)
        || (node.alt_names || '').toLowerCase().includes(q)
        || (node.tehsil || '').toLowerCase().includes(q)
        || (node.district || '').toLowerCase().includes(q);
      if (selfHit) return true;
      return (node.children || []).some(matchesOrHasMatch);
    };

    return nodes.filter(matchesOrHasMatch).map(node => {
      const hasKids = node.children && node.children.length > 0;
      const expanded = q ? true : state.locExpanded.has(node.id);
      const isSelected = activeId === String(node.id);
      const isCountryOrProv = node.location_type === 'Country' || node.location_type === 'Province';
      const levelClass = node.location_type === 'District' ? 'level-district'
        : node.location_type === 'Tehsil' ? 'level-tehsil'
        : isCountryOrProv ? ''
        : 'level-village';

      const displayLabel = node.name_en === 'Kurram District'
        ? 'Kurram District (Agency)'
        : node.name_en;

      const countNum = Number(node.martyr_count) || 0;
      const reviewTag = node.verification_status === 'needs_review'
        ? `<i class="fas fa-circle-exclamation martyrs-loc-review-dot" title="Marked for administrator geographical review"></i>`
        : '';

      if (isCountryOrProv) {
        // Render subtle collapsible header for Country / Province
        return `
          <div data-loc-node="${node.id}">
            <div class="martyrs-loc-row ${isSelected ? 'active' : ''}" style="font-size:0.74rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.03em; padding-left:${depth * 8 + 6}px;"
              onclick="window.QSFMartyrs.selectSidebarLocation(${node.id}, '${esc(node.name_en)}')">
              <span class="martyrs-loc-row-left">
                ${hasKids ? `<span class="martyrs-loc-caret" onclick="event.stopPropagation(); window.QSFMartyrs.toggleLocNodeExpand(${node.id})"><i class="fas fa-chevron-${expanded ? 'down' : 'right'}"></i></span>` : ''}
                <span class="martyrs-loc-name">${esc(displayLabel)}</span>
              </span>
              <span class="martyrs-loc-count ${countNum > 0 ? 'has-records' : ''}">${countNum}</span>
            </div>
            ${hasKids && expanded ? `<div>${renderLocationTreeNodes(node.children, depth + 1)}</div>` : ''}
          </div>
        `;
      }

      return `
        <div data-loc-node="${node.id}">
          <div class="martyrs-loc-row ${levelClass} ${isSelected ? 'active' : ''}" data-loc-id="${node.id}" data-loc-name="${esc(node.name_en)}" data-loc-alt="${esc(node.alt_names || '')}"
            onclick="window.QSFMartyrs.selectSidebarLocation(${node.id}, '${esc(node.name_en)}')">
            <span class="martyrs-loc-row-left">
              ${hasKids ? `<span class="martyrs-loc-caret" onclick="event.stopPropagation(); window.QSFMartyrs.toggleLocNodeExpand(${node.id})"><i class="fas fa-chevron-${expanded ? 'down' : 'right'}"></i></span>` : `<span class="martyrs-loc-caret"><i class="fas fa-circle" style="font-size:0.32rem;"></i></span>`}
              <span class="martyrs-loc-name" title="${esc(node.name_en)}${node.name_ur ? ' · ' + esc(node.name_ur) : ''}${node.alt_names ? ' · Alt: ' + esc(node.alt_names) : ''}">${esc(displayLabel)}</span>
              ${reviewTag}
            </span>
            <span class="martyrs-loc-count ${countNum > 0 ? 'has-records' : ''}" data-loc-count="${node.id}">${countNum}</span>
          </div>
          ${hasKids && expanded ? `<div>${renderLocationTreeNodes(node.children, depth + 1)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function toggleLocNodeExpand(locId) {
    const id = Number(locId);
    if (state.locExpanded.has(id)) state.locExpanded.delete(id);
    else state.locExpanded.add(id);
    const treeBox = document.getElementById('martyrsLocTreeContainer');
    if (treeBox) {
      treeBox.innerHTML = `
        <div class="martyrs-loc-row ${!state.martyrsFilter.location_id ? 'active' : ''}" onclick="window.QSFMartyrs.selectSidebarLocation('', '')">
          <span class="martyrs-loc-row-left">
            <i class="fas fa-globe" style="color:#881337; width:14px;"></i>
            <span class="martyrs-loc-name" style="font-weight:700;">All Locations</span>
          </span>
          <span class="martyrs-loc-count ${state.totalTreeMartyrs > 0 ? 'has-records' : ''}">${state.totalTreeMartyrs}</span>
        </div>
        ${renderLocationTreeNodes(state.locationTree, 0)}
      `;
    }
  }

  function toggleLocationsSidebar() {
    state.locSidebarCollapsed = !state.locSidebarCollapsed;
    localStorage.setItem(LOC_COLLAPSED_KEY, state.locSidebarCollapsed ? '1' : '0');
    const sb = document.getElementById('martyrsLocationsSidebar');
    const btn = document.getElementById('btnToggleLocSidebar');
    if (sb) sb.classList.toggle('collapsed', state.locSidebarCollapsed);
    if (btn) {
      btn.title = state.locSidebarCollapsed ? 'Expand Locations Sidebar' : 'Collapse Locations Sidebar';
      btn.innerHTML = `<i class="fas ${state.locSidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left'}"></i>`;
    }
  }

  function toggleMobileLocDrawer(open) {
    state.locMobileOpen = Boolean(open);
    const sb = document.getElementById('martyrsLocationsSidebar');
    const bd = document.getElementById('martyrsLocMobileBackdrop');
    if (sb) sb.classList.toggle('mobile-open', state.locMobileOpen);
    if (bd) bd.classList.toggle('open', state.locMobileOpen);
  }

  function selectSidebarLocation(locId, locLabel) {
    state.martyrsFilter.location_id = locId ? String(locId) : '';
    state.martyrsFilter.location_label = locLabel || '';
    state.martyrsFilter.page = 1;
    state.locMobileOpen = false;
    loadAndRenderMartyrsDirectory();
  }

  function setLocationScope(scope) {
    if (!['residential', 'martyrdom', 'either'].includes(scope)) return;
    state.martyrsFilter.location_scope = scope;
    state.martyrsFilter.page = 1;
    loadAndRenderMartyrsDirectory();
  }

  function buildActiveFilterChips() {
    const f = state.martyrsFilter;
    const chips = [];
    if (f.war_id) {
      const w = state.warsList.find(x => String(x.id) === String(f.war_id));
      chips.push({ key: 'war_id', label: `War: ${w ? w.name : '#' + f.war_id}` });
    }
    if (f.location_id) {
      const scopeTag = f.location_scope === 'martyrdom' ? 'Martyrdom' : f.location_scope === 'either' ? 'Any' : 'Home';
      chips.push({ key: 'location_id', label: `Location (${scopeTag}): ${f.location_label || '#' + f.location_id}` });
    }
    if (f.search) chips.push({ key: 'search', label: `Name: "${f.search}"` });
    if (f.father_name) chips.push({ key: 'father_name', label: `Father: "${f.father_name}"` });
    if (f.country) chips.push({ key: 'country', label: `Country: ${f.country}` });
    if (f.district) chips.push({ key: 'district', label: `District: ${f.district}` });
    if (f.tehsil) chips.push({ key: 'tehsil', label: `Tehsil: ${f.tehsil}` });
    if (f.location) chips.push({ key: 'location', label: `Area Text: "${f.location}"` });
    if (f.date_of_martyrdom) chips.push({ key: 'date_of_martyrdom', label: `Martyred On: ${fmtDate(f.date_of_martyrdom)}` });
    if (f.date_from || f.date_to) chips.push({ key: 'date_range', label: `Dates: ${f.date_from ? fmtDate(f.date_from) : '…'} – ${f.date_to ? fmtDate(f.date_to) : '…'}` });
    if (f.status && f.status !== 'active') chips.push({ key: 'status', label: `Status: ${f.status}` });
    return chips;
  }

  function clearSingleFilter(key) {
    const f = state.martyrsFilter;
    if (key === 'location_id') { f.location_id = ''; f.location_label = ''; }
    else if (key === 'date_range') { f.date_from = ''; f.date_to = ''; }
    else if (key === 'status') { f.status = 'active'; }
    else if (key in f) { f[key] = ''; }
    f.page = 1;
    loadAndRenderMartyrsDirectory();
  }

  function resetAllMartyrsFilters() {
    const keepLimit = state.martyrsFilter.limit || 12;
    state.martyrsFilter = createDefaultMartyrsFilter();
    state.martyrsFilter.limit = keepLimit;
    closeFiltersModal();
    loadAndRenderMartyrsDirectory();
  }

  // =========================================================================
  // HEADER FILTER POPUP MODAL
  // =========================================================================
  async function openFiltersModal() {
    const modal = document.getElementById('modalMartyrFilters');
    const body = document.getElementById('martyrFiltersModalBody');
    if (!modal || !body) return;
    if (!state.warsList.length) await fetchAllWarsForPicker();
    if (!state.locationsFlat.length) await fetchLocationsFlat();

    const f = state.martyrsFilter;
    const countries = Array.from(new Set([...(state.martyrsFacets.countries || []), ...state.locationsFlat.map(l => l.country).filter(Boolean)])).sort();
    const districts = Array.from(new Set([...(state.martyrsFacets.districts || []), ...state.locationsFlat.map(l => l.district).filter(Boolean)])).sort();
    const tehsils = Array.from(new Set([...(state.martyrsFacets.tehsils || []), ...state.locationsFlat.map(l => l.tehsil).filter(Boolean)])).sort();
    const villages = state.locationsFlat.filter(l => ['Town', 'Village', 'Area', 'Locality'].includes(l.location_type));

    body.innerHTML = `
      <form id="martyrFiltersPopupForm" novalidate>
        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="fpName">Martyr Name</label>
            <input type="text" id="fpName" class="form-control" placeholder="Search by martyr name..." value="${esc(f.search)}" />
          </div>
          <div>
            <label class="form-label" for="fpFather">Father's Name</label>
            <input type="text" id="fpFather" class="form-control" placeholder="Search by father's name..." value="${esc(f.father_name)}" />
          </div>
          <div>
            <label class="form-label" for="fpWar">War / Conflict</label>
            <select id="fpWar" class="form-control">
              <option value="">All Wars / Conflicts</option>
              ${state.warsList.map(w => `<option value="${w.id}" ${String(f.war_id) === String(w.id) ? 'selected' : ''}>${esc(w.name)} (${Number(w.total_martyrs) || 0})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="fpLocationScope">Location Match Type</label>
            <select id="fpLocationScope" class="form-control">
              <option value="residential" ${f.location_scope === 'residential' ? 'selected' : ''}>Residential / Home Village</option>
              <option value="martyrdom" ${f.location_scope === 'martyrdom' ? 'selected' : ''}>Place of Martyrdom / Death</option>
              <option value="either" ${f.location_scope === 'either' ? 'selected' : ''}>Either (Residential or Martyrdom)</option>
            </select>
          </div>
        </div>

        <div class="martyr-form-grid-3" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="fpCountry">Country</label>
            <select id="fpCountry" class="form-control">
              <option value="">All Countries</option>
              ${countries.map(c => `<option value="${esc(c)}" ${f.country === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="fpDistrict">District</label>
            <select id="fpDistrict" class="form-control">
              <option value="">All Districts</option>
              ${districts.map(d => `<option value="${esc(d)}" ${f.district === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="fpTehsil">Tehsil / Region</label>
            <select id="fpTehsil" class="form-control">
              <option value="">All Tehsils / Regions</option>
              ${tehsils.map(t => `<option value="${esc(t)}" ${f.tehsil === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="fpVillageId">Village / Locality (Database)</label>
            <select id="fpVillageId" class="form-control">
              <option value="">All Villages / Localities</option>
              ${villages.map(v => `<option value="${v.id}" ${String(f.location_id) === String(v.id) ? 'selected' : ''}>${esc(v.name_en)}${v.tehsil ? ` · ${esc(v.tehsil)}` : ''}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="fpLocationText">Village / Area Keyword (Optional)</label>
            <input type="text" id="fpLocationText" class="form-control" placeholder="Type village or locality..." value="${esc(f.location)}" />
          </div>
        </div>

        <div class="martyr-form-grid-3" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="fpExactDate">Exact Date of Martyrdom</label>
            <input type="date" id="fpExactDate" class="form-control" value="${esc(f.date_of_martyrdom)}" />
          </div>
          <div>
            <label class="form-label" for="fpDateFrom">Date Range (From)</label>
            <input type="date" id="fpDateFrom" class="form-control" value="${esc(f.date_from)}" />
          </div>
          <div>
            <label class="form-label" for="fpDateTo">Date Range (To)</label>
            <input type="date" id="fpDateTo" class="form-control" value="${esc(f.date_to)}" />
          </div>
        </div>

        <div class="martyr-form-grid-2" style="margin-bottom: 16px;">
          <div>
            <label class="form-label" for="fpStatus">Archive Status</label>
            <select id="fpStatus" class="form-control">
              <option value="active" ${f.status === 'active' ? 'selected' : ''}>Active Memorials</option>
              <option value="archived" ${f.status === 'archived' ? 'selected' : ''}>Archived Records</option>
              <option value="all" ${f.status === 'all' ? 'selected' : ''}>All Records</option>
            </select>
          </div>
          <div>
            <label class="form-label" for="fpSort">Sort Order</label>
            <select id="fpSort" class="form-control">
              <option value="recent" ${f.sort === 'recent' ? 'selected' : ''}>Recently Added</option>
              <option value="martyrdom_desc" ${f.sort === 'martyrdom_desc' ? 'selected' : ''}>Martyrdom Date (Newest)</option>
              <option value="martyrdom_asc" ${f.sort === 'martyrdom_asc' ? 'selected' : ''}>Martyrdom Date (Oldest)</option>
              <option value="name_asc" ${f.sort === 'name_asc' ? 'selected' : ''}>Name (A → Z)</option>
              <option value="name_desc" ${f.sort === 'name_desc' ? 'selected' : ''}>Name (Z → A)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
          <button type="button" class="btn-admin btn-admin-secondary" id="btnFpReset">
            <i class="fas fa-rotate-left"></i> Reset Filters
          </button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.closeFiltersModal()">Cancel</button>
            <button type="submit" class="btn-admin btn-admin-primary" id="btnFpApply">
              <i class="fas fa-check"></i> Apply Filters
            </button>
          </div>
        </div>
      </form>
    `;

    modal.classList.remove('hidden');

    document.getElementById('btnFpReset').addEventListener('click', () => {
      resetAllMartyrsFilters();
    });

    document.getElementById('martyrFiltersPopupForm').addEventListener('submit', e => {
      e.preventDefault();
      const selLocId = document.getElementById('fpVillageId').value;
      const locObj = selLocId ? state.locationsFlat.find(x => String(x.id) === String(selLocId)) : null;

      state.martyrsFilter.search = document.getElementById('fpName').value.trim();
      state.martyrsFilter.father_name = document.getElementById('fpFather').value.trim();
      state.martyrsFilter.war_id = document.getElementById('fpWar').value;
      state.martyrsFilter.location_scope = document.getElementById('fpLocationScope').value;
      state.martyrsFilter.country = document.getElementById('fpCountry').value;
      state.martyrsFilter.district = document.getElementById('fpDistrict').value;
      state.martyrsFilter.tehsil = document.getElementById('fpTehsil').value;
      state.martyrsFilter.location_id = selLocId;
      state.martyrsFilter.location_label = locObj ? locObj.name_en : (selLocId ? state.martyrsFilter.location_label : '');
      state.martyrsFilter.location = document.getElementById('fpLocationText').value.trim();
      state.martyrsFilter.date_of_martyrdom = document.getElementById('fpExactDate').value;
      state.martyrsFilter.date_from = document.getElementById('fpDateFrom').value;
      state.martyrsFilter.date_to = document.getElementById('fpDateTo').value;
      state.martyrsFilter.status = document.getElementById('fpStatus').value;
      state.martyrsFilter.sort = document.getElementById('fpSort').value;
      state.martyrsFilter.page = 1;

      closeFiltersModal();
      loadAndRenderMartyrsDirectory();
    });
  }

  function closeFiltersModal() {
    const modal = document.getElementById('modalMartyrFilters');
    if (modal) modal.classList.add('hidden');
  }

  // =========================================================================
  // ADD NEW LOCATION MODAL (DYNAMIC LOCATION DATABASE)
  // =========================================================================
  async function openLocationModal(options = {}) {
    const modal = document.getElementById('modalMartyrLocation');
    const body = document.getElementById('martyrLocationModalBody');
    if (!modal || !body) return;
    if (!state.locationsFlat.length) await fetchLocationsFlat();

    state.locModalCallback = typeof options.onSaved === 'function' ? options.onSaved : null;
    const districts = state.locationsFlat.filter(l => l.location_type === 'District');
    const tehsils = state.locationsFlat.filter(l => l.location_type === 'Tehsil');
    const defaultDistrict = options.district || 'Kurram District';
    const defaultTehsil = options.tehsil || '';

    body.innerHTML = `
      <form id="martyrAddLocationForm" novalidate>
        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="mlDistrictSelect">Parent District <span style="color:#B91C1C;">*</span></label>
            <select id="mlDistrictSelect" class="form-control">
              ${districts.map(d => `<option value="${d.id}" data-name="${esc(d.name_en)}" ${d.name_en === defaultDistrict ? 'selected' : ''}>${esc(d.name_en)}${d.province ? ` (${esc(d.province)})` : ''}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="mlTehsilSelect">Parent Tehsil / Region <span style="color:#B91C1C;">*</span></label>
            <select id="mlTehsilSelect" class="form-control"></select>
          </div>
          <div>
            <label class="form-label" for="mlNameEn">Village / Location Name (English) <span style="color:#B91C1C;">*</span></label>
            <input type="text" id="mlNameEn" class="form-control" required placeholder="e.g., Jalandhar, Sameer, Ghozgari..." />
          </div>
          <div>
            <label class="form-label" for="mlNameUr">Village / Location Name (Urdu – اردو نام)</label>
            <input type="text" id="mlNameUr" class="form-control martyr-urdu" dir="rtl" placeholder="مثلاً جالندھر، سمیر، پارہ چنار..." />
          </div>
          <div>
            <label class="form-label" for="mlAltNames">Alternative / Local Spellings (Optional)</label>
            <input type="text" id="mlAltNames" class="form-control" placeholder="e.g., Jilander / Samir / Baggan" />
          </div>
          <div>
            <label class="form-label" for="mlTehsilUr">Region / Tehsil Name (Urdu – تحصیل کا اردو نام)</label>
            <input type="text" id="mlTehsilUr" class="form-control martyr-urdu" dir="rtl" placeholder="مثلاً اپر کرم، لوئر کرم، سینٹرل کرم" />
          </div>
          <div>
            <label class="form-label" for="mlDataSource">Geographical Source (Optional)</label>
            <input type="text" id="mlDataSource" class="form-control" placeholder="e.g., Google Maps / OSM / FATA Census" />
          </div>
          <div>
            <label class="form-label" for="mlType">Location Type</label>
            <select id="mlType" class="form-control">
              <option value="Village" selected>Village</option>
              <option value="Town">Town</option>
              <option value="Area">Area</option>
              <option value="Locality">Locality</option>
            </select>
          </div>
          <div>
            <label class="form-label" for="mlVerification">Verification Status</label>
            ${state.summary.is_full_admin ? `
              <select id="mlVerification" class="form-control">
                <option value="verified" selected>Verified</option>
                <option value="needs_review">Needs Review</option>
              </select>
            ` : `
              <input type="text" class="form-control" value="Pending Admin Review" disabled />
              <input type="hidden" id="mlVerification" value="needs_review" />
            `}
          </div>
          <div>
            <label class="form-label" for="mlLat">Latitude (Optional)</label>
            <input type="number" step="any" id="mlLat" class="form-control" placeholder="e.g., 33.8992" />
          </div>
          <div>
            <label class="form-label" for="mlLng">Longitude (Optional)</label>
            <input type="number" step="any" id="mlLng" class="form-control" placeholder="e.g., 70.1008" />
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <label class="form-label" for="mlMapsUrl">Google Maps URL / Map Reference (Optional)</label>
          <input type="url" id="mlMapsUrl" class="form-control" placeholder="https://maps.google.com/..." />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 10px; border-top: 1px solid #E2E8F0;">
          <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.closeLocationModal()">Cancel</button>
          <button type="submit" class="btn-admin btn-admin-primary" id="btnMlSubmit">
            <i class="fas fa-save"></i> Save Location
          </button>
        </div>
      </form>
    `;

    const dSel = document.getElementById('mlDistrictSelect');
    const tSel = document.getElementById('mlTehsilSelect');
    const refreshTehsils = () => {
      const distId = Number(dSel.value);
      const matching = tehsils.filter(t => Number(t.parent_id) === distId);
      tSel.innerHTML = matching.map(t => `<option value="${t.id}" data-ur="${esc(t.name_ur || '')}" ${t.name_en === defaultTehsil ? 'selected' : ''}>${esc(t.name_en)}${t.name_ur ? ` (${esc(t.name_ur)})` : ''}</option>`).join('');
      const selOpt = tSel.options[tSel.selectedIndex];
      const tUrEl = document.getElementById('mlTehsilUr');
      if (tUrEl && selOpt) tUrEl.value = selOpt.getAttribute('data-ur') || '';
    };
    refreshTehsils();
    dSel.addEventListener('change', refreshTehsils);
    tSel.addEventListener('change', () => {
      const selOpt = tSel.options[tSel.selectedIndex];
      const tUrEl = document.getElementById('mlTehsilUr');
      if (tUrEl && selOpt) tUrEl.value = selOpt.getAttribute('data-ur') || '';
    });

    modal.classList.remove('hidden');

    document.getElementById('martyrAddLocationForm').addEventListener('submit', async e => {
      e.preventDefault();
      const nameEn = document.getElementById('mlNameEn').value.trim();
      const parentId = Number(tSel.value || dSel.value);
      if (!nameEn) {
        notify('Location Name (English) is required.', 'error');
        return;
      }
      const btn = document.getElementById('btnMlSubmit');
      btn.disabled = true;
      try {
        const res = await apiFetch('/locations', {
          method: 'POST',
          body: {
            name_en: nameEn,
            name_ur: document.getElementById('mlNameUr').value.trim(),
            alt_names: document.getElementById('mlAltNames').value.trim(),
            tehsil_ur: document.getElementById('mlTehsilUr') ? document.getElementById('mlTehsilUr').value.trim() : '',
            data_source: document.getElementById('mlDataSource').value.trim(),
            location_type: document.getElementById('mlType').value,
            parent_id: parentId,
            latitude: document.getElementById('mlLat').value,
            longitude: document.getElementById('mlLng').value,
            maps_url: document.getElementById('mlMapsUrl').value.trim(),
            verification_status: document.getElementById('mlVerification').value
          }
        });
        await fetchLocationsFlat();
        notify(res.message || 'Location added.', 'success');
        const cb = state.locModalCallback;
        closeLocationModal();
        if (cb) {
          await cb(res.location);
        } else if (state.martyrsViewMode === 'list') {
          await loadAndRenderMartyrsDirectory();
        }
      } catch (err) {
        notify(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  function closeLocationModal() {
    const modal = document.getElementById('modalMartyrLocation');
    if (modal) modal.classList.add('hidden');
    state.locModalCallback = null;
  }

  // =========================================================================
  // MARTYR PROFILE CARD & PAGINATION
  // =========================================================================
  function renderMartyrCard(m, showWarLink = true) {
    const urduName = isUrdu(m.full_name);
    const urduFather = isUrdu(m.father_name);
    const homeLabel = [m.residence_location_name || m.city, m.residence_tehsil, m.district].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
    const marLabel = [m.martyrdom_location_name || m.place_of_martyrdom, m.martyrdom_tehsil].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
    const ageStr = m.age_at_death != null ? ` (${m.age_at_death} yrs)` : '';
    const isDemo = Boolean(Number(m.is_demo));

    return `
      <article class="martyr-profile-card" data-martyr-id="${m.id}" data-is-demo="${isDemo ? '1' : '0'}" style="${isDemo ? 'border-color:#F59E0B; background:#FFFBEB;' : ''}" onclick="window.QSFMartyrs.openMartyrProfile(${m.id})">
        <div class="martyr-card-avatar">
          ${m.profile_photo_url
            ? `<img src="${esc(m.profile_photo_url)}" alt="${esc(m.full_name)}" loading="lazy" />`
            : `<i class="fas fa-user"></i>`
          }
        </div>
        <div class="martyr-card-info">
          ${isDemo ? `
            <div data-demo-badge="1" style="display:inline-block; background:#FEF3C7; color:#92400E; border:1px solid #F59E0B; font-size:0.65rem; font-weight:800; padding:2px 6px; border-radius:3px; margin-bottom:4px; letter-spacing:0.04em;">
              <i class="fas fa-flask"></i> DEMO DATA – NOT A REAL HISTORICAL PERSON
            </div>
          ` : ''}
          <h4 class="martyr-card-name ${urduName ? 'martyr-urdu' : ''}" dir="${urduName ? 'rtl' : 'ltr'}">
            ${esc(m.full_name)}
            ${m.full_name_ur && m.full_name_ur !== m.full_name ? `<span class="martyr-urdu" style="font-size:0.86rem; color:#64748B; font-weight:600; margin-left:6px;">(${esc(m.full_name_ur)})</span>` : ''}
          </h4>
          <div class="martyr-card-father ${urduFather ? 'martyr-urdu' : ''}" dir="${urduFather ? 'rtl' : 'ltr'}">
            ${m.father_name ? `${m.gender === 'female' ? 'D/O' : 'S/O'} ${esc(m.father_name)}${m.father_name_ur ? ` <span class="martyr-urdu" style="color:#64748B;">(${esc(m.father_name_ur)})</span>` : ''}` : '<span style="color:#94A3B8;">Father\'s Name: Not Available</span>'}
          </div>
          <div class="martyr-card-details">
            ${m.date_of_birth ? `<span><i class="fas fa-cake-candles"></i> Born: ${fmtDate(m.date_of_birth)}</span>` : ''}
            <span><i class="fas fa-calendar-day"></i> Martyred: ${fmtDate(m.date_of_martyrdom)}${esc(ageStr)}</span>
            ${homeLabel ? `<span><i class="fas fa-house"></i> Home: ${esc(homeLabel)}</span>` : ''}
            ${marLabel ? `<span><i class="fas fa-location-dot"></i> Place: ${esc(marLabel)}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${showWarLink && m.primary_war_name ? `
              <span class="martyr-card-war-link" onclick="event.stopPropagation(); window.QSFMartyrs.openWarDetail(${m.primary_war_id})" title="View War Archive">
                <i class="fas fa-landmark"></i> ${esc(m.primary_war_name)}
              </span>
            ` : ''}
            ${Number(m.source_count) > 0 ? `<span style="margin-top:8px; font-size:0.68rem; font-weight:700; color:#166534; background:#DCFCE7; padding:2px 6px; border-radius:3px;"><i class="fas fa-newspaper"></i> ${m.source_count} source${Number(m.source_count) === 1 ? '' : 's'}</span>` : ''}
            ${(m.full_name_ur || m.biography_ur)
              ? `<span style="margin-top:8px; font-size:0.66rem; font-weight:700; color:#1E40AF; background:#DBEAFE; padding:2px 6px; border-radius:3px;" title="Both English and Urdu content present">EN + اردو</span>`
              : `<span style="margin-top:8px; font-size:0.66rem; font-weight:700; color:#92400E; background:#FEF3C7; padding:2px 6px; border-radius:3px;" title="Urdu translation not yet entered">Missing Urdu (اردو)</span>`
            }
            ${m.status === 'archived' ? `<span class="martyr-status-tag archived" style="margin-top: 8px;">Archived</span>` : ''}
          </div>
          ${m.created_by_name ? `<div style="margin-top: 7px; font-size: 0.7rem; color: #94A3B8;">Added by ${esc(m.created_by_name)}</div>` : ''}
        </div>
      </article>
    `;
  }

  function renderPaginationBar(pg) {
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
        <div style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: #475569;">
          <span>Page <strong>${pg.page}</strong> of <strong>${pg.totalPages}</strong> (${pg.total} total)</span>
          <select id="mdPageLimitSelect" class="form-control" style="width: auto; height: 30px; padding: 2px 8px; font-size: 0.78rem;">
            <option value="12" ${pg.limit === 12 ? 'selected' : ''}>12 / page</option>
            <option value="24" ${pg.limit === 24 ? 'selected' : ''}>24 / page</option>
            <option value="48" ${pg.limit === 48 ? 'selected' : ''}>48 / page</option>
          </select>
        </div>
        <div class="martyr-page-btns">
          <button type="button" class="martyr-page-btn" ${pg.page <= 1 ? 'disabled' : ''} onclick="window.QSFMartyrs.goToMartyrsPage(${pg.page - 1})">Prev</button>
          ${pages.map(p => p === '...'
            ? `<span style="padding: 0 4px; color: #94A3B8;">…</span>`
            : `<button type="button" class="martyr-page-btn ${p === pg.page ? 'active' : ''}" onclick="window.QSFMartyrs.goToMartyrsPage(${p})">${p}</button>`
          ).join('')}
          <button type="button" class="martyr-page-btn" ${pg.page >= pg.totalPages ? 'disabled' : ''} onclick="window.QSFMartyrs.goToMartyrsPage(${pg.page + 1})">Next</button>
        </div>
      </div>
    `;
  }

  function goToMartyrsPage(pageNum) {
    state.martyrsFilter.page = Math.max(1, Number(pageNum) || 1);
    loadAndRenderMartyrsDirectory();
  }

  // =========================================================================
  // INDIVIDUAL MARTYR DIGITAL MEMORIAL PROFILE PAGE (WITH ATTRIBUTION & ACTIVITY LOG)
  // =========================================================================
  async function openMartyrProfile(martyrId) {
    state.martyrsViewMode = 'profile';
    state.activeMartyrId = Number(martyrId);
    const activeTab = document.querySelector('#tab-martyrs-all.active');
    if (!activeTab && typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('martyrs-all');
      return;
    }
    await renderMartyrProfile(state.activeMartyrId);
  }

  async function renderMartyrProfile(martyrId) {
    const root = document.getElementById('martyrsAllRoot');
    if (!root) return;
    root.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748B;"><i class="fas fa-circle-notch fa-spin"></i> Loading memorial profile...</div>`;

    try {
      const data = await apiFetch(`/profile/${martyrId}`);
      const m = data.martyr;
      const wars = data.wars || [];
      const photos = data.photos || [];
      const sources = data.sources || [];
      const family = data.family_members || [];
      const activityLogs = data.activity_logs || [];
      const canViewFamily = Boolean(data.can_view_family);
      const isDemo = Boolean(Number(m.is_demo));

      const urduName = isUrdu(m.full_name);
      const bioDir = resolveDir(m.biography_dir, m.biography_html || '');
      const relPrefix = m.gender === 'female' ? 'Daughter of' : 'Son of';

      const homeFull = [m.residence_location_name || m.city, m.residence_tehsil, m.district, m.province_state, m.country_of_residence]
        .filter((v, i, a) => v && a.indexOf(v) === i).join(', ') || '—';
      const martyrdomFull = [m.martyrdom_location_name || m.place_of_martyrdom, m.martyrdom_tehsil, m.martyrdom_district, m.martyrdom_province, m.country]
        .filter((v, i, a) => v && a.indexOf(v) === i).join(', ') || '—';

      const lbItems = [];
      if (m.profile_photo_url) lbItems.push({ image_url: m.profile_photo_url, caption: `${m.full_name} — Portrait Photograph` });
      photos.forEach(p => lbItems.push({ image_url: p.image_url, caption: p.caption || m.full_name }));
      window.__qsfCurrentMartyrPhotos = lbItems;

      root.innerHTML = `
        <div class="martyr-page-topbar">
          <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.backToMartyrsList()">
            <i class="fas fa-arrow-left"></i> Back to Martyrs Directory
          </button>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <button type="button" class="btn-admin btn-admin-primary" onclick="window.QSFMartyrs.openEditMartyrForm(${m.id})">
              <i class="fas fa-pen"></i> Edit Profile
            </button>
            <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.toggleMartyrArchive(${m.id}, ${m.status === 'archived' ? 'true' : 'false'})">
              <i class="fas ${m.status === 'archived' ? 'fa-rotate-left' : 'fa-box-archive'}"></i> ${m.status === 'archived' ? 'Restore Profile' : 'Archive'}
            </button>
            <button type="button" class="btn-admin btn-admin-secondary" onclick="window.print()">
              <i class="fas fa-print"></i> Print
            </button>
            ${state.summary.is_full_admin ? `
              <button type="button" class="btn-admin btn-admin-danger" onclick="window.QSFMartyrs.permanentDeleteMartyr(${m.id}, '${esc(m.full_name)}')">
                <i class="fas fa-trash"></i> Delete
              </button>
            ` : ''}
          </div>
        </div>

        ${isDemo ? `
          <div data-demo-banner="1" style="background: #FEF3C7; border: 2px solid #F59E0B; color: #92400E; padding: 12px 18px; border-radius: 6px; margin-bottom: 14px; font-weight: 800; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span><i class="fas fa-flask"></i> DEMO DATA – NOT A REAL HISTORICAL PERSON (Created for UI Layout &amp; Filter Testing Only)</span>
            <button type="button" class="btn-admin btn-admin-danger" style="padding: 4px 10px; font-size: 0.76rem;" onclick="window.QSFMartyrs.removeAllDemoRecords()">
              <i class="fas fa-trash"></i> Remove All Demo Data
            </button>
          </div>
        ` : ''}

        <header class="martyr-memorial-header">
          <div class="martyr-memorial-portrait" ${m.profile_photo_url ? `onclick="window.QSFMartyrs.openLightbox(window.__qsfCurrentMartyrPhotos, 0)"` : ''}>
            ${m.profile_photo_url
              ? `<img src="${esc(m.profile_photo_url)}" alt="${esc(m.full_name)}" />`
              : `<i class="fas fa-user"></i>`
            }
          </div>
          <div class="martyr-memorial-identity">
            <div class="martyr-memorial-kicker">
              IN MEMORIAM · QSF HISTORICAL ARCHIVE ${m.status === 'archived' ? '· ARCHIVED RECORD' : ''}
              · <span style="color:#166534;">${esc((m.verification_status || 'verified').toUpperCase())}</span>
            </div>
            <h1 class="martyr-memorial-name ${urduName ? 'martyr-urdu' : ''}" dir="${urduName ? 'rtl' : 'ltr'}">${esc(m.full_name)}</h1>
            <p class="martyr-memorial-sub ${isUrdu(m.father_name) ? 'martyr-urdu' : ''}" dir="${isUrdu(m.father_name) ? 'rtl' : 'ltr'}">
              ${m.father_name ? `${relPrefix} <strong>${esc(m.father_name)}</strong>` : 'Father\'s Name: <strong>Not Available</strong>'}
              ${m.mother_name ? ` &nbsp;·&nbsp; Mother: <strong>${esc(m.mother_name)}</strong>` : ''}
            </p>
            ${m.primary_war_name ? `
              <div style="margin: -6px 0 14px;">
                <span class="martyr-card-war-link" style="margin-top: 0; cursor: pointer; font-size: 0.78rem; padding: 4px 10px;" onclick="window.QSFMartyrs.openWarDetail(${m.primary_war_id})" title="Open Associated War Archive">
                  <i class="fas fa-landmark" style="margin-right: 4px;"></i> ${esc(m.primary_war_name)}
                </span>
              </div>
            ` : ''}
            <div class="martyr-memorial-keyfacts">
              <div class="martyr-keyfact">
                <small>Date of Birth</small>
                <strong>${m.date_of_birth ? fmtDate(m.date_of_birth) : 'Not Available'}</strong>
              </div>
              <div class="martyr-keyfact">
                <small>Date of Martyrdom</small>
                <strong style="color: #881337;">${m.date_of_martyrdom ? fmtDate(m.date_of_martyrdom) : 'Not Available'}</strong>
              </div>
              <div class="martyr-keyfact">
                <small>Age at Martyrdom</small>
                <strong>${m.age_at_death != null ? `${m.age_at_death} years` : 'Not Available'}</strong>
              </div>
              <div class="martyr-keyfact">
                <small>Place of Martyrdom</small>
                <strong>${esc(m.martyrdom_location_name || m.place_of_martyrdom || m.country || 'Not Available')}</strong>
              </div>
            </div>
            ${renderAttributionHtml(m)}
          </div>
        </header>

        <div class="martyr-profile-2col">
          <div>
            <section class="martyr-editorial-section">
              <h3 class="martyr-section-heading"><span><i class="fas fa-id-card"></i> Personal &amp; Geographical Record</span></h3>
              <dl class="martyr-info-dl">
                <div class="martyr-info-pair"><dt>Full Name</dt><dd class="${urduName ? 'martyr-urdu' : ''}">${esc(m.full_name)}</dd></div>
                <div class="martyr-info-pair"><dt>Father's Name</dt><dd class="${isUrdu(m.father_name) ? 'martyr-urdu' : ''}">${esc(m.father_name || 'Not Available')}</dd></div>
                <div class="martyr-info-pair"><dt>Mother's Name</dt><dd>${esc(m.mother_name || 'Not Available')}</dd></div>
                <div class="martyr-info-pair"><dt>Gender</dt><dd style="text-transform: capitalize;">${esc(m.gender || 'Not Available')}</dd></div>
                <div class="martyr-info-pair"><dt>Place of Birth</dt><dd>${esc(m.birth_location_name || m.place_of_birth || 'Not Available')}</dd></div>
                <div class="martyr-info-pair"><dt>Residential / Home Location</dt><dd>${esc(homeFull)}</dd></div>
                <div class="martyr-info-pair"><dt>Place of Martyrdom / Death</dt><dd style="color:#881337;">${esc(martyrdomFull)}</dd></div>
                <div class="martyr-info-pair"><dt>Religious / Community Identity</dt><dd>${esc(m.religious_community || 'Not Specified')}${m.community_source_note ? ` <small style="color:#64748B;">(${esc(m.community_source_note)})</small>` : ''}</dd></div>
                <div class="martyr-info-pair"><dt>Complete Residential Address</dt><dd>${esc(m.residential_address || 'Not Available')}</dd></div>
              </dl>
            </section>

            <section class="martyr-editorial-section">
              <h3 class="martyr-section-heading">
                <span><i class="fas fa-feather-pointed"></i> Biography &amp; Life Tribute</span>
                <span style="font-size: 0.72rem; color: #64748B; font-weight: 600;">${bioDir === 'rtl' ? 'Urdu Nastaliq · RTL' : 'English · LTR'}</span>
              </h3>
              ${m.biography_html ? `
                <div class="martyr-richtext-content ${bioDir === 'rtl' ? 'martyr-urdu' : ''}" dir="${bioDir}">
                  ${m.biography_html}
                </div>
              ` : `<p style="color: #94A3B8; font-size: 0.88rem; margin: 0;">No biography article has been recorded yet.</p>`}
            </section>

            ${renderSourcesSectionHtml(sources, 'Attached Source References & Public Records')}

            <section class="martyr-editorial-section">
              <h3 class="martyr-section-heading">
                <span><i class="fas fa-images"></i> Memorial Photo Gallery (${photos.length})</span>
              </h3>
              ${photos.length === 0 ? `
                <p style="color: #94A3B8; font-size: 0.86rem; margin: 0;">No additional gallery photographs uploaded.</p>
              ` : `
                <div class="martyr-gallery-grid">
                  ${photos.map((p, idx) => `
                    <figure class="martyr-gallery-tile" style="margin: 0;" onclick="window.QSFMartyrs.openLightbox(window.__qsfCurrentMartyrPhotos, ${m.profile_photo_url ? idx + 1 : idx})">
                      <img src="${esc(p.image_url)}" alt="${esc(p.caption || m.full_name)}" loading="lazy" />
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
                <span><i class="fas fa-landmark"></i> Associated War / Conflict${wars.length > 1 ? 's' : ''}</span>
              </h3>
              ${wars.length === 0 ? `<p style="color: #94A3B8; font-size: 0.86rem;">No associated war linked.</p>` : wars.map(w => `
                <div class="martyr-linked-war-box">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
                    <span style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #881337;">
                      ${w.is_primary ? 'Primary War / Incident' : 'Additional Associated Incident'}
                    </span>
                    ${statusBadgeHtml(w.status)}
                  </div>
                  <h4 class="${isUrdu(w.name) ? 'martyr-urdu' : ''}" dir="${isUrdu(w.name) ? 'rtl' : 'ltr'}">${esc(w.name)}</h4>
                  <div style="font-size: 0.78rem; color: #475569; margin-bottom: 10px;">
                    <div><i class="fas fa-location-dot" style="color:#881337; width:14px;"></i> ${esc([w.location, w.tehsil, w.district, w.country].filter((v, i, a) => v && a.indexOf(v) === i).join(', ') || '—')}</div>
                    <div><i class="fas fa-calendar-days" style="color:#881337; width:14px;"></i> ${fmtDate(w.start_date)} – ${w.end_date ? fmtDate(w.end_date) : 'Ongoing'} (${esc(w.duration_label)})</div>
                  </div>
                  <button type="button" class="btn-admin btn-admin-secondary" style="width: 100%; justify-content: center; font-size: 0.78rem; padding: 6px 10px;" onclick="window.QSFMartyrs.openWarDetail(${w.id})">
                    View War Archive Page <i class="fas fa-arrow-right" style="margin-left: 5px;"></i>
                  </button>
                </div>
              `).join('')}
            </section>

            <section class="martyr-editorial-section" id="martyrProfileFamilySection">
              <h3 class="martyr-section-heading">
                <span><i class="fas fa-shield-halved"></i> Family Contacts</span>
                <span style="font-size: 0.68rem; font-weight: 700; color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; padding: 2px 7px; border-radius: 3px;">Confidential</span>
              </h3>
              ${!canViewFamily ? `
                <div class="martyr-privacy-notice">
                  <i class="fas fa-lock" style="margin-right: 6px;"></i>
                  Family contact details are confidential and restricted to administrators or staff granted <strong>Martyrs Family Contacts</strong> permission.
                </div>
              ` : family.length === 0 ? `
                <p style="color: #94A3B8; font-size: 0.85rem; margin: 0;">No family contacts recorded for this profile.</p>
              ` : `
                <div class="martyr-family-grid" style="grid-template-columns: 1fr;">
                  ${family.map(fm => `
                    <div class="martyr-family-card">
                      <div class="martyr-family-rel">${esc(fm.relationship)}</div>
                      <div style="font-weight: 800; color: #0F172A; font-size: 0.94rem; margin: 2px 0 6px;">${esc(fm.full_name)}</div>
                      <div style="font-size: 0.8rem; color: #334155; display: flex; flex-direction: column; gap: 3px;">
                        ${fm.contact_number ? `<span><i class="fas fa-phone" style="width: 15px; color: #881337;"></i> ${esc(fm.contact_number)}</span>` : ''}
                        ${fm.email ? `<span><i class="fas fa-envelope" style="width: 15px; color: #881337;"></i> ${esc(fm.email)}</span>` : ''}
                        ${fm.residential_address ? `<span><i class="fas fa-house" style="width: 15px; color: #881337;"></i> ${esc(fm.residential_address)}</span>` : ''}
                        ${fm.notes ? `<span style="color: #64748B; margin-top: 3px;"><em>${esc(fm.notes)}</em></span>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </section>

            <section class="martyr-editorial-section" id="martyrProfileActivitySection">
              <h3 class="martyr-section-heading">
                <span><i class="fas fa-clock-rotate-left"></i> Activity History (${activityLogs.length})</span>
              </h3>
              ${renderActivityHistoryHtml(activityLogs)}
            </section>
          </div>
        </div>
      `;
    } catch (err) {
      root.innerHTML = `
        <div class="martyr-editorial-section" style="color: #991B1B;">
          <p>Failed to load martyr profile: ${esc(err.message)}</p>
          <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.backToMartyrsList()">Back to Directory</button>
        </div>
      `;
    }
  }

  function backToMartyrsList() {
    state.martyrsViewMode = 'list';
    state.activeMartyrId = null;
    loadAndRenderMartyrsDirectory();
  }

  async function toggleMartyrArchive(martyrId, restore) {
    try {
      await apiFetch(`/profile/${martyrId}/archive`, { method: 'PATCH', body: { restore: Boolean(restore) } });
      notify(restore ? 'Martyr profile restored.' : 'Martyr profile archived.', 'success');
      await renderMartyrProfile(martyrId);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function permanentDeleteMartyr(martyrId, name) {
    if (!window.confirm(`Permanently delete martyr profile "${name}"? Prefer archiving to preserve historical records. Click OK to permanently delete.`)) return;
    try {
      await apiFetch(`/profile/${martyrId}?permanent=true`, { method: 'DELETE' });
      notify('Martyr profile permanently deleted.', 'success');
      backToMartyrsList();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // =========================================================================
  // 3. ADD / EDIT MARTYR PROFILE FORM (SEPARATE DEPENDENT LOCATION PICKERS)
  // =========================================================================
  async function openAddMartyrForm(presetWarId = null) {
    state.formState = createEmptyFormState(presetWarId);
    state.formModeIntent = 'add';
    if (typeof window.switchAdminTab === 'function') {
      window.switchAdminTab('martyrs-add');
    } else {
      await Promise.all([fetchAllWarsForPicker(), fetchLocationsFlat()]);
      renderMartyrForm();
    }
  }

  async function openEditMartyrForm(martyrId) {
    try {
      await refreshSummary();
      const [warsList, locsFlat, data] = await Promise.all([
        fetchAllWarsForPicker(),
        fetchLocationsFlat(),
        apiFetch(`/profile/${martyrId}`)
      ]);
      const m = data.martyr;
      const extraWars = (data.wars || []).filter(w => !w.is_primary).map(w => Number(w.id));
      state.formState = {
        editId: Number(m.id),
        presetWarId: null,
        primaryWarId: Number(m.primary_war_id) || null,
        additionalWarIds: extraWars,
        profilePhotoUrl: m.profile_photo_url || '',
        full_name: m.full_name || '',
        full_name_ur: m.full_name_ur || '',
        father_name: m.father_name || '',
        father_name_ur: m.father_name_ur || '',
        mother_name: m.mother_name || '',
        mother_name_ur: m.mother_name_ur || '',
        gender: m.gender || 'male',
        date_of_birth: toInputDate(m.date_of_birth),
        date_of_martyrdom: toInputDate(m.date_of_martyrdom),
        age_at_death: m.age_at_death != null ? String(m.age_at_death) : '',
        birth_location_id: m.birth_location_id || null,
        place_of_birth: m.place_of_birth || '',
        place_of_birth_ur: m.place_of_birth_ur || '',
        residence_location_id: m.residence_location_id || null,
        country_of_residence: m.country_of_residence || 'Pakistan',
        province_state: m.province_state || 'Khyber Pakhtunkhwa',
        district: m.district || 'Kurram District',
        residence_tehsil: m.residence_tehsil || '',
        city: m.city || '',
        city_ur: m.city_ur || '',
        residential_address: m.residential_address || '',
        martyrdom_location_id: m.martyrdom_location_id || null,
        country: m.country || 'Pakistan',
        martyrdom_province: m.martyrdom_province || 'Khyber Pakhtunkhwa',
        martyrdom_district: m.martyrdom_district || 'Kurram District',
        martyrdom_tehsil: m.martyrdom_tehsil || '',
        place_of_martyrdom: m.place_of_martyrdom || '',
        place_of_martyrdom_ur: m.place_of_martyrdom_ur || '',
        biography_html: m.biography_html || '',
        biography_ur: m.biography_ur || '',
        biography_dir: m.biography_dir || 'auto',
        religious_community: m.religious_community || 'Not Specified',
        community_source_note: m.community_source_note || '',
        verification_status: m.verification_status || 'verified',
        show_father_name_public: m.show_father_name_public === undefined || Number(m.show_father_name_public) !== 0,
        show_home_location_public: m.show_home_location_public === undefined || Number(m.show_home_location_public) !== 0,
        status: m.status || 'published',
        photos: (data.photos || []).map(p => ({ image_url: p.image_url, caption: p.caption || '' })),
        sources: data.sources || [],
        family_members: (data.family_members || []).map(fm => ({
          full_name: fm.full_name || '',
          relationship: fm.relationship || 'Other',
          contact_number: fm.contact_number || '',
          email: fm.email || '',
          residential_address: fm.residential_address || '',
          notes: fm.notes || ''
        }))
      };
      state.formModeIntent = 'edit';
      if (typeof window.switchAdminTab === 'function') {
        window.switchAdminTab('martyrs-add');
      } else {
        renderMartyrForm();
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function renderMartyrForm() {
    const root = document.getElementById('martyrsFormRoot');
    if (!root) return;
    const f = state.formState;
    const isEdit = Boolean(f.editId);
    const selectedWar = state.warsList.find(w => Number(w.id) === Number(f.primaryWarId));
    const bioDir = f.biography_dir === 'rtl' ? 'rtl' : f.biography_dir === 'ltr' ? 'ltr' : (isUrdu(f.biography_html) ? 'rtl' : 'ltr');
    const birthLocOptions = state.locationsFlat.filter(l => ['Town', 'Village', 'Area', 'Locality'].includes(l.location_type));

    root.innerHTML = `
      <div class="martyr-page-topbar">
        <div>
          <h2 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #0F172A;">
            ${isEdit ? `Edit Martyr Profile — ${esc(f.full_name)}` : 'Add New Martyr Memorial Profile'}
          </h2>
          <p style="margin: 3px 0 0; font-size: 0.82rem; color: #64748B;">
            Residential Home, Place of Birth, and Place of Martyrdom are recorded independently. Creator and updater attribution are tracked automatically.
          </p>
        </div>
        <button type="button" class="btn-admin btn-admin-secondary" onclick="window.switchAdminTab('martyrs-all')">
          <i class="fas fa-arrow-left"></i> Back to Directory
        </button>
      </div>

      <div id="mfDupBanner" class="martyr-dup-banner" style="display: none;"></div>

      <form id="martyrProfileForm" class="martyr-form-shell" novalidate>
        <!-- SECTION A: PERSONAL INFORMATION -->
        <div class="martyr-form-section">
          <h3 class="martyr-form-section-title">
            <span><i class="fas fa-user"></i> A. Personal Information</span>
          </h3>

          <div class="martyr-photo-upload-row">
            <div class="martyr-photo-preview-box" id="mfProfilePhotoPreview">
              ${f.profilePhotoUrl ? `<img src="${esc(f.profilePhotoUrl)}" alt="Portrait Preview" />` : `<i class="fas fa-user"></i>`}
            </div>
            <div>
              <label class="form-label" style="display: block; font-weight: 700; margin-bottom: 6px;">Profile Photograph (Primary Memorial Portrait)</label>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <label class="btn-admin btn-admin-secondary" style="cursor: pointer; margin: 0; font-size: 0.8rem; padding: 7px 12px;">
                  <i class="fas fa-upload"></i> Upload Portrait
                  <input type="file" id="mfProfilePhotoInput" accept="image/*" style="display: none;" />
                </label>
                <button type="button" class="btn-admin btn-admin-secondary" id="btnMfRemovePortrait" style="font-size: 0.8rem; padding: 7px 12px; ${f.profilePhotoUrl ? '' : 'display:none;'}">
                  <i class="fas fa-times"></i> Remove
                </button>
                <span id="mfProfileUploadStatus" style="font-size: 0.78rem; color: #64748B;">WebP optimized automatically</span>
              </div>
            </div>
          </div>

          <div class="martyr-form-grid-3" style="margin-bottom: 14px;">
            <div>
              <label class="form-label" for="mfFullName">Full Name (English) <span style="color:#B91C1C;">*</span></label>
              <input type="text" id="mfFullName" class="form-control" required placeholder="e.g., Shaheed Ali Hassan" value="${esc(f.full_name)}" />
            </div>
            <div>
              <label class="form-label" for="mfFullNameUr">Full Name (Urdu – پورا نام اردو میں)</label>
              <input type="text" id="mfFullNameUr" class="form-control martyr-urdu" dir="rtl" placeholder="مثلاً شہید علی حسن" value="${esc(f.full_name_ur)}" />
            </div>
            <div>
              <label class="form-label" for="mfFatherName">Father's Name (English)</label>
              <input type="text" id="mfFatherName" class="form-control" placeholder="Father's full name (English)" value="${esc(f.father_name)}" />
            </div>
            <div>
              <label class="form-label" for="mfFatherNameUr">Father's Name (Urdu – والد کا نام اردو میں)</label>
              <input type="text" id="mfFatherNameUr" class="form-control martyr-urdu" dir="rtl" placeholder="والد کا نام اردو میں" value="${esc(f.father_name_ur)}" />
            </div>
            <div>
              <label class="form-label" for="mfMotherName">Mother's Name (English – Optional)</label>
              <input type="text" id="mfMotherName" class="form-control" placeholder="Mother's full name" value="${esc(f.mother_name)}" />
            </div>
            <div>
              <label class="form-label" for="mfMotherNameUr">Mother's Name (Urdu – والدہ کا نام اختیاری)</label>
              <input type="text" id="mfMotherNameUr" class="form-control martyr-urdu" dir="rtl" placeholder="والدہ کا نام (اختیاری)" value="${esc(f.mother_name_ur)}" />
            </div>

            <div>
              <label class="form-label" for="mfGender">Gender</label>
              <select id="mfGender" class="form-control">
                <option value="male" ${f.gender === 'male' ? 'selected' : ''}>Male</option>
                <option value="female" ${f.gender === 'female' ? 'selected' : ''}>Female</option>
                <option value="other" ${f.gender === 'other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="mfDob">Date of Birth</label>
              <input type="date" id="mfDob" class="form-control" value="${esc(f.date_of_birth)}" />
            </div>
            <div>
              <label class="form-label" for="mfDom">Date of Martyrdom / Death</label>
              <input type="date" id="mfDom" class="form-control" value="${esc(f.date_of_martyrdom)}" />
            </div>

            <div>
              <label class="form-label" for="mfAge">Age at Time of Death (Auto-Calculated)</label>
              <input type="number" id="mfAge" class="form-control" min="0" max="140" placeholder="Auto-calculated from dates" value="${esc(f.age_at_death)}" />
            </div>
            <div>
              <label class="form-label" for="mfStatus">Record Status</label>
              <select id="mfStatus" class="form-control">
                <option value="published" ${f.status === 'published' ? 'selected' : ''}>Published (Publicly Listed)</option>
                <option value="draft" ${f.status === 'draft' ? 'selected' : ''}>Draft (Hidden from Public)</option>
                <option value="archived" ${f.status === 'archived' ? 'selected' : ''}>Archived (Hidden from Public)</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="mfBirthLocationId">Place of Birth (Village / Town)</label>
              <div style="display:flex; gap:6px;">
                <select id="mfBirthLocationId" class="form-control">
                  <option value="">— Select from Locations (Optional) —</option>
                  ${birthLocOptions.map(l => `<option value="${l.id}" ${String(f.birth_location_id || '') === String(l.id) ? 'selected' : ''}>${esc(l.name_en)}${l.name_ur ? ` (${esc(l.name_ur)})` : ''}</option>`).join('')}
                </select>
                <input type="text" id="mfPlaceOfBirth" class="form-control" placeholder="Place of birth (EN)" value="${esc(f.place_of_birth)}" />
                <input type="text" id="mfPlaceOfBirthUr" class="form-control martyr-urdu" dir="rtl" placeholder="مقامِ پیدائش (اردو)" value="${esc(f.place_of_birth_ur)}" />
              </div>
            </div>

            <div>
              <label class="form-label" for="mfReligiousCommunity">Religious / Community Identity (If Documented)</label>
              <select id="mfReligiousCommunity" class="form-control">
                <option value="Not Specified" ${(f.religious_community || 'Not Specified') === 'Not Specified' ? 'selected' : ''}>Not Specified (Default)</option>
                <option value="Shia" ${f.religious_community === 'Shia' ? 'selected' : ''}>Shia (Only when explicitly documented)</option>
                <option value="Sunni" ${f.religious_community === 'Sunni' ? 'selected' : ''}>Sunni (Only when explicitly documented)</option>
                <option value="Other" ${f.religious_community === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="mfCommunitySourceNote">Community Source Citation Note</label>
              <input type="text" id="mfCommunitySourceNote" class="form-control" placeholder="Cite public report if community is specified" value="${esc(f.community_source_note || '')}" />
            </div>
            <div>
              <label class="form-label" for="mfVerificationStatus">Historical Verification Status</label>
              <select id="mfVerificationStatus" class="form-control">
                <option value="verified" ${(f.verification_status || 'verified') === 'verified' ? 'selected' : ''}>Verified</option>
                <option value="needs_review" ${f.verification_status === 'needs_review' ? 'selected' : ''}>Needs Review</option>
                <option value="unverified" ${f.verification_status === 'unverified' ? 'selected' : ''}>Unverified</option>
              </select>
            </div>
          </div>

          <div style="display:flex; gap:18px; flex-wrap:wrap; margin-bottom:14px; padding:10px 14px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:4px; font-size:0.82rem;">
            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; color:#1E293B;">
              <input type="checkbox" id="mfShowFatherPublic" ${f.show_father_name_public !== false ? 'checked' : ''} />
              Approve Father's Name for Public Website Display
            </label>
            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; color:#1E293B;">
              <input type="checkbox" id="mfShowHomePublic" ${f.show_home_location_public !== false ? 'checked' : ''} />
              Approve Home Village / Location for Public Website Display (Private street address is never exposed)
            </label>
          </div>

          <!-- RESIDENTIAL / HOME LOCATION (DEPENDENT HIERARCHICAL PICKER) -->
          <div class="martyr-loc-fieldset">
            <div class="martyr-loc-fieldset-head">
              <strong><i class="fas fa-house"></i> Residential Village / Home Location</strong>
              <button type="button" class="btn-admin btn-admin-secondary" id="btnMfAddResLoc" style="padding: 4px 10px; font-size: 0.74rem;">
                <i class="fas fa-plus"></i> Add New Location
              </button>
            </div>
            <div class="martyr-form-grid-3" style="margin-bottom: 10px;">
              <div><label class="form-label" for="mfResCountry">Country</label><select id="mfResCountry" class="form-control"></select></div>
              <div><label class="form-label" for="mfResProvince">Province</label><select id="mfResProvince" class="form-control"></select></div>
              <div><label class="form-label" for="mfResDistrict">District</label><select id="mfResDistrict" class="form-control"></select></div>
              <div><label class="form-label" for="mfResTehsil">Tehsil / Region</label><select id="mfResTehsil" class="form-control"></select></div>
              <div><label class="form-label" for="mfResVillageId">Home Village / Locality (Bilingual DB)</label><select id="mfResVillageId" class="form-control"></select></div>
              <div>
                <label class="form-label" for="mfCity">Home Village / Locality (English &amp; Urdu)</label>
                <div style="display:flex; gap:6px;">
                  <input type="text" id="mfCity" class="form-control" placeholder="Village (English)" value="${esc(f.city)}" />
                  <input type="text" id="mfCityUr" class="form-control martyr-urdu" dir="rtl" placeholder="آبائی گاؤں (اردو)" value="${esc(f.city_ur)}" />
                </div>
              </div>
            </div>
            <div>
              <label class="form-label" for="mfAddress">Complete Residential Address (Confidential · Admin Only)</label>
              <textarea id="mfAddress" class="form-control" rows="2" placeholder="House / Street / Mohallah / Area (never shown publicly)...">${esc(f.residential_address)}</textarea>
            </div>
          </div>

          <!-- PLACE OF MARTYRDOM / DEATH (SEPARATE DEPENDENT HIERARCHICAL PICKER) -->
          <div class="martyr-loc-fieldset" style="border-left: 3px solid #881337;">
            <div class="martyr-loc-fieldset-head">
              <strong><i class="fas fa-location-dot"></i> Place of Martyrdom / Death (Independent of Home Village)</strong>
              <button type="button" class="btn-admin btn-admin-secondary" id="btnMfAddMarLoc" style="padding: 4px 10px; font-size: 0.74rem;">
                <i class="fas fa-plus"></i> Add New Location
              </button>
            </div>
            <div class="martyr-form-grid-3">
              <div><label class="form-label" for="mfMarCountry">Country</label><select id="mfMarCountry" class="form-control"></select></div>
              <div><label class="form-label" for="mfMarProvince">Province</label><select id="mfMarProvince" class="form-control"></select></div>
              <div><label class="form-label" for="mfMarDistrict">District</label><select id="mfMarDistrict" class="form-control"></select></div>
              <div><label class="form-label" for="mfMarTehsil">Tehsil / Region</label><select id="mfMarTehsil" class="form-control"></select></div>
              <div><label class="form-label" for="mfMarVillageId">Martyrdom Village / Locality (Bilingual DB)</label><select id="mfMarVillageId" class="form-control"></select></div>
              <div>
                <label class="form-label" for="mfPlaceOfMartyrdom">Place of Martyrdom (English &amp; Urdu)</label>
                <div style="display:flex; gap:6px;">
                  <input type="text" id="mfPlaceOfMartyrdom" class="form-control" placeholder="Site (English)" value="${esc(f.place_of_martyrdom)}" />
                  <input type="text" id="mfPlaceOfMartyrdomUr" class="form-control martyr-urdu" dir="rtl" placeholder="مقامِ شہادت (اردو)" value="${esc(f.place_of_martyrdom_ur)}" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION B: WAR / CONFLICT ASSOCIATION -->
        <div class="martyr-form-section">
          <h3 class="martyr-form-section-title">
            <span><i class="fas fa-landmark"></i> B. War / Conflict Association</span>
            <button type="button" class="btn-admin btn-admin-secondary" id="btnMfInlineAddWar" style="font-size: 0.78rem; padding: 6px 12px;">
              <i class="fas fa-plus"></i> Add New War
            </button>
          </h3>

          <div class="martyr-form-grid-2">
            <div>
              <label class="form-label" for="mfWarSearchInput">Select Primary War / Conflict <span style="color:#B91C1C;">*</span></label>
              <div class="martyr-war-picker">
                <input type="hidden" id="mfPrimaryWarId" value="${f.primaryWarId || ''}" />
                <input type="text" id="mfWarSearchInput" class="form-control" autocomplete="off"
                  placeholder="Type to search existing wars or click to choose..."
                  value="${selectedWar ? esc(selectedWar.name) : ''}" />
                <div id="mfWarDropdown" class="martyr-war-dropdown" style="display: none;"></div>
              </div>
              <small style="color: #64748B; font-size: 0.74rem; display: block; margin-top: 4px;">
                Adding a new war via "+ Add New War" saves immediately and auto-selects it without clearing your form.
              </small>
            </div>

            <div>
              <label class="form-label" for="mfExtraWarSelect">Additional Associated Wars / Incidents (Optional)</label>
              <div style="display: flex; gap: 6px;">
                <select id="mfExtraWarSelect" class="form-control">
                  <option value="">— Link an additional war/incident —</option>
                  ${state.warsList.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}
                </select>
                <button type="button" class="btn-admin btn-admin-secondary" id="btnMfAddExtraWar" style="padding: 6px 12px;">Link</button>
              </div>
              <div id="mfExtraWarsChips" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;"></div>
            </div>
          </div>
        </div>

        <!-- SECTION C: BILINGUAL BIOGRAPHY / RICH-TEXT ARTICLES (ENGLISH LTR + URDU RTL) -->
        <div class="martyr-form-section">
          <h3 class="martyr-form-section-title">
            <span><i class="fas fa-feather-pointed"></i> C. Biography &amp; Historical Article (Bilingual English &amp; Urdu)</span>
            <span id="mfLangCompletenessBadge" style="font-size:0.74rem; font-weight:700; padding:3px 9px; border-radius:4px; background:#EFF6FF; color:#1E40AF;">
              Both languages optional · Missing language uses automatic public fallback
            </span>
          </h3>

          <div class="martyr-form-grid-2">
            <!-- English Biography Rich-Text Editor (LTR) -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label class="form-label" style="margin:0;">Biography (English · LTR)</label>
                <span style="font-size:0.72rem; color:#64748B;">Optional if Urdu is provided</span>
              </div>
              <div class="martyr-editor-toolbar" id="mfBioToolbar">
                <button type="button" data-cmd="formatBlock" data-val="H2" title="Heading 2">H2</button>
                <button type="button" data-cmd="formatBlock" data-val="H3" title="Heading 3">H3</button>
                <button type="button" data-cmd="formatBlock" data-val="P" title="Paragraph">P</button>
                <button type="button" data-cmd="bold" title="Bold"><i class="fas fa-bold"></i></button>
                <button type="button" data-cmd="italic" title="Italic"><i class="fas fa-italic"></i></button>
                <button type="button" data-cmd="underline" title="Underline"><i class="fas fa-underline"></i></button>
                <button type="button" data-cmd="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
                <button type="button" data-cmd="formatBlock" data-val="BLOCKQUOTE" title="Quote"><i class="fas fa-quote-right"></i></button>
                <button type="button" data-cmd="removeFormat" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
              </div>
              <div id="mfBiographyEditor" class="martyr-editor-area" contenteditable="true" dir="ltr">${f.biography_html || ''}</div>
            </div>

            <!-- Urdu Biography Rich-Text Editor (RTL Nastaliq) -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label class="form-label" style="margin:0;">Biography (Urdu · سوانحِ حیات اردو میں · RTL)</label>
                <span style="font-size:0.72rem; color:#64748B;">Optional if English is provided</span>
              </div>
              <div class="martyr-editor-toolbar" id="mfBioUrToolbar">
                <button type="button" data-cmd="formatBlock" data-val="H2" title="Heading 2">H2</button>
                <button type="button" data-cmd="formatBlock" data-val="H3" title="Heading 3">H3</button>
                <button type="button" data-cmd="formatBlock" data-val="P" title="Paragraph">P</button>
                <button type="button" data-cmd="bold" title="Bold"><i class="fas fa-bold"></i></button>
                <button type="button" data-cmd="italic" title="Italic"><i class="fas fa-italic"></i></button>
                <button type="button" data-cmd="underline" title="Underline"><i class="fas fa-underline"></i></button>
                <button type="button" data-cmd="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
                <button type="button" data-cmd="formatBlock" data-val="BLOCKQUOTE" title="Quote"><i class="fas fa-quote-right"></i></button>
                <button type="button" data-cmd="removeFormat" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
              </div>
              <div id="mfBiographyUrEditor" class="martyr-editor-area martyr-urdu" contenteditable="true" dir="rtl">${f.biography_ur || ''}</div>
            </div>
          </div>
        </div>

        <!-- SECTION D: MEMORIAL PHOTO GALLERY -->
        <div class="martyr-form-section">
          <h3 class="martyr-form-section-title">
            <span><i class="fas fa-images"></i> D. Memorial Photo Gallery</span>
            <label class="btn-admin btn-admin-secondary" style="cursor: pointer; margin: 0; font-size: 0.78rem; padding: 6px 12px;">
              <i class="fas fa-cloud-arrow-up"></i> Upload Gallery Photos
              <input type="file" id="mfGalleryInput" accept="image/*" multiple style="display: none;" />
            </label>
          </h3>
          <div id="mfGalleryEditList" class="martyr-gallery-edit-list"></div>
        </div>

        <!-- SECTION D2: PRIMARY SOURCE REFERENCE (PUBLIC NEWS / OFFICIAL ROSTER) -->
        <div class="martyr-form-section">
          <h3 class="martyr-form-section-title">
            <span><i class="fas fa-newspaper"></i> D2. Historical Source Citation (Public News / Official Record)</span>
          </h3>
          <div class="martyr-form-grid-3">
            <div>
              <label class="form-label" for="mfSrcTitle">Source Title / Headline</label>
              <input type="text" id="mfSrcTitle" class="form-control" placeholder="e.g., Dawn / Hospital Roster Report" value="${esc((f.sources && f.sources[0] && f.sources[0].source_title) || '')}" />
            </div>
            <div>
              <label class="form-label" for="mfSrcPublisher">Publisher / Organization</label>
              <input type="text" id="mfSrcPublisher" class="form-control" placeholder="e.g., Dawn, The Express Tribune, CPJ" value="${esc((f.sources && f.sources[0] && f.sources[0].publisher) || '')}" />
            </div>
            <div>
              <label class="form-label" for="mfSrcUrl">Source URL (Optional)</label>
              <input type="url" id="mfSrcUrl" class="form-control" placeholder="https://www.dawn.com/news/..." value="${esc((f.sources && f.sources[0] && f.sources[0].source_url) || '')}" />
            </div>
            <div>
              <label class="form-label" for="mfSrcPubDate">Publication Date</label>
              <input type="date" id="mfSrcPubDate" class="form-control" value="${esc(toInputDate(f.sources && f.sources[0] && f.sources[0].publication_date))}" />
            </div>
            <div style="grid-column: span 2;">
              <label class="form-label" for="mfSrcNotes">Source Notes / Verification Summary</label>
              <input type="text" id="mfSrcNotes" class="form-control" placeholder="Quote or summary confirming victim's name, father's name, and locality" value="${esc((f.sources && f.sources[0] && f.sources[0].source_notes) || '')}" />
            </div>
          </div>
        </div>

        <!-- SECTION E: FAMILY INFORMATION & CONTACTS (OPTIONAL / PERMISSION PROTECTED) -->
        <div class="martyr-form-section">
          <h3 class="martyr-form-section-title">
            <span><i class="fas fa-address-book"></i> E. Family Information &amp; Contacts (Optional · Confidential)</span>
            ${state.summary.can_manage_family ? `
              <button type="button" class="btn-admin btn-admin-secondary" id="btnMfAddFamily" style="font-size: 0.78rem; padding: 6px 12px;">
                <i class="fas fa-plus"></i> Add Family Member
              </button>
            ` : ''}
          </h3>
          ${!state.summary.can_manage_family ? `
            <div class="martyr-privacy-notice">
              <i class="fas fa-lock" style="margin-right: 6px;"></i>
              You do not have permission to view or edit private family contact details. Request <strong>Martyrs Family Contacts</strong> access from an administrator if required.
            </div>
          ` : `
            <div id="mfFamilyRowsContainer"></div>
          `}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
          <button type="button" class="btn-admin btn-admin-secondary" onclick="window.switchAdminTab('martyrs-all')">Cancel</button>
          <button type="submit" class="btn-admin btn-admin-primary" id="btnMfSubmit">
            <i class="fas fa-save"></i> ${isEdit ? 'Update Martyr Profile' : 'Save Martyr Profile'}
          </button>
        </div>
      </form>
    `;

    bindMartyrFormEvents();
    renderExtraWarChips();
    renderGalleryEditList();
    if (state.summary.can_manage_family) renderFamilyRows();
  }

  function bindMartyrFormEvents() {
    const f = state.formState;

    // Wire Residential Home Dependent Location Picker
    const refreshResPicker = wireDependentLocationGroup('mfRes', {
      country: f.country_of_residence || 'Pakistan',
      province: f.province_state || 'Khyber Pakhtunkhwa',
      district: f.district || 'Kurram District',
      tehsil: f.residence_tehsil || '',
      location_id: f.residence_location_id || ''
    }, loc => {
      document.getElementById('mfCity').value = loc.name_en;
      if (loc.name_ur && document.getElementById('mfCityUr')) {
        document.getElementById('mfCityUr').value = loc.name_ur;
      }
    });

    // Wire Martyrdom Place Dependent Location Picker
    const refreshMarPicker = wireDependentLocationGroup('mfMar', {
      country: f.country || 'Pakistan',
      province: f.martyrdom_province || 'Khyber Pakhtunkhwa',
      district: f.martyrdom_district || 'Kurram District',
      tehsil: f.martyrdom_tehsil || '',
      location_id: f.martyrdom_location_id || ''
    }, loc => {
      document.getElementById('mfPlaceOfMartyrdom').value = loc.name_en;
      if (loc.name_ur && document.getElementById('mfPlaceOfMartyrdomUr')) {
        document.getElementById('mfPlaceOfMartyrdomUr').value = loc.name_ur;
      }
    });

    // Birth location dropdown auto-fills text input
    const birthSel = document.getElementById('mfBirthLocationId');
    if (birthSel) {
      birthSel.addEventListener('change', () => {
        const loc = state.locationsFlat.find(x => String(x.id) === String(birthSel.value));
        if (loc) {
          document.getElementById('mfPlaceOfBirth').value = loc.name_en;
          if (loc.name_ur && document.getElementById('mfPlaceOfBirthUr')) {
            document.getElementById('mfPlaceOfBirthUr').value = loc.name_ur;
          }
        }
      });
    }

    // Inline "+ Add New Location" for Residential & Martyrdom without losing form state!
    const refreshBirthSelect = () => {
      if (!birthSel) return;
      const cur = birthSel.value;
      const opts = state.locationsFlat.filter(l => ['Town', 'Village', 'Area', 'Locality'].includes(l.location_type));
      birthSel.innerHTML = `<option value="">— Select from Locations (Optional) —</option>`
        + opts.map(l => `<option value="${l.id}" ${String(l.id) === String(cur) ? 'selected' : ''}>${esc(l.name_en)}${l.tehsil ? ` · ${esc(l.tehsil)}` : ''}</option>`).join('');
    };

    document.getElementById('btnMfAddResLoc').addEventListener('click', () => {
      openLocationModal({
        district: document.getElementById('mfResDistrict').value || 'Kurram District',
        tehsil: document.getElementById('mfResTehsil').value || '',
        onSaved: newLoc => {
          refreshResPicker(newLoc);
          refreshMarPicker();
          refreshBirthSelect();
        }
      });
    });

    document.getElementById('btnMfAddMarLoc').addEventListener('click', () => {
      openLocationModal({
        district: document.getElementById('mfMarDistrict').value || 'Kurram District',
        tehsil: document.getElementById('mfMarTehsil').value || '',
        onSaved: newLoc => {
          refreshMarPicker(newLoc);
          refreshResPicker();
          refreshBirthSelect();
        }
      });
    });

    // Portrait Upload
    const portraitInput = document.getElementById('mfProfilePhotoInput');
    const removeBtn = document.getElementById('btnMfRemovePortrait');
    if (portraitInput) {
      portraitInput.addEventListener('change', async () => {
        const file = portraitInput.files && portraitInput.files[0];
        if (!file) return;
        const st = document.getElementById('mfProfileUploadStatus');
        st.textContent = 'Uploading & optimizing...';
        try {
          const url = await uploadImageFile(file, 'martyrs');
          f.profilePhotoUrl = url;
          document.getElementById('mfProfilePhotoPreview').innerHTML = `<img src="${esc(url)}" alt="Portrait" />`;
          removeBtn.style.display = '';
          st.textContent = 'Uploaded (WebP)';
        } catch (err) {
          st.textContent = 'Upload failed';
          notify(err.message, 'error');
        } finally {
          portraitInput.value = '';
        }
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        f.profilePhotoUrl = '';
        document.getElementById('mfProfilePhotoPreview').innerHTML = `<i class="fas fa-user"></i>`;
        removeBtn.style.display = 'none';
      });
    }

    // Auto-calculate Age at Death
    const dobEl = document.getElementById('mfDob');
    const domEl = document.getElementById('mfDom');
    const ageEl = document.getElementById('mfAge');
    const recalcAge = () => {
      const calc = computeAge(dobEl.value, domEl.value);
      if (calc !== '') ageEl.value = calc;
    };
    dobEl.addEventListener('change', recalcAge);
    domEl.addEventListener('change', () => { recalcAge(); scheduleDuplicateCheck(); });

    // Live Duplicate Check
    document.getElementById('mfFullName').addEventListener('input', scheduleDuplicateCheck);
    document.getElementById('mfFatherName').addEventListener('input', scheduleDuplicateCheck);

    // Searchable War Dropdown
    const warInput = document.getElementById('mfWarSearchInput');
    const warDrop = document.getElementById('mfWarDropdown');
    const warHidden = document.getElementById('mfPrimaryWarId');

    const renderWarDropdown = (q = '') => {
      const needle = String(q || '').toLowerCase().trim();
      const filtered = state.warsList.filter(w => {
        if (!needle) return true;
        return (w.name || '').toLowerCase().includes(needle)
          || (w.reference_code || '').toLowerCase().includes(needle)
          || (w.location || '').toLowerCase().includes(needle)
          || (w.district || '').toLowerCase().includes(needle);
      });

      if (!filtered.length) {
        warDrop.innerHTML = `<div class="martyr-war-dropdown-item" style="color:#64748B;">No matching wars found. Click "+ Add New War" to create one.</div>`;
      } else {
        warDrop.innerHTML = filtered.map(w => `
          <div class="martyr-war-dropdown-item ${Number(w.id) === Number(f.primaryWarId) ? 'selected' : ''}" data-war-id="${w.id}">
            <div style="font-weight: 700;">${esc(w.name)}</div>
            <div style="font-size: 0.74rem; color: #64748B;">
              ${esc([w.reference_code, w.location, w.district].filter(Boolean).join(' · '))} · ${Number(w.total_martyrs) || 0} martyrs
            </div>
          </div>
        `).join('');
        warDrop.querySelectorAll('.martyr-war-dropdown-item[data-war-id]').forEach(item => {
          item.addEventListener('mousedown', e => {
            e.preventDefault();
            const wid = Number(item.dataset.warId);
            const chosen = state.warsList.find(x => Number(x.id) === wid);
            if (chosen) {
              f.primaryWarId = wid;
              warHidden.value = String(wid);
              warInput.value = chosen.name;
              warDrop.style.display = 'none';
            }
          });
        });
      }
      warDrop.style.display = 'block';
    };

    warInput.addEventListener('focus', () => renderWarDropdown(warInput.value));
    warInput.addEventListener('input', () => {
      f.primaryWarId = null;
      warHidden.value = '';
      renderWarDropdown(warInput.value);
    });
    warInput.addEventListener('blur', () => {
      setTimeout(() => { warDrop.style.display = 'none'; }, 160);
    });

    // Inline + Add New War WITHOUT losing form state
    document.getElementById('btnMfInlineAddWar').addEventListener('click', () => {
      openWarModal(null, async createdWar => {
        await fetchAllWarsForPicker();
        if (createdWar && createdWar.id) {
          f.primaryWarId = Number(createdWar.id);
          warHidden.value = String(createdWar.id);
          warInput.value = createdWar.name;
          const extraSel = document.getElementById('mfExtraWarSelect');
          if (extraSel) {
            extraSel.innerHTML = `<option value="">— Link an additional war/incident —</option>`
              + state.warsList.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('');
          }
          notify(`War "${createdWar.name}" created and selected.`, 'success');
        }
      });
    });

    // Additional Wars
    document.getElementById('btnMfAddExtraWar').addEventListener('click', () => {
      const sel = document.getElementById('mfExtraWarSelect');
      const wid = Number(sel.value);
      if (!wid) return;
      if (wid === Number(f.primaryWarId)) {
        notify('This war is already selected as the Primary War.', 'error');
        return;
      }
      if (!f.additionalWarIds.includes(wid)) {
        f.additionalWarIds.push(wid);
        renderExtraWarChips();
      }
      sel.value = '';
    });

    // Biography Rich-Text Toolbars (English LTR + Urdu RTL) & Live Bilingual Completeness Indicator
    const bioEditor = document.getElementById('mfBiographyEditor');
    const bioUrEditor = document.getElementById('mfBiographyUrEditor');
    document.querySelectorAll('#mfBioToolbar button').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        bioEditor.focus();
        document.execCommand(btn.dataset.cmd, false, btn.dataset.val || null);
      });
    });
    document.querySelectorAll('#mfBioUrToolbar button').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        bioUrEditor.focus();
        document.execCommand(btn.dataset.cmd, false, btn.dataset.val || null);
      });
    });

    const updateLangBadge = () => {
      const badge = document.getElementById('mfLangCompletenessBadge');
      if (!badge) return;
      const hasEn = Boolean((document.getElementById('mfFullName')?.value || '').trim() || (bioEditor?.innerText || '').trim());
      const hasUr = Boolean((document.getElementById('mfFullNameUr')?.value || '').trim() || (bioUrEditor?.innerText || '').trim());
      if (hasEn && hasUr) {
        badge.textContent = 'EN + اردو Bilingual Content Complete';
        badge.style.background = '#DCFCE7';
        badge.style.color = '#166534';
      } else if (hasEn && !hasUr) {
        badge.textContent = 'English Provided · Missing Urdu (اردو Optional)';
        badge.style.background = '#FEF3C7';
        badge.style.color = '#92400E';
      } else if (!hasEn && hasUr) {
        badge.textContent = 'Urdu (اردو) Provided · Missing English (Optional)';
        badge.style.background = '#FEF3C7';
        badge.style.color = '#92400E';
      } else {
        badge.textContent = 'Both languages optional · Missing language uses automatic public fallback';
        badge.style.background = '#EFF6FF';
        badge.style.color = '#1E40AF';
      }
    };
    ['mfFullName', 'mfFullNameUr'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateLangBadge);
    });
    if (bioEditor) bioEditor.addEventListener('input', updateLangBadge);
    if (bioUrEditor) bioUrEditor.addEventListener('input', updateLangBadge);
    updateLangBadge();

    // Gallery Multi-Upload
    const galleryInput = document.getElementById('mfGalleryInput');
    galleryInput.addEventListener('change', async () => {
      const files = Array.from(galleryInput.files || []);
      if (!files.length) return;
      for (const file of files) {
        try {
          const url = await uploadImageFile(file, 'martyrs');
          f.photos.push({ image_url: url, caption: '' });
          renderGalleryEditList();
        } catch (err) {
          notify(`Failed uploading ${file.name}: ${err.message}`, 'error');
        }
      }
      galleryInput.value = '';
    });

    // Add Family Member Row
    const addFamBtn = document.getElementById('btnMfAddFamily');
    if (addFamBtn) {
      addFamBtn.addEventListener('click', () => {
        syncFamilyRowsFromDom();
        f.family_members.push({
          full_name: '',
          relationship: 'Father',
          contact_number: '',
          email: '',
          residential_address: '',
          notes: ''
        });
        renderFamilyRows();
      });
    }

    document.getElementById('martyrProfileForm').addEventListener('submit', handleMartyrFormSubmit);
  }

  function scheduleDuplicateCheck() {
    clearTimeout(state.dupTimer);
    state.dupTimer = setTimeout(async () => {
      const nameEl = document.getElementById('mfFullName');
      const fatherEl = document.getElementById('mfFatherName');
      const domEl = document.getElementById('mfDom');
      const banner = document.getElementById('mfDupBanner');
      if (!nameEl || !banner) return;

      const fullName = nameEl.value.trim();
      if (fullName.length < 3) {
        banner.style.display = 'none';
        return;
      }
      try {
        const qs = new URLSearchParams({
          full_name: fullName,
          father_name: (fatherEl && fatherEl.value.trim()) || '',
          date_of_martyrdom: (domEl && domEl.value) || '',
          exclude_id: String(state.formState.editId || 0)
        });
        const data = await apiFetch(`/check-duplicate?${qs.toString()}`);
        const matches = data.matches || [];
        if (!matches.length) {
          banner.style.display = 'none';
          return;
        }
        banner.innerHTML = `
          <strong><i class="fas fa-triangle-exclamation"></i> Possible Duplicate Record Detected:</strong>
          <ul style="margin: 6px 0 0 18px; padding: 0;">
            ${matches.map(m => `
              <li>
                <strong>${esc(m.full_name)}</strong> ${m.father_name ? `(S/O ${esc(m.father_name)})` : ''} — ${esc(m.war_name || '—')} (${fmtDate(m.date_of_martyrdom)})
                <a href="#" style="color:#881337; font-weight:700; margin-left:6px;" onclick="event.preventDefault(); window.QSFMartyrs.openMartyrProfile(${m.id})">View Profile</a>
              </li>
            `).join('')}
          </ul>
        `;
        banner.style.display = 'block';
      } catch (_) {}
    }, 350);
  }

  function renderExtraWarChips() {
    const box = document.getElementById('mfExtraWarsChips');
    if (!box) return;
    const ids = state.formState.additionalWarIds || [];
    if (!ids.length) {
      box.innerHTML = `<span style="font-size: 0.74rem; color: #94A3B8;">No additional incidents linked.</span>`;
      return;
    }
    box.innerHTML = ids.map(id => {
      const w = state.warsList.find(x => Number(x.id) === Number(id));
      const label = w ? w.name : `War #${id}`;
      return `
        <span style="display:inline-flex; align-items:center; gap:6px; background:#FFF1F2; color:#881337; border:1px solid #FECDD3; padding:3px 9px; border-radius:3px; font-size:0.76rem; font-weight:700;">
          ${esc(label)}
          <button type="button" style="border:none; background:none; color:#881337; cursor:pointer; font-weight:800; padding:0;" onclick="window.QSFMartyrs.removeExtraWar(${id})">&times;</button>
        </span>
      `;
    }).join('');
  }

  function removeExtraWar(id) {
    state.formState.additionalWarIds = (state.formState.additionalWarIds || []).filter(x => Number(x) !== Number(id));
    renderExtraWarChips();
  }

  function renderGalleryEditList() {
    const box = document.getElementById('mfGalleryEditList');
    if (!box) return;
    const photos = state.formState.photos || [];
    if (!photos.length) {
      box.innerHTML = `<div style="grid-column: 1 / -1; font-size: 0.82rem; color: #94A3B8;">No gallery photos added yet. Upload multiple images above.</div>`;
      return;
    }
    window.__qsfFormGalleryPhotos = photos;
    box.innerHTML = photos.map((p, idx) => `
      <div class="martyr-gallery-edit-item" data-idx="${idx}">
        <img src="${esc(p.image_url)}" alt="Gallery Photo ${idx + 1}" onclick="window.QSFMartyrs.openLightbox(window.__qsfFormGalleryPhotos, ${idx})" />
        <div class="martyr-gallery-edit-controls">
          <input type="text" class="form-control mf-photo-caption" data-idx="${idx}" placeholder="Caption (optional)" value="${esc(p.caption || '')}" style="height: 30px; font-size: 0.78rem;" />
          <div style="display: flex; justify-content: space-between; gap: 4px;">
            <div>
              <button type="button" class="btn-admin btn-admin-secondary" style="padding: 3px 7px; font-size: 0.72rem;" ${idx === 0 ? 'disabled' : ''} onclick="window.QSFMartyrs.moveFormPhoto(${idx}, -1)" title="Move Earlier"><i class="fas fa-arrow-left"></i></button>
              <button type="button" class="btn-admin btn-admin-secondary" style="padding: 3px 7px; font-size: 0.72rem;" ${idx === photos.length - 1 ? 'disabled' : ''} onclick="window.QSFMartyrs.moveFormPhoto(${idx}, 1)" title="Move Later"><i class="fas fa-arrow-right"></i></button>
            </div>
            <button type="button" class="btn-admin btn-admin-danger" style="padding: 3px 8px; font-size: 0.72rem;" onclick="window.QSFMartyrs.removeFormPhoto(${idx})" title="Remove Photo"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('');

    box.querySelectorAll('.mf-photo-caption').forEach(inp => {
      inp.addEventListener('input', () => {
        const i = Number(inp.dataset.idx);
        if (state.formState.photos[i]) state.formState.photos[i].caption = inp.value;
      });
    });
  }

  function moveFormPhoto(idx, delta) {
    const arr = state.formState.photos;
    const target = idx + delta;
    if (target < 0 || target >= arr.length) return;
    const tmp = arr[idx];
    arr[idx] = arr[target];
    arr[target] = tmp;
    renderGalleryEditList();
  }

  function removeFormPhoto(idx) {
    state.formState.photos.splice(idx, 1);
    renderGalleryEditList();
  }

  function syncFamilyRowsFromDom() {
    const rows = document.querySelectorAll('#mfFamilyRowsContainer .martyr-family-row');
    if (!rows.length) return;
    state.formState.family_members = Array.from(rows).map(r => ({
      full_name: r.querySelector('.mff-name').value.trim(),
      relationship: r.querySelector('.mff-rel').value,
      contact_number: r.querySelector('.mff-phone').value.trim(),
      email: r.querySelector('.mff-email').value.trim(),
      residential_address: r.querySelector('.mff-address').value.trim(),
      notes: r.querySelector('.mff-notes').value.trim()
    }));
  }

  function renderFamilyRows() {
    const box = document.getElementById('mfFamilyRowsContainer');
    if (!box) return;
    const list = state.formState.family_members || [];
    if (!list.length) {
      box.innerHTML = `<p style="font-size: 0.82rem; color: #94A3B8; margin: 0;">No family contacts added. Click "+ Add Family Member" to record private family contact details.</p>`;
      return;
    }
    box.innerHTML = list.map((fm, idx) => `
      <div class="martyr-family-row" data-fam-idx="${idx}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <strong style="font-size: 0.8rem; color: #881337;">Family Member #${idx + 1}</strong>
          <button type="button" class="btn-admin btn-admin-danger" style="padding: 3px 8px; font-size: 0.72rem;" onclick="window.QSFMartyrs.removeFamilyRow(${idx})">
            <i class="fas fa-trash"></i> Remove
          </button>
        </div>
        <div class="martyr-form-grid-3">
          <div>
            <label class="form-label">Full Name</label>
            <input type="text" class="form-control mff-name" placeholder="Family member name" value="${esc(fm.full_name)}" />
          </div>
          <div>
            <label class="form-label">Relationship</label>
            <select class="form-control mff-rel">
              ${RELATIONSHIPS.map(rel => `<option value="${rel}" ${fm.relationship === rel ? 'selected' : ''}>${rel}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Contact Number</label>
            <input type="text" class="form-control mff-phone" placeholder="+92 300 0000000" value="${esc(fm.contact_number)}" />
          </div>
          <div>
            <label class="form-label">Email (Optional)</label>
            <input type="email" class="form-control mff-email" placeholder="email@example.com" value="${esc(fm.email)}" />
          </div>
          <div>
            <label class="form-label">Residential Address</label>
            <input type="text" class="form-control mff-address" placeholder="Address" value="${esc(fm.residential_address)}" />
          </div>
          <div>
            <label class="form-label">Notes (Optional)</label>
            <input type="text" class="form-control mff-notes" placeholder="Additional context or welfare notes" value="${esc(fm.notes)}" />
          </div>
        </div>
      </div>
    `).join('');
  }

  function removeFamilyRow(idx) {
    syncFamilyRowsFromDom();
    state.formState.family_members.splice(idx, 1);
    renderFamilyRows();
  }

  async function handleMartyrFormSubmit(e) {
    e.preventDefault();
    const f = state.formState;
    const submitBtn = document.getElementById('btnMfSubmit');

    const fullName = document.getElementById('mfFullName').value.trim();
    const fullNameUr = document.getElementById('mfFullNameUr') ? document.getElementById('mfFullNameUr').value.trim() : '';
    const primaryWarId = Number(document.getElementById('mfPrimaryWarId').value || f.primaryWarId || 0);
    if (!fullName && !fullNameUr) {
      notify('Full Name (English or Urdu) is required.', 'error');
      document.getElementById('mfFullName').focus();
      return;
    }
    if (!primaryWarId) {
      notify('Please select an associated War / Conflict (or click "+ Add New War").', 'error');
      document.getElementById('mfWarSearchInput').focus();
      return;
    }

    if (state.summary.can_manage_family) syncFamilyRowsFromDom();

    const payload = {
      full_name: fullName || fullNameUr,
      full_name_ur: fullNameUr || null,
      profile_photo_url: f.profilePhotoUrl || null,
      father_name: document.getElementById('mfFatherName').value.trim(),
      father_name_ur: document.getElementById('mfFatherNameUr') ? document.getElementById('mfFatherNameUr').value.trim() : '',
      mother_name: document.getElementById('mfMotherName').value.trim(),
      mother_name_ur: document.getElementById('mfMotherNameUr') ? document.getElementById('mfMotherNameUr').value.trim() : '',
      gender: document.getElementById('mfGender').value,
      date_of_birth: document.getElementById('mfDob').value || null,
      date_of_martyrdom: document.getElementById('mfDom').value || null,
      age_at_death: document.getElementById('mfAge').value,
      // Birth
      birth_location_id: Number(document.getElementById('mfBirthLocationId').value) || null,
      place_of_birth: document.getElementById('mfPlaceOfBirth').value.trim(),
      place_of_birth_ur: document.getElementById('mfPlaceOfBirthUr') ? document.getElementById('mfPlaceOfBirthUr').value.trim() : '',
      // Residential Home
      residence_location_id: Number(document.getElementById('mfResVillageId').value) || null,
      country_of_residence: document.getElementById('mfResCountry').value,
      province_state: document.getElementById('mfResProvince').value,
      district: document.getElementById('mfResDistrict').value,
      residence_tehsil: document.getElementById('mfResTehsil').value,
      city: document.getElementById('mfCity').value.trim(),
      city_ur: document.getElementById('mfCityUr') ? document.getElementById('mfCityUr').value.trim() : '',
      residential_address: document.getElementById('mfAddress').value.trim(),
      // Place of Martyrdom
      martyrdom_location_id: Number(document.getElementById('mfMarVillageId').value) || null,
      country: document.getElementById('mfMarCountry').value,
      martyrdom_province: document.getElementById('mfMarProvince').value,
      martyrdom_district: document.getElementById('mfMarDistrict').value,
      martyrdom_tehsil: document.getElementById('mfMarTehsil').value,
      place_of_martyrdom: document.getElementById('mfPlaceOfMartyrdom').value.trim(),
      place_of_martyrdom_ur: document.getElementById('mfPlaceOfMartyrdomUr') ? document.getElementById('mfPlaceOfMartyrdomUr').value.trim() : '',
      // War & Content
      primary_war_id: primaryWarId,
      additional_war_ids: f.additionalWarIds || [],
      biography_html: document.getElementById('mfBiographyEditor').innerHTML,
      biography_ur: document.getElementById('mfBiographyUrEditor') ? document.getElementById('mfBiographyUrEditor').innerHTML : '',
      biography_dir: f.biography_dir || 'auto',
      religious_community: document.getElementById('mfReligiousCommunity') ? document.getElementById('mfReligiousCommunity').value : 'Not Specified',
      community_source_note: document.getElementById('mfCommunitySourceNote') ? document.getElementById('mfCommunitySourceNote').value.trim() : '',
      verification_status: document.getElementById('mfVerificationStatus') ? document.getElementById('mfVerificationStatus').value : 'verified',
      show_father_name_public: document.getElementById('mfShowFatherPublic') ? document.getElementById('mfShowFatherPublic').checked : true,
      show_home_location_public: document.getElementById('mfShowHomePublic') ? document.getElementById('mfShowHomePublic').checked : true,
      status: document.getElementById('mfStatus').value,
      photos: f.photos || [],
      sources: (() => {
        const st = document.getElementById('mfSrcTitle') ? document.getElementById('mfSrcTitle').value.trim() : '';
        if (!st) return f.sources && f.sources.length ? f.sources : undefined;
        const primarySrc = {
          source_title: st,
          publisher: document.getElementById('mfSrcPublisher').value.trim(),
          source_url: document.getElementById('mfSrcUrl').value.trim(),
          publication_date: document.getElementById('mfSrcPubDate').value || null,
          incident_date: document.getElementById('mfDom').value || null,
          source_notes: document.getElementById('mfSrcNotes').value.trim(),
          verification_status: 'confirmed'
        };
        const rest = Array.isArray(f.sources) ? f.sources.slice(1) : [];
        return [primarySrc, ...rest];
      })(),
      family_members: state.summary.can_manage_family ? (f.family_members || []).filter(x => x.full_name) : undefined
    };

    submitBtn.disabled = true;
    try {
      const res = f.editId
        ? await apiFetch(`/profile/${f.editId}`, { method: 'PUT', body: payload })
        : await apiFetch('/profile', { method: 'POST', body: payload });

      notify(res.message || 'Martyr profile saved.', 'success');
      state.formState = createEmptyFormState();
      await fetchAllWarsForPicker();
      await openMartyrProfile(res.id);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  }

  // =========================================================================
  // 4. UPGRADED ADD / EDIT WAR MODAL (CATEGORY, REASON/CAUSE, MULTIPLE LOCATIONS)
  // =========================================================================
  async function openWarModal(editWarId = null, onSavedCallback = null) {
    const modal = document.getElementById('modalMartyrWar');
    const titleEl = document.getElementById('martyrWarModalTitle');
    const bodyEl = document.getElementById('martyrWarModalBody');
    if (!modal || !bodyEl) return;

    if (!state.locationsFlat.length) await fetchLocationsFlat();
    if (!state.warsList.length) await fetchAllWarsForPicker();

    state.warModalState = createEmptyWarModalState();
    state.warModalState.onSaved = typeof onSavedCallback === 'function' ? onSavedCallback : null;

    let warData = {
      name: '', reference_code: '', category: 'Conflict Episode', parent_war_id: null, location: '', country: 'Pakistan',
      province: 'Khyber Pakhtunkhwa', district: 'Kurram District', tehsil: '', primary_location_id: null,
      start_date: '', end_date: '', short_description: '', reason_cause: '', reason_source: '',
      historical_background: '', detailed_article: '', background_dir: 'auto',
      reported_casualties: '', reported_injuries: '', casualty_status: 'confirmed', casualty_notes: '',
      ceasefire_info: '', verification_status: 'verified', cover_image_url: '', status: 'active'
    };
    let warSources = [];

    modal.classList.remove('hidden');

    if (editWarId) {
      titleEl.innerHTML = `<i class="fas fa-landmark"></i> Edit War / Historical Incident`;
      bodyEl.innerHTML = `<div style="padding: 28px; text-align: center; color: #64748B;"><i class="fas fa-circle-notch fa-spin"></i> Loading war details...</div>`;
      try {
        const res = await apiFetch(`/wars/${editWarId}`);
        warData = res.war;
        warSources = res.sources || [];
        state.warModalState.editId = Number(editWarId);
        state.warModalState.cover_image_url = warData.cover_image_url || '';
        state.warModalState.background_dir = warData.background_dir || 'auto';
        state.warModalState.primary_location_id = warData.primary_location_id || null;
        state.warModalState.affected_location_ids = (res.affected_locations || []).map(x => Number(x.id));
        state.warModalState.images = (res.images || []).map(i => ({ image_url: i.image_url, caption: i.caption || '' }));
        state.warModalState.sources = warSources;
      } catch (err) {
        bodyEl.innerHTML = `<p style="color:#991B1B;">${esc(err.message)}</p>`;
        return;
      }
    } else {
      titleEl.innerHTML = `<i class="fas fa-landmark"></i> Add New War / Historical Incident`;
    }

    const bgDir = resolveDir(state.warModalState.background_dir, warData.historical_background || '');
    const allVillages = state.locationsFlat.filter(l => ['Tehsil', 'Town', 'Village', 'Area', 'Locality'].includes(l.location_type));
    const parentCandidates = (state.warsList || []).filter(w => Number(w.id) !== Number(editWarId || 0));
    const firstSrc = warSources[0] || {};

    bodyEl.innerHTML = `
      <form id="martyrWarModalForm" novalidate>
        <div class="martyr-form-grid-3" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="mwName">War / Conflict Name (English) <span style="color:#B91C1C;">*</span></label>
            <input type="text" id="mwName" class="form-control" required placeholder="e.g., Kurram Convoy Incident" value="${esc(warData.name)}" />
          </div>
          <div>
            <label class="form-label" for="mwNameUr">War / Conflict Name (Urdu – جنگ / معرکے کا نام اردو میں)</label>
            <input type="text" id="mwNameUr" class="form-control martyr-urdu" dir="rtl" placeholder="مثلاً سانحہ پارہ چنار / مسافر قافلہ حملہ" value="${esc(warData.name_ur || '')}" />
          </div>
          <div>
            <label class="form-label" for="mwRefCode">Reference Number / Code</label>
            <input type="text" id="mwRefCode" class="form-control" placeholder="e.g., WAR-KRM-2025" value="${esc(warData.reference_code || '')}" />
          </div>
          <div>
            <label class="form-label" for="mwCategory">War Category / Type</label>
            <select id="mwCategory" class="form-control">
              ${WAR_CATEGORIES.map(c => `<option value="${c}" ${(warData.category || 'Conflict') === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="mwStartDate">Start Date</label>
            <input type="date" id="mwStartDate" class="form-control" value="${esc(toInputDate(warData.start_date))}" />
          </div>
          <div>
            <label class="form-label" for="mwEndDate">End Date (Blank if Ongoing)</label>
            <input type="date" id="mwEndDate" class="form-control" value="${esc(toInputDate(warData.end_date))}" />
          </div>
          <div>
            <label class="form-label" for="mwStatus">Status</label>
            <select id="mwStatus" class="form-control">
              <option value="active" ${warData.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="completed" ${warData.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="archived" ${warData.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
          <div>
            <label class="form-label" for="mwParentWarId">Parent Conflict (If Episode / Sub-Incident)</label>
            <select id="mwParentWarId" class="form-control">
              <option value="">— Standalone / Top-Level Conflict —</option>
              ${parentCandidates.map(pw => `<option value="${pw.id}" ${Number(warData.parent_war_id) === Number(pw.id) ? 'selected' : ''}>${esc(pw.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label" for="mwCasualties">Reported Casualties (English &amp; Urdu)</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="mwCasualties" class="form-control" placeholder="e.g., 25 killed" value="${esc(warData.reported_casualties || '')}" />
              <input type="text" id="mwCasualtiesUr" class="form-control martyr-urdu" dir="rtl" placeholder="مثلاً 25 شہید" value="${esc(warData.reported_casualties_ur || '')}" />
            </div>
          </div>
          <div>
            <label class="form-label" for="mwInjuries">Reported Injuries</label>
            <input type="text" id="mwInjuries" class="form-control" placeholder="e.g., 87 injured" value="${esc(warData.reported_injuries || '')}" />
          </div>
          <div>
            <label class="form-label" for="mwCasualtyStatus">Casualty Verification Status</label>
            <select id="mwCasualtyStatus" class="form-control">
              <option value="confirmed" ${(warData.casualty_status || 'confirmed') === 'confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="provisional" ${warData.casualty_status === 'provisional' ? 'selected' : ''}>Provisional</option>
              <option value="disputed" ${warData.casualty_status === 'disputed' ? 'selected' : ''}>Disputed / Conflicting Estimates</option>
              <option value="unverified" ${warData.casualty_status === 'unverified' ? 'selected' : ''}>Unverified</option>
            </select>
          </div>
          <div>
            <label class="form-label" for="mwCasualtyNotes">Conflicting Casualty Estimates / Verification Notes</label>
            <input type="text" id="mwCasualtyNotes" class="form-control" placeholder="Record differences between initial media reports and official hospital figures..." value="${esc(warData.casualty_notes || '')}" />
          </div>
        </div>

        <!-- MAIN LOCATION & MULTIPLE AFFECTED LOCATIONS -->
        <div class="martyr-loc-fieldset">
          <div class="martyr-loc-fieldset-head">
            <strong><i class="fas fa-map-location-dot"></i> Main Location &amp; Multiple Affected Locations</strong>
            <button type="button" class="btn-admin btn-admin-secondary" id="btnMwInlineAddLoc" style="padding: 3px 9px; font-size: 0.74rem;">
              <i class="fas fa-plus"></i> Add New Location
            </button>
          </div>
          <div class="martyr-form-grid-3" style="margin-bottom: 10px;">
            <div><label class="form-label" for="mwLocCountry">Country</label><select id="mwLocCountry" class="form-control"></select></div>
            <div><label class="form-label" for="mwLocProvince">Province</label><select id="mwLocProvince" class="form-control"></select></div>
            <div><label class="form-label" for="mwLocDistrict">District</label><select id="mwLocDistrict" class="form-control"></select></div>
            <div><label class="form-label" for="mwLocTehsil">Tehsil / Region</label><select id="mwLocTehsil" class="form-control"></select></div>
            <div><label class="form-label" for="mwLocVillageId">Main Village / Town</label><select id="mwLocVillageId" class="form-control"></select></div>
            <div>
              <label class="form-label" for="mwLocation">Main Location Label (EN &amp; اردو)</label>
              <div style="display:flex; gap:6px;">
                <input type="text" id="mwLocation" class="form-control" placeholder="Location (EN)" value="${esc(warData.location || '')}" />
                <input type="text" id="mwLocationUr" class="form-control martyr-urdu" dir="rtl" placeholder="مقام (اردو)" value="${esc(warData.location_ur || '')}" />
              </div>
            </div>
          </div>

          <div>
            <label class="form-label" for="mwAffectedLocSelect">Multiple Affected Locations (Optional)</label>
            <div style="display: flex; gap: 6px;">
              <select id="mwAffectedLocSelect" class="form-control">
                <option value="">— Add affected village, town, or tehsil —</option>
                ${allVillages.map(v => `<option value="${v.id}">${esc(v.name_en)}${v.name_ur ? ` (${esc(v.name_ur)})` : ''}</option>`).join('')}
              </select>
              <button type="button" class="btn-admin btn-admin-secondary" id="btnMwAddAffectedLoc" style="padding: 5px 12px;">Add</button>
            </div>
            <div id="mwAffectedLocChips" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;"></div>
          </div>
        </div>

        <!-- BILINGUAL REASON / CAUSE OF CONFLICT -->
        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px;">
              <label class="form-label" for="mwReasonCause" style="margin: 0;">Reason / Cause of Conflict (English)</label>
              <input type="text" id="mwReasonSource" class="form-control" style="max-width: 220px; height: 28px; font-size: 0.75rem;" placeholder="Source Citation" value="${esc(warData.reason_source || '')}" />
            </div>
            <textarea id="mwReasonCause" class="form-control" rows="2" placeholder="Documented factual reason or cause (English)...">${esc((warData.reason_cause || '').replace(/<[^>]+>/g, ''))}</textarea>
          </div>
          <div>
            <label class="form-label" for="mwReasonCauseUr">Reason / Cause of Conflict (Urdu – وجہ / پسِ منظر اردو میں)</label>
            <textarea id="mwReasonCauseUr" class="form-control martyr-urdu" dir="rtl" rows="2" placeholder="تنازعے یا واقعے کی مستند وجہ اردو میں...">${esc((warData.reason_cause_ur || '').replace(/<[^>]+>/g, ''))}</textarea>
          </div>
        </div>

        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="mwShortDesc">Short Summary (English)</label>
            <textarea id="mwShortDesc" class="form-control" rows="2" placeholder="Concise overview (English)...">${esc(warData.short_description || '')}</textarea>
          </div>
          <div>
            <label class="form-label" for="mwShortDescUr">Short Summary (Urdu – مختصر خلاصہ اردو میں)</label>
            <textarea id="mwShortDescUr" class="form-control martyr-urdu" dir="rtl" rows="2" placeholder="مختصر خلاصہ اردو میں...">${esc(warData.short_description_ur || '')}</textarea>
          </div>
        </div>

        <!-- BILINGUAL HISTORICAL BACKGROUND (ENGLISH LTR + URDU RTL) -->
        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <label class="form-label">Historical Background (English · LTR)</label>
            <div class="martyr-editor-toolbar" id="mwBgToolbar">
              <button type="button" data-cmd="formatBlock" data-val="H3">H3</button>
              <button type="button" data-cmd="bold"><i class="fas fa-bold"></i></button>
              <button type="button" data-cmd="italic"><i class="fas fa-italic"></i></button>
              <button type="button" data-cmd="insertUnorderedList"><i class="fas fa-list-ul"></i></button>
              <button type="button" data-cmd="formatBlock" data-val="BLOCKQUOTE"><i class="fas fa-quote-right"></i></button>
            </div>
            <div id="mwBgEditor" class="martyr-editor-area" contenteditable="true" dir="ltr" style="min-height: 110px;">${warData.historical_background || ''}</div>
          </div>
          <div>
            <label class="form-label">Historical Background (Urdu · تاریخی پس منظر اردو میں · RTL)</label>
            <div class="martyr-editor-toolbar" id="mwBgUrToolbar">
              <button type="button" data-cmd="formatBlock" data-val="H3">H3</button>
              <button type="button" data-cmd="bold"><i class="fas fa-bold"></i></button>
              <button type="button" data-cmd="italic"><i class="fas fa-italic"></i></button>
              <button type="button" data-cmd="insertUnorderedList"><i class="fas fa-list-ul"></i></button>
              <button type="button" data-cmd="formatBlock" data-val="BLOCKQUOTE"><i class="fas fa-quote-right"></i></button>
            </div>
            <div id="mwBgUrEditor" class="martyr-editor-area martyr-urdu" contenteditable="true" dir="rtl" style="min-height: 110px;">${warData.historical_background_ur || ''}</div>
          </div>
        </div>

        <!-- BILINGUAL DETAILED DESCRIPTION / ARTICLE -->
        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="mwDetailedArticle">Detailed Description (English · LTR)</label>
            <div id="mwDetailedArticle" class="martyr-editor-area" contenteditable="true" dir="ltr" style="min-height: 95px; border-radius: 4px;">${warData.detailed_article || ''}</div>
          </div>
          <div>
            <label class="form-label" for="mwDetailedArticleUr">Detailed Description (Urdu · تفصیلی مضمون اردو میں · RTL)</label>
            <div id="mwDetailedArticleUr" class="martyr-editor-area martyr-urdu" contenteditable="true" dir="rtl" style="min-height: 95px; border-radius: 4px;">${warData.detailed_article_ur || ''}</div>
          </div>
        </div>

        <!-- BILINGUAL CEASEFIRE / JIRGA / PEACE ACCORD -->
        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <label class="form-label" for="mwCeasefireInfo">Ceasefire / Peace Agreement (English)</label>
            <textarea id="mwCeasefireInfo" class="form-control" rows="2" placeholder="e.g., Murree Peace Accord (Oct 2008)...">${esc(warData.ceasefire_info || '')}</textarea>
          </div>
          <div>
            <label class="form-label" for="mwCeasefireInfoUr">Ceasefire / Peace Agreement (Urdu – امن معاہدہ اردو میں)</label>
            <textarea id="mwCeasefireInfoUr" class="form-control martyr-urdu" dir="rtl" rows="2" placeholder="جنگ بندی یا امن معاہدے کی تفصیل اردو میں...">${esc(warData.ceasefire_info_ur || '')}</textarea>
          </div>
        </div>

        <!-- PRIMARY HISTORICAL SOURCE CITATION -->
        <div class="martyr-loc-fieldset" style="margin-bottom: 12px;">
          <div class="martyr-loc-fieldset-head">
            <strong><i class="fas fa-newspaper"></i> Primary Historical Source Citation (News Report / Official Record)</strong>
          </div>
          <div class="martyr-form-grid-3">
            <div>
              <label class="form-label" for="mwSrcTitle">Headline / Source Title</label>
              <input type="text" id="mwSrcTitle" class="form-control" placeholder="e.g., 25 killed in Parachinar blast" value="${esc(firstSrc.source_title || '')}" />
            </div>
            <div>
              <label class="form-label" for="mwSrcPublisher">Publisher</label>
              <input type="text" id="mwSrcPublisher" class="form-control" placeholder="e.g., Dawn, BBC News, Reuters" value="${esc(firstSrc.publisher || '')}" />
            </div>
            <div>
              <label class="form-label" for="mwSrcUrl">Source URL</label>
              <input type="url" id="mwSrcUrl" class="form-control" placeholder="https://www.dawn.com/news/..." value="${esc(firstSrc.source_url || '')}" />
            </div>
            <div>
              <label class="form-label" for="mwSrcPubDate">Publication Date</label>
              <input type="date" id="mwSrcPubDate" class="form-control" value="${esc(toInputDate(firstSrc.publication_date))}" />
            </div>
            <div style="grid-column: span 2;">
              <label class="form-label" for="mwSrcNotes">Source Notes</label>
              <input type="text" id="mwSrcNotes" class="form-control" placeholder="Summary of facts verified by this source" value="${esc(firstSrc.source_notes || '')}" />
            </div>
          </div>
        </div>

        <!-- COVER & ADDITIONAL IMAGES -->
        <div class="martyr-form-grid-2" style="margin-bottom: 12px;">
          <div>
            <label class="form-label">Cover Image (Optimized WebP)</label>
            <div style="display: flex; align-items: center; gap: 8px;">
              <label class="btn-admin btn-admin-secondary" style="cursor: pointer; margin: 0; font-size: 0.78rem; padding: 6px 12px;">
                <i class="fas fa-image"></i> Upload Cover
                <input type="file" id="mwCoverInput" accept="image/*" style="display: none;" />
              </label>
              <span id="mwCoverStatus" style="font-size: 0.76rem; color: #475569;">
                ${state.warModalState.cover_image_url ? 'Cover attached' : 'No cover uploaded'}
              </span>
            </div>
            <div id="mwCoverPreviewWrap" style="margin-top: 8px; ${state.warModalState.cover_image_url ? '' : 'display:none;'}">
              <img id="mwCoverPreviewImg" src="${esc(state.warModalState.cover_image_url)}" alt="Cover Preview" style="max-height: 110px; border-radius: 4px; border: 1px solid #CBD5E1;" />
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="form-label" style="margin: 0;">Additional Images (Optional)</label>
              <label class="btn-admin btn-admin-secondary" style="cursor: pointer; margin: 0; font-size: 0.75rem; padding: 4px 10px;">
                <i class="fas fa-plus"></i> Add Images
                <input type="file" id="mwExtraImgsInput" accept="image/*" multiple style="display: none;" />
              </label>
            </div>
            <div id="mwExtraImgsList" class="martyr-gallery-edit-list" style="margin-top: 6px;"></div>
          </div>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 9px 12px; font-size: 0.78rem; color: #475569; margin-bottom: 14px;">
          <i class="fas fa-circle-info" style="color: #881337; margin-right: 5px;"></i>
          <strong>Automatic Martyr Counting:</strong> Total martyrs for this war are computed dynamically from linked martyr profiles and are never entered manually.
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn-admin btn-admin-secondary" onclick="window.QSFMartyrs.closeWarModal()">Cancel</button>
          <button type="submit" class="btn-admin btn-admin-primary" id="btnMwSubmit">
            <i class="fas fa-save"></i> ${editWarId ? 'Update War Record' : 'Create War Record'}
          </button>
        </div>
      </form>
    `;

    bindWarModalEvents(warData);
    renderWarAffectedLocChips();
    renderWarModalExtraImages();
  }

  function bindWarModalEvents(warData) {
    const refreshWarLocPicker = wireDependentLocationGroup('mwLoc', {
      country: warData.country || 'Pakistan',
      province: warData.province || 'Khyber Pakhtunkhwa',
      district: warData.district || 'Kurram District',
      tehsil: warData.tehsil || '',
      location_id: warData.primary_location_id || ''
    }, loc => {
      state.warModalState.primary_location_id = loc.id;
      document.getElementById('mwLocation').value = loc.name_en;
      if (loc.name_ur && document.getElementById('mwLocationUr')) {
        document.getElementById('mwLocationUr').value = loc.name_ur;
      }
      if (!state.warModalState.affected_location_ids.includes(loc.id)) {
        state.warModalState.affected_location_ids.push(loc.id);
        renderWarAffectedLocChips();
      }
    });

    const refreshAffectedSelect = () => {
      const sel = document.getElementById('mwAffectedLocSelect');
      if (!sel) return;
      const allVillages = state.locationsFlat.filter(l => ['Tehsil', 'Town', 'Village', 'Area', 'Locality'].includes(l.location_type));
      sel.innerHTML = `<option value="">— Add affected village, town, or tehsil —</option>`
        + allVillages.map(v => `<option value="${v.id}">${esc(v.name_en)}${v.tehsil && v.tehsil !== v.name_en ? ` (${esc(v.tehsil)})` : v.district ? ` (${esc(v.district)})` : ''}</option>`).join('');
    };

    document.getElementById('btnMwAddAffectedLoc').addEventListener('click', () => {
      const sel = document.getElementById('mwAffectedLocSelect');
      const lid = Number(sel.value);
      if (!lid) return;
      if (!state.warModalState.affected_location_ids.includes(lid)) {
        state.warModalState.affected_location_ids.push(lid);
        renderWarAffectedLocChips();
      }
      sel.value = '';
    });

    document.getElementById('btnMwInlineAddLoc').addEventListener('click', () => {
      openLocationModal({
        district: document.getElementById('mwLocDistrict').value || 'Kurram District',
        tehsil: document.getElementById('mwLocTehsil').value || '',
        onSaved: newLoc => {
          refreshWarLocPicker(newLoc);
          refreshAffectedSelect();
        }
      });
    });

    const coverInput = document.getElementById('mwCoverInput');
    coverInput.addEventListener('change', async () => {
      const file = coverInput.files && coverInput.files[0];
      if (!file) return;
      document.getElementById('mwCoverStatus').textContent = 'Uploading...';
      try {
        const url = await uploadImageFile(file, 'wars');
        state.warModalState.cover_image_url = url;
        document.getElementById('mwCoverStatus').textContent = 'Uploaded (WebP)';
        document.getElementById('mwCoverPreviewImg').src = url;
        document.getElementById('mwCoverPreviewWrap').style.display = 'block';
      } catch (err) {
        document.getElementById('mwCoverStatus').textContent = 'Upload failed';
        notify(err.message, 'error');
      } finally {
        coverInput.value = '';
      }
    });

    const extraInput = document.getElementById('mwExtraImgsInput');
    extraInput.addEventListener('change', async () => {
      const files = Array.from(extraInput.files || []);
      for (const file of files) {
        try {
          const url = await uploadImageFile(file, 'wars');
          state.warModalState.images.push({ image_url: url, caption: '' });
          renderWarModalExtraImages();
        } catch (err) {
          notify(err.message, 'error');
        }
      }
      extraInput.value = '';
    });

    const bgEd = document.getElementById('mwBgEditor');
    const bgUrEd = document.getElementById('mwBgUrEditor');
    document.querySelectorAll('#mwBgToolbar button').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        bgEd.focus();
        document.execCommand(btn.dataset.cmd, false, btn.dataset.val || null);
      });
    });
    document.querySelectorAll('#mwBgUrToolbar button').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        bgUrEd.focus();
        document.execCommand(btn.dataset.cmd, false, btn.dataset.val || null);
      });
    });

    document.getElementById('martyrWarModalForm').addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('mwName').value.trim();
      const nameUr = document.getElementById('mwNameUr') ? document.getElementById('mwNameUr').value.trim() : '';
      if (!name && !nameUr) {
        notify('War / Conflict Name (English or Urdu) is required.', 'error');
        document.getElementById('mwName').focus();
        return;
      }
      const btn = document.getElementById('btnMwSubmit');
      btn.disabled = true;

      const reasonRaw = document.getElementById('mwReasonCause').value.trim();
      const reasonUrRaw = document.getElementById('mwReasonCauseUr') ? document.getElementById('mwReasonCauseUr').value.trim() : '';
      const srcTitle = document.getElementById('mwSrcTitle') ? document.getElementById('mwSrcTitle').value.trim() : '';
      const updatedSources = (() => {
        if (!srcTitle) return state.warModalState.sources && state.warModalState.sources.length ? state.warModalState.sources : undefined;
        const pSrc = {
          source_title: srcTitle,
          publisher: document.getElementById('mwSrcPublisher').value.trim(),
          source_url: document.getElementById('mwSrcUrl').value.trim(),
          publication_date: document.getElementById('mwSrcPubDate').value || null,
          incident_date: document.getElementById('mwStartDate').value || null,
          reported_casualties: document.getElementById('mwCasualties').value.trim(),
          source_notes: document.getElementById('mwSrcNotes').value.trim(),
          verification_status: 'confirmed'
        };
        const rest = Array.isArray(state.warModalState.sources) ? state.warModalState.sources.slice(1) : [];
        return [pSrc, ...rest];
      })();

      const payload = {
        name: name || nameUr,
        name_ur: nameUr || null,
        reference_code: document.getElementById('mwRefCode').value.trim(),
        category: document.getElementById('mwCategory').value,
        parent_war_id: Number(document.getElementById('mwParentWarId').value) || null,
        country: document.getElementById('mwLocCountry').value,
        province: document.getElementById('mwLocProvince').value,
        district: document.getElementById('mwLocDistrict').value,
        tehsil: document.getElementById('mwLocTehsil').value,
        primary_location_id: Number(document.getElementById('mwLocVillageId').value) || null,
        affected_location_ids: state.warModalState.affected_location_ids || [],
        location: document.getElementById('mwLocation').value.trim(),
        location_ur: document.getElementById('mwLocationUr') ? document.getElementById('mwLocationUr').value.trim() : '',
        start_date: document.getElementById('mwStartDate').value || null,
        end_date: document.getElementById('mwEndDate').value || null,
        short_description: document.getElementById('mwShortDesc').value.trim(),
        short_description_ur: document.getElementById('mwShortDescUr') ? document.getElementById('mwShortDescUr').value.trim() : '',
        reason_cause: reasonRaw ? `<p>${esc(reasonRaw).replace(/\n/g, '<br>')}</p>` : '',
        reason_cause_ur: reasonUrRaw ? `<p>${esc(reasonUrRaw).replace(/\n/g, '<br>')}</p>` : '',
        reason_source: document.getElementById('mwReasonSource').value.trim(),
        historical_background: document.getElementById('mwBgEditor').innerHTML,
        historical_background_ur: document.getElementById('mwBgUrEditor') ? document.getElementById('mwBgUrEditor').innerHTML : '',
        detailed_article: document.getElementById('mwDetailedArticle').innerHTML,
        detailed_article_ur: document.getElementById('mwDetailedArticleUr') ? document.getElementById('mwDetailedArticleUr').innerHTML : '',
        background_dir: state.warModalState.background_dir || 'auto',
        reported_casualties: document.getElementById('mwCasualties').value.trim(),
        reported_casualties_ur: document.getElementById('mwCasualtiesUr') ? document.getElementById('mwCasualtiesUr').value.trim() : '',
        reported_injuries: document.getElementById('mwInjuries').value.trim(),
        casualty_status: document.getElementById('mwCasualtyStatus').value,
        casualty_notes: document.getElementById('mwCasualtyNotes').value.trim(),
        ceasefire_info: document.getElementById('mwCeasefireInfo').value.trim(),
        ceasefire_info_ur: document.getElementById('mwCeasefireInfoUr') ? document.getElementById('mwCeasefireInfoUr').value.trim() : '',
        cover_image_url: state.warModalState.cover_image_url || null,
        status: document.getElementById('mwStatus').value,
        images: state.warModalState.images || [],
        sources: updatedSources
      };

      try {
        const editId = state.warModalState.editId;
        const cb = state.warModalState.onSaved;
        const res = editId
          ? await apiFetch(`/wars/${editId}`, { method: 'PUT', body: payload })
          : await apiFetch('/wars', { method: 'POST', body: payload });

        notify(res.message || 'War saved.', 'success');
        closeWarModal();

        if (cb) {
          await cb(res.war || { id: res.id, name });
        } else if (state.warsViewMode === 'detail' && state.activeWarId) {
          await renderWarDetail(state.activeWarId);
        } else {
          await loadAndRenderWarsList();
        }
      } catch (err) {
        notify(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  function renderWarAffectedLocChips() {
    const box = document.getElementById('mwAffectedLocChips');
    if (!box) return;
    const ids = state.warModalState.affected_location_ids || [];
    if (!ids.length) {
      box.innerHTML = `<span style="font-size: 0.74rem; color: #94A3B8;">No affected locations added yet.</span>`;
      return;
    }
    box.innerHTML = ids.map(id => {
      const loc = state.locationsFlat.find(x => Number(x.id) === Number(id));
      const label = loc ? `${loc.name_en}${loc.tehsil && loc.tehsil !== loc.name_en ? ` (${loc.tehsil})` : ''}` : `Location #${id}`;
      return `
        <span class="martyrs-active-chip">
          ${esc(label)}
          <button type="button" onclick="window.QSFMartyrs.removeWarAffectedLoc(${id})">&times;</button>
        </span>
      `;
    }).join('');
  }

  function removeWarAffectedLoc(id) {
    state.warModalState.affected_location_ids = (state.warModalState.affected_location_ids || []).filter(x => Number(x) !== Number(id));
    renderWarAffectedLocChips();
  }

  function renderWarModalExtraImages() {
    const box = document.getElementById('mwExtraImgsList');
    if (!box) return;
    const imgs = state.warModalState.images || [];
    if (!imgs.length) {
      box.innerHTML = `<div style="grid-column:1/-1; font-size:0.78rem; color:#94A3B8;">No additional images added.</div>`;
      return;
    }
    box.innerHTML = imgs.map((img, idx) => `
      <div class="martyr-gallery-edit-item">
        <img src="${esc(img.image_url)}" alt="War Image" />
        <div class="martyr-gallery-edit-controls">
          <input type="text" class="form-control mw-img-cap" data-idx="${idx}" placeholder="Caption" value="${esc(img.caption || '')}" style="height:28px; font-size:0.76rem;" />
          <button type="button" class="btn-admin btn-admin-danger" style="padding:3px 8px; font-size:0.72rem;" onclick="window.QSFMartyrs.removeWarModalImage(${idx})">Remove</button>
        </div>
      </div>
    `).join('');
    box.querySelectorAll('.mw-img-cap').forEach(inp => {
      inp.addEventListener('input', () => {
        const i = Number(inp.dataset.idx);
        if (state.warModalState.images[i]) state.warModalState.images[i].caption = inp.value;
      });
    });
  }

  function removeWarModalImage(idx) {
    state.warModalState.images.splice(idx, 1);
    renderWarModalExtraImages();
  }

  function closeWarModal() {
    const modal = document.getElementById('modalMartyrWar');
    if (modal) modal.classList.add('hidden');
  }

  // =========================================================================
  // 5. DUPLICATE INSPECTOR MODAL
  // =========================================================================
  async function openDuplicatesModal() {
    const modal = document.getElementById('modalMartyrDuplicates');
    const body = document.getElementById('martyrDuplicatesBody');
    if (!modal || !body) return;
    modal.classList.remove('hidden');
    body.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748B;"><i class="fas fa-circle-notch fa-spin"></i> Scanning archive for duplicate profiles...</div>`;
    try {
      const data = await apiFetch('/duplicates');
      const records = data.records || [];
      if (!records.length) {
        body.innerHTML = `
          <div style="text-align: center; padding: 28px 12px;">
            <i class="fas fa-circle-check" style="font-size: 2rem; color: #16A34A; margin-bottom: 10px;"></i>
            <h4 style="margin: 0 0 6px;">No Duplicate Records Found</h4>
            <p style="margin: 0; color: #64748B; font-size: 0.85rem;">All active martyr profiles have distinct name and father's name combinations.</p>
          </div>
        `;
        return;
      }
      body.innerHTML = `
        <p style="font-size: 0.84rem; color: #475569; margin-top: 0;">Found <strong>${data.duplicate_groups}</strong> potential duplicate group(s) (${records.length} records):</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${records.map(r => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 12px; border:1px solid #E2E8F0; border-radius:4px; background:#F8FAFC;">
              <div>
                <strong>${esc(r.full_name)}</strong> ${r.father_name ? `<span style="color:#64748B;">· S/O ${esc(r.father_name)}</span>` : ''}
                <div style="font-size:0.76rem; color:#64748B;">ID #${r.id} · ${esc(r.war_name || '—')} · ${fmtDate(r.date_of_martyrdom)}</div>
              </div>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn-admin btn-admin-secondary" style="padding:4px 10px; font-size:0.76rem;" onclick="window.QSFMartyrs.closeDuplicatesModal(); window.QSFMartyrs.openMartyrProfile(${r.id})">View</button>
                <button type="button" class="btn-admin btn-admin-primary" style="padding:4px 10px; font-size:0.76rem;" onclick="window.QSFMartyrs.closeDuplicatesModal(); window.QSFMartyrs.openEditMartyrForm(${r.id})">Edit</button>
                <button type="button" class="btn-admin btn-admin-danger" style="padding:4px 10px; font-size:0.76rem;" onclick="window.QSFMartyrs.archiveDuplicate(${r.id})">Archive</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      body.innerHTML = `<p style="color:#991B1B;">${esc(err.message)}</p>`;
    }
  }

  function closeDuplicatesModal() {
    const modal = document.getElementById('modalMartyrDuplicates');
    if (modal) modal.classList.add('hidden');
  }

  async function archiveDuplicate(martyrId) {
    if (!window.confirm('Archive this duplicate martyr record? Its historical data will remain preserved in the Archived list.')) return;
    try {
      await apiFetch(`/profile/${martyrId}/archive`, { method: 'PATCH', body: { restore: false } });
      notify('Duplicate record archived.', 'success');
      await openDuplicatesModal();
      if (state.martyrsViewMode === 'list') await loadAndRenderMartyrsDirectory();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // =========================================================================
  // 6. PHOTO LIGHTBOX VIEWER
  // =========================================================================
  function openLightbox(items, startIdx = 0) {
    if (!Array.isArray(items) || !items.length) return;
    state.lightbox.items = items;
    state.lightbox.index = Math.max(0, Math.min(items.length - 1, Number(startIdx) || 0));
    renderLightboxFrame();
    const modal = document.getElementById('martyrLightboxModal');
    if (modal) modal.classList.remove('hidden');
  }

  function renderLightboxFrame() {
    const item = state.lightbox.items[state.lightbox.index];
    if (!item) return;
    const img = document.getElementById('martyrLightboxImg');
    const cap = document.getElementById('martyrLightboxCaption');
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
    const modal = document.getElementById('martyrLightboxModal');
    if (modal) modal.classList.add('hidden');
  }

  // =========================================================================
  // 7. HISTORICAL ARCHIVE SYNC, IMPORT AUDIT TRAIL & DEMO DATA CONTROLS
  // =========================================================================
  async function openImportAuditModal() {
    const modal = document.getElementById('modalMartyrImportAudit');
    const body = document.getElementById('martyrImportAuditBody');
    if (!modal || !body) return;
    modal.classList.remove('hidden');
    body.innerHTML = `<div style="padding: 28px; text-align: center; color: #64748B;"><i class="fas fa-circle-notch fa-spin"></i> Loading historical archive &amp; import audit preview...</div>`;

    try {
      const [previewRes, summaryRes] = await Promise.all([
        apiFetch('/import-preview'),
        apiFetch('/summary')
      ]);
      const seedSum = previewRes.seed_summary || {};
      const dbStat = previewRes.database_status || {};
      const st = summaryRes.stats || {};
      const batches = previewRes.recent_batches || previewRes.batches || [];
      const demoCount = Number(dbStat.demo_martyrs ?? st.demo_martyrs) || 0;

      body.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 16px;">
          <div style="padding: 12px; border: 1px solid #E2E8F0; border-radius: 4px; background: #F8FAFC;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Kurram Locations</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #0F172A;">${dbStat.active_locations || st.total_locations || 0}</div>
            <div style="font-size: 0.72rem; color: #475569;">Upper, Lower &amp; Central Kurram</div>
          </div>
          <div style="padding: 12px; border: 1px solid #E2E8F0; border-radius: 4px; background: #F8FAFC;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Historical Conflicts</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #0F172A;">${dbStat.active_wars || st.total_wars || 0}</div>
            <div style="font-size: 0.72rem; color: #475569;">2007 – 2026 Archive</div>
          </div>
          <div style="padding: 12px; border: 1px solid #E2E8F0; border-radius: 4px; background: #F8FAFC;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Verified Martyrs</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #881337;">${dbStat.verified_martyrs || st.total_martyrs || 0}</div>
            <div style="font-size: 0.72rem; color: #166534;">${dbStat.attached_sources || 0} Source Citations</div>
          </div>
          <div style="padding: 12px; border: 1px solid ${demoCount > 0 ? '#F59E0B' : '#E2E8F0'}; border-radius: 4px; background: ${demoCount > 0 ? '#FFFBEB' : '#F8FAFC'};">
            <div style="font-size: 0.72rem; color: #92400E; font-weight: 700; text-transform: uppercase;">Demo Test Profiles</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #92400E;" id="auditDemoCountVal">${demoCount}</div>
            <div style="font-size: 0.72rem; color: #92400E;">Separated from real records</div>
          </div>
        </div>

        <div style="padding: 14px; border: 1px solid #E2E8F0; border-radius: 4px; background: #FFFFFF; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div>
              <strong style="color: #0F172A; font-size: 0.92rem;"><i class="fas fa-shield-check" style="color: #166534;"></i> Non-Destructive Historical Seed &amp; Sync (2007–2026)</strong>
              <p style="margin: 3px 0 0; font-size: 0.78rem; color: #64748B;">
                Historical Seed Catalog (Batch <code>${esc(seedSum.batch_id || 'KRM-HIST-2007-2026-V1')}</code>): <strong>${seedSum.available_conflicts || 18}</strong> verified historical conflicts and <strong>${seedSum.available_verified_martyrs || 29}</strong> source-cited martyr profiles synchronized in database.
              </p>
            </div>
            <button type="button" class="btn-admin btn-admin-primary" id="btnRunHistoricalSync" onclick="window.QSFMartyrs.runHistoricalSync()">
              <i class="fas fa-rotate"></i> Verify &amp; Sync Historical Archive
            </button>
          </div>
        </div>

        <div style="padding: 14px; border: 1px solid #F59E0B; border-radius: 4px; background: #FFFBEB; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div>
              <strong style="color: #92400E; font-size: 0.92rem;"><i class="fas fa-flask"></i> Separated Demo Data Controls (UI Testing Only)</strong>
              <p style="margin: 3px 0 0; font-size: 0.78rem; color: #78350F;">
                Demo records are strictly separated (<code>is_demo = 1</code>) and visibly labeled <strong>DEMO DATA – NOT A REAL HISTORICAL PERSON</strong>. Removing demo data never touches real historical records.
              </p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn-admin btn-admin-secondary" id="btnSeedDemoData" onclick="window.QSFMartyrs.seedDemoRecords()">
                <i class="fas fa-plus"></i> Add Sample Demo Profiles
              </button>
              <button type="button" class="btn-admin btn-admin-danger" id="btnRemoveDemoData" onclick="window.QSFMartyrs.removeAllDemoRecords()">
                <i class="fas fa-trash"></i> Remove All Demo Data (${demoCount})
              </button>
            </div>
          </div>
        </div>

        <h4 style="margin: 0 0 8px; font-size: 0.85rem; color: #334155; text-transform: uppercase; letter-spacing: 0.04em;">
          <i class="fas fa-clock-rotate-left"></i> Import &amp; Verification Audit Trail (${batches.length})
        </h4>
        ${batches.length === 0 ? `<p style="font-size: 0.82rem; color: #94A3B8;">No import batches logged yet.</p>` : `
          <div style="max-height: 220px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 4px;">
            ${batches.map(b => `
              <div style="padding: 9px 12px; border-bottom: 1px solid #F1F5F9; font-size: 0.78rem; display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                <div>
                  <strong style="color: #0F172A;">${esc(b.batch_id || b.batch_code)}</strong>
                  <span style="color: #64748B;"> · ${esc(b.import_type)} (${Number(b.records_created) || 0} created)</span>
                  <div style="color: #475569; margin-top: 2px;">${esc(b.import_notes || b.notes || '')}</div>
                </div>
                <div style="text-align: right; color: #64748B;">
                  <div><strong>${esc(b.imported_by_name || 'System')}</strong></div>
                  <div>${fmtDateTime(b.created_at)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
    } catch (err) {
      body.innerHTML = `<p style="color:#991B1B;">${esc(err.message)}</p>`;
    }
  }

  function closeImportAuditModal() {
    const modal = document.getElementById('modalMartyrImportAudit');
    if (modal) modal.classList.add('hidden');
  }

  async function runHistoricalSync() {
    const btn = document.getElementById('btnRunHistoricalSync');
    if (btn) btn.disabled = true;
    try {
      const res = await apiFetch('/import-historical', { method: 'POST', body: {} });
      notify(res.message || 'Historical archive verified & synchronized.', 'success');
      await openImportAuditModal();
      await fetchLocationsFlat();
      if (state.martyrsViewMode === 'list') await loadAndRenderMartyrsDirectory();
      if (state.warsViewMode === 'list') await loadAndRenderWarsList();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function seedDemoRecords() {
    const btn = document.getElementById('btnSeedDemoData');
    if (btn) btn.disabled = true;
    try {
      const res = await apiFetch('/demo-seed', { method: 'POST', body: {} });
      notify(res.message || 'Demo profiles created.', 'success');
      await openImportAuditModal();
      if (state.martyrsViewMode === 'list') await loadAndRenderMartyrsDirectory();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function removeAllDemoRecords() {
    try {
      const res = await apiFetch('/demo-data', { method: 'DELETE' });
      notify(res.message || 'All demo records removed.', 'success');
      const modal = document.getElementById('modalMartyrImportAudit');
      if (modal && !modal.classList.contains('hidden')) {
        await openImportAuditModal();
      }
      if (state.martyrsViewMode === 'profile') {
        await backToMartyrsList();
      } else if (state.martyrsViewMode === 'list') {
        await loadAndRenderMartyrsDirectory();
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  document.addEventListener('keydown', e => {
    const lb = document.getElementById('martyrLightboxModal');
    if (lb && !lb.classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
      return;
    }
    if (e.key === 'Escape') {
      const im = document.getElementById('modalMartyrImportAudit');
      if (im && !im.classList.contains('hidden')) { closeImportAuditModal(); return; }
      const lm = document.getElementById('modalMartyrLocation');
      if (lm && !lm.classList.contains('hidden')) { closeLocationModal(); return; }
      const fm = document.getElementById('modalMartyrFilters');
      if (fm && !fm.classList.contains('hidden')) { closeFiltersModal(); return; }
      const wm = document.getElementById('modalMartyrWar');
      if (wm && !wm.classList.contains('hidden')) { closeWarModal(); return; }
      const dm = document.getElementById('modalMartyrDuplicates');
      if (dm && !dm.classList.contains('hidden')) { closeDuplicatesModal(); return; }
    }
  });

  // Public Controller API
  window.QSFMartyrs = {
    onTabActivated,
    loadAndRenderWarsList,
    openWarDetail,
    backToWarsList,
    toggleWarArchive,
    permanentDeleteWar,
    filterByWarAndLocation,
    loadAndRenderMartyrsDirectory,
    goToMartyrsPage,
    toggleLocNodeExpand,
    toggleLocationsSidebar,
    toggleMobileLocDrawer,
    selectSidebarLocation,
    setLocationScope,
    clearSingleFilter,
    resetAllMartyrsFilters,
    openFiltersModal,
    closeFiltersModal,
    openLocationModal,
    closeLocationModal,
    openMartyrProfile,
    backToMartyrsList,
    toggleMartyrArchive,
    permanentDeleteMartyr,
    openAddMartyrForm,
    openEditMartyrForm,
    removeExtraWar,
    moveFormPhoto,
    removeFormPhoto,
    removeFamilyRow,
    openWarModal,
    closeWarModal,
    removeWarAffectedLoc,
    removeWarModalImage,
    openDuplicatesModal,
    closeDuplicatesModal,
    archiveDuplicate,
    openImportAuditModal,
    closeImportAuditModal,
    runHistoricalSync,
    seedDemoRecords,
    removeAllDemoRecords,
    openLightbox,
    stepLightbox,
    closeLightbox
  };
})();
