// HUNTR/X-inspired fan-art singers (generated images). Index order kept from v1 so saved photo-card ids still map:
// 0 = Zoey (was Noa), 1 = Rumi (was Shira), 2 = Mira (was Tal). Card id = level*3+song -> idol = id%3, theme = floor(id/3).
(function(){
const IDOLS=[
 {id:'zoey', color:'#ffd34d', glow:'#4fe3d6'},
 {id:'rumi', color:'#b58cff', glow:'#c9b6ff'},
 {id:'mira', color:'#ff4f7b', glow:'#ff8fb1'}
];
const THEMES=[
 {id:'stage', frame:['#ff7ac6','#b58cff']},
 {id:'space', frame:['#7b5cff','#4fc8ff']},
 {id:'summer', frame:['#ffd86b','#ff8fb1']},
 {id:'winter', frame:['#bfe8ff','#ffffff']},
 {id:'gala', frame:['#ffd34d','#ff5fae']}
];
function names(){return (window.DATA&&window.DATA.S&&window.DATA.S.idols)||['','','']}
function idolSVG(idx, opts){ opts=opts||{}; const I=IDOLS[idx%3];
 const nm=opts.noname?'':`<b class="idol-nm">${names()[idx%3]}</b>`;
 return `<div class="idol-svg idol-pic ${opts.cls||''}" style="--ic:${I.color};--ig:${I.glow}"><img src="img/${I.id}.webp" alt="" draggable="false" decoding="async">${nm}</div>`; }
function cardSVG(cardIdx){ const t=THEMES[Math.floor(cardIdx/3)]||THEMES[0];
 return `<div class="card-svg card-img" style="--f1:${t.frame[0]};--f2:${t.frame[1]}"><img src="img/c${cardIdx}.webp" alt="" draggable="false" loading="lazy" decoding="async"></div>`; }
function heroHTML(){ const n=names();
 return `<div class="hero"><img src="img/hero.webp" alt="" draggable="false" decoding="async"><div class="hero-nm"><span style="--ic:${IDOLS[2].color}">${n[2]}</span><span style="--ic:${IDOLS[1].color}">${n[1]}</span><span style="--ic:${IDOLS[0].color}">${n[0]}</span></div></div>`; }
window.IDOLS={IDOLS,THEMES,idolSVG,cardSVG,heroHTML};
})();
