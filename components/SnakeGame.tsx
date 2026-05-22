"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAptosWallet } from "./AptosWalletProvider";
import { Play, RotateCcw, AlertTriangle, ArrowRight, Award, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };

interface SnakeGameProps {
  onScoreSubmitted: (score: number) => void;
}

export const SnakeGame: React.FC<SnakeGameProps> = ({ onScoreSubmitted }) => {
  const {
    isConnected,
    isNetworkWrong,
    balance,
    signAndSubmitTransaction
  } = useAptosWallet();

  // Game states: IDLE, PAYING_ENTRY, PLAYING, PAUSED, GAME_OVER, SUBMITTING_SCORE, SCORE_SUBMITTED
  const [gameState, setGameState] = useState<"IDLE" | "PAYING_ENTRY" | "PLAYING" | "PAUSED" | "GAME_OVER" | "SUBMITTING_SCORE" | "SCORE_SUBMITTED">("IDLE");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [selectedSpeedMode, setSelectedSpeedMode] = useState<"SLOW" | "NORMAL" | "FAST" | "INSANE">("NORMAL");

  const speedMap = {
    SLOW: 200,
    NORMAL: 160,
    FAST: 120,
    INSANE: 80
  };

  // Audio Context for synthesized retro SFX
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Snake mechanics references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
  const directionRef = useRef<Direction>("RIGHT");
  const nextDirectionRef = useRef<Direction>("RIGHT");
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const renderFrameRef = useRef<number | null>(null);  // rAF handle
  const gameStateRef = useRef<string>("IDLE");          // mirror of gameState for rAF closure
  const speedRef = useRef(160); // ms per step
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const GRID_SIZE = 20;

  // ─── Imperative canvas draw ─────────────────────────────────────────────────
  // Called directly from gameStep (every physics tick) so the snake actually
  // moves on screen. Does NOT depend on React state — reads only from refs.
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = "rgba(80, 40, 160, 0.25)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvas.width; i += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Food
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ff007f";
    ctx.fillStyle   = "#ff007f";
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
      foodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 2, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle  = "#ffffff";
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * GRID_SIZE + GRID_SIZE / 2 - 1,
      foodRef.current.y * GRID_SIZE + GRID_SIZE / 2 - 1,
      2, 0, Math.PI * 2
    );
    ctx.fill();

    // Snake
    snakeRef.current.forEach((segment, index) => {
      ctx.shadowBlur  = 12;
      ctx.shadowColor = "#00ff66";
      ctx.fillStyle   = index === 0 ? "#00ff66" : "rgba(0,255,102,0.75)";
      if (index === 0) {
        ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        ctx.shadowBlur = 0;
        ctx.fillStyle  = "#06060c";
        ctx.fillRect(segment.x * GRID_SIZE + 5,  segment.y * GRID_SIZE + 5, 3, 3);
        ctx.fillRect(segment.x * GRID_SIZE + 12, segment.y * GRID_SIZE + 5, 3, 3);
      } else {
        ctx.fillRect(segment.x * GRID_SIZE + 2, segment.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      }
    });
    ctx.shadowBlur = 0;
  };

  // Synthesize retro bleeps and boops
  const playSound = (type: "eat" | "die" | "coin" | "level") => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === "eat") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "die") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "coin") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.16); // D6
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "level") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.3); // C6
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.log("Audio not supported or blocked", e);
    }
  };

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "PLAYING") return;

      const key = e.key.toUpperCase();

      // ─── Block ALL page scrolling during gameplay ────────────────────────
      // Must be called BEFORE any other logic. e.key is mixed-case ("ArrowUp")
      // so we compare against the already-uppercased `key` variable.
      const gameKeys = ["ARROWUP", "ARROWDOWN", "ARROWLEFT", "ARROWRIGHT", "W", "A", "S", "D", " "];
      if (gameKeys.includes(key)) {
        e.preventDefault();
      }

      const currentDir = directionRef.current;

      if ((key === "ARROWUP" || key === "W") && currentDir !== "DOWN") {
        nextDirectionRef.current = "UP";
      } else if ((key === "ARROWDOWN" || key === "S") && currentDir !== "UP") {
        nextDirectionRef.current = "DOWN";
      } else if ((key === "ARROWLEFT" || key === "A") && currentDir !== "RIGHT") {
        nextDirectionRef.current = "LEFT";
      } else if ((key === "ARROWRIGHT" || key === "D") && currentDir !== "LEFT") {
        nextDirectionRef.current = "RIGHT";
      }
    };

    // `passive: false` is required so that e.preventDefault() is allowed
    // (some browsers register scroll listeners as passive by default)
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Real-time network verification listener
  // If network becomes wrong during play, pause the game
  useEffect(() => {
    if (isNetworkWrong && gameState === "PLAYING") {
      setGameState("PAUSED");
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      window.dispatchEvent(new Event("snake_game_end"));
    }
  }, [isNetworkWrong, gameState]);

  // ─── requestAnimationFrame render loop ─────────────────────────────────────
  // Keeps canvas in sync with snakeRef even between physics ticks.
  useEffect(() => {
    gameStateRef.current = gameState;

    if (gameState === "PLAYING") {
      const loop = () => {
        drawCanvas();
        if (gameStateRef.current === "PLAYING") {
          renderFrameRef.current = requestAnimationFrame(loop);
        }
      };
      renderFrameRef.current = requestAnimationFrame(loop);
    } else {
      // For non-playing states just draw once (shows food/snake position)
      drawCanvas();
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
      }
    }

    return () => {
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Start payment for game session
  const initiatePlayGame = async () => {
    if (!isConnected) {
      setErrorText("Please connect your wallet first.");
      return;
    }
    if (isNetworkWrong) {
      setErrorText("Please switch to Shelbynet Testnet network.");
      return;
    }

    if (balance < 0.001) {
      setErrorText("Insufficient funds! Mint mock ShelbyUSD from Faucet.");
      return;
    }

    setErrorText(null);
    setGameState("PAYING_ENTRY");
    playSound("coin");

    try {
      const payload = {
        type: "entry_function_payload",
        function: "0x75ae89e208f02fc681cc308f9cd505242a22a805e09ba21ca15732e86df0169d::snake_arcade::pay_game_entry",
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [] // Cost is hardcoded in the contract
      };

      await signAndSubmitTransaction(payload);
      startGameSession();
    } catch (e) {
      console.error(e);
      setGameState("IDLE");
      setErrorText("Entry fee transaction was cancelled or failed.");
    }
  };

  // Start the actual game loop after paying entry fee
  const startGameSession = () => {
    playSound("level");
    setScore(0);
    speedRef.current = speedMap[selectedSpeedMode];
    directionRef.current = "RIGHT";
    nextDirectionRef.current = "RIGHT";
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    spawnFood();
    setGameState("PLAYING");
    window.dispatchEvent(new Event("snake_game_start"));

    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    gameIntervalRef.current = setInterval(gameStep, speedRef.current);
  };

  const spawnFood = () => {
    let foodX = Math.floor(Math.random() * 20);
    let foodY = Math.floor(Math.random() * 20);

    // Make sure food doesn't land on snake
    while (snakeRef.current.some(segment => segment.x === foodX && segment.y === foodY)) {
      foodX = Math.floor(Math.random() * 20);
      foodY = Math.floor(Math.random() * 20);
    }

    foodRef.current = { x: foodX, y: foodY };
  };

  // Snake physical updates
  const gameStep = () => {
    directionRef.current = nextDirectionRef.current;
    const head = { ...snakeRef.current[0] };

    // Move head coordinate
    switch (directionRef.current) {
      case "UP": head.y -= 1; break;
      case "DOWN": head.y += 1; break;
      case "LEFT": head.x -= 1; break;
      case "RIGHT": head.x += 1; break;
    }

    // Wrap-around at edges — doosri side se aao, game over mat ho
    if (head.x < 0)   head.x = 19;
    if (head.x >= 20) head.x = 0;
    if (head.y < 0)   head.y = 19;
    if (head.y >= 20) head.y = 0;

    // Game over only on self-collision (apne body se takrana)
    if (snakeRef.current.some(segment => segment.x === head.x && segment.y === head.y)) {
      triggerGameOver();
      return;
    }

    const nextSnake = [head, ...snakeRef.current];

    // Check if food collected
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      playSound("eat");
      setScore(prev => {
        const nextScore = prev + 1;
        if (nextScore > highScore) setHighScore(nextScore);
        
        // Ramping up speed smoothly based on initial selection
        const baseSpeed = speedMap[selectedSpeedMode];
        const newSpeed = Math.max(60, baseSpeed - nextScore * 3.5);
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
        speedRef.current = newSpeed;
        gameIntervalRef.current = setInterval(gameStep, speedRef.current);

        return nextScore;
      });
      spawnFood();
    } else {
      nextSnake.pop(); // Remove tail segment
    }

    snakeRef.current = nextSnake;
  };

  const triggerGameOver = () => {
    playSound("die");
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    setGameState("GAME_OVER");
    window.dispatchEvent(new Event("snake_game_end"));
  };

  // Pay 0.001 ShelbyUSD to record high score
  const handleScoreSubmission = async () => {
    if (balance < 0.001) {
      setErrorText("Insufficient balance to submit score. Mint ShelbyUSD.");
      return;
    }

    setErrorText(null);
    setGameState("SUBMITTING_SCORE");
    playSound("coin");

    try {
      const payload = {
        type: "entry_function_payload",
        function: "0x75ae89e208f02fc681cc308f9cd505242a22a805e09ba21ca15732e86df0169d::snake_arcade::submit_score",
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [score.toString()] // Score only, cost is hardcoded in contract
      };

      await signAndSubmitTransaction(payload);
      
      // Trigger celebrate confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00ff66", "#ff007f", "#00e5ff"]
      });

      setGameState("SCORE_SUBMITTED");
      onScoreSubmitted(score);
    } catch (e) {
      console.error(e);
      setGameState("GAME_OVER");
      setErrorText("Score submission rejected or failed.");
    }
  };

  // Handle cleanup
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      window.dispatchEvent(new Event("snake_game_end"));
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Top dashboard */}
      <div className="w-full max-w-lg bg-cyber-panel border border-cyber-border rounded-xl p-4 mb-4 flex items-center justify-between shadow-2xl font-cyber">
        <div>
          <span className="text-[10px] text-cyber-dim block tracking-wider uppercase">SCORE</span>
          <span className="text-xl font-bold text-neon-green">{score}</span>
        </div>

        <div className="flex items-center gap-2 bg-cyber-bg px-4 py-2 border border-cyber-border rounded-lg">
          <Trophy className="w-4 h-4 text-neon-yellow animate-pulse" />
          <div>
            <span className="text-[9px] text-cyber-dim block tracking-wider uppercase">HI-SCORE</span>
            <span className="text-sm font-bold text-neon-yellow">{highScore}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] text-cyber-dim block tracking-wider uppercase mb-1">SPEED</span>
          {gameState === "IDLE" ? (
            <select
              value={selectedSpeedMode}
              onChange={(e) => setSelectedSpeedMode(e.target.value as any)}
              className="bg-black bg-opacity-40 border border-cyber-border text-xs text-cyber-blue font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-neon-blue transition-colors appearance-none"
              style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
            >
              <option value="SLOW">SLOW</option>
              <option value="NORMAL">NORMAL</option>
              <option value="FAST">FAST</option>
              <option value="INSANE">INSANE 💀</option>
            </select>
          ) : (
            <span className="text-sm font-semibold text-cyber-blue">
              {gameState === "PLAYING" ? `${Math.round(1000 / speedRef.current)} ticks/s` : "STANDBY"}
            </span>
          )}
        </div>
      </div>

      {/* Game Window Container */}
      <div
        ref={containerRef}
        className={`relative bg-cyber-panel border-4 border-cyber-border rounded-2xl shadow-2xl p-2 transition-transform duration-100 ${
          isShaking ? "animate-bounce" : ""
        } ${gameState === "PLAYING" ? "border-neon-green shadow-neon-green" : ""}`}
        style={{
          boxShadow: gameState === "PLAYING" ? "0 0 25px rgba(0,255,102,0.3)" : "none",
          transform: isShaking ? "translate(3px, 3px) rotate(1deg)" : "none"
        }}
      >
        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="rounded-lg bg-cyber-bg block max-w-full"
          style={{ width: "400px", height: "400px" }}
        />

        {/* Scanlines overlay on game board for nostalgic look */}
        <div className="absolute inset-2 rounded-lg pointer-events-none overflow-hidden opacity-[0.06] crt-screen"></div>

        {/* Overlays according to game states */}

        {/* 1. IDLE Screen */}
        {gameState === "IDLE" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-fade-in border border-purple-800 border-opacity-40" style={{ background: "rgba(10,5,25,0.92)", backdropFilter: "blur(8px)" }}>
            <span className="font-arcade text-cyber-pink text-xs animate-bounce tracking-widest block uppercase mb-4">
              INSERT COIN TO START
            </span>
            <h2 className="font-cyber text-2xl font-black text-white tracking-widest mb-6">
              Snake On Shelby
            </h2>
            <p className="text-xs text-cyber-text max-w-xs leading-relaxed mb-6 font-medium">
              Pay entry fee of <strong className="text-neon-green">0.001 ShelbyUSD</strong> on Shelbynet Testnet to play and earn high scores!
            </p>

            <button
              onClick={initiatePlayGame}
              disabled={isNetworkWrong}
              className="px-8 py-3.5 rounded-xl font-cyber text-xs font-black tracking-widest transition-all uppercase flex items-center gap-2 hover:scale-105 active:scale-95"
              style={isNetworkWrong ? {
                background: "#14142b",
                border: "1px solid #1f1f3e",
                color: "#62628a",
                cursor: "not-allowed",
              } : {
                background: "linear-gradient(135deg, #00c853 0%, #00ff66 100%)",
                boxShadow: "0 0 24px rgba(0,255,102,0.55), 0 0 48px rgba(0,255,102,0.25)",
                color: "#06060c",
                fontWeight: "900",
              }}
            >
              <Play className="w-4 h-4 fill-current" />
              PLAY GAME
            </button>

            {isNetworkWrong && (
              <span className="text-[10px] text-cyber-pink font-semibold mt-3 animate-pulse">
                * Please switch wallet to Shelbynet Testnet
              </span>
            )}
          </div>
        )}

        {/* 2. Transaction Pending Overlay */}
        {gameState === "PAYING_ENTRY" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-fade-in border border-purple-800 border-opacity-40" style={{ background: "rgba(10,5,25,0.95)", backdropFilter: "blur(8px)" }}>
            <span className="w-8 h-8 border-4 border-cyber-blue border-t-transparent rounded-full animate-spin mb-4"></span>
            <span className="font-arcade text-cyber-blue text-[9px] tracking-wider uppercase block mb-3 animate-pulse-slow">
              PROCESSING TRANSACTION...
            </span>
            <p className="text-xs text-cyber-text font-medium max-w-xs leading-relaxed">
              Confirm the entry fee payment of exactly <strong className="text-neon-green">0.001 ShelbyUSD</strong> in your Petra Wallet popup window to initiate gameplay.
            </p>
          </div>
        )}

        {/* 3. Paused Overlay (Wrong Network mid game) */}
        {gameState === "PAUSED" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-purple-800 border-opacity-40" style={{ background: "rgba(10,5,25,0.95)", backdropFilter: "blur(8px)" }}>
            <AlertTriangle className="w-12 h-12 text-cyber-pink animate-bounce mb-3" />
            <span className="font-arcade text-cyber-pink text-xs tracking-wider uppercase block mb-3">
              GAME PAUSED
            </span>
            <p className="text-xs text-cyber-text font-medium max-w-xs leading-relaxed mb-4">
              Wrong network detected! The game has been immediately paused to secure your gameplay. Reconnect to Shelbynet Testnet to resume!
            </p>
          </div>
        )}

        {/* 4. Game Over Modal */}
        {gameState === "GAME_OVER" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-fade-in border border-purple-800 border-opacity-40" style={{ background: "rgba(10,5,25,0.95)", backdropFilter: "blur(8px)" }}>
            <h2 className="font-arcade text-cyber-pink text-sm tracking-wider uppercase block mb-6 animate-pulse">
              GAME OVER
            </h2>

            <div className="bg-cyber-panel border border-cyber-border rounded-xl p-4 mb-6 w-full max-w-xs flex justify-around">
              <div>
                <span className="text-[10px] text-cyber-dim block tracking-wider uppercase font-cyber">FINAL SCORE</span>
                <span className="text-2xl font-bold text-neon-green">{score}</span>
              </div>
              <div className="border-r border-cyber-border"></div>
              <div>
                <span className="text-[10px] text-cyber-dim block tracking-wider uppercase font-cyber">HIGHEST</span>
                <span className="text-2xl font-bold text-neon-yellow">{highScore}</span>
              </div>
            </div>

            <p className="text-xs text-cyber-text max-w-xs leading-relaxed mb-6 font-medium">
              Submit your score to the global leaderboard! Triggers a payment of <strong className="text-neon-green">0.001 ShelbyUSD</strong>.
            </p>

            <div className="flex gap-3 font-cyber text-[10px]">
              <button
                onClick={startGameSession}
                className="px-5 py-3 bg-cyber-bg hover:bg-cyber-border border border-cyber-border rounded-lg text-cyber-text hover:text-neon-green transition-all"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={handleScoreSubmission}
                disabled={score === 0}
                className="px-6 py-3 rounded-lg font-cyber text-[10px] font-bold tracking-widest transition-all uppercase flex items-center gap-1 hover:scale-105 active:scale-95"
                style={score === 0 ? {
                  background: "#14142b",
                  color: "#62628a",
                  opacity: "0.5",
                  cursor: "not-allowed",
                } : {
                  background: "linear-gradient(135deg, #00c853 0%, #00ff66 100%)",
                  boxShadow: "0 0 20px rgba(0,255,102,0.5), 0 0 40px rgba(0,255,102,0.2)",
                  color: "#06060c",
                  fontWeight: "900",
                }}
              >
                SUBMIT SCORE
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 5. Submitting Score transaction pending */}
        {gameState === "SUBMITTING_SCORE" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-fade-in border border-purple-800 border-opacity-40" style={{ background: "rgba(10,5,25,0.95)", backdropFilter: "blur(8px)" }}>
            <span className="w-8 h-8 border-4 border-cyber-pink border-t-transparent rounded-full animate-spin mb-4"></span>
            <span className="font-arcade text-cyber-pink text-[9px] tracking-wider uppercase block mb-3 animate-pulse-slow">
              RECORDING SCORE ON-CHAIN...
            </span>
            <p className="text-xs text-cyber-text font-medium max-w-xs leading-relaxed">
              Confirming <strong className="text-neon-green">0.001 ShelbyUSD</strong> payment in Petra Wallet. Syncing score with the decentralized leaderboard storage...
            </p>
          </div>
        )}

        {/* 6. Score Submitted successfully */}
        {gameState === "SCORE_SUBMITTED" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-fade-in border border-purple-800 border-opacity-40" style={{ background: "rgba(10,5,25,0.95)", backdropFilter: "blur(8px)" }}>
            <Award className="w-12 h-12 text-neon-yellow animate-bounce mb-3" />
            <h2 className="font-cyber text-xl font-bold text-white tracking-widest mb-2">
              SCORE SUBMITTED!
            </h2>
            <p className="text-xs text-cyber-text max-w-xs leading-relaxed mb-6 font-medium">
              Your final score of <strong className="text-neon-green">{score}</strong> is successfully recorded on Shelbynet Testnet. Check the global leaderboard rankings below!
            </p>

            <button
              onClick={() => {
                setGameState("IDLE");
                setScore(0);
              }}
              className="px-6 py-3 font-cyber text-xs rounded-lg font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #00c853 0%, #00ff66 100%)",
                boxShadow: "0 0 20px rgba(0,255,102,0.5), 0 0 40px rgba(0,255,102,0.2)",
                color: "#06060c",
              }}
            >
              CONTINUE TO ARCADE
            </button>
          </div>
        )}
      </div>

      {/* Error Notices Banner */}
      {errorText && (
        <div className="mt-4 px-4 py-2.5 bg-cyber-pink bg-opacity-10 border border-cyber-pink border-opacity-35 rounded-lg text-cyber-pink font-cyber text-[10px] uppercase text-center animate-pulse tracking-wide">
          [ERROR] {errorText}
        </div>
      )}

      {/* Controls Tips */}
      <div className="mt-4 text-center text-xs text-cyber-dim font-medium leading-relaxed max-w-xs">
        Use <kbd className="px-1.5 py-0.5 bg-cyber-border rounded font-mono text-[10px] text-cyber-text">WASD</kbd> or{" "}
        <kbd className="px-1.5 py-0.5 bg-cyber-border rounded font-mono text-[10px] text-cyber-text">Arrow Keys</kbd> to steer the snake. Collecting food speeds up gameplay.
      </div>
    </div>
  );
};
