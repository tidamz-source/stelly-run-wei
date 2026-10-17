/* Stelly Run : dessin de Stelly, partagé par le jeu (index.html) et l'atelier (atelier.html)
   Toute modification ici change Stelly partout : penser au ?v= de stelly.js dans les deux pages. */
window.StellyArt = (() => {
'use strict';
/* ================= Palette ================= */
const C = {
  plum:'#2E0E30', yellow:'#FFCF00', yellowL:'#FFE777', yellowM:'#FFDD45', orange:'#F29318', orangeD:'#D9760F',
  purple:'#7A57A0', purpleD:'#4A2679', purpleL:'#A58BC6', white:'#FFFFFF', glove:'#D8D3DF',
  mouth:'#6E1830', tongue:'#F2708A',
  disc:'#E08A2C', discD:'#B8661C', discB:'#5A3A10', discY:'#FDB60D', cream:'#F4E6D2', ring:'#EEDFCB',
  g1:'#5DBB63', g2:'#51AE58', g3:'#3E8F47', g4:'#2E7D4F', gL:'#8ED29A', gL2:'#83C98F', line:'#F6FFF7',
  red:'#E0413A', redL:'#FF8A7A', redD:'#A82A2A', grn:'#3FB75A', grnL:'#9AE8A6', grnD:'#23843C',
  sand:'#F2D48A', sand2:'#EACB7A', sandD:'#C99E4E', sandL:'#FBE7B3', tape:'#FFD500', tapeD:'#D9A400',
  floor:'#6FA3EC', floor2:'#679CE6', floorL:'#A3C8F5', floorD:'#5689D6'
};
const PAL = { o:C.plum, y:C.yellow, Y:C.yellowL, O:C.orange, D:C.orangeD, p:C.purple, d:C.purpleD,
  L:C.purpleL, w:C.white, g:C.glove, m:C.mouth, r:C.tongue, k:C.plum, x:C.plum };

/* ================= Outils de dessin ================= */
function mk(w, h, fn){ const c = document.createElement('canvas'); c.width = Math.max(1,w); c.height = Math.max(1,h); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; if (fn) fn(g); return c; }
function pm(g, map, x, y, flip, pal){
  pal = pal || PAL; x = Math.round(x); y = Math.round(y);
  for (let j = 0; j < map.length; j++){ const row = map[j];
    for (let i = 0; i < row.length; i++){ const ch = row[i]; if (ch === '.') continue;
      g.fillStyle = pal[ch]; g.fillRect(x + (flip ? row.length - 1 - i : i), y + j, 1, 1); } }
}
function thick(g, x0, y0, x1, y1, col){
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); g.fillStyle = col;
  const dx = Math.abs(x1-x0), dy = -Math.abs(y1-y0), sx = x0<x1?1:-1, sy = y0<y1?1:-1, steep = -dy > dx; let e = dx+dy;
  for(;;){ g.fillRect(x0, y0, steep ? 2 : 1, steep ? 1 : 2); if (x0===x1 && y0===y1) break; const e2 = 2*e; if (e2>=dy){ e+=dy; x0+=sx; } if (e2<=dx){ e+=dx; y0+=sy; } }
}
const lerp = (a,b,t) => a + (b-a)*t;
function ik(ax, ay, bx, by, L1, L2, bend){
  let d = Math.hypot(bx-ax, by-ay); d = Math.max(Math.abs(L1-L2)+.01, Math.min(L1+L2-.01, d));
  const base = Math.atan2(by-ay, bx-ax), a = Math.acos((L1*L1 + d*d - L2*L2) / (2*L1*d)), ang = base - bend*a;
  return [ax + Math.cos(ang)*L1, ay + Math.sin(ang)*L1];
}
function inPoly(p, x, y){ let c = false; for (let i=0, j=p.length-1; i<p.length; j=i++){ const [xi,yi]=p[i], [xj,yj]=p[j]; if (((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) c = !c; } return c; }
function segDist(px, py, a, b){ const vx=b[0]-a[0], vy=b[1]-a[1]; let t=((px-a[0])*vx+(py-a[1])*vy)/(vx*vx+vy*vy); t=Math.max(0,Math.min(1,t)); return Math.hypot(a[0]+vx*t-px, a[1]+vy*t-py); }

/* ================= Stelly ================= */
const EYE_HAPPY = ['.oooo.','owwwwo','owwwko','owwkko','owwkko','owwwwo','.oooo.'];
const EYE_FWD   = ['.oooo.','owwwwo','owwwwo','owwkko','owwkko','owwwwo','.oooo.'];
const EYE_BLINK = ['......','......','......','o....o','.oooo.'];
const EYE_KO    = ['o...o','.o.o.','..o..','.o.o.','o...o'];
const M_GRIN  = ['o......o','.owwwwo.','..oooo..'];
const M_SMILE = ['o......o','.ommmmo.','.omrrmo.','..oooo..'];
const M_JUMP  = ['.oooo.','ommmmo','omrrmo','.oooo.'];
const M_KO    = ['o.o.o.','.o.o.o'];
const POINT = ['..oo....','.owwo...','.owwo...','.owwooo.','oowwwwwo','owwwgwwo','owwwwwwo','.owwwwo.','.oggggo.','..oooo..'];
const FIST = ['..ooooo..','.owwwwwo.','owwwwwwwo','owgwgwgwo','owwwwwwwo','ogwwwwwwo','.ooggggo.','...oooo..'];
const HAND = ['.ooooo....','owwwwwooo.','owwwwwwwwo','oooowwwwwo','.owwwwwgwo','..oogggwo.','....oooo..'];
const SHOE = ['..ooooo......','.owwwwpo.....','.oppppLoooo..','oppppwLwLwoo.','oppppppppppLo','odpppppppppLo','odddddddddddo','.ooooooooooo.'];
const PAL_FAR = Object.assign({}, PAL, { p:C.purpleD, L:C.purple, d:C.plum, w:'#CFC6DB' });

const SW = 64, SH = 56, CX = 32, CY = 18, GROUND_Y = 45, FB = 52; // FB : bas des baskets
// PAD : marge au-dessus de Stelly pour les chapeaux
const PAD = 24;

const BODY_PAL = { yellow:'#FFCF00', yellowL:'#FFE777', yellowM:'#FFDD45', orange:'#F29318', orangeD:'#D9760F', cheek:'#F7A94A' };
function drawStelly(g, o){
  const eq = o.eq || {}, oy = o.oy || 0, cx = CX, cy = CY + (o.bob || 0) + oy, tilt = o.tilt || 0;
  const pts = []; for (let i=0;i<10;i++){ const a = -Math.PI/2 + i*Math.PI/5 + tilt, rad = i%2 ? 8.2 : 15; pts.push([cx + Math.cos(a)*rad, cy + Math.sin(a)*rad]); }
  const Wd = g.canvas.width, Hd = g.canvas.height, grid = new Uint8Array(Wd*Hd);
  for (let y=0;y<Hd;y++) for (let x=0;x<Wd;x++){ const px = x+.5, py = y+.5;
    if (Math.abs(px-cx) > 20 || Math.abs(py-cy) > 20) continue;
    let inside = inPoly(pts, px, py);
    if (!inside) for (let i=0;i<10;i++){ if (segDist(px, py, pts[i], pts[(i+1)%10]) <= 2.4){ inside = true; break; } }
    if (inside) grid[y*Wd+x] = 1; }
  const In = (x,y) => x>=0 && y>=0 && x<Wd && y<Hd && grid[y*Wd+x] === 1;
  const hips = [[cx-2 + tilt*10, cy+11], [cx+2 + tilt*10, cy+11]];
  const sh = [pts[8], pts[2]].map(p => [Math.round(lerp(p[0], cx, .28)), Math.round(lerp(p[1], cy, .28)) + 1]);
  const ank = [];
  // bodyOnly : l'étoile seule, sans bras ni jambes (vignettes de costume dans l'atelier)
  const arm = (i, A) => {
    if (o.bodyOnly) return;
    const hand = [A.h[0], A.h[1] + oy], s = sh[i], el = ik(s[0], s[1], hand[0], hand[1], 7, 7, A.b);
    thick(g, s[0], s[1], el[0], el[1], C.plum); thick(g, el[0], el[1], hand[0], hand[1], C.plum);
    if (A.g === 'none') return; const gl = A.g === 'hand' ? HAND : (A.g === 'point' ? POINT : FIST); pm(g, gl, hand[0] - (gl[0].length>>1), hand[1] - (gl === POINT ? 8 : 4), i === 0);
  };
  const leg = (i, L, far) => {
    if (o.bodyOnly) return;
    const a = [Math.round(L[0]), Math.round(L[1] + oy)], hp = hips[i], kn = ik(hp[0], hp[1], a[0], a[1], 9, 9, 1);
    thick(g, hp[0], hp[1], kn[0], kn[1], C.plum); thick(g, kn[0], kn[1], a[0], a[1], C.plum);
    const sh = eq.shoes; if (sh) g.drawImage(far ? sh.far : sh.img, a[0] + (far ? sh.fdx : sh.dx), a[1] + (far ? sh.fdy : sh.dy)); else pm(g, SHOE, a[0]-3, a[1]-1, false, far ? PAL_FAR : PAL); ank[i] = a;
  };
  arm(o.swap ? 1 : 0, o.arms[o.swap ? 1 : 0]);
  leg(0, o.legs[0], true); leg(1, o.legs[1], false);
  // corps : lumière en haut à droite, ombre en bas à gauche ; un costume remplace la palette de l'étoile
  const BP = eq.shirt && eq.shirt.pal ? eq.shirt.pal : BODY_PAL;
  for (let y=0;y<Hd;y++) for (let x=0;x<Wd;x++){ if (!In(x,y)) continue;
    let col = BP.yellow;
    if (!In(x-1,y) || !In(x+1,y) || !In(x,y-1) || !In(x,y+1)) col = C.plum;
    else if (!In(x-2,y) || !In(x-1,y+1)) col = BP.orangeD;
    else if (!In(x-3,y) || !In(x-4,y) || !In(x-2,y+2)) col = BP.orange;
    else if (!In(x-5,y) || !In(x-3,y+3)) col = BP.yellowM;
    else if (!In(x+2,y) || !In(x+1,y-2)) col = BP.yellowL;
    g.fillStyle = col; g.fillRect(x,y,1,1); }
  if (eq.shirt && eq.shirt.detail) g.drawImage(eq.shirt.detail, cx + eq.shirt.ddx, cy + eq.shirt.ddy);
  // petits reflets brillants sur les pointes hautes
  g.fillStyle = C.white; [[pts[0][0]+1, pts[0][1]+3],[pts[2][0]-3, pts[2][1]+1]].forEach(([a,b]) => { if (In(Math.round(a),Math.round(b))) g.fillRect(Math.round(a), Math.round(b), 1, 1); });
  // visage (les lunettes masquent les yeux)
  const e = o.eyes || EYE_HAPPY, ex = cx-5 + Math.round(tilt*6), ey = cy-7;
  if (!eq.glasses){ if (e === EYE_KO){ pm(g, e, ex, ey+1); pm(g, e, ex+6, ey+1); } else { pm(g, e, ex, ey); pm(g, e, ex+6, ey); } }
  g.fillStyle = BP.orange; [[-3,8],[-4,9],[-2,9],[12,8],[11,9],[13,9]].forEach(([a,b]) => g.fillRect(ex+a, ey+b, 1, 1));
  g.fillStyle = BP.cheek; g.fillRect(ex-3, ey+9, 1, 1); g.fillRect(ex+12, ey+9, 1, 1);
  const m = o.mouth || M_GRIN; pm(g, m, ex + 6 - (m[0].length>>1), ey + 8);
  if (eq.glasses) g.drawImage(eq.glasses.img, ex + 6 + eq.glasses.dx, ey + 3 + eq.glasses.dy);
  { const a0 = -Math.PI/2 + tilt; ank.head = [Math.round(cx + Math.cos(a0)*15), Math.round(cy + Math.sin(a0)*15)]; }
  arm(o.swap ? 0 : 1, o.arms[o.swap ? 0 : 1]);
  if (o.disc) g.drawImage(o.disc, o.arms[1].h[0] - (o.disc.width>>1), o.arms[1].h[1] + oy - o.disc.height - 1);
  return ank;
}
// chapeau dessiné par-dessus Stelly au moment de l'affichage : les chapeaux animés bouclent leurs images (10 par seconde)
function drawHat(g, spr, x, y, it, tm){
  if (!it || !spr.head) return;
  const f = it.frames && it.frames.length > 1 ? it.frames[Math.floor(tm*10) % it.frames.length] : it;
  if (f.img) g.drawImage(f.img, x + spr.head[0] + f.dx, y + spr.head[1] + f.dy);
}
const SHL = [CX-11, CY-2], SHR = [CX+11, CY-2];
const rel = (s, dx, dy, bob) => [s[0]+dx, s[1]+dy+(bob||0)];

const RUN_N = 12;
function runPose(f){
  const ph = f / RUN_N, bob = Math.round(-1.4*Math.cos(4*Math.PI*ph) + .3), tilt = .08;
  const foot = p => { p = ((p%1)+1)%1;
    if (p < .5){ const s = p/.5; return [lerp(9, -9, s), 0]; }
    const s = (p-.5)/.5, e = (1-Math.cos(Math.PI*s))/2; return [lerp(-9, 10, e), -11*Math.sin(Math.PI*Math.pow(s,.7))]; };
  const hx = CX + tilt*10, fa = foot(ph+.5), fb = foot(ph), A = Math.sin(2*Math.PI*ph);
  return { bob, tilt, eyes:EYE_HAPPY, mouth:M_SMILE, swap:true,
    legs:[[hx-2+fa[0], GROUND_Y+fa[1]], [hx+2+fb[0], GROUND_Y+fb[1]]],
    arms:[ { h:rel(SHL, -1-7*A, 9-3*Math.abs(A), bob), g:'fist', b:-1 },
           { h:rel(SHR, 2+7*A, 8-4*A, bob), g:'fist', b:-1 } ] };
}
// poses du jeu (options de drawStelly) ; course : RUN_N images
const POSES = {
  run: Array.from({ length: RUN_N }, (_, f) => runPose(f)),
  rise: { tilt:.12, eyes:EYE_FWD, mouth:M_JUMP, legs:[[CX+5, GROUND_Y-9],[CX-2, GROUND_Y-2]],
  arms:[{h:rel(SHL,-8,-3),g:'fist',b:1},{h:rel(SHR,5,-9),g:'fist',b:-1}] },
  apex: { tilt:.05, eyes:EYE_HAPPY, mouth:M_SMILE, legs:[[CX+4, GROUND_Y-10],[CX+1, GROUND_Y-7]],
  arms:[{h:rel(SHL,-9,-2),g:'hand',b:1},{h:rel(SHR,9,-3),g:'hand',b:-1}] },
  fall: { tilt:-.02, eyes:EYE_FWD, mouth:M_JUMP, legs:[[CX+1, GROUND_Y],[CX-1, GROUND_Y-1]],
  arms:[{h:rel(SHL,-6,-9),g:'hand',b:1},{h:rel(SHR,6,-10),g:'hand',b:-1}] },
  land: { bob:3, tilt:.1, eyes:EYE_HAPPY, mouth:M_SMILE, legs:[[CX-9, GROUND_Y],[CX+10, GROUND_Y]],
  arms:[{h:rel(SHL,-8,8,3),g:'fist',b:-1},{h:rel(SHR,8,7,3),g:'fist',b:1}] },
  dead: { tilt:-.35, eyes:EYE_KO, mouth:M_KO, legs:[[CX-12, GROUND_Y-2],[CX+11, GROUND_Y-3]],
  arms:[{h:rel(SHL,-7,-9),g:'hand',b:1},{h:rel(SHR,7,-9),g:'hand',b:-1}] },
};

return { C, PAL, mk, pm, thick, lerp, ik, inPoly, segDist,
  EYE_HAPPY, EYE_FWD, EYE_BLINK, EYE_KO, M_GRIN, M_SMILE, M_JUMP, M_KO, POINT, FIST, HAND, SHOE, PAL_FAR,
  SW, SH, CX, CY, GROUND_Y, FB, PAD, BODY_PAL, drawStelly, drawHat, SHL, SHR, rel, RUN_N, runPose, POSES };
})();
