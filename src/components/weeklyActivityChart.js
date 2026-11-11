const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export function getEightWeekActivity(rows) {
  const activityByWeek = new Map((rows || []).map((row) => [
    String(row.week_start).slice(0, 10),
    row,
  ]));
  const currentWeek = new Date();
  currentWeek.setUTCHours(0, 0, 0, 0);
  currentWeek.setUTCDate(currentWeek.getUTCDate() - ((currentWeek.getUTCDay() + 6) % 7));

  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(currentWeek);
    date.setUTCDate(date.getUTCDate() - ((7 - index) * 7));
    const key = date.toISOString().slice(0, 10);
    const row = activityByWeek.get(key);
    return {
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      answered: Number(row?.questions_answered || 0),
      correct: Number(row?.correct_answers || 0),
    };
  });
}

export function renderWeeklyActivityChart(weeks) {
  const maxValue = Math.max(4, ...weeks.map((week) => week.answered));
  const chartHeight = 190;
  const chartWidth = 760;
  const top = 18;
  const bottom = top + chartHeight;
  const plotWidth = chartWidth - 68;
  const slot = plotWidth / weeks.length;
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = Math.ceil(maxValue * (4 - index) / 4);
    const y = top + (chartHeight * index / 4);
    return `
      <line x1="54" y1="${y}" x2="${chartWidth - 12}" y2="${y}" stroke="#c7c4d8" stroke-opacity="0.5" stroke-dasharray="4 5" />
      <text x="44" y="${y + 4}" text-anchor="end" fill="#777587" font-size="11">${value}</text>
    `;
  }).join('');
  const bars = weeks.map((week, index) => {
    const x = 62 + index * slot + slot / 2;
    const correctHeight = chartHeight * week.correct / maxValue;
    const incorrectHeight = chartHeight * (week.answered - week.correct) / maxValue;
    return `
      <rect x="${x - 13}" y="${bottom - correctHeight}" width="12" height="${correctHeight}" rx="4" fill="#006c4a">
        <title>${escapeHtml(week.label)}: ${week.correct} correct</title>
      </rect>
      <rect x="${x + 1}" y="${bottom - incorrectHeight}" width="12" height="${incorrectHeight}" rx="4" fill="#b9e9d1">
        <title>${escapeHtml(week.label)}: ${week.answered - week.correct} incorrect</title>
      </rect>
      <text x="${x}" y="${bottom + 21}" text-anchor="middle" fill="#777587" font-size="10">${escapeHtml(week.label)}</text>
    `;
  }).join('');

  return `
    <svg class="mt-4 w-full" viewBox="0 0 ${chartWidth} 248" role="img" aria-labelledby="weekly-chart-title weekly-chart-desc">
      <title id="weekly-chart-title">Answered questions over the past eight weeks</title>
      <desc id="weekly-chart-desc">Weekly counts of correct and incorrect answers from your activity.</desc>
      ${gridLines}
      <line x1="54" y1="${bottom}" x2="${chartWidth - 12}" y2="${bottom}" stroke="#c7c4d8" />
      ${bars}
    </svg>
  `;
}
