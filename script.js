// Discord Profile — script.js (streak pill beside elapsed, using flame icon)
// - Preserves original structure and 5s polling
// - Restores badges/guild tags, avatar decoration, and VS Code mini-icon
// - Keeps flame streak icon beside elapsed-time pill
// - Adds safe IGDB query escaping and basic URL sanitation
// - Adds unified badge-style tooltips for badges and activity artwork via data-tip
// - Makes specific badges hover-only (no click, default cursor)
// - Adds entrance animation for newly appearing activity and listening cards
// - Adds macOS-style expand/collapse for activity sections

// ---------- IDs & APIs ----------
const DISCORD_ID  = '915480322328649758';
const LANYARD_API = 'https://api.lanyard.rest/v1/users';

// Optional art providers (leave blank to skip that provider)
const IGDB_CLIENT_ID   = '';   // Twitch/IGDB Client-ID
const IGDB_OAUTH_TOKEN = '';   // Twitch OAuth token for IGDB
const RAWG_API_KEY     = 'd8f996ba38294b3e9a4cc01841450618';   // RAWG.io API key

// ---------- Static header/banner/badges ----------
const MANUAL_BANNER_URL = 'https://cdn.discordapp.com/banners/915480322328649758/32cc47b18de216e1b4abd66adda17c6b?size=4096';

const MANUAL_BADGES = [
  { name: 'HypeSquad Bravery',            icon: 'https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png' },
  { name: 'Originally known as #Nau4866', icon: 'https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png' },
  { name: 'Complete a Quest',             icon: 'https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png' },
  { name: 'Orbs Apprentice',              icon: 'https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png' },
];

const MANUAL_GUILD_TAGS = [
  { text: 'CYBR', badge: 'https://cdn.discordapp.com/clan-badges/543652415870730240/4b70e09b6b8ddf55b5f9dc6816636760.png?size=16', tooltip: 'Server Tag: CYBR' },
];

// ---------- Service logos ----------
const ICON_SPOTIFY = 'https://media.discordapp.net/external/SBL-oQIuwzsSwlKo6e2_hIFvUrQolyZmCjxmbMVinn4/https/live.musicpresence.app/v3/icons/spotify/discord-small-image.f4d35e7aa231.png';
const ICON_APPLE  = 'https://www.pngarts.com/files/8/Apple-Music-Logo-PNG-Photo.png';

// Optional app icon used inside activity thumbnails when the app name matches
const ICON_VSCODE  =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="#007ACC" d="M243.7 49.7 192 32 76 139.1 125.5 188z"/><path fill="#1F9CF0" d="m192 32-16.5 192 68.2-29.7V49.7z"/><path fill="#0065A9" d="m44.3 105.9 81.2 81.2 21.3-21.3-60-60L44.3 105.9z"/><path fill="#1F9CF0" d="m44.3 150.1 31.3 31.3 61.2-61.2-21.3-21.3-71.2 51.2z"/></svg>`);

// ---------- intervals ----------
let musicProgressInterval = null;
let activityTickInterval  = null;

// ---------- caches & local streak store ----------
const GAME_ART_CACHE = new Map();
const STREAK_KEY = 'streaks:v1';   // { [title]: { lastDate, days, minutesToday } }
const STREAK_MINUTES_THRESHOLD = 10;

// ---------- lifecycle ----------
document.addEventListener('DOMContentLoaded', () => {
  bindControls();
  loadProfile();
  setInterval(loadProfile, 5000);
});
window.addEventListener('beforeunload', () => {
  clearInterval(musicProgressInterval);
  clearInterval(activityTickInterval);
});

// ---------- main ----------
async function loadProfile() {
  setApiStatus('loading');
  try {
    const r = await fetch(`${LANYARD_API}/${DISCORD_ID}`);
    if (!r.ok) throw new Error(`Lanyard HTTP ${r.status}`);
    const { success, data } = await r.json();
    if (!success) throw new Error('Lanyard not ready');
    buildUI(data);
    setApiStatus('online');
  } catch (e) {
    console.error(e);
    setApiStatus('offline');
  }
}

function buildUI(d) {
  setProfile(d);
  setCustomStatus(d);
  setBadges();
  setGuildTags();
  setActivities(d);
  setMedia(d);
  
  // Toggle expand/collapse based on content
  toggleSectionExpansion();
}

// NEW: Toggle expand/collapse for activity sections
function toggleSectionExpansion() {
  const activitiesSection = document.querySelector('.discord-activities-section');
  const musicSection = document.querySelector('.discord-music-section');
  const activitiesList = byId('activities-list');
  const musicList = byId('music-list');
  
  // Expand activities section if it has cards
  if (activitiesSection) {
    const hasActivities = activitiesList && activitiesList.children.length > 0;
    activitiesSection.classList.toggle('has-content', hasActivities);
  }
  
  // Expand music section if it has cards
  if (musicSection) {
    const hasMusic = musicList && musicList.children.length > 0;
    musicSection.classList.toggle('has-content', hasMusic);
  }
}

// ---------- header/presence ----------
function setApiStatus(state){ const dot={loading:'🟡',online:'🟢',offline:'🔴'}; const el=byId('lanyard-status'); if(el) el.textContent=dot[state]||'🟡'; }
function setProfile(d){
  const u=d.discord_user;
  const avatarUrl = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith('a_')?'gif':'png'}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(u.discriminator??0)%5}.png`;
  setSrc('profile-avatar', sanitizeExternalURL(avatarUrl));
  setText('display-name', u.global_name||u.display_name||u.username||'User');
  setText('username', `@${u.username||'unknown'}`);

  const status = normalizeStatus(d.discord_status);
  setClass('status-indicator', `status-indicator ${status}`);
  const pillDot = document.getElementById('status-dot-badge');
  if (pillDot) pillDot.className = `status-dot ${status}`;
  const pill = document.querySelector('.status-badge');
  if (pill) pill.className = `status-badge ${status}`;
  setText('status-text-badge', prettyStatus(status));

  if(MANUAL_BANNER_URL){
    const b=byId('profile-banner'); if(b){ b.style.backgroundImage=`url(${sanitizeExternalURL(MANUAL_BANNER_URL)})`; b.classList.add('has-banner'); }
  }
  const deco=byId('avatar-decoration');
  if(deco){
    const preset=u.avatar_decoration_data?.asset||u.avatar_decoration;
    deco.innerHTML=preset?`<img alt="" src="${sanitizeExternalURL(`https://cdn.discordapp.com/avatar-decoration-presets/${preset}.png`)}">`:''; 
  }
}
function normalizeStatus(s){ if(!s) return 'offline'; return s==='invisible'?'offline':s; }
function prettyStatus(s){ return s==='dnd'?'Do Not Disturb':s.charAt(0).toUpperCase()+s.slice(1); }

// ---------- custom status ----------
function setCustomStatus(d){
  const cs=d.activities?.find(a=>a.type===4);
  const block=byId('custom-status-section'); if(!block) return;
  if(cs?.state){ setText('custom-emoji', cs.emoji?.name||'💭'); setText('custom-text', cs.state); block.classList.add('floating'); block.style.display='block'; }
  else { block.classList.remove('floating'); block.style.display='none'; }
}

// ---------- badges/tags ----------
function setBadges(){
  const c=byId('discord-badges'); if(!c) return;
  c.innerHTML = (Array.isArray(MANUAL_BADGES)?MANUAL_BADGES:[]).map(b=>{
    const name = esc(b?.name||'Badge');
    const icon = sanitizeExternalURL(String(b?.icon||''));
    return `<div class="discord-badge" data-tip="${name}" aria-label="${name}">
              <img alt="${name}" src="${icon}">
            </div>`;
  }).join('');
}
function setGuildTags(){
  const c=byId('guild-tags'); if(!c) return;
  c.innerHTML = (Array.isArray(MANUAL_GUILD_TAGS)?MANUAL_GUILD_TAGS:[]).map(g=>{
    const text = esc(g?.text||'');
    const tip  = esc(g?.tooltip||g?.text||'');
    const badge= g?.badge ? `<img class="guild-tag-badge" alt="" src="${sanitizeExternalURL(String(g.badge))}">` : '';
    return `<div class="guild-tag" data-tip="${tip}" aria-label="${tip}">${badge}<span>${text}</span></div>`;
  }).join('');
}

// ---------- activities (non-listening) ----------
function setActivities(d){
  const list=byId('activities-list'); if(!list) return;
  const acts=(d.activities||[]).filter(a=>a.type!==4).filter(a=>!isListeningActivity(a));
  if(!acts.length){ list.innerHTML=''; clearInterval(activityTickInterval); list.dataset.key=''; return; }
  const a=acts[0];

  // Key the content to animate only when it changes
  const keyAct = [
    a.application_id || a.name || '',
    a.details || '',
    a.state || '',
    a.timestamps?.start || 0
  ].join('|');
  const changedAct = list.dataset.key !== keyAct;

  const days = updateStreakFromActivity(a);
  list.innerHTML=renderActivityCard(a, days);
  list.dataset.key = keyAct;

  if (changedAct) animateInCards(list);

  hydrateGameArt(a);

  clearInterval(activityTickInterval);
  activityTickInterval=setInterval(()=>{
    const label=byId(`activity-time-${a.id||'primary'}`);
    if(!label) return;
    const started=a.timestamps?.start??Date.now();
    label.textContent=msToHMS(Math.max(0, Date.now()-started));
  },1000);
}

function renderActivityCard(a, days=1){
  const header=activityHeader(a);
  const largeUrl=resolveAssetImage(a.application_id, a.assets?.large_image)||placeholder(120,120);
  const smallUrl=resolveAssetImage(a.application_id, a.assets?.small_image)||(String(a.name).toLowerCase().includes('code')?ICON_VSCODE:'');

  const bigTip   = a.assets?.large_text || a.details || a.state || a.name || 'Activity';
  const smallTip = a.assets?.small_text || a.name || 'App';

  const aid = a.id || 'primary';
  const timeId=`activity-time-${aid}`;
  const hasElapsed=!!a.timestamps?.start;

  const line1=esc(a.name||'Activity');
  const line2=a.details?`<div class="activity-artist">${esc(a.details)}</div>`:'';
  const line3=a.state?`<div class="activity-artist">${esc(a.state)}</div>`:'';

  const elapsedPill = hasElapsed
    ? `<div class="elapsed-row">
         <div class="elapsed-pill">
           <svg class="clock" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M12 7v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
           <span id="${timeId}">${msToHMS(Math.max(0, Date.now()-(a.timestamps.start)))}</span><span>elapsed</span>
         </div>
         <div class="elapsed-pill" id="streak-pill-${aid}">
           <svg class="flame" viewBox="0 0 24 24" aria-hidden="true">
             <path fill="currentColor" d="m8.294 14-1.767 7.068c-.187.746.736 1.256 1.269.701L19.79 9.27A.75.75 0 0 0 19.25 8h-4.46l1.672-5.013A.75.75 0 0 0 15.75 2h-7a.75.75 0 0 0-.721.544l-3 10.5A.75.75 0 0 0 5.75 14h2.544Z"/>
           </svg>
           <span>${Math.max(1, Number(days||1))}x&nbsp;Streak</span>
         </div>
       </div>`:'';

  return `
  <article class="discord-activity-card" id="activity-${aid}">
    <header class="activity-card-header">
      <div class="activity-header-text">${esc(header)}</div>
      <div class="activity-header-right">
        <button class="activity-context-menu" aria-label="Options" title="Options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg></button>
      </div>
    </header>
    <div class="activity-card-body">
      <div class="activity-content">
        <div class="activity-image">
          <img data-aid="${aid}" alt="" src="${sanitizeExternalURL(largeUrl)}" data-tip="${esc(bigTip)}">
          ${
            smallUrl
              ? `<div class="smallImageContainer_ef9ae7 activity-small-thumbnail" data-tip="${esc(smallTip)}">
                   <img class="contentImage__42bf5 contentImage_ef9ae7" alt="${esc(smallTip)}" src="${sanitizeExternalURL(smallUrl)}">
                   <span style="display:none;"></span>
                 </div>`
              : ''
          }
        </div>
        <div class="activity-details">
          <div class="activity-title">${line1}</div>
          ${line2}
          ${line3}
          ${elapsedPill}
        </div>
      </div>
    </div>
  </article>`;
}
function activityHeader(a){
  switch(a.type){
    case 0: return 'Playing';
    case 1: return 'Streaming';
    case 2: return 'Listening';
    case 3: return 'Watching';
    case 5: return 'Competing';
    default: return 'Playing';
  }
}

// ---------- listening ----------
function setMedia(d){
  const list=byId('music-list'); if(!list) return;
  const acts=(d.activities||[]).filter(a=>a.type!==4);
  const spAct=acts.find(a=>isListeningActivity(a)&&/spotify/i.test(a.name||''));
  const spotify=d.spotify||null;
  const apple=acts.find(a=>isListeningActivity(a)&&/apple\s*music/i.test(a.name||''));

  const cards=[];
  if(spotify||spAct) cards.push(renderSpotifyCard(spotify, spAct));
  if(apple) cards.push(renderAppleCard(apple));

  // Key currently displayed listening state to animate on change
  const sig = [];
  if (spotify || spAct) { const t = spotify?.song || spAct?.details || spAct?.name || ''; sig.push('sp:'+t); }
  if (apple) { const t2 = apple?.details || apple?.state || 'Apple Music'; sig.push('am:'+t2); }
  const keyMusic = sig.join('|');
  const changedMusic = list.dataset.key !== keyMusic;

  list.innerHTML=cards.join('');
  list.dataset.key = keyMusic;

  if (changedMusic && cards.length) animateInCards(list);

  clearInterval(musicProgressInterval);
  if(cards.length){
    musicProgressInterval=setInterval(()=>{
      if(spotify){
        const start=spotify.timestamps?.start??Date.now();
        const end=spotify.timestamps?.end??start+1;
        const total=Math.max(1,end-start); const n=Date.now();
        const p=clamp(((n-start)/total)*100,0,100);
        setWidth('music-bar-spotify', `${p}%`);
        setText('music-elapsed-spotify', msToMMSS(n-start));
      }else if(spAct?.timestamps?.start&&spAct?.timestamps?.end){
        const start=spAct.timestamps.start; const end=spAct.timestamps.end; const total=Math.max(1,end-start); const n=Date.now();
        const p=clamp(((n-start)/total)*100,0,100);
        setWidth('music-bar-spotify', `${p}%`);
        setText('music-elapsed-spotify', msToMMSS(n-start));
      }
      if(apple?.timestamps?.start&&apple?.timestamps?.end){
        const start=apple.timestamps.start; const end=apple.timestamps.end; const total=Math.max(1,end-start); const n=Date.now();
        const p=clamp(((n-start)/total)*100,0,100);
        setWidth('music-bar-apple', `${p}%`);
        setText('music-elapsed-apple', msToMMSS(n-start));
      }else if(apple?.timestamps?.start){
        setText('music-elapsed-apple-pill', msToMMSS(Math.max(0, Date.now()-apple.timestamps.start)));
        }
      },1000);
    }
  }
  

function renderSpotifyCard(spotify, spAct){
  let title, artist, album, art, start, end;
  if(spotify){
    title=spotify.song||''; artist=spotify.artist||''; album=spotify.album||''; art=spotify.album_art_url||''; start=spotify.timestamps?.start??null; end=spotify.timestamps?.end??null;
  }else{
    title=spAct?.details||spAct?.name||'Spotify'; artist=spAct?.state||''; album=''; art=resolveAssetImage(spAct?.application_id, spAct?.assets?.large_image)||''; start=spAct?.timestamps?.start??null; end=spAct?.timestamps?.end??null;
  }
  const now=Date.now(); const total=start&&end?Math.max(1,end-start):0; const pct=start&&end?clamp(((now-start)/total)*100,0,100):0;

  return `
  <article class="discord-activity-card discord-music-card">
    <header class="activity-card-header">
      <div class="activity-header-text">Listening on Spotify <img class="header-icon" alt="" src="${sanitizeExternalURL(ICON_SPOTIFY)}"/></div>
      <div class="activity-header-right">
        <button class="activity-context-menu" aria-label="Options" title="Options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg></button>
      </div>
    </header>
    <div class="activity-card-body">
      <div class="activity-content">
        <div class="activity-image">
          <img alt="" src="${sanitizeExternalURL(art)}" data-tip="${esc(title || 'Spotify')}">
          <div class="smallImageContainer_ef9ae7 activity-small-thumbnail" data-tip="Spotify">
            <img class="contentImage__42bf5 contentImage_ef9ae7" alt="Spotify" src="${sanitizeExternalURL(ICON_SPOTIFY)}">
            <span style="display:none;"></span>
          </div>
        </div>
        <div class="activity-details">
          <div class="activity-title">${esc(title)}</div>
          <div class="activity-artist">${esc(artist)}</div>
          ${album?`<div class="activity-artist">${esc(album)}</div>`:''}
          ${start&&end?`
            <div class="activity-progress-container">
              <div class="activity-progress-time" id="music-elapsed-spotify">${msToMMSS(now-start)}</div>
              <div class="activity-progress-bar"><div class="activity-progress-fill spotify" id="music-bar-spotify" style="width:${pct}%"></div></div>
              <div class="activity-progress-time" id="music-total-spotify">${msToMMSS(total)}</div>
            </div>`:''}
        </div>
      </div>
    </div>
  </article>`;
}

function renderAppleCard(am){
  const title = am.details || am.state || 'Apple Music';
  const artist = am.state && am.details ? am.state : '';
  const album = am.assets?.large_text || '';
  const large = resolveAssetImage(am.application_id, am.assets?.large_image) || placeholder(120,120);
  const small = resolveAssetImage(am.application_id, am.assets?.small_image) || ICON_APPLE;

  const start=am.timestamps?.start??null; const end=am.timestamps?.end??null;
  const now=Date.now(); const total=start&&end?Math.max(1,end-start):0; const pct=start&&end?clamp(((now-start)/total)*100,0,100):0;

  return `
  <article class="discord-activity-card discord-music-card">
    <header class="activity-card-header">
      <div class="activity-header-text">Listening to Apple Music <img class="header-icon" alt="" src="${sanitizeExternalURL(ICON_APPLE)}"/></div>
      <div class="activity-header-right">
        <button class="activity-context-menu" aria-label="Options" title="Options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg></button>
      </div>
    </header>
    <div class="activity-card-body">
      <div class="activity-content">
        <div class="activity-image">
          <img alt="" src="${sanitizeExternalURL(large)}" data-tip="${esc(title)}">
          <div class="smallImageContainer_ef9ae7 activity-small-thumbnail" data-tip="Apple Music">
            <img class="contentImage__42bf5 contentImage_ef9ae7" alt="Apple Music" src="${sanitizeExternalURL(small)}">
            <span style="display:none;"></span>
          </div>
        </div>
        <div class="activity-details">
          <div class="activity-title">${esc(title)}</div>
          ${artist?`<div class="activity-artist">${esc(artist)}</div>`:''}
          ${album?`<div class="activity-artist">${esc(album)}</div>`:''}
          ${start&&end?`
            <div class="activity-progress-container">
              <div class="activity-progress-time" id="music-elapsed-apple">${msToMMSS(now-start)}</div>
              <div class="activity-progress-bar"><div class="activity-progress-fill apple" id="music-bar-apple" style="width:${pct}%"></div></div>
              <div class="activity-progress-time" id="music-total-apple">${msToMMSS(total)}</div>
            </div>`:
            start?`<div class="elapsed-row"><div class="elapsed-pill"><svg class="clock" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M12 7v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span id="music-elapsed-apple-pill">${msToMMSS(now-start)}</span><span>elapsed</span></div></div>`:''}
        </div>
      </div>
    </div>
  </article>`;
}

function isListeningActivity(a){ return a?.type===2 || /spotify|apple\s*music/i.test(a?.name||''); }

// ---------- artwork provider chain ----------
async function hydrateGameArt(activity) {
  const aid = activity.id || 'primary';
  const img = document.querySelector(`img[data-aid="${aid}"]`);
  if (!img || img.dataset.hydrated === '1') return;

  let url = resolveAssetImage(activity.application_id, activity.assets?.large_image);
  if (!url) url = await fetchFromIGDB(activity.name);
  if (!url) url = await fetchFromRAWG(activity.name);

  if (url) { img.src = sanitizeExternalURL(url); img.dataset.hydrated = '1'; }
}

async function fetchFromIGDB(name) {
  if (!name || !IGDB_CLIENT_ID || !IGDB_OAUTH_TOKEN) return '';
  const key = 'igdb:'+name.toLowerCase();
  if (GAME_ART_CACHE.has(key)) return GAME_ART_CACHE.get(key);

  const safe = String(name).replaceAll('"','\\"');
  const q = `search "${safe}"; fields cover.image_id; limit 1;`;
  try{
    const r = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: { 'Client-ID': IGDB_CLIENT_ID, 'Authorization': 'Bearer ' + IGDB_OAUTH_TOKEN },
      body: q
    });
    if(!r.ok) return '';
    const [game] = await r.json();
    const imageId = game?.cover?.image_id;
    const url = imageId ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg` : '';
    GAME_ART_CACHE.set(key, url);
    return url;
  }catch{ return ''; }
}

async function fetchFromRAWG(name) {
  if (!name || !RAWG_API_KEY) return '';
  const key = 'rawg:'+name.toLowerCase();
  if (GAME_ART_CACHE.has(key)) return GAME_ART_CACHE.get(key);
  try{
    const r = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(name)}&page_size=1&key=${RAWG_API_KEY}`);
    if(!r.ok) return '';
    const data = await r.json();
    const url = data?.results?.[0]?.background_image || '';
    GAME_ART_CACHE.set(key, url);
    return url;
  }catch{ return ''; }
}

// ---------- asset resolver + placeholder ----------
function resolveAssetImage(appId,key){
  if(!key) return '';
  if(String(key).startsWith('mp:')) return `https://media.discordapp.net/${String(key).slice(3)}`;
  if(appId && /^[0-9]+$/.test(String(appId))) return `https://cdn.discordapp.com/app-assets/${appId}/${key}.png`;
  return '';
}
function placeholder(w,h){
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='rgba(99,99,102,0.35)'/>
      <stop offset='100%' stop-color='rgba(53,53,55,0.50)'/>
    </linearGradient></defs>
    <rect width='100%' height='100%' rx='10' fill='url(#g)'/>
    <path d='M0 ${h} L${w} 0' stroke='rgba(255,255,255,0.25)' stroke-width='2'/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ---------- Option A: local "daily streaks" ----------
function loadStreaks(){ try{ return JSON.parse(localStorage.getItem(STREAK_KEY)) || {}; }catch{ return {}; } }
function saveStreaks(s){ localStorage.setItem(STREAK_KEY, JSON.stringify(s)); }

function updateStreakFromActivity(a){
  const title = (a.name || 'Unknown').trim();
  const s = loadStreaks();
  const rec = s[title] || { lastDate: '', days: 0, minutesToday: 0 };
  const now = new Date();
  const today = now.toISOString().slice(0,10);

  if (a.timestamps?.start){
    const mins = Math.floor((Date.now() - a.timestamps.start) / 60000);
    rec.minutesToday = Math.max(rec.minutesToday, mins);
  }

  if (rec.lastDate !== today){
    if (rec.minutesToday >= STREAK_MINUTES_THRESHOLD) rec.days = (rec.days || 0) + 1;
    else rec.days = 1;
    rec.minutesToday = 0;
    rec.lastDate = today;
  }

  s[title] = rec; saveStreaks(s);
  return rec.days;
}

// ---------- helpers ----------
function bindControls(){ const btn=byId('refresh-btn'); if(btn) btn.addEventListener('click', loadProfile); }
function byId(id){ return document.getElementById(id); }
function setText(id,t){ const el=byId(id); if(el) el.textContent=t??''; }
function setSrc(id,u){ const el=byId(id); if(el) el.src=u; }
function setClass(id,c){ const el=byId(id); if(el) el.className=c; }
function setWidth(id,w){ const el=byId(id); if(el) el.style.width=w; }
function esc(s){
  return String(s??'').replace(/[&<>\\"']/g, m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
  }[m]));
}
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function msToHMS(ms){ ms=Math.max(0,Math.floor(ms)); const t=Math.floor(ms/1000), h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60; return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function msToMMSS(ms){ ms=Math.max(0,Math.floor(ms)); const t=Math.floor(ms/1000), m=Math.floor(t/60), s=t%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function sanitizeExternalURL(u){
  try{
    const x = new URL(String(u), location.origin);
    if (x.protocol !== 'http:' && x.protocol !== 'https:') return '';
    return x.href;
  }catch{ return ''; }
}

// Entrance animation helper
function animateInCards(root){
  const cards = root.querySelectorAll('.discord-activity-card, .discord-music-card');
  cards.forEach((el, i) => {
    el.classList.remove('card-enter');
    void el.offsetWidth;
    el.style.setProperty('--enter-delay', `${i*40}ms`);
    el.style.animationDelay = el.style.getPropertyValue('--enter-delay');
    el.classList.add('card-enter');
    el.addEventListener('animationend', () => {
      el.classList.remove('card-enter');
      el.style.removeProperty('--enter-delay');
      el.style.animationDelay = '';
    }, { once:true });
  });
}

/* ========= Badge Hover + Click (updated: hover-only for selected badges) ========= */
(() => {
  const BADGE_LINKS = {
    'orbs apprentice': 'https://discord.com/shop?tab=orbs',
    'complete a quest': 'https://discord.com/discovery/quests'
  };

  const NON_CLICKABLE_BADGES = new Set([
    'hypesquad bravery',
    'originally known as #nau4866'
  ]);

  const iconToName = new Map();
  if (Array.isArray(typeof MANUAL_BADGES !== 'undefined' ? MANUAL_BADGES : [])) {
    for (const b of MANUAL_BADGES) {
      const n = (b?.name || '').trim();
      const u = (b?.icon || '').trim();
      if (!n || !u) continue;
      iconToName.set(sanitizeExternalURL(u), n);
    }
  }

  const container = document.getElementById('discord-badges');
  if (container) {
    enhanceBadges(container);
    const mo = new MutationObserver(() => enhanceBadges(container));
    mo.observe(container, { childList: true, subtree: true });
  }

  const enhanced = new WeakSet();

  function enhanceBadges(root) {
    const badges = root.querySelectorAll('.discord-badge, .discord-badges-container img, #discord-badges img');
    badges.forEach(node => {
      const el = node.tagName === 'IMG' ? node : (node.querySelector('img') || node);
      if (!el || enhanced.has(el)) return;

      const parent = el.closest('.discord-badge') || el.parentElement || el;
      const attrLabel = parent?.getAttribute?.('aria-label') || parent?.getAttribute?.('data-tip') || '';
      const srcLabel = iconToName.get(sanitizeExternalURL(el.getAttribute('src') || '')) || '';
      const altLabel = el.getAttribute('alt') || '';
      const label = (attrLabel || srcLabel || altLabel || 'Badge').trim();
      const key = label.toLowerCase();

      parent.setAttribute('aria-label', label);
      parent.setAttribute('data-tip', label);

      const url = BADGE_LINKS[key] || '';
      const hoverOnly = NON_CLICKABLE_BADGES.has(key) || !url;

      parent.style.cursor = hoverOnly ? 'default' : 'pointer';
      if (hoverOnly) {
        parent.removeAttribute('tabindex');
        parent.onclick = null;
        parent.onkeydown = null;
      } else {
        parent.setAttribute('tabindex', '0');
        parent.addEventListener('click', (e) => { if (e.button === 0) window.open(url, '_blank', 'noopener,noreferrer'); });
        parent.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(url, '_blank', 'noopener,noreferrer'); }
        });
      }

      enhanced.add(el);
    });
  }
})();

/* ========= Unified hover tooltips for [data-tip] (reuse #badge-tooltip) ========= */
(() => {
  if (window.__unifiedTipsInit) return;
  window.__unifiedTipsInit = true;

  function ensureTooltip() {
    let tip = document.getElementById('badge-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'badge-tooltip';
      tip.className = 'badge-tooltip';
      tip.setAttribute('role', 'tooltip');
      tip.setAttribute('aria-hidden', 'true');
      tip.style.position = 'fixed';
      tip.style.zIndex = '9999';
      tip.style.pointerEvents = 'none';
      tip.style.opacity = '0';
      tip.style.transform = 'translate(-50%, 0) scale(.98)';
      tip.style.transition = 'opacity .12s ease, transform .12s ease';
      tip.style.background = 'rgba(0,0,0,.7)';
      tip.style.color = '#fff';
      tip.style.border = '1px solid rgba(255,255,255,.15)';
      tip.style.borderRadius = '8px';
      tip.style.padding = '6px 10px';
      tip.style.font = '600 12px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
      document.body.appendChild(tip);
    }
    return tip;
  }
  const tip = ensureTooltip();
  let activeEl = null;

  function showTip(text) {
    tip.textContent = text || '';
    tip.style.opacity = '1';
    tip.style.transform = 'translate(-50%, -8px) scale(1)';
    tip.setAttribute('aria-hidden', 'false');
  }
  function moveTipToPointer(e) {
    const offset = 18;
    tip.style.left = `${e.clientX}px`;
    tip.style.top  = `${e.clientY - offset}px`;
  }
  function moveTipToElement(el) {
    const r = el.getBoundingClientRect();
    const offset = 12;
    tip.style.left = `${Math.round(r.left + r.width/2)}px`;
    tip.style.top  = `${Math.round(r.top - offset)}px`;
  }
  function hideTip() {
    tip.style.opacity = '0';
    tip.style.transform = 'translate(-50%, 0) scale(.98)';
    tip.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    activeEl = el;
    if (el.hasAttribute('title')) { el.dataset._titleBackup = el.getAttribute('title') || ''; el.removeAttribute('title'); }
    showTip(el.getAttribute('data-tip'));
    moveTipToPointer(e);
  }, true);

  document.addEventListener('pointermove', (e) => {
    if (!activeEl) return;
    if (!e.target.closest('[data-tip]')) return;
    moveTipToPointer(e);
  }, true);

  document.addEventListener('pointerout', (e) => {
    if (!activeEl) return;
    if (!e.relatedTarget || !e.relatedTarget.closest('[data-tip]')) {
      if (activeEl?.dataset?._titleBackup !== undefined) {
        if (activeEl.dataset._titleBackup) activeEl.setAttribute('title', activeEl.dataset._titleBackup);
        delete activeEl.dataset._titleBackup;
      }
      activeEl = null;
      hideTip();
    }
  }, true);

  document.addEventListener('focusin', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    activeEl = el;
    if (el.hasAttribute('title')) { el.dataset._titleBackup = el.getAttribute('title') || ''; el.removeAttribute('title'); }
    showTip(el.getAttribute('data-tip'));
    moveTipToElement(el);
  }, true);

  document.addEventListener('focusout', (e) => {
    if (!activeEl) return;
    if (activeEl?.dataset?._titleBackup !== undefined) {
      if (activeEl.dataset._titleBackup) activeEl.setAttribute('title', activeEl.dataset._titleBackup);
      delete activeEl.dataset._titleBackup;
    }
    activeEl = null;
    hideTip();
  }, true);
})();
