"use client";
import { SimpleProvider } from "@/components/AppProviders";
import * as anchor from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Jersey_10 } from "next/font/google";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const jersey = Jersey_10({ weight: '400', style: 'normal', subsets: ['latin'] })

const PROGRAM_ID = new PublicKey("wfPweCVfGH5o7VnE2rJwwaycaHu2Jgio9vfFoxDgame");

const GRID_ROWS = 15;
const GRID_COLS = 20;

export default function GamePage() {
  const { publicKey, signTransaction, disconnect, connected } = useWallet();

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isGameInitialized, setIsGameInitialized] = useState(false);

  const positionPDA = useMemo(() => {
    if (!publicKey) return null;
    return PublicKey.findProgramAddressSync(
      [Buffer.from("position"), publicKey.toBuffer()],
      PROGRAM_ID
    )[0];
  }, [publicKey]);

  const connection = useMemo(() => {
    if (isGameInitialized) {
      return new Connection("https://devnet.magicblock.app/", {
        wsEndpoint: "wss://devnet.magicblock.app/",
      })
    }
    return new Connection("https://api.devnet.solana.com", "confirmed")
  }, [isGameInitialized]);
  const tempKeypair = useRef<Keypair | null>(null);
  const gameClient = useRef<anchor.Program | null>(null);
  const provider = useRef<anchor.Provider>(new SimpleProvider(connection));

  const getProgramClient = useCallback(
    async (program: PublicKey): Promise<anchor.Program> => {
      const idl = await anchor.Program.fetchIdl(program, provider.current);
      if (!idl) throw new Error("IDL not found");
      return new anchor.Program(idl, provider.current);
    },
    []
  );

  // Initialize game and fetch position
  useEffect(() => {
    async function initGame() {
      if (!publicKey || !positionPDA || !signTransaction || isGameInitialized) return;

      tempKeypair.current = Keypair.fromSeed(publicKey.toBytes());

      gameClient.current = await getProgramClient(PROGRAM_ID);
      if (!gameClient.current) return;

      const accountInfo = await provider.current.connection.getAccountInfo(positionPDA);

      if (!accountInfo) {
        // Initialize PDA on-chain if missing
        const ix1 = await gameClient.current.methods
          .initialize()
          .accounts({
            position: positionPDA,
            user: publicKey,
          })
          .instruction();

        const ix2 = await gameClient.current.methods
          .delegate()
          .accounts({
            position: positionPDA,
            payer: publicKey,
          })
          .instruction();

        const tx = new anchor.web3.Transaction().add(ix1, ix2);

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.feePayer = publicKey;
        tx.recentBlockhash = blockhash;

        const signedTx = await signTransaction(tx);
        const txHash = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });

        await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight }, "processed");

        toast.success("Game Initialized");
      }

      setIsGameInitialized(true);
    }

    if (isGameInitialized && publicKey && positionPDA) {
      const fetchInitialState = async () => {
        const accountInfo = await connection.getAccountInfo(positionPDA);
        if (accountInfo && accountInfo.data.length >= 11) {
          const x = accountInfo.data[9];
          const y = accountInfo.data[10];
          console.log(`Current position: (${x}, ${y})`);

          setPosition({ x, y });
        } else {
          setPosition({ x: 1, y: 1 });
        }
      }

      fetchInitialState();
    }

    initGame();
  }, [connected, getProgramClient, positionPDA, publicKey, signTransaction, connection]);

  // Move player on grid and update on-chain position
  const movePlayer = async (dx: number, dy: number) => {
    if (!position) return;
    const newX = Math.min(GRID_COLS - 2, Math.max(1, position.x + dx));
    const newY = Math.min(GRID_ROWS - 2, Math.max(1, position.y + dy));

    // Prevent move into walls (edges)
    if (newX === position.x && newY === position.y) return;

    setPosition({ x: newX, y: newY });

    // Update on-chain position
    if (!gameClient.current || !positionPDA || !publicKey || !signTransaction) return;

    try {
      const tx = await gameClient.current.methods
        .updatePosition(publicKey, newX, newY)
        .accounts({
          position: positionPDA,
        })
        .transaction();

      const { value: { blockhash, lastValidBlockHeight } } = await connection.getLatestBlockhashAndContext();

      if (!tx) {
        console.error("Failed to build move transaction");
        return;
      }

      tx.recentBlockhash = blockhash;
      tx.feePayer = tempKeypair.current?.publicKey;
      tx.sign(tempKeypair.current!);

      const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");
    } catch (err) {
      console.error("Failed to send move transaction:", err);
      toast.error("Move failed");
    }
  };

  // Keyboard controls for movement
  useEffect(() => {
    if (!isGameInitialized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "w":
        case "ArrowUp":
          movePlayer(0, -1);
          break;
        case "s":
        case "ArrowDown":
          movePlayer(0, 1);
          break;
        case "a":
        case "ArrowLeft":
          movePlayer(-1, 0);
          break;
        case "d":
        case "ArrowRight":
          movePlayer(1, 0);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameInitialized, position]);

  const handleClick = () => {
    if (publicKey) {
      disconnect();
    } else {
      const button = document.querySelector('.wallet-adapter-button') as HTMLElement;
      if (button) button.click();
    }
  };

  // Render grid cells + player
  const renderGrid = () => {
    const cells = [];
    if (!position) return;

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const isWall = (x === 0 || y === 0 || x === GRID_COLS - 1 || y === GRID_ROWS - 1);
        const isPlayer = position.x === x && position.y === y;

        // Alternate tiles
        const bgTile = (x + y) % 2 === 0 ? "/tile-1.png" : "/tile-2.png";

        cells.push(
          <div
            key={`${x}-${y}`}
            style={{
              backgroundImage: isWall ? undefined : `url(${bgTile})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            className={`w-10 h-10 border border-gray-600 flex items-center justify-center
            ${isWall ? "bg-brown-700" : ""}
          `}
          >
            {isPlayer && (
              <img
                src="/player.png"
                alt="Player"
                className="w-10 h-10 object-contain"
              />
            )}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div
      className={`w-full min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 space-y-6 ${jersey.className}`}
    >
      <button
        className="px-6 py-3 absolute top-4 right-4 text-lg md:text-2xl font-bold text-yellow-300 bg-gray-900 border-4 border-yellow-300 rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,0.8)] hover:bg-yellow-400 hover:text-gray-900 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-150"
        onClick={handleClick}
      >
        {publicKey ? "DISCONNECT WALLET" : "CONNECT WALLET"}
      </button>
      <div className="hidden">
        <WalletMultiButton />
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 2.5rem)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 2.5rem)`,
          gap: '2px',
          border: '4px solid #444',
          backgroundColor: '#222',
          borderRadius: '0.5rem',
          userSelect: 'none',
        }}
      >
        {renderGrid()}
      </div>
    </div>
  );
}
