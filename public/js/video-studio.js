/**
 * QSF Social Media – Professional Unlimited Multi-Track Video Studio (V4)
 * - Advanced Multi-Overlay Freeze Frame, Sequential Playback & Exact Resume Position Engine
 * - Dynamic Unlimited Tracks (Video, Video Overlay, Subtitle, Image/Logo, Text, Effects, Audio/SFX)
 * - AI Auto Subtitles (Urdu & English Speech-to-Text + Separate Optional Translation)
 * - Voice-Over Microphone Recording + 15 Built-in SFX + Keyframes + Filters + 15 Transitions
 * - Ink-Accurate Urdu Nastaliq RTL + Synchronized 48kHz Stereo AAC MP4 Export
 */
(function (window, document) {
  'use strict';

  const FORMATS = {
    portrait_9_16:   { key: 'portrait_9_16',   w: 1080, h: 1920, ratio: '9:16', label: '9:16 Portrait' },
    landscape_16_9:  { key: 'landscape_16_9',  w: 1920, h: 1080, ratio: '16:9', label: '16:9 Landscape' },
    square_1_1:      { key: 'square_1_1',      w: 1080, h: 1080, ratio: '1:1',  label: '1:1 Square' },
    ig_portrait_4_5: { key: 'ig_portrait_4_5', w: 1080, h: 1350, ratio: '4:5',  label: '4:5 IG Portrait' }
  };

  const TRACK_TYPE_META = {
    video:         { label: 'Video',         color: '#2563EB', icon: 'fa-film',             hasAudio: true,  hasVis: true },
    video_overlay: { label: 'Video Overlay', color: '#0284C7', icon: 'fa-clone',            hasAudio: true,  hasVis: true },
    subtitle:      { label: 'Subtitles',     color: '#0D9488', icon: 'fa-closed-captioning',hasAudio: false, hasVis: true },
    image:         { label: 'Images & Logo', color: '#D97706', icon: 'fa-image',            hasAudio: false, hasVis: true },
    effect:        { label: 'Effects',       color: '#7C3AED', icon: 'fa-wand-sparkles',    hasAudio: false, hasVis: true },
    text:          { label: 'Text',          color: '#B91C1C', icon: 'fa-font',             hasAudio: false, hasVis: true },
    audio:         { label: 'Audio & SFX',   color: '#059669', icon: 'fa-music',            hasAudio: true,  hasVis: false }
  };

  function createDefaultTracks() {
    return [
      { id: 'tr_video_1', type: 'video',         name: 'Video 1 (Main)',  color: '#2563EB', visible: true, locked: false, muted: false, volume: 1 },
      { id: 'tr_vov_1',   type: 'video_overlay', name: 'Video Overlay 1', color: '#0284C7', visible: true, locked: false, muted: false, volume: 1 },
      { id: 'tr_img_1',   type: 'image',         name: 'Images & Logo',   color: '#D97706', visible: true, locked: false, muted: false, volume: 1 },
      { id: 'tr_fx_1',    type: 'effect',        name: 'Effects & Grade', color: '#7C3AED', visible: true, locked: false, muted: false, volume: 1 },
      { id: 'tr_txt_1',   type: 'text',          name: 'Text Overlays',   color: '#B91C1C', visible: true, locked: false, muted: false, volume: 1 },
      { id: 'tr_aud_1',   type: 'audio',         name: 'Audio & SFX',     color: '#059669', visible: true, locked: false, muted: false, volume: 1 }
    ];
  }

  const TRANSITION_LABELS = {
    none:            'Cut / None',
    cross_dissolve:  'Cross Dissolve',
    fade_in:         'Fade In',
    fade_out:        'Fade Out',
    slide_left:      'Slide Left',
    slide_right:     'Slide Right',
    push_left:       'Push Left',
    push_right:      'Push Right',
    wipe:            'Wipe Left',
    wipe_right:      'Wipe Right',
    zoom_in:         'Zoom In',
    zoom_out:        'Zoom Out',
    blur_transition: 'Blur Morph',
    film_flash:      'Film Flash',
    news_whip:       'News Whip'
  };

  const COLOR_PRESETS = {
    original:      { label: 'Original',        brightness: 100, contrast: 100, saturation: 100, exposure: 0,   blur: 0, sharpen: 0,  grayscale: 0,   sepia: 0 },
    vivid:         { label: 'Broadcast Vivid', brightness: 105, contrast: 114, saturation: 128, exposure: 4,   blur: 0, sharpen: 20, grayscale: 0,   sepia: 0 },
    warm_cinema:   { label: 'Warm Cinema',     brightness: 102, contrast: 112, saturation: 115, exposure: 2,   blur: 0, sharpen: 10, grayscale: 0,   sepia: 22 },
    cool_news:     { label: 'Cool News',       brightness: 102, contrast: 115, saturation: 92,  exposure: 3,   blur: 0, sharpen: 25, grayscale: 8,   sepia: 0 },
    bw_news:       { label: 'High B&W',        brightness: 104, contrast: 128, saturation: 0,   exposure: 0,   blur: 0, sharpen: 15, grayscale: 100, sepia: 0 },
    sepia_archive: { label: 'Sepia Archive',   brightness: 98,  contrast: 108, saturation: 80,  exposure: -2,  blur: 0, sharpen: 0,  grayscale: 15,  sepia: 70 }
  };

  const EFFECT_LABELS = {
    breaking_pulse:   'Breaking Pulse',
    news_scanlines:   'TV Scanlines',
    cinema_letterbox: 'Cinema Bars',
    warm_glow:        'Light Glow',
    vignette_dark:    'Studio Vignette',
    flash_strobe:     'News Flash'
  };

  const TEXT_ANIMATIONS = {
    none:          'None (Static)',
    fade_in:       'Fade In',
    slide_up:      'Slide Up',
    slide_left:    'Slide From Right',
    slide_right:   'Slide From Left',
    pop:           'Pop Bounce',
    typewriter:    'Typewriter Reveal',
    ticker_scroll: 'Broadcast Ticker Scroll'
  };

  const SPLIT_PRESETS = [
    { key: 'none',   label: 'Full' },
    { key: 'left',   label: 'Left 50%' },
    { key: 'right',  label: 'Right 50%' },
    { key: 'top',    label: 'Top 50%' },
    { key: 'bottom', label: 'Bot 50%' },
    { key: 'pip_tr', label: 'PiP TR' },
    { key: 'pip_tl', label: 'PiP TL' },
    { key: 'pip_br', label: 'PiP BR' },
    { key: 'pip_bl', label: 'PiP BL' }
  ];

  const TEMPLATES = [
    { id: 'blank', name: '00. Blank Video Canvas', nameUr: 'خالی ویڈیو کینوس', badge: 'BLANK', bg1: '#0F172A', bg2: '#1E293B', accent: '#B91C1C', chrome: 'none', bgMode: 'blur', presets: [] },
    {
      id: 'breaking_news', name: '01. Breaking News', nameUr: 'بریکنگ نیوز', badge: 'BREAKING', bg1: '#991B1B', bg2: '#450A0A', accent: '#DC2626', chrome: 'breaking', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: 'بریکنگ نیوز • BREAKING', dir: 'rtl', yPct: 11, xPct: 44, fontSize: 34, bgColor: '#DC2626', bgOpacity: 0.96, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 80, animation: 'slide_left' },
        { role: 'headline', text: 'اہم اور تازہ ترین خبر کی تفصیلات یہاں درج کریں', dir: 'rtl', yPct: 77, xPct: 50, fontSize: 44, bgColor: '#0F172A', bgOpacity: 0.9, color: '#FDE047', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' },
        { role: 'ticker', text: 'قصرِ شبیر فاؤنڈیشن نیوز ڈیسک • مستند و بروقت معلومات', dir: 'rtl', yPct: 91, xPct: 50, fontSize: 26, bgColor: '#991B1B', bgOpacity: 0.96, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 94, animation: 'none' }
      ]
    },
    {
      id: 'news_alert', name: '02. News Alerts', nameUr: 'اہم نیوز الرٹ', badge: 'ALERT', bg1: '#B45309', bg2: '#7F1D1D', accent: '#D97706', chrome: 'alert', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: 'URGENT NEWS ALERT', dir: 'ltr', yPct: 12, xPct: 44, fontSize: 34, bgColor: '#D97706', bgOpacity: 0.95, color: '#111827', fontFamily: "'Outfit', 'Inter', sans-serif", maxWidthPct: 80, animation: 'pop' },
        { role: 'headline', text: 'ہنگامی صورتحال: اہم پیش رفت سامنے آ گئی', dir: 'rtl', yPct: 80, xPct: 50, fontSize: 44, bgColor: '#7F1D1D', bgOpacity: 0.92, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' }
      ]
    },
    {
      id: 'live_coverage', name: '03. Live Coverage', nameUr: 'براہِ راست کوریج', badge: 'LIVE', bg1: '#B91C1C', bg2: '#0F172A', accent: '#EF4444', chrome: 'live', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: '● LIVE | براہِ راست نشریات', dir: 'rtl', yPct: 10, xPct: 35, fontSize: 28, bgColor: '#EF4444', bgOpacity: 0.95, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 58, animation: 'fade_in' },
        { role: 'dateline', text: 'Islamabad / Lahore Bureau', dir: 'ltr', yPct: 89, xPct: 50, fontSize: 24, bgColor: '#0F172A', bgOpacity: 0.88, color: '#FDE047', fontFamily: "'Inter', sans-serif", maxWidthPct: 88, animation: 'fade_in' },
        { role: 'headline', text: 'میدانی صورتحال کی براہِ راست کوریج', dir: 'rtl', yPct: 78, xPct: 50, fontSize: 42, bgColor: '#1E293B', bgOpacity: 0.9, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' }
      ]
    },
    {
      id: 'international_news', name: '04. International News', nameUr: 'بین الاقوامی خبریں', badge: 'WORLD', bg1: '#0369A1', bg2: '#0F172A', accent: '#0284C7', chrome: 'global', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: 'INTERNATIONAL DESK • عالمی خبریں', dir: 'rtl', yPct: 11, xPct: 45, fontSize: 32, bgColor: '#0369A1', bgOpacity: 0.95, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 84, animation: 'slide_left' },
        { role: 'headline', text: 'عالمی سطح پر اہم سفارتی اور انسانی صورتحال', dir: 'rtl', yPct: 78, xPct: 50, fontSize: 44, bgColor: '#0F172A', bgOpacity: 0.92, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' },
        { role: 'source', text: 'Source: QSF International Monitor', dir: 'ltr', yPct: 90, xPct: 50, fontSize: 24, bgColor: '#1E293B', bgOpacity: 0.88, color: '#38BDF8', fontFamily: "'Inter', sans-serif", maxWidthPct: 86, animation: 'fade_in' }
      ]
    },
    {
      id: 'political_news', name: '05. Political News', nameUr: 'سیاسی خبریں', badge: 'POLITICS', bg1: '#1E293B', bg2: '#7F1D1D', accent: '#B91C1C', chrome: 'breaking', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: 'سیاسی و پارلیمانی تجزیہ', dir: 'rtl', yPct: 11, xPct: 44, fontSize: 32, bgColor: '#1E293B', bgOpacity: 0.94, color: '#FDE047', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 80, animation: 'fade_in' },
        { role: 'headline', text: 'قومی پالیسی اور اہم بیان کا خلاصہ', dir: 'rtl', yPct: 80, xPct: 50, fontSize: 44, bgColor: '#7F1D1D', bgOpacity: 0.92, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' }
      ]
    },
    {
      id: 'humanitarian', name: '06. Humanitarian Updates', nameUr: 'فلاحی و انسانی امداد', badge: 'RELIEF', bg1: '#065F46', bg2: '#0F172A', accent: '#059669', chrome: 'welfare', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: 'QSF HUMANITARIAN RELIEF • فلاحی سرگرمی', dir: 'rtl', yPct: 11, xPct: 44, fontSize: 30, bgColor: '#065F46', bgOpacity: 0.95, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 82, animation: 'fade_in' },
        { role: 'headline', text: 'مستحق خاندانوں میں راشن اور طبی امداد کی تقسیم', dir: 'rtl', yPct: 78, xPct: 50, fontSize: 42, bgColor: '#0F172A', bgOpacity: 0.9, color: '#FDE047', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' },
        { role: 'announcement', text: 'Donate & Support Humanity • www.qasreshabbir.org', dir: 'ltr', yPct: 90, xPct: 50, fontSize: 24, bgColor: '#059669', bgOpacity: 0.92, color: '#FFFFFF', fontFamily: "'Inter', sans-serif", maxWidthPct: 88, animation: 'fade_in' }
      ]
    },
    {
      id: 'awareness', name: '07. Awareness Campaigns', nameUr: 'آگاہی مہم', badge: 'AWARENESS', bg1: '#0F766E', bg2: '#134E4A', accent: '#0D9488', chrome: 'welfare', bgMode: 'gradient',
      presets: [
        { role: 'breaking', text: 'PUBLIC AWARENESS • سماجی آگاہی مہم', dir: 'rtl', yPct: 12, xPct: 44, fontSize: 32, bgColor: '#0D9488', bgOpacity: 0.95, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 82, animation: 'fade_in' },
        { role: 'headline', text: 'تعلیم، صحت اور صاف پانی ہر شہری کا بنیادی حق ہے', dir: 'rtl', yPct: 80, xPct: 50, fontSize: 42, bgColor: '#0F172A', bgOpacity: 0.88, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' }
      ]
    },
    {
      id: 'islamic_message', name: '08. Islamic Messages', nameUr: 'اسلامی پیغامات و اقوال', badge: 'ISLAMIC', bg1: '#064E3B', bg2: '#022C22', accent: '#D97706', chrome: 'islamic', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: 'اسلامی تعلیمات و پیغامِ انسانیت', dir: 'rtl', yPct: 12, xPct: 44, fontSize: 34, bgColor: '#064E3B', bgOpacity: 0.94, color: '#FDE047', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 80, animation: 'fade_in' },
        { role: 'headline', text: 'بے شک اللہ نیکی کرنے والوں کے ساتھ ہے', dir: 'rtl', yPct: 78, xPct: 50, fontSize: 46, bgColor: '#022C22', bgOpacity: 0.9, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'fade_in' },
        { role: 'source', text: 'قصرِ شبیر فاؤنڈیشن • خدمتِ خلق', dir: 'rtl', yPct: 90, xPct: 50, fontSize: 26, bgColor: '#B45309', bgOpacity: 0.92, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 82, animation: 'fade_in' }
      ]
    },
    {
      id: 'qsf_updates', name: '09. QSF Foundation Updates', nameUr: 'قصرِ شبیر فاؤنڈیشن اپڈیٹ', badge: 'QSF OFFICIAL', bg1: '#881337', bg2: '#450A0A', accent: '#B91C1C', chrome: 'qsf', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: 'QASR-E-SHABBIR FOUNDATION UPDATE', dir: 'ltr', yPct: 11, xPct: 44, fontSize: 28, bgColor: '#881337', bgOpacity: 0.95, color: '#FDE047', fontFamily: "'Outfit', 'Inter', sans-serif", maxWidthPct: 80, animation: 'slide_right' },
        { role: 'headline', text: 'قصرِ شبیر فاؤنڈیشن کے نئے فلاحی منصوبے کا آغاز', dir: 'rtl', yPct: 78, xPct: 50, fontSize: 44, bgColor: '#450A0A', bgOpacity: 0.92, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' },
        { role: 'dateline', text: 'www.qasreshabbir.org • Verified Welfare Update', dir: 'ltr', yPct: 90, xPct: 50, fontSize: 24, bgColor: '#FFFFFF', bgOpacity: 0.95, color: '#881337', fontFamily: "'Inter', sans-serif", maxWidthPct: 86, animation: 'fade_in' }
      ]
    },
    {
      id: 'public_announcement', name: '10. Public Announcements', nameUr: 'عوامی اعلامیہ', badge: 'NOTICE', bg1: '#312E81', bg2: '#0F172A', accent: '#4F46E5', chrome: 'global', bgMode: 'blur',
      presets: [
        { role: 'breaking', text: 'اہم عوامی اعلامیہ • OFFICIAL NOTICE', dir: 'rtl', yPct: 11, xPct: 44, fontSize: 32, bgColor: '#4F46E5', bgOpacity: 0.94, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 82, animation: 'fade_in' },
        { role: 'headline', text: 'تمام شہریوں اور رضاکاروں کو مطلع کیا جاتا ہے', dir: 'rtl', yPct: 79, xPct: 50, fontSize: 42, bgColor: '#0F172A', bgOpacity: 0.92, color: '#FFFFFF', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' }
      ]
    },
    {
      id: 'promotional', name: '11. Promotional Videos', nameUr: 'سوشل میڈیا پروموشن', badge: 'PROMO', bg1: '#9D174D', bg2: '#881337', accent: '#DB2777', chrome: 'promo', bgMode: 'gradient',
      presets: [
        { role: 'breaking', text: 'JOIN OUR WELFARE MISSION', dir: 'ltr', yPct: 12, xPct: 44, fontSize: 32, bgColor: '#B91C1C', bgOpacity: 0.95, color: '#FFFFFF', fontFamily: "'Outfit', 'Inter', sans-serif", maxWidthPct: 80, animation: 'pop' },
        { role: 'headline', text: 'آئیں مل کر امید کی شمع روشن کریں', dir: 'rtl', yPct: 77, xPct: 50, fontSize: 46, bgColor: '#0F172A', bgOpacity: 0.85, color: '#FDE047', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", maxWidthPct: 90, animation: 'slide_up' },
        { role: 'announcement', text: 'Visit: qasreshabbir.org', dir: 'ltr', yPct: 89, xPct: 50, fontSize: 28, bgColor: '#FDE047', bgOpacity: 0.96, color: '#0F172A', fontFamily: "'Outfit', 'Inter', sans-serif", maxWidthPct: 70, animation: 'fade_in' }
      ]
    }
  ];

  const TEXT_ROLE_DEFAULTS = {
    headline:     { text: 'اہم خبر: شہ سرخی یہاں لکھیں', dir: 'rtl', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", fontSize: 44, fontWeight: '700', color: '#FDE047', bgColor: '#0F172A', bgOpacity: 0.9, yPct: 76, animation: 'slide_up' },
    breaking:     { text: 'بریکنگ نیوز • BREAKING NEWS', dir: 'rtl', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", fontSize: 32, fontWeight: '700', color: '#FFFFFF', bgColor: '#DC2626', bgOpacity: 0.95, yPct: 12, animation: 'slide_left' },
    lower_third:  { text: 'احمد حسن — نمائندہ خصوصی، قصرِ شبیر نیوز', dir: 'rtl', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", fontSize: 28, fontWeight: '700', color: '#FFFFFF', bgColor: '#881337', bgOpacity: 0.95, yPct: 83, animation: 'slide_left' },
    caption:      { text: 'یہاں ویڈیو کیپشن یا سب ٹائٹل درج کریں', dir: 'rtl', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", fontSize: 30, fontWeight: '600', color: '#FFFFFF', bgColor: '#000000', bgOpacity: 0.78, yPct: 86, animation: 'fade_in' },
    subheading:   { text: 'ذیلی سرخی اور مختصر پس منظر', dir: 'rtl', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", fontSize: 30, fontWeight: '600', color: '#E2E8F0', bgColor: '#1E293B', bgOpacity: 0.86, yPct: 84, animation: 'fade_in' },
    ticker:       { text: 'لائیو ٹکر: قصرِ شبیر فاؤنڈیشن فلاحی نیوز نیٹ ورک • تازہ ترین اپڈیٹس', dir: 'rtl', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", fontSize: 26, fontWeight: '700', color: '#FFFFFF', bgColor: '#991B1B', bgOpacity: 0.96, yPct: 92, animation: 'ticker_scroll' },
    dateline:     { text: '21 Nov 2026 • Islamabad, Pakistan', dir: 'ltr', fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: '700', color: '#FDE047', bgColor: '#0F172A', bgOpacity: 0.88, yPct: 22, animation: 'fade_in' },
    source:       { text: 'Source: QSF Media Cell', dir: 'ltr', fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: '700', color: '#FFFFFF', bgColor: '#0F172A', bgOpacity: 0.85, yPct: 68, animation: 'fade_in' },
    announcement: { text: 'اہم اعلان: مستحق افراد کی مدد کے لیے رابطہ کریں', dir: 'rtl', fontFamily: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif", fontSize: 32, fontWeight: '700', color: '#FFFFFF', bgColor: '#065F46', bgOpacity: 0.92, yPct: 50, animation: 'pop' },
    custom:       { text: 'Custom English / Bilingual Overlay', dir: 'ltr', fontFamily: "'Outfit', 'Inter', sans-serif", fontSize: 36, fontWeight: '700', color: '#FFFFFF', bgColor: '#1E293B', bgOpacity: 0.85, yPct: 50, animation: 'fade_in' }
  };

  const URDU_ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  function containsArabicScript(text) { return URDU_ARABIC_RE.test(String(text || '')); }

  function getOfficialLogoUrl() {
    if (window.currentBrandingAssets && window.currentBrandingAssets.site_logo_url) {
      return window.currentBrandingAssets.site_logo_url;
    }
    return '/media/branding/Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.webp';
  }

  function makeUid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatSec(s) {
    const val = Math.max(0, Number(s) || 0);
    const hrs = Math.floor(val / 3600);
    const mins = Math.floor((val % 3600) / 60);
    const secs = Math.floor(val % 60);
    const tenths = Math.floor((val % 1) * 10);
    if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  }

  function formatBytes(b) {
    if (!b) return '—';
    if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1024).toFixed(1) + ' KB';
  }

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  function getRatioLabel(w, h) {
    if (!w || !h) return '—';
    const d = gcd(Math.round(w), Math.round(h));
    const rw = Math.round(w / d), rh = Math.round(h / d);
    return (rw <= 25 && rh <= 25) ? `${rw}:${rh}` : `${(w / h).toFixed(2)}:1`;
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || '#000000').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.padEnd(6, '0');
    const r = parseInt(full.slice(0, 2), 16) || 0;
    const g = parseInt(full.slice(2, 4), 16) || 0;
    const b = parseInt(full.slice(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, Number(alpha)))})`;
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function easeInOutCubic(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function easeOutCubic(p) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3); }
  function easeOutBack(p) {
    const c1 = 1.70158, c3 = c1 + 1, x = Math.max(0, Math.min(1, p));
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function defaultFilters() {
    return { preset: 'original', brightness: 100, contrast: 100, saturation: 100, exposure: 0, blur: 0, sharpen: 0, grayscale: 0, sepia: 0 };
  }

  function buildCanvasFilterString(f) {
    if (!f) return 'none';
    const expBoost = (Number(f.exposure) || 0) * 1.1;
    const sharpBoost = (Number(f.sharpen) || 0) * 0.25;
    const br = Math.max(15, Math.min(250, (Number(f.brightness) || 100) + expBoost));
    const ct = Math.max(20, Math.min(250, (Number(f.contrast) || 100) + sharpBoost));
    const sat = Math.max(0, Math.min(250, (Number(f.saturation) || 100) + (Number(f.sharpen) || 0) * 0.1));
    const bl = Math.max(0, Math.min(30, Number(f.blur) || 0));
    const gs = Math.max(0, Math.min(100, Number(f.grayscale) || 0));
    const sp = Math.max(0, Math.min(100, Number(f.sepia) || 0));
    const parts = [];
    if (Math.abs(br - 100) > 0.5) parts.push(`brightness(${br.toFixed(1)}%)`);
    if (Math.abs(ct - 100) > 0.5) parts.push(`contrast(${ct.toFixed(1)}%)`);
    if (Math.abs(sat - 100) > 0.5) parts.push(`saturate(${sat.toFixed(1)}%)`);
    if (bl > 0.1) parts.push(`blur(${bl.toFixed(1)}px)`);
    if (gs > 0.5) parts.push(`grayscale(${gs.toFixed(0)}%)`);
    if (sp > 0.5) parts.push(`sepia(${sp.toFixed(0)}%)`);
    return parts.length ? parts.join(' ') : 'none';
  }

  function encodeMono16BitWav(samples, sampleRate = 16000) {
    const n = samples.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const dv = new DataView(buf);
    const ws = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
    ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true);
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    ws(36, 'data'); dv.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      dv.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  }

  // =========================================================================
  // DETERMINISTIC MULTI-OVERLAY FREEZE-FRAME, SEQUENTIAL PLAYBACK & RESUME ENGINE
  // =========================================================================
  /**
   * Computes the exact playback state & source timestamp of any video_overlay clip at composition time `timelineT`.
   * - When `clip.useSequentialControl` is enabled (or `playSegments.length > 0`):
   *   - Before first play segment: frozen on user's selected `freezeFrameTime` (or `playStartPos`).
   *   - During an active play segment: plays smoothly advancing from the accumulated played duration of all previous segments!
   *   - Between / after play segments: frozen at the EXACT last played timestamp (never blank, never advances while frozen!).
   *   - When resuming in a later segment: resumes from the EXACT timestamp where it previously paused!
   */
  function evaluateOverlayPlaybackAt(clip, timelineT) {
    const speed = Math.max(0.25, Math.min(4, Number(clip.speed) || 1));
    const srcDur = Math.max(0.2, Number(clip.sourceDuration) || Number(clip.duration) || 10);
    const pStart = Math.max(0, Math.min(srcDur - 0.1, Number(clip.playStartPos != null ? clip.playStartPos : (clip.trimStart || 0))));
    const pEnd = Math.max(pStart + 0.1, Math.min(srcDur, Number(clip.playEndPos != null ? clip.playEndPos : srcDur)));
    const pSpan = Math.max(0.1, pEnd - pStart);
    const freezeT = Math.max(0, Math.min(srcDur - 0.02, Number(clip.freezeFrameTime != null ? clip.freezeFrameTime : pStart)));
    const segs = Array.isArray(clip.playSegments) ? [...clip.playSegments].sort((a, b) => a.start - b.start) : [];

    // Continuous (standard V3) mode when sequential freeze control is disabled and no segments exist
    if (!clip.useSequentialControl && segs.length === 0) {
      const relT = Math.max(0, timelineT - (Number(clip.startTime) || 0));
      let offset = relT * speed;
      if (clip.loopPlayback && pSpan > 0.1) offset = offset % pSpan;
      else offset = Math.min(pSpan - 0.02, offset);
      const srcTime = clip.reversed ? Math.max(pStart, pEnd - offset) : Math.min(pEnd - 0.02, pStart + offset);
      return {
        scheduled: false,
        isPlaying: true,
        isFrozen: false,
        useInitialFreezeThumb: false,
        srcTime: Number(Math.max(0, Math.min(srcDur - 0.02, srcTime)).toFixed(3)),
        savedCursor: Number(srcTime.toFixed(3)),
        accumulatedSrc: Number(offset.toFixed(3)),
        hasEverPlayed: true,
        activeSegment: null
      };
    }

    let accumulatedSrc = 0;
    let hasEverPlayed = false;

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const segStart = Number(seg.start) || 0;
      const segEnd = Math.max(segStart, Number(seg.end) || segStart);
      if (timelineT < segStart - 0.001) {
        break;
      }
      if (timelineT >= segEnd - 0.001) {
        accumulatedSrc += Math.max(0, segEnd - segStart) * speed;
        hasEverPlayed = true;
        continue;
      }
      // ACTIVE PLAYING inside this segment!
      const elapsedInSeg = Math.max(0, timelineT - segStart) * speed;
      const totalOffset = accumulatedSrc + elapsedInSeg;
      let srcTime;
      if (clip.loopPlayback) {
        srcTime = pStart + (totalOffset % pSpan);
      } else {
        srcTime = Math.min(pEnd - 0.02, pStart + totalOffset);
      }
      if (clip.reversed) srcTime = Math.max(pStart, pEnd - (srcTime - pStart));
      srcTime = Math.max(0, Math.min(srcDur - 0.02, srcTime));
      return {
        scheduled: true,
        isPlaying: true,
        isFrozen: false,
        useInitialFreezeThumb: false,
        srcTime: Number(srcTime.toFixed(3)),
        savedCursor: Number(srcTime.toFixed(3)),
        accumulatedSrc: Number(totalOffset.toFixed(3)),
        hasEverPlayed: true,
        activeSegment: seg,
        activeSegmentIdx: i
      };
    }

    // FROZEN at timelineT
    if (!hasEverPlayed) {
      return {
        scheduled: true,
        isPlaying: false,
        isFrozen: true,
        useInitialFreezeThumb: true,
        srcTime: Number(freezeT.toFixed(3)),
        savedCursor: Number(pStart.toFixed(3)),
        accumulatedSrc: 0,
        hasEverPlayed: false,
        activeSegment: null
      };
    }

    let frozenSrc;
    if (clip.loopPlayback) {
      frozenSrc = pStart + (accumulatedSrc % pSpan);
    } else {
      frozenSrc = Math.min(pEnd - 0.02, pStart + accumulatedSrc);
    }
    if (clip.reversed) frozenSrc = Math.max(pStart, pEnd - (frozenSrc - pStart));
    frozenSrc = Math.max(0, Math.min(srcDur - 0.02, frozenSrc));
    return {
      scheduled: true,
      isPlaying: false,
      isFrozen: true,
      useInitialFreezeThumb: false,
      srcTime: Number(frozenSrc.toFixed(3)),
      savedCursor: Number(frozenSrc.toFixed(3)),
      accumulatedSrc: Number(accumulatedSrc.toFixed(3)),
      hasEverPlayed: true,
      activeSegment: null
    };
  }

  function computeSourceTimeForClip(clip, timelineT) {
    if (clip.kind === 'video_overlay') {
      return evaluateOverlayPlaybackAt(clip, timelineT).srcTime;
    }
    const relT = Math.max(0, timelineT - (Number(clip.startTime) || 0));
    const speed = Math.max(0.25, Math.min(4, Number(clip.speed) || 1));
    const trimStart = Math.max(0, Number(clip.trimStart) || 0);
    const srcDur = Math.max(0.2, Number(clip.sourceDuration) || Number(clip.duration) || 10);
    const avail = Math.max(0.1, srcDur - trimStart);
    let offset = relT * speed;
    if (clip.kind === 'audio' && clip.loop && avail > 0.1) offset = offset % avail;
    const span = Math.min(avail, Math.max(0.05, (Number(clip.duration) || 1) * speed));
    const target = clip.reversed ? (trimStart + Math.max(0, span - offset)) : (trimStart + offset);
    return Math.max(0, Math.min(Math.max(0, srcDur - 0.02), target));
  }

  function evaluateAnimatedClip(clip, timelineT) {
    const base = {
      xPct: clip.xPct != null ? clip.xPct : 50,
      yPct: clip.yPct != null ? clip.yPct : 50,
      scale: clip.scale != null ? clip.scale : 100,
      widthPct: clip.widthPct != null ? clip.widthPct : 34,
      opacity: clip.opacity != null ? clip.opacity : 1,
      rotation: clip.rotation || 0
    };
    const kfs = Array.isArray(clip.keyframes) ? clip.keyframes : [];
    if (!kfs.length) return base;
    const sorted = [...kfs].sort((a, b) => a.t - b.t);
    const relT = Math.max(0, timelineT - (Number(clip.startTime) || 0));
    if (relT <= sorted[0].t) return Object.assign({}, base, sorted[0]);
    if (relT >= sorted[sorted.length - 1].t) return Object.assign({}, base, sorted[sorted.length - 1]);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      if (relT >= a.t && relT <= b.t) {
        const span = Math.max(0.001, b.t - a.t);
        const p = easeInOutCubic((relT - a.t) / span);
        const lerp = (k, def) => (a[k] != null ? Number(a[k]) : def) + ((b[k] != null ? Number(b[k]) : def) - (a[k] != null ? Number(a[k]) : def)) * p;
        return {
          xPct: lerp('xPct', base.xPct),
          yPct: lerp('yPct', base.yPct),
          scale: lerp('scale', base.scale),
          widthPct: lerp('widthPct', base.widthPct),
          opacity: lerp('opacity', base.opacity),
          rotation: lerp('rotation', base.rotation)
        };
      }
    }
    return base;
  }

  // ================== INK-ACCURATE URDU & ENGLISH TEXT/SUBTITLE LAYOUT (VERIFIED ZERO-CLIP) ==================
  function measureCanvasRunWidth(ctx, str) {
    const m = ctx.measureText(str);
    const inkW = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0);
    return Math.max(m.width || 0, inkW);
  }

  function wrapCanvasLines(ctx, text, maxWidth) {
    const paragraphs = String(text || '').split(/\r?\n/);
    const lines = [];
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      if (words.length === 0) { lines.push(' '); continue; }
      let current = '';
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const candidate = current ? (current + ' ' + word) : word;
        if (measureCanvasRunWidth(ctx, candidate) <= maxWidth) { current = candidate; continue; }
        if (current) { lines.push(current); current = ''; }
        if (measureCanvasRunWidth(ctx, word) > maxWidth && !containsArabicScript(word)) {
          let chunk = '';
          for (const ch of word) {
            const testChunk = chunk + ch;
            if (chunk && measureCanvasRunWidth(ctx, testChunk) > maxWidth) { lines.push(chunk); chunk = ch; }
            else chunk = testChunk;
          }
          current = chunk;
        } else {
          current = word;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  }

  function measureInkLine(ctx, line, fontSize, isUrduBlock, strokeExtra) {
    const m = ctx.measureText(line);
    const actLeft = m.actualBoundingBoxLeft != null ? m.actualBoundingBoxLeft : (m.width / 2);
    const actRight = m.actualBoundingBoxRight != null ? m.actualBoundingBoxRight : (m.width / 2);
    const actAsc = m.actualBoundingBoxAscent != null ? m.actualBoundingBoxAscent : fontSize * 0.88;
    const actDesc = m.actualBoundingBoxDescent != null ? m.actualBoundingBoxDescent : fontSize * 0.28;
    const fontAsc = m.fontBoundingBoxAscent != null ? m.fontBoundingBoxAscent : fontSize * 0.9;
    const fontDesc = m.fontBoundingBoxDescent != null ? m.fontBoundingBoxDescent : fontSize * 0.28;
    const vSafety = isUrduBlock ? Math.max(4, Math.round(fontSize * 0.1)) : Math.max(2, Math.round(fontSize * 0.05));
    const hSafety = isUrduBlock ? Math.max(4, Math.round(fontSize * 0.08)) : Math.max(2, Math.round(fontSize * 0.04));
    const inkSpan = Math.max(m.width || 0, actLeft + actRight);
    return {
      text: line, actLeft, actRight, inkSpan,
      inkW: inkSpan + strokeExtra * 2 + hSafety * 2,
      inkAsc: Math.max(actAsc, fontAsc * 0.85) + strokeExtra + vSafety,
      inkDesc: Math.max(actDesc, fontDesc * 0.85) + strokeExtra + vSafety,
      hSafety
    };
  }

  function computeSingleTextLayout(ctx, W, H, el, overrideText = null, animPos = null) {
    const textVal = overrideText != null ? overrideText : el.text;
    const scaleFactor = Math.min(W, H) / 1080;
    const pad = Math.round((el.padding != null ? el.padding : 14) * scaleFactor);
    const strokeExtra = (el.outlineWidth || 0) * scaleFactor;
    const isUrduFont = (el.fontFamily || '').includes('Nastaliq') || (el.fontFamily || '').includes('Arabic');
    const hasUrduGlyphs = containsArabicScript(textVal);
    const isUrduBlock = isUrduFont || hasUrduGlyphs;
    const dir = el.dir === 'rtl' ? 'rtl' : 'ltr';
    const align = el.align || 'center';
    const baseFontSize = Math.max(12, Math.round((el.fontSize || 42) * scaleFactor));
    const targetMaxBoxW = Math.min(W - 8, Math.max(140 * scaleFactor, ((el.maxWidthPct || 88) / 100) * W));
    const maxAvailBoxH = H - 12;

    let effFontSize = baseFontSize, lines = [], lineMetrics = [], contentW = 0, contentH = 0;

    for (let pass = 0; pass < 6; pass++) {
      const innerMaxTextW = Math.max(60, targetMaxBoxW - pad * 2 - strokeExtra * 2 - (isUrduBlock ? 10 : 6));
      ctx.font = `${el.fontWeight || '700'} ${effFontSize}px ${el.fontFamily || "'Inter', sans-serif"}`;
      ctx.direction = dir;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) ctx.letterSpacing = hasUrduGlyphs ? '0px' : `${((el.letterSpacing || 0) * scaleFactor).toFixed(1)}px`;

      lines = wrapCanvasLines(ctx, textVal, innerMaxTextW);
      lineMetrics = lines.map(ln => measureInkLine(ctx, ln, effFontSize, isUrduBlock, strokeExtra));
      contentW = Math.max(20, ...lineMetrics.map(lm => lm.inkW));

      let relY = 0;
      lineMetrics[0].relBaseline = 0;
      for (let i = 1; i < lineMetrics.length; i++) {
        const prev = lineMetrics[i - 1], curr = lineMetrics[i];
        const minNonOverlap = prev.inkDesc + curr.inkAsc + Math.round(effFontSize * 0.08);
        const lh = Number(el.lineHeight) || (isUrduBlock ? 1.65 : 1.25);
        const userStep = effFontSize * lh;
        const sliderBoost = isUrduBlock ? Math.max(0, (lh - 1.4) * effFontSize * 0.45) : 0;
        const step = isUrduBlock ? Math.max(userStep, minNonOverlap + sliderBoost) : Math.max(userStep, minNonOverlap);
        relY += step;
        curr.relBaseline = relY;
      }

      const topEdge = -lineMetrics[0].inkAsc;
      const bottomEdge = lineMetrics[lineMetrics.length - 1].relBaseline + lineMetrics[lineMetrics.length - 1].inkDesc;
      contentH = bottomEdge - topEdge;

      const exceedsWidth = contentW + pad * 2 > (W - 8);
      const exceedsHeight = contentH + pad * 2 > maxAvailBoxH;
      if (!exceedsWidth && !exceedsHeight) break;
      const ratioW = exceedsWidth ? ((W - 12 - pad * 2) / contentW) : 1;
      const ratioH = exceedsHeight ? ((maxAvailBoxH - pad * 2) / contentH) : 1;
      const nextSize = Math.max(10, Math.floor(effFontSize * Math.min(ratioW, ratioH) * 0.96));
      if (nextSize >= effFontSize) break;
      effFontSize = nextSize;
    }

    const boxW = Math.min(W - 8, Math.ceil(contentW + pad * 2));
    const boxH = Math.min(H - 8, Math.ceil(contentH + pad * 2));
    const xPct = animPos ? animPos.xPct : (el.xPct != null ? el.xPct : 50);
    const yPct = animPos ? animPos.yPct : (el.yPct != null ? el.yPct : 50);
    const cx = Math.max(boxW / 2, Math.min(W - boxW / 2, (xPct / 100) * W));
    const cy = Math.max(boxH / 2, Math.min(H - boxH / 2, (yPct / 100) * H));

    return {
      type: el.kind || 'text', id: el.id, locked: Boolean(el.locked),
      rotation: animPos ? animPos.rotation : (el.rotation || 0),
      cxPct: (cx / W) * 100, cyPct: (cy / H) * 100, wPct: (boxW / W) * 100, hPct: (boxH / H) * 100,
      boxW, boxH, cx, cy, effFontSize, pad, dir, align, hasUrduGlyphs, strokeExtra, lineMetrics
    };
  }

  function createOfficialLogoClip(duration = 10, trackId = 'tr_img_1') {
    return {
      id: 'clip_official_qsf_logo', trackId, kind: 'image', isOfficialLogo: true, assetId: null,
      imageUrl: getOfficialLogoUrl(), name: 'Official QSF Logo', startTime: 0, duration: Math.max(5, duration),
      xPct: 86, yPct: 8, widthPct: 14, opacity: 1, rotation: 0, flipH: false, flipV: false,
      cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0, filters: defaultFilters(), keyframes: [],
      fitMode: 'contain', cornerRadius: 0, bgEnabled: true, bgColor: '#FFFFFF', bgRadius: 14, visible: true, locked: false
    };
  }

  function createDefaultState() {
    return {
      version: 4,
      projectId: null,
      title: 'QSF News Video Broadcast',
      templateId: 'breaking_news',
      accentColor: '#B91C1C',
      showChrome: true,
      outputFormat: 'portrait_9_16',
      tracks: createDefaultTracks(),
      mediaPool: [],
      clips: [createOfficialLogoClip(10, 'tr_img_1')],
      directorQueue: [],
      bg: {
        mode: 'blur', blurAmount: 28, dimOpacity: 45, solidColor: '#0F172A',
        gradColor1: '#450A0A', gradColor2: '#0F172A', gradAngle: 135, imageUrl: null
      },
      playback: { playing: false, loop: true, currentTime: 0 }
    };
  }

  function normalizeClipV4(rawClip, tracks) {
    const c = Object.assign({}, rawClip);
    const mapOld = {
      video1: { kind: 'video',         tr: 'tr_video_1' },
      video2: { kind: 'video_overlay', tr: 'tr_vov_1' },
      image:  { kind: 'image',         tr: 'tr_img_1' },
      text:   { kind: 'text',          tr: 'tr_txt_1' },
      audio:  { kind: 'audio',         tr: 'tr_aud_1' },
      effect: { kind: 'effect',        tr: 'tr_fx_1' },
      subtitle: { kind: 'subtitle',    tr: 'tr_sub_1' }
    };
    if (!c.kind && c.track && mapOld[c.track]) {
      c.kind = mapOld[c.track].kind;
      c.trackId = c.trackId || mapOld[c.track].tr;
    }
    if (!c.kind) {
      const tr = tracks.find(t => t.id === c.trackId);
      c.kind = tr ? tr.type : 'video';
    }
    if (!c.trackId || !tracks.some(t => t.id === c.trackId)) {
      const match = tracks.find(t => t.type === c.kind) || tracks[0];
      c.trackId = match ? match.id : 'tr_video_1';
    }
    delete c.track;
    if (['video', 'video_overlay', 'image'].includes(c.kind)) {
      c.filters = Object.assign(defaultFilters(), c.filters || {});
      c.cropTop = Number(c.cropTop) || 0; c.cropRight = Number(c.cropRight) || 0;
      c.cropBottom = Number(c.cropBottom) || 0; c.cropLeft = Number(c.cropLeft) || 0;
      c.flipH = Boolean(c.flipH); c.flipV = Boolean(c.flipV);
    }
    if (['video', 'video_overlay', 'audio'].includes(c.kind)) {
      c.speed = Math.max(0.25, Math.min(4, Number(c.speed) || 1));
      c.reversed = Boolean(c.reversed);
    }
    if (c.kind === 'video' || c.kind === 'video_overlay') {
      c.splitScreen = c.splitScreen || 'none';
      c.transitionIn = Object.assign({ type: 'none', duration: 1, intensity: 100 }, c.transitionIn || {});
      c.transitionOut = Object.assign({ type: 'none', duration: 1, intensity: 100 }, c.transitionOut || {});
    }
    if (c.kind === 'video_overlay') {
      const sd = Math.max(0.5, Number(c.sourceDuration) || Number(c.duration) || 10);
      c.useSequentialControl = Boolean(c.useSequentialControl || (Array.isArray(c.playSegments) && c.playSegments.length > 0));
      c.freezeFrameTime = c.freezeFrameTime != null ? Number(c.freezeFrameTime) : 0;
      c.playStartPos = c.playStartPos != null ? Number(c.playStartPos) : (Number(c.trimStart) || 0);
      c.playEndPos = c.playEndPos != null ? Number(c.playEndPos) : sd;
      c.loopPlayback = Boolean(c.loopPlayback);
      if (!Array.isArray(c.playSegments)) c.playSegments = [];
    }
    if (c.kind === 'text' || c.kind === 'subtitle') {
      c.animation = c.animation || (c.kind === 'subtitle' ? 'fade_in' : 'none');
      c.animDuration = Number(c.animDuration) || 0.35;
    }
    if (!Array.isArray(c.keyframes)) c.keyframes = [];
    return c;
  }

  function migrateProjectState(raw) {
    if (!raw) return createDefaultState();
    if ((raw.version === 4 || raw.version === 3) && Array.isArray(raw.tracks) && Array.isArray(raw.clips)) {
      const st = Object.assign(createDefaultState(), raw, { version: 4 });
      st.tracks = raw.tracks.length ? raw.tracks.map(t => Object.assign({ visible: true, locked: false, muted: false, volume: 1 }, t)) : createDefaultTracks();
      st.clips = raw.clips.map(c => normalizeClipV4(c, st.tracks));
      st.playback = Object.assign({ playing: false, loop: true, currentTime: 0 }, raw.playback || {});
      st.bg = Object.assign(createDefaultState().bg, raw.bg || {});
      if (!Array.isArray(st.directorQueue)) st.directorQueue = [];
      return st;
    }
    // V2 -> V4
    if (raw.version === 2 && Array.isArray(raw.clips)) {
      const st = createDefaultState();
      st.projectId = raw.projectId || null; st.title = raw.title || st.title;
      st.templateId = raw.templateId || 'breaking_news'; st.accentColor = raw.accentColor || '#B91C1C';
      st.showChrome = raw.showChrome !== false; st.outputFormat = raw.outputFormat || 'portrait_9_16';
      st.mediaPool = Array.isArray(raw.mediaPool) ? raw.mediaPool : [];
      st.bg = Object.assign(st.bg, raw.bg || {});
      st.clips = raw.clips.map(c => normalizeClipV4(c, st.tracks));
      return st;
    }
    // Legacy V1 -> V4
    const st = createDefaultState();
    st.projectId = raw.projectId || null; st.title = raw.title || st.title;
    st.templateId = raw.templateId || 'breaking_news'; st.outputFormat = raw.outputFormat || 'portrait_9_16';
    if (raw.bg) st.bg = Object.assign(st.bg, raw.bg);
    st.clips = [createOfficialLogoClip(10, 'tr_img_1')];
    return st;
  }

  const QSFVideoStudio = {
    initialized: false,
    version: 4,
    state: createDefaultState(),
    selectedId: null,
    history: [],
    historyIdx: -1,
    zoomMode: 'fit',
    timelinePxPerSec: 20,
    timelineSnapEnabled: true,
    safeZoneVisible: false,
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    userResizedTimeline: false,
    isExporting: false,
    exportAborted: false,
    isGeneratingSubtitles: false,

    // Capabilities & SFX
    sttCaps: null,
    sfxCatalog: { builtin: [], custom: [] },
    sfxCategory: 'All',
    sfxPreviewAudio: null,
    sfxPreviewUrl: null,

    // Voice-Over Recording State
    voRecorder: null,
    voStream: null,
    voChunks: [],
    voTimerId: null,
    voStartTs: 0,

    // Runtime Caches (never serialized to DB)
    runtimeFiles: new Map(),
    runtimeMediaEls: new Map(),
    runtimeImages: new Map(),
    decodedAudioCache: new Map(),
    frozenFrameCache: new Map(), // `${clipId}@${srcT.toFixed(2)}` -> HTMLCanvasElement
    bgImageEl: null,
    scratchCanvasA: null,
    scratchCanvasB: null,
    rafId: null,
    lastLayoutBoxes: [],

    // Expose pure evaluation helper for external checks/debugging
    evaluateOverlayPlaybackAt,

    init() {
      if (this.initialized) {
        this.resizeStage();
        this.renderFrame();
        return;
      }
      this.initialized = true;

      this.scratchCanvasA = document.createElement('canvas');
      this.scratchCanvasB = document.createElement('canvas');

      this.preloadImage(getOfficialLogoUrl());
      this.preloadStudioFonts();
      this.bindDropZoneAndInputs();
      this.bindStageInteractions();
      this.bindTimelineInteractions();
      this.bindTimelineResizer();
      this.bindDraggableTools();
      this.renderTemplatesGrid();
      this.loadSfxLibrary();
      this.loadCapabilities();

      this.applyTemplate('breaking_news', false);
      this.pushHistory();
      this.refreshProjectsCount();
      this.syncAllUI();
      this.resizeStage();
      this.renderFrame();

      window.addEventListener('resize', () => {
        if (!document.getElementById('videoStudioWorkspaceCard')?.classList.contains('hidden')) {
          this.resizeStage();
          this.renderTimeline();
        }
      });

      window.addEventListener('keydown', e => {
        const card = document.getElementById('videoStudioWorkspaceCard');
        if (!card || card.classList.contains('hidden')) return;
        const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;
        if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
        else if (e.key === 'Delete') { this.deleteSelected(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this.stepFrames(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); this.stepFrames(1); }
      });
    },

    async loadCapabilities() {
      try {
        const res = await fetch('/api/admin/video-studio/capabilities');
        const data = await res.json();
        if (data.success && data.stt) {
          this.sttCaps = data.stt;
          const b = document.getElementById('vsSttEngineBadge');
          if (b) b.textContent = data.stt.available ? (data.stt.activeEngine === 'local_whisper' ? 'Local Whisper AI' : 'Cloud Whisper AI') : 'Offline';
        }
      } catch (_) {}
    },

    async preloadStudioFonts(sampleText = '') {
      if (!document.fonts || typeof document.fonts.load !== 'function') return;
      const urduRun = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوہھیے ً ٌ ٍ َ ُ ِ ّ ْ ٰ ' + String(sampleText || '');
      try {
        await Promise.all([
          document.fonts.load("400 48px 'Noto Nastaliq Urdu'", urduRun),
          document.fonts.load("600 48px 'Noto Nastaliq Urdu'", urduRun),
          document.fonts.load("700 48px 'Noto Nastaliq Urdu'", urduRun),
          document.fonts.load("700 48px 'Noto Naskh Arabic'", urduRun),
          document.fonts.load("700 48px 'Outfit'", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
          document.fonts.load("700 48px 'Inter'", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
        ]);
        if (this.initialized) this.renderFrame();
      } catch (_) {}
    },

    preloadImage(url) {
      if (!url) return null;
      if (this.runtimeImages.has(url)) return this.runtimeImages.get(url);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { if (this.initialized) this.renderFrame(); };
      img.onerror = () => {
        if (url !== '/media/branding/logo.svg' && url === getOfficialLogoUrl()) img.src = '/media/branding/logo.svg';
      };
      img.src = url;
      this.runtimeImages.set(url, img);
      return img;
    },

    getTrackById(trackId) { return this.state.tracks.find(t => t.id === trackId) || null; },
    getOrEnsureTrackByType(type) {
      let tr = this.state.tracks.find(t => t.type === type);
      if (!tr) tr = this.addTrack(type, false);
      return tr;
    },
    getAssetById(assetId) { return this.state.mediaPool.find(a => a.id === assetId) || null; },
    getClipById(clipId) { return this.state.clips.find(c => c.id === clipId) || null; },
    getSelectedClip() { return this.selectedId ? this.getClipById(this.selectedId) : null; },

    getTotalDuration() {
      let maxEnd = 5;
      for (const c of this.state.clips) {
        const end = (Number(c.startTime) || 0) + (Number(c.duration) || 0);
        if (end > maxEnd) maxEnd = end;
        if (c.kind === 'video_overlay' && Array.isArray(c.playSegments)) {
          for (const seg of c.playSegments) {
            if ((Number(seg.end) || 0) > maxEnd) maxEnd = Number(seg.end);
          }
        }
      }
      return Number(maxEnd.toFixed(2));
    },

    getTrackEndTime(trackId) {
      let maxEnd = 0;
      for (const c of this.state.clips) {
        if (c.trackId === trackId) {
          const end = (Number(c.startTime) || 0) + (Number(c.duration) || 0);
          if (end > maxEnd) maxEnd = end;
        }
      }
      return Number(maxEnd.toFixed(2));
    },

    // ================== DYNAMIC UNLIMITED TRACK MANAGEMENT ==================
    autoAdjustTimelineHeightForTracks() {
      if (this.userResizedTimeline) return;
      const wrapper = document.getElementById('videoStudioWorkspaceCard');
      if (!wrapper) return;
      const desired = Math.max(235, Math.min(395, 28 + this.state.tracks.length * 36 + 10));
      wrapper.style.setProperty('--vs-timeline-h', desired + 'px');
      this.resizeStage();
    },

    addTrack(type = 'video', pushHist = true) {
      const meta = TRACK_TYPE_META[type] || TRACK_TYPE_META.video;
      const sameCount = this.state.tracks.filter(t => t.type === type).length + 1;
      const tr = {
        id: makeUid('tr_' + type.slice(0, 3)),
        type,
        name: `${meta.label} ${sameCount}`,
        color: meta.color,
        visible: true,
        locked: false,
        muted: false,
        volume: 1
      };
      this.state.tracks.push(tr);
      this.autoAdjustTimelineHeightForTracks();
      if (pushHist) {
        this.pushHistory();
        this.syncAllUI();
        window.showToast && window.showToast(`Added track "${tr.name}" (${this.state.tracks.length} total)`, 'success');
      }
      return tr;
    },

    renameTrack(trackId, explicitName = null) {
      const tr = this.getTrackById(trackId);
      if (!tr) return;
      const next = explicitName != null ? explicitName : window.prompt('Rename Track:', tr.name);
      if (!next || !next.trim()) return;
      tr.name = next.trim().slice(0, 36);
      this.pushHistory();
      this.syncAllUI();
    },

    moveTrackOrder(trackId, delta) {
      const idx = this.state.tracks.findIndex(t => t.id === trackId);
      if (idx < 0) return;
      const target = idx + delta;
      if (target < 0 || target >= this.state.tracks.length) return;
      const tmp = this.state.tracks[idx];
      this.state.tracks[idx] = this.state.tracks[target];
      this.state.tracks[target] = tmp;
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
    },

    deleteTrack(trackId) {
      if (this.state.tracks.length <= 1) {
        window.showToast && window.showToast('At least one track must remain.', 'info');
        return;
      }
      const tr = this.getTrackById(trackId);
      if (!tr) return;
      this.state.clips.filter(c => c.trackId === trackId).forEach(c => this.disposeRuntimeMedia(c.id));
      this.state.clips = this.state.clips.filter(c => c.trackId !== trackId);
      this.state.tracks = this.state.tracks.filter(t => t.id !== trackId);
      if (this.selectedId && !this.getClipById(this.selectedId)) this.selectedId = this.state.clips[0]?.id || null;
      this.autoAdjustTimelineHeightForTracks();
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
      window.showToast && window.showToast(`Removed track "${tr.name}"`, 'info');
    },

    toggleTrackFlag(trackId, flag) {
      const tr = this.getTrackById(trackId);
      if (!tr) return;
      tr[flag] = !tr[flag];
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
    },

    setTrackVolume(trackId, vol) {
      const tr = this.getTrackById(trackId);
      if (!tr) return;
      tr.volume = Math.max(0, Math.min(1.5, Number(vol)));
      this.renderLayersAndMixer();
    },

    // ================== HISTORY (UNDO / REDO) ==================
    snapshotSerializableState() {
      const s = JSON.parse(JSON.stringify(this.state));
      s.mediaPool.forEach(a => { delete a.localUrl; });
      s.playback.playing = false;
      return s;
    },

    pushHistory() {
      const snap = JSON.stringify(this.snapshotSerializableState());
      if (this.historyIdx >= 0 && this.history[this.historyIdx] === snap) return;
      this.history = this.history.slice(0, this.historyIdx + 1);
      this.history.push(snap);
      if (this.history.length > 50) this.history.shift();
      this.historyIdx = this.history.length - 1;
      this.updateHistoryButtons();
    },

    undo() {
      if (this.historyIdx <= 0) return;
      this.historyIdx--;
      this.restoreSnapshot(JSON.parse(this.history[this.historyIdx]));
    },

    redo() {
      if (this.historyIdx >= this.history.length - 1) return;
      this.historyIdx++;
      this.restoreSnapshot(JSON.parse(this.history[this.historyIdx]));
    },

    restoreSnapshot(snap) {
      const liveBlobMap = new Map(this.state.mediaPool.filter(a => a.localUrl).map(a => [a.id, a.localUrl]));
      this.state = migrateProjectState(snap);
      this.state.mediaPool.forEach(a => { if (liveBlobMap.has(a.id)) a.localUrl = liveBlobMap.get(a.id); });
      this.updateHistoryButtons();
      this.syncAllUI();
      this.resizeStage();
      this.renderFrame();
    },

    updateHistoryButtons() {
      const u = document.getElementById('vsBtnUndo');
      const r = document.getElementById('vsBtnRedo');
      if (u) u.disabled = this.historyIdx <= 0;
      if (r) r.disabled = this.historyIdx >= this.history.length - 1;
    },

    // ================== PANELS, TABS & RESIZER ==================
    toggleDesktopPanel(side) {
      const grid = document.getElementById('vsWorkspaceGrid');
      if (!grid) return;
      if (side === 'left') {
        this.leftPanelCollapsed = !this.leftPanelCollapsed;
        grid.classList.toggle('vs-left-collapsed', this.leftPanelCollapsed);
        document.getElementById('vsBtnToggleLeftPanel')?.classList.toggle('panel-hidden', this.leftPanelCollapsed);
      } else {
        this.rightPanelCollapsed = !this.rightPanelCollapsed;
        grid.classList.toggle('vs-right-collapsed', this.rightPanelCollapsed);
        document.getElementById('vsBtnToggleRightPanel')?.classList.toggle('panel-hidden', this.rightPanelCollapsed);
      }
      setTimeout(() => { this.resizeStage(); this.renderTimeline(); }, 200);
    },

    switchLeftTab(tabName) {
      document.querySelectorAll('#vsLeftControlsCol .vs-tool-tab').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-vs-tab') === tabName);
      });
      const map = {
        media: 'vsPanelMedia',
        subtitles: 'vsPanelSubtitles',
        text: 'vsPanelText',
        audio: 'vsPanelAudio',
        effects: 'vsPanelEffects',
        transitions: 'vsPanelTransitions',
        templates: 'vsPanelTemplates'
      };
      Object.entries(map).forEach(([k, id]) => {
        document.getElementById(id)?.classList.toggle('active', k === tabName);
      });
      if (tabName === 'subtitles') this.renderSubtitlesPanel();
    },

    switchRightTab(tabName) {
      document.querySelectorAll('#vsRightLibraryCol .vs-right-tab').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-vs-rtab') === tabName);
      });
      document.getElementById('vsRightPanelProps')?.classList.toggle('active', tabName === 'props');
      document.getElementById('vsRightPanelDirector')?.classList.toggle('active', tabName === 'director');
      document.getElementById('vsRightPanelLayers')?.classList.toggle('active', tabName === 'layers');
      if (tabName === 'director') this.renderOverlayDirectorPanel();
    },

    toggleMobileDrawer(side) {
      const left = document.getElementById('vsLeftControlsCol');
      const right = document.getElementById('vsRightLibraryCol');
      const btnL = document.getElementById('vsMobToggleTools');
      const btnR = document.getElementById('vsMobToggleProps');
      if (side === 'left') {
        const willShow = left.classList.contains('mobile-collapsed');
        left.classList.toggle('mobile-collapsed', !willShow);
        btnL?.classList.toggle('active', willShow);
      } else {
        const willShow = right.classList.contains('mobile-collapsed');
        right.classList.toggle('mobile-collapsed', !willShow);
        btnR?.classList.toggle('active', willShow);
      }
    },

    bindTimelineResizer() {
      const handle = document.getElementById('vsTimelineResizeHandle');
      const wrapper = document.getElementById('videoStudioWorkspaceCard');
      const shell = document.getElementById('vsNleTimelineShell');
      if (!handle || !wrapper || !shell) return;
      let startY = 0, startH = 235, active = false;
      handle.addEventListener('pointerdown', e => {
        active = true; this.userResizedTimeline = true;
        startY = e.clientY; startH = shell.getBoundingClientRect().height || 235;
        handle.classList.add('dragging'); handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove', e => {
        if (!active) return;
        const nextH = Math.max(150, Math.min(560, Math.round(startH + (startY - e.clientY))));
        wrapper.style.setProperty('--vs-timeline-h', nextH + 'px');
        this.resizeStage();
      });
      handle.addEventListener('pointerup', () => {
        active = false; handle.classList.remove('dragging'); this.resizeStage();
      });
    },

    bindDraggableTools() {
      document.querySelectorAll('[data-drag-effect]').forEach(btn => {
        btn.addEventListener('dragstart', e => {
          e.dataTransfer.setData('application/x-qsf-studio', JSON.stringify({ kind: 'effect', effectType: btn.getAttribute('data-drag-effect') }));
        });
      });
      document.querySelectorAll('[data-drag-trans]').forEach(btn => {
        btn.addEventListener('dragstart', e => {
          e.dataTransfer.setData('application/x-qsf-studio', JSON.stringify({ kind: 'transition', transType: btn.getAttribute('data-drag-trans') }));
        });
      });
    },

    // =========================================================================
    // MULTI-OVERLAY FREEZE FRAME & SEQUENTIAL PLAYBACK / RESUME DIRECTOR
    // =========================================================================
    async extractVideoFrameDataUrl(srcUrl, timeSec = 0) {
      return new Promise(resolve => {
        const vid = document.createElement('video');
        vid.muted = true; vid.playsInline = true; vid.crossOrigin = 'anonymous';
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          let url = null;
          try {
            const vw = vid.videoWidth || 320, vh = vid.videoHeight || 180;
            const c = document.createElement('canvas');
            const maxW = 480;
            const sc = Math.min(1, maxW / Math.max(vw, vh));
            c.width = Math.max(2, Math.round(vw * sc));
            c.height = Math.max(2, Math.round(vh * sc));
            c.getContext('2d').drawImage(vid, 0, 0, c.width, c.height);
            url = c.toDataURL('image/jpeg', 0.84);
          } catch (_) {}
          try { vid.removeAttribute('src'); vid.load(); } catch (_) {}
          resolve(url);
        };
        vid.onloadedmetadata = () => {
          const clamped = Math.max(0, Math.min(Math.max(0, (vid.duration || 1) - 0.04), Number(timeSec) || 0));
          vid.currentTime = clamped;
          vid.onseeked = finish;
          setTimeout(finish, 450);
        };
        vid.onerror = () => resolve(null);
        vid.src = srcUrl;
        vid.load();
      });
    },

    async setOverlayFreezeFrame(clipId, timeSec, pushHist = true) {
      const clip = this.getClipById(clipId);
      if (!clip || clip.kind !== 'video_overlay') return;
      const srcDur = Math.max(0.2, Number(clip.sourceDuration) || Number(clip.duration) || 10);
      const tVal = Number(Math.max(0, Math.min(srcDur - 0.04, Number(timeSec) || 0)).toFixed(2));
      clip.freezeFrameTime = tVal;
      clip.useSequentialControl = true;

      const asset = this.getAssetById(clip.assetId);
      const src = asset && (asset.localUrl || asset.url);
      if (src) {
        const dataUrl = await this.extractVideoFrameDataUrl(src, tVal);
        if (dataUrl) {
          clip.freezeFrameDataUrl = dataUrl;
          this.preloadImage(dataUrl);
        }
      }
      if (pushHist) this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
    },

    async captureOverlayFreezeFrameNow(clipId) {
      const clip = this.getClipById(clipId);
      if (!clip || clip.kind !== 'video_overlay') return;
      const evalState = evaluateOverlayPlaybackAt(clip, this.state.playback.currentTime);
      await this.setOverlayFreezeFrame(clipId, evalState.srcTime, true);
      window.showToast && window.showToast(`Selected freeze frame @ ${formatSec(evalState.srcTime)} for "${clip.name}"`, 'success');
    },

    addOverlayPlaySegment(clipId, startSec = null, endSec = null) {
      const clip = this.getClipById(clipId);
      if (!clip || clip.kind !== 'video_overlay') return null;
      clip.useSequentialControl = true;
      if (!Array.isArray(clip.playSegments)) clip.playSegments = [];
      const s = startSec != null ? Math.max(0, Number(startSec)) : Number(this.state.playback.currentTime.toFixed(2));
      const e = endSec != null ? Math.max(s + 0.5, Number(endSec)) : Number((s + 4).toFixed(2));
      const seg = { id: makeUid('seg'), start: Number(s.toFixed(2)), end: Number(e.toFixed(2)) };
      clip.playSegments.push(seg);
      clip.playSegments.sort((a, b) => a.start - b.start);
      // Ensure overlay stays visible across all its scheduled playback segments
      if (clip.startTime > seg.start) clip.startTime = seg.start;
      const neededEnd = Math.max(clip.startTime + clip.duration, seg.end);
      clip.duration = Number((neededEnd - clip.startTime).toFixed(2));
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
      return seg;
    },

    updateOverlayPlaySegment(clipId, segIdx, field, val) {
      const clip = this.getClipById(clipId);
      if (!clip || !Array.isArray(clip.playSegments) || !clip.playSegments[segIdx]) return;
      const seg = clip.playSegments[segIdx];
      seg[field] = Math.max(0, Number(val) || 0);
      if (seg.end <= seg.start + 0.2) seg.end = Number((seg.start + 0.5).toFixed(2));
      clip.playSegments.sort((a, b) => a.start - b.start);
      const maxEnd = Math.max(clip.startTime + clip.duration, ...clip.playSegments.map(x => x.end));
      clip.duration = Number((maxEnd - clip.startTime).toFixed(2));
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
    },

    deleteOverlayPlaySegment(clipId, segIdx) {
      const clip = this.getClipById(clipId);
      if (!clip || !Array.isArray(clip.playSegments)) return;
      clip.playSegments.splice(segIdx, 1);
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
    },

    // Manual Director Actions: Play / Pause / Resume / Stop / Reset Position
    directorPlayOverlay(clipId, durationSec = 5) {
      const target = this.getClipById(clipId);
      if (!target || target.kind !== 'video_overlay') return;
      const t = Number(this.state.playback.currentTime.toFixed(2));

      // Pause any other currently playing overlay right at `t` so only the selected overlay plays!
      this.state.clips.forEach(c => {
        if (c.kind === 'video_overlay' && c.id !== clipId && Array.isArray(c.playSegments)) {
          c.playSegments.forEach(seg => {
            if (t > seg.start + 0.05 && t < seg.end) {
              seg.end = t;
            }
          });
        }
      });

      target.useSequentialControl = true;
      if (!Array.isArray(target.playSegments)) target.playSegments = [];
      // Remove/trim overlapping future segment at `t`
      target.playSegments = target.playSegments.filter(seg => seg.end <= t + 0.01);
      const evalNow = evaluateOverlayPlaybackAt(target, t);
      const remainingSrc = Math.max(0.5, (target.playEndPos || target.sourceDuration || 10) - evalNow.savedCursor);
      const segDur = Math.max(0.5, Math.min(durationSec, target.loopPlayback ? durationSec : remainingSrc));
      target.playSegments.push({ id: makeUid('seg'), start: t, end: Number((t + segDur).toFixed(2)) });
      target.playSegments.sort((a, b) => a.start - b.start);

      // Keep all overlays visible across composition
      const newTotal = Math.max(this.getTotalDuration(), t + segDur);
      this.state.clips.forEach(c => {
        if (c.kind === 'video_overlay' && c.startTime <= t && c.startTime + c.duration < newTotal) {
          c.duration = Number((newTotal - c.startTime).toFixed(2));
        }
      });

      this.selectedId = clipId;
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
      window.showToast && window.showToast(`"${target.name}" active from ${formatSec(evalNow.savedCursor)} (at timeline ${formatSec(t)})`, 'success');
    },

    directorPauseOverlay(clipId) {
      const target = this.getClipById(clipId);
      if (!target || target.kind !== 'video_overlay') return;
      const t = Number(this.state.playback.currentTime.toFixed(2));
      target.useSequentialControl = true;
      if (Array.isArray(target.playSegments)) {
        target.playSegments.forEach(seg => {
          if (t > seg.start + 0.05 && t < seg.end) seg.end = t;
        });
      }
      const st = evaluateOverlayPlaybackAt(target, t);
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
      window.showToast && window.showToast(`Paused "${target.name}" — frozen & saved resume position @ ${formatSec(st.savedCursor)}`, 'info');
    },

    directorResumeOverlay(clipId, durationSec = 5) {
      this.directorPlayOverlay(clipId, durationSec);
    },

    directorStopOverlay(clipId) {
      this.directorPauseOverlay(clipId);
    },

    directorResetOverlayPosition(clipId) {
      const target = this.getClipById(clipId);
      if (!target || target.kind !== 'video_overlay') return;
      target.useSequentialControl = true;
      target.playStartPos = 0;
      target.playSegments = [];
      this.pushHistory();
      this.syncAllUI();
      this.renderFrame();
      window.showToast && window.showToast(`Reset playback position for "${target.name}" to 00:00.0`, 'info');
    },

    /**
     * Programmatic or UI-driven Sequential Playback Scheduler.
     * steps = [{ clipId, durationSec }, ...]
     * Automatically keeps all involved overlays visible throughout the full composition (startTime=0, duration=totalSeq),
     * freezes inactive overlays on their selected freeze frame (before playing) or last-played frame (after pausing),
     * and guarantees exact resume from saved position whenever a clip appears again later in the sequence!
     */
    applySequentialSchedule(steps) {
      if (!Array.isArray(steps) || !steps.length) return false;
      const overlayClips = this.state.clips.filter(c => c.kind === 'video_overlay');
      const byId = new Map(overlayClips.map(c => [c.id, c]));

      // Reset playSegments on all scheduled overlays first
      const touched = new Set();
      steps.forEach(st => { if (byId.has(st.clipId)) touched.add(st.clipId); });
      if (!touched.size) return false;

      touched.forEach(id => {
        const c = byId.get(id);
        c.useSequentialControl = true;
        c.playSegments = [];
      });

      let cursorT = 0;
      for (const step of steps) {
        const c = byId.get(step.clipId);
        if (!c) continue;
        const dur = Math.max(0.5, Number(step.durationSec) || 4);
        c.playSegments.push({
          id: makeUid('seg'),
          start: Number(cursorT.toFixed(2)),
          end: Number((cursorT + dur).toFixed(2))
        });
        cursorT += dur;
      }

      const totalSeqDur = Number(cursorT.toFixed(2));
      // Keep ALL overlay videos visible in their assigned positions for the entire composition!
      overlayClips.forEach(c => {
        c.useSequentialControl = true;
        c.startTime = 0;
        c.duration = Math.max(totalSeqDur, c.duration || totalSeqDur);
      });
      // Stretch official logo & auto-stretch text neatly
      this.state.clips.forEach(c => {
        if ((c.isOfficialLogo || c._autoStretch) && c.startTime === 0 && c.duration < totalSeqDur) {
          c.duration = totalSeqDur;
        }
      });

      this.state.directorQueue = steps.map(s => ({ clipId: s.clipId, durationSec: Number(s.durationSec) || 4 }));
      this.pushHistory();
      this.syncAllUI();
      this.fitTimelineZoom();
      this.renderFrame();
      window.showToast && window.showToast(`Applied sequential overlay schedule (${formatSec(totalSeqDur)} total)!`, 'success');
      return true;
    },

    addDirectorQueueStep() {
      const overlays = this.state.clips.filter(c => c.kind === 'video_overlay');
      if (!overlays.length) return;
      if (!Array.isArray(this.state.directorQueue)) this.state.directorQueue = [];
      const nextClip = overlays[this.state.directorQueue.length % overlays.length];
      this.state.directorQueue.push({ clipId: nextClip.id, durationSec: 5 });
      this.renderOverlayDirectorPanel();
    },

    updateDirectorQueueStep(idx, field, val) {
      if (!Array.isArray(this.state.directorQueue) || !this.state.directorQueue[idx]) return;
      this.state.directorQueue[idx][field] = field === 'durationSec' ? Math.max(0.5, Number(val) || 4) : val;
    },

    removeDirectorQueueStep(idx) {
      if (!Array.isArray(this.state.directorQueue)) return;
      this.state.directorQueue.splice(idx, 1);
      this.renderOverlayDirectorPanel();
    },

    applyDirectorQueueFromUI() {
      if (!Array.isArray(this.state.directorQueue) || !this.state.directorQueue.length) {
        window.showToast && window.showToast('Add at least one step to the Sequential Queue first.', 'info');
        return;
      }
      this.applySequentialSchedule(this.state.directorQueue);
    },

    renderOverlayDirectorPanel() {
      const body = document.getElementById('vsOverlayDirectorBody');
      if (!body) return;
      const overlays = this.state.clips.filter(c => c.kind === 'video_overlay');
      if (!overlays.length) {
        body.innerHTML = '<div class="vs-empty-inspector">Upload videos and click <strong>+ Overlay</strong> to add multiple video overlays. Then configure freeze frames, independent play/pause/resume, and sequential playback here.</div>';
        return;
      }
      const t = this.state.playback.currentTime;
      const cardsHtml = overlays.map((c, idx) => {
        const st = evaluateOverlayPlaybackAt(c, t);
        const asset = this.getAssetById(c.assetId);
        const thumb = c.freezeFrameDataUrl || (asset && asset.thumbnail) || '';
        const statusText = st.isPlaying
          ? `PLAYING @ ${formatSec(st.srcTime)}`
          : (st.hasEverPlayed ? `FROZEN (Saved @ ${formatSec(st.savedCursor)})` : `FROZEN (Initial @ ${formatSec(st.srcTime)})`);
        return `
          <div class="vs-director-card ${st.isPlaying ? 'is-playing' : 'is-frozen'}" onclick="window.QSFVideoStudio.selectClip('${c.id}')">
            <div class="vs-director-top">
              ${thumb ? `<img class="vs-director-thumb" src="${thumb}" alt="">` : `<div class="vs-director-thumb"></div>`}
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.72rem;font-weight:800;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">#${idx + 1} ${escHtml(c.name)}</div>
                <span class="vs-director-badge ${st.isPlaying ? 'playing' : 'frozen'}">${statusText}</span>
                <div style="font-size:0.61rem;color:#64748B;margin-top:2px;">Freeze: ${formatSec(c.freezeFrameTime || 0)} • Turns: ${(c.playSegments || []).length} • Loop: ${c.loopPlayback ? 'On' : 'Off'}</div>
              </div>
            </div>
            <div class="vs-director-controls" onclick="event.stopPropagation()">
              <button type="button" class="vs-chip-btn primary" onclick="window.QSFVideoStudio.directorPlayOverlay('${c.id}')" title="Play / Resume From Saved Position at Playhead"><i class="fas fa-play"></i> ${st.hasEverPlayed ? 'Resume' : 'Play'}</button>
              <button type="button" class="vs-chip-btn" onclick="window.QSFVideoStudio.directorPauseOverlay('${c.id}')" title="Pause & Freeze at Current Frame"><i class="fas fa-pause"></i> Pause</button>
              <button type="button" class="vs-chip-btn" onclick="window.QSFVideoStudio.directorResetOverlayPosition('${c.id}')" title="Reset Playback Position to Start"><i class="fas fa-rotate-left"></i> Reset</button>
              <button type="button" class="vs-chip-btn" onclick="window.QSFVideoStudio.captureOverlayFreezeFrameNow('${c.id}')" title="Set Current Frame as Freeze Frame"><i class="fas fa-snowflake"></i> Freeze</button>
            </div>
          </div>
        `;
      }).join('');

      if (!Array.isArray(this.state.directorQueue) || !this.state.directorQueue.length) {
        this.state.directorQueue = overlays.map((c, i) => ({ clipId: c.id, durationSec: i === 0 ? 8 : 5 }));
      }
      const queueRows = this.state.directorQueue.map((step, i) => `
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
          <span style="font-size:0.64rem;font-weight:800;color:#475569;width:16px;">${i + 1}.</span>
          <select class="form-control compact-input" style="flex:1;font-size:0.68rem;height:25px;" onchange="window.QSFVideoStudio.updateDirectorQueueStep(${i},'clipId',this.value)">
            ${overlays.map((ov, oi) => `<option value="${ov.id}" ${ov.id === step.clipId ? 'selected' : ''}>#${oi + 1} ${escHtml(ov.name).slice(0, 18)}</option>`).join('')}
          </select>
          <input type="number" class="form-control compact-input" min="0.5" step="0.5" value="${step.durationSec}" style="width:52px;font-size:0.68rem;height:25px;" title="Play Duration (s)" onchange="window.QSFVideoStudio.updateDirectorQueueStep(${i},'durationSec',this.value)" />
          <span style="font-size:0.62rem;color:#64748B;">s</span>
          <button type="button" class="vs-chip-btn" style="color:#B91C1C;" onclick="window.QSFVideoStudio.removeDirectorQueueStep(${i})">&times;</button>
        </div>
      `).join('');

      body.innerHTML = `
        <div class="news-panel-section compact-section" style="margin-bottom:8px;">
          <div class="news-section-title compact-title"><span><i class="fas fa-film" style="color:#0284C7;"></i> Video Overlays (${overlays.length})</span></div>
          ${cardsHtml}
        </div>
        <div class="news-panel-section compact-section">
          <div class="news-section-title compact-title">
            <span><i class="fas fa-list-ol" style="color:#B91C1C;"></i> Sequential Playback Queue</span>
            <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.addDirectorQueueStep()"><i class="fas fa-plus"></i> Step</button>
          </div>
          <p style="margin:0 0 6px;font-size:0.64rem;color:#64748B;">Order turns (e.g. Video 1 for 8s → Video 2 → Video 3 → Resume Video 1 from 8s). Inactive videos stay frozen &amp; visible.</p>
          ${queueRows}
          <button type="button" class="btn-admin btn-admin-primary" style="width:100%;margin-top:5px;padding:6px 8px;font-size:0.72rem;font-weight:800;" onclick="window.QSFVideoStudio.applyDirectorQueueFromUI()">
            <i class="fas fa-wand-magic-sparkles"></i> Apply Sequence to Timeline
          </button>
        </div>
      `;
    },

    // =========================================================================
    // AI AUTO SUBTITLES (SPEECH-TO-TEXT: URDU & ENGLISH + SEPARATE TRANSLATION)
    // =========================================================================
    async extractAudioBufferForSubtitles(sourceKey = 'timeline') {
      if (sourceKey !== 'timeline') {
        const asset = this.getAssetById(sourceKey);
        if (asset) {
          const decoded = await this.decodeAssetAudio(asset);
          if (decoded) return { buffer: decoded, offsetSec: 0 };
        }
      }
      const totalDur = Math.max(1, this.getTotalDuration());
      const mixed = await this.buildMixedStereoAudioBuffer(totalDur, () => {});
      if (mixed) return { buffer: mixed, offsetSec: 0 };

      // Fallback: try first video or audio asset in mediaPool
      const firstMedia = this.state.mediaPool.find(a => a.type === 'video' || a.type === 'audio');
      if (firstMedia) {
        const decoded = await this.decodeAssetAudio(firstMedia);
        if (decoded) return { buffer: decoded, offsetSec: 0 };
      }
      return null;
    },

    async resampleBufferTo16kMono(audioBuf) {
      const targetSr = 16000;
      const outLen = Math.max(1, Math.ceil(audioBuf.duration * targetSr));
      const offline = new OfflineAudioContext(1, outLen, targetSr);
      const src = offline.createBufferSource();
      src.buffer = audioBuf;
      src.connect(offline.destination);
      src.start(0);
      const rendered = await offline.startRendering();
      return rendered.getChannelData(0);
    },

    async generateAutoSubtitles(explicitLang = null, explicitSource = null) {
      if (this.isGeneratingSubtitles) return null;
      this.isGeneratingSubtitles = true;

      const lang = explicitLang || document.getElementById('vsAutoSubLang')?.value || 'auto';
      const sourceKey = explicitSource || document.getElementById('vsAutoSubSource')?.value || 'timeline';
      const btn = document.getElementById('vsBtnGenerateAutoSubs');
      const wrap = document.getElementById('vsAutoSubProgressWrap');
      const fill = document.getElementById('vsAutoSubProgressFill');
      const pctTxt = document.getElementById('vsAutoSubPctText');
      const statusTxt = document.getElementById('vsAutoSubStatusText');
      const errBox = document.getElementById('vsAutoSubErrorBox');

      if (btn) btn.disabled = true;
      wrap?.classList.remove('hidden');
      errBox?.classList.add('hidden');

      const setProg = (pct, msg) => {
        const p = Math.max(0, Math.min(100, Math.round(pct)));
        if (fill) fill.style.width = p + '%';
        if (pctTxt) pctTxt.textContent = p + '%';
        if (statusTxt) statusTxt.textContent = msg;
      };

      try {
        setProg(6, 'Extracting audio stream from timeline...');
        const extracted = await this.extractAudioBufferForSubtitles(sourceKey);
        if (!extracted || !extracted.buffer) {
          throw new Error('No audio found in the uploaded video or timeline. Please upload a video/audio file with speech first.');
        }

        setProg(14, 'Resampling audio to 16kHz mono for speech recognition...');
        const mono16k = await this.resampleBufferTo16kMono(extracted.buffer);
        const sr = 16000;
        const chunkSec = 25;
        const chunkSamples = chunkSec * sr;
        const numChunks = Math.max(1, Math.ceil(mono16k.length / chunkSamples));

        const allSegments = [];
        let lastDetectedLang = lang === 'ur' ? 'ur' : 'en';
        let usedEngine = '';

        for (let ci = 0; ci < numChunks; ci++) {
          const startSample = ci * chunkSamples;
          const endSample = Math.min(mono16k.length, startSample + chunkSamples);
          const slice = mono16k.subarray(startSample, endSample);
          const chunkOffsetSec = (extracted.offsetSec || 0) + (startSample / sr);
          const wavBlob = encodeMono16BitWav(slice, sr);

          setProg(18 + ((ci) / numChunks) * 74, `Transcribing chunk ${ci + 1}/${numChunks} (${lang === 'auto' ? 'Auto Detect' : lang.toUpperCase()})...`);
          const fd = new FormData();
          fd.append('audio', wavBlob, `chunk_${ci}.wav`);
          fd.append('language', lang);
          fd.append('chunkOffsetSec', String(chunkOffsetSec));

          const resp = await fetch('/api/admin/video-studio/transcribe-chunk', { method: 'POST', body: fd });
          const data = await resp.json();
          if (!resp.ok || !data.success) {
            throw new Error(data.message || `Speech-to-text failed on chunk ${ci + 1}.`);
          }
          usedEngine = data.engine || usedEngine;
          if (data.detectedLanguage) lastDetectedLang = data.detectedLanguage;
          if (Array.isArray(data.segments)) {
            allSegments.push(...data.segments);
          }
        }

        if (!allSegments.length) {
          throw new Error('No clear speech was detected in the audio. Try selecting the specific spoken language (Urdu or English) or adding subtitles manually.');
        }

        setProg(95, `Placing ${allSegments.length} timestamped subtitle(s) onto Subtitle Track...`);
        const subTrack = this.getOrEnsureTrackByType('subtitle');
        // Replace existing auto-generated subtitles on this subtitle track cleanly
        this.state.clips = this.state.clips.filter(c => c.trackId !== subTrack.id);

        const createdClips = allSegments.map((seg, idx) => {
          const isUrdu = seg.language === 'ur' || containsArabicScript(seg.text);
          return this.createSubtitleClipObject({
            trackId: subTrack.id,
            text: seg.text,
            startTime: seg.start,
            duration: Math.max(0.5, Number((seg.end - seg.start).toFixed(2))),
            language: isUrdu ? 'ur' : 'en',
            index: idx + 1
          });
        });

        this.state.clips.push(...createdClips);
        if (createdClips[0]) this.selectedId = createdClips[0].id;

        await this.preloadStudioFonts(createdClips.map(c => c.text).join(' '));
        this.pushHistory();
        this.syncAllUI();
        this.renderSubtitlesPanel();
        this.renderFrame();

        setProg(100, `Done! Generated ${createdClips.length} ${lastDetectedLang === 'ur' ? 'Urdu' : 'English'} subtitle(s).`);
        window.showToast && window.showToast(`Generated ${createdClips.length} ${lastDetectedLang === 'ur' ? 'Urdu' : 'English'} auto subtitles!`, 'success');
        setTimeout(() => wrap?.classList.add('hidden'), 2200);
        return { engine: usedEngine, detectedLanguage: lastDetectedLang, count: createdClips.length, clips: createdClips };
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message || 'Auto subtitle generation failed.';
          errBox.classList.remove('hidden');
        }
        wrap?.classList.add('hidden');
        window.showToast && window.showToast(err.message || 'Auto subtitles failed.', 'error');
        return null;
      } finally {
        this.isGeneratingSubtitles = false;
        if (btn) btn.disabled = false;
      }
    },

    createSubtitleClipObject({ trackId, text, startTime, duration, language = 'en', index = 1 }) {
      const isUr = language === 'ur' || containsArabicScript(text);
      return {
        id: makeUid('sub'),
        trackId,
        kind: 'subtitle',
        language: isUr ? 'ur' : 'en',
        name: `SUB #${index}`,
        text: String(text || '').trim(),
        dir: isUr ? 'rtl' : 'ltr',
        fontFamily: isUr ? "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif" : "'Outfit', 'Inter', sans-serif",
        fontSize: isUr ? 34 : 32,
        fontWeight: '700',
        align: 'center',
        color: '#FFFFFF',
        bgColor: '#000000',
        bgOpacity: 0.78,
        outlineColor: '#000000',
        outlineWidth: 2,
        shadow: true,
        lineHeight: isUr ? 1.7 : 1.28,
        letterSpacing: 0,
        padding: 12,
        borderRadius: 8,
        rotation: 0,
        opacity: 1,
        animation: 'fade_in',
        animDuration: 0.25,
        maxWidthPct: 90,
        xPct: 50,
        yPct: 86,
        startTime: Number(Math.max(0, startTime).toFixed(2)),
        duration: Number(Math.max(0.4, duration).toFixed(2)),
        keyframes: [],
        visible: true,
        locked: false
      };
    },

    addManualSubtitle(explicitText = null, explicitLang = null) {
      const langVal = explicitLang || document.getElementById('vsAutoSubLang')?.value || 'ur';
      const isUr = langVal === 'ur' || (langVal === 'auto' && containsArabicScript(explicitText));
      const subTrack = this.getOrEnsureTrackByType('subtitle');
      const existing = this.state.clips.filter(c => c.kind === 'subtitle');
      const start = Number(this.state.playback.currentTime.toFixed(2));
      const clip = this.createSubtitleClipObject({
        trackId: subTrack.id,
        text: explicitText || (isUr ? 'یہاں اردو سب ٹائٹل تحریر کریں' : 'Enter English subtitle text here'),
        startTime: start,
        duration: 3.0,
        language: isUr ? 'ur' : 'en',
        index: existing.length + 1
      });
      this.state.clips.push(clip);
      this.selectedId = clip.id;
      this.pushHistory();
      this.syncAllUI();
      this.renderSubtitlesPanel();
      this.renderFrame();
      return clip;
    },

    async translateAllSubtitles(targetLang = 'en') {
      const subs = this.state.clips.filter(c => c.kind === 'subtitle').sort((a, b) => a.startTime - b.startTime);
      if (!subs.length) {
        window.showToast && window.showToast('Generate or add subtitles first before translating.', 'info');
        return null;
      }
      const btnEn = document.getElementById('vsBtnTranslateToEn');
      const btnUr = document.getElementById('vsBtnTranslateToUr');
      if (btnEn) btnEn.disabled = true;
      if (btnUr) btnUr.disabled = true;
      try {
        const payload = {
          sourceLanguage: 'auto',
          targetLanguage: targetLang === 'ur' ? 'ur' : 'en',
          segments: subs.map(s => ({ id: s.id, start: s.startTime, end: s.startTime + s.duration, text: s.text }))
        };
        const resp = await fetch('/api/admin/video-studio/translate-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.message || 'Subtitle translation failed.');

        const isUr = targetLang === 'ur';
        (data.segments || []).forEach((trSeg, i) => {
          const clip = subs[i];
          if (!clip) return;
          clip.text = trSeg.text || clip.text;
          clip.language = isUr ? 'ur' : 'en';
          clip.dir = isUr ? 'rtl' : 'ltr';
          clip.fontFamily = isUr ? "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif" : "'Outfit', 'Inter', sans-serif";
          clip.lineHeight = isUr ? 1.7 : 1.28;
        });

        await this.preloadStudioFonts(subs.map(s => s.text).join(' '));
        this.pushHistory();
        this.syncAllUI();
        this.renderSubtitlesPanel();
        this.renderFrame();
        window.showToast && window.showToast(`Translated ${subs.length} subtitle(s) to ${isUr ? 'Urdu' : 'English'}!`, 'success');
        return data.segments;
      } catch (err) {
        window.showToast && window.showToast(err.message || 'Subtitle translation failed.', 'error');
        return null;
      } finally {
        if (btnEn) btnEn.disabled = false;
        if (btnUr) btnUr.disabled = false;
      }
    },

    updateSubtitleInline(clipId, field, value) {
      const clip = this.getClipById(clipId);
      if (!clip || clip.kind !== 'subtitle') return;
      if (field === 'text') {
        clip.text = value;
        const isUr = containsArabicScript(value);
        if (isUr && clip.dir !== 'rtl') {
          clip.dir = 'rtl'; clip.language = 'ur';
          clip.fontFamily = "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif";
          clip.lineHeight = 1.7;
        }
      } else if (field === 'startTime') {
        const end = clip.startTime + clip.duration;
        clip.startTime = Math.max(0, Number(value) || 0);
        clip.duration = Math.max(0.3, Number((end - clip.startTime).toFixed(2)));
      } else if (field === 'endTime') {
        const end = Math.max(clip.startTime + 0.3, Number(value) || (clip.startTime + 1));
        clip.duration = Number((end - clip.startTime).toFixed(2));
      }
      this.renderTimeline();
      this.renderFrame();
    },

    splitSubtitleSegment(clipId) {
      const clip = this.getClipById(clipId);
      if (!clip || clip.kind !== 'subtitle') return;
      const halfDur = Math.max(0.3, Number((clip.duration / 2).toFixed(2)));
      const words = String(clip.text || '').trim().split(/\s+/);
      const mid = Math.max(1, Math.ceil(words.length / 2));
      const leftTxt = words.slice(0, mid).join(' ') || clip.text;
      const rightTxt = words.slice(mid).join(' ') || clip.text;

      const copy = JSON.parse(JSON.stringify(clip));
      copy.id = makeUid('sub');
      copy.startTime = Number((clip.startTime + halfDur).toFixed(2));
      copy.duration = Math.max(0.3, Number((clip.duration - halfDur).toFixed(2)));
      copy.text = rightTxt;

      clip.duration = halfDur;
      clip.text = leftTxt;
      this.state.clips.push(copy);
      this.selectedId = copy.id;
      this.pushHistory();
      this.syncAllUI();
      this.renderSubtitlesPanel();
      this.renderFrame();
    },

    mergeSubtitleWithNext(clipId) {
      const subs = this.state.clips.filter(c => c.kind === 'subtitle').sort((a, b) => a.startTime - b.startTime);
      const idx = subs.findIndex(c => c.id === clipId);
      if (idx < 0 || idx >= subs.length - 1) return;
      const curr = subs[idx], next = subs[idx + 1];
      curr.text = `${curr.text}\n${next.text}`.trim();
      const newEnd = Math.max(curr.startTime + curr.duration, next.startTime + next.duration);
      curr.duration = Number((newEnd - curr.startTime).toFixed(2));
      this.state.clips = this.state.clips.filter(c => c.id !== next.id);
      this.selectedId = curr.id;
      this.pushHistory();
      this.syncAllUI();
      this.renderSubtitlesPanel();
      this.renderFrame();
    },

    applyStyleToAllSubtitles() {
      let ref = this.getSelectedClip();
      if (!ref || ref.kind !== 'subtitle') ref = this.state.clips.find(c => c.kind === 'subtitle');
      if (!ref) return;
      const styleKeys = ['fontFamily', 'fontSize', 'fontWeight', 'align', 'color', 'bgColor', 'bgOpacity', 'outlineColor', 'outlineWidth', 'shadow', 'lineHeight', 'padding', 'borderRadius', 'xPct', 'yPct', 'maxWidthPct', 'animation', 'animDuration'];
      this.state.clips.forEach(c => {
        if (c.kind === 'subtitle') styleKeys.forEach(k => { c[k] = ref[k]; });
      });
      this.pushHistory();
      this.renderFrame();
      window.showToast && window.showToast('Synced subtitle style across all subtitle segments!', 'success');
    },

    renderSubtitlesPanel() {
      const srcSel = document.getElementById('vsAutoSubSource');
      if (srcSel) {
        const cur = srcSel.value || 'timeline';
        const mediaItems = this.state.mediaPool.filter(a => a.type === 'video' || a.type === 'audio');
        srcSel.innerHTML = `<option value="timeline">Timeline Audio Mix</option>` +
          mediaItems.map(a => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${escHtml(a.name).slice(0, 26)}</option>`).join('');
      }
      const subs = this.state.clips.filter(c => c.kind === 'subtitle').sort((a, b) => a.startTime - b.startTime);
      const cnt = document.getElementById('vsSubtitleCount');
      if (cnt) cnt.textContent = String(subs.length);
      const list = document.getElementById('vsSubtitlesEditorList');
      if (!list) return;
      if (!subs.length) {
        list.innerHTML = '<div class="vs-empty-inspector">Click <strong>Auto Subtitles</strong> above to transcribe speech from your video, or click <strong>+ Manual</strong> to add a subtitle segment.</div>';
        return;
      }
      const t = this.state.playback.currentTime;
      list.innerHTML = subs.map((s, idx) => {
        const active = t >= s.startTime && t <= s.startTime + s.duration;
        const endT = Number((s.startTime + s.duration).toFixed(2));
        return `
          <div class="vs-sub-row ${active || this.selectedId === s.id ? 'active-sub' : ''}" onclick="window.QSFVideoStudio.selectClip('${s.id}'); window.QSFVideoStudio.seekTo(${s.startTime});">
            <div class="vs-sub-row-head">
              <span>#${idx + 1} (${s.dir === 'rtl' ? 'اردو' : 'EN'})</span>
              <div class="vs-sub-time-inputs" onclick="event.stopPropagation()">
                <input type="number" step="0.1" min="0" value="${s.startTime.toFixed(1)}" onchange="window.QSFVideoStudio.updateSubtitleInline('${s.id}','startTime',this.value)" title="Start (s)" />
                <span>–</span>
                <input type="number" step="0.1" min="0.3" value="${endT.toFixed(1)}" onchange="window.QSFVideoStudio.updateSubtitleInline('${s.id}','endTime',this.value)" title="End (s)" />
              </div>
              <div style="display:flex;gap:3px;" onclick="event.stopPropagation()">
                <button type="button" class="vs-chip-btn" title="Split Subtitle" onclick="window.QSFVideoStudio.splitSubtitleSegment('${s.id}')"><i class="fas fa-scissors"></i></button>
                ${idx < subs.length - 1 ? `<button type="button" class="vs-chip-btn" title="Merge with Next" onclick="window.QSFVideoStudio.mergeSubtitleWithNext('${s.id}')"><i class="fas fa-link"></i></button>` : ''}
                <button type="button" class="vs-chip-btn" style="color:#B91C1C;" title="Delete" onclick="window.QSFVideoStudio.selectClip('${s.id}'); window.QSFVideoStudio.deleteSelected();"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <textarea class="vs-sub-textarea" dir="${s.dir}" onclick="event.stopPropagation()" oninput="window.QSFVideoStudio.updateSubtitleInline('${s.id}','text',this.value)">${escHtml(s.text)}</textarea>
          </div>
        `;
      }).join('');
    },

    // =========================================================================
    // VOICE-OVER MICROPHONE RECORDING
    // =========================================================================
    async toggleVoiceOverRecording() {
      const btn = document.getElementById('vsBtnVoiceOverRecord');
      const lbl = document.getElementById('vsVoiceOverBtnLabel');
      const timerEl = document.getElementById('vsVoiceOverTimer');

      if (this.voRecorder && this.voRecorder.state === 'recording') {
        this.voRecorder.stop();
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        window.showToast && window.showToast('Microphone recording is not available in this browser context.', 'error');
        return;
      }

      try {
        this.voStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.voChunks = [];
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        this.voRecorder = new MediaRecorder(this.voStream, { mimeType: mime });
        const startPlayhead = Number(this.state.playback.currentTime.toFixed(2));

        this.voRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) this.voChunks.push(e.data); };
        this.voRecorder.onstop = async () => {
          clearInterval(this.voTimerId);
          this.voStream?.getTracks().forEach(tr => tr.stop());
          btn?.classList.remove('vs-vo-recording');
          if (lbl) lbl.textContent = 'Record Voice-Over';
          timerEl?.classList.add('hidden');

          const blob = new Blob(this.voChunks, { type: mime });
          if (blob.size > 500) {
            const file = new File([blob], `voiceover_${Date.now()}.webm`, { type: mime });
            const res = await this.handleAudioFileSelect(file, true, false);
            if (res && res.clip) {
              res.clip.startTime = startPlayhead;
              res.clip.volume = 1.0;
              res.clip.loop = false;
              this.syncAllUI();
              window.showToast && window.showToast('Voice-over recorded and added to Audio track!', 'success');
            }
          }
        };

        this.voStartTs = Date.now();
        this.voRecorder.start(250);
        btn?.classList.add('vs-vo-recording');
        if (lbl) lbl.textContent = 'Stop Recording';
        timerEl?.classList.remove('hidden');
        this.voTimerId = setInterval(() => {
          const sec = Math.floor((Date.now() - this.voStartTs) / 1000);
          if (timerEl) timerEl.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
        }, 300);
      } catch (err) {
        window.showToast && window.showToast('Microphone permission denied or unavailable.', 'error');
      }
    },

    // ================== BUILT-IN 15 SFX LIBRARY & CUSTOM SFX UPLOAD ==================
    async loadSfxLibrary() {
      try {
        const res = await fetch('/api/admin/video-studio/sfx-library');
        const data = await res.json();
        if (data.success) {
          this.sfxCatalog = { builtin: data.builtin || [], custom: data.custom || [] };
          this.renderSfxLibrary();
        }
      } catch (_) {
        const list = document.getElementById('vsSfxLibraryList');
        if (list) list.innerHTML = '<div class="vs-empty-inspector">Sound effects library unavailable offline.</div>';
      }
    },

    filterSfxCategory(cat) {
      this.sfxCategory = cat;
      document.querySelectorAll('#vsSfxCatPills button').forEach(b => {
        const lbl = b.textContent.trim();
        const match = (cat === 'All' && lbl === 'All') || (cat === 'UI / Alert' && lbl === 'Alert') || lbl === cat;
        b.classList.toggle('active', match);
      });
      this.renderSfxLibrary();
    },

    getAllSfxItems() { return [...(this.sfxCatalog.builtin || []), ...(this.sfxCatalog.custom || [])]; },

    renderSfxLibrary() {
      const list = document.getElementById('vsSfxLibraryList');
      if (!list) return;
      const items = this.getAllSfxItems().filter(item => {
        if (this.sfxCategory === 'All') return true;
        if (this.sfxCategory === 'Custom') return Boolean(item.custom || item.isCustom);
        return item.category === this.sfxCategory;
      });
      if (!items.length) {
        list.innerHTML = '<div class="vs-empty-inspector">No sound effects in this category yet. Click <strong>Upload SFX</strong> above.</div>';
        return;
      }
      list.innerHTML = items.map(s => {
        const isPlaying = this.sfxPreviewUrl === s.url && this.sfxPreviewAudio && !this.sfxPreviewAudio.paused;
        return `
          <div class="vs-sfx-row" draggable="true" data-sfx-id="${escHtml(s.id)}">
            <button type="button" class="vs-sfx-play-btn ${isPlaying ? 'playing' : ''}" title="Preview Sound Effect" onclick="window.QSFVideoStudio.previewSfx('${escHtml(s.url)}', this)">
              <i class="fas ${isPlaying ? 'fa-stop' : 'fa-play'}"></i>
            </button>
            <div class="vs-sfx-info">
              <strong title="${escHtml(s.name)}">${escHtml(s.name)}</strong>
              <small>${escHtml(s.category || 'SFX')} • ${s.duration ? s.duration + 's' : 'Audio'}</small>
            </div>
            <button type="button" class="vs-chip-btn primary" onclick="window.QSFVideoStudio.addSfxToTimeline('${escHtml(s.id)}')">+ Add</button>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.vs-sfx-row[draggable="true"]').forEach(row => {
        row.addEventListener('dragstart', e => {
          e.dataTransfer.setData('application/x-qsf-studio', JSON.stringify({ kind: 'sfx', sfxId: row.getAttribute('data-sfx-id') }));
        });
      });
    },

    previewSfx(url) {
      if (this.sfxPreviewAudio) {
        this.sfxPreviewAudio.pause();
        const wasSame = this.sfxPreviewUrl === url;
        this.sfxPreviewAudio = null; this.sfxPreviewUrl = null;
        this.renderSfxLibrary();
        if (wasSame) return;
      }
      const aud = new Audio(url);
      this.sfxPreviewAudio = aud; this.sfxPreviewUrl = url;
      aud.onended = () => { this.sfxPreviewAudio = null; this.sfxPreviewUrl = null; this.renderSfxLibrary(); };
      aud.play().catch(() => {});
      this.renderSfxLibrary();
    },

    async addSfxToTimeline(sfxId, explicitTrackId = null, explicitStart = null) {
      const item = this.getAllSfxItems().find(s => s.id === sfxId);
      if (!item) return null;
      let asset = this.state.mediaPool.find(a => a.url === item.url);
      if (!asset) {
        const info = await this.probeAudioMetadata(item.url);
        asset = { id: makeUid('sfx'), type: 'audio', isSfx: true, name: item.name, url: item.url, duration: info.duration || item.duration || 1.5, size: item.size || 0 };
        if (info.audioBuffer) this.decodedAudioCache.set(asset.id, info.audioBuffer);
        this.state.mediaPool.push(asset);
      }
      const targetTr = (explicitTrackId && this.getTrackById(explicitTrackId)?.type === 'audio')
        ? this.getTrackById(explicitTrackId)
        : this.getOrEnsureTrackByType('audio');
      const start = explicitStart != null ? Math.max(0, Number(explicitStart)) : Number(this.state.playback.currentTime.toFixed(2));
      const clip = {
        id: makeUid('audc'), trackId: targetTr.id, kind: 'audio', isSfx: true, assetId: asset.id,
        name: `SFX: ${item.name}`, startTime: Number(start.toFixed(2)), duration: Math.max(0.25, Number(asset.duration) || 1.5),
        trimStart: 0, sourceDuration: Math.max(0.25, Number(asset.duration) || 1.5),
        volume: 0.95, muted: false, fadeIn: 0, fadeOut: 0.08, speed: 1, reversed: false, loop: false, locked: false, keyframes: []
      };
      this.state.clips.push(clip);
      this.selectedId = clip.id;
      this.pushHistory();
      this.syncAllUI();
      window.showToast && window.showToast(`Added SFX "${item.name}" at ${formatSec(clip.startTime)}`, 'success');
      return clip;
    },

    // ================== MULTI-FILE UPLOAD & MEDIA POOL ==================
    bindDropZoneAndInputs() {
      const dz = document.getElementById('vsDropZone');
      const vidIn = document.getElementById('vsVideoFileInput');
      const imgIn = document.getElementById('vsImageOverlayInput');
      const audIn = document.getElementById('vsAudioFileInput');
      const sfxIn = document.getElementById('vsSfxFileInput');
      const bgImgIn = document.getElementById('vsBgImageFileInput');

      if (dz) {
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
        dz.addEventListener('drop', e => {
          e.preventDefault(); dz.classList.remove('drag-over');
          Array.from((e.dataTransfer && e.dataTransfer.files) || []).forEach(f => this.handleIncomingFile(f));
        });
      }
      if (vidIn) vidIn.addEventListener('change', e => { Array.from(e.target.files || []).forEach(f => this.handleVideoFileSelect(f)); vidIn.value = ''; });
      if (imgIn) imgIn.addEventListener('change', e => { Array.from(e.target.files || []).forEach(f => this.handleImageFileSelect(f)); imgIn.value = ''; });
      if (audIn) audIn.addEventListener('change', e => { Array.from(e.target.files || []).forEach(f => this.handleAudioFileSelect(f, true, false)); audIn.value = ''; });
      if (sfxIn) sfxIn.addEventListener('change', e => { Array.from(e.target.files || []).forEach(f => this.handleAudioFileSelect(f, true, true)); sfxIn.value = ''; });
      if (bgImgIn) {
        bgImgIn.addEventListener('change', async e => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => this.loadBgImage(ev.target.result);
          reader.readAsDataURL(file);
          const fd = new FormData(); fd.append('image', file);
          try {
            const res = await fetch('/api/admin/upload?folder=uploads', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success && data.url) this.loadBgImage(data.url);
          } catch (_) {}
          bgImgIn.value = '';
        });
      }
    },

    handleIncomingFile(file) {
      const name = (file.name || '').toLowerCase(), type = (file.type || '').toLowerCase();
      if (type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/.test(name)) return this.handleVideoFileSelect(file);
      if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/.test(name)) return this.handleAudioFileSelect(file, true, false);
      if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/.test(name)) return this.handleImageFileSelect(file);
      window.showToast && window.showToast(`Unsupported file: ${file.name}`, 'error');
    },

    probeVideoMetadata(srcUrl) {
      return new Promise((resolve, reject) => {
        const vid = document.createElement('video');
        vid.muted = true; vid.playsInline = true; vid.crossOrigin = 'anonymous';
        let resolved = false;
        const finishWithThumb = () => {
          if (resolved) return;
          resolved = true;
          const vw = vid.videoWidth || 1280, vh = vid.videoHeight || 720;
          const dur = (Number.isFinite(vid.duration) && vid.duration > 0) ? Number(vid.duration.toFixed(2)) : 10;
          let thumb = null;
          try {
            const c = document.createElement('canvas');
            c.width = 240; c.height = Math.max(120, Math.round(240 * (vh / vw)));
            c.getContext('2d').drawImage(vid, 0, 0, c.width, c.height);
            thumb = c.toDataURL('image/jpeg', 0.78);
          } catch (_) {}
          vid.removeAttribute('src'); vid.load();
          resolve({ width: vw, height: vh, duration: dur, aspectLabel: getRatioLabel(vw, vh), orientation: vw > vh ? 'Landscape' : (vh > vw ? 'Portrait' : 'Square'), thumbnail: thumb });
        };
        vid.onloadedmetadata = () => {
          if (!Number.isFinite(vid.duration) || vid.duration === Infinity) {
            vid.currentTime = 1e6;
            vid.ontimeupdate = () => { vid.ontimeupdate = null; vid.currentTime = 0; vid.onseeked = finishWithThumb; setTimeout(finishWithThumb, 250); };
          } else {
            vid.currentTime = Math.min(0.15, vid.duration / 4);
            vid.onseeked = finishWithThumb; setTimeout(finishWithThumb, 250);
          }
        };
        vid.onerror = () => reject(new Error('Could not read video metadata'));
        vid.src = srcUrl; vid.load();
      });
    },

    probeAudioMetadata(srcUrl, file = null) {
      return new Promise(async resolve => {
        try {
          const arr = file ? await file.arrayBuffer() : await (await fetch(srcUrl)).arrayBuffer();
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const buf = await ctx.decodeAudioData(arr.slice(0));
          const dur = Number(buf.duration.toFixed(2)) || 5;
          await ctx.close();
          return resolve({ duration: dur, audioBuffer: buf });
        } catch (_) {
          const aud = document.createElement('audio');
          aud.onloadedmetadata = () => resolve({ duration: Number.isFinite(aud.duration) ? Number(aud.duration.toFixed(2)) : 10, audioBuffer: null });
          aud.onerror = () => resolve({ duration: 10, audioBuffer: null });
          aud.src = srcUrl;
        }
      });
    },

    async handleVideoFileSelect(file, autoAddType = 'video', explicitTrackId = null) {
      if (file.size > 250 * 1024 * 1024) {
        window.showToast && window.showToast('Video exceeds 250 MB limit.', 'error');
        return null;
      }
      const localUrl = URL.createObjectURL(file);
      let meta;
      try { meta = await this.probeVideoMetadata(localUrl); }
      catch (_) { window.showToast && window.showToast('Browser could not decode this video format.', 'error'); return null; }

      const asset = {
        id: makeUid('vid'), type: 'video', name: file.name || 'Uploaded Video', url: null, localUrl,
        duration: meta.duration, width: meta.width, height: meta.height,
        aspectLabel: meta.aspectLabel, orientation: meta.orientation, size: file.size, thumbnail: meta.thumbnail
      };
      this.runtimeFiles.set(asset.id, file);
      this.state.mediaPool.push(asset);

      let addedClip = null;
      if (explicitTrackId) {
        addedClip = this.addAssetToTrack(asset.id, explicitTrackId);
      } else if (autoAddType) {
        const normType = autoAddType === 'video2' ? 'video_overlay' : (autoAddType === 'video1' ? 'video' : autoAddType);
        const tr = this.getOrEnsureTrackByType(normType);
        addedClip = this.addAssetToTrack(asset.id, tr.id);
      } else {
        this.renderMediaPool();
      }
      this.uploadMediaAssetToServer('/api/admin/video-studio/upload-media', 'video', file, asset);
      return { asset, clip: addedClip };
    },

    async handleImageFileSelect(file, autoAdd = true) {
      const localUrl = URL.createObjectURL(file);
      const img = await new Promise((resolve, reject) => {
        const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = localUrl;
      }).catch(() => null);
      if (!img) return null;
      this.runtimeImages.set(localUrl, img);
      const asset = {
        id: makeUid('img'), type: 'image', name: file.name || 'Uploaded Image', url: null, localUrl,
        duration: 5, width: img.naturalWidth, height: img.naturalHeight, aspectLabel: getRatioLabel(img.naturalWidth, img.naturalHeight),
        size: file.size, thumbnail: localUrl
      };
      this.runtimeFiles.set(asset.id, file);
      this.state.mediaPool.push(asset);
      let addedClip = null;
      if (autoAdd) addedClip = this.addAssetToTrack(asset.id, this.getOrEnsureTrackByType('image').id);
      else this.renderMediaPool();
      this.uploadMediaAssetToServer('/api/admin/upload?folder=uploads', 'image', file, asset);
      return { asset, clip: addedClip };
    },

    async handleAudioFileSelect(file, autoAdd = true, isSfx = false) {
      const limitMb = isSfx ? 15 : 50;
      if (file.size > limitMb * 1024 * 1024) { window.showToast && window.showToast(`Audio exceeds ${limitMb} MB limit.`, 'error'); return null; }
      const localUrl = URL.createObjectURL(file);
      const info = await this.probeAudioMetadata(localUrl, file);
      const asset = { id: makeUid(isSfx ? 'sfx' : 'aud'), type: 'audio', isSfx, name: file.name || 'Audio Track', url: null, localUrl, duration: info.duration, size: file.size };
      this.runtimeFiles.set(asset.id, file);
      if (info.audioBuffer) this.decodedAudioCache.set(asset.id, info.audioBuffer);
      this.state.mediaPool.push(asset);
      let addedClip = null;
      if (autoAdd) addedClip = this.addAssetToTrack(asset.id, this.getOrEnsureTrackByType('audio').id, null, { isSfx });
      else this.renderMediaPool();
      this.uploadMediaAssetToServer(isSfx ? '/api/admin/video-studio/upload-sfx' : '/api/admin/video-studio/upload-audio', isSfx ? 'sfx' : 'audio', file, asset, () => {
        if (isSfx) this.loadSfxLibrary();
      });
      return { asset, clip: addedClip };
    },

    uploadMediaAssetToServer(endpoint, fieldName, file, asset, onComplete = null) {
      const wrap = document.getElementById('vsUploadProgressWrap');
      const fill = document.getElementById('vsUploadProgressFill');
      const pctTxt = document.getElementById('vsUploadPctText');
      const statusTxt = document.getElementById('vsUploadStatusText');
      if (wrap) wrap.classList.remove('hidden');
      if (fill) fill.style.width = '0%';
      if (pctTxt) pctTxt.textContent = '0%';
      if (statusTxt) statusTxt.textContent = `Uploading ${file.name}...`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.upload.onprogress = evt => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          if (fill) fill.style.width = pct + '%';
          if (pctTxt) pctTxt.textContent = pct + '%';
        }
      };
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.success && res.url) {
            asset.url = res.url;
            this.state.clips.forEach(c => { if (c.assetId === asset.id && c.kind === 'image') c.imageUrl = res.url; });
            if (statusTxt) statusTxt.textContent = `Saved to QSF Media (${file.name})`;
            if (onComplete) onComplete(res);
            setTimeout(() => wrap && wrap.classList.add('hidden'), 1500);
          } else if (statusTxt) statusTxt.textContent = res.message || 'Local timeline ready';
        } catch (_) { if (statusTxt) statusTxt.textContent = 'Local timeline ready'; }
      };
      xhr.onerror = () => { if (statusTxt) statusTxt.textContent = 'Offline — local editing active'; };
      const fd = new FormData(); fd.append(fieldName, file); xhr.send(fd);
    },

    async addServerMediaToPool(type, url, filename, targetType = null) {
      this.closeProjectsModal();
      let existing = this.state.mediaPool.find(a => a.url === url);
      if (!existing) {
        if (type === 'video') {
          const meta = await this.probeVideoMetadata(url).catch(() => ({ width: 1280, height: 720, duration: 10, aspectLabel: '16:9', orientation: 'Landscape', thumbnail: null }));
          existing = { id: makeUid('vid'), type: 'video', name: filename, url, duration: meta.duration, width: meta.width, height: meta.height, aspectLabel: meta.aspectLabel, orientation: meta.orientation, thumbnail: meta.thumbnail };
        } else if (type === 'audio') {
          const info = await this.probeAudioMetadata(url);
          existing = { id: makeUid('aud'), type: 'audio', name: filename, url, duration: info.duration };
          if (info.audioBuffer) this.decodedAudioCache.set(existing.id, info.audioBuffer);
        } else {
          this.preloadImage(url);
          existing = { id: makeUid('img'), type: 'image', name: filename, url, duration: 5, thumbnail: url };
        }
        this.state.mediaPool.push(existing);
      }
      const mappedType = targetType === 'video1' ? 'video' : (targetType === 'video2' ? 'video_overlay' : (targetType || type));
      this.addAssetToTrack(existing.id, this.getOrEnsureTrackByType(mappedType).id);
      window.showToast && window.showToast(`Added "${filename}"`, 'success');
    },

    // ================== ADD CLIPS TO DYNAMIC MULTI-TRACK TIMELINE ==================
    addAssetToTrack(assetId, trackIdOrType, explicitStartTime = null, extraOpts = {}) {
      const asset = this.getAssetById(assetId);
      if (!asset) return null;

      let tr = this.getTrackById(trackIdOrType);
      if (!tr) {
        const normType = trackIdOrType === 'video1' ? 'video' : (trackIdOrType === 'video2' ? 'video_overlay' : trackIdOrType);
        tr = this.getOrEnsureTrackByType(normType);
      }
      if (asset.type === 'video' && !['video', 'video_overlay'].includes(tr.type)) tr = this.getOrEnsureTrackByType('video');
      if (asset.type === 'image' && tr.type !== 'image') tr = this.getOrEnsureTrackByType('image');
      if (asset.type === 'audio' && tr.type !== 'audio') tr = this.getOrEnsureTrackByType('audio');

      let clip = null;
      if (tr.type === 'video') {
        const start = explicitStartTime != null ? Math.max(0, Number(explicitStartTime)) : this.getTrackEndTime(tr.id);
        clip = {
          id: makeUid('v1'), trackId: tr.id, kind: 'video', assetId: asset.id, name: asset.name,
          startTime: Number(start.toFixed(2)), duration: Math.max(0.5, Number(asset.duration) || 10),
          trimStart: 0, sourceDuration: Math.max(0.5, Number(asset.duration) || 10),
          speed: 1, reversed: false, splitScreen: 'none',
          fitMode: 'contain', scale: 100, panX: 0, panY: 0, rotation: 0, flipH: false, flipV: false,
          cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0, opacity: 1,
          filters: defaultFilters(), keyframes: [], cornerRadius: 14, borderStyle: 'gold',
          muted: false, volume: 1, fadeIn: 0, fadeOut: 0,
          transitionIn: { type: 'none', duration: 1, intensity: 100 },
          transitionOut: { type: 'none', duration: 1, intensity: 100 },
          visible: true, locked: false
        };
        const newEnd = clip.startTime + clip.duration;
        this.state.clips.forEach(c => {
          if ((c.isOfficialLogo || c._autoStretch) && c.startTime === 0 && c.duration < newEnd) c.duration = newEnd;
        });
      } else if (tr.type === 'video_overlay') {
        // Auto-place multiple overlays on separate overlay tracks if the default overlay track already has a clip!
        const existingOnTrack = this.state.clips.filter(c => c.trackId === tr.id);
        if (existingOnTrack.length > 0 && explicitStartTime == null && !this.getTrackById(trackIdOrType)) {
          tr = this.addTrack('video_overlay', false);
        }
        const ovCount = this.state.clips.filter(c => c.kind === 'video_overlay').length;
        const autoPositions = [[24, 28], [76, 28], [50, 56], [24, 62], [76, 62]];
        const pos = autoPositions[ovCount % autoPositions.length];
        const start = explicitStartTime != null ? Math.max(0, Number(explicitStartTime)) : 0;
        const sd = Math.max(0.5, Number(asset.duration) || 6);
        if (asset.thumbnail) this.preloadImage(asset.thumbnail);
        clip = {
          id: makeUid('v2'), trackId: tr.id, kind: 'video_overlay', assetId: asset.id, name: `${asset.name}`,
          startTime: Number(start.toFixed(2)), duration: Math.max(sd, this.getTotalDuration()),
          trimStart: 0, sourceDuration: sd,
          // Advanced Freeze-Frame + Sequential Playback + Resume fields
          useSequentialControl: false,
          freezeFrameTime: 0,
          freezeFrameDataUrl: asset.thumbnail || null,
          playStartPos: 0,
          playEndPos: sd,
          loopPlayback: false,
          playSegments: [],
          speed: 1, reversed: false, splitScreen: 'none',
          xPct: pos[0], yPct: pos[1], widthPct: 38, aspectCrop: 'original', fitMode: 'cover',
          opacity: 1, rotation: 0, flipH: false, flipV: false,
          cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0,
          filters: defaultFilters(), keyframes: [], cornerRadius: 12, borderStyle: 'white',
          muted: false, volume: 0.95, fadeIn: 0.1, fadeOut: 0.1,
          transitionIn: { type: 'none', duration: 0.6, intensity: 100 },
          transitionOut: { type: 'none', duration: 0.6, intensity: 100 },
          visible: true, locked: false
        };
      } else if (tr.type === 'image') {
        const start = explicitStartTime != null ? Math.max(0, Number(explicitStartTime)) : Number(this.state.playback.currentTime.toFixed(2));
        const dur = extraOpts.duration || Math.min(8, Math.max(3, this.getTotalDuration() - start));
        const src = asset.url || asset.localUrl;
        this.preloadImage(src);
        clip = {
          id: makeUid('imgc'), trackId: tr.id, kind: 'image', isOfficialLogo: false, isFreezeFrame: Boolean(extraOpts.isFreezeFrame),
          assetId: asset.id, imageUrl: src, name: asset.name,
          startTime: Number(start.toFixed(2)), duration: Number(dur.toFixed(2)),
          xPct: extraOpts.xPct != null ? extraOpts.xPct : 24, yPct: extraOpts.yPct != null ? extraOpts.yPct : 30,
          widthPct: extraOpts.widthPct != null ? extraOpts.widthPct : 28,
          opacity: 1, rotation: 0, flipH: false, flipV: false,
          cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0, filters: defaultFilters(), keyframes: [],
          fitMode: 'contain', cornerRadius: extraOpts.isFreezeFrame ? 0 : 10, bgEnabled: false, bgColor: '#FFFFFF', bgRadius: 10, visible: true, locked: false
        };
      } else if (tr.type === 'audio') {
        const start = explicitStartTime != null ? Math.max(0, Number(explicitStartTime)) : Number(this.state.playback.currentTime.toFixed(2));
        const isSfx = Boolean(extraOpts.isSfx || asset.isSfx);
        const total = this.getTotalDuration();
        const dur = isSfx ? Math.max(0.25, Number(asset.duration) || 1.5) : Math.max(0.5, Number(asset.duration) || Math.max(10, total - start));
        clip = {
          id: makeUid('audc'), trackId: tr.id, kind: 'audio', isSfx, assetId: asset.id, name: asset.name,
          startTime: Number(start.toFixed(2)), duration: Number(dur.toFixed(2)),
          trimStart: 0, sourceDuration: Math.max(0.25, Number(asset.duration) || 10),
          volume: isSfx ? 0.95 : 0.38, muted: false, fadeIn: isSfx ? 0 : 0.8, fadeOut: isSfx ? 0.08 : 1.0,
          speed: 1, reversed: false, loop: !isSfx, locked: false, keyframes: []
        };
      }

      if (clip) {
        this.state.clips.push(clip);
        this.selectedId = clip.id;
        this.pushHistory();
        this.syncAllUI();
        this.fitTimelineZoom();
        this.seekTo(clip.startTime);
      }
      return clip;
    },

    captureFreezeFrame() {
      const t = this.state.playback.currentTime;
      const fmt = FORMATS[this.state.outputFormat] || FORMATS.portrait_9_16;
      const w = Math.min(1080, fmt.w), h = Math.round(w * (fmt.h / fmt.w));
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = w; snapCanvas.height = h;
      const sctx = snapCanvas.getContext('2d');
      const preview = document.getElementById('vsPreviewCanvas');
      if (preview && preview.width > 0) sctx.drawImage(preview, 0, 0, w, h);
      else { sctx.fillStyle = '#0F172A'; sctx.fillRect(0, 0, w, h); }
      const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.88);
      this.preloadImage(dataUrl);
      const asset = {
        id: makeUid('frz'), type: 'image', name: `Freeze Frame @ ${formatSec(t)}`,
        url: dataUrl, localUrl: dataUrl, duration: 3, width: w, height: h, aspectLabel: fmt.ratio, size: Math.round(dataUrl.length * 0.75), thumbnail: dataUrl
      };
      this.state.mediaPool.push(asset);
      const clip = this.addAssetToTrack(asset.id, this.getOrEnsureTrackByType('image').id, Number(t.toFixed(2)), {
        isFreezeFrame: true, duration: 3, xPct: 50, yPct: 50, widthPct: 100
      });
      window.showToast && window.showToast(`Captured 3.0s Freeze Frame at ${formatSec(t)}`, 'success');
      return clip;
    },

    applyColorPreset(presetKey) {
      const p = COLOR_PRESETS[presetKey];
      if (!p) return;
      let clip = this.getSelectedClip();
      if (!clip || !['video', 'video_overlay', 'image'].includes(clip.kind)) {
        clip = this.state.clips.find(c => c.kind === 'video') || this.state.clips.find(c => ['video_overlay', 'image'].includes(c.kind));
        if (!clip) { window.showToast && window.showToast('Add or select a video/image clip first.', 'info'); return; }
        this.selectedId = clip.id;
      }
      clip.filters = Object.assign(defaultFilters(), p, { preset: presetKey });
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
      window.showToast && window.showToast(`Applied "${p.label}" color grade`, 'success');
    },

    addEffectClip(effectType, explicitTrackId = null, explicitStart = null) {
      if (!EFFECT_LABELS[effectType]) return null;
      const tr = (explicitTrackId && this.getTrackById(explicitTrackId)?.type === 'effect')
        ? this.getTrackById(explicitTrackId) : this.getOrEnsureTrackByType('effect');
      const start = explicitStart != null ? Math.max(0, Number(explicitStart)) : Number(this.state.playback.currentTime.toFixed(2));
      const clip = {
        id: makeUid('fx'), trackId: tr.id, kind: 'effect', effectType, name: EFFECT_LABELS[effectType],
        startTime: Number(start.toFixed(2)), duration: Math.max(2, Math.min(6, this.getTotalDuration() - start || 4)),
        intensity: 80, accentColor: this.state.accentColor || '#B91C1C', visible: true, locked: false, keyframes: []
      };
      this.state.clips.push(clip); this.selectedId = clip.id; this.switchRightTab('props');
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
      window.showToast && window.showToast(`Added "${clip.name}" effect`, 'success');
      return clip;
    },

    addKeyframeAtPlayhead() {
      const clip = this.getSelectedClip();
      if (!clip || !['video', 'video_overlay', 'image', 'text', 'subtitle'].includes(clip.kind)) return;
      const relT = Number(Math.max(0, Math.min(clip.duration, this.state.playback.currentTime - clip.startTime)).toFixed(2));
      if (!Array.isArray(clip.keyframes)) clip.keyframes = [];
      const evalProps = evaluateAnimatedClip(clip, this.state.playback.currentTime);
      const kf = {
        t: relT,
        xPct: Number((clip.xPct != null ? clip.xPct : evalProps.xPct).toFixed(1)),
        yPct: Number((clip.yPct != null ? clip.yPct : evalProps.yPct).toFixed(1)),
        scale: Number((clip.scale != null ? clip.scale : evalProps.scale).toFixed(0)),
        widthPct: Number((clip.widthPct != null ? clip.widthPct : evalProps.widthPct).toFixed(1)),
        opacity: Number((clip.opacity != null ? clip.opacity : evalProps.opacity).toFixed(2)),
        rotation: Number((clip.rotation || 0).toFixed(0))
      };
      const existingIdx = clip.keyframes.findIndex(k => Math.abs(k.t - relT) < 0.08);
      if (existingIdx >= 0) clip.keyframes[existingIdx] = kf;
      else clip.keyframes.push(kf);
      clip.keyframes.sort((a, b) => a.t - b.t);
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
      window.showToast && window.showToast(`Keyframe saved at +${relT}s`, 'success');
    },

    deleteKeyframe(kfIdx) {
      const clip = this.getSelectedClip();
      if (!clip || !Array.isArray(clip.keyframes)) return;
      clip.keyframes.splice(kfIdx, 1);
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
    },

    jumpToKeyframe(kfIdx) {
      const clip = this.getSelectedClip();
      if (!clip || !Array.isArray(clip.keyframes) || !clip.keyframes[kfIdx]) return;
      const kf = clip.keyframes[kfIdx];
      this.seekTo(clip.startTime + kf.t);
      if (kf.xPct != null) clip.xPct = kf.xPct;
      if (kf.yPct != null) clip.yPct = kf.yPct;
      if (kf.scale != null && clip.kind === 'video') clip.scale = kf.scale;
      if (kf.widthPct != null && clip.kind !== 'video') clip.widthPct = kf.widthPct;
      if (kf.opacity != null) clip.opacity = kf.opacity;
      if (kf.rotation != null) clip.rotation = kf.rotation;
      this.renderPropertiesInspector(); this.renderFrame();
    },

    ensureOfficialLogoClip() {
      let logoClip = this.state.clips.find(c => c.isOfficialLogo);
      if (!logoClip) {
        logoClip = createOfficialLogoClip(this.getTotalDuration(), this.getOrEnsureTrackByType('image').id);
        this.state.clips.push(logoClip);
      } else logoClip.visible = true;
      this.selectedId = logoClip.id; this.switchRightTab('props');
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
      return logoClip;
    },

    pickImageOverlayFromLibrary() {
      if (typeof window.openMediaPicker === 'function') {
        window.openMediaPicker({ folder: 'all', onSelect: url => this.addServerMediaToPool('image', url, url.split('/').pop() || 'Image', 'image') });
      } else this.openProjectsModal('images');
    },

    addTextPreset(roleKey) {
      const def = TEXT_ROLE_DEFAULTS[roleKey] || TEXT_ROLE_DEFAULTS.custom;
      const tr = this.getOrEnsureTrackByType('text');
      const start = Number(this.state.playback.currentTime.toFixed(2));
      const dur = Math.max(3, Number((this.getTotalDuration() - start).toFixed(2)));
      const textCount = this.state.clips.filter(c => c.kind === 'text').length;
      const clip = {
        id: makeUid('txt'), trackId: tr.id, kind: 'text', role: roleKey, name: roleKey.toUpperCase(),
        text: def.text, dir: def.dir, fontFamily: def.fontFamily, fontSize: def.fontSize, fontWeight: def.fontWeight,
        align: 'center', color: def.color, bgColor: def.bgColor, bgOpacity: def.bgOpacity,
        outlineColor: '#000000', outlineWidth: 0, shadow: true, lineHeight: def.dir === 'rtl' ? 1.65 : 1.25,
        letterSpacing: 0, padding: 14, borderRadius: 10, rotation: 0, opacity: 1,
        animation: def.animation || 'fade_in', animDuration: 0.7, maxWidthPct: 88,
        xPct: 50, yPct: Math.min(92, (def.yPct || 50) + (textCount % 4) * 3),
        startTime: start, duration: dur, keyframes: [], visible: true, locked: false
      };
      this.state.clips.push(clip); this.selectedId = clip.id; this.switchRightTab('props');
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
      return clip;
    },

    applyTransitionToSelected(transType, explicitClipId = null) {
      let clip = explicitClipId ? this.getClipById(explicitClipId) : this.getSelectedClip();
      if (!clip || !['video', 'video_overlay'].includes(clip.kind)) {
        const vClips = this.state.clips.filter(c => c.kind === 'video').sort((a, b) => a.startTime - b.startTime);
        clip = vClips.length > 1 ? vClips[1] : vClips[0];
        if (!clip) { window.showToast && window.showToast('Add a video clip first.', 'info'); return; }
        this.selectedId = clip.id;
      }
      const dur = Number(document.getElementById('vsTransDurationSelect')?.value || 1);
      const intensity = Number(document.getElementById('vsTransIntensitySlider')?.value || 100);
      if (transType === 'fade_out') clip.transitionOut = { type: 'fade_out', duration: dur, intensity };
      else clip.transitionIn = { type: transType, duration: dur, intensity };
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
      window.showToast && window.showToast(`Applied ${TRANSITION_LABELS[transType] || transType} (${dur}s)`, 'success');
    },

    applyTransitionDuration(dur) {
      const clip = this.getSelectedClip();
      if (!clip || !['video', 'video_overlay'].includes(clip.kind)) return;
      if (!clip.transitionIn) clip.transitionIn = { type: 'none', duration: dur, intensity: 100 };
      clip.transitionIn.duration = dur;
      if (clip.transitionOut && clip.transitionOut.type === 'fade_out') clip.transitionOut.duration = dur;
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
    },

    applyTransitionIntensity(val) {
      const clip = this.getSelectedClip();
      if (!clip || !['video', 'video_overlay'].includes(clip.kind)) return;
      if (!clip.transitionIn) clip.transitionIn = { type: 'none', duration: 1, intensity: val };
      clip.transitionIn.intensity = val;
      this.renderFrame();
    },

    splitSelectedAtPlayhead() {
      const clip = this.getSelectedClip();
      if (!clip) { window.showToast && window.showToast('Select a clip to split.', 'info'); return; }
      const tr = this.getTrackById(clip.trackId);
      if (clip.locked || (tr && tr.locked)) { window.showToast && window.showToast('Unlock clip/track first.', 'info'); return; }
      const t = this.state.playback.currentTime;
      const start = Number(clip.startTime), end = start + Number(clip.duration);
      if (t <= start + 0.15 || t >= end - 0.15) { window.showToast && window.showToast('Move playhead inside selected clip to split.', 'info'); return; }
      const leftDur = Number((t - start).toFixed(2)), rightDur = Number((end - t).toFixed(2));
      const speed = Number(clip.speed) || 1;
      const rightClip = JSON.parse(JSON.stringify(clip));
      rightClip.id = makeUid(clip.kind.slice(0, 3));
      rightClip.startTime = Number(t.toFixed(2)); rightClip.duration = rightDur;
      if (['video', 'video_overlay', 'audio'].includes(clip.kind)) {
        rightClip.trimStart = Number(((clip.trimStart || 0) + leftDur * speed).toFixed(2));
      }
      if (rightClip.transitionIn) rightClip.transitionIn = { type: 'none', duration: 1, intensity: 100 };
      clip.duration = leftDur;
      this.state.clips.push(rightClip); this.selectedId = rightClip.id;
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
    },

    duplicateSelected() {
      const clip = this.getSelectedClip();
      if (!clip) return;
      const copy = JSON.parse(JSON.stringify(clip));
      copy.id = makeUid(clip.kind.slice(0, 3)); copy.isOfficialLogo = false; copy.locked = false;
      copy.startTime = clip.kind === 'video' ? this.getTrackEndTime(clip.trackId) : Number((clip.startTime + Math.min(2, clip.duration)).toFixed(2));
      this.state.clips.push(copy); this.selectedId = copy.id;
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
    },

    deleteSelected() {
      const clip = this.getSelectedClip();
      if (!clip) return;
      this.disposeRuntimeMedia(clip.id);
      this.state.clips = this.state.clips.filter(c => c.id !== clip.id);
      this.selectedId = this.state.clips[0]?.id || null;
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
    },

    moveVideoClipKind(clipId, targetKind) {
      const clip = this.getClipById(clipId);
      if (!clip || !['video', 'video_overlay'].includes(clip.kind) || clip.kind === targetKind) return;
      const tr = this.getOrEnsureTrackByType(targetKind);
      clip.kind = targetKind; clip.trackId = tr.id;
      if (targetKind === 'video_overlay') {
        clip.xPct = clip.xPct || 72; clip.yPct = clip.yPct || 28; clip.widthPct = clip.widthPct || 36;
        clip.playStartPos = clip.playStartPos || 0; clip.playEndPos = clip.playEndPos || clip.sourceDuration || clip.duration;
        clip.playSegments = clip.playSegments || [];
      } else {
        clip.fitMode = 'contain'; clip.scale = 100; clip.panX = 0; clip.panY = 0;
      }
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
    },

    moveClipZOrder(clipId, delta) {
      const idx = this.state.clips.findIndex(c => c.id === clipId);
      const target = idx + delta;
      if (idx < 0 || target < 0 || target >= this.state.clips.length) return;
      const tmp = this.state.clips[idx]; this.state.clips[idx] = this.state.clips[target]; this.state.clips[target] = tmp;
      this.pushHistory(); this.syncAllUI(); this.renderFrame();
    },

    setFormat(fmtKey) {
      if (!FORMATS[fmtKey]) return;
      this.state.outputFormat = fmtKey;
      this.pushHistory(); this.syncAllUI(); this.resizeStage(); this.renderFrame();
    },
    setZoom(val) { this.zoomMode = val; this.resizeStage(); },
    setBgConfig(prop, val) { this.state.bg[prop] = ['blurAmount', 'dimOpacity', 'gradAngle'].includes(prop) ? Number(val) : val; this.syncAllUI(); this.renderFrame(); },
    loadBgImage(url) { this.state.bg.mode = 'image'; this.state.bg.imageUrl = url; this.bgImageEl = this.preloadImage(url); this.pushHistory(); this.syncAllUI(); this.renderFrame(); },
    pickBgImageFromLibrary() {
      if (typeof window.openMediaPicker === 'function') window.openMediaPicker({ folder: 'all', onSelect: url => this.loadBgImage(url) });
      else document.getElementById('vsBgImageFileInput')?.click();
    },
    setTemplateProp(prop, val) { this.state[prop] = val; this.renderFrame(); },

    applyTemplate(tplId, recordHistory = true) {
      const tpl = TEMPLATES.find(t => t.id === tplId);
      if (!tpl) return;
      this.state.templateId = tpl.id; this.state.accentColor = tpl.accent; this.state.showChrome = tpl.chrome !== 'none';
      this.state.bg.mode = tpl.bgMode || 'blur';
      if (tpl.bgMode === 'gradient') { this.state.bg.gradColor1 = tpl.bg1; this.state.bg.gradColor2 = tpl.bg2; }

      const totalDur = Math.max(10, this.getTotalDuration());
      this.state.clips = this.state.clips.filter(c => c.kind !== 'text');
      const imgTr = this.getOrEnsureTrackByType('image');
      if (!this.state.clips.some(c => c.isOfficialLogo)) this.state.clips.push(createOfficialLogoClip(totalDur, imgTr.id));
      const txtTr = this.getOrEnsureTrackByType('text');

      (tpl.presets || []).forEach(p => {
        this.state.clips.push({
          id: makeUid('txt'), trackId: txtTr.id, kind: 'text', _autoStretch: true, role: p.role, name: p.role.toUpperCase(),
          text: p.text, dir: p.dir, fontFamily: p.fontFamily, fontSize: p.fontSize, fontWeight: '700', align: 'center',
          color: p.color, bgColor: p.bgColor, bgOpacity: p.bgOpacity, outlineColor: '#000000', outlineWidth: 0, shadow: true,
          lineHeight: p.dir === 'rtl' ? 1.65 : 1.25, letterSpacing: 0, padding: 14, borderRadius: 10, rotation: 0, opacity: 1,
          animation: p.animation || 'none', animDuration: 0.7, maxWidthPct: p.maxWidthPct || 88,
          xPct: p.xPct || 50, yPct: p.yPct || 50, startTime: 0, duration: totalDur, keyframes: [], visible: true, locked: false
        });
      });
      const firstTxt = this.state.clips.find(c => c.kind === 'text');
      this.selectedId = firstTxt ? firstTxt.id : (this.state.clips[0]?.id || null);
      if (recordHistory) this.pushHistory();
      this.renderTemplatesGrid(); this.syncAllUI(); this.renderFrame();
    },

    updateSelectedFilter(filterProp, val, pushHist = false) {
      const clip = this.getSelectedClip();
      if (!clip) return;
      clip.filters = Object.assign(defaultFilters(), clip.filters || {});
      clip.filters[filterProp] = Number(val); clip.filters.preset = 'custom';
      if (pushHist) this.pushHistory();
      this.renderFrame();
      const lbl = document.getElementById(`vsFiltVal_${filterProp}`);
      if (lbl) lbl.textContent = filterProp === 'blur' ? `${val}px` : `${val}${filterProp === 'exposure' ? '' : '%'}`;
    },

    updateSelectedProp(prop, val, pushHist = false) {
      const clip = this.getSelectedClip();
      if (!clip) return;
      if (prop === 'startTime') clip.startTime = Math.max(0, Number(val) || 0);
      else if (prop === 'duration') {
        const speed = Number(clip.speed) || 1;
        const maxSrc = (clip.kind === 'video') ? Math.max(0.2, ((clip.sourceDuration || 86400) - (clip.trimStart || 0)) / speed) : 86400;
        clip.duration = Math.max(0.2, Math.min(maxSrc, Number(val) || 1));
      } else if (prop === 'endTime') {
        const end = Math.max(clip.startTime + 0.2, Number(val) || (clip.startTime + 1));
        this.updateSelectedProp('duration', end - clip.startTime, pushHist);
        return;
      } else if (prop === 'trimStart') {
        clip.trimStart = Math.max(0, Math.min(Math.max(0, (clip.sourceDuration || 86400) - 0.2), Number(val) || 0));
      } else if (prop === 'speed') {
        const oldSpeed = Number(clip.speed) || 1;
        const newSpeed = Math.max(0.25, Math.min(4, Number(val) || 1));
        clip.speed = newSpeed;
        if ((clip.kind === 'video' || clip.kind === 'audio') && !clip.loop) {
          const srcSpan = clip.duration * oldSpeed;
          const avail = Math.max(0.2, (clip.sourceDuration || srcSpan) - (clip.trimStart || 0));
          clip.duration = Number(Math.max(0.2, Math.min(avail / newSpeed, srcSpan / newSpeed)).toFixed(2));
        }
      } else if (prop === 'transitionInType') clip.transitionIn = Object.assign({ type: 'none', duration: 1, intensity: 100 }, clip.transitionIn, { type: val });
      else if (prop === 'transitionInDur') clip.transitionIn = Object.assign({ type: 'none', duration: 1, intensity: 100 }, clip.transitionIn, { duration: Number(val) || 1 });
      else if (prop === 'transitionOutType') clip.transitionOut = Object.assign({ type: 'none', duration: 1, intensity: 100 }, clip.transitionOut, { type: val });
      else if (prop === 'dir') {
        clip.dir = val;
        if (val === 'rtl' && !clip.fontFamily.includes('Urdu') && !clip.fontFamily.includes('Arabic')) {
          clip.fontFamily = "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif"; clip.lineHeight = 1.65;
        } else if (val === 'ltr' && clip.fontFamily.includes('Nastaliq')) {
          clip.fontFamily = "'Outfit', 'Inter', sans-serif"; clip.lineHeight = 1.25;
        }
      } else clip[prop] = val;

      if (pushHist) this.pushHistory();
      this.renderTimeline(); this.renderLayersAndMixer(); this.renderOverlayDirectorPanel();
      if (clip.kind === 'subtitle') this.renderSubtitlesPanel();
      if (['dir', 'bgEnabled', 'transitionInType', 'fitMode', 'locked', 'visible', 'muted', 'speed', 'reversed', 'flipH', 'flipV', 'splitScreen', 'animation', 'useSequentialControl', 'loopPlayback'].includes(prop)) {
        this.renderPropertiesInspector();
      }
      this.renderFrame();
    },

    alignSelectedVisual(pos) {
      const clip = this.getSelectedClip();
      if (!clip || clip.locked) return;
      const padX = 12, padY = 9;
      const map = { tl: [padX, padY], tc: [50, padY], tr: [100 - padX, padY], ml: [padX, 50], mc: [50, 50], mr: [100 - padX, 50], bl: [padX, 100 - padY], bc: [50, 100 - padY], br: [100 - padX, 100 - padY] };
      if (map[pos]) { clip.xPct = map[pos][0]; clip.yPct = map[pos][1]; this.pushHistory(); this.renderPropertiesInspector(); this.renderFrame(); }
    },

    // ================== UI PANEL RENDERING ==================
    syncAllUI() {
      const fmt = FORMATS[this.state.outputFormat] || FORMATS.portrait_9_16;
      const badge = document.getElementById('vsActiveDimBadge');
      if (badge) badge.textContent = `${fmt.w}×${fmt.h} • ${fmt.label}`;
      const tag = document.getElementById('vsPreviewOverlayTag');
      if (tag) tag.textContent = `${fmt.w} × ${fmt.h}`;
      document.querySelectorAll('[data-vs-format]').forEach(b => b.classList.toggle('active', b.getAttribute('data-vs-format') === this.state.outputFormat));
      const titleIn = document.getElementById('vsProjectTitleInput');
      if (titleIn && document.activeElement !== titleIn) titleIn.value = this.state.title || 'QSF News Video Broadcast';

      const bg = this.state.bg;
      const setVal = (id, v) => { const e = document.getElementById(id); if (e && document.activeElement !== e) e.value = v; };
      const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      setVal('vsBgModeSelect', bg.mode);
      document.getElementById('vsBgOptBlur')?.classList.toggle('hidden', bg.mode !== 'blur');
      document.getElementById('vsBgOptSolid')?.classList.toggle('hidden', bg.mode !== 'solid');
      document.getElementById('vsBgOptGradient')?.classList.toggle('hidden', bg.mode !== 'gradient');
      document.getElementById('vsBgOptImage')?.classList.toggle('hidden', bg.mode !== 'image');
      setVal('vsBgBlurSlider', bg.blurAmount); setTxt('vsBgBlurVal', `${bg.blurAmount}px`);
      setVal('vsBgDimSlider', bg.dimOpacity); setTxt('vsBgDimVal', `${bg.dimOpacity}%`);
      setVal('vsBgSolidColor', bg.solidColor); setVal('vsBgGrad1', bg.gradColor1); setVal('vsBgGrad2', bg.gradColor2);
      setVal('vsTplAccentColor', this.state.accentColor); setVal('vsTplChromeStyle', this.state.showChrome ? 'on' : 'off');

      this.renderMediaPool();
      this.renderSubtitlesPanel();
      this.renderPropertiesInspector();
      this.renderOverlayDirectorPanel();
      this.renderLayersAndMixer();
      this.renderTimeline();
      this.updateTimeReadout();
    },

    renderTemplatesGrid() {
      const grid = document.getElementById('vsTemplatesGrid');
      if (!grid) return;
      grid.innerHTML = TEMPLATES.map(t => `
        <button type="button" class="vs-tpl-card ${this.state.templateId === t.id ? 'active' : ''}" onclick="window.QSFVideoStudio.applyTemplate('${t.id}')">
          <div class="vs-tpl-thumb" style="background: linear-gradient(135deg, ${t.bg1}, ${t.bg2});">
            <span style="background: rgba(0,0,0,0.45); padding: 1px 5px; border-radius: 3px; align-self: flex-start;">${t.badge}</span>
            <span style="height: 3px; width: 100%; background: ${t.accent}; border-radius: 2px;"></span>
          </div>
          <div class="vs-tpl-name">${t.name}</div>
          <div class="vs-tpl-ur">${t.nameUr}</div>
        </button>
      `).join('');
    },

    renderMediaPool() {
      const list = document.getElementById('vsMediaPoolList');
      const cnt = document.getElementById('vsMediaPoolCount');
      if (cnt) cnt.textContent = String(this.state.mediaPool.length);
      if (!list) return;
      if (!this.state.mediaPool.length) {
        list.innerHTML = `<div class="vs-empty-inspector">Upload videos, photographs, or audio above. Drag onto any track or click <strong>+ Main</strong> / <strong>+ Overlay</strong>.</div>`;
        return;
      }
      list.innerHTML = this.state.mediaPool.map(a => {
        const icon = a.type === 'video' ? 'fa-film' : (a.type === 'audio' ? 'fa-music' : 'fa-image');
        const spec = a.type === 'video'
          ? `${a.width || '?'}×${a.height || '?'} • ${a.aspectLabel || ''} • ${formatSec(a.duration)} • ${formatBytes(a.size)}`
          : (a.type === 'audio' ? `Audio • ${formatSec(a.duration)} • ${formatBytes(a.size)}` : `Image • ${a.width || ''}×${a.height || ''}`);
        const btns = a.type === 'video'
          ? `<button type="button" class="vs-chip-btn primary" onclick="window.QSFVideoStudio.addAssetToTrack('${a.id}','video')">+ Main</button>
             <button type="button" class="vs-chip-btn pip" onclick="window.QSFVideoStudio.addAssetToTrack('${a.id}','video_overlay')">+ Overlay</button>`
          : (a.type === 'audio'
            ? `<button type="button" class="vs-chip-btn primary" onclick="window.QSFVideoStudio.addAssetToTrack('${a.id}','audio')">+ Audio Track</button>`
            : `<button type="button" class="vs-chip-btn primary" onclick="window.QSFVideoStudio.addAssetToTrack('${a.id}','image')">+ Image Overlay</button>`);
        return `
          <div class="vs-media-card" draggable="true" data-drag-asset-id="${a.id}">
            <div class="vs-media-thumb">${a.thumbnail ? `<img src="${a.thumbnail}" alt="">` : `<i class="fas ${icon}"></i>`}</div>
            <div class="vs-media-meta">
              <strong title="${escHtml(a.name)}">${escHtml(a.name)}</strong>
              <small>${spec}</small>
              <div class="vs-media-actions">${btns}</div>
            </div>
          </div>
        `;
      }).join('');
      list.querySelectorAll('.vs-media-card[draggable="true"]').forEach(card => {
        card.addEventListener('dragstart', e => {
          e.dataTransfer.setData('application/x-qsf-studio', JSON.stringify({ kind: 'media', assetId: card.getAttribute('data-drag-asset-id') }));
        });
      });
    },

    renderLayersAndMixer() {
      const stack = document.getElementById('vsLayersStack');
      if (stack) {
        const ordered = [...this.state.clips].reverse();
        stack.innerHTML = ordered.map(c => {
          const meta = TRACK_TYPE_META[c.kind] || TRACK_TYPE_META.video;
          const tr = this.getTrackById(c.trackId);
          const label = (c.kind === 'text' || c.kind === 'subtitle') ? (c.text || meta.label) : (c.name || meta.label);
          return `
            <div class="vs-layer-item ${this.selectedId === c.id ? 'selected' : ''}" onclick="window.QSFVideoStudio.selectClip('${c.id}')">
              <span class="vs-layer-label"><i class="fas ${meta.icon}" style="color:${tr?.color || meta.color};"></i> ${escHtml(label).slice(0, 26)}</span>
              <div class="vs-layer-actions" onclick="event.stopPropagation()">
                <button type="button" title="Up" onclick="window.QSFVideoStudio.moveClipZOrder('${c.id}', 1)"><i class="fas fa-arrow-up"></i></button>
                <button type="button" title="Down" onclick="window.QSFVideoStudio.moveClipZOrder('${c.id}', -1)"><i class="fas fa-arrow-down"></i></button>
                <button type="button" title="Delete" onclick="window.QSFVideoStudio.selectClip('${c.id}'); window.QSFVideoStudio.deleteSelected();" style="color:#B91C1C;"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          `;
        }).join('') || '<div class="vs-empty-inspector">No clips on timeline yet.</div>';
      }

      const mixer = document.getElementById('vsAudioMixerSummary');
      if (mixer) {
        const audioTracks = this.state.tracks.filter(t => TRACK_TYPE_META[t.type]?.hasAudio);
        mixer.innerHTML = audioTracks.map(tr => {
          const count = this.state.clips.filter(c => c.trackId === tr.id).length;
          return `
            <div class="vs-mixer-row">
              <div style="min-width:96px;max-width:110px;overflow:hidden;">
                <div style="color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(tr.name)}</div>
                <small style="color:#64748B;font-size:0.62rem;">${count} clip(s)</small>
              </div>
              <input type="range" min="0" max="1.5" step="0.05" value="${tr.volume != null ? tr.volume : 1}" style="flex:1;" oninput="window.QSFVideoStudio.setTrackVolume('${tr.id}', this.value)" />
              <button type="button" class="vs-chip-btn ${tr.muted ? 'primary' : ''}" onclick="window.QSFVideoStudio.toggleTrackFlag('${tr.id}','muted')">${tr.muted ? 'Muted' : 'On'}</button>
            </div>
          `;
        }).join('');
      }
    },

    renderKeyframesSectionHtml(c) {
      const kfs = Array.isArray(c.keyframes) ? c.keyframes : [];
      return `
        <div class="news-panel-section compact-section" style="margin-top:8px;">
          <div class="news-section-title compact-title">
            <span><i class="fas fa-diamond" style="color:#D97706;"></i> Keyframe Animation (${kfs.length})</span>
            <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.addKeyframeAtPlayhead()"><i class="fas fa-plus"></i> Add Keyframe</button>
          </div>
          ${kfs.length ? `<div class="vs-kf-list">${kfs.map((kf, idx) => `
            <div class="vs-kf-row">
              <span style="cursor:pointer;" onclick="window.QSFVideoStudio.jumpToKeyframe(${idx})">◆ +${kf.t}s (X:${kf.xPct}%, Y:${kf.yPct}%, Op:${Math.round((kf.opacity ?? 1) * 100)}%)</span>
              <button type="button" class="vs-chip-btn" style="color:#B91C1C;" onclick="window.QSFVideoStudio.deleteKeyframe(${idx})">&times;</button>
            </div>`).join('')}</div>`
            : '<div style="font-size:0.65rem;color:#64748B;">Position clip at playhead, then click <strong>+ Add Keyframe</strong> to animate smoothly.</div>'}
        </div>
      `;
    },

    renderColorAndCropHtml(c) {
      const f = Object.assign(defaultFilters(), c.filters || {});
      return `
        <div class="news-panel-section compact-section" style="margin-top:8px;">
          <div class="news-section-title compact-title">
            <span><i class="fas fa-sliders"></i> Color Grade &amp; Crop</span>
            <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.applyColorPreset('original')">Reset</button>
          </div>
          <div class="photo-control-sliders compact-sliders">
            <div class="photo-slider-item"><span class="photo-slider-label"><span>Brightness</span><span id="vsFiltVal_brightness">${f.brightness}%</span></span><input type="range" min="30" max="180" value="${f.brightness}" oninput="window.QSFVideoStudio.updateSelectedFilter('brightness', this.value)" onchange="window.QSFVideoStudio.updateSelectedFilter('brightness', this.value, true)" /></div>
            <div class="photo-slider-item"><span class="photo-slider-label"><span>Contrast</span><span id="vsFiltVal_contrast">${f.contrast}%</span></span><input type="range" min="30" max="180" value="${f.contrast}" oninput="window.QSFVideoStudio.updateSelectedFilter('contrast', this.value)" onchange="window.QSFVideoStudio.updateSelectedFilter('contrast', this.value, true)" /></div>
            <div class="photo-slider-item"><span class="photo-slider-label"><span>Saturation</span><span id="vsFiltVal_saturation">${f.saturation}%</span></span><input type="range" min="0" max="200" value="${f.saturation}" oninput="window.QSFVideoStudio.updateSelectedFilter('saturation', this.value)" onchange="window.QSFVideoStudio.updateSelectedFilter('saturation', this.value, true)" /></div>
            <div class="photo-slider-item"><span class="photo-slider-label"><span>Blur</span><span id="vsFiltVal_blur">${f.blur}px</span></span><input type="range" min="0" max="20" step="0.5" value="${f.blur}" oninput="window.QSFVideoStudio.updateSelectedFilter('blur', this.value)" onchange="window.QSFVideoStudio.updateSelectedFilter('blur', this.value, true)" /></div>
            <div class="photo-slider-item"><span class="photo-slider-label"><span>Sharpen</span><span id="vsFiltVal_sharpen">${f.sharpen}%</span></span><input type="range" min="0" max="100" value="${f.sharpen}" oninput="window.QSFVideoStudio.updateSelectedFilter('sharpen', this.value)" onchange="window.QSFVideoStudio.updateSelectedFilter('sharpen', this.value, true)" /></div>
          </div>
          <div style="margin-top:6px;">
            <label class="compact-field-label">Crop (% T / R / B / L) &amp; Flip</label>
            <div class="vs-colors-row-4">
              <input type="number" class="form-control compact-input" min="0" max="45" value="${c.cropTop || 0}" onchange="window.QSFVideoStudio.updateSelectedProp('cropTop', Number(this.value), true)" />
              <input type="number" class="form-control compact-input" min="0" max="45" value="${c.cropRight || 0}" onchange="window.QSFVideoStudio.updateSelectedProp('cropRight', Number(this.value), true)" />
              <input type="number" class="form-control compact-input" min="0" max="45" value="${c.cropBottom || 0}" onchange="window.QSFVideoStudio.updateSelectedProp('cropBottom', Number(this.value), true)" />
              <input type="number" class="form-control compact-input" min="0" max="45" value="${c.cropLeft || 0}" onchange="window.QSFVideoStudio.updateSelectedProp('cropLeft', Number(this.value), true)" />
            </div>
            <div style="display:flex;gap:6px;margin-top:6px;">
              <button type="button" class="vs-chip-btn ${c.flipH ? 'primary' : ''}" style="flex:1;padding:4px;" onclick="window.QSFVideoStudio.updateSelectedProp('flipH', ${!c.flipH}, true)"><i class="fas fa-arrows-left-right"></i> Flip H</button>
              <button type="button" class="vs-chip-btn ${c.flipV ? 'primary' : ''}" style="flex:1;padding:4px;" onclick="window.QSFVideoStudio.updateSelectedProp('flipV', ${!c.flipV}, true)"><i class="fas fa-arrows-up-down"></i> Flip V</button>
            </div>
          </div>
        </div>
      `;
    },

    renderOverlayFreezeControlsHtml(c) {
      const sd = Math.max(0.5, Number(c.sourceDuration) || 10);
      const evalSt = evaluateOverlayPlaybackAt(c, this.state.playback.currentTime);
      const segs = Array.isArray(c.playSegments) ? c.playSegments : [];
      return `
        <div class="news-panel-section compact-section" style="margin-bottom:8px;border-color:#0284C7;background:#F0F9FF;">
          <div class="news-section-title compact-title">
            <span><i class="fas fa-snowflake" style="color:#0284C7;"></i> Freeze Frame &amp; Sequential Playback</span>
            <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.switchRightTab('director')">Director</button>
          </div>
          <label style="display:flex;align-items:center;gap:6px;font-size:0.7rem;font-weight:800;color:#075985;margin-bottom:6px;">
            <input type="checkbox" ${c.useSequentialControl ? 'checked' : ''} onchange="window.QSFVideoStudio.updateSelectedProp('useSequentialControl', this.checked, true)" />
            Enable Freeze-Frame &amp; Scheduled Resume Mode
          </label>
          <div style="font-size:0.66rem;font-weight:700;color:#0F172A;margin-bottom:6px;">
            State at Playhead: <span class="vs-director-badge ${evalSt.isPlaying ? 'playing' : 'frozen'}">${evalSt.isPlaying ? 'PLAYING @ ' + formatSec(evalSt.srcTime) : 'FROZEN (Saved @ ' + formatSec(evalSt.savedCursor) + ')'}</span>
          </div>
          <div class="photo-slider-item" style="margin-bottom:6px;">
            <span class="photo-slider-label"><span>Initial Freeze Frame</span><span>${formatSec(c.freezeFrameTime || 0)}</span></span>
            <input type="range" min="0" max="${Math.max(0.2, sd - 0.05).toFixed(2)}" step="0.1" value="${c.freezeFrameTime || 0}" onchange="window.QSFVideoStudio.setOverlayFreezeFrame('${c.id}', Number(this.value))" />
          </div>
          <div class="compact-input-row-2col" style="margin-bottom:6px;">
            <div><label class="compact-field-label">Play Start Pos (s)</label><input type="number" class="form-control compact-input" min="0" max="${sd.toFixed(1)}" step="0.1" value="${Number(c.playStartPos || 0).toFixed(1)}" onchange="window.QSFVideoStudio.updateSelectedProp('playStartPos', Number(this.value), true)" /></div>
            <div><label class="compact-field-label">Play End Pos (s)</label><input type="number" class="form-control compact-input" min="0.2" max="${sd.toFixed(1)}" step="0.1" value="${Number(c.playEndPos || sd).toFixed(1)}" onchange="window.QSFVideoStudio.updateSelectedProp('playEndPos', Number(this.value), true)" /></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">
            <button type="button" class="vs-chip-btn primary" onclick="window.QSFVideoStudio.directorPlayOverlay('${c.id}')"><i class="fas fa-play"></i> Play/Resume</button>
            <button type="button" class="vs-chip-btn" onclick="window.QSFVideoStudio.directorPauseOverlay('${c.id}')"><i class="fas fa-pause"></i> Pause</button>
            <button type="button" class="vs-chip-btn" onclick="window.QSFVideoStudio.directorResetOverlayPosition('${c.id}')"><i class="fas fa-rotate-left"></i> Reset</button>
            <label style="display:inline-flex;align-items:center;gap:4px;font-size:0.66rem;font-weight:700;margin-left:auto;">
              <input type="checkbox" ${c.loopPlayback ? 'checked' : ''} onchange="window.QSFVideoStudio.updateSelectedProp('loopPlayback', this.checked, true)" /> Loop
            </label>
          </div>
          <div style="border-top:1px solid #BAE6FD;padding-top:5px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:0.64rem;font-weight:800;color:#0369A1;">Scheduled Play Turns (${segs.length})</span>
              <button type="button" class="vs-chip-btn" onclick="window.QSFVideoStudio.addOverlayPlaySegment('${c.id}')">+ Add Turn</button>
            </div>
            ${segs.map((seg, si) => `
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;font-size:0.64rem;">
                <strong>T${si + 1}:</strong>
                <input type="number" step="0.5" min="0" value="${seg.start}" style="width:48px;height:21px;font-size:0.64rem;" onchange="window.QSFVideoStudio.updateOverlayPlaySegment('${c.id}',${si},'start',this.value)" />
                <span>→</span>
                <input type="number" step="0.5" min="0.5" value="${seg.end}" style="width:48px;height:21px;font-size:0.64rem;" onchange="window.QSFVideoStudio.updateOverlayPlaySegment('${c.id}',${si},'end',this.value)" />
                <span>s</span>
                <button type="button" class="vs-chip-btn" style="color:#B91C1C;margin-left:auto;" onclick="window.QSFVideoStudio.deleteOverlayPlaySegment('${c.id}',${si})">&times;</button>
              </div>
            `).join('') || '<div style="font-size:0.62rem;color:#64748B;">No scheduled play turns yet (click + Add Turn or open Director tab).</div>'}
          </div>
        </div>
      `;
    },

    renderPropertiesInspector() {
      const body = document.getElementById('vsDynamicPropertiesBody');
      if (!body) return;
      const c = this.getSelectedClip();
      if (!c) {
        body.innerHTML = '<div class="vs-empty-inspector">Select any video, overlay, image, logo, subtitle, text, effect, or audio clip on the canvas or timeline to customize it.</div>';
        return;
      }
      const tr = this.getTrackById(c.trackId);
      const endVal = Number(((c.startTime || 0) + (c.duration || 0)).toFixed(2));
      const commonTimingHtml = `
        <div class="news-panel-section compact-section" style="margin-bottom:8px;">
          <div class="news-section-title compact-title">
            <span><i class="fas fa-clock"></i> Timing (${escHtml(tr ? tr.name : c.kind)})</span>
            <div style="display:flex;gap:4px;">
              <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.splitSelectedAtPlayhead()" title="Split"><i class="fas fa-scissors"></i></button>
              <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.duplicateSelected()" title="Duplicate"><i class="fas fa-copy"></i></button>
              <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.deleteSelected()" style="color:#B91C1C;border-color:#FECDD3;" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="vs-colors-row-3">
            <div><label class="compact-field-label">Start (s)</label><input type="number" class="form-control compact-input" min="0" step="0.1" value="${Number(c.startTime).toFixed(2)}" onchange="window.QSFVideoStudio.updateSelectedProp('startTime', this.value, true)" /></div>
            <div><label class="compact-field-label">Duration (s)</label><input type="number" class="form-control compact-input" min="0.2" step="0.1" value="${Number(c.duration).toFixed(2)}" onchange="window.QSFVideoStudio.updateSelectedProp('duration', this.value, true)" /></div>
            <div><label class="compact-field-label">End (s)</label><input type="number" class="form-control compact-input" min="0.2" step="0.1" value="${endVal}" onchange="window.QSFVideoStudio.updateSelectedProp('endTime', this.value, true)" /></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:8px;">
            ${c.kind !== 'audio' ? `<label style="display:flex;align-items:center;gap:5px;font-size:0.7rem;font-weight:700;"><input type="checkbox" ${c.visible !== false ? 'checked' : ''} onchange="window.QSFVideoStudio.updateSelectedProp('visible', this.checked, true)" /> Visible</label>` : ''}
            <label style="display:flex;align-items:center;gap:5px;font-size:0.7rem;font-weight:700;color:#B91C1C;"><input type="checkbox" ${c.locked ? 'checked' : ''} onchange="window.QSFVideoStudio.updateSelectedProp('locked', this.checked, true)" /> Lock Clip</label>
          </div>
        </div>
      `;

      let specificHtml = '';
      if (c.kind === 'video' || c.kind === 'video_overlay') {
        const isPip = c.kind === 'video_overlay';
        specificHtml = `
          ${isPip ? this.renderOverlayFreezeControlsHtml(c) : ''}
          <div class="news-panel-section compact-section" style="margin-bottom:8px;">
            <div class="news-section-title compact-title">
              <span><i class="fas fa-film"></i> ${isPip ? 'Video Overlay Layout & Speed' : 'Main Video Clip'}</span>
              <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.moveVideoClipKind('${c.id}', '${isPip ? 'video' : 'video_overlay'}')">To ${isPip ? 'Main' : 'Overlay'}</button>
            </div>
            <div class="compact-input-row-2col">
              <div>
                <label class="compact-field-label">Speed (${c.speed || 1}x)</label>
                <select class="form-control compact-input" onchange="window.QSFVideoStudio.updateSelectedProp('speed', Number(this.value), true)">
                  ${[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map(sp => `<option value="${sp}" ${(Number(c.speed) || 1) === sp ? 'selected' : ''}>${sp}x</option>`).join('')}
                </select>
              </div>
              <div style="display:flex;align-items:flex-end;gap:5px;">
                <button type="button" class="vs-chip-btn ${c.reversed ? 'primary' : ''}" style="flex:1;height:29px;" onclick="window.QSFVideoStudio.updateSelectedProp('reversed', ${!c.reversed}, true)"><i class="fas fa-backward"></i> ${c.reversed ? 'Reversed' : 'Reverse'}</button>
              </div>
            </div>
            <div style="margin-top:6px;">
              <label class="compact-field-label">Split-Screen / Layout Preset</label>
              <div class="vs-split-preset-grid">
                ${SPLIT_PRESETS.map(sp => `<button type="button" class="${(c.splitScreen || 'none') === sp.key ? 'active' : ''}" onclick="window.QSFVideoStudio.updateSelectedProp('splitScreen','${sp.key}',true)">${sp.label}</button>`).join('')}
              </div>
            </div>
            ${isPip ? `
              <div class="photo-control-sliders compact-sliders" style="margin-top:6px;">
                <div class="photo-slider-item"><span class="photo-slider-label"><span>Size</span><span>${c.widthPct || 38}%</span></span><input type="range" min="15" max="100" value="${c.widthPct || 38}" oninput="window.QSFVideoStudio.updateSelectedProp('widthPct', Number(this.value))" /></div>
                <div class="photo-slider-item"><span class="photo-slider-label"><span>Opacity</span><span>${Math.round((c.opacity ?? 1) * 100)}%</span></span><input type="range" min="10" max="100" value="${Math.round((c.opacity ?? 1) * 100)}" oninput="window.QSFVideoStudio.updateSelectedProp('opacity', this.value / 100)" /></div>
                <div class="photo-slider-item"><span class="photo-slider-label"><span>Radius</span><span>${c.cornerRadius || 0}px</span></span><input type="range" min="0" max="60" value="${c.cornerRadius || 0}" oninput="window.QSFVideoStudio.updateSelectedProp('cornerRadius', Number(this.value))" /></div>
                <div class="photo-slider-item"><span class="photo-slider-label"><span>Rotate</span><span>${c.rotation || 0}°</span></span><input type="range" min="-180" max="180" value="${c.rotation || 0}" oninput="window.QSFVideoStudio.updateSelectedProp('rotation', Number(this.value))" /></div>
              </div>
            ` : `
              <div class="photo-control-sliders compact-sliders" style="margin-top:6px;">
                <div class="photo-slider-item"><span class="photo-slider-label"><span>Scale</span><span>${c.scale || 100}%</span></span><input type="range" min="35" max="200" value="${c.scale || 100}" oninput="window.QSFVideoStudio.updateSelectedProp('scale', Number(this.value))" /></div>
                <div class="photo-slider-item"><span class="photo-slider-label"><span>Rotate</span><span>${c.rotation || 0}°</span></span><input type="range" min="-180" max="180" value="${c.rotation || 0}" oninput="window.QSFVideoStudio.updateSelectedProp('rotation', Number(this.value))" /></div>
              </div>
              <div class="compact-input-row-2col" style="margin-top:6px;">
                <div><label class="compact-field-label">Transition In</label><select class="form-control compact-input" onchange="window.QSFVideoStudio.updateSelectedProp('transitionInType', this.value, true)">${Object.entries(TRANSITION_LABELS).filter(([k]) => k !== 'fade_out').map(([k, lbl]) => `<option value="${k}" ${(c.transitionIn?.type || 'none') === k ? 'selected' : ''}>${lbl}</option>`).join('')}</select></div>
                <div><label class="compact-field-label">Trans. Dur</label><select class="form-control compact-input" onchange="window.QSFVideoStudio.updateSelectedProp('transitionInDur', this.value, true)">${[0.5, 1, 1.5, 2, 3].map(d => `<option value="${d}" ${(c.transitionIn?.duration || 1) === d ? 'selected' : ''}>${d}s</option>`).join('')}</select></div>
              </div>
            `}
          </div>
          ${this.renderColorAndCropHtml(c)}
          ${this.renderKeyframesSectionHtml(c)}
          <div class="news-panel-section compact-section" style="margin-top:8px;">
            <div class="news-section-title compact-title"><span><i class="fas fa-volume-high"></i> Clip Voice / Audio</span></div>
            <div style="display:flex;align-items:center;gap:8px;">
              <label style="display:flex;align-items:center;gap:4px;font-size:0.7rem;font-weight:700;"><input type="checkbox" ${c.muted ? 'checked' : ''} onchange="window.QSFVideoStudio.updateSelectedProp('muted', this.checked, true)" /> Mute</label>
              <input type="range" min="0" max="1.5" step="0.05" value="${c.volume != null ? c.volume : 1}" style="flex:1;" oninput="window.QSFVideoStudio.updateSelectedProp('volume', Number(this.value))" />
              <span style="font-size:0.68rem;font-weight:700;">${Math.round((c.volume != null ? c.volume : 1) * 100)}%</span>
            </div>
          </div>
        `;
      } else if (c.kind === 'image') {
        specificHtml = `
          <div class="news-panel-section compact-section">
            <div class="news-section-title compact-title"><span><i class="fas fa-image"></i> ${c.isOfficialLogo ? 'Official QSF Logo' : (c.isFreezeFrame ? 'Freeze Frame' : 'Image Overlay')}</span></div>
            <div class="vs-align-3x3-grid">
              <button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('tl')">↖ TL</button><button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('tc')">↑ Top</button><button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('tr')">↗ TR</button>
              <button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('ml')">← Left</button><button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('mc')">✦ Center</button><button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('mr')">→ Right</button>
              <button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('bl')">↙ BL</button><button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('bc')">↓ Bot</button><button type="button" onclick="window.QSFVideoStudio.alignSelectedVisual('br')">↘ BR</button>
            </div>
            <div class="photo-control-sliders compact-sliders" style="margin-top:8px;">
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Size</span><span>${c.widthPct}%</span></span><input type="range" min="6" max="100" value="${c.widthPct}" oninput="window.QSFVideoStudio.updateSelectedProp('widthPct', Number(this.value))" /></div>
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Opacity</span><span>${Math.round((c.opacity ?? 1) * 100)}%</span></span><input type="range" min="10" max="100" value="${Math.round((c.opacity ?? 1) * 100)}" oninput="window.QSFVideoStudio.updateSelectedProp('opacity', this.value / 100)" /></div>
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Rotation</span><span>${c.rotation || 0}°</span></span><input type="range" min="-180" max="180" value="${c.rotation || 0}" oninput="window.QSFVideoStudio.updateSelectedProp('rotation', Number(this.value))" /></div>
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Corners</span><span>${c.cornerRadius || 0}px</span></span><input type="range" min="0" max="80" value="${c.cornerRadius || 0}" oninput="window.QSFVideoStudio.updateSelectedProp('cornerRadius', Number(this.value))" /></div>
            </div>
          </div>
          ${this.renderColorAndCropHtml(c)}
          ${this.renderKeyframesSectionHtml(c)}
        `;
      } else if (c.kind === 'text' || c.kind === 'subtitle') {
        specificHtml = `
          <div class="news-panel-section compact-section">
            <div class="news-section-title compact-title">
              <span><i class="fas ${c.kind === 'subtitle' ? 'fa-closed-captioning' : 'fa-font'}"></i> ${c.kind === 'subtitle' ? 'Subtitle Styling & Text' : 'Urdu & English Text'}</span>
              ${c.kind === 'subtitle' ? `<button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.applyStyleToAllSubtitles()">Apply All</button>` : ''}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">
              <div class="lang-segment-control" style="transform:scale(0.92);transform-origin:left;">
                <button type="button" class="lang-segment-btn ${c.dir === 'ltr' ? 'active' : ''}" onclick="window.QSFVideoStudio.updateSelectedProp('dir','ltr',true)">English (LTR)</button>
                <button type="button" class="lang-segment-btn ${c.dir === 'rtl' ? 'active' : ''}" onclick="window.QSFVideoStudio.updateSelectedProp('dir','rtl',true)">اردو (RTL)</button>
              </div>
              <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.alignSelectedVisual('bc')">Bot</button>
              <button type="button" class="btn-tiny-reset" onclick="window.QSFVideoStudio.alignSelectedVisual('mc')">Mid</button>
            </div>
            <textarea class="form-control compact-input" rows="2" dir="${c.dir}" oninput="window.QSFVideoStudio.updateSelectedProp('text', this.value)">${escHtml(c.text)}</textarea>
            <div class="compact-input-row-2col" style="margin-top:6px;">
              <div><label class="compact-field-label">Animation</label><select class="form-control compact-input" onchange="window.QSFVideoStudio.updateSelectedProp('animation', this.value, true)">${Object.entries(TEXT_ANIMATIONS).map(([k, lbl]) => `<option value="${k}" ${(c.animation || 'none') === k ? 'selected' : ''}>${lbl}</option>`).join('')}</select></div>
              <div>
                <label class="compact-field-label">Font</label>
                <select class="form-control compact-input" onchange="window.QSFVideoStudio.updateSelectedProp('fontFamily', this.value, true)">
                  <option value="'Noto Nastaliq Urdu', 'Noto Naskh Arabic', Tahoma, sans-serif" ${c.fontFamily.includes('Nastaliq') ? 'selected' : ''}>Noto Nastaliq Urdu</option>
                  <option value="'Noto Naskh Arabic', Tahoma, sans-serif" ${c.fontFamily.includes('Naskh') && !c.fontFamily.includes('Nastaliq') ? 'selected' : ''}>Noto Naskh Arabic</option>
                  <option value="'Outfit', 'Inter', sans-serif" ${c.fontFamily.includes('Outfit') ? 'selected' : ''}>Outfit Headline</option>
                  <option value="'Inter', sans-serif" ${c.fontFamily === "'Inter', sans-serif" ? 'selected' : ''}>Inter Clean Sans</option>
                </select>
              </div>
            </div>
            <div class="vs-colors-row-3" style="margin-top:6px;">
              <div><label class="compact-field-label">Text</label><input type="color" value="${c.color}" style="width:100%;height:26px;" oninput="window.QSFVideoStudio.updateSelectedProp('color', this.value)" /></div>
              <div><label class="compact-field-label">Box BG</label><input type="color" value="${c.bgColor}" style="width:100%;height:26px;" oninput="window.QSFVideoStudio.updateSelectedProp('bgColor', this.value)" /></div>
              <div><label class="compact-field-label">BG ${Math.round((c.bgOpacity ?? 0.9) * 100)}%</label><input type="range" min="0" max="100" value="${Math.round((c.bgOpacity ?? 0.9) * 100)}" oninput="window.QSFVideoStudio.updateSelectedProp('bgOpacity', this.value / 100)" /></div>
            </div>
            <div class="photo-control-sliders compact-sliders" style="margin-top:6px;">
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Size</span><span>${c.fontSize}px</span></span><input type="range" min="16" max="110" value="${c.fontSize}" oninput="window.QSFVideoStudio.updateSelectedProp('fontSize', Number(this.value))" /></div>
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Max Width</span><span>${c.maxWidthPct}%</span></span><input type="range" min="25" max="100" value="${c.maxWidthPct}" oninput="window.QSFVideoStudio.updateSelectedProp('maxWidthPct', Number(this.value))" /></div>
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Y Position</span><span>${Math.round(c.yPct)}%</span></span><input type="range" min="5" max="95" value="${Math.round(c.yPct)}" oninput="window.QSFVideoStudio.updateSelectedProp('yPct', Number(this.value))" /></div>
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Padding</span><span>${c.padding}px</span></span><input type="range" min="0" max="36" value="${c.padding}" oninput="window.QSFVideoStudio.updateSelectedProp('padding', Number(this.value))" /></div>
            </div>
          </div>
          ${this.renderKeyframesSectionHtml(c)}
        `;
      } else if (c.kind === 'effect') {
        specificHtml = `
          <div class="news-panel-section compact-section">
            <div class="news-section-title compact-title"><span><i class="fas fa-wand-sparkles" style="color:#7C3AED;"></i> Visual Broadcast Effect</span></div>
            <select class="form-control compact-input" onchange="window.QSFVideoStudio.updateSelectedProp('effectType', this.value, true)">
              ${Object.entries(EFFECT_LABELS).map(([k, lbl]) => `<option value="${k}" ${c.effectType === k ? 'selected' : ''}>${lbl}</option>`).join('')}
            </select>
            <div class="photo-control-sliders compact-sliders" style="margin-top:8px;">
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Intensity</span><span>${c.intensity || 80}%</span></span><input type="range" min="10" max="100" value="${c.intensity || 80}" oninput="window.QSFVideoStudio.updateSelectedProp('intensity', Number(this.value))" /></div>
            </div>
          </div>
        `;
      } else if (c.kind === 'audio') {
        specificHtml = `
          <div class="news-panel-section compact-section">
            <div class="news-section-title compact-title"><span><i class="fas fa-music"></i> ${c.isSfx ? 'Sound Effect' : 'Audio / Voice-Over'}</span></div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <label style="display:flex;align-items:center;gap:4px;font-size:0.7rem;font-weight:700;"><input type="checkbox" ${c.muted ? 'checked' : ''} onchange="window.QSFVideoStudio.updateSelectedProp('muted', this.checked, true)" /> Mute</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:0.7rem;font-weight:700;"><input type="checkbox" ${c.loop ? 'checked' : ''} onchange="window.QSFVideoStudio.updateSelectedProp('loop', this.checked, true)" /> Loop</label>
              <label style="display:flex;align-items:center;gap:4px;font-size:0.7rem;font-weight:700;"><input type="checkbox" ${c.reversed ? 'checked' : ''} onchange="window.QSFVideoStudio.updateSelectedProp('reversed', this.checked, true)" /> Reverse</label>
            </div>
            <div class="photo-control-sliders compact-sliders">
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Volume</span><span>${Math.round((c.volume ?? 0.5) * 100)}%</span></span><input type="range" min="0" max="1.5" step="0.05" value="${c.volume ?? 0.5}" oninput="window.QSFVideoStudio.updateSelectedProp('volume', Number(this.value))" /></div>
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Fade In</span><span>${c.fadeIn || 0}s</span></span><input type="range" min="0" max="5" step="0.1" value="${c.fadeIn || 0}" oninput="window.QSFVideoStudio.updateSelectedProp('fadeIn', Number(this.value))" /></div>
              <div class="photo-slider-item"><span class="photo-slider-label"><span>Fade Out</span><span>${c.fadeOut || 0}s</span></span><input type="range" min="0" max="5" step="0.1" value="${c.fadeOut || 0}" oninput="window.QSFVideoStudio.updateSelectedProp('fadeOut', Number(this.value))" /></div>
            </div>
          </div>
        `;
      }

      body.innerHTML = commonTimingHtml + specificHtml;
    },

    selectClip(clipId) {
      this.selectedId = clipId;
      this.renderPropertiesInspector();
      this.renderLayersAndMixer();
      this.renderTimeline();
      this.renderInteractiveHandles();
    },

    // ================== DYNAMIC UNLIMITED MULTI-TRACK TIMELINE ==================
    setTimelineZoom(pxPerSec) {
      this.timelinePxPerSec = Math.max(2, Math.min(120, Number(pxPerSec) || 20));
      const sl = document.getElementById('vsTimelineZoomSlider');
      if (sl) sl.value = String(this.timelinePxPerSec);
      this.renderTimeline();
    },
    adjustTimelineZoom(delta) { this.setTimelineZoom(this.timelinePxPerSec + delta); },
    fitTimelineZoom() {
      const area = document.getElementById('vsTimelineScrollArea');
      if (!area) return;
      const dur = Math.max(10, this.getTotalDuration() + 2);
      this.setTimelineZoom(Math.max(2, Math.min(80, Math.floor((area.clientWidth - 24) / dur))));
    },
    toggleSnap() {
      this.timelineSnapEnabled = !this.timelineSnapEnabled;
      document.getElementById('vsBtnSnapToggle')?.classList.toggle('active', this.timelineSnapEnabled);
    },

    renderTimeline() {
      const hdrCol = document.getElementById('vsTrackHeadersCol');
      const inner = document.getElementById('vsTimelineInner');
      const ruler = document.getElementById('vsTimelineRuler');
      const lanes = document.getElementById('vsTimelineLanes');
      const area = document.getElementById('vsTimelineScrollArea');
      if (!hdrCol || !inner || !ruler || !lanes) return;

      const totalDur = Math.max(15, this.getTotalDuration() + Math.max(4, Math.round(this.getTotalDuration() * 0.1)));
      const px = this.timelinePxPerSec;
      const totalWidth = Math.max((area ? area.clientWidth : 640), Math.ceil(totalDur * px));
      inner.style.width = totalWidth + 'px';

      hdrCol.innerHTML = `<div class="vs-nle-ruler-corner"><span>TRACKS (${this.state.tracks.length})</span><span style="color:#B91C1C;">∞</span></div>` +
        this.state.tracks.map((tr, idx) => {
          const meta = TRACK_TYPE_META[tr.type] || TRACK_TYPE_META.video;
          return `
            <div class="vs-track-header-row" data-hdr-track="${tr.id}">
              <span class="vs-track-header-name" title="Click to rename: ${escHtml(tr.name)}" onclick="window.QSFVideoStudio.renameTrack('${tr.id}')">
                <span class="vs-track-dot" style="background:${tr.color};"></span>${escHtml(tr.name)}
              </span>
              <div class="vs-track-hdr-btns">
                ${meta.hasVis ? `<button type="button" class="${tr.visible ? '' : 'off'}" title="Toggle Visibility" onclick="window.QSFVideoStudio.toggleTrackFlag('${tr.id}','visible')"><i class="fas ${tr.visible ? 'fa-eye' : 'fa-eye-slash'}"></i></button>` : ''}
                ${meta.hasAudio ? `<button type="button" class="${tr.muted ? 'off' : ''}" title="Mute Track" onclick="window.QSFVideoStudio.toggleTrackFlag('${tr.id}','muted')"><i class="fas ${tr.muted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i></button>` : ''}
                <button type="button" class="${tr.locked ? 'off' : ''}" title="Lock Track" onclick="window.QSFVideoStudio.toggleTrackFlag('${tr.id}','locked')"><i class="fas ${tr.locked ? 'fa-lock' : 'fa-lock-open'}"></i></button>
                <button type="button" title="Up" ${idx === 0 ? 'disabled style="opacity:0.35;"' : ''} onclick="window.QSFVideoStudio.moveTrackOrder('${tr.id}', -1)"><i class="fas fa-chevron-up"></i></button>
                <button type="button" title="Down" ${idx === this.state.tracks.length - 1 ? 'disabled style="opacity:0.35;"' : ''} onclick="window.QSFVideoStudio.moveTrackOrder('${tr.id}', 1)"><i class="fas fa-chevron-down"></i></button>
                <button type="button" title="Delete Track" style="color:#B91C1C;" onclick="window.QSFVideoStudio.deleteTrack('${tr.id}')"><i class="fas fa-xmark"></i></button>
              </div>
            </div>
          `;
        }).join('');

      const stepSec = px >= 50 ? 1 : (px >= 24 ? 2 : (px >= 12 ? 5 : (px >= 6 ? 10 : (px >= 3 ? 30 : 60))));
      let rulerHtml = '';
      for (let s = 0; s <= totalDur; s += stepSec) {
        const m = Math.floor(s / 60), rem = s % 60;
        rulerHtml += `<div class="vs-ruler-tick" style="left:${Math.round(s * px)}px;">${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}</div>`;
      }
      ruler.innerHTML = rulerHtml;

      lanes.innerHTML = this.state.tracks.map(tr => {
        const clips = this.state.clips.filter(c => c.trackId === tr.id).sort((a, b) => a.startTime - b.startTime);
        let clipsHtml = clips.map(c => {
          const left = Math.round(c.startTime * px);
          const width = Math.max(24, Math.round(c.duration * px));
          const asset = c.assetId ? this.getAssetById(c.assetId) : null;
          const thumb = c.freezeFrameDataUrl || (asset && asset.thumbnail) || (c.kind === 'image' ? (c.imageUrl || getOfficialLogoUrl()) : null);
          const label = (c.kind === 'text' || c.kind === 'subtitle') ? c.text : (c.name || tr.name);
          const metaPill = [c.speed && c.speed !== 1 ? `${c.speed}x` : '', c.reversed ? 'REV' : '', (c.kind === 'video_overlay' && c.useSequentialControl) ? 'SEQ' : ''].filter(Boolean).join(' ');
          const kfHtml = (Array.isArray(c.keyframes) ? c.keyframes : []).map(kf => `<span class="vs-kf-dot" style="left:${Math.max(3, Math.min(97, (kf.t / Math.max(0.1, c.duration)) * 100))}%;"></span>`).join('');

          // Playback Schedule Visualization Bars for Sequential Overlay Clips!
          let schedHtml = '';
          const hasSchedule = c.kind === 'video_overlay' && c.useSequentialControl;
          if (hasSchedule && Array.isArray(c.playSegments)) {
            let acc = 0;
            schedHtml = [...c.playSegments].sort((a, b) => a.start - b.start).map(seg => {
              const segL = Math.max(0, ((seg.start - c.startTime) / Math.max(0.1, c.duration)) * 100);
              const segW = Math.max(1, ((seg.end - seg.start) / Math.max(0.1, c.duration)) * 100);
              const tag = acc > 0.05 ? `▶ RES ${acc.toFixed(0)}s` : `▶ PLAY`;
              acc += Math.max(0, seg.end - seg.start) * (Number(c.speed) || 1);
              return `<span class="vs-clip-play-seg" style="left:${segL}%;width:${Math.min(100 - segL, segW)}%;">${tag}</span>`;
            }).join('');
          }

          return `
            <div class="vs-nle-clip track-${tr.type} ${hasSchedule ? 'has-schedule' : ''} ${this.selectedId === c.id ? 'selected' : ''}"
                 data-clip-id="${c.id}" data-track-id="${tr.id}" style="left:${left}px; width:${width}px;">
              ${schedHtml}
              <span class="vs-trim-handle left" data-trim="left" title="Drag to trim start"></span>
              ${thumb && width > 56 ? `<img class="vs-clip-thumb-mini" src="${thumb}" alt="">` : ''}
              <span class="vs-clip-title">${escHtml(label)}</span>
              ${metaPill && width > 65 ? `<span class="vs-clip-meta-pill">${metaPill}</span>` : ''}
              ${width > 48 ? `<span class="vs-clip-dur">${Number(c.duration).toFixed(1)}s</span>` : ''}
              ${kfHtml}
              <span class="vs-trim-handle right" data-trim="right" title="Drag to trim end"></span>
            </div>
          `;
        }).join('');

        if (tr.type === 'video' && clips.length > 1) {
          for (let i = 1; i < clips.length; i++) {
            const prev = clips[i - 1], curr = clips[i];
            if (Math.abs((prev.startTime + prev.duration) - curr.startTime) <= 0.35) {
              const active = curr.transitionIn && curr.transitionIn.type && curr.transitionIn.type !== 'none';
              clipsHtml += `<button type="button" class="vs-trans-badge ${active ? '' : 'inactive'}" style="left:${Math.round(curr.startTime * px)}px;" onclick="event.stopPropagation(); window.QSFVideoStudio.openTransitionForClip('${curr.id}')">⇄</button>`;
            }
          }
        }
        const isMutedLane = (!tr.visible && TRACK_TYPE_META[tr.type]?.hasVis) || (tr.muted && tr.type === 'audio');
        return `<div class="vs-nle-lane ${isMutedLane ? 'muted-lane' : ''}" data-lane-track="${tr.id}" data-lane-type="${tr.type}">${clipsHtml}</div>`;
      }).join('');

      if (area) hdrCol.scrollTop = area.scrollTop;
      this.updateTimeReadout();
    },

    openTransitionForClip(clipId) { this.selectClip(clipId); this.switchLeftTab('transitions'); this.switchRightTab('props'); },

    bindTimelineInteractions() {
      const inner = document.getElementById('vsTimelineInner');
      const area = document.getElementById('vsTimelineScrollArea');
      const hdrCol = document.getElementById('vsTrackHeadersCol');
      const snapGuide = document.getElementById('vsTimelineSnapGuide');
      if (!inner || !area) return;

      area.addEventListener('scroll', () => { if (hdrCol) hdrCol.scrollTop = area.scrollTop; });
      if (hdrCol) hdrCol.addEventListener('wheel', e => { area.scrollTop += e.deltaY; hdrCol.scrollTop = area.scrollTop; }, { passive: true });

      inner.addEventListener('dragover', e => {
        if (!e.dataTransfer || !e.dataTransfer.types.includes('application/x-qsf-studio')) return;
        e.preventDefault();
        inner.querySelectorAll('.vs-nle-lane.drop-active').forEach(l => l.classList.remove('drop-active'));
        inner.querySelectorAll('.vs-nle-clip.drop-trans-target').forEach(c => c.classList.remove('drop-trans-target'));
        e.target.closest('.vs-nle-clip')?.classList.add('drop-trans-target');
        e.target.closest('.vs-nle-lane')?.classList.add('drop-active');
      });
      inner.addEventListener('dragleave', () => {
        inner.querySelectorAll('.vs-nle-lane.drop-active').forEach(l => l.classList.remove('drop-active'));
        inner.querySelectorAll('.vs-nle-clip.drop-trans-target').forEach(c => c.classList.remove('drop-trans-target'));
      });
      inner.addEventListener('drop', e => {
        const raw = e.dataTransfer && e.dataTransfer.getData('application/x-qsf-studio');
        inner.querySelectorAll('.vs-nle-lane.drop-active').forEach(l => l.classList.remove('drop-active'));
        inner.querySelectorAll('.vs-nle-clip.drop-trans-target').forEach(c => c.classList.remove('drop-trans-target'));
        if (!raw) return;
        e.preventDefault();
        let payload; try { payload = JSON.parse(raw); } catch (_) { return; }
        const rect = inner.getBoundingClientRect();
        const dropTime = Math.max(0, Number(((e.clientX - rect.left) / this.timelinePxPerSec).toFixed(2)));
        const laneTrackId = e.target.closest('.vs-nle-lane')?.getAttribute('data-lane-track') || null;
        const clipId = e.target.closest('.vs-nle-clip')?.getAttribute('data-clip-id') || null;
        if (payload.kind === 'media') this.addAssetToTrack(payload.assetId, laneTrackId || 'video', dropTime);
        else if (payload.kind === 'sfx') this.addSfxToTimeline(payload.sfxId, laneTrackId, dropTime);
        else if (payload.kind === 'effect') this.addEffectClip(payload.effectType, laneTrackId, dropTime);
        else if (payload.kind === 'transition') this.applyTransitionToSelected(payload.transType, clipId);
      });

      let drag = null;
      const getSnapPoints = excludeId => {
        const pts = [0, this.state.playback.currentTime];
        this.state.clips.forEach(c => { if (c.id !== excludeId) pts.push(c.startTime, c.startTime + c.duration); });
        return pts;
      };
      const applySnap = (timeVal, snapPts) => {
        if (!this.timelineSnapEnabled) return { t: timeVal, snapped: false };
        const threshSec = Math.max(0.14, 9 / this.timelinePxPerSec);
        for (const p of snapPts) if (Math.abs(timeVal - p) <= threshSec) return { t: Number(p.toFixed(2)), snapped: true };
        return { t: Number(timeVal.toFixed(2)), snapped: false };
      };
      const scrubToEvent = e => {
        const rect = inner.getBoundingClientRect();
        this.seekTo(Number((Math.max(0, e.clientX - rect.left) / this.timelinePxPerSec).toFixed(2)));
      };

      inner.addEventListener('pointerdown', e => {
        if (e.target.closest('.vs-trans-badge')) return;
        const clipEl = e.target.closest('.vs-nle-clip');
        if (!clipEl) { drag = { mode: 'scrub' }; inner.setPointerCapture(e.pointerId); scrubToEvent(e); return; }
        const clipId = clipEl.getAttribute('data-clip-id');
        const clip = this.getClipById(clipId);
        if (!clip) return;
        this.selectClip(clipId);
        const tr = this.getTrackById(clip.trackId);
        if (clip.locked || (tr && tr.locked)) return;
        const trimHandle = e.target.closest('.vs-trim-handle');
        drag = {
          mode: trimHandle ? ('trim-' + trimHandle.getAttribute('data-trim')) : 'move',
          clipId, startX: e.clientX, startY: e.clientY,
          origStart: clip.startTime, origDur: clip.duration, origTrim: clip.trimStart || 0, snapPts: getSnapPoints(clipId)
        };
        inner.setPointerCapture(e.pointerId);
      });

      inner.addEventListener('pointermove', e => {
        if (!drag) return;
        if (drag.mode === 'scrub') { scrubToEvent(e); return; }
        const clip = this.getClipById(drag.clipId);
        if (!clip) return;
        const dt = (e.clientX - drag.startX) / this.timelinePxPerSec;

        if (drag.mode === 'move') {
          let rawStart = Math.max(0, drag.origStart + dt);
          const sStart = applySnap(rawStart, drag.snapPts);
          const sEnd = applySnap(rawStart + clip.duration, drag.snapPts);
          if (sStart.snapped) { clip.startTime = sStart.t; if (snapGuide) { snapGuide.style.left = (sStart.t * this.timelinePxPerSec) + 'px'; snapGuide.classList.remove('hidden'); } }
          else if (sEnd.snapped) { clip.startTime = Math.max(0, Number((sEnd.t - clip.duration).toFixed(2))); if (snapGuide) { snapGuide.style.left = (sEnd.t * this.timelinePxPerSec) + 'px'; snapGuide.classList.remove('hidden'); } }
          else { clip.startTime = Number(rawStart.toFixed(2)); snapGuide?.classList.add('hidden'); }

          const lanesWrap = document.getElementById('vsTimelineLanes');
          if (lanesWrap) {
            const rowIdx = Math.floor((e.clientY - lanesWrap.getBoundingClientRect().top) / 36);
            const targetTr = this.state.tracks[rowIdx];
            if (targetTr && !targetTr.locked && targetTr.id !== clip.trackId) {
              const sameKind = targetTr.type === clip.kind;
              const videoSwap = ['video', 'video_overlay'].includes(clip.kind) && ['video', 'video_overlay'].includes(targetTr.type);
              if (sameKind || videoSwap) {
                clip.trackId = targetTr.id;
                if (videoSwap && clip.kind !== targetTr.type) clip.kind = targetTr.type;
              }
            }
          }
        } else if (drag.mode === 'trim-right') {
          const speed = Number(clip.speed) || 1;
          const maxDur = clip.kind === 'video' ? Math.max(0.3, ((clip.sourceDuration || 86400) - (clip.trimStart || 0)) / speed) : 86400;
          const sn = applySnap(Math.max(clip.startTime + 0.25, drag.origStart + drag.origDur + dt), drag.snapPts);
          clip.duration = Math.min(maxDur, Math.max(0.25, Number((sn.t - clip.startTime).toFixed(2))));
        } else if (drag.mode === 'trim-left') {
          const speed = Number(clip.speed) || 1;
          let delta = Math.max(-drag.origStart, Math.min(drag.origDur - 0.25, dt));
          if (['video', 'audio'].includes(clip.kind)) {
            delta = Math.max(-(drag.origTrim / speed), delta);
            clip.trimStart = Number(Math.max(0, drag.origTrim + delta * speed).toFixed(2));
          }
          clip.startTime = Number((drag.origStart + delta).toFixed(2));
          clip.duration = Number((drag.origDur - delta).toFixed(2));
        }

        this.renderTimeline(); this.renderPropertiesInspector(); this.renderFrame();
      });

      inner.addEventListener('pointerup', () => {
        snapGuide?.classList.add('hidden');
        if (drag && drag.mode !== 'scrub') this.pushHistory();
        drag = null;
      });
    },

    // ================== LIVE MULTI-TRACK RUNTIME PLAYBACK (ZERO BACKGROUND DRIFT FOR FROZEN OVERLAYS) ==================
    getOrCreateRuntimeMedia(clip) {
      if (this.runtimeMediaEls.has(clip.id)) return this.runtimeMediaEls.get(clip.id);
      const asset = this.getAssetById(clip.assetId);
      if (!asset) return null;
      const src = asset.localUrl || asset.url;
      if (!src) return null;
      const el = document.createElement(clip.kind === 'audio' ? 'audio' : 'video');
      el.playsInline = true; el.crossOrigin = 'anonymous'; el.preload = 'auto'; el.src = src;
      this.runtimeMediaEls.set(clip.id, el);
      return el;
    },

    disposeRuntimeMedia(clipId) {
      const el = this.runtimeMediaEls.get(clipId);
      if (el) {
        try { el.pause(); el.removeAttribute('src'); el.load(); } catch (_) {}
        this.runtimeMediaEls.delete(clipId);
      }
    },

    computeClipAudioGain(clip, t) {
      const tr = this.getTrackById(clip.trackId);
      if (!tr || tr.muted || clip.muted) return 0;
      if (clip.kind === 'video_overlay') {
        const ovSt = evaluateOverlayPlaybackAt(clip, t);
        if (!ovSt.isPlaying) return 0; // Frozen overlays are ALWAYS silent!
      }
      const baseVol = (clip.volume != null ? clip.volume : 1) * (tr.volume != null ? tr.volume : 1);
      const rel = t - clip.startTime, rem = (clip.startTime + clip.duration) - t;
      let env = 1;
      if ((clip.fadeIn || 0) > 0 && rel < clip.fadeIn) env = Math.min(env, Math.max(0, rel / clip.fadeIn));
      if ((clip.fadeOut || 0) > 0 && rem < clip.fadeOut) env = Math.min(env, Math.max(0, rem / clip.fadeOut));
      return Math.max(0, Math.min(1, baseVol * env));
    },

    syncLiveMediaElements(t, isPlaying) {
      const activeIds = new Set();
      for (const clip of this.state.clips) {
        if (!['video', 'video_overlay', 'audio'].includes(clip.kind)) continue;
        const inRange = t >= clip.startTime - 0.02 && t < clip.startTime + clip.duration;
        if (!inRange) continue;
        activeIds.add(clip.id);

        const el = this.getOrCreateRuntimeMedia(clip);
        if (!el) continue;

        let shouldPlayElement = isPlaying && !clip.reversed;
        let targetSrcT;

        if (clip.kind === 'video_overlay') {
          const ovSt = evaluateOverlayPlaybackAt(clip, t);
          targetSrcT = ovSt.srcTime;
          // CRITICAL: Inactive / frozen overlays MUST stay paused and NOT advance in the background!
          if (!ovSt.isPlaying) {
            shouldPlayElement = false;
            if (!el.paused) el.pause();
            el.muted = true;
            // Only seek paused video once to exact frozen timestamp (skip if using cached initial freeze image)
            if (!ovSt.useInitialFreezeThumb && Math.abs((el.currentTime || 0) - targetSrcT) > 0.04) {
              try {
                el.currentTime = targetSrcT;
                el.onseeked = () => { this.renderFrame(); };
              } catch (_) {}
            }
            continue;
          }
        } else {
          targetSrcT = computeSourceTimeForClip(clip, t);
        }

        const speed = Math.max(0.25, Math.min(4, Number(clip.speed) || 1));
        const gain = this.computeClipAudioGain(clip, t);
        el.muted = !shouldPlayElement || gain <= 0.001;
        el.volume = Math.max(0, Math.min(1, gain));

        if (shouldPlayElement) {
          try { el.playbackRate = speed; } catch (_) {}
          if (Math.abs((el.currentTime || 0) - targetSrcT) > 0.25) {
            try { el.currentTime = targetSrcT; } catch (_) {}
          }
          if (el.paused && el.readyState >= 2) el.play().catch(() => {});
        } else {
          if (!el.paused) el.pause();
          if (Math.abs((el.currentTime || 0) - targetSrcT) > 0.03) {
            try {
              el.currentTime = targetSrcT;
              el.onseeked = () => { if (!this.state.playback.playing) this.renderFrame(); };
            } catch (_) {}
          }
        }
      }

      for (const [cid, el] of this.runtimeMediaEls.entries()) {
        if (!activeIds.has(cid) && !el.paused) el.pause();
      }
    },

    togglePlay() { if (this.state.playback.playing) this.pausePlayback(); else this.startPlayback(); },

    startPlayback() {
      const totalDur = this.getTotalDuration();
      if (this.state.playback.currentTime >= totalDur - 0.05) this.state.playback.currentTime = 0;
      this.state.playback.playing = true;
      const btn = document.getElementById('vsBtnPlayPause');
      if (btn) btn.innerHTML = '<i class="fas fa-pause"></i>';

      let lastTs = performance.now();
      let lastDirUpdate = 0;
      const tick = now => {
        if (!this.state.playback.playing) return;
        const dt = Math.min(0.1, (now - lastTs) / 1000);
        lastTs = now;
        this.state.playback.currentTime += dt;
        const dur = this.getTotalDuration();
        if (this.state.playback.currentTime >= dur) {
          if (this.state.playback.loop) this.state.playback.currentTime = 0;
          else { this.state.playback.currentTime = dur; this.pausePlayback(); return; }
        }
        this.syncLiveMediaElements(this.state.playback.currentTime, true);
        this.updateTimeReadout();
        this.renderFrame();
        if (now - lastDirUpdate > 250) {
          lastDirUpdate = now;
          if (document.getElementById('vsRightPanelDirector')?.classList.contains('active')) this.renderOverlayDirectorPanel();
        }
        this.rafId = requestAnimationFrame(tick);
      };
      this.syncLiveMediaElements(this.state.playback.currentTime, true);
      this.rafId = requestAnimationFrame(tick);
    },

    pausePlayback() {
      this.state.playback.playing = false;
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      for (const el of this.runtimeMediaEls.values()) { try { if (!el.paused) el.pause(); } catch (_) {} }
      const btn = document.getElementById('vsBtnPlayPause');
      if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
      this.renderOverlayDirectorPanel();
    },

    seekRelative(delta) { this.seekTo(Math.max(0, Math.min(this.getTotalDuration(), this.state.playback.currentTime + delta))); },
    stepFrames(deltaFrames) { this.pausePlayback(); this.seekRelative(deltaFrames / 30); },
    seekTo(timeSec) {
      const dur = this.getTotalDuration();
      this.state.playback.currentTime = Math.max(0, Math.min(dur, Number(timeSec) || 0));
      this.syncLiveMediaElements(this.state.playback.currentTime, this.state.playback.playing);
      this.updateTimeReadout();
      this.renderFrame();
      if (document.getElementById('vsRightPanelDirector')?.classList.contains('active')) this.renderOverlayDirectorPanel();
    },

    updateTimeReadout() {
      const dur = this.getTotalDuration();
      const t = Math.max(0, Math.min(dur, this.state.playback.currentTime));
      const rd = document.getElementById('vsTimeReadout');
      if (rd) rd.textContent = `${formatSec(t)} / ${formatSec(dur)}`;
      const fr = document.getElementById('vsFrameReadout');
      if (fr) fr.textContent = `F${Math.round(t * 30)} • ${formatSec(t)}`;
      const ph = document.getElementById('vsTimelinePlayhead');
      if (ph) ph.style.left = Math.round(t * this.timelinePxPerSec) + 'px';
    },

    // ================== CANVAS STAGE INTERACTION ==================
    resizeStage() {
      const vp = document.getElementById('vsStageViewport');
      const wrap = document.getElementById('vsStageFrameWrap');
      const canvas = document.getElementById('vsPreviewCanvas');
      if (!vp || !wrap || !canvas) return;
      const fmt = FORMATS[this.state.outputFormat] || FORMATS.portrait_9_16;
      if (canvas.width !== fmt.w || canvas.height !== fmt.h) { canvas.width = fmt.w; canvas.height = fmt.h; }
      const availW = Math.max(180, vp.clientWidth - 20), availH = Math.max(180, vp.clientHeight - 20);
      let scale = Math.min(availW / fmt.w, availH / fmt.h);
      if (this.zoomMode !== 'fit') scale *= Number(this.zoomMode || 1);
      wrap.style.width = Math.round(fmt.w * scale) + 'px';
      wrap.style.height = Math.round(fmt.h * scale) + 'px';
    },

    bindStageInteractions() {
      const layer = document.getElementById('vsInteractiveOverlay');
      if (!layer) return;
      let dragCtx = null;
      layer.addEventListener('pointerdown', e => {
        const knob = e.target.closest('.vs-resize-knob');
        const box = e.target.closest('.vs-hit-box');
        if (!box) { this.selectedId = null; this.renderPropertiesInspector(); this.renderTimeline(); this.renderInteractiveHandles(); return; }
        const id = box.getAttribute('data-hit-id');
        this.selectClip(id);
        const clip = this.getClipById(id);
        const tr = clip ? this.getTrackById(clip.trackId) : null;
        if (!clip || clip.locked || (tr && tr.locked)) return;
        const rect = layer.getBoundingClientRect();
        dragCtx = {
          id, mode: knob ? 'resize' : 'move', startX: e.clientX, startY: e.clientY, rectW: rect.width, rectH: rect.height,
          origX: clip.xPct != null ? clip.xPct : 50, origY: clip.yPct != null ? clip.yPct : 50,
          origSize: (clip.kind === 'text' || clip.kind === 'subtitle') ? (clip.fontSize || 42) : (clip.widthPct || 30)
        };
        layer.setPointerCapture(e.pointerId);
      });
      layer.addEventListener('pointermove', e => {
        if (!dragCtx) return;
        const clip = this.getClipById(dragCtx.id);
        if (!clip) return;
        const dxPct = ((e.clientX - dragCtx.startX) / dragCtx.rectW) * 100;
        const dyPct = ((e.clientY - dragCtx.startY) / dragCtx.rectH) * 100;
        if (dragCtx.mode === 'move') {
          let nx = Math.max(4, Math.min(96, dragCtx.origX + dxPct)), ny = Math.max(4, Math.min(96, dragCtx.origY + dyPct));
          if (Math.abs(nx - 50) < 1.8) nx = 50;
          clip.xPct = Number(nx.toFixed(1)); clip.yPct = Number(ny.toFixed(1));
        } else {
          if (clip.kind === 'text' || clip.kind === 'subtitle') clip.fontSize = Math.round(Math.max(16, Math.min(110, dragCtx.origSize + dxPct * 1.1)));
          else clip.widthPct = Math.round(Math.max(6, Math.min(100, dragCtx.origSize + dxPct * 0.9)));
          this.renderPropertiesInspector();
        }
        this.renderFrame();
      });
      layer.addEventListener('pointerup', () => { if (dragCtx) { dragCtx = null; this.pushHistory(); } });
    },

    renderInteractiveHandles() {
      const layer = document.getElementById('vsInteractiveOverlay');
      if (!layer) return;
      layer.innerHTML = this.lastLayoutBoxes.map(b => `
        <div class="vs-hit-box ${this.selectedId === b.id ? 'selected' : ''} ${b.locked ? 'locked' : ''}" data-hit-id="${b.id}"
             style="left:${b.cxPct - b.wPct / 2}%; top:${b.cyPct - b.hPct / 2}%; width:${b.wPct}%; height:${b.hPct}%; transform: rotate(${b.rotation || 0}deg);">
          <span class="vs-lock-pill">${b.locked ? 'Locked' : b.badge}</span>
          <span class="vs-resize-knob" title="Drag to resize"></span>
        </div>
      `).join('');
    },

    // ================== UNIFIED COMPOSITE FRAME RENDERER (PREVIEW + MP4 EXPORT) ==================
    renderFrame() {
      const canvas = document.getElementById('vsPreviewCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const mediaResolver = clip => {
        const el = this.getOrCreateRuntimeMedia(clip);
        return (el && el.readyState >= 2) ? el : null;
      };
      this.lastLayoutBoxes = this.drawCompositeFrame(ctx, canvas.width, canvas.height, this.state.playback.currentTime, mediaResolver);
      this.renderInteractiveHandles();
    },

    drawCanvasBackground(ctx, W, H, refVidEl) {
      const bg = this.state.bg;
      const tpl = TEMPLATES.find(t => t.id === this.state.templateId) || TEMPLATES[0];
      if (bg.mode === 'solid') { ctx.fillStyle = bg.solidColor || '#0F172A'; ctx.fillRect(0, 0, W, H); }
      else if (bg.mode === 'gradient') {
        const rad = ((bg.gradAngle || 135) * Math.PI) / 180;
        const grad = ctx.createLinearGradient(W / 2 - Math.cos(rad) * W, H / 2 - Math.sin(rad) * H, W / 2 + Math.cos(rad) * W, H / 2 + Math.sin(rad) * H);
        grad.addColorStop(0, bg.gradColor1 || '#450A0A'); grad.addColorStop(1, bg.gradColor2 || '#0F172A');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      } else if (bg.mode === 'image' && this.bgImageEl && this.bgImageEl.complete && this.bgImageEl.naturalWidth > 0) {
        const iw = this.bgImageEl.naturalWidth, ih = this.bgImageEl.naturalHeight, sc = Math.max(W / iw, H / ih);
        ctx.drawImage(this.bgImageEl, (W - iw * sc) / 2, (H - ih * sc) / 2, iw * sc, ih * sc);
        ctx.fillStyle = `rgba(0,0,0,${(bg.dimOpacity || 35) / 100})`; ctx.fillRect(0, 0, W, H);
      } else if (bg.mode === 'blur' && refVidEl && refVidEl.videoWidth > 0) {
        const vw = refVidEl.videoWidth, vh = refVidEl.videoHeight, sc = Math.max(W / vw, H / vh) * 1.16;
        ctx.save(); ctx.filter = `blur(${bg.blurAmount || 28}px)`;
        ctx.drawImage(refVidEl, (W - vw * sc) / 2, (H - vh * sc) / 2, vw * sc, vh * sc);
        ctx.filter = 'none'; ctx.restore();
        ctx.fillStyle = `rgba(6, 10, 20, ${(bg.dimOpacity != null ? bg.dimOpacity : 45) / 100})`; ctx.fillRect(0, 0, W, H);
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, tpl.bg1 || '#1E293B'); grad.addColorStop(1, tpl.bg2 || '#0F172A');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      }
    },

    getSplitRegion(splitKey, W, H) {
      if (splitKey === 'left') return { x: 0, y: 0, w: W / 2, h: H, cover: true };
      if (splitKey === 'right') return { x: W / 2, y: 0, w: W / 2, h: H, cover: true };
      if (splitKey === 'top') return { x: 0, y: 0, w: W, h: H / 2, cover: true };
      if (splitKey === 'bottom') return { x: 0, y: H / 2, w: W, h: H / 2, cover: true };
      const pw = W * 0.36, ph = pw * (9 / 16), m = W * 0.04;
      if (splitKey === 'pip_tr') return { x: W - pw - m, y: m + H * 0.06, w: pw, h: ph, cover: true, rounded: true };
      if (splitKey === 'pip_tl') return { x: m, y: m + H * 0.06, w: pw, h: ph, cover: true, rounded: true };
      if (splitKey === 'pip_br') return { x: W - pw - m, y: H - ph - m - H * 0.1, w: pw, h: ph, cover: true, rounded: true };
      if (splitKey === 'pip_bl') return { x: m, y: H - ph - m - H * 0.1, w: pw, h: ph, cover: true, rounded: true };
      return null;
    },

    drawCroppedMedia(ctx, mediaEl, natW, natH, clip, dx, dy, dw, dh) {
      const cL = Math.max(0, Math.min(45, Number(clip.cropLeft) || 0)) / 100;
      const cR = Math.max(0, Math.min(45, Number(clip.cropRight) || 0)) / 100;
      const cT = Math.max(0, Math.min(45, Number(clip.cropTop) || 0)) / 100;
      const cB = Math.max(0, Math.min(45, Number(clip.cropBottom) || 0)) / 100;
      const sx = natW * cL, sy = natH * cT, sw = Math.max(4, natW * (1 - cL - cR)), sh = Math.max(4, natH * (1 - cT - cB));
      ctx.save();
      ctx.filter = buildCanvasFilterString(clip.filters);
      ctx.translate(dx + dw / 2, dy + dh / 2);
      ctx.scale(clip.flipH ? -1 : 1, clip.flipV ? -1 : 1);
      ctx.drawImage(mediaEl, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
      ctx.filter = 'none';
      ctx.restore();
    },

    drawSingleMainVideoFrame(ctx, W, H, clip, vidEl, t, drawBg = true) {
      if (drawBg) this.drawCanvasBackground(ctx, W, H, vidEl);
      if (!clip || !vidEl || !vidEl.videoWidth) return;
      const anim = evaluateAnimatedClip(clip, t);
      const vw = vidEl.videoWidth, vh = vidEl.videoHeight, scaleFactor = Math.min(W, H) / 1080;
      const splitReg = this.getSplitRegion(clip.splitScreen, W, H);

      if (splitReg) {
        ctx.save();
        const rad = splitReg.rounded ? 14 * scaleFactor : 0;
        drawRoundedRect(ctx, splitReg.x, splitReg.y, splitReg.w, splitReg.h, rad); ctx.clip();
        const sc = Math.max(splitReg.w / vw, splitReg.h / vh) * ((anim.scale || 100) / 100);
        const dw = vw * sc, dh = vh * sc;
        ctx.globalAlpha = Math.max(0.05, Math.min(1, anim.opacity ?? 1));
        this.drawCroppedMedia(ctx, vidEl, vw, vh, clip, splitReg.x + (splitReg.w - dw) / 2, splitReg.y + (splitReg.h - dh) / 2, dw, dh);
        ctx.restore();
        return;
      }

      const baseScale = clip.fitMode === 'cover' ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh);
      const effScale = baseScale * ((anim.scale || 100) / 100);
      const dw = vw * effScale, dh = vh * effScale;
      const cx = W / 2 + ((clip.panX || 0) / 100) * (W * 0.45), cy = H / 2 + ((clip.panY || 0) / 100) * (H * 0.45);
      const rad = (clip.cornerRadius || 0) * scaleFactor;
      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(1, anim.opacity ?? 1));
      ctx.translate(cx, cy);
      if (anim.rotation) ctx.rotate((anim.rotation * Math.PI) / 180);
      drawRoundedRect(ctx, -dw / 2, -dh / 2, dw, dh, rad);
      ctx.save(); ctx.clip();
      this.drawCroppedMedia(ctx, vidEl, vw, vh, clip, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      if (clip.borderStyle && clip.borderStyle !== 'none' && clip.fitMode === 'contain') {
        const bColors = { gold: '#F59E0B', white: '#FFFFFF', red: '#DC2626' };
        ctx.strokeStyle = bColors[clip.borderStyle] || '#F59E0B';
        ctx.lineWidth = Math.max(3, Math.round(Math.min(W, H) * 0.0045));
        drawRoundedRect(ctx, -dw / 2, -dh / 2, dw, dh, rad); ctx.stroke();
      }
      ctx.restore();
    },

    drawTransitionBlend(ctx, W, H, type, rawP, intensityPct) {
      const p = easeInOutCubic(Math.max(0, Math.min(1, rawP)));
      const inten = Math.max(0.2, Math.min(1, (Number(intensityPct) || 100) / 100));
      const A = this.scratchCanvasA, B = this.scratchCanvasB;
      if (type === 'fade_in' || type === 'cross_dissolve') { ctx.drawImage(A, 0, 0); ctx.save(); ctx.globalAlpha = p; ctx.drawImage(B, 0, 0); ctx.restore(); }
      else if (type === 'slide_left') { ctx.drawImage(A, 0, 0); ctx.drawImage(B, (1 - p) * W, 0); }
      else if (type === 'slide_right') { ctx.drawImage(A, 0, 0); ctx.drawImage(B, -(1 - p) * W, 0); }
      else if (type === 'push_left') { ctx.drawImage(A, -p * W, 0); ctx.drawImage(B, (1 - p) * W, 0); }
      else if (type === 'push_right') { ctx.drawImage(A, p * W, 0); ctx.drawImage(B, -(1 - p) * W, 0); }
      else if (type === 'wipe') { ctx.drawImage(A, 0, 0); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * p, H); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
      else if (type === 'wipe_right') { ctx.drawImage(A, 0, 0); ctx.save(); ctx.beginPath(); ctx.rect(W * (1 - p), 0, W * p, H); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore(); }
      else if (type === 'zoom_in') {
        const scA = 1 + p * 0.25 * inten, scB = (1 - 0.2 * inten) + p * 0.2 * inten;
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(scA, scA); ctx.drawImage(A, -W / 2, -H / 2); ctx.restore();
        ctx.save(); ctx.globalAlpha = p; ctx.translate(W / 2, H / 2); ctx.scale(scB, scB); ctx.drawImage(B, -W / 2, -H / 2); ctx.restore();
      } else if (type === 'zoom_out') {
        const scA = 1 - p * 0.2 * inten, scB = (1 + 0.24 * inten) - p * 0.24 * inten;
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(scA, scA); ctx.drawImage(A, -W / 2, -H / 2); ctx.restore();
        ctx.save(); ctx.globalAlpha = p; ctx.translate(W / 2, H / 2); ctx.scale(scB, scB); ctx.drawImage(B, -W / 2, -H / 2); ctx.restore();
      } else if (type === 'blur_transition') {
        const blurPx = Math.sin(p * Math.PI) * 26 * inten;
        ctx.save(); ctx.filter = `blur(${blurPx.toFixed(1)}px)`; ctx.drawImage(A, 0, 0); ctx.restore();
        ctx.save(); ctx.globalAlpha = p; ctx.filter = `blur(${blurPx.toFixed(1)}px)`; ctx.drawImage(B, 0, 0); ctx.restore();
      } else if (type === 'film_flash') {
        ctx.drawImage(p < 0.5 ? A : B, 0, 0);
        ctx.fillStyle = `rgba(255, 255, 255, ${(Math.sin(p * Math.PI) * 0.92 * inten).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      } else if (type === 'news_whip') {
        ctx.save(); ctx.filter = `blur(${(Math.sin(p * Math.PI) * 18 * inten).toFixed(1)}px)`;
        ctx.drawImage(A, -p * W, 0); ctx.drawImage(B, (1 - p) * W, 0); ctx.restore();
        ctx.fillStyle = hexToRgba(this.state.accentColor || '#B91C1C', Math.sin(p * Math.PI) * 0.35 * inten);
        ctx.fillRect((1 - p) * W - W * 0.04, 0, W * 0.08, H);
      } else ctx.drawImage(B, 0, 0);
    },

    drawBroadcastEffect(ctx, W, H, clip, t) {
      const inten = Math.max(0.05, Math.min(1, (Number(clip.intensity) || 80) / 100));
      const accent = clip.accentColor || this.state.accentColor || '#B91C1C';
      const relT = Math.max(0, t - clip.startTime);
      ctx.save();
      if (clip.effectType === 'breaking_pulse') {
        const pulse = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(relT * 8))) * inten;
        const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.65);
        grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, hexToRgba(accent, 0.55 * pulse));
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = hexToRgba(accent, 0.9 * pulse); ctx.lineWidth = Math.max(6, Math.round(Math.min(W, H) * 0.012));
        ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
      } else if (clip.effectType === 'news_scanlines') {
        ctx.fillStyle = `rgba(15, 23, 42, ${(0.22 * inten).toFixed(3)})`;
        const step = Math.max(4, Math.round(H / 160));
        for (let y = 0; y < H; y += step * 2) ctx.fillRect(0, y, W, step);
      } else if (clip.effectType === 'cinema_letterbox') {
        const barH = Math.round(H * 0.125 * inten); ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, barH); ctx.fillRect(0, H - barH, W, barH);
      } else if (clip.effectType === 'warm_glow') {
        ctx.globalCompositeOperation = 'screen';
        const gx = W * (0.3 + 0.4 * Math.sin(relT * 0.9));
        const g = ctx.createRadialGradient(gx, H * 0.25, 10, gx, H * 0.25, Math.max(W, H) * 0.7);
        g.addColorStop(0, `rgba(251, 191, 36, ${(0.45 * inten).toFixed(3)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      } else if (clip.effectType === 'vignette_dark') {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.68);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(2, 6, 23, ${(0.78 * inten).toFixed(3)})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      } else if (clip.effectType === 'flash_strobe') {
        const beat = Math.pow(Math.max(0, Math.sin(relT * 10)), 6) * inten;
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.65 * beat).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    },

    drawTextOrSubtitleClip(ctx, W, H, clip, t, anim, scaleFactor, boxes) {
      const relT = Math.max(0, t - clip.startTime);
      const aDur = Math.max(0.12, Number(clip.animDuration) || 0.35);
      const rawP = Math.max(0, Math.min(1, relT / aDur));
      const ep = easeOutCubic(rawP);
      const animType = clip.animation || 'none';

      let renderText = clip.text;
      if (animType === 'typewriter' && rawP < 0.999) {
        if (containsArabicScript(clip.text)) {
          const words = String(clip.text || '').split(/\s+/).filter(Boolean);
          renderText = words.slice(0, Math.max(1, Math.ceil(words.length * rawP))).join(' ');
        } else {
          const chars = Array.from(String(clip.text || ''));
          renderText = chars.slice(0, Math.max(1, Math.ceil(chars.length * rawP))).join('');
        }
      }

      ctx.save();
      const box = computeSingleTextLayout(ctx, W, H, clip, renderText, anim);
      ctx.restore();

      ctx.save();
      let alphaMult = anim.opacity != null ? anim.opacity : 1;
      let offX = 0, offY = 0, sc = 1;
      if (animType === 'fade_in') alphaMult *= ep;
      else if (animType === 'slide_up') { alphaMult *= ep; offY = (1 - ep) * 70 * scaleFactor; }
      else if (animType === 'slide_left') { alphaMult *= ep; offX = (1 - ep) * 160 * scaleFactor; }
      else if (animType === 'slide_right') { alphaMult *= ep; offX = -(1 - ep) * 160 * scaleFactor; }
      else if (animType === 'pop') { alphaMult *= Math.min(1, rawP * 2); sc = 0.6 + 0.4 * easeOutBack(rawP); }
      ctx.globalAlpha = Math.max(0, Math.min(1, alphaMult));

      if (animType === 'ticker_scroll') {
        const barH = Math.max(box.boxH, Math.round(52 * scaleFactor));
        const topY = Math.max(4, Math.min(H - barH - 4, box.cy - barH / 2));
        if ((clip.bgOpacity || 0) > 0.01) { ctx.fillStyle = hexToRgba(clip.bgColor || '#991B1B', clip.bgOpacity); ctx.fillRect(0, topY, W, barH); }
        ctx.save(); ctx.beginPath(); ctx.rect(0, topY, W, barH); ctx.clip();
        ctx.font = `${clip.fontWeight || '700'} ${box.effFontSize}px ${clip.fontFamily || "'Inter', sans-serif"}`;
        ctx.direction = box.dir; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        const runW = Math.max(200, measureCanvasRunWidth(ctx, clip.text || ' '));
        const travel = (relT * 155 * scaleFactor) % (W + runW + 120 * scaleFactor);
        const tx = box.dir === 'rtl' ? (-runW / 2 + travel) : (W + runW / 2 - travel);
        const lm0 = box.lineMetrics[0];
        ctx.fillStyle = clip.color || '#FFFFFF';
        ctx.fillText(clip.text, tx, topY + (barH - (lm0.inkAsc + lm0.inkDesc)) / 2 + lm0.inkAsc);
        ctx.restore();
      } else {
        ctx.translate(box.cx + offX, box.cy + offY);
        if (anim.rotation) ctx.rotate((anim.rotation * Math.PI) / 180);
        if (sc !== 1) ctx.scale(sc, sc);

        if ((clip.bgOpacity || 0) > 0.01) {
          ctx.fillStyle = hexToRgba(clip.bgColor || '#0F172A', clip.bgOpacity);
          drawRoundedRect(ctx, -box.boxW / 2, -box.boxH / 2, box.boxW, box.boxH, (clip.borderRadius || 10) * scaleFactor);
          ctx.fill();
        }
        ctx.font = `${clip.fontWeight || '700'} ${box.effFontSize}px ${clip.fontFamily || "'Inter', sans-serif"}`;
        ctx.direction = box.dir; ctx.textAlign = box.align; ctx.textBaseline = 'alphabetic';
        if ('letterSpacing' in ctx) ctx.letterSpacing = box.hasUrduGlyphs ? '0px' : `${((clip.letterSpacing || 0) * scaleFactor).toFixed(1)}px`;

        const innerW = Math.max(12, box.boxW - box.pad * 2);
        const firstBaselineY = -box.boxH / 2 + box.pad + box.lineMetrics[0].inkAsc;
        for (let i = 0; i < box.lineMetrics.length; i++) {
          const lm = box.lineMetrics[i], lineY = firstBaselineY + lm.relBaseline;
          let lineX = (lm.actLeft - lm.actRight) / 2;
          if (box.align === 'left') lineX = -innerW / 2 + lm.actLeft + box.strokeExtra + lm.hSafety;
          else if (box.align === 'right') lineX = innerW / 2 - lm.actRight - box.strokeExtra - lm.hSafety;

          if (clip.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.72)'; ctx.shadowBlur = Math.round(8 * scaleFactor); ctx.shadowOffsetY = Math.round(2 * scaleFactor); }
          else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }
          if ((clip.outlineWidth || 0) > 0) {
            ctx.lineJoin = 'round'; ctx.strokeStyle = clip.outlineColor || '#000000';
            ctx.lineWidth = clip.outlineWidth * 2 * scaleFactor; ctx.strokeText(lm.text, lineX, lineY);
          }
          ctx.fillStyle = clip.color || '#FFFFFF';
          ctx.fillText(lm.text, lineX, lineY);
        }
      }
      ctx.restore();
      boxes.push({ id: clip.id, badge: clip.kind === 'subtitle' ? 'Subtitle' : 'Text', locked: Boolean(clip.locked), rotation: anim.rotation || 0, cxPct: box.cxPct, cyPct: box.cyPct, wPct: box.wPct, hPct: box.hPct });
    },

    drawCompositeFrame(ctx, W, H, t, resolveVideoEl, isExportMode = false) {
      const boxes = [];
      const scaleFactor = Math.min(W, H) / 1080;
      const tpl = TEMPLATES.find(x => x.id === this.state.templateId) || TEMPLATES[0];

      ctx.save();
      ctx.clearRect(0, 0, W, H);

      // 1. ALL VISIBLE MAIN VIDEO TRACKS (WITH 15 TRANSITIONS)
      const videoTracks = this.state.tracks.filter(tr => tr.type === 'video' && tr.visible);
      let drewAnyMainVideo = false;
      for (const tr of videoTracks) {
        const vClips = this.state.clips.filter(c => c.trackId === tr.id && c.visible !== false).sort((a, b) => a.startTime - b.startTime);
        const activeIdx = vClips.findIndex(c => t >= c.startTime - 0.005 && t < c.startTime + c.duration + 0.005);
        if (activeIdx < 0) continue;

        const curr = vClips[activeIdx], prev = activeIdx > 0 ? vClips[activeIdx - 1] : null;
        const relT = Math.max(0, t - curr.startTime), remT = Math.max(0, (curr.startTime + curr.duration) - t);
        const tin = curr.transitionIn || { type: 'none', duration: 1, intensity: 100 };
        const tout = curr.transitionOut || { type: 'none', duration: 1, intensity: 100 };
        const transDur = Math.min(tin.duration || 1, curr.duration * 0.75);
        const inTransition = tin.type && tin.type !== 'none' && relT < transDur;

        if (inTransition) {
          const p = Math.max(0, Math.min(1, relT / Math.max(0.05, transDur)));
          if (this.scratchCanvasA.width !== W || this.scratchCanvasA.height !== H) {
            this.scratchCanvasA.width = W; this.scratchCanvasA.height = H;
            this.scratchCanvasB.width = W; this.scratchCanvasB.height = H;
          }
          const ctxA = this.scratchCanvasA.getContext('2d'), ctxB = this.scratchCanvasB.getContext('2d');
          ctxA.clearRect(0, 0, W, H); ctxB.clearRect(0, 0, W, H);
          if (prev && Math.abs((prev.startTime + prev.duration) - curr.startTime) <= 0.35 && tin.type !== 'fade_in') {
            this.drawSingleMainVideoFrame(ctxA, W, H, prev, resolveVideoEl(prev, 'tail'), prev.startTime + prev.duration, !drewAnyMainVideo);
          } else { ctxA.fillStyle = '#000000'; ctxA.fillRect(0, 0, W, H); }
          this.drawSingleMainVideoFrame(ctxB, W, H, curr, resolveVideoEl(curr, 'live'), t, !drewAnyMainVideo);
          this.drawTransitionBlend(ctx, W, H, tin.type, p, tin.intensity);
        } else {
          this.drawSingleMainVideoFrame(ctx, W, H, curr, resolveVideoEl(curr, 'live'), t, !drewAnyMainVideo);
        }
        if (tout.type === 'fade_out' && remT < Math.min(tout.duration || 1, curr.duration * 0.5)) {
          ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, 1 - remT / Math.max(0.05, Math.min(tout.duration || 1, curr.duration * 0.5))))})`;
          ctx.fillRect(0, 0, W, H);
        }
        drewAnyMainVideo = true;
      }
      if (!drewAnyMainVideo) this.drawCanvasBackground(ctx, W, H, null);

      // 2. TEMPLATE CHROME
      if (this.state.showChrome && tpl.chrome !== 'none') {
        const accent = this.state.accentColor || tpl.accent || '#B91C1C', barH = Math.round(H * 0.012);
        ctx.fillStyle = accent; ctx.fillRect(0, 0, W, barH); ctx.fillRect(0, H - barH, W, barH);
        if (tpl.chrome === 'live') {
          ctx.fillStyle = `rgba(239, 68, 68, ${0.65 + 0.35 * Math.sin(t * 6)})`;
          ctx.beginPath(); ctx.arc(W * 0.055, H * 0.04, Math.max(7, W * 0.01), 0, Math.PI * 2); ctx.fill();
        }
      }

      // 3. OVERLAY TRACKS IN TRACK STACK ORDER (video_overlay, image, effect, text, subtitle)
      for (const tr of this.state.tracks) {
        if (!tr.visible || tr.type === 'video' || tr.type === 'audio') continue;
        const activeClips = this.state.clips.filter(c =>
          c.trackId === tr.id && c.visible !== false && t >= c.startTime - 0.005 && t <= c.startTime + c.duration + 0.005
        );

        for (const clip of activeClips) {
          const anim = evaluateAnimatedClip(clip, t);

          if (clip.kind === 'video_overlay') {
            const ovSt = evaluateOverlayPlaybackAt(clip, t);
            const vidEl = resolveVideoEl(clip, 'live');
            const freezeImg = (ovSt.isFrozen && ovSt.useInitialFreezeThumb && clip.freezeFrameDataUrl && !isExportMode)
              ? this.preloadImage(clip.freezeFrameDataUrl) : null;
            const useImg = freezeImg && freezeImg.complete && freezeImg.naturalWidth > 0;
            const drawSrc = useImg ? freezeImg : vidEl;
            const vw = useImg ? freezeImg.naturalWidth : ((vidEl && vidEl.videoWidth) ? vidEl.videoWidth : 16);
            const vh = useImg ? freezeImg.naturalHeight : ((vidEl && vidEl.videoHeight) ? vidEl.videoHeight : 9);

            const splitReg = this.getSplitRegion(clip.splitScreen, W, H);
            let boxW, boxH, cx, cy, rad;
            if (splitReg) {
              boxW = splitReg.w; boxH = splitReg.h; cx = splitReg.x + boxW / 2; cy = splitReg.y + boxH / 2; rad = splitReg.rounded ? 14 * scaleFactor : 0;
            } else {
              boxW = Math.max(60, ((anim.widthPct || 38) / 100) * W);
              let ratio = vh / vw;
              if (clip.aspectCrop === '16:9') ratio = 9 / 16;
              else if (clip.aspectCrop === '1:1') ratio = 1;
              else if (clip.aspectCrop === '9:16') ratio = 16 / 9;
              boxH = boxW * ratio;
              cx = Math.max(boxW / 2, Math.min(W - boxW / 2, (anim.xPct / 100) * W));
              cy = Math.max(boxH / 2, Math.min(H - boxH / 2, (anim.yPct / 100) * H));
              rad = (clip.cornerRadius || 12) * scaleFactor;
            }

            ctx.save();
            ctx.globalAlpha = Math.max(0.05, Math.min(1, anim.opacity ?? 1));
            ctx.translate(cx, cy);
            if (anim.rotation && !splitReg) ctx.rotate((anim.rotation * Math.PI) / 180);
            drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, rad);
            ctx.save(); ctx.clip();
            if (drawSrc && vw > 0 && vh > 0) {
              const sc = clip.fitMode === 'contain' ? Math.min(boxW / vw, boxH / vh) : Math.max(boxW / vw, boxH / vh);
              ctx.fillStyle = '#000000'; ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
              this.drawCroppedMedia(ctx, drawSrc, vw, vh, clip, -(vw * sc) / 2, -(vh * sc) / 2, vw * sc, vh * sc);
            } else {
              // Fallback to cached freeze thumbnail so we NEVER show a blank box!
              const fallbackThumb = clip.freezeFrameDataUrl ? this.preloadImage(clip.freezeFrameDataUrl) : null;
              if (fallbackThumb && fallbackThumb.complete && fallbackThumb.naturalWidth > 0) {
                const sc = Math.max(boxW / fallbackThumb.naturalWidth, boxH / fallbackThumb.naturalHeight);
                ctx.drawImage(fallbackThumb, -(fallbackThumb.naturalWidth * sc) / 2, -(fallbackThumb.naturalHeight * sc) / 2, fallbackThumb.naturalWidth * sc, fallbackThumb.naturalHeight * sc);
              } else {
                ctx.fillStyle = '#0F172A'; ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
              }
            }
            ctx.restore();
            // Highlight border: crisp emerald/gold while actively playing in sequential mode, clean white when frozen
            ctx.strokeStyle = (ovSt.scheduled && ovSt.isPlaying) ? '#FDE047' : '#FFFFFF';
            ctx.lineWidth = Math.max(2, Math.round((ovSt.scheduled && ovSt.isPlaying ? 4.5 : 3) * scaleFactor));
            drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, rad); ctx.stroke();
            ctx.restore();

            boxes.push({
              id: clip.id, badge: ovSt.scheduled ? (ovSt.isPlaying ? '▶ Playing' : `❄ Frozen @ ${formatSec(ovSt.srcTime)}`) : 'Video Overlay',
              locked: Boolean(clip.locked), rotation: anim.rotation || 0,
              cxPct: (cx / W) * 100, cyPct: (cy / H) * 100, wPct: (boxW / W) * 100, hPct: (boxH / H) * 100
            });
          } else if (clip.kind === 'image') {
            const url = clip.isOfficialLogo ? getOfficialLogoUrl() : (clip.imageUrl || (this.getAssetById(clip.assetId)?.localUrl || this.getAssetById(clip.assetId)?.url));
            const img = this.preloadImage(url);
            const iw = (img && img.naturalWidth) ? img.naturalWidth : 100, ih = (img && img.naturalHeight) ? img.naturalHeight : 100;
            const boxW = Math.max(36, ((anim.widthPct || 16) / 100) * W), boxH = boxW * (ih / iw);
            const cx = Math.max(boxW / 2, Math.min(W - boxW / 2, (anim.xPct / 100) * W)), cy = Math.max(boxH / 2, Math.min(H - boxH / 2, (anim.yPct / 100) * H));

            ctx.save(); ctx.globalAlpha = Math.max(0.05, Math.min(1, anim.opacity ?? 1));
            ctx.translate(cx, cy); if (anim.rotation) ctx.rotate((anim.rotation * Math.PI) / 180);
            if (clip.bgEnabled) {
              const pad = Math.round(boxW * 0.12);
              ctx.fillStyle = clip.bgColor || '#FFFFFF'; ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 12;
              drawRoundedRect(ctx, -boxW / 2 - pad, -boxH / 2 - pad, boxW + pad * 2, boxH + pad * 2, (clip.bgRadius ?? 14) * scaleFactor);
              ctx.fill(); ctx.shadowBlur = 0;
            }
            if (img && img.complete && img.naturalWidth > 0) {
              ctx.save();
              if (clip.cornerRadius > 0) { drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, clip.cornerRadius * scaleFactor); ctx.clip(); }
              this.drawCroppedMedia(ctx, img, iw, ih, clip, -boxW / 2, -boxH / 2, boxW, boxH);
              ctx.restore();
            }
            ctx.restore();
            boxes.push({ id: clip.id, badge: clip.isOfficialLogo ? 'QSF Logo' : 'Image', locked: Boolean(clip.locked), rotation: anim.rotation || 0, cxPct: (cx / W) * 100, cyPct: (cy / H) * 100, wPct: (boxW / W) * 100, hPct: (boxH / H) * 100 });
          } else if (clip.kind === 'effect') {
            this.drawBroadcastEffect(ctx, W, H, clip, t);
          } else if (clip.kind === 'text' || clip.kind === 'subtitle') {
            this.drawTextOrSubtitleClip(ctx, W, H, clip, t, anim, scaleFactor, boxes);
          }
        }
      }

      ctx.restore();
      return boxes;
    },

    // ================== SAVE / REOPEN / PROJECTS MODAL ==================
    capturePosterThumbnail() {
      const canvas = document.getElementById('vsPreviewCanvas');
      if (!canvas) return null;
      const tmp = document.createElement('canvas'); tmp.width = 240; tmp.height = Math.round(240 * (canvas.height / canvas.width));
      tmp.getContext('2d').drawImage(canvas, 0, 0, tmp.width, tmp.height);
      return tmp.toDataURL('image/jpeg', 0.72);
    },

    async saveProject(asCustomTemplate = false) {
      const titleInput = document.getElementById('vsProjectTitleInput');
      let title = (titleInput && titleInput.value.trim()) || this.state.title || 'QSF Video Broadcast';
      if (asCustomTemplate) {
        const prompted = window.prompt('Enter Custom Video Template Name:', title + ' Template');
        if (!prompted) return;
        title = prompted.trim();
      }
      const fmt = FORMATS[this.state.outputFormat] || FORMATS.portrait_9_16;
      const firstV1 = this.state.clips.find(c => c.kind === 'video' || c.kind === 'video_overlay');
      const firstAsset = firstV1 ? this.getAssetById(firstV1.assetId) : null;
      const payload = {
        title, template_id: this.state.templateId, output_format: this.state.outputFormat,
        output_width: fmt.w, output_height: fmt.h, video_url: (firstAsset && firstAsset.url) || null,
        video_meta: { duration: this.getTotalDuration(), clipCount: this.state.clips.length, trackCount: this.state.tracks.length },
        thumbnail_data_url: this.capturePosterThumbnail(),
        project_state: this.snapshotSerializableState(),
        is_custom_template: Boolean(asCustomTemplate), status: asCustomTemplate ? 'template' : 'draft'
      };
      const isUpdate = !asCustomTemplate && this.state.projectId;
      const endpoint = isUpdate ? `/api/admin/video-studio/projects/${this.state.projectId}` : '/api/admin/video-studio/projects';
      try {
        const res = await fetch(endpoint, { method: isUpdate ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success) {
          if (!asCustomTemplate && data.id) this.state.projectId = data.id;
          window.showToast && window.showToast(data.message || 'Project saved!', 'success');
          this.refreshProjectsCount();
        } else window.showToast && window.showToast(data.message || 'Save failed.', 'error');
      } catch (_) { window.showToast && window.showToast('Network error saving project.', 'error'); }
    },

    async refreshProjectsCount() {
      try {
        const res = await fetch('/api/admin/video-studio/projects');
        const data = await res.json();
        const el = document.getElementById('vsSavedProjectsCount');
        if (el && data.success) el.textContent = String((data.projects || []).length);
      } catch (_) {}
    },

    openProjectsModal(tab = 'drafts') { document.getElementById('vsProjectsModal')?.classList.remove('hidden'); this.loadProjectsList(tab); },
    closeProjectsModal() { document.getElementById('vsProjectsModal')?.classList.add('hidden'); },

    async loadProjectsList(tab = 'drafts') {
      document.querySelectorAll('.vs-proj-tab').forEach(b => b.classList.toggle('active', b.getAttribute('data-vs-ptab') === tab));
      const grid = document.getElementById('vsProjectsListGrid');
      if (!grid) return;
      grid.innerHTML = '<div style="padding:20px;text-align:center;color:#64748B;">Loading...</div>';

      if (['videos', 'images', 'audio'].includes(tab)) {
        try {
          const res = await fetch('/api/admin/video-studio/media-library');
          const data = await res.json();
          const list = tab === 'videos' ? (data.videos || []) : (tab === 'audio' ? [...(data.audio || []), ...(data.sfx || [])] : [...(data.branding || []), ...(data.images || [])]);
          if (!list.length) { grid.innerHTML = `<div style="padding:20px;color:#64748B;">No uploaded ${tab} found yet.</div>`; return; }
          grid.innerHTML = list.map(item => `
            <div class="vs-project-card">
              ${tab === 'images' ? `<img src="${item.url}" class="vs-project-thumb" alt="">` : `<div class="vs-project-thumb" style="display:flex;align-items:center;justify-content:center;color:#B91C1C;"><i class="fas ${tab === 'audio' ? 'fa-music' : 'fa-film'} fa-lg"></i></div>`}
              <div class="vs-project-info">
                <h5>${escHtml(item.filename)}</h5><small>${item.folder} • ${item.sizeFormatted}</small>
                <div class="vs-project-card-actions">
                  ${tab === 'videos' ? `<button type="button" class="btn-admin btn-admin-primary" style="padding:3px 7px;font-size:0.68rem;" onclick="window.QSFVideoStudio.addServerMediaToPool('video','${item.url}','${escHtml(item.filename)}','video')">+ Main</button><button type="button" class="btn-admin btn-admin-secondary" style="padding:3px 7px;font-size:0.68rem;" onclick="window.QSFVideoStudio.addServerMediaToPool('video','${item.url}','${escHtml(item.filename)}','video_overlay')">+ Overlay</button>`
                    : `<button type="button" class="btn-admin btn-admin-primary" style="padding:3px 7px;font-size:0.68rem;" onclick="window.QSFVideoStudio.addServerMediaToPool('${tab === 'audio' ? 'audio' : 'image'}','${item.url}','${escHtml(item.filename)}','${tab === 'audio' ? 'audio' : 'image'}')">+ Add</button>`}
                </div>
              </div>
            </div>`).join('');
        } catch (_) { grid.innerHTML = '<div style="padding:20px;color:#B91C1C;">Could not load media library.</div>'; }
        return;
      }

      try {
        const res = await fetch(`/api/admin/video-studio/projects?type=${tab === 'templates' ? 'template' : 'draft'}`);
        const data = await res.json();
        const projects = data.projects || [];
        if (!projects.length) { grid.innerHTML = `<div style="padding:20px;color:#64748B;">No saved ${tab} yet.</div>`; return; }
        grid.innerHTML = projects.map(p => `
          <div class="vs-project-card">
            ${p.thumbnail_data_url ? `<img src="${p.thumbnail_data_url}" class="vs-project-thumb" alt="">` : `<div class="vs-project-thumb"></div>`}
            <div class="vs-project-info">
              <h5>${escHtml(p.title)}</h5><small>${p.output_width}×${p.output_height} • ${new Date(p.updated_at).toLocaleString()}</small>
              <div class="vs-project-card-actions">
                <button type="button" class="btn-admin btn-admin-primary" style="padding:3px 8px;font-size:0.7rem;" onclick="window.QSFVideoStudio.openSavedProject(${p.id}, ${tab === 'templates'})">Open</button>
                <button type="button" class="btn-admin btn-admin-secondary" style="padding:3px 8px;font-size:0.7rem;" onclick="window.QSFVideoStudio.duplicateSavedProject(${p.id})">Duplicate</button>
                <button type="button" class="btn-admin btn-admin-danger" style="padding:3px 8px;font-size:0.7rem;" onclick="window.QSFVideoStudio.deleteSavedProject(${p.id}, '${tab}')">Delete</button>
              </div>
            </div>
          </div>`).join('');
      } catch (_) { grid.innerHTML = '<div style="padding:20px;color:#B91C1C;">Failed to load projects.</div>'; }
    },

    async openSavedProject(id, asTemplateOnly = false) {
      try {
        this.pausePlayback();
        for (const cid of Array.from(this.runtimeMediaEls.keys())) this.disposeRuntimeMedia(cid);
        const res = await fetch(`/api/admin/video-studio/projects/${id}`);
        const data = await res.json();
        if (!data.success || !data.project) throw new Error('Not found');
        const st = migrateProjectState(data.project.project_state);
        st.projectId = asTemplateOnly ? null : data.project.id;
        this.state = st;
        if (st.bg.mode === 'image' && st.bg.imageUrl) this.bgImageEl = this.preloadImage(st.bg.imageUrl);
        st.clips.forEach(c => {
          if (c.kind === 'image' && c.imageUrl) this.preloadImage(c.imageUrl);
          if (c.kind === 'video_overlay' && c.freezeFrameDataUrl) this.preloadImage(c.freezeFrameDataUrl);
        });
        this.closeProjectsModal(); this.pushHistory(); this.renderTemplatesGrid(); this.syncAllUI(); this.resizeStage(); this.seekTo(0);
        window.showToast && window.showToast(`Loaded "${data.project.title}"`, 'success');
      } catch (_) { window.showToast && window.showToast('Failed to open saved project.', 'error'); }
    },

    async duplicateSavedProject(id) {
      try { const res = await fetch(`/api/admin/video-studio/projects/${id}/duplicate`, { method: 'POST' }); if ((await res.json()).success) { this.loadProjectsList('drafts'); this.refreshProjectsCount(); } } catch (_) {}
    },
    async deleteSavedProject(id, currentTab) {
      try { await fetch(`/api/admin/video-studio/projects/${id}`, { method: 'DELETE' }); this.loadProjectsList(currentTab); this.refreshProjectsCount(); } catch (_) {}
    },

    // ================== MULTI-TRACK STEREO AUDIO MIXER (RESPECTS SEQUENTIAL OVERLAY SEGMENTS!) & MP4 EXPORTER ==================
    openExportModal() {
      this.pausePlayback();
      document.getElementById('vsExportModal')?.classList.remove('hidden');
      document.getElementById('vsExportProgressArea')?.classList.add('hidden');
      document.getElementById('vsExportErrorBox')?.classList.add('hidden');
      document.getElementById('vsBtnStartExport').disabled = false;
    },
    closeExportModal() { if (!this.isExporting) document.getElementById('vsExportModal')?.classList.add('hidden'); },
    cancelOrCloseExport() { if (this.isExporting) this.exportAborted = true; else this.closeExportModal(); },

    ensureMp4MuxerLoaded() {
      if (window.Mp4Muxer) return Promise.resolve(window.Mp4Muxer);
      return new Promise((resolve, reject) => {
        const s = document.createElement('script'); s.src = '/js/mp4-muxer.min.js';
        s.onload = () => window.Mp4Muxer ? resolve(window.Mp4Muxer) : reject(new Error('Mp4Muxer failed'));
        s.onerror = () => reject(new Error('Could not load local mp4-muxer'));
        document.head.appendChild(s);
      });
    },

    async decodeAssetAudio(asset) {
      if (!asset) return null;
      if (this.decodedAudioCache.has(asset.id)) return this.decodedAudioCache.get(asset.id);
      let arrayBuf = null;
      const localFile = this.runtimeFiles.get(asset.id);
      if (localFile) arrayBuf = await localFile.arrayBuffer();
      else if (asset.localUrl || asset.url) {
        const resp = await fetch(asset.localUrl || asset.url);
        if (!resp.ok) return null;
        arrayBuf = await resp.arrayBuffer();
      }
      if (!arrayBuf || arrayBuf.byteLength === 0) return null;
      try {
        const actx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
        const decoded = await actx.decodeAudioData(arrayBuf.slice(0));
        await actx.close();
        this.decodedAudioCache.set(asset.id, decoded);
        return decoded;
      } catch (e) { console.warn(`[Audio Decode Skip] ${asset.name}:`, e.message || e); return null; }
    },

    createReversedAudioSlice(offlineCtx, buf, startSec, spanSec) {
      const sr = buf.sampleRate;
      const startSample = Math.max(0, Math.min(buf.length - 1, Math.floor(startSec * sr)));
      const lenSamples = Math.max(1, Math.min(buf.length - startSample, Math.floor(spanSec * sr)));
      const rev = offlineCtx.createBuffer(buf.numberOfChannels, lenSamples, sr);
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const src = buf.getChannelData(ch), dst = rev.getChannelData(ch);
        for (let i = 0; i < lenSamples; i++) dst[i] = src[startSample + lenSamples - 1 - i];
      }
      return rev;
    },

    async buildMixedStereoAudioBuffer(totalDurationSec, setProgress) {
      const sampleRate = 48000;
      const audioClips = this.state.clips.filter(c => {
        if (!['video', 'video_overlay', 'audio'].includes(c.kind)) return false;
        const tr = this.getTrackById(c.trackId);
        if (!tr || tr.muted || c.muted) return false;
        return ((c.volume != null ? c.volume : 1) * (tr.volume != null ? tr.volume : 1)) > 0.001 && c.duration > 0.05;
      });
      if (!audioClips.length) return null;

      const buffersByClip = [];
      for (let i = 0; i < audioClips.length; i++) {
        const c = audioClips[i], asset = this.getAssetById(c.assetId);
        if (!asset) continue;
        setProgress(6 + Math.round((i / audioClips.length) * 6), `Decoding audio (${asset.name})...`);
        const buf = await this.decodeAssetAudio(asset);
        if (buf && buf.length > 0) buffersByClip.push({ clip: c, buf });
      }
      if (!buffersByClip.length) return null;

      setProgress(12, `Mixing ${buffersByClip.length} synchronized stereo audio stream(s)...`);
      const totalSamples = Math.max(sampleRate, Math.ceil(totalDurationSec * sampleRate));
      const offline = new OfflineAudioContext(2, totalSamples, sampleRate);

      const scheduleSlice = (buf, tStart, dur, srcOffset, speed, gainVal, fIn, fOut, reversed, loop, pStart, pSpan) => {
        if (dur <= 0.02 || tStart >= totalDurationSec) return;
        const clampedDur = Math.min(dur, totalDurationSec - tStart);
        const gainNode = offline.createGain();
        const fi = Math.min(fIn || 0, clampedDur * 0.45), fo = Math.min(fOut || 0, clampedDur * 0.45);
        if (fi > 0.01) { gainNode.gain.setValueAtTime(0.0001, tStart); gainNode.gain.linearRampToValueAtTime(gainVal, tStart + fi); }
        else gainNode.gain.setValueAtTime(gainVal, tStart);
        if (fo > 0.01) { gainNode.gain.setValueAtTime(gainVal, Math.max(tStart + fi, tStart + clampedDur - fo)); gainNode.gain.linearRampToValueAtTime(0.0001, tStart + clampedDur); }
        gainNode.connect(offline.destination);

        const avail = Math.max(0.05, buf.duration - srcOffset);
        if (reversed) {
          const revBuf = this.createReversedAudioSlice(offline, buf, srcOffset, Math.min(avail, clampedDur * speed));
          const sn = offline.createBufferSource(); sn.buffer = revBuf; sn.playbackRate.value = speed; sn.connect(gainNode);
          sn.start(tStart, 0, Math.min(clampedDur, revBuf.duration / speed));
        } else if (loop && clampedDur * speed > avail) {
          let cursor = 0, curOff = srcOffset;
          while (cursor < clampedDur - 0.02) {
            const availNow = Math.max(0.05, (pStart + pSpan) - curOff);
            const segTimeline = Math.min(availNow / speed, clampedDur - cursor);
            const sn = offline.createBufferSource(); sn.buffer = buf; sn.playbackRate.value = speed; sn.connect(gainNode);
            sn.start(tStart + cursor, Math.max(0, Math.min(buf.duration - 0.04, curOff)), Math.min(buf.duration - curOff, segTimeline * speed));
            cursor += segTimeline;
            curOff = pStart;
          }
        } else {
          const sn = offline.createBufferSource(); sn.buffer = buf; sn.playbackRate.value = speed; sn.connect(gainNode);
          sn.start(tStart, Math.max(0, Math.min(buf.duration - 0.04, srcOffset)), Math.min(clampedDur * speed, avail));
        }
      };

      for (const { clip, buf } of buffersByClip) {
        const tr = this.getTrackById(clip.trackId);
        const gainVal = Math.max(0, Math.min(2, (clip.volume != null ? clip.volume : 1) * ((tr && tr.volume != null) ? tr.volume : 1)));
        const speed = Math.max(0.25, Math.min(4, Number(clip.speed) || 1));

        // CRITICAL: For sequential video_overlay clips, schedule ONLY active playSegments with exact accumulated resume offset!
        if (clip.kind === 'video_overlay' && (clip.useSequentialControl || (clip.playSegments && clip.playSegments.length > 0))) {
          const pStart = Math.max(0, Math.min(buf.duration - 0.1, Number(clip.playStartPos) || 0));
          const pEnd = Math.max(pStart + 0.1, Math.min(buf.duration, Number(clip.playEndPos) || buf.duration));
          const pSpan = Math.max(0.1, pEnd - pStart);
          const sortedSegs = [...(clip.playSegments || [])].sort((a, b) => a.start - b.start);
          let accSrc = 0;
          for (const seg of sortedSegs) {
            const segStart = Math.max(0, Number(seg.start) || 0);
            const segDur = Math.max(0, (Number(seg.end) || 0) - segStart);
            if (segDur <= 0.02) continue;
            const srcStart = clip.loopPlayback ? (pStart + (accSrc % pSpan)) : Math.min(pEnd - 0.05, pStart + accSrc);
            if (clip.loopPlayback || srcStart < pEnd - 0.05) {
              const maxSegDur = clip.loopPlayback ? segDur : Math.min(segDur, (pEnd - srcStart) / speed);
              scheduleSlice(buf, segStart, maxSegDur, srcStart, speed, gainVal, 0.03, 0.03, clip.reversed, clip.loopPlayback, pStart, pSpan);
            }
            accSrc += segDur * speed;
          }
          continue;
        }

        const tStart = Math.max(0, Number(clip.startTime) || 0);
        const dur = Math.min(totalDurationSec - tStart, Number(clip.duration) || 0);
        const trimIn = Math.max(0, Math.min(buf.duration - 0.05, Number(clip.trimStart) || 0));
        scheduleSlice(buf, tStart, dur, trimIn, speed, gainVal, clip.fadeIn, clip.fadeOut, clip.reversed, clip.kind === 'audio' && clip.loop, trimIn, Math.max(0.1, buf.duration - trimIn));
      }

      const mixed = await offline.startRendering();
      for (let ch = 0; ch < mixed.numberOfChannels; ch++) {
        const d = mixed.getChannelData(ch);
        for (let i = 0; i < d.length; i++) { if (d[i] > 0.98) d[i] = 0.98; else if (d[i] < -0.98) d[i] = -0.98; }
      }
      return mixed;
    },

    async startExport() {
      if (this.isExporting) return;
      this.isExporting = true; this.exportAborted = false;
      const progArea = document.getElementById('vsExportProgressArea');
      const progFill = document.getElementById('vsExportProgressFill');
      const progPct = document.getElementById('vsExportPctText');
      const progStage = document.getElementById('vsExportStageText');
      const errBox = document.getElementById('vsExportErrorBox');
      const startBtn = document.getElementById('vsBtnStartExport');
      const cancelBtn = document.getElementById('vsBtnCancelExport');

      progArea?.classList.remove('hidden'); errBox?.classList.add('hidden');
      startBtn.disabled = true; cancelBtn.textContent = 'Cancel Export';

      const setProgress = (pct, label) => {
        const p = Math.max(0, Math.min(100, Math.round(pct)));
        if (progFill) progFill.style.width = p + '%';
        if (progPct) progPct.textContent = p + '%';
        if (progStage && label) progStage.textContent = label;
      };

      try {
        await (document.fonts && document.fonts.ready);
        const allText = this.state.clips.filter(c => c.kind === 'text' || c.kind === 'subtitle').map(c => c.text).join(' ');
        await this.preloadStudioFonts(allText);

        const quality = document.getElementById('vsExportQuality')?.value || 'medium';
        const audioOpt = document.getElementById('vsExportIncludeAudio')?.value || 'auto';
        const fmt = FORMATS[this.state.outputFormat] || FORMATS.portrait_9_16;
        const maxLong = quality === 'high' ? 1920 : (quality === 'medium' ? 1280 : 960);
        const fps = quality === 'fast' ? 24 : 30;
        const scale = Math.min(1, maxLong / Math.max(fmt.w, fmt.h));
        const outW = Math.max(2, Math.round((fmt.w * scale) / 2) * 2);
        const outH = Math.max(2, Math.round((fmt.h * scale) / 2) * 2);
        const bitrate = quality === 'high' ? 6000000 : (quality === 'medium' ? 3200000 : 1800000);
        const totalDurationSec = Math.max(0.5, this.getTotalDuration());

        setProgress(4, 'Checking H.264 + AAC MP4 encoders...');
        let chosenCodec = null;
        if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
          for (const candidate of ['avc1.640028', 'avc1.4d002a', 'avc1.42001f']) {
            try {
              const sup = await VideoEncoder.isConfigSupported({ codec: candidate, width: outW, height: outH, bitrate, framerate: fps });
              if (sup && sup.supported) { chosenCodec = candidate; break; }
            } catch (_) {}
          }
        }

        const mixedAudio = (audioOpt !== 'mute') ? await this.buildMixedStereoAudioBuffer(totalDurationSec, setProgress) : null;

        if (chosenCodec) await this.runWebCodecsMultiTrackExport({ outW, outH, fps, bitrate, codec: chosenCodec, totalDurationSec, mixedAudio, setProgress });
        else await this.runMediaRecorderFallbackExport({ outW, outH, fps, bitrate, totalDurationSec, mixedAudio, setProgress });

        if (!this.exportAborted) {
          setProgress(100, 'Export complete! MP4 downloaded with overlays, freeze-frames, subtitles & audio.');
          window.showToast && window.showToast('Final MP4 rendered with all tracks, sequential overlays, subtitles & audio!', 'success');
          setTimeout(() => { this.isExporting = false; this.closeExportModal(); }, 900);
        }
      } catch (err) {
        console.error('[Multi-Track Export Error]', err);
        if (errBox) { errBox.textContent = err.message || 'Video export failed.'; errBox.classList.remove('hidden'); }
        setProgress(0, 'Export failed');
      } finally {
        this.isExporting = false; startBtn.disabled = false; cancelBtn.textContent = 'Close';
      }
    },

    async runWebCodecsMultiTrackExport({ outW, outH, fps, bitrate, codec, totalDurationSec, mixedAudio, setProgress }) {
      const Mp4MuxerLib = await this.ensureMp4MuxerLoaded();
      const totalFrames = Math.max(1, Math.round(totalDurationSec * fps));
      const frameDurUs = Math.round(1000000 / fps);

      let useAudio = false;
      if (mixedAudio && typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined') {
        try {
          const sup = await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: mixedAudio.sampleRate, numberOfChannels: 2, bitrate: 192000 });
          useAudio = Boolean(sup && sup.supported);
        } catch (_) { useAudio = false; }
      }

      const muxerOpts = { target: new Mp4MuxerLib.ArrayBufferTarget(), video: { codec: 'avc', width: outW, height: outH }, firstTimestampBehavior: 'offset', fastStart: 'in-memory' };
      if (useAudio) muxerOpts.audio = { codec: 'aac', sampleRate: mixedAudio.sampleRate, numberOfChannels: 2 };
      const muxer = new Mp4MuxerLib.Muxer(muxerOpts);

      const videoEncoder = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { throw e; } });
      videoEncoder.configure({ codec, width: outW, height: outH, bitrate, framerate: fps });

      let audioEncoder = null;
      if (useAudio) {
        audioEncoder = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { throw e; } });
        audioEncoder.configure({ codec: 'mp4a.40.2', sampleRate: mixedAudio.sampleRate, numberOfChannels: 2, bitrate: 192000 });
      }

      const exportVideos = new Map();
      const videoClips = this.state.clips.filter(c => c.kind === 'video' || c.kind === 'video_overlay');
      for (const clip of videoClips) {
        const asset = this.getAssetById(clip.assetId);
        if (!asset) continue;
        const src = asset.localUrl || asset.url;
        if (!src) continue;
        const v = document.createElement('video');
        v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous'; v.src = src;
        await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error(`Failed to decode "${asset.name}"`)); v.load(); });
        exportVideos.set(clip.id, v);
      }

      const seekVideoExact = (vid, targetTime) => new Promise(resolve => {
        if (!vid) return resolve();
        const clamped = Math.max(0, Math.min(Math.max(0, (vid.duration || targetTime) - 0.02), targetTime));
        // Skip redundant seeks when frozen on exact same timestamp!
        if (Math.abs(vid.currentTime - clamped) < 0.008 && vid.readyState >= 2) return resolve();
        let done = false;
        const onSeek = () => { if (done) return; done = true; vid.removeEventListener('seeked', onSeek); resolve(); };
        vid.addEventListener('seeked', onSeek);
        vid.currentTime = clamped;
        setTimeout(onSeek, 350);
      });

      const offCanvas = document.createElement('canvas'); offCanvas.width = outW; offCanvas.height = outH;
      const offCtx = offCanvas.getContext('2d', { alpha: false });

      setProgress(15, `Rendering ${totalFrames} video frames (${outW}×${outH} @ ${fps}fps)...`);
      try {
        for (let i = 0; i < totalFrames; i++) {
          if (this.exportAborted) throw new Error('Export cancelled by user.');
          const t = i / fps;

          for (const tr of this.state.tracks) {
            if (!tr.visible) continue;
            if (tr.type === 'video') {
              const sorted = this.state.clips.filter(c => c.trackId === tr.id && c.visible !== false).sort((a, b) => a.startTime - b.startTime);
              const idx = sorted.findIndex(c => t >= c.startTime - 0.005 && t < c.startTime + c.duration + 0.005);
              if (idx >= 0) {
                const curr = sorted[idx];
                await seekVideoExact(exportVideos.get(curr.id), computeSourceTimeForClip(curr, t));
                const prev = idx > 0 ? sorted[idx - 1] : null;
                const tin = curr.transitionIn || { type: 'none', duration: 1 };
                if (prev && tin.type !== 'none' && (t - curr.startTime) < (tin.duration || 1)) {
                  await seekVideoExact(exportVideos.get(prev.id), computeSourceTimeForClip(prev, prev.startTime + prev.duration - 0.04));
                }
              }
            } else if (tr.type === 'video_overlay') {
              for (const ov of this.state.clips) {
                if (ov.trackId === tr.id && ov.visible !== false && t >= ov.startTime - 0.005 && t <= ov.startTime + ov.duration + 0.005) {
                  // Deterministic exact source time: selected freezeFrameTime when initially frozen, advancing when active, exact paused frame when frozen after playing, exact resume timestamp on next turn!
                  const ovSt = evaluateOverlayPlaybackAt(ov, t);
                  await seekVideoExact(exportVideos.get(ov.id), ovSt.srcTime);
                }
              }
            }
          }

          this.drawCompositeFrame(offCtx, outW, outH, t, clip => exportVideos.get(clip.id) || null, true);
          const frame = new VideoFrame(offCanvas, { timestamp: i * frameDurUs, duration: frameDurUs });
          videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
          frame.close();

          while (videoEncoder.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 10));
          if (i % 6 === 0 || i === totalFrames - 1) {
            setProgress(15 + ((i + 1) / totalFrames) * 72, `Encoding frame ${i + 1} / ${totalFrames}...`);
            await new Promise(r => setTimeout(r, 0));
          }
        }

        if (audioEncoder && mixedAudio) {
          setProgress(89, 'Encoding synchronized 48kHz Stereo AAC audio...');
          const sr = mixedAudio.sampleRate, totalSamples = mixedAudio.length;
          const ch0 = mixedAudio.getChannelData(0), ch1 = mixedAudio.numberOfChannels > 1 ? mixedAudio.getChannelData(1) : ch0;
          const chunkSize = 1024;
          for (let offset = 0; offset < totalSamples; offset += chunkSize) {
            if (this.exportAborted) throw new Error('Export cancelled.');
            const len = Math.min(chunkSize, totalSamples - offset);
            const planar = new Float32Array(len * 2);
            planar.set(ch0.subarray(offset, offset + len), 0); planar.set(ch1.subarray(offset, offset + len), len);
            const audioData = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round((offset / sr) * 1e6), data: planar });
            audioEncoder.encode(audioData); audioData.close();
            while (audioEncoder.encodeQueueSize > 16) await new Promise(r => setTimeout(r, 8));
          }
          await audioEncoder.flush(); audioEncoder.close();
        }

        setProgress(96, 'Finalizing MP4 streams (H.264 + AAC)...');
        await videoEncoder.flush(); videoEncoder.close(); muxer.finalize();
        const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
        const safeName = (this.state.title || 'QSF_News_Video').replace(/[^a-zA-Z0-9_-]+/g, '_');
        this.triggerBlobDownload(blob, `${safeName}_${outW}x${outH}.mp4`);
      } finally {
        for (const v of exportVideos.values()) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {} }
      }
    },

    async runMediaRecorderFallbackExport({ outW, outH, fps, bitrate, totalDurationSec, mixedAudio, setProgress }) {
      const offCanvas = document.createElement('canvas'); offCanvas.width = outW; offCanvas.height = outH;
      const offCtx = offCanvas.getContext('2d');
      const tracks = [...offCanvas.captureStream(fps).getVideoTracks()];
      let liveAudioCtx = null;
      if (mixedAudio) {
        liveAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = liveAudioCtx.createMediaStreamDestination(), src = liveAudioCtx.createBufferSource();
        src.buffer = mixedAudio; src.connect(dest); src.start(0);
        tracks.push(...dest.stream.getAudioTracks());
      }
      const stream = new MediaStream(tracks);
      const chosenMime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: chosenMime, videoBitsPerSecond: bitrate, audioBitsPerSecond: 192000 });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      const donePromise = new Promise(resolve => {
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: chosenMime });
          const safeName = (this.state.title || 'QSF_News_Video').replace(/[^a-zA-Z0-9_-]+/g, '_');
          this.triggerBlobDownload(blob, `${safeName}_${outW}x${outH}.${chosenMime.includes('mp4') ? 'mp4' : 'webm'}`);
          resolve();
        };
      });
      rec.start(250);
      const durationMs = totalDurationSec * 1000, startPerf = performance.now();
      while (true) {
        if (this.exportAborted) { rec.stop(); throw new Error('Export cancelled.'); }
        const elapsed = performance.now() - startPerf;
        if (elapsed >= durationMs) break;
        const t = elapsed / 1000;
        this.syncLiveMediaElements(t, true);
        this.drawCompositeFrame(offCtx, outW, outH, t, clip => this.getOrCreateRuntimeMedia(clip), true);
        setProgress(15 + (elapsed / durationMs) * 80, `Recording stream (${formatSec(t)})...`);
        await new Promise(r => setTimeout(r, Math.round(1000 / fps)));
      }
      rec.stop(); await donePromise;
      if (liveAudioCtx) await liveAudioCtx.close().catch(() => {});
    },

    triggerBlobDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2500);
    },

    toggleSafeZone() {
      this.safeZoneVisible = !this.safeZoneVisible;
      document.getElementById('vsSafeZoneGuides')?.classList.toggle('hidden', !this.safeZoneVisible);
      document.getElementById('vsBtnSafeZone')?.classList.toggle('active', this.safeZoneVisible);
    },
    setProjectTitle(title) { this.state.title = title; },
    setLoop(loop) { this.state.playback.loop = Boolean(loop); },

    resetStudio() {
      this.pausePlayback();
      for (const cid of Array.from(this.runtimeMediaEls.keys())) this.disposeRuntimeMedia(cid);
      this.state = createDefaultState();
      this.applyTemplate('breaking_news', false);
      this.pushHistory(); this.syncAllUI(); this.resizeStage(); this.renderFrame();
      window.showToast && window.showToast('Video Studio reset cleanly.', 'info');
    }
  };

  window.QSFVideoStudio = QSFVideoStudio;
})(window, document);
