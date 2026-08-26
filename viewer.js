// viewer.js
// Viewer for "regular" (non-4D) Minecraft Bedrock skin packs: detects
// each skin's Steve/Alex model (wide/slim) and lets you look at the
// texture or a 3D preview of the model with the skin applied.

// ----------------------------
// Minecraft Bedrock's OFFICIAL geometry for the standard humanoid model
// (Steve = wide, Alex = slim), taken directly from the game's real
// player_geometry.json (Steve and Alex only; the cape layer
// -"geometry.cape"- isn't included here, it's handled separately by
// addCapeMesh). This replaces the hand-built UV layout used before:
// it's rendered through the same generic pipeline already used for
// 4D/5D packs' custom models (buildCustomGeometryModel), so the result
// is consistent and reliable instead of depending on manually
// transcribed pixel coordinates.
// ----------------------------
const OFFICIAL_PLAYER_GEOMETRY = {
  "geometry.npc.steve": {
    "texturewidth": 64,
    "textureheight": 64,
    "bones": [
      {
        "name": "root",
        "pivot": [0, 0, 0]
      },
      {
        "name": "body",
        "parent": "waist",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 12, -2],
            "size": [8, 12, 4],
            "uv": [16, 16]
          }
        ]
      },
      {
        "name": "waist",
        "parent": "root",
        "pivot": [0, 12, 0]
      },
      {
        "name": "head",
        "parent": "body",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 24, -4],
            "size": [8, 8, 8],
            "uv": [0, 0]
          }
        ]
      },
      {
        "name": "cape",
        "pivot": [0, 24, 3],
        "parent": "body"
      },
      {
        "name": "hat",
        "parent": "head",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 24, -4],
            "size": [8, 8, 8],
            "uv": [32, 0],
            "inflate": 0.5
          }
        ]
      },
      {
        "name": "leftArm",
        "parent": "body",
        "pivot": [5, 22, 0],
        "cubes": [
          {
            "origin": [4, 12, -2],
            "size": [4, 12, 4],
            "uv": [32, 48]
          }
        ]
      },
      {
        "name": "leftSleeve",
        "parent": "leftArm",
        "pivot": [5, 22, 0],
        "cubes": [
          {
            "origin": [4, 12, -2],
            "size": [4, 12, 4],
            "uv": [48, 48],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "leftItem",
        "pivot": [6, 15, 1],
        "parent": "leftArm"
      },
      {
        "name": "rightArm",
        "parent": "body",
        "pivot": [-5, 22, 0],
        "cubes": [
          {
            "origin": [-8, 12, -2],
            "size": [4, 12, 4],
            "uv": [40, 16]
          }
        ]
      },
      {
        "name": "rightSleeve",
        "parent": "rightArm",
        "pivot": [-5, 22, 0],
        "cubes": [
          {
            "origin": [-8, 12, -2],
            "size": [4, 12, 4],
            "uv": [40, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "rightItem",
        "pivot": [-6, 15, 1],
        "locators": {
          "lead_hold": [-6, 15, 1]
        },
        "parent": "rightArm"
      },
      {
        "name": "leftLeg",
        "parent": "root",
        "pivot": [1.9, 12, 0],
        "cubes": [
          {
            "origin": [-0.1, 0, -2],
            "size": [4, 12, 4],
            "uv": [16, 48]
          }
        ]
      },
      {
        "name": "leftPants",
        "parent": "leftLeg",
        "pivot": [1.9, 12, 0],
        "cubes": [
          {
            "origin": [-0.1, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 48],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "rightLeg",
        "parent": "root",
        "pivot": [-1.9, 12, 0],
        "cubes": [
          {
            "origin": [-3.9, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 16]
          }
        ]
      },
      {
        "name": "rightPants",
        "parent": "rightLeg",
        "pivot": [-1.9, 12, 0],
        "cubes": [
          {
            "origin": [-3.9, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "jacket",
        "parent": "body",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 12, -2],
            "size": [8, 12, 4],
            "uv": [16, 32],
            "inflate": 0.25
          }
        ]
      }
    ]
  },
  "geometry.npc.alex": {
    "texturewidth": 64,
    "textureheight": 64,
    "bones": [
      {
        "name": "root",
        "pivot": [0, 0, 0]
      },
      {
        "name": "waist",
        "parent": "root",
        "pivot": [0, 12, 0]
      },
      {
        "name": "body",
        "parent": "waist",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 12, -2],
            "size": [8, 12, 4],
            "uv": [16, 16]
          }
        ]
      },
      {
        "name": "head",
        "parent": "body",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 24, -4],
            "size": [8, 8, 8],
            "uv": [0, 0]
          }
        ]
      },
      {
        "name": "hat",
        "parent": "head",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 24, -4],
            "size": [8, 8, 8],
            "uv": [32, 0],
            "inflate": 0.5
          }
        ]
      },
      {
        "name": "rightLeg",
        "parent": "root",
        "pivot": [-1.9, 12, 0],
        "cubes": [
          {
            "origin": [-3.9, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 16]
          }
        ]
      },
      {
        "name": "rightPants",
        "parent": "rightLeg",
        "pivot": [-1.9, 12, 0],
        "cubes": [
          {
            "origin": [-3.9, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "leftLeg",
        "parent": "root",
        "pivot": [1.9, 12, 0],
        "cubes": [
          {
            "origin": [-0.1, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 16]
          }
        ],
        "mirror": true
      },
      {
        "name": "leftPants",
        "parent": "leftLeg",
        "pivot": [1.9, 12, 0],
        "cubes": [
          {
            "origin": [-0.1, 0, -2],
            "size": [4, 12, 4],
            "uv": [0, 48],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "leftArm",
        "parent": "body",
        "pivot": [5, 21.5, 0],
        "cubes": [
          {
            "origin": [4, 11.5, -2],
            "size": [3, 12, 4],
            "uv": [32, 48]
          }
        ]
      },
      {
        "name": "leftSleeve",
        "parent": "leftArm",
        "pivot": [5, 21.5, 0],
        "cubes": [
          {
            "origin": [4, 11.5, -2],
            "size": [3, 12, 4],
            "uv": [48, 48],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "leftItem",
        "pivot": [6, 14.5, 1],
        "parent": "leftArm"
      },
      {
        "name": "rightArm",
        "parent": "body",
        "pivot": [-5, 21.5, 0],
        "cubes": [
          {
            "origin": [-7, 11.5, -2],
            "size": [3, 12, 4],
            "uv": [40, 16]
          }
        ]
      },
      {
        "name": "rightSleeve",
        "parent": "rightArm",
        "pivot": [-5, 21.5, 0],
        "cubes": [
          {
            "origin": [-7, 11.5, -2],
            "size": [3, 12, 4],
            "uv": [40, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "rightItem",
        "pivot": [-6, 14.5, 1],
        "locators": {
          "lead_hold": [-6, 14.5, 1]
        },
        "parent": "rightArm"
      },
      {
        "name": "jacket",
        "parent": "body",
        "pivot": [0, 24, 0],
        "cubes": [
          {
            "origin": [-4, 12, -2],
            "size": [8, 12, 4],
            "uv": [16, 32],
            "inflate": 0.25
          }
        ]
      },
      {
        "name": "cape",
        "pivot": [0, 24, -3],
        "parent": "body"
      }
    ]
  }
}
;

// ----------------------------
// UV layout for the 64x64 skin format (base layer). Each face is
// [x, y, w, h] in pixels within the texture, origin top-left.
// Face order: right, left, top, bottom, front, back
// (matches the face order THREE.BoxGeometry uses).
// ----------------------------
function mcLayoutWide() {
  return {
    head:     { right:[0,8,8,8],   left:[16,8,8,8],  top:[8,0,8,8],   bottom:[16,0,8,8],  front:[8,8,8,8],   back:[24,8,8,8] },
    body:     { right:[16,20,4,12],left:[28,20,4,12],top:[20,16,8,4], bottom:[28,16,8,4], front:[20,20,8,12],back:[32,20,8,12] },
    rightArm: { right:[40,20,4,12],left:[48,20,4,12],top:[44,16,4,4], bottom:[48,16,4,4], front:[44,20,4,12],back:[52,20,4,12] },
    leftArm:  { right:[32,52,4,12],left:[40,52,4,12],top:[36,48,4,4], bottom:[40,48,4,4], front:[36,52,4,12],back:[44,52,4,12] },
    rightLeg: { right:[0,20,4,12], left:[8,20,4,12],  top:[4,16,4,4],  bottom:[8,16,4,4],  front:[4,20,4,12], back:[12,20,4,12] },
    leftLeg:  { right:[16,52,4,12],left:[24,52,4,12], top:[20,48,4,4], bottom:[24,48,4,4], front:[20,52,4,12],back:[28,52,4,12] }
  };
}

// Legacy 64x32 format: there's no separate region for the left
// arm/leg, they're mirrored from the right side's.
function mcLayoutLegacyWide() {
  const w = mcLayoutWide();
  return {
    head: w.head,
    body: w.body,
    rightArm: w.rightArm,
    leftArm: w.rightArm,
    rightLeg: w.rightLeg,
    leftLeg: w.rightLeg
  };
}

// ----------------------------
// Applies a [x,y,w,h] (in pixels) face layout to a BoxGeometry, using
// THREE.BoxGeometry's standard face order:
// [+x right, -x left, +y top, -y bottom, +z front, -z back]
// ----------------------------
function setBoxUV(geometry, layout, texW, texH) {
  // NOTE: "right"/"left" in the layout refer to the texture's pixel
  // regions as Minecraft's format names them, not directly to three.js's
  // +X/-X axis. Confirmed with a real skin that those two regions showed
  // up swapped on the model (the box's -X face was getting "right"'s
  // pixels and vice versa), so they're deliberately paired backwards
  // here so the result looks correct.
  const order = ["left", "right", "top", "bottom", "front", "back"];
  const uvAttr = geometry.attributes.uv;

  order.forEach((face, i) => {
    const [x, y, w, h] = layout[face];

    const u0 = x / texW;
    const u1 = (x + w) / texW;
    const v0 = 1 - (y + h) / texH;
    const v1 = 1 - y / texH;

    const base = i * 4;

    uvAttr.setXY(base + 0, u0, v1); // top-left
    uvAttr.setXY(base + 1, u1, v1); // top-right
    uvAttr.setXY(base + 2, u0, v0); // bottom-left
    uvAttr.setXY(base + 3, u1, v0); // bottom-right
  });

  uvAttr.needsUpdate = true;
}

function makePart(w, h, d, layout, texW, texH, material) {
  const geo = new THREE.BoxGeometry(w, h, d);
  setBoxUV(geo, layout, texW, texH);
  return new THREE.Mesh(geo, material);
}

// ----------------------------
// Builds the player model (Steve/Alex) with the texture applied.
// Returns a THREE.Group ready to add to the scene.
//
// Modern format (64x64): rendered with Minecraft's OFFICIAL geometry
// (OFFICIAL_PLAYER_GEOMETRY) through the same generic pipeline already
// used for 4D/5D packs' custom models (buildCustomGeometryModel). This
// replaces the hand-built UV layout used before, and along the way fixes
// a real inconsistency: the second layer (overlay) used a fixed
// "inflate" of 0.5 for EVERY piece, when in the official model only the
// hat uses 0.5 -the jacket, sleeves and pants use 0.25-, which made that
// layer look more puffed-out/separated than it should.
//
// Legacy format (64x32): has no second layer or wide/slim distinction,
// so it's still built by hand with the classic layout (there's no
// modern official geometry for this format).
// ----------------------------
function buildPlayerModel(texture, isSlim, texW, texH) {

  const legacy = texH < texW; // 64x32 = legacy format

  if (!legacy) {
    const identifier = isSlim ? "geometry.npc.alex" : "geometry.npc.steve";
    const model = buildCustomGeometryModel(OFFICIAL_PLAYER_GEOMETRY, identifier, texture, texW, texH);

    if (model) {
      model.position.y = -12; // center the model vertically
      return model;
    }
    // If for some reason it couldn't be built, fall through and use the
    // classic layout as a fallback (should never actually happen).
  }

  const material = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.FrontSide
  });

  const layout = mcLayoutLegacyWide();
  const armW = 4;

  const group = new THREE.Group();

  const head = makePart(8, 8, 8, layout.head, texW, texH, material);
  head.position.set(0, 28, 0);
  group.add(head);

  const body = makePart(8, 12, 4, layout.body, texW, texH, material);
  body.position.set(0, 18, 0);
  group.add(body);

  const rightArm = makePart(armW, 12, 4, layout.rightArm, texW, texH, material);
  rightArm.position.set(-(4 + armW / 2), 18, 0);
  group.add(rightArm);

  const leftArm = makePart(armW, 12, 4, layout.leftArm, texW, texH, material);
  leftArm.position.set(4 + armW / 2, 18, 0);
  group.add(leftArm);

  const rightLeg = makePart(4, 12, 4, layout.rightLeg, texW, texH, material);
  rightLeg.position.set(-2, 6, 0);
  group.add(rightLeg);

  const leftLeg = makePart(4, 12, 4, layout.leftLeg, texW, texH, material);
  leftLeg.position.set(2, 6, 0);
  group.add(leftLeg);

  group.position.y = -12; // center the model vertically

  return group;
}

// ----------------------------
// Adjusts the camera and OrbitControls' limits so the whole model (no
// matter its actual size) stays visible within frame, instead of using
// a fixed distance that could crop it.
// ----------------------------
function fitCameraToObject(camera, controls, object, paddingFactor = 1.6) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fov = camera.fov * (Math.PI / 180);
  let distance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  distance *= paddingFactor;

  camera.position.set(center.x, center.y, center.z + distance);
  camera.near = Math.max(distance / 100, 0.1);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = distance * 0.35;
  controls.maxDistance = distance * 5;
  controls.update();
}

// ==========================================================
// GENERIC geometry.json renderer (4D/5D models with custom bones and
// cubes, not just the standard Steve/Alex model).
// ==========================================================

// Computes Minecraft's standard "box UV" layout from an origin [u,v]
// and the cube's size [sx,sy,sz]. This is the same formula the player
// skin format itself uses (already verified against the humanoid
// model's known regions).
function boxUVFromOrigin(u, v, sx, sy, sz, mirror) {
  const layout = {
    right:  [u,               v + sz, sz, sy],
    front:  [u + sz,          v + sz, sx, sy],
    left:   [u + sz + sx,     v + sz, sz, sy],
    back:   [u + 2 * sz + sx, v + sz, sx, sy],
    top:    [u + sz,          v,      sx, sz],
    bottom: [u + sz + sx,     v,      sx, sz]
  };

  // "mirror" (very common in Blockbench-made models, especially for
  // symmetric pieces like arms/wings): swaps the left/right faces' UV
  // regions, same as Minecraft/Blockbench does.
  if (mirror) {
    const tmp = layout.right;
    layout.right = layout.left;
    layout.left = tmp;
  }

  return layout;
}

// UV layout for when a cube defines coordinates per face explicitly
// (Bedrock's "per-face uv" format: north/south/east/west/up/down).
function perFaceUV(uvObj) {
  const map = { east: "right", west: "left", south: "front", north: "back", up: "top", down: "bottom" };
  const layout = {};

  Object.entries(map).forEach(([bedrockKey, ourKey]) => {
    const face = uvObj[bedrockKey];
    if (face && Array.isArray(face.uv) && Array.isArray(face.uv_size)) {
      layout[ourKey] = [face.uv[0], face.uv[1], face.uv_size[0], face.uv_size[1]];
    } else {
      layout[ourKey] = [0, 0, 0, 0];
    }
  });

  return layout;
}

// Looks up "identifier"'s geometry inside geometry.json. 4D/5D packs
// always use the LEGACY ENTITY format (format_version "1.8.0" or
// "1.10.0"): the geometry is a top-level key whose value has a "bones"
// array, e.g.:
//   { "geometry.egg": { "bones": [...] } }
// The key isn't required to start with "geometry." because some 1.8.0
// files don't follow that convention strictly; instead, any top-level
// key whose value is an object with a "bones" array is detected (that's
// the real signal that it's a geometry).
//
// The new format ("minecraft:geometry", 1.12.0+) is deliberately NOT
// supported: 4D/5D skinpacks don't use it.
//
// IMPORTANT about coordinates: in EVERY version of the legacy format
// (1.8.0 and 1.10.0 alike), each cube's "origin" is defined in the
// model's ABSOLUTE space (the same space as the bone's "pivot"), never
// relative to the pivot. Treating it as relative (like this used to do)
// threw the model's pieces out of place.
//
// Returns { bones, texW, texH }, or null if nothing was found.
function resolveCustomGeometry(geometryJson, identifier) {
  if (!geometryJson || !identifier) return null;

  const baseNameOf = (id) =>
    String(id).replace(/^geometry\./i, "").split(".").pop().toLowerCase();

  // Aggressively normalized: no "geometry.", no uppercase, and no
  // separators (dots/dashes/underscores/spaces). This makes
  // "geometry.Angel_Geo", "geometry.angelgeo" and "geometry.angel-geo"
  // all get recognized as the same name, which is common in hand-made
  // 4D/5D packs where skins.json's identifier doesn't match
  // geometry.json's actual key letter-for-letter.
  const normalize = (id) =>
    String(id)
      .replace(/^geometry\./i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  // Collects EVERY available geometry, whether they're top-level keys
  // or sit inside an array at the root (a few unusual 1.8.0 exporters
  // store a loose array of geometries instead of an object with
  // "geometry.X" keys).
  const candidates = [];

  Object.keys(geometryJson).forEach(k => {
    const val = geometryJson[k];
    if (val && typeof val === "object" && Array.isArray(val.bones)) {
      candidates.push({ key: k, obj: val });
    }
  });

  if (Array.isArray(geometryJson.geometry)) {
    geometryJson.geometry.forEach(g => {
      if (g && typeof g === "object" && Array.isArray(g.bones)) {
        const key = g.name || g.identifier || `geometry.${candidates.length}`;
        candidates.push({ key, obj: g });
      }
    });
  }

  let match =
    candidates.find(c => c.key === identifier) ||
    candidates.find(c => c.key.toLowerCase() === identifier.toLowerCase()) ||
    candidates.find(c => baseNameOf(c.key) === baseNameOf(identifier)) ||
    candidates.find(c => normalize(c.key) === normalize(identifier));

  // Last resort: a partial match (one string contains the other), for
  // names with extra suffixes/prefixes (e.g. "AngelGeo" inside
  // "geometry.angel_geo_v2").
  if (!match) {
    const normId = normalize(identifier);
    if (normId) {
      match = candidates.find(c => {
        const nk = normalize(c.key);
        return nk && (nk.includes(normId) || normId.includes(nk));
      });
    }
  }

  // If there's only one geometry in the whole file, use it as a last
  // resort even if the identifier doesn't match at all (avoids a false
  // "not found" when it's obvious which one it is).
  if (!match && candidates.length === 1) match = candidates[0];

  if (match) {
    const obj = match.obj;
    return {
      bones: obj.bones || [],
      texW: obj.texturewidth || obj.textureWidth || obj.texture_width || 64,
      texH: obj.textureheight || obj.textureHeight || obj.texture_height || 64
    };
  }

  // The whole file IS a single geometry with no containing key (some
  // older exporters store {"bones":[...]} directly at the root).
  if (Array.isArray(geometryJson.bones) && geometryJson.bones.length) {
    return {
      bones: geometryJson.bones,
      texW: geometryJson.texturewidth || geometryJson.textureWidth || geometryJson.texture_width || 64,
      texH: geometryJson.textureheight || geometryJson.textureHeight || geometryJson.texture_height || 64
    };
  }

  return null;
}

function buildCubeMesh(cube, texW, texH, material, inflate, mirror) {
  const size = cube.size || [0, 0, 0];
  const [sx, sy, sz] = size;
  const infl = (typeof inflate === "number") ? inflate : (cube.inflate || 0);
  const mirr = (typeof cube.mirror === "boolean") ? cube.mirror : !!mirror;

  const geo = new THREE.BoxGeometry(
    Math.max(sx + infl * 2, 0.001),
    Math.max(sy + infl * 2, 0.001),
    Math.max(sz + infl * 2, 0.001)
  );

  let layout;

  if (Array.isArray(cube.uv)) {
    layout = boxUVFromOrigin(cube.uv[0], cube.uv[1], sx, sy, sz, mirr);
  } else if (cube.uv && typeof cube.uv === "object") {
    layout = perFaceUV(cube.uv);
  } else {
    layout = boxUVFromOrigin(0, 0, sx, sy, sz, mirr);
  }

  setBoxUV(geo, layout, texW, texH);
  return new THREE.Mesh(geo, material);
}

// Builds the complete 3D model from a geometry identifier (e.g.
// "geometry.egg") by looking it up inside geometry.json (new or legacy
// format), respecting the bone hierarchy (parent/pivot/rotation) and
// applying the skin texture. Returns null if the geometry isn't found or
// ends up completely empty.
function buildCustomGeometryModel(geometryJson, identifier, texture, texW, texH) {

  const resolved = resolveCustomGeometry(geometryJson, identifier);

  if (!resolved) return null;

  const descTexW = resolved.texW || texW;
  const descTexH = resolved.texH || texH;
  const bones = resolved.bones;

  const material = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.FrontSide
  });

  const boneGroups = new Map();
  const bonesByName = new Map();

  bones.forEach(bone => {
    boneGroups.set(bone.name, new THREE.Group());
    bonesByName.set(bone.name, bone);
  });

  const root = new THREE.Group();

  bones.forEach(bone => {
    const group = boneGroups.get(bone.name);
    const pivot = bone.pivot || [0, 0, 0];
    const boneInflate = bone.inflate || 0;
    const boneMirror = !!bone.mirror;

    (bone.cubes || []).forEach(cube => {

      const inflate = (typeof cube.inflate === "number") ? cube.inflate : boneInflate;
      const mesh = buildCubeMesh(cube, descTexW, descTexH, material, inflate, boneMirror);

      const origin = cube.origin || [0, 0, 0];
      const size = cube.size || [0, 0, 0];

      // A cube's "origin" is always in the model's ABSOLUTE space
      // (same as the bone's "pivot"), across every version of the
      // legacy format (1.8.0 and 1.10.0 alike).
      const center = [
        origin[0] + size[0] / 2,
        origin[1] + size[1] / 2,
        origin[2] + size[2] / 2
      ];

      if (cube.rotation) {

        // The cube has its own pivot/rotation, independent of the bone
        // (a piece inside the bone that's rotated separately). It's
        // wrapped in an intermediate group so it rotates around ITS OWN
        // pivot, not the bone's.
        const cubePivot = cube.pivot || center;

        const wrapper = new THREE.Group();
        wrapper.position.set(
          cubePivot[0] - pivot[0],
          cubePivot[1] - pivot[1],
          cubePivot[2] - pivot[2]
        );

        const [crx, cry, crz] = cube.rotation;
        wrapper.rotation.set(
          THREE.MathUtils.degToRad(-crx),
          THREE.MathUtils.degToRad(-cry),
          THREE.MathUtils.degToRad(crz)
        );

        mesh.position.set(
          center[0] - cubePivot[0],
          center[1] - cubePivot[1],
          center[2] - cubePivot[2]
        );

        wrapper.add(mesh);
        group.add(wrapper);

      } else {

        mesh.position.set(
          center[0] - pivot[0],
          center[1] - pivot[1],
          center[2] - pivot[2]
        );

        group.add(mesh);

      }

    });

    if (bone.rotation) {
      const [rx, ry, rz] = bone.rotation;
      group.rotation.set(
        THREE.MathUtils.degToRad(-rx),
        THREE.MathUtils.degToRad(-ry),
        THREE.MathUtils.degToRad(rz)
      );
    }

    const parentBone = bone.parent && bonesByName.get(bone.parent);

    if (parentBone) {
      const parentPivot = parentBone.pivot || [0, 0, 0];
      group.position.set(
        pivot[0] - parentPivot[0],
        pivot[1] - parentPivot[1],
        pivot[2] - parentPivot[2]
      );
      boneGroups.get(bone.parent).add(group);
    } else {
      group.position.set(pivot[0], pivot[1], pivot[2]);
      root.add(group);
    }

  });

  // If the geometry was found but has no visible bones/cubes
  // (malformed or empty file), we treat this the same as "not found" so
  // a clear message can be shown instead of a blank canvas.
  let cubeCount = 0;
  root.traverse((obj) => { if (obj.isMesh) cubeCount++; });

  if (cubeCount === 0) return null;

  return root;
}

// Adds the cape (cape.png) as a thin box with the same "box UV" mapping
// the rest of the model uses (Minecraft's standard format: a 10x16
// region at the texture's [0,0] origin, depth 1), instead of stretching
// the whole texture over a single plane.
//
// Size/position adapt to the model's ACTUAL bounding box instead of
// using fixed measurements meant for the standard humanoid: this way it
// looks reasonably good both on the Steve/Alex model and on a custom
// 4D/5D model of any size.
function addCapeMesh(group, capeTexture, texW, texH) {
  const capeMat = new THREE.MeshLambertMaterial({
    map: capeTexture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.FrontSide
  });

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Cape's standard proportions (10 wide x 16 tall x 1 deep) scaled to
  // the model's actual height, using the standard humanoid's total
  // height of 32 as the reference.
  const scale = Math.max(size.y / 32, 0.1);
  const capeW = 10 * scale;
  const capeH = 16 * scale;
  const capeD = 1 * scale;

  const capeLayout = boxUVFromOrigin(0, 0, 10, 16, 1);
  const capeGeo = new THREE.BoxGeometry(capeW, capeH, capeD);
  setBoxUV(capeGeo, capeLayout, texW, texH);

  const cape = new THREE.Mesh(capeGeo, capeMat);

  // Hangs from near the top of the model, flush against its actual
  // back face (the "rearmost" point of the bounding box), instead of a
  // fixed position that assumes the humanoid's proportions.
  cape.position.set(
    center.x,
    box.max.y - capeH * 0.55,
    box.min.z - capeD * 0.6
  );
  cape.rotation.x = THREE.MathUtils.degToRad(8);

  group.add(cape);
}

// ----------------------------
// Keeps a single active 3D scene instance at a time, so renderers/
// animation loops don't pile up if the user expands several skins.
// ----------------------------
let active3DViewer = null;

function dispose3DViewer() {
  if (!active3DViewer) return;
  cancelAnimationFrame(active3DViewer.frameId);
  active3DViewer.renderer.dispose();
  active3DViewer.controls.dispose();
  active3DViewer = null;
}

// Opens the 3D viewer on a given <canvas>, with the texture (data URL)
// and whether the model is slim (Alex) or wide (Steve).
function open3DViewer(canvas, textureDataUrl, isSlim) {
  dispose3DViewer();

  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 320;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(0, 4, 60);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
  dirLight.position.set(20, 30, 40);
  scene.add(dirLight);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 4, 0);
  controls.enablePan = false;
  controls.update();

  const state = { scene, camera, renderer, controls, frameId: null };
  active3DViewer = state;

  const loader = new THREE.TextureLoader();

  loader.load(textureDataUrl, (texture) => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const img = texture.image;
    const model = buildPlayerModel(texture, isSlim, img.width, img.height);
    scene.add(model);

    fitCameraToObject(camera, controls, model);
  });

  function animate() {
    state.frameId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  return state;
}

async function parseNormalSkinPack(zip) {

  const fileList = Object.keys(zip.files).filter(f => !zip.files[f].dir);
  const skinsPath = fileList.find(f => /(^|\/)skins\.json$/i.test(f));

  if (!skinsPath) return null;

  let skinsJson;
  try {
    skinsJson = JSON.parse(await zip.file(skinsPath).async("string"));
  } catch (e) {
    return null;
  }

  const pngFiles = fileList.filter(f => /\.png$/i.test(f));
  const skins = skinsJson.skins || [];

  // Resolve the display name from en_US.lang. Without this, the viewer
  // always showed "(no name in lang)" even when the pack actually had a
  // properly translated name.
  const langPaths = fileList.filter(f => /texts\/.*\.lang$/i.test(f));
  const enUsPath = langPaths.find(f => /(^|\/)en_US\.lang$/i.test(f));

  const enUsEntries = new Map();

  if (enUsPath) {
    const text = await zip.file(enUsPath).async("string");

    text.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;

      const eq = line.indexOf("=");
      if (eq > 0) {
        enUsEntries.set(line.substring(0, eq).trim(), line.substring(eq + 1).trim());
      }
    });
  }

  const packLocalizationName =
    (typeof skinsJson.localization_name === "string" && skinsJson.localization_name.trim())
      ? skinsJson.localization_name.trim()
      : null;

  const results = [];

  for (const skin of skins) {

    const name = skin.localization_name || "?";
    const geometry = skin.geometry || "";
    const isSlim = /slim/i.test(geometry);

    const expectedKey = packLocalizationName
      ? `skin.${packLocalizationName}.${name}`
      : `skin.${name}`;

    const matchedKey =
      [...enUsEntries.keys()].find(k => k === expectedKey) ||
      [...enUsEntries.keys()].find(k => k.toLowerCase() === expectedKey.toLowerCase()) ||
      [...enUsEntries.keys()].find(k => k === `skin.${name}` || k.endsWith(`.${name}`));

    const displayName = matchedKey ? enUsEntries.get(matchedKey) : null;

    let texturePath = null;
    let textureDataUrl = null;

    if (skin.texture) {
      texturePath = pngFiles.find(f =>
        f.split("/").pop().toLowerCase() === skin.texture.toLowerCase()
      );

      if (texturePath) {
        try {
          const base64 = await zip.file(texturePath).async("base64");
          textureDataUrl = `data:image/png;base64,${base64}`;
        } catch (e) {
          textureDataUrl = null;
        }
      }
    }

    results.push({
      name,
      displayName,
      isSlim,
      texturePath,
      textureDataUrl
    });
  }

  return results;
}
