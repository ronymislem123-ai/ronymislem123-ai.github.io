/* Agentur-Zentrale – Formatierung & kleine Helfer */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  const nf0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const nfN = new Intl.NumberFormat('de-DE');
  const F = {
    esc,
    money: (n, dec) => (n == null || isNaN(n) ? '–' : (dec === 0 ? nf0 : nf2).format(Number(n))),
    moneyShort: n => {
      if (n == null || isNaN(n)) return '–'; const a = Math.abs(n);
      if (a >= 1e6) return (n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mio. €';
      if (a >= 10000) return (n / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Tsd. €';
      return nf0.format(n);
    },
    num: n => nfN.format(Number(n) || 0),
    pct: (x, d = 0) => (x == null || isNaN(x) ? '–' : (x * 100).toLocaleString('de-DE', { maximumFractionDigits: d }) + ' %'),
    date: s => { if (!s) return '–'; const d = String(s).slice(0, 10).split('-'); return d.length === 3 ? d[2] + '.' + d[1] + '.' + d[0] : String(s); },
    dateShort: s => { if (!s) return '–'; const d = String(s).slice(0, 10).split('-'); return d[2] + '.' + d[1] + '.'; },
    time: iso => { if (!iso) return ''; try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }); } catch (e) { return ''; } },
    dateTime: iso => { if (!iso) return '–'; try { return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }); } catch (e) { return iso; } },
    weekdayName: s => ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][L.weekday(s)],
    rel: s => {
      if (!s) return ''; const t = L.todayBerlin(); const d = L.diffDays(t, String(s).slice(0, 10));
      if (d === 0) return 'heute'; if (d === 1) return 'morgen'; if (d === -1) return 'gestern';
      if (d > 1 && d < 7) return 'in ' + d + ' Tagen'; if (d < -1 && d > -14) return 'vor ' + (-d) + ' Tagen';
      return F.date(s);
    },
    ago: iso => {
      if (!iso) return ''; const s = (Date.now() - new Date(iso).getTime()) / 1000;
      if (s < 60) return 'gerade eben'; if (s < 3600) return 'vor ' + Math.floor(s / 60) + ' Min.'; if (s < 86400) return 'vor ' + Math.floor(s / 3600) + ' Std.';
      if (s < 86400 * 7) return 'vor ' + Math.floor(s / 86400) + ' Tagen'; return F.date(iso);
    },
    size: b => b == null ? '' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB',
    initials: s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?',
    personName: c => c ? ([c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unbenannt') : '',
    plural: (n, one, many) => n + ' ' + (n === 1 ? one : many)
  };
  F.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  F.hashColor = s => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ['#2a78d6', '#eb6834', '#1baf7a', '#c98500', '#d55181', '#008300', '#6250d6', '#e34948'][h % 8]; };
  F.download = async (filename, data) => {
    const dl = window.Runtime && await Runtime.use('downloads').catch(() => null);
    if (!dl) throw { code: 'unavailable', message: 'Downloads sind in dieser Ansicht nicht verfügbar.' };
    return dl.save({ filename, data });
  };
  F.copy = async text => { try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; } };
  window.F = F;
})();
