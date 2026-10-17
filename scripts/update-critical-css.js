const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const rawCritical = `
@font-face {
  font-family: 'Font Awesome 6 Free';
  font-style: normal;
  font-weight: 900;
  font-display: swap;
  src: url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2") format("woff2");
}

:root {
  --primary: #B91C1C;
  --primary-hover: #991B1B;
  --primary-deep: #7F1D1D;
  --primary-dark: #4C0519;
  --primary-light: #EF4444;
  --accent-blue: #1D4ED8;
  --accent-blue-hover: #1E40AF;
  --accent-blue-light: #EFF6FF;
  --accent-blue-border: #BFDBFE;
  --accent-gold: #D97706;
  --accent-red: #B91C1C;
  --accent-teal: #1D4ED8;
  --bg-tint: #FFF1F2;
  --bg-mint: #FFF1F2;
  --bg-ivory: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-dark: #2B050E;
  --text-dark: #0F172A;
  --text-body: #334155;
  --text-muted: #64748B;
  --border-light: #E2E8F0;
  --border-mint: #FECDD3;
  --border-tint: #FECDD3;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 14px rgba(185, 28, 28, 0.08);
  --shadow-lg: 0 10px 25px rgba(185, 28, 28, 0.12);
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --font-en-title: "Outfit", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-en-body: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-ur: "Noto Nastaliq Urdu", Tahoma, sans-serif;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-en-body);
  background-color: #fafafa;
  color: var(--text-body);
  line-height: 1.6;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
  text-decoration: none;
  transition: var(--transition);
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

button, input, select, textarea {
  font-family: inherit;
  font-size: inherit;
}

.container {
  width: 100%;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: clamp(16px, 3.5vw, 48px);
  padding-right: clamp(16px, 3.5vw, 48px);
}

/* 1. TOP ANNOUNCEMENT BAR */
.announcement-bar {
  background: #000000;
  color: #FFFFFF;
  min-height: 40px;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 105;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.announcement-container {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 clamp(12px, 3vw, 36px);
  gap: 14px;
}

.announcement-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #B91C1C;
  color: #FFFFFF;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(185, 28, 28, 0.4);
}

.announcement-badge i {
  font-size: 0.8rem;
}

.announcement-ticker-track {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  position: relative;
  display: flex;
  align-items: center;
}

.announcement-marquee-content {
  display: inline-flex;
  align-items: center;
  gap: 48px;
  white-space: nowrap;
  will-change: transform;
}

.announcement-marquee-content.marquee-ltr {
  animation: scroll-ltr 32s linear infinite;
}

.announcement-marquee-content.marquee-rtl {
  animation: scroll-rtl 32s linear infinite;
}

.announcement-bar:hover .announcement-marquee-content {
  animation-play-state: paused;
}

@keyframes scroll-ltr {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0%); }
}

@keyframes scroll-rtl {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}

.announcement-item-link {
  color: #FFFFFF;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s ease;
}

.announcement-item-link:hover {
  color: #FCA5A5;
  text-decoration: underline;
}

.announcement-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: auto;
}

.announcement-lang-toggle {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 2px 4px;
}

.announcement-lang-toggle .lang-btn {
  color: #E2E8F0;
  font-size: 0.74rem;
  padding: 3px 8px;
  border-radius: 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: var(--transition);
}

.announcement-lang-toggle .lang-btn.active {
  background: #B91C1C;
  color: #FFFFFF;
}

/* 2. DESKTOP DUAL-ROW HEADER (CIRCULAR ONLY, INLINE MENUS) */
.header-dual-menu-wrap {
  display: block;
  width: 100%;
  background: transparent;
  position: relative;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.header-dual-container {
  position: relative;
  width: 100%;
}

.nav-row-red {
  background: #B91C1C;
  min-height: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  width: 100%;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.22);
}

.nav-row-blue {
  background: #1D4ED8;
  min-height: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  width: 100%;
}

.nav-slot,
.nav-slot-left,
.nav-slot-right {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
  min-width: 0;
}

.nav-slot-left {
  justify-content: flex-end;
  padding-right: 68px;
  padding-left: 24px;
}

.nav-slot-right {
  justify-content: flex-start;
  padding-left: 68px;
  padding-right: 24px;
}

body.urdu .nav-slot-left {
  justify-content: flex-start;
  padding-left: 68px;
  padding-right: 24px;
}

body.urdu .nav-slot-right {
  justify-content: flex-end;
  padding-right: 68px;
  padding-left: 24px;
}

.nav-center-emblem-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 30;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.nav-emblem-link {
  display: block;
  text-decoration: none;
  border-radius: 50%;
  transition: transform 0.25s ease;
}

.nav-emblem-link:hover {
  transform: scale(1.06);
}

.nav-emblem-circle {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 3.5px solid #FFFFFF;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  overflow: hidden;
  position: relative;
}

.nav-emblem-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  border-radius: 50%;
}

.nav-inline-group {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: nowrap;
}

.nav-inline-link {
  color: #FFFFFF !important;
  font-family: var(--font-en-title);
  font-size: clamp(0.88rem, 1.1vw, 1.02rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  padding: 7px 14px;
  border-radius: 6px;
  text-decoration: none !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
}

.nav-inline-link:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.nav-inline-link:after {
  content: "";
  position: absolute;
  bottom: 2px;
  left: 12px;
  right: 12px;
  height: 2px;
  background: #FFFFFF;
  opacity: 0;
  transform: scaleX(0);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.nav-inline-link:hover:after,
.nav-inline-link.active:after {
  opacity: 0.95;
  transform: scaleX(1);
}

body.urdu .nav-inline-link {
  font-family: var(--font-ur);
  font-size: 1.05rem;
  line-height: 1.6;
}

/* 3. MOBILE SITE HEADER */
.mobile-site-header {
  display: none;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  padding: 0 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #EEF2F6;
  width: 100%;
}

.mobile-brand-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.mobile-brand-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.mobile-brand-title {
  display: flex;
  flex-direction: column;
}

.mobile-title-main {
  font-family: var(--font-en-title);
  font-size: 1.05rem;
  font-weight: 800;
  color: #7F1D1D;
  line-height: 1.2;
}

.mobile-title-sub {
  font-size: 0.68rem;
  font-weight: 600;
  color: #64748B;
  letter-spacing: 0.04em;
}

.mobile-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-hamburger-btn {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: #FFF1F2;
  border: 1px solid #FECDD3;
  color: #B91C1C;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mobile-nav-drawer {
  position: fixed;
  top: 0;
  right: -320px;
  width: 300px;
  max-width: 85vw;
  height: 100vh;
  background: #FFFFFF;
  box-shadow: -4px 0 25px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow-y: auto;
}

body.urdu .mobile-nav-drawer {
  right: auto;
  left: -320px;
  transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.mobile-nav-drawer.open {
  right: 0;
}

body.urdu .mobile-nav-drawer.open {
  left: 0;
}

.mobile-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.mobile-drawer-backdrop.active {
  opacity: 1;
  visibility: visible;
}

@media (max-width: 900px) {
  .header-dual-menu-wrap {
    display: none !important;
  }
  .mobile-site-header {
    display: flex !important;
  }
}

/* 4. HERO SECTION & MULTI-SLIDE CAROUSEL */
.hero-slider-wrap {
  position: relative;
  overflow: hidden;
  min-height: 540px;
  background: #1B0308;
  color: #FFFFFF;
  contain: layout style;
}

.hero-slider-track {
  position: relative;
  width: 100%;
  min-height: 540px;
}

.hero-slide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.75s ease-in-out, visibility 0.75s ease-in-out;
  display: flex;
  align-items: center;
  z-index: 1;
  contain: layout style;
}

.hero-slide.active {
  opacity: 1;
  visibility: visible;
  position: relative;
  z-index: 2;
}

.hero-backdrop-image {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 1;
}

.hero-backdrop-image picture,
.hero-backdrop-image img,
.hero-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center right;
  display: block;
}

.hero-bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(27, 3, 8, 0.96) 0%, rgba(27, 3, 8, 0.86) 44%, rgba(27, 3, 8, 0.3) 72%, rgba(27, 3, 8, 0.1) 100%);
  z-index: 2;
  pointer-events: none;
}

.hero-layout {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 3;
  min-height: 480px;
  contain: layout style;
  padding: 60px 0;
}

.hero-content-card {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 10px 0;
  max-width: 640px;
  position: relative;
  z-index: 3;
  contain: layout style;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #FCA5A5;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.hero-title {
  font-family: var(--font-en-title);
  font-size: clamp(2.3rem, 3.8vw, 3.5rem);
  font-weight: 800;
  line-height: 1.12;
  color: #ffffff;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.65);
}

.hero-subtitle {
  font-size: clamp(1.1rem, 1.4vw, 1.35rem);
  font-weight: 600;
  color: #FDE68A;
  margin-bottom: 16px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
}

.hero-text {
  font-size: 1.05rem;
  line-height: 1.75;
  color: #F1F5F9;
  margin-bottom: 30px;
  max-width: 580px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.btn-primary {
  background: var(--primary);
  color: #ffffff;
  padding: 13px 30px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 0.98rem;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 14px rgba(185, 28, 28, 0.35);
  transition: var(--transition);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.45);
  padding: 13px 28px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.98rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(6px);
  transition: var(--transition);
}

.hero-slider-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  cursor: pointer;
  z-index: 15;
  transition: all 0.25s ease;
  backdrop-filter: blur(4px);
}

.hero-slider-arrow:hover {
  background: var(--primary);
  border-color: var(--primary);
  transform: translateY(-50%) scale(1.08);
}

.hero-arrow-prev { left: 24px; }
.hero-arrow-next { right: 24px; }

.hero-slider-dots {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 15;
}

.hero-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  padding: 0;
}

.hero-dot.active {
  background: #B91C1C;
  width: 28px;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(185, 28, 28, 0.6);
}

@media (max-width: 860px) {
  .hero-layout {
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    gap: 0;
    min-height: auto;
  }
  .hero-content-card {
    max-width: 100%;
    padding: 0 !important;
    margin: 0 auto;
    text-align: center;
  }
  .hero-actions {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .hero-slider-wrap,
  .hero-slider-track {
    min-height: 480px;
    contain: layout style;
  }
  .hero-bg-overlay {
    background: linear-gradient(180deg, rgba(27, 3, 8, 0.95) 0%, rgba(27, 3, 8, 0.88) 65%, rgba(27, 3, 8, 0.8) 100%) !important;
  }
  .hero-backdrop-image img,
  .hero-bg-img {
    object-position: 70% center;
  }
  .hero-layout {
    min-height: 430px;
    contain: layout style;
    padding: 30px 0;
  }
  .hero-content-card {
    min-height: 350px;
    contain: layout style;
  }
  .hero-title {
    font-size: clamp(1.8rem, 6.5vw, 2.3rem);
    line-height: 1.2;
    margin-bottom: 12px;
  }
  .hero-subtitle {
    font-size: 1.05rem;
    margin-bottom: 14px;
  }
  .hero-text {
    font-size: 0.95rem;
    line-height: 1.65;
    margin-bottom: 24px;
    max-width: 100%;
  }
  .hero-actions {
    flex-direction: column;
    width: 100%;
    gap: 12px;
  }
  .btn-primary, .btn-secondary {
    width: 100%;
    justify-content: center;
    padding: 13px 20px;
    font-size: 0.98rem;
  }
  .hero-slider-arrow {
    width: 38px;
    height: 38px;
    font-size: 0.95rem;
  }
  .hero-arrow-prev { left: 12px; }
  .hero-arrow-next { right: 12px; }
  .hero-slider-dots { bottom: 16px; }
}

/* 5. FLOATING ACTIONS (WHATSAPP & TOPUP SCROLL BUTTON) */
.floating-actions-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 9999 !important;
  pointer-events: none;
}

.floating-actions-container > * {
  pointer-events: auto;
}

.btn-whatsapp-float {
  width: 54px;
  height: 54px;
  background: #25D366;
  color: #FFFFFF !important;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.85rem;
  box-shadow: 0 4px 16px rgba(37, 211, 102, 0.45);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
  text-decoration: none;
  position: relative;
}

.btn-whatsapp-float:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(37, 211, 102, 0.6);
}

.whatsapp-tooltip {
  position: absolute;
  right: 66px;
  background: #0F172A;
  color: #FFFFFF;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transform: translateX(10px);
  transition: all 0.25s ease;
  pointer-events: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.btn-whatsapp-float:hover .whatsapp-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.btn-scroll-top {
  width: 44px;
  height: 44px;
  background: #B91C1C;
  color: #FFFFFF;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 4px 12px rgba(185, 28, 28, 0.35);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transform: translateY(15px);
  transition: opacity 0.3s ease, transform 0.3s ease, background 0.2s ease;
}

.btn-scroll-top svg {
  width: 20px;
  height: 20px;
  stroke: #ffffff;
  display: block;
}

.btn-scroll-top.visible {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateY(0) !important;
}

.btn-scroll-top:hover {
  background: #991B1B;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(185, 28, 28, 0.45);
}

@media (max-width: 640px) {
  .floating-actions-container {
    right: 16px;
    bottom: 16px;
    gap: 10px;
  }
  .btn-whatsapp-float {
    width: 50px;
    height: 50px;
    font-size: 1.7rem;
  }
  .btn-scroll-top {
    width: 40px;
    height: 40px;
    font-size: 0.95rem;
  }
}
`;

const res = esbuild.transformSync(rawCritical, { loader: 'css', minify: true });
console.log('Compiled Critical CSS size:', res.code.length, 'bytes');

const indexPath = path.resolve(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const regex = /<style id="critical-css">[\s\S]*?<\/style>/;
if (regex.test(html)) {
  html = html.replace(regex, `<style id="critical-css">${res.code}</style>`);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Successfully injected updated critical CSS into public/index.html');
} else {
  console.error('Could not find <style id="critical-css"> in public/index.html');
}
