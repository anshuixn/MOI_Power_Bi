// ============================================================
// Master Interactive 3D Background — ReviewBand
// Premium Floating Environment: Cursor Physics, Spring Forces,
// Click Ripples, Cursor Lighting, Layered Composition
// ============================================================

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useApp } from '@/hooks/useApp'

// ─── PALETTE ─────────────────────────────────────────────────

const PALETTE = {
  primary:   '#7C4DFF',
  deep:      '#6D3DF5',
  lavender:  '#A78BFA',
  softLav:   '#E9DFFF',
  mint:      '#D1FAE5',
  peach:     '#FBCFE8',
  white:     '#FDFBFF',
}

// ─── GLOBAL IMPULSE STORE ────────────────────────────────────
// Shared across the frame loop — no React re-renders

const clickImpulses: { pos: THREE.Vector3; time: number; strength: number }[] = []

// ─── GLASS MATERIAL DEFAULTS ─────────────────────────────────

const GLASS = {
  transparent: true,
  opacity: 0.82,
  roughness: 0.08,
  metalness: 0.04,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
  transmission: 0.25,
  thickness: 0.6,
  envMapIntensity: 1.8,
}

// ─── LEAF GEOMETRY (shared) ───────────────────────────────────

const leafGeo = (() => {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.4, 0.6, 0.8, 1.8, 0, 3.2)
  shape.bezierCurveTo(-0.8, 1.8, -0.4, 0.6, 0, 0)
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  })
})()

// 4-point star geometry (shared)
const starGeo = new THREE.OctahedronGeometry(0.18, 0)

// ─── PHYSICS HOOK ────────────────────────────────────────────

type DepthLayer = 'near' | 'mid' | 'far'

const REPULSION_RADIUS: Record<DepthLayer, number> = {
  near: 3.0,
  mid:  4.5,
  far:  2.0,
}
const REPULSION_STRENGTH: Record<DepthLayer, number> = {
  near: 0.12,
  mid:  0.06,
  far:  0.02,
}
const PARALLAX_RANGE: Record<DepthLayer, number> = {
  near: 0.6,
  mid:  0.35,
  far:  0.12,
}

function useSpringPhysics(
  ref: React.RefObject<THREE.Object3D | null>,
  basePosition: [number, number, number],
  baseRotation: [number, number, number] = [0, 0, 0],
  layer: DepthLayer = 'mid',
  mass: number = 1
) {
  const vel = useRef(new THREE.Vector3())
  const angVel = useRef(new THREE.Vector3())
  const target = useMemo(() => new THREE.Vector3(...basePosition), [basePosition])
  const baseRot = useMemo(() => new THREE.Euler(...baseRotation), [baseRotation])

  useFrame((state) => {
    const obj = ref.current
    if (!obj) return

    const t = state.clock.elapsedTime

    // Reconstruct cursor world pos at object's depth
    const cam = state.camera
    const rawDir = new THREE.Vector3(state.pointer.x, state.pointer.y, 0.5)
      .unproject(cam)
      .sub(cam.position)
      .normalize()
    const dz = (basePosition[2] - cam.position.z) / rawDir.z
    const cursorWorld = cam.position.clone().add(rawDir.multiplyScalar(dz))

    // 1. Cursor repulsion field
    const d = obj.position.distanceTo(cursorWorld)
    const rRadius = REPULSION_RADIUS[layer]
    if (d < rRadius) {
      const strength = REPULSION_STRENGTH[layer] * Math.pow(1 - d / rRadius, 2)
      const dir = obj.position.clone().sub(cursorWorld).normalize()
      vel.current.addScaledVector(dir, strength / mass)
      angVel.current.x += dir.y * 0.008 / mass
      angVel.current.y += dir.x * 0.008 / mass
    }

    // 2. Process recent click impulses
    for (const imp of clickImpulses) {
      if (t - imp.time < 0.08) {
        const dist = obj.position.distanceTo(imp.pos)
        if (dist < 9) {
          const force = (1 - dist / 9) * imp.strength / mass
          const impDir = obj.position.clone().sub(imp.pos).normalize()
          vel.current.addScaledVector(impDir, force)
          angVel.current.z += (Math.random() - 0.5) * force * 0.15
          angVel.current.x += (Math.random() - 0.5) * force * 0.08
        }
      }
    }

    // 3. Parallax target
    const pr = PARALLAX_RANGE[layer]
    const parallaxTarget = target.clone()
    parallaxTarget.x += state.pointer.x * pr
    parallaxTarget.y += state.pointer.y * pr

    // 4. Gentle ambient sway (only for leaves / petals)
    const swayX = Math.sin(t * 0.4 + basePosition[0]) * 0.04
    const swayY = Math.cos(t * 0.3 + basePosition[1]) * 0.02
    parallaxTarget.x += swayX
    parallaxTarget.y += swayY

    // 5. Spring back to parallax target
    vel.current.addScaledVector(
      parallaxTarget.clone().sub(obj.position),
      0.04
    )
    vel.current.multiplyScalar(0.88) // Damping
    obj.position.add(vel.current)

    // 6. Spring back to base rotation
    angVel.current.x += (baseRot.x - obj.rotation.x) * 0.015
    angVel.current.y += (baseRot.y - obj.rotation.y) * 0.015
    angVel.current.z += (baseRot.z - obj.rotation.z) * 0.015
    angVel.current.multiplyScalar(0.90)
    obj.rotation.x += angVel.current.x
    obj.rotation.y += angVel.current.y
    obj.rotation.z += angVel.current.z
  })

  const applyImpulse = (point: THREE.Vector3) => {
    const obj = ref.current
    if (!obj) return
    const dir = obj.position.clone().sub(point).normalize()
    vel.current.addScaledVector(dir, 0.9 / mass)
    angVel.current.x += (Math.random() - 0.5) * 0.25
    angVel.current.y += (Math.random() - 0.5) * 0.25
  }

  return { applyImpulse }
}

// ─── COMPONENTS ──────────────────────────────────────────────

function Leaf({ pos, rot, layer, scale = 1, color = PALETTE.lavender }: {
  pos: [number, number, number]
  rot: [number, number, number]
  layer: DepthLayer
  scale?: number
  color?: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  const { applyImpulse } = useSpringPhysics(ref, pos, rot, layer, 0.3)

  return (
    <mesh
      ref={ref}
      scale={scale}
      geometry={leafGeo}
      onPointerDown={(e) => { e.stopPropagation(); applyImpulse(e.point) }}
    >
      <meshPhysicalMaterial {...GLASS} color={color} emissive="#1A0E38" emissiveIntensity={0.05} />
    </mesh>
  )
}

function Star({ pos, layer }: { pos: [number, number, number]; layer: DepthLayer }) {
  const ref = useRef<THREE.Mesh>(null)
  const { applyImpulse } = useSpringPhysics(ref, pos, [0, 0, 0], layer, 0.15)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.6
      ref.current.rotation.x = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <mesh
      ref={ref}
      geometry={starGeo}
      onPointerDown={(e) => { e.stopPropagation(); applyImpulse(e.point) }}
    >
      <meshPhysicalMaterial
        {...GLASS}
        color={PALETTE.white}
        emissive={PALETTE.softLav}
        emissiveIntensity={1.2}
        opacity={0.75}
      />
    </mesh>
  )
}

const REVIEW_DATA = [
  { text: 'Fast delivery & excellent packaging.', rating: '5.0 ★', color: PALETTE.primary },
  { text: 'Support solved my issue quickly.',     rating: '4.9 ★', color: PALETTE.deep },
  { text: 'Great product, delivery was late.',    rating: '3.8 ★', color: PALETTE.lavender },
  { text: 'Easy setup and excellent quality.',    rating: '4.8 ★', color: '#6D3DF5' },
]

function ReviewCard({ pos, rot, layer, dataIdx }: {
  pos: [number, number, number]
  rot: [number, number, number]
  layer: DepthLayer
  dataIdx: number
}) {
  const ref = useRef<THREE.Group>(null)
  const { applyImpulse } = useSpringPhysics(ref, pos, rot, layer, 2.0)
  const d = REVIEW_DATA[dataIdx % REVIEW_DATA.length]

  return (
    <group
      ref={ref}
      onPointerDown={(e) => { e.stopPropagation(); applyImpulse(e.point) }}
    >
      <RoundedBox args={[2.6, 1.15, 0.08]} radius={0.1} smoothness={4}>
        <meshPhysicalMaterial {...GLASS} color={d.color} emissive="#0D0622" emissiveIntensity={0.08} />
      </RoundedBox>

      {/* Highlight border line at top */}
      <mesh position={[0, 0.52, 0.05]}>
        <boxGeometry args={[2.4, 0.015, 0.01]} />
        <meshBasicMaterial color={PALETTE.softLav} transparent opacity={0.6} />
      </mesh>

      <Text
        position={[-1.1, 0.32, 0.06]}
        fontSize={0.13}
        color="#F0EBFF"
        anchorX="left"
        maxWidth={2.2}
      >
        {d.rating}
      </Text>
      <Text
        position={[-1.1, 0.05, 0.06]}
        fontSize={0.1}
        color="#C4B5FD"
        anchorX="left"
        maxWidth={2.2}
      >
        {d.text}
      </Text>
    </group>
  )
}

function GlassBubble({ pos, scale = 1, layer, color = PALETTE.primary }: {
  pos: [number, number, number]
  scale?: number
  layer: DepthLayer
  color?: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  const { applyImpulse } = useSpringPhysics(ref, pos, [0, 0, 0], layer, scale * 1.8)

  return (
    <mesh
      ref={ref}
      scale={scale}
      onPointerDown={(e) => { e.stopPropagation(); applyImpulse(e.point) }}
    >
      <sphereGeometry args={[1, 40, 40]} />
      <meshPhysicalMaterial {...GLASS} color={color} emissive="#0D0622" emissiveIntensity={0.06} />
    </mesh>
  )
}

function GlassRing({ pos, scale = 1, layer, color = PALETTE.lavender }: {
  pos: [number, number, number]
  scale?: number
  layer: DepthLayer
  color?: string
}) {
  const ref = useRef<THREE.Mesh>(null)
  const { applyImpulse } = useSpringPhysics(ref, pos, [Math.PI / 4, 0, 0.3], layer, scale * 2)

  return (
    <mesh
      ref={ref}
      scale={scale}
      onPointerDown={(e) => { e.stopPropagation(); applyImpulse(e.point) }}
    >
      <torusGeometry args={[1, 0.045, 16, 100]} />
      <meshPhysicalMaterial {...GLASS} color={color} emissive="#1A0E38" emissiveIntensity={0.1} />
    </mesh>
  )
}

// ─── CLICK RIPPLE ────────────────────────────────────────────

function RippleEffect({ pos }: { pos: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef  = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((_s, delta) => {
    if (meshRef.current && matRef.current) {
      meshRef.current.scale.addScalar(delta * 7)
      matRef.current.opacity = Math.max(0, matRef.current.opacity - delta * 1.4)
    }
  })

  return (
    <mesh ref={meshRef} position={[pos[0], pos[1], pos[2] + 0.15]}>
      <ringGeometry args={[0.08, 0.13, 48]} />
      <meshBasicMaterial
        ref={matRef}
        color="#B084FF"
        transparent
        opacity={0.65}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function InteractionPlane() {
  const { clock } = useThree()
  const [ripples, setRipples] = useState<Array<{ id: number; pos: [number, number, number] }>>([])

  return (
    <>
      {/* Invisible full-viewport plane to capture missed clicks */}
      <mesh
        visible={false}
        onPointerDown={(e) => {
          const t = clock.elapsedTime
          clickImpulses.push({ pos: e.point.clone(), time: t, strength: 1.8 })
          if (clickImpulses.length > 12) clickImpulses.shift()

          const id = Date.now() + Math.random()
          const pos: [number, number, number] = [e.point.x, e.point.y, e.point.z]
          setRipples(prev => [...prev, { id, pos }])
          setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1500)
        }}
      >
        <planeGeometry args={[120, 120]} />
      </mesh>

      {ripples.map(r => <RippleEffect key={r.id} pos={r.pos} />)}
    </>
  )
}

// ─── CURSOR LIGHT ────────────────────────────────────────────

function CursorLight() {
  const ref = useRef<THREE.PointLight>(null)
  const { camera } = useThree()

  useFrame((state) => {
    if (!ref.current) return
    const cam = camera
    const dir = new THREE.Vector3(state.pointer.x, state.pointer.y, 0.5)
      .unproject(cam).sub(cam.position).normalize()
    const dz = (2 - cam.position.z) / dir.z
    const target = cam.position.clone().add(dir.multiplyScalar(dz))
    ref.current.position.lerp(target, 0.12)
  })

  return (
    <pointLight ref={ref} color="#DDD6FE" intensity={0.55} distance={14} decay={2} />
  )
}

// ─── FLOWING RIBBON ──────────────────────────────────────────

function Ribbon({ pts, color, offset = 0 }: {
  pts: THREE.Vector3[]
  color: string
  offset?: number
}) {
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5), [pts])

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.opacity = 0.18 + 0.09 * Math.sin(state.clock.elapsedTime * 0.5 + offset)
    }
  })

  return (
    <mesh>
      <tubeGeometry args={[curve, 120, 0.025, 8, false]} />
      <meshPhysicalMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        transparent
        opacity={0.2}
        roughness={0.2}
        clearcoat={1}
      />
    </mesh>
  )
}

// ─── FULL SCENE ──────────────────────────────────────────────

function Scene() {
  const { prefersReducedMotion } = useApp()
  const mult = prefersReducedMotion ? 0 : 1

  if (mult === 0) return null

  return (
    <>
      <fog attach="fog" args={['#FAF8FF', 9, 26]} />
      <Environment preset="city" />

      {/* Lighting */}
      <ambientLight intensity={0.75} color="#FDFBFF" />
      <directionalLight position={[12, 18, 10]} intensity={1.4} color="#FFFFFF" />
      <directionalLight position={[-10, -8, -5]} intensity={0.35} color="#7C4DFF" />
      <pointLight position={[0, -4, 6]} intensity={0.7} color="#C4B5FD" distance={20} />

      {/* Dynamic cursor point light */}
      <CursorLight />

      {/* Click / Ripple handler */}
      <InteractionPlane />

      {/* ======= FAR LAYER (z ~ -10 to -15) ======= */}

      {/* Large ghost trees: oversized leaves */}
      <Leaf pos={[-8.5, -3, -12]} rot={[0, 0.1, 0.6]}   layer="far" scale={4.0} color="#D1FAE5" />
      <Leaf pos={[10,   5,  -14]} rot={[0, -0.2, -2.4]} layer="far" scale={3.5} color="#EADDFF" />
      <Leaf pos={[-2,   7,  -13]} rot={[0.2, 0, -0.5]}  layer="far" scale={3.0} color="#FAF0FF" />

      {/* Distant glass bubbles */}
      <GlassBubble pos={[-7, 6, -15]} scale={2.6} layer="far" color="#C4B5FD" />
      <GlassBubble pos={[8, -5, -13]} scale={2.0} layer="far" color="#A78BFA" />

      {/* Far rings */}
      <GlassRing pos={[5, 6, -11]} scale={3.0} layer="far" color="#E9DFFF" />

      {/* Atmospheric stars — far */}
      <Star pos={[-5,  4, -9]}  layer="far" />
      <Star pos={[ 6, -4, -10]} layer="far" />
      <Star pos={[ 0,  7, -11]} layer="far" />
      <Star pos={[-3, -5, -9]}  layer="far" />

      {/* Flowing ribbons */}
      <Ribbon
        pts={[
          new THREE.Vector3(-12, -6, -9),
          new THREE.Vector3(-5,  -1, -6),
          new THREE.Vector3( 2,   3, -7),
          new THREE.Vector3( 9,   2, -11),
        ]}
        color={PALETTE.lavender}
        offset={0}
      />
      <Ribbon
        pts={[
          new THREE.Vector3(-9,  5, -10),
          new THREE.Vector3(-2,  1, -8),
          new THREE.Vector3( 4, -3, -7),
          new THREE.Vector3(11, -5, -9),
        ]}
        color={PALETTE.softLav}
        offset={2.5}
      />

      {/* ======= MID LAYER (z ~ -4 to -7) ======= */}

      {/* Leaves */}
      <Leaf pos={[3.5,  2.5, -5]} rot={[0.2, 0.1, -1.0]}  layer="mid" scale={1.4} color={PALETTE.primary} />
      <Leaf pos={[-4,  -3,  -6]} rot={[-0.1, -0.1, 1.6]}  layer="mid" scale={1.6} color="#FBCFE8" />
      <Leaf pos={[-6,   3,  -4]} rot={[0.3,  0.2, 0.8]}   layer="mid" scale={1.1} color={PALETTE.mint} />
      <Leaf pos={[5.5, -2,  -5]} rot={[-0.2, 0.3, -0.6]}  layer="mid" scale={1.3} color={PALETTE.lavender} />

      {/* Review cards — mid depth */}
      <ReviewCard pos={[-5.5, 2.2, -5.5]} rot={[-0.05, 0.18, -0.04]} layer="mid" dataIdx={0} />
      <ReviewCard pos={[ 6.5,-1.8, -6.5]} rot={[0.07, -0.22, 0.06]}  layer="mid" dataIdx={1} />

      {/* Glass bubbles — mid */}
      <GlassBubble pos={[4.0, 3.5, -5]}  scale={0.65} layer="mid" color={PALETTE.primary} />
      <GlassBubble pos={[-3.5,-1.5,-4.5]} scale={0.45} layer="mid" color={PALETTE.lavender} />

      {/* Mid rings */}
      <GlassRing pos={[-2, 4, -5]} scale={1.6} layer="mid" color={PALETTE.lavender} />

      {/* Stars */}
      <Star pos={[-2,  2, -4]} layer="mid" />
      <Star pos={[ 4, -1, -5]} layer="mid" />

      {/* ======= NEAR LAYER (z ~ -1 to -3) ======= */}

      {/* Small petals */}
      <Leaf pos={[-1.5,  4.0, -2.5]} rot={[0.5, 0.4,  0.5]} layer="near" scale={0.6} color="#E9DFFF" />
      <Leaf pos={[ 2.5, -4.5, -2.0]} rot={[-0.4, -0.5, -0.4]} layer="near" scale={0.75} color="#C4B5FD" />
      <Leaf pos={[-4.0, -0.5, -1.5]} rot={[0.2, -0.3,  1.2]} layer="near" scale={0.55} color={PALETTE.peach} />
      <Leaf pos={[ 1.2,  1.5, -1.8]} rot={[-0.3, 0.4, -0.8]} layer="near" scale={0.65} color={PALETTE.mint} />

      {/* Near review card */}
      <ReviewCard pos={[ 3.0, 1.2, -2.2]} rot={[0.05, -0.12, 0.04]} layer="near" dataIdx={2} />
      <ReviewCard pos={[-3.8,-2.5, -2.8]} rot={[-0.04, 0.1, -0.05]}  layer="near" dataIdx={3} />

      {/* Small bubbles */}
      <GlassBubble pos={[-5.2, -1.0, -2.0]} scale={0.38} layer="near" color={PALETTE.deep} />
      <GlassBubble pos={[ 1.5,  3.8, -1.8]} scale={0.28} layer="near" color={PALETTE.lavender} />

      {/* Near stars — very light touch */}
      <Star pos={[-2.0, -2.5, -1.5]} layer="near" />
      <Star pos={[ 3.5,  3.5, -2.0]} layer="near" />
    </>
  )
}

// ─── EXPORT ──────────────────────────────────────────────────

export function Background3D() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        // Allow pointer events so 3D objects are interactive;
        // UI components (zIndex: 10+) will naturally capture their own events first.
        pointerEvents: 'auto',
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
