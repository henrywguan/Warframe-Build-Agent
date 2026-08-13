"use client";

import { useEffect, useRef, useState } from "react";
import type { OrdisMood } from "../lib/ordis";
import styles from "./VoidField.module.css";

type VoidFieldProps = {
  mood?: OrdisMood;
};

const CYAN = 0x7fe7ef;
const GOLD = 0xd7b56d;
const EMBER = 0xe08a5a;
const SIGNAL = 0x6edc9a;
const PLASMA = 0x5eb8e8;
const VOID = 0x04070c;

/** Spread wireframe octahedrons across the full void — including laptop side margins. */
const CRYSTAL_LAYOUTS: ReadonlyArray<{
  x: number;
  y: number;
  z: number;
  s: number;
  spin: number;
  color: number;
}> = [
  // Near Ordis (upper center)
  { x: -1.6, y: 1.35, z: -1.8, s: 0.62, spin: 1.1, color: CYAN },
  { x: 1.9, y: 1.1, z: -2.2, s: 0.78, spin: 0.9, color: CYAN },
  { x: 0.15, y: 1.75, z: -2.9, s: 0.5, spin: 1.3, color: GOLD },
  // Left margin / dead space
  { x: -5.4, y: 1.2, z: -1.4, s: 1.15, spin: 0.7, color: EMBER },
  { x: -4.6, y: -1.5, z: -2.6, s: 0.95, spin: 1.0, color: CYAN },
  { x: -6.3, y: 0.1, z: -3.4, s: 0.72, spin: 0.85, color: PLASMA },
  { x: -3.4, y: 2.2, z: -3.8, s: 0.58, spin: 1.2, color: GOLD },
  // Right margin / dead space
  { x: 5.6, y: 0.9, z: -1.6, s: 1.1, spin: 0.75, color: PLASMA },
  { x: 4.8, y: -1.7, z: -2.5, s: 0.98, spin: 1.05, color: CYAN },
  { x: 6.5, y: 0.35, z: -3.5, s: 0.7, spin: 0.9, color: SIGNAL },
  { x: 3.6, y: 2.05, z: -3.9, s: 0.55, spin: 1.15, color: GOLD },
  // Lower field behind chat
  { x: -2.4, y: -2.5, z: -2.1, s: 0.88, spin: 0.8, color: CYAN },
  { x: 2.6, y: -2.7, z: -2.3, s: 0.82, spin: 0.95, color: EMBER },
  { x: 0.1, y: -1.8, z: -4.2, s: 1.25, spin: 0.6, color: PLASMA },
  { x: -5.0, y: -2.8, z: -4.0, s: 0.68, spin: 1.1, color: GOLD },
  { x: 5.2, y: -2.6, z: -4.1, s: 0.66, spin: 1.0, color: CYAN },
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Full-bleed Three.js void atmosphere — particles + wireframe crystals.
 * Mood-reactive, DPR-capped, pauses when the tab is hidden.
 */
export function VoidField({ mood = "idle" }: VoidFieldProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const moodRef = useRef<OrdisMood>(mood);
  const [useFallback, setUseFallback] = useState(true);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setUseFallback(true);
      return;
    }

    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let detachListeners: (() => void) | null = null;

    setUseFallback(false);

    (async () => {
      const THREE = await import("three");
      if (disposed || !hostRef.current) return;

      const scene = new THREE.Scene();
      // Lighter fog so side-margin crystals stay readable on wide laptops
      scene.fog = new THREE.FogExp2(VOID, 0.028);

      const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 120);
      camera.position.set(0, 0.2, 6.6);

      try {
        renderer = new THREE.WebGLRenderer({
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
        });
      } catch {
        setUseFallback(true);
        return;
      }

      renderer.setClearColor(VOID, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.domElement.className = styles.canvas;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.replaceChildren(renderer.domElement);

      const ambient = new THREE.AmbientLight(0x8aa4b8, 0.55);
      const key = new THREE.PointLight(CYAN, 1.1, 36, 2);
      key.position.set(-2.4, 2.2, 4);
      const rim = new THREE.PointLight(GOLD, 0.65, 32, 2);
      rim.position.set(3.2, -1.4, 2.5);
      const warm = new THREE.PointLight(EMBER, 0.45, 28, 2);
      warm.position.set(1.6, 2.8, 3.2);
      const life = new THREE.PointLight(SIGNAL, 0.35, 26, 2);
      life.position.set(-3.1, -1.8, 2.2);
      // Extra fills for left/right dead space
      const leftFill = new THREE.PointLight(EMBER, 0.4, 30, 2);
      leftFill.position.set(-6.5, 0.8, 2.5);
      const rightFill = new THREE.PointLight(PLASMA, 0.4, 30, 2);
      rightFill.position.set(6.5, 0.6, 2.5);
      scene.add(ambient, key, rim, warm, life, leftFill, rightFill);

      const crystalGeo = new THREE.OctahedronGeometry(1, 0);
      const crystals = CRYSTAL_LAYOUTS.map((layout, i) => {
        const mat = new THREE.MeshBasicMaterial({
          color: layout.color,
          wireframe: true,
          transparent: true,
          opacity: 0.2,
        });
        const mesh = new THREE.Mesh(crystalGeo, mat);
        mesh.position.set(layout.x, layout.y, layout.z);
        mesh.scale.setScalar(layout.s);
        mesh.rotation.set(0.35 + i * 0.17, 0.22 * i, 0.08 * i);
        mesh.userData.spin = layout.spin;
        mesh.userData.baseColor = layout.color;
        scene.add(mesh);
        return mesh;
      });

      const isNarrow = window.matchMedia("(max-width: 600px)").matches;
      const particleCount = isNarrow ? 130 : 280;
      const positions = new Float32Array(particleCount * 3);
      const seeds = new Float32Array(particleCount);
      for (let i = 0; i < particleCount; i += 1) {
        // Bias a portion toward the outer left/right margins
        const edgeBias = Math.random() < 0.38 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        const xCore = (Math.random() - 0.5) * 22;
        positions[i * 3] =
          edgeBias === 0 ? xCore : edgeBias * (4.5 + Math.random() * 7.5);
        positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
        seeds[i] = Math.random() * Math.PI * 2;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: CYAN,
        size: 0.04,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      const goldCount = Math.floor(particleCount * 0.4);
      const goldPos = new Float32Array(goldCount * 3);
      for (let i = 0; i < goldCount; i += 1) {
        goldPos[i * 3] = (Math.random() - 0.5) * 20;
        goldPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
        goldPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
      }
      const goldDustGeo = new THREE.BufferGeometry();
      goldDustGeo.setAttribute("position", new THREE.BufferAttribute(goldPos, 3));
      const goldMat = new THREE.PointsMaterial({
        color: GOLD,
        size: 0.032,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const goldDust = new THREE.Points(goldDustGeo, goldMat);
      scene.add(goldDust);

      const emberCount = Math.floor(particleCount * 0.28);
      const emberPos = new Float32Array(emberCount * 3);
      for (let i = 0; i < emberCount; i += 1) {
        emberPos[i * 3] = (Math.random() - 0.5) * 19;
        emberPos[i * 3 + 1] = (Math.random() - 0.5) * 11;
        emberPos[i * 3 + 2] = (Math.random() - 0.5) * 11 - 0.5;
      }
      const emberGeo = new THREE.BufferGeometry();
      emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
      const emberMat = new THREE.PointsMaterial({
        color: EMBER,
        size: 0.034,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      const emberDust = new THREE.Points(emberGeo, emberMat);
      scene.add(emberDust);

      const resize = () => {
        if (!renderer || !hostRef.current) return;
        const width = Math.max(1, hostRef.current.clientWidth);
        const height = Math.max(1, hostRef.current.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      let visible = document.visibilityState !== "hidden";
      const onVisibility = () => {
        visible = document.visibilityState !== "hidden";
      };
      document.addEventListener("visibilitychange", onVisibility);
      detachListeners = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        ro.disconnect();
      };

      const clock = new THREE.Clock();
      const tick = () => {
        if (disposed) return;
        frame = requestAnimationFrame(tick);
        if (!visible || !renderer) return;

        const t = clock.getElapsedTime();
        const currentMood = moodRef.current;
        const speed =
          currentMood === "thinking" ? 1.55 : currentMood === "speaking" ? 1.9 : 1;
        const pulse =
          currentMood === "speaking"
            ? 0.55 + Math.sin(t * 5.2) * 0.35
            : currentMood === "thinking"
              ? 0.42 + Math.sin(t * 3.1) * 0.2
              : 0.28 + Math.sin(t * 1.2) * 0.08;

        for (let i = 0; i < crystals.length; i += 1) {
          const mesh = crystals[i]!;
          const spin = (mesh.userData.spin as number) || 1;
          mesh.rotation.y += 0.0028 * speed * spin;
          mesh.rotation.z += 0.0016 * speed;
          mesh.rotation.x += 0.0011 * speed * (i % 2 === 0 ? 1 : -1);
          const mat = mesh.material as import("three").MeshBasicMaterial;
          mat.opacity = 0.12 + pulse * 0.32;
          const base = (mesh.userData.baseColor as number) || CYAN;
          mat.color.setHex(
            currentMood === "speaking" && i % 4 === 0 ? GOLD : base,
          );
        }

        // Left / right void lights surge with Ordis replies
        if (currentMood === "speaking") {
          const beat = 0.55 + Math.sin(t * 6.4) * 0.45;
          const counter = 0.55 + Math.sin(t * 6.4 + Math.PI) * 0.45;
          key.intensity = 1.15 + beat * 1.55;
          key.color.setHex(EMBER);
          key.position.set(-2.8, 1.6 + Math.sin(t * 4.2) * 0.25, 4.2);
          rim.intensity = 1.05 + counter * 1.45;
          rim.color.setHex(CYAN);
          rim.position.set(3.4, -0.6 + Math.cos(t * 4.2) * 0.25, 3.1);
          warm.intensity = 0.55 + beat * 0.85;
          life.intensity = 0.4 + counter * 0.55;
          leftFill.intensity = 0.55 + beat * 0.95;
          rightFill.intensity = 0.55 + counter * 0.95;
        } else if (currentMood === "thinking") {
          key.intensity = 1.05 + pulse * 0.75;
          key.color.setHex(PLASMA);
          rim.intensity = 0.75 + pulse * 0.65;
          rim.color.setHex(CYAN);
          warm.intensity = 0.35 + pulse * 0.35;
          life.intensity = 0.55 + pulse * 0.35;
          leftFill.intensity = 0.35 + pulse * 0.45;
          rightFill.intensity = 0.4 + pulse * 0.5;
        } else {
          key.intensity = 0.85 + pulse * 0.9;
          key.color.setHex(CYAN);
          rim.intensity = 0.45 + pulse * 0.7;
          rim.color.setHex(GOLD);
          warm.intensity = 0.3 + pulse * 0.55;
          life.intensity = 0.28 + pulse * 0.25;
          leftFill.intensity = 0.32 + pulse * 0.35;
          rightFill.intensity = 0.32 + pulse * 0.35;
        }
        particleMat.opacity = 0.38 + pulse * 0.42;
        goldMat.opacity = currentMood === "speaking" ? 0.55 : 0.36;
        emberMat.opacity = currentMood === "speaking" ? 0.55 : 0.34;
        particleMat.color.setHex(
          currentMood === "speaking" ? GOLD : currentMood === "thinking" ? PLASMA : CYAN,
        );

        const pos = particleGeo.getAttribute("position") as import("three").BufferAttribute;
        for (let i = 0; i < particleCount; i += 1) {
          const base = positions[i * 3 + 1]!;
          pos.setY(i, base + Math.sin(t * 0.55 * speed + seeds[i]!) * 0.14);
        }
        pos.needsUpdate = true;
        particles.rotation.y = t * 0.018 * speed;
        goldDust.rotation.y = -t * 0.014 * speed;
        emberDust.rotation.z = t * 0.016 * speed;

        camera.position.x = Math.sin(t * 0.07) * 0.22;
        camera.position.y = 0.15 + Math.sin(t * 0.11) * 0.09;
        camera.lookAt(0, 0, -1);

        renderer.render(scene, camera);
      };
      tick();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      detachListeners?.();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
        renderer = null;
      }
      host.replaceChildren();
    };
  }, []);

  return (
    <div
      className={styles.root}
      aria-hidden="true"
      data-void-field="true"
      data-mood={mood}
    >
      {useFallback ? <div className={styles.fallback} data-mood={mood} /> : null}
      <div ref={hostRef} className={styles.host} />
    </div>
  );
}
