'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type AgentState = null | 'idle' | 'listening' | 'talking' | 'thinking';

export interface OrbProps extends React.ComponentProps<'div'> {
  size?: number;
  color?: string;
  colors?: string[];
  agentState?: AgentState;
  className?: string;
  getInputVolume?: () => number;
  getOutputVolume?: () => number;
}

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;
uniform float u_speed;
uniform float u_warp;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.6;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * u_speed;

  vec2 drift = vec2(
    sin(t) + 0.6 * sin(t * 1.7 + 1.3),
    cos(t * 0.8) + 0.6 * cos(t * 1.3 + 2.1)
  );

  vec2 p = vec2(uv.x * 1.8, uv.y * 1.0) + drift * u_warp;
  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(3.2, 1.5) - drift));
  float f = fbm(p + 1.2 * q);

  float g = clamp(1.0 - uv.y, 0.0, 1.0);
  float anchor = smoothstep(0.0, 0.3, uv.y);
  float shade = clamp(g + (f - 0.5) * 0.8 * anchor, 0.0, 1.0);

  vec3 white = vec3(0.99, 1.0, 1.0);
  vec3 light = mix(white, u_color, 0.5);
  vec3 dark = u_color;

  vec3 col = white;
  col = mix(col, light, smoothstep(0.28, 0.52, shade));
  col = mix(col, dark, smoothstep(0.58, 0.88, shade));

  float edge = smoothstep(0.5, 0.485, distance(uv, vec2(0.5)));

  gl_FragColor = vec4(col * edge, edge);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  if (clean.length === 3) {
    const r = ((n >> 8) & 0xf) * 17;
    const g = ((n >> 4) & 0xf) * 17;
    const b = (n & 0xf) * 17;
    return [r / 255, g / 255, b / 255];
  }
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

export function Orb({
  size = 120,
  color = '#FF4500',
  colors,
  agentState = 'idle',
  className,
  style,
  ...props
}: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeColor = colors && colors.length > 0 ? colors[0] : color;

  // Modulate speed and warp according to agentState
  let speed = 0.22;
  let warp = 0.7;

  if (agentState === 'talking') {
    speed = 0.85;
    warp = 1.3;
  } else if (agentState === 'listening') {
    speed = 0.55;
    warp = 1.0;
  } else if (agentState === 'thinking') {
    speed = 0.4;
    warp = 0.9;
  } else if (agentState === null || agentState === 'idle') {
    speed = 0.15;
    warp = 0.5;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) return;

    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERT);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.useProgram(program);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const uSpeed = gl.getUniformLocation(program, 'u_speed');
    const uWarp = gl.getUniformLocation(program, 'u_warp');

    gl.uniform3f(uColor, ...hexToRgb(activeColor));
    gl.uniform1f(uSpeed, speed);
    gl.uniform1f(uWarp, warp);

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const w = canvas.clientWidth || size;
    const h = canvas.clientHeight || size;
    const pxW = Math.round(w * dpr);
    const pxH = Math.round(h * dpr);
    canvas.width = pxW;
    canvas.height = pxH;
    gl.viewport(0, 0, pxW, pxH);
    gl.uniform2f(uResolution, pxW, pxH);

    const start = performance.now();
    let raf = 0;

    const render = (now: number) => {
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    render(start);

    return () => {
      cancelAnimationFrame(raf);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buffer);
    };
  }, [activeColor, speed, warp, size]);

  return (
    <div
      data-slot="orb"
      className={cn(
        'relative overflow-hidden rounded-full aspect-square flex items-center justify-center shrink-0 select-none',
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        borderRadius: '50%',
        ...style,
      }}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="block rounded-full pointer-events-none"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

export const FluidOrb = Orb;
export default Orb;
