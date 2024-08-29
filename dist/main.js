// CHECK WEBGL VERSION
if ( WEBGL.isWebGL2Available() === false ) {
  document.body.appendChild( WEBGL.getWebGL2ErrorMessage() );
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Text } from 'troika-three-text';
import { CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let mixer;
let objParentLookup;
let objChildrenList;
let texLoader, faceMesh;
let composer, outlinePass;
let selectedObjects = [];
const clock = new THREE.Clock();
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialising: true });
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
const controls = new OrbitControls( camera, renderer.domElement );
const loader = new GLTFLoader();
const idleLayer = 8;
const linkLayer = 2;
const animateLayer = 4;

const objDirectory = {
	"Books" : "/sketches",
	"BrushHolder" : "/gallery",
	"Monitor" : "/experience",
	"KeyboardMouse" : "/projects"
};

const toolTips = {
	"Books" : "Peek at my sketchbook",
	"BrushHolder" : "Check out my art",
	"Monitor" : "Looking for my resumé?",
	"KeyboardMouse" : "Check out my projects!",
	"Plant" : "Water me!",
	"rig" : "Hello!",
	"CoffeeMug" : "Heat me up!",
	"Headphones" : "Play some tunes!"
}

const offsetPos = {
	"Books" : [-2.8, 2.7, 1],
	"BrushHolder" : [-3.5, 2.7, 1],
	"Monitor" : [-2, 3.4, 1.75],
	"KeyboardMouse" : [0, 2.5, 0],
	"Headphones" : [-1, 3.4, 1.23],
	"CoffeeMug": [2, 2.7, 0],
	"Plant" : [2.66, 3.1, 1],
	"rig" : [1.7, 4, -3]
}

renderer.setSize( window.innerWidth, window.innerHeight );
// Set anti-aliasing on renderer
renderer.setPixelRatio( window.devicePixelRatio * 2 );
document.body.appendChild( renderer.domElement );

texLoader = new THREE.TextureLoader();


// set up labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.fontSize = '22px';
labelRenderer.domElement.style.color = 'white';
labelRenderer.domElement.style.fontFamily = 'tahoma,sans-serif';
labelRenderer.domElement.style.textShadow = '-1px -1px 0 #000,0 -1px 0 #000, 1px -1px 0 #000, 1px 0 0 #000, 1px 1px 0 #000, 0 1px 0 #000, -1px 1px 0 #000, -1px 0 0 #000';
document.body.appendChild(labelRenderer.domElement);

const labelDiv = document.createElement('div');
 labelDiv.className = 'label';
 labelDiv.style.marginTop = '-1em';
 const label = new CSS2DObject(labelDiv);
 label.visible = false;
 scene.add(label);

// SET UP COMPOSER FOR RAYCAST SELECTION POST PROCESSING ON HOVER
// postprocessing

composer = new EffectComposer( renderer );
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
composer.addPass( outlinePass );

outlinePass.edgeStrength = 7.0;
outlinePass.edgeGlow = 0.9;
outlinePass.visibleEdgeColor.set(0xffffff);
outlinePass.hiddenEdgeColor.set(0xff00ff);

const outputPass = new OutputPass();
composer.addPass( outputPass );

// Adapt to Window Resize
function resize() {
  renderer.setSize(window.innerWidth,window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
	composer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
resize();

// Disable scrollbar function
window.onscroll = function () {
     window.scrollTo(0,0);
   }

// add text overlay
const text = "Hi! I'm Kalli, \nsoftware engineer and 2D/3D artist. \nWelcome to my workspace! \nClick around to explore.";
const textMesh = makeTextLabel(text, 0.8, 0xFFFFFF, -6.5, 11, -4, 20, 'center');

const navText = "ZOOM: MIDDLE MOUSE / WHEEL \nROTATE: LEFT MOUSE \nPAN: RIGHT MOUSE OR \nSHIFT + LEFT MOUSE";
const navHelpMesh = makeTextLabel(navText, 0.4, 0xFFFFFF, 5, 6.5, -4, 12, 'left');

// add stats for performance profiling
/*
var stats = new Stats();
stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );
*/

// add GLTF model to scene
const dLoader = new DRACOLoader();
dLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dLoader.setDecoderConfig({type: 'js'});
loader.setDRACOLoader(dLoader);

loader.load( 'static/models/lowpoly_v4_1_sitting.glb', function ( gltf ) {

	var mesh = gltf.scene.children[0];
	mixer = new THREE.AnimationMixer(mesh);
	var action = mixer.clipAction(gltf.animations[0], mesh).play();
	scene.add( gltf.scene );

	objParentLookup = new Map();
	objChildrenList = new Map();

	for (let i = 0; i < gltf.scene.children.length; i++) {
		var objName = gltf.scene.children[i].name;
		if (objName === "rig" || objName === "CoffeeMug" || objName === "Headphones" || objName === "Plant") {
			setObjLayerRecursive(gltf.scene.children[i], animateLayer, objName);
		}
		if (objName === "BG" || objName === "BGShadow" || objName === "Tabletop" || objName === "Chair" || objName === "Yarn") {
			setObjLayerRecursive(gltf.scene.children[i], idleLayer, objName);
		}
		if (objName === "Monitor" || objName === "BrushHolder" || objName === "Books" || objName === "KeyboardMouse") {
			setObjLayerRecursive(gltf.scene.children[i], linkLayer, objName);
		}

	}
	objChildrenList.set("rig", objChildrenList.get("rig").slice(0, 6));

}, undefined, function ( error ) {

	console.error( error );

} );

// SET OBJ LAYERS FOR RAYCASTING & SELECTION
function setObjLayerRecursive(mesh, layer, parentName) {
	mesh.layers.set(layer);
	if (mesh.name == "face") {
		faceMesh = mesh;
		setInterval(blink, 3000);
	}
	if (mesh.children.length > 0) {
		for (let i = 0; i < mesh.children.length; i++) {
			setObjLayerRecursive(mesh.children[i], layer, parentName);
		}
	}
	setObjParent(mesh, parentName);
	setObjChild(mesh, parentName);
}

function setObjParent(mesh, parentName) {
	var name = mesh.name;
	objParentLookup.set(mesh.name, parentName);
}

function setObjChild(mesh, parentName) {
	if (objChildrenList.has(parentName)) {
		objChildrenList.get(parentName).push(mesh);
	} else {
		objChildrenList.set(parentName, [mesh]);
	}
}

// set camera limits and position
controls.minDistance = 5.0;
controls.maxDistance = 15.0;
controls.minPolarAngle = 0.0;
controls.maxPolarAngle = Math.PI/2;

camera.position.z = 12;
camera.position.y = 5;
camera.layers.enableAll();

// Raycaster for object selection
const raycaster = new THREE.Raycaster();
raycaster.layers.enableAll();
raycaster.layers.disable(idleLayer);
raycaster.layers.enable(animateLayer);
raycaster.layers.enable(linkLayer);
document.addEventListener('mousedown', onMouseDown);
document.addEventListener( 'mousemove', onDocumentMouseMove, false );

function onMouseDown(event) {
	const coords = new THREE.Vector2(
		(event.clientX / renderer.domElement.clientWidth) * 2 - 1,
		-((event.clientY / renderer.domElement.clientHeight) * 2 - 1)
		);

	raycaster.setFromCamera(coords, camera);

	const intersections = raycaster.intersectObjects(scene.children, true);
	if (intersections.length > 0) {
		const selectedObject = intersections[0].object;
		var objParentName = objParentLookup.get(selectedObject.name);
		if (objDirectory[objParentName] !== undefined) {
			window.location.pathname = objDirectory[objParentName];
		}
		console.log(`${objParentName} was clicked!`);

		if (objParentName === "rig") {
			// change textures
			var uPos = Math.floor(Math.random() * 2);
			var vPos = Math.floor(Math.random() * 3);
			faceMesh.material.emissiveMap.offset.x =  uPos*0.5;
			faceMesh.material.emissiveMap.offset.y =  (vPos+1)*0.25;
		}
	}
}

function blink() {
	eyesClose();
	setTimeout(eyesOpen, 80);
}

function eyesOpen() {
	faceMesh.material.emissiveMap.offset.x = 0;
	faceMesh.material.emissiveMap.offset.y = 0;
}

function eyesClose() {
	faceMesh.material.emissiveMap.offset.x = 0.5;
	faceMesh.material.emissiveMap.offset.y = 0;
}

function onDocumentMouseMove(event) 
{
	const coords = new THREE.Vector2(
		(event.clientX / renderer.domElement.clientWidth) * 2 - 1,
		-((event.clientY / renderer.domElement.clientHeight) * 2 - 1)
		);

	raycaster.setFromCamera(coords, camera);

	const intersections = raycaster.intersectObjects(scene.children, true);
	if (intersections.length > 0) {
		const selectedObject = intersections[0].object;
		var objParentName = objParentLookup.get(selectedObject.name);
		//console.log(`${objParentName} hovered`);
		enableOutlineGroup(objParentName);
		// Setup label
      renderer.domElement.className = 'hovered';
      label.visible = true;
      labelDiv.textContent = toolTips[objParentName];

      // Get offset from object's dimensions
      const objX = offsetPos[objParentName][0];
      const objY = offsetPos[objParentName][1];
      const objZ = offsetPos[objParentName][2];

      // Move label over hovered element
      label.position.set(
        objX,
        objY,
        objZ
      );

	}
	else {
		// leave last hovered object highlighted
		// Reset label
      renderer.domElement.className = '';
      label.visible = false;
      labelDiv.textContent = '';
	}
}

// HOVER SELECTION HELPERS
function enableOutlineGroup(parentName) {
	if (objChildrenList !== undefined) {
		selectedObjects = [];
		var meshes = objChildrenList.get(parentName);
		for (let i = 0; i < meshes.length; i++) {
			selectedObjects.push(meshes[i]);
			outlinePass.selectedObjects = selectedObjects;
		}
	}
}

// TEXT OVERLAYS
function makeTextLabel(text, size, color, posX, posY, posZ, maxWidth, align) {
	const textObj = new Text();
	textObj.layers.set(idleLayer);
	scene.add(textObj);
	textObj.textAlign = align;
	textObj.text = text;
	textObj.fontSize = size;
	textObj.position.x = posX;
	textObj.position.y = posY;
	textObj.position.z = posZ;
	textObj.color = color;
	textObj.maxWidth =  maxWidth;
	textObj.sync();
}

// Render loop
function animate() {
	//stats.begin();
	const delta = clock.getDelta();
	if (mixer) {
		mixer.update(delta);
	};
	composer.render(delta);
	labelRenderer.render(scene, camera);
	//stats.end();
}
renderer.setAnimationLoop( animate );