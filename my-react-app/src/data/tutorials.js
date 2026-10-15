export const tutorials = [
  {
    id: 'html-introduction',
    section: 'Getting Started',
    title: 'Introduction to HTML',
    description: 'Learn how HTML describes the structure and meaning of web page content.',
    intro: 'HTML (HyperText Markup Language) describes the structure and meaning of page content. Tags mark where elements begin and end, and browsers read this structure to display the page. Most elements have opening and closing tags, with content between them; void elements such as <img> do not have a separate closing tag.',
    codeExample: '<h1>My page</h1>\n<p>This is a paragraph.</p>',
    qa: [
      { question: 'What is HTML used for on a web page?', answer: 'HTML describes the structure and meaning of page content.', keywords: ['structure', 'meaning', 'content', 'markup'] },
      { question: 'What does an opening and closing tag mark?', answer: 'The opening tag marks the start and the closing tag marks the end of an element.', keywords: ['start and end', 'beginning and end', 'opening and closing', 'element'] },
      { question: 'Which part is the content in <p>Hello</p>?', answer: 'Hello is the content inside the paragraph element.', keywords: ['hello', 'inside', 'content', 'between'] },
      { question: 'What kind of HTML elements, such as img, do not have a separate closing tag?', answer: 'Void elements such as img do not have closing tags.', keywords: ['void', 'img', 'image', 'no closing tag'] },
    ],
    quiz: [
      { question: 'Which is a complete paragraph element?', options: ['<p>Hello</p>', '<p>Hello', 'Hello</p>', '<paragraph>Hello</paragraph>'], correctIndex: 0 },
      { question: 'What does HTML primarily describe?', options: ['Page structure and meaning', 'The computer screen size', 'Internet speed', 'A user password'], correctIndex: 0 },
      { question: 'Which element is a void element?', options: ['<p>', '<section>', '<img>', '<h1>'], correctIndex: 2 },
    ],
  },
  {
    id: 'css-introduction',
    section: 'Getting Started',
    title: 'Introduction to CSS',
    description: 'Learn how CSS styles HTML elements and controls how a page looks.',
    intro: 'CSS (Cascading Style Sheets) controls the presentation of HTML content, including colors, fonts, spacing, and layout. A CSS rule contains a selector followed by declarations in braces. The selector identifies which elements to style; each declaration is a property and value separated by a colon and ends with a semicolon. For example, the p selector targets paragraph elements, and color: navy sets their text color. An external stylesheet is connected to an HTML document with a <link rel="stylesheet" href="styles.css"> element in the head.',
    codeExample: 'p {\n  color: navy;\n  font-size: 1rem;\n}',
    qa: [
      { question: 'What does CSS control on a web page?', answer: 'CSS controls the presentation of HTML content, such as colors, fonts, spacing, and layout.', keywords: ['presentation', 'style', 'colors', 'fonts', 'spacing', 'layout'] },
      { question: 'What does a CSS selector identify?', answer: 'A selector identifies the HTML elements a rule will style.', keywords: ['elements', 'target', 'style', 'selector'] },
      { question: 'In a CSS declaration, what separates the property from its value?', answer: 'A colon separates the property from its value.', keywords: ['colon', ':'] },
      { question: 'How do you connect an external stylesheet to an HTML page?', answer: 'Use a link element with rel="stylesheet" and the stylesheet path in href, typically in the document head.', keywords: ['link', 'rel="stylesheet"', 'href', 'head'] },
    ],
    quiz: [
      { question: 'What is CSS primarily used to control?', options: ['The presentation of HTML content', 'The meaning of page content', 'The server password', 'The browser address bar'], correctIndex: 0 },
      { question: 'In the rule p { color: navy; }, what does p identify?', options: ['The elements to style', 'A CSS property', 'A color value', 'A stylesheet filename'], correctIndex: 0 },
      { question: 'Which HTML element connects an external stylesheet?', options: ['<link rel="stylesheet" href="styles.css">', '<style src="styles.css">', '<css href="styles.css">', '<script rel="stylesheet">'], correctIndex: 0 },
    ],
  },
]
