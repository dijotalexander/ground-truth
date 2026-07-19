/* ============================================================
   Ground Truth — rendering engine
   This file reads structured content and builds the page.
   Editing copy, chapters, or map nodes should NEVER require
   touching this file — only content.json.
   ============================================================ */

async function loadContent(){
  // Prefer inline data (used by the standalone preview build,
  // which works even when opened directly as a file://).
  const inline = document.getElementById('content-data');
  if (inline){
    return JSON.parse(inline.textContent);
  }
  // Otherwise fetch the external file (used for real deployment,
  // where the page is served over http/https and fetch works normally).
  const res = await fetch('content.json');
  if (!res.ok) throw new Error('Could not load content.json');
  return res.json();
}

function el(tag, opts = {}, children = []){
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.id) node.id = opts.id;
  if (opts.html !== undefined) node.innerHTML = opts.html;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.attrs) Object.entries(opts.attrs).forEach(([k,v]) => node.setAttribute(k, v));
  if (opts.onclick) node.onclick = opts.onclick;
  children.forEach(c => c && node.appendChild(c));
  return node;
}

/* ---------------- Dispatch rendering ---------------- */

let CONTENT = null;         // the full loaded content.json
let CURRENT_DISPATCH = null; // id of the dispatch currently shown

function renderPicker(){
  const picker = document.getElementById('week-picker');
  picker.innerHTML = '';
  const sorted = [...CONTENT.dispatches].sort((a, b) => a.weekNumber - b.weekNumber);
  sorted.forEach(d => {
    const isDraft = d.status === 'draft';
    const pill = el('div', {
      class: 'week-pill' + (d.id === CURRENT_DISPATCH ? ' active' : '') + (isDraft ? ' draft' : ''),
      onclick: () => selectDispatch(d.id)
    }, [
      el('span', { class: 'num', text: String(d.weekNumber).padStart(2, '0') }),
      el('span', { text: d.weekLabel || 'Untitled' })
    ]);
    picker.appendChild(pill);
  });
}

function selectDispatch(id){
  CURRENT_DISPATCH = id;
  const dispatch = CONTENT.dispatches.find(d => d.id === id);
  renderPicker();
  if (dispatch.status === 'draft' || !dispatch.chapters || dispatch.chapters.length === 0){
    renderComingSoon(dispatch);
  } else {
    renderDispatch(dispatch);
  }
}

function renderComingSoon(dispatch){
  const root = document.getElementById('view-dispatch');
  root.innerHTML = '';
  root.appendChild(el('div', { class: 'coming-soon' }, [
    el('div', { class: 'eyebrow', text: `Week ${dispatch.weekNumber} · Not yet published` }),
    el('h2', { text: dispatch.weekLabel || 'This one is still being written.' }),
    el('p', { text: 'This week is on the roadmap but the chapter content isn\'t written yet. Check back after the next lecture, or pick a different week above.' })
  ]));
}

function renderDispatch(dispatch){
  const root = document.getElementById('view-dispatch');
  root.innerHTML = '';

  const wrap = el('div', { class: 'dispatch' });

  const hero = el('div', { class: 'hero' }, [
    el('div', { class: 'eyebrow', text: dispatch.eyebrowTop }),
    el('h1', { text: dispatch.heroTitle }),
    el('p', { class: 'lede', text: dispatch.heroLede }),
    el('p', { class: 'meta', text: dispatch.heroMeta })
  ]);
  wrap.appendChild(hero);

  dispatch.chapters.forEach(ch => {
    const chapterEl = el('div', { class: 'chapter', id: ch.id }, [
      el('div', { class: 'eyebrow', text: ch.eyebrow }),
      el('h2', { text: ch.title })
    ]);
    ch.paragraphs.forEach((p, i) => {
      chapterEl.appendChild(el('p', { class: i === 0 ? '' : 'sub', text: p }));
    });
    if (ch.assignment){
      chapterEl.appendChild(el('div', { class: 'assignment' }, [
        el('span', { class: 'label', text: 'The Assignment' }),
        el('p', { text: ch.assignment })
      ]));
    }
    wrap.appendChild(chapterEl);
  });

  if (dispatch.capstone){
    wrap.appendChild(el('div', { class: 'capstone' }, [
      el('p', { text: dispatch.capstone }),
      el('button', { class: 'cta', text: 'Explore the full map →', onclick: () => setView('map') })
    ]));
  }

  root.appendChild(wrap);
}

/* ---------------- Map rendering ---------------- */

function renderMap(map){
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('graph');
  svg.innerHTML = '';

  // Cluster labels
  map.clusters.forEach(c => {
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', c.labelX);
    t.setAttribute('y', c.labelY);
    t.setAttribute('class', 'cluster-label');
    t.textContent = c.name;
    svg.appendChild(t);
  });

  // Edges (drawn as gentle curves between node centers)
  const edgesGroup = document.createElementNS(svgNS, 'g');
  const nodeById = Object.fromEntries(map.nodes.map(n => [n.id, n]));
  map.edges.forEach(e => {
    const a = nodeById[e.from], b = nodeById[e.to];
    const midX = (a.x + b.x) / 2;
    const path = document.createElementNS(svgNS, 'path');
    const d = `M${a.x},${a.y} C${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}`;
    path.setAttribute('d', d);
    path.setAttribute('class', 'edge' + (e.cross ? ' cross' : ''));
    edgesGroup.appendChild(path);
  });
  svg.appendChild(edgesGroup);

  // Nodes
  const nodesGroup = document.createElementNS(svgNS, 'g');
  map.nodes.forEach(n => {
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('data-id', n.id);
    g.style.cursor = 'pointer';
    g.onclick = () => selectNode(n, map);

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', n.x);
    circle.setAttribute('cy', n.y);
    circle.setAttribute('r', n.r);
    circle.setAttribute('class', 'node-circle');
    g.appendChild(circle);

    const words = n.title.split(' ');
    let lines = [n.title];
    if (n.title.length > 14){
      const mid = Math.ceil(words.length / 2);
      lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    const lineHeight = 14;
    lines.forEach((line, i) => {
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', n.x);
      t.setAttribute('y', n.y + (i - (lines.length - 1) / 2) * lineHeight + 4);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'node-label');
      t.textContent = line;
      g.appendChild(t);
    });

    nodesGroup.appendChild(g);
  });
  svg.appendChild(nodesGroup);

  const cluster = Object.fromEntries(map.clusters.map(c => [c.id, c.name]));

  function selectNode(node, map){
    document.querySelectorAll('.node-circle').forEach(c => c.classList.remove('selected'));
    document.querySelector(`g[data-id="${node.id}"] circle`).classList.add('selected');

    const panel = document.getElementById('detail-panel');
    panel.innerHTML = '';
    panel.appendChild(el('span', { class: 'cluster-tag', text: cluster[node.cluster] || '' }));
    panel.appendChild(el('h3', { text: node.title }));
    panel.appendChild(el('p', { text: node.text }));
    if (node.chapterId && node.dispatchId){
      panel.appendChild(el('a', {
        class: 'jump', text: 'Read the chapter →', attrs: { href: `#${node.chapterId}` },
        onclick: (e) => {
          e.preventDefault();
          selectDispatch(node.dispatchId);
          setView('dispatch');
          // wait a tick for the DOM to render before scrolling to the anchor
          requestAnimationFrame(() => {
            const target = document.getElementById(node.chapterId);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          });
        }
      }));
    }
  }
}

/* ---------------- View switching ---------------- */

function setView(which){
  const dispatchEl = document.getElementById('view-dispatch');
  const mapEl = document.getElementById('view-map');
  const btnD = document.getElementById('btn-dispatch');
  const btnM = document.getElementById('btn-map');
  const picker = document.getElementById('week-picker');

  if (which === 'dispatch'){
    mapEl.classList.add('hidden');
    dispatchEl.classList.remove('hidden');
    picker.classList.remove('hidden');
    btnD.classList.add('active');
    btnM.classList.remove('active');
  } else {
    dispatchEl.classList.add('hidden');
    mapEl.classList.remove('hidden');
    picker.classList.add('hidden');
    btnM.classList.add('active');
    btnD.classList.remove('active');
  }
}
window.setView = setView;

/* ---------------- Boot ---------------- */

async function boot(){
  try {
    CONTENT = await loadContent();
    document.querySelector('.brand .mark').textContent = CONTENT.meta.title;
    document.querySelector('.brand .tag').textContent = CONTENT.meta.tag;

    const sorted = [...CONTENT.dispatches].sort((a, b) => a.weekNumber - b.weekNumber);
    const firstPublished = sorted.find(d => d.status === 'published') || sorted[0];
    selectDispatch(firstPublished.id);

    renderMap(CONTENT.map);
  } catch (err){
    document.getElementById('view-dispatch').innerHTML =
      `<div class="load-state">Could not load content.json — if you opened this file directly from disk, run a local server (see README) instead.</div>`;
    console.error(err);
  }
}

boot();
