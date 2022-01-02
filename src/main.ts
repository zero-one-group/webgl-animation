import './style.css'
import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import RAF from './RAF'

const container = document.querySelector('#container') as HTMLElement
const audio = document.querySelector('#audio') as HTMLInputElement
const player = document.querySelector('#player') as HTMLMediaElement
const audioTitle = document.querySelector('#audio-title') as HTMLElement

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.debug.checkShaderErrors = true;
container.appendChild(renderer.domElement);

//MAIN SCENE INSTANCE
const scene = new THREE.Scene();

//CAMERA AND ORBIT CONTROLLER
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 5);
// Make user can control the camera
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = 1500;
controls.minDistance = 0;

const context = new AudioContext()
const audioSrc = context.createMediaElementSource(player)


function play() {
  // Get audio context data array
  const analyser = context.createAnalyser()
  audioSrc.connect(analyser)
  analyser.connect(context.destination)
  analyser.fftSize = 512
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  // create 30 random cube
  const strandGroup = new THREE.Group();
  for (let i = 0; i < 20; i++) {
    const height = Math.random() * 10;
    const xRotate = Math.random() * Math.PI * 2;
    const zRotate = Math.random() * Math.PI * 2;
    const thickness = Math.random() * 0.01 // make it not so big
    const strand = new THREE.BoxGeometry(1, height, 1);
    const material = new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(strand, material);
    mesh.rotation.set(xRotate, 0, zRotate);
    mesh.scale.set(thickness, 1, thickness);
    strandGroup.add(mesh);
  }
  scene.add(strandGroup);

  function update() {
    // Get audio frequency data
    analyser.getByteFrequencyData(dataArray);

    // the 0.01 are just a random number that I use so the wave number arent get too big
    const reducer = 0.01
    // lower wave half
    const lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
    // upper wave half
    const upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

    // the height of the wave
    const overallAvg = avg(dataArray) * reducer

    // lower wave
    const lowerMax = max(lowerHalfArray);
    const lowerAvg = avg(lowerHalfArray);
    // upper wave
    const upperMax = max(upperHalfArray);
    const upperAvg = avg(upperHalfArray);

    // max lower wave
    const lowerMaxFr = lowerMax / lowerHalfArray.length * reducer
    const lowerAvgFr = lowerAvg / lowerHalfArray.length * reducer
    // max upper wave
    const upperMaxFr = upperMax / upperHalfArray.length * reducer
    const upperAvgFr = upperAvg / upperHalfArray.length * reducer
    
    let i = 0;
    while (i < strandGroup.children.length) {
      // Update box to follow wavelength
      const yScale = overallAvg
      const xScale = lowerMaxFr - lowerAvgFr
      const zScale = upperMaxFr - upperAvgFr
      strandGroup.children[i].rotateX(xScale);
      strandGroup.children[i].rotateZ(zScale);
      strandGroup.children[i].scale.set(1, yScale, 1);
      i++;
    }
    renderer.render(scene, camera);
  }

  //RENDER LOOP
  RAF.subscribe("threeSceneUpdate", update);
}

// WINDOW SIZE UPDATER SETUP
function resizeCanvas() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resizeCanvas);

audio.addEventListener('change', (e: Event) => {
  // disconnect audio src to reset context
  audioSrc.disconnect()
  // load files and play visualizer
  const files = (<HTMLInputElement>e.target).files
  // the ts compiler screaming without this smh ~ 
  if (!files) return
  if (!files.length) return
  audioTitle.innerText = files[0].name
  player.src = URL.createObjectURL(files[0])
  context.resume()
  player.load()
  player.play()
  play()
})


// Utility function
function avg(arr: Uint8Array){
  const total = arr.reduce((sum, b) => sum + b );
  return (total / arr.length);
}

function max(arr: Uint8Array){
  return arr.reduce((a, b) => Math.max(a, b) )
}

