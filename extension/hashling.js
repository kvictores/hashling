/* Hashling SVG builder (plain JS, no build step). Mirrors web/src/hashling/Hashling.tsx.
 * Usage: HashlingSVG.build({ stage: 'cub', mood: 'alert', equipped: {...}, size: 120 }) -> SVG string
 */
(function (root) {
  'use strict';
  if (root.HashlingSVG) return;

  var LINE = '#4A4A55';
  var FUR = {
    fur_classic: { base: '#F1EFEA', shade: '#D8D3C8', spot: '#5B5A60', belly: '#FFFDF8' },
    fur_moss: { base: '#CFE3C4', shade: '#A9C99B', spot: '#3E6B47', belly: '#F1F8EC' },
    fur_amber: { base: '#F7D9A8', shade: '#E9B97A', spot: '#8A4B2A', belly: '#FFF4E2' },
    fur_cyan: { base: '#CFF5F1', shade: '#9FE3DC', spot: '#137A75', belly: '#F0FFFD', glow: true }
  };
  var TAIL = 'M118 176 C164 184 190 154 178 124 C172 108 176 98 184 97';
  var GEOM = {
    kitten: { bs: 0.72, hs: 0.95, dy: 19, ts: 0.72, all: 0.98 },
    cub: { bs: 0.86, hs: 0.95, dy: 10, ts: 0.88, all: 1.04 },
    adult: { bs: 1.0, hs: 0.9, dy: 0, ts: 1.0, all: 1.1 }
  };
  var STYLE = '<style>' +
    '.hl-blink{animation:hl-blink 5s infinite;transform-box:fill-box;transform-origin:center}' +
    '@keyframes hl-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}' +
    '.hl-tail{animation:hl-tail 3.2s ease-in-out infinite;transform-box:view-box;transform-origin:122px 172px}' +
    '@keyframes hl-tail{0%,100%{transform:rotate(0)}50%{transform:rotate(-7deg)}}' +
    '.hl-breathe{animation:hl-breathe 4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}' +
    '@keyframes hl-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.015,.99)}}' +
    '.hl-wobble{animation:hl-wobble 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 95%}' +
    '@keyframes hl-wobble{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(-5deg)}82%{transform:rotate(5deg)}88%{transform:rotate(-3deg)}94%{transform:rotate(2deg)}}' +
    '.hl-shake{animation:hl-shake .5s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}' +
    '@keyframes hl-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-1.5px)}75%{transform:translateX(1.5px)}}' +
    '.hl-z{animation:hl-z 3s ease-in-out infinite;opacity:0}.hl-z2{animation-delay:1.5s}' +
    '@keyframes hl-z{0%{opacity:0;transform:translate(0,0)}30%{opacity:1}100%{opacity:0;transform:translate(10px,-22px)}}' +
    '.hl-glow{animation:hl-glow 2.4s ease-in-out infinite}@keyframes hl-glow{0%,100%{opacity:.55}50%{opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){.hl-blink,.hl-tail,.hl-breathe,.hl-wobble,.hl-shake,.hl-z,.hl-glow{animation:none!important;opacity:1}}' +
    '</style>';

  var uidCounter = 0;

  function spiky(cx, cy, rx, ry, n, amp) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var a = (Math.PI * i) / n;
      var k = i % 2 === 0 ? 1 + amp : 1 - amp * 0.2;
      pts.push((cx + Math.cos(a) * rx * k).toFixed(1) + ',' + (cy + Math.sin(a) * ry * k).toFixed(1));
    }
    return 'M' + pts.join(' L') + ' Z';
  }

  function rosette(x, y, r, p) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r * 0.55 + '" fill="' + p.shade + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + p.spot + '" stroke-width="' + r * 0.5 +
      '" stroke-dasharray="' + r * 1.6 + ' ' + r * 0.7 + '" stroke-linecap="round"/>';
  }

  function sleepyZ(anim) {
    return '<g fill="#5F6F64" font-family="Georgia, serif" font-weight="700">' +
      '<text x="150" y="52" font-size="18"' + (anim ? ' class="hl-z"' : '') + '>z</text>' +
      '<text x="162" y="38" font-size="13"' + (anim ? ' class="hl-z hl-z2"' : '') + '>z</text></g>';
  }

  function egg(p, mood, anim) {
    var s = '<g' + (anim ? ' class="' + (mood === 'alert' ? 'hl-shake' : 'hl-wobble') + '"' : '') + '>' +
      '<path d="M100 38 C140 38 158 108 152 140 C146 175 122 188 100 188 C78 188 54 175 48 140 C42 108 60 38 100 38 Z" fill="' + p.belly + '" stroke="' + LINE + '" stroke-width="3"/>' +
      '<path d="M100 38 C140 38 158 108 152 140 C150 152 146 162 140 170 C146 140 132 70 100 52 Z" fill="' + p.shade + '" opacity="0.55"/>' +
      rosette(78, 78, 7, p) + rosette(120, 66, 5, p) + rosette(132, 140, 7, p) + rosette(70, 150, 6, p) + rosette(104, 160, 5, p) +
      '<circle cx="96" cy="86" r="2.5" fill="' + p.spot + '"/><circle cx="140" cy="98" r="2.5" fill="' + p.spot + '"/>' +
      '<path d="M60 112 L72 104 L82 116 L94 101 L106 116 L118 103 L130 114 L141 106" fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    if (mood === 'happy') {
      s += '<ellipse cx="89" cy="109" rx="3.6" ry="4.2" fill="' + LINE + '"' + (anim ? ' class="hl-blink"' : '') + '/>' +
        '<ellipse cx="111" cy="109" rx="3.6" ry="4.2" fill="' + LINE + '"' + (anim ? ' class="hl-blink"' : '') + '/>';
    }
    if (mood === 'alert') s += '<text x="160" y="60" font-size="36" font-weight="800" fill="#D9463B" font-family="sans-serif">!</text>';
    if (mood === 'sad') s += '<path d="M112 124 q3 6 0 9 q-3 -3 0 -9z" fill="#7FC4E0"/>';
    return s + '</g>';
  }

  function eyes(mood, anim, p) {
    if (mood === 'sleepy') {
      return '<g fill="none" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"><path d="M69 94 Q80 101 91 94"/><path d="M109 94 Q120 101 131 94"/></g>';
    }
    var s = '';
    if (mood === 'alert') {
      [80, 120].forEach(function (x) {
        s += '<circle cx="' + x + '" cy="91" r="14" fill="#fff" stroke="' + LINE + '" stroke-width="2.5"/>' +
          '<circle cx="' + x + '" cy="92" r="6" fill="#1F2A24"/><circle cx="' + (x + 2) + '" cy="89.5" r="2" fill="#fff"/>';
      });
      return s + '<path d="M66 74 L90 79 M134 74 L110 79" stroke="' + LINE + '" stroke-width="3" stroke-linecap="round"/>';
    }
    [80, 120].forEach(function (x) {
      s += '<g' + (anim && mood === 'happy' ? ' class="hl-blink"' : '') + '>' +
        '<circle cx="' + x + '" cy="92" r="12.5" fill="#7DB87A"/><circle cx="' + x + '" cy="92.5" r="9" fill="#1F2A24"/>' +
        '<circle cx="' + (x + 4) + '" cy="88" r="3.6" fill="#fff"/><circle cx="' + (x - 3.5) + '" cy="96.5" r="1.7" fill="#fff"/></g>';
    });
    if (mood === 'sad') {
      s += '<path d="M67 88 Q80 80 93 86 L93 80 L67 80 Z" fill="' + p.base + '"/><path d="M107 86 Q120 80 133 88 L133 80 L107 80 Z" fill="' + p.base + '"/>' +
        '<path d="M68 78 L88 72 M132 78 L112 72" stroke="' + LINE + '" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M72 104 q3 6 0 9 q-3 -3 0 -9z" fill="#7FC4E0"/>';
    }
    return s;
  }

  function mouth(mood) {
    var nose = '<path d="M94 105 Q100 103 106 105 Q103 111 100 112 Q97 111 94 105 Z" fill="#E8918A" stroke="' + LINE + '" stroke-width="1.5"/>';
    if (mood === 'alert') return nose + '<ellipse cx="100" cy="120" rx="4.5" ry="5.5" fill="#7A3B3B" stroke="' + LINE + '" stroke-width="2"/>';
    if (mood === 'sad') return nose + '<path d="M91 121 Q100 114 109 121" fill="none" stroke="' + LINE + '" stroke-width="2.4" stroke-linecap="round"/>';
    return nose + '<path d="M100 112 Q96 119 90 116 M100 112 Q104 119 110 116" fill="none" stroke="' + LINE + '" stroke-width="2.4" stroke-linecap="round"/>';
  }

  // @@ITEMS-BEGIN (generated by scripts/sync_items.py from web/src/hashling/items.json; do not edit by hand)
  var ITEM_SVG = {
    "hat": {
      "hat_sprout": "<g><path d=\"M68 58 Q100 44 132 58\" fill=\"none\" stroke=\"#3E8E5A\" stroke-width=\"6\" stroke-linecap=\"round\"/><g fill=\"#6FAF6B\" stroke=\"#2C6B42\" stroke-width=\"1.5\"><ellipse cx=\"74\" cy=\"52\" rx=\"7\" ry=\"4\" transform=\"rotate(-35 74 52)\"/><ellipse cx=\"87\" cy=\"47\" rx=\"7\" ry=\"4\" transform=\"rotate(-15 87 47)\"/><ellipse cx=\"113\" cy=\"47\" rx=\"7\" ry=\"4\" transform=\"rotate(15 113 47)\"/><ellipse cx=\"126\" cy=\"52\" rx=\"7\" ry=\"4\" transform=\"rotate(35 126 52)\"/></g><path d=\"M100 48 C100 40 98 34 100 27\" fill=\"none\" stroke=\"#3E8E5A\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M100 33 C90 23 80 28 83 35 C89 38 96 36 100 33 Z\" fill=\"#6FAF6B\" stroke=\"#2C6B42\" stroke-width=\"1.5\"/><path d=\"M100 29 C110 16 123 21 119 30 C113 34 105 32 100 29 Z\" fill=\"#8FCB7A\" stroke=\"#2C6B42\" stroke-width=\"1.5\"/></g>",
      "hat_visor": "<g><path d=\"M58 70 Q100 46 142 70\" fill=\"none\" stroke=\"#2F3B4A\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M60 60 Q100 44 140 60 L152 44 Q100 22 48 44 Z\" fill=\"#1E3A5F\" stroke=\"#4A4A55\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><g stroke=\"#22D3C5\" stroke-width=\"1.3\" opacity=\"0.8\" fill=\"none\"><path d=\"M54 52 Q100 33 146 52\"/><path d=\"M76 52 L72 37\"/><path d=\"M89 48 L87 32\"/><path d=\"M100 47 L100 31\"/><path d=\"M111 48 L113 32\"/><path d=\"M124 52 L128 37\"/></g><path d=\"M60 41 Q78 33 92 31\" stroke=\"#fff\" stroke-width=\"2\" opacity=\"0.6\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"146\" cy=\"40\" r=\"3\" fill=\"#F2B33D\"/></g>",
      "hat_flower": "<g><path d=\"M64 60 Q100 42 136 60\" fill=\"none\" stroke=\"#6FAF6B\" stroke-width=\"4\" stroke-linecap=\"round\"/><g fill=\"#3E8E5A\"><ellipse cx=\"73\" cy=\"53\" rx=\"5\" ry=\"2.6\" transform=\"rotate(-30 73 53)\"/><ellipse cx=\"91\" cy=\"46\" rx=\"5\" ry=\"2.6\" transform=\"rotate(-10 91 46)\"/><ellipse cx=\"109\" cy=\"46\" rx=\"5\" ry=\"2.6\" transform=\"rotate(10 109 46)\"/><ellipse cx=\"127\" cy=\"53\" rx=\"5\" ry=\"2.6\" transform=\"rotate(30 127 53)\"/></g><g transform=\"translate(66 58)\"><g fill=\"#D9734E\"><circle cx=\"0\" cy=\"-4.5\" r=\"3.6\"/><circle cx=\"4.3\" cy=\"-1.4\" r=\"3.6\"/><circle cx=\"2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-4.3\" cy=\"-1.4\" r=\"3.6\"/></g><circle r=\"2.6\" fill=\"#F2B33D\"/></g><g transform=\"translate(82 49)\"><g fill=\"#F2B33D\"><circle cx=\"0\" cy=\"-4.5\" r=\"3.6\"/><circle cx=\"4.3\" cy=\"-1.4\" r=\"3.6\"/><circle cx=\"2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-4.3\" cy=\"-1.4\" r=\"3.6\"/></g><circle r=\"2.6\" fill=\"#8A4B2A\"/></g><g transform=\"translate(100 45) scale(1.2)\"><g fill=\"#F4A7C0\"><circle cx=\"0\" cy=\"-4.5\" r=\"3.6\"/><circle cx=\"4.3\" cy=\"-1.4\" r=\"3.6\"/><circle cx=\"2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-4.3\" cy=\"-1.4\" r=\"3.6\"/></g><circle r=\"2.6\" fill=\"#F2B33D\"/></g><g transform=\"translate(118 49)\"><g fill=\"#FFFFFF\" stroke=\"#E9DFC7\" stroke-width=\"0.6\"><circle cx=\"0\" cy=\"-4.5\" r=\"3.6\"/><circle cx=\"4.3\" cy=\"-1.4\" r=\"3.6\"/><circle cx=\"2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-4.3\" cy=\"-1.4\" r=\"3.6\"/></g><circle r=\"2.6\" fill=\"#F2B33D\"/></g><g transform=\"translate(134 58)\"><g fill=\"#D9734E\"><circle cx=\"0\" cy=\"-4.5\" r=\"3.6\"/><circle cx=\"4.3\" cy=\"-1.4\" r=\"3.6\"/><circle cx=\"2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-2.6\" cy=\"3.6\" r=\"3.6\"/><circle cx=\"-4.3\" cy=\"-1.4\" r=\"3.6\"/></g><circle r=\"2.6\" fill=\"#F2B33D\"/></g></g>",
      "hat_antenna": "<g><path d=\"M52 92 C46 34 154 34 148 92\" fill=\"none\" stroke=\"#2F3B4A\" stroke-width=\"6\" stroke-linecap=\"round\"/><rect x=\"40\" y=\"80\" width=\"16\" height=\"26\" rx=\"7\" fill=\"#2F3B4A\" stroke=\"#4A4A55\" stroke-width=\"2\"/><rect x=\"144\" y=\"80\" width=\"16\" height=\"26\" rx=\"7\" fill=\"#2F3B4A\" stroke=\"#4A4A55\" stroke-width=\"2\"/><rect x=\"44\" y=\"86\" width=\"8\" height=\"14\" rx=\"4\" fill=\"#22D3C5\" class=\"hl-glow\"/><rect x=\"148\" y=\"86\" width=\"8\" height=\"14\" rx=\"4\" fill=\"#22D3C5\" class=\"hl-glow\"/><path d=\"M50 104 Q54 120 72 122\" fill=\"none\" stroke=\"#2F3B4A\" stroke-width=\"3\" stroke-linecap=\"round\"/><circle cx=\"74\" cy=\"122\" r=\"4\" fill=\"#2F3B4A\"/><path d=\"M100 50 L100 26\" stroke=\"#4A4A55\" stroke-width=\"3\" stroke-linecap=\"round\"/><circle cx=\"100\" cy=\"21\" r=\"11\" fill=\"#22D3C5\" opacity=\"0.25\" class=\"hl-glow\"/><circle cx=\"100\" cy=\"21\" r=\"6\" fill=\"#22D3C5\" stroke=\"#0F8F86\" stroke-width=\"1.5\"/></g>"
    },
    "collar": {
      "collar_bell": "<g><path d=\"M62 124 Q100 150 138 124\" fill=\"none\" stroke=\"#D9463B\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M62 124 Q100 150 138 124\" fill=\"none\" stroke=\"#4A4A55\" stroke-width=\"8\" stroke-linecap=\"round\" opacity=\"0.15\" stroke-dasharray=\"1 7\"/><circle cx=\"100\" cy=\"145\" r=\"7.5\" fill=\"#F2B33D\" stroke=\"#4A4A55\" stroke-width=\"2\"/><path d=\"M95 147 L105 147\" stroke=\"#4A4A55\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><circle cx=\"100\" cy=\"150\" r=\"1.5\" fill=\"#4A4A55\"/><circle cx=\"97.5\" cy=\"142\" r=\"1.6\" fill=\"#fff\" opacity=\"0.8\"/></g>",
      "collar_vine": "<g><path d=\"M62 124 Q100 150 138 124\" fill=\"none\" stroke=\"#3E8E5A\" stroke-width=\"5\" stroke-linecap=\"round\"/><g fill=\"#6FAF6B\" stroke=\"#2C6B42\" stroke-width=\"1.2\"><ellipse cx=\"73\" cy=\"133\" rx=\"6\" ry=\"3.2\" transform=\"rotate(40 73 133)\"/><ellipse cx=\"86\" cy=\"139\" rx=\"6\" ry=\"3.2\" transform=\"rotate(-20 86 139)\"/><ellipse cx=\"114\" cy=\"139\" rx=\"6\" ry=\"3.2\" transform=\"rotate(20 114 139)\"/><ellipse cx=\"127\" cy=\"133\" rx=\"6\" ry=\"3.2\" transform=\"rotate(-40 127 133)\"/></g><g transform=\"translate(100 141)\"><g fill=\"#F4A7C0\"><circle cx=\"0\" cy=\"-3.5\" r=\"2.8\"/><circle cx=\"3.3\" cy=\"-1\" r=\"2.8\"/><circle cx=\"2\" cy=\"2.8\" r=\"2.8\"/><circle cx=\"-2\" cy=\"2.8\" r=\"2.8\"/><circle cx=\"-3.3\" cy=\"-1\" r=\"2.8\"/></g><circle r=\"2\" fill=\"#F2B33D\"/></g></g>",
      "collar_led": "<g><path d=\"M62 124 Q100 150 138 124\" fill=\"none\" stroke=\"#2F3B4A\" stroke-width=\"8\" stroke-linecap=\"round\"/><g fill=\"#22D3C5\" class=\"hl-glow\"><circle cx=\"73.4\" cy=\"130.6\" r=\"2.6\"/><circle cx=\"84.8\" cy=\"134.9\" r=\"2.6\"/><circle cx=\"115.2\" cy=\"134.9\" r=\"2.6\"/><circle cx=\"126.6\" cy=\"130.6\" r=\"2.6\"/></g><path d=\"M100 139 L106 142.5 L106 149.5 L100 153 L94 149.5 L94 142.5 Z\" fill=\"#1E3A5F\" stroke=\"#22D3C5\" stroke-width=\"1.8\"/><circle cx=\"100\" cy=\"146\" r=\"2.2\" fill=\"#22D3C5\" class=\"hl-glow\"/></g>"
    },
    "accessory_behind": {
      "acc_solar": "<g><g transform=\"rotate(-28 56 110)\"><rect x=\"36\" y=\"96\" width=\"40\" height=\"28\" rx=\"3\" fill=\"#1E3A5F\" stroke=\"#4A4A55\" stroke-width=\"2.5\"/><path d=\"M49 96 V124 M62 96 V124 M36 110 H76\" stroke=\"#22D3C5\" stroke-width=\"1.2\" opacity=\"0.8\"/></g><g transform=\"rotate(28 144 110)\"><rect x=\"124\" y=\"96\" width=\"40\" height=\"28\" rx=\"3\" fill=\"#1E3A5F\" stroke=\"#4A4A55\" stroke-width=\"2.5\"/><path d=\"M137 96 V124 M150 96 V124 M124 110 H164\" stroke=\"#22D3C5\" stroke-width=\"1.2\" opacity=\"0.8\"/></g><rect x=\"74\" y=\"112\" width=\"52\" height=\"30\" rx=\"10\" fill=\"#8A5A3B\" stroke=\"#4A4A55\" stroke-width=\"2.5\"/></g>"
    },
    "accessory_front": {
      "acc_solar": "<g stroke=\"#8A5A3B\" stroke-width=\"4.5\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M78 122 Q74 142 80 162\"/><path d=\"M122 122 Q126 142 120 162\"/><circle cx=\"79\" cy=\"140\" r=\"2\" fill=\"#F2B33D\" stroke=\"none\"/><circle cx=\"121\" cy=\"140\" r=\"2\" fill=\"#F2B33D\" stroke=\"none\"/></g>",
      "acc_glass": "<g><path d=\"M121 180 L139 160\" stroke=\"#8A5A3B\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M121 180 L139 160\" stroke=\"#4A4A55\" stroke-width=\"6\" stroke-linecap=\"round\" opacity=\"0.25\" stroke-dasharray=\"2 5\"/><circle cx=\"148\" cy=\"150\" r=\"14\" fill=\"#BFE3E8\" fill-opacity=\"0.55\" stroke=\"#4A4A55\" stroke-width=\"4\"/><circle cx=\"148\" cy=\"150\" r=\"14\" fill=\"none\" stroke=\"#F2B33D\" stroke-width=\"1.5\"/><path d=\"M140 145 Q143 140 148 139\" stroke=\"#fff\" stroke-width=\"2.2\" fill=\"none\" stroke-linecap=\"round\"/></g>",
      "acc_shield": "<g><path d=\"M100 146 L114 151 V161 C114 169 107 174 100 177 C93 174 86 169 86 161 V151 Z\" fill=\"#3E8E5A\" stroke=\"#4A4A55\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><path d=\"M100 149.5 L110.5 153.3 V161 C110.5 167 105 171 100 173.3 Z\" fill=\"#6FAF6B\" opacity=\"0.6\"/><path d=\"M94 161 L98.5 165.5 L106.5 156.5\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"114\" cy=\"151\" r=\"2\" fill=\"#22D3C5\" class=\"hl-glow\"/></g>"
    }
  };
  // @@ITEMS-END

  function build(opts) {
    opts = opts || {};
    var stage = opts.stage || 'egg';
    var mood = opts.mood || 'happy';
    var eq = opts.equipped || {};
    var size = opts.size || 120;
    var anim = opts.animated !== false;
    var p = FUR[eq.fur] || FUR.fur_classic;
    var uid = 'hl' + (++uidCounter) + Math.random().toString(36).slice(2, 6);
    var label = 'Hashling the ' + (stage === 'egg' ? 'egg' : 'snow-leopard ' + stage) + ', feeling ' + mood;
    var open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="' + size + '" height="' + size +
      '" role="img" aria-label="' + label + '" style="overflow:visible">' + STYLE;

    if (stage === 'egg') {
      return open + '<ellipse cx="100" cy="190" rx="46" ry="6" fill="#23332A" opacity="0.12"/>' +
        '<path d="M44 186 C60 170 78 178 88 188 Z M156 186 C140 170 122 178 112 188 Z" fill="#6FAF6B"/>' +
        egg(p, mood, anim) + (mood === 'sleepy' ? sleepyZ(anim) : '') + '</svg>';
    }

    var g = GEOM[stage] || GEOM.cub;
    var puffed = mood === 'alert';
    var earRot = mood === 'alert' ? 32 : mood === 'sad' ? 58 : mood === 'sleepy' ? 14 : 0;
    var earDy = mood === 'sad' ? 8 : 0;
    var s = open + '<defs><radialGradient id="belly-' + uid + '" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="' + p.belly + '"/></radialGradient>' +
      (p.glow ? '<filter id="glow-' + uid + '" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' : '') +
      '</defs>' +
      '<ellipse cx="100" cy="191" rx="' + 52 * g.all + '" ry="6" fill="#23332A" opacity="0.12"/>' +
      '<g transform="translate(100 192) scale(' + g.all + ') translate(-100 -192)"' + (puffed && anim ? ' class="hl-shake"' : '') + (p.glow ? ' filter="url(#glow-' + uid + ')"' : '') + '>';

    // accessory parts behind everything (backpack panels), then tail
    s += '<g transform="translate(100 186) scale(' + g.bs + ') translate(-100 -186)">' + item('accessory_behind', eq.accessory) + '</g>';
    s += '<g transform="translate(122 172) scale(' + g.ts + ') translate(-122 -172)"><g' + (anim && mood === 'happy' ? ' class="hl-tail"' : '') + '>' +
      '<path d="' + TAIL + '" fill="none" stroke="' + LINE + '" stroke-width="' + (puffed ? 31 : 25) + '" stroke-linecap="round"/>' +
      '<path d="' + TAIL + '" fill="none" stroke="' + p.base + '" stroke-width="' + (puffed ? 26 : 20) + '" stroke-linecap="round"/>' +
      '<path d="' + TAIL + '" fill="none" stroke="' + p.spot + '" stroke-width="' + (puffed ? 18 : 13) + '" stroke-dasharray="4 13" stroke-dashoffset="-14" opacity="0.75"/>' +
      '<circle cx="184" cy="97" r="' + (puffed ? 12 : 9.5) + '" fill="' + p.spot + '" stroke="' + LINE + '" stroke-width="2.5"/></g></g>';

    // body
    s += '<g transform="translate(100 186) scale(' + g.bs + ') translate(-100 -186)">' +
      '<g' + (anim && mood !== 'alert' ? ' class="hl-breathe"' : '') + '>' +
      (puffed ? '<path d="' + spiky(100, 150, 46, 41, 18, 0.12) + '" fill="' + p.base + '" stroke="' + LINE + '" stroke-width="2.5" stroke-linejoin="round"/>' : '') +
      '<ellipse cx="100" cy="150" rx="40" ry="37" fill="' + p.base + '" stroke="' + (puffed ? 'none' : LINE) + '" stroke-width="3"/>' +
      '<ellipse cx="100" cy="158" rx="24" ry="25" fill="url(#belly-' + uid + ')"/>' +
      rosette(70, 140, 5.5, p) + rosette(130, 138, 5.5, p) + rosette(72, 164, 4.5, p) + rosette(129, 163, 4.5, p) +
      '<circle cx="84" cy="124" r="2.3" fill="' + p.spot + '"/><circle cx="117" cy="124" r="2.3" fill="' + p.spot + '"/>';
    [83, 117].forEach(function (x) {
      s += '<ellipse cx="' + x + '" cy="183" rx="13" ry="8.5" fill="' + p.belly + '" stroke="' + LINE + '" stroke-width="2.6"/>' +
        '<path d="M' + (x - 4) + ' 180 v5 M' + (x + 4) + ' 180 v5" stroke="' + LINE + '" stroke-width="1.8" stroke-linecap="round"/>';
    });
    s += '</g>' + item('accessory_front', eq.accessory) + '</g>';

    // head
    s += '<g transform="translate(0 ' + g.dy + ') translate(100 90) scale(' + g.hs + ') translate(-100 -90)">' +
      '<g transform="translate(0 ' + earDy + ') rotate(' + -earRot + ' 72 62)"><path d="M56 74 C50 46 60 32 86 52 Z" fill="' + p.base + '" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round"/><path d="M62 66 C59 50 64 44 79 54 Z" fill="#F4B6B0"/></g>' +
      '<g transform="translate(0 ' + earDy + ') rotate(' + earRot + ' 128 62)"><path d="M144 74 C150 46 140 32 114 52 Z" fill="' + p.base + '" stroke="' + LINE + '" stroke-width="3" stroke-linejoin="round"/><path d="M138 66 C141 50 136 44 121 54 Z" fill="#F4B6B0"/></g>' +
      (puffed ? '<path d="' + spiky(100, 92, 55, 46, 16, 0.1) + '" fill="' + p.base + '" stroke="' + LINE + '" stroke-width="2.5" stroke-linejoin="round"/>' : '') +
      '<path d="M54 98 L40 106 L54 110 L44 118 L60 116 Z" fill="' + p.base + '" stroke="' + LINE + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M146 98 L160 106 L146 110 L156 118 L140 116 Z" fill="' + p.base + '" stroke="' + LINE + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<ellipse cx="100" cy="92" rx="50" ry="42" fill="' + p.base + '" stroke="' + (puffed ? 'none' : LINE) + '" stroke-width="3"/>' +
      '<ellipse cx="100" cy="110" rx="26" ry="17" fill="' + p.belly + '"/>' +
      '<circle cx="91" cy="60" r="2.6" fill="' + p.spot + '"/><circle cx="100" cy="56" r="3" fill="' + p.spot + '"/><circle cx="109" cy="60" r="2.6" fill="' + p.spot + '"/>' +
      '<circle cx="96" cy="68" r="1.8" fill="' + p.spot + '"/><circle cx="105" cy="68" r="1.8" fill="' + p.spot + '"/>' +
      rosette(64, 80, 5, p) + rosette(136, 80, 5, p) +
      '<ellipse cx="69" cy="109" rx="7.5" ry="4.2" fill="#F4A7A0" opacity="' + (mood === 'sad' ? 0.25 : 0.55) + '"/>' +
      '<ellipse cx="131" cy="109" rx="7.5" ry="4.2" fill="#F4A7A0" opacity="' + (mood === 'sad' ? 0.25 : 0.55) + '"/>' +
      eyes(mood, anim, p) + mouth(mood) +
      '<g stroke="' + LINE + '" stroke-width="1.4" stroke-linecap="round" opacity="0.7"><path d="M74 112 L50 108 M74 116 L52 120"/><path d="M126 112 L150 108 M126 116 L148 120"/></g>' +
      item('collar', eq.collar) + item('hat', eq.hat) + '</g></g>';

    return s + (mood === 'sleepy' ? sleepyZ(anim) : '') + '</svg>';
  }

  function item(group, id) {
    return (id && ITEM_SVG[group] && ITEM_SVG[group][id]) || '';
  }

  root.HashlingSVG = { build: build, FUR: FUR, LINE: LINE };
})(typeof window !== 'undefined' ? window : self);
