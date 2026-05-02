/* Smart Rock–Paper–Scissors */

const gameState = {
  round: 0,
  playerScore: 0,
  aiScore: 0,
  draws: 0,
  playerHistory: [],
  roundResults: [],
  moveCounts: { Rock: 0, Paper: 0, Scissors: 0 },
  streak: 0,
  bestStreak: 0,
  isProcessing: false,

  reset() {
    this.round = 0;
    this.playerScore = 0;
    this.aiScore = 0;
    this.draws = 0;
    this.playerHistory = [];
    this.roundResults = [];
    this.moveCounts = { Rock: 0, Paper: 0, Scissors: 0 };
    this.streak = 0;
    this.bestStreak = 0;
    this.isProcessing = false;
  },
};

const aiEngine = {
  transitionTable: {},
  k: 2,
  prediction: {
    move: null,
    confidence: null,
    strategy: "",
    level: 1,
    mode: "",
  },

  getLevel() {
    const r = gameState.round;
    if (r < 4) return 1;
    if (r < 9) return 2;
    if (r < 14) return 3;
    return 4;
  },

  getCounter(move) {
    const counters = { Rock: "Paper", Paper: "Scissors", Scissors: "Rock" };
    return counters[move];
  },

  level1() {
    const moves = ["Rock", "Paper", "Scissors"];
    const pick = moves[Math.floor(Math.random() * 3)];
    this.prediction = {
      move: null,
      confidence: "33%",
      strategy: "Random selection — no pattern analysis yet.",
      level: 1,
      mode: "Random Selection",
    };
    return pick;
  },

  level2() {
    const counts = gameState.moveCounts;
    const max = Math.max(counts.Rock, counts.Paper, counts.Scissors);
    const topMoves = Object.keys(counts).filter((m) => counts[m] === max);
    let predicted;
    if (topMoves.length > 1) {
      predicted = topMoves[Math.floor(Math.random() * topMoves.length)];
      this.prediction = {
        move: predicted,
        confidence: "Low (tie)",
        strategy: `Frequency tie among ${topMoves.join(", ")} — picked ${predicted} randomly. Counter: ${this.getCounter(predicted)}.`,
        level: 2,
        mode: "Frequency Analysis",
      };
    } else {
      predicted = topMoves[0];
      const total = counts.Rock + counts.Paper + counts.Scissors;
      const conf =
        total > 0 ? ((counts[predicted] / total) * 100).toFixed(0) + "%" : "—";
      this.prediction = {
        move: predicted,
        confidence: conf,
        strategy: `Most frequent move: ${predicted} (${counts[predicted]}/${total}). Playing ${this.getCounter(predicted)}.`,
        level: 2,
        mode: "Frequency Analysis",
      };
    }
    return this.getCounter(predicted);
  },

  level3() {
    const history = gameState.playerHistory;
    if (history.length < this.k) return this.level2();

    const lastK = history.slice(-this.k).join(",");

    if (this.transitionTable[lastK]) {
      const entry = this.transitionTable[lastK];
      const total = entry.Rock + entry.Paper + entry.Scissors;
      if (total === 0) return this.level2();

      const probs = {
        Rock: entry.Rock / total,
        Paper: entry.Paper / total,
        Scissors: entry.Scissors / total,
      };
      const maxProb = Math.max(probs.Rock, probs.Paper, probs.Scissors);
      const topMoves = Object.keys(probs).filter((m) => probs[m] === maxProb);
      const predicted = topMoves[Math.floor(Math.random() * topMoves.length)];
      const conf = (maxProb * 100).toFixed(0) + "%";

      this.prediction = {
        move: predicted,
        confidence: conf,
        strategy: `Pattern "${lastK}" → P(R):${(probs.Rock * 100).toFixed(0)}% P(P):${(probs.Paper * 100).toFixed(0)}% P(S):${(probs.Scissors * 100).toFixed(0)}%. Predicting ${predicted} → Playing ${this.getCounter(predicted)}.`,
        level: 3,
        mode: "Markov Model (k=2)",
      };
      return this.getCounter(predicted);
    } else {
      const result = this.level2();
      this.prediction.strategy =
        `New pattern "${lastK}" — falling back to frequency analysis. ` +
        this.prediction.strategy;
      this.prediction.confidence = "Low (new pattern)";
      this.prediction.level = 3;
      this.prediction.mode = "Markov Model (k=2)";
      return result;
    }
  },

  predictPlayerSequence(length) {
    let seq = [];
    let history = [...gameState.playerHistory];
    for (let i = 0; i < length; i++) {
      if (history.length < this.k) {
        let pick = ["Rock", "Paper", "Scissors"][Math.floor(Math.random() * 3)];
        seq.push(pick);
        history.push(pick);
        continue;
      }
      const lastK = history.slice(-this.k).join(",");
      let pred = "Rock";
      if (this.transitionTable[lastK]) {
        const entry = this.transitionTable[lastK];
        const maxProb = Math.max(entry.Rock, entry.Paper, entry.Scissors);
        const topMoves = Object.keys(entry).filter((m) => entry[m] === maxProb);
        pred = topMoves[Math.floor(Math.random() * topMoves.length)];
      } else {
        pred = ["Rock", "Paper", "Scissors"][Math.floor(Math.random() * 3)];
      }
      seq.push(pred);
      history.push(pred);
    }
    return seq;
  },

  runSearch(algorithmName, playerSeq) {
    const MOVES = ["Rock", "Paper", "Scissors"];
    const MAX_DEPTH = playerSeq.length;

    const getCost = (pMove, aMove) => {
      if (pMove === aMove) return 1;
      if (
        (aMove === "Rock" && pMove === "Scissors") ||
        (aMove === "Paper" && pMove === "Rock") ||
        (aMove === "Scissors" && pMove === "Paper")
      ) return 0;
      return 10;
    };

    const getHeuristic = (depth) => (MAX_DEPTH - depth) * 0;

    class SearchNode {
      constructor(moves, cost, h, parent) {
        this.moves = moves;
        this.depth = moves.length;
        this.cost = cost;
        this.h = h;
        this.f = cost + h;
        this.parent = parent;
      }
    }

    let startNode = new SearchNode([], 0, getHeuristic(0), null);
    let openList = [startNode];
    let bestNode = null;
    let iterations = 0;

    while (openList.length > 0) {
      iterations++;
      let current;

      if (algorithmName === "BFS") {
        current = openList.shift();
      } else if (algorithmName === "DFS") {
        current = openList.pop();
      } else if (algorithmName === "UCS") {
        openList.sort((a, b) => a.cost - b.cost);
        current = openList.shift();
      } else if (algorithmName === "Greedy") {
        openList.sort((a, b) => a.h - b.h);
        current = openList.shift();
      } else if (algorithmName === "A*") {
        openList.sort((a, b) => a.f - b.f);
        current = openList.shift();
      }

      if (current.depth === MAX_DEPTH) {
        if (algorithmName === "BFS" || algorithmName === "DFS") {
          if (current.cost === 0) {
            bestNode = current;
            break;
          }
          if (!bestNode || current.cost < bestNode.cost) bestNode = current;
        } else {
          bestNode = current;
          break;
        }
        continue;
      }

      for (let move of MOVES) {
        let stepCost = getCost(playerSeq[current.depth], move);
        let childNode = new SearchNode(
          [...current.moves, move],
          current.cost + stepCost,
          getHeuristic(current.depth + 1),
          current
        );
        openList.push(childNode);
      }
    }
    return { bestNode, iterations };
  },

  level4() {
    const playerSeq = this.predictPlayerSequence(3);
    const algos = ["BFS", "DFS", "UCS", "Greedy", "A*"];
    const algoName = algos[gameState.round % algos.length];

    const searchResult = this.runSearch(algoName, playerSeq);
    const aiSeq = searchResult.bestNode.moves;
    const bestMove = aiSeq[0];

    this.prediction = {
      move: playerSeq[0],
      confidence: "High (Search)",
      strategy: `Predicted Player Seq: [${playerSeq.join(", ")}]. ${algoName} Search found optimal counter-seq [${aiSeq.join(", ")}] in ${searchResult.iterations} nodes. Playing ${bestMove}.`,
      level: 4,
      mode: `${algoName} Search over Markov`,
    };
    return bestMove;
  },

  decide() {
    const level = this.getLevel();
    console.log(
      `%c[AI] Round ${gameState.round + 1} — Level ${level}`,
      "color:#60a5fa;font-weight:bold",
    );
    switch (level) {
      case 1:
        return this.level1();
      case 2:
        return this.level2();
      case 3:
        return this.level3();
      case 4:
        return this.level4();
    }
  },

  updateTransitionTable(playerMove) {
    const history = gameState.playerHistory;
    if (history.length < this.k + 1) return;
    const patternMoves = history.slice(-(this.k + 1), -1);
    const key = patternMoves.join(",");
    if (!this.transitionTable[key]) {
      this.transitionTable[key] = { Rock: 0, Paper: 0, Scissors: 0 };
    }
    this.transitionTable[key][playerMove]++;
  },

  reset() {
    this.transitionTable = {};
    this.prediction = {
      move: null,
      confidence: null,
      strategy: "",
      level: 1,
      mode: "",
    };
  },
};

const MOVE_ASSETS = {
  Rock: "assets/rock.png",
  Paper: "assets/paper.png",
  Scissors: "assets/scissors.png",
};

const RESULT_ASSETS = {
  win: "assets/win.png",
  lose: "assets/lose.png",
  draw: "assets/draw.png",
};

const uiRenderer = {
  els: {},

  init() {
    this.els = {
      scorePlayer: document.getElementById("score-player"),
      scoreAI: document.getElementById("score-ai"),
      scoreDraw: document.getElementById("score-draw"),
      scoreRound: document.getElementById("score-round"),
      playerEmoji: document.getElementById("player-emoji"),
      aiEmoji: document.getElementById("ai-emoji"),
      playerMoveName: document.getElementById("player-move-name"),
      aiMoveName: document.getElementById("ai-move-name"),
      resultText: document.getElementById("result-text"),
      aiLevelBadge: document.getElementById("ai-level-badge"),
      aiMode: document.getElementById("ai-mode"),
      aiPredicted: document.getElementById("ai-predicted"),
      aiConfidence: document.getElementById("ai-confidence"),
      aiConfidenceBar: document.getElementById("ai-confidence-bar"),
      aiStrategy: document.getElementById("ai-strategy"),
      statStreak: document.getElementById("stat-streak"),
      statBestStreak: document.getElementById("stat-best-streak"),
      statWinrate: document.getElementById("stat-winrate"),
      freqRock: document.getElementById("freq-rock"),
      freqPaper: document.getElementById("freq-paper"),
      freqScissors: document.getElementById("freq-scissors"),
      freqRockN: document.getElementById("freq-rock-n"),
      freqPaperN: document.getElementById("freq-paper-n"),
      freqScissorsN: document.getElementById("freq-scissors-n"),
      donutW: document.getElementById("donut-w"),
      donutL: document.getElementById("donut-l"),
      donutD: document.getElementById("donut-d"),
      matrixBody: document.getElementById("matrix-body"),
      historyList: document.getElementById("history-list"),
      toast: document.getElementById("toast"),
    };
  },

  updateScoreboard() {
    this.els.scorePlayer.textContent = gameState.playerScore;
    this.els.scoreAI.textContent = gameState.aiScore;
    this.els.scoreDraw.textContent = gameState.draws;
    this.els.scoreRound.textContent = gameState.round;
  },

  showThinking() {
    this.els.aiEmoji.innerHTML = " ";
    this.els.aiEmoji.classList.add("opacity-0");
    this.els.aiEmoji.classList.remove("opacity-100", "animate-pulse-win");
    this.els.aiMoveName.innerHTML = `
      <div class="flex gap-1 justify-center items-center h-[72px]">
        <span class="w-2.5 h-2.5 rounded-full bg-blue-400 thinking-dot"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-blue-400 thinking-dot [animation-delay:0.15s]"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-blue-400 thinking-dot [animation-delay:0.3s]"></span>
      </div>`;
  },

  revealMoves(playerMove, aiMove, result) {
    // Player
    this.els.playerEmoji.innerHTML = `<img src="${MOVE_ASSETS[playerMove]}" class="move-img" alt="${playerMove}">`;
    this.els.playerEmoji.classList.remove("opacity-0", "animate-pulse-win");
    this.els.playerEmoji.classList.add("opacity-100");
    this.els.playerMoveName.textContent = playerMove;

    // AI
    this.els.aiEmoji.innerHTML = `<img src="${MOVE_ASSETS[aiMove]}" class="move-img" alt="${aiMove}">`;
    this.els.aiEmoji.classList.remove("opacity-0", "animate-pulse-win");
    this.els.aiEmoji.classList.add("opacity-100");
    this.els.aiMoveName.textContent = aiMove;

    // Result text
    this.els.resultText.classList.remove(
      "text-emerald-400",
      "text-rose-400",
      "text-amber-400",
    );
    const resultImg = `<img src="${RESULT_ASSETS[result]}" class="w-8 h-8 object-contain" alt="">`;

    if (result === "win") {
      this.els.resultText.innerHTML = `${resultImg} <span class="ml-2">You Win!</span>`;
      this.els.resultText.classList.add("text-emerald-400");
      this.els.playerEmoji.classList.add("animate-pulse-win");
    } else if (result === "lose") {
      this.els.resultText.innerHTML = `${resultImg} <span class="ml-2">AI Wins!</span>`;
      this.els.resultText.classList.add("text-rose-400");
      this.els.aiEmoji.classList.add("animate-pulse-win");
    } else {
      this.els.resultText.innerHTML = `${resultImg} <span class="ml-2">Draw!</span>`;
      this.els.resultText.classList.add("text-amber-400");
    }
  },

  updateAIPanel() {
    const p = aiEngine.prediction;
    const levelLabels = {
      1: "Level 1 — Reflex Agent",
      2: "Level 2 — Model-Based Agent",
      3: "Level 3 — Learning Agent",
      4: "Level 4 — Search Agent",
    };
    this.els.aiLevelBadge.textContent = levelLabels[p.level] || levelLabels[1];
    this.els.aiMode.textContent = p.mode || "Random Selection";
    this.els.aiPredicted.innerHTML = p.move
      ? `<div class="flex items-center gap-2"><img src="${MOVE_ASSETS[p.move]}" class="w-5 h-5 object-contain" alt=""> ${p.move}</div>`
      : "—";
    this.els.aiConfidence.textContent = p.confidence || "—";

    const confVal = parseInt(p.confidence) || 0;
    this.els.aiConfidenceBar.style.width = confVal + "%";

    this.els.aiStrategy.textContent = p.strategy || "Waiting for data…";
  },

  updateStats() {
    const gs = gameState;
    this.els.statStreak.textContent = gs.streak;
    this.els.statBestStreak.textContent = gs.bestStreak;
    const total = gs.playerScore + gs.aiScore + gs.draws;
    this.els.statWinrate.textContent =
      total > 0 ? ((gs.playerScore / total) * 100).toFixed(1) + "%" : "0%";

    const maxFreq = Math.max(
      gs.moveCounts.Rock,
      gs.moveCounts.Paper,
      gs.moveCounts.Scissors,
      1,
    );

    this.els.freqRock.style.width = (gs.moveCounts.Rock / maxFreq) * 100 + "%";
    this.els.freqPaper.style.width =
      (gs.moveCounts.Paper / maxFreq) * 100 + "%";
    this.els.freqScissors.style.width =
      (gs.moveCounts.Scissors / maxFreq) * 100 + "%";
    this.els.freqRockN.textContent = gs.moveCounts.Rock;
    this.els.freqPaperN.textContent = gs.moveCounts.Paper;
    this.els.freqScissorsN.textContent = gs.moveCounts.Scissors;

    this.els.donutW.textContent = gs.playerScore;
    this.els.donutL.textContent = gs.aiScore;
    this.els.donutD.textContent = gs.draws;
  },

  updateMatrix() {
    const table = aiEngine.transitionTable;
    const keys = Object.keys(table).sort();
    const body = this.els.matrixBody;

    if (keys.length === 0) {
      body.innerHTML =
        '<div class="p-8 text-center text-slate-600 italic text-xs">Play 3 rounds to view model parameters...</div>';
      return;
    }

    const history = gameState.playerHistory;
    let activeKey = "";
    if (history.length >= aiEngine.k) {
      activeKey = history.slice(-aiEngine.k).join(",");
    }

    let html = "";
    keys.forEach((key) => {
      const e = table[key];
      const isActive = key === activeKey;
      html += `<div class="grid grid-cols-4 gap-2 items-center p-3 rounded-xl border transition-colors ${isActive ? "bg-blue-500/20 border-blue-500/30" : "bg-white/5 border-white/5"}">
        <div class="flex items-center gap-2 font-semibold ${isActive ? "text-blue-300" : "text-slate-300"}">
          ${key
            .split(",")
            .map(
              (m) =>
                `<img src="${MOVE_ASSETS[m]}" class="w-4 h-4 object-contain">`,
            )
            .join('<span class="opacity-30">→</span>')}
        </div>
        <div class="text-center text-slate-300 font-bold">${e.Rock}</div>
        <div class="text-center text-slate-300 font-bold">${e.Paper}</div>
        <div class="text-center text-slate-300 font-bold">${e.Scissors}</div>
      </div>`;
    });
    body.innerHTML = html;
  },

  updateHistory() {
    const list = this.els.historyList;
    const results = gameState.roundResults.slice(-10).reverse();
    if (results.length === 0) {
      list.innerHTML =
        '<div class="text-slate-600 text-center py-6 text-xs italic">No data yet</div>';
      return;
    }
    list.innerHTML = results
      .map((r, idx) => {
        const rClass =
          r.result === "win"
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            : r.result === "lose"
              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
              : "bg-amber-500/20 text-amber-400 border-amber-500/30";
        const rLabel =
          r.result === "win" ? "WIN" : r.result === "lose" ? "LOSS" : "DRAW";
        const rowBg = idx % 2 === 0 ? "bg-white/5" : "bg-white/[0.02]";
        return `<div class="flex items-center gap-3 p-3 rounded-xl ${rowBg} border border-white/5 text-[0.75rem] animate-slide-in">
        <span class="font-bold text-slate-600 min-w-[24px] text-center">#${r.round}</span>
        <div class="flex-1 font-medium text-slate-300 flex items-center gap-2">
           <img src="${MOVE_ASSETS[r.playerMove]}" class="w-5 h-5 object-contain"> vs <img src="${MOVE_ASSETS[r.aiMove]}" class="w-5 h-5 object-contain">
        </div>
        <span class="font-bold text-[0.6rem] px-2 py-0.5 rounded-full border ${rClass}">${rLabel}</span>
      </div>`;
      })
      .join("");
  },

  showToast(message, className, duration = 2500) {
    const t = this.els.toast;
    t.textContent = message;
    // Reset classes and apply base animation/positioning classes
    t.className = `toast-base px-8 py-4 rounded-2xl font-bold bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl ${className}`;

    // Trigger reflow to ensure the transition starts from the hidden state
    void t.offsetWidth;

    // Add the visible/active state class
    t.classList.add("toast-visible");

    // Hide after duration
    setTimeout(() => {
      t.classList.remove("toast-visible");
    }, duration);
  },

  resetUI() {
    this.updateScoreboard();
    this.els.playerEmoji.innerHTML = "";
    this.els.playerEmoji.classList.add("opacity-0");
    this.els.playerEmoji.classList.remove("opacity-100", "animate-pulse-win");
    this.els.aiEmoji.innerHTML = "";
    this.els.aiEmoji.classList.add("opacity-0");
    this.els.aiEmoji.classList.remove("opacity-100", "animate-pulse-win");
    this.els.playerMoveName.textContent = "";
    this.els.aiMoveName.textContent = "";
    this.els.resultText.innerHTML = "";
    this.els.resultText.className =
      "text-2xl font-bold min-h-[40px] flex items-center justify-center";
    this.updateAIPanel();
    this.updateStats();
    this.els.matrixBody.innerHTML =
      '<div class="p-8 text-center text-slate-600 italic text-xs">Play 3 rounds to view model parameters...</div>';
    this.updateHistory();
  },
};

function determineResult(player, ai) {
  if (player === ai) return "draw";
  if (
    (player === "Rock" && ai === "Scissors") ||
    (player === "Paper" && ai === "Rock") ||
    (player === "Scissors" && ai === "Paper")
  )
    return "win";
  return "lose";
}

function playRound(playerMove) {
  if (gameState.isProcessing) return;
  gameState.isProcessing = true;

  const btn = document.getElementById(`btn-${playerMove.toLowerCase()}`);
  document.querySelectorAll(".move-btn").forEach((b) => {
    b.classList.remove(
      "bg-white/20",
      "border-blue-500/50",
      "bg-blue-600",
      "border-blue-600",
      "hover:bg-blue-600/80",
    );
    b.classList.add("bg-white/10", "border-white/5");
    b.classList.add("opacity-50", "pointer-events-none");
  });
  btn.classList.remove("bg-white/10", "border-white/5", "opacity-50");
  btn.classList.add("bg-blue-600", "border-blue-600", "hover:bg-blue-600/80");

  const prevLevel =
    gameState.round > 0
      ? gameState.round < 4
        ? 1
        : gameState.round < 9
          ? 2
          : gameState.round < 14
            ? 3
            : 4
      : 0;
  const aiMove = aiEngine.decide();

  uiRenderer.els.playerEmoji.innerHTML = `<img src="${MOVE_ASSETS[playerMove]}" class="move-img" alt="${playerMove}">`;
  uiRenderer.els.playerEmoji.classList.remove("opacity-0", "animate-pulse-win");
  uiRenderer.els.playerEmoji.classList.add("opacity-100");
  uiRenderer.els.playerMoveName.textContent = playerMove;
  uiRenderer.els.resultText.textContent = "";

  uiRenderer.showThinking();

  setTimeout(() => {
    const result = determineResult(playerMove, aiMove);
    gameState.round++;

    if (result === "win") {
      gameState.playerScore++;
      gameState.streak++;
    } else if (result === "lose") {
      gameState.aiScore++;
      gameState.streak = 0;
    } else {
      gameState.draws++;
      gameState.streak = 0;
    }
    if (gameState.streak > gameState.bestStreak)
      gameState.bestStreak = gameState.streak;

    gameState.moveCounts[playerMove]++;
    gameState.playerHistory.push(playerMove);
    aiEngine.updateTransitionTable(playerMove);
    gameState.roundResults.push({
      round: gameState.round,
      playerMove,
      aiMove,
      result,
    });

    uiRenderer.revealMoves(playerMove, aiMove, result);
    uiRenderer.updateScoreboard();
    uiRenderer.updateStats();
    uiRenderer.updateMatrix();
    uiRenderer.updateHistory();

    const nextLevel = aiEngine.getLevel();
    if (nextLevel === 2) {
      const counts = gameState.moveCounts;
      const total = counts.Rock + counts.Paper + counts.Scissors;
      const max = Math.max(counts.Rock, counts.Paper, counts.Scissors);
      const topMoves = Object.keys(counts).filter((m) => counts[m] === max);
      const predicted = topMoves[0];
      const conf =
        total > 0 ? ((counts[predicted] / total) * 100).toFixed(0) + "%" : "—";
      aiEngine.prediction = {
        move: predicted,
        confidence: topMoves.length > 1 ? "Low (tie)" : conf,
        strategy: `Next round: most frequent move is ${predicted} (${counts[predicted]}/${total}). Will play ${aiEngine.getCounter(predicted)}.`,
        level: 2,
        mode: "Frequency Analysis",
      };
    } else if (nextLevel === 3) {
      const history = gameState.playerHistory;
      if (history.length >= aiEngine.k) {
        const lastK = history.slice(-aiEngine.k).join(",");
        if (aiEngine.transitionTable[lastK]) {
          const entry = aiEngine.transitionTable[lastK];
          const totalT = entry.Rock + entry.Paper + entry.Scissors;
          if (totalT > 0) {
            const probs = {
              Rock: entry.Rock / totalT,
              Paper: entry.Paper / totalT,
              Scissors: entry.Scissors / totalT,
            };
            const maxP = Math.max(probs.Rock, probs.Paper, probs.Scissors);
            const pred = Object.keys(probs).find((m) => probs[m] === maxP);
            aiEngine.prediction = {
              move: pred,
              confidence: (maxP * 100).toFixed(0) + "%",
              strategy: `Next round: pattern "${lastK}" → P(R):${(probs.Rock * 100).toFixed(0)}% P(P):${(probs.Paper * 100).toFixed(0)}% P(S):${(probs.Scissors * 100).toFixed(0)}%. Will predict ${pred} → play ${aiEngine.getCounter(pred)}.`,
              level: 3,
              mode: "Markov Model (k=2)",
            };
          }
        } else {
          aiEngine.prediction.strategy = `Next round: pattern "${lastK}" is new — will fall back to frequency analysis.`;
          aiEngine.prediction.confidence = "Low (new pattern)";
          aiEngine.prediction.level = 3;
          aiEngine.prediction.mode = "Markov Model (k=2)";
        }
      }
    } else if (nextLevel === 4) {
      const history = gameState.playerHistory;
      if (history.length >= aiEngine.k) {
        const playerSeq = aiEngine.predictPlayerSequence(3);
        const algos = ["BFS", "DFS", "UCS", "Greedy", "A*"];
        const algoName = algos[gameState.round % algos.length];
        const searchResult = aiEngine.runSearch(algoName, playerSeq);
        const aiSeq = searchResult.bestNode.moves;

        aiEngine.prediction = {
          move: playerSeq[0],
          confidence: "High (Search)",
          strategy: `Next round: Predict player seq [${playerSeq.join(", ")}]. ${algoName} Search optimal counter is [${aiSeq.join(", ")}]. Will play ${aiSeq[0]}.`,
          level: 4,
          mode: `${algoName} Search over Markov`,
        };
      }
    }
    uiRenderer.updateAIPanel();

    const newLevel = gameState.round < 4 ? 1 : gameState.round < 9 ? 2 : gameState.round < 14 ? 3 : 4;
    if (prevLevel > 0 && newLevel > prevLevel) {
      uiRenderer.showToast(
        `AI System upgraded to Level ${newLevel}!`,
        "bg-blue-500/10 text-blue-400 border-blue-500/20",
      );
    }

    document.querySelectorAll(".move-btn").forEach((b) => {
      b.classList.remove("opacity-50", "pointer-events-none");
    });
    gameState.isProcessing = false;
  }, 500);
}

function initEvents() {
  document.querySelectorAll(".move-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const move = btn.dataset.move;
      if (move) playRound(move);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (gameState.isProcessing) return;
    const key = e.key.toUpperCase();
    if (key === "R") playRound("Rock");
    else if (key === "P") playRound("Paper");
    else if (key === "S") playRound("Scissors");
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    gameState.reset();
    aiEngine.reset();
    uiRenderer.resetUI();
    document.querySelectorAll(".move-btn").forEach((b) => {
      b.classList.remove(
        "bg-blue-600",
        "border-blue-600",
        "hover:bg-blue-600/80",
      );
      b.classList.add("bg-white/10", "border-white/5");
    });
    uiRenderer.showToast(
      "All game data has been reset!",
      "bg-blue-500/10 text-blue-400 border-blue-500/20",
    );
  });
}

document.addEventListener("DOMContentLoaded", () => {
  uiRenderer.init();
  initEvents();
});

