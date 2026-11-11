/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { clamp, ease, smooth, WordLayoutItem } from './utils/math';

const SKY =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_045255_3cb4b3c2-3cb5-4af9-93b4-bd88f2f883c3.png&w=1920&q=80';
const STILL =
  'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261102_045249_4f7fe287-c84b-479f-a953-04990fe1a3ac.png&w=1080&q=85';
const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261102_045327_a6584765-3154-43e6-b1c9-4e574f83a811.mp4';
const WORDS = ['DRIFTLAB', 'DESIGN TO', 'DELIGHT', 'INSPIRE', 'AND ENGAGE'] as const;
const STEP = 0.14;
const GAP = 3.4;
const RADIUS = 9;
const CAM = 11;
const FOCAL = 8.14;
const ROW = 512;
const EM = 440;

interface ProgramInfo {
  p: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

export default function App() {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const c1Ref = useRef<HTMLParagraphElement>(null);
  const c2Ref = useRef<HTMLParagraphElement>(null);
  const goggleRef = useRef<SVGSVGElement>(null);
  const p1Ref = useRef<HTMLParagraphElement>(null);
  const p2Ref = useRef<HTMLParagraphElement>(null);
  const thumbRef = useRef<HTMLElement>(null);
  const indexRef = useRef<HTMLDivElement>(null);

  const [soundOn, setSoundOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    const gl = cv.getContext('webgl2', {
      alpha: false,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) {
      console.warn('WebGL2 not supported');
      return;
    }

    const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;

    function program(vs: string, fs: string, names: string[]): ProgramInfo {
      const sh = (t: number, s: string) => {
        const o = gl!.createShader(t)!;
        gl!.shaderSource(o, '#version 300 es\nprecision highp float;\n' + s);
        gl!.compileShader(o);
        if (!gl!.getShaderParameter(o, gl!.COMPILE_STATUS)) {
          console.error(gl!.getShaderInfoLog(o));
        }
        return o;
      };
      const p = gl!.createProgram()!;
      gl!.attachShader(p, sh(gl!.VERTEX_SHADER, vs));
      gl!.attachShader(p, sh(gl!.FRAGMENT_SHADER, fs));
      gl!.linkProgram(p);
      const u: Record<string, WebGLUniformLocation | null> = {};
      names.forEach((n) => (u[n] = gl!.getUniformLocation(p, n)));
      return { p, u };
    }

    const QUAD = `out vec2 v;void main(){vec2 c=vec2((gl_VertexID<<1)&2,gl_VertexID&2);v=c;gl_Position=vec4(c*2.-1.,0,1);}`;
    const skyP = program(
      QUAD,
      `in vec2 v;uniform sampler2D T;uniform vec3 C;out vec4 O;
  void main(){vec2 uv=vec2(.5)+(v-.5)*C.xy;uv.y=1.-uv.y;uv.x+=C.z;O=textureLod(T,uv,1.6);}`,
      ['T', 'C']
    );

    const wordP = program(
      `layout(location=0) in vec2 a;uniform vec4 W;uniform vec4 B;uniform float A;uniform vec3 L;out vec2 v;
  void main(){
    float t=(a.x-.5)*W.x+W.y;
    float th=clamp(t/${RADIUS.toFixed(1)},-1.45,1.45);
    float x=${RADIUS.toFixed(1)}*sin(th),z=${RADIUS.toFixed(1)}*(1.-cos(th))*.82;
    float y=(a.y-.5)*L.x+L.y-L.z-3.6*pow(smoothstep(.8,8.,t),1.25)-.012*t*t;
    v=vec2(mix(B.x,B.z,a.x),mix(B.w,B.y,a.y));
    gl_Position=vec4(x*${FOCAL.toFixed(2)}/A,y*${FOCAL.toFixed(2)},0.,${CAM.toFixed(1)}-z);
  }`,
      `in vec2 v;uniform sampler2D T;out vec4 O;void main(){float a=texture(T,v).a;O=vec4(vec3(.043,.043,.063)*a,a);}`,
      ['W', 'B', 'A', 'L', 'T']
    );

    const dotP = program(
      `layout(location=0) in vec4 a;uniform float S,H,P;out float k;out float r;
  void main(){k=a.w;float y=fract(a.y+S*.012*(.4+a.z))*2.3-1.15;float x=fract(a.x+H*(a.w>.5?.035:.004))*2.4-1.2+.03*sin(S*.2+a.z*9.);
    gl_Position=vec4(x,y,0,1);gl_PointSize=(a.w>.5?5.+a.z*15.:5.+a.z*24.)*P;r=S*.6+a.z*7.+H;}`,
      `in float k;in float r;out vec4 O;void main(){vec2 p=gl_PointCoord-.5;
    if(k>.5){float c=cos(r),s=sin(r);p=mat2(c,-s,s,c)*p;float a=step(max(abs(p.x),abs(p.y)),.3);O=vec4(vec3(.04)*a,a);}
    else{float a=smoothstep(.5,.1,length(p))*.62;O=vec4(vec3(1.)*a,a);}}`,
      ['S', 'H', 'P']
    );

    const jellyP = program(
      `uniform mat3 M;out vec2 v;void main(){vec2 c=vec2((gl_VertexID<<1)&2,gl_VertexID&2);if(gl_VertexID==3)c=vec2(2,2);c*=.5;v=vec2(c.x,1.-c.y);gl_Position=vec4((M*vec3(c-.5,1.)).xy,0,1);}`,
      `in vec2 v;uniform sampler2D T;out vec4 O;void main(){
    vec3 c=texture(T,v).rgb;
    float d=c.g-max(c.r,c.b);
    float a=1.-smoothstep(.10,.38,d);
    c.g=min(c.g,max(c.r,c.b)*.96);
    O=vec4(c*a,a);}`,
      ['M', 'T']
    );

    // Word atlas setup
    const atlas = document.createElement('canvas');
    atlas.width = 4096;
    atlas.height = ROW * WORDS.length;
    let layout: WordLayoutItem[] = [];

    function drawAtlas() {
      const x = atlas.getContext('2d')!;
      x.clearRect(0, 0, atlas.width, atlas.height);
      x.font = `${EM}px Anton`;
      x.textBaseline = 'alphabetic';
      x.fillStyle = '#000';
      x.textAlign = 'left';
      x.letterSpacing = '8px';
      let c = 0;
      layout = [];
      WORDS.forEach((w, i) => {
        const m = x.measureText(w).width + 16;
        x.fillText(w, 8, i * ROW + EM * 0.92 + 6);
        const uW = (m / EM) * 0.86;
        layout.push({
          len: uW,
          c: c + uW / 2,
          u: m / atlas.width,
          top: i / WORDS.length,
          bot: (i + 1) / WORDS.length,
        });
        c += uW + GAP;
      });
    }

    const tex = (unit: number, filter: number) => {
      const t = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    };

    const tSky = tex(0, gl.LINEAR_MIPMAP_LINEAR);
    const tWords = tex(1, gl.LINEAR_MIPMAP_LINEAR);
    const tJelly = tex(2, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 255, 0, 255])
    );
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

    function load(url: string): Promise<HTMLImageElement | null> {
      return new Promise((r) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => r(i);
        i.onerror = () => r(null);
        i.src = url;
      });
    }

    const cols = 56;
    const ribbon = new Float32Array((cols + 1) * 4);
    for (let i = 0; i <= cols; i++) {
      ribbon.set([i / cols, 0, i / cols, 1], i * 4);
    }
    const vaoW = gl.createVertexArray()!;
    gl.bindVertexArray(vaoW);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()!);
    gl.bufferData(gl.ARRAY_BUFFER, ribbon, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const dots: number[] = [];
    let sd = 7;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) dots.push(rnd(), rnd(), rnd(), i % 4 ? 0 : 1);
    const vaoD = gl.createVertexArray()!;
    gl.bindVertexArray(vaoD);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()!);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dots), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    const vaoE = gl.createVertexArray()!;

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = VIDEO;

    let W = 1,
      H = 1,
      dpr = 1,
      asp = 1,
      lastT = -1;

    function size() {
      if (!cv) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(cv.clientWidth * dpr);
      H = Math.round(cv.clientHeight * dpr);
      cv.width = W;
      cv.height = H;
      asp = W / H;
      gl!.viewport(0, 0, W, H);
    }

    window.addEventListener('resize', size);

    function pushVideo() {
      if (video.readyState < 2 || video.currentTime === lastT) return;
      lastT = video.currentTime;
      gl!.activeTexture(gl!.TEXTURE2);
      gl!.bindTexture(gl!.TEXTURE_2D, tJelly);
      gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.RGBA,
        gl!.RGBA,
        gl!.UNSIGNED_BYTE,
        video
      );
    }

    let lastIdx = 0;
    const marks = indexRef.current
      ? [...indexRef.current.querySelectorAll('b')]
      : [];

    function updateUI(s: number, k: number) {
      const op = (a: number, b: number, c: number, d: number) =>
        smooth(a, b, s) * (1 - smooth(c, d, s));
      const c1 = 1 - smooth(0.04, 0.08, s);
      const c2 = op(0.08, 0.12, 0.56, 0.62);

      if (c1Ref.current) c1Ref.current.style.opacity = `${c1}`;
      if (c2Ref.current) c2Ref.current.style.opacity = `${c2}`;
      if (goggleRef.current) {
        goggleRef.current.style.opacity = `${Math.max(c1, c2)}`;
      }

      const a = op(0.72, 0.77, 0.84, 0.88);
      const b = op(0.9, 0.95, 1.1, 1.2);

      if (p1Ref.current) {
        p1Ref.current.style.opacity = `${a}`;
        p1Ref.current.style.transform = `translateY(calc(-50% + ${(1 - a) * 18}px))`;
      }
      if (p2Ref.current) {
        p2Ref.current.style.opacity = `${b}`;
        p2Ref.current.style.transform = `translateY(calc(-50% + ${(1 - b) * 18}px))`;
      }

      const idx = Math.min(WORDS.length - 1, Math.max(0, Math.round(k)));
      if (idx !== lastIdx && marks.length > 0) {
        if (marks[lastIdx]) marks[lastIdx].classList.remove('on');
        if (marks[idx]) marks[idx].classList.add('on');
        lastIdx = idx;
      }

      if (thumbRef.current) {
        thumbRef.current.style.transform = `translateY(${(s * 1011).toFixed(1)}%)`;
      }
    }

    let mx = 0,
      my = 0,
      tmx = 0,
      tmy = 0;

    function draw(s: number, sec: number) {
      pushVideo();
      const n = WORDS.length;
      const span = STEP * (n - 1);
      const k = clamp(s / span) * (n - 1);
      const i = Math.min(n - 2, Math.floor(k));
      const f = k - i;

      if (!layout[i] || !layout[i + 1]) return;
      const c0 = layout[i].c;
      const c1 = layout[i + 1].c;
      const head = c0 + (c1 - c0) * ease(f);
      const sink = ease(smooth(span + 0.015, span + 0.105, s)) * 6;
      const grow = ease(smooth(span + 0.08, span + 0.22, s));
      const side = smooth(0.76, 0.82, s) - 2 * smooth(0.88, 0.94, s);

      // Sky
      gl!.disable(gl!.BLEND);
      gl!.useProgram(skyP.p);
      gl!.bindVertexArray(vaoE);
      gl!.uniform1i(skyP.u.T, 0);
      const ca = asp / (16 / 9);
      const fx = ca > 1 ? 1 : ca;
      const fy = ca > 1 ? 1 / ca : 1;
      gl!.uniform3f(skyP.u.C, fx * 0.92, fy * 0.92, s * 0.05 + sec * 0.0022);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);

      gl!.enable(gl!.BLEND);
      gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);

      // Points
      gl!.useProgram(dotP.p);
      gl!.bindVertexArray(vaoD);
      gl!.uniform1f(dotP.u.S, sec);
      gl!.uniform1f(dotP.u.H, head * 0.1 + s * 4);
      gl!.uniform1f(dotP.u.P, (dpr * H) / dpr / 900);
      gl!.drawArrays(gl!.POINTS, 0, 40);

      // Words
      gl!.useProgram(wordP.p);
      gl!.bindVertexArray(vaoW);
      gl!.uniform1i(wordP.u.T, 1);
      gl!.uniform1f(wordP.u.A, asp);
      const hs = clamp(asp * 0.58, 0.26, 1);
      gl!.uniform3f(wordP.u.L, hs, 0.19 + 0.1 * (1 - hs), sink);
      layout.forEach((w) => {
        const t = w.c - head;
        if (Math.abs(t) > 24) return;
        gl!.uniform4f(wordP.u.W, w.len * hs, t * hs, 0, 0);
        gl!.uniform4f(wordP.u.B, 0, w.top, w.u, w.bot);
        gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, (cols + 1) * 2);
      });

      // Jellyfish
      gl!.useProgram(jellyP.p);
      gl!.bindVertexArray(vaoE);
      gl!.uniform1i(jellyP.u.T, 2);
      const h = (0.98 + grow * 0.42) * clamp(0.62 + asp * 0.4, 0.6, 1);
      const w =
        ((h * (1080 / 1920)) / asp) * (0.93 + 0.07 * Math.cos(s * 14));
      const roll =
        (0.1 * Math.sin(s * 13 + 0.4) + 0.03 * Math.sin(sec * 0.5)) *
        (1 + grow * 0.5);
      const co = Math.cos(roll);
      const si = Math.sin(roll);
      const ox = mx * 0.018 + side * 0.34 * Math.min(1, asp);
      const oy = 0.03 + 0.018 * Math.sin(sec * 0.8) + my * 0.018 - grow * 0.1;
      gl!.uniformMatrix3fv(
        jellyP.u.M,
        false,
        [
          w * 2 * co,
          w * 2 * si * asp,
          0,
          (-h * 2 * si) / asp,
          h * 2 * co,
          0,
          ox,
          oy,
          1,
        ]
      );
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      updateUI(s, k);
    }

    let target = 0;
    let now = 0;
    let animId: number;

    const read = () => {
      const trackEl = trackRef.current;
      if (!trackEl) return;
      const r = trackEl.getBoundingClientRect();
      const m = r.height - window.innerHeight;
      target = clamp(-r.top / (m > 0 ? m : 1));
    };

    const handlePointerMove = (e: PointerEvent) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
      tmy = 1 - (e.clientY / window.innerHeight) * 2;
    };

    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('pointermove', handlePointerMove);

    function loop(t: number) {
      now += (target - now) * (calm ? 1 : 0.1);
      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;
      draw(now, t / 1000);
      animId = requestAnimationFrame(loop);
    }

    let isDisposed = false;

    Promise.all([
      load(SKY),
      load(STILL),
      document.fonts.load(`${EM}px Anton`, 'DRIFTLAB'),
    ]).then(([sky, still]) => {
      if (isDisposed) return;
      drawAtlas();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tSky);
      if (sky) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          sky
        );
        gl.generateMipmap(gl.TEXTURE_2D);
      }

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tWords);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        atlas
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      if (aniso) {
        gl.texParameterf(
          gl.TEXTURE_2D,
          aniso.TEXTURE_MAX_ANISOTROPY_EXT,
          8
        );
      }

      if (still) {
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, tJelly);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          still
        );
      }

      if (!calm) {
        video.play().catch(() => {});
      }

      size();
      read();
      now = target;
      animId = requestAnimationFrame(loop);
    });

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', size);
      window.removeEventListener('scroll', read);
      window.removeEventListener('pointermove', handlePointerMove);
      video.pause();
      video.src = '';
    };
  }, []);

  const toggleSound = () => {
    const nextOn = !soundOn;
    setSoundOn(nextOn);

    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = 0;

      const n = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = n.getChannelData(c);
        let l = 0;
        for (let i = 0; i < d.length; i++) {
          l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02;
          d[i] = l * 3.5;
        }
      }

      const src = ctx.createBufferSource();
      src.buffer = n;
      src.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;

      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 0.09;
      lg.gain.value = 240;
      lfo.connect(lg).connect(lp.frequency);

      src.connect(lp).connect(gain).connect(ctx.destination);
      src.start();
      lfo.start();

      audioCtxRef.current = ctx;
      audioGainRef.current = gain;
    }

    const ctx = audioCtxRef.current;
    const gain = audioGainRef.current;
    if (ctx && gain) {
      ctx.resume();
      gain.gain.setTargetAtTime(nextOn ? 0.34 : 0, ctx.currentTime, 0.4);
    }
  };

  const handleScrollTop = () => {
    const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  };

  return (
    <div className="track" id="track" ref={trackRef}>
      <div className="view">
        <canvas
          id="gl"
          ref={canvasRef}
          aria-label="A pink jellyfish drifting in a lilac sky with giant words wrapping around it"
        />
        <div className="ui">
          <a className="logo" href="#" aria-label="Driftlab">
            Driftlab
            <svg viewBox="0 0 50 30" aria-hidden="true">
              <path d="M2 22C8 20 12 6 15 3c2-2-3 20-1 21 3 1 5-9 8-9-1 3-2 8 0 8 3 0 4-8 7-8s-1 8 2 8 5-6 8-6 2 4 9 2" />
            </svg>
          </a>
          <nav className="links" aria-label="Main">
            <a href="#">[Works]</a>
            <a href="#">[Agency]</a>
          </nav>
          <div className="index" id="index" ref={indexRef} aria-hidden="true">
            <i />
            <b className="on">01</b>
            <i />
            <i />
            <i />
            <b>02</b>
            <i />
            <i />
            <i />
            <b>03</b>
            <i />
            <i />
            <i />
            <b>04</b>
            <i />
            <i />
            <i />
            <b>05</b>
            <i />
          </div>
          <div className="bar" aria-hidden="true">
            <i id="thumb" ref={thumbRef} />
          </div>
          <div className="cap">
            <svg id="goggle" ref={goggleRef} viewBox="0 0 30 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7 2h16a6 6 0 0 1 6 6v5a5 5 0 0 1-9 3l-2-3h-6l-2 3a5 5 0 0 1-9-3V8a6 6 0 0 1 6-6Zm1 5a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7Zm14 0a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7Z"
              />
            </svg>
            <p id="c1" ref={c1Ref}>
              Welcome to a creative space showcasing groundbreaking <br />
              projects that blend creativity and technology
            </p>
            <p id="c2" ref={c2Ref} style={{ opacity: 0 }}>
              Follow us into the future of interactive <br />
              and immersive digital experiences
            </p>
          </div>
          <p className="panel p1" id="p1" ref={p1Ref}>
            Each project at Driftlab serves as a testament to our commitment to
            innovation and excellence
          </p>
          <p className="panel p2" id="p2" ref={p2Ref}>
            Browse our portfolio to see the magic we create with cutting-edge
            technologies including XR, AR, AI and 3D.
          </p>
          <button
            className="sound"
            id="sound"
            aria-pressed={soundOn}
            aria-label="Ambient sound"
            onClick={toggleSound}
          >
            <span aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <em style={{ fontStyle: 'normal' }} id="st">
              {soundOn ? 'ON' : 'OFF'}
            </em>
          </button>
          <button
            className="up"
            id="up"
            aria-label="Back to top"
            onClick={handleScrollTop}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 14V2M3 7l5-5 5 5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
