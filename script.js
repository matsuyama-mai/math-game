/* ========================================
   面積マスター ～単位へんかんチャレンジ～
   ゲームロジック
   ======================================== */

// ---------- 単位定義と換算テーブル ----------
const UNITS = [
  { id: 'cm2', name: 'cm²', fullName: '平方センチメートル' },
  { id: 'm2',  name: 'm²',  fullName: '平方メートル' },
  { id: 'a',   name: 'a',   fullName: 'アール' },
  { id: 'ha',  name: 'ha',  fullName: 'ヘクタール' },
  { id: 'km2', name: 'km²', fullName: '平方キロメートル' },
];

// 隣接する単位間の換算倍率（小さい → 大きい方向）
// cm² → m² : ÷10000
// m² → a   : ÷100
// a → ha   : ÷100
// ha → km² : ÷100
const CONVERSION_FACTORS = {
  'cm2_m2':  10000,  // 1 m² = 10000 cm²
  'm2_a':    100,    // 1 a  = 100 m²
  'a_ha':    100,    // 1 ha = 100 a
  'ha_km2':  100,    // 1 km² = 100 ha
};

// すべてを cm² を基準とした絶対倍率に変換
const TO_CM2 = {
  'cm2': 1,
  'm2':  10000,
  'a':   1000000,
  'ha':  100000000,
  'km2': 10000000000,
};

// ヒントテキスト
const HINTS = {
  'cm2_m2':  '1 m² = 10,000 cm²',
  'm2_cm2':  '1 m² = 10,000 cm²',
  'm2_a':    '1 a = 100 m²',
  'a_m2':    '1 a = 100 m²',
  'a_ha':    '1 ha = 100 a',
  'ha_a':    '1 ha = 100 a',
  'ha_km2':  '1 km² = 100 ha',
  'km2_ha':  '1 km² = 100 ha',
  'cm2_a':   '1 m² = 10,000 cm²、1 a = 100 m²',
  'a_cm2':   '1 m² = 10,000 cm²、1 a = 100 m²',
  'cm2_ha':  '1 m² = 10,000 cm²、1 a = 100 m²、1 ha = 100 a',
  'ha_cm2':  '1 m² = 10,000 cm²、1 a = 100 m²、1 ha = 100 a',
  'cm2_km2': '1 m² = 10,000 cm²、1 a = 100 m²、1 ha = 100 a、1 km² = 100 ha',
  'km2_cm2': '1 m² = 10,000 cm²、1 a = 100 m²、1 ha = 100 a、1 km² = 100 ha',
  'm2_ha':   '1 a = 100 m²、1 ha = 100 a',
  'ha_m2':   '1 a = 100 m²、1 ha = 100 a',
  'm2_km2':  '1 a = 100 m²、1 ha = 100 a、1 km² = 100 ha',
  'km2_m2':  '1 a = 100 m²、1 ha = 100 a、1 km² = 100 ha',
  'a_km2':   '1 ha = 100 a、1 km² = 100 ha',
  'km2_a':   '1 ha = 100 a、1 km² = 100 ha',
};

// ---------- ゲーム状態 ----------
let currentLevel = 1;
let currentQuestion = null;
let correctCount = 0;
let streakCount = 0;
let maxStreak = 0;
let questionIndex = 0;
const TOTAL_QUESTIONS = 10;

// ---------- DOM要素 ----------
const screens = {
  title: document.getElementById('title-screen'),
  game: document.getElementById('game-screen'),
  result: document.getElementById('result-screen'),
};

const els = {
  questionText: document.getElementById('question-text'),
  answerInput: document.getElementById('answer-input'),
  answerUnit: document.getElementById('answer-unit'),
  correctCount: document.getElementById('correct-count'),
  streakCount: document.getElementById('streak-count'),
  questionNumber: document.getElementById('question-number'),
  hintBox: document.getElementById('hint-box'),
  resultOverlay: document.getElementById('result-overlay'),
  resultIcon: document.getElementById('result-icon'),
  resultText: document.getElementById('result-text'),
  resultAnswer: document.getElementById('result-answer'),
  finalScore: document.getElementById('final-score'),
  finalMessage: document.getElementById('final-message'),
  finalStreak: document.getElementById('final-streak'),
  finalIcon: document.getElementById('final-icon'),
  questionCard: document.getElementById('question-card'),
  confettiContainer: document.getElementById('confetti-container'),
};

// ---------- 画面切り替え ----------
function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenName].classList.add('active');
}

// ---------- レベル選択 ----------
document.querySelectorAll('.level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLevel = parseInt(btn.dataset.level);
    startGame();
  });
});

// ---------- ゲーム開始 ----------
function startGame() {
  correctCount = 0;
  streakCount = 0;
  maxStreak = 0;
  questionIndex = 0;
  updateScoreDisplay();
  showScreen('game');
  nextQuestion();
}

// ---------- 問題生成 ----------
function generateQuestion() {
  const unitIndices = [];
  for (let i = 0; i < UNITS.length; i++) unitIndices.push(i);

  let fromIdx, toIdx;

  // レベルに応じた単位ペアの選択
  while (true) {
    fromIdx = unitIndices[Math.floor(Math.random() * unitIndices.length)];
    toIdx = unitIndices[Math.floor(Math.random() * unitIndices.length)];
    if (fromIdx === toIdx) continue;

    const distance = Math.abs(fromIdx - toIdx);

    if (currentLevel === 1 && distance <= 1) break;
    if (currentLevel === 2 && distance <= 2) break;
    if (currentLevel === 3) break;
  }

  const fromUnit = UNITS[fromIdx];
  const toUnit = UNITS[toIdx];

  // 問題の数値を生成（小学生向けので分かりやすい数値）
  let value;
  const distance = Math.abs(fromIdx - toIdx);

  if (fromIdx < toIdx) {
    // 大きい単位 → 小さい単位（掛け算）の逆、小さい → 大きい
    // 大きい数値になりすぎないよう、小さめの数値
    const simpleValues = [1, 2, 3, 4, 5, 10, 20, 50, 100, 200, 500, 1000];
    value = simpleValues[Math.floor(Math.random() * simpleValues.length)];
    
    // 変換結果が非常に大きくなる場合は小さい値を使う
    const result = value * (TO_CM2[toUnit.id] / TO_CM2[fromUnit.id]);
    if (result > 1000000000) {
      value = [1, 2, 3, 5][Math.floor(Math.random() * 4)];
    }
  } else {
    // 大きい単位 → 小さい単位（割り算の逆方向）
    // 結果がきれいな数になる値
    const factor = TO_CM2[fromUnit.id] / TO_CM2[toUnit.id];
    if (factor >= 10000) {
      value = [10000, 20000, 50000, 100000, 1000000][Math.floor(Math.random() * 5)];
    } else if (factor >= 100) {
      value = [100, 200, 300, 500, 1000, 2000, 5000][Math.floor(Math.random() * 7)];
    } else {
      value = [1, 2, 3, 5, 10, 20, 50, 100][Math.floor(Math.random() * 8)];
    }
  }

  // 正解の計算
  const answer = value * (TO_CM2[fromUnit.id] / TO_CM2[toUnit.id]);

  return {
    value: value,
    fromUnit: fromUnit,
    toUnit: toUnit,
    answer: answer,
    hintKey: fromUnit.id + '_' + toUnit.id,
  };
}

// ---------- 次の問題 ----------
function nextQuestion() {
  if (questionIndex >= TOTAL_QUESTIONS) {
    showResult();
    return;
  }

  questionIndex++;
  els.questionNumber.textContent = questionIndex;

  currentQuestion = generateQuestion();

  // 問題文の表示
  const valueStr = currentQuestion.value.toLocaleString();
  els.questionText.textContent = `${valueStr} ${currentQuestion.fromUnit.name} = ？ ${currentQuestion.toUnit.name}`;
  els.answerUnit.textContent = currentQuestion.toUnit.name;

  // 入力をリセット
  els.answerInput.value = '';
  els.answerInput.classList.remove('correct', 'wrong');
  els.answerInput.focus();

  // ヒントを隠す
  els.hintBox.classList.remove('visible');
  els.hintBox.textContent = '';

  // 結果オーバーレイを隠す
  els.resultOverlay.classList.remove('visible');

  // カードのアニメーション
  els.questionCard.style.animation = 'none';
  void els.questionCard.offsetHeight; // reflow
  els.questionCard.style.animation = 'slideUp 0.5s ease-out';
}

// ---------- 回答チェック ----------
function checkAnswer() {
  const userAnswer = parseFloat(els.answerInput.value);

  if (isNaN(userAnswer)) {
    els.answerInput.classList.add('wrong');
    setTimeout(() => els.answerInput.classList.remove('wrong'), 500);
    return;
  }

  const correctAnswer = currentQuestion.answer;

  // 浮動小数点の誤差を考慮した比較
  const isCorrect = Math.abs(userAnswer - correctAnswer) < (correctAnswer * 0.001 + 0.001);

  if (isCorrect) {
    handleCorrect(correctAnswer);
  } else {
    handleWrong(correctAnswer);
  }
}

function handleCorrect(correctAnswer) {
  correctCount++;
  streakCount++;
  if (streakCount > maxStreak) maxStreak = streakCount;

  updateScoreDisplay();
  els.answerInput.classList.add('correct');

  // 結果表示
  els.resultIcon.textContent = '🎉';
  els.resultText.textContent = 'せいかい！';
  els.resultText.className = 'result-text correct';
  els.resultAnswer.textContent = `こたえ: ${formatNumber(correctAnswer)} ${currentQuestion.toUnit.name}`;

  // 紙吹雪
  launchConfetti();

  showResultOverlay();
}

function handleWrong(correctAnswer) {
  streakCount = 0;
  updateScoreDisplay();
  els.answerInput.classList.add('wrong');

  // 結果表示
  els.resultIcon.textContent = '😢';
  els.resultText.textContent = 'ざんねん…';
  els.resultText.className = 'result-text wrong';
  els.resultAnswer.textContent = `せいかいは: ${formatNumber(correctAnswer)} ${currentQuestion.toUnit.name}`;

  showResultOverlay();
}

function showResultOverlay() {
  els.resultOverlay.classList.add('visible');
}

// ---------- スコア更新 ----------
function updateScoreDisplay() {
  els.correctCount.textContent = correctCount;
  els.streakCount.textContent = streakCount;
}

// ---------- 最終結果 ----------
function showResult() {
  els.finalScore.textContent = correctCount;
  els.finalStreak.textContent = maxStreak;

  let message, icon;
  if (correctCount === TOTAL_QUESTIONS) {
    message = '🌟 パーフェクト！すごい！ 🌟';
    icon = '👑';
    launchConfetti();
    setTimeout(launchConfetti, 500);
    setTimeout(launchConfetti, 1000);
  } else if (correctCount >= 8) {
    message = 'すばらしい！よくがんばりました！';
    icon = '🏆';
    launchConfetti();
  } else if (correctCount >= 5) {
    message = 'いいちょうし！もっとれんしゅうしよう！';
    icon = '😊';
  } else if (correctCount >= 3) {
    message = 'もうすこし！がんばろう！';
    icon = '💪';
  } else {
    message = 'ヒントをつかってれんしゅうしよう！';
    icon = '📚';
  }

  els.finalMessage.textContent = message;
  els.finalIcon.textContent = icon;

  showScreen('result');
}

// ---------- 数値フォーマット ----------
function formatNumber(num) {
  // 整数ならそのまま、小数なら適切にフォーマット
  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }
  // 小数点以下の不要な0を削除
  const formatted = parseFloat(num.toPrecision(10));
  return formatted.toLocaleString();
}

// ---------- ヒント ----------
document.getElementById('btn-hint').addEventListener('click', () => {
  if (!currentQuestion) return;

  const hintKey = currentQuestion.hintKey;
  const hintText = HINTS[hintKey] || '単位の関係を調べてみよう！';

  els.hintBox.textContent = '💡 ' + hintText;
  els.hintBox.classList.add('visible');
});

// ---------- 紙吹雪 ----------
function launchConfetti() {
  const colors = ['#FF6B9D', '#6C63FF', '#00D2FF', '#00C897', '#FFB800', '#FF5757'];
  const shapes = ['circle', 'square', 'triangle'];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 6;
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const duration = Math.random() * 2 + 2;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    confetti.style.left = left + '%';
    confetti.style.width = size + 'px';
    confetti.style.height = size + 'px';
    confetti.style.backgroundColor = color;
    confetti.style.animationDelay = delay + 's';
    confetti.style.animationDuration = duration + 's';

    if (shape === 'circle') {
      confetti.style.borderRadius = '50%';
    } else if (shape === 'triangle') {
      confetti.style.width = '0';
      confetti.style.height = '0';
      confetti.style.backgroundColor = 'transparent';
      confetti.style.borderLeft = size / 2 + 'px solid transparent';
      confetti.style.borderRight = size / 2 + 'px solid transparent';
      confetti.style.borderBottom = size + 'px solid ' + color;
    }

    els.confettiContainer.appendChild(confetti);

    // アニメーション後に削除
    setTimeout(() => {
      confetti.remove();
    }, (delay + duration) * 1000 + 100);
  }
}

// ---------- イベントリスナー ----------

// 回答ボタン
document.getElementById('btn-submit').addEventListener('click', checkAnswer);

// Enterキーで回答
els.answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    checkAnswer();
  }
});

// 次の問題ボタン
document.getElementById('btn-next').addEventListener('click', nextQuestion);

// 戻るボタン
document.getElementById('btn-back').addEventListener('click', () => {
  showScreen('title');
});

// もう一度チャレンジ
document.getElementById('btn-retry').addEventListener('click', () => {
  startGame();
});

// タイトルに戻る
document.getElementById('btn-home').addEventListener('click', () => {
  showScreen('title');
});
