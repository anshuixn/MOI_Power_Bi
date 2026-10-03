// ============================================================
// ReviewBand — Cinematic AI Orb
// Sophisticated multi-layer intelligence orb with:
// • Luminous core with noise displacement
// • Multiple orbital rings at different inclinations
// • Small orbital nodes (discs, arcs, particles) at varied speeds
// • Cursor-reactive parallax via spring interpolation
// • Scroll-phase-based position, scale, opacity choreography
// • Ambient particles that respond to scroll velocity
// ============================================================

import { useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import type { PerformanceTier } from '@/types'

// ── Shared cursor state (raw → smoothed spring) ──────────────
const cursor = { rawX: 0, rawY: 0, x: 0, y: 0 }
const BASE_SCENE_SCALE = 0.72


// ── Perlin-style noise vertex shader (core orb) ─────────────
const coreVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;

  // Classic Perlin noise
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }
  float cnoise(vec3 P){
    vec3 Pi0 = floor(P); vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod(Pi0, 289.0); Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0); vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 / 7.0; vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 / 7.0; vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x); vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z); vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x); vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z); vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  void main() {
    vUv = uv;
    vNormal = normalize(mat3(viewMatrix * modelMatrix) * normal);
    float noise = cnoise(position * 0.8 + uTime * 0.07);
    float breathe = 1.0 + 0.008 * sin(uTime * 0.45);
    vec3 displaced = position * breathe + normal * noise * 0.035;
    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    vPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const coreFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;

  void main() {
    // Base color cycling: violet → magenta → indigo
    float t = 0.5 + 0.5 * sin(uTime * 0.32 + vPosition.y * 2.1);
    float t2 = 0.5 + 0.5 * cos(uTime * 0.24 + vPosition.x * 1.6);
    vec3 colorA = vec3(0.486, 0.227, 0.929); // #7C3AED violet
    vec3 colorB = vec3(0.659, 0.333, 0.969); // #A855F7 mid-purple
    vec3 colorC = vec3(0.925, 0.282, 0.6);   // #EC4899 magenta

    vec3 color = mix(colorA, colorB, t);
    color = mix(color, colorC, t2 * 0.45);

    // Keep the view direction and normal in the same coordinate space.
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(0.0, dot(viewDir, normalize(vNormal))), 2.8);
    color += fresnel * colorB * 1.1;

    // Inner luminosity pulse
    float pulse = 0.92 + 0.08 * sin(uTime * 1.1);
    float alpha = (0.94 + fresnel * 0.06) * pulse;

    gl_FragColor = vec4(color, alpha);
  }
`

// ── Inner core glow (small luminous sphere) ──────────────────
function CoreGlow() {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (matRef.current) {
      // Very subtle breathing opacity
      matRef.current.opacity = 0.55 + 0.08 * Math.sin(t * 0.9)
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.38, 32, 32]} />
      <meshBasicMaterial
        ref={matRef}
        color="#E0C4FF"
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Main AI Orb (gently deformed, opaque sphere) ─────────────
function AIOrb() {
  const meshRef = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), [])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    uniforms.uTime.value = time
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.07
      meshRef.current.rotation.z = Math.sin(time * 0.055) * 0.04
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={coreVertexShader}
        fragmentShader={coreFragmentShader}
        uniforms={uniforms}
        transparent={false}
      />
    </mesh>
  )
}

// ── Orbital Ring (tilted torus at various inclinations) ───────
function OrbitalRing({
  radius,
  speed,
  tiltX,
  tiltZ,
  color,
  opacity,
  tube,
}: {
  radius: number
  speed: number
  tiltX: number
  tiltZ: number
  color: string
  opacity: number
  tube: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.rotation.y = time * speed
      groupRef.current.rotation.x = tiltX + Math.sin(time * 0.06) * 0.025
      groupRef.current.rotation.z = tiltZ + Math.cos(time * 0.05) * 0.02
    }
  })

  return (
    <group ref={groupRef} rotation={[tiltX, 0, tiltZ]}>
      <mesh>
        <torusGeometry args={[radius, tube, 12, 128]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── Orbital Node (small glowing disc orbiting) ────────────────
function OrbitalNode({
  radius,
  speed,
  offset,
  inclinationX,
  inclinationZ,
  color,
  size,
}: {
  radius: number
  speed: number
  offset: number
  inclinationX: number
  inclinationZ: number
  color: string
  size: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const angle = t * speed + offset
    if (groupRef.current) {
      // Orbit in a tilted plane
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius * Math.cos(inclinationX)
      const z = Math.sin(angle) * radius * Math.sin(inclinationZ)
      groupRef.current.position.set(x, y, z)
    }
    // Pulsing opacity — each node breathes at a slightly different rate
    if (matRef.current) {
      matRef.current.opacity = 0.55 + 0.35 * Math.sin(t * 1.3 + offset)
    }
    // Keep the node's subtle spin tied to scene time rather than frame count.
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.6
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <circleGeometry args={[size, 16]} />
        <meshBasicMaterial ref={matRef} color={color} transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── Arc Fragment (short glowing arc orbiting) ─────────────────
function OrbitalArc({
  radius,
  speed,
  offset,
  color,
  opacity,
}: {
  radius: number
  speed: number
  offset: number
  color: string
  opacity: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = clock.getElapsedTime() * speed + offset
      groupRef.current.rotation.x = 0.6 + Math.sin(clock.getElapsedTime() * 0.04 + offset) * 0.15
    }
  })

  // Create arc as a partial torus
  const arcGeometry = useMemo(() => {
    const curve = new THREE.TorusGeometry(radius, 0.008, 8, 80, Math.PI * 0.4)
    return curve
  }, [radius])

  return (
    <group ref={groupRef}>
      <mesh geometry={arcGeometry}>
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ── Ambient Intelligence Particles ───────────────────────────
function AmbientParticles({ scrollVelocityRef }: { scrollVelocityRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.PointsMaterial>(null)

  const positions = useMemo(() => {
    const count = 60 // sparse, intentional
    const pos = new Float32Array(count * 3)
    const random = (seed: number) => {
      const value = Math.sin(seed * 12.9898) * 43758.5453
      return value - Math.floor(value)
    }

    for (let i = 0; i < count; i++) {
      const r = 2.5 + random(i * 3 + 1) * 5.5
      const theta = random(i * 3 + 2) * Math.PI * 2
      const phi = random(i * 3 + 3) * Math.PI
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.012
      meshRef.current.rotation.x = time * 0.007
    }
    if (matRef.current) {
      const vel = Math.abs(scrollVelocityRef.current)
      const targetOpacity = 0.35 + Math.min(vel * 1.2, 0.4)
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, targetOpacity, 0.05)
      // Particle size responds subtly to scroll velocity
      matRef.current.size = THREE.MathUtils.lerp(matRef.current.size, 0.04 + vel * 0.06, 0.08)
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.04}
        color="#C4B5FD"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// ── Cursor-Reactive Light ─────────────────────────────────────
function CursorLight() {
  const lightRef = useRef<THREE.PointLight>(null)
  const { viewport } = useThree()
  const targetPos = useRef(new THREE.Vector3(0, 0, 4))

  useFrame((_, delta) => {
    // Spring-smooth cursor light position
    const nx = cursor.x * viewport.width * 0.7
    const ny = cursor.y * viewport.height * 0.7
    targetPos.current.set(nx, ny, 4)
    if (lightRef.current) {
      lightRef.current.position.lerp(targetPos.current, Math.min(delta * 3.5, 1))
    }
  })

  return <pointLight ref={lightRef} color="#B38CF5" intensity={4.5} distance={10} decay={1.8} />
}

// ── Background spatial rings (large concentric, faint) ────────
function SpatialRings() {
  return (
    <group>
      {[4.5, 5.8, 7.2, 9.1].map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2 + i * 0.15, 0, i * 0.2]}>
          <torusGeometry args={[r, 0.005, 8, 160]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#C4B5FD' : '#F9A8D4'}
            transparent
            opacity={0.06 - i * 0.01}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Main scroll-reactive scene container ─────────────────────
function SceneContent({
  scrollProgressRef,
  scrollVelocityRef,
}: {
  scrollProgressRef: React.MutableRefObject<number>
  scrollVelocityRef: React.MutableRefObject<number>
}) {
  const groupRef = useRef<THREE.Group>(null)
  const targetPos = useRef(new THREE.Vector3(0, 0, 0))
  const targetScale = useRef(1)

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05)
    // Update smoothed cursor
    cursor.x = THREE.MathUtils.lerp(cursor.x, cursor.rawX, delta * 4)
    cursor.y = THREE.MathUtils.lerp(cursor.y, cursor.rawY, delta * 4)

    const p = scrollProgressRef.current

    // --- 7-phase orb choreography ---
    // p: 0 = hero, 1 = end of page
    let tx = 0, ty = 0, tz = 0, scale = 1

    if (p < 0.15) {
      // Phase 1 — Hero: centered, large, slight float toward cursor
      const local = p / 0.15
      tx = cursor.x * 0.35
      ty = cursor.y * 0.2 - local * 0.3
      scale = 1.0 - local * 0.04
    } else if (p < 0.3) {
      // Phase 2 — Scroll begins: moves down and back
      const local = (p - 0.15) / 0.15
      tx = cursor.x * 0.25 + local * 0.6
      ty = -0.3 - local * 1.2
      tz = -local * 0.5
      scale = 0.96 - local * 0.06
    } else if (p < 0.45) {
      // Phase 3 — Capabilities: orb becomes atmospheric background core
      const local = (p - 0.3) / 0.15
      tx = 0.6 - local * 0.4
      ty = -1.5 - local * 0.4
      tz = -0.5 - local * 0.5
      scale = 0.9 + local * 0.08 // slightly grows as background element
    } else if (p < 0.55) {
      // Phase 4 — Card arrival: moves down and further back
      const local = (p - 0.45) / 0.10
      tx = 0.2 - local * 0.5
      ty = -1.9 - local * 0.5
      tz = -1.0 - local * 0.4
      scale = 0.98 - local * 0.05
    } else if (p < 0.68) {
      // Phase 5 — Statistics: partially exits frame, glow visible
      const local = (p - 0.55) / 0.13
      tx = -1.2 - local * 0.8
      ty = -2.4 - local * 0.3
      tz = -1.4
      scale = 0.93 + local * 0.06
    } else if (p < 0.82) {
      // Phase 6 — Testimonials: returns, lower, reduced opacity/blur (handled in opacity)
      const local = (p - 0.68) / 0.14
      tx = -2.0 + local * 2.2
      ty = -2.7 + local * 0.5
      tz = -1.4 + local * 0.3
      scale = 0.99 - local * 0.04
    } else {
      // Phase 7 — Final CTA: returns center, glow intensifies
      const local = (p - 0.82) / 0.18
      tx = 0.2 - local * 0.2
      ty = -2.2 + local * 1.8
      tz = -1.1 + local * 0.9
      scale = 0.95 + local * 0.1
    }

    // Decay velocity between scroll events without a second page-level frame loop.
    const vel = scrollVelocityRef.current
    scrollVelocityRef.current = THREE.MathUtils.damp(vel, 0, 10, delta)
    ty -= vel * 0.12

    targetPos.current.set(tx, ty, tz)
    targetScale.current = scale * BASE_SCENE_SCALE

    if (groupRef.current) {
      // Keep the art responsive to direct manipulation; long interpolation is
      // perceived as input lag while scrolling or moving the pointer.
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetPos.current.x, 12, step)
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetPos.current.y, 12, step)
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetPos.current.z, 12, step)
      groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, targetScale.current, 12, step))

      // Subtle cursor parallax on the group itself
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        cursor.x * 0.08,
        step * 10
      )
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -cursor.y * 0.06,
        step * 10
      )
    }
  })

  return (
    <group ref={groupRef}>
      {/* Background spatial rings — always present */}
      <SpatialRings />

      {/* Ambient particles */}
      <AmbientParticles scrollVelocityRef={scrollVelocityRef} />

      {/* Inner core glow */}
      <CoreGlow />

      {/* Main orb */}
      <AIOrb />

      {/* Orbital rings at varied inclinations and speeds */}
      <OrbitalRing radius={1.68} speed={0.18} tiltX={0.9}  tiltZ={0.2}  color="#C4B5FD" opacity={0.28} tube={0.009} />
      <OrbitalRing radius={2.1}  speed={-0.12} tiltX={0.3}  tiltZ={0.7}  color="#F9A8D4" opacity={0.20} tube={0.007} />
      <OrbitalRing radius={2.55} speed={0.09}  tiltX={1.2}  tiltZ={-0.4} color="#818CF8" opacity={0.16} tube={0.006} />
      <OrbitalRing radius={1.35} speed={-0.22} tiltX={0.1}  tiltZ={1.1}  color="#A5F3FC" opacity={0.14} tube={0.005} />

      {/* Orbital nodes — small glowing discs/particles at different speeds */}
      <OrbitalNode radius={1.82} speed={0.70}  offset={0}    inclinationX={0.8}  inclinationZ={0.3}  color="#E0C4FF" size={0.045} />
      <OrbitalNode radius={2.15} speed={-1.00} offset={1.2}  inclinationX={0.3}  inclinationZ={0.9}  color="#F9A8D4" size={0.035} />
      <OrbitalNode radius={1.55} speed={1.35}  offset={2.4}  inclinationX={1.1}  inclinationZ={0.2}  color="#818CF8" size={0.028} />
      <OrbitalNode radius={2.38} speed={0.50}  offset={0.8}  inclinationX={0.2}  inclinationZ={1.0}  color="#C4B5FD" size={0.055} />
      <OrbitalNode radius={1.72} speed={-1.80} offset={3.5}  inclinationX={0.7}  inclinationZ={0.5}  color="#A5F3FC" size={0.022} />
      <OrbitalNode radius={2.62} speed={1.00}  offset={1.8}  inclinationX={1.3}  inclinationZ={0.1}  color="#F0ABFC" size={0.032} />

      {/* Orbital arc fragments */}
      <OrbitalArc radius={2.0}  speed={0.14}  offset={0}   color="#C4B5FD" opacity={0.4} />
      <OrbitalArc radius={2.45} speed={-0.09} offset={1.5} color="#F9A8D4" opacity={0.3} />
      <OrbitalArc radius={1.6}  speed={0.18}  offset={3.0} color="#818CF8" opacity={0.35} />
    </group>
  )
}

// ── Main Export ───────────────────────────────────────────────
export function LandingScene3D({
  scrollProgressRef,
  scrollVelocityRef,
  reducedMotion = false,
  performanceTier = 'full',
}: {
  scrollProgressRef: React.MutableRefObject<number>
  scrollVelocityRef: React.MutableRefObject<number>
  reducedMotion?: boolean
  performanceTier?: PerformanceTier
}) {
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)

  // Track raw cursor in module-level state
  const handleMouseMove = useCallback((e: MouseEvent) => {
    cursor.rawX = (e.clientX / window.innerWidth  - 0.5) * 2
    cursor.rawY = -(e.clientY / window.innerHeight - 0.5) * 2
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  if (performanceTier === 'static') return null

  return (
    <Canvas
      dpr={isMobile || performanceTier === 'lite' ? [1, 1] : [1, 1.25]}
      gl={{ powerPreference: 'high-performance', antialias: false, alpha: true }}
      camera={{ position: [0, 0, 6], fov: 44 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(circle 220px at 50% 48%, rgba(242, 231, 255, 0.58) 0%, rgba(196, 155, 255, 0.34) 24%, rgba(124, 58, 237, 0.18) 52%, rgba(124, 58, 237, 0.04) 76%, transparent 100%), radial-gradient(ellipse at 50% 48%, rgba(124, 58, 237, 0.12), transparent 48%)',
      }}
    >
      <ambientLight intensity={0.18} />
      <directionalLight position={[3, 5, 4]} intensity={0.35} color="#F5F0FF" />
      <CursorLight />
      <SceneContent
        scrollProgressRef={scrollProgressRef}
        scrollVelocityRef={scrollVelocityRef}
      />
      {!isMobile && performanceTier === 'full' && (
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.12}
            luminanceSmoothing={0.9}
            intensity={0.8}
            blendFunction={BlendFunction.ADD}
          />
        </EffectComposer>
      )}
    </Canvas>
  )
}
