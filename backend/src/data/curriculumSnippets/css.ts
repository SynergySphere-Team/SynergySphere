import type { ExampleSnippet } from './types.js';

export function getCssExample(title: string): ExampleSnippet {
  const t = title.toLowerCase();

  if (/syntax/.test(t)) {
    return {
      title: 'CSS Syntax and Structure',
      language: 'css',
      code: 'p {\n  color: red;\n  text-align: center;\n}',
      explanation: 'A CSS rule consists of a selector and a declaration block. Each declaration includes a CSS property name and a value separated by a colon.\n\nExpected Output:\n[Paragraphs styled in red and center aligned]',
      syntax: ['selector { property: value; }']
    };
  }
  if (/selector/.test(t)) {
    return {
      title: 'CSS Selectors (Element, ID, Class)',
      language: 'css',
      code: '/* Element selector */\np { color: blue; }\n\n/* ID selector */\n#para1 { text-align: center; color: red; }\n\n/* Class selector */\n.center { text-align: center; color: green; }',
      explanation: 'CSS selectors are used to "find" (or select) the HTML elements you want to style.\n\nExpected Output:\n[Styles applied by element tag, #id, and .class names]',
      syntax: ['element { ... }', '#id { ... }', '.class { ... }']
    };
  }
  if (/comment/.test(t)) {
    return {
      title: 'CSS Comments',
      language: 'css',
      code: '/* This is a single-line CSS comment */\np {\n  color: red; /* Set text color to red */\n}\n\n/* This is\na multi-line comment */',
      explanation: 'Comments are used to explain the code, and may help when you edit the source code at a later date. Comments start with /* and end with */.\n\nExpected Output:\n[Paragraph text rendered in red with comments ignored]',
      syntax: ['/* Comment text */']
    };
  }
  if (/color/.test(t)) {
    return {
      title: 'CSS Colors (Names, RGB, HEX, HSL)',
      language: 'css',
      code: 'h1 { color: Tomato; }\np { color: rgb(255, 99, 71); }\ndiv { color: #ff6347; }\nspan { color: hsl(9, 100%, 64%); }',
      explanation: 'Colors in CSS can be specified using color names, RGB, HEX, HSL, RGBA, or HSLA values.\n\nExpected Output:\n[Headings and text styled in matching shades of tomato red]',
      syntax: ['color: red;', 'color: #ff0000;', 'color: rgb(255, 0, 0);']
    };
  }
  if (/background/.test(t)) {
    return {
      title: 'CSS Backgrounds',
      language: 'css',
      code: 'body {\n  background-color: #f0f8ff;\n  background-image: url("img_tree.png");\n  background-repeat: no-repeat;\n  background-position: right top;\n  background-attachment: fixed;\n}',
      explanation: 'CSS background properties are used to define the background effects for elements.\n\nExpected Output:\n[Light background with fixed non-repeating top-right image]',
      syntax: ['background: color image repeat attachment position;']
    };
  }
  if (/border image/.test(t)) {
    return {
      title: 'CSS Border Images',
      language: 'css',
      code: '#borderimg {\n  border: 10px solid transparent;\n  padding: 15px;\n  border-image: url(border.png) 30 round;\n}',
      explanation: 'The CSS border-image property allows you to specify an image to be used instead of the normal border around an element.\n\nExpected Output:\n[Decorative graphic pattern framing element]',
      syntax: ['border-image: url(border.png) 30 round;']
    };
  }
  if (/border/.test(t)) {
    return {
      title: 'CSS Borders',
      language: 'css',
      code: 'p.dotted { border: 2px dotted red; }\np.dashed { border: 2px dashed green; }\np.solid { border: 3px solid navy; border-radius: 8px; }',
      explanation: "The CSS border properties allow you to specify the style, width, and color of an element's border.\n\nExpected Output:\n[Paragraphs outlined with dotted, dashed, and rounded solid borders]",
      syntax: ['border: width style color;', 'border-radius: 8px;']
    };
  }
  if (/margin/.test(t)) {
    return {
      title: 'CSS Margins',
      language: 'css',
      code: 'div {\n  margin-top: 50px;\n  margin-bottom: 50px;\n  margin-right: 100px;\n  margin-left: 80px;\n  /* Shorthand: margin: 50px 100px 50px 80px; */\n}',
      explanation: 'Margins are used to create space around elements, outside of any defined borders.\n\nExpected Output:\n[Div offset from surroundings by 50px vertical and asymmetric horizontal margins]',
      syntax: ['margin: top right bottom left;', 'margin: auto;']
    };
  }
  if (/padding/.test(t)) {
    return {
      title: 'CSS Padding',
      language: 'css',
      code: 'div {\n  padding: 30px 20px;\n  background-color: lightblue;\n  border: 1px solid steelblue;\n}',
      explanation: "Padding is used to create space around an element's content, inside of any defined borders.\n\nExpected Output:\n[Element with 30px vertical and 20px horizontal interior spacing]",
      syntax: ['padding: top right bottom left;']
    };
  }
  if (/height|width|max-width/.test(t)) {
    return {
      title: 'CSS Height, Width, and Max-Width',
      language: 'css',
      code: 'div.box {\n  height: 150px;\n  width: 50%;\n  max-width: 600px;\n  background-color: powderblue;\n}',
      explanation: 'The height and width properties are used to set the dimensions of an element. Using max-width improves responsive resizing.\n\nExpected Output:\n[150px tall element filling 50% screen width up to 600px]',
      syntax: ['width: 50%;', 'max-width: 600px;', 'height: 150px;']
    };
  }
  if (/box model/.test(t)) {
    return {
      title: 'CSS Box Model',
      language: 'css',
      code: 'div {\n  width: 300px;\n  margin: 25px;\n  border: 15px solid green;\n  padding: 50px;\n  box-sizing: border-box;\n}',
      explanation: 'All HTML elements can be considered as boxes: Margin, Border, Padding, and Content. box-sizing: border-box includes padding/border in width.\n\nExpected Output:\n[300px element with clearly layered content, padding, border, and margin]',
      syntax: ['box-sizing: border-box;']
    };
  }
  if (/outline/.test(t)) {
    return {
      title: 'CSS Outline',
      language: 'css',
      code: 'p {\n  border: 2px solid black;\n  outline: 4px solid red;\n  outline-offset: 5px;\n}',
      explanation: "An outline is a line drawn outside the element's border. Unlike borders, outlines do not take up space in the document flow.\n\nExpected Output:\n[Black border with an outer red highlight outline spaced 5px apart]",
      syntax: ['outline: 4px solid red;', 'outline-offset: 5px;']
    };
  }
  if (/text/.test(t)) {
    return {
      title: 'CSS Text Formatting',
      language: 'css',
      code: 'h1 {\n  text-align: center;\n  text-transform: uppercase;\n  color: #004080;\n  letter-spacing: 3px;\n}\np {\n  text-align: justify;\n  line-height: 1.8;\n  text-indent: 30px;\n}',
      explanation: 'CSS text properties format color, alignment, decoration, transformation, spacing, and shadows.\n\nExpected Output:\n[Centered uppercase heading with spaced letters, justified paragraph with 30px indent]',
      syntax: ['text-align: center;', 'text-transform: uppercase;', 'line-height: 1.6;']
    };
  }
  if (/font/.test(t)) {
    return {
      title: 'CSS Fonts',
      language: 'css',
      code: 'body {\n  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;\n  font-size: 16px;\n}\nh1 {\n  font-weight: 700;\n  font-style: italic;\n}',
      explanation: 'Choosing the right font and size is very important for readability. The font-family property should hold several font names as a fallback system.\n\nExpected Output:\n[Clean sans-serif modern typography with italicized bold heading]',
      syntax: ['font-family: Arial, sans-serif;', 'font-size: 16px;', 'font-weight: bold;']
    };
  }
  if (/icon/.test(t)) {
    return {
      title: 'CSS Icons',
      language: 'css',
      code: '/* Font Awesome icons */\n.fa-heart {\n  color: red;\n  font-size: 24px;\n  transition: transform 0.2s ease;\n}\n.fa-heart:hover {\n  transform: scale(1.3);\n}',
      explanation: 'Icons can easily be added to HTML pages with icon libraries like Font Awesome, Bootstrap Icons, or Google Material Icons.\n\nExpected Output:\n[24px red heart icon that expands on mouse hover]',
      syntax: ['<i class="fa fa-heart"></i>', 'font-size: 24px; color: red;']
    };
  }
  if (/link/.test(t)) {
    return {
      title: 'CSS Links (:link, :visited, :hover, :active)',
      language: 'css',
      code: 'a:link { color: #0066cc; text-decoration: none; }\na:visited { color: #660099; }\na:hover { color: #ff3300; text-decoration: underline; }\na:active { color: #009933; }',
      explanation: 'Links can be styled with any CSS property depending on what state they are in: unvisited, visited, hover, or active.\n\nExpected Output:\n[Blue hyperlink that highlights orange with an underline when hovered]',
      syntax: ['a:hover { color: red; text-decoration: underline; }']
    };
  }
  if (/list/.test(t)) {
    return {
      title: 'CSS Lists',
      language: 'css',
      code: 'ul.nav {\n  list-style-type: none;\n  margin: 0;\n  padding: 0;\n}\nul.styled {\n  list-style-type: square;\n}\nol.roman {\n  list-style-type: upper-roman;\n}',
      explanation: 'The CSS list properties allow you to set different list item markers for ordered and unordered lists, or remove bullets entirely for navigation bars.\n\nExpected Output:\n[Clean un-bulleted nav list alongside roman-numeral ordered list]',
      syntax: ['list-style-type: none;', 'list-style-type: square;']
    };
  }
  if (/table/.test(t)) {
    return {
      title: 'CSS Tables',
      language: 'css',
      code: 'table {\n  border-collapse: collapse;\n  width: 100%;\n}\nth, td {\n  text-align: left;\n  padding: 12px;\n  border-bottom: 1px solid #ddd;\n}\ntr:hover { background-color: #f5f5f5; }\nth { background-color: #04AA6D; color: white; }',
      explanation: 'The look of an HTML table can be greatly improved with CSS: collapse borders, set zebra stripes, and add hover highlights.\n\nExpected Output:\n[Full-width table with green header, padded cells, and subtle row hover effect]',
      syntax: ['border-collapse: collapse;', 'tr:hover { background-color: #f5f5f5; }']
    };
  }
  if (/display/.test(t)) {
    return {
      title: 'CSS Display (block, inline, inline-block, none)',
      language: 'css',
      code: 'span.inline-box {\n  display: inline-block;\n  width: 100px;\n  height: 100px;\n  padding: 5px;\n  background-color: yellow;\n}\np.hidden {\n  display: none;\n}',
      explanation: 'The display property is the most important CSS property for controlling layout. It specifies if/how an element is displayed.\n\nExpected Output:\n[Yellow square box that sits inline with text without breaking lines]',
      syntax: ['display: inline-block;', 'display: block;', 'display: none;']
    };
  }
  if (/position/.test(t)) {
    return {
      title: 'CSS Position (relative, absolute, fixed, sticky)',
      language: 'css',
      code: 'div.parent {\n  position: relative;\n  width: 400px;\n  height: 200px;\n  border: 3px solid #73AD21;\n}\ndiv.child {\n  position: absolute;\n  top: 40px;\n  right: 20px;\n  width: 100px;\n  height: 50px;\n  background: lightblue;\n}',
      explanation: 'The position property specifies the type of positioning method used for an element (static, relative, fixed, absolute, sticky).\n\nExpected Output:\n[Child box anchored precisely 40px from top and 20px from right of bordered parent]',
      syntax: ['position: relative;', 'position: absolute; top: 0; right: 0;']
    };
  }
  if (/z-index/.test(t)) {
    return {
      title: 'CSS Z-index Stacking',
      language: 'css',
      code: 'img {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  z-index: -1;\n}\nh1 {\n  position: relative;\n  z-index: 1;\n  color: white;\n}',
      explanation: 'The z-index property specifies the stack order of an element. An element with greater stack order is always in front of an element with lower order.\n\nExpected Output:\n[H1 text appears on top of the background image]',
      syntax: ['z-index: 10;', 'z-index: -1;']
    };
  }
  if (/overflow/.test(t)) {
    return {
      title: 'CSS Overflow (visible, hidden, scroll, auto)',
      language: 'css',
      code: 'div.scroll-box {\n  width: 200px;\n  height: 80px;\n  background-color: #eee;\n  overflow: auto;\n  border: 1px solid #ccc;\n  padding: 8px;\n}',
      explanation: 'The overflow property controls what happens to content that is too big to fit into an area.\n\nExpected Output:\n[Compact 80px box that shows scrollbars when text exceeds bounds]',
      syntax: ['overflow: auto;', 'overflow: hidden;', 'overflow: scroll;']
    };
  }
  if (/float/.test(t)) {
    return {
      title: 'CSS Float and Clearfix',
      language: 'css',
      code: 'img {\n  float: left;\n  margin: 0 15px 15px 0;\n}\n.clearfix::after {\n  content: "";\n  clear: both;\n  display: table;\n}',
      explanation: 'The float property is used for positioning and formatting content e.g. let an image float left to the text in a container.\n\nExpected Output:\n[Image docked on left with text wrapping neatly around its right and bottom edges]',
      syntax: ['float: left;', 'clear: both;']
    };
  }
  if (/align/.test(t)) {
    return {
      title: 'CSS Centering and Alignment',
      language: 'css',
      code: '.center-block {\n  margin: 0 auto;\n  width: 60%;\n  text-align: center;\n  padding: 20px;\n}\n.vertical-center {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 200px;\n}',
      explanation: 'To horizontally center a block element, use margin: auto. To center both horizontally and vertically, Flexbox is easiest.\n\nExpected Output:\n[Centered block with centered content inside]',
      syntax: ['margin: auto;', 'text-align: center;', 'justify-content: center;']
    };
  }
  if (/combinator/.test(t)) {
    return {
      title: 'CSS Combinators',
      language: 'css',
      code: '/* Descendant selector */\ndiv p { background-color: yellow; }\n\n/* Child selector (>) */\ndiv > p { background-color: cyan; }\n\n/* Adjacent sibling selector (+) */\ndiv + p { background-color: lightgreen; }\n\n/* General sibling selector (~) */\np ~ ul { background-color: orange; }',
      explanation: 'A combinator is something that explains the relationship between the selectors (descendant, child, adjacent sibling, general sibling).\n\nExpected Output:\n[Colors matched depending on strict direct-child vs descendant relationships]',
      syntax: ['div > p', 'div + p', 'div ~ p']
    };
  }
  if (/pseudo-class/.test(t)) {
    return {
      title: 'CSS Pseudo-classes',
      language: 'css',
      code: '/* Hover state */\nbutton:hover { background-color: royalblue; }\n\n/* Form focus */\ninput:focus { border-color: dodgerblue; outline: none; }\n\n/* Structural child */\nli:first-child { font-weight: bold; }\nli:nth-child(even) { background-color: #f2f2f2; }',
      explanation: 'A pseudo-class is used to define a special state of an element (hover, focus, visited, nth-child).\n\nExpected Output:\n[Button reacts to hover, inputs glow on focus, alternating list items shaded]',
      syntax: ['selector:hover', 'selector:focus', 'selector:nth-child(n)']
    };
  }
  if (/pseudo-element/.test(t)) {
    return {
      title: 'CSS Pseudo-elements (::before, ::after)',
      language: 'css',
      code: 'p::first-letter {\n  font-size: 200%;\n  color: #8A2BE2;\n}\nh1::before {\n  content: "★ ";\n  color: gold;\n}\n.quote::after {\n  content: "”";\n}',
      explanation: 'A CSS pseudo-element is used to style specified parts of an element, or insert decorative content before/after an element.\n\nExpected Output:\n[Drop-cap first letter and gold star prepended to heading]',
      syntax: ['selector::before { content: ""; }', 'selector::first-letter']
    };
  }
  if (/opacity/.test(t)) {
    return {
      title: 'CSS Opacity / Transparency',
      language: 'css',
      code: 'img.semi-trans {\n  opacity: 0.5;\n  transition: opacity 0.3s ease;\n}\nimg.semi-trans:hover {\n  opacity: 1.0;\n}',
      explanation: 'The opacity property specifies the opacity/transparency of an element from 0.0 (fully transparent) to 1.0 (fully opaque).\n\nExpected Output:\n[Faded image that becomes fully crisp and visible when hovered]',
      syntax: ['opacity: 0.5;']
    };
  }
  if (/navigation bar|navbar/.test(t)) {
    return {
      title: 'CSS Navigation Bar',
      language: 'css',
      code: 'ul.navbar {\n  list-style-type: none;\n  margin: 0;\n  padding: 0;\n  overflow: hidden;\n  background-color: #333;\n}\nul.navbar li { float: left; }\nul.navbar li a {\n  display: block;\n  color: white;\n  text-align: center;\n  padding: 14px 16px;\n  text-decoration: none;\n}\nul.navbar li a:hover {\n  background-color: #111;\n}',
      explanation: 'A navigation bar needs standard HTML as a base (an unordered list) styled with floats, block anchors, and dark styling.\n\nExpected Output:\n[Horizontal dark nav bar with clickable links that highlight on hover]',
      syntax: ['ul.nav { list-style-type: none; overflow: hidden; }']
    };
  }
  if (/dropdown/.test(t)) {
    return {
      title: 'CSS Dropdowns',
      language: 'css',
      code: '.dropdown { position: relative; display: inline-block; }\n.dropdown-content {\n  display: none;\n  position: absolute;\n  background-color: #f9f9f9;\n  min-width: 160px;\n  box-shadow: 0px 8px 16px rgba(0,0,0,0.2);\n  z-index: 1;\n}\n.dropdown:hover .dropdown-content { display: block; }',
      explanation: 'Create a hoverable dropdown box with pure CSS by toggling display: none to display: block on hover.\n\nExpected Output:\n[Floating dropdown menu appears smoothly below trigger button]',
      syntax: ['.dropdown:hover .dropdown-content { display: block; }']
    };
  }
  if (/\bforms?\b|form styling/.test(t)) {
    return {
      title: 'CSS Form Styling',
      language: 'css',
      code: 'input[type=text], select {\n  width: 100%;\n  padding: 12px 20px;\n  margin: 8px 0;\n  display: inline-block;\n  border: 1px solid #ccc;\n  border-radius: 4px;\n  box-sizing: border-box;\n}\ninput[type=submit] {\n  background-color: #04AA6D;\n  color: white;\n  padding: 12px 20px;\n  border: none;\n  border-radius: 4px;\n  cursor: pointer;\n}',
      explanation: 'Styling form elements gives a clean, uniform look across input boxes, select dropdowns, and submission buttons.\n\nExpected Output:\n[Modern padded form fields with rounded corners and green submit button]',
      syntax: ['input[type=text] { width: 100%; box-sizing: border-box; }']
    };
  }
  if (/flex items/.test(t)) {
    return {
      title: 'CSS Flex Items',
      language: 'css',
      code: '.flex-container { display: flex; }\n.flex-item-1 { flex-grow: 1; background: coral; }\n.flex-item-2 { flex-grow: 2; background: lightblue; }\n.flex-item-3 { flex-grow: 1; align-self: flex-end; }',
      explanation: 'The direct child elements of a flex container automatically become flexible items with flex-grow, flex-shrink, and align-self.\n\nExpected Output:\n[Middle item expands to twice the width of surrounding items]',
      syntax: ['flex-grow: 2;', 'align-self: flex-end;']
    };
  }
  if (/flex container|flexbox|flex/.test(t)) {
    return {
      title: 'CSS Flexbox Layout',
      language: 'css',
      code: '.flex-container {\n  display: flex;\n  flex-direction: row;\n  justify-content: space-between;\n  align-items: center;\n  gap: 15px;\n  background-color: DodgerBlue;\n  padding: 10px;\n}\n.flex-item {\n  background-color: #f1f1f1;\n  padding: 20px;\n  font-size: 20px;\n  border-radius: 6px;\n}',
      explanation: 'The Flexible Box Layout Module makes it easier to design flexible responsive layout structure without float or positioning.\n\nExpected Output:\n[Row of responsive boxes evenly distributed with 15px gap]',
      syntax: ['display: flex;', 'justify-content: space-between;', 'align-items: center;']
    };
  }
  if (/grid items/.test(t)) {
    return {
      title: 'CSS Grid Items',
      language: 'css',
      code: '.grid-container { display: grid; grid-template-columns: auto auto auto; }\n.item1 {\n  grid-column: 1 / span 2;\n  grid-row: 1;\n  background: lightgreen;\n}',
      explanation: 'Grid items can span across multiple columns and rows using grid-column and grid-row.\n\nExpected Output:\n[First item spans 2 columns horizontally across the top row]',
      syntax: ['grid-column: 1 / span 2;', 'grid-row: 1 / 3;']
    };
  }
  if (/grid container|grid template|grid/.test(t)) {
    return {
      title: 'CSS Grid Layout',
      language: 'css',
      code: '.grid-container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 20px;\n  background-color: #2196F3;\n  padding: 20px;\n}\n.grid-item {\n  background-color: rgba(255, 255, 255, 0.9);\n  padding: 20px;\n  text-align: center;\n  font-size: 24px;\n}',
      explanation: 'CSS Grid Layout offers a grid-based layout system, with rows and columns, making it easy to design complex responsive layouts.\n\nExpected Output:\n[3-column responsive grid with equal-width fractional columns]',
      syntax: ['display: grid;', 'grid-template-columns: repeat(3, 1fr);', 'gap: 20px;']
    };
  }
  if (/rounded corner|border-radius/.test(t)) {
    return {
      title: 'CSS Rounded Corners (border-radius)',
      language: 'css',
      code: '#rcorner {\n  border-radius: 25px;\n  background: #73AD21;\n  padding: 20px;\n  width: 200px;\n  height: 100px;\n  color: white;\n}',
      explanation: 'With the CSS border-radius property, you can give any element "rounded corners".\n\nExpected Output:\n[Pill-shaped green box with 25px curved corners]',
      syntax: ['border-radius: 25px;']
    };
  }
  if (/gradient/.test(t)) {
    return {
      title: 'CSS Gradients (Linear & Radial)',
      language: 'css',
      code: '#grad1 {\n  height: 200px;\n  background-image: linear-gradient(to right, #ff7e5f, #feb47b);\n}\n#grad2 {\n  height: 200px;\n  background-image: radial-gradient(circle, red, yellow, green);\n}',
      explanation: 'CSS gradients let you display smooth transitions between two or more specified colors.\n\nExpected Output:\n[Vibrant sunset orange linear gradient and multicolored radial circle]',
      syntax: ['background-image: linear-gradient(direction, color1, color2);']
    };
  }
  if (/shadow/.test(t)) {
    return {
      title: 'CSS Box Shadow & Text Shadow',
      language: 'css',
      code: 'div.card {\n  width: 300px;\n  padding: 20px;\n  background: white;\n  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);\n}\nh1 {\n  text-shadow: 2px 2px 5px red;\n}',
      explanation: 'With CSS you can add shadow to text and elements with box-shadow and text-shadow.\n\nExpected Output:\n[Floating card effect with soft depth shadows, red halo on heading]',
      syntax: ['box-shadow: 0 4px 8px rgba(0,0,0,0.2);', 'text-shadow: 2px 2px 5px #ff0000;']
    };
  }
  if (/transform/.test(t)) {
    return {
      title: 'CSS 2D and 3D Transforms',
      language: 'css',
      code: 'div.rotate {\n  transform: rotate(20deg);\n}\ndiv.scale {\n  transform: scale(1.2);\n}\ndiv.translate3d {\n  transform: translate3d(20px, 40px, 50px);\n}',
      explanation: 'CSS transforms allow you to translate, rotate, scale, and skew elements in 2D or 3D space.\n\nExpected Output:\n[Boxes tilted 20 degrees, enlarged by 20%, and moved along 3D axes]',
      syntax: ['transform: rotate(20deg);', 'transform: scale(1.2);']
    };
  }
  if (/transition/.test(t)) {
    return {
      title: 'CSS Transitions',
      language: 'css',
      code: 'div.box {\n  width: 100px;\n  height: 100px;\n  background: red;\n  transition: width 2s ease, background 2s;\n}\ndiv.box:hover {\n  width: 300px;\n  background: blue;\n}',
      explanation: 'CSS transitions allow you to change property values smoothly, over a given duration.\n\nExpected Output:\n[Red square smoothly widens to 300px and turns blue over 2 seconds]',
      syntax: ['transition: property duration timing-function delay;']
    };
  }
  if (/animation/.test(t)) {
    return {
      title: 'CSS Animations (@keyframes)',
      language: 'css',
      code: '@keyframes example {\n  0%   { background-color: red; left: 0px; top: 0px; }\n  50%  { background-color: blue; left: 200px; top: 0px; }\n  100% { background-color: red; left: 0px; top: 0px; }\n}\ndiv.anim {\n  width: 100px;\n  height: 100px;\n  position: relative;\n  animation-name: example;\n  animation-duration: 4s;\n  animation-iteration-count: infinite;\n}',
      explanation: 'An animation lets an element gradually change from one style to another with @keyframes.\n\nExpected Output:\n[Box glides back and forth changing color smoothly in infinite loop]',
      syntax: ['@keyframes name { 0% { ... } 100% { ... } }', 'animation: name duration infinite;']
    };
  }
  if (/tooltip/.test(t)) {
    return {
      title: 'CSS Tooltips',
      language: 'css',
      code: '.tooltip { position: relative; display: inline-block; }\n.tooltip .tooltiptext {\n  visibility: hidden;\n  width: 120px;\n  background-color: black;\n  color: #fff;\n  text-align: center;\n  border-radius: 6px;\n  padding: 5px 0;\n  position: absolute;\n  z-index: 1;\n  bottom: 100%;\n  left: 50%;\n  margin-left: -60px;\n}\n.tooltip:hover .tooltiptext { visibility: visible; }',
      explanation: 'A tooltip is often used to specify extra information about something when the user moves the mouse pointer over an element.\n\nExpected Output:\n[Black badge pops up centered above text when hovered]',
      syntax: ['.tooltip:hover .tooltiptext { visibility: visible; }']
    };
  }
  if (/filter/.test(t)) {
    return {
      title: 'CSS Image Filters',
      language: 'css',
      code: 'img.bw { filter: grayscale(100%); }\nimg.blur { filter: blur(4px); }\nimg.bright { filter: brightness(150%) contrast(120%); }',
      explanation: 'The CSS filter property defines visual effects (like blur and saturation) to an element (often <img>).\n\nExpected Output:\n[Images transformed to black & white, soft blur, and high contrast]',
      syntax: ['filter: grayscale(100%);', 'filter: blur(5px);']
    };
  }
  if (/object-fit/.test(t)) {
    return {
      title: 'CSS object-fit & object-position',
      language: 'css',
      code: 'img.cover {\n  width: 200px;\n  height: 300px;\n  object-fit: cover;\n  object-position: 50% 50%;\n  border: 1px solid #ccc;\n}',
      explanation: 'The CSS object-fit property is used to specify how an <img> or <video> should be resized to fit its container.\n\nExpected Output:\n[Image fills 200x300 container with aspect ratio preserved, cropped from center]',
      syntax: ['object-fit: cover;', 'object-position: center;']
    };
  }
  if (/button/.test(t)) {
    return {
      title: 'CSS Buttons',
      language: 'css',
      code: '.button {\n  background-color: #04AA6D;\n  border: none;\n  color: white;\n  padding: 15px 32px;\n  text-align: center;\n  text-decoration: none;\n  display: inline-block;\n  font-size: 16px;\n  margin: 4px 2px;\n  cursor: pointer;\n  border-radius: 8px;\n  transition: background 0.3s, transform 0.2s;\n}\n.button:hover {\n  background-color: #059862;\n  transform: translateY(-2px);\n}',
      explanation: 'Buttons can be styled with padding, background gradients, rounded corners, drop shadows, and subtle hover animations.\n\nExpected Output:\n[Vibrant green interactive button with micro-lift on hover]',
      syntax: ['button { cursor: pointer; border-radius: 8px; }']
    };
  }
  if (/variable|var\(/.test(t)) {
    return {
      title: 'CSS Variables (var() function)',
      language: 'css',
      code: ':root {\n  --primary-color: #1e90ff;\n  --card-padding: 20px;\n  --text-muted: #6c757d;\n}\n.card {\n  background-color: white;\n  color: var(--primary-color);\n  padding: var(--card-padding);\n  border: 1px solid var(--text-muted);\n}',
      explanation: 'The var() function is used to insert the value of a CSS custom property (variable) defined on :root.\n\nExpected Output:\n[Card styled consistently using global custom CSS design tokens]',
      syntax: [':root { --main-color: #1e90ff; }', 'color: var(--main-color);']
    };
  }
  if (/math function|calc/.test(t)) {
    return {
      title: 'CSS Math Functions (calc, min, max, clamp)',
      language: 'css',
      code: '#dynamic-box {\n  width: calc(100% - 100px);\n  padding: max(10px, 2vw);\n  font-size: clamp(1rem, 2.5vw, 2rem);\n}',
      explanation: 'CSS math functions allow mathematical expressions to be used as property values (calc(), max(), min(), clamp()).\n\nExpected Output:\n[Box dimensions and font size adjust proportionally across viewport widths]',
      syntax: ['width: calc(100% - 50px);', 'font-size: clamp(1rem, 2.5vw, 2rem);']
    };
  }
  if (/masking/.test(t)) {
    return {
      title: 'CSS Masking',
      language: 'css',
      code: '.mask1 {\n  -webkit-mask-image: url(w3logo.png);\n  mask-image: url(w3logo.png);\n  -webkit-mask-repeat: no-repeat;\n  mask-repeat: no-repeat;\n}',
      explanation: 'CSS masking gives you the option of using an image as a mask layer to clip an element at specific points.\n\nExpected Output:\n[Element visible only through the transparent silhouettes of the mask image]',
      syntax: ['mask-image: url(mask.png);', 'mask-repeat: no-repeat;']
    };
  }
  if (/pagination/.test(t)) {
    return {
      title: 'CSS Pagination',
      language: 'css',
      code: '.pagination { display: inline-block; }\n.pagination a {\n  color: black;\n  float: left;\n  padding: 8px 16px;\n  text-decoration: none;\n  border: 1px solid #ddd;\n}\n.pagination a.active {\n  background-color: #4CAF50;\n  color: white;\n}',
      explanation: 'If you have a website with lots of pages, you may wish to add some sort of pagination to each page.\n\nExpected Output:\n[Row of bordered page number buttons with highlighted active page]',
      syntax: ['.pagination a { float: left; padding: 8px 16px; }']
    };
  }
  if (/multiple column|multicolumn|columns/.test(t)) {
    return {
      title: 'CSS Multiple Columns',
      language: 'css',
      code: '.newspaper {\n  column-count: 3;\n  column-gap: 40px;\n  column-rule: 1px solid lightblue;\n}',
      explanation: 'The CSS multi-column layout module allows easy definition of multiple columns of text, like in newspapers.\n\nExpected Output:\n[Flow of text formatted into 3 vertical newspaper-style columns]',
      syntax: ['column-count: 3;', 'column-gap: 40px;', 'column-rule: 1px solid lightblue;']
    };
  }
  if (/user interface|resize/.test(t)) {
    return {
      title: 'CSS User Interface & Resize',
      language: 'css',
      code: 'div.resizable {\n  border: 2px solid #555;\n  padding: 20px;\n  width: 300px;\n  resize: both;\n  overflow: auto;\n}',
      explanation: 'In CSS, you can let the user resize elements using the resize property alongside overflow: auto.\n\nExpected Output:\n[Draggable bottom-right grabber handle allows resizing in both dimensions]',
      syntax: ['resize: both;', 'overflow: auto;']
    };
  }
  if (/@property/.test(t)) {
    return {
      title: 'CSS @property Rule',
      language: 'css',
      code: '@property --brand-color {\n  syntax: "<color>";\n  inherits: false;\n  initial-value: #c0ffee;\n}\n.card {\n  background-color: var(--brand-color);\n}',
      explanation: 'The @property CSS at-rule represents a custom property registration that allows explicit syntax types and inheritance.\n\nExpected Output:\n[Custom typed CSS property registered with initial color]',
      syntax: ['@property --name { syntax: "<color>"; inherits: false; }']
    };
  }
  if (/accessibility|optimization|sr-only/.test(t)) {
    return {
      title: 'CSS Accessible Hidden Utility (.sr-only)',
      language: 'css',
      code: '.sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}',
      explanation: 'Accessible hidden classes hide content visually while keeping it readable by screen readers.\n\nExpected Output:\n[Hidden from visual screen display but accessible to assistive technologies]',
      syntax: ['.sr-only { clip: rect(0, 0, 0, 0); overflow: hidden; }']
    };
  }
  if (/website layout|layout/.test(t)) {
    return {
      title: 'CSS Website Layout',
      language: 'css',
      code: 'header {\n  background-color: #666;\n  padding: 30px;\n  text-align: center;\n  font-size: 35px;\n  color: white;\n}\nnav {\n  float: left;\n  width: 30%;\n  height: 300px;\n  background: #ccc;\n  padding: 20px;\n}\narticle {\n  float: left;\n  padding: 20px;\n  width: 70%;\n  background-color: #f1f1f1;\n  height: 300px;\n}\nfooter {\n  background-color: #777;\n  padding: 10px;\n  text-align: center;\n  color: white;\n  clear: both;\n}',
      explanation: 'A website often divides content into headers, navigation bars, main content articles, and footers.\n\nExpected Output:\n[Classic desktop webpage layout with top header, side nav, main article, and footer]',
      syntax: ['header { ... }', 'nav { float: left; width: 30%; }', 'footer { clear: both; }']
    };
  }
  if (/modal/.test(t)) {
    return {
      title: 'CSS Image Modal',
      language: 'css',
      code: '.modal {\n  display: none;\n  position: fixed;\n  z-index: 1;\n  padding-top: 100px;\n  left: 0; top: 0;\n  width: 100%; height: 100%;\n  overflow: auto;\n  background-color: rgba(0,0,0,0.9);\n}\n.modal-content {\n  margin: auto;\n  display: block;\n  width: 80%;\n  max-width: 700px;\n}',
      explanation: 'A modal is a dialog box/popup window that is displayed on top of the current page with a dimmed backdrop.\n\nExpected Output:\n[Full-screen dimmed overlay framing an enlarged image centered in view]',
      syntax: ['position: fixed; z-index: 1; background-color: rgba(0,0,0,0.9);']
    };
  }
  if (/image shape|image center|image styling/.test(t)) {
    return {
      title: 'CSS Image Centering & Shapes',
      language: 'css',
      code: 'img.center {\n  display: block;\n  margin-left: auto;\n  margin-right: auto;\n  width: 50%;\n  border-radius: 8px;\n  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);\n}',
      explanation: 'To center an image, set display: block and use margin: auto. Add border-radius for rounded corners.\n\nExpected Output:\n[Centered image taking 50% width with subtle shadow and rounded corners]',
      syntax: ['display: block; margin-left: auto; margin-right: auto;']
    };
  }
  if (/inline-block/.test(t)) {
    return {
      title: 'CSS Inline-Block Display',
      language: 'css',
      code: 'span.box {\n  display: inline-block;\n  width: 100px;\n  height: 100px;\n  padding: 5px;\n  border: 1px solid blue;\n  background-color: yellow;\n  margin: 10px;\n}',
      explanation: 'Compared to display: inline, the major difference is that display: inline-block allows to set a width and height on the element.\n\nExpected Output:\n[Square 100x100 yellow blocks placed inline next to each other]',
      syntax: ['display: inline-block; width: 100px; height: 100px;']
    };
  }
  if (/responsive|media quer/.test(t)) {
    return {
      title: 'CSS Responsive Media Queries',
      language: 'css',
      code: 'body {\n  background-color: lightgreen;\n}\n@media only screen and (max-width: 600px) {\n  body {\n    background-color: lightblue;\n  }\n  .column {\n    width: 100%;\n  }\n}',
      explanation: 'The @media rule is used in media queries to apply different styles for different media types/devices.\n\nExpected Output:\n[Page turns lightblue and stacks columns vertically on screen widths below 600px]',
      syntax: ['@media only screen and (max-width: 600px) { ... }']
    };
  }

  return {
    title: 'CSS Styling Rules',
    language: 'css',
    code: 'body {\n  font-family: Arial, sans-serif;\n  background-color: #f4f4f9;\n  color: #333;\n  margin: 0;\n  padding: 20px;\n}\nh1 {\n  color: #2c3e50;\n}',
    explanation: 'Basic CSS style sheet demonstrating element selectors, clean color contrast, typography, and viewport padding.\n\nExpected Output:\n[Clean light grey background with dark slate headers and 20px margins]',
    syntax: ['body { font-family: Arial; background-color: #f4f4f9; }']
  };
}
