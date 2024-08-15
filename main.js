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


let mixer;
let objParentLookup;
let objChildrenList;
let texLoader, faceMesh;
let composer, outlinePass;
let selectedObjects = [];
let faceTex = [];
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
	"Books" : "Check out my art",
	"BrushHolder" : "Peek at my sketchbook",
	"Monitor" : "Looking for my resumé?",
	"KeyboardMouse" : "Check out my projects",
	"Plant" : "Water me!",
	"rig" : "yo",
}

const params = {
				edgeStrength: 7.0,
				edgeGlow: 0.9,
				edgeThickness: 10,
				pulsePeriod: 0,
				usePatternTexture: false
			};

renderer.setSize( window.innerWidth, window.innerHeight );
// Set anti-aliasing on renderer
renderer.setPixelRatio( window.devicePixelRatio * 2 );
document.body.appendChild( renderer.domElement );

texLoader = new THREE.TextureLoader();

// SET UP COMPOSER FOR RAYCAST SELECTION POST PROCESSING ON HOVER
// postprocessing

composer = new EffectComposer( renderer );
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
composer.addPass( outlinePass );

outlinePass.edgeStrength = params.edgeStrength;
outlinePass.edgeGlow = params.edgeGlow;
outlinePass.visibleEdgeColor.set(0xffffff);
outlinePass.hiddenEdgeColor.set(0xff00ff);

const outputPass = new OutputPass();
composer.addPass( outputPass );

// Adapt to Window Resize
function resize() {
  renderer.setSize(window.innerWidth,window.innerHeight);
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
const text = "Hi! I'm Kalli, software engineer and 2D/3D artist. Welcome to my workspace! \nClick around to explore.";
const textMesh = makeTextLabel(text, 0.8, 0xFFFFFF, -10, 10, -4, 20, 'center');

const navText = "ZOOM: MIDDLE MOUSE / WHEEL \nROTATE: LEFT MOUSE \nPAN: RIGHT MOUSE OR \nSHIFT + LEFT MOUSE";
const navHelpMesh = makeTextLabel(navText, 0.4, 0xFFFFFF, 5.5, 6.5, -4, 12, 'left');

// add GLTF model to scene

loader.load( 'static/models/lowpoly_v4_3_sitting.glb', function ( gltf ) {

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
	if (mesh.name == "face") faceMesh = mesh;
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
controls.maxDistance = 10.0;
controls.minPolarAngle = 0.0;
controls.maxPolarAngle = Math.PI;

camera.position.z = 9;
camera.position.y = 3.25;
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
	}
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
		console.log(`${objParentName} hovered`);
		enableOutlineGroup(objParentName);
	}
	else {
		// leave last hovered object highlighted
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
	const delta = clock.getDelta();
	if (mixer) {
		mixer.update(delta);
	};
	composer.render(delta);
}
renderer.setAnimationLoop( animate );