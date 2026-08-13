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
      scene.fog = new THREE.FogExp2(VOID, 0.045);

      const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
      camera.position.set(0, 0.15, 6.2);

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
      const key = new THREE.PointLight(CYAN, 1.1, 28, 2);
      key.position.set(-2.4, 2.2, 4);
      const rim = new THREE.PointLight(GOLD, 0.65, 24, 2);
      rim.position.set(3.2, -1.4, 2.5);
      const warm = new THREE.PointLight(EMBER, 0.45, 20, 2);
      warm.position.set(1.6, 2.8, 3.2);
      const life = new THREE.PointLight(SIGNAL, 0.35, 18, 2);
      life.position.set(-3.1, -1.8, 2.2);
      scene.add(ambient, key, rim, warm, life);

      const crystalGroup = new THREE.Group();
      scene.add(crystalGroup);

      const crystalGeo = new THREE.OctahedronGeometry(1, 0);
      const crystals = [0, 1, 2].map((i) => {
        const mat = new THREE.MeshBasicMaterial({
          color: CYAN,
          wireframe: true,
          transparent: true,
          opacity: 0.22,
        });
        const mesh = new THREE.Mesh(crystalGeo, mat);
        const angle = (i / 3) * Math.PI * 2;
        mesh.position.set(
          Math.cos(angle) * 2.4,
          Math.sin(angle * 1.3) * 0.7,
          -1.2 - i * 0.35,
        );
        mesh.scale.setScalar(0.55 + i * 0.18);
        mesh.rotation.set(0.4 + i, 0.2 * i, 0.1);
        crystalGroup.add(mesh);
        return mesh;
      });

      const particleCount = window.matchMedia("(max-width: 600px)").matches ? 70 : 110;
      const positions = new Float32Array(particleCount * 3);
      const seeds = new Float32Array(particleCount);
      for (let i = 0; i < particleCount; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
        seeds[i] = Math.random() * Math.PI * 2;
      }
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: CYAN,
        size: 0.035,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      const goldCount = Math.floor(particleCount * 0.35);
      const goldPos = new Float32Array(goldCount * 3);
      for (let i = 0; i < goldCount; i += 1) {
        goldPos[i * 3] = (Math.random() - 0.5) * 12;
        goldPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
        goldPos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      }
      const goldDustGeo = new THREE.BufferGeometry();
      goldDustGeo.setAttribute("position", new THREE.BufferAttribute(goldPos, 3));
      const goldMat = new THREE.PointsMaterial({
        color: GOLD,
        size: 0.028,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      const goldDust = new THREE.Points(goldDustGeo, goldMat);
      scene.add(goldDust);

      const emberCount = Math.floor(particleCount * 0.22);
      const emberPos = new Float32Array(emberCount * 3);
      for (let i = 0; i < emberCount; i += 1) {
        emberPos[i * 3] = (Math.random() - 0.5) * 11;
        emberPos[i * 3 + 1] = (Math.random() - 0.5) * 7;
        emberPos[i * 3 + 2] = (Math.random() - 0.5) * 7 - 0.5;
      }
      const emberGeo = new THREE.BufferGeometry();
      emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
      const emberMat = new THREE.PointsMaterial({
        color: EMBER,
        size: 0.03,
        transparent: true,
        opacity: 0.38,
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

        crystalGroup.rotation.y = t * 0.12 * speed;
        crystalGroup.rotation.x = Math.sin(t * 0.18 * speed) * 0.12;
        for (let i = 0; i < crystals.length; i += 1) {
          const mesh = crystals[i]!;
          mesh.rotation.y += 0.0035 * speed * (i + 1);
          mesh.rotation.z += 0.002 * speed;
          const mat = mesh.material as import("three").MeshBasicMaterial;
          mat.opacity = 0.14 + pulse * 0.35;
          mat.color.setHex(currentMood === "speaking" && i === 0 ? GOLD : CYAN);
        }

        key.intensity = 0.85 + pulse * 0.9;
        rim.intensity = 0.45 + pulse * 0.7;
        warm.intensity = 0.3 + pulse * 0.55;
        life.intensity = currentMood === "thinking" ? 0.55 : 0.28 + pulse * 0.25;
        particleMat.opacity = 0.35 + pulse * 0.45;
        goldMat.opacity = currentMood === "speaking" ? 0.55 : 0.32;
        emberMat.opacity = currentMood === "speaking" ? 0.55 : 0.3;
        particleMat.color.setHex(currentMood === "thinking" ? PLASMA : CYAN);

        const pos = particleGeo.getAttribute("position") as import("three").BufferAttribute;
        for (let i = 0; i < particleCount; i += 1) {
          const base = positions[i * 3 + 1]!;
          pos.setY(i, base + Math.sin(t * 0.55 * speed + seeds[i]!) * 0.12);
        }
        pos.needsUpdate = true;
        particles.rotation.y = t * 0.02 * speed;
        goldDust.rotation.y = -t * 0.015 * speed;
        emberDust.rotation.z = t * 0.018 * speed;

        camera.position.x = Math.sin(t * 0.07) * 0.18;
        camera.position.y = 0.12 + Math.sin(t * 0.11) * 0.08;
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
    <div className={styles.root} aria-hidden="true" data-void-field="true">
      {useFallback ? <div className={styles.fallback} /> : null}
      <div ref={hostRef} className={styles.host} />
    </div>
  );
}
