// ============================================================
// pixel-canvas.jsx — React wrappers around PixelArt renderers
//   <PixelScene res={[176,150]} state={{timeofday,weather,theme,...}} />
//   <PixelRobot res={[72,90]} state={{state,costumes,mmss,theme}} />
// A single shared rAF ticker drives all canvases (cheap).
// ============================================================

// ---- shared ticker ----
const _pmTick = (() => {
  const subs = new Set();
  let running = false, start = performance.now();
  function loop(now) {
    const t = (now - start) / 1000;
    subs.forEach((fn) => { try { fn(t); } catch (e) {} });
    if (subs.size) requestAnimationFrame(loop); else running = false;
  }
  return {
    add(fn) { subs.add(fn); if (!running) { running = true; requestAnimationFrame(loop); } },
    remove(fn) { subs.delete(fn); },
  };
})();

function usePixelCanvas(resW, resH, draw, deps) {
  const ref = React.useRef(null);
  const drawRef = React.useRef(draw);
  drawRef.current = draw;
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    cv.width = resW; cv.height = resH;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const fn = (t) => drawRef.current(ctx, resW, resH, t);
    _pmTick.add(fn);
    return () => _pmTick.remove(fn);
    // eslint-disable-next-line
  }, [resW, resH]);
  return ref;
}

function PixelScene({ res = [176, 150], state = {}, style = {}, className = '' }) {
  const [W, H] = res;
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const ref = usePixelCanvas(W, H, (ctx, w, h, t) => {
    window.PixelArt.drawScene(ctx, w, h, { ...stateRef.current, t });
  });
  return (
    <canvas ref={ref} className={className}
      style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated', ...style }} />
  );
}

function PixelRobot({ res = [72, 90], state = {}, style = {}, className = '' }) {
  const [W, H] = res;
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const ref = usePixelCanvas(W, H, (ctx, w, h, t) => {
    window.PixelArt.drawRobot(ctx, w, h, { ...stateRef.current, t });
  });
  return (
    <canvas ref={ref} className={className}
      style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated', ...style }} />
  );
}

Object.assign(window, { PixelScene, PixelRobot });
