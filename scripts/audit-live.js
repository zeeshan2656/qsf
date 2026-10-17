const fs = require('fs');

async function auditLive() {
  console.log('Auditing https://freehub.live/ ...');
  const res = await fetch('https://freehub.live/');
  const html = await res.text();
  console.log('HTML size:', (html.length / 1024).toFixed(1), 'KB');

  // Find all scripts, links, images
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  const links = [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);

  console.log('\n--- Scripts ---');
  for (let s of scripts) {
    if (s.startsWith('/')) s = 'https://freehub.live' + s;
    try {
      const r = await fetch(s);
      const buf = await r.arrayBuffer();
      console.log(s, (buf.byteLength / 1024).toFixed(1), 'KB', 'cache:', r.headers.get('cache-control'));
    } catch (e) {
      console.log(s, e.message);
    }
  }

  console.log('\n--- Stylesheets / Links ---');
  for (let l of links) {
    if (l.startsWith('/')) l = 'https://freehub.live' + l;
    try {
      const r = await fetch(l);
      const buf = await r.arrayBuffer();
      console.log(l, (buf.byteLength / 1024).toFixed(1), 'KB', 'type:', r.headers.get('content-type'), 'cache:', r.headers.get('cache-control'));
    } catch (e) {
      console.log(l, e.message);
    }
  }

  console.log('\n--- Initial HTML Images ---');
  let totalImgBytes = 0;
  for (let img of imgs) {
    if (img.startsWith('/')) img = 'https://freehub.live' + img;
    try {
      const r = await fetch(img);
      const buf = await r.arrayBuffer();
      totalImgBytes += buf.byteLength;
      console.log(img, (buf.byteLength / 1024).toFixed(1), 'KB', 'type:', r.headers.get('content-type'), 'cache:', r.headers.get('cache-control'));
    } catch (e) {
      console.log(img, e.message);
    }
  }

  console.log('\n--- Dynamic Content (API: /api/public/home) ---');
  try {
    const apiRes = await fetch('https://freehub.live/api/public/home');
    const data = await apiRes.json();
    const str = JSON.stringify(data);
    console.log('API /api/public/home size:', (str.length / 1024).toFixed(1), 'KB');

    // Extract all image URLs from API response
    const dynamicImgs = new Set();
    function extractUrls(obj) {
      if (!obj) return;
      if (typeof obj === 'string') {
        if (obj.match(/\.(webp|jpg|jpeg|png|svg|gif)($|\?)/i)) {
          dynamicImgs.add(obj);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(extractUrls);
      } else if (typeof obj === 'object') {
        Object.values(obj).forEach(extractUrls);
      }
    }
    extractUrls(data);

    console.log(`Found ${dynamicImgs.size} dynamic images referenced in API:`);
    for (let u of dynamicImgs) {
      let fullUrl = u;
      if (fullUrl.startsWith('/')) fullUrl = 'https://freehub.live' + fullUrl;
      try {
        const r = await fetch(fullUrl);
        const buf = await r.arrayBuffer();
        totalImgBytes += buf.byteLength;
        console.log('  Dynamic Img:', fullUrl, (buf.byteLength / 1024).toFixed(1), 'KB', 'type:', r.headers.get('content-type'), 'cache:', r.headers.get('cache-control'));
      } catch (e) {
        console.log('  Dynamic Img Error:', fullUrl, e.message);
      }
    }
  } catch (e) {
    console.log('API Error:', e.message);
  }

  console.log('\nTotal Image Payload Tested:', (totalImgBytes / 1024).toFixed(1), 'KB');
}

auditLive();
