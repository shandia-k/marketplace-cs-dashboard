/**
 * src/main/services/search.service.js
 * Multi-source parallel search & URL suggestion service for custom stores
 */

const dnsPromises = require('dns').promises;
const { POPULAR_MARKETPLACE_PRESETS } = require('../config/constants');

async function searchWebUrls(query) {
  const q = (query || '').trim();
  if (!q) return [];

  const results = [];
  const addedUrls = new Set();

  function addResult(item) {
    if (!item || !item.url) return;
    const cleanUrl = item.url.toLowerCase().replace(/\/+$/, '');
    if (!addedUrls.has(cleanUrl)) {
      addedUrls.add(cleanUrl);
      results.push(item);
    }
  }

  // 1. Direct domain detection
  const isDirectDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(q) && !q.includes(' ');
  const isHttpUrl = /^https?:\/\//i.test(q);

  if (isDirectDomain || isHttpUrl) {
    const directUrl = isHttpUrl ? q : `https://${q}`;
    let hostname = '';
    try {
      hostname = new URL(directUrl).hostname.replace(/^www\./, '');
    } catch (e) {
      hostname = q;
    }
    addResult({
      title: `Buka Alamat Langsung: ${hostname}`,
      url: directUrl,
      domain: hostname,
      snippet: `Alamat web langsung: ${directUrl}`,
      isDirect: true
    });
  }

  // 2. Preset match
  const lowerQ = q.toLowerCase();
  for (const preset of POPULAR_MARKETPLACE_PRESETS) {
    if (preset.keywords.some(k => lowerQ.includes(k) || k.includes(lowerQ))) {
      addResult({ ...preset, isPreset: true });
    }
  }

  // 3. Multi-Source Parallel Search
  const searchTasks = [];

  // (a) Google Suggestion API
  searchTasks.push((async () => {
    try {
      const res = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&hl=id&q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (res.ok) {
        const data = await res.json();
        const suggestions = data[1] || [];
        for (const s of suggestions) {
          if (typeof s === 'string' && /^https?:\/\//i.test(s)) {
            let hostname = '';
            try { hostname = new URL(s).hostname.replace(/^www\./, ''); } catch (e) { hostname = s; }
            addResult({
              title: `${hostname} (Website Resmi)`,
              url: s,
              domain: hostname,
              snippet: `Tautan navigasi resmi untuk "${q}"`,
              isPreset: false
            });
          }
        }
      }
    } catch (e) {}
  })());

  // (b) Wikipedia Opensearch API
  searchTasks.push((async () => {
    try {
      const res = await fetch(`https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&format=json`);
      if (res.ok) {
        const data = await res.json();
        const titles = data[1] || [];
        const descriptions = data[2] || [];
        const urls = data[3] || [];
        for (let i = 0; i < titles.length; i++) {
          if (urls[i]) {
            addResult({
              title: titles[i],
              url: urls[i],
              domain: 'id.wikipedia.org',
              snippet: descriptions[i] || `Informasi resmi ${titles[i]} di Wikipedia`,
              isPreset: false
            });
          }
        }
      }
    } catch (e) {}
  })());

  // (c) Fast DNS TLD Probing
  const cleanQ = q.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanQ.length >= 3 && cleanQ.length <= 30 && !q.includes('.')) {
    const tldsToProbe = ['.id', '.co.id', '.com', '.app', '.net'];
    for (const tld of tldsToProbe) {
      searchTasks.push((async () => {
        const domain = `${cleanQ}${tld}`;
        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
          await Promise.race([dnsPromises.lookup(domain), timeoutPromise]);
          const probedUrl = `https://${domain}/`;
          addResult({
            title: `${q.charAt(0).toUpperCase() + q.slice(1)} (${domain})`,
            url: probedUrl,
            domain: domain,
            snippet: `Domain resmi terverifikasi: ${domain}`,
            isDirect: true
          });
        } catch (e) {}
      })());
    }
  }

  // (d) DuckDuckGo Lite search
  searchTasks.push((async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        body: `q=${encodeURIComponent(q)}`,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=['"]([^'"]+)['"][^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>|<a\s+(?:[^>]*?\s+)?class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<td\s+class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

        const snippets = [];
        let sm;
        while ((sm = snippetRegex.exec(html)) !== null) {
          snippets.push(sm[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
        }

        let lm;
        let index = 0;
        while ((lm = linkRegex.exec(html)) !== null && results.length < 10) {
          let rawHref = lm[1] || lm[3];
          let rawTitle = lm[2] || lm[4];

          if (rawHref) {
            let finalUrl = rawHref;
            if (finalUrl.includes('uddg=')) {
              const urlParams = new URLSearchParams(finalUrl.substring(finalUrl.indexOf('?')));
              finalUrl = decodeURIComponent(urlParams.get('uddg') || finalUrl);
            }

            if (
              (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) &&
              !finalUrl.includes('duckduckgo.com/') &&
              !finalUrl.includes('bing.com/aclick') &&
              !finalUrl.includes('google.com/aclk')
            ) {
              const title = (rawTitle || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
              const snippet = snippets[index] || '';

              let hostname = '';
              try {
                hostname = new URL(finalUrl).hostname.replace(/^www\./, '');
              } catch (e) {
                hostname = finalUrl;
              }

              addResult({
                title: title || hostname,
                url: finalUrl,
                domain: hostname,
                snippet
              });
            }
          }
          index++;
        }
      }
    } catch (err) {}
  })());

  await Promise.allSettled(searchTasks);

  // Fallback domain synthesizer
  if (results.length === 0 && cleanQ.length >= 2) {
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Indonesia (.id)`,
      url: `https://${cleanQ}.id/`,
      domain: `${cleanQ}.id`,
      snippet: `Rekomendasi URL Indonesia untuk ${q}`,
      isDirect: true
    });
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Global (.com)`,
      url: `https://${cleanQ}.com/`,
      domain: `${cleanQ}.com`,
      snippet: `Rekomendasi URL Global untuk ${q}`,
      isDirect: true
    });
    addResult({
      title: `${q.charAt(0).toUpperCase() + q.slice(1)} Co.id (.co.id)`,
      url: `https://${cleanQ}.co.id/`,
      domain: `${cleanQ}.co.id`,
      snippet: `Rekomendasi URL Perusahaan untuk ${q}`,
      isDirect: true
    });
  }

  return results.slice(0, 6);
}

module.exports = {
  searchWebUrls
};
