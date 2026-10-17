/**
 * QASR-E-SHABBIR FOUNDATION - ADMIN DASHBOARD CLIENT SCRIPT
 * Authentication, Branding Management (Logo & Flag), CRUD Operations, Confidential Applications
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let currentUser = null;
  let activeTab = 'overview';

  // Elements
  const loginWrapper = document.getElementById('loginWrapper');
  const dashboardWrapper = document.getElementById('dashboardWrapper');
  const loginForm = document.getElementById('adminLoginForm');
  const loginAlert = document.getElementById('loginAlert');

  // Check Session
  checkAuth();

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        currentUser = data.user;
        showDashboard();
      } else {
        showLogin();
      }
    } catch (err) {
      showLogin();
    }
  }

  function showLogin() {
    loginWrapper.style.display = 'flex';
    dashboardWrapper.style.display = 'none';
    // Reset sidebar visibility for clean next login
    document.querySelectorAll('.sidebar-menu > .sidebar-item').forEach(item => {
      item.style.display = '';
    });
    const orgItem = document.getElementById('sidebarOrgItem');
    if (orgItem) orgItem.style.display = '';
    const settingsItem = document.getElementById('sidebarSettingsItem');
    if (settingsItem) settingsItem.style.display = '';
  }

  function isTabPermitted(tabId) {
    if (!currentUser) return false;
    const isSuper = currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.is_super_admin === 1 || currentUser.is_admin === 1;
    if (isSuper) return true;

    let perms = currentUser.permissions;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch(e) { perms = []; }
    }
    if (!Array.isArray(perms)) perms = [];

    // Normalize organization setup subtabs
    if (tabId.startsWith('org-') || tabId === 'org') {
      return isSuper || perms.includes('users') || perms.includes('settings');
    }

    // Normalize settings subtabs
    if (tabId.startsWith('settings-') || tabId === 'branding' || tabId === 'settings') {
      return perms.includes('settings');
    }

    if (tabId === 'announcements' || tabId === 'menus' || tabId === 'hero-slides') {
      return isSuper || perms.includes(tabId) || perms.includes('settings');
    }

    return perms.includes(tabId);
  }

  function getFirstPermittedTab() {
    const tabsInOrder = ['overview', 'users', 'accounts', 'projects', 'volunteers', 'articles', 'applications', 'donations', 'submissions', 'org-departments', 'settings-bank'];
    for (const t of tabsInOrder) {
      if (isTabPermitted(t)) return t;
    }
    return 'accounts';
  }

  function applyRoleBasedUI() {
    if (!currentUser) return;
    const isSuper = currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.is_super_admin === 1 || currentUser.is_admin === 1;

    let perms = currentUser.permissions;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch(e) { perms = []; }
    }
    if (!Array.isArray(perms)) perms = [];

    // Filter each top-level sidebar item
    document.querySelectorAll('.sidebar-menu > .sidebar-item').forEach(item => {
      const link = item.querySelector('a[data-tab]');
      if (link) {
        const tab = link.dataset.tab;
        const allowed = isSuper || isTabPermitted(tab);
        item.style.display = allowed ? '' : 'none';
      }
    });

    // Organization Setup menu item
    const orgItem = document.getElementById('sidebarOrgItem');
    if (orgItem) {
      const allowed = isSuper || perms.includes('users') || perms.includes('settings');
      orgItem.style.display = allowed ? '' : 'none';
    }

    // Settings item
    const settingsItem = document.getElementById('sidebarSettingsItem');
    if (settingsItem) {
      const allowed = isSuper || isTabPermitted('settings-bank');
      settingsItem.style.display = allowed ? '' : 'none';
    }
  }

  function showDashboard() {
    loginWrapper.style.display = 'none';
    dashboardWrapper.style.display = 'flex';
    if (currentUser) {
      const nameEl = document.getElementById('adminUserName');
      const roleBadge = document.getElementById('adminUserRoleBadge');
      const avatarEl = document.getElementById('adminAvatar');
      
      const displayName = currentUser.full_name || currentUser.username || 'Staff User';
      if (nameEl) nameEl.textContent = displayName;
      if (roleBadge) {
        const roleText = (currentUser.role || 'staff').toUpperCase();
        roleBadge.textContent = roleText;
      }
      if (avatarEl) {
        if (currentUser.photo_url) {
          avatarEl.innerHTML = `<img src="${currentUser.photo_url}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
        } else {
          avatarEl.textContent = displayName.charAt(0).toUpperCase();
        }
      }
    }

    applyRoleBasedUI();
    populateOrgDropdowns();

    // Direct user to allowed tab
    const startTab = isTabPermitted(activeTab) ? activeTab : getFirstPermittedTab();
    switchTab(startTab);
  }

  // Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginAlert.style.display = 'none';
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const payload = {
        username: document.getElementById('loginUsername').value.trim(),
        password: document.getElementById('loginPassword').value
      };

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          currentUser = result.user;
          showDashboard();
        } else {
          loginAlert.style.display = 'block';
          loginAlert.textContent = result.message || 'Invalid username or password.';
        }
      } catch (err) {
        loginAlert.style.display = 'block';
        loginAlert.textContent = 'Connection error. Please try again.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to log out of the admin panel?')) {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        showLogin();
      }
    });
  }

  // Collapsible Organization Setup Accordion Toggle
  const btnToggleOrg = document.getElementById('btnToggleOrg');
  const sidebarOrgItem = document.getElementById('sidebarOrgItem');
  if (btnToggleOrg && sidebarOrgItem) {
    btnToggleOrg.addEventListener('click', (e) => {
      e.preventDefault();
      sidebarOrgItem.classList.toggle('open');
    });
  }

  // Collapsible Settings Accordion Toggle
  const btnToggleSettings = document.getElementById('btnToggleSettings');
  const sidebarSettingsItem = document.getElementById('sidebarSettingsItem');
  if (btnToggleSettings && sidebarSettingsItem) {
    btnToggleSettings.addEventListener('click', (e) => {
      e.preventDefault();
      sidebarSettingsItem.classList.toggle('open');
    });
  }

  // Sidebar & Submenu Navigation
  const allNavLinks = document.querySelectorAll('.sidebar-menu a[data-tab]');
  allNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.dataset.tab;
      switchTab(targetTab);
    });
  });

  const PAGE_CONFIG = {
    'overview': {
      titleEn: 'Executive Overview',
      titleUr: 'انتظامی جائزہ',
      icon: 'fas fa-chart-pie',
      actions: [
        {
          textEn: 'Refresh',
          textUr: 'تازہ کریں',
          icon: 'fas fa-rotate',
          type: 'secondary',
          onClick: 'loadOverviewData()'
        }
      ]
    },
    'users': {
      titleEn: 'Users & Staff',
      titleUr: 'صارفین اور عملہ',
      icon: 'fas fa-users-gear',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('users')"
        },
        {
          textEn: 'Add New Staff / User',
          textUr: 'نیا صارف / عملہ شامل کریں',
          icon: 'fas fa-user-plus',
          type: 'primary',
          permission: 'can_manage_users',
          onClick: 'openAddUserModal()'
        }
      ]
    },
    'accounts': {
      titleEn: 'Accounts & Ledger',
      titleUr: 'اکاؤنٹس اور مالیات',
      icon: 'fas fa-file-invoice-dollar',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('accounts')"
        },
        {
          textEn: 'Add New Donation / Receipt',
          textUr: 'عطیہ / رسید درج کریں',
          icon: 'fas fa-plus-circle',
          type: 'primary',
          permission: 'can_manage_finance',
          onClick: 'openAddDonationModal()'
        }
      ]
    },
    'projects': {
      titleEn: 'Welfare Projects',
      titleUr: 'فلاحی منصوبے',
      icon: 'fas fa-hand-holding-heart',
      isProjectsTab: true,
      actions: []
    },
    'volunteers': {
      titleEn: 'Volunteer Applications',
      titleUr: 'رضاکار',
      icon: 'fas fa-handshake-angle',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('volunteers')"
        },
        {
          textEn: 'Add New Volunteer',
          textUr: 'نیا رضاکار شامل کریں',
          icon: 'fas fa-user-plus',
          type: 'primary',
          permission: 'can_manage_volunteers',
          onClick: 'openAddVolunteerModal()'
        }
      ]
    },
    'articles': {
      titleEn: 'News & Updates',
      titleUr: 'خبریں اور اعلانات',
      icon: 'fas fa-newspaper',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('articles')"
        },
        {
          textEn: 'Add New News / Update',
          textUr: 'نیا آرٹیکل / خبر شامل کریں',
          icon: 'fas fa-plus-circle',
          type: 'primary',
          permission: 'can_manage_news',
          onClick: 'openAddArticleModal()'
        }
      ]
    },
    'applications': {
      titleEn: 'Assistance Requests',
      titleUr: 'امدادی درخواستیں',
      icon: 'fas fa-file-shield',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('applications')"
        },
        {
          textEn: 'Add New Assistance Request',
          textUr: 'درخواست درج کریں',
          icon: 'fas fa-plus-circle',
          type: 'primary',
          permission: 'can_manage_applications',
          onClick: 'openAddApplicationModal()'
        }
      ]
    },
    'donations': {
      titleEn: 'Donations & Receipts',
      titleUr: 'عطیات و رسیدات',
      icon: 'fas fa-receipt',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('donations')"
        },
        {
          textEn: 'Add New Donation / Receipt',
          textUr: 'عطیہ / رسید درج کریں',
          icon: 'fas fa-plus-circle',
          type: 'primary',
          permission: 'can_manage_finance',
          onClick: 'openAddDonationModal()'
        }
      ]
    },
    'submissions': {
      titleEn: 'Contact Messages',
      titleUr: 'پیغامات اور رابطے',
      icon: 'fas fa-envelope',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('submissions')"
        }
      ]
    },
    'settings-bank': {
      titleEn: 'Bank & Mobile Wallets',
      titleUr: 'ترتیبات: بینک اکاؤنٹس و والٹس',
      icon: 'fas fa-building-columns',
      actions: []
    },
    'settings-contact': {
      titleEn: 'Helpline & Official Address',
      titleUr: 'ترتیبات: ہیلپ لائن اور پتہ',
      icon: 'fas fa-headset',
      actions: []
    },
    'settings-branding': {
      titleEn: 'Official Foundation Branding Assets',
      titleUr: 'سرکاری برانڈنگ اثاثہ جات',
      icon: 'fas fa-images',
      actions: [
        {
          textEn: 'Upload Stamp',
          textUr: 'مہر اپلوڈ کریں',
          icon: 'fas fa-upload',
          type: 'primary',
          onClick: "const inp = document.getElementById('stampFileInput'); if (inp) inp.click();"
        }
      ]
    },
    'settings-layout': {
      titleEn: 'Edit Layout (Hero Section)',
      titleUr: 'ترتیبات: لے آؤٹ میں ترمیم',
      icon: 'fas fa-paintbrush',
      actions: []
    },
    'org-departments': {
      titleEn: 'Departments & Wings',
      titleUr: 'شعبہ جات اور ونگز',
      icon: 'fas fa-building-user',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('org-departments')"
        },
        {
          textEn: 'Add New Department',
          textUr: 'نیا شعبہ شامل کریں',
          icon: 'fas fa-plus-circle',
          type: 'primary',
          permission: 'can_manage_users',
          onClick: 'openAddDepartmentModal()'
        }
      ]
    },
    'org-roles': {
      titleEn: 'User Roles & Access Levels',
      titleUr: 'صارفین کے کردار و درجات',
      icon: 'fas fa-user-shield',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('org-roles')"
        },
        {
          textEn: 'Add New User Role',
          textUr: 'نیا رول شامل کریں',
          icon: 'fas fa-plus-circle',
          type: 'primary',
          permission: 'can_manage_users',
          onClick: 'openAddRoleModal()'
        }
      ]
    },
    'org-designations': {
      titleEn: 'Designations & Job Titles',
      titleUr: 'عہدے اور دفتری خطابات',
      icon: 'fas fa-award',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('org-designations')"
        },
        {
          textEn: 'Add New Designation',
          textUr: 'نیا عہدہ شامل کریں',
          icon: 'fas fa-plus-circle',
          type: 'primary',
          permission: 'can_manage_users',
          onClick: 'openAddDesignationModal()'
        }
      ]
    },
    'org-categories': {
      titleEn: 'Project & News Categories',
      titleUr: 'فلاحی منصوبوں اور خبروں کے زمرہ جات',
      icon: 'fas fa-shapes',
      actions: [
        {
          textEn: 'Print / Export PDF',
          textUr: 'پرنٹ / پی ڈی ایف',
          icon: 'fas fa-print',
          type: 'secondary',
          onClick: "exportTablePDF('org-categories')"
        },
        {
          textEn: 'Add New Project Category',
          textUr: 'نیا زمرہ شامل کریں',
          icon: 'fas fa-plus-circle',
          type: 'primary',
          permission: 'can_manage_projects',
          onClick: 'openAddCategoryModal()'
        }
      ]
    },
    'announcements': {
      titleEn: 'Announcement Bar',
      titleUr: 'اعلانات بار',
      icon: 'fas fa-bullhorn',
      actions: [
        {
          textEn: 'Refresh',
          textUr: 'تازہ کریں',
          icon: 'fas fa-rotate',
          type: 'secondary',
          onClick: 'loadAnnouncements()'
        },
        {
          textEn: 'Add New Announcement',
          textUr: 'نیا اعلان شامل کریں',
          icon: 'fas fa-plus',
          type: 'primary',
          permission: 'can_manage_settings',
          onClick: 'openAnnouncementModal()'
        }
      ]
    },
    'menus': {
      titleEn: 'Menu Management',
      titleUr: 'مینو مینجمنٹ',
      icon: 'fas fa-compass',
      actions: [
        {
          textEn: 'Assign Page to Menu',
          textUr: 'صفحہ مینو میں شامل کریں',
          icon: 'fas fa-link',
          type: 'secondary',
          permission: 'can_manage_settings',
          onClick: 'openMenuItemModal()'
        },
        {
          textEn: 'Create New Menu',
          textUr: 'نیا مینو بنائیں',
          icon: 'fas fa-plus',
          type: 'primary',
          permission: 'can_manage_settings',
          onClick: 'openMenuModal()'
        }
      ]
    },
    'hero-slides': {
      titleEn: 'Hero Slider',
      titleUr: 'ہیرو سلائیڈر',
      icon: 'fas fa-images',
      actions: [
        {
          textEn: 'Refresh',
          textUr: 'تازہ کریں',
          icon: 'fas fa-rotate',
          type: 'secondary',
          onClick: 'loadHeroSlides()'
        },
        {
          textEn: 'Add New Slide',
          textUr: 'نئی سلائیڈ شامل کریں',
          icon: 'fas fa-plus',
          type: 'primary',
          permission: 'can_manage_settings',
          onClick: 'openHeroSlideModal()'
        }
      ]
    }
  };

  function updateTopbarHeader(tabId) {
    const titleEl = document.getElementById('adminPageTitle');
    const iconEl = document.getElementById('adminPageIcon');
    const actionContainer = document.getElementById('topbarContextualActionContainer');
    const cfg = PAGE_CONFIG[tabId] || { titleEn: 'Executive Overview', titleUr: 'انتظامی جائزہ', icon: 'fas fa-chart-pie', actions: [] };

    const isUrdu = document.documentElement.lang === 'ur' || document.body.classList.contains('lang-ur');

    if (titleEl) {
      titleEl.textContent = isUrdu ? cfg.titleUr : cfg.titleEn;
      titleEl.setAttribute('data-en', cfg.titleEn);
      titleEl.setAttribute('data-ur', cfg.titleUr);
    }

    if (iconEl && cfg.icon) {
      iconEl.innerHTML = `<i class="${cfg.icon}"></i>`;
    }

    if (actionContainer) {
      actionContainer.innerHTML = '';

      if (cfg.isProjectsTab) {
        // Render view toggle (Cards / Table) + Print + Add Project in the header
        const viewMode = (typeof projectsFilterState !== 'undefined' && projectsFilterState.view) ? projectsFilterState.view : 'cards';
        actionContainer.innerHTML = `
          <div class="topbar-view-toggle-group">
            <button type="button" class="btn-proj-view-mode ${viewMode === 'cards' ? 'active' : ''}" id="topbarBtnProjCards" onclick="setProjectsViewMode('cards')" title="Card View">
              <i class="fas fa-grip"></i> <span>${isUrdu ? 'کارڈ ویو' : 'Cards'}</span>
            </button>
            <button type="button" class="btn-proj-view-mode ${viewMode === 'table' ? 'active' : ''}" id="topbarBtnProjTable" onclick="setProjectsViewMode('table')" title="Table View">
              <i class="fas fa-table-list"></i> <span>${isUrdu ? 'ٹیبل ویو' : 'Table'}</span>
            </button>
          </div>
          <button type="button" class="topbar-action-btn-secondary" onclick="exportTablePDF('projects')" title="Print or Export Projects to PDF">
            <i class="fas fa-print"></i> <span>${isUrdu ? 'پرنٹ / پی ڈی ایف' : 'Print / PDF'}</span>
          </button>
          <button type="button" class="btn-admin btn-admin-primary topbar-action-btn" onclick="openAddProjectModal()">
            <i class="fas fa-plus-circle"></i> <span>${isUrdu ? 'نیا منصوبہ' : 'Add New Welfare Project'}</span>
          </button>
        `;
        return;
      }

      if (cfg.actions && cfg.actions.length > 0) {
        cfg.actions.forEach(act => {
          const isSuper = !currentUser ||
            currentUser.role === 'superadmin' ||
            currentUser.role === 'admin' ||
            currentUser.is_super_admin === 1 ||
            currentUser.is_admin === 1;

          let userPerms = currentUser && currentUser.permissions;
          if (typeof userPerms === 'string') {
            try { userPerms = JSON.parse(userPerms); } catch (e) { userPerms = [userPerms]; }
          }
          if (!Array.isArray(userPerms)) userPerms = [];

          const permRaw = act.permission || '';
          const permKey = permRaw.replace(/^can_manage_/, '').replace(/^can_view_/, '');

          const canExecute = !act.permission || isSuper ||
            userPerms.includes(permRaw) ||
            userPerms.includes(permKey) ||
            (permKey === 'finance' && (userPerms.includes('accounts') || userPerms.includes('donations'))) ||
            (permKey === 'news' && userPerms.includes('articles')) ||
            (permKey === 'users' && userPerms.includes('users')) ||
            (permKey === 'projects' && userPerms.includes('projects')) ||
            (permKey === 'volunteers' && userPerms.includes('volunteers')) ||
            (permKey === 'applications' && userPerms.includes('applications')) ||
            currentUser[act.permission] === 1 ||
            currentUser[act.permission] === true;

          if (canExecute) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = act.type === 'primary' 
              ? 'btn-admin btn-admin-primary topbar-action-btn' 
              : 'topbar-action-btn-secondary';
            const labelText = isUrdu ? (act.textUr || act.textEn) : act.textEn;
            btn.innerHTML = `<i class="${act.icon}"></i> <span>${labelText}</span>`;
            btn.onclick = () => {
              if (act.onClick.includes('(')) {
                eval(act.onClick);
              } else if (typeof window[act.onClick] === 'function') {
                window[act.onClick]();
              }
            };
            actionContainer.appendChild(btn);
          }
        });
      }
    }
  }

  function switchTab(tabId) {
    // Normalization / Aliases
    if (tabId === 'branding') tabId = 'settings-branding';
    if (tabId === 'settings') tabId = 'settings-bank';

    // Role-based navigation guard
    if (!isTabPermitted(tabId)) {
      console.warn(`Access denied to tab '${tabId}' for user role '${currentUser?.role}'`);
      tabId = getFirstPermittedTab();
    }

    activeTab = tabId;
    updateTopbarHeader(tabId);

    // Reset all top-level items and submenu items
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('active', 'active-parent');
    });
    document.querySelectorAll('.submenu-item').forEach(subItem => {
      subItem.classList.remove('active');
    });

    // Mark current active nav link
    allNavLinks.forEach(l => {
      if (l.dataset.tab === tabId) {
        const parentSub = l.closest('.submenu-item');
        if (parentSub) {
          parentSub.classList.add('active');
          const orgParent = l.closest('#sidebarOrgItem');
          if (orgParent) {
            orgParent.classList.add('open', 'active-parent');
          }
          if (sidebarSettingsItem && l.closest('#sidebarSettingsItem')) {
            sidebarSettingsItem.classList.add('open', 'active-parent');
          }
        } else {
          l.closest('.sidebar-item').classList.add('active');
        }
      }
    });

    // Show matching tab pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Close mobile sidebar drawer if open
    closeMobileSidebar();

    // Load data for specific tab
    if (tabId === 'overview') loadOverview();
    if (tabId === 'users') loadUsers();
    if (tabId === 'accounts') loadAccounts();
    if (tabId === 'volunteers') loadVolunteers();
    if (tabId === 'branding' || tabId === 'settings-branding') loadBrandingAssets();
    if (tabId === 'projects') loadProjects();
    if (tabId === 'articles') loadArticles();
    if (tabId === 'stats') loadStats();
    if (tabId === 'applications') loadApplications();
    if (tabId === 'donations') loadDonations();
    if (tabId === 'submissions') loadSubmissions();
    if (tabId === 'org-departments') loadDepartments();
    if (tabId === 'org-roles') loadRoles();
    if (tabId === 'org-designations') loadDesignations();
    if (tabId === 'org-categories') loadCategories();
    if (tabId === 'announcements') loadAnnouncements();
    if (tabId === 'menus') loadMenus();
    if (tabId === 'hero-slides') loadHeroSlides();
    if (tabId === 'settings' || tabId === 'settings-bank' || tabId === 'settings-contact' || tabId === 'settings-layout') {
      loadSettings();
      if (tabId === 'settings-layout') {
        setTimeout(updateHeroLivePreview, 120);
      }
    }
  }

  // Mobile sidebar drawer & backdrop controls
  const adminSidebar = document.getElementById('adminSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

  function openMobileSidebar() {
    if (adminSidebar) adminSidebar.classList.add('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    if (adminSidebar) adminSidebar.classList.remove('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  }

  const menuToggle = document.getElementById('adminMenuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      openMobileSidebar();
    });
  }

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }

  // ==================== OVERVIEW TAB ====================
  async function loadOverview() {
    try {
      const res = await fetch('/api/admin/overview');
      const data = await res.json();
      if (data.success && data.data) {
        const counts = data.data.counts;
        document.getElementById('metricProjects').textContent = counts.projects || 0;
        document.getElementById('metricArticles').textContent = counts.articles || 0;
        document.getElementById('metricPendingApps').textContent = counts.pendingApplications || 0;
        document.getElementById('metricDonationsTotal').textContent = `PKR ${(counts.verifiedDonationsTotal || 0).toLocaleString()}`;

        // Recent applications table
        const appsTable = document.getElementById('recentAppsTableBody');
        if (appsTable && data.data.recentApplications) {
          appsTable.innerHTML = data.data.recentApplications.map(app => `
            <tr>
              <td><strong>${app.tracking_number}</strong></td>
              <td>${app.applicant_name}</td>
              <td>${app.phone}</td>
              <td><span class="badge badge-${app.status === 'approved' ? 'success' : (app.status === 'pending' ? 'warning' : 'info')}">${app.status}</span></td>
              <td>${new Date(app.created_at).toLocaleDateString()}</td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error loading overview:', err);
    }
  }

  // ==================== BRANDING (LOGO & FLAG) MANAGEMENT ====================
  let officialStampsList = [];
  let activeReceiptStampId = null;
  let currentBrandingAssets = null;

  async function loadBrandingAssets() {
    try {
      const res = await fetch('/api/admin/branding-assets');
      const data = await res.json();
      if (data.success && data.assets) {
        currentBrandingAssets = data.assets;
        const logoUrl = data.assets.site_logo_url || '/media/branding/logo.svg';
        const flagUrl = data.assets.site_flag_url || '/media/branding/flag.svg';
        const cacheBust = `?v=${Date.now()}`;

        const logoPreview = document.getElementById('currentLogoPreview');
        const flagPreview = document.getElementById('currentFlagPreview');
        if (logoPreview) {
          logoPreview.src = logoUrl.includes('?') ? logoUrl : `${logoUrl}${cacheBust}`;
          logoPreview.onerror = function() { this.onerror = null; this.src = '/media/branding/logo.svg'; };
        }
        if (flagPreview) {
          flagPreview.src = flagUrl.includes('?') ? flagUrl : `${flagUrl}${cacheBust}`;
          flagPreview.onerror = function() { this.onerror = null; this.src = '/media/branding/flag.svg'; };
        }

        document.querySelectorAll('.sidebar-logo, .admin-login-logo').forEach(img => {
          img.src = logoUrl.includes('?') ? logoUrl : `${logoUrl}${cacheBust}`;
          img.onerror = function() { this.onerror = null; this.src = '/media/branding/logo.svg'; };
        });

        if (data.stamps) {
          officialStampsList = data.stamps;
          renderStampsGallery(officialStampsList);
          populateReceiptStampSelector(officialStampsList);
        }

        // Populate Foundation Names in Branding Tab
        const nameEnInput = document.getElementById('branding_foundation_name_en');
        const nameUrInput = document.getElementById('branding_foundation_name_ur');
        if (nameEnInput && data.assets.foundation_name_en) {
          nameEnInput.value = data.assets.foundation_name_en;
        }
        if (nameUrInput && data.assets.foundation_name_ur) {
          nameUrInput.value = data.assets.foundation_name_ur;
        }

        // Load official signatures
        loadOfficialSignatures();
      }
    } catch (err) {
      console.error('Error loading branding assets:', err);
    }
  }

  // Handle Foundation Name in Urdu and English update
  window.handleBrandingNamesSubmit = async function(e) {
    if (e) e.preventDefault();
    const statusDiv = document.getElementById('brandingNamesStatus');
    const nameEn = document.getElementById('branding_foundation_name_en').value.trim();
    const nameUr = document.getElementById('branding_foundation_name_ur').value.trim();

    if (!nameEn || !nameUr) {
      alert('Both English and Urdu foundation names are required.');
      return;
    }

    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.className = 'badge badge-info';
      statusDiv.textContent = 'Saving official foundation names to database...';
    }

    try {
      const res = await fetch('/api/admin/branding-assets/names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foundation_name_en: nameEn, foundation_name_ur: nameUr })
      });
      const result = await res.json();
      if (result.success) {
        if (statusDiv) {
          statusDiv.className = 'badge badge-success';
          statusDiv.textContent = result.message || 'Foundation names saved successfully!';
        }
        document.querySelectorAll('.sidebar-title').forEach(el => el.textContent = nameEn);
      } else {
        if (statusDiv) {
          statusDiv.className = 'badge badge-danger';
          statusDiv.textContent = result.message || 'Failed to save foundation names.';
        }
      }
    } catch (err) {
      if (statusDiv) {
        statusDiv.className = 'badge badge-danger';
        statusDiv.textContent = 'Network or server error updating foundation names.';
      }
    }
  };

  // Logo Upload Form
  const logoUploadForm = document.getElementById('logoUploadForm');
  if (logoUploadForm) {
    logoUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusDiv = document.getElementById('logoUploadStatus');
      const fileInput = document.getElementById('logoFileInput');
      const submitBtn = logoUploadForm.querySelector('button[type="submit"]');

      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please choose a logo file to upload.');
        return;
      }

      const formData = new FormData();
      formData.append('logo', fileInput.files[0]);

      submitBtn.disabled = true;
      statusDiv.style.display = 'block';
      statusDiv.className = 'badge badge-info';
      statusDiv.textContent = 'Uploading new official foundation logo...';

      try {
        const res = await fetch('/api/admin/branding-assets/logo', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();

        if (result.success) {
          statusDiv.className = 'badge badge-success';
          statusDiv.textContent = result.message || 'Logo updated successfully!';
          const newUrl = `${result.url}?v=${Date.now()}`;
          const logoPreview = document.getElementById('currentLogoPreview');
          if (logoPreview) logoPreview.src = newUrl;
          document.querySelectorAll('.sidebar-logo, .admin-login-logo').forEach(img => {
            img.src = newUrl;
          });
        } else {
          statusDiv.className = 'badge badge-danger';
          statusDiv.textContent = result.message || 'Error uploading logo.';
        }
      } catch (err) {
        statusDiv.className = 'badge badge-danger';
        statusDiv.textContent = 'Upload failed. Check file type and size.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Flag Upload Form
  const flagUploadForm = document.getElementById('flagUploadForm');
  if (flagUploadForm) {
    flagUploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusDiv = document.getElementById('flagUploadStatus');
      const fileInput = document.getElementById('flagFileInput');
      const submitBtn = flagUploadForm.querySelector('button[type="submit"]');

      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please choose a flag file to upload.');
        return;
      }

      const formData = new FormData();
      formData.append('flag', fileInput.files[0]);

      submitBtn.disabled = true;
      statusDiv.style.display = 'block';
      statusDiv.className = 'badge badge-info';
      statusDiv.textContent = 'Uploading new official foundation flag...';

      try {
        const res = await fetch('/api/admin/branding-assets/flag', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();

        if (result.success) {
          statusDiv.className = 'badge badge-success';
          statusDiv.textContent = result.message || 'Flag updated successfully!';
          const newUrl = `${result.url}?v=${Date.now()}`;
          const flagPreview = document.getElementById('currentFlagPreview');
          if (flagPreview) flagPreview.src = newUrl;
        } else {
          statusDiv.className = 'badge badge-danger';
          statusDiv.textContent = result.message || 'Error uploading flag.';
        }
      } catch (err) {
        statusDiv.className = 'badge badge-danger';
        statusDiv.textContent = 'Upload failed. Check file type and size.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // ==================== OFFICIAL STAMPS MANAGEMENT ====================
  function renderStampsGallery(stamps) {
    const container = document.getElementById('brandingStampsList');
    if (!container) return;

    if (!stamps || stamps.length === 0) {
      container.innerHTML = '<div style="color: #64748B; font-size: 0.8rem; text-align: center; padding: 12px;">No official stamps uploaded yet.</div>';
      return;
    }

    container.innerHTML = stamps.map(s => `
      <div style="display: flex; align-items: center; justify-content: space-between; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${s.image_url}" alt="${escapeHtml(s.name)}" style="width: 44px; height: 44px; object-fit: contain; background: #FFF; border: 1px solid #CBD5E1; border-radius: 6px; padding: 2px;" />
          <div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #1E293B;">
              ${escapeHtml(s.name)}
              ${s.is_default ? '<span style="background: #DCFCE7; color: #166534; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 700;">DEFAULT</span>' : ''}
            </div>
            <div style="font-size: 0.72rem; color: #64748B;">Added on ${new Date(s.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          ${!s.is_default ? `
            <button type="button" class="btn-admin btn-admin-secondary" style="padding: 4px 8px; font-size: 0.72rem;" onclick="setDefaultStamp(${s.id})" title="Set as default stamp on receipts">
              Set Default
            </button>
          ` : ''}
          <button type="button" class="btn-admin btn-admin-danger" style="padding: 4px 8px; font-size: 0.72rem;" onclick="deleteStamp(${s.id})" title="Delete stamp">
            <i class="fas fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  function populateReceiptStampSelector(stamps) {
    const sel = document.getElementById('receiptStampSelect');
    if (!sel) return;

    sel.innerHTML = '<option value="">No Stamp / بغیر مہر</option>' +
      stamps.map(s => `<option value="${s.id}" ${s.is_default ? 'selected' : ''}>${escapeHtml(s.name)}${s.is_default ? ' (Default)' : ''}</option>`).join('');

    const def = stamps.find(s => s.is_default == 1);
    if (def && !activeReceiptStampId) {
      activeReceiptStampId = def.id;
    }
  }

  window.onReceiptStampChange = function() {
    const sel = document.getElementById('receiptStampSelect');
    activeReceiptStampId = sel ? sel.value : null;
    if (activeReceiptDonation) {
      renderReceiptSlip(activeReceiptDonation, activeReceiptLang);
    }
  };

  window.handleStampUpload = async function(e) {
    if (e) e.preventDefault();
    const statusDiv = document.getElementById('stampUploadStatus');
    const nameInput = document.getElementById('stampNameInput');
    const fileInput = document.getElementById('stampFileInput');
    const defaultCheck = document.getElementById('stampIsDefaultCheckbox');
    const form = document.getElementById('stampUploadForm');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Please select a stamp image file.');
      return;
    }

    const formData = new FormData();
    formData.append('stamp', fileInput.files[0]);
    formData.append('name', nameInput.value.trim());
    formData.append('is_default', defaultCheck && defaultCheck.checked ? 'true' : 'false');

    if (submitBtn) submitBtn.disabled = true;
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.className = 'badge badge-info';
      statusDiv.textContent = 'Uploading new official stamp...';
    }

    try {
      const res = await fetch('/api/admin/branding-assets/stamps', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (statusDiv) {
          statusDiv.className = 'badge badge-success';
          statusDiv.textContent = 'Official stamp uploaded successfully!';
        }
        form.reset();
        loadBrandingAssets();
      } else {
        if (statusDiv) {
          statusDiv.className = 'badge badge-danger';
          statusDiv.textContent = data.message || 'Error uploading stamp.';
        }
      }
    } catch (err) {
      if (statusDiv) {
        statusDiv.className = 'badge badge-danger';
        statusDiv.textContent = 'Upload failed. Check file type and size.';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };

  window.setDefaultStamp = async function(id) {
    try {
      const res = await fetch(`/api/admin/branding-assets/stamps/${id}/default`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        loadBrandingAssets();
      } else {
        alert(data.message || 'Failed to update default stamp.');
      }
    } catch (err) {
      alert('Error setting default stamp.');
    }
  };

  window.deleteStamp = async function(id) {
    if (!confirm('Are you sure you want to delete this official stamp?')) return;
    try {
      const res = await fetch(`/api/admin/branding-assets/stamps/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadBrandingAssets();
      } else {
        alert(data.message || 'Failed to delete stamp.');
      }
    } catch (err) {
      alert('Error deleting stamp.');
    }
  };

  // ==================== OFFICIAL SIGNATURES MANAGEMENT ====================
  let officialSignaturesList = [];

  async function loadOfficialSignatures() {
    try {
      const res = await fetch('/api/admin/branding-assets/signatures');
      const data = await res.json();
      if (data.success && Array.isArray(data.signatures)) {
        officialSignaturesList = data.signatures;
        renderSignaturesGallery(officialSignaturesList);
        populateSignatureSelectors(officialSignaturesList);
      }
    } catch (err) {
      console.error('Error loading official signatures:', err);
    }
  }

  function renderSignaturesGallery(signatures) {
    const container = document.getElementById('brandingSignaturesList');
    if (!container) return;

    if (!signatures || signatures.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 20px; text-align: center; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; color: #64748B;">
          <i class="fas fa-file-signature" style="font-size: 1.8rem; color: #94A3B8; margin-bottom: 8px; display: block;"></i>
          No official signatures uploaded yet. Upload an authorized signature below.
        </div>
      `;
      return;
    }

    container.innerHTML = signatures.map(sig => {
      const isDef = Boolean(sig.is_default);
      return `
        <div class="admin-card" style="padding: 14px; border: 1.5px solid ${isDef ? '#047857' : '#E2E8F0'}; background: ${isDef ? '#F0FDF4' : '#FFFFFF'}; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; position: relative;">
          ${isDef ? '<span class="badge badge-success" style="position: absolute; top: 10px; right: 10px; font-size: 0.68rem;"><i class="fas fa-check"></i> Default Active</span>' : ''}
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 80px; height: 50px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; display: flex; align-items: center; justify-content: center; padding: 4px; overflow: hidden; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <img src="${escapeHtml(sig.signature_url)}" alt="${escapeHtml(sig.name)}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: invert(34%) sepia(85%) saturate(750%) hue-rotate(120deg) brightness(90%) contrast(98%);" />
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 700; color: #0F172A; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(sig.name)}
              </div>
              <div style="font-size: 0.76rem; color: #047857; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(sig.designation || 'Signatory')}
              </div>
              ${sig.designation_ur ? `
                <div style="font-size: 0.72rem; color: #475569; direction: rtl; font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif;">
                  ${escapeHtml(sig.designation_ur)}
                </div>
              ` : ''}
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid ${isDef ? '#DCFCE7' : '#F1F5F9'}; padding-top: 8px;">
            ${!isDef ? `
              <button type="button" class="btn-action" onclick="setDefaultSignature(${sig.id})" title="Set as System Default Signature" style="font-size: 0.74rem; padding: 3px 8px; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 4px;">
                <i class="fas fa-check"></i> Set Default
              </button>
            ` : ''}
            <button type="button" class="btn-action btn-action-delete" onclick="deleteSignature(${sig.id})" title="Delete Signature" aria-label="Delete signature">
              <i class="fas fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function populateSignatureSelectors(signatures) {
    const selectors = ['user_signature_id', 'man_vol_signature_id', 'edit_vol_signature_id'];
    selectors.forEach(selId => {
      const el = document.getElementById(selId);
      if (!el) return;
      const currentVal = el.value;
      let opts = '<option value="">Default (Founder & CEO Signature)</option>';
      if (signatures && signatures.length > 0) {
        signatures.forEach(s => {
          opts += `<option value="${s.id}">${escapeHtml(s.name)} - ${escapeHtml(s.designation || 'Signatory')}${s.is_default ? ' [Default]' : ''}</option>`;
        });
      }
      el.innerHTML = opts;
      if (currentVal) el.value = currentVal;
    });
  }

  window.handleSignatureUpload = async function(e) {
    if (e) e.preventDefault();
    const statusDiv = document.getElementById('signatureUploadStatus');
    const nameInput = document.getElementById('sigNameInput');
    const desInput = document.getElementById('sigDesignationInput');
    const desUrInput = document.getElementById('sigDesignationUrInput');
    const fileInput = document.getElementById('sigFileInput');
    const defaultCheck = document.getElementById('sigIsDefaultCheckbox');
    const form = document.getElementById('signatureUploadForm');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Please select a signature image file.');
      return;
    }

    const formData = new FormData();
    formData.append('signature', fileInput.files[0]);
    formData.append('name', nameInput.value.trim());
    formData.append('designation', desInput.value.trim());
    formData.append('designation_ur', desUrInput.value.trim());
    formData.append('is_default', defaultCheck && defaultCheck.checked ? 'true' : 'false');

    if (submitBtn) submitBtn.disabled = true;
    if (statusDiv) {
      statusDiv.style.display = 'block';
      statusDiv.className = 'badge badge-info';
      statusDiv.textContent = 'Uploading new official signature...';
    }

    try {
      const res = await fetch('/api/admin/branding-assets/signatures', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (statusDiv) {
          statusDiv.className = 'badge badge-success';
          statusDiv.textContent = 'Official authorized signature uploaded successfully!';
        }
        form.reset();
        loadOfficialSignatures();
      } else {
        if (statusDiv) {
          statusDiv.className = 'badge badge-danger';
          statusDiv.textContent = data.message || 'Error uploading signature.';
        }
      }
    } catch (err) {
      if (statusDiv) {
        statusDiv.className = 'badge badge-danger';
        statusDiv.textContent = 'Upload failed. Check file type and size.';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };

  window.setDefaultSignature = async function(id) {
    try {
      const res = await fetch(`/api/admin/branding-assets/signatures/${id}/default`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        loadOfficialSignatures();
      } else {
        alert(data.message || 'Failed to update default signature.');
      }
    } catch (err) {
      alert('Error setting default signature.');
    }
  };

  window.deleteSignature = async function(id) {
    if (!confirm('Are you sure you want to delete this official signature?')) return;
    try {
      const res = await fetch(`/api/admin/branding-assets/signatures/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadOfficialSignatures();
      } else {
        alert(data.message || 'Failed to delete signature.');
      }
    } catch (err) {
      alert('Error deleting signature.');
    }
  };

  // ==================== WELFARE PROJECTS MANAGEMENT ====================
  let projectsFilterState = {
    view: 'cards',
    page: 1,
    limit: 12,
    search: '',
    status: '',
    category_id: '',
    progress_range: '',
    sort_by: 'newest'
  };
  let currentProjectsList = [];
  let currentDetailProjectId = null;

  async function loadProjects(page = 1) {
    projectsFilterState.page = page;

    const searchInput = document.getElementById('projFilterSearch');
    const statusSelect = document.getElementById('projFilterStatus');
    const catSelect = document.getElementById('projFilterCategory');
    const progSelect = document.getElementById('projFilterProgress');
    const sortSelect = document.getElementById('projFilterSort');

    if (searchInput) projectsFilterState.search = searchInput.value.trim();
    if (statusSelect) projectsFilterState.status = statusSelect.value;
    if (catSelect) projectsFilterState.category_id = catSelect.value;
    if (progSelect) projectsFilterState.progress_range = progSelect.value;
    if (sortSelect) projectsFilterState.sort_by = sortSelect.value;

    const params = new URLSearchParams();
    if (projectsFilterState.search) params.append('search', projectsFilterState.search);
    if (projectsFilterState.status) params.append('status', projectsFilterState.status);
    if (projectsFilterState.category_id) params.append('category_id', projectsFilterState.category_id);
    if (projectsFilterState.progress_range) params.append('progress_range', projectsFilterState.progress_range);
    if (projectsFilterState.sort_by) params.append('sort_by', projectsFilterState.sort_by);
    params.append('page', projectsFilterState.page);
    params.append('limit', projectsFilterState.limit);

    try {
      const res = await fetch(`/api/admin/projects?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        console.error('Failed to load projects:', data.message);
        return;
      }

      currentProjectsList = data.projects || [];

      // 1. Update Top Metric Stat Counters
      if (data.stats) {
        const elTotal = document.getElementById('projStatTotal');
        const elActive = document.getElementById('projStatActive');
        const elCompleted = document.getElementById('projStatCompleted');
        const elClosed = document.getElementById('projStatClosed');

        if (elTotal) elTotal.textContent = data.stats.total || 0;
        if (elActive) elActive.textContent = data.stats.active_count || 0;
        if (elCompleted) elCompleted.textContent = data.stats.completed_count || 0;
        if (elClosed) elClosed.textContent = data.stats.closed_count || 0;
      }

      // 2. Update Result Counter Text
      const counterText = document.getElementById('projectsFilterResultCount');
      if (counterText) {
        const total = data.pagination ? data.pagination.total : currentProjectsList.length;
        counterText.textContent = `Showing ${currentProjectsList.length} of ${total} projects`;
      }

      // 3. Render Both Card & Table Views
      renderProjectsCards(currentProjectsList);
      renderProjectsTable(currentProjectsList);

      // 4. Render Pagination
      renderProjectsPagination(data.pagination);

    } catch (err) {
      console.error('[Load Projects Error]', err);
    }
  }

  function renderProjectsCards(projects) {
    const container = document.getElementById('projectsCardsContainer');
    if (!container) return;

    if (!projects || projects.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 12px; color: #64748B;">
          <div style="font-size: 2.2rem; color: #94A3B8; margin-bottom: 12px;"><i class="fas fa-hand-holding-heart"></i></div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: #1E293B; margin-bottom: 6px;">No Welfare Projects Match Criteria</h3>
          <p style="font-size: 0.85rem; margin-bottom: 16px;">Try adjusting your search keywords, category, or status filter.</p>
          <button type="button" class="btn-admin btn-admin-secondary" onclick="clearProjectsFilters()"><i class="fas fa-rotate-left"></i> Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = projects.map(p => {
      const status = (p.status || 'active').toLowerCase();
      const statusDisplay = status === 'active' ? 'Active' : (status.charAt(0).toUpperCase() + status.slice(1));
      const goal = parseFloat(p.goal_amount) || 0;
      const raised = parseFloat(p.raised_amount) || 0;
      const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
      const isClosed = status === 'closed';
      const isCompleted = status === 'completed';

      return `
        <div class="project-mgmt-card ${isClosed ? 'status-closed-card' : ''} ${isCompleted ? 'status-completed-card' : ''}">
          <div class="project-mgmt-banner">
            <img src="${p.image_url || '/media/projects/orphan_education.jpg'}" alt="${escapeHtml(p.title_en)}" class="project-mgmt-img" onerror="this.src='/media/projects/orphan_education.jpg'" />
            <div class="project-mgmt-overlay-status">
              <span class="status-pill status-${status}">
                <i class="fas fa-circle" style="font-size: 0.45rem;"></i> ${statusDisplay}
              </span>
            </div>
            <span class="project-mgmt-cat-badge">
              <i class="fas fa-tag" style="font-size: 0.65rem;"></i> ${escapeHtml(p.category_name_en || 'General')}
            </span>
          </div>

          <div class="project-mgmt-body">
            <div>
              <h3 class="project-mgmt-title-en">${escapeHtml(p.title_en)}</h3>
              <div class="project-mgmt-title-ur" dir="rtl">${escapeHtml(p.title_ur || '')}</div>
              <p class="project-mgmt-desc">${escapeHtml(p.short_desc_en || p.short_desc_ur || 'No description available.')}</p>
            </div>

            <div>
              <div class="project-mgmt-metrics">
                <div class="project-mgmt-financials">
                  <span class="project-mgmt-raised">PKR ${raised.toLocaleString()}</span>
                  <span class="project-mgmt-goal">Goal: PKR ${goal.toLocaleString()}</span>
                </div>
                <div class="project-mgmt-progress-bar">
                  <div class="project-mgmt-progress-fill" style="width: ${progress}%;"></div>
                </div>
                <div class="project-mgmt-footer-info">
                  <span>${progress}% Funded</span>
                  <span><i class="fas fa-users" style="font-size: 0.7rem;"></i> ${p.beneficiaries_count || 0} ${escapeHtml(p.beneficiaries_label_en || 'Beneficiaries')}</span>
                </div>
              </div>

              <div class="project-mgmt-actions">
                <button type="button" class="btn-admin btn-admin-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="viewProjectDetails(${p.id})">
                  <i class="fas fa-eye"></i> View & Ledger
                </button>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="btn-action btn-action-edit" onclick="editProject(${p.id})" title="Edit Project Details" aria-label="Edit project">
                    <i class="fas fa-pen"></i>
                  </button>
                  ${status === 'active' ? `
                    <button type="button" class="btn-action btn-action-confirm" onclick="completeProject(${p.id})" title="Mark as Completed" aria-label="Mark completed">
                      <i class="fas fa-check-double"></i>
                    </button>
                    <button type="button" class="btn-action btn-action-refund" onclick="closeProjectWithConfirmation(${p.id})" title="Close Project (Preserves all history)" aria-label="Close project">
                      <i class="fas fa-lock"></i>
                    </button>
                  ` : ''}
                  ${status === 'completed' ? `
                    <button type="button" class="btn-action btn-action-refund" onclick="closeProjectWithConfirmation(${p.id})" title="Close Project" aria-label="Close project">
                      <i class="fas fa-lock"></i>
                    </button>
                    <button type="button" class="btn-action btn-action-view" onclick="activateProject(${p.id})" title="Reactivate Project" aria-label="Reactivate project">
                      <i class="fas fa-arrow-rotate-left"></i>
                    </button>
                  ` : ''}
                  ${status === 'closed' ? `
                    <button type="button" class="btn-action btn-action-view" onclick="activateProject(${p.id})" title="Reopen / Activate Project" aria-label="Reopen project">
                      <i class="fas fa-lock-open"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderProjectsTable(projects) {
    const tbody = document.getElementById('projectsTableBody');
    if (!tbody) return;

    if (!projects || projects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 30px;">No welfare projects found matching current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = projects.map(p => {
      const status = (p.status || 'active').toLowerCase();
      const statusDisplay = status === 'active' ? 'Active' : (status.charAt(0).toUpperCase() + status.slice(1));
      const goal = parseFloat(p.goal_amount) || 0;
      const raised = parseFloat(p.raised_amount) || 0;
      const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

      const startDateStr = p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A';
      const expectedDateStr = p.expected_completion_date ? new Date(p.expected_completion_date).toLocaleDateString() : '';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${p.image_url || '/media/projects/orphan_education.jpg'}" style="width: 52px; height: 40px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" onerror="this.src='/media/projects/orphan_education.jpg'" />
              <div>
                <strong style="color: #0F172A; font-size: 0.92rem;">${escapeHtml(p.title_en)}</strong>
                <div style="font-size: 0.78rem; color: #64748B; font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif;" dir="rtl">${escapeHtml(p.title_ur || '')}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge badge-secondary" style="font-size: 0.74rem;">${escapeHtml(p.category_name_en || 'General')}</span>
          </td>
          <td style="font-size: 0.78rem; color: #64748B; white-space: nowrap;">
            <div>Start: <strong>${startDateStr}</strong></div>
            ${expectedDateStr ? `<div>End: ${expectedDateStr}</div>` : ''}
          </td>
          <td style="min-width: 160px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; margin-bottom: 4px;">
              <span style="color: var(--admin-primary-dark);">PKR ${raised.toLocaleString()}</span>
              <span style="color: #64748B;">${progress}%</span>
            </div>
            <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 999px; overflow: hidden;">
              <div style="height: 100%; width: ${progress}%; background: var(--admin-primary);"></div>
            </div>
            <div style="font-size: 0.72rem; color: #64748B; margin-top: 3px;">Goal: PKR ${goal.toLocaleString()}</div>
          </td>
          <td style="font-size: 0.82rem; color: #334155;">
            <strong>${p.beneficiaries_count || 0}</strong> ${escapeHtml(p.beneficiaries_label_en || 'People')}
          </td>
          <td>
            <span class="status-pill status-${status}">
              <i class="fas fa-circle" style="font-size: 0.45rem;"></i> ${statusDisplay}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-action-view" onclick="viewProjectDetails(${p.id})" title="View Details & Ledger" aria-label="View project">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn-action btn-action-edit" onclick="editProject(${p.id})" title="Edit Project Details" aria-label="Edit project">
                <i class="fas fa-pen"></i>
              </button>
              ${status === 'active' ? `
                <button type="button" class="btn-action btn-action-confirm" onclick="completeProject(${p.id})" title="Mark as Completed" aria-label="Mark completed">
                  <i class="fas fa-check-double"></i>
                </button>
                <button type="button" class="btn-action btn-action-refund" onclick="closeProjectWithConfirmation(${p.id})" title="Close Project (Preserves all history)" aria-label="Close project">
                  <i class="fas fa-lock"></i>
                </button>
              ` : ''}
              ${status === 'completed' ? `
                <button type="button" class="btn-action btn-action-refund" onclick="closeProjectWithConfirmation(${p.id})" title="Close Project" aria-label="Close project">
                  <i class="fas fa-lock"></i>
                </button>
                <button type="button" class="btn-action btn-action-view" onclick="activateProject(${p.id})" title="Reactivate Project" aria-label="Reactivate project">
                  <i class="fas fa-arrow-rotate-left"></i>
                </button>
              ` : ''}
              ${status === 'closed' ? `
                <button type="button" class="btn-action btn-action-view" onclick="activateProject(${p.id})" title="Reopen / Activate Project" aria-label="Reopen project">
                  <i class="fas fa-lock-open"></i>
                </button>
              ` : ''}
              <button type="button" class="btn-action btn-action-delete" onclick="deleteProject(${p.id})" title="Delete Project (Blocked if donations exist)" aria-label="Delete project">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderProjectsPagination(pagination) {
    const bar = document.getElementById('projectsPaginationBar');
    const info = document.getElementById('projectsPaginationInfo');
    const controls = document.getElementById('projectsPaginationControls');
    if (!bar || !info || !controls) return;

    if (!pagination || pagination.totalPages <= 1) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    const start = ((pagination.page - 1) * pagination.limit) + 1;
    const end = Math.min(pagination.total, pagination.page * pagination.limit);
    info.textContent = `Showing ${start}-${end} of ${pagination.total} projects`;

    let html = '';
    html += `<button type="button" class="btn-page" ${pagination.page <= 1 ? 'disabled' : ''} onclick="loadProjects(${pagination.page - 1})"><i class="fas fa-chevron-left"></i></button>`;

    for (let p = 1; p <= pagination.totalPages; p++) {
      html += `<button type="button" class="btn-page ${p === pagination.page ? 'active' : ''}" onclick="loadProjects(${p})">${p}</button>`;
    }

    html += `<button type="button" class="btn-page" ${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="loadProjects(${pagination.page + 1})"><i class="fas fa-chevron-right"></i></button>`;
    controls.innerHTML = html;
  }

  window.setProjectsViewMode = function(mode) {
    projectsFilterState.view = mode;
    const btnCards = document.getElementById('btnProjViewCards');
    const btnTable = document.getElementById('btnProjViewTable');
    const topBtnCards = document.getElementById('topbarBtnProjCards');
    const topBtnTable = document.getElementById('topbarBtnProjTable');
    const cardsContainer = document.getElementById('projectsCardsContainer');
    const tableContainer = document.getElementById('projectsTableContainer');

    if (btnCards) btnCards.classList.toggle('active', mode === 'cards');
    if (btnTable) btnTable.classList.toggle('active', mode === 'table');
    if (topBtnCards) topBtnCards.classList.toggle('active', mode === 'cards');
    if (topBtnTable) topBtnTable.classList.toggle('active', mode === 'table');

    if (cardsContainer) cardsContainer.style.display = (mode === 'cards' ? 'grid' : 'none');
    if (tableContainer) tableContainer.style.display = (mode === 'table' ? 'block' : 'none');
  };

  window.applyProjectsFilters = function() {
    loadProjects(1);
  };

  window.clearProjectsFilters = function() {
    const searchInput = document.getElementById('projFilterSearch');
    const statusSelect = document.getElementById('projFilterStatus');
    const catSelect = document.getElementById('projFilterCategory');
    const progSelect = document.getElementById('projFilterProgress');
    const sortSelect = document.getElementById('projFilterSort');

    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = '';
    if (catSelect) catSelect.value = '';
    if (progSelect) progSelect.value = '';
    if (sortSelect) sortSelect.value = 'newest';

    loadProjects(1);
  };

  window.openAddProjectModal = async function() {
    if (!allCategoriesData || !allCategoriesData.length) {
      await populateOrgDropdowns();
    }
    const form = document.getElementById('formAddProject');
    if (form) form.reset();

    const hiddenId = document.getElementById('projectEditId');
    if (hiddenId) hiddenId.value = '';

    const statusField = document.getElementById('proj_status');
    if (statusField) statusField.value = 'active';

    const catSelect = document.getElementById('proj_category_id');
    if (catSelect && allCategoriesData.length > 0) {
      populateCategorySelects(allCategoriesData);
      if (!catSelect.value && allCategoriesData.length > 0) {
        catSelect.value = allCategoriesData[0].id;
      }
    }

    setProjectImage('/media/projects/orphan_education.webp');

    const heading = document.getElementById('projectModalHeading');
    if (heading) heading.innerHTML = '<i class="fas fa-hand-holding-heart"></i> Add New Welfare Project';

    const submitBtn = document.getElementById('projectSubmitBtn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Save & Publish Project';

    openModal('modalProject');
  };
  window.resetProjectForm = window.openAddProjectModal;

  window.editProject = async function(id) {
    try {
      if (!allCategoriesData || !allCategoriesData.length) {
        await populateOrgDropdowns();
      }
      const res = await fetch(`/api/admin/projects/${id}`);
      const data = await res.json();
      if (!data.success || !data.project) return alert('Failed to retrieve project details.');
      const p = data.project;

      document.getElementById('projectEditId').value = p.id;
      document.getElementById('proj_title_en').value = p.title_en || '';
      document.getElementById('proj_title_ur').value = p.title_ur || '';
      const catSelect = document.getElementById('proj_category_id');
      if (catSelect) {
        populateCategorySelects(allCategoriesData);
        catSelect.value = p.category_id || '1';
      }
      setProjectImage(p.image_url || '/media/projects/orphan_education.webp');
      document.getElementById('proj_goal_amount').value = p.goal_amount || 0;
      document.getElementById('proj_raised_amount').value = p.raised_amount || 0;
      document.getElementById('proj_beneficiaries_count').value = p.beneficiaries_count || 0;
      document.getElementById('proj_beneficiaries_label_en').value = p.beneficiaries_label_en || 'Students';
      document.getElementById('proj_short_desc_en').value = p.short_desc_en || '';
      document.getElementById('proj_short_desc_ur').value = p.short_desc_ur || '';

      const statusField = document.getElementById('proj_status');
      if (statusField) statusField.value = p.status || 'active';

      const startDateField = document.getElementById('proj_start_date');
      if (startDateField) startDateField.value = p.start_date ? p.start_date.split('T')[0] : '';

      const expectedDateField = document.getElementById('proj_expected_completion_date');
      if (expectedDateField) expectedDateField.value = p.expected_completion_date ? p.expected_completion_date.split('T')[0] : '';

      const notesField = document.getElementById('proj_notes');
      if (notesField) notesField.value = p.notes || '';

      document.getElementById('projectModalHeading').innerHTML = `<i class="fas fa-pen-to-square"></i> Edit Welfare Project #${p.id}`;
      document.getElementById('projectSubmitBtn').innerHTML = `<i class="fas fa-save"></i> Update Project`;
      openModal('modalProject');
    } catch (err) {
      alert('Error loading project for editing.');
    }
  };

  window.completeProject = async function(id) {
    if (!confirm('Are you sure you want to mark this welfare project as COMPLETED?\n\nThis indicates all targeted project work and objectives have concluded. All donation history and ledger records remain fully preserved.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/projects/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Project marked as completed.');
        loadProjects(projectsFilterState.page);
        if (currentDetailProjectId === id) viewProjectDetails(id);
      } else {
        alert(data.message || 'Failed to update status.');
      }
    } catch (err) {
      alert('Network error while completing project.');
    }
  };

  window.closeProjectWithConfirmation = async function(id) {
    const confirmationText = 
      "CRITICAL CONFIRMATION: Are you sure you want to CLOSE this welfare project?\n\n" +
      "1. Closing prevents new public donations from being accepted.\n" +
      "2. Closing DOES NOT delete donation history, donor records, ledger entries, or financial totals.\n" +
      "3. All past records remain fully auditable and accessible in historical reports.\n\n" +
      "Click OK to proceed with closing this project.";

    if (!confirm(confirmationText)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/projects/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Project successfully closed.');
        loadProjects(projectsFilterState.page);
        if (currentDetailProjectId === id) viewProjectDetails(id);
      } else {
        alert(data.message || 'Failed to close project.');
      }
    } catch (err) {
      alert('Network error while closing project.');
    }
  };

  window.activateProject = async function(id) {
    try {
      const res = await fetch(`/api/admin/projects/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      const data = await res.json();
      if (data.success) {
        alert('Project successfully reopened and set to ACTIVE.');
        loadProjects(projectsFilterState.page);
        if (currentDetailProjectId === id) viewProjectDetails(id);
      } else {
        alert(data.message || 'Failed to activate project.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  window.deleteProject = async function(id) {
    if (confirm('Are you sure you want to delete this project?\n\nNote: If donations have been accepted for this project, deletion is blocked to protect financial records; close the project instead.')) {
      const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadProjects(projectsFilterState.page);
        loadOverview();
      } else {
        alert(data.message || 'Error deleting project');
      }
    }
  };

  window.viewProjectDetails = async function(id, ledgerFilter = {}) {
    currentDetailProjectId = id;
    const modalContent = document.getElementById('projectDetailModalContent');
    const footerActions = document.getElementById('projectDetailFooterActions');
    const statusBadge = document.getElementById('projDetailStatusBadge');
    if (!modalContent) return;

    try {
      modalContent.innerHTML = '<div style="text-align: center; padding: 40px; color: #94A3B8;"><i class="fas fa-spinner fa-spin fa-2x"></i><div style="margin-top: 10px;">Loading project details & dedicated donation ledger...</div></div>';
      openModal('modalProjectDetails');

      const params = new URLSearchParams();
      if (ledgerFilter.status) params.append('status', ledgerFilter.status);
      if (ledgerFilter.payment_method) params.append('payment_method', ledgerFilter.payment_method);
      if (ledgerFilter.date_range) params.append('date_range', ledgerFilter.date_range);
      if (ledgerFilter.search) params.append('search', ledgerFilter.search);

      const res = await fetch(`/api/admin/projects/${id}?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !data.project) {
        modalContent.innerHTML = '<div class="alert alert-danger">Error retrieving project details.</div>';
        return;
      }

      const p = data.project;
      const stats = data.ledger_stats || {};
      const donations = data.donations || [];
      const status = (p.status || 'active').toLowerCase();
      const statusDisplay = status === 'active' ? 'Active' : (status.charAt(0).toUpperCase() + status.slice(1));

      if (statusBadge) {
        statusBadge.className = `status-pill status-${status}`;
        statusBadge.textContent = statusDisplay;
      }

      const goal = p.goal_amount || 0;
      const raised = p.raised_amount || 0;
      const remaining = p.remaining_amount || 0;
      const progress = p.progress_pct || 0;

      const createdDateStr = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A';
      const startDateStr = p.start_date ? new Date(p.start_date).toLocaleDateString() : 'Not specified';
      const expectedDateStr = p.expected_completion_date ? new Date(p.expected_completion_date).toLocaleDateString() : 'Open-ended';

      modalContent.innerHTML = `
        <div class="project-details-panoramic-grid">
          <!-- Left Column: Project Summary, KPIs & Overview -->
          <div class="project-panoramic-left">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 10px;">
              <div>
                <div style="font-size: 0.78rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">
                  <i class="fas fa-tag"></i> ${escapeHtml(p.category_name_en || 'General Welfare')} • Project ID: #${p.id}
                </div>
                <h3 style="font-size: 1.35rem; font-weight: 800; color: #0F172A; margin: 4px 0 2px;">${escapeHtml(p.title_en)}</h3>
                <div style="font-size: 1.05rem; color: #64748B; font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif;" dir="rtl">${escapeHtml(p.title_ur || '')}</div>
              </div>
              <span class="status-pill status-${status}" style="font-size: 0.82rem; padding: 4px 12px; white-space: nowrap;">
                <i class="fas fa-circle" style="font-size: 0.45rem;"></i> ${statusDisplay}
              </span>
            </div>

            <!-- 4 Financial KPI Cards (2x2 Grid) -->
            <div class="project-kpi-grid-2x2">
              <div class="project-kpi-card" style="padding: 10px 12px;">
                <div class="project-kpi-val" style="color: #0F172A; font-size: 1.15rem;">PKR ${goal.toLocaleString()}</div>
                <div class="project-kpi-lbl" style="font-size: 0.72rem;"><i class="fas fa-bullseye"></i> Target Goal</div>
              </div>
              <div class="project-kpi-card" style="padding: 10px 12px;">
                <div class="project-kpi-val" style="color: #059669; font-size: 1.15rem;">PKR ${raised.toLocaleString()}</div>
                <div class="project-kpi-lbl" style="font-size: 0.72rem;"><i class="fas fa-circle-check"></i> Confirmed Received</div>
              </div>
              <div class="project-kpi-card" style="padding: 10px 12px;">
                <div class="project-kpi-val" style="color: #DC2626; font-size: 1.15rem;">PKR ${remaining.toLocaleString()}</div>
                <div class="project-kpi-lbl" style="font-size: 0.72rem;"><i class="fas fa-scale-unbalanced"></i> Remaining Needed</div>
              </div>
              <div class="project-kpi-card" style="padding: 10px 12px;">
                <div class="project-kpi-val" style="color: var(--admin-primary); font-size: 1.15rem;">${progress}%</div>
                <div class="project-kpi-lbl" style="font-size: 0.72rem;"><i class="fas fa-chart-line"></i> Funding Progress</div>
              </div>
            </div>

            <!-- Progress Bar -->
            <div style="margin-bottom: 14px;">
              <div style="height: 8px; width: 100%; background: #E2E8F0; border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--admin-primary), #10B981);"></div>
              </div>
            </div>

            <!-- Descriptions (English & Urdu) -->
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
              <div class="project-info-box" style="padding: 10px 12px;">
                <div class="project-info-label" style="font-size: 0.74rem;"><i class="fas fa-align-left"></i> English Description</div>
                <div class="project-info-val" style="font-size: 0.84rem; line-height: 1.5;">${escapeHtml(p.short_desc_en || p.full_desc_en || 'No English description added.')}</div>
              </div>
              <div class="project-info-box" dir="rtl" style="padding: 10px 12px;">
                <div class="project-info-label" style="text-align: right; font-size: 0.74rem;"><i class="fas fa-language"></i> اردو تعارف</div>
                <div class="project-info-val" style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; line-height: 1.85; font-size: 0.88rem;">${escapeHtml(p.short_desc_ur || p.full_desc_ur || 'کوئی اردو تعارف شامل نہیں ہے۔')}</div>
              </div>
            </div>

            <!-- Project Metadata Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.78rem; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
              <div><span style="color: #64748B;">Beneficiaries:</span> <strong>${p.beneficiaries_count || 0} ${escapeHtml(p.beneficiaries_label_en || 'Beneficiaries')}</strong></div>
              <div><span style="color: #64748B;">Start Date:</span> <strong>${startDateStr}</strong></div>
              <div><span style="color: #64748B;">Completion:</span> <strong>${expectedDateStr}</strong></div>
              <div><span style="color: #64748B;">Date Registered:</span> <strong>${createdDateStr}</strong></div>
            </div>

            ${p.notes ? `
              <div style="margin-top: 12px; font-size: 0.78rem; color: #475569; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 8px 12px;">
                <strong><i class="fas fa-sticky-note" style="color: #D97706;"></i> Internal Notes:</strong> ${escapeHtml(p.notes)}
              </div>
            ` : ''}
          </div>

          <!-- Right Column: Dedicated Project Donation Ledger -->
          <div class="project-panoramic-right">
            <div class="project-ledger-header" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="project-ledger-title" style="font-size: 1.1rem; font-weight: 700; color: #0F172A;">
                  <i class="fas fa-book-bookmark" style="color: var(--admin-primary);"></i> Dedicated Project Donation Ledger
                </div>
                <div style="font-size: 0.76rem; color: #64748B;">
                  Real-time audited contributions contributing directly to this project.
                </div>
              </div>
              <button type="button" class="btn-admin btn-admin-secondary" style="font-size: 0.76rem; padding: 5px 12px;" onclick="viewProjectDetails(${p.id})">
                <i class="fas fa-rotate"></i> Refresh Ledger
              </button>
            </div>

            <!-- Ledger Status Cards (Row of 3) -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
              <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 8px 12px;">
                <div style="font-size: 0.68rem; font-weight: 700; color: #065F46; text-transform: uppercase;">Confirmed</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #065F46;">PKR ${(stats.confirmed_total || 0).toLocaleString()}</div>
                <div style="font-size: 0.7rem; color: #047857;">${stats.confirmed_count || 0} donation(s)</div>
              </div>
              <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 8px 12px;">
                <div style="font-size: 0.68rem; font-weight: 700; color: #92400E; text-transform: uppercase;">Pending</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #92400E;">PKR ${(stats.pending_total || 0).toLocaleString()}</div>
                <div style="font-size: 0.7rem; color: #B45309;">${stats.pending_count || 0} unverified</div>
              </div>
              <div style="background: #FEF2F2; border: 1px solid #FECDD3; border-radius: 8px; padding: 8px 12px;">
                <div style="font-size: 0.68rem; font-weight: 700; color: #991B1B; text-transform: uppercase;">Refunded</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #991B1B;">PKR ${(stats.refunded_total || 0).toLocaleString()}</div>
                <div style="font-size: 0.7rem; color: #B91C1C;">${stats.refunded_count || 0} reversed</div>
              </div>
            </div>

            <!-- Ledger Filter Controls -->
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; margin-bottom: 12px; background: #F8FAFC; padding: 8px 10px; border-radius: 8px; border: 1px solid #E2E8F0;">
              <div>
                <input type="text" id="pLedgerSearch" class="form-control" style="font-size: 0.78rem; padding: 4px 8px;" placeholder="Search donor, ref, phone..." value="${escapeHtml(ledgerFilter.search || '')}" onkeydown="if(event.key==='Enter') applyProjectLedgerFilters(${p.id})" />
              </div>
              <div>
                <select id="pLedgerStatus" class="form-control" style="font-size: 0.78rem; padding: 4px 6px;" onchange="applyProjectLedgerFilters(${p.id})">
                  <option value="" ${!ledgerFilter.status ? 'selected' : ''}>All Statuses</option>
                  <option value="confirmed" ${ledgerFilter.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                  <option value="pending" ${ledgerFilter.status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="refunded" ${ledgerFilter.status === 'refunded' ? 'selected' : ''}>Refunded</option>
                </select>
              </div>
              <div>
                <select id="pLedgerMethod" class="form-control" style="font-size: 0.78rem; padding: 4px 6px;" onchange="applyProjectLedgerFilters(${p.id})">
                  <option value="" ${!ledgerFilter.payment_method ? 'selected' : ''}>All Methods</option>
                  <option value="Meezan Bank" ${ledgerFilter.payment_method === 'Meezan Bank' ? 'selected' : ''}>Meezan Bank</option>
                  <option value="EasyPaisa" ${ledgerFilter.payment_method === 'EasyPaisa' ? 'selected' : ''}>EasyPaisa</option>
                  <option value="JazzCash" ${ledgerFilter.payment_method === 'JazzCash' ? 'selected' : ''}>JazzCash</option>
                  <option value="Cash" ${ledgerFilter.payment_method === 'Cash' ? 'selected' : ''}>Cash / Cheque</option>
                </select>
              </div>
              <div style="display: flex; gap: 4px;">
                <button type="button" class="btn-admin btn-admin-primary" style="padding: 4px 10px; font-size: 0.76rem;" onclick="applyProjectLedgerFilters(${p.id})">
                  Filter
                </button>
                <button type="button" class="btn-admin btn-admin-secondary" style="padding: 4px 8px; font-size: 0.76rem;" onclick="clearProjectLedgerFilters(${p.id})" title="Clear filters">
                  ✕
                </button>
              </div>
            </div>

            <!-- Ledger Table Container with internal scroll -->
            <div class="project-ledger-table-container">
              <table class="admin-table" style="font-size: 0.82rem;">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Date</th>
                    <th>Donor Details</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th style="text-align: right;">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  ${donations.length === 0 ? `
                    <tr>
                      <td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;">
                        No donations found matching filter criteria.
                      </td>
                    </tr>
                  ` : donations.map(d => {
                    const donStatus = (d.status || 'pending').toLowerCase();
                    const isConf = donStatus === 'confirmed' || donStatus === 'verified';
                    const dateStr = d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A';

                    return `
                      <tr>
                        <td><strong style="font-family: monospace; color: var(--admin-primary);">${escapeHtml(d.transaction_reference || `#TXN-${d.id}`)}</strong></td>
                        <td style="color: #64748B; white-space: nowrap;">${dateStr}</td>
                        <td>
                          <strong>${escapeHtml(d.donor_name || 'Anonymous')}</strong>
                          ${d.donor_phone ? `<div style="font-size: 0.72rem; color: #64748B;">${escapeHtml(d.donor_phone)}</div>` : ''}
                        </td>
                        <td><strong style="color: ${isConf ? '#059669' : '#0F172A'};">PKR ${(d.amount || 0).toLocaleString()}</strong></td>
                        <td>${escapeHtml(d.payment_method || 'Direct')}</td>
                        <td>
                          <span class="status-pill status-${donStatus}">
                            ${isConf ? 'Confirmed' : donStatus.charAt(0).toUpperCase() + donStatus.slice(1)}
                          </span>
                        </td>
                        <td style="text-align: right; white-space: nowrap;">
                          <button type="button" class="btn-action btn-action-view" onclick="viewDonationReceipt(${d.id})" title="Print Official Receipt" aria-label="Print receipt">
                            <i class="fas fa-file-invoice"></i>
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Update Footer Actions
      if (footerActions) {
        footerActions.innerHTML = `
          <button type="button" class="btn-admin btn-admin-primary" onclick="closeModal('modalProjectDetails'); editProject(${p.id});">
            <i class="fas fa-pen"></i> Edit Project
          </button>
          ${status === 'active' ? `
            <button type="button" class="btn-admin btn-admin-secondary" onclick="completeProject(${p.id})">
              <i class="fas fa-check-double"></i> Mark Completed
            </button>
            <button type="button" class="btn-admin btn-admin-danger" onclick="closeProjectWithConfirmation(${p.id})">
              <i class="fas fa-lock"></i> Close Project
            </button>
          ` : ''}
          ${status === 'completed' ? `
            <button type="button" class="btn-admin btn-admin-danger" onclick="closeProjectWithConfirmation(${p.id})">
              <i class="fas fa-lock"></i> Close Project
            </button>
            <button type="button" class="btn-admin btn-admin-secondary" onclick="activateProject(${p.id})">
              <i class="fas fa-arrow-rotate-left"></i> Reopen as Active
            </button>
          ` : ''}
          ${status === 'closed' ? `
            <button type="button" class="btn-admin btn-admin-secondary" onclick="activateProject(${p.id})">
              <i class="fas fa-lock-open"></i> Reopen Project
            </button>
          ` : ''}
        `;
      }

    } catch (err) {
      console.error('[View Project Details Error]', err);
      modalContent.innerHTML = '<div class="alert alert-danger">Error retrieving project details.</div>';
    }
  };

  window.applyProjectLedgerFilters = function(projectId) {
    const search = document.getElementById('pLedgerSearch') ? document.getElementById('pLedgerSearch').value.trim() : '';
    const status = document.getElementById('pLedgerStatus') ? document.getElementById('pLedgerStatus').value : '';
    const payment_method = document.getElementById('pLedgerMethod') ? document.getElementById('pLedgerMethod').value : '';
    const date_range = document.getElementById('pLedgerDate') ? document.getElementById('pLedgerDate').value : '';

    viewProjectDetails(projectId, { search, status, payment_method, date_range });
  };

  window.clearProjectLedgerFilters = function(projectId) {
    viewProjectDetails(projectId, {});
  };

  // ==================== ARTICLES MANAGEMENT ====================
  async function loadArticles() {
    try {
      const res = await fetch('/api/admin/articles');
      const data = await res.json();
      const tbody = document.getElementById('articlesTableBody');
      if (tbody && data.success) {
        tbody.innerHTML = data.articles.map(a => `
          <tr>
            <td><img src="${a.image_url || '/media/news/news_1.png'}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;" onerror="this.onerror=null; this.src='/media/news/news_1.png';" /></td>
            <td><strong>${a.title_en}</strong><div style="font-size: 0.8rem; color: #64748B;">${a.title_ur}</div></td>
            <td>${a.category_name_en || 'Update'}</td>
            <td>${a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}</td>
            <td><span class="badge badge-${a.status === 'published' ? 'success' : 'warning'}">${a.status}</span></td>
            <td style="text-align: right; white-space: nowrap;">
              <div class="action-btn-group">
                <button type="button" class="btn-action btn-action-view" onclick="viewArticleDetails(${a.id})" title="View Complete Story" aria-label="View article">
                  <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn-action btn-action-edit" onclick="editArticle(${a.id})" title="Edit Article" aria-label="Edit article">
                  <i class="fas fa-pen"></i>
                </button>
                <button type="button" class="btn-action btn-action-delete" onclick="deleteArticle(${a.id})" title="Delete Article" aria-label="Delete article">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
    }
  }

  window.viewArticleDetails = async function(id) {
    try {
      const res = await fetch(`/api/admin/articles/${id}`);
      const data = await res.json();
      if (!data.success || !data.article) return alert('Failed to retrieve article details.');
      const a = data.article;

      const body = document.getElementById('viewArticleModalBody');
      if (body) {
        body.innerHTML = `
          <div style="margin-bottom: 16px; border-radius: 8px; overflow: hidden; background: #F8FAFC; max-height: 220px; text-align: center; border: 1px solid #E2E8F0;">
            <img src="${a.image_url || '/media/news/news_1.png'}" style="width: 100%; max-height: 220px; object-fit: cover;" onerror="this.onerror=null; this.src='/media/news/news_1.png';" />
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <span class="badge badge-${a.status === 'published' ? 'success' : 'warning'}" style="text-transform: uppercase;">${a.status || 'Draft'}</span>
            <span style="font-size: 0.8rem; color: #64748B;"><i class="fas fa-calendar-day"></i> ${a.published_at ? new Date(a.published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unpublished'}</span>
          </div>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin-bottom: 4px; line-height: 1.3;">${a.title_en}</h2>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: #64748B; margin-bottom: 16px; font-family: var(--admin-font-ur); direction: rtl; text-align: right; line-height: 1.8;">${a.title_ur || ''}</h3>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Summary (English):</div>
            <p style="font-size: 0.88rem; color: #334155; margin-bottom: 10px; line-height: 1.5;">${a.short_desc_en || 'N/A'}</p>
            <div style="font-size: 0.74rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 4px; text-align: right;">خلاصہ (اردو):</div>
            <p style="font-size: 0.92rem; color: #334155; font-family: var(--admin-font-ur); direction: rtl; text-align: right; line-height: 1.8;">${a.short_desc_ur || 'N/A'}</p>
          </div>

          ${a.content_en ? `
            <div style="padding: 12px 14px; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 10px;">
              <div style="font-size: 0.74rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 6px;">Full Story & Details:</div>
              <div style="font-size: 0.88rem; color: #1E293B; line-height: 1.6; white-space: pre-wrap;">${a.content_en}</div>
            </div>
          ` : ''}
        `;
      }

      const btnEdit = document.getElementById('btnEditArticleFromView');
      if (btnEdit) {
        btnEdit.onclick = function() {
          closeModal('modalViewArticle');
          editArticle(a.id);
        };
      }

      openModal('modalViewArticle');
    } catch (err) {
      alert('Error loading article details.');
    }
  };

  window.resetArticleForm = function() {
    const form = document.getElementById('formAddArticle');
    if (form) form.reset();
    const editId = document.getElementById('articleEditId');
    if (editId) editId.value = '';
    const heading = document.getElementById('articleModalHeading');
    if (heading) heading.innerHTML = '<i class="fas fa-newspaper"></i> Publish News & Update Article';
    const submitBtn = document.getElementById('articleSubmitBtn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Publish Article';
    setArticleImage('/media/news/news_1.png');
  };

  window.openAddArticleModal = async function() {
    if (!allCategoriesData || !allCategoriesData.length) {
      await populateOrgDropdowns();
    }
    window.resetArticleForm();
    const catSelect = document.getElementById('art_category_id');
    if (catSelect && allCategoriesData.length > 0) {
      populateCategorySelects(allCategoriesData);
      if (!catSelect.value && allCategoriesData.length > 0) {
        catSelect.value = allCategoriesData[0].id;
      }
    }
    openModal('modalArticle');
  };

  window.editArticle = async function(id) {
    try {
      if (!allCategoriesData || !allCategoriesData.length) {
        await populateOrgDropdowns();
      }
      const res = await fetch(`/api/admin/articles/${id}`);
      const data = await res.json();
      if (!data.success || !data.article) return alert('Failed to retrieve article details.');
      const a = data.article;

      document.getElementById('articleEditId').value = a.id;
      document.getElementById('art_title_en').value = a.title_en || '';
      document.getElementById('art_title_ur').value = a.title_ur || '';
      const catSelect = document.getElementById('art_category_id');
      if (catSelect) {
        populateCategorySelects(allCategoriesData);
        catSelect.value = a.category_id || '1';
      }
      setArticleImage(a.image_url || '/media/news/news_1.png');
      document.getElementById('art_short_desc_en').value = a.short_desc_en || '';
      document.getElementById('art_short_desc_ur').value = a.short_desc_ur || '';
      document.getElementById('art_content_en').value = a.content_en || '';

      document.getElementById('articleModalHeading').innerHTML = `<i class="fas fa-pen-to-square"></i> Edit News Article #${a.id}`;
      document.getElementById('articleSubmitBtn').innerHTML = `<i class="fas fa-save"></i> Update Article`;
      openModal('modalArticle');
    } catch (err) {
      alert('Error loading article for editing.');
    }
  };

  window.deleteArticle = async function(id) {
    if (confirm('Delete this article?')) {
      const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadArticles();
        loadOverview();
      }
    }
  };

  // ==================== ASSISTANCE APPLICATIONS MANAGEMENT ====================
  async function loadApplications() {
    try {
      const res = await fetch('/api/admin/assistance-applications');
      const data = await res.json();
      const tbody = document.getElementById('applicationsTableBody');
      if (tbody && data.success) {
        tbody.innerHTML = data.applications.map(app => `
          <tr>
            <td><strong style="font-family: monospace;">${app.tracking_number}</strong></td>
            <td><strong>${app.applicant_name}</strong><div>Guardian: ${app.guardian_name || 'N/A'}</div></td>
            <td>${app.phone}</td>
            <td>${app.city || 'N/A'}</td>
            <td>${(app.assistance_type || '').replace('_', ' ').toUpperCase()}</td>
            <td>
              <select onchange="updateApplicationStatus(${app.id}, this.value)" style="padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem;">
                <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="under_review" ${app.status === 'under_review' ? 'selected' : ''}>Under Review</option>
                <option value="approved" ${app.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
              </select>
            </td>
            <td>${new Date(app.created_at).toLocaleDateString()}</td>
            <td style="text-align: right; white-space: nowrap;">
              <div class="action-btn-group">
                <button type="button" class="btn-action btn-action-view" onclick="viewApplicationDetails(${app.id})" title="View Complete Dossier" aria-label="View dossier">
                  <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn-action btn-action-edit" onclick="editApplication(${app.id})" title="Review / Edit Application" aria-label="Edit application">
                  <i class="fas fa-pen"></i>
                </button>
                <button type="button" class="btn-action" style="color: #475569;" onclick="printSingleAssistanceRequest(${app.id})" title="Print Application Dossier" aria-label="Print application dossier">
                  <i class="fas fa-print"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
    }
  }

  window.viewApplicationDetails = async function(id) {
    try {
      const res = await fetch(`/api/admin/assistance-applications/${id}`);
      const data = await res.json();
      if (!data.success || !data.application) return alert('Failed to retrieve application details.');
      const a = data.application;

      const body = document.getElementById('viewApplicationModalBody');
      if (body) {
        body.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Official Tracking Reference</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--admin-primary); font-family: monospace;">${a.tracking_number}</div>
            </div>
            <div style="text-align: right;">
              <span class="status-pill status-${a.status}">${(a.status || 'pending').replace('_', ' ')}</span>
              <div style="font-size: 0.75rem; color: #64748B; margin-top: 3px;">Submitted: ${new Date(a.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="project-info-box">
              <div class="project-info-label">Applicant Name (Student/Child)</div>
              <div class="project-info-val"><strong>${a.applicant_name}</strong></div>
            </div>
            <div class="project-info-box">
              <div class="project-info-label">Guardian / Mother Name</div>
              <div class="project-info-val">${a.guardian_name || 'N/A'}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="project-info-box">
              <div class="project-info-label">Contact Phone</div>
              <div class="project-info-val"><a href="tel:${a.phone}" style="color: var(--admin-primary); text-decoration: none; font-weight: 600;">${a.phone}</a></div>
            </div>
            <div class="project-info-box">
              <div class="project-info-label">City / Region</div>
              <div class="project-info-val">${a.city || 'N/A'}</div>
            </div>
            <div class="project-info-box">
              <div class="project-info-label">CNIC / B-Form</div>
              <div class="project-info-val" style="font-family: monospace;">${a.cnic_or_bform || 'N/A'}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="project-info-box">
              <div class="project-info-label">Aid Category</div>
              <div class="project-info-val"><strong>${(a.assistance_type || '').toUpperCase()}</strong></div>
            </div>
            <div class="project-info-box">
              <div class="project-info-label">Family Members</div>
              <div class="project-info-val">${a.family_members_count || 1} Persons</div>
            </div>
            <div class="project-info-box">
              <div class="project-info-label">Monthly Household Income</div>
              <div class="project-info-val">PKR ${(parseFloat(a.monthly_income) || 0).toLocaleString()}</div>
            </div>
          </div>

          <div class="project-info-box" style="margin-bottom: 14px;">
            <div class="project-info-label">Residential Address</div>
            <div class="project-info-val">${a.address || 'Address not specified'}</div>
          </div>

          <div class="project-info-box" style="margin-bottom: 14px;">
            <div class="project-info-label">Circumstances & Needs Statement</div>
            <div class="project-info-val" style="line-height: 1.6;">${a.details || 'No additional statement provided.'}</div>
          </div>

          ${a.notes ? `
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #92400E; text-transform: uppercase;">Administrative Verification Notes:</div>
              <div style="font-size: 0.88rem; color: #78350F; margin-top: 4px;">${a.notes}</div>
            </div>
          ` : ''}
        `;
      }

      window.currentApplicationDossierId = a.id;

      const btnEdit = document.getElementById('btnEditAppFromView');
      if (btnEdit) {
        btnEdit.onclick = function() {
          closeModal('modalViewApplication');
          editApplication(a.id);
        };
      }

      openModal('modalViewApplication');
    } catch (err) {
      alert('Error loading application details.');
    }
  };

  window.resetApplicationForm = function() {
    const form = document.getElementById('formAddApplication');
    if (form) form.reset();
    const editId = document.getElementById('applicationEditId');
    if (editId) editId.value = '';
    const heading = document.getElementById('applicationModalHeading');
    if (heading) heading.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Assistance Request (Walk-in / Physical Intake)';
    const submitBtn = document.getElementById('applicationSubmitBtn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Register Assistance Request';
    const printBtn = document.getElementById('btnPrintAppFromModal');
    if (printBtn) printBtn.style.display = 'none';
  };

  window.openAddApplicationModal = function() {
    window.resetApplicationForm();
    const statusSelect = document.getElementById('app_status');
    if (statusSelect) statusSelect.value = 'pending';
    openModal('modalApplication');
  };

  window.editApplication = async function(id) {
    try {
      const res = await fetch(`/api/admin/assistance-applications/${id}`);
      const data = await res.json();
      if (!data.success || !data.application) return alert('Failed to retrieve application details.');
      const a = data.application;

      document.getElementById('applicationEditId').value = a.id;
      document.getElementById('app_applicant_name').value = a.applicant_name || '';
      document.getElementById('app_guardian_name').value = a.guardian_name || '';
      document.getElementById('app_phone').value = a.phone || '';
      document.getElementById('app_city').value = a.city || '';
      document.getElementById('app_assistance_type').value = a.assistance_type || 'education';
      document.getElementById('app_cnic_or_bform').value = a.cnic_or_bform || '';
      document.getElementById('app_family_members_count').value = a.family_members_count || 1;
      document.getElementById('app_monthly_income').value = a.monthly_income || 0;
      document.getElementById('app_address').value = a.address || '';
      document.getElementById('app_details').value = a.details || '';
      document.getElementById('app_status').value = a.status || 'pending';
      document.getElementById('app_notes').value = a.notes || '';

      const printBtn = document.getElementById('btnPrintAppFromModal');
      if (printBtn) printBtn.style.display = 'inline-flex';

      document.getElementById('applicationModalHeading').innerHTML = `<i class="fas fa-pen-to-square"></i> Review Application #${a.tracking_number || a.id}`;
      document.getElementById('applicationSubmitBtn').innerHTML = `<i class="fas fa-save"></i> Save Application Changes`;
      openModal('modalApplication');
    } catch (err) {
      alert('Error loading application.');
    }
  };

  window.updateApplicationStatus = async function(id, status) {
    try {
      const res = await fetch(`/api/admin/assistance-applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        alert('Application status updated.');
      }
    } catch (err) {
      alert('Error updating status.');
    }
  };

  // ==================== DONATIONS MANAGEMENT ====================
  async function loadDonations() {
    try {
      const res = await fetch('/api/admin/donations');
      const data = await res.json();
      const tbody = document.getElementById('donationsTableBody');
      if (tbody && data.success) {
        tbody.innerHTML = data.donations.map(d => `
          <tr>
            <td><strong>${d.donor_name}</strong><div>${d.donor_phone}</div></td>
            <td><strong>PKR ${parseFloat(d.amount).toLocaleString()}</strong></td>
            <td>${d.payment_method}</td>
            <td><span style="font-family: monospace;">${d.transaction_reference || 'N/A'}</span></td>
            <td><span class="badge badge-${d.status === 'verified' ? 'success' : 'warning'}">${d.status}</span></td>
            <td style="text-align: right; white-space: nowrap;">
              <div class="action-btn-group">
                <button type="button" class="btn-action btn-action-view" onclick="viewDonationReceipt(${d.id})" title="View Official Receipt" aria-label="View official receipt">
                  <i class="fas fa-eye"></i>
                </button>
                <button type="button" class="btn-action btn-action-edit" onclick="editDonation(${d.id})" title="Edit Donation Record" aria-label="Edit donation">
                  <i class="fas fa-pen"></i>
                </button>
                ${d.status !== 'verified' ? `
                  <button type="button" class="btn-action btn-action-confirm" onclick="verifyDonation(${d.id})" title="Verify Donation" aria-label="Verify donation">
                    <i class="fas fa-check"></i>
                  </button>
                ` : `
                  <span class="badge badge-success" style="font-size: 0.72rem; padding: 4px 8px;">Verified</span>
                `}
              </div>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function populateDonationProjectSelect(selectedId = '') {
    const projSelect = document.getElementById('don_project_id');
    if (!projSelect) return;
    try {
      const res = await fetch('/api/admin/projects?limit=100');
      const data = await res.json();
      let html = '<option value="">General Donation / Core Foundation Fund</option>';
      if (data.success && Array.isArray(data.projects)) {
        html += data.projects.map(p => `<option value="${p.id}">${escapeHtml(p.title_en)} (PKR Goal: ${Number(p.goal_amount || 0).toLocaleString()})</option>`).join('');
      }
      projSelect.innerHTML = html;
      if (selectedId) projSelect.value = String(selectedId);
    } catch (e) {
      projSelect.innerHTML = '<option value="">General Donation / Core Foundation Fund</option>';
    }
  }

  window.resetDonationForm = function() {
    const form = document.getElementById('formAddDonation');
    if (form) form.reset();
    const editId = document.getElementById('donationEditId');
    if (editId) editId.value = '';
    const heading = document.getElementById('donationModalHeading');
    if (heading) heading.innerHTML = '<i class="fas fa-receipt"></i> Record Direct / Offline Donation';
    const submitBtn = document.getElementById('donationSubmitBtn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Record & Save Donation';
  };

  window.openAddDonationModal = async function() {
    window.resetDonationForm();
    await populateDonationProjectSelect('');
    openModal('modalDonation');
  };

  window.editDonation = async function(id) {
    try {
      const res = await fetch(`/api/admin/donations/${id}`);
      const data = await res.json();
      if (!data.success || !data.donation) return alert('Failed to retrieve donation details.');
      const d = data.donation;

      document.getElementById('donationEditId').value = d.id;
      document.getElementById('don_donor_name').value = d.donor_name || '';
      document.getElementById('don_donor_phone').value = d.donor_phone || '';
      document.getElementById('don_amount').value = d.amount || 0;
      document.getElementById('don_payment_method').value = d.payment_method || 'Meezan Bank';
      document.getElementById('don_transaction_reference').value = d.transaction_reference || '';
      document.getElementById('don_status').value = d.status || 'verified';
      document.getElementById('don_notes').value = d.notes || '';

      await populateDonationProjectSelect(d.project_id || '');

      document.getElementById('donationModalHeading').innerHTML = `<i class="fas fa-pen-to-square"></i> Edit Donation #${d.id}`;
      document.getElementById('donationSubmitBtn').innerHTML = `<i class="fas fa-save"></i> Update Donation Details`;
      openModal('modalDonation');
    } catch (err) {
      alert('Error loading donation.');
    }
  };

  window.verifyDonation = async function(id) {
    if (confirm('Mark this donation transaction as verified?')) {
      const res = await fetch(`/api/admin/donations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verified' })
      });
      const data = await res.json();
      if (data.success) {
        loadDonations();
        loadOverview();
      }
    }
  };

  // ==================== SUBMISSIONS & SETTINGS ====================
  async function loadSubmissions() {
    try {
      const res = await fetch('/api/admin/contact-submissions');
      const data = await res.json();
      const tbody = document.getElementById('submissionsTableBody');
      if (tbody && data.success) {
        tbody.innerHTML = data.submissions.map(s => `
          <tr>
            <td><strong>${s.name}</strong><div>${s.email} | ${s.phone}</div></td>
            <td><strong>${s.subject}</strong><p style="font-size: 0.82rem; color: #64748B; margin: 2px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;">${s.message}</p></td>
            <td><span class="badge badge-${s.status === 'new' ? 'warning' : 'success'}">${s.status}</span></td>
            <td>${new Date(s.created_at).toLocaleDateString()}</td>
            <td style="text-align: right; white-space: nowrap;">
              <div class="action-btn-group">
                <button type="button" class="btn-action btn-action-view" onclick="viewContactSubmission(${s.id})" title="View Complete Message" aria-label="View message">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
    }
  }

  window.viewContactSubmission = async function(id) {
    try {
      const res = await fetch(`/api/admin/contact-submissions/${id}`);
      const data = await res.json();
      if (!data.success || !data.submission) return alert('Failed to retrieve contact message.');
      const s = data.submission;

      const body = document.getElementById('viewSubmissionModalBody');
      if (body) {
        body.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <div>
              <span class="badge badge-${s.status === 'new' ? 'warning' : 'success'}" style="text-transform: uppercase;">${s.status}</span>
            </div>
            <div style="font-size: 0.8rem; color: #64748B;">
              <i class="fas fa-calendar-day"></i> Received: ${new Date(s.created_at).toLocaleString()}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div class="project-info-box">
              <div class="project-info-label">Sender Full Name</div>
              <div class="project-info-val"><strong>${s.name}</strong></div>
            </div>
            <div class="project-info-box">
              <div class="project-info-label">Contact Phone</div>
              <div class="project-info-val"><a href="tel:${s.phone}" style="color: var(--admin-primary); text-decoration: none; font-weight: 600;">${s.phone || 'N/A'}</a></div>
            </div>
          </div>

          <div class="project-info-box" style="margin-bottom: 14px;">
            <div class="project-info-label">Email Address</div>
            <div class="project-info-val"><a href="mailto:${s.email}" style="color: var(--admin-primary); text-decoration: none; font-weight: 600;">${s.email}</a></div>
          </div>

          <div class="project-info-box" style="margin-bottom: 14px;">
            <div class="project-info-label">Subject</div>
            <div class="project-info-val"><strong>${s.subject}</strong></div>
          </div>

          <div class="project-info-box" style="margin-bottom: 14px;">
            <div class="project-info-label">Full Message / Inquiry</div>
            <div class="project-info-val" style="line-height: 1.6; white-space: pre-wrap; font-size: 0.92rem; color: #0F172A;">${s.message}</div>
          </div>
        `;
      }

      openModal('modalViewSubmission');
    } catch (err) {
      alert('Error loading contact message details.');
    }
  };

  // ==================== SETTINGS (BANK & HELPLINE/ADDRESS) ====================
  async function loadSettings() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        Object.entries(data.settings).forEach(([key, val]) => {
          const el = document.getElementById(`setting_${key}`);
          if (el) el.value = val;
        });
        updateHeroLivePreview();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function saveSettingsForm(formElement, statusBoxId, successMsg) {
    const payload = {};
    new FormData(formElement).forEach((val, key) => {
      payload[key] = val;
    });

    const statusBox = document.getElementById(statusBoxId);
    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.className = 'badge badge-info';
      statusBox.textContent = 'Saving settings to database...';
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (statusBox) {
          statusBox.className = 'badge badge-success';
          statusBox.style.display = 'block';
          statusBox.textContent = successMsg;
        } else {
          alert(successMsg);
        }
      } else {
        if (statusBox) {
          statusBox.className = 'badge badge-danger';
          statusBox.textContent = data.message || 'Error saving settings.';
        }
      }
    } catch (err) {
      if (statusBox) {
        statusBox.className = 'badge badge-danger';
        statusBox.textContent = 'Network or server error saving settings.';
      }
    }
  }

  const bankSettingsForm = document.getElementById('adminBankSettingsForm');
  if (bankSettingsForm) {
    bankSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveSettingsForm(bankSettingsForm, 'bankSettingsSaveStatus', 'Official Islamic Bank & Mobile Wallet settings saved successfully!');
    });
  }

  const contactSettingsForm = document.getElementById('adminContactSettingsForm');
  if (contactSettingsForm) {
    contactSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveSettingsForm(contactSettingsForm, 'contactSettingsSaveStatus', 'Foundation Helpline & Official Address saved successfully!');
    });
  }

  // ==================== EDIT LAYOUT & HERO SECTION SETTINGS ====================
  function updateHeroLivePreview() {
    const bgInput = document.getElementById('setting_hero_bg_image');
    const bgUrl = (bgInput && bgInput.value.trim()) ? bgInput.value.trim() : '/media/branding/hero_bg.jpg';

    const eyebrow = (document.getElementById('setting_hero_eyebrow_en') || {}).value || 'WELCOME TO';
    const heading = (document.getElementById('setting_hero_heading_en') || {}).value || 'Qasr-e-Shabbir Foundation';
    const subtitle = (document.getElementById('setting_hero_subtitle_en') || {}).value || 'Together for a Brighter Tomorrow';
    const text = (document.getElementById('setting_hero_text_en') || {}).value || 'We work for a better, healthier and educated community by providing support, care and hope to those in need.';
    const btn1Text = (document.getElementById('setting_hero_btn1_text_en') || {}).value || 'Support Our Cause';
    const btn2Text = (document.getElementById('setting_hero_btn2_text_en') || {}).value || 'Learn More';

    const prevBg = document.getElementById('heroPreviewBg');
    if (prevBg) prevBg.style.backgroundImage = `url('${bgUrl}')`;

    const thumb = document.getElementById('heroBgThumbnail');
    if (thumb) thumb.src = bgUrl;

    const elEyebrow = document.getElementById('prevHeroEyebrow');
    if (elEyebrow) elEyebrow.textContent = eyebrow;

    const elHeading = document.getElementById('prevHeroHeading');
    if (elHeading) elHeading.textContent = heading;

    const elSubtitle = document.getElementById('prevHeroSubtitle');
    if (elSubtitle) elSubtitle.textContent = subtitle;

    const elText = document.getElementById('prevHeroText');
    if (elText) elText.textContent = text;

    const elBtn1 = document.getElementById('prevHeroBtn1');
    if (elBtn1) elBtn1.innerHTML = `<i class="fas fa-heart"></i> ${escapeHtml(btn1Text)}`;

    const elBtn2 = document.getElementById('prevHeroBtn2');
    if (elBtn2) elBtn2.textContent = btn2Text;
  }

  // Bind live preview updating to all hero layout inputs
  [
    'setting_hero_bg_image',
    'setting_hero_eyebrow_en',
    'setting_hero_heading_en',
    'setting_hero_subtitle_en',
    'setting_hero_text_en',
    'setting_hero_btn1_text_en',
    'setting_hero_btn2_text_en'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateHeroLivePreview);
    }
  });

  window.setHeroBgPreset = function(url) {
    const input = document.getElementById('setting_hero_bg_image');
    if (input) {
      input.value = url;
      updateHeroLivePreview();
    }
  };

  const heroBgFileInput = document.getElementById('heroBgFileInput');
  if (heroBgFileInput) {
    heroBgFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'branding');

      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success && data.url) {
          const bgInput = document.getElementById('setting_hero_bg_image');
          if (bgInput) bgInput.value = data.url;
          updateHeroLivePreview();
          alert('Hero background image uploaded successfully! Click "Save & Apply Homepage Hero Layout" to commit changes.');
        } else {
          alert(data.message || 'Error uploading hero image.');
        }
      } catch (err) {
        alert('Upload failed due to connection error.');
      }
    });
  }

  const layoutSettingsForm = document.getElementById('adminLayoutSettingsForm');
  if (layoutSettingsForm) {
    layoutSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveSettingsForm(layoutSettingsForm, 'layoutSettingsSaveStatus', 'Homepage Hero Section & Layout settings saved successfully! Live homepage is updated.');
      updateHeroLivePreview();
    });
  }

  // ==================== USERS & STAFF MANAGEMENT ====================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let allUsersData = [];

  async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    try {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94A3B8; padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Loading users and staff directory...</td></tr>';
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      if (data.success && Array.isArray(data.users)) {
        allUsersData = data.users;
        renderUsersList(allUsersData);
        updateUserMetrics(allUsersData);
      } else {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #EF4444; padding: 20px;">Failed to load users: ${escapeHtml(data.message || 'Unknown error')}</td></tr>`;
      }
    } catch (err) {
      console.error('[Load Users Error]', err);
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #EF4444; padding: 20px;">Network error loading users directory.</td></tr>';
    }
  }

  function updateUserMetrics(users) {
    const totalUsers = users.length;
    const salariedUsers = users.filter(u => u.has_salary).length;
    const totalPayroll = users.reduce((acc, u) => acc + (u.has_salary ? (Number(u.salary) || 0) : 0), 0);
    const activeUsers = users.filter(u => u.is_active).length;

    const elTotal = document.getElementById('metricTotalUsers');
    const elSalaried = document.getElementById('metricSalariedUsers');
    const elPayroll = document.getElementById('metricTotalPayroll');
    const elActive = document.getElementById('metricActiveUsers');

    if (elTotal) elTotal.textContent = totalUsers;
    if (elSalaried) elSalaried.textContent = salariedUsers;
    if (elPayroll) elPayroll.textContent = `PKR ${totalPayroll.toLocaleString()}`;
    if (elActive) elActive.textContent = activeUsers;
  }

  function renderUsersList(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    if (!users.length) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94A3B8; padding: 24px;">No users found in directory.</td></tr>';
      return;
    }

    tableBody.innerHTML = users.map(user => {
      const initials = (user.full_name || user.username || 'U')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const roleClass = `role-${user.role || 'admin'}`;
      const roleName = {
        superadmin: 'Super Admin',
        admin: 'Administrator',
        manager: 'Operations Manager',
        accountant: 'Finance & Accounts',
        staff: 'Field Staff'
      }[user.role] || (user.role || 'Admin');

      let permsList = [];
      if (Array.isArray(user.permissions)) {
        permsList = user.permissions;
      }
      const permLabels = {
        projects: 'Projects',
        articles: 'News',
        applications: 'Assistance',
        donations: 'Donations',
        submissions: 'Contact',
        settings: 'Settings',
        users: 'Users'
      };

      const permsHtml = permsList.length > 0 
        ? permsList.map(p => `<span class="perm-tag ${p === 'users' ? 'perm-tag-highlight' : ''}">${permLabels[p] || p}</span>`).join('')
        : '<span style="color: #94A3B8; font-size: 0.75rem;">(Default Access)</span>';

      const salaryHtml = user.has_salary
        ? `<span class="salary-pill"><i class="fas fa-money-bill-wave"></i> PKR ${Number(user.salary).toLocaleString()} <span style="font-size: 0.68rem; font-weight: normal; opacity: 0.85;">/ mo</span></span>`
        : `<span class="salary-pill unpaid"><i class="fas fa-hand-holding-heart"></i> Volunteer (No Salary)</span>`;

      const statusHtml = user.is_active
        ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Active</span>'
        : '<span class="badge badge-danger"><i class="fas fa-ban"></i> Suspended</span>';

      const isMasterAdmin = (user.username === 'admin');
      const isSelf = (currentUser && currentUser.id === user.id);

      const photoAvatar = user.photo_url
        ? `<img src="${escapeHtml(user.photo_url)}" alt="${escapeHtml(user.full_name || user.username)}" class="table-user-avatar" onerror="this.outerHTML='<div class=\\'table-user-avatar-placeholder\\'>${initials}</div>';" />`
        : `<div class="table-user-avatar-placeholder">${initials}</div>`;

      return `
        <tr>
          <td>
            <div class="user-info-cell" style="display: flex; align-items: center; gap: 10px;">
              ${photoAvatar}
              <div>
                <div class="user-name-title">${escapeHtml(user.full_name || user.username)}</div>
                <div class="user-subtext">
                  <span><i class="fas fa-user" style="font-size: 0.7rem;"></i> @${escapeHtml(user.username)}</span>
                  <span>•</span>
                  <span><i class="fas fa-envelope" style="font-size: 0.7rem;"></i> ${escapeHtml(user.email)}</span>
                  ${user.phone ? `<span>•</span><span><i class="fas fa-phone" style="font-size: 0.7rem;"></i> ${escapeHtml(user.phone)}</span>` : ''}
                </div>
              </div>
            </div>
          </td>
          <td>
            <div>
              <span class="role-badge ${roleClass}">${escapeHtml(user.role_name_en || roleName)}</span>
              ${user.department_name_en ? `<div style="font-size: 0.74rem; color: #0284C7; font-weight: 600; margin-top: 3px;"><i class="fas fa-sitemap"></i> ${escapeHtml(user.department_name_en)}</div>` : ''}
              ${(user.designation_name_en || user.designation) ? `<div style="font-size: 0.78rem; color: #475569; font-weight: 600; margin-top: 2px;">${escapeHtml(user.designation_name_en || user.designation)}</div>` : ''}
            </div>
          </td>
          <td style="max-width: 220px;">
            <div style="display: flex; flex-wrap: wrap;">${permsHtml}</div>
          </td>
          <td>${salaryHtml}</td>
          <td>${statusHtml}</td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-action-view" onclick="viewUser(${user.id})" title="View Complete Profile & Rights" aria-label="View user profile">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn-action btn-action-idcard" onclick="openStaffIdCard(${user.id})" title="View, Print & Download Staff ID Card" aria-label="Staff ID card">
                <i class="fas fa-id-card"></i>
              </button>
              <button type="button" class="btn-action btn-action-edit" onclick="editUser(${user.id})" title="Edit User & Manage Rights" aria-label="Edit user">
                <i class="fas fa-pen-to-square"></i>
              </button>
              ${!isMasterAdmin && !isSelf ? `
                <button type="button" class="btn-action btn-action-delete" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')" title="Delete User Account" aria-label="Delete user">
                  <i class="fas fa-trash-can"></i>
                </button>
              ` : `
                <button type="button" class="btn-action btn-action-delete" disabled style="opacity: 0.35; cursor: not-allowed;" title="${isMasterAdmin ? 'Master admin cannot be deleted' : 'Cannot delete self'}" aria-label="Cannot delete">
                  <i class="fas fa-shield-halved"></i>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Salary checkbox listener
  const hasSalaryCheckbox = document.getElementById('user_has_salary');
  const salaryInputContainer = document.getElementById('salaryInputContainer');
  const salaryToggleBox = document.getElementById('salaryToggleBox');
  if (hasSalaryCheckbox) {
    hasSalaryCheckbox.addEventListener('change', () => {
      if (hasSalaryCheckbox.checked) {
        salaryInputContainer.style.display = 'block';
        salaryToggleBox.classList.add('active');
        const salInput = document.getElementById('user_salary');
        if (salInput && (!salInput.value || Number(salInput.value) <= 0)) {
          salInput.value = '35000';
          salInput.focus();
        }
      } else {
        salaryInputContainer.style.display = 'none';
        salaryToggleBox.classList.remove('active');
      }
    });
  }

  // Select / Clear all permissions
  const btnSelectAllPerms = document.getElementById('btnSelectAllPerms');
  if (btnSelectAllPerms) {
    btnSelectAllPerms.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = true);
    });
  }
  const btnClearAllPerms = document.getElementById('btnClearAllPerms');
  if (btnClearAllPerms) {
    btnClearAllPerms.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = false);
    });
  }

  // Filter users by search input
  const userSearchInput = document.getElementById('userSearchInput');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', () => {
      const q = userSearchInput.value.toLowerCase().trim();
      if (!q) {
        renderUsersList(allUsersData);
        return;
      }
      const filtered = allUsersData.filter(u => 
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.designation && u.designation.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      );
      renderUsersList(filtered);
    });
  }

  // Wire user profile photo input change & preview
  const userPhotoInput = document.getElementById('user_photo');
  const userPhotoPreviewImg = document.getElementById('userPhotoPreviewImg');
  const userPhotoPlaceholderIcon = document.getElementById('userPhotoPlaceholderIcon');
  const userPhotoFileName = document.getElementById('userPhotoFileName');
  const btnRemoveUserPhoto = document.getElementById('btnRemoveUserPhoto');
  const userPhotoError = document.getElementById('userPhotoError');

  if (userPhotoInput) {
    userPhotoInput.addEventListener('change', (e) => {
      if (userPhotoError) userPhotoError.style.display = 'none';
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        if (userPhotoError) {
          userPhotoError.textContent = 'Invalid file type. Please upload a valid JPG, PNG, or WebP photo.';
          userPhotoError.style.display = 'block';
        }
        userPhotoInput.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        if (userPhotoError) {
          userPhotoError.textContent = 'Photo exceeds 10MB limit.';
          userPhotoError.style.display = 'block';
        }
        userPhotoInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (userPhotoPreviewImg) {
          userPhotoPreviewImg.src = loadEvt.target.result;
          userPhotoPreviewImg.style.display = 'block';
        }
        if (userPhotoPlaceholderIcon) userPhotoPlaceholderIcon.style.display = 'none';
        if (userPhotoFileName) userPhotoFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        if (btnRemoveUserPhoto) btnRemoveUserPhoto.style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveUserPhoto) {
    btnRemoveUserPhoto.addEventListener('click', () => {
      if (userPhotoInput) userPhotoInput.value = '';
      if (userPhotoPreviewImg) { userPhotoPreviewImg.src = ''; userPhotoPreviewImg.style.display = 'none'; }
      if (userPhotoPlaceholderIcon) userPhotoPlaceholderIcon.style.display = 'block';
      if (userPhotoFileName) userPhotoFileName.textContent = 'No photo selected';
      btnRemoveUserPhoto.style.display = 'none';
      if (userPhotoError) userPhotoError.style.display = 'none';
    });
  }

  // Toggle Password Unhide / Hide in User Modal
  const btnToggleUserPassword = document.getElementById('btnToggleUserPassword');
  if (btnToggleUserPassword) {
    btnToggleUserPassword.addEventListener('click', (e) => {
      e.preventDefault();
      const pwdInput = document.getElementById('user_password');
      const pwdIcon = document.getElementById('iconToggleUserPassword');
      if (!pwdInput) return;
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        if (pwdIcon) pwdIcon.className = 'fas fa-eye-slash';
        btnToggleUserPassword.title = 'Hide Password';
        btnToggleUserPassword.style.color = 'var(--admin-primary)';
      } else {
        pwdInput.type = 'password';
        if (pwdIcon) pwdIcon.className = 'fas fa-eye';
        btnToggleUserPassword.title = 'Unhide Password';
        btnToggleUserPassword.style.color = '#64748B';
      }
    });
  }

  // Open Add User Modal
  window.openAddUserModal = async function() {
    if (!allDepartmentsData || !allDepartmentsData.length) {
      await populateOrgDropdowns();
    }
    const form = document.getElementById('formUser');
    if (form) form.reset();
    document.getElementById('userEditId').value = '';
    document.getElementById('userModalHeading').innerHTML = '<i class="fas fa-user-plus"></i> Add New User / Staff Member';
    const pwdInput = document.getElementById('user_password');
    if (pwdInput) {
      pwdInput.type = 'password';
      pwdInput.value = '';
      pwdInput.required = true;
    }
    const pwdIcon = document.getElementById('iconToggleUserPassword');
    if (pwdIcon) pwdIcon.className = 'fas fa-eye';
    const pwdBtn = document.getElementById('btnToggleUserPassword');
    if (pwdBtn) {
      pwdBtn.title = 'Unhide Password';
      pwdBtn.style.color = '#64748B';
    }
    document.getElementById('userPasswordLabel').innerHTML = 'Password *';
    document.getElementById('userPasswordHint').style.display = 'none';
    const desUrInput = document.getElementById('user_designation_ur');
    if (desUrInput) desUrInput.value = '';
    loadOfficialSignatures();
    const sigSelect = document.getElementById('user_signature_id');
    if (sigSelect) sigSelect.value = '';

    const deptSelect = document.getElementById('user_department_id');
    if (deptSelect) deptSelect.value = '';
    const roleSelect = document.getElementById('user_role_id');
    if (roleSelect) roleSelect.value = '';
    const desigSelect = document.getElementById('user_designation_id');
    if (desigSelect) desigSelect.value = '';
    const desInput = document.getElementById('user_designation');
    if (desInput) desInput.value = '';
    const roleHidden = document.getElementById('user_role');
    if (roleHidden) roleHidden.value = 'staff';
    
    // Photo reset for new user (mandatory)
    if (userPhotoInput) userPhotoInput.value = '';
    if (userPhotoPreviewImg) { userPhotoPreviewImg.src = ''; userPhotoPreviewImg.style.display = 'none'; }
    if (userPhotoPlaceholderIcon) userPhotoPlaceholderIcon.style.display = 'block';
    if (userPhotoFileName) userPhotoFileName.textContent = 'No photo selected';
    if (btnRemoveUserPhoto) btnRemoveUserPhoto.style.display = 'none';
    if (userPhotoError) userPhotoError.style.display = 'none';
    const star = document.getElementById('userPhotoMandatoryStar');
    if (star) star.style.display = 'inline';
    const badge = document.getElementById('userPhotoBadge');
    if (badge) {
      badge.textContent = 'Mandatory for ID Card';
      badge.style.background = '#FEE2E2';
      badge.style.color = '#DC2626';
    }

    // Default checked permissions
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
      cb.checked = (cb.value !== 'users');
    });

    // Salary toggle reset
    if (hasSalaryCheckbox) {
      hasSalaryCheckbox.checked = false;
      if (salaryInputContainer) salaryInputContainer.style.display = 'none';
      if (salaryToggleBox) salaryToggleBox.classList.remove('active');
    }
    const salEl = document.getElementById('user_salary');
    if (salEl) salEl.value = '0';

    openModal('modalUser');
  };

  // Wire Add User button
  const btnAddUser = document.getElementById('btnAddUser');
  if (btnAddUser) {
    btnAddUser.addEventListener('click', (e) => {
      e.preventDefault();
      openAddUserModal();
    });
  }

  // View User Profile & Permissions Modal
  window.viewUser = async function(userId) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (!data.success || !data.user) {
        alert(data.message || 'Could not load user profile.');
        return;
      }

      const u = data.user;
      window._currentViewedUser = u;
      const initials = (u.full_name || u.username || 'U')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const roleClass = `role-${u.role || 'admin'}`;
      const roleName = {
        superadmin: 'Super Administrator',
        admin: 'Administrator',
        manager: 'Operations & Program Manager',
        accountant: 'Accounts & Finance Officer',
        staff: 'Field Staff / Welfare Officer'
      }[u.role] || (u.role || 'Administrator');

      const permLabels = {
        projects: 'Welfare Projects',
        articles: 'News & Updates',
        applications: 'Assistance Requests',
        donations: 'Donations & Receipts',
        submissions: 'Contact Messages',
        settings: 'Site & Bank Settings',
        users: 'User & Staff Management'
      };

      let permsList = Array.isArray(u.permissions) ? u.permissions : [];
      const permsTags = permsList.length > 0
        ? permsList.map(p => `<span class="perm-tag ${p === 'users' ? 'perm-tag-highlight' : ''}">${permLabels[p] || p}</span>`).join('')
        : '<span style="color: #64748B; font-style: italic;">No specific section rights assigned (Default minimal access)</span>';

      const salaryDetails = u.has_salary
        ? `<div style="display: inline-flex; align-items: center; gap: 8px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; padding: 6px 14px; border-radius: 20px; font-weight: 700;">
             <i class="fas fa-money-check-dollar"></i> Salaried Employee: PKR ${Number(u.salary).toLocaleString()} / month
           </div>`
        : `<div style="display: inline-flex; align-items: center; gap: 8px; background: #F1F5F9; border: 1px solid #E2E8F0; color: #475569; padding: 6px 14px; border-radius: 20px; font-weight: 600;">
             <i class="fas fa-hand-holding-heart" style="color: var(--admin-primary);"></i> Honorary / Volunteer (No Monthly Salary)
           </div>`;

      const statusBadge = u.is_active
        ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Active & Allowed to Login</span>'
        : '<span class="badge badge-danger"><i class="fas fa-ban"></i> Suspended / Deactivated</span>';

      const avatarHtml = u.photo_url
        ? `<img src="${escapeHtml(u.photo_url)}" alt="${escapeHtml(u.full_name || u.username)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#7F1D1D;color:#FFF;font-size:1.6rem;font-weight:700;\\'>${initials}</div>';" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #7F1D1D, #991B1B);color:#FFF;font-size:1.6rem;font-weight:700;">${initials}</div>`;

      const bodyHtml = `
        <div class="view-user-header" style="display: flex; align-items: center; gap: 16px;">
          <div class="view-user-avatar" style="width: 68px; height: 80px; border-radius: 8px; overflow: hidden; border: 2px solid #CBD5E1; background: #FFFFFF; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
            ${avatarHtml}
          </div>
          <div>
            <div style="font-size: 1.2rem; font-weight: 700; color: #0F172A;">${escapeHtml(u.full_name || u.username)}</div>
            <div style="font-size: 0.88rem; color: #64748B; margin-top: 2px;">
              <span><i class="fas fa-user"></i> @${escapeHtml(u.username)}</span>
              ${u.designation ? ` &bull; <strong>${escapeHtml(u.designation)}</strong>` : ''}
            </div>
            <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <span class="role-badge ${roleClass}">${roleName}</span>
              ${statusBadge}
            </div>
          </div>
        </div>

        <div class="view-user-grid">
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-envelope"></i> Email Address</label>
            <div class="view-user-value">${escapeHtml(u.email || 'N/A')}</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-phone"></i> Phone / WhatsApp</label>
            <div class="view-user-value">${escapeHtml(u.phone || 'Not provided')}</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-sitemap"></i> Department / Wing</label>
            <div class="view-user-value" style="font-weight: 600; color: #0284C7;">${escapeHtml(u.department_name_en || 'General Administration')}</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-award"></i> Official Designation</label>
            <div class="view-user-value" style="font-weight: 600; color: #1E293B;">${escapeHtml(u.designation_name_en || u.designation || 'Staff Member')}</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-user-shield"></i> User Role</label>
            <div class="view-user-value"><span class="role-badge ${roleClass}">${escapeHtml(u.role_name_en || roleName)}</span></div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-calendar-check"></i> Account Created</label>
            <div class="view-user-value">${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</div>
          </div>
          <div class="view-user-field" style="grid-column: span 2;">
            <label class="view-user-label"><i class="fas fa-key"></i> System Login Password</label>
            <div class="view-user-value" style="display: flex; align-items: center; justify-content: space-between; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 6px 12px; border-radius: 6px;">
              <span id="viewUserPasswordText" data-revealed="false" style="font-family: monospace; font-size: 0.95rem; font-weight: 700; color: #0F172A; letter-spacing: 2px;">••••••••</span>
              <button type="button" class="btn-action" onclick="toggleViewUserPassword()" title="Unhide / Hide Password" style="color: var(--admin-primary); background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 0.95rem; display: inline-flex; align-items: center;">
                <i class="fas fa-eye" id="iconViewUserPassword"></i> <span style="font-size: 0.75rem; font-weight: 600; margin-left: 4px;">Unhide</span>
              </button>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 18px;">
          <label class="view-user-label" style="display: block; margin-bottom: 8px;"><i class="fas fa-lock"></i> Modular Section Permissions</label>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">${permsTags}</div>
        </div>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px;">
          <label class="view-user-label" style="display: block; margin-bottom: 8px;"><i class="fas fa-file-invoice-dollar"></i> Compensation & Payroll Configuration</label>
          ${salaryDetails}
        </div>
      `;

      document.getElementById('viewUserModalBody').innerHTML = bodyHtml;

      const btnEditFromView = document.getElementById('btnEditFromView');
      if (btnEditFromView) {
        btnEditFromView.onclick = function() {
          closeModal('modalViewUser');
          editUser(userId);
        };
      }

      const btnViewIdCard = document.getElementById('btnViewStaffIdCardFromModal');
      if (btnViewIdCard) {
        btnViewIdCard.onclick = function() {
          closeModal('modalViewUser');
          openStaffIdCard(userId);
        };
      }

      openModal('modalViewUser');
    } catch (err) {
      console.error(err);
      alert('Error fetching user profile.');
    }
  };

  // Toggle Password Visibility in View User Modal
  window.toggleViewUserPassword = function() {
    const textEl = document.getElementById('viewUserPasswordText');
    const iconEl = document.getElementById('iconViewUserPassword');
    const btn = iconEl ? iconEl.closest('button') : null;
    if (!textEl) return;
    const plainPassword = (window._currentViewedUser && window._currentViewedUser.password_plain) || '';
    if (textEl.getAttribute('data-revealed') === 'true') {
      textEl.textContent = '••••••••';
      textEl.style.letterSpacing = '2px';
      textEl.setAttribute('data-revealed', 'false');
      if (iconEl) iconEl.className = 'fas fa-eye';
      if (btn) btn.innerHTML = '<i class="fas fa-eye" id="iconViewUserPassword"></i> <span style="font-size: 0.75rem; font-weight: 600; margin-left: 4px;">Unhide</span>';
    } else {
      textEl.textContent = plainPassword || '(Not set)';
      textEl.style.letterSpacing = 'normal';
      textEl.setAttribute('data-revealed', 'true');
      if (iconEl) iconEl.className = 'fas fa-eye-slash';
      if (btn) btn.innerHTML = '<i class="fas fa-eye-slash" id="iconViewUserPassword"></i> <span style="font-size: 0.75rem; font-weight: 600; margin-left: 4px;">Hide</span>';
    }
  };

  // Edit User
  window.editUser = async function(userId) {
    try {
      if (!allDepartmentsData || !allDepartmentsData.length) {
        await populateOrgDropdowns();
      }
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (!data.success || !data.user) {
        alert(data.message || 'Could not load user details.');
        return;
      }

      const user = data.user;
      document.getElementById('userEditId').value = user.id;
      document.getElementById('user_full_name').value = user.full_name || '';
      document.getElementById('user_username').value = user.username || '';
      document.getElementById('user_email').value = user.email || '';
      const pwdInput = document.getElementById('user_password');
      if (pwdInput) {
        pwdInput.type = 'password';
        pwdInput.value = user.password_plain || '';
        pwdInput.required = false;
      }
      const pwdIcon = document.getElementById('iconToggleUserPassword');
      if (pwdIcon) pwdIcon.className = 'fas fa-eye';
      const pwdBtn = document.getElementById('btnToggleUserPassword');
      if (pwdBtn) {
        pwdBtn.title = 'Unhide Password';
        pwdBtn.style.color = '#64748B';
      }
      document.getElementById('userPasswordLabel').innerHTML = 'Password';
      const pwdHint = document.getElementById('userPasswordHint');
      if (pwdHint) {
        pwdHint.style.display = 'block';
        pwdHint.textContent = 'Click the eye icon to unhide and view the password. You can also edit it directly.';
      }
      document.getElementById('user_role').value = user.role || 'staff';
      const deptSelect = document.getElementById('user_department_id');
      if (deptSelect) deptSelect.value = user.department_id || '';
      const roleSelect = document.getElementById('user_role_id');
      if (roleSelect) roleSelect.value = user.role_id || '';
      const desigSelect = document.getElementById('user_designation_id');
      if (desigSelect) desigSelect.value = user.designation_id || '';
      document.getElementById('user_designation').value = user.designation || '';
      const desUrInput = document.getElementById('user_designation_ur');
      if (desUrInput) desUrInput.value = user.designation_ur || '';
      loadOfficialSignatures();
      setTimeout(() => {
        const sigSelect = document.getElementById('user_signature_id');
        if (sigSelect) sigSelect.value = user.signature_id || '';
      }, 50);
      document.getElementById('user_phone').value = user.phone || '';
      document.getElementById('user_is_active').value = user.is_active ? '1' : '0';

      // Photo handling in edit mode (optional replacement)
      if (userPhotoInput) userPhotoInput.value = '';
      if (userPhotoError) userPhotoError.style.display = 'none';
      const star = document.getElementById('userPhotoMandatoryStar');
      if (star) star.style.display = 'none';
      const badge = document.getElementById('userPhotoBadge');
      if (badge) {
        badge.textContent = 'Optional Replacement';
        badge.style.background = '#F1F5F9';
        badge.style.color = '#475569';
      }

      if (user.photo_url) {
        if (userPhotoPreviewImg) {
          userPhotoPreviewImg.src = user.photo_url;
          userPhotoPreviewImg.style.display = 'block';
        }
        if (userPhotoPlaceholderIcon) userPhotoPlaceholderIcon.style.display = 'none';
        if (userPhotoFileName) userPhotoFileName.textContent = 'Existing photo preserved';
        if (btnRemoveUserPhoto) btnRemoveUserPhoto.style.display = 'none';
      } else {
        if (userPhotoPreviewImg) { userPhotoPreviewImg.src = ''; userPhotoPreviewImg.style.display = 'none'; }
        if (userPhotoPlaceholderIcon) userPhotoPlaceholderIcon.style.display = 'block';
        if (userPhotoFileName) userPhotoFileName.textContent = 'No photo uploaded yet';
        if (btnRemoveUserPhoto) btnRemoveUserPhoto.style.display = 'none';
      }

      // Permissions checkboxes
      const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
      document.querySelectorAll('.perm-checkbox').forEach(cb => {
        cb.checked = userPerms.includes(cb.value);
      });

      // Salary settings
      if (hasSalaryCheckbox) {
        hasSalaryCheckbox.checked = Boolean(user.has_salary);
        if (user.has_salary) {
          if (salaryInputContainer) salaryInputContainer.style.display = 'block';
          if (salaryToggleBox) salaryToggleBox.classList.add('active');
          const salEl = document.getElementById('user_salary');
          if (salEl) salEl.value = user.salary || 0;
        } else {
          if (salaryInputContainer) salaryInputContainer.style.display = 'none';
          if (salaryToggleBox) salaryToggleBox.classList.remove('active');
          const salEl = document.getElementById('user_salary');
          if (salEl) salEl.value = 0;
        }
      }

      document.getElementById('userModalHeading').innerHTML = `<i class="fas fa-user-pen"></i> Edit User: @${escapeHtml(user.username)}`;
      openModal('modalUser');
    } catch (err) {
      console.error(err);
      alert('Error fetching user data.');
    }
  };

  // Delete User
  window.deleteUser = async function(userId, username) {
    if (!confirm(`Are you sure you want to permanently delete the user account "@${username}"?\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('User deleted successfully.');
        loadUsers();
      } else {
        alert(data.message || 'Could not delete user.');
      }
    } catch (err) {
      alert('Network error while deleting user.');
    }
  };

  // Save User Form Submit (Multipart / FormData)
  const formUser = document.getElementById('formUser');
  if (formUser) {
    formUser.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('userSubmitBtn');
      if (submitBtn) submitBtn.disabled = true;

      const editId = document.getElementById('userEditId').value;
      const selectedPerms = Array.from(document.querySelectorAll('.perm-checkbox:checked')).map(cb => cb.value);
      const isSalaried = hasSalaryCheckbox ? hasSalaryCheckbox.checked : false;
      const salaryAmount = isSalaried ? parseFloat(document.getElementById('user_salary').value) || 0 : 0;

      const photoInput = document.getElementById('user_photo');
      const hasNewPhoto = (photoInput && photoInput.files && photoInput.files.length > 0);

      if (!editId && !hasNewPhoto) {
        if (userPhotoError) {
          userPhotoError.textContent = 'Profile photo is mandatory when adding a new staff member.';
          userPhotoError.style.display = 'block';
        }
        alert('Profile photo is mandatory when adding a staff member. Please select and upload a photo.');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      const passwordVal = document.getElementById('user_password').value;
      if (!passwordVal && !editId) {
        alert('Password is required for new users.');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      const formData = new FormData();
      formData.append('full_name', document.getElementById('user_full_name').value.trim());
      formData.append('username', document.getElementById('user_username').value.trim());
      formData.append('email', document.getElementById('user_email').value.trim());
      formData.append('role', document.getElementById('user_role').value);
      formData.append('department_id', document.getElementById('user_department_id')?.value || '');
      formData.append('role_id', document.getElementById('user_role_id')?.value || '');
      formData.append('designation_id', document.getElementById('user_designation_id')?.value || '');
      formData.append('designation', document.getElementById('user_designation').value.trim());
      formData.append('designation_ur', (document.getElementById('user_designation_ur')?.value || '').trim());
      formData.append('signature_id', document.getElementById('user_signature_id')?.value || '');
      formData.append('phone', document.getElementById('user_phone').value.trim());
      formData.append('is_active', document.getElementById('user_is_active').value);
      formData.append('permissions', JSON.stringify(selectedPerms));
      formData.append('has_salary', isSalaried ? '1' : '0');
      formData.append('salary', String(salaryAmount));

      if (passwordVal) {
        formData.append('password', passwordVal);
      }

      if (hasNewPhoto) {
        formData.append('photo', photoInput.files[0]);
      }

      const url = editId ? `/api/admin/users/${editId}` : '/api/admin/users';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          body: formData
        });
        const result = await res.json();

        if (result.success) {
          alert(editId ? 'User account & rights updated successfully!' : 'New user created successfully!');
          closeModal('modalUser');
          loadUsers();
        } else {
          alert(result.message || 'Error saving user.');
        }
      } catch (err) {
        console.error(err);
        alert('Server error while saving user.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // ==================== MODAL CONTROLS & DYNAMIC CRUD SUBMISSIONS ====================
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      const form = modal.querySelector('form');
      if (form) {
        form.reset();
        const hiddenId = form.querySelector('input[type="hidden"]');
        if (hiddenId) hiddenId.value = '';
      }
    }
  };

  // Close modals on clicking overlay background
  document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // 1. Project Form (Add OR Edit)
  // 1. Project Form (Add OR Edit)
  window.handleProjectFormSubmit = async function(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('formAddProject');
    if (!form) return;
    const btn = document.getElementById('projectSubmitBtn');
    if (btn) btn.disabled = true;

    const editId = document.getElementById('projectEditId').value;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const url = editId ? `/api/admin/projects/${editId}` : '/api/admin/projects';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        alert(editId ? 'Project updated successfully!' : 'New welfare project added successfully!');
        closeModal('modalProject');
        loadProjects(projectsFilterState.page);
        loadOverview();
        if (editId && currentDetailProjectId == editId) {
          viewProjectDetails(editId);
        }
      } else {
        alert(result.message || 'Error saving project.');
      }
    } catch (err) {
      alert('Server error while saving project.');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  const formAddProject = document.getElementById('formAddProject');
  if (formAddProject) {
    formAddProject.addEventListener('submit', window.handleProjectFormSubmit);
  }

  // 2. Article Form (Add OR Edit)
  const formAddArticle = document.getElementById('formAddArticle');
  if (formAddArticle) {
    formAddArticle.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('articleSubmitBtn');
      if (btn) btn.disabled = true;

      const editId = document.getElementById('articleEditId').value;
      const formData = new FormData(formAddArticle);
      const payload = Object.fromEntries(formData.entries());

      const url = editId ? `/api/admin/articles/${editId}` : '/api/admin/articles';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          alert(editId ? 'Article updated successfully!' : 'News article published successfully!');
          closeModal('modalArticle');
          loadArticles();
          loadOverview();
        } else {
          alert(result.message || 'Error saving article.');
        }
      } catch (err) {
        alert('Server error while saving article.');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // 3. Donation Form (Add OR Edit)
  const formAddDonation = document.getElementById('formAddDonation');
  if (formAddDonation) {
    formAddDonation.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('donationSubmitBtn');
      if (btn) btn.disabled = true;

      const editId = document.getElementById('donationEditId').value;
      const formData = new FormData(formAddDonation);
      const payload = Object.fromEntries(formData.entries());

      const url = editId ? `/api/admin/donations/${editId}` : '/api/admin/donations';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          alert(editId ? 'Donation updated successfully!' : 'Donation recorded successfully!');
          closeModal('modalDonation');
          loadDonations();
          loadOverview();
          if (!editId && (result.id || result.insertId)) {
            const donId = result.id || result.insertId;
            setTimeout(() => {
              if (confirm('Donation recorded successfully! Would you like to view and print the bilingual official receipt slip now?')) {
                viewDonationReceipt(donId);
              }
            }, 250);
          }
        } else {
          alert(result.message || 'Error saving donation.');
        }
      } catch (err) {
        alert('Server error while recording donation.');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // 4. Assistance Application Form (Add OR Edit)
  const formAddApplication = document.getElementById('formAddApplication');
  if (formAddApplication) {
    formAddApplication.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('applicationSubmitBtn');
      if (btn) btn.disabled = true;

      const editId = document.getElementById('applicationEditId').value;
      const formData = new FormData(formAddApplication);
      const payload = Object.fromEntries(formData.entries());

      const url = editId ? `/api/admin/assistance-applications/${editId}` : '/api/admin/assistance-applications';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          alert(editId ? 'Application updated successfully!' : `Assistance application created successfully! Tracking Number: ${result.tracking_number}`);
          closeModal('modalApplication');
          loadApplications();
          loadOverview();
        } else {
          alert(result.message || 'Error saving application.');
        }
      } catch (err) {
        alert('Server error while saving application.');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // ==================== VOLUNTEER & INTERNSHIP APPLICATIONS ====================
  let allVolunteersData = [];
  let currentVolunteerStatusFilter = 'all';

  async function loadVolunteers() {
    try {
      const res = await fetch('/api/admin/volunteers');
      const data = await res.json();
      const tbody = document.getElementById('volunteersTableBody');
      if (!tbody) return;

      if (!data.success || !Array.isArray(data.applications)) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #DC2626;">Failed to load applications.</td></tr>';
        return;
      }

      allVolunteersData = data.applications;

      // Calculate counts
      const total = allVolunteersData.length;
      const pending = allVolunteersData.filter(v => (v.status || '').toLowerCase() === 'pending').length;
      const review = allVolunteersData.filter(v => (v.status || '').toLowerCase() === 'under_review').length;
      const accepted = allVolunteersData.filter(v => (v.status || '').toLowerCase() === 'accepted').length;
      const rejected = allVolunteersData.filter(v => (v.status || '').toLowerCase() === 'rejected').length;

      // Update counters
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setTxt('volStatTotal', total);
      setTxt('volStatPending', pending);
      setTxt('volStatReview', review);
      setTxt('volStatAccepted', accepted);
      setTxt('countVolAll', total);
      setTxt('countVolPending', pending);
      setTxt('countVolReview', review);
      setTxt('countVolAccepted', accepted);
      setTxt('countVolRejected', rejected);

      renderVolunteersList();
    } catch (err) {
      console.error('[Load Volunteers Error]', err);
    }
  }

  function renderVolunteersList() {
    const tbody = document.getElementById('volunteersTableBody');
    if (!tbody) return;

    const searchInput = document.getElementById('volSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = allVolunteersData;

    if (currentVolunteerStatusFilter !== 'all') {
      filtered = filtered.filter(v => (v.status || '').toLowerCase() === currentVolunteerStatusFilter);
    }

    if (query) {
      filtered = filtered.filter(v =>
        (v.full_name || '').toLowerCase().includes(query) ||
        (v.email || '').toLowerCase().includes(query) ||
        (v.city || '').toLowerCase().includes(query) ||
        (v.reference_no || '').toLowerCase().includes(query) ||
        (v.phone || '').toLowerCase().includes(query)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94A3B8; padding: 24px;">No volunteer applications match your filter.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(v => {
      const status = (v.status || 'pending').toLowerCase();
      const statusLabels = {
        pending: 'Pending',
        under_review: 'Under Review',
        accepted: 'Accepted',
        rejected: 'Rejected'
      };
      const statusClass = `status-${status}`;
      const statusText = statusLabels[status] || status;

      const isIntern = (v.application_type || '').toLowerCase() === 'internship';
      const typeBadge = isIntern
        ? '<span class="type-pill type-internship"><i class="fas fa-graduation-cap"></i> Internship</span>'
        : '<span class="type-pill type-volunteer"><i class="fas fa-handshake-angle"></i> Volunteer</span>';

      const appliedDate = v.created_at ? new Date(v.created_at).toLocaleDateString() : 'N/A';

      const volAvatar = v.photo_url
        ? `<img src="${escapeHtml(v.photo_url)}" alt="${escapeHtml(v.full_name || '')}" class="table-user-avatar" onerror="this.outerHTML='<div class=\\'table-user-avatar-placeholder\\'>${(v.full_name || 'V').charAt(0).toUpperCase()}</div>';" />`
        : `<div class="table-user-avatar-placeholder">${(v.full_name || 'V').charAt(0).toUpperCase()}</div>`;

      return `
        <tr>
          <td>
            <strong style="font-family: monospace; color: var(--admin-primary); font-size: 0.86rem;">
              ${escapeHtml(v.reference_no || `#VOL-${v.id}`)}
            </strong>
          </td>
          <td>
            <div class="table-user-cell" style="display: flex; align-items: center; gap: 10px;">
              ${volAvatar}
              <div>
                <div style="font-weight: 700; color: #0F172A;">${escapeHtml(v.full_name || 'N/A')}</div>
                <div style="font-size: 0.76rem; color: #64748B;">
                  <span><i class="fas fa-location-dot"></i> ${escapeHtml(v.city || 'N/A')}</span> • 
                  <span><i class="fas fa-envelope"></i> ${escapeHtml(v.email || '')}</span>
                </div>
                ${(v.department_name_en || v.designation_name_en) ? `
                  <div style="font-size: 0.74rem; color: #0284C7; font-weight: 600; margin-top: 2px;">
                    <i class="fas fa-sitemap"></i> ${escapeHtml(v.department_name_en || 'Welfare')}${v.designation_name_en ? ' • ' + escapeHtml(v.designation_name_en) : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          </td>
          <td>
            ${typeBadge}
            ${v.role_name_en ? `<div style="font-size: 0.74rem; color: #475569; font-weight: 600; margin-top: 3px;">${escapeHtml(v.role_name_en)}</div>` : ''}
          </td>
          <td style="max-width: 180px; font-size: 0.8rem; color: #334155;">
            ${escapeHtml(v.areas_of_interest || 'General')}
          </td>
          <td style="font-size: 0.8rem; color: #475569;">
            ${escapeHtml(v.availability || 'Flexible')}
          </td>
          <td>
            <span class="status-pill ${statusClass}">
              <i class="fas fa-circle" style="font-size: 0.45rem;"></i> ${statusText}
            </span>
          </td>
          <td style="font-size: 0.8rem; color: #64748B;">${appliedDate}</td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-action-view" onclick="viewVolunteer(${v.id})" title="View Full Application & Review" aria-label="View application">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn-action btn-action-edit" onclick="openEditVolunteerModal(${v.id})" title="Edit Volunteer Details, Photo & Designation" aria-label="Edit volunteer">
                <i class="fas fa-pen"></i>
              </button>
              <button type="button" class="btn-action btn-action-idcard" onclick="openVolunteerIdCard(${v.id})" title="View, Print & Download Volunteer ID Card" aria-label="Volunteer ID card">
                <i class="fas fa-id-card"></i>
              </button>
              <button type="button" class="btn-action" onclick="printSingleVolunteer(${v.id})" title="Print Candidate Profile Dossier" aria-label="Print candidate dossier" style="color: #475569;">
                <i class="fas fa-print"></i>
              </button>
              ${status !== 'accepted' ? `
                <button type="button" class="btn-action btn-action-confirm" onclick="quickVolunteerStatus(${v.id}, 'accepted')" title="Accept Candidate" aria-label="Accept candidate">
                  <i class="fas fa-check"></i>
                </button>
              ` : ''}
              ${status !== 'rejected' ? `
                <button type="button" class="btn-action btn-action-refund" onclick="quickVolunteerStatus(${v.id}, 'rejected')" title="Reject Candidate" aria-label="Reject candidate">
                  <i class="fas fa-xmark"></i>
                </button>
              ` : ''}
              <button type="button" class="btn-action btn-action-delete" onclick="deleteVolunteer(${v.id})" title="Delete Application" aria-label="Delete application">
                <i class="fas fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.setVolunteerStatusFilter = function(status) {
    currentVolunteerStatusFilter = status;
    const tabBtns = document.querySelectorAll('#volunteerStatusFilterTabs .btn-filter-tab');
    tabBtns.forEach(btn => {
      if (btn.dataset.status === status) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderVolunteersList();
  };

  window.filterVolunteersList = function() {
    renderVolunteersList();
  };

  window.viewVolunteer = async function(id) {
    try {
      const res = await fetch(`/api/admin/volunteers/${id}`);
      const data = await res.json();
      if (!data.success || !data.application) {
        return alert('Failed to retrieve volunteer profile.');
      }
      const v = data.application;
      const modalBody = document.getElementById('volunteerModalContent');
      if (!modalBody) return;

      const isIntern = (v.application_type || '').toLowerCase() === 'internship';
      const typeBadge = isIntern
        ? '<span class="type-pill type-internship"><i class="fas fa-graduation-cap"></i> Internship Application</span>'
        : '<span class="type-pill type-volunteer"><i class="fas fa-handshake-angle"></i> Volunteer Application</span>';

      const avatarHtml = v.photo_url
        ? `<img src="${escapeHtml(v.photo_url)}" alt="${escapeHtml(v.full_name || '')}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#065F46;color:#FFF;font-size:1.6rem;font-weight:700;\\'>${(v.full_name || 'V').charAt(0).toUpperCase()}</div>';" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #064E3B, #047857);color:#FFF;font-size:1.6rem;font-weight:700;">${(v.full_name || 'V').charAt(0).toUpperCase()}</div>`;

      modalBody.innerHTML = `
        <div class="view-user-header" style="display: flex; align-items: center; gap: 16px;">
          <div class="view-user-avatar" style="width: 68px; height: 80px; border-radius: 8px; overflow: hidden; border: 2px solid #CBD5E1; background: #FFFFFF; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
            ${avatarHtml}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0;">${escapeHtml(v.full_name)}</h3>
              ${typeBadge}
            </div>
            <div style="font-size: 0.82rem; color: #64748B;">
              Ref: <strong style="font-family: monospace; color: var(--admin-primary);">${escapeHtml(v.reference_no || `#VOL-${v.id}`)}</strong> • Applied on ${new Date(v.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        <div class="view-user-grid">
          <div class="view-user-item">
            <span class="view-user-label"><i class="fas fa-envelope"></i> Email Address</span>
            <span class="view-user-val"><a href="mailto:${escapeHtml(v.email)}" style="color: var(--admin-primary);">${escapeHtml(v.email)}</a></span>
          </div>
          <div class="view-user-item">
            <span class="view-user-label"><i class="fas fa-phone"></i> Phone / WhatsApp</span>
            <span class="view-user-val"><a href="tel:${escapeHtml(v.phone)}" style="color: #0F172A;">${escapeHtml(v.phone)}</a></span>
          </div>
          <div class="view-user-item">
            <span class="view-user-label"><i class="fas fa-city"></i> City of Residence</span>
            <span class="view-user-val">${escapeHtml(v.city || 'N/A')}</span>
          </div>
          <div class="view-user-item">
            <span class="view-user-label"><i class="fas fa-calendar-check"></i> Availability</span>
            <span class="view-user-val">${escapeHtml(v.availability || 'Flexible')}</span>
          </div>
          <div class="view-user-item">
            <span class="view-user-label"><i class="fas fa-sitemap"></i> Department / Wing</span>
            <span class="view-user-val" style="font-weight: 600; color: #0284C7;">${escapeHtml(v.department_name_en || 'Community Welfare & Relief')}</span>
          </div>
          <div class="view-user-item">
            <span class="view-user-label"><i class="fas fa-id-badge"></i> Assigned Role</span>
            <span class="view-user-val" style="font-weight: 600;">${escapeHtml(v.role_name_en || v.role || 'Volunteer')}</span>
          </div>
          <div class="view-user-item" style="grid-column: span 2;">
            <span class="view-user-label"><i class="fas fa-briefcase"></i> Official Designation</span>
            <span class="view-user-val" style="font-weight: 600; color: #1E293B;">${escapeHtml(v.designation_name_en || v.designation || 'Field Volunteer')}</span>
          </div>
          <div class="view-user-item" style="grid-column: span 2;">
            <span class="view-user-label"><i class="fas fa-heart"></i> Areas of Interest</span>
            <span class="view-user-val">${escapeHtml(v.areas_of_interest || 'General Support')}</span>
          </div>
          ${v.relevant_skills ? `
            <div class="view-user-item" style="grid-column: span 2;">
              <span class="view-user-label"><i class="fas fa-wrench"></i> Relevant Skills & Education</span>
              <span class="view-user-val">${escapeHtml(v.relevant_skills)}</span>
            </div>
          ` : ''}
        </div>

        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px;">
          <span class="view-user-label" style="display: block; margin-bottom: 6px;"><i class="fas fa-quote-left"></i> Motivation Statement / Why Join</span>
          <p style="font-size: 0.88rem; color: #1E293B; line-height: 1.5; margin: 0; white-space: pre-wrap;">${escapeHtml(v.motivation_message || 'No motivation message provided.')}</p>
        </div>

        ${v.reviewed_at ? `
          <div style="font-size: 0.76rem; color: #64748B; background: #F1F5F9; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;">
            <i class="fas fa-clock-rotate-left"></i> Last reviewed on ${new Date(v.reviewed_at).toLocaleString()} by Admin (ID: ${v.reviewed_by || 'System'})
          </div>
        ` : ''}
      `;

      document.getElementById('volDetailId').value = v.id;
      document.getElementById('volDetailStatusSelect').value = (v.status || 'pending').toLowerCase();
      document.getElementById('volDetailAdminNotes').value = v.admin_notes || '';

      const printBtn = document.getElementById('btnPrintVolFromModal');
      if (printBtn) printBtn.style.display = 'inline-flex';

      const idCardBtn = document.getElementById('btnViewVolIdCardFromModal');
      if (idCardBtn) {
        idCardBtn.onclick = function() {
          closeModal('modalVolunteerDetail');
          openVolunteerIdCard(v.id);
        };
      }

      const editBtn = document.getElementById('btnEditFromVolunteerDetail');
      if (editBtn) {
        editBtn.onclick = function() {
          closeModal('modalVolunteerDetail');
          openEditVolunteerModal(v.id);
        };
      }

      openModal('modalVolunteerDetail');
    } catch (err) {
      alert('Error fetching volunteer details.');
    }
  };

  window.handleVolunteerStatusSubmit = async function(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('volDetailId').value;
    const status = document.getElementById('volDetailStatusSelect').value;
    const admin_notes = document.getElementById('volDetailAdminNotes').value;

    try {
      const res = await fetch(`/api/admin/volunteers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes })
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modalVolunteerDetail');
        loadVolunteers();
      } else {
        alert(data.message || 'Error updating volunteer status.');
      }
    } catch (err) {
      alert('Network error while updating status.');
    }
  };

  window.quickVolunteerStatus = async function(id, status) {
    try {
      const res = await fetch(`/api/admin/volunteers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        loadVolunteers();
      } else {
        alert(data.message || 'Error updating status.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  window.deleteVolunteer = async function(id) {
    if (!confirm('Are you sure you want to permanently delete this volunteer application? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/volunteers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadVolunteers();
      } else {
        alert(data.message || 'Error deleting application.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  // ==================== ACCOUNTS & PROJECT-WISE DONATION TRACKING ====================
  let allActiveProjectsData = [];

  async function loadAccounts() {
    try {
      const res = await fetch('/api/admin/accounts/summary');
      const data = await res.json();

      if (!data.success) {
        console.error('Failed to load accounts summary');
        return;
      }

      // 1. Update top summary statistics
      const elConfirmed = document.getElementById('accTotalConfirmed');
      const elPending = document.getElementById('accTotalPending');
      const elActiveProj = document.getElementById('accActiveProjects');
      const elConfirmedTxn = document.getElementById('accConfirmedTxnCount');

      if (elConfirmed) elConfirmed.textContent = `PKR ${(data.total_confirmed || 0).toLocaleString()}`;
      if (elPending) elPending.textContent = `PKR ${(data.total_pending || 0).toLocaleString()}`;
      if (elActiveProj) elActiveProj.textContent = `${data.active_projects_count || 0} Projects`;
      if (elConfirmedTxn) elConfirmedTxn.textContent = `${data.confirmed_transactions_count || 0} Receipts`;

      allActiveProjectsData = data.projects || [];

      // 2. Populate Project Select in Filters & Manual Donation Modal
      const filterSelect = document.getElementById('accFilterProject');
      const modalSelect = document.getElementById('manual_project_id');

      if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = `
          <option value="">All Projects & Funds</option>
          <option value="general">General / Unrestricted Fund</option>
          ${allActiveProjectsData.map(p => `
            <option value="${p.id}" ${currentVal == p.id ? 'selected' : ''}>${escapeHtml(p.title_en || `Project #${p.id}`)}</option>
          `).join('')}
        `;
      }

      if (modalSelect) {
        modalSelect.innerHTML = `
          <option value="">General / Unrestricted Fund</option>
          ${allActiveProjectsData.map(p => `
            <option value="${p.id}">${escapeHtml(p.title_en || `Project #${p.id}`)} (Target: PKR ${(p.goal_amount || 0).toLocaleString()})</option>
          `).join('')}
        `;
      }

      // 3. Render Project Cards Grid
      const cardsGrid = document.getElementById('accountsProjectCardsGrid');
      if (cardsGrid) {
        const gf = data.general_fund || { total_confirmed: 0, confirmed_count: 0 };

        const generalFundCardHtml = `
          <div class="project-account-card general-fund" id="projCard_general">
            <div>
              <div class="project-card-header">
                <div>
                  <div class="project-card-title"><i class="fas fa-hand-holding-heart" style="color: #2563EB;"></i> General Welfare Fund</div>
                  <div style="font-size: 0.78rem; color: #64748B;">Unrestricted emergency & community relief</div>
                </div>
                <span class="project-card-badge" style="background: #EFF6FF; color: #1D4ED8;">Unrestricted</span>
              </div>
              <div class="project-funding-metrics">
                <div>
                  <div class="funding-raised-text" style="color: #1D4ED8;">PKR ${gf.total_confirmed.toLocaleString()}</div>
                  <div class="funding-target-text">Confirmed Balance Received</div>
                </div>
              </div>
              <div class="project-progress-track">
                <div class="project-progress-fill" style="width: 100%;"></div>
              </div>
            </div>
            <div class="project-card-footer">
              <span><strong>${gf.confirmed_count}</strong> Confirmed Receipts</span>
              <button type="button" class="btn-admin btn-admin-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="filterLedgerByProject('general')">
                <i class="fas fa-filter"></i> View Ledger
              </button>
            </div>
          </div>
        `;

        const projectCardsHtml = allActiveProjectsData.map(p => {
          const raised = parseFloat(p.raised_amount) || 0;
          const goal = parseFloat(p.goal_amount) || 1;
          const pct = Math.round((raised / goal) * 100);
          const barWidth = Math.min(100, pct);

          return `
            <div class="project-account-card" id="projCard_${p.id}">
              <div>
                <div class="project-card-header">
                  <div>
                    <div class="project-card-title">${escapeHtml(p.title_en || `Project #${p.id}`)}</div>
                    ${p.title_ur ? `<div style="font-size: 0.78rem; color: #64748B;" dir="rtl">${escapeHtml(p.title_ur)}</div>` : ''}
                  </div>
                  <span class="project-card-badge">${pct}% Funded</span>
                </div>
                <div class="project-funding-metrics">
                  <div>
                    <div class="funding-raised-text">PKR ${raised.toLocaleString()}</div>
                    <div class="funding-target-text">Target: PKR ${goal.toLocaleString()}</div>
                  </div>
                </div>
                <div class="project-progress-track" title="${pct}% funded">
                  <div class="project-progress-fill" style="width: ${barWidth}%;"></div>
                </div>
              </div>
              <div class="project-card-footer">
                <span><strong>${p.confirmed_donations_count || 0}</strong> Confirmed Donations</span>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="btn-admin btn-admin-secondary" style="padding: 4px 8px; font-size: 0.72rem;" onclick="filterLedgerByProject(${p.id})" title="Filter transactions below">
                    <i class="fas fa-filter"></i> Filter
                  </button>
                  <button type="button" class="btn-admin btn-admin-primary" style="padding: 4px 8px; font-size: 0.72rem;" onclick="viewProjectDetails(${p.id})" title="Open dedicated project details and ledger modal">
                    <i class="fas fa-book-bookmark"></i> Ledger
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');

        cardsGrid.innerHTML = generalFundCardHtml + projectCardsHtml;
      }

      // 4. Load the transaction ledger
      await loadAccountsTransactions();
    } catch (err) {
      console.error('[Load Accounts Error]', err);
    }
  }

  async function loadAccountsTransactions() {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    const projVal = document.getElementById('accFilterProject') ? document.getElementById('accFilterProject').value : '';
    const statusVal = document.getElementById('accFilterStatus') ? document.getElementById('accFilterStatus').value : '';
    const dateVal = document.getElementById('accFilterDate') ? document.getElementById('accFilterDate').value : 'all';
    const searchVal = document.getElementById('accFilterSearch') ? document.getElementById('accFilterSearch').value.trim() : '';

    const params = new URLSearchParams();
    if (projVal) params.append('project_id', projVal);
    if (statusVal) params.append('status', statusVal);
    if (dateVal) params.append('date_range', dateVal);
    if (searchVal) params.append('search', searchVal);

    try {
      const res = await fetch(`/api/admin/accounts/transactions?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !Array.isArray(data.transactions)) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #DC2626;">Failed to load transactions.</td></tr>';
        return;
      }

      if (data.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94A3B8; padding: 24px;">No transactions match the selected criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = data.transactions.map(t => {
        const status = (t.status || 'pending').toLowerCase();
        const isConfirmed = (status === 'confirmed' || status === 'verified');
        const isPending = (status === 'pending');
        const isRefunded = (status === 'refunded');

        const statusClass = `status-${status}`;
        const statusDisplay = isConfirmed ? 'Confirmed' : (status.charAt(0).toUpperCase() + status.slice(1));

        const projectName = t.project_title_en 
          ? `<span style="font-weight: 600; color: #0F172A;">${escapeHtml(t.project_title_en)}</span>` 
          : `<span style="color: #64748B; font-style: italic;">General Welfare Fund</span>`;

        const donorInfo = t.donor_name 
          ? `<strong>${escapeHtml(t.donor_name)}</strong>${t.donor_phone ? `<div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(t.donor_phone)}</div>` : ''}`
          : `<span style="color: #64748B; font-style: italic;">Anonymous Donor</span>`;

        const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A';
        const amountNum = parseFloat(t.amount) || 0;

        return `
          <tr>
            <td>
              <strong style="font-family: monospace; color: var(--admin-primary); font-size: 0.86rem;">
                ${escapeHtml(t.transaction_reference || `#TXN-${t.id}`)}
              </strong>
            </td>
            <td style="font-size: 0.8rem; color: #64748B; white-space: nowrap;">${dateStr}</td>
            <td>${donorInfo}</td>
            <td>${projectName}</td>
            <td>
              <strong style="color: ${isConfirmed ? '#059669' : '#0F172A'}; font-size: 0.95rem;">
                PKR ${amountNum.toLocaleString()}
              </strong>
            </td>
            <td style="font-size: 0.82rem; color: #475569;">
              <i class="fas fa-money-bill-wave" style="font-size: 0.75rem; color: #64748B;"></i> ${escapeHtml(t.payment_method || 'Direct')}
            </td>
            <td>
              <span class="status-pill ${statusClass}">
                <i class="fas fa-circle" style="font-size: 0.45rem;"></i> ${statusDisplay}
              </span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <div class="action-btn-group">
                <button type="button" class="btn-action btn-action-view" onclick="viewDonationReceipt(${t.id})" title="View Official Receipt Slip" aria-label="View receipt">
                  <i class="fas fa-file-invoice"></i>
                </button>
                ${isPending ? `
                  <button type="button" class="btn-action btn-action-confirm" onclick="confirmAccountDonation(${t.id}, ${amountNum})" title="Confirm Donation (Credit to Project)" aria-label="Confirm donation">
                    <i class="fas fa-circle-check"></i>
                  </button>
                ` : ''}
                ${isConfirmed ? `
                  <button type="button" class="btn-action btn-action-refund" onclick="refundAccountDonation(${t.id}, ${amountNum})" title="Refund / Reverse Donation (Deduct from Project)" aria-label="Refund donation">
                    <i class="fas fa-arrow-rotate-left"></i>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('[Load Transactions Error]', err);
    }
  }

  window.filterAccountsTransactions = function() {
    loadAccountsTransactions();
  };

  window.filterLedgerByProject = function(projectId) {
    const filterSelect = document.getElementById('accFilterProject');
    if (filterSelect) {
      filterSelect.value = (projectId === 'general' ? 'general' : String(projectId));
      loadAccountsTransactions();

      // Highlight selected project card
      document.querySelectorAll('.project-account-card').forEach(c => c.classList.remove('selected'));
      const activeCard = document.getElementById(`projCard_${projectId}`);
      if (activeCard) {
        activeCard.classList.add('selected');
      }

      // Smooth scroll to ledger
      const ledgerTbl = document.getElementById('accountsTableBody');
      if (ledgerTbl) {
        ledgerTbl.closest('.admin-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  window.openManualDonationModal = function() {
    const form = document.getElementById('formManualDonation');
    if (form) form.reset();

    generateManualRef();
    document.getElementById('manual_status').value = 'confirmed';

    openModal('modalManualDonation');
  };

  window.generateManualRef = function() {
    const yr = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    const input = document.getElementById('manual_transaction_id');
    if (input) input.value = `TXN-${yr}-${rand}`;
  };

  window.handleManualDonationSubmit = async function(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnSubmitManualDonation');
    if (btn) btn.disabled = true;

    const projectIdVal = document.getElementById('manual_project_id').value;
    const payload = {
      project_id: projectIdVal ? parseInt(projectIdVal, 10) : null,
      amount: parseFloat(document.getElementById('manual_amount').value),
      donor_name: document.getElementById('manual_donor_name').value.trim() || 'Anonymous',
      donor_phone: document.getElementById('manual_donor_phone').value.trim() || null,
      donor_email: document.getElementById('manual_donor_email').value.trim() || null,
      payment_method: document.getElementById('manual_payment_method').value,
      transaction_reference: document.getElementById('manual_transaction_id').value.trim(),
      status: document.getElementById('manual_status').value,
      notes: document.getElementById('manual_notes').value.trim() || null
    };

    if (!payload.amount || payload.amount <= 0) {
      alert('Please enter a valid donation amount.');
      if (btn) btn.disabled = false;
      return;
    }

    try {
      const res = await fetch('/api/admin/accounts/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message || 'Donation successfully recorded!');
        closeModal('modalManualDonation');
        loadAccounts();
        loadOverview();
      } else {
        alert(data.message || 'Error recording donation.');
      }
    } catch (err) {
      alert('Server error while saving donation.');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.confirmAccountDonation = async function(id, amount) {
    const formatted = parseFloat(amount || 0).toLocaleString();
    if (!confirm(`Are you sure you want to mark this donation of PKR ${formatted} as CONFIRMED?\n\nIf it is associated with a specific project, the project's raised total and progress percentage will automatically be updated.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/accounts/donations/${id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Donation confirmed!');
        loadAccounts();
        loadOverview();
      } else {
        alert(data.message || 'Failed to confirm donation.');
      }
    } catch (err) {
      alert('Network error while confirming donation.');
    }
  };

  window.refundAccountDonation = async function(id, amount) {
    const formatted = parseFloat(amount || 0).toLocaleString();
    const reason = prompt(`Enter reason for reversing / refunding this confirmed donation of PKR ${formatted}:\n\n(Note: The project's raised funding balance will automatically be reduced by PKR ${formatted})`);
    if (reason === null) return; // User pressed Cancel

    try {
      const res = await fetch(`/api/admin/accounts/donations/${id}/refund`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refund_reason: reason.trim() || 'Admin manual adjustment' })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Donation refunded and project balance adjusted.');
        loadAccounts();
        loadOverview();
      } else {
        alert(data.message || 'Failed to refund donation.');
      }
    } catch (err) {
      alert('Network error while reversing donation.');
    }
  };

  // ==================== BILINGUAL OFFICIAL RECEIPT & PRINTING ====================
  let activeReceiptDonation = null;
  let activeReceiptLang = 'en';

  window.setReceiptLanguage = function(lang) {
    activeReceiptLang = lang;
    const btnEn = document.getElementById('btnReceiptLangEn');
    const btnUr = document.getElementById('btnReceiptLangUr');

    if (lang === 'ur') {
      if (btnUr) {
        btnUr.className = 'btn-admin btn-admin-primary';
      }
      if (btnEn) {
        btnEn.className = 'btn-admin btn-admin-secondary';
      }
    } else {
      if (btnEn) {
        btnEn.className = 'btn-admin btn-admin-primary';
      }
      if (btnUr) {
        btnUr.className = 'btn-admin btn-admin-secondary';
      }
    }

    if (activeReceiptDonation) {
      renderReceiptSlip(activeReceiptDonation, activeReceiptLang);
    }
  };

  // ==================== NUMBER TO URDU WORDS CONVERTER ====================
  function numberToUrduWords(num) {
    num = Math.floor(Math.abs(Number(num) || 0));
    if (num === 0) return 'صفر پاکستانی روپے';

    const ones = [
      '', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو',
      'دس', 'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ', 'انیس',
      'بیس', 'اکیس', 'بائیس', 'تیئس', 'چوبیس', 'پچیس', 'چھبیس', 'ستائیس', 'اٹھائیس', 'انتیس',
      'تیس', 'اکتیس', 'بتیس', 'تینتیس', 'چونتیس', 'پینتیس', 'چھتیس', 'سینتیس', 'اڑتیس', 'انتالیس',
      'چالیس', 'اکتالیس', 'بیالیس', 'تینتالیس', 'چوالیس', 'پینتالیس', 'چھیاالیس', 'سینتالیس', 'اڑتالیس', 'انچاس',
      'پچاس', 'اکیاون', 'باون', 'تریپن', 'چون', 'پچپن', 'چھپن', 'ستاون', 'اٹھاون', 'انسٹھ',
      'ساٹھ', 'اکسٹھ', 'باسٹھ', 'تریسٹھ', 'چونسٹھ', 'پینسٹھ', 'چھیاسٹھ', 'سڑسٹھ', 'اڑسٹھ', 'انہتر',
      'ستر', 'اکہتر', 'بہتر', 'تہتر', 'چوہتر', 'پچہتر', 'چھہتر', 'ستتر', 'اٹھہتر', 'اناسی',
      'اسی', 'اکیاسی', 'بیاسی', 'تراسی', 'چوراسی', 'پچاسی', 'چھیاسی', 'ستاسی', 'اٹھاسی', 'نواسی',
      'نوے', 'اکیانوے', 'بانوے', 'ترانوے', 'چورانوے', 'پچانوے', 'چھیانوے', 'ستانوے', 'اٹھانوے', 'نناوے'
    ];

    function convertTwoDigits(n) {
      return ones[n] || '';
    }

    function convertHundreds(n) {
      let str = '';
      const h = Math.floor(n / 100);
      const rem = n % 100;
      if (h > 0) {
        str += ones[h] + ' سو';
        if (rem > 0) str += ' ';
      }
      if (rem > 0) {
        str += convertTwoDigits(rem);
      }
      return str.trim();
    }

    let result = '';

    // Crores (10,000,000)
    const crore = Math.floor(num / 10000000);
    let remainder = num % 10000000;
    if (crore > 0) {
      result += (crore < 100 ? convertTwoDigits(crore) : convertHundreds(crore)) + ' کروڑ ';
    }

    // Lakhs (100,000)
    const lakh = Math.floor(remainder / 100000);
    remainder = remainder % 100000;
    if (lakh > 0) {
      result += convertTwoDigits(lakh) + ' لاکھ ';
    }

    // Thousands (1,000)
    const thousand = Math.floor(remainder / 1000);
    remainder = remainder % 1000;
    if (thousand > 0) {
      result += convertTwoDigits(thousand) + ' ہزار ';
    }

    // Hundreds & rest
    if (remainder > 0) {
      result += convertHundreds(remainder);
    }

    return (result.trim() + ' پاکستانی روپے').trim();
  }

  function getActiveStampUrl() {
    if (activeReceiptStampId) {
      const st = officialStampsList.find(s => s.id == activeReceiptStampId);
      if (st) return st.image_url;
    }
    const def = officialStampsList.find(s => s.is_default == 1);
    return def ? def.image_url : null;
  }

  function renderReceiptSlip(d, lang = 'en') {
    const receiptBody = document.getElementById('receiptModalBody');
    if (!receiptBody) return;

    const isConfirmed = (d.status === 'confirmed' || d.status === 'verified');
    const amountNum = parseFloat(d.amount) || 0;
    const formattedAmount = amountNum.toLocaleString();
    const dateObj = d.created_at ? new Date(d.created_at) : new Date();
    const activeStampUrl = getActiveStampUrl();

    const logoUrl = (currentBrandingAssets && currentBrandingAssets.site_logo_url) ? currentBrandingAssets.site_logo_url : '/media/branding/Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png';
    const orgNameEn = (currentBrandingAssets && currentBrandingAssets.foundation_name_en) ? currentBrandingAssets.foundation_name_en : 'Qasr-e-Shabbir Foundation';
    const orgNameUr = (currentBrandingAssets && currentBrandingAssets.foundation_name_ur) ? currentBrandingAssets.foundation_name_ur : 'قصرِ شبیر فاؤنڈیشن';

    const isUr = (lang === 'ur');

    if (isUr) {
      // Urdu Receipt Slip (Strict RTL, Labels on Right, Values on Left, Dynamic Urdu Words, Authentic Verifier Name & Official Stamp)
      receiptBody.innerHTML = `
        <div class="receipt-printable-box receipt-ur" id="printableReceiptArea" dir="rtl" style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; text-align: right; line-height: 1.85;">
          <!-- Official Logo Light Watermark -->
          <div class="receipt-watermark" aria-hidden="true">
            <img src="${logoUrl}" alt="" class="receipt-watermark-img" onerror="this.src='/media/branding/logo.svg'" />
          </div>

          <div class="receipt-content-layer">
            <div class="receipt-header-banner" style="text-align: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; margin-bottom: 12px;">
              <img src="${logoUrl}" alt="Qasr-e-Shabbir" class="receipt-logo-header" onerror="this.src='/media/branding/logo.svg'" style="width: 58px; height: 54px; object-fit: contain; margin-bottom: 4px;" />
              <div class="receipt-org-name" style="font-size: 1.35rem; font-weight: 800; color: #7F1D1D;">
                ${escapeHtml(orgNameUr)}
              </div>
              <div class="receipt-reg-badge" style="display: inline-block; background: #FEF2F2; color: #991B1B; border: 1px solid #FECDD3; padding: 2px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; margin-top: 3px;">
                رجسٹرڈ چیریٹی نمبر: 10469
              </div>
              <div class="receipt-doc-title" style="font-size: 1rem; font-weight: 700; color: #334155; margin-top: 4px;">
                تصدیق شدہ عطیہ رسید
              </div>
              <div style="margin-top: 5px;">
                <span class="status-pill ${isConfirmed ? 'status-confirmed' : 'status-pending'}" style="display: inline-flex; align-items: center; padding: 3px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 700;">
                  ${isConfirmed ? '✓ تصدیق شدہ عطیہ' : '⏳ زیرِ تصدیق'}
                </span>
              </div>
            </div>

            <!-- Fields Table (Labels on Right, Values on Left) -->
            <div class="receipt-fields-list" style="margin-top: 10px; border-top: 1px solid #E2E8F0;">
              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 700; color: #475569; font-size: 0.92rem;">رسید نمبر / حوالہ:</span>
                <span class="receipt-val" dir="ltr" style="font-family: monospace; font-size: 0.92rem; font-weight: 700; color: #0F172A;">${escapeHtml(d.transaction_reference || `#TXN-${d.id}`)}</span>
              </div>

              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 700; color: #475569; font-size: 0.92rem;">تاریخ ادائیگی:</span>
                <span class="receipt-val" style="font-size: 0.92rem; font-weight: 700; color: #0F172A;">${dateObj.toLocaleDateString('ur-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 700; color: #475569; font-size: 0.92rem;">محترم عطیہ دہندہ:</span>
                <span class="receipt-val" style="font-size: 0.95rem; font-weight: 700; color: #0F172A;">${escapeHtml(d.donor_name || 'مخیر ہمدرد (بے نام)')}</span>
              </div>

              ${d.donor_phone ? `
                <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #F1F5F9;">
                  <span class="receipt-label" style="font-weight: 700; color: #475569; font-size: 0.92rem;">رابطہ فون:</span>
                  <span class="receipt-val" dir="ltr" style="font-size: 0.92rem; font-weight: 700; color: #0F172A;">${escapeHtml(d.donor_phone)}</span>
                </div>
              ` : ''}

              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 700; color: #475569; font-size: 0.92rem;">مخصوص فلاحی منصوبہ:</span>
                <span class="receipt-val" style="font-size: 0.92rem; font-weight: 700; color: #7F1D1D;">${escapeHtml(d.project_title_ur || d.project_title || 'عام فلاحی فنڈ')}</span>
              </div>

              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 700; color: #475569; font-size: 0.92rem;">ذریعہ ادائیگی:</span>
                <span class="receipt-val" style="font-size: 0.92rem; font-weight: 700; color: #0F172A;">${escapeHtml(d.payment_method || 'بینک ٹرانسفر')}</span>
              </div>

              ${d.notes ? `
                <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #F1F5F9;">
                  <span class="receipt-label" style="font-weight: 700; color: #475569; font-size: 0.92rem;">مخصوص مد / تفصیل:</span>
                  <span class="receipt-val" style="font-size: 0.9rem; font-weight: 600; color: #334155;">${escapeHtml(d.notes)}</span>
                </div>
              ` : ''}
            </div>

            <!-- Prominent Urdu Financial Section -->
            <div class="receipt-amount-box receipt-amount-box-ur" style="background: #F0FDF4; border: 2px solid #86EFAC; border-radius: 8px; padding: 12px 18px; margin: 14px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 6px;">
                <span style="font-weight: 800; color: #064E3B; font-size: 1.1rem;">کل وصول شدہ رقم:</span>
                <span class="receipt-amount-num" dir="ltr" style="font-family: monospace; font-size: 1.35rem; font-weight: 800; color: #047857;">PKR ${formattedAmount}</span>
              </div>
              <div style="font-size: 0.95rem; color: #14532D; font-weight: 700; text-align: right; border-top: 1px dashed #A7F3D0; padding-top: 6px;">
                رقم الفاظ میں: <span style="color: #7F1D1D;">${numberToUrduWords(amountNum)}</span>
              </div>
            </div>

            <!-- Verification & Stamp Area -->
            <div class="receipt-stamp-area" style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
              <!-- Verifier Identity Box -->
              <div class="receipt-verifier-box" style="text-align: right; max-width: 280px;">
                <div style="font-size: 0.9rem; font-weight: 700; color: #1E293B; margin-bottom: 3px;">
                  ${isConfirmed ? `تصدیق کنندہ: <strong style="color: #047857;">${escapeHtml(d.verified_by_name || 'مجاز عملہ')}</strong>` : '<strong style="color: #D97706;">صورتحال: تصدیق زیرِ التواء ہے</strong>'}
                </div>
                <div style="font-size: 0.74rem; color: #64748B; line-height: 1.4;">
                  ${isConfirmed ? escapeHtml(orgNameUr) + ' مالیاتی آڈٹ' : 'رسید تصدیق کے بعد مکمل نافذ العمل ہوگی'}
                </div>
              </div>

              <!-- Official Stamp Image & Signature Line -->
              <div class="receipt-seal-wrapper" style="text-align: center;">
                <div class="receipt-official-seal" style="min-height: 72px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                  ${activeStampUrl ? `
                    <img src="${activeStampUrl}" alt="Official Stamp" class="receipt-stamp-img" style="max-height: 72px; max-width: 130px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.12));" />
                  ` : `
                    <div style="border: 2px dashed #94A3B8; border-radius: 50%; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #64748B; font-weight: 700; text-align: center;">
                      دفتری مہر
                    </div>
                  `}
                </div>
                <div class="receipt-signature-line" style="border-top: 1px dashed #64748B; width: 170px; text-align: center; font-size: 0.76rem; color: #475569; padding-top: 5px; font-weight: 600;">
                  دستخط برائے مالیاتی شعبہ
                </div>
              </div>
            </div>

            <div style="text-align: center; font-size: 0.72rem; color: #94A3B8; margin-top: 12px; border-top: 1px solid #F1F5F9; padding-top: 8px;">
              ${escapeHtml(orgNameUr)} • شعبہ مالیات و حسابات • برائے رابطہ: +92 300 0817702
            </div>
          </div>
        </div>
      `;
    } else {
      // English Receipt Slip (LTR, English Labels, Registration # 10469, Watermark, Verifier Name & Official Stamp)
      receiptBody.innerHTML = `
        <div class="receipt-printable-box receipt-en" id="printableReceiptArea" dir="ltr" style="font-family: 'Inter', -apple-system, sans-serif; text-align: left; line-height: 1.45;">
          <!-- Official Logo Light Watermark -->
          <div class="receipt-watermark" aria-hidden="true">
            <img src="${logoUrl}" alt="" class="receipt-watermark-img" onerror="this.src='/media/branding/logo.svg'" />
          </div>

          <div class="receipt-content-layer">
            <div class="receipt-header-banner" style="text-align: center; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; margin-bottom: 12px;">
              <img src="${logoUrl}" alt="Qasr-e-Shabbir" class="receipt-logo-header" onerror="this.src='/media/branding/logo.svg'" style="width: 58px; height: 54px; object-fit: contain; margin-bottom: 4px;" />
              <div class="receipt-org-name" style="font-size: 1.35rem; font-weight: 800; color: #7F1D1D; letter-spacing: 0.5px;">
                ${escapeHtml(orgNameEn)}
              </div>
              <div class="receipt-reg-badge" style="display: inline-block; background: #FEF2F2; color: #991B1B; border: 1px solid #FECDD3; padding: 2px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; margin-top: 3px;">
                Registered Charity No: 10469
              </div>
              <div class="receipt-doc-title" style="font-size: 0.95rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">
                Official Donation Receipt
              </div>
              <div style="margin-top: 5px;">
                <span class="status-pill ${isConfirmed ? 'status-confirmed' : 'status-pending'}" style="display: inline-flex; align-items: center; padding: 3px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 700;">
                  ${isConfirmed ? '✓ Confirmed Contribution' : '⏳ Pending Verification'}
                </span>
              </div>
            </div>

            <div class="receipt-fields-list" style="margin-top: 10px; border-top: 1px solid #E2E8F0;">
              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 600; color: #64748B; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;">Receipt / Ref ID</span>
                <span class="receipt-val" style="font-family: monospace; font-size: 0.92rem; font-weight: 700; color: #0F172A; text-align: right; word-break: break-word;">${escapeHtml(d.transaction_reference || `#TXN-${d.id}`)}</span>
              </div>

              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 600; color: #64748B; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;">Contribution Date</span>
                <span class="receipt-val" style="font-size: 0.9rem; font-weight: 700; color: #0F172A; text-align: right;">${dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 600; color: #64748B; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;">Donor Name</span>
                <span class="receipt-val" style="font-size: 0.92rem; font-weight: 700; color: #0F172A; text-align: right; word-break: break-word;">${escapeHtml(d.donor_name || 'Anonymous Community Donor')}</span>
              </div>

              ${d.donor_phone ? `
                <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
                  <span class="receipt-label" style="font-weight: 600; color: #64748B; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;">Donor Contact</span>
                  <span class="receipt-val" style="font-size: 0.9rem; font-weight: 700; color: #0F172A; text-align: right;">${escapeHtml(d.donor_phone)}</span>
                </div>
              ` : ''}

              ${d.donor_email ? `
                <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
                  <span class="receipt-label" style="font-weight: 600; color: #64748B; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;">Donor Email</span>
                  <span class="receipt-val" style="font-size: 0.9rem; font-weight: 700; color: #0F172A; text-align: right; word-break: break-word;">${escapeHtml(d.donor_email)}</span>
                </div>
              ` : ''}

              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 600; color: #64748B; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;">Allocated Welfare Project</span>
                <span class="receipt-val" style="font-size: 0.9rem; font-weight: 700; color: #7F1D1D; text-align: right; word-break: break-word;">${escapeHtml(d.project_title || d.project_title_en || 'General / Unrestricted Fund')}</span>
              </div>

              <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
                <span class="receipt-label" style="font-weight: 600; color: #64748B; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;">Payment Channel</span>
                <span class="receipt-val" style="font-size: 0.9rem; font-weight: 700; color: #0F172A; text-align: right;">${escapeHtml(d.payment_method || 'Direct Transfer')}</span>
              </div>

              ${d.notes ? `
                <div class="receipt-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">
                  <span class="receipt-label" style="font-weight: 600; color: #64748B; font-size: 0.9rem; white-space: nowrap; flex-shrink: 0;">Designated Purpose / Notes</span>
                  <span class="receipt-val" style="font-size: 0.88rem; font-weight: 600; color: #334155; text-align: right; word-break: break-word;">${escapeHtml(d.notes)}</span>
                </div>
              ` : ''}
            </div>

            <div class="receipt-amount-box" style="background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 8px; padding: 12px 18px; margin: 14px 0; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; color: #064E3B; font-size: 1.05rem;">Total Amount Received</span>
              <span class="receipt-amount-num" style="font-size: 1.35rem; font-weight: 800; color: #047857; font-family: monospace;">PKR ${formattedAmount}</span>
            </div>

            <div class="receipt-stamp-area" style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
              <div class="receipt-verifier-box" style="text-align: left; max-width: 280px;">
                <div style="font-size: 0.88rem; font-weight: 700; color: #1E293B; margin-bottom: 3px;">
                  ${isConfirmed ? `Verified by: <strong style="color: #047857;">${escapeHtml(d.verified_by_name || 'Authorized Staff')}</strong>` : '<strong style="color: #D97706;">Status: Verification Pending</strong>'}
                </div>
                <div style="font-size: 0.74rem; color: #64748B; line-height: 1.4;">
                  ${isConfirmed ? 'Certified by ' + escapeHtml(orgNameEn) + ' Finance Dept' : 'Pending verification by accounts team'}
                </div>
              </div>

              <div class="receipt-seal-wrapper" style="text-align: center;">
                <div class="receipt-official-seal" style="min-height: 72px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                  ${activeStampUrl ? `
                    <img src="${activeStampUrl}" alt="Official Stamp" class="receipt-stamp-img" style="max-height: 72px; max-width: 130px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.12));" />
                  ` : `
                    <div style="border: 2px dashed #94A3B8; border-radius: 50%; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #64748B; font-weight: 700; text-align: center;">
                      OFFICIAL SEAL
                    </div>
                  `}
                </div>
                <div class="receipt-signature-line" style="border-top: 1px dashed #64748B; width: 170px; text-align: center; font-size: 0.76rem; color: #475569; padding-top: 5px; font-weight: 600;">
                  Authorized Signature / Finance
                </div>
              </div>
            </div>

            <div style="text-align: center; font-size: 0.72rem; color: #94A3B8; margin-top: 12px; border-top: 1px solid #F1F5F9; padding-top: 8px;">
              ${escapeHtml(orgNameEn)} • Finance & Accounts Department • Helpline: +92 300 0817702
            </div>
          </div>
        </div>
      `;
    }
  }

  window.viewDonationReceipt = async function(id) {
    try {
      const res = await fetch(`/api/admin/donations/${id}`);
      const data = await res.json();
      if (!data.success || !data.donation) return alert('Failed to retrieve donation details.');

      activeReceiptDonation = data.donation;
      renderReceiptSlip(activeReceiptDonation, activeReceiptLang);
      openModal('modalAccountReceipt');
    } catch (err) {
      alert('Error loading receipt.');
    }
  };

  window.printReceiptContent = function() {
    const area = document.getElementById('printableReceiptArea');
    if (!area) return;

    const isUr = (activeReceiptLang === 'ur');
    const printWin = window.open('', '', 'width=780,height=880');
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="${isUr ? 'ur' : 'en'}" dir="${isUr ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <title>Donation Receipt - Qasr-e-Shabbir Foundation</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 12mm;
            }
            *, *::before, *::after {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              background: #FFFFFF;
              color: #0F172A;
              font-family: ${isUr ? "'Noto Nastaliq Urdu', Tahoma, sans-serif" : "'Inter', -apple-system, sans-serif"};
              line-height: ${isUr ? "1.75" : "1.45"};
              -webkit-font-smoothing: antialiased;
            }
            body {
              padding: 10px 0;
            }
            .receipt-printable-box {
              position: relative;
              background: #FFFFFF;
              border: 1.5px solid #1E293B;
              border-radius: 8px;
              padding: 18px 24px;
              overflow: hidden;
              max-width: 660px;
              margin: 0 auto;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .receipt-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 280px;
              height: 280px;
              pointer-events: none;
              z-index: 1;
              opacity: 0.085;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .receipt-watermark-img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              filter: grayscale(100%);
            }
            .receipt-content-layer {
              position: relative;
              z-index: 2;
            }
            .receipt-header-banner {
              text-align: center;
              border-bottom: 2px solid #E2E8F0;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .receipt-logo-header {
              width: 56px;
              height: 52px;
              object-fit: contain;
              margin-bottom: 4px;
            }
            .receipt-org-name {
              font-size: 1.35rem;
              font-weight: 800;
              color: #7F1D1D;
              letter-spacing: 0.5px;
            }
            .receipt-reg-badge {
              display: inline-block;
              background: #FEF2F2;
              color: #991B1B;
              border: 1px solid #FECDD3;
              padding: 2px 12px;
              border-radius: 999px;
              font-size: 0.78rem;
              font-weight: 700;
              margin-top: 3px;
            }
            .receipt-doc-title {
              font-size: 0.95rem;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 4px;
            }
            .status-pill {
              display: inline-flex;
              align-items: center;
              padding: 3px 12px;
              border-radius: 999px;
              font-size: 0.8rem;
              font-weight: 700;
            }
            .status-confirmed { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
            .status-pending { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
            .receipt-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 5px 0;
              border-bottom: 1px solid #F1F5F9;
              font-size: 0.9rem;
              min-height: 26px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .receipt-label {
              color: #64748B;
              font-weight: 600;
              white-space: nowrap;
              flex-shrink: 0;
            }
            .receipt-val {
              color: #0F172A;
              font-weight: 700;
              word-break: break-word;
            }
            .receipt-amount-box {
              background: #F0FDF4;
              border: 1.5px solid #86EFAC;
              border-radius: 8px;
              padding: 10px 16px;
              margin: 12px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .receipt-amount-num {
              font-size: 1.35rem;
              font-weight: 800;
              color: #047857;
            }
            .receipt-stamp-area {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 14px;
              padding-top: 12px;
              border-top: 1px solid #E2E8F0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .receipt-stamp-img {
              max-height: 72px;
              max-width: 130px;
              object-fit: contain;
            }
            .receipt-signature-line {
              border-top: 1px dashed #64748B;
              width: 170px;
              text-align: center;
              font-size: 0.76rem;
              color: #64748B;
              padding-top: 4px;
              font-weight: 600;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
              }
              .receipt-printable-box {
                max-width: 660px !important;
                margin: 0 auto !important;
                padding: 16px 20px !important;
                box-shadow: none !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .receipt-header-banner, .receipt-fields-list, .receipt-amount-box, .receipt-stamp-area {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          ${area.outerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          <\/script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // ==================== UNIVERSAL TABLE PRINT & PDF EXPORT ====================
  window.exportTablePDF = function(tableType) {
    let table = null;
    const titles = {
      users: { title: 'Users, Staff & Payroll Management Directory', subtitle: 'Authorized system users, modular permissions & salary configuration' },
      accounts: { title: 'Official Accounts & Contributions Audit Ledger', subtitle: 'Project-wise donation tracking, transaction history & financial audits' },
      projects: { title: 'Welfare & Humanitarian Projects Register', subtitle: 'Active community welfare initiatives, target budgets & funds raised' },
      volunteers: { title: 'Volunteers & Internship Applications Directory', subtitle: 'Registered community volunteers, interns, skills & approval statuses' },
      articles: { title: 'News, Field Reports & Announcements Register', subtitle: 'Published and draft press releases, relief field reports & updates' },
      applications: { title: 'Confidential Assistance Requests Register', subtitle: 'Orphan education, food ration and emergency medical aid applications' },
      donations: { title: 'Donations & Receipts Verification Ledger', subtitle: 'Community financial contributions, verification logs and audit tracking' },
      submissions: { title: 'Public Inquiries & Contact Messages Register', subtitle: 'Messages received via the public portal contact form' },
      'org-departments': { title: 'Official Departments & Wings Directory', subtitle: 'Foundation operational units, mandates & assigned staff directory' },
      'org-roles': { title: 'User Roles & Access Levels Register', subtitle: 'System permissions, administrative classification & user assignments' },
      'org-designations': { title: 'Official Designations & Job Titles Register', subtitle: 'Staff & volunteer designations, department links & operational ranks' },
      'org-categories': { title: 'Project & News Categories Directory', subtitle: 'Welfare initiative categories, public web slugs & linked projects' }
    };

    const meta = titles[tableType] || { title: 'Administrative Record Table', subtitle: 'Qasr-e-Shabbir Foundation Management Console' };
    const reportTitle = meta.title;
    const reportSubtitle = meta.subtitle;

    const pane = document.getElementById(`tab-${tableType}`);
    if (pane) {
      table = pane.querySelector('.admin-table');
    }

    if (!table) {
      alert('No active table data found to export.');
      return;
    }

    const clone = table.cloneNode(true);

    // Remove the last column (Actions) from header and all rows
    const headerRow = clone.querySelector('thead tr');
    if (headerRow) {
      const ths = headerRow.querySelectorAll('th');
      const lastTh = ths[ths.length - 1];
      if (lastTh && lastTh.textContent.trim().toLowerCase().includes('action')) {
        lastTh.remove();
        clone.querySelectorAll('tbody tr').forEach(row => {
          const tds = row.querySelectorAll('td');
          if (tds.length === ths.length) {
            tds[tds.length - 1].remove();
          }
        });
      }
    }

    // Convert select controls to text
    clone.querySelectorAll('select').forEach(sel => {
      const text = sel.options[sel.selectedIndex]?.text || sel.value;
      const span = document.createElement('span');
      span.textContent = text;
      span.style.fontWeight = '600';
      sel.parentNode.replaceChild(span, sel);
    });

    // Remove action buttons
    clone.querySelectorAll('button, .action-btn-group, .btn-group').forEach(el => el.remove());

    const rowsCount = clone.querySelectorAll('tbody tr').length;
    const printDate = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
    const printedBy = (currentUser && (currentUser.full_name || currentUser.username)) || 'Authorized Administrator';

    const printWin = window.open('', '', 'width=980,height=850');
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${reportTitle} - Qasr-e-Shabbir Foundation</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 12mm 10mm 14mm 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #0F172A;
            background: #FFFFFF;
            padding: 16px;
            font-size: 11px;
            line-height: 1.4;
          }
          .report-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #7F1D1D;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .report-branding {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .report-logo {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            object-fit: contain;
          }
          .report-org-title {
            font-size: 18px;
            font-weight: 800;
            color: #7F1D1D;
            letter-spacing: 0.5px;
          }
          .report-org-sub {
            font-size: 10px;
            color: #475569;
            font-weight: 600;
          }
          .report-meta-box {
            text-align: right;
            font-size: 10px;
            color: #64748B;
            line-height: 1.5;
          }
          .report-meta-box strong {
            color: #1E293B;
          }
          .report-title-bar {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-left: 4px solid #7F1D1D;
            padding: 8px 12px;
            margin-bottom: 14px;
            border-radius: 4px;
          }
          .report-title {
            font-size: 14px;
            font-weight: 700;
            color: #0F172A;
          }
          .report-desc {
            font-size: 10px;
            color: #64748B;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 10px;
          }
          th {
            background: #F1F5F9;
            color: #1E293B;
            font-weight: 700;
            text-align: left;
            padding: 8px 6px;
            border: 1px solid #CBD5E1;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          td {
            padding: 7px 6px;
            border: 1px solid #E2E8F0;
            vertical-align: top;
            color: #334155;
          }
          tr:nth-child(even) td {
            background: #F8FAFC;
          }
          .status-pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .status-confirmed, .status-accepted, .status-approved {
            background: #DCFCE7;
            color: #166534;
          }
          .status-pending {
            background: #FEF3C7;
            color: #92400E;
          }
          .status-under_review {
            background: #DBEAFE;
            color: #1E40AF;
          }
          .status-rejected {
            background: #FEE2E2;
            color: #991B1B;
          }
          .report-footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #CBD5E1;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94A3B8;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-branding">
            <img src="${(currentBrandingAssets && currentBrandingAssets.site_logo_url) ? currentBrandingAssets.site_logo_url : '/media/branding/logo.svg'}" alt="Logo" class="report-logo" onerror="this.src='/media/branding/logo.svg'" />
            <div>
              <div class="report-org-title">${(currentBrandingAssets && currentBrandingAssets.foundation_name_en) ? escapeHtml(currentBrandingAssets.foundation_name_en.toUpperCase()) : 'QASR-E-SHABBIR FOUNDATION'}</div>
              <div class="report-org-sub">Registered Charity Reg # 10469 • Administrative Management Console</div>
            </div>
          </div>
          <div class="report-meta-box">
            <div>Generated Date: <strong>${printDate}</strong></div>
            <div>Printed By: <strong>${printedBy}</strong></div>
            <div>Total Records: <strong>${rowsCount}</strong></div>
          </div>
        </div>

        <div class="report-title-bar">
          <div class="report-title">${reportTitle}</div>
          <div class="report-desc">${reportSubtitle}</div>
        </div>

        ${clone.outerHTML}

        <div class="report-footer">
          <div>${(currentBrandingAssets && currentBrandingAssets.foundation_name_en) ? escapeHtml(currentBrandingAssets.foundation_name_en) : 'Qasr-e-Shabbir Foundation'} • Confidential Official Record</div>
          <div>Compliant with Internal Audit & Welfare Accountability Standards</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 800);
          };
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // ==================== SINGLE ASSISTANCE REQUEST PRINTING ====================
  window.printSingleAssistanceRequest = async function(id) {
    try {
      const res = await fetch(`/api/admin/assistance-applications/${id}`);
      const data = await res.json();
      if (!data.success || !data.application) return alert('Unable to retrieve application details.');
      const a = data.application;

      const printWin = window.open('', '', 'width=850,height=900');
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Assistance Request #${a.tracking_number} - Qasr-e-Shabbir Foundation</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 15mm 12mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; color: #0F172A; background: #FFF; padding: 20px; font-size: 12px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7F1D1D; padding-bottom: 14px; margin-bottom: 18px; }
            .brand { display: flex; align-items: center; gap: 14px; }
            .logo { width: 64px; height: 64px; border-radius: 50%; object-fit: contain; }
            .title { font-size: 18px; font-weight: 800; color: #7F1D1D; }
            .sub { font-size: 11px; color: #475569; }
            .badge { background: #F8FAFC; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; text-align: right; }
            .badge strong { font-family: monospace; font-size: 14px; color: #7F1D1D; }
            .dossier-title { text-align: center; font-size: 15px; font-weight: 700; color: #1E293B; background: #F1F5F9; padding: 8px; border-radius: 6px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
            .item { border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; background: #FAFAFA; }
            .label { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px; }
            .val { font-size: 12px; font-weight: 600; color: #0F172A; }
            .box { border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; background: #FAFAFA; margin-bottom: 16px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 16px; }
            .sig-line { width: 200px; border-top: 1px dashed #64748B; text-align: center; font-size: 11px; color: #475569; padding-top: 6px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <img src="${(currentBrandingAssets && currentBrandingAssets.site_logo_url) ? currentBrandingAssets.site_logo_url : '/media/branding/logo.svg'}" alt="Logo" class="logo" onerror="this.src='/media/branding/logo.svg'" />
              <div>
                <div class="title">${(currentBrandingAssets && currentBrandingAssets.foundation_name_en) ? escapeHtml(currentBrandingAssets.foundation_name_en.toUpperCase()) : 'QASR-E-SHABBIR FOUNDATION'}</div>
                <div class="sub">Confidential Welfare & Assistance Program • Registration # 10469</div>
              </div>
            </div>
            <div class="badge">
              <div style="font-size: 9px; color: #64748B;">Tracking Number</div>
              <strong>${a.tracking_number}</strong>
            </div>
          </div>

          <div class="dossier-title">Confidential Beneficiary Assistance Application Dossier</div>

          <div class="grid">
            <div class="item">
              <div class="label">Applicant Name (Student / Ward)</div>
              <div class="val">${escapeHtml(a.applicant_name)}</div>
            </div>
            <div class="item">
              <div class="label">Mother / Guardian Name</div>
              <div class="val">${escapeHtml(a.guardian_name || 'N/A')}</div>
            </div>
            <div class="item">
              <div class="label">Contact Phone / WhatsApp</div>
              <div class="val">${escapeHtml(a.phone)}</div>
            </div>
            <div class="item">
              <div class="label">City & Location</div>
              <div class="val">${escapeHtml(a.city || 'N/A')}</div>
            </div>
            <div class="item">
              <div class="label">CNIC / B-Form Number</div>
              <div class="val" style="font-family: monospace;">${escapeHtml(a.cnic_or_bform || 'N/A')}</div>
            </div>
            <div class="item">
              <div class="label">Assistance Category</div>
              <div class="val" style="color: #7F1D1D; text-transform: uppercase;">${(a.assistance_type || '').replace('_', ' ')}</div>
            </div>
            <div class="item">
              <div class="label">Family Members Count</div>
              <div class="val">${a.family_members_count || 1} Persons</div>
            </div>
            <div class="item">
              <div class="label">Monthly Household Income</div>
              <div class="val">PKR ${Number(a.monthly_income || 0).toLocaleString()}</div>
            </div>
          </div>

          <div class="box">
            <div class="label">Residential Address</div>
            <div class="val">${escapeHtml(a.address || 'N/A')}</div>
          </div>

          <div class="box">
            <div class="label">Application Circumstances & Request Details</div>
            <div class="val" style="font-weight: 400; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(a.details || 'No additional circumstances details provided.')}</div>
          </div>

          <div class="box" style="background: #EFF6FF; border-color: #BFDBFE;">
            <div class="label" style="color: #1E40AF;">Verification & Internal Review Audit</div>
            <div style="display: flex; justify-content: space-between; margin-top: 6px;">
              <div>Status: <strong style="text-transform: uppercase;">${a.status}</strong></div>
              <div>Reviewed By: <strong>${escapeHtml(a.reviewer_name || 'Authorized Welfare Officer')}</strong></div>
              <div>Submitted Date: <strong>${new Date(a.created_at).toLocaleDateString()}</strong></div>
            </div>
            ${a.notes ? `<div style="margin-top: 8px; font-size: 11px; color: #1E3A8A;">Reviewer Remarks: <em>${escapeHtml(a.notes)}</em></div>` : ''}
          </div>

          <div class="signatures">
            <div class="sig-line">Beneficiary / Guardian Signature</div>
            <div class="sig-line">Field Welfare Inspector</div>
            <div class="sig-line">Authorized Foundation Trustee</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          <\/script>
        </body>
        </html>
      `);
      printWin.document.close();
    } catch (err) {
      alert('Error generating print preview.');
    }
  };

  window.printCurrentApplicationDossier = function() {
    const editId = document.getElementById('applicationEditId').value;
    if (editId) {
      printSingleAssistanceRequest(editId);
    } else {
      alert('Please save the application before printing.');
    }
  };

  // ==================== SINGLE VOLUNTEER DOSSIER PRINTING ====================
  window.printSingleVolunteer = async function(id) {
    try {
      const res = await fetch(`/api/admin/volunteers`);
      const data = await res.json();
      if (!data.success || !data.applications) return alert('Failed to retrieve volunteer records.');
      const v = data.applications.find(item => item.id == id);
      if (!v) return alert('Volunteer record not found.');

      const printWin = window.open('', '', 'width=850,height=900');
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Volunteer Candidate Dossier - ${escapeHtml(v.full_name)}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 15mm 12mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; color: #0F172A; background: #FFF; padding: 20px; font-size: 12px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7F1D1D; padding-bottom: 14px; margin-bottom: 18px; }
            .brand { display: flex; align-items: center; gap: 14px; }
            .logo { width: 64px; height: 64px; border-radius: 50%; object-fit: contain; }
            .title { font-size: 18px; font-weight: 800; color: #7F1D1D; }
            .sub { font-size: 11px; color: #475569; }
            .badge { background: #F8FAFC; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 6px; text-align: right; }
            .badge strong { font-family: monospace; font-size: 14px; color: #7F1D1D; }
            .dossier-title { text-align: center; font-size: 15px; font-weight: 700; color: #1E293B; background: #F1F5F9; padding: 8px; border-radius: 6px; margin-bottom: 20px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
            .item { border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; background: #FAFAFA; }
            .label { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 2px; }
            .val { font-size: 12px; font-weight: 600; color: #0F172A; }
            .box { border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; background: #FAFAFA; margin-bottom: 16px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 16px; }
            .sig-line { width: 200px; border-top: 1px dashed #64748B; text-align: center; font-size: 11px; color: #475569; padding-top: 6px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <img src="${(currentBrandingAssets && currentBrandingAssets.site_logo_url) ? currentBrandingAssets.site_logo_url : '/media/branding/logo.svg'}" alt="Logo" class="logo" onerror="this.src='/media/branding/logo.svg'" />
              <div>
                <div class="title">${(currentBrandingAssets && currentBrandingAssets.foundation_name_en) ? escapeHtml(currentBrandingAssets.foundation_name_en.toUpperCase()) : 'QASR-E-SHABBIR FOUNDATION'}</div>
                <div class="sub">Humanitarian Volunteer & Youth Internship Program • Registration # 10469</div>
              </div>
            </div>
            <div class="badge">
              <div style="font-size: 9px; color: #64748B;">Candidate Reference ID</div>
              <strong>${escapeHtml(v.reference_no || '#' + v.id)}</strong>
            </div>
          </div>

          <div class="dossier-title">Official Volunteer Candidate Registration Profile</div>

          <div class="grid">
            <div class="item">
              <div class="label">Full Name</div>
              <div class="val">${escapeHtml(v.full_name)}</div>
            </div>
            <div class="item">
              <div class="label">Program Type</div>
              <div class="val" style="color: #7F1D1D; text-transform: uppercase;">${escapeHtml(v.application_type || 'volunteer')}</div>
            </div>
            <div class="item">
              <div class="label">Email Address</div>
              <div class="val">${escapeHtml(v.email)}</div>
            </div>
            <div class="item">
              <div class="label">Phone / WhatsApp</div>
              <div class="val">${escapeHtml(v.phone)}</div>
            </div>
            <div class="item">
              <div class="label">City of Residence</div>
              <div class="val">${escapeHtml(v.city || 'N/A')}</div>
            </div>
            <div class="item">
              <div class="label">Availability</div>
              <div class="val">${escapeHtml(v.availability || 'Flexible')}</div>
            </div>
            <div class="item" style="grid-column: span 2;">
              <div class="label">Areas of Interest / Field Work</div>
              <div class="val">${escapeHtml(v.areas_of_interest || 'General Humanitarian Relief')}</div>
            </div>
            ${v.relevant_skills ? `
              <div class="item" style="grid-column: span 2;">
                <div class="label">Relevant Skills & Qualifications</div>
                <div class="val">${escapeHtml(v.relevant_skills)}</div>
              </div>
            ` : ''}
          </div>

          <div class="box">
            <div class="label">Motivation Statement / Why Join</div>
            <div class="val" style="font-weight: 400; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(v.motivation_message || 'No statement provided.')}</div>
          </div>

          <div class="box" style="background: #F8FAFC;">
            <div class="label">Internal Evaluation Status</div>
            <div style="display: flex; justify-content: space-between; margin-top: 6px;">
              <div>Status: <strong style="text-transform: uppercase;">${v.status || 'pending'}</strong></div>
              <div>Registered On: <strong>${new Date(v.created_at).toLocaleDateString()}</strong></div>
            </div>
            ${v.admin_notes ? `<div style="margin-top: 8px; font-size: 11px; color: #475569;">Admin Notes: <em>${escapeHtml(v.admin_notes)}</em></div>` : ''}
          </div>

          <div class="signatures">
            <div class="sig-line">Candidate Signature</div>
            <div class="sig-line">Volunteer Coordinator</div>
            <div class="sig-line">Head of Operations</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          <\/script>
        </body>
        </html>
      `);
      printWin.document.close();
    } catch (err) {
      alert('Error generating print preview.');
    }
  };

  window.printCurrentVolunteerProfile = function() {
    const volId = document.getElementById('volDetailId').value;
    if (volId) {
      printSingleVolunteer(volId);
    } else {
      alert('No volunteer selected.');
    }
  };

  // ==================== MANUAL VOLUNTEER REGISTRATION ====================
  const manVolPhotoInput = document.getElementById('man_vol_photo');
  const manVolPhotoPreviewImg = document.getElementById('manVolPhotoPreviewImg');
  const manVolPhotoPlaceholderIcon = document.getElementById('manVolPhotoPlaceholderIcon');
  const manVolPhotoFileName = document.getElementById('manVolPhotoFileName');
  const btnRemoveManVolPhoto = document.getElementById('btnRemoveManVolPhoto');
  const manVolPhotoError = document.getElementById('manVolPhotoError');

  if (manVolPhotoInput) {
    manVolPhotoInput.addEventListener('change', (e) => {
      if (manVolPhotoError) manVolPhotoError.style.display = 'none';
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        if (manVolPhotoError) {
          manVolPhotoError.textContent = 'Invalid image type. Please select a JPG, PNG, or WebP photo.';
          manVolPhotoError.style.display = 'block';
        }
        manVolPhotoInput.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        if (manVolPhotoError) {
          manVolPhotoError.textContent = 'Photo exceeds 10MB limit.';
          manVolPhotoError.style.display = 'block';
        }
        manVolPhotoInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (manVolPhotoPreviewImg) {
          manVolPhotoPreviewImg.src = loadEvt.target.result;
          manVolPhotoPreviewImg.style.display = 'block';
        }
        if (manVolPhotoPlaceholderIcon) manVolPhotoPlaceholderIcon.style.display = 'none';
        if (manVolPhotoFileName) manVolPhotoFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        if (btnRemoveManVolPhoto) btnRemoveManVolPhoto.style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveManVolPhoto) {
    btnRemoveManVolPhoto.addEventListener('click', () => {
      if (manVolPhotoInput) manVolPhotoInput.value = '';
      if (manVolPhotoPreviewImg) { manVolPhotoPreviewImg.src = ''; manVolPhotoPreviewImg.style.display = 'none'; }
      if (manVolPhotoPlaceholderIcon) manVolPhotoPlaceholderIcon.style.display = 'block';
      if (manVolPhotoFileName) manVolPhotoFileName.textContent = 'No photo selected';
      btnRemoveManVolPhoto.style.display = 'none';
      if (manVolPhotoError) manVolPhotoError.style.display = 'none';
    });
  }

  window.openAddVolunteerModal = function() {
    const form = document.getElementById('formAddVolunteer');
    if (form) form.reset();
    if (manVolPhotoInput) manVolPhotoInput.value = '';
    if (manVolPhotoPreviewImg) { manVolPhotoPreviewImg.src = ''; manVolPhotoPreviewImg.style.display = 'none'; }
    if (manVolPhotoPlaceholderIcon) manVolPhotoPlaceholderIcon.style.display = 'block';
    if (manVolPhotoFileName) manVolPhotoFileName.textContent = 'No photo selected';
    if (btnRemoveManVolPhoto) btnRemoveManVolPhoto.style.display = 'none';
    if (manVolPhotoError) manVolPhotoError.style.display = 'none';
    
    const desEn = document.getElementById('man_vol_designation'); if (desEn) desEn.value = '';
    const desUr = document.getElementById('man_vol_designation_ur'); if (desUr) desUr.value = '';
    const rSel = document.getElementById('man_vol_role_id'); if (rSel) rSel.value = '';
    const dSel = document.getElementById('man_vol_department_id'); if (dSel) dSel.value = '';
    const dgSel = document.getElementById('man_vol_designation_id'); if (dgSel) dgSel.value = '';
    loadOfficialSignatures();
    const sigSel = document.getElementById('man_vol_signature_id'); if (sigSel) sigSel.value = '';

    openModal('modalAddVolunteer');
  };

  window.handleManualVolunteerSubmit = async function(e) {
    if (e) e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const photoInput = document.getElementById('man_vol_photo');
    if (!photoInput || !photoInput.files || !photoInput.files[0]) {
      if (manVolPhotoError) {
        manVolPhotoError.textContent = 'Profile photo is mandatory when adding a volunteer.';
        manVolPhotoError.style.display = 'block';
      }
      alert('Profile photo is mandatory when adding a volunteer. Please upload a clear photo.');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const formData = new FormData();
    formData.append('full_name', document.getElementById('man_vol_name').value.trim());
    formData.append('email', document.getElementById('man_vol_email').value.trim());
    formData.append('phone', document.getElementById('man_vol_phone').value.trim());
    formData.append('city', document.getElementById('man_vol_city').value.trim());
    formData.append('application_type', document.getElementById('man_vol_type').value);
    formData.append('relevant_skills', document.getElementById('man_vol_education').value.trim());
    formData.append('areas_of_interest', document.getElementById('man_vol_interests').value.trim());
    formData.append('availability', document.getElementById('man_vol_availability').value);
    formData.append('status', document.getElementById('man_vol_status').value);
    formData.append('admin_notes', document.getElementById('man_vol_notes').value.trim());
    formData.append('department_id', document.getElementById('man_vol_department_id')?.value || '');
    formData.append('role_id', document.getElementById('man_vol_role_id')?.value || '');
    formData.append('designation_id', document.getElementById('man_vol_designation_id')?.value || '');
    formData.append('designation', (document.getElementById('man_vol_designation')?.value || '').trim());
    formData.append('designation_ur', (document.getElementById('man_vol_designation_ur')?.value || '').trim());
    formData.append('signature_id', document.getElementById('man_vol_signature_id')?.value || '');
    formData.append('photo', photoInput.files[0]);

    try {
      const res = await fetch('/api/admin/volunteers', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        alert('Volunteer record successfully registered with official photo & credentials!');
        closeModal('modalAddVolunteer');
        loadVolunteers();
      } else {
        alert(data.message || 'Failed to create volunteer record.');
      }
    } catch (err) {
      alert('Error connecting to server.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };

  // Wire Edit Volunteer Profile Photo
  const editVolPhotoInput = document.getElementById('edit_vol_photo');
  const editVolPhotoPreviewImg = document.getElementById('editVolPhotoPreviewImg');
  const editVolPhotoPlaceholderIcon = document.getElementById('editVolPhotoPlaceholderIcon');
  const editVolPhotoFileName = document.getElementById('editVolPhotoFileName');
  const btnRemoveEditVolPhoto = document.getElementById('btnRemoveEditVolPhoto');
  const editVolPhotoError = document.getElementById('editVolPhotoError');
  let editVolOriginalPhotoUrl = '';

  if (editVolPhotoInput) {
    editVolPhotoInput.addEventListener('change', () => {
      if (editVolPhotoError) editVolPhotoError.style.display = 'none';
      const file = editVolPhotoInput.files ? editVolPhotoInput.files[0] : null;
      if (!file) return;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        if (editVolPhotoError) {
          editVolPhotoError.textContent = 'Please choose a valid image file (JPG, PNG, or WebP).';
          editVolPhotoError.style.display = 'block';
        }
        editVolPhotoInput.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        if (editVolPhotoError) {
          editVolPhotoError.textContent = 'Photo exceeds 10MB limit.';
          editVolPhotoError.style.display = 'block';
        }
        editVolPhotoInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (editVolPhotoPreviewImg) {
          editVolPhotoPreviewImg.src = loadEvt.target.result;
          editVolPhotoPreviewImg.style.display = 'block';
        }
        if (editVolPhotoPlaceholderIcon) editVolPhotoPlaceholderIcon.style.display = 'none';
        if (editVolPhotoFileName) editVolPhotoFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        if (btnRemoveEditVolPhoto) btnRemoveEditVolPhoto.style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveEditVolPhoto) {
    btnRemoveEditVolPhoto.addEventListener('click', () => {
      if (editVolPhotoInput) editVolPhotoInput.value = '';
      if (editVolOriginalPhotoUrl) {
        if (editVolPhotoPreviewImg) {
          editVolPhotoPreviewImg.src = editVolOriginalPhotoUrl;
          editVolPhotoPreviewImg.style.display = 'block';
        }
        if (editVolPhotoPlaceholderIcon) editVolPhotoPlaceholderIcon.style.display = 'none';
        if (editVolPhotoFileName) editVolPhotoFileName.textContent = 'Existing photo preserved';
      } else {
        if (editVolPhotoPreviewImg) { editVolPhotoPreviewImg.src = ''; editVolPhotoPreviewImg.style.display = 'none'; }
        if (editVolPhotoPlaceholderIcon) editVolPhotoPlaceholderIcon.style.display = 'block';
        if (editVolPhotoFileName) editVolPhotoFileName.textContent = 'No photo uploaded yet';
      }
      btnRemoveEditVolPhoto.style.display = 'none';
      if (editVolPhotoError) editVolPhotoError.style.display = 'none';
    });
  }

  // Open Edit Volunteer Modal
  window.openEditVolunteerModal = async function(id) {
    try {
      const res = await fetch(`/api/admin/volunteers/${id}`);
      const data = await res.json();
      if (!data.success || !data.application) {
        alert('Failed to load volunteer application for editing.');
        return;
      }
      const v = data.application;
      document.getElementById('edit_vol_id').value = v.id;
      document.getElementById('edit_vol_name').value = v.full_name || '';
      document.getElementById('edit_vol_email').value = v.email || '';
      document.getElementById('edit_vol_phone').value = v.phone || '';
      document.getElementById('edit_vol_city').value = v.city || '';
      document.getElementById('edit_vol_type').value = v.application_type || 'volunteer';
      document.getElementById('edit_vol_education').value = v.relevant_skills || '';
      document.getElementById('edit_vol_interests').value = v.areas_of_interest || '';
      document.getElementById('edit_vol_availability').value = v.availability || 'Weekends Only';
      document.getElementById('edit_vol_status').value = v.status || 'accepted';
      document.getElementById('edit_vol_notes').value = v.admin_notes || '';
      document.getElementById('edit_vol_designation').value = v.designation || '';
      document.getElementById('edit_vol_designation_ur').value = v.designation_ur || '';
      const deptSel = document.getElementById('edit_vol_department_id');
      if (deptSel) deptSel.value = v.department_id || '';
      const roleSel = document.getElementById('edit_vol_role_id');
      if (roleSel) roleSel.value = v.role_id || '';
      const desigSel = document.getElementById('edit_vol_designation_id');
      if (desigSel) desigSel.value = v.designation_id || '';

      loadOfficialSignatures();
      setTimeout(() => {
        const sigSelect = document.getElementById('edit_vol_signature_id');
        if (sigSelect) sigSelect.value = v.signature_id || '';
      }, 50);

      // Photo handling
      editVolOriginalPhotoUrl = v.photo_url || '';
      if (editVolPhotoInput) editVolPhotoInput.value = '';
      if (editVolPhotoError) editVolPhotoError.style.display = 'none';
      if (btnRemoveEditVolPhoto) btnRemoveEditVolPhoto.style.display = 'none';

      if (v.photo_url) {
        if (editVolPhotoPreviewImg) {
          editVolPhotoPreviewImg.src = v.photo_url;
          editVolPhotoPreviewImg.style.display = 'block';
        }
        if (editVolPhotoPlaceholderIcon) editVolPhotoPlaceholderIcon.style.display = 'none';
        if (editVolPhotoFileName) editVolPhotoFileName.textContent = 'Existing photo preserved';
      } else {
        if (editVolPhotoPreviewImg) { editVolPhotoPreviewImg.src = ''; editVolPhotoPreviewImg.style.display = 'none'; }
        if (editVolPhotoPlaceholderIcon) editVolPhotoPlaceholderIcon.style.display = 'block';
        if (editVolPhotoFileName) editVolPhotoFileName.textContent = 'No photo uploaded yet';
      }

      openModal('modalEditVolunteer');
    } catch (err) {
      console.error(err);
      alert('Error fetching volunteer for editing.');
    }
  };

  // Save Volunteer Updates Form Submit (PUT /api/admin/volunteers/:id)
  window.handleEditVolunteerSubmit = async function(e) {
    if (e) e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const editId = document.getElementById('edit_vol_id').value;
    if (!editId) {
      alert('Volunteer ID missing.');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const formData = new FormData();
    formData.append('full_name', document.getElementById('edit_vol_name').value.trim());
    formData.append('email', document.getElementById('edit_vol_email').value.trim());
    formData.append('phone', document.getElementById('edit_vol_phone').value.trim());
    formData.append('city', document.getElementById('edit_vol_city').value.trim());
    formData.append('application_type', document.getElementById('edit_vol_type').value);
    formData.append('relevant_skills', document.getElementById('edit_vol_education').value.trim());
    formData.append('areas_of_interest', document.getElementById('edit_vol_interests').value.trim());
    formData.append('availability', document.getElementById('edit_vol_availability').value);
    formData.append('status', document.getElementById('edit_vol_status').value);
    formData.append('admin_notes', document.getElementById('edit_vol_notes').value.trim());
    formData.append('department_id', document.getElementById('edit_vol_department_id')?.value || '');
    formData.append('role_id', document.getElementById('edit_vol_role_id')?.value || '');
    formData.append('designation_id', document.getElementById('edit_vol_designation_id')?.value || '');
    formData.append('designation', document.getElementById('edit_vol_designation').value.trim());
    formData.append('designation_ur', document.getElementById('edit_vol_designation_ur').value.trim());
    formData.append('signature_id', document.getElementById('edit_vol_signature_id').value);

    const photoInput = document.getElementById('edit_vol_photo');
    if (photoInput && photoInput.files && photoInput.files[0]) {
      formData.append('photo', photoInput.files[0]);
    }

    try {
      const res = await fetch(`/api/admin/volunteers/${editId}`, {
        method: 'PUT',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        alert('Volunteer details, designation & signature updated successfully!');
        closeModal('modalEditVolunteer');
        loadVolunteers();
      } else {
        alert(data.message || 'Failed to update volunteer record.');
      }
    } catch (err) {
      alert('Error connecting to server while saving updates.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };

  // ==================== ORGANIZATION SETUP MODULE (DEPARTMENTS, ROLES, DESIGNATIONS, CATEGORIES) ====================
  let allDepartmentsData = [];
  let allRolesData = [];
  let allDesignationsData = [];
  let allCategoriesData = [];

  // Populate dynamic dropdowns across modals (Users, Volunteers, Projects, News)
  async function populateOrgDropdowns() {
    try {
      const [deptRes, roleRes, desigRes, catRes] = await Promise.all([
        fetch('/api/admin/departments').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/roles').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/designations').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/categories').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (deptRes.success && Array.isArray(deptRes.departments)) {
        allDepartmentsData = deptRes.departments;
        populateDepartmentSelects(allDepartmentsData);
      }
      if (roleRes.success && Array.isArray(roleRes.roles)) {
        allRolesData = roleRes.roles;
        populateRoleSelects(allRolesData);
      }
      if (desigRes.success && Array.isArray(desigRes.designations)) {
        allDesignationsData = desigRes.designations;
        populateDesignationSelects(allDesignationsData);
      }
      if (catRes.success && Array.isArray(catRes.categories)) {
        allCategoriesData = catRes.categories;
        populateCategorySelects(allCategoriesData);
      }
    } catch (err) {
      console.error('[populateOrgDropdowns Error]', err);
    }
  }

  function populateDepartmentSelects(departments) {
    const activeDepts = departments.filter(d => d.is_active == 1);
    const optionsHtml = '<option value="">Select Department / Wing</option>' +
      activeDepts.map(d => `<option value="${d.id}">${escapeHtml(d.name_en)} (${escapeHtml(d.code)})</option>`).join('');

    ['user_department_id', 'man_vol_department_id', 'edit_vol_department_id', 'desig_department_id'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const val = el.value;
        el.innerHTML = (id === 'desig_department_id') 
          ? '<option value="">General / Foundation-Wide</option>' + activeDepts.map(d => `<option value="${d.id}">${escapeHtml(d.name_en)} (${escapeHtml(d.code)})</option>`).join('')
          : optionsHtml;
        if (val) el.value = val;
      }
    });

    const filterEl = document.getElementById('desigFilterDepartment');
    if (filterEl) {
      const val = filterEl.value;
      filterEl.innerHTML = '<option value="">All Departments</option>' +
        departments.map(d => `<option value="${d.id}">${escapeHtml(d.name_en)} (${escapeHtml(d.code)})</option>`).join('');
      if (val) filterEl.value = val;
    }
  }

  function populateRoleSelects(roles) {
    const activeRoles = roles.filter(r => r.is_active == 1);
    const optionsHtml = '<option value="">Select Role / Access Level</option>' +
      activeRoles.map(r => `<option value="${r.id}" data-key="${escapeHtml(r.role_key)}">${escapeHtml(r.name_en)} (${escapeHtml(r.role_key)})</option>`).join('');

    ['user_role_id', 'man_vol_role_id', 'edit_vol_role_id'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const val = el.value;
        el.innerHTML = optionsHtml;
        if (val) el.value = val;
      }
    });
  }

  function populateDesignationSelects(designations, targetId = null, filterDeptId = null) {
    let list = designations.filter(d => d.is_active == 1);
    if (filterDeptId) {
      list = list.filter(d => !d.department_id || String(d.department_id) === String(filterDeptId));
    }
    const optionsHtml = '<option value="">Select Official Designation</option>' +
      list.map(d => {
        const titleEn = d.title_en || d.name_en || '';
        const titleUr = d.title_ur || d.name_ur || '';
        return `<option value="${d.id}" data-en="${escapeHtml(titleEn)}" data-ur="${escapeHtml(titleUr)}" data-dept="${d.department_id || ''}">${escapeHtml(titleEn)}${d.department_name_en ? ` — ${escapeHtml(d.department_name_en)}` : ''}</option>`;
      }).join('');

    const targetIds = targetId ? [targetId] : ['user_designation_id', 'man_vol_designation_id', 'edit_vol_designation_id'];
    targetIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const val = el.value;
        el.innerHTML = optionsHtml;
        if (val) el.value = val;
      }
    });
  }

  function populateCategorySelects(categories) {
    const activeCats = categories.filter(c => c.is_active == 1);
    const optionsHtml = activeCats.map(c => `
      <option value="${c.id}">${escapeHtml(c.name_en)}${c.name_ur ? ` (${escapeHtml(c.name_ur)})` : ''}</option>
    `).join('');

    ['proj_category_id', 'art_category_id'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const val = el.value;
        el.innerHTML = optionsHtml;
        if (val) el.value = val;
      }
    });

    const filterSelect = document.getElementById('projFilterCategory');
    if (filterSelect) {
      const val = filterSelect.value;
      filterSelect.innerHTML = '<option value="all">All Welfare Categories</option>' +
        categories.map(c => `<option value="${c.id}">${escapeHtml(c.name_en)}</option>`).join('');
      if (val) filterSelect.value = val;
    }
  }

  // Sync Dropdown change listeners
  window.onUserDepartmentSelect = function(deptId) {
    populateDesignationSelects(allDesignationsData, 'user_designation_id', deptId);
  };

  window.onUserRoleSelect = function(roleId) {
    const roleObj = allRolesData.find(r => String(r.id) === String(roleId));
    if (roleObj) {
      const roleHidden = document.getElementById('user_role');
      if (roleHidden) roleHidden.value = roleObj.role_key;
    }
  };

  window.onUserDesignationSelect = function(desigId) {
    const desigObj = allDesignationsData.find(d => String(d.id) === String(desigId));
    if (desigObj) {
      const enInput = document.getElementById('user_designation');
      const urInput = document.getElementById('user_designation_ur');
      if (enInput) enInput.value = desigObj.title_en || '';
      if (urInput) urInput.value = desigObj.title_ur || '';
      if (desigObj.department_id) {
        const deptSelect = document.getElementById('user_department_id');
        if (deptSelect && !deptSelect.value) deptSelect.value = desigObj.department_id;
      }
    }
  };

  window.onManVolDepartmentSelect = function(deptId) {
    populateDesignationSelects(allDesignationsData, 'man_vol_designation_id', deptId);
  };

  window.onManVolDesignationSelect = function(desigId) {
    const desigObj = allDesignationsData.find(d => String(d.id) === String(desigId));
    if (desigObj) {
      const enInput = document.getElementById('man_vol_designation');
      const urInput = document.getElementById('man_vol_designation_ur');
      if (enInput) enInput.value = desigObj.title_en || '';
      if (urInput) urInput.value = desigObj.title_ur || '';
    }
  };

  window.onEditVolDepartmentSelect = function(deptId) {
    populateDesignationSelects(allDesignationsData, 'edit_vol_designation_id', deptId);
  };

  window.onEditVolDesignationSelect = function(desigId) {
    const desigObj = allDesignationsData.find(d => String(d.id) === String(desigId));
    if (desigObj) {
      const enInput = document.getElementById('edit_vol_designation');
      const urInput = document.getElementById('edit_vol_designation_ur');
      if (enInput) enInput.value = desigObj.title_en || '';
      if (urInput) urInput.value = desigObj.title_ur || '';
    }
  };

  window.autoGenerateCategorySlug = function(name) {
    const slugInput = document.getElementById('cat_slug');
    if (slugInput && !document.getElementById('cat_id').value) {
      slugInput.value = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  };

  // ==================== 1. DEPARTMENTS CRUD ====================
  async function loadDepartments() {
    const tbody = document.getElementById('departmentsTableBody');
    if (!tbody) return;
    try {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Loading departments...</td></tr>';
      const res = await fetch('/api/admin/departments');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.departments)) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Failed to load departments: ${escapeHtml(data.message || 'Error')}</td></tr>`;
        return;
      }
      allDepartmentsData = data.departments;
      updateDepartmentMetrics(allDepartmentsData);
      renderDepartmentsTable(allDepartmentsData);
      populateDepartmentSelects(allDepartmentsData);
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Network error loading departments.</td></tr>';
    }
  }

  function updateDepartmentMetrics(depts) {
    const total = depts.length;
    const active = depts.filter(d => d.is_active == 1).length;
    const staffTotal = depts.reduce((acc, d) => acc + (Number(d.staff_count) || 0) + (Number(d.volunteer_count) || 0), 0);
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('metricTotalDepartments', total);
    setTxt('metricActiveDepartments', active);
    setTxt('metricDeptStaffCount', staffTotal);
  }

  function renderDepartmentsTable(depts) {
    const tbody = document.getElementById('departmentsTableBody');
    if (!tbody) return;
    const searchVal = (document.getElementById('deptSearchInput')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('deptFilterStatus')?.value || '';

    let list = depts;
    if (statusVal !== '') {
      list = list.filter(d => String(d.is_active) === statusVal);
    }
    if (searchVal) {
      list = list.filter(d =>
        (d.name_en && d.name_en.toLowerCase().includes(searchVal)) ||
        (d.name_ur && d.name_ur.toLowerCase().includes(searchVal)) ||
        (d.code && d.code.toLowerCase().includes(searchVal)) ||
        (d.description_en && d.description_en.toLowerCase().includes(searchVal))
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;">No departments found.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(d => {
      const activeBadge = d.is_active == 1
        ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Active</span>'
        : '<span class="badge badge-danger"><i class="fas fa-ban"></i> Inactive</span>';
      const staffCount = Number(d.staff_count) || 0;
      const volCount = Number(d.volunteer_count) || 0;
      const totalPersonnel = staffCount + volCount;

      return `
        <tr>
          <td>
            <span class="badge" style="background: #EFF6FF; color: #1D4ED8; font-weight: 700; font-family: monospace; font-size: 0.82rem; letter-spacing: 0.5px;">
              ${escapeHtml(d.code)}
            </span>
          </td>
          <td>
            <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">${escapeHtml(d.name_en)}</div>
            ${d.name_ur ? `<div style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 0.84rem; color: #475569; margin-top: 2px;" dir="rtl">${escapeHtml(d.name_ur)}</div>` : ''}
          </td>
          <td style="max-width: 240px; font-size: 0.8rem; color: #64748B;">
            ${escapeHtml(d.description_en || 'Foundation operational wing')}
          </td>
          <td style="text-align: center;">
            <span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 700; color: #0F172A; background: #F1F5F9; padding: 3px 9px; border-radius: 9999px; font-size: 0.78rem;">
              <i class="fas fa-users" style="color: var(--admin-primary); font-size: 0.7rem;"></i> ${totalPersonnel}
            </span>
          </td>
          <td style="text-align: center; font-size: 0.82rem; font-weight: 600; color: #475569;">
            ${d.sort_order || 0}
          </td>
          <td>${activeBadge}</td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-action-view" onclick="viewDepartment(${d.id})" title="View Details" aria-label="View department">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn-action btn-action-edit" onclick="editDepartment(${d.id})" title="Edit Department" aria-label="Edit department">
                <i class="fas fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn-action btn-action-delete" onclick="deleteDepartment(${d.id}, '${escapeHtml(d.name_en)}')" title="Delete Department" aria-label="Delete department">
                <i class="fas fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Hook department search listeners
  const deptSearchInput = document.getElementById('deptSearchInput');
  if (deptSearchInput) {
    deptSearchInput.addEventListener('input', () => renderDepartmentsTable(allDepartmentsData));
  }
  const deptFilterStatus = document.getElementById('deptFilterStatus');
  if (deptFilterStatus) {
    deptFilterStatus.addEventListener('change', () => renderDepartmentsTable(allDepartmentsData));
  }

  window.openAddDepartmentModal = function() {
    const form = document.getElementById('formDepartment');
    if (form) form.reset();
    document.getElementById('dept_id').value = '';
    document.getElementById('dept_is_active').value = '1';
    document.getElementById('dept_sort_order').value = '0';
    document.getElementById('departmentModalHeading').innerHTML = '<i class="fas fa-building-user"></i> Add New Department / Operational Wing';
    openModal('modalDepartment');
  };

  window.editDepartment = async function(id) {
    try {
      const res = await fetch(`/api/admin/departments/${id}`);
      const data = await res.json();
      if (!data.success || !data.department) {
        alert(data.message || 'Error fetching department.');
        return;
      }
      const d = data.department;
      document.getElementById('dept_id').value = d.id;
      document.getElementById('dept_code').value = d.code || '';
      document.getElementById('dept_name_en').value = d.name_en || '';
      document.getElementById('dept_name_ur').value = d.name_ur || '';
      document.getElementById('dept_description_en').value = d.description_en || '';
      document.getElementById('dept_description_ur').value = d.description_ur || '';
      document.getElementById('dept_sort_order').value = d.sort_order || 0;
      document.getElementById('dept_is_active').value = d.is_active ? '1' : '0';
      document.getElementById('departmentModalHeading').innerHTML = `<i class="fas fa-pen-to-square"></i> Edit Department: ${escapeHtml(d.name_en)}`;
      openModal('modalDepartment');
    } catch (err) {
      alert('Error fetching department.');
    }
  };

  function renderPersonnelMemberList(staff = [], volunteers = [], currentModalId = '') {
    let html = '';
    
    // Staff section
    html += `
      <div style="margin-top: 18px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <label class="view-user-label" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">
            <i class="fas fa-users-gear" style="color: var(--admin-primary); margin-right: 6px;"></i> Assigned Staff Members (${staff.length})
          </label>
        </div>
    `;

    if (staff.length > 0) {
      html += '<div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; padding-right: 4px;">';
      staff.forEach(s => {
        const initials = (s.full_name || s.username || 'S').slice(0, 2).toUpperCase();
        const avatar = s.photo_url 
          ? `<img src="${escapeHtml(s.photo_url)}" alt="${escapeHtml(s.full_name || s.username)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#7F1D1D;color:#FFF;font-size:0.8rem;font-weight:700;\\'>${initials}</div>';" />`
          : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #7F1D1D; color: #FFF; font-size: 0.8rem; font-weight: 700;">${initials}</div>`;

        html += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <div style="width: 36px; height: 36px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #CBD5E1;">
                ${avatar}
              </div>
              <div style="min-width: 0;">
                <div style="font-weight: 700; color: #0F172A; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(s.full_name || s.username)}
                </div>
                <div style="font-size: 0.74rem; color: #64748B; display: flex; gap: 8px; flex-wrap: wrap;">
                  <span style="color: #0284C7; font-weight: 600;">${escapeHtml(s.designation_name_en || s.designation || 'Staff')}</span>
                  <span><i class="fas fa-user-shield"></i> ${escapeHtml(s.role_name_en || s.role || 'Staff')}</span>
                  ${s.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(s.phone)}</span>` : ''}
                </div>
              </div>
            </div>
            <button type="button" class="btn-admin btn-admin-secondary" onclick="closeModal('${currentModalId}'); viewUser(${s.id});" style="font-size: 0.74rem; padding: 4px 10px; white-space: nowrap;">
              <i class="fas fa-user"></i> View Profile
            </button>
          </div>
        `;
      });
      html += '</div>';
    } else {
      html += '<div style="font-size: 0.82rem; color: #64748B; font-style: italic; background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 10px 14px; border-radius: 6px;">No registered staff members currently assigned.</div>';
    }
    html += '</div>';

    // Volunteers section
    html += `
      <div style="margin-top: 16px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <label class="view-user-label" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">
            <i class="fas fa-handshake-angle" style="color: #059669; margin-right: 6px;"></i> Assigned Volunteers (${volunteers.length})
          </label>
        </div>
    `;

    if (volunteers.length > 0) {
      html += '<div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; padding-right: 4px;">';
      volunteers.forEach(v => {
        const initials = (v.full_name || 'V').slice(0, 2).toUpperCase();
        const avatar = v.photo_url
          ? `<img src="${escapeHtml(v.photo_url)}" alt="${escapeHtml(v.full_name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#047857;color:#FFF;font-size:0.8rem;font-weight:700;\\'>${initials}</div>';" />`
          : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #047857; color: #FFF; font-size: 0.8rem; font-weight: 700;">${initials}</div>`;

        html += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <div style="width: 36px; height: 36px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #CBD5E1;">
                ${avatar}
              </div>
              <div style="min-width: 0;">
                <div style="font-weight: 700; color: #0F172A; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(v.full_name)}
                </div>
                <div style="font-size: 0.74rem; color: #64748B; display: flex; gap: 8px; flex-wrap: wrap;">
                  <span style="color: #047857; font-weight: 600;">${escapeHtml(v.designation_name_en || v.designation || 'Volunteer')}</span>
                  <span><i class="fas fa-tag"></i> ${escapeHtml(v.status || 'Active')}</span>
                  ${v.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(v.phone)}</span>` : ''}
                </div>
              </div>
            </div>
            <button type="button" class="btn-admin btn-admin-secondary" onclick="closeModal('${currentModalId}'); viewVolunteer(${v.id});" style="font-size: 0.74rem; padding: 4px 10px; white-space: nowrap;">
              <i class="fas fa-handshake-angle"></i> View Volunteer
            </button>
          </div>
        `;
      });
      html += '</div>';
    } else {
      html += '<div style="font-size: 0.82rem; color: #64748B; font-style: italic; background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 10px 14px; border-radius: 6px;">No volunteers currently assigned.</div>';
    }
    html += '</div>';

    return html;
  }

  window.viewDepartment = async function(id) {
    try {
      const res = await fetch(`/api/admin/departments/${id}`);
      const data = await res.json();
      if (!data.success || !data.department) {
        alert(data.message || 'Error fetching department.');
        return;
      }
      const d = data.department;
      const staffList = Array.isArray(data.staff) ? data.staff : [];
      const volunteerList = Array.isArray(data.volunteers) ? data.volunteers : [];
      const staffCount = data.staff_count !== undefined ? data.staff_count : staffList.length;
      const volunteerCount = data.volunteer_count !== undefined ? data.volunteer_count : volunteerList.length;

      const bodyHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 14px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${escapeHtml(d.name_en)}</div>
            <div style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 1.1rem; color: #475569; margin-top: 4px;" dir="rtl">${escapeHtml(d.name_ur || '')}</div>
          </div>
          <span class="badge" style="background: #EFF6FF; color: #1D4ED8; font-weight: 800; font-size: 0.95rem; font-family: monospace;">${escapeHtml(d.code)}</span>
        </div>
        <div class="view-user-grid" style="margin-bottom: 16px;">
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-users-gear"></i> Assigned Staff</label>
            <div class="view-user-value"><strong>${staffCount}</strong> Registered Staff</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-handshake-angle"></i> Assigned Volunteers</label>
            <div class="view-user-value"><strong>${volunteerCount}</strong> Volunteers</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-arrow-down-1-9"></i> Sort Order</label>
            <div class="view-user-value">${d.sort_order || 0}</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-signal"></i> Operational Status</label>
            <div class="view-user-value">${d.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</div>
          </div>
        </div>
        <div style="margin-bottom: 14px;">
          <label class="view-user-label"><i class="fas fa-file-lines"></i> Mandate & Responsibilities (English)</label>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem; color: #334155;">
            ${escapeHtml(d.description_en || 'No description provided.')}
          </div>
        </div>
        <div>
          <label class="view-user-label"><i class="fas fa-file-lines"></i> Mandate & Responsibilities (Urdu)</label>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px; font-size: 0.9rem; color: #334155; font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif;" dir="rtl">
            ${escapeHtml(d.description_ur || 'کوئی تفصیل درج نہیں ہے۔')}
          </div>
        </div>
        ${renderPersonnelMemberList(staffList, volunteerList, 'modalViewDepartment')}
      `;
      document.getElementById('viewDepartmentModalBody').innerHTML = bodyHtml;
      const btnEdit = document.getElementById('btnEditDepartmentFromView');
      if (btnEdit) {
        btnEdit.onclick = function() {
          closeModal('modalViewDepartment');
          editDepartment(id);
        };
      }
      openModal('modalViewDepartment');
    } catch (err) {
      alert('Error loading department view.');
    }
  };

  window.handleDepartmentFormSubmit = async function(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnSubmitDepartment');
    if (btn) btn.disabled = true;

    const id = document.getElementById('dept_id').value;
    const payload = {
      code: document.getElementById('dept_code').value.trim().toUpperCase(),
      name_en: document.getElementById('dept_name_en').value.trim(),
      name_ur: document.getElementById('dept_name_ur').value.trim(),
      description_en: document.getElementById('dept_description_en').value.trim(),
      description_ur: document.getElementById('dept_description_ur').value.trim(),
      sort_order: parseInt(document.getElementById('dept_sort_order').value) || 0,
      is_active: parseInt(document.getElementById('dept_is_active').value) || 1
    };

    const url = id ? `/api/admin/departments/${id}` : '/api/admin/departments';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(id ? 'Department updated successfully!' : 'Department created successfully!');
        closeModal('modalDepartment');
        loadDepartments();
      } else {
        alert(data.message || 'Error saving department.');
      }
    } catch (err) {
      alert('Network error while saving department.');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.deleteDepartment = async function(id, name) {
    if (!confirm(`Are you sure you want to delete the department "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/departments/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Department deleted successfully!');
        loadDepartments();
      } else {
        alert(data.message || 'Error deleting department.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  // ==================== 2. USER ROLES CRUD ====================
  async function loadRoles() {
    const tbody = document.getElementById('rolesTableBody');
    if (!tbody) return;
    try {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Loading user roles...</td></tr>';
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.roles)) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Failed to load roles: ${escapeHtml(data.message || 'Error')}</td></tr>`;
        return;
      }
      allRolesData = data.roles;
      updateRoleMetrics(allRolesData);
      renderRolesTable(allRolesData);
      populateRoleSelects(allRolesData);
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Network error loading roles.</td></tr>';
    }
  }

  function updateRoleMetrics(roles) {
    const total = roles.length;
    const system = roles.filter(r => r.is_system == 1).length;
    const custom = total - system;
    const usersTotal = roles.reduce((acc, r) => acc + (Number(r.users_count) || 0), 0);
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('metricTotalRoles', total);
    setTxt('metricSystemRoles', system);
    setTxt('metricRoleUsersCount', usersTotal);
  }

  function renderRolesTable(roles) {
    const tbody = document.getElementById('rolesTableBody');
    if (!tbody) return;
    const searchVal = (document.getElementById('roleSearchInput')?.value || '').toLowerCase().trim();

    let list = roles;
    if (searchVal) {
      list = list.filter(r =>
        (r.role_key && r.role_key.toLowerCase().includes(searchVal)) ||
        (r.name_en && r.name_en.toLowerCase().includes(searchVal)) ||
        (r.name_ur && r.name_ur.toLowerCase().includes(searchVal)) ||
        (r.description && r.description.toLowerCase().includes(searchVal))
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;">No user roles found.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(r => {
      const isSystem = r.is_system == 1;
      const classBadge = isSystem
        ? '<span class="badge" style="background: #EFF6FF; color: #1D4ED8; font-weight: 700;"><i class="fas fa-lock"></i> Protected Core</span>'
        : '<span class="badge" style="background: #F1F5F9; color: #475569; font-weight: 600;">Custom Role</span>';
      const activeBadge = r.is_active == 1
        ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Active</span>'
        : '<span class="badge badge-danger"><i class="fas fa-ban"></i> Inactive</span>';

      return `
        <tr>
          <td>
            <code style="font-weight: 700; color: #991B1B; font-size: 0.84rem; background: #FFF1F2; padding: 2px 7px; border-radius: 4px;">
              ${escapeHtml(r.role_key)}
            </code>
          </td>
          <td>
            <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">${escapeHtml(r.name_en)}</div>
            ${r.name_ur ? `<div style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 0.84rem; color: #475569; margin-top: 2px;" dir="rtl">${escapeHtml(r.name_ur)}</div>` : ''}
          </td>
          <td style="max-width: 240px; font-size: 0.8rem; color: #64748B;">
            ${escapeHtml(r.description || 'System access level')}
          </td>
          <td style="text-align: center;">${classBadge}</td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #0F172A; background: #F1F5F9; padding: 2px 8px; border-radius: 9999px; font-size: 0.78rem;">
              ${r.users_count || 0}
            </span>
          </td>
          <td>${activeBadge}</td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-action-view" onclick="viewRole(${r.id})" title="View Role" aria-label="View role">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn-action btn-action-edit" onclick="editRole(${r.id})" title="Edit Role" aria-label="Edit role">
                <i class="fas fa-pen-to-square"></i>
              </button>
              ${!isSystem ? `
                <button type="button" class="btn-action btn-action-delete" onclick="deleteRole(${r.id}, '${escapeHtml(r.name_en)}')" title="Delete Role" aria-label="Delete role">
                  <i class="fas fa-trash-can"></i>
                </button>
              ` : `
                <button type="button" class="btn-action btn-action-delete" disabled style="opacity: 0.35; cursor: not-allowed;" title="Protected System Role">
                  <i class="fas fa-lock"></i>
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  const roleSearchInput = document.getElementById('roleSearchInput');
  if (roleSearchInput) {
    roleSearchInput.addEventListener('input', () => renderRolesTable(allRolesData));
  }

  window.openAddRoleModal = function() {
    const form = document.getElementById('formRole');
    if (form) form.reset();
    document.getElementById('role_id').value = '';
    const roleKeyInput = document.getElementById('role_key');
    if (roleKeyInput) {
      roleKeyInput.readOnly = false;
      roleKeyInput.style.background = '#FFFFFF';
    }
    document.getElementById('role_is_active').value = '1';
    document.getElementById('roleModalHeading').innerHTML = '<i class="fas fa-user-shield"></i> Add New User Role';
    openModal('modalRole');
  };

  window.editRole = async function(id) {
    try {
      const res = await fetch(`/api/admin/roles/${id}`);
      const data = await res.json();
      if (!data.success || !data.role) {
        alert(data.message || 'Error loading role.');
        return;
      }
      const r = data.role;
      document.getElementById('role_id').value = r.id;
      const roleKeyInput = document.getElementById('role_key');
      if (roleKeyInput) {
        roleKeyInput.value = r.role_key || '';
        roleKeyInput.readOnly = (r.is_system == 1);
        roleKeyInput.style.background = (r.is_system == 1) ? '#F1F5F9' : '#FFFFFF';
      }
      document.getElementById('role_name_en').value = r.name_en || '';
      document.getElementById('role_name_ur').value = r.name_ur || '';
      document.getElementById('role_description').value = r.description || '';
      document.getElementById('role_is_active').value = r.is_active ? '1' : '0';
      document.getElementById('roleModalHeading').innerHTML = `<i class="fas fa-pen-to-square"></i> Edit Role: ${escapeHtml(r.name_en)}`;
      openModal('modalRole');
    } catch (err) {
      alert('Error fetching role.');
    }
  };

  window.viewRole = async function(id) {
    try {
      const res = await fetch(`/api/admin/roles/${id}`);
      const data = await res.json();
      if (!data.success || !data.role) {
        alert(data.message || 'Error loading role.');
        return;
      }
      const r = data.role;
      const staffList = Array.isArray(data.staff) ? data.staff : [];
      const volunteerList = Array.isArray(data.volunteers) ? data.volunteers : [];
      const totalPersonnel = data.users_count !== undefined ? data.users_count : (staffList.length + volunteerList.length);

      const bodyHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 14px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${escapeHtml(r.name_en)}</div>
            <div style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 1.05rem; color: #475569; margin-top: 4px;" dir="rtl">${escapeHtml(r.name_ur || '')}</div>
          </div>
          <code style="font-size: 0.95rem; font-weight: 700; background: #FFF1F2; color: #991B1B; padding: 4px 10px; border-radius: 6px;">
            ${escapeHtml(r.role_key)}
          </code>
        </div>
        <div class="view-user-grid" style="margin-bottom: 16px;">
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-users"></i> Total Assigned Members</label>
            <div class="view-user-value"><strong>${totalPersonnel}</strong> Assigned Personnel (${staffList.length} Staff, ${volunteerList.length} Volunteers)</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-shield"></i> Role Classification</label>
            <div class="view-user-value">${r.is_system == 1 ? '<span class="badge" style="background:#EFF6FF;color:#1D4ED8;"><i class="fas fa-lock"></i> Protected System Role</span>' : '<span class="badge">Custom Administrative Role</span>'}</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-signal"></i> Status</label>
            <div class="view-user-value">${r.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</div>
          </div>
        </div>
        <div>
          <label class="view-user-label"><i class="fas fa-file-lines"></i> Description & Access Scope</label>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem; color: #334155;">
            ${escapeHtml(r.description || 'System access role')}
          </div>
        </div>
        ${renderPersonnelMemberList(staffList, volunteerList, 'modalViewRole')}
      `;
      document.getElementById('viewRoleModalBody').innerHTML = bodyHtml;
      const btnEdit = document.getElementById('btnEditRoleFromView');
      if (btnEdit) {
        btnEdit.onclick = function() {
          closeModal('modalViewRole');
          editRole(id);
        };
      }
      openModal('modalViewRole');
    } catch (err) {
      alert('Error fetching role details.');
    }
  };

  window.handleRoleFormSubmit = async function(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnSubmitRole');
    if (btn) btn.disabled = true;

    const id = document.getElementById('role_id').value;
    const payload = {
      role_key: document.getElementById('role_key').value.trim().toLowerCase(),
      name_en: document.getElementById('role_name_en').value.trim(),
      name_ur: document.getElementById('role_name_ur').value.trim(),
      description: document.getElementById('role_description').value.trim(),
      is_active: parseInt(document.getElementById('role_is_active').value) || 1
    };

    const url = id ? `/api/admin/roles/${id}` : '/api/admin/roles';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(id ? 'User role updated successfully!' : 'User role created successfully!');
        closeModal('modalRole');
        loadRoles();
      } else {
        alert(data.message || 'Error saving user role.');
      }
    } catch (err) {
      alert('Network error while saving user role.');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.deleteRole = async function(id, name) {
    if (!confirm(`Are you sure you want to delete the role "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('User role deleted successfully!');
        loadRoles();
      } else {
        alert(data.message || 'Error deleting role.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  // ==================== 3. DESIGNATIONS CRUD ====================
  async function loadDesignations() {
    const tbody = document.getElementById('designationsTableBody');
    if (!tbody) return;
    try {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Loading designations...</td></tr>';
      const res = await fetch('/api/admin/designations');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.designations)) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Failed to load designations: ${escapeHtml(data.message || 'Error')}</td></tr>`;
        return;
      }
      allDesignationsData = data.designations;
      updateDesignationMetrics(allDesignationsData);
      renderDesignationsTable(allDesignationsData);
      populateDesignationSelects(allDesignationsData);
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Network error loading designations.</td></tr>';
    }
  }

  function updateDesignationMetrics(desigs) {
    const total = desigs.length;
    const active = desigs.filter(d => d.is_active == 1).length;
    const deptsSet = new Set(desigs.map(d => d.department_id).filter(Boolean));
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('metricTotalDesignations', total);
    setTxt('metricActiveDesignations', active);
    setTxt('metricDesignationDepts', deptsSet.size);
  }

  function renderDesignationsTable(desigs) {
    const tbody = document.getElementById('designationsTableBody');
    if (!tbody) return;
    const searchVal = (document.getElementById('desigSearchInput')?.value || '').toLowerCase().trim();
    const deptVal = document.getElementById('desigFilterDepartment')?.value || '';

    let list = desigs;
    if (deptVal) {
      list = list.filter(d => String(d.department_id) === deptVal);
    }
    if (searchVal) {
      list = list.filter(d =>
        (d.title_en && d.title_en.toLowerCase().includes(searchVal)) ||
        (d.title_ur && d.title_ur.toLowerCase().includes(searchVal)) ||
        (d.level && d.level.toLowerCase().includes(searchVal)) ||
        (d.department_name_en && d.department_name_en.toLowerCase().includes(searchVal)) ||
        (d.description && d.description.toLowerCase().includes(searchVal))
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;">No designations found.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(d => {
      const activeBadge = d.is_active == 1
        ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Active</span>'
        : '<span class="badge badge-danger"><i class="fas fa-ban"></i> Inactive</span>';
      const deptBadge = d.department_name_en
        ? `<span class="badge" style="background: #F1F5F9; color: #334155; font-weight: 600;"><i class="fas fa-building-user" style="color: var(--admin-primary); margin-right: 4px;"></i>${escapeHtml(d.department_name_en)}</span>`
        : '<span style="color: #94A3B8; font-size: 0.78rem;">General / Foundation</span>';
      const totalPersonnel = (Number(d.users_count) || 0) + (Number(d.volunteers_count) || 0);

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">${escapeHtml(d.title_en)}</div>
            ${d.title_ur ? `<div style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 0.84rem; color: #475569; margin-top: 2px;" dir="rtl">${escapeHtml(d.title_ur)}</div>` : ''}
          </td>
          <td>${deptBadge}</td>
          <td style="text-align: center; font-size: 0.82rem; font-weight: 600; color: #475569;">
            ${escapeHtml(d.level || 'Standard')}
          </td>
          <td style="max-width: 240px; font-size: 0.8rem; color: #64748B;">
            ${escapeHtml(d.description || 'Job role designation')}
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #0F172A; background: #F1F5F9; padding: 2px 8px; border-radius: 9999px; font-size: 0.78rem;">
              ${totalPersonnel}
            </span>
          </td>
          <td>${activeBadge}</td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-action-view" onclick="viewDesignation(${d.id})" title="View Designation" aria-label="View designation">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn-action btn-action-edit" onclick="editDesignation(${d.id})" title="Edit Designation" aria-label="Edit designation">
                <i class="fas fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn-action btn-action-delete" onclick="deleteDesignation(${d.id}, '${escapeHtml(d.title_en)}')" title="Delete Designation" aria-label="Delete designation">
                <i class="fas fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  const desigSearchInput = document.getElementById('desigSearchInput');
  if (desigSearchInput) {
    desigSearchInput.addEventListener('input', () => renderDesignationsTable(allDesignationsData));
  }
  const desigFilterDepartment = document.getElementById('desigFilterDepartment');
  if (desigFilterDepartment) {
    desigFilterDepartment.addEventListener('change', () => renderDesignationsTable(allDesignationsData));
  }

  window.openAddDesignationModal = function() {
    const form = document.getElementById('formDesignation');
    if (form) form.reset();
    document.getElementById('desig_id').value = '';
    document.getElementById('desig_is_active').value = '1';
    document.getElementById('designationModalHeading').innerHTML = '<i class="fas fa-award"></i> Add New Designation';
    openModal('modalDesignation');
  };

  window.editDesignation = async function(id) {
    try {
      const res = await fetch(`/api/admin/designations/${id}`);
      const data = await res.json();
      if (!data.success || !data.designation) {
        alert(data.message || 'Error loading designation.');
        return;
      }
      const d = data.designation;
      document.getElementById('desig_id').value = d.id;
      document.getElementById('desig_title_en').value = d.title_en || '';
      document.getElementById('desig_title_ur').value = d.title_ur || '';
      document.getElementById('desig_department_id').value = d.department_id || '';
      document.getElementById('desig_level').value = d.level || '';
      document.getElementById('desig_description').value = d.description || '';
      document.getElementById('desig_is_active').value = d.is_active ? '1' : '0';
      document.getElementById('designationModalHeading').innerHTML = `<i class="fas fa-pen-to-square"></i> Edit Designation: ${escapeHtml(d.title_en)}`;
      openModal('modalDesignation');
    } catch (err) {
      alert('Error fetching designation.');
    }
  };

  window.viewDesignation = async function(id) {
    try {
      const res = await fetch(`/api/admin/designations/${id}`);
      const data = await res.json();
      if (!data.success || !data.designation) {
        alert(data.message || 'Error loading designation.');
        return;
      }
      const d = data.designation;
      const staffList = Array.isArray(data.staff) ? data.staff : [];
      const volunteerList = Array.isArray(data.volunteers) ? data.volunteers : [];
      const staffCount = data.users_count !== undefined ? data.users_count : staffList.length;
      const volunteerCount = data.volunteers_count !== undefined ? data.volunteers_count : volunteerList.length;

      const bodyHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 14px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${escapeHtml(d.title_en)}</div>
            <div style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 1.05rem; color: #475569; margin-top: 4px;" dir="rtl">${escapeHtml(d.title_ur || '')}</div>
          </div>
          <span class="badge" style="background: #EFF6FF; color: #1D4ED8; font-weight: 700;">${escapeHtml(d.department_name_en || 'General Foundation')}</span>
        </div>
        <div class="view-user-grid" style="margin-bottom: 16px;">
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-users-gear"></i> Staff Assigned</label>
            <div class="view-user-value"><strong>${staffCount}</strong> Members</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-handshake-angle"></i> Volunteers Assigned</label>
            <div class="view-user-value"><strong>${volunteerCount}</strong> Volunteers</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-layer-group"></i> Rank / Grade Level</label>
            <div class="view-user-value">${escapeHtml(d.level || 'Standard')}</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-signal"></i> Status</label>
            <div class="view-user-value">${d.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</div>
          </div>
        </div>
        <div>
          <label class="view-user-label"><i class="fas fa-file-lines"></i> Job Description & Roles</label>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem; color: #334155;">
            ${escapeHtml(d.description || 'Job role description')}
          </div>
        </div>
        ${renderPersonnelMemberList(staffList, volunteerList, 'modalViewDesignation')}
      `;
      document.getElementById('viewDesignationModalBody').innerHTML = bodyHtml;
      const btnEdit = document.getElementById('btnEditDesignationFromView');
      if (btnEdit) {
        btnEdit.onclick = function() {
          closeModal('modalViewDesignation');
          editDesignation(id);
        };
      }
      openModal('modalViewDesignation');
    } catch (err) {
      alert('Error fetching designation details.');
    }
  };

  window.handleDesignationFormSubmit = async function(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnSubmitDesignation');
    if (btn) btn.disabled = true;

    const id = document.getElementById('desig_id').value;
    const payload = {
      title_en: document.getElementById('desig_title_en').value.trim(),
      title_ur: document.getElementById('desig_title_ur').value.trim(),
      department_id: document.getElementById('desig_department_id').value || null,
      level: document.getElementById('desig_level').value.trim(),
      description: document.getElementById('desig_description').value.trim(),
      is_active: parseInt(document.getElementById('desig_is_active').value) || 1
    };

    const url = id ? `/api/admin/designations/${id}` : '/api/admin/designations';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(id ? 'Designation updated successfully!' : 'Designation created successfully!');
        closeModal('modalDesignation');
        loadDesignations();
      } else {
        alert(data.message || 'Error saving designation.');
      }
    } catch (err) {
      alert('Network error while saving designation.');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.deleteDesignation = async function(id, name) {
    if (!confirm(`Are you sure you want to delete the designation "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/designations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Designation deleted successfully!');
        loadDesignations();
      } else {
        alert(data.message || 'Error deleting designation.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  // ==================== 4. PROJECT CATEGORIES CRUD ====================
  async function loadCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;
    try {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;"><i class="fas fa-spinner fa-spin"></i> Loading categories...</td></tr>';
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (!data.success || !Array.isArray(data.categories)) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Failed to load categories: ${escapeHtml(data.message || 'Error')}</td></tr>`;
        return;
      }
      allCategoriesData = data.categories;
      updateCategoryMetrics(allCategoriesData);
      renderCategoriesTable(allCategoriesData);
      populateCategorySelects(allCategoriesData);
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Network error loading categories.</td></tr>';
    }
  }

  function updateCategoryMetrics(cats) {
    const total = cats.length;
    const active = cats.filter(c => c.is_active == 1).length;
    const projectsTotal = cats.reduce((acc, c) => acc + (Number(c.projects_count) || 0), 0);
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('metricTotalCategories', total);
    setTxt('metricActiveCategories', active);
    setTxt('metricCatProjectsCount', projectsTotal);
  }

  function renderCategoriesTable(cats) {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;
    const searchVal = (document.getElementById('catSearchInput')?.value || '').toLowerCase().trim();

    let list = cats;
    if (searchVal) {
      list = list.filter(c =>
        (c.name_en && c.name_en.toLowerCase().includes(searchVal)) ||
        (c.name_ur && c.name_ur.toLowerCase().includes(searchVal)) ||
        (c.slug && c.slug.toLowerCase().includes(searchVal)) ||
        (c.description_en && c.description_en.toLowerCase().includes(searchVal))
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94A3B8; padding: 24px;">No categories found.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(c => {
      const activeBadge = c.is_active == 1
        ? '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Active</span>'
        : '<span class="badge badge-danger"><i class="fas fa-ban"></i> Inactive</span>';
      const iconHtml = c.icon_class
        ? `<div style="width: 38px; height: 38px; border-radius: 8px; background: #FFF1F2; color: var(--admin-primary); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin: 0 auto;"><i class="${escapeHtml(c.icon_class)}"></i></div>`
        : '<div style="width: 38px; height: 38px; border-radius: 8px; background: #F1F5F9; color: #64748B; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; margin: 0 auto;"><i class="fas fa-shapes"></i></div>';

      return `
        <tr>
          <td style="text-align: center;">${iconHtml}</td>
          <td>
            <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">${escapeHtml(c.name_en)}</div>
            ${c.name_ur ? `<div style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 0.84rem; color: #475569; margin-top: 2px;" dir="rtl">${escapeHtml(c.name_ur)}</div>` : ''}
          </td>
          <td>
            <code style="font-size: 0.82rem; color: #0284C7; background: #F0F9FF; padding: 2px 7px; border-radius: 4px;">
              ${escapeHtml(c.slug)}
            </code>
          </td>
          <td style="max-width: 240px; font-size: 0.8rem; color: #64748B;">
            ${escapeHtml(c.description_en || 'Public category')}
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #0F172A; background: #F1F5F9; padding: 2px 8px; border-radius: 9999px; font-size: 0.78rem;">
              ${c.projects_count || 0}
            </span>
          </td>
          <td>${activeBadge}</td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="action-btn-group">
              <button type="button" class="btn-action btn-action-view" onclick="viewCategory(${c.id})" title="View Category" aria-label="View category">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn-action btn-action-edit" onclick="editCategory(${c.id})" title="Edit Category" aria-label="Edit category">
                <i class="fas fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn-action btn-action-delete" onclick="deleteCategory(${c.id}, '${escapeHtml(c.name_en)}')" title="Delete Category" aria-label="Delete category">
                <i class="fas fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  const catSearchInput = document.getElementById('catSearchInput');
  if (catSearchInput) {
    catSearchInput.addEventListener('input', () => renderCategoriesTable(allCategoriesData));
  }

  window.openAddCategoryModal = function() {
    const form = document.getElementById('formCategory');
    if (form) form.reset();
    document.getElementById('cat_id').value = '';
    document.getElementById('cat_icon_class').value = 'fas fa-hand-holding-heart';
    document.getElementById('cat_is_active').value = '1';
    setCategoryImage('');
    document.getElementById('categoryModalHeading').innerHTML = '<i class="fas fa-shapes"></i> Add New Category';
    openModal('modalCategory');
  };

  window.editCategory = async function(id) {
    try {
      const res = await fetch(`/api/admin/categories/${id}`);
      const data = await res.json();
      if (!data.success || !data.category) {
        alert(data.message || 'Error loading category.');
        return;
      }
      const c = data.category;
      document.getElementById('cat_id').value = c.id;
      document.getElementById('cat_name_en').value = c.name_en || '';
      document.getElementById('cat_name_ur').value = c.name_ur || '';
      document.getElementById('cat_slug').value = c.slug || '';
      document.getElementById('cat_icon_class').value = c.icon_class || 'fas fa-hand-holding-heart';
      setCategoryImage(c.image_url || '');
      document.getElementById('cat_description_en').value = c.description_en || '';
      document.getElementById('cat_description_ur').value = c.description_ur || '';
      document.getElementById('cat_is_active').value = c.is_active ? '1' : '0';
      document.getElementById('categoryModalHeading').innerHTML = `<i class="fas fa-pen-to-square"></i> Edit Category: ${escapeHtml(c.name_en)}`;
      openModal('modalCategory');
    } catch (err) {
      alert('Error fetching category.');
    }
  };

  window.viewCategory = async function(id) {
    try {
      const res = await fetch(`/api/admin/categories/${id}`);
      const data = await res.json();
      if (!data.success || !data.category) {
        alert(data.message || 'Error loading category.');
        return;
      }
      const c = data.category;
      const projList = Array.isArray(data.projects) ? data.projects : [];
      const projectsCount = data.projects_count !== undefined ? data.projects_count : projList.length;

      let projectsHtml = `
        <div style="margin-top: 18px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
          <label class="view-user-label" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin-bottom: 10px; display: block;">
            <i class="fas fa-hand-holding-heart" style="color: var(--admin-primary); margin-right: 6px;"></i> Linked Welfare Projects (${projList.length})
          </label>
      `;

      if (projList.length > 0) {
        projectsHtml += '<div style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; padding-right: 4px;">';
        projList.forEach(p => {
          const pct = (p.goal_amount > 0) ? Math.min(100, Math.round((p.raised_amount / p.goal_amount) * 100)) : 0;
          projectsHtml += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
                <div style="width: 50px; height: 38px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #CBD5E1; background: #F8FAFC;">
                  <img src="${escapeHtml(p.image_url || '/media/projects/orphan_education.webp')}" alt="${escapeHtml(p.title_en)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/media/projects/orphan_education.webp'" />
                </div>
                <div style="min-width: 0;">
                  <div style="font-weight: 700; color: #0F172A; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(p.title_en)}
                  </div>
                  <div style="font-size: 0.74rem; color: #64748B; display: flex; gap: 8px; flex-wrap: wrap;">
                    <span>Goal: PKR ${Number(p.goal_amount || 0).toLocaleString()}</span>
                    <span>&bull;</span>
                    <span style="color: #047857; font-weight: 600;">Raised: PKR ${Number(p.raised_amount || 0).toLocaleString()} (${pct}%)</span>
                    <span>&bull;</span>
                    <span class="badge" style="font-size: 0.68rem; padding: 1px 6px;">${escapeHtml(p.status || 'active')}</span>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-admin btn-admin-secondary" onclick="closeModal('modalViewCategory'); viewProjectDetails(${p.id});" style="font-size: 0.74rem; padding: 4px 10px; white-space: nowrap;">
                <i class="fas fa-eye"></i> View Details
              </button>
            </div>
          `;
        });
        projectsHtml += '</div>';
      } else {
        projectsHtml += '<div style="font-size: 0.82rem; color: #64748B; font-style: italic; background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 10px 14px; border-radius: 6px;">No welfare projects linked to this category yet.</div>';
      }
      projectsHtml += '</div>';

      const bannerHtml = c.image_url ? `
        <div style="width: 100%; height: 130px; border-radius: 8px; overflow: hidden; margin-bottom: 14px; border: 1px solid #CBD5E1; background: #F1F5F9;">
          <img src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.name_en)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" />
        </div>
      ` : '';

      const bodyHtml = `
        ${bannerHtml}
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 14px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 8px; background: #FFF1F2; color: var(--admin-primary); display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
              <i class="${escapeHtml(c.icon_class || 'fas fa-shapes')}"></i>
            </div>
            <div>
              <div style="font-size: 1.3rem; font-weight: 800; color: #0F172A;">${escapeHtml(c.name_en)}</div>
              <div style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 1.05rem; color: #475569; margin-top: 2px;" dir="rtl">${escapeHtml(c.name_ur || '')}</div>
            </div>
          </div>
          <code style="font-size: 0.9rem; color: #0284C7; background: #F0F9FF; padding: 4px 10px; border-radius: 6px;">
            ${escapeHtml(c.slug)}
          </code>
        </div>
        <div class="view-user-grid" style="margin-bottom: 16px;">
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-hand-holding-heart"></i> Welfare Projects</label>
            <div class="view-user-value"><strong>${projectsCount}</strong> Linked Initiatives</div>
          </div>
          <div class="view-user-field">
            <label class="view-user-label"><i class="fas fa-signal"></i> Public Status</label>
            <div class="view-user-value">${c.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</div>
          </div>
        </div>
        <div style="margin-bottom: 14px;">
          <label class="view-user-label"><i class="fas fa-file-lines"></i> Description (English)</label>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem; color: #334155;">
            ${escapeHtml(c.description_en || 'Public category description')}
          </div>
        </div>
        <div>
          <label class="view-user-label"><i class="fas fa-file-lines"></i> Description (Urdu)</label>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px; font-size: 0.9rem; color: #334155; font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif;" dir="rtl">
            ${escapeHtml(c.description_ur || 'کوئی تفصیل درج نہیں ہے۔')}
          </div>
        </div>
        ${projectsHtml}
      `;
      document.getElementById('viewCategoryModalBody').innerHTML = bodyHtml;
      const btnEdit = document.getElementById('btnEditCategoryFromView');
      if (btnEdit) {
        btnEdit.onclick = function() {
          closeModal('modalViewCategory');
          editCategory(id);
        };
      }
      openModal('modalViewCategory');
    } catch (err) {
      alert('Error fetching category details.');
    }
  };

  window.handleCategoryFormSubmit = async function(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnSubmitCategory');
    if (btn) btn.disabled = true;

    const id = document.getElementById('cat_id').value;
    const payload = {
      name_en: document.getElementById('cat_name_en').value.trim(),
      name_ur: document.getElementById('cat_name_ur').value.trim(),
      slug: document.getElementById('cat_slug').value.trim().toLowerCase(),
      icon_class: document.getElementById('cat_icon_class').value.trim(),
      image_url: (document.getElementById('cat_image_url')?.value || '').trim(),
      description_en: document.getElementById('cat_description_en').value.trim(),
      description_ur: document.getElementById('cat_description_ur').value.trim(),
      is_active: parseInt(document.getElementById('cat_is_active').value) || 1
    };

    const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(id ? 'Category updated successfully!' : 'Category created successfully!');
        closeModal('modalCategory');
        loadCategories();
      } else {
        alert(data.message || 'Error saving category.');
      }
    } catch (err) {
      alert('Network error while saving category.');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.deleteCategory = async function(id, name) {
    if (!confirm(`Are you sure you want to delete the category "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Category deleted successfully!');
        loadCategories();
      } else {
        alert(data.message || 'Error deleting category.');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  // ==================== VOLUNTEER & STAFF IDENTITY CARDS SYSTEM ====================
  let currentIdCardData = null;
  let currentIdCardViewMode = 'dual'; // 'dual', 'front', 'back'

  window.setIdCardViewMode = function(mode) {
    currentIdCardViewMode = mode;
    const btnDual = document.getElementById('btnCardViewDual');
    const btnFront = document.getElementById('btnCardViewFront');
    const btnBack = document.getElementById('btnCardViewBack');

    [btnDual, btnFront, btnBack].forEach(b => {
      if (b) {
        b.classList.remove('btn-admin-primary');
        b.classList.add('btn-admin-secondary');
      }
    });

    if (mode === 'dual' && btnDual) {
      btnDual.classList.add('btn-admin-primary');
      btnDual.classList.remove('btn-admin-secondary');
    } else if (mode === 'front' && btnFront) {
      btnFront.classList.add('btn-admin-primary');
      btnFront.classList.remove('btn-admin-secondary');
    } else if (mode === 'back' && btnBack) {
      btnBack.classList.add('btn-admin-primary');
      btnBack.classList.remove('btn-admin-secondary');
    }

    if (currentIdCardData) {
      renderIdCardCards();
    }
  };

  // Open Volunteer ID Card Modal
  window.openVolunteerIdCard = async function(volId) {
    try {
      const res = await fetch(`/api/admin/volunteers/${volId}/id-card`);
      const data = await res.json();
      if (!data.success || !data.volunteer) {
        alert(data.message || 'Failed to retrieve volunteer ID card data.');
        return;
      }
      currentIdCardData = data;
      renderIdCardCards();
      openModal('modalIdCard');
    } catch (err) {
      console.error(err);
      alert('Network error loading volunteer identity card.');
    }
  };

  // Open Staff ID Card Modal
  window.openStaffIdCard = async function(userId) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/id-card`);
      const data = await res.json();
      if (!data.success || !data.staff) {
        alert(data.message || 'Failed to retrieve staff ID card data.');
        return;
      }
      currentIdCardData = data;
      renderIdCardCards();
      openModal('modalIdCard');
    } catch (err) {
      console.error(err);
      alert('Network error loading staff identity card.');
    }
  };

  function renderIdCardCards() {
    const container = document.getElementById('idCardModalBody');
    if (!container || !currentIdCardData) return;

    const isStaff = currentIdCardData.card_type === 'staff';
    const b = currentIdCardData.branding || {};
    const meta = currentIdCardData.card_meta || {};
    const subject = isStaff ? currentIdCardData.staff : currentIdCardData.volunteer;

    const modalTitle = document.getElementById('idCardModalTitle');
    const modalSubtitle = document.getElementById('idCardModalSubtitle');
    if (modalTitle) {
      modalTitle.innerHTML = `<i class="fas fa-id-card"></i> ${isStaff ? 'Official Staff / Employee Identity Card' : 'Official Volunteer Identity Card'}`;
    }
    if (modalSubtitle) {
      modalSubtitle.textContent = `${subject.full_name || 'Member'} • ${isStaff ? subject.employee_id : subject.reference_no} • Qasr-e-Shabbir Foundation`;
    }

    const cardClass = isStaff ? 'id-card-staff' : 'id-card-volunteer';
    const roleBadgeClass = isStaff ? 'id-card-role-staff' : 'id-card-role-volunteer';
    const roleBadgeTextEn = isStaff ? (subject.role_name_en || subject.role_title_en || 'OFFICIAL STAFF').toUpperCase() : (subject.badge_label_en || 'HONORARY VOLUNTEER');
    const roleBadgeTextUr = isStaff ? (subject.role_name_ur || subject.role_title_ur || 'ملازم و عملہ') : (subject.badge_label_ur || 'فلاحی رضاکار');
    const idLabel = isStaff ? 'EMP ID' : 'REF ID';
    const idValue = isStaff ? subject.employee_id : subject.reference_no;
    const deptValue = subject.department_name_en || subject.department || (isStaff ? 'Executive Administration' : 'Community Welfare & Relief');
    const desigValue = subject.designation_name_en || subject.designation || (isStaff ? 'Staff Member' : 'Field Volunteer');
    const roleValue = subject.role_name_en || (isStaff ? (subject.role_title_en || 'Staff') : 'Volunteer');

    const photoSrc = subject.photo_url || '';
    const initials = (subject.full_name || 'Q').charAt(0).toUpperCase();

    const photoHtml = photoSrc
      ? `<img src="${escapeHtml(photoSrc)}" alt="${escapeHtml(subject.full_name)}" class="id-card-photo-img" onerror="this.outerHTML='<div class=\\'id-card-photo-placeholder\\'>${initials}</div>';" />`
      : `<div class="id-card-photo-placeholder"><i class="fas fa-user" style="font-size:1.8rem;margin-bottom:4px;"></i><span>${initials}</span></div>`;

    const stampImg = b.stamp_url
      ? `<img src="${escapeHtml(b.stamp_url)}" alt="Official Stamp" class="id-card-official-stamp" onerror="this.style.display='none';" />`
      : '';

    const watermarkImg = b.logo_url
      ? `<img src="${escapeHtml(b.logo_url)}" alt="Seal" class="id-card-watermark-seal" onerror="this.style.display='none';" />`
      : '';

    // Generate Barcode simulation bars
    const hash = meta.security_hash || `QSF-${Date.now()}`;
    const barcodeBars = hash.split('').map((ch, i) => {
      const code = ch.charCodeAt(0);
      const width = (code % 3) + 1.2;
      return `<div class="barcode-bar" style="width: ${width}px;"></div>`;
    }).join('');

    const assignedSig = currentIdCardData.signature;

    // FRONT CARD HTML (Standard CNIC-like horizontal 85.6mm x 54mm card format)
    const frontCardHtml = `
      <div class="id-card-box ${cardClass}" id="idCardFrontSide">
        ${watermarkImg}
        ${stampImg}

        <!-- Header -->
        <div class="id-card-header">
          <img src="${escapeHtml(b.logo_url || '/media/branding/logo.svg')}" alt="Logo" class="id-card-header-logo" onerror="this.src='/media/branding/logo.svg';" />
          <div class="id-card-header-titles">
            <div class="id-card-foundation-name-en">${escapeHtml(b.foundation_name_en || 'QASR-E-SHABBIR FOUNDATION')}</div>
            <div class="id-card-foundation-tagline">${escapeHtml(b.tagline_en || 'EMPOWERING COMMUNITIES • RESTORING HOPE')}</div>
            <div class="id-card-foundation-name-ur">${escapeHtml(b.foundation_name_ur || 'قصرِ شبیر فاؤنڈیشن')}</div>
          </div>
        </div>

        <!-- Role Ribbon -->
        <div class="id-card-role-ribbon">
          <span>${escapeHtml(roleBadgeTextEn)}</span>
          <span style="font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 0.72rem; font-weight: 700;">${escapeHtml(roleBadgeTextUr)}</span>
        </div>

        <!-- Card Body -->
        <div class="id-card-body">
          <div class="id-card-photo-wrapper">
            ${photoHtml}
          </div>

          <div class="id-card-info">
            <div style="margin-bottom: 3px;">
              <div class="id-card-name">${escapeHtml(subject.full_name || 'Cardholder')}</div>
              <div class="id-card-designation" style="font-size: 0.72rem; color: var(--admin-primary); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(desigValue)}
              </div>
            </div>

            <table class="id-card-meta-table">
              <tr>
                <td class="id-card-meta-label">${idLabel}:</td>
                <td class="id-card-meta-value mono">${escapeHtml(idValue)}</td>
              </tr>
              <tr>
                <td class="id-card-meta-label">Department:</td>
                <td class="id-card-meta-value" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; font-size: 0.65rem;" title="${escapeHtml(deptValue)}">${escapeHtml(deptValue)}</td>
              </tr>
              <tr>
                <td class="id-card-meta-label">Role:</td>
                <td class="id-card-meta-value" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; font-size: 0.65rem;" title="${escapeHtml(roleValue)}">${escapeHtml(roleValue)}</td>
              </tr>
              <tr>
                <td class="id-card-meta-label">Valid Thru:</td>
                <td class="id-card-meta-value" style="color: #B91C1C;">${escapeHtml(meta.valid_thru || 'Dec 2027')}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div class="id-card-footer">
          <div style="display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-shield-halved" style="color: var(--admin-primary); font-size: 0.7rem;"></i>
            <span>Verified Official Credential</span>
          </div>
          ${assignedSig && assignedSig.signature_url ? `
            <div class="id-card-assigned-signature">
              <img src="${escapeHtml(assignedSig.signature_url)}" alt="Official Signature" class="id-card-signature-img" onerror="this.style.display='none';" />
              <div class="id-card-signature-signer">
                <span>${escapeHtml(assignedSig.name)}</span>
                <small>${escapeHtml(assignedSig.designation || 'Authorized Signatory')}</small>
              </div>
            </div>
          ` : `
            <div class="id-card-signature-line">
              Authorized Signatory / مجاز دستخط
            </div>
          `}
        </div>
      </div>
    `;

    // BACK CARD HTML
    const backCardHtml = `
      <div class="id-card-box ${cardClass}" id="idCardBackSide">
        ${watermarkImg}

        <!-- Header -->
        <div class="id-card-header" style="padding: 5px 14px 4px;">
          <img src="${escapeHtml(b.logo_url || '/media/branding/logo.svg')}" alt="Logo" class="id-card-header-logo" style="width: 30px; height: 30px;" onerror="this.src='/media/branding/logo.svg';" />
          <div class="id-card-header-titles">
            <div class="id-card-foundation-name-en" style="font-size: 0.76rem;">${escapeHtml(b.foundation_name_en || 'QASR-E-SHABBIR FOUNDATION')}</div>
            <div class="id-card-foundation-tagline" style="font-size: 0.54rem; color: #FECDD3;">${escapeHtml(b.tagline_en || 'EMPOWERING COMMUNITIES • RESTORING HOPE')}</div>
          </div>
        </div>

        <!-- Back Body -->
        <div class="id-card-back-body">
          <div>
            <div class="id-card-terms-text">
              <strong>Official Notice:</strong> This identity card is the property of Qasr-e-Shabir Foundation. The bearer is authorized to represent the organization in accordance with their designated role. If found, please return to our central office or mail to the address below.
            </div>
            <div class="id-card-terms-text-ur">
              یہ شناختی کارڈ قصرِ شبیر فاؤنڈیشن کی باقاعدہ ملکیت ہے۔ حاملِ کارڈ اپنے تفویض کردہ فلاحی امور میں فاؤنڈیشن کی نمائندگی کا مجاز ہے۔ گمشدہ ملنے پر قریبی دفتر یا نیچے درج پتہ پر ارسال فرمائیں۔
            </div>
          </div>

          <div class="id-card-contact-box">
            <div><strong>Central Office:</strong> ${escapeHtml(b.address_en || 'Anjuman-e-Hussainia Anwaria Town Jalandhar Parachinar')}</div>
            <div style="direction: rtl; font-family: 'Noto Nastaliq Urdu', Tahoma, sans-serif; font-size: 0.60rem; color: #475569; margin: 2px 0;">
              ${escapeHtml(b.address_ur || 'انجمن حسینیہ انواریہ ٹاؤن جالندھر پاراچنار')}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 3px; font-weight: 600;">
              <span><i class="fas fa-phone"></i> ${escapeHtml(b.phone || '+92 300 0817702')}</span>
              <span><i class="fas fa-envelope"></i> ${escapeHtml(b.email || 'admin@qesf.org.pk')}</span>
            </div>
          </div>

          <div class="id-card-barcode-strip">
            <div class="id-card-barcode-lines">
              ${barcodeBars}
            </div>
            <div style="text-align: right;">
              <div class="id-card-security-hash">${escapeHtml(meta.security_hash || 'QSF-SECURE')}</div>
              <div style="font-size: 0.52rem; color: #94A3B8;">CR80 Standard ID Specification</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wrap each card in print container to maintain exact CR80 physical proportions
    const frontCardWrapped = `<div class="id-card-print-container">${frontCardHtml}</div>`;
    const backCardWrapped = `<div class="id-card-print-container">${backCardHtml}</div>`;

    // Render based on view mode
    let contentHtml = '<div class="id-card-display-grid id-card-printable-area">';
    if (currentIdCardViewMode === 'dual') {
      contentHtml += frontCardWrapped + backCardWrapped;
    } else if (currentIdCardViewMode === 'front') {
      contentHtml += frontCardWrapped;
    } else if (currentIdCardViewMode === 'back') {
      contentHtml += backCardWrapped;
    }
    contentHtml += '</div>';

    container.innerHTML = contentHtml;
  }

  // Print ID Card
  window.printIdCard = function() {
    if (!currentIdCardData) {
      alert('No identity card loaded to print.');
      return;
    }
    document.body.classList.add('printing-id-card');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-id-card');
      }, 500);
    }, 150);
  };

  // Download ID Card PDF
  window.downloadIdCardPdf = function() {
    if (!currentIdCardData) {
      alert('No identity card loaded.');
      return;
    }
    alert('PDF Export Instructions:\n\n1. The system print preview will open now.\n2. In the "Destination" dropdown, choose "Save as PDF".\n3. Set Margins to "None" or "Default" and ensure "Background graphics" is checked.\n4. Click "Save" to save your official CR80 Identity Card in high-resolution PDF format.');
    printIdCard();
  };

  // Save Card as High-Resolution Image (PNG)
  window.downloadIdCardImage = async function(side = 'both') {
    if (!currentIdCardData) {
      alert('No identity card loaded to save.');
      return;
    }

    if (typeof html2canvas !== 'function') {
      alert('Image generation engine is initializing. Please try again in a few moments, or use Print / Download PDF.');
      return;
    }

    const subject = currentIdCardData.subject || {};
    const isStaff = currentIdCardData.type === 'staff';
    const idValue = isStaff ? (subject.employee_id || 'STAFF') : (subject.reference_no || 'VOL');
    const safeName = (subject.full_name || 'Cardholder').replace(/[^a-zA-Z0-9_-]/g, '_');

    // Ensure both cards exist in DOM if user wants both or back
    const originalViewMode = currentIdCardViewMode;
    if (side === 'both' && originalViewMode !== 'dual') {
      currentIdCardViewMode = 'dual';
      renderIdCardCards();
    }

    const captureElement = async (el, sideLabel) => {
      if (!el) return;
      try {
        const canvas = await html2canvas(el, {
          scale: 3, // 300+ DPI high resolution
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FFFFFF',
          logging: false
        });
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = `QSF_${sideLabel}_${safeName}_${idValue}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error saving image:', err);
        alert('Could not save ' + sideLabel + ' image: ' + err.message);
      }
    };

    const frontEl = document.getElementById('idCardFrontSide');
    const backEl = document.getElementById('idCardBackSide');

    if (side === 'front') {
      if (frontEl) await captureElement(frontEl, 'Front');
    } else if (side === 'back') {
      if (backEl) await captureElement(backEl, 'Back');
    } else {
      // Both sides
      if (frontEl) await captureElement(frontEl, 'Front');
      if (backEl) {
        setTimeout(async () => {
          await captureElement(backEl, 'Back');
          if (originalViewMode !== 'dual') {
            currentIdCardViewMode = originalViewMode;
            renderIdCardCards();
          }
        }, 350);
      }
    }
  };

  // ==================== UNIVERSAL MEDIA LIBRARY & ASSET PICKER ====================
  let currentMediaPickerOptions = {
    folder: 'all',
    onSelect: null
  };
  let allMediaLibraryItems = [];

  window.openMediaPicker = async function(options = {}) {
    currentMediaPickerOptions = {
      folder: options.folder || 'all',
      onSelect: typeof options.onSelect === 'function' ? options.onSelect : null
    };

    // Set active tab in modal
    const folderTabs = document.querySelectorAll('#mediaLibraryFolderTabs button');
    folderTabs.forEach(btn => {
      if (btn.dataset.folder === currentMediaPickerOptions.folder) {
        btn.className = 'btn-admin btn-admin-primary';
      } else {
        btn.className = 'btn-admin btn-admin-secondary';
      }
    });

    const searchInput = document.getElementById('mediaLibrarySearchInput');
    if (searchInput) searchInput.value = '';

    openModal('modalMediaLibrary');
    await loadMediaLibraryAssets(currentMediaPickerOptions.folder);
  };

  window.setMediaPickerFolder = async function(folder) {
    currentMediaPickerOptions.folder = folder;
    const folderTabs = document.querySelectorAll('#mediaLibraryFolderTabs button');
    folderTabs.forEach(btn => {
      if (btn.dataset.folder === folder) {
        btn.className = 'btn-admin btn-admin-primary';
      } else {
        btn.className = 'btn-admin btn-admin-secondary';
      }
    });
    const searchInput = document.getElementById('mediaLibrarySearchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    await loadMediaLibraryAssets(folder, query);
  };

  async function loadMediaLibraryAssets(folder = 'all', searchQuery = '') {
    const grid = document.getElementById('mediaLibraryGrid');
    const statusText = document.getElementById('mediaLibraryStatusText');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748B;"><i class="fas fa-spinner fa-spin fa-2x"></i><div style="margin-top: 10px;">Loading media assets...</div></div>';

    try {
      const url = `/api/admin/media-library?folder=${encodeURIComponent(folder)}&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.success || !Array.isArray(data.files) || data.files.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748B;"><i class="fas fa-images fa-2x" style="opacity: 0.4;"></i><div style="margin-top: 10px;">No images found in this folder.</div></div>';
        if (statusText) statusText.textContent = '0 assets found';
        return;
      }

      allMediaLibraryItems = data.files;
      if (statusText) statusText.textContent = `Showing ${data.files.length} media assets`;

      grid.innerHTML = data.files.map(item => `
        <div class="media-library-card" onclick="selectMediaItem('${escapeHtml(item.url)}')" style="border: 1px solid #CBD5E1; border-radius: 8px; overflow: hidden; background: #FFFFFF; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; position: relative;">
          <div style="height: 100px; background: #F8FAFC; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.filename)}" loading="lazy" style="max-width: 100%; max-height: 100%; object-fit: cover;" onerror="this.src='/img/placeholder.png'" />
          </div>
          <div style="padding: 6px 8px; font-size: 0.72rem; border-top: 1px solid #F1F5F9; background: #FFFFFF;">
            <div style="font-weight: 600; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</div>
            <div style="display: flex; justify-content: space-between; color: #64748B; font-size: 0.68rem; margin-top: 2px;">
              <span>${escapeHtml(item.folder)}</span>
              <span>${escapeHtml(item.sizeFormatted || '')}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #DC2626;"><i class="fas fa-triangle-exclamation fa-2x"></i><div style="margin-top: 10px;">Error loading media library.</div></div>';
    }
  }

  window.selectMediaItem = function(url) {
    if (typeof currentMediaPickerOptions.onSelect === 'function') {
      currentMediaPickerOptions.onSelect(url);
    }
    closeModal('modalMediaLibrary');
  };

  let mediaSearchDebounce = null;
  window.onMediaLibrarySearch = function(query) {
    clearTimeout(mediaSearchDebounce);
    mediaSearchDebounce = setTimeout(() => {
      loadMediaLibraryAssets(currentMediaPickerOptions.folder, (query || '').trim());
    }, 250);
  };

  // Direct upload from Media Library modal file input
  window.handleMediaLibraryDirectUpload = async function(inputEl) {
    if (!inputEl.files || inputEl.files.length === 0) return;
    const file = inputEl.files[0];
    const formData = new FormData();
    formData.append('image', file);
    const targetFolder = (currentMediaPickerOptions.folder && currentMediaPickerOptions.folder !== 'all') 
      ? currentMediaPickerOptions.folder 
      : 'uploads';
    formData.append('folder', targetFolder);

    const statusText = document.getElementById('mediaLibraryStatusText');
    if (statusText) statusText.textContent = 'Uploading and optimizing to WebP...';

    try {
      const res = await fetch(`/api/admin/upload?folder=${encodeURIComponent(targetFolder)}`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (result.success && result.url) {
        await loadMediaLibraryAssets(currentMediaPickerOptions.folder);
        if (typeof currentMediaPickerOptions.onSelect === 'function') {
          currentMediaPickerOptions.onSelect(result.url);
          closeModal('modalMediaLibrary');
        }
      } else {
        alert(result.message || 'Error uploading image.');
      }
    } catch (err) {
      alert('Upload failed due to connection error.');
    } finally {
      inputEl.value = '';
    }
  };

  // Universal Device File Uploader with automatic WebP conversion and target input update
  window.handleImageFileUpload = async function(inputEl, targetInputId, previewImgId, folder = 'uploads') {
    if (!inputEl.files || inputEl.files.length === 0) return;
    const file = inputEl.files[0];
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);

    const prevImg = document.getElementById(previewImgId);
    if (prevImg) prevImg.style.opacity = '0.5';

    try {
      const res = await fetch(`/api/admin/upload?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (result.success && result.url) {
        const urlInput = document.getElementById(targetInputId);
        if (urlInput) urlInput.value = result.url;
        if (prevImg) {
          prevImg.src = result.url;
          prevImg.style.display = 'block';
          prevImg.style.opacity = '1';
        }
        const placeholder = document.getElementById(previewImgId.replace('preview', 'placeholder'));
        if (placeholder) placeholder.style.display = 'none';
      } else {
        alert(result.message || 'Image upload failed.');
      }
    } catch (err) {
      alert('Error uploading image to server.');
    } finally {
      if (prevImg) prevImg.style.opacity = '1';
      inputEl.value = '';
    }
  };

  window.setProjectImage = function(url) {
    const urlInput = document.getElementById('proj_image_url');
    const previewImg = document.getElementById('proj_image_preview');
    if (urlInput) urlInput.value = url || '';
    if (previewImg && url) {
      previewImg.src = url;
      previewImg.style.display = 'block';
      const placeholder = document.getElementById('proj_image_placeholder');
      if (placeholder) placeholder.style.display = 'none';
    }
  };

  // =========================================================================
  // ANNOUNCEMENTS & MENU MANAGEMENT CLIENT LOGIC
  // =========================================================================
  let announcementsData = [];
  let menusData = [];

  // --- ANNOUNCEMENTS ---
  async function loadAnnouncements() {
    try {
      const tbody = document.getElementById('announcementsTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94A3B8; padding: 28px;"><i class="fas fa-spinner fa-spin"></i> Loading announcements...</td></tr>';

      const res = await fetch('/api/admin/announcements');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        announcementsData = data.data;
        renderAnnouncements(announcementsData);
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #EF4444; padding: 24px;">Failed to load announcements.</td></tr>';
      }
    } catch (err) {
      console.error('[loadAnnouncements Error]', err);
    }
  }

  function renderAnnouncements(items) {
    const tbody = document.getElementById('announcementsTableBody');
    if (!tbody) return;

    const metricTotal = document.getElementById('metricTotalAnnouncements');
    if (metricTotal) metricTotal.textContent = items ? items.length : 0;
    const metricActive = document.getElementById('metricActiveAnnouncements');
    if (metricActive) metricActive.textContent = items ? items.filter(a => a.is_active).length : 0;
    const metricInactive = document.getElementById('metricInactiveAnnouncements');
    if (metricInactive) metricInactive.textContent = items ? items.filter(a => !a.is_active).length : 0;

    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94A3B8; padding: 28px;">No announcements found. Click "Add New Announcement" to create one.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map((a, idx) => {
      const statusPill = a.is_active 
        ? '<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.76rem; font-weight: 700; background: #DCFCE7; color: #15803D;"><i class="fas fa-circle-check"></i> Active</span>'
        : '<span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.76rem; font-weight: 700; background: #FEE2E2; color: #B91C1C;"><i class="fas fa-circle-xmark"></i> Inactive</span>';

      const linkDisplay = a.link_url 
        ? `<a href="${a.link_url}" target="_blank" style="color: var(--admin-primary); font-weight: 600; text-decoration: underline; font-size: 0.85rem;"><i class="fas fa-link" style="margin-right: 4px;"></i>${escapeHtml(a.link_url)}</a>`
        : '<span style="color: #94A3B8; font-size: 0.82rem;">None (Text only)</span>';

      return `
        <tr>
          <td style="color: #64748B; font-weight: 600;">${idx + 1}</td>
          <td>
            <div style="font-weight: 600; color: var(--admin-text-dark); margin-bottom: 4px; font-size: 0.92rem;">
              ${escapeHtml(a.content_en)}
            </div>
            ${a.content_ur ? `<div class="urdu-text" dir="rtl" style="font-size: 0.88rem; color: #475569; line-height: 1.6;">${escapeHtml(a.content_ur)}</div>` : ''}
          </td>
          <td>${linkDisplay}</td>
          <td style="text-align: center; font-weight: 600; color: #475569;">#${a.sort_order || 0}</td>
          <td style="text-align: center;">${statusPill}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="btn-action-icon" onclick="toggleAnnouncement(${a.id})" title="${a.is_active ? 'Deactivate' : 'Activate'}" style="margin-right: 6px; color: ${a.is_active ? '#10B981' : '#94A3B8'};">
              <i class="fas ${a.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}" style="font-size: 1.35rem;"></i>
            </button>
            <button type="button" class="btn-action-icon" onclick="openAnnouncementModal(${a.id})" title="Edit Announcement" style="margin-right: 6px; color: #3B82F6;">
              <i class="fas fa-pencil"></i>
            </button>
            <button type="button" class="btn-action-icon" onclick="deleteAnnouncement(${a.id})" title="Delete Announcement" style="color: #EF4444;">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.filterAnnouncementsTable = function() {
    const q = (document.getElementById('announcementSearchInput')?.value || '').toLowerCase().trim();
    if (!q) {
      renderAnnouncements(announcementsData);
      return;
    }
    const filtered = announcementsData.filter(a => 
      (a.content_en && a.content_en.toLowerCase().includes(q)) ||
      (a.content_ur && a.content_ur.toLowerCase().includes(q)) ||
      (a.link_url && a.link_url.toLowerCase().includes(q))
    );
    renderAnnouncements(filtered);
  };

  window.openAnnouncementModal = function(id) {
    const titleEl = document.getElementById('announcementModalTitle');
    const form = document.getElementById('formAnnouncement');
    if (!form) return;
    form.reset();

    const editIdInput = document.getElementById('ann_edit_id');
    const contentEn = document.getElementById('ann_content_en');
    const contentUr = document.getElementById('ann_content_ur');
    const linkUrl = document.getElementById('ann_link_url');
    const sortOrder = document.getElementById('ann_sort_order');
    const isActive = document.getElementById('ann_is_active');

    if (id) {
      const a = announcementsData.find(item => item.id === parseInt(id, 10));
      if (a) {
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-bullhorn"></i> Edit Announcement';
        editIdInput.value = a.id;
        contentEn.value = a.content_en || '';
        contentUr.value = a.content_ur || '';
        linkUrl.value = a.link_url || '';
        sortOrder.value = a.sort_order || 0;
        isActive.checked = a.is_active === 1;
      }
    } else {
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-bullhorn"></i> Add New Announcement';
      editIdInput.value = '';
      sortOrder.value = announcementsData.length + 1;
      isActive.checked = true;
    }

    openModal('modalAnnouncement');
  };

  window.handleAnnouncementSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveAnnouncement');
    const originalText = btn ? btn.innerHTML : 'Save';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
      const editId = document.getElementById('ann_edit_id')?.value;
      const content_en = document.getElementById('ann_content_en')?.value?.trim();
      const content_ur = document.getElementById('ann_content_ur')?.value?.trim();
      const link_url = document.getElementById('ann_link_url')?.value?.trim();
      const sort_order = parseInt(document.getElementById('ann_sort_order')?.value, 10) || 0;
      const is_active = document.getElementById('ann_is_active')?.checked ? 1 : 0;

      const url = editId ? `/api/admin/announcements/${editId}` : '/api/admin/announcements';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_en, content_ur, link_url, sort_order, is_active })
      });
      const data = await res.json();

      if (data.success) {
        closeModal('modalAnnouncement');
        showToast('Announcement saved successfully!');
        loadAnnouncements();
      } else {
        alert(data.message || 'Error saving announcement');
      }
    } catch (err) {
      console.error('[handleAnnouncementSubmit]', err);
      alert('Network error while saving announcement.');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
    }
  };

  window.toggleAnnouncement = async function(id) {
    try {
      const res = await fetch(`/api/admin/announcements/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        loadAnnouncements();
      } else {
        alert(data.message || 'Error toggling announcement status.');
      }
    } catch (err) {
      console.error('[toggleAnnouncement]', err);
    }
  };

  window.deleteAnnouncement = async function(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Announcement deleted successfully.');
        loadAnnouncements();
      } else {
        alert(data.message || 'Error deleting announcement.');
      }
    } catch (err) {
      console.error('[deleteAnnouncement]', err);
    }
  };

  // --- DYNAMIC MENUS ---
  async function loadMenus() {
    try {
      const container = document.getElementById('menusContainer');
      if (container) container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94A3B8;"><i class="fas fa-spinner fa-spin"></i> Loading menus and assigned pages...</div>';

      const res = await fetch('/api/admin/menus');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        menusData = data.data;
        renderMenus(menusData);
      } else {
        if (container) container.innerHTML = '<div style="text-align: center; padding: 40px; color: #EF4444;">Failed to load menus.</div>';
      }
    } catch (err) {
      console.error('[loadMenus Error]', err);
    }
  }

  function renderMenus(menus) {
    const container = document.getElementById('menusContainer');
    if (!container) return;

    // Update Layout Preview labels
    const m1 = menus.find(m => m.row_num === 1 && m.col_side === 'left');
    const m2 = menus.find(m => m.row_num === 1 && m.col_side === 'right');
    const m3 = menus.find(m => m.row_num === 2 && m.col_side === 'left');
    const m4 = menus.find(m => m.row_num === 2 && m.col_side === 'right');

    const p1 = document.getElementById('previewMenu1Title');
    const p2 = document.getElementById('previewMenu2Title');
    const p3 = document.getElementById('previewMenu3Title');
    const p4 = document.getElementById('previewMenu4Title');

    if (p1) p1.innerText = m1 ? m1.title_en : 'Menu 1';
    if (p2) p2.innerText = m2 ? m2.title_en : 'Menu 2';
    if (p3) p3.innerText = m3 ? m3.title_en : 'Menu 3';
    if (p4) p4.innerText = m4 ? m4.title_en : 'Menu 4';

    const metricMenuItems = document.getElementById('metricTotalMenuItems');
    if (metricMenuItems) {
      let count = 0;
      if (Array.isArray(menus)) {
        menus.forEach(m => { if (Array.isArray(m.items)) count += m.items.length; });
      }
      metricMenuItems.textContent = count;
    }

    if (!menus || menus.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94A3B8;">No header menus found. Click "Create Menu" to get started.</div>';
      return;
    }

    container.innerHTML = menus.map(m => {
      const isRed = m.row_num === 1;
      const themeColor = isRed ? '#B91C1C' : '#1D4ED8';
      const themeBg = isRed ? 'rgba(185, 28, 28, 0.08)' : 'rgba(29, 78, 216, 0.08)';
      const slotLabel = `Row ${m.row_num} (${isRed ? 'Red' : 'Blue'}) • ${m.col_side === 'left' ? 'Left' : 'Right'} Side`;

      const statusBadge = m.is_active
        ? '<span style="background: #DCFCE7; color: #15803D; padding: 3px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700;"><i class="fas fa-check"></i> Active</span>'
        : '<span style="background: #FEE2E2; color: #B91C1C; padding: 3px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700;"><i class="fas fa-xmark"></i> Inactive</span>';

      const items = Array.isArray(m.items) ? m.items : [];

      const itemsListHtml = items.length === 0
        ? `<div style="text-align: center; padding: 18px 12px; color: #94A3B8; font-size: 0.84rem; background: #F8FAFC; border-radius: 8px; border: 1px dashed #CBD5E1;">
             No frontend pages assigned yet. Click <strong>"+ Assign Page"</strong> to link a page to this menu.
           </div>`
        : `<div style="display: flex; flex-direction: column; gap: 8px;">
            ${items.map((it, idx) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 0.74rem; font-weight: 700; color: #94A3B8; width: 16px;">#${idx + 1}</span>
                  <div>
                    <div style="font-size: 0.88rem; font-weight: 600; color: var(--admin-text-dark);">
                      ${escapeHtml(it.title_en)}
                      ${it.title_ur ? `<span class="urdu-text" style="font-size: 0.8rem; color: #64748B; margin-left: 6px;">(${escapeHtml(it.title_ur)})</span>` : ''}
                    </div>
                    <div style="font-size: 0.78rem; color: #64748B;">
                      <a href="${it.page_url}" target="_blank" style="color: var(--admin-primary); text-decoration: underline;">${escapeHtml(it.page_url)}</a>
                      ${it.open_new_tab ? '<span style="font-size: 0.7rem; color: #3B82F6; margin-left: 6px;"><i class="fas fa-arrow-up-right-from-square"></i> New Tab</span>' : ''}
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <button type="button" class="btn-action-icon" onclick="toggleMenuItem(${it.id})" title="${it.is_active ? 'Deactivate Link' : 'Activate Link'}" style="color: ${it.is_active ? '#10B981' : '#CBD5E1'};">
                    <i class="fas ${it.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                  </button>
                  <button type="button" class="btn-action-icon" onclick="openMenuItemModal(${m.id}, ${it.id})" title="Edit Link" style="color: #3B82F6;">
                    <i class="fas fa-pencil"></i>
                  </button>
                  <button type="button" class="btn-action-icon" onclick="deleteMenuItem(${it.id})" title="Remove Link" style="color: #EF4444;">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>`;

      return `
        <div class="admin-card" style="border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 4px 14px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
          <!-- Menu Card Header -->
          <div style="padding: 16px; border-bottom: 1px solid #EEF2F6; background: ${themeBg}; border-top: 4px solid ${themeColor}; border-top-left-radius: 12px; border-top-right-radius: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${themeColor};">
                <i class="fas fa-layer-group"></i> ${slotLabel}
              </span>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${statusBadge}
                <span style="font-size: 0.76rem; color: #64748B; font-weight: 600;">Order: #${m.sort_order || 0}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <h3 style="font-size: 1.18rem; font-weight: 800; color: var(--admin-text-dark); margin: 0;">${escapeHtml(m.title_en)}</h3>
                ${m.title_ur ? `<div class="urdu-text" dir="rtl" style="font-size: 0.95rem; color: #475569; margin-top: 2px;">${escapeHtml(m.title_ur)}</div>` : ''}
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <button type="button" class="btn-action-icon" onclick="toggleMenu(${m.id})" title="${m.is_active ? 'Deactivate Menu' : 'Activate Menu'}" style="color: ${m.is_active ? '#10B981' : '#CBD5E1'}; font-size: 1.3rem;">
                  <i class="fas ${m.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                </button>
                <button type="button" class="btn-action-icon" onclick="openMenuModal(${m.id})" title="Edit Menu Title & Position" style="color: #3B82F6;">
                  <i class="fas fa-pencil"></i>
                </button>
                <button type="button" class="btn-action-icon" onclick="deleteMenu(${m.id})" title="Delete Menu" style="color: #EF4444;">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Assigned Pages Section -->
          <div style="padding: 16px; flex: 1; display: flex; flex-direction: column;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-size: 0.82rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.03em;">
                Assigned Pages (${items.length})
              </span>
              <button type="button" class="btn-admin btn-admin-secondary" onclick="openMenuItemModal(${m.id})" style="padding: 3px 10px; font-size: 0.78rem;">
                <i class="fas fa-plus"></i> Assign Page
              </button>
            </div>
            ${itemsListHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  window.openMenuModal = function(id) {
    const titleEl = document.getElementById('menuModalTitle');
    const form = document.getElementById('formMenu');
    if (!form) return;
    form.reset();

    const editId = document.getElementById('menu_edit_id');
    const titleEn = document.getElementById('menu_title_en');
    const titleUr = document.getElementById('menu_title_ur');
    const rowNum = document.getElementById('menu_row_num');
    const colSide = document.getElementById('menu_col_side');
    const sortOrder = document.getElementById('menu_sort_order');
    const isActive = document.getElementById('menu_is_active');

    if (id) {
      const m = menusData.find(item => item.id === parseInt(id, 10));
      if (m) {
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-compass"></i> Edit Header Menu';
        editId.value = m.id;
        titleEn.value = m.title_en || '';
        titleUr.value = m.title_ur || '';
        rowNum.value = String(m.row_num || 1);
        colSide.value = m.col_side || 'left';
        sortOrder.value = m.sort_order || 0;
        isActive.checked = m.is_active === 1;
      }
    } else {
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-compass"></i> Create New Menu';
      editId.value = '';
      sortOrder.value = menusData.length + 1;
      isActive.checked = true;
    }

    openModal('modalMenu');
  };

  window.handleMenuSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveMenu');
    const originalText = btn ? btn.innerHTML : 'Save';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
      const editId = document.getElementById('menu_edit_id')?.value;
      const title_en = document.getElementById('menu_title_en')?.value?.trim();
      const title_ur = document.getElementById('menu_title_ur')?.value?.trim();
      const row_num = parseInt(document.getElementById('menu_row_num')?.value, 10) || 1;
      const col_side = document.getElementById('menu_col_side')?.value || 'left';
      const sort_order = parseInt(document.getElementById('menu_sort_order')?.value, 10) || 0;
      const is_active = document.getElementById('menu_is_active')?.checked ? 1 : 0;

      const url = editId ? `/api/admin/menus/${editId}` : '/api/admin/menus';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title_en, title_ur, row_num, col_side, sort_order, is_active })
      });
      const data = await res.json();

      if (data.success) {
        closeModal('modalMenu');
        showToast('Menu saved successfully!');
        loadMenus();
      } else {
        alert(data.message || 'Error saving menu');
      }
    } catch (err) {
      console.error('[handleMenuSubmit]', err);
      alert('Network error while saving menu.');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
    }
  };

  window.toggleMenu = async function(id) {
    try {
      const res = await fetch(`/api/admin/menus/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        loadMenus();
      } else {
        alert(data.message || 'Error toggling menu status.');
      }
    } catch (err) {
      console.error('[toggleMenu]', err);
    }
  };

  window.deleteMenu = async function(id) {
    if (!confirm('Are you sure you want to delete this menu and all its assigned page links?')) return;
    try {
      const res = await fetch(`/api/admin/menus/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Menu deleted successfully.');
        loadMenus();
      } else {
        alert(data.message || 'Error deleting menu.');
      }
    } catch (err) {
      console.error('[deleteMenu]', err);
    }
  };

  // --- MENU ITEMS (ASSIGNED PAGES) ---
  window.openMenuItemModal = function(menuId, itemId) {
    const titleEl = document.getElementById('menuItemModalTitle');
    const form = document.getElementById('formMenuItem');
    if (!form) return;
    form.reset();

    // Populate target menu selector
    const menuSelect = document.getElementById('item_menu_id');
    if (menuSelect) {
      menuSelect.innerHTML = menusData.map(m => `
        <option value="${m.id}" ${menuId && parseInt(menuId, 10) === m.id ? 'selected' : ''}>
          ${escapeHtml(m.title_en)} (Row ${m.row_num} • ${m.col_side})
        </option>
      `).join('');
    }

    const editIdInput = document.getElementById('menu_item_edit_id');
    const titleEn = document.getElementById('item_title_en');
    const titleUr = document.getElementById('item_title_ur');
    const pageUrl = document.getElementById('item_page_url');
    const sortOrder = document.getElementById('item_sort_order');
    const isActive = document.getElementById('item_is_active');
    const openNewTab = document.getElementById('item_open_new_tab');

    if (itemId) {
      let foundItem = null;
      menusData.forEach(m => {
        const it = (m.items || []).find(x => x.id === parseInt(itemId, 10));
        if (it) foundItem = it;
      });

      if (foundItem) {
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-link"></i> Edit Assigned Page';
        editIdInput.value = foundItem.id;
        if (menuSelect) menuSelect.value = foundItem.menu_id;
        titleEn.value = foundItem.title_en || '';
        titleUr.value = foundItem.title_ur || '';
        pageUrl.value = foundItem.page_url || '';
        sortOrder.value = foundItem.sort_order || 0;
        isActive.checked = foundItem.is_active === 1;
        openNewTab.checked = foundItem.open_new_tab === 1;
      }
    } else {
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-link"></i> Assign Page to Menu';
      editIdInput.value = '';
      sortOrder.value = 1;
      isActive.checked = true;
      openNewTab.checked = false;
    }

    openModal('modalMenuItem');
  };

  window.onSelectPagePreset = function(val) {
    if (!val) return;
    const select = document.getElementById('item_preset_page');
    const opt = select.options[select.selectedIndex];
    const en = opt.getAttribute('data-en') || '';
    const ur = opt.getAttribute('data-ur') || '';

    const titleEn = document.getElementById('item_title_en');
    const titleUr = document.getElementById('item_title_ur');
    const pageUrl = document.getElementById('item_page_url');

    if (titleEn) titleEn.value = en;
    if (titleUr) titleUr.value = ur;
    if (pageUrl) pageUrl.value = val;
  };

  window.handleMenuItemSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveMenuItem');
    const originalText = btn ? btn.innerHTML : 'Save';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

    try {
      const editId = document.getElementById('menu_item_edit_id')?.value;
      const menu_id = document.getElementById('item_menu_id')?.value;
      const title_en = document.getElementById('item_title_en')?.value?.trim();
      const title_ur = document.getElementById('item_title_ur')?.value?.trim();
      const page_url = document.getElementById('item_page_url')?.value?.trim();
      const sort_order = parseInt(document.getElementById('item_sort_order')?.value, 10) || 0;
      const is_active = document.getElementById('item_is_active')?.checked ? 1 : 0;
      const open_new_tab = document.getElementById('item_open_new_tab')?.checked ? 1 : 0;

      const url = editId ? `/api/admin/menu-items/${editId}` : `/api/admin/menus/${menu_id}/items`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id, title_en, title_ur, page_url, sort_order, is_active, open_new_tab })
      });
      const data = await res.json();

      if (data.success) {
        closeModal('modalMenuItem');
        showToast('Page link saved successfully!');
        loadMenus();
      } else {
        alert(data.message || 'Error saving page link');
      }
    } catch (err) {
      console.error('[handleMenuItemSubmit]', err);
      alert('Network error while saving page link.');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
    }
  };

  window.toggleMenuItem = async function(id) {
    try {
      const res = await fetch(`/api/admin/menu-items/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        loadMenus();
      } else {
        alert(data.message || 'Error toggling item status.');
      }
    } catch (err) {
      console.error('[toggleMenuItem]', err);
    }
  };

  window.deleteMenuItem = async function(id) {
    if (!confirm('Are you sure you want to remove this assigned page from the menu?')) return;
    try {
      const res = await fetch(`/api/admin/menu-items/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Page link removed.');
        loadMenus();
      } else {
        alert(data.message || 'Error deleting item.');
      }
    } catch (err) {
      console.error('[deleteMenuItem]', err);
    }
  };

  // =========================================================================
  // HERO SLIDES MANAGEMENT
  // =========================================================================
  let heroSlidesData = [];

  window.openMediaPickerForSlide = function() {
    if (typeof window.openMediaPicker === 'function') {
      window.openMediaPicker({
        folder: 'all',
        onSelect: (url) => {
          const input = document.getElementById('slide_image_url');
          const preview = document.getElementById('slideImagePreview');
          const placeholder = document.getElementById('slideImagePlaceholder');
          if (input) input.value = url;
          if (preview && url) {
            preview.src = url;
            preview.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
          }
        }
      });
    }
  };

  async function loadHeroSlides() {
    try {
      const container = document.getElementById('heroSlidesContainer');
      if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94A3B8;"><i class="fas fa-spinner fa-spin"></i> Loading hero slides...</div>';
      }
      const res = await fetch('/api/admin/hero-slides');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        heroSlidesData = data.data;
        renderHeroSlides(heroSlidesData);
      } else if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #EF4444;">Failed to load hero slides.</div>';
      }
    } catch (err) {
      console.error('[loadHeroSlides Error]', err);
    }
  }

  function renderHeroSlides(slides) {
    const container = document.getElementById('heroSlidesContainer');
    if (!container) return;

    const metricTotal = document.getElementById('metricTotalHeroSlides');
    if (metricTotal) metricTotal.textContent = slides ? slides.length : 0;
    const metricActive = document.getElementById('metricActiveHeroSlides');
    if (metricActive) metricActive.textContent = slides ? slides.filter(s => s.is_active).length : 0;

    if (!slides || slides.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94A3B8; grid-column: 1 / -1;">No hero slides found. Click "Add New Slide" to create one.</div>';
      return;
    }

    container.innerHTML = slides.map((s, idx) => {
      const hasContent = Boolean(s.title_en || s.subtitle_en || s.description_en || s.btn1_text_en || s.btn2_text_en);
      const title = s.title_en || s.title_ur || '(Clean Banner - No Text)';
      const activeBadge = s.is_active
        ? '<span style="background: #DCFCE7; color: #15803D; padding: 3px 10px; border-radius: 12px; font-size: 0.74rem; font-weight: 700;"><i class="fas fa-check"></i> Active</span>'
        : '<span style="background: #FEE2E2; color: #B91C1C; padding: 3px 10px; border-radius: 12px; font-size: 0.74rem; font-weight: 700;"><i class="fas fa-xmark"></i> Inactive</span>';

      return `
        <div class="admin-card" style="display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; border: 1px solid #E2E8F0; padding: 0;">
          <div style="position: relative; height: 160px; background: #0F172A; overflow: hidden;">
            <img src="${s.image_url}" alt="${escapeHtml(title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/media/branding/hero_bg.jpg'" />
            <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.65); color: #FFF; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">
              Slide #${s.sort_order || (idx + 1)}
            </div>
            <div style="position: absolute; top: 10px; right: 10px;">
              ${activeBadge}
            </div>
            <div style="position: absolute; bottom: 8px; left: 10px; background: ${hasContent ? '#1D4ED8' : '#059669'}; color: #FFF; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">
              ${hasContent ? '<i class="fas fa-heading"></i> With Text & Buttons' : '<i class="fas fa-image"></i> Clean Banner (No Text)'}
            </div>
          </div>
          <div style="padding: 16px; flex-grow: 1; display: flex; flex-direction: column;">
            <h4 style="font-size: 1.02rem; font-weight: 700; color: #1E293B; margin-bottom: 6px;">${escapeHtml(title)}</h4>
            ${s.subtitle_en ? `<p style="font-size: 0.82rem; color: #64748B; margin-bottom: 8px;">${escapeHtml(s.subtitle_en)}</p>` : ''}
            ${s.description_en ? `<p style="font-size: 0.8rem; color: #94A3B8; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(s.description_en)}</p>` : ''}
            
            <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid #F1F5F9; display: flex; align-items: center; justify-content: space-between;">
              <button type="button" class="btn-action-icon" onclick="toggleHeroSlide(${s.id})" title="${s.is_active ? 'Deactivate' : 'Activate'}" style="color: ${s.is_active ? '#10B981' : '#94A3B8'};">
                <i class="fas ${s.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}" style="font-size: 1.4rem;"></i>
              </button>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn-action-icon" onclick="openHeroSlideModal(${s.id})" title="Edit Slide" style="color: #3B82F6;">
                  <i class="fas fa-pencil"></i>
                </button>
                <button type="button" class="btn-action-icon" onclick="deleteHeroSlide(${s.id})" title="Delete Slide" style="color: #EF4444;">
                  <i class="fas fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.openHeroSlideModal = function(id) {
    const titleEl = document.getElementById('heroSlideModalTitle');
    const form = document.getElementById('formHeroSlide');
    if (!form) return;
    form.reset();

    const editId = document.getElementById('slide_edit_id');
    const imageUrl = document.getElementById('slide_image_url');
    const imageMobileUrl = document.getElementById('slide_image_mobile_url');
    const eyebrowEn = document.getElementById('slide_eyebrow_en');
    const eyebrowUr = document.getElementById('slide_eyebrow_ur');
    const titleEn = document.getElementById('slide_title_en');
    const titleUr = document.getElementById('slide_title_ur');
    const subtitleEn = document.getElementById('slide_subtitle_en');
    const subtitleUr = document.getElementById('slide_subtitle_ur');
    const descEn = document.getElementById('slide_description_en');
    const descUr = document.getElementById('slide_description_ur');
    const btn1TextEn = document.getElementById('slide_btn1_text_en');
    const btn1TextUr = document.getElementById('slide_btn1_text_ur');
    const btn1Link = document.getElementById('slide_btn1_link');
    const btn2TextEn = document.getElementById('slide_btn2_text_en');
    const btn2TextUr = document.getElementById('slide_btn2_text_ur');
    const btn2Link = document.getElementById('slide_btn2_link');
    const sortOrder = document.getElementById('slide_sort_order');
    const isActive = document.getElementById('slide_is_active');
    const preview = document.getElementById('slideImagePreview');
    const placeholder = document.getElementById('slideImagePlaceholder');

    if (id) {
      const s = heroSlidesData.find(x => x.id === parseInt(id, 10));
      if (s) {
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-images"></i> Edit Hero Slide';
        editId.value = s.id;
        imageUrl.value = s.image_url || '';
        imageMobileUrl.value = s.image_mobile_url || '';
        eyebrowEn.value = s.eyebrow_en || '';
        eyebrowUr.value = s.eyebrow_ur || '';
        titleEn.value = s.title_en || '';
        titleUr.value = s.title_ur || '';
        subtitleEn.value = s.subtitle_en || '';
        subtitleUr.value = s.subtitle_ur || '';
        descEn.value = s.description_en || '';
        descUr.value = s.description_ur || '';
        btn1TextEn.value = s.btn1_text_en || '';
        btn1TextUr.value = s.btn1_text_ur || '';
        btn1Link.value = s.btn1_link || '';
        btn2TextEn.value = s.btn2_text_en || '';
        btn2TextUr.value = s.btn2_text_ur || '';
        btn2Link.value = s.btn2_link || '';
        sortOrder.value = s.sort_order || 0;
        isActive.checked = s.is_active === 1;

        if (preview && s.image_url) {
          preview.src = s.image_url;
          preview.style.display = 'block';
          if (placeholder) placeholder.style.display = 'none';
        }
      }
    } else {
      if (titleEl) titleEl.innerHTML = '<i class="fas fa-images"></i> Add New Hero Slide';
      editId.value = '';
      sortOrder.value = heroSlidesData.length + 1;
      isActive.checked = true;
      if (preview) {
        preview.src = '';
        preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
      }
    }

    openModal('modalHeroSlide');
  };

  window.handleHeroSlideSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveHeroSlide');
    const origHtml = btn ? btn.innerHTML : 'Save';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
      const editId = document.getElementById('slide_edit_id')?.value;
      const payload = {
        image_url: document.getElementById('slide_image_url')?.value?.trim(),
        image_mobile_url: document.getElementById('slide_image_mobile_url')?.value?.trim() || null,
        eyebrow_en: document.getElementById('slide_eyebrow_en')?.value?.trim() || null,
        eyebrow_ur: document.getElementById('slide_eyebrow_ur')?.value?.trim() || null,
        title_en: document.getElementById('slide_title_en')?.value?.trim() || null,
        title_ur: document.getElementById('slide_title_ur')?.value?.trim() || null,
        subtitle_en: document.getElementById('slide_subtitle_en')?.value?.trim() || null,
        subtitle_ur: document.getElementById('slide_subtitle_ur')?.value?.trim() || null,
        description_en: document.getElementById('slide_description_en')?.value?.trim() || null,
        description_ur: document.getElementById('slide_description_ur')?.value?.trim() || null,
        btn1_text_en: document.getElementById('slide_btn1_text_en')?.value?.trim() || null,
        btn1_text_ur: document.getElementById('slide_btn1_text_ur')?.value?.trim() || null,
        btn1_link: document.getElementById('slide_btn1_link')?.value?.trim() || null,
        btn2_text_en: document.getElementById('slide_btn2_text_en')?.value?.trim() || null,
        btn2_text_ur: document.getElementById('slide_btn2_text_ur')?.value?.trim() || null,
        btn2_link: document.getElementById('slide_btn2_link')?.value?.trim() || null,
        sort_order: parseInt(document.getElementById('slide_sort_order')?.value, 10) || 0,
        is_active: document.getElementById('slide_is_active')?.checked ? 1 : 0
      };

      if (!payload.image_url) {
        alert('Desktop Slide Image URL is required.');
        return;
      }

      const url = editId ? `/api/admin/hero-slides/${editId}` : '/api/admin/hero-slides';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        closeModal('modalHeroSlide');
        showToast('Hero slide saved successfully!');
        loadHeroSlides();
      } else {
        alert(data.message || 'Error saving hero slide');
      }
    } catch (err) {
      console.error('[handleHeroSlideSubmit]', err);
      alert('Network error while saving hero slide.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  };

  window.toggleHeroSlide = async function(id) {
    try {
      const res = await fetch(`/api/admin/hero-slides/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        loadHeroSlides();
      } else {
        alert(data.message || 'Error toggling slide status.');
      }
    } catch (err) {
      console.error('[toggleHeroSlide]', err);
    }
  };

  window.deleteHeroSlide = async function(id) {
    if (!confirm('Are you sure you want to delete this hero slide?')) return;
    try {
      const res = await fetch(`/api/admin/hero-slides/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Hero slide deleted successfully.');
        loadHeroSlides();
      } else {
        alert(data.message || 'Error deleting hero slide.');
      }
    } catch (err) {
      console.error('[deleteHeroSlide]', err);
    }
  };

  window.loadAnnouncements = loadAnnouncements;
  window.loadMenus = loadMenus;
  window.loadHeroSlides = loadHeroSlides;
});


