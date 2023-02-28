import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ImageLoader } from 'three'

/**
 * Base
 */
// Debug
const gui = new dat.GUI()
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**f
 * Loaders
 */
const gltfLoader = new GLTFLoader()



/**
 * Environment map
 */
const cubeTextureLoader = new THREE.CubeTextureLoader()
const environmentMap = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.jpg',
    '/textures/environmentMaps/0/nx.jpg',
    '/textures/environmentMaps/0/py.jpg',
    '/textures/environmentMaps/0/ny.jpg',
    '/textures/environmentMaps/0/pz.jpg',
    '/textures/environmentMaps/0/nz.jpg'
])

environmentMap.encoding = THREE.sRGBEncoding

debugObject.envMapIntensity = 1
gui.add(debugObject, 'envMapIntensity').min(0).max(10).step(0.001)

scene.background = environmentMap
scene.environment = environmentMap

/**
 * Models
 */
// gltfLoader.load(
//     '/models/baba_NEW_v2.glb',
//     (gltf) => {
//         gltf.scene.scale.set(10, 10, 10)
//         gltf.scene.position.set(0, - 4, 0)
//         gltf.scene.rotation.y = Math.PI * 0.5
//         scene.add(gltf.scene)
//         updateAllMaterials()
//         gui.add(gltf.scene.rotation, 'y').min(- Math.PI).max(Math.PI).step(0.001).name('rotation')
//     }
// )

/**
 * Update all materials
 */
const updateAllMaterials = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            child.material.envMap = environmentMap
            child.material.envMapIntensity = 2.5
            child.material.envMapIntensity = debugObject.envMapIntensity
            child.castShadow = true
            child.receiveShadow = true
        }
    })
}

// VERTEX SHADER 
const VS = `
uniform float pointMultiplier;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

}`;

// FRAGMENT SHADER
const FS = `

uniform sampler2D diffuseTexture;

void main() {
  gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
}`;


// PARTICLES

class LinearSpline {
    constructor(lerp) {
      this._points = [];
      this._lerp = lerp;
    }
  
    AddPoint(t, d) {
      this._points.push([t, d]);
    }
  
    Get(t) {
      let p1 = 0;
  
      for (let i = 0; i < this._points.length; i++) {
        if (this._points[i][0] >= t) {
          break;
        }
        p1 = i;
      }
  
      const p2 = Math.min(this._points.length - 1, p1 + 1);
  
      if (p1 == p2) {
        return this._points[p1][1];
      }
  
      return this._lerp(
          (t - this._points[p1][0]) / (
              this._points[p2][0] - this._points[p1][0]),
          this._points[p1][1], this._points[p2][1]);
    }
}

class ParticleSystem {
    constructor(params) {
      const uniforms = {
          diffuseTexture: {
              value: new THREE.TextureLoader().load('/models/fire/fire.png')
          },
          pointMultiplier: {
              value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
          }
      };
  
      this._material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: VS,
          fragmentShader: FS,
          blending: THREE.AdditiveBlending,
          depthTest: true,
          depthWrite: false,
          transparent: true,
          vertexColors: true
      });
  
      this._camera = params.camera;
      this._particles = [];
  
      this._geometry = new THREE.BufferGeometry();
      this._geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    //   this._geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
    //   this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute([], 4));
    //   this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));
  
      this._points = new THREE.Points(this._geometry, this._material);
  
      params.parent.add(this._points);
  
    //   this._alphaSpline = new LinearSpline((t, a, b) => {
    //     return a + t * (b - a);
    //   });
    //   this._alphaSpline.AddPoint(0.0, 0.0);
    //   this._alphaSpline.AddPoint(0.1, 1.0);
    //   this._alphaSpline.AddPoint(0.6, 1.0);
    //   this._alphaSpline.AddPoint(1.0, 0.0);
  
    //   this._colourSpline = new LinearSpline((t, a, b) => {
    //     const c = a.clone();
    //     return c.lerp(b, t);
    //   });
    //   this._colourSpline.AddPoint(0.0, new THREE.Color(0xFFFF80));
    //   this._colourSpline.AddPoint(1.0, new THREE.Color(0xFF8080));
  
    //   this._sizeSpline = new LinearSpline((t, a, b) => {
    //     return a + t * (b - a);
    //   });
    //   this._sizeSpline.AddPoint(0.0, 1.0);
    //   this._sizeSpline.AddPoint(0.5, 5.0);
    //   this._sizeSpline.AddPoint(1.0, 1.0);
  
    //   document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    
      this._AddParticles();
      this._UpdateGeometry();
    }
  
    // _onKeyUp(event) {
    //   switch(event.keyCode) {
    //     case 32: // SPACE
    //       this._AddParticles();
    //       break;
    //   }
    // }
  
    // _AddParticles(timeElapsed) {
    //   if (!this.gdfsghk) {
    //     this.gdfsghk = 0.0;
    //   }
    //   this.gdfsghk += timeElapsed;
    //   const n = Math.floor(this.gdfsghk * 75.0);
    //   this.gdfsghk -= n / 75.0;
  
    //   for (let i = 0; i < n; i++) {
    //     const life = (Math.random() * 0.75 + 0.25) * 10.0;
    //     this._particles.push({
    //         position: new THREE.Vector3(
    //             (Math.random() * 2 - 1) * 1.0,
    //             (Math.random() * 2 - 1) * 1.0,
    //             (Math.random() * 2 - 1) * 1.0),
    //         size: (Math.random() * 0.5 + 0.5) * 4.0,
    //         colour: new THREE.Color(),
    //         alpha: 1.0,
    //         life: life,
    //         maxLife: life,
    //         rotation: Math.random() * 2.0 * Math.PI,
    //         velocity: new THREE.Vector3(0, -15, 0),
    //     });
    //   }
    // }

    _AddParticles() {
        for (let i = 0; i < 10; i++) {
            this._particles.push({
                position: new THREE.Vector3(
                    (Math.random() * 2 - 1) * 1.0,
                    (Math.random() * 2 - 1) * 1.0,
                    (Math.random() * 2 - 1) * 1.0),
            });
        }
    }
  
    _UpdateGeometry() {
      const positions = [];
    //   const sizes = [];
    //   const colours = [];
    //   const angles = [];
  
      for (let p of this._particles) {
        positions.push(p.position.x, p.position.y, p.position.z);
        // colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
        // sizes.push(p.currentSize);
        // angles.push(p.rotation);
      }
  
      this._geometry.setAttribute(
          'position', new THREE.Float32BufferAttribute(positions, 3));
    //   this._geometry.setAttribute(
    //       'size', new THREE.Float32BufferAttribute(sizes, 1));
    //   this._geometry.setAttribute(
    //       'colour', new THREE.Float32BufferAttribute(colours, 4));
    //   this._geometry.setAttribute(
    //       'angle', new THREE.Float32BufferAttribute(angles, 1));
    
      this._geometry.attributes.position.needsUpdate = true;
    //   this._geometry.attributes.size.needsUpdate = true;
    //   this._geometry.attributes.colour.needsUpdate = true;
    //   this._geometry.attributes.angle.needsUpdate = true;
    }
  
    _UpdateParticles(timeElapsed) {
      for (let p of this._particles) {
        p.life -= timeElapsed;
      }
  
      this._particles = this._particles.filter(p => {
        return p.life > 0.0;
      });
  
      for (let p of this._particles) {
        const t = 1.0 - p.life / p.maxLife;
  
        p.rotation += timeElapsed * 0.5;
        p.alpha = this._alphaSpline.Get(t);
        p.currentSize = p.size * this._sizeSpline.Get(t);
        p.colour.copy(this._colourSpline.Get(t));
  
        p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));
  
        const drag = p.velocity.clone();
        drag.multiplyScalar(timeElapsed * 0.1);
        drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
        drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
        drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
        p.velocity.sub(drag);
      }
  
      this._particles.sort((a, b) => {
        const d1 = this._camera.position.distanceTo(a.position);
        const d2 = this._camera.position.distanceTo(b.position);
  
        if (d1 > d2) {
          return -1;
        }
  
        if (d1 < d2) {
          return 1;
        }
  
        return 0;
      });
    }
  
    Step() {
      this._AddParticles();
    //   this._UpdateParticles();
      this._UpdateGeometry();

    }
}

// // APP

// class App {
//     constructor() {
//         this._Initialize();
//     }

//     _Initialize() {
//         this._renderer = new THREE.WebGLRenderer({
//             canvas: canvas
//         })
//         this._renderer.setSize(sizes.width, sizes.height)
//         this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
//         this._renderer.physicallyCorrectLights = true
//         this._renderer.outputEncoding = THREE.sRGBEncoding
//         this._renderer.toneMapping = THREE.ACESFilmicToneMapping
//         this._renderer.shadowMap.enabled = true
//         this._renderer.shadowMap.type = THREE.PCFSoftShadowMap

//         // append child not neccessary?

//         // OnWindowResize?




//     }


// }

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Light 
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.position.set(0.25, 3, - 2.25)
directionalLight.castShadow = true
directionalLight.shadow.camera.far = 15
scene.add(directionalLight)

gui.add(directionalLight, 'intensity').min(0).max(10).step(0.001).name('lightIntensity')
gui.add(directionalLight.position, 'x').min(- 5).max(5).step(0.001).name('lightX')
gui.add(directionalLight.position, 'y').min(- 5).max(5).step(0.001).name('lightY')
gui.add(directionalLight.position, 'z').min(- 5).max(5).step(0.001).name('lightZ')


/**
 * Camera
 */

// Base camera
const directionalLightCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
scene.add(directionalLightCameraHelper)

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4, 1, - 4)
scene.add(camera)


/**
 * PARTICLE INIT
 */

var particles = new ParticleSystem({
    parent: scene,
    camera: camera,
});


scene.add(particles)


// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// gui.add(renderer, 'toneMapping', {
//     No: THREE.NoToneMapping,
//     Linear: THREE.LinearToneMapping,
//     Reinhard: THREE.ReinhardToneMapping,
//     Cineon: THREE.CineonToneMapping,
//     ACESFilmic: THREE.ACESFilmicToneMapping
// })

/**
 * Animate
 */
const tick = () => {
    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    particles.Step()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()


// ANIMATE ALTERNATIVE

// _RAF() {
//     requestAnimationFrame((t) => {
//       if (this._previousRAF === null) {
//         this._previousRAF = t;
//       }

//       this._RAF();

//       this._threejs.render(this._scene, this._camera);
//       this._Step(t - this._previousRAF);
//       this._previousRAF = t;
//     });
//   }

//   _Step(timeElapsed) {
//     const timeElapsedS = timeElapsed * 0.001;

//     this._particles.Step(timeElapsedS);
//   }