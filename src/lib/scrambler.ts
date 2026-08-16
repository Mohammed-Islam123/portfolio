/**
 * Scrambler — shared text-scramble controller.
 *
 * Extracted from greeting.tsx so both the greeting rotation and the
 * hero name scramble can use the same engine without duplicating code.
 *
 * SCRAMBLE (Justin Windle / Aidan Wolter style, 2009-era classic)
 * When the word changes, each character rapidly cycles through
 * random glyphs before "settling" one-by-one into the final letter.
 * The effect reads as: `hello` → `bØn¿ÿr` → `b!n¥r` → `bonjour`
 * settling left-to-right (Latin) or right-to-left (Arabic).
 *
 * Character set adapts to the target language:
 *   • Latin targets — scramble through ASCII noise (!<>-_\\/[]{}—=+*^?#__________)
 *     — mostly spaces so it reads as "wind blowing through" rather than
 *     dense garbage.
 *   • Arabic target — scramble through Arabic letters so it reads as
 *     "Arabic being typed."
 *
 * Reveal order is random-but-deterministic per transition (shuffled
 * indices) so it doesn't look mechanical. ~60fps randomization during
 * the scramble, then settle one character every ~40ms.
 */

// Latin scramble charset — sparse, mostly spaces, gives the
// "wind blowing through" feel rather than dense garbage.
export const SCRAMBLE_LATIN = "!<>-_\\/[]{}—=+*^?#__________";
// Arabic scramble charset — a small set of Arabic letters so it reads
// as "Arabic being typed" rather than ASCII noise.
export const SCRAMBLE_ARABIC = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";

/**
 * isArabic — quick check whether a string contains Arabic characters.
 * Used to pick the right scramble charset.
 */
export function isArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

/**
 * Scrambler — a tiny controller that drives one scramble transition.
 *
 * Lifecycle:
 *   1. `start(fromText, toText)` — kicks off the rAF loop.
 *   2. Each frame:
 *      a. increment the "reveal queue" counter (one character settles
 *         every ~40ms);
 *      b. for each character position:
 *         - if its index is in the first N positions of the shuffled
 *           reveal order (where N = current reveal count), show the
 *           final character (settled);
 *         - otherwise show a random scramble char from the right
 *           charset;
 *         - positions beyond `toText.length` (when fromText is
 *           longer) collapse to empty.
 *      c. when N === toText.length, the scramble is done → call onDone.
 *   3. `cancel()` — stop the loop (used on unmount / rapid swaps).
 *
 * Reveal order is shuffled per-transition so the settle doesn't look
 * mechanical (not always left-to-right). For Arabic we shuffle the
 * indices but the visual direction is handled by `dir="auto"` on the
 * text span (RTL rendering), so the scramble chars still read LTR
 * in source order but render RTL — matches the target word's direction.
 */
export class Scrambler {
  private raf = 0;
  private startTs = 0;
  private revealOrder: number[] = [];
  private frame = 0;
  private onFrame: (text: string) => void;
  private onDone: () => void;
  private toText = "";
  private charset = SCRAMBLE_LATIN;

  constructor(onFrame: (text: string) => void, onDone: () => void) {
    this.onFrame = onFrame;
    this.onDone = onDone;
  }

  start(fromText: string, toText: string) {
    this.toText = toText;
    this.charset = isArabic(toText) ? SCRAMBLE_ARABIC : SCRAMBLE_LATIN;
    // build a shuffled reveal order [0..maxLen-1] so chars settle in
    // a random sequence — feels organic, not mechanical.
    const maxLen = Math.max(fromText.length, toText.length);
    this.revealOrder = Array.from({ length: maxLen }, (_, i) => i);
    for (let i = maxLen - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.revealOrder[i], this.revealOrder[j]] = [
        this.revealOrder[j],
        this.revealOrder[i],
      ];
    }
    this.startTs = performance.now();
    this.frame = 0;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    const elapsed = now - this.startTs;
    // settle one character every ~40ms (25 chars/sec settle rate),
    // and re-randomize the un-settled chars every frame (~60fps).
    const revealCount = Math.floor(elapsed / 40);
    const maxLen = this.toText.length;
    if (revealCount >= maxLen) {
      this.onFrame(this.toText);
      this.onDone();
      return;
    }
    // build the current scramble frame
    let out = "";
    for (let i = 0; i < this.toText.length; i++) {
      // is this position settled yet?
      const revealIndex = this.revealOrder.indexOf(i);
      if (revealIndex < revealCount) {
        out += this.toText[i];
      } else {
        // pick a random scramble char from the right charset
        out += this.charset[Math.floor(Math.random() * this.charset.length)];
      }
    }
    this.onFrame(out);
    this.frame++;
    this.raf = requestAnimationFrame(this.loop);
  };

  cancel() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
