
let canvas1, context1, texture1, sprite1;
/////// draw text on canvas /////////

// create a canvas element
canvas1 = document.createElement('canvas');
context1 = canvas1.getContext('2d');
context1.font = "Bold 20px Arial";
context1.fillStyle = "rgba(0,0,0,0.95)";
context1.fillText('Hello, world!', 0, 20);
console.log(context1);
    
// canvas contents will be used for a texture
texture1 = new THREE.Texture(canvas1) 
texture1.needsUpdate = true;

var spriteMaterial = new THREE.SpriteMaterial( { map: texture1} );
	
sprite1 = new THREE.Sprite( spriteMaterial );
sprite1.scale.set(200,100,1.0);
sprite1.position.set( 50, 50, 0 );
sprite1.layers.set(idleLayer);
scene.add( sprite1 );	

function updateTooltip(message) {
	context1.clearRect(0,0,640,480);
				
	var metrics = context1.measureText(message);
	var width = metrics.width;
	context1.fillStyle = "rgba(0,0,0,0.95)"; // black border
	context1.fillRect( 0,0, width+8,20+8);
	context1.fillStyle = "rgba(255,255,255,0.95)"; // white filler
	context1.fillRect( 2,2, width+4,20+4 );
	context1.fillStyle = "rgba(0,0,0,1)"; // text color
	context1.fillText( message, 4,20 );
	texture1.needsUpdate = true;
}

function clearTooltip() {
	context1.clearRect(0,0,300,300);
	texture1.needsUpdate = true;
}