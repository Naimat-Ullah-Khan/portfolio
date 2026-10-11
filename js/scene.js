/* =========================================================================
   3D background — ribbon arches with light streaks, a glowing sphere,
   floating particles, a click-and-hold camera fly-through, and a
   chromatic "fisheye" lens pulse on release / scene change.
   Exposes window.Scene3D for main.js.
   ========================================================================= */
(function () {
  const S = (window.Scene3D = { ready: false });
  const mq = (q) => window.matchMedia(q).matches;
  const REDUCE = mq('(prefers-reduced-motion: reduce)');
  const MOBILE = mq('(max-width: 820px)') || mq('(pointer: coarse)');

  // no-op API until init succeeds
  ['press', 'release', 'setScene', 'setMouse', 'setActive', 'setScroll'].forEach((k) => (S[k] = () => {}));

  function fail(err) {
    if (err) console.warn('[Scene3D] falling back to static background:', err);
    document.documentElement.classList.add('no-webgl');
    return false;
  }

  S.init = async function () {
    const canvas = document.getElementById('bg');
    if (!canvas || !window.gsap) return fail('missing canvas or gsap');
    const gsap = window.gsap;

    // three.js is loaded as classic scripts (vendor/three/*.classic*.js) so it also works on file://
    const THREE = window.THREE;
    const ADD = window.THREE_ADDONS;
    if (!THREE || !ADD) return fail('three.js scripts not loaded');
    const { EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass } = ADD;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      return fail(e);
    }

    const V3 = THREE.Vector3;
    const DPR = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.5);
    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const BG = 0x07030a;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.03);

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 200);
    const HOME = new V3(0, 0, 14);
    camera.position.copy(HOME);

    // ---------------------------------------------------------------- lights
    scene.add(new THREE.HemisphereLight(0xff9ad8, 0x12020c, 0.45));
    const key = new THREE.DirectionalLight(0xffb8e8, 1.5);
    key.position.set(5, 8, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff3d9a, 1.1);
    rim.position.set(-6, -3, -5);
    scene.add(rim);
    const fill = new THREE.PointLight(0xff4fb0, 22, 40, 2);
    fill.position.set(0, 2, 7);
    scene.add(fill);

    // ------------------------------------------------------- shared state
    const st = {
      time: 0,
      hold: 0, // 0..1 progress of the fly-through
      bulge: 0, // barrel distortion during hold
      wave: 1, // fisheye wave progress (1 = finished)
      waveAmt: 0,
      particles: 1,
      bloom: 0.42,
      streakBoost: 0,
      ribbons: 1, // scene crossfade amounts
      sphere: 0,
      mx: 0, my: 0, tmx: 0, tmy: 0,
      scroll: 0,
      active: true,
    };

    // =====================================================================
    //  RIBBONS
    // =====================================================================
    // Sweep a rectangular cross-section along a curve. `side` is the
    // direction the ribbon's width points in (kept perpendicular to the curve).
    function sweep(curve, side, width, thick, segs, faces) {
      const pos = [], nor = [], uv = [], idx = [];
      const T = new V3(), Sd = new V3(), N = new V3(), C = new V3(), A = new V3(), B = new V3(), Nn = new V3();
      faces.forEach(([type, sign, scaleW = 1, lift = 0]) => {
        const base = pos.length / 3;
        for (let i = 0; i <= segs; i++) {
          const u = i / segs;
          const P = curve.getPointAt(u);
          curve.getTangentAt(u, T);
          Sd.copy(side).addScaledVector(T, -T.dot(side)).normalize();
          N.crossVectors(T, Sd).normalize();
          if (type === 'N') {
            C.copy(P).addScaledVector(N, sign * (thick / 2 + lift));
            A.copy(C).addScaledVector(Sd, (width * scaleW) / 2);
            B.copy(C).addScaledVector(Sd, (-width * scaleW) / 2);
            Nn.copy(N).multiplyScalar(sign);
          } else {
            C.copy(P).addScaledVector(Sd, sign * (width / 2 + lift));
            A.copy(C).addScaledVector(N, thick / 2);
            B.copy(C).addScaledVector(N, -thick / 2);
            Nn.copy(Sd).multiplyScalar(sign);
          }
          pos.push(A.x, A.y, A.z, B.x, B.y, B.z);
          nor.push(Nn.x, Nn.y, Nn.z, Nn.x, Nn.y, Nn.z);
          uv.push(u, 0, u, 1);
        }
        for (let i = 0; i < segs; i++) {
          const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
          idx.push(a, b, c, b, d, c);
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      return g;
    }

    function arch({ x, y, z, rx, ry, ry0 = 0, rz = 0, a0 = 0.02, a1 = Math.PI - 0.02 }) {
      const e = new THREE.Euler(0, ry0, rz);
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const a = a0 + (a1 - a0) * (i / 40);
        pts.push(new V3(Math.cos(a) * rx, Math.sin(a) * ry, 0).applyEuler(e).add(new V3(x, y, z)));
      }
      return { curve: new THREE.CatmullRomCurve3(pts), side: new V3(0, 0, 1).applyEuler(e) };
    }

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0x5a1044, roughness: 0.55, metalness: 0.08, emissive: 0x0b0108, side: THREE.DoubleSide,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x93216e, roughness: 0.45, metalness: 0.05, emissive: 0x160111, side: THREE.DoubleSide,
    });

    const streakVS = /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
    const streakFS = /* glsl */ `
      uniform float uTime, uSpeed, uOffset, uOpacity, uBoost;
      varying vec2 vUv;
      void main(){
        float head = fract(uTime * uSpeed + uOffset) * 1.6 - 0.3;
        float d = head - vUv.x;
        float tail = 0.2 + uBoost * 0.12;
        float a = smoothstep(tail, 0.0, d) * smoothstep(-0.012, 0.0, d);
        a *= smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
        vec3 col = mix(vec3(1.0, 0.35, 0.78), vec3(1.0, 0.96, 1.0), smoothstep(tail * 0.5, 0.0, d));
        gl_FragColor = vec4(col * (1.25 + uBoost * 0.5), a * uOpacity);
      }`;

    const ribbons = new THREE.Group();
    scene.add(ribbons);
    const streaks = [];

    // Arches marching back in depth (the camera flies through these on hold).
    const ARCHES = [];
    const RY = [-0.35, -0.15, 0.25, -0.3, 0.2, -0.1, 0.3], WD = [1.9, 1.6, 1.5, 1.7, 1.6, 1.8, 1.6];
    for (let k = 0; k < 13; k++) {
      ARCHES.push({
        x: 3.1 + Math.sin(k * 1.7) * 0.55, y: -5.2 - k * 0.1, z: 3 - k * 4.1,
        rx: 3.5 + (k % 3) * 0.3, ry: 6.0 + k * 0.1, ry0: RY[k % 7], w: WD[k % 7],
      });
    }
    ARCHES.forEach((cfg, k) => {
      const { curve, side } = arch(cfg);
      const thick = 0.32;
      const body = new THREE.Mesh(sweep(curve, side, cfg.w, thick, 160, [['N', 1], ['N', -1]]), ribbonMat);
      const edges = new THREE.Mesh(sweep(curve, side, cfg.w, thick, 160, [['S', 1], ['S', -1]]), edgeMat);
      ribbons.add(body, edges);
      // light streaks on top and inner faces
      [[1, 0.012], [-1, 0.012]].forEach(([sign, lift], j) => {
        const mat = new THREE.ShaderMaterial({
          vertexShader: streakVS, fragmentShader: streakFS, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
          uniforms: {
            uTime: { value: 0 }, uSpeed: { value: 0.07 + ((k * 7 + j * 3) % 5) * 0.012 },
            uOffset: { value: (k * 0.37 + j * 0.53) % 1 }, uOpacity: { value: 1 }, uBoost: { value: 0 },
          },
        });
        const m = new THREE.Mesh(sweep(curve, side, cfg.w, thick, 160, [['N', sign, 0.72, lift]]), mat);
        m.renderOrder = 2;
        ribbons.add(m);
        streaks.push(mat);
      });
    });

    // Two long diagonal sweeps for depth (like the big bands behind the hero text)
    [
      [new V3(-9, -7, -4), new V3(-3, -3, -1), new V3(2, 3, -3), new V3(7, 9, -8)],
      [new V3(-7, -8, -9), new V3(-1, -4, -7), new V3(4, 1, -9), new V3(9, 7, -14)],
    ].forEach((pts, k) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const side = new V3(0.3, -0.2, 1).normalize();
      ribbons.add(new THREE.Mesh(sweep(curve, side, 2.2, 0.28, 120, [['N', 1], ['N', -1]]), ribbonMat));
      ribbons.add(new THREE.Mesh(sweep(curve, side, 2.2, 0.28, 120, [['S', 1], ['S', -1]]), edgeMat));
      const mat = new THREE.ShaderMaterial({
        vertexShader: streakVS, fragmentShader: streakFS, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uSpeed: { value: 0.05 }, uOffset: { value: k * 0.5 }, uOpacity: { value: 1 }, uBoost: { value: 0 } },
      });
      ribbons.add(new THREE.Mesh(sweep(curve, side, 2.2, 0.28, 120, [['N', 1, 0.7, 0.012]]), mat));
      streaks.push(mat);
    });

    // Fly-through path (passes inside the arches)
    const flyPath = new THREE.CatmullRomCurve3([
      new V3(0, 0, 14), new V3(1.4, -0.6, 9), new V3(3.0, -1.8, 4.5), new V3(3.4, -2.3, 0.5),
      new V3(2.8, -2.5, -4), new V3(3.3, -2.6, -9), new V3(2.7, -2.8, -14), new V3(3.2, -3.0, -19.5),
      new V3(2.8, -3.1, -25), new V3(3.2, -3.2, -30.5), new V3(2.9, -3.3, -36), new V3(3.0, -3.4, -41),
    ]);

    // =====================================================================
    //  SPHERE
    // =====================================================================
    const sphere = new THREE.Group();
    sphere.visible = false;
    scene.add(sphere);
    const R = 3.1;
    const shellMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uOpacity; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.4);
          vec3 c = mix(vec3(0.22,0.02,0.15), vec3(0.85,0.28,0.66), f);
          gl_FragColor = vec4(c, (f * 0.7 + 0.025) * uOpacity); }`,
    });
    sphere.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), shellMat));

    const core = new THREE.Group();
    core.rotation.set(0.35, 0, 0.55);
    sphere.add(core);
    const sliceMat = new THREE.MeshStandardMaterial({
      color: 0x4a0e3a, roughness: 0.55, metalness: 0.1, emissive: 0x080106, side: THREE.DoubleSide, transparent: true, opacity: 0,
    });
    const slices = [];
    for (let i = 0; i < 11; i++) {
      const y = -2.5 + i * 0.5;
      const r = Math.sqrt(Math.max(0.2, R * R - y * y)) * 0.8;
      const g = new THREE.CylinderGeometry(r, r * 0.97, 0.3, 96, 1, true, 0, Math.PI * (1.15 + (i % 3) * 0.25));
      const m = new THREE.Mesh(g, sliceMat);
      m.position.y = y;
      m.rotation.y = i * 1.3;
      m.userData.spin = (i % 2 ? 1 : -1) * (0.05 + (i % 4) * 0.02);
      core.add(m);
      slices.push(m);
    }

    const ringFS = `uniform float uTime, uOpacity, uSpeed; varying vec2 vUv;
      void main(){ float p = fract(vUv.x - uTime * uSpeed);
        float a = pow(p, 10.0) * 1.1 + 0.07;
        gl_FragColor = vec4(mix(vec3(1.0,0.3,0.7), vec3(1.0), pow(p, 24.0)) * 1.25, a * uOpacity); }`;
    const rings = [];
    [[4.1, 0.018, 1.15, 0.3, 0.12], [4.6, 0.01, -0.6, 0.9, -0.08], [3.6, 0.008, 0.4, -0.5, 0.18]].forEach(([r, t, rx, rz, sp]) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: streakVS, fragmentShader: ringFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uSpeed: { value: sp } },
      });
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 260), mat);
      m.rotation.set(rx, 0, rz);
      sphere.add(m);
      rings.push(mat);
    });

    // =====================================================================
    //  PARTICLES ("bubbles")
    // =====================================================================
    const COUNT = MOBILE ? 500 : 1000;
    const BOX = new V3(34, 20, 34);
    const pPos = new Float32Array(COUNT * 3), pRnd = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * BOX.x;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * BOX.y;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z;
      for (let j = 0; j < 4; j++) pRnd[i * 4 + j] = Math.random();
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aRnd', new THREE.BufferAttribute(pRnd, 4));
    const pMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uPixel: { value: DPR }, uBox: { value: BOX } },
      vertexShader: /* glsl */ `
        uniform float uTime, uPixel; uniform vec3 uBox; attribute vec4 aRnd; varying float vA; varying float vBig;
        void main(){
          vec3 p = position;
          p.y += uTime * (0.12 + aRnd.x * 0.22);                       // slow rise
          p.x += sin(uTime * (0.25 + aRnd.y * 0.3) + aRnd.z * 6.283) * 0.6;   // sway
          p.z += cos(uTime * (0.2 + aRnd.w * 0.25) + aRnd.y * 6.283) * 0.6;
          p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;                  // wrap in box
          p.z -= 4.0;
          float life = fract(uTime * (0.03 + aRnd.w * 0.05) + aRnd.x); // fade in / out cycle
          vA = smoothstep(0.0, 0.2, life) * smoothstep(1.0, 0.7, life);
          vBig = step(0.93, aRnd.y);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = mix(0.9 + aRnd.z * 1.6, 6.0 + aRnd.z * 8.0, vBig);
          gl_PointSize = size * uPixel * (14.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; varying float vA; varying float vBig;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a = mix(pow(a, 1.6), pow(a, 3.0) * 0.35, vBig);              // big ones are soft bokeh
          gl_FragColor = vec4(vec3(1.0, 0.62, 0.86), a * vA * uOpacity * 0.55);
        }`,
    });
    const points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    scene.add(points);

    // =====================================================================
    //  POST — bloom + chromatic fisheye
    // =====================================================================
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(DPR);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), st.bloom, 0.5, 0.42);
    composer.addPass(bloom);
    const lens = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, uWave: { value: 1 }, uWaveAmt: { value: 0 }, uBulge: { value: 0 },
        uAspect: { value: window.innerWidth / window.innerHeight },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uWave, uWaveAmt, uBulge, uAspect; varying vec2 vUv;
        void main(){
          vec2 c = vUv - 0.5;
          vec2 ca = vec2(c.x * uAspect, c.y);
          float r = length(ca);
          vec2 dir = r > 1e-4 ? ca / r : vec2(0.0);
          float front = uWave * 1.35;
          float band = exp(-pow((r - front) * 4.5, 2.0)) * uWaveAmt * (1.0 - uWave);
          float disp = uBulge * r * r * 0.35 + band * 0.075;
          vec2 o = dir * disp; o.x /= uAspect;
          vec2 uv = vUv - o;
          float ab = band * 0.022 + uBulge * 0.014 * r + 0.0012 * r;
          vec2 ao = dir * ab; ao.x /= uAspect;
          vec3 col = vec3(texture2D(tDiffuse, uv + ao).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ao).b);
          col += band * vec3(0.18, 0.03, 0.14);
          col *= 1.0 - smoothstep(0.55, 1.3, r) * 0.55;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    composer.addPass(lens);
    composer.addPass(new OutputPass());

    // =====================================================================
    //  LAYOUT / RESIZE
    // =====================================================================
    function layout() {
      const w = window.innerWidth, h = window.innerHeight, asp = w / h;
      camera.aspect = asp;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.resolution.set(w, h);
      lens.uniforms.uAspect.value = asp;
      // Narrow screens: pull the ribbons and sphere toward the center
      const narrow = asp < 1;
      ribbons.position.x = narrow ? -2.6 : 1.4;
      ribbons.position.y = narrow ? 1.2 : 0;
      sphere.position.set(narrow ? 0 : 2.2, 0, -1);
      sphere.scale.setScalar(narrow ? 0.62 : 1);
      ribbons.userData.narrow = narrow;
    }
    layout();
    let rT;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(layout, 80); });

    // =====================================================================
    //  API
    // =====================================================================
    let holdTween;
    S.press = () => {
      if (REDUCE) return;
      gsap.killTweensOf(st, 'hold,bulge,streakBoost,bloom,wave,waveAmt');
      st.wave = 1; st.waveAmt = 0;
      holdTween = gsap.to(st, { hold: 1, duration: 9, ease: 'none' });
      gsap.to(st, { bulge: 0.55, duration: 9, ease: 'power1.in' });
      gsap.to(st, { streakBoost: 1, bloom: 0.6, duration: 2.5, ease: 'power2.out' });
      gsap.killTweensOf(st, 'particles');
      gsap.to(st, { particles: 0, duration: 10, ease: 'power2.out' });
    };
    S.release = () => {
      if (holdTween) holdTween.kill();
      const amt = Math.min(1, 0.45 + st.hold * 2.2);
      gsap.killTweensOf(st, 'hold,bulge,streakBoost,bloom,wave,waveAmt,particles');
      gsap.to(st, { hold: 0, duration: 1.4 + st.hold * 1.6, ease: 'power4.out' });
      gsap.to(st, { bulge: 0, streakBoost: 0, bloom: 0.42, duration: 1.5, ease: 'power3.out' });
      gsap.fromTo(st, { wave: 0, waveAmt: amt }, { wave: 1, duration: 1.75, delay: 0.25, ease: 'power2.out' });
      gsap.to(st, { particles: 1, duration: 2, ease: 'power2.inOut' });
    };
    let current = 'ribbons';
    S.setScene = (name) => {
      if (name === current || !['ribbons', 'sphere'].includes(name)) return;
      current = name;
      gsap.to(st, { ribbons: name === 'ribbons' ? 1 : 0, sphere: name === 'sphere' ? 1 : 0, duration: 1.4, ease: 'power2.inOut' });
      if (!REDUCE) gsap.fromTo(st, { wave: 0, waveAmt: 0.55 }, { wave: 1, duration: 1.6, ease: 'power2.out' });
    };
    S.setMouse = (x, y) => { st.tmx = x; st.tmy = y; };
    S.setActive = (b) => { st.active = b; };
    S.setScroll = (p) => { st.scroll = p; };

    // =====================================================================
    //  LOOP
    // =====================================================================
    const clock = new THREE.Clock();
    const tmpA = new V3(), tmpB = new V3();
    function setFade(group, matList, f) {
      group.visible = f > 0.005;
      matList.forEach((m) => {
        if (m.uniforms && m.uniforms.uOpacity) m.uniforms.uOpacity.value = f;
        else { m.opacity = f; m.transparent = f < 0.999; }
      });
    }
    const ribbonMats = [ribbonMat, edgeMat, ...streaks];
    const sphereMats = [shellMat, sliceMat, ...rings];

    function frame() {
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (document.hidden) return;
      st.time += dt * (REDUCE ? 0.25 : 1) * (1 + st.streakBoost * 0.8);
      const t = st.time;
      if (!st.active && st.wave >= 1) return; // fully covered by a light panel

      // mouse smoothing
      st.mx += (st.tmx - st.mx) * 0.05;
      st.my += (st.tmy - st.my) * 0.05;

      // camera — idle orbit + mouse tilt, or the hold fly-through
      if (st.hold > 0.0005) {
        const u = Math.min(st.hold, 0.999);
        flyPath.getPointAt(u, tmpA);
        flyPath.getPointAt(Math.min(1, u + 0.035), tmpB);
        const kA = Math.min(1, u / 0.25), kB = Math.min(1, (u + 0.035) / 0.25);
        tmpA.addScaledVector(ribbons.position, kA);
        tmpB.addScaledVector(ribbons.position, kB);
        tmpA.x += st.mx * 0.25 * (1 - u);
        camera.position.copy(tmpA);
        camera.lookAt(tmpB);
        camera.rotateZ(Math.sin(u * Math.PI) * 0.35);
        camera.fov = 35 + Math.sin(u * Math.PI * 0.5) * 22;
      } else {
        camera.position.set(HOME.x + st.mx * 0.5, HOME.y + st.my * 0.3 + Math.sin(t * 0.2) * 0.08, HOME.z);
        camera.lookAt(st.mx * 0.15, st.my * 0.1, 0);
        camera.fov = 35;
      }
      camera.updateProjectionMatrix();

      // ribbons
      setFade(ribbons, ribbonMats, st.ribbons);
      if (ribbons.visible) {
        ribbons.rotation.y = Math.sin(t * 0.07) * 0.04 + st.scroll * 0.12;
        streaks.forEach((m) => { m.uniforms.uTime.value = t; m.uniforms.uBoost.value = st.streakBoost; });
      }
      // sphere
      setFade(sphere, sphereMats, st.sphere);
      if (sphere.visible) {
        sphere.rotation.y = t * 0.06 + st.scroll * 1.2;
        core.rotation.x = 0.35 + Math.sin(t * 0.15) * 0.1;
        slices.forEach((m) => (m.rotation.y += m.userData.spin * dt));
        rings.forEach((m) => (m.uniforms.uTime.value = t));
        sphere.scale.setScalar((ribbons.userData.narrow ? 0.62 : 1) * (0.9 + 0.1 * st.sphere));
      }
      // particles
      pMat.uniforms.uTime.value = t;
      pMat.uniforms.uOpacity.value = st.particles;
      // post
      bloom.strength = st.bloom;
      lens.uniforms.uWave.value = st.wave;
      lens.uniforms.uWaveAmt.value = st.waveAmt;
      lens.uniforms.uBulge.value = st.bulge;

      composer.render();
    }
    frame();

    S.ready = true;
    document.documentElement.classList.add('webgl-ready');
    return true;
  };
})();
