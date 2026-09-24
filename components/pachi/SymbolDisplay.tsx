import { symbolImagePath, type Symbols } from "./pachinko-game";
import styles from "./SymbolDisplay.module.css";

export interface SymbolDisplayProps {
  symbols: Symbols;
  moving: [boolean, boolean, boolean];
  reach: boolean;
  jackpot: boolean;
  dimmed: boolean;
}

export function SymbolDisplay({ symbols, moving, reach, jackpot, dimmed }: SymbolDisplayProps) {
  return (
    <div
      className={styles.display}
      role="img"
      aria-label={`図柄 左${symbols[0]}、中${symbols[1]}、右${symbols[2]}`}
      data-jackpot={jackpot}
      data-dimmed={dimmed}
    >
      {symbols.map((symbol, index) => (
        <div
          key={index}
          className={styles.symbol}
          data-moving={moving[index]}
          data-highlight={reach && index !== 1 && !moving[index]}
        >
          <div key={`${symbol}-${moving[index] ? "moving" : "stopped"}`} className={styles.symbolMotion}>
            {/* Native images share the preload cache and preserve the supplied artwork. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.image}
              src={symbolImagePath(symbol)}
              alt=""
              width={1254}
              height={1254}
              decoding="async"
              draggable={false}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
