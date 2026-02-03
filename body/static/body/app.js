document.addEventListener('DOMContentLoaded', () => {
  const boardEl = document.getElementById('board');
  const rollBtn = document.getElementById('rollBtn');
  const resetBtn = document.getElementById('resetBtn');
  const p1Pos = document.getElementById('p1Pos');
  const p2Pos = document.getElementById('p2Pos');
  const lastRoll = document.getElementById('lastRoll');
  const statusEl = document.getElementById('status');
  const turnPill = document.getElementById('turnPill');

  const snakes = JSON.parse(document.getElementById('snakes-data').textContent);
  const ladders = JSON.parse(document.getElementById('ladders-data').textContent);
  let state = JSON.parse(document.getElementById('state-data').textContent);
  const ladderTargets = new Set(Object.values(ladders));
  const snakeTargets = new Set(Object.values(snakes));

  const cells = serpentineNumbers();
  renderBoard(cells);
  updateUI();

  rollBtn.addEventListener('click', onRoll);
  resetBtn.addEventListener('click', onReset);

  async function onRoll() {
    setLoading(true);
    try {
      const response = await fetch('/api/roll/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Roll failed');
      }
      state.positions = data.positions;
      state.turn = data.turn;
      state.winner = data.winner;

      lastRoll.textContent = data.roll;

      let message = `P${data.currentPlayer + 1} rolled a ${data.roll}.`;
      if (data.bounced) message += ' Overshoot — stayed put.';
      if (data.event === 'ladder') message += ' Climbed a ladder!';
      if (data.event === 'snake') message += ' Bitten by a snake.';
      if (data.winner !== null && data.winner !== undefined) {
        message = `🏆 Player ${data.winner + 1} wins the race to 100!`;
      }
      statusEl.textContent = message;

      updateUI();
    } catch (err) {
      statusEl.textContent = err.message;
    } finally {
      setLoading(false);
    }
  }

  async function onReset() {
    setLoading(true);
    try {
      const response = await fetch('/api/reset/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      });
      const data = await response.json();
      state = data.state;
      lastRoll.textContent = '–';
      statusEl.textContent = 'New game ready';
      updateUI();
    } catch (err) {
      statusEl.textContent = 'Reset failed';
    } finally {
      setLoading(false);
    }
  }

  function updateUI() {
    p1Pos.textContent = state.positions[0];
    p2Pos.textContent = state.positions[1];

    if (state.winner !== null && state.winner !== undefined) {
      turnPill.textContent = `Winner: P${state.winner + 1}`;
      turnPill.className = 'pill status-win';
      rollBtn.disabled = true;
    } else {
      turnPill.textContent = `Turn: P${state.turn + 1}`;
      turnPill.className = `pill ${state.turn === 0 ? 'pill-p1' : 'pill-p2'}`;
      rollBtn.disabled = false;
    }

    placeTokens();
  }

  function renderBoard(numbers) {
    boardEl.innerHTML = '';
    numbers.forEach((num) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.num = num;
      cell.innerHTML = `<span class="cell__number">${num}</span>`;

      if (ladders[num]) cell.classList.add('cell--ladder');
      if (snakes[num]) cell.classList.add('cell--snake');
      if (ladderTargets.has(num)) cell.classList.add('cell--ladder-target');
      if (snakeTargets.has(num)) cell.classList.add('cell--snake-target');

      if (ladders[num]) {
        const badge = document.createElement('div');
        badge.className = 'marker marker--ladder';
        badge.innerHTML = `<span class="marker__dot"></span>Up to ${ladders[num]}`;
        cell.appendChild(badge);
      }

      if (snakes[num]) {
        const badge = document.createElement('div');
        badge.className = 'marker marker--snake';
        badge.innerHTML = `<span class="marker__dot"></span>Down to ${snakes[num]}`;
        cell.appendChild(badge);
      }

      boardEl.appendChild(cell);
    });
  }

  function placeTokens() {
    // Remove existing tokens
    boardEl.querySelectorAll('.token').forEach((t) => t.remove());

    state.positions.forEach((pos, idx) => {
      const cell = boardEl.querySelector(`.cell[data-num="${pos}"]`);
      if (!cell) return;
      const token = document.createElement('div');
      token.className = `token token--p${idx + 1}`;
      token.textContent = `P${idx + 1}`;
      cell.appendChild(token);
    });
  }

  function serpentineNumbers() {
    const rows = [];
    for (let row = 0; row < 10; row += 1) {
      const start = row * 10 + 1;
      const rowNumbers = Array.from({ length: 10 }, (_, i) => start + i);
      if (row % 2 === 1) rowNumbers.reverse();
      rows.push(rowNumbers);
    }
    return rows.reverse().flat();
  }

  function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
      const [key, ...val] = cookie.split('=');
      if (key === name) return decodeURIComponent(val.join('='));
    }
    return '';
  }

  function setLoading(isLoading) {
    rollBtn.disabled = isLoading || (state.winner !== null && state.winner !== undefined);
    resetBtn.disabled = isLoading;
    rollBtn.textContent = isLoading ? 'Rolling…' : 'Roll Dice';
  }
});
