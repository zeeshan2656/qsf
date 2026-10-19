/**
 * QASR-E-SHABBIR FOUNDATION - REUSABLE AUTO-TRANSLATE MODULE
 * Client-side helper for seamless, project-wide bilingual English -> Urdu form translation.
 * 
 * Capabilities:
 * 1. Automatic English -> Urdu translation on typing with 700ms debounce.
 * 2. Intelligent Manual Override tracking:
 *    - Manual typing in Urdu marks field as manual (stops auto-overwriting).
 *    - Clearing Urdu completely re-enables auto-translation.
 *    - Opening existing records preserves saved Urdu (never overwrites).
 * 3. Compact "Re-translate" button beside each Urdu field to force regeneration.
 * 4. In-flight request cancellation (AbortController) to avoid race conditions.
 * 5. Non-blocking error handling: forms never freeze or error out if offline.
 * 6. Auto-discovery via data attributes (data-translate-source / data-translate-target)
 *    and convention matching (*_en -> *_ur).
 */

(function (window, document) {
  'use strict';

  const DEBOUNCE_DELAY_MS = 700;
  const ENDPOINT_PRIMARY = '/api/translate';
  const ENDPOINT_FALLBACK = '/api/admin/translate';

  // Registry of paired bindings to prevent duplicate listeners
  const boundPairs = new WeakMap();

  const AutoTranslate = {
    /**
     * Translate text via server endpoint
     * @param {string} text - Source text
     * @param {object} options - { from, to, skipCache, signal }
     * @returns {Promise<{ success: boolean, translated: string, cached?: boolean, message?: string }>}
     */
    async translate(text, options = {}) {
      if (!text || !text.trim()) {
        return { success: true, original: '', translated: '' };
      }

      const payload = {
        text: text.trim(),
        from: options.from || 'en',
        to: options.to || 'ur',
        skipCache: !!options.skipCache
      };

      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: options.signal
      };

      try {
        let res = await fetch(ENDPOINT_PRIMARY, fetchOptions);
        if (res.status === 404) {
          // Fallback to /api/admin/translate if primary is routed differently
          res = await fetch(ENDPOINT_FALLBACK, fetchOptions);
        }
        const data = await res.json();
        return data;
      } catch (err) {
        if (err.name === 'AbortError') {
          return { aborted: true };
        }
        console.warn('[AutoTranslate] Service notice:', err.message);
        return {
          success: false,
          message: 'Translation temporarily unavailable. You can type Urdu manually.'
        };
      }
    },

    /**
     * Bind a source English input/textarea to an Urdu target input/textarea
     */
    bind(sourceEl, targetEl, options = {}) {
      if (!sourceEl || !targetEl) return null;
      if (boundPairs.has(targetEl)) return boundPairs.get(targetEl);

      // Ensure proper text direction & Urdu class on target
      targetEl.setAttribute('dir', 'rtl');
      if (!targetEl.classList.contains('urdu-text')) {
        targetEl.classList.add('urdu-text');
      }

      // If target has pre-existing value on bind, mark as manual/existing to protect saved data
      if (targetEl.value && targetEl.value.trim().length > 0) {
        targetEl.dataset.manualEdited = 'true';
      } else {
        targetEl.dataset.manualEdited = 'false';
      }

      // Inject UI (Re-translate button and status pill)
      const ui = this.injectUi(targetEl, sourceEl);

      let debounceTimer = null;
      let activeController = null;

      // Translation executor
      const executeTranslation = async (forceRetranslate = false) => {
        const text = sourceEl.value ? sourceEl.value.trim() : '';

        // If English is empty, clear Urdu if not manually edited
        if (!text) {
          if (!targetEl.dataset.manualEdited || targetEl.dataset.manualEdited === 'false') {
            targetEl.value = '';
            targetEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
          this.updateUiState(ui, 'idle');
          return;
        }

        // Cancel previous pending request
        if (activeController) {
          activeController.abort();
        }
        activeController = new AbortController();

        this.updateUiState(ui, 'translating');

        const res = await this.translate(text, {
          skipCache: forceRetranslate,
          signal: activeController.signal
        });

        if (res.aborted) return;

        if (res.success && typeof res.translated === 'string') {
          targetEl.value = res.translated;
          targetEl.dataset.manualEdited = 'false';
          targetEl.dispatchEvent(new Event('input', { bubbles: true }));
          targetEl.dispatchEvent(new Event('change', { bubbles: true }));
          this.updateUiState(ui, 'auto-success');
        } else {
          this.updateUiState(ui, 'error', res.message);
        }
      };

      // 1. Source Input Typing Listener (Debounced 700ms)
      sourceEl.addEventListener('input', () => {
        // If user manually edited Urdu, DO NOT overwrite it automatically
        if (targetEl.dataset.manualEdited === 'true') {
          return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          executeTranslation(false);
        }, DEBOUNCE_DELAY_MS);
      });

      // 2. Target Input Listener (Detects manual typing and clearing)
      targetEl.addEventListener('input', () => {
        const val = targetEl.value ? targetEl.value.trim() : '';
        if (val === '') {
          // If completely cleared, re-enable auto-translation mode
          targetEl.dataset.manualEdited = 'false';
          this.updateUiState(ui, 'idle');
          // If source has text, trigger fresh auto-translation after debounce
          if (sourceEl.value && sourceEl.value.trim().length > 0) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              executeTranslation(false);
            }, DEBOUNCE_DELAY_MS);
          }
        } else {
          // User typed or edited manually
          targetEl.dataset.manualEdited = 'true';
          this.updateUiState(ui, 'manual');
        }
      });

      // 3. Re-translate Button Click Listener
      if (ui.btn) {
        ui.btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          targetEl.dataset.manualEdited = 'false';
          executeTranslation(true);
        });
      }

      const instance = {
        source: sourceEl,
        target: targetEl,
        ui,
        retranslate: () => executeTranslation(true),
        markManual: () => {
          targetEl.dataset.manualEdited = 'true';
          this.updateUiState(ui, 'manual');
        },
        resetManual: () => {
          targetEl.dataset.manualEdited = 'false';
          this.updateUiState(ui, 'idle');
        }
      };

      boundPairs.set(targetEl, instance);
      return instance;
    },

    /**
     * Inject or find the Re-translate button and badge
     */
    injectUi(targetEl, sourceEl) {
      // Check if button already injected
      let btn = targetEl.parentNode.querySelector('.btn-retranslate');
      let badge = targetEl.parentNode.querySelector('.translate-status-badge');

      if (!btn) {
        // Look for corresponding label
        const targetId = targetEl.id;
        let label = targetId ? document.querySelector(`label[for="${targetId}"]`) : null;
        if (!label) {
          // Look for preceding sibling label or closest parent label
          let prev = targetEl.previousElementSibling;
          while (prev) {
            if (prev.tagName === 'LABEL') {
              label = prev;
              break;
            }
            prev = prev.previousElementSibling;
          }
          if (!label && targetEl.closest('.form-group, div')) {
            label = targetEl.closest('.form-group, div').querySelector('label');
          }
        }

        const uiContainer = document.createElement('div');
        uiContainer.className = 'translate-btn-group';
        uiContainer.innerHTML = `
          <span class="translate-status-badge" style="display: none;"></span>
          <button type="button" class="btn-retranslate" title="Re-translate from English" aria-label="Re-translate from English">
            <i class="fas fa-arrows-rotate btn-retranslate-icon"></i>
            <span>Re-translate</span>
          </button>
        `;

        btn = uiContainer.querySelector('.btn-retranslate');
        badge = uiContainer.querySelector('.translate-status-badge');

        if (label) {
          // Style label as flex container to align Re-translate button cleanly on right
          label.style.display = 'flex';
          label.style.alignItems = 'center';
          label.style.justifyContent = 'space-between';
          label.style.flexWrap = 'wrap';
          label.style.gap = '8px';
          label.appendChild(uiContainer);
        } else {
          // Place directly above the input element
          targetEl.parentNode.insertBefore(uiContainer, targetEl);
          uiContainer.style.marginBottom = '4px';
          uiContainer.style.display = 'flex';
          uiContainer.style.justifyContent = 'flex-end';
        }
      }

      // Initial state based on current value
      if (targetEl.dataset.manualEdited === 'true') {
        this.updateUiState({ btn, badge }, 'manual');
      }

      return { btn, badge };
    },

    /**
     * Update UI state (idle, translating, auto-success, manual, error)
     */
    updateUiState(ui, state, message = '') {
      if (!ui) return;
      const { btn, badge } = ui;

      if (btn) {
        if (state === 'translating') {
          btn.classList.add('translating');
          btn.disabled = true;
          const textSpan = btn.querySelector('span');
          if (textSpan) textSpan.textContent = 'Translating...';
        } else {
          btn.classList.remove('translating');
          btn.disabled = false;
          const textSpan = btn.querySelector('span');
          if (textSpan) textSpan.textContent = 'Re-translate';
        }
      }

      if (badge) {
        if (state === 'manual') {
          badge.textContent = 'Manual Edit';
          badge.className = 'translate-status-badge manual';
          badge.style.display = 'inline-block';
          badge.title = 'Manual edits are preserved. Click Re-translate to regenerate from English.';
        } else if (state === 'auto-success') {
          badge.textContent = 'Auto';
          badge.className = 'translate-status-badge auto';
          badge.style.display = 'inline-block';
          badge.title = 'Automatically translated from English.';
          setTimeout(() => {
            if (badge.textContent === 'Auto') {
              badge.style.display = 'none';
            }
          }, 4000);
        } else if (state === 'error') {
          badge.textContent = 'Offline';
          badge.className = 'translate-status-badge manual';
          badge.style.display = 'inline-block';
          badge.title = message || 'Auto-translation failed. Please type Urdu manually.';
        } else {
          badge.style.display = 'none';
        }
      }
    },

    /**
     * Mark all populated fields in a container as existing/manual
     * (Call when opening an edit modal with pre-existing record)
     */
    markAsExisting(container = document) {
      const root = typeof container === 'string' ? document.getElementById(container) : container;
      if (!root) return;

      root.querySelectorAll('input[dir="rtl"], textarea[dir="rtl"], .urdu-text').forEach(targetEl => {
        if (targetEl.value && targetEl.value.trim().length > 0) {
          targetEl.dataset.manualEdited = 'true';
          const binding = boundPairs.get(targetEl);
          if (binding) {
            this.updateUiState(binding.ui, 'manual');
          }
        }
      });
    },

    /**
     * Automatically scan and initialize all bilingual field pairs in the DOM
     */
    init(root = document) {
      const container = typeof root === 'string' ? document.querySelector(root) : root;
      if (!container) return;

      // 1. Explicit data-translate-target on source element
      container.querySelectorAll('[data-translate-target]').forEach(sourceEl => {
        const targetId = sourceEl.getAttribute('data-translate-target');
        const targetEl = document.getElementById(targetId) || container.querySelector(`[name="${targetId}"]`);
        if (targetEl) {
          this.bind(sourceEl, targetEl);
        }
      });

      // 2. Explicit data-translate-source on target element
      container.querySelectorAll('[data-translate-source]').forEach(targetEl => {
        const sourceId = targetEl.getAttribute('data-translate-source');
        const sourceEl = document.getElementById(sourceId) || container.querySelector(`[name="${sourceId}"]`);
        if (sourceEl) {
          this.bind(sourceEl, targetEl);
        }
      });

      // 3. Automatic Convention Pairing for *_en and *_ur IDs
      container.querySelectorAll('input[id$="_en"], textarea[id$="_en"]').forEach(sourceEl => {
        const urduId = sourceEl.id.replace(/_en$/, '_ur');
        const targetEl = document.getElementById(urduId);
        if (targetEl) {
          this.bind(sourceEl, targetEl);
        }
      });

      // 4. Special cases with standard IDs (e.g. user_designation -> user_designation_ur)
      const specialPairs = [
        ['user_designation', 'user_designation_ur'],
        ['man_vol_designation', 'man_vol_designation_ur'],
        ['edit_vol_designation', 'edit_vol_designation_ur']
      ];
      specialPairs.forEach(([sId, tId]) => {
        const s = document.getElementById(sId);
        const t = document.getElementById(tId);
        if (s && t) {
          this.bind(s, t);
        }
      });
    }
  };

  // Standing rule: Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AutoTranslate.init());
  } else {
    AutoTranslate.init();
  }

  // Observe dynamically opened modals and attach bindings seamlessly
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const target = m.target;
        if (target.classList.contains('active') || target.classList.contains('show') || target.style.display === 'flex' || target.style.display === 'block') {
          AutoTranslate.init(target);
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.admin-modal-overlay, .modal').forEach(modal => {
      observer.observe(modal, { attributes: true });
    });
  });

  // Expose to global window
  window.AutoTranslate = AutoTranslate;

})(window, document);
