const DEAL_SCOUT_STORAGE_KEY = 'dealScoutAnalyses';

function fmtMoney(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function fmtPct(n) {
  return n.toFixed(2) + '%';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function loadSavedDeals() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEAL_SCOUT_STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function persistSavedDeals(deals) {
  try {
    localStorage.setItem(DEAL_SCOUT_STORAGE_KEY, JSON.stringify(deals));
  } catch (err) {
    // storage unavailable (e.g. private browsing) — file export still works
  }
}

let dealScoutFileHandle = null;

async function saveDealsToFile(deals) {
  const content = JSON.stringify(deals, null, 2);

  if ('showSaveFilePicker' in window) {
    try {
      if (!dealScoutFileHandle) {
        dealScoutFileHandle = await window.showSaveFilePicker({
          suggestedName: 'deal-scout-analyses.json',
          types: [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }]
        });
      }
      const writable = await dealScoutFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
      dealScoutFileHandle = null;
      // fall through to plain download below
    }
  }

  try {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deal-scout-analyses.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    return false;
  }
}
