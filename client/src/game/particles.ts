/* GLOBAL PARTICLE SYSTEM */

const maxParticles = 10000; // too many? too little? IDK

type Particle = {
  active: boolean;
  x: number;
  y: number;
  dx: number;
  dy: number;
  lifetime: number;
  totalTime: number;
  color: [number, number, number];
  type: "shrink";
  radius: number;
};

export const instances = Array.from({ length: maxParticles }).map(() => ({
  active: false,
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  lifetime: 0,
  totalTime: 0,
  color: [1, 1, 1],
  type: "shrink",
  radius: 0,
})) as Particle[];
let freeList = [] as Particle[];
let freeListNext = 0;

// update freelist
export function updateParticleFreelist() {
  freeList = [];
  for (const particle of instances) {
    if (particle.active === false) {
      freeList.push(particle);
    }
  }
  freeListNext = 0;
}

export function createParticle(particle: Particle) {
  // add particle
  if (freeListNext >= freeList.length) {
    console.warn(`out of particles: ${freeListNext} / ${freeList.length}`);
    return;
  }
  const freeParticle = freeList[freeListNext]!;
  freeListNext++;
  Object.assign(freeParticle, particle);
}

// TODO: update particles in draw instead (update happens more often than necessary)
export function updateParticles(dt: number) {
  // update particles
  for (const particle of instances) {
    if (particle.active) {
      particle.lifetime -= dt;
      if (particle.lifetime <= 0) {
        particle.active = false;
      } else {
        particle.x += particle.dx * dt;
        particle.y += particle.dy * dt;
      }
    }
  }
}
