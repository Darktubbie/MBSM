/* =========================================================================
   renderer5d.js — Three.js scene for Bedrock's legacy 4D/5D models

   Responsible ONLY for:
     - scene, camera, lights, OrbitControls
     - building meshes from bones/cubes (4D) and bones/poly_mesh (5D)
     - textures, wireframe, grid, pivots, auto-rotation, framing

   This is the same mesh-reconstruction logic that already worked in the
   original prototype (Minecraft's standard box UV, per-face UV, mirror
   inherited from the bone, inflate, bone hierarchy resolved with
   quaternions instead of automatic Object3D nesting) — no calculation
   was changed, it was just moved into this module.

   SCOPE NOTE: this renderer now draws BOTH 4D (cubes) and 5D (poly_mesh);
   the Blockbench embed is no longer used. 4D cubes are built from
   buildCubeQuads(), which the Model to Skin 1.8 tool (obj-a-skin-bedrock.js)
   also uses to bake imported cubes into a mesh.
   ========================================================================= */

const Renderer5D = (function () {

  const MIRROR_X = true;


  const state = {
    scene: null, camera: null, renderer: null, controls: null,
    grid: null,
    modelRoot: null,
    host: null,
    textureImg: null,
    spinning: true,
    wireframe: false,
    showGrid: true,
    showPivots: false,
    normalMode: "auto",
    spinPivot: null,
    resizeObserver: null,
    frameId: null,
    running: false
  };

  /* ----------------------- cube UV / geometry -----------------------

     A cube is turned into 6 QUADS (one per face) expressed in the bone's
     own coordinate space (Bedrock units, cube rotation and inflate
     already applied). Both the on-screen mesh (4D) and the 1.12 -> 1.8
     Model to Skin 1.8 import (obj-a-skin-bedrock.js) are built from these same quads, so what
     the viewer shows is exactly what gets baked into a poly_mesh.

     Face corners are listed [TL, TR, BR, BL] as seen from OUTSIDE the
     cube (in the real, un-mirrored world), as indices into the 8 cube
     vertices:
       0:(x0,y0,z1) 1:(x1,y0,z1) 2:(x1,y1,z1) 3:(x0,y1,z1)
       4:(x0,y0,z0) 5:(x1,y0,z0) 6:(x1,y1,z0) 7:(x0,y1,z0)
     North is -z; "east" is the min-x side (see below). A face's texture rect is { u, v, w, h } with
     (u,v) = the texture pixel that lands on the face's TL corner; w/h can
     be negative (Bedrock's per-face "uv_size" allows that, and Minecraft's
     box layout needs it for the up/down faces). */

  const FACE_ORDER = ["north", "east", "south", "west", "up", "down"];
  // Bedrock face names are WORLD directions, but a geometry's X axis is the
  // mirror image of the world's (the model's +x is the entity's LEFT side:
  // leftArm sits at x>0). So "east" -- the first texture region, the
  // entity's right side -- is the face at the model's MIN x, and "west" is
  // the face at max x. Seen from outside, "top-left" of the north face is
  // therefore the min-x corner. (The old tables had this mirrored, which
  // showed every face's texture flipped left/right and the side faces
  // swapped.)
  const FACE_CORNERS = {
    north: [7, 6, 5, 4],
    east:  [3, 7, 4, 0],
    south: [2, 3, 0, 1],
    west:  [6, 2, 1, 5],
    up:    [6, 7, 3, 2],
    down:  [1, 0, 4, 5]
  };
  const FACE_NORMALS = {
    north: [0, 0, -1], east: [-1, 0, 0], south: [0, 0, 1],
    west: [1, 0, 0], up: [0, 1, 0], down: [0, -1, 0]
  };

  // Minecraft's box UV layout. Sizes are floored, as the game does
  // (a 0.5-wide cube still reserves whole texture pixels).
  function boxFaceRects(u, v, sx, sy, sz, mirror) {
    const fx = Math.max(0, Math.floor(sx + 1e-7));
    const fy = Math.max(0, Math.floor(sy + 1e-7));
    const fz = Math.max(0, Math.floor(sz + 1e-7));
    const rects = {
      east:  { u: u,                  v: v + fz, w: fz,  h: fy },
      north: { u: u + fz,             v: v + fz, w: fx,  h: fy },
      west:  { u: u + fz + fx,        v: v + fz, w: fz,  h: fy },
      south: { u: u + 2 * fz + fx,    v: v + fz, w: fx,  h: fy },
      up:    { u: u + fz + fx,        v: v + fz, w: -fx, h: -fz },
      down:  { u: u + fz + 2 * fx,    v: v,      w: -fx, h: fz }
    };
    if (mirror) {
      FACE_ORDER.forEach(f => { rects[f].u += rects[f].w; rects[f].w = -rects[f].w; });
      const tmp = rects.east; rects.east = rects.west; rects.west = tmp;
    }
    return rects;
  }

  // Per-face UV: { north: { uv:[u,v], uv_size:[w,h] }, ... }. A face with
  // no entry is simply not drawn. A missing uv_size falls back to the
  // face's natural size (NOT [1,1]).
  function perFaceRects(uvObj, sx, sy, sz) {
    const natural = {
      north: [sx, sy], south: [sx, sy], east: [sz, sy], west: [sz, sy],
      up: [sx, sz], down: [sx, sz]
    };
    const rects = {};
    FACE_ORDER.forEach(f => {
      const d = uvObj[f];
      if (!d || !Array.isArray(d.uv)) return;
      const size = Array.isArray(d.uv_size) ? d.uv_size : natural[f];
      rects[f] = { u: d.uv[0], v: d.uv[1], w: size[0], h: size[1] };
    });
    return rects;
  }

  const BLEED = 1 / 64;
  function faceUV(r, inset) {
    let c = [[r.u, r.v], [r.u + r.w, r.v], [r.u + r.w, r.v + r.h], [r.u, r.v + r.h]];
    if (!inset) return c;
    const minU = Math.min(r.u, r.u + r.w), maxU = Math.max(r.u, r.u + r.w);
    const minV = Math.min(r.v, r.v + r.h), maxV = Math.max(r.v, r.v + r.h);
    if (minU === maxU || minV === maxV) return c;
    return c.map(p => [p[0] === minU ? p[0] + BLEED : p[0] - BLEED, p[1] === minV ? p[1] + BLEED : p[1] - BLEED]);
  }

  // Returns [{ face, positions:[[x,y,z]x4], normal:[x,y,z], uv:[[px,py]x4] }]
  // positions in the bone's coordinate space, uv in texture PIXELS
  // (origin top-left, y down). `cube.mirror` must already be resolved by
  // the caller (cube value, else its bone's).
  function buildCubeQuads(cube, opts) {
    const o = cube.origin || [0, 0, 0];
    const s = cube.size || [0, 0, 0];
    const inf = cube.inflate || 0;
    const sx = s[0], sy = s[1], sz = s[2];
    const x0 = o[0] - inf, x1 = o[0] + sx + inf;
    const y0 = o[1] - inf, y1 = o[1] + sy + inf;
    const z0 = o[2] - inf, z1 = o[2] + sz + inf;
    let verts = [
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]
    ];

    let quat = null;
    const rot = cube.rotation;
    if (Array.isArray(rot) && (rot[0] || rot[1] || rot[2])) {
      const piv = cube.pivot || o;
      quat = eulerToQuatThree(rot);
      verts = verts.map(p => {
        const v = new THREE.Vector3(p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]).applyQuaternion(quat);
        return [v.x + piv[0], v.y + piv[1], v.z + piv[2]];
      });
    }

    const uv = cube.uv;
    let rects;
    if (Array.isArray(uv)) rects = boxFaceRects(uv[0] || 0, uv[1] || 0, sx, sy, sz, !!cube.mirror);
    else if (uv && typeof uv === "object") rects = perFaceRects(uv, sx, sy, sz);
    else rects = boxFaceRects(0, 0, sx, sy, sz, !!cube.mirror);

    // Render-only: pull box-UV faces 1/64 px inside their texture rect so
    // Nearest sampling at a face edge can't pick up the neighbouring
    // region (thin coloured lines on cube edges, notably next to
    // transparent pixels). The converter does NOT pass this option: baked
    // poly_mesh UVs must be exact.
    const inset = !!(opts && opts.bleedInset) && !(uv && typeof uv === "object" && !Array.isArray(uv));

    const quads = [];
    FACE_ORDER.forEach(face => {
      const r = rects[face];
      if (!r) return;
      let n = FACE_NORMALS[face];
      if (quat) {
        const nv = new THREE.Vector3(n[0], n[1], n[2]).applyQuaternion(quat);
        n = [nv.x, nv.y, nv.z];
      }
      quads.push({
        face,
        positions: FACE_CORNERS[face].map(i => verts[i]),
        normal: n,
        uv: faceUV(r, inset)
      });
    });
    return quads;
  }

  /* ----------------------- bone hierarchy ----------------------- */

  // Bone / cube rotation. Bedrock stores rotations for a coordinate system
  // that is the mirror image (X flipped) of Three.js's. The model is drawn
  // mirrored in X (see MIRROR_X below), so the rotation has to be the
  // mirror-conjugate of the one SkinApex/Blockbench use in mirrored space
  // (-rx, -ry, +rz): conjugating by the X flip negates the Y and Z angles,
  // giving (-rx, +ry, -rz). Order stays ZYX.
  function eulerToQuatThree(rotArr) {
    const r = rotArr || [0, 0, 0];
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -THREE.Math.degToRad(r[0]));
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (MIRROR_X ? 1 : -1) * THREE.Math.degToRad(r[1]));
    const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (MIRROR_X ? -1 : 1) * THREE.Math.degToRad(r[2]));
    return qz.multiply(qy).multiply(qx);
  }

  function computeWorldTransforms(bones) {
    const byName = {};
    bones.forEach(b => byName[b.name] = b);
    const world = {};

    function resolve(name) {
      if (world[name]) return world[name];
      const b = byName[name];
      if (!b) return null;
      const pivot = b.pivot || [0, 0, 0];
      const ownQuat = eulerToQuatThree(b.rotation);

      if (!b.parent || !byName[b.parent]) {
        world[name] = {
          pos: new THREE.Vector3(pivot[0] / 16, pivot[1] / 16, pivot[2] / 16),
          quat: ownQuat
        };
        return world[name];
      }

      const parentWorld = resolve(b.parent);
      const parentPivot = byName[b.parent].pivot || [0, 0, 0];
      const localOffset = new THREE.Vector3(
        (pivot[0] - parentPivot[0]) / 16,
        (pivot[1] - parentPivot[1]) / 16,
        (pivot[2] - parentPivot[2]) / 16
      ).applyQuaternion(parentWorld.quat);

      world[name] = {
        pos: parentWorld.pos.clone().add(localOffset),
        quat: parentWorld.quat.clone().multiply(ownQuat)
      };
      return world[name];
    }

    bones.forEach(b => resolve(b.name));
    return world;
  }

  /* ----------------------- mesh construction ----------------------- */

  function buildCubeWorldMesh(cube, bonePivot, boneWorld, texW, texH, material) {
    const quads = buildCubeQuads(cube, { bleedInset: true });
    if (!quads.length) return null;

    const pos = [], nor = [], uv = [], idx = [];
    quads.forEach(q => {
      const base = pos.length / 3;
      const n = new THREE.Vector3(q.normal[0], q.normal[1], q.normal[2]).applyQuaternion(boneWorld.quat);
      q.positions.forEach((p, i) => {
        const local = new THREE.Vector3(
          (p[0] - bonePivot[0]) / 16,
          (p[1] - bonePivot[1]) / 16,
          (p[2] - bonePivot[2]) / 16
        ).applyQuaternion(boneWorld.quat);
        const w = boneWorld.pos.clone().add(local);
        pos.push(w.x, w.y, w.z);
        nor.push(n.x, n.y, n.z);
        // the texture is uploaded with flipY=false, so v is simply pixel_y / height
        uv.push(q.uv[i][0] / texW, q.uv[i][1] / texH);
      });
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(idx);
    return new THREE.Mesh(geometry, material);
  }

  // normalMode: "auto" uses the file's normals when they are all usable
  // (finite, non-zero, every referenced index in range) and recomputes flat
  // normals otherwise; "recalculate" always recomputes them.
  function buildPolyMeshWorld(pm, bonePivot, boneWorld, texW, texH, material, normalMode) {
    const positions = Array.isArray(pm.positions) ? pm.positions : [];
    const srcNormals = Array.isArray(pm.normals) ? pm.normals : [];
    const uvs = Array.isArray(pm.uvs) ? pm.uvs : [];
    const polys = Array.isArray(pm.polys) ? pm.polys : [];
    if (!positions.length || !polys.length) return null;

    // normalized_uvs: true/false is explicit; when the key is missing,
    // values that all fit in 0..1 are read as normalized.
    let normalized = pm.normalized_uvs;
    if (normalized !== true && normalized !== false) {
      normalized = uvs.every(u => Array.isArray(u) && Math.abs(u[0]) <= 1.0001 && Math.abs(u[1]) <= 1.0001);
    }

    // Normals: validate and normalize.
    let normals = null;
    if (normalMode !== "recalculate" && srcNormals.length) {
      normals = srcNormals.map(n => {
        if (!Array.isArray(n) || n.length < 3) return null;
        const x = Number(n[0]), y = Number(n[1]), z = Number(n[2]);
        const len = Math.sqrt(x * x + y * y + z * z);
        if (!isFinite(len) || len < 1e-5) return null;
        return [x / len, y / len, z / len];
      });
      if (normals.some(n => !n)) normals = null;
    }

    const outPos = [], outNorm = [], outUV = [];
    let usedAllNormals = !!normals;

    function corner(ref) {
      if (!Array.isArray(ref)) return null;
      const p = positions[ref[0] | 0];
      if (!Array.isArray(p)) return null;
      return { pi: ref[0] | 0, ni: ref[1], ui: ref[2], p };
    }
    function pushCorner(c) {
      const local = new THREE.Vector3(
        (c.p[0] - bonePivot[0]) / 16,
        (c.p[1] - bonePivot[1]) / 16,
        (c.p[2] - bonePivot[2]) / 16
      ).applyQuaternion(boneWorld.quat);
      const world = boneWorld.pos.clone().add(local);
      outPos.push(world.x, world.y, world.z);

      let n = normals && normals[c.ni !== undefined ? c.ni | 0 : 0];
      if (!n) { usedAllNormals = false; n = [0, 1, 0]; }
      const nr = new THREE.Vector3(n[0], n[1], n[2]).applyQuaternion(boneWorld.quat);
      outNorm.push(nr.x, nr.y, nr.z);

      const uv = uvs[c.ui !== undefined ? c.ui | 0 : 0] || [0, 0];
      const uu = normalized ? uv[0] : uv[0] / texW;
      const vv = normalized ? uv[1] : uv[1] / texH;
      outUV.push(uu, 1 - vv);
    }

    polys.forEach(poly => {
      if (!Array.isArray(poly) || poly.length < 3) return;
      // drop corners that repeat the previous one (Minecraft stores a
      // triangle as a 4-sized poly by repeating a vertex)
      const cs = [];
      poly.forEach(ref => {
        const c = corner(ref);
        if (!c) return;
        const prev = cs[cs.length - 1];
        if (prev && prev.pi === c.pi && prev.ui === c.ui) return;
        cs.push(c);
      });
      while (cs.length > 2 && cs[0].pi === cs[cs.length - 1].pi && cs[0].ui === cs[cs.length - 1].ui) cs.pop();
      // fan triangulation: handles triangles, quads and n-gons alike
      for (let i = 1; i < cs.length - 1; i++) [cs[0], cs[i], cs[i + 1]].forEach(pushCorner);
    });

    if (!outPos.length) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(outPos, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(outUV, 2));
    if (usedAllNormals) {
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(outNorm, 3));
    } else {
      geometry.computeVertexNormals();   // flat, per triangle
    }
    return new THREE.Mesh(geometry, material);
  }

  /* ----------------------- escena / ciclo de render ----------------------- */

  function hostSize() {
    const h = state.host;
    return { w: Math.max(1, (h && h.clientWidth) || 0), h: Math.max(1, (h && h.clientHeight) || 0) };
  }

  function ensureScene() {
    if (state.renderer) return;
    const host = state.host;
    const size = hostSize();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, size.w / size.h, 0.01, 100);
    camera.position.set(2.4, 1.8, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size.w, size.h);
    host.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    // Even lighting so a skin reads like its texture from every side:
    // a strong ambient base, a key light from the front/top and a weak
    // fill from behind (the old hemisphere light left undersides and
    // back faces nearly black).
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-3, 2, -4);
    scene.add(fill);

    const grid = new THREE.GridHelper(6, 24, 0x22d3ee, 0x1c2028);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);

    state.scene = scene;
    state.camera = camera;
    state.renderer = renderer;
    state.controls = controls;
    state.grid = grid;

    window.addEventListener("resize", resize);
    // The panel can change size without the window doing so (sidebar
    // toggle, sheets on mobile, the tab being shown for the first time
    // with a 0x0 host): watch the host itself.
    if (typeof ResizeObserver !== "undefined") {
      state.resizeObserver = new ResizeObserver(resize);
      state.resizeObserver.observe(host);
    }
  }

  function resize() {
    if (!state.renderer || !state.host) return;
    const host = state.host;
    if (!host.clientWidth || !host.clientHeight) return;
    state.camera.aspect = host.clientWidth / host.clientHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(host.clientWidth, host.clientHeight);
  }

  // Fits the whole model in view whatever the panel's shape (a phone in
  // portrait is much narrower than tall, which the old fixed-distance
  // framing cropped) and goes back to the default front 3/4 view.
  function frameCamera() {
    if (!state.modelRoot || !state.camera) return;
    if (state.spinPivot) state.spinPivot.rotation.y = 0;
    state.modelRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(state.modelRoot);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // bounding sphere: independent of how far the model has spun
    const radius = Math.max(size.length() / 2, 0.05);
    const vFov = THREE.Math.degToRad(state.camera.fov) / 2;
    const hFov = Math.atan(Math.tan(vFov) * state.camera.aspect);
    const dist = (radius / Math.sin(Math.min(vFov, hFov))) * 1.08;
    const dir = new THREE.Vector3(0.55, 0.35, 0.55).normalize();
    state.camera.position.copy(center).addScaledVector(dir, dist);
    state.camera.near = Math.max(0.01, dist / 100);
    state.camera.far = dist * 20;
    state.camera.updateProjectionMatrix();
    state.controls.target.copy(center);
    state.controls.update();
  }

  function animate() {
    if (!state.running) return;
    state.frameId = requestAnimationFrame(animate);
    // ensureScene() may not have run yet (e.g. show() fires on page
    // load, before any model is uploaded) — without this guard,
    // state.controls/renderer/camera would be null here and would blow
    // up with "Cannot read properties of null (reading 'update')".
    if (!state.controls || !state.renderer || !state.camera) return;
    if (state.modelRoot && state.spinning) {
      (state.spinPivot || state.modelRoot).rotation.y += 0.006;
    }
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
  }

  function clearModel() {
    if (state.modelRoot) {
      state.scene.remove(state.modelRoot);
      state.modelRoot.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
      state.modelRoot = null;
      state.spinPivot = null;
    }
  }

  function applyWireframe() {
    if (!state.modelRoot) return;
    state.modelRoot.traverse(obj => {
      if (obj.material) obj.material.wireframe = state.wireframe;
    });
  }

  /* ----------------------- public API ----------------------- */

  function init(hostEl) {
    state.host = hostEl;
  }

  function setTexture(img) {
    state.textureImg = img || null;
  }

  // Rebuilds the scene from a normalized geoDef
  // ({ id, texture_width, texture_height, bones, type }).
  // Returns stats: { bones, cubes, polys, meshCount, bboxSize }.
  function loadModel(geoDef) {
    ensureScene();

    const texW = geoDef.texture_width || 64;
    const texH = geoDef.texture_height || 64;
    const bones = geoDef.bones || [];

    clearModel();

    let material;
    let textureMismatch = null;
    if (state.textureImg) {
      const canvas = document.createElement("canvas");
      canvas.width = state.textureImg.width;
      canvas.height = state.textureImg.height;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(state.textureImg, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;                 // Nearest never uses them
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.flipY = false;
      material = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide });

      if (state.textureImg.width !== texW || state.textureImg.height !== texH) {
        textureMismatch = { texW: state.textureImg.width, texH: state.textureImg.height, expectedW: texW, expectedH: texH };
      }
    } else {
      material = new THREE.MeshLambertMaterial({ color: 0x3a4150 });
    }

    const worldTransforms = computeWorldTransforms(bones);
    const root = new THREE.Group();
    root.name = "model_root";

    bones.forEach(b => {
      const boneWorld = worldTransforms[b.name];
      if (!boneWorld) return;
      const bonePivot = b.pivot || [0, 0, 0];

      (b.cubes || []).forEach(cube => {
        const effectiveCube = ("mirror" in cube) ? cube : Object.assign({}, cube, { mirror: !!b.mirror });
        const mesh = buildCubeWorldMesh(effectiveCube, bonePivot, boneWorld, texW, texH, material);
        if (mesh) root.add(mesh);
      });

      if (b.poly_mesh) {
        const meshObj = buildPolyMeshWorld(b.poly_mesh, bonePivot, boneWorld, texW, texH, material, state.normalMode);
        if (meshObj) root.add(meshObj);
      }

      if (state.showPivots) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xf5a623 })
        );
        dot.position.copy(boneWorld.pos);
        root.add(dot);

        // locators (grip / attach points such as lead_hold): cyan, same
        // space as the pivot, so a held item's grip point can be checked
        // against the hand
        if (b.locators && typeof b.locators === "object") {
          Object.keys(b.locators).forEach(k => {
            const l = b.locators[k];
            if (!Array.isArray(l)) return;
            const lp = new THREE.Vector3(
              (l[0] - bonePivot[0]) / 16, (l[1] - bonePivot[1]) / 16, (l[2] - bonePivot[2]) / 16
            ).applyQuaternion(boneWorld.quat).add(boneWorld.pos);
            const m = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.05),
              new THREE.MeshBasicMaterial({ color: 0x22d3ee })
            );
            m.position.copy(lp);
            root.add(m);
          });
        }
      }
    });

    // Bedrock's X axis is the mirror of Three.js's: without this flip every
    // left/right pair (arms, legs, held items) shows swapped. Together with
    // the 180° turn the net effect is (x, y, -z), the same view SkinApex and
    // Blockbench give. Set MIRROR_X to false to get the old behaviour back.
    root.rotation.y = Math.PI;
    if (MIRROR_X) root.scale.x = -1;

    // Spin around the model's own centre, not the world origin: models
    // that are off-centre (held items, capes, wings) used to orbit.
    const wrapper = new THREE.Group();
    wrapper.name = "model_spin";
    wrapper.add(root);
    state.scene.add(wrapper);
    wrapper.updateMatrixWorld(true);
    const rootBox = new THREE.Box3().setFromObject(root);
    if (!rootBox.isEmpty()) {
      const c = rootBox.getCenter(new THREE.Vector3());
      root.position.x -= c.x;
      root.position.z -= c.z;
    }
    state.spinPivot = wrapper;
    state.modelRoot = wrapper;
    applyWireframe();

    const totalCubes = bones.reduce((n, b) => n + (b.cubes ? b.cubes.length : 0), 0);
    const totalPolys = bones.reduce((n, b) => n + (b.poly_mesh && b.poly_mesh.polys ? b.poly_mesh.polys.length : 0), 0);

    let meshCount = 0;
    root.traverse(o => { if (o.isMesh) meshCount++; });
    let bboxSize = null;
    if (meshCount) {
      const bbox = new THREE.Box3().setFromObject(root);
      bboxSize = bbox.getSize(new THREE.Vector3());
    }

    frameCamera();

    return {
      bones: bones.length,
      cubes: totalCubes,
      polys: totalPolys,
      meshCount,
      bboxSize,
      textureMismatch
    };
  }

  function setWireframe(v) { state.wireframe = v; applyWireframe(); }
  function setGrid(v) { state.showGrid = v; if (state.grid) state.grid.visible = v; }
  function setSpin(v) { state.spinning = v; }
  function setShowPivots(v) { state.showPivots = v; }
  function setNormalMode(mode) { state.normalMode = mode === "recalculate" ? "recalculate" : "auto"; }

  function show() {
    // Makes sure the scene (renderer/camera/controls) exists before
    // starting the animation loop, even if no model has been loaded yet —
    // this is what keeps animate() from crashing when the page opens
    // with the 5D panel visible by default.
    ensureScene();
    state.running = true;
    if (!state.frameId) animate();
    resize();
  }
  function hide() {
    state.running = false;
    if (state.frameId) { cancelAnimationFrame(state.frameId); state.frameId = null; }
  }

  return {
    init, setTexture, loadModel, clearModel,
    setWireframe, setGrid, setSpin, setShowPivots, setNormalMode,
    frameCamera, resize, show, hide,
    // shared with obj-a-skin-bedrock.js (1.12 import) so viewer and tool agree
    buildCubeQuads
  };
})();
