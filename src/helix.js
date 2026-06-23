// =========================================================================
// DNA double-helix — Three.js scene living on the fixed full-viewport canvas.
// Exposes a small API the choreography layer drives: a render loop, a state
// object (position / scale / glow), and world-space anchor points the callout
// layer projects to screen.
// =========================================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const COLORS = {
  bg: 0x09090a,
  backbone: 0x18181b,
  backboneAccent: 0x2a0a10,
  rung: 0xb8b2a8,
  rungAccent: 0xe0102b,
  glow: 0xff2942,
};

export class Helix {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();

    // --- live state the choreographer mutates (we lerp current -> target) ---
    // orient = lay-down angle (0 = vertical, ±PI/2 = horizontal); tilt = lean
    // toward/away camera; spin = continuous rotation around the strand's own
    // long axis (applied to the inner group so it's independent of orient).
    this.target = { x: 0, y: 0, z: 0, scale: 1, bloom: 0.9, spin: 0.18, tilt: 0, orient: 0 };
    this.current = { ...this.target };

    this.anchorsLocal = []; // Vector3[] — points the callouts latch onto
    this.spinBoost = 0;     // momentary spin kick from scroll velocity
    this.bloomBoost = 0;    // momentary bloom spike on act transitions

    this._initRenderer();
    this._initScene();
    this._buildHelix();
    this._buildDust();
    this._initPost();
    this._onResize();

    window.addEventListener('resize', () => this._onResize());
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  _initScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0, 13);

    // image-based lighting for believable metal
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // key + rim
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 8);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(COLORS.glow, 3.0);
    rim.position.set(-6, -2, -4);
    this.scene.add(rim);

    const fill = new THREE.AmbientLight(0x404048, 0.6);
    this.scene.add(fill);

    // pivot = position / scale / orientation (lay-down + lean)
    // group = continuous spin around the strand's long axis (local Y)
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.group = new THREE.Group();
    this.pivot.add(this.group);
  }

  _buildHelix() {
    const TURNS = 3.4;
    const SEGMENTS = 240;
    const RADIUS = 1.55;
    const HEIGHT = 9.5;
    const RUNGS = 30;

    // ---- backbone strands as smooth tubes ----
    const strandPts = (phase) => {
      const pts = [];
      for (let i = 0; i <= SEGMENTS; i++) {
        const t = i / SEGMENTS;
        const a = t * TURNS * Math.PI * 2 + phase;
        pts.push(
          new THREE.Vector3(
            Math.cos(a) * RADIUS,
            (t - 0.5) * HEIGHT,
            Math.sin(a) * RADIUS
          )
        );
      }
      return new THREE.CatmullRomCurve3(pts);
    };

    // parts that fly in during the intro assemble
    this.parts = [];
    this.backbones = [];

    const backboneMat = new THREE.MeshStandardMaterial({
      color: COLORS.backbone,
      metalness: 1.0,
      roughness: 0.22,
      envMapIntensity: 1.4,
      transparent: true,
    });
    const backboneAccentMat = new THREE.MeshStandardMaterial({
      color: COLORS.backbone,
      metalness: 1.0,
      roughness: 0.28,
      emissive: COLORS.backboneAccent,
      emissiveIntensity: 1.0,
      envMapIntensity: 1.2,
      transparent: true,
    });

    [0, Math.PI].forEach((phase, idx) => {
      const geo = new THREE.TubeGeometry(strandPts(phase), SEGMENTS, 0.14, 16, false);
      const mesh = new THREE.Mesh(geo, idx === 0 ? backboneMat : backboneAccentMat);
      this.group.add(mesh);
      this.backbones.push(mesh);
    });

    // ---- base-pair rungs + nodes ----
    const rungMat = new THREE.MeshStandardMaterial({
      color: COLORS.rung,
      metalness: 0.7,
      roughness: 0.35,
      envMapIntensity: 1.0,
    });
    const rungAccentMat = new THREE.MeshStandardMaterial({
      color: COLORS.rungAccent,
      metalness: 0.4,
      roughness: 0.25,
      emissive: COLORS.glow,
      emissiveIntensity: 2.4,
    });
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1ec,
      metalness: 0.9,
      roughness: 0.2,
      envMapIntensity: 1.2,
    });
    const nodeAccentMat = new THREE.MeshStandardMaterial({
      color: COLORS.rungAccent,
      emissive: COLORS.glow,
      emissiveIntensity: 3.0,
      metalness: 0.3,
      roughness: 0.3,
    });

    const nodeGeo = new THREE.SphereGeometry(0.17, 20, 20);

    // accent rungs become callout anchors — spaced so they read individually
    const accentIndices = [4, 9, 14, 19, 24, 28];

    for (let i = 0; i < RUNGS; i++) {
      const t = i / (RUNGS - 1);
      const a = t * TURNS * Math.PI * 2;
      const y = (t - 0.5) * HEIGHT;

      const pA = new THREE.Vector3(Math.cos(a) * RADIUS, y, Math.sin(a) * RADIUS);
      const pB = new THREE.Vector3(Math.cos(a + Math.PI) * RADIUS, y, Math.sin(a + Math.PI) * RADIUS);

      const isAccent = accentIndices.includes(i);

      // rung cylinder spanning pA -> pB
      const dir = new THREE.Vector3().subVectors(pB, pA);
      const len = dir.length();
      const rung = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, len, 10),
        isAccent ? rungAccentMat : rungMat
      );
      rung.position.copy(pA).add(pB).multiplyScalar(0.5);
      rung.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );
      this.group.add(rung);

      // nodes at both ends
      const nA = new THREE.Mesh(nodeGeo, isAccent ? nodeAccentMat : nodeMat);
      nA.position.copy(pA);
      this.group.add(nA);
      const nB = new THREE.Mesh(nodeGeo, isAccent ? nodeAccentMat : nodeMat);
      nB.position.copy(pB);
      this.group.add(nB);

      // record formed + a scattered start for the assemble intro
      const scatter = () =>
        new THREE.Vector3(
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 12
        );
      [rung, nA, nB].forEach((m) =>
        this.parts.push({ mesh: m, formed: m.position.clone(), scatter: scatter(), t })
      );

      if (isAccent) {
        // anchor on the outward-facing node (pA), nudged out for the connector
        this.anchorsLocal.push(pA.clone().multiplyScalar(1.12));
      }
    }

    this.setAssemble(1); // start fully formed (intro drives it 0 -> 1)
  }

  // intro assemble: p 0->1 flies parts from scattered to formed, bottom-first.
  setAssemble(p) {
    const smooth = (x) => {
      x = Math.max(0, Math.min(1, x));
      return x * x * (3 - 2 * x);
    };
    for (const part of this.parts) {
      // stagger by height so it "zips" upward
      const local = smooth((p - part.t * 0.4) / 0.6);
      part.mesh.position.lerpVectors(part.scatter, part.formed, local);
      part.mesh.scale.setScalar(0.0001 + local);
    }
    const fade = smooth(p * 1.1 - 0.1);
    for (const bb of this.backbones) bb.material.opacity = fade;
  }

  // atmospheric dust — a slow-drifting particle volume for cinematic depth
  _buildDust() {
    const COUNT = 360;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.dust = new THREE.Points(geo, mat);
    this.scene.add(this.dust);
  }

  // momentary spin kick driven by scroll velocity (set from the scroll layer)
  addSpin(v) {
    this.spinBoost += v;
    this.spinBoost = Math.max(-1.2, Math.min(1.2, this.spinBoost));
  }

  // act transition — a bloom + spin spike when entering a showcase scene
  flash(amount = 1) {
    this.bloomBoost += amount;
    this.addSpin(amount * 0.6);
  }

  _initPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.7, 0.2);
    this.composer.addPass(this.bloom);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  // world-space position of an anchor, projected to {x,y} screen px + visibility
  anchorToScreen(i) {
    if (i >= this.anchorsLocal.length) return null;
    const v = this.anchorsLocal[i].clone();
    this.group.localToWorld(v);
    const ndc = v.clone().project(this.camera);
    const onScreen = ndc.z < 1 && Math.abs(ndc.x) < 1.25 && Math.abs(ndc.y) < 1.25;
    return {
      x: (ndc.x * 0.5 + 0.5) * window.innerWidth,
      y: (-ndc.y * 0.5 + 0.5) * window.innerHeight,
      visible: onScreen,
    };
  }

  // called every frame by the choreographer with an eased lerp factor
  render(lerp = 0.06) {
    const dt = this.clock.getDelta();
    const c = this.current, t = this.target;

    c.x += (t.x - c.x) * lerp;
    c.y += (t.y - c.y) * lerp;
    c.z += (t.z - c.z) * lerp;
    c.scale += (t.scale - c.scale) * lerp;
    c.bloom += (t.bloom - c.bloom) * lerp;
    c.tilt += (t.tilt - c.tilt) * lerp;
    c.orient += (t.orient - c.orient) * lerp;

    this.pivot.position.set(c.x, c.y, c.z);
    this.pivot.scale.setScalar(c.scale);
    this.pivot.rotation.z = c.orient; // lay the strand down toward horizontal
    this.pivot.rotation.x = c.tilt;   // lean toward / away from camera

    // base spin + decaying velocity kick from scroll
    this.group.rotation.y += dt * t.spin + this.spinBoost * dt * 6;
    this.spinBoost *= 0.9;

    // dust drifts slowly, opposite-ish to give depth
    if (this.dust) {
      this.dust.rotation.y += dt * 0.012;
      this.dust.rotation.x = Math.sin(this.clock.elapsedTime * 0.05) * 0.04;
    }

    this.bloom.strength = c.bloom + this.bloomBoost;
    this.bloomBoost *= 0.9;

    this.composer.render();
  }
}
