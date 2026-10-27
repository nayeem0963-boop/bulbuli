/**
 * Bulbuli's HTML Architect 3D — Level definitions
 *
 * Each level teaches a small group of HTML tags. Writing those tags correctly
 * "builds" matching 3D objects in the scene (see the "3dUnlocks" map).
 *
 * Level shape:
 *   id            number   – unique, ordered from 1
 *   title         string   – shown in the level picker
 *   instructions  string   – what the player has to do
 *   starterCode   string   – pre-filled editor contents
 *   targetTags    string[] – tags that MUST appear in the player's code
 *   hintText      string   – shown when the player asks for help
 *   "3dUnlocks"   object   – tag name -> 3D object key spawned in the scene
 *                            (quoted key: identifiers can't start with a digit,
 *                             so read it as level["3dUnlocks"])
 *
 * Optional validation extras (used by htmlValidator.js):
 *   nestingRules        – where tags must live. Rule kinds:
 *                           { tag, parent: 'x' | ['x','y'] | null }  every <tag> is a direct child of x (null = top level)
 *                           { tag, ancestor: 'x' }                   every <tag> is somewhere inside x
 *                           { tag, contains: 'x' }                   at least one <tag> has an <x> inside it
 *   requiredAttributes  – { tag: ['attr', ...] } every <tag> must have these attributes (non-empty)
 */

export const LEVELS = [
  {
    id: 1,
    title: 'Foundational Structure',
    instructions:
      'Every building needs a frame! Wrap your page in an <html> element. ' +
      'Inside it, add a <head> (the roof, for page info) and a <body> (the floor, for everything people see). ' +
      'Remember to close every tag you open.',
    starterCode: `<!DOCTYPE html>
<!-- Step 1: open an <html> tag -->

  <!-- Step 2: add a <head> ... </head> -->

  <!-- Step 3: add a <body> ... </body> -->

<!-- Step 4: close the </html> tag -->
`,
    targetTags: ['html', 'head', 'body'],
    hintText:
      'The <head> and <body> sit side by side INSIDE <html>, like this: ' +
      '<html> <head></head> <body></body> </html>',
    '3dUnlocks': {
      html: 'FOUNDATION_SLAB',
      head: 'ROOF_FRAME',
      body: 'MAIN_FLOOR',
    },
    nestingRules: [
      { tag: 'html', parent: null },
      { tag: 'head', parent: 'html' },
      { tag: 'body', parent: 'html' },
    ],
    requiredAttributes: {},
  },

  {
    id: 2,
    title: 'Text & Headings',
    instructions:
      'Time to decorate! Inside the <body>, add a big <h1> heading for your building\'s name, ' +
      'then a <div> box that holds a <p> paragraph describing it.',
    starterCode: `<!DOCTYPE html>
<html>
  <head>
    <title>My Building</title>
  </head>
  <body>
    <!-- Add an <h1> heading here -->

    <!-- Add a <div> with a <p> paragraph inside it -->

  </body>
</html>
`,
    targetTags: ['h1', 'p', 'div'],
    hintText:
      'A heading looks like <h1>Bulbuli Tower</h1>. ' +
      'Put the paragraph inside the box: <div><p>Welcome!</p></div>',
    '3dUnlocks': {
      h1: 'NEON_SIGN',
      p: 'NOTICE_BOARD',
      div: 'ROOM_PARTITION',
    },
    nestingRules: [
      { tag: 'h1', ancestor: 'body' },
      { tag: 'p', ancestor: 'body' },
      { tag: 'div', ancestor: 'body' },
      { tag: 'div', contains: 'p' },
    ],
    requiredAttributes: {},
  },

  {
    id: 3,
    title: 'Media & Links',
    instructions:
      'Hang a picture on the wall with an <img> tag (give it a src and an alt description), ' +
      'then add an <a> link with an href so visitors can travel somewhere new.',
    starterCode: `<!DOCTYPE html>
<html>
  <head>
    <title>My Gallery</title>
  </head>
  <body>
    <h1>Bulbuli's Gallery</h1>

    <!-- Add an <img> with src and alt attributes -->

    <!-- Add an <a> link with an href attribute -->

  </body>
</html>
`,
    targetTags: ['img', 'a'],
    hintText:
      '<img> is a "void" tag — it never gets a closing tag: <img src="bird.png" alt="A bulbul bird">. ' +
      'A link wraps its text: <a href="https://example.com">Visit</a>',
    '3dUnlocks': {
      img: 'PICTURE_FRAME',
      a: 'PORTAL_DOOR',
    },
    nestingRules: [
      { tag: 'img', ancestor: 'body' },
      { tag: 'a', ancestor: 'body' },
    ],
    requiredAttributes: {
      img: ['src', 'alt'],
      a: ['href'],
    },
  },

  {
    id: 4,
    title: 'Lists',
    instructions:
      'Stock the library! Make an unordered list <ul> of your favourite things, ' +
      'and an ordered list <ol> of steps. Every item goes in its own <li>.',
    starterCode: `<!DOCTYPE html>
<html>
  <head>
    <title>My Library</title>
  </head>
  <body>
    <h1>Bulbuli's Library</h1>

    <!-- Add a <ul> with at least one <li> -->

    <!-- Add an <ol> with at least one <li> -->

  </body>
</html>
`,
    targetTags: ['ul', 'ol', 'li'],
    hintText:
      '<li> items must live directly inside a <ul> or <ol>: ' +
      '<ul><li>Mangoes</li><li>Kites</li></ul>',
    '3dUnlocks': {
      ul: 'BOOKSHELF',
      ol: 'STAIRCASE',
      li: 'SHELF_ITEM',
    },
    nestingRules: [
      { tag: 'ul', ancestor: 'body' },
      { tag: 'ol', ancestor: 'body' },
      { tag: 'li', parent: ['ul', 'ol'] },
      { tag: 'ul', contains: 'li' },
      { tag: 'ol', contains: 'li' },
    ],
    requiredAttributes: {},
  },
];

/** Look up a level by its id. Returns undefined if it doesn't exist. */
export const getLevelById = (id) => LEVELS.find((level) => level.id === Number(id));

export default LEVELS;
