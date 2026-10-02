const teamColors = ['#ee805e', '#7fae62', '#75a8a2', '#d3ac5d', '#7394b4', '#bd7f9e'];
let state = { teams: [], players: [], matches: [] };
let activeView = 'overview';
let activeMatchId = null;
let toastTimer;

async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail || problem?.message || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

async function refreshState() {
  const [teams, players, matches] = await Promise.all([
    api('/teams'),
    api('/players'),
    api('/matches')
  ]);
  state.teams = teams.map(team => ({
    ...team,
    short: team.shortName,
    city: '',
    color: teamColors[Number(team.id) % teamColors.length]
  }));
  state.players = players.map(player => ({ ...player, number: player.id }));
  state.matches = matches.map(match => ({
    ...match,
    status: match.status?.toLowerCase() === 'live' ? 'Live' : match.status?.toLowerCase() === 'completed' ? 'Completed' : 'Upcoming'
  }));
  render();
}

function id() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function teamById(teamId) {
  return state.teams.find(team => team.id === teamId);
}

function teamName(teamId) {
  return teamById(teamId)?.name || 'Unassigned';
}

function dateLabel(date, options = { month: 'short', day: 'numeric' }) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'Date pending' : new Intl.DateTimeFormat('en', options).format(parsed);
}

function overText(balls) {
  return `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
}

function initials(team) {
  return escapeHtml(team?.short || '??');
}

function crest(team, small = false) {
  if (!team) return '';
  return `<span class="${small ? 'mini-crest' : 'team-crest'}" style="background:${escapeHtml(team.color)}">${initials(team)}</span>`;
}

function getCurrentMatch() {
  return state.matches.find(match => match.status === 'Live');
}

function matchScore(match, inningsIndex = 0) {
  const innings = match.innings?.[inningsIndex];
  return innings ? `${innings.runs}/${innings.wickets}` : 'Yet to bat';
}

function updateChrome() {
  const title = activeView.charAt(0).toUpperCase() + activeView.slice(1);
  document.querySelector('#breadcrumb-current').textContent = title;
  document.querySelector('#match-count').textContent = state.matches.length;
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === activeView));
}

function render() {
  updateChrome();
  const page = document.querySelector('#page-wrap');
  const view = {
    overview: renderOverview,
    matches: renderMatches,
    teams: renderTeams,
    players: renderPlayers
  }[activeView] || renderOverview;
  page.innerHTML = view();
}

function heading(kicker, title, subtitle, actions = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p class="heading-sub">${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
}

function matchRow(match) {
  const home = teamById(match.homeId);
  const away = teamById(match.awayId);
  const statusClass = match.status === 'Live' ? '' : match.status === 'Upcoming' ? 'status-upcoming' : 'status-completed';
  let result = match.status === 'Completed' ? `<span class="result-text">${escapeHtml(match.result || `${teamName(match.winnerId)} won`)}</span>` : `${matchScore(match, 0)} <span style="color:#a4ada7">·</span> ${match.status === 'Upcoming' ? '—' : `${escapeHtml(away?.short || 'Away')} batting`}`;
  const action = match.status === 'Upcoming' ? 'start-match' : 'open-match';
  const actionLabel = match.status === 'Upcoming' ? 'Start' : match.status === 'Live' ? 'Score' : 'Summary';
  return `<tr><td>${dateLabel(match.date)}</td><td><div class="team-cell">${crest(home, true)}${escapeHtml(home?.name || 'Team TBD')} <span style="color:#adb5af;font-weight:400">v</span> ${escapeHtml(away?.name || 'Team TBD')}${crest(away, true)}</div></td><td>${escapeHtml(match.venue)}</td><td><span class="status-pill ${statusClass}">${escapeHtml(match.status)}</span></td><td>${result}</td><td><button class="row-action" data-action="${action}" data-id="${match.id}">${actionLabel}</button></td></tr>`;
}

function renderOverview() {
  const current = getCurrentMatch();
  const home = current && teamById(current.homeId);
  const away = current && teamById(current.awayId);
  const innings = current?.innings?.[0];
  const upcoming = state.matches.filter(match => match.status === 'Upcoming').length;
  const completed = state.matches.filter(match => match.status === 'Completed').length;
  const rows = [...state.matches].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(matchRow).join('');
  return `${heading('Saturday · City League', 'Good cricket, well kept.', 'Your season at a glance. Pick up where the action is.', '<button class="button button-outline" data-action="view-matches">All matches <span>↗</span></button><button class="button button-dark" data-action="new-match"><span class="plus">+</span> Create match</button>')}
    <section class="live-layout" aria-label="Live match and season overview">
      <article class="live-card">
        <div class="live-top"><div class="live-indicator"><span></span>${current ? 'Live now' : 'No live match'}</div><div class="match-meta">${current ? `${escapeHtml(current.venue)} <span>·</span> ${current.overs} overs` : 'Start a match to see live scores'}</div></div>
        ${current ? `<div class="live-teams"><div class="team-side"><div class="team-identity">${crest(home)}<span class="team-name">${escapeHtml(home?.name || 'Home')}</span></div><div class="team-score">${innings.runs}<small>/${innings.wickets}</small></div><div class="team-overs">${overText(innings.balls)} overs</div></div><div class="versus">VS</div><div class="team-side"><div class="team-identity">${crest(away)}<span class="team-name">${escapeHtml(away?.name || 'Away')}</span></div><div class="team-score" style="font-size:20px;color:rgba(255,255,255,.54)">—</div><div class="team-overs">Batting second</div></div></div>
        <div class="live-bottom"><div class="live-note">Run rate <strong>${innings.balls ? (innings.runs / (innings.balls / 6)).toFixed(2) : '0.00'}</strong><span style="margin:0 8px;color:rgba(255,255,255,.35)">·</span> ${escapeHtml(current.venue)}</div><button class="score-button" data-action="score-match" data-id="${current.id}">Update score&nbsp; ↗</button></div>` : `<div class="empty-state" style="color:rgba(255,255,255,.7);padding:48px 10px"><strong style="color:white">The pitch is yours.</strong>Create a match to start scoring.</div>`}
      </article>
      <aside class="quick-card"><div class="quick-head"><span class="section-label">Season snapshot</span><span style="font-size:17px;color:#91a097">⌁</span></div><div class="quick-stat"><span>Matches played</span><strong>${completed}</strong></div><div class="quick-stat"><span>Coming up</span><strong>${upcoming}</strong></div><div class="quick-stat"><span>Clubs competing</span><strong>${state.teams.length}</strong></div><div class="quick-foot"><span>City League · Summer 2025</span><span class="trend">● In progress</span></div></aside>
    </section>
    <section class="content-grid"><article class="panel"><div class="panel-header"><div><h2 class="panel-title">Recent fixtures<span class="panel-kicker">The latest from around the league</span></h2></div><button class="link-button" data-action="view-matches">View schedule&nbsp; ↗</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Fixture</th><th>Ground</th><th>Status</th><th>Score / Result</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6"><div class="empty-state">No fixtures yet. Create your first match.</div></td></tr>'}</tbody></table></div></article>
      <article class="panel standings-panel"><div class="panel-header"><div><h2 class="panel-title">League table<span class="panel-kicker">Top of the standings</span></h2></div><span class="section-label" style="font-size:9px">PTS</span></div>${standingsTable()}</article></section>`;
}

function standings() {
  return state.teams.map(team => {
    const played = state.matches.filter(match => match.status === 'Completed' && (match.homeId === team.id || match.awayId === team.id));
    const won = played.filter(match => match.winnerId === team.id).length;
    const lost = played.length - won;
    return { team, played: played.length, won, lost, points: won * 2 };
  }).sort((a, b) => b.points - a.points || b.won - a.won);
}

function standingsTable() {
  const rows = standings().map((entry, index) => `<tr><td class="rank-cell">${String(index + 1).padStart(2, '0')}</td><td><div class="team-cell">${crest(entry.team, true)}${escapeHtml(entry.team.short)}</div></td><td>${entry.played}</td><td><strong>${entry.points}</strong></td></tr>`).join('');
  return `<div class="table-wrap"><table class="data-table standings-table"><thead><tr><th>#</th><th>Club</th><th>P</th><th>Pts</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Add teams to begin the table.</td></tr>'}</tbody></table></div><div style="padding:10px 17px 13px;color:#969f99;font-size:9px;border-top:1px solid #edf0eb">Win 2 pts&nbsp; · &nbsp;Tie 1 pt</div>`;
}

function renderMatches() {
  const matches = [...state.matches].sort((a, b) => b.date.localeCompare(a.date));
  return `<section class="view-section">${heading('Competition', 'Match schedule', 'Create fixtures and keep every result in one place.', '<button class="button button-dark" data-action="new-match"><span class="plus">+</span> New match</button>')}<div class="metric-strip"><div class="metric-box"><span>Total fixtures</span><strong>${state.matches.length}</strong></div><div class="metric-box"><span>Live right now</span><strong>${matches.filter(match => match.status === 'Live').length}</strong></div><div class="metric-box"><span>Completed</span><strong>${matches.filter(match => match.status === 'Completed').length}</strong></div></div><div class="toolbar"><span class="section-label">All fixtures</span><input class="search-field" id="match-search" type="search" placeholder="Search teams or venue" aria-label="Search fixtures"></div><article class="panel"><div class="table-wrap"><table class="data-table" id="matches-table"><thead><tr><th>Date</th><th>Fixture</th><th>Ground</th><th>Status</th><th>Score / Result</th><th></th></tr></thead><tbody>${matches.map(matchRow).join('') || '<tr><td colspan="6"><div class="empty-state"><strong>No matches yet</strong>Create your first fixture to get the season started.</div></td></tr>'}</tbody></table></div></article></section>`;
}

function renderTeams() {
  const teamRows = state.teams.map(team => {
    const players = state.players.filter(player => player.teamId === team.id).length;
    const played = state.matches.filter(match => match.homeId === team.id || match.awayId === team.id).length;
    return `<tr><td><div class="team-cell">${crest(team, true)}${escapeHtml(team.name)}</div></td><td>${escapeHtml(team.short)}</td><td>${players}</td><td>${played}</td><td><button class="row-action" data-action="team-players" data-id="${team.id}">View players</button><button class="row-action" data-action="delete-team" data-id="${team.id}">Remove</button></td></tr>`;
  }).join('');
  return `<section class="view-section">${heading('League setup', 'Your teams', 'Manage the clubs registered in your league.', '<button class="button button-dark" data-action="new-team"><span class="plus">+</span> Add team</button>')}<div class="metric-strip"><div class="metric-box"><span>Registered clubs</span><strong>${state.teams.length}</strong></div><div class="metric-box"><span>Players on record</span><strong>${state.players.length}</strong></div><div class="metric-box"><span>Fixtures scheduled</span><strong>${state.matches.length}</strong></div></div><article class="panel"><div class="panel-header"><h2 class="panel-title">League teams</h2><span class="section-label">${state.teams.length} clubs</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Team</th><th>Short name</th><th>Players</th><th>Fixtures</th><th></th></tr></thead><tbody>${teamRows || '<tr><td colspan="5"><div class="empty-state"><strong>No teams added</strong>Add a team before creating fixtures.</div></td></tr>'}</tbody></table></div></article></section>`;
}

function renderPlayers(teamFilter = '') {
  const players = state.players.filter(player => !teamFilter || player.teamId === teamFilter);
  const rows = players.map(player => `<tr><td><strong>${escapeHtml(player.name)}</strong></td><td>${escapeHtml(player.role)}</td><td>${escapeHtml(teamName(player.teamId))}</td><td>${escapeHtml(player.id)}</td><td><button class="row-action" data-action="delete-player" data-id="${player.id}">Remove</button></td></tr>`).join('');
  const addPlayerButton = `<button class="button button-dark" data-action="new-player" ${state.teams.length ? '' : 'disabled'}><span class="plus">+</span> Add player</button>`;
  return `<section class="view-section">${heading('Squad book', 'Player roster', 'Keep player roles and team assignments up to date.', addPlayerButton)}<div class="metric-strip"><div class="metric-box"><span>Registered players</span><strong>${state.players.length}</strong></div><div class="metric-box"><span>Teams represented</span><strong>${new Set(state.players.map(player => player.teamId)).size}</strong></div><div class="metric-box"><span>Player roles</span><strong>${new Set(state.players.map(player => player.role)).size}</strong></div></div><div class="toolbar"><span class="section-label">All players</span><input class="search-field" id="player-search" type="search" placeholder="Search player or team" aria-label="Search players"></div><article class="panel"><div class="table-wrap"><table class="data-table" id="players-table"><thead><tr><th>Player</th><th>Role</th><th>Team</th><th>Record ID</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5"><div class="empty-state"><strong>No players to show</strong>Add a player to start building the roster.</div></td></tr>'}</tbody></table></div></article></section>`;
}

function teamOptions(selected = '') {
  return state.teams.map(team => `<option value="${team.id}" ${team.id === selected ? 'selected' : ''}>${escapeHtml(team.name)}</option>`).join('');
}

function showModal(title, subtitle, body, wide = false) {
  const layer = document.querySelector('#modal-layer');
  layer.innerHTML = `<section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><h2 id="modal-title">${title}</h2><p>${subtitle}</p></div><button class="modal-close" data-action="close-modal" aria-label="Close">×</button></header>${body}</section>`;
  layer.classList.add('open');
  layer.setAttribute('aria-hidden', 'false');
  layer.querySelector('input,select,button')?.focus();
}

function closeModal() {
  const layer = document.querySelector('#modal-layer');
  layer.classList.remove('open');
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '';
}

function openMatchForm() {
  if (state.teams.length < 2) {
    showModal('Add two teams first', 'A fixture needs a home and away side.', `<form class="modal-form"><p style="color:#77817b;font-size:12px">Set up at least two teams before creating a match.</p><div class="modal-actions"><button type="button" class="button button-dark" data-action="close-modal">Got it</button></div></form>`);
    return;
  }
  showModal('Create a fixture', 'Choose the sides, ground, and match format.', `<form class="modal-form" id="match-form"><div class="form-grid"><div class="field"><label for="home-team">Home team</label><select id="home-team" name="homeId" required>${teamOptions()}</select></div><div class="field"><label for="away-team">Away team</label><select id="away-team" name="awayId" required>${teamOptions(state.teams[1].id)}</select></div><div class="field full"><label for="venue">Ground</label><input id="venue" name="venue" placeholder="e.g. Riverside Oval" required maxlength="70"></div><div class="field"><label for="match-date">Date</label><input id="match-date" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></div><div class="field"><label for="overs">Overs per innings</label><select id="overs" name="overs"><option>5</option><option>10</option><option selected>20</option><option>50</option></select></div></div><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-modal">Cancel</button><button class="button button-dark" type="submit">Create match</button></div></form>`);
}

function openTeamForm() {
  showModal('Add a team', 'Add a club to your league.', `<form class="modal-form" id="team-form"><div class="form-grid"><div class="field full"><label for="team-name">Team name</label><input id="team-name" name="name" placeholder="e.g. Harbor Hawks" required maxlength="255"></div><div class="field full"><label for="team-short">Short name</label><input id="team-short" name="shortName" placeholder="HH" required maxlength="255"></div></div><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-modal">Cancel</button><button class="button button-dark" type="submit">Add team</button></div></form>`);
}

function openPlayerForm() {
  if (!state.teams.length) return;
  showModal('Add a player', 'Register a player and assign a squad role.', `<form class="modal-form" id="player-form"><div class="form-grid"><div class="field full"><label for="player-name">Player name</label><input id="player-name" name="name" placeholder="Full name" required maxlength="255"></div><div class="field"><label for="player-role">Playing role</label><select id="player-role" name="role"><option>Batter</option><option>Bowler</option><option>All-rounder</option><option>Wicketkeeper</option></select></div><div class="field"><label for="player-team">Team</label><select id="player-team" name="teamId" required>${teamOptions()}</select></div></div><div class="modal-actions"><button type="button" class="button button-outline" data-action="close-modal">Cancel</button><button class="button button-dark" type="submit">Add player</button></div></form>`);
}

function openScoreModal(matchId) {
  const match = state.matches.find(item => item.id === matchId);
  if (!match) return;
  if (match.status !== 'Live') {
    toast(match.status === 'Upcoming' ? 'This fixture has not started yet.' : (match.result || 'Match completed.'));
    return;
  }
  activeMatchId = matchId;
  const innings = match.innings[0];
  const recent = innings.events.slice(-8).map(event => `<span class="ball-chip ${event === 'W' ? 'wicket' : ['4', '6'].includes(event) ? 'boundary' : ''}">${escapeHtml(event)}</span>`).join('');
  showModal('Live scoring', `${escapeHtml(teamName(match.homeId))} vs ${escapeHtml(teamName(match.awayId))} · ${escapeHtml(match.venue)}`, `<div class="score-modal-summary"><div><small>Current innings</small><strong>${innings.runs}/${innings.wickets}</strong></div><div style="text-align:right"><small>Overs</small><strong>${overText(innings.balls)} <span style="font:500 12px var(--sans);color:rgba(255,255,255,.68)">/ ${match.overs}</span></strong></div></div><div class="score-actions"><p>Record the next delivery</p><div class="run-grid"><button class="run-button" data-action="record-run" data-runs="0">Dot</button><button class="run-button" data-action="record-run" data-runs="1">1</button><button class="run-button" data-action="record-run" data-runs="2">2</button><button class="run-button" data-action="record-run" data-runs="3">3</button><button class="run-button" data-action="record-run" data-runs="4">4</button><button class="run-button" data-action="record-run" data-runs="6">6</button><button class="run-button extra" data-action="record-extra" data-type="wide">Wide +1</button><button class="run-button extra" data-action="record-extra" data-type="no-ball">No-ball +1</button><button class="run-button wicket" data-action="record-wicket">Wicket</button></div><div class="recent-balls"><span class="recent-balls-label">Recent</span>${recent || '<span class="recent-balls-label">No deliveries recorded</span>'}</div><div class="modal-actions"><button class="button button-outline" data-action="close-modal">Done</button><button class="button button-dark" data-action="end-match" data-id="${match.id}">End innings</button></div></div>`, true);
}

async function recordEvent(type, runs = 0) {
  const match = state.matches.find(item => item.id === activeMatchId);
  if (!match || match.status !== 'Live') return;
  const extraType = type === 'wide' || type === 'no-ball' ? type : null;
  await api(`/matches/${match.id}/events`, {
    method: 'POST',
    body: JSON.stringify({
      runs: type === 'run' ? runs : 0,
      extraRuns: extraType ? 1 : 0,
      extraType,
      wicket: type === 'wicket',
      wicketType: type === 'wicket' ? 'other' : null
    })
  });
  await refreshState();
  const updated = state.matches.find(item => item.id === activeMatchId);
  if (updated?.status === 'Completed') {
    closeModal();
    toast('Innings complete. Match marked as completed.');
  } else {
    openScoreModal(activeMatchId);
  }
}

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
}

async function handleClick(event) {
  const nav = event.target.closest('[data-view]');
  if (nav) {
    activeView = nav.dataset.view;
    render();
    document.querySelector('#sidebar').classList.remove('open');
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id: itemId } = button.dataset;
  try {
  if (action === 'new-match') openMatchForm();
  if (action === 'new-team') openTeamForm();
  if (action === 'new-player') openPlayerForm();
  if (action === 'close-modal') closeModal();
  if (action === 'score-match' || action === 'open-match') openScoreModal(itemId);
  if (action === 'start-match') {
    if (getCurrentMatch()) { toast('Finish the live match before starting another.'); return; }
    await api(`/matches/${itemId}/start`, { method: 'POST' });
    await refreshState();
    openScoreModal(itemId);
  }
  if (action === 'record-run') await recordEvent('run', Number(button.dataset.runs));
  if (action === 'record-extra') await recordEvent(button.dataset.type);
  if (action === 'record-wicket') await recordEvent('wicket');
  if (action === 'end-match') {
    await api(`/matches/${itemId}/complete`, { method: 'POST' });
    closeModal();
    await refreshState();
    toast('Match marked as completed.');
  }
  if (action === 'view-matches') { activeView = 'matches'; render(); }
  if (action === 'team-players') { activeView = 'players'; render(); document.querySelector('#player-search').value = teamName(itemId); document.querySelector('#player-search').dispatchEvent(new Event('input')); }
  if (action === 'delete-team') {
    const involved = state.matches.some(match => String(match.homeId) === itemId || String(match.awayId) === itemId);
    if (involved) { toast('Remove this team from its fixtures before deleting it.'); return; }
    await api(`/teams/${itemId}`, { method: 'DELETE' });
    await refreshState();
    toast('Team removed.');
  }
  if (action === 'delete-player') {
    await api(`/players/${itemId}`, { method: 'DELETE' });
    await refreshState();
    toast('Player removed.');
  }
  } catch (error) {
    toast(error.message || 'The request could not be completed.');
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  try {
    if (form.id === 'match-form') {
      if (values.homeId === values.awayId) { toast('Choose two different teams.'); return; }
      await api('/matches', {
        method: 'POST',
        body: JSON.stringify({
          homeId: Number(values.homeId),
          awayId: Number(values.awayId),
          venue: values.venue.trim(),
          date: values.date,
          overs: Number(values.overs)
        })
      });
      closeModal();
      activeView = 'matches';
      await refreshState();
      toast('Fixture added to the schedule.');
    }
    if (form.id === 'team-form') {
      await api('/teams', {
        method: 'POST',
        body: JSON.stringify({ name: values.name.trim(), shortName: values.shortName.trim() })
      });
      closeModal();
      await refreshState();
      toast('Team added to the league.');
    }
    if (form.id === 'player-form') {
      await api('/players', {
        method: 'POST',
        body: JSON.stringify({ name: values.name.trim(), role: values.role, teamId: Number(values.teamId) })
      });
      closeModal();
      await refreshState();
      toast('Player added to the roster.');
    }
  } catch (error) {
    toast(error.message || 'The request could not be completed.');
  }
}

function handleSearch(event) {
  const search = event.target.value.toLowerCase().trim();
  if (event.target.id === 'match-search') {
    document.querySelectorAll('#matches-table tbody tr').forEach(row => row.hidden = !row.textContent.toLowerCase().includes(search));
  }
  if (event.target.id === 'player-search') {
    document.querySelectorAll('#players-table tbody tr').forEach(row => row.hidden = !row.textContent.toLowerCase().includes(search));
  }
}

document.querySelector('#page-wrap').addEventListener('click', handleClick);
document.querySelector('#page-wrap').addEventListener('input', handleSearch);
document.querySelector('.primary-nav').addEventListener('click', handleClick);
document.querySelector('#modal-layer').addEventListener('click', event => {
  if (event.target.id === 'modal-layer') closeModal();
  else handleClick(event);
});
document.querySelector('#modal-layer').addEventListener('submit', handleSubmit);
document.querySelector('#new-match-top').addEventListener('click', openMatchForm);
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

render();
refreshState().catch(error => toast(`Could not load scorebook: ${error.message}`));