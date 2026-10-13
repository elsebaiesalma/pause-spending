import { PieceCard } from "./PieceCard";
import styles from "./lookbook.module.css";

export type ThumbPiece = {
  id: string;
  x: number;
  y: number;
  scale: number;
  zOrder: number;
  imageUrl: string | null;
  name: string;
  category: string | null;
};

// A saved look drawn small: the same pieces in the same places as on the
// board (positions are fractions of it, so any size works), with no labels.
export function LookThumb({ pieces }: { pieces: ThumbPiece[] }) {
  return (
    <div className={styles.thumb} aria-hidden="true">
      {[...pieces]
        .sort((a, b) => a.zOrder - b.zOrder)
        .map((piece) => (
          <div
            key={piece.id}
            className={styles.thumbPiece}
            style={{
              left: `${piece.x * 100}%`,
              top: `${piece.y * 100}%`,
              width: `${piece.scale * 100}%`,
              zIndex: piece.zOrder + 1,
            }}
          >
            <PieceCard name={piece.name} imageUrl={piece.imageUrl} category={piece.category} compact />
          </div>
        ))}
    </div>
  );
}
