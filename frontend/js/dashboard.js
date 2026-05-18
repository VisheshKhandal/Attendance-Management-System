/**
 * Dashboard — live hero, animated stats, analytics charts, timeline
 */

let dashboardData = null;
let clockInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await AppLayout.init('dashboard');
  initHeroClock();
  document.getElementById('refreshDashboardBtn')?.addEventListener('click', () => loadDashboardStats(true));
  await loadDashboardStats();
});

function initHeroClock() {
  const tick = () => {
    const now = new Date();
    const dateEl = document.getElementById('heroDate');
    const clockEl = document.getElementById('heroClock');
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
  };
  tick();
  clockInterval = setInterval(tick, 1000);
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDisplayName() {
  const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  if (!user) return 'Teacher';
  return user.fullName?.trim() || user.username || user.email || 'Teacher';
}

function updateHero(stats) {
  const name = getDisplayName();
  const greeting = document.getElementById('heroGreeting');
  const insight = document.getElementById('heroInsight');
  const trend = document.getElementById('heroTrend');

  if (greeting) greeting.textContent = `${getTimeGreeting()}, ${name} 👋`;

  const marked = stats.attendanceToday ?? 0;
  const present = stats.presentToday ?? 0;

  if (insight) {
    if (marked === 0) {
      insight.textContent =
        'No attendance marked yet today. Head to Attendance when your class is ready.';
    } else {
      insight.textContent = `You marked attendance for ${marked} student${marked === 1 ? '' : 's'} today (${present} present).`;
    }
  }

  if (trend) {
    const change = stats.weekOverWeekChange ?? 0;
    if (stats.attendanceToday > 0 || change !== 0) {
      trend.hidden = false;
      if (change > 0) {
        trend.textContent = `↑ Attendance consistency improved by ${Math.abs(change)}% vs last week.`;
        trend.className = 'hero-trend';
      } else if (change < 0) {
        trend.textContent = `↓ Attendance rate dipped ${Math.abs(change)}% compared to last week.`;
        trend.className = 'hero-trend down';
      } else {
        trend.textContent = 'Attendance rate is steady compared to last week.';
        trend.className = 'hero-trend';
      }
    } else {
      trend.hidden = true;
    }
  }
}

async function loadDashboardStats(isRefresh = false) {
  const statEls = {
    classes: document.getElementById('statClasses'),
    students: document.getElementById('statStudents'),
    today: document.getElementById('statToday'),
    percentage: document.getElementById('statPercentage'),
  };

  Object.values(statEls).forEach((el) => el && (el.textContent = '…'));
  document.querySelectorAll('.stat-card').forEach((c) => c.classList.remove('is-live'));

  try {
    const res = await API.dashboard.getStats();
    const s = res.data;
    dashboardData = s;

    updateHero(s);

    animateCounter(statEls.classes, s.totalClasses ?? 0);
    animateCounter(statEls.students, s.totalStudents ?? 0);
    animateCounter(statEls.today, s.attendanceToday ?? 0);
    animateCounter(statEls.percentage, s.attendancePercentage ?? 0, '%');

    document.querySelectorAll('.stat-card').forEach((c) => c.classList.add('is-live'));

    renderLineChart(s.weeklyTrend || []);
    renderHeatmap(s.heatmap || []);
    renderClassComparison(s.classComparison || []);
    renderPieChart(s.distribution || {});
    renderTimeline(s.recentActivity || []);
    updateWidgets(s);

    const chartsSection = document.getElementById('chartsSection');
    if (chartsSection) chartsSection.hidden = false;

    if (isRefresh) Toast.success('Dashboard refreshed');
  } catch (err) {
    Object.values(statEls).forEach((el) => el && (el.textContent = '—'));
    Toast.error(err.message);
  }
}

function animateCounter(el, target, suffix = '') {
  if (!el) return;
  const numTarget = Number(target) || 0;
  const duration = 1200;
  const start = performance.now();

  const frame = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const value = Math.round(numTarget * ease);
    el.textContent = suffix ? `${value}${suffix}` : String(value);
    el.dataset.count = String(numTarget);
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function updateWidgets(s) {
  const summary = s.todaySummary || {};
  animateCounter(document.getElementById('summaryPresent'), summary.present ?? 0);
  animateCounter(document.getElementById('summaryAbsent'), summary.absent ?? 0);
  animateCounter(document.getElementById('summaryMarked'), summary.marked ?? 0);

  const health = s.health || {};
  const badge = document.getElementById('healthBadge');
  const widget = document.getElementById('healthWidget');
  const fill = document.getElementById('healthBarFill');
  const percentEl = document.getElementById('healthPercent');

  if (badge) badge.textContent = health.label || '—';
  if (widget) {
    widget.className = `widget-card card health-widget ${health.level || 'neutral'}`;
  }
  const pct = s.attendancePercentage ?? 0;
  if (fill) {
    requestAnimationFrame(() => {
      fill.style.width = `${pct}%`;
    });
  }
  if (percentEl) percentEl.textContent = `${pct}% overall`;
}

function renderLineChart(trend) {
  const root = document.getElementById('weeklyLineChart');
  if (!root) return;

  if (!trend.length) {
    root.innerHTML = '<p class="empty-state">Mark attendance to see trends</p>';
    return;
  }

  const w = 560;
  const h = 140;
  const pad = { t: 16, r: 12, b: 28, l: 12 };
  const rates = trend.map((d) => (d.marked > 0 ? d.rate : 0));
  const maxY = Math.max(...rates, 10, 100);

  const coords = rates.map((r, i) => {
    const x = pad.l + (i / Math.max(rates.length - 1, 1)) * (w - pad.l - pad.r);
    const y = pad.t + (1 - r / maxY) * (h - pad.t - pad.b);
    return { x, y, r, label: trend[i].label };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${h - pad.b} L${coords[0].x},${h - pad.b} Z`;

  const dots = coords
    .map(
      (c, i) =>
        `<circle class="line-chart-dot" cx="${c.x}" cy="${c.y}" r="4" style="animation-delay:${0.1 + i * 0.08}s"/>` +
        `<title>${c.label}: ${c.r}%</title>`
    )
    .join('');

  root.innerHTML = `
    <svg class="line-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="line-chart-area" d="${areaPath}"/>
      <path class="line-chart-line" d="${linePath}"/>
      ${dots}
    </svg>
    <div class="line-chart-labels">
      ${coords.map((c) => `<span>${escapeHtml(c.label)}</span>`).join('')}
    </div>`;
}

function renderHeatmap(cells) {
  const root = document.getElementById('attendanceHeatmap');
  if (!root) return;

  if (!cells.length) {
    root.innerHTML = '<p class="empty-state">No activity data yet</p>';
    return;
  }

  const gridCells = cells
    .map((cell, i) => {
      const delay = (i % 50) * 0.008;
      return `<div class="heatmap-cell level-${cell.level}" 
        style="animation-delay:${delay}s" 
        title="${cell.date}: ${cell.count} marked"></div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="heatmap-grid">${gridCells}</div>
    <div class="heatmap-legend">
      <span>Less</span>
      <span class="level-0"></span>
      <span class="level-1"></span>
      <span class="level-2"></span>
      <span class="level-3"></span>
      <span class="level-4"></span>
      <span>More</span>
    </div>`;
}

function renderPieChart(dist) {
  const root = document.getElementById('distributionPie');
  if (!root) return;

  const present = dist.present ?? 0;
  const absent = dist.absent ?? 0;
  const total = present + absent;

  if (total === 0) {
    root.innerHTML = '<p class="empty-state">No records yet</p>';
    return;
  }

  const presentPct = dist.presentPercent ?? Math.round((present / total) * 100);
  const absentPct = 100 - presentPct;

  root.innerHTML = `
    <div class="pie-ring" style="background: conic-gradient(var(--success) 0% ${presentPct}%, var(--danger) ${presentPct}% 100%)" data-center="${presentPct}%"></div>
    <div class="pie-legend">
      <div class="pie-legend-item"><span class="pie-legend-dot present"></span> Present ${present} (${presentPct}%)</div>
      <div class="pie-legend-item"><span class="pie-legend-dot absent"></span> Absent ${absent} (${absentPct}%)</div>
    </div>`;
}

function renderClassComparison(classes) {
  const root = document.getElementById('classCompareChart');
  if (!root) return;

  if (!classes.length) {
    root.innerHTML = '<p class="empty-state">Create classes to see comparison</p>';
    return;
  }

  root.innerHTML = classes
    .map(
      (c) => `
    <div class="compare-row">
      <span class="compare-name">${escapeHtml(c.name)}</span>
      <span class="compare-rate">${c.rate}%</span>
      <div class="compare-bar-track">
        <div class="compare-bar-fill" data-width="${c.rate}"></div>
      </div>
    </div>`
    )
    .join('');

  requestAnimationFrame(() => {
    root.querySelectorAll('.compare-bar-fill').forEach((bar) => {
      bar.style.width = `${bar.dataset.width}%`;
    });
  });
}

function renderTimeline(items) {
  const feed = document.getElementById('activityTimeline');
  if (!feed) return;

  if (!items.length) {
    feed.innerHTML = '<li class="timeline-item empty-feed">No activity yet. Mark attendance or add a class.</li>';
    return;
  }

  const icons = {
    present: '🟢',
    absent: '🔴',
    class: '🟣',
    student: '🔵',
    attendance: '✅',
  };

  feed.innerHTML = items
    .map((item, i) => {
      const variant = item.variant || item.type || 'attendance';
      const icon = icons[variant] || '•';
      const time = formatRelativeTime(item.at);
      return `
        <li class="timeline-item variant-${variant}" style="animation-delay:${i * 0.04}s">
          <span class="timeline-icon">${icon}</span>
          <span class="timeline-text">${escapeHtml(item.text)}</span>
          <span class="timeline-time">${time}</span>
        </li>`;
    })
    .join('');
}

function formatRelativeTime(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str ?? '';
  return el.innerHTML;
}
