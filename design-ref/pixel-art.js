// ============================================================
// pixel-art.js — procedural pixel-art renderer (v2, high-craft)
// Dithered skies · multi-tone stone · warm/cool lighting ·
// moonbeam · fire bloom · foreground depth · vignette · dust.
// Static layers are cached to an offscreen canvas; only the
// living parts (stars, shooting stars, flames, rain, dust) redraw.
//   window.PixelArt.drawScene(ctx, W, H, state)
//   window.PixelArt.drawRobot(ctx, W, H, state)
// ============================================================
(function () {
  // ---------------- palette ----------------
  const PAL = {
    // cool grey-blue stone (5 tones + edge)
    stoneXD:'#171c28', stoneD:'#242c3c', stone:'#374052', stoneL:'#525d72', stoneHi:'#727f97', stoneEdge:'#929db4',
    moss:'#3a4a3a',
    // night sky, top -> horizon
    skyNight:   ['#0e1430','#141d3c','#1b274c','#243460','#2f4470','#43597e','#6a7e84'],
    skyTwilight:['#161634','#272150','#43355f','#6a4763','#965f5e','#c08562','#dcae7e'],
    skyDawn:    ['#1f1c40','#3a3160','#6a4f6e','#9c6a68','#cf8c66','#e7b074','#f2cf94'],
    skyDay:     ['#2f5d97','#4574a8','#6692bb','#8fb1cc','#b6cdda','#d4e0df','#e7ecdf'],
    skyDusk:    ['#161433','#332650','#5d3358','#90414b','#c05f3c','#dd8b4a','#eab978'],
    starA:'#f4eecf', starB:'#cfd0b6', starC:'#8c97ac',
    shoot:'#fff6d8', shootB:'#ffd98a', shootC:'#caa45a',
    horizonGlow:'#6f8a86', land:'#1c3a38', landD:'#142a30',
    castle:'#0c1322', castleEdge:'#1a2536', castleLit:'#ffc24a',
    // crimson drape / bed
    redXD:'#27090f', redD:'#4d1119', red:'#7a1f25', redL:'#a32d2f', redHi:'#c8543f', redRim:'#e08a5a',
    // brass / gold
    brassXD:'#4a3614', brassD:'#7c5a22', brass:'#b78f38', brassL:'#dcb45e', brassHi:'#f6e3a0',
    // wood furniture
    woodXD:'#1f1409', woodD:'#3a2614', wood:'#54391f', woodL:'#75522c', woodHi:'#9a7440',
    // fire
    fire0:'#fff4b0', fire1:'#ffd24a', fire2:'#ff9a2a', fire3:'#ff5a1e', fire4:'#c0341a', ember:'#7a1e0c',
    // potion glows
    potT:'#56e6c4', potP:'#b27ce6', potG:'#9ae45e',
    // robot
    rXD:'#241a10', rD:'#3a2a18', r:'#54401f', rL:'#74592c', rHi:'#9a7a44',
    rFrameD:'#7c5a22', rFrame:'#b78f38', rFrameL:'#e6c574',
    face:'#0a0d09', faceEdge:'#1b2316', eye:'#ffd45a', eyeHi:'#fff2c0', eyeGlow:'rgba(255,190,80,',
    belly:'#0a0e08', amber:'#ffd45a', amberGlow:'rgba(255,180,70,',
    knit:'#37563d', knitD:'#26402c', knitHi:'#4d7050',
    parch:'#e7d6ad',
  };
  const DAY = {
    stoneXD:'#5a4a30', stoneD:'#745e3a', stone:'#917442', stoneL:'#b0915a', stoneHi:'#cdb074', stoneEdge:'#e3cd92',
    moss:'#6a7444',
    redXD:'#3a1014', redD:'#6a1c1f', red:'#9a2f2a', redL:'#bd4a3c', redHi:'#d97a52', redRim:'#eaa86c',
    woodXD:'#3a2614', woodD:'#54391f', wood:'#75522c', woodL:'#9a7440', woodHi:'#bd9456',
    land:'#3a5a44', landD:'#2a4636', horizonGlow:'#a9c79a',
  };
  function pal(s){ return (s && s.theme === 'day') ? Object.assign({}, PAL, DAY) : PAL; }

  const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  function rnd(i){ const x = Math.sin(i*127.13+11.7)*43758.5453; return x-Math.floor(x); }
  const P = (c,x,y,w,h,col)=>{ c.fillStyle=col; c.fillRect(x|0,y|0,Math.max(1,w|0),Math.max(1,h|0)); };

  // ---- 3x5 digit font ----
  const DIG={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],':':['0','1','0','1','0']};
  function textWidth(str,cell){let w=0;for(const ch of str){const g=DIG[ch]||DIG['0'];w+=g[0].length*cell+cell;}return w-cell;}
  function drawDigits(c,x,y,str,cell,color){let cx=x;for(const ch of str){const g=DIG[ch]||DIG['0'];for(let r=0;r<g.length;r++)for(let k=0;k<g[r].length;k++)if(g[r][k]==='1'){c.fillStyle=color;c.fillRect(cx+k*cell,y+r*cell,cell,cell);}cx+=g[0].length*cell+cell;}}

  // dithered vertical gradient across a list of colors, clipped by caller
  function ditherV(c,x0,y0,x1,y1,colors){
    const n=colors.length-1, span=Math.max(1,y1-y0);
    for(let y=y0;y<y1;y++){
      const f=(y-y0)/span*n, i=Math.min(n-1,Math.max(0,Math.floor(f))), frac=f-i;
      for(let x=x0;x<x1;x++){
        const th=BAYER[y&3][x&3]/16;
        c.fillStyle = frac>th ? colors[i+1] : colors[i];
        c.fillRect(x,y,1,1);
      }
    }
  }
  // dithered solid wash (one color at given coverage) for soft glows/shadows
  function ditherWash(c,x0,y0,x1,y1,color,cov){
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){ if(BAYER[y&3][x&3]/16 < cov){ c.fillStyle=color; c.fillRect(x,y,1,1);} }
  }

  function geom(W,H){
    const ox0=Math.round(W*0.275), ox1=Math.round(W*0.725);
    const oyTop=Math.round(H*0.34), oyBot=Math.round(H*0.70);
    const ocx=(ox0+ox1)/2, orx=(ox1-ox0)/2, ory=oyTop-Math.round(H*0.11);
    const apexY=oyTop-ory, horizon=Math.round(H*0.56);
    return {ox0,ox1,oyTop,oyBot,ocx,orx,ory,apexY,horizon};
  }
  function openingPath(c,g){
    c.beginPath();
    c.moveTo(g.ox0,g.oyBot); c.lineTo(g.ox0,g.oyTop);
    c.ellipse(g.ocx,g.oyTop,g.orx,g.ory,0,Math.PI,2*Math.PI,false);
    c.lineTo(g.ox1,g.oyBot); c.closePath();
  }

  // ---------------- STATIC LAYER (cached) ----------------
  let _cache={};
  function buildStatic(W,H,state){
    const C=pal(state);
    const tod=state.timeofday||'night', weather=state.weather||'clear';
    const showFire=state.fireplace!==false, showDrape=state.drape!==false;
    const off=document.createElement('canvas'); off.width=W; off.height=H;
    const c=off.getContext('2d'); c.imageSmoothingEnabled=false;
    const g=geom(W,H);
    const nightish = tod==='night'||tod==='twilight';

    // ----- back wall: textured stone bricks -----
    P(c,0,0,W,H,C.stoneXD);
    const bh=Math.round(H*0.052), bw=Math.round(W*0.10);
    let row=0;
    for(let y=0;y<H;y+=bh){
      const off2=(row%2)*Math.round(bw/2);
      for(let x=-bw;x<W;x+=bw){
        const bx=x+off2, seed=(bx*13+y*7);
        const tone=[C.stoneD,C.stone,C.stoneD,C.stone,C.stoneL][Math.floor(rnd(seed)*5)];
        P(c,bx+1,y+1,bw-2,bh-2,tone);
        // top sheen + bottom shade
        P(c,bx+1,y+1,bw-2,1,C.stoneL);
        P(c,bx+1,y+bh-2,bw-2,1,C.stoneXD);
        // occasional crack / moss
        if(rnd(seed+3)>0.86) P(c,bx+3+rnd(seed+4)*(bw-6),y+2,1,bh-4,C.stoneXD);
        if(rnd(seed+9)>0.92) P(c,bx+2,y+bh-3,3,2,C.moss);
      }
      row++;
    }
    // mortar grid darkening
    ditherWash(c,0,0,W,H,'#0a0c14',0.06);

    // ----- sky inside arched opening -----
    c.save(); openingPath(c,g); c.clip();
    const bands = C['sky'+tod.charAt(0).toUpperCase()+tod.slice(1)] || C.skyNight;
    ditherV(c, g.ox0-3, g.apexY, g.ox1+3, g.oyBot, bands);
    // horizon glow band
    ditherWash(c, g.ox0-3, g.horizon-6, g.ox1+3, g.horizon+8, C.horizonGlow, 0.4);
    // distant landscape + castle
    P(c,g.ox0-3,g.horizon+2,(g.ox1-g.ox0)+6,g.oyBot-g.horizon,C.landD);
    P(c,g.ox0-3,g.horizon+2,(g.ox1-g.ox0)+6,3,C.land);
    drawCastleStatic(c,g.ocx+Math.round(W*0.04),g.horizon+3,C);
    // celestial body
    if(nightish){
      const mx=g.ox1-Math.round(W*0.06), my=g.apexY+Math.round(H*0.07), mr=Math.round(W*0.028);
      for(let yy=-mr;yy<=mr;yy++)for(let xx=-mr;xx<=mr;xx++){ if(xx*xx+yy*yy<=mr*mr){ P(c,mx+xx,my+yy,1,1, (xx*xx+yy*yy>(mr-1)*(mr-1))?C.starB:C.starA);} }
      ditherWash(c,mx-mr-3,my-mr-3,mx+mr+3,my+mr+3,C.starA,0.12); // moon halo
      P(c,mx-mr+2,my-mr,mr+2,2*mr,bands[0]); // carve crescent
    } else {
      const sx=g.ox0+Math.round(W*0.07), sy=g.apexY+Math.round(H*0.08), sr=Math.round(W*0.032);
      const sun = tod==='day'?'#fff4cc':'#ffcf86';
      for(let yy=-sr;yy<=sr;yy++)for(let xx=-sr;xx<=sr;xx++){ if(xx*xx+yy*yy<=sr*sr) P(c,sx+xx,sy+yy,1,1,sun); }
      ditherWash(c,sx-sr-5,sy-sr-5,sx+sr+5,sy+sr+5,sun,0.16);
    }
    // weather darken baked in
    const dk={clear:0,cloudy:0.14,rain:0.30,storm:0.46}[weather]||0;
    if(dk) ditherWash(c,g.ox0-3,g.apexY,g.ox1+3,g.oyBot,'#070a14',dk+0.2);
    if(dk) P(c,g.ox0-3,g.apexY,(g.ox1-g.ox0)+6,g.oyBot-g.apexY,'rgba(7,10,20,'+(dk*0.5)+')');
    // leaded panes
    for(let gx=g.ox0+(g.ox1-g.ox0)/3; gx<g.ox1-2; gx+=(g.ox1-g.ox0)/3) P(c,gx,g.oyTop-2,2,g.oyBot-g.oyTop+2,'rgba(10,12,20,0.85)');
    for(let gy=g.oyTop+(g.oyBot-g.oyTop)/3.2; gy<g.oyBot-2; gy+=(g.oyBot-g.oyTop)/3.2) P(c,g.ox0,gy,g.ox1-g.ox0,2,'rgba(10,12,20,0.8)');
    c.restore();

    // ----- columns + arch frame (carved stone) -----
    drawColumns(c,g,C,W,H);

    // ----- moonbeam / cool light through glass onto foreground -----
    if(nightish){
      c.save();
      c.beginPath();
      c.moveTo(g.ox0+6,g.oyBot); c.lineTo(g.ox1-6,g.oyBot);
      c.lineTo(g.ox1+Math.round(W*0.06),H); c.lineTo(g.ox0-Math.round(W*0.12),H); c.closePath(); c.clip();
      ditherWash(c,0,g.oyBot,W,H,'#9fb6e0',0.16);
      c.restore();
    }

    // ----- foreground: deep red draped sill / bed -----
    drawDrapedSill(c,g,C,W,H);

    // ----- left wall drape (curtain) -----
    if(showDrape) drawCurtain(c,0,0,Math.round(W*0.16),g.oyBot+Math.round(H*0.04),C,H);

    // ----- right wall: fireplace surround (static) + clutter -----
    if(showFire) drawHearthStatic(c,Math.round(W*0.80),g.oyBot,W,H,C);
    drawClutter(c,g,C,W,H);

    // ----- warm fire glow wash on the right (static) -----
    if(showFire){
      const fx=Math.round(W*0.88), fy=g.oyBot-Math.round(H*0.06);
      const grad=c.createRadialGradient(fx,fy,4,fx,fy,Math.round(W*0.42));
      grad.addColorStop(0,'rgba(255,150,55,0.30)'); grad.addColorStop(1,'rgba(255,150,55,0)');
      c.fillStyle=grad; c.fillRect(0,0,W,H);
    }

    // ----- global warm/cool grade + vignette -----
    // cool top-left
    let gg=c.createLinearGradient(0,0,W*0.7,H*0.7);
    gg.addColorStop(0,'rgba(60,90,150,0.10)'); gg.addColorStop(1,'rgba(60,90,150,0)');
    c.fillStyle=gg; c.fillRect(0,0,W,H);
    // vignette
    const vg=c.createRadialGradient(W/2,H*0.5,H*0.3,W/2,H*0.5,H*0.85);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.55)');
    c.fillStyle=vg; c.fillRect(0,0,W,H);

    return off;
  }

  function drawCastleStatic(c,cx,baseY,C){
    const tw=(x,w,h)=>{ P(c,x,baseY-h,w,h,C.castle); P(c,x,baseY-h,1,h,C.castleEdge);
      for(let i=0;i<w;i+=3) P(c,x+i,baseY-h-2,2,2,C.castle); };
    tw(cx-18,5,12); tw(cx-11,8,20); P(c,cx-9,baseY-28,4,8,C.castle); P(c,cx-9,baseY-26,2,2,C.castleLit);
    tw(cx-1,11,30); P(c,cx+1,baseY-34,3,5,C.castle); // spire
    P(c,cx+2,baseY-20,2,2,C.castleLit); P(c,cx+5,baseY-14,2,2,C.castleLit);
    tw(cx+11,6,16); P(c,cx+13,baseY-12,2,2,C.castleLit);
    P(c,cx-14,baseY-6,30,6,C.castle);
  }

  function drawColumns(c,g,C,W,H){
    const cw=Math.max(5,Math.round(W*0.045));
    [g.ox0-cw, g.ox1].forEach((x,side)=>{
      // shaft with fluting
      for(let y=g.oyTop-2;y<g.oyBot+4;y+=1){
        P(c,x,y,cw,1, (y%6<1)?C.stoneXD:C.stone);
      }
      P(c,x,g.oyTop-2,2,g.oyBot-g.oyTop+6,C.stoneL);            // lit edge
      P(c,x+cw-2,g.oyTop-2,2,g.oyBot-g.oyTop+6,C.stoneXD);      // shade edge
      P(c,x+(side?0:cw-2),g.oyTop-2,2,g.oyBot-g.oyTop+6,C.stoneHi); // inner highlight toward glass
      // capital
      P(c,x-2,g.oyTop-6,cw+4,6,C.stoneL); P(c,x-2,g.oyTop-6,cw+4,2,C.stoneHi);
      // base
      P(c,x-3,g.oyBot,cw+6,6,C.stoneL); P(c,x-3,g.oyBot+5,cw+6,2,C.stoneXD);
    });
    // voussoir arch
    for(let a=Math.PI;a<=2*Math.PI+0.01;a+=0.10){
      const x=g.ocx+Math.cos(a)*(g.orx+2), y=g.oyTop+Math.sin(a)*(g.ory+2);
      P(c,x-3,y-3,6,6,C.stone); P(c,x-3,y-3,6,2,C.stoneL); P(c,x+1,y-3,2,6,C.stoneXD);
    }
    // keystone
    P(c,g.ocx-4,g.apexY-7,8,9,C.stoneL); P(c,g.ocx-4,g.apexY-7,8,2,C.stoneHi); P(c,g.ocx-2,g.apexY-3,4,4,C.stoneEdge);
  }

  function drawCurtain(c,x,y,w,h,C,H){
    P(c,x,y,w,h,C.red);
    const folds=4, fw=w/folds;
    for(let i=0;i<folds;i++){
      P(c,x+i*fw,y,2,h,C.redXD);
      P(c,x+i*fw+2,y,Math.max(1,fw*0.4),h,C.redD);
      P(c,x+i*fw+fw-3,y,2,h,C.redHi);
    }
    // valance scallops
    for(let i=0;i<folds+1;i++){ const sx=x+i*fw-fw/2; P(c,sx+2,y+Math.round(H*0.05),fw-4,4,C.redD); P(c,sx+fw/2-1,y+Math.round(H*0.05)+4,2,4,C.redXD); }
    // brass rod + tieback
    P(c,x,y+2,w,3,C.brass); P(c,x,y+2,w,1,C.brassHi);
    P(c,x+w-4,y+h*0.46,8,5,C.brass); P(c,x+w-4,y+h*0.46,8,2,C.brassHi);
  }

  function drawDrapedSill(c,g,C,W,H){
    const y0=g.oyBot+Math.round(H*0.02);
    P(c,0,y0,W,H-y0,C.redD);
    // folds via vertical bands of tone
    for(let x=0;x<W;x+=Math.round(W*0.06)){
      const s=rnd(x);
      P(c,x,y0,Math.round(W*0.03),H-y0, s>0.5?C.red:C.redXD);
      P(c,x+Math.round(W*0.03),y0,2,H-y0,C.redHi);
    }
    // crest of the bed near the window (rolled edge)
    P(c,g.ox0-Math.round(W*0.06),y0-3,(g.ox1-g.ox0)+Math.round(W*0.12),6,C.redL);
    P(c,g.ox0-Math.round(W*0.06),y0-3,(g.ox1-g.ox0)+Math.round(W*0.12),2,C.redRim);
    ditherWash(c,0,y0,W,H,'#1a0608',0.18);
  }

  function drawHearthStatic(c,x,baseY,W,H,C){
    const top=baseY-Math.round(H*0.30);
    // surround
    P(c,x-4,top,(W-x)+4,baseY-top+8,C.stone);
    P(c,x-4,top,(W-x)+4,3,C.stoneL);
    for(let y=top;y<baseY;y+=Math.round(H*0.05)) P(c,x-4,y,(W-x)+4,1,C.stoneXD);
    // arched firebox opening
    const bx=x+4, bw=(W-x)-8, by=top+Math.round(H*0.06), bh=baseY-by;
    P(c,bx,by,bw,bh,'#0a0805');
    for(let i=0;i<bw;i+=3) P(c,bx+i,by-2,2,2,C.stoneL); // arch lip
    // logs
    P(c,bx+1,baseY-7,bw-2,5,C.woodD); P(c,bx+3,baseY-10,bw-8,4,C.wood); P(c,bx+5,baseY-12,bw-14,3,C.woodL);
    // mantel clock
    P(c,x+(W-x)/2-5,top-9,10,9,C.brassD); P(c,x+(W-x)/2-5,top-9,10,2,C.brassHi);
    P(c,x+(W-x)/2-3,top-7,6,5,'#15110a'); P(c,x+(W-x)/2,top-5,1,2,C.brassL);
  }

  function drawClutter(c,g,C,W,H){
    const sy=g.oyBot+Math.round(H*0.015);
    // stack of books (left of robot)
    let bxx=g.ox0-Math.round(W*0.10), byy=sy;
    [C.red,C.brassD,C.knit,C.woodL].forEach((col,i)=>{
      const w=Math.round(W*0.085)-i*2, hh=Math.round(H*0.022);
      P(c,bxx+i,byy-(i+1)*hh,w,hh,col);
      P(c,bxx+i,byy-(i+1)*hh,w,1,'rgba(255,255,255,0.18)');
      P(c,bxx+i+w-2,byy-(i+1)*hh,2,hh,'rgba(0,0,0,0.3)'); // gilt page edge
      P(c,bxx+i+1,byy-(i+1)*hh+1,1,hh-2,C.brassL);
    });
    // candle on the books
    const cax=bxx+Math.round(W*0.03);
    P(c,cax,byy-Math.round(H*0.11),4,Math.round(H*0.055),C.parch);
    P(c,cax,byy-Math.round(H*0.11),1,Math.round(H*0.055),'#fff7e0');
    // potion bottle (alchemist nod, right of robot)
    const px=g.ox1+Math.round(W*0.05);
    P(c,px,sy-Math.round(H*0.07),7,Math.round(H*0.065),'rgba(40,60,55,0.6)');
    P(c,px+1,sy-Math.round(H*0.05),5,Math.round(H*0.04),C.potT);
    P(c,px+2,sy-Math.round(H*0.03),2,Math.round(H*0.02),'#bff7e8');
    P(c,px+2,sy-Math.round(H*0.085),3,3,C.woodD); // cork
    ditherWash(c,px-3,sy-Math.round(H*0.09),px+10,sy,C.potT,0.12); // glow
    // quill + inkwell
    P(c,px+Math.round(W*0.04),sy-6,5,6,'#10100c'); // inkwell
    P(c,px+Math.round(W*0.045),sy-18,1,13,C.parch); // quill shaft (lean)
    P(c,px+Math.round(W*0.045)-2,sy-20,4,4,'#d8c9a0');
  }

  // ---------------- DYNAMIC + COMPOSITE ----------------
  function drawScene(ctx,W,H,state){
    state=state||{};
    const C=pal(state), t=state.t||0;
    const tod=state.timeofday||'night', weather=state.weather||'clear';
    const sig=[W,H,state.theme||'night',tod,weather,state.fireplace!==false,state.drape!==false].join('|');
    if(!_cache[sig]) { _cache[sig]=buildStatic(W,H,state); _cache._keys=(_cache._keys||[]); _cache._keys.push(sig);
      if(_cache._keys.length>14){ const k=_cache._keys.shift(); delete _cache[k]; } }
    ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,W,H);
    ctx.drawImage(_cache[sig],0,0);

    const g=geom(W,H);
    const nightish = tod==='night'||tod==='twilight';

    ctx.save(); openingPath(ctx,g); ctx.clip();
    // stars (twinkle)
    if(nightish){
      for(let i=0;i<58;i++){
        const sx=g.ox0+3+rnd(i)*(g.ox1-g.ox0-6);
        const sy=g.apexY+3+rnd(i+99)*(g.horizon-g.apexY-4);
        const tw=Math.sin(t*1.8+i*1.3);
        if(tw>-0.1){ const b=rnd(i+5); P(ctx,sx,sy,b>0.9?2:1,b>0.9?2:1, tw>0.6?C.starA:(b>0.5?C.starB:C.starC)); }
      }
      // shooting stars with glowing trail
      for(let s=0;s<3;s++){
        const period=6.5, ph=(((t+s*2.4)%period)/period);
        if(ph<0.32){
          const k=ph/0.32;
          const px=g.ox0+6+k*(g.ox1-g.ox0)*1.3, py=g.apexY+8+k*(g.horizon-g.apexY)*0.75;
          for(let q=0;q<10;q++){ const a=1-q/10; const col=q<2?C.shoot:(q<5?C.shootB:C.shootC); P(ctx,px-q*2.4,py-q*1.3,a>0.4?2:1,a>0.4?2:1,col); }
        }
      }
    }
    // drifting clouds
    if(weather!=='clear'){
      const dark=weather==='storm';
      for(let i=0;i<3;i++){
        const drift=((t*5+i*40)%(g.ox1-g.ox0+50))-25;
        const cx=g.ox0+drift, cy=g.apexY+8+(i%2)*Math.round(H*0.06);
        const col=dark?'#23232e':'rgba(120,120,135,0.7)', colL=dark?'#33333e':'rgba(150,150,165,0.7)';
        P(ctx,cx,cy,26,7,col); P(ctx,cx+6,cy-4,16,5,col); P(ctx,cx+3,cy,20,2,colL);
      }
    }
    // rain
    if(weather==='rain'||weather==='storm'){
      for(let i=0;i<46;i++){
        const baseX=g.ox0+rnd(i)*(g.ox1-g.ox0);
        const sp=70+rnd(i+5)*50;
        const y=g.apexY+((t*sp+rnd(i+9)*260)%(g.oyBot-g.apexY));
        P(ctx,baseX+(y-g.apexY)*0.16,y,1,5,'rgba(200,214,235,0.5)');
      }
    }
    if(weather==='storm'){ const f=(t%5); if(f>4.7&&f<4.86) P(ctx,g.ox0-3,g.apexY,(g.ox1-g.ox0)+6,g.oyBot-g.apexY,'rgba(235,235,255,0.45)'); }
    ctx.restore();

    // fireplace flames (dynamic) + flicker glow
    if(state.fireplace!==false){
      const fx=Math.round(W*0.80), baseY=g.oyBot;
      const bx=fx+8, bw=(W-fx)-16;
      const cols=[C.fire4,C.fire3,C.fire2,C.fire1,C.fire0];
      for(let i=0;i<bw;i+=2){
        const wob=Math.sin(t*6+i*0.7)*2;
        const hgt=Math.round(H*0.06)+Math.abs(Math.sin(t*5+i*1.3))*Math.round(H*0.10);
        for(let l=0;l<5;l++){ const lh=hgt*(1-l*0.18); P(ctx,bx+i+wob*(l/5),baseY-7-lh,2,lh,cols[l]); }
      }
      // embers
      for(let e=0;e<6;e++){ const ey=baseY-7-((t*20+e*30)%Math.round(H*0.18)); P(ctx,bx+4+rnd(e)*bw*0.8,ey,1,1,C.fire1); }
      // flicker bloom
      const fl=0.22+Math.abs(Math.sin(t*7))*0.10;
      const gr=ctx.createRadialGradient(fx+bw/2,baseY-10,3,fx+bw/2,baseY-10,Math.round(W*0.4));
      gr.addColorStop(0,'rgba(255,150,55,'+fl+')'); gr.addColorStop(1,'rgba(255,150,55,0)');
      ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
    }

    // candle flame + halo (left clutter)
    {
      const cax=g.ox0-Math.round(W*0.07), cay=g.oyBot+Math.round(H*0.015)-Math.round(H*0.11);
      const fl=Math.sin(t*9)*0.6;
      P(ctx,cax+1,cay-4+fl,2,5,C.fire2); P(ctx,cax+1,cay-5+fl,2,2,C.fire0);
      const gr=ctx.createRadialGradient(cax+2,cay-2,1,cax+2,cay-2,Math.round(W*0.13));
      gr.addColorStop(0,'rgba(255,180,80,0.34)'); gr.addColorStop(1,'rgba(255,180,80,0)');
      ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
    }

    // dust motes in the moonbeam
    if(nightish){
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(g.ox0+6,g.oyBot); ctx.lineTo(g.ox1-6,g.oyBot);
      ctx.lineTo(g.ox1+Math.round(W*0.06),H); ctx.lineTo(g.ox0-Math.round(W*0.12),H); ctx.closePath(); ctx.clip();
      for(let i=0;i<14;i++){
        const dx=g.ox0+rnd(i)*(g.ox1-g.ox0);
        const dy=g.oyBot+((t*6+rnd(i+3)*120)%(H-g.oyBot));
        if(Math.sin(t*2+i)>0) P(ctx,dx+Math.sin(t+i)*3,dy,1,1,'rgba(200,215,240,0.5)');
      }
      ctx.restore();
    }
  }

  // ============================================================
  // ROBOT (res ~ 72x96) — shaded, lit by moon (cool L) & fire (warm R)
  // ============================================================
  function drawRobot(ctx,W,H,state){
    state=state||{}; const C=pal(state);
    const st=state.state||'idle', cos=state.costumes||[], t=state.t||0;
    const cx=Math.round(W/2), footY=H-3;
    const bob=(st==='idle'||st==='break')?Math.round(Math.sin(t*2)):0;
    ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,W,H);

    const top=footY-66+bob, bx=cx-21, bw=42, bodyBot=footY-7;

    // soft belly glow on the floor
    const gr=ctx.createRadialGradient(cx,bodyBot-6,2,cx,bodyBot-6,30);
    gr.addColorStop(0,'rgba(255,180,70,0.22)'); gr.addColorStop(1,'rgba(255,180,70,0)');
    ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);

    // shadow
    P(ctx,cx-18,footY-1,36,3,'rgba(0,0,0,0.45)');
    // legs
    P(ctx,cx-13,bodyBot,8,8,C.rFrameD); P(ctx,cx+5,bodyBot,8,8,C.rFrameD);
    P(ctx,cx-13,bodyBot,8,1,C.rFrameL); P(ctx,cx+5,bodyBot,8,1,C.rFrameL);
    P(ctx,cx-13,bodyBot+6,8,2,'#000'); P(ctx,cx+5,bodyBot+6,8,2,'#000');
    // arms
    P(ctx,bx-5,top+30,5,13,C.rFrameD); P(ctx,bx+bw,top+30,5,13,C.rFrameD);
    P(ctx,bx-5,top+30,5,2,C.rFrameL); P(ctx,bx+bw,top+30,5,2,C.rFrameL);

    // antenna
    if(!cos.includes('nightcap')){
      P(ctx,cx-1,top-8,2,9,C.rFrame); P(ctx,cx-2,top-11,4,4,C.redL); P(ctx,cx-2,top-11,2,2,C.redRim);
      const gl=ctx.createRadialGradient(cx,top-9,1,cx,top-9,8); gl.addColorStop(0,'rgba(220,80,60,0.4)'); gl.addColorStop(1,'rgba(220,80,60,0)');
      ctx.fillStyle=gl; ctx.fillRect(cx-9,top-18,18,16);
    }

    // ---- body chassis with shading ----
    P(ctx,bx,top,bw,bodyBot-top,C.rFrameD);                 // outer frame
    P(ctx,bx,top,bw,2,C.rFrameL); P(ctx,bx,top,2,bodyBot-top,C.rFrame);
    P(ctx,bx+bw-2,top,2,bodyBot-top,C.rXD); P(ctx,bx,bodyBot-2,bw,2,C.rXD);
    // panel (3-tone vertical shade)
    P(ctx,bx+3,top+3,bw-6,bodyBot-top-6,C.r);
    P(ctx,bx+3,top+3,bw-6,3,C.rL);                          // top sheen
    P(ctx,bx+3,bodyBot-7,bw-6,4,C.rD);                      // bottom shade
    P(ctx,bx+3,top+3,4,bodyBot-top-6,C.rL);                 // left lit (moon)
    P(ctx,bx+bw-6,top+3,3,bodyBot-top-6,C.rD);              // right base
    // warm fire rim on the right edge
    P(ctx,bx+bw-4,top+6,1,bodyBot-top-14,'rgba(255,140,60,0.5)');
    // cool moon rim left
    P(ctx,bx+2,top+5,1,bodyBot-top-12,'rgba(150,180,230,0.4)');
    // corner cuts
    P(ctx,bx,top,2,2,'#000'); P(ctx,bx+bw-2,top,2,2,'#000'); P(ctx,bx,bodyBot-2,2,2,'#000'); P(ctx,bx+bw-2,bodyBot-2,2,2,'#000');
    // rivets
    [[bx+5,top+5],[bx+bw-7,top+5],[bx+5,bodyBot-7],[bx+bw-7,bodyBot-7]].forEach(([rx,ry])=>{P(ctx,rx,ry,2,2,C.rFrameL);P(ctx,rx+1,ry+1,1,1,C.rXD);});

    // ---- FACE ----
    const fx=cx-16,fy=top+6,fw=32,fh=16;
    P(ctx,fx-2,fy-2,fw+4,fh+4,C.rFrameD); P(ctx,fx-1,fy-1,fw+2,fh+2,C.brassD);
    P(ctx,fx,fy,fw,fh,C.face); P(ctx,fx,fy,fw,1,C.faceEdge);
    P(ctx,fx,fy,fw,2,'rgba(255,255,255,0.05)');
    drawFace(ctx,cx,fy,st,C,t);

    // ---- BELLY clock ----
    const yb=top+30,hb=18,wb=34,xb=cx-17;
    P(ctx,xb-2,yb-2,wb+4,hb+4,C.rFrameD); P(ctx,xb-1,yb-1,wb+2,hb+2,C.brassD);
    P(ctx,xb,yb,wb,hb,C.belly);
    P(ctx,xb,yb,wb,1,'rgba(255,180,70,0.25)');
    // scanlines
    for(let yy=yb+1;yy<yb+hb;yy+=2) P(ctx,xb,yy,wb,1,'rgba(0,0,0,0.25)');
    const mmss=state.mmss||'25:00', cell=2, tw=textWidth(mmss,cell);
    // glow under digits
    const dg=ctx.createRadialGradient(cx,yb+hb/2,1,cx,yb+hb/2,wb*0.7);
    dg.addColorStop(0,'rgba(255,180,70,0.5)'); dg.addColorStop(1,'rgba(255,180,70,0)');
    ctx.fillStyle=dg; ctx.fillRect(xb-4,yb-4,wb+8,hb+8);
    drawDigits(ctx,Math.round(cx-tw/2),yb+4,mmss,cell,C.amber);

    // ---- NIGHTCAP ----
    if(cos.includes('nightcap')){
      P(ctx,bx,top-4,bw,7,C.redL); P(ctx,bx,top-4,bw,2,C.redRim); P(ctx,bx,top+1,bw,2,C.redD);
      for(let yy=top-4;yy>top-42;yy-=1){
        const k=(top-4-yy)/38, center=cx-3+k*24, half=(1-k)*17+1;
        P(ctx,center-half,yy,half*2,1, k>0.55?C.knitD:C.knit);
        P(ctx,center-half,yy,2,1,C.knitHi);
      }
      P(ctx,cx+18,top-44,6,6,C.brassL); P(ctx,cx+18,top-44,6,2,C.brassHi);
      const gl=ctx.createRadialGradient(cx+21,top-41,1,cx+21,top-41,8); gl.addColorStop(0,'rgba(246,227,160,0.4)'); gl.addColorStop(1,'rgba(246,227,160,0)');
      ctx.fillStyle=gl; ctx.fillRect(cx+13,top-49,16,16);
    }
    // ---- HEADPHONES ----
    if(cos.includes('headphones')){
      P(ctx,bx+2,top-7,bw-4,5,C.rFrame); P(ctx,bx+2,top-7,bw-4,2,C.rFrameL);
      P(ctx,bx-3,top-4,4,9,C.rFrameD); P(ctx,bx+bw-1,top-4,4,9,C.rFrameD);
      P(ctx,bx-8,top+6,9,18,C.rD); P(ctx,bx-8,top+6,9,2,C.rL);
      P(ctx,bx-7,top+8,7,13,C.redL); P(ctx,bx-7,top+8,7,2,C.redRim);
      P(ctx,bx+bw-1,top+6,9,18,C.rD); P(ctx,bx+bw-1,top+6,9,2,C.rL);
      P(ctx,bx+bw,top+8,7,13,C.redL); P(ctx,bx+bw,top+8,7,2,C.redRim);
    }

    // ---- FX ----
    if(st==='complete'){
      const tw2=(Math.sin(t*4)+1)/2;
      const spark=(sx,sy,s)=>{P(ctx,sx-s,sy,s*2+1,1,C.brassHi);P(ctx,sx,sy-s,1,s*2+1,C.brassHi);P(ctx,sx,sy,1,1,'#fff');};
      if(tw2>0.3) spark(bx-3,top+2,2); if(tw2>0.6) spark(bx+bw+3,top+8,2); spark(cx,top-9,Math.round(tw2*2)+1);
    }
    if(st==='dozing'){
      const zp=(t%2.4)/2.4; ctx.fillStyle=C.parch; ctx.font='8px "Press Start 2P",monospace'; ctx.globalAlpha=1-zp;
      ctx.fillText('z',bx+bw+3+zp*6,top-2-zp*13); ctx.globalAlpha=1;
    }
  }

  function drawFace(ctx,cx,fy,st,C,t){
    const lx=cx-10, rx=cx+5, ey=fy+4;
    const glow=(x,y)=>{const g=ctx.createRadialGradient(x+2,y+2,0,x+2,y+2,6);g.addColorStop(0,'rgba(255,200,90,0.55)');g.addColorStop(1,'rgba(255,200,90,0)');ctx.fillStyle=g;ctx.fillRect(x-4,y-4,12,12);};
    if(st==='focus'){ glow(lx,ey);glow(rx,ey); P(ctx,lx,ey+2,5,1,C.eye); P(ctx,rx,ey+2,5,1,C.eye); P(ctx,cx-3,fy+12,6,1,C.amber); }
    else if(st==='break'){ P(ctx,lx,ey+1,1,2,C.eye);P(ctx,lx+1,ey,3,1,C.eye);P(ctx,lx+4,ey+1,1,2,C.eye); P(ctx,rx,ey+1,1,2,C.eye);P(ctx,rx+1,ey,3,1,C.eye);P(ctx,rx+4,ey+1,1,2,C.eye); P(ctx,cx-3,fy+11,1,1,C.amber);P(ctx,cx-2,fy+12,4,1,C.amber);P(ctx,cx+2,fy+11,1,1,C.amber); }
    else if(st==='complete'){ P(ctx,lx,ey+2,1,1,C.eye);P(ctx,lx+1,ey,3,1,C.eye);P(ctx,lx+4,ey+2,1,1,C.eye); P(ctx,rx,ey+2,1,1,C.eye);P(ctx,rx+1,ey,3,1,C.eye);P(ctx,rx+4,ey+2,1,1,C.eye); P(ctx,cx-3,fy+11,6,1,C.eye);P(ctx,cx-2,fy+12,4,1,C.eye); }
    else if(st==='dozing'){ P(ctx,lx,ey+2,5,1,C.amberGlow?'#caa23e':C.eye); P(ctx,rx,ey+2,5,1,'#caa23e'); }
    else { const blink=(t%4)>3.85; if(blink){P(ctx,lx,ey+2,5,1,C.eye);P(ctx,rx,ey+2,5,1,C.eye);} else { glow(lx,ey);glow(rx,ey); P(ctx,lx,ey,5,5,C.eye);P(ctx,rx,ey,5,5,C.eye); P(ctx,lx,ey,2,2,C.eyeHi);P(ctx,rx,ey,2,2,C.eyeHi); } P(ctx,cx-2,fy+12,4,1,'#caa23e'); }
  }

  window.PixelArt={drawScene,drawRobot,drawDigits,textWidth,PAL};
})();
