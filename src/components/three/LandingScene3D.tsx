// ============================================================
// Landing 3D Scene — Custom shaders, floating geometry,
// post-processing, cursor-reactive lighting
// ============================================================

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// Global click impulse store (decaying force from 0 to 1)
const clickImpulse = { current: 0 }

window.addEventListener('click', () => {
  clickImpulse.current = 1
})

// ── Custom Perlin Noise Vertex Shader ────────────────────────
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;

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
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
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
    vNormal = normal;
    vPosition = position;
    float noise = cnoise(position * 1.4 + uTime * 0.22);
    vec3 displaced = position + normal * noise * 0.28;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;

  void main() {
    float t = 0.5 + 0.5 * sin(uTime * 0.38 + vPosition.y * 1.8);
    float t2 = 0.5 + 0.5 * cos(uTime * 0.28 + vPosition.x * 1.4);
    vec3 color = mix(uColorA, uColorB, t);
    color = mix(color, uColorC, t2 * 0.5);
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(viewDir, vNormal), 3.0);
    color += fresnel * uColorB * 0.9;
    gl_FragColor = vec4(color, 0.88);
  }
`

// ── Blob Sphere ───────────────────────────────────────────────
function BlobSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#7C3AED') },
    uColorB: { value: new THREE.Color('#A855F7') },
    uColorC: { value: new THREE.Color('#EC4899') },
  }), [])

  useFrame(({ clock }, delta) => {
    uniforms.uTime.value = clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1
      meshRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.07) * 0.12
      // Click physics: scale up and rotate faster when clicked
      const targetScale = 1.6 + clickImpulse.current * 0.4
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)
    }
  })

  return (
    <mesh ref={meshRef} scale={1.6}>
      <sphereGeometry args={[1, 128, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}

// ── Floating Particles ────────────────────────────────────────
function FloatingParticles() {
  const meshRef = useRef<THREE.Points>(null)
  // oxlint-disable-next-line react/purity -- Math.random() is called inside useMemo (not render), producing stable particle positions
  const positions = useMemo(() => {
    const pos = new Float32Array(140 * 3)
    for (let i = 0; i < 140; i++) {
      // oxlint-disable-next-line react/purity -- intentional: one-time random seed inside useMemo
      pos[i * 3] = (Math.random() - 0.5) * 22
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return pos
  }, [])

  useFrame(({ clock }, delta) => {
    if (meshRef.current) {
      // Base rotation + impulse spin
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.022 + clickImpulse.current * 0.5
      // Scale out on click
      const targetScale = 1 + clickImpulse.current * 0.3
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 4)
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#C4B5FD" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// ── Cursor-Reactive Light ────────────────────────────────────
function CursorLight() {
  const lightRef = useRef<THREE.PointLight>(null)
  const { viewport } = useThree()
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!lightRef.current) return
      const x = (e.clientX / window.innerWidth - 0.5) * viewport.width * 1.3
      const y = -(e.clientY / window.innerHeight - 0.5) * viewport.height * 1.3
      lightRef.current.position.set(x, y, 3.5)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [viewport])
  return <pointLight ref={lightRef} color="#A855F7" intensity={5} distance={9} decay={2} />
}

// ── Orbiting Ring ─────────────────────────────────────────────
function OrbitRing({ radius, speed, color }: { radius: number; speed: number; color: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }, delta) => {
    if (ref.current) {
      ref.current.rotation.z = clock.getElapsedTime() * speed + (clickImpulse.current * speed * 2)
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.35 + (clickImpulse.current * 0.2)
      const targetScale = 1 + clickImpulse.current * 0.15
      ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 6)
    }
  })
  return (
    <group ref={ref}>
      <mesh>
        <torusGeometry args={[radius, 0.011, 16, 200]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// ── Scroll-Reactive Scene ─────────────────────────────────────
function SceneContent({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    // Decay the global click impulse
    clickImpulse.current = THREE.MathUtils.damp(clickImpulse.current, 0, 4, delta)
    
    if (groupRef.current) {
      groupRef.current.position.y = -scrollRef.current * 1.8
      groupRef.current.rotation.y = scrollRef.current * 0.4
    }
  })
  return (
    <group ref={groupRef}>
      <BlobSphere />
      <OrbitRing radius={2.6} speed={0.14} color="#C4B5FD" />
      <OrbitRing radius={3.3} speed={-0.08} color="#F9A8D4" />
      <OrbitRing radius={1.85} speed={0.2} color="#818CF8" />
      <FloatingParticles />
    </group>
  )
}

// ── Main Export ───────────────────────────────────────────────
export function LandingScene3D({
  scrollRef,
  reducedMotion = false,
}: {
  scrollRef: React.MutableRefObject<number>
  reducedMotion?: boolean
}) {
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)

  return (
    <Canvas
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{ powerPreference: 'high-performance', antialias: false, alpha: true }}
      camera={{ position: [0, 0, 6], fov: 45 }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={0.5} color="#F0EDFF" />
      {!reducedMotion && <CursorLight />}
      <SceneContent scrollRef={scrollRef} />
      {!reducedMotion && !isMobile && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.18} luminanceSmoothing={0.85} intensity={0.9} blendFunction={BlendFunction.ADD} />
          <Vignette offset={0.25} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
