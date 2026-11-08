/* Hashling popup: user switcher, Hashling (stage/items/mood), streak, wallet, quiz status, threats blocked today. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function send(msg) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(msg, function (res) {
        if (chrome.runtime.lastError || !res || !res.ok) return resolve(null);
        resolve(res.data);
      });
    });
  }

  function speech(u, quiz) {
    if (u.mood === 'sad') return 'You skipped my warning… please be careful 🥺';
    if (u.stats.blocked_today > 0) return 'We blocked ' + u.stats.blocked_today + ' threat' + (u.stats.blocked_today > 1 ? 's' : '') + ' today!';
    if (quiz && !quiz.completed) return u.stage === 'egg' ? 'Answer today’s questions to help me hatch!' : '3 new questions are waiting!';
    return 'All clear. I’m keeping watch 👀';
  }

  async function render() {
    var res = await send({ type: 'get-users' });
    if (!res) {
      $('offline').hidden = false;
      $('pet').innerHTML = HashlingSVG.build({ stage: 'egg', mood: 'sleepy', size: 170 });
      return;
    }
    $('offline').hidden = true;
    var sel = $('user');
    sel.innerHTML = res.users.map(function (u) {
      return '<option value="' + u.id + '"' + (u.id === res.active ? ' selected' : '') + '>' + u.name + ' · ' + u.stage + '</option>';
    }).join('');
    var u = res.users.filter(function (x) { return x.id === res.active; })[0] || res.users[0];
    if (!u) return;
    var quiz = await send({ type: 'quiz-status' });
    $('pet').innerHTML = HashlingSVG.build({ stage: u.stage, mood: u.mood === 'sad' ? 'sad' : 'happy', equipped: u.equipped, size: 170 });
    var BG = {
      bg_greenhouse: 'linear-gradient(180deg, #DFF1F0, #F7F1DF)',
      bg_rooftop: 'linear-gradient(180deg, #BFE3E8, #FCE9C8 70%, #E7D3B5)',
      bg_neon: 'linear-gradient(180deg, #2B1F4A, #7A3D7A 60%, #F2915D)'
    };
    document.querySelector('.pet-card').style.background = BG[u.equipped && u.equipped.background] || BG.bg_greenhouse;
    $('speech').style.color = u.equipped && u.equipped.background === 'bg_neon' ? '#FBF7EE' : '';
    $('speech').textContent = speech(u, quiz);
    $('streak').textContent = u.streak;
    $('wallet').textContent = u.wallet;
    $('blocked').textContent = u.stats.blocked_today;
    $('stage').textContent = u.stage + (u.next_stage ? ' → ' + u.next_stage : ' ✨');
    $('bar').style.width = Math.round(u.progress * 100) + '%';
    if (quiz) {
      var answered = quiz.questions.filter(function (q) { return q.answered; }).length;
      $('quiz').textContent = quiz.completed ? 'Done ✓ see you tomorrow' : answered + ' / 3 answered';
      $('dots').innerHTML = quiz.questions.map(function (q) {
        return '<span class="' + (q.answered ? (q.correct ? 'ok' : 'no') : '') + '"></span>';
      }).join('');
    }
  }

  $('user').addEventListener('change', async function (e) {
    await send({ type: 'set-user', userId: e.target.value });
    render();
  });
  $('open').addEventListener('click', function () { send({ type: 'open-den' }); window.close(); });
  render();
})();
