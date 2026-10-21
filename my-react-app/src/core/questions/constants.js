export const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon'];
// Colours are semantic ids. The actual hex values live in CSS tokens (--shape-red ...),
// so a re-skin never touches game logic.
export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];

export const CATEGORIES = ['mixed', 'number', 'pattern', 'arithmetic'];
export const LEVELS = [1, 2, 3];

export const shapeKey = (item) => `${item.shape}:${item.color}`;
export const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export const lcm = (a, b) => (a * b) / gcd(a, b);

/**
 * @typedef {{ shape: string, color: string }} ShapeItem
 * @typedef {{ $t: string }} TranslatedRef   // a value the UI must translate, e.g. { $t: 'shape.star' }
 * @typedef {{
 *   kind: 'number' | 'shape' | 'arithmetic' | 'odd',
 *   category: 'number' | 'pattern' | 'arithmetic',
 *   prompt: string,                                  // i18n key suffix, looked up as q.<prompt>
 *   stem: { type: 'expr', text: string } | { type: 'numbers', nums: number[] } | { type: 'shapes', seq: ShapeItem[] } | null,
 *   optionType: 'text' | 'shape',
 *   options: Array<string | ShapeItem>,
 *   answerIndex: number,
 *   explain: { key: string, params: Record<string, string | number | TranslatedRef> },
 * }} Question
 */
