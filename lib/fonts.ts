import { Cormorant_Garamond } from "next/font/google";

/** A serif reserved for numerals/figures - honor board ranks, the homepage's
 * trust-strip stat - deliberately not used for any running text (Cairo
 * covers everything else on the site). Latin-only glyphs, so it only ever
 * renders digits/roman numerals, never Arabic. */
export const royalSerif = Cormorant_Garamond({ weight: ["600", "700"], subsets: ["latin"] });
