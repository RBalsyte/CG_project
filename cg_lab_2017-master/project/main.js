/**
* @requires: camera.js
*/
'use strict';

const floorSize = 40;
const floorCount = 20;
const fenceHeight = 1;
const fenceCount = 10;
const windowSize = 1;
const windowHeight = 1.3;
const windowCount = 5;

const movementSpeed = 0.005;
const mouseSpeed = 0.00002;

const maxMoveSpiritX = 32;

const floorOffset = -2;

var gl = null;

//default
var width = 600;
var height = 600;

var animatedAngle = 0;
var moveSpiritX = 0;
var moveSpiritDown = true;

var camera;
//scene graph nodes
var root = null;
var rootnofloor = null;
var shadowNode;
var rotateSpirit;
var translateLight;
var rotateLight;
var lightNode;
var moveSpiritNode;
var moveSpiritHandNode;
var noFaceNode;

//textures
var renderTargetColorTexture;
var renderTargetDepthTexture;
var floorTexture;
var fenceTexture;
var concreteTexture;
var oldTexture;
var houseFloorTexture;
var houseWallTexture;
var mossTexture;
var windowTexture;

//framebuffer variables
var renderTargetFramebuffer;

//load the required resources using a utility function
loadResources({
  
  vs_shadow: 'shader/shadow.vs.glsl',
  fs_shadow: 'shader/shadow.fs.glsl',
  vs_single: 'shader/single.vs.glsl',
  fs_single: 'shader/single.fs.glsl',
  floortexture: 'models/grass.jpg',
  fencetexture: 'models/fence.jpg',
  concretetexture: 'models/concrete.jpg',
  windowtexture: 'models/window.jpg',
  tree_model_01: 'models/tree01.obj',
  oldtexture: 'models/paint.jpg',
  housefloortexture: 'models/tatami.jpg',
  housewalltexture: 'models/houseWall.jpg',
  mosstexture: 'models/moss.jpg',
  housebody: 'models/houseBody.obj',
  houseroof: 'models/houseRoof.obj',
  noface: 'models/noFace.obj',
  nofacemask: 'models/mask.obj'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);
  render(0);
});

function init(resources) {
  gl = createContext();
  width = window.innerWidth;
  height = window.innerHeight;
  
  initTextures(resources);
  initRenderToTexture();
  
  gl.enable(gl.DEPTH_TEST);
  root = createSceneGraph(gl, resources);
  camera = new Camera(root, gl.canvas, movementSpeed, mouseSpeed);
}

function createSceneGraph(gl, resources) {
  //create scenegraph
  const root = new ShaderSGNode(createProgram(gl, resources.vs_shadow, resources.fs_shadow));
  
  //light debug helper function
  function createLightSphere() {
    return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
      new RenderSGNode(makeSphere(0.2, 10, 10))
    ]);
  }
  
  function makeWindow(){
    var window = makeRect(windowSize , windowHeight);
    window.texture = [0, 0, 1, 0, 1, 1, 0, 1];
    return window;
  }
  
  function makeRectangle(width, height, textureRepeatCountHorizontally, textureRepeatCountVertically) {
    var rectangle = makeRect(width, height);
    //adapt texture coordinates
    rectangle.texture = [0, 0, textureRepeatCountHorizontally, 0, textureRepeatCountHorizontally, textureRepeatCountVertically, 0, textureRepeatCountVertically];
    return rectangle;
  }
  
  function makeSpiritLimb(x, y, z, length){
    var limb = new TransparentMaterialSGNode([new RenderSGNode(createCylinder(15, 1, 0.2))]);
    return new TransformationSGNode(glm.transform({translate: [x, y, z], rotateX: 90, scale: [0.06, 0.1, length]}), [limb]);
  }
  
  {
    //add node for setting shadow parameters
    shadowNode = new ShadowSGNode(renderTargetDepthTexture, 3, width, height);
    root.append(shadowNode);
  }
  
  {
    //create scenegraph without floor and simple shader
    rootnofloor = new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single));
  }
  
  {
    let rain = new RainSGNode(300, floorSize);
    shadowNode.append(rain);
  }
  
  {
    //initialize light
    lightNode = new LightSGNode(); //use now framework implementation of light node
    lightNode.ambient = [0.2, 0.2, 0.2, 1];
    lightNode.diffuse = [0.8, 0.8, 0.8, 1];
    lightNode.specular = [1, 1, 1, 1];
    lightNode.position = [0, 0, 0];
    
    rotateLight = new TransformationSGNode(mat4.create());
    translateLight = new TransformationSGNode(glm.transform({ translate: [10, 12, 5], rotateX: -90})); //translating the light is the same as setting the light position
    
    rotateLight.append(translateLight);
    translateLight.append(lightNode);
    translateLight.append(createLightSphere()); //add sphere for debugging: since we use 0,0,0 as our light position the sphere is at the same position as the light source
    shadowNode.append(rotateLight);
  }
  
  {
    let floor = new TransparentMaterialSGNode(new TextureSGNode(floorTexture, 0, new RenderSGNode(makeRectangle(floorSize, floorSize, floorCount, floorCount))));
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.1, 0.1, 0.1, 1];
    floor.specular = [0.5, 0.5, 0.5, 1];
    floor.shininess = 50.0;
    
    shadowNode.append(new TransformationSGNode(glm.transform({ translate: [0, floorOffset, 0], rotateX: -90, scale: 1}), [floor]));
  }
  
  {
    let window = new TransparentMaterialSGNode(new TextureSGNode(windowTexture, 0, new RenderSGNode(makeWindow())));
    window.ambient = [0, 0, 0, 1];
    window.diffuse = [0.1, 0.1, 0.1, 1];
    window.specular = [1, 1, 1, 1];
    window.shininess = 10;
    window.alpha = 0.5;
    
    let windowNode = new TransformationSGNode(glm.transform({ translate: [4.5, -0.1, -1], rotateZ:-90, scale: 1}), [window]);
    shadowNode.append(windowNode);
    rootnofloor.append(windowNode);
  }
  
  {
    let fence = new TransparentMaterialSGNode(new TextureSGNode(fenceTexture, 0, new RenderSGNode(makeRectangle(floorSize, fenceHeight, fenceCount, 1)), oldTexture, 1));
    fence.ambient = [0, 0, 0, 1];
    fence.diffuse = [0.1, 0.1, 0.1, 1];
    fence.specular = [0.5, 0.5, 0.5, 1];
    fence.shininess = 50.0;
    
    let fenceNode1 = new TransformationSGNode(glm.transform({ translate: [0, fenceHeight + floorOffset, floorSize], rotateY: 180, scale: 1}), [Object.create(fence)]);
    let fenceNode2 = new TransformationSGNode(glm.transform({ translate: [0, fenceHeight + floorOffset, -floorSize],  scale: 1}), [Object.create(fence)]);
    let fenceNode3 = new TransformationSGNode(glm.transform({ translate: [floorSize, fenceHeight + floorOffset, 0], rotateY: -90, scale: 1}), [Object.create(fence)]);
    let fenceNode4 = new TransformationSGNode(glm.transform({ translate: [-floorSize, fenceHeight + floorOffset, 0], rotateY: 90, scale: 1}), [fence]);
    
    shadowNode.append(fenceNode1);
    rootnofloor.append(fenceNode1);
    shadowNode.append(fenceNode2);
    rootnofloor.append(fenceNode2);
    shadowNode.append(fenceNode3);
    rootnofloor.append(fenceNode3);
    shadowNode.append(fenceNode4);
    rootnofloor.append(fenceNode4);
  }
  
  {
    let houseBody = new TransparentMaterialSGNode(new TextureSGNode(houseWallTexture, 0, new RenderSGNode(resources.housebody), mossTexture, 1));
    houseBody.ambient = [0, 0, 0, 1];
    houseBody.diffuse = [0.1, 0.1, 0.1, 1];
    houseBody.specular = [0.5, 0.5, 0.5, 1];
    houseBody.shininess = 50.0;
    
    let houseBodyNode = new TransformationSGNode(glm.transform({translate: [8, floorOffset-0.5, 9], scale: [0.5,0.5,1]}), [houseBody]);
    shadowNode.append(houseBodyNode);
    rootnofloor.append(houseBodyNode);
  }
  
  {
    let houseRoof = new TransparentMaterialSGNode([new RenderSGNode(resources.houseroof)]);
    houseRoof.ambient = [0, 0, 0, 1];
    houseRoof.diffuse = [0.1, 0.1, 0.1, 1];
    houseRoof.specular = [0.5, 0.5, 0.5, 1];
    houseRoof.shininess = 50.0;
    
    let houseRoofNode = new TransformationSGNode(glm.transform({translate: [8, floorOffset-0.6, 9], scale: [0.5,0.5,1]}), [houseRoof]);
    shadowNode.append(houseRoofNode);
    rootnofloor.append(houseRoofNode);
  }
  
  {
    let houseFloor = new TransparentMaterialSGNode(new TextureSGNode(houseFloorTexture, 0, new RenderSGNode(makeRectangle(15, 10, 20, 20))));
    houseFloor.ambient = [0, 0, 0, 1];
    houseFloor.diffuse = [0.1, 0.1, 0.1, 1];
    houseFloor.specular = [0.5, 0.5, 0.5, 1];
    houseFloor.shininess = 50.0;
    
    let houseFloorNode = new TransformationSGNode(glm.transform({translate: [8, floorOffset + 0.05, 9], rotateX: -90, scale: [0.5,1,1]}), [houseFloor]);
    shadowNode.append(houseFloorNode);
  }
  
  {
    let cylinderMaterial = new TransparentMaterialSGNode(new TextureSGNode(concreteTexture, 0, new RenderSGNode(createCylinder(15, 1, 0.5))));
    let cylinderNode = new TransformationSGNode(glm.transform({translate: [-3, floorOffset, 0], rotateX: -90, scale: [0.5, 0.5, 6]}), [cylinderMaterial]);
    shadowNode.append(cylinderNode);
    rootnofloor.append(cylinderNode);
  }
  
  {
    moveSpiritNode = new TransformationSGNode(mat4.create());
    moveSpiritHandNode = new TransformationSGNode(mat4.create());
    moveSpiritNode.append(moveSpiritHandNode);
    
    // add Body node as a sphere by creating a Sphere
    let spiritBodyNode = new TransparentMaterialSGNode([new RenderSGNode(makeSphere(0.2, 10, 10))]);
    spiritBodyNode.ambient = [0, 0, 0, 1];
    spiritBodyNode.diffuse = [0, 0, 0, 1];
    spiritBodyNode.specular = [0.5, 0.5, 0.5, 1];
    spiritBodyNode.shininess = 10000;
    moveSpiritNode.append(spiritBodyNode);
    
    //left leg
    moveSpiritNode.append(makeSpiritLimb(-0.1, 0, 0, 0.6));
    //right Leg
    moveSpiritNode.append(makeSpiritLimb(0.1, 0, 0, 0.6));
    // left upper arm
    moveSpiritHandNode.append(makeSpiritLimb(0.16, 0, 0, 0.4));
    // right upper arm
    moveSpiritHandNode.append(makeSpiritLimb(-0.16, 0, 0, 0.4));
    
    shadowNode.append(moveSpiritNode);
    rootnofloor.append(moveSpiritNode);
  }
  
  {
    let noface = new TransparentMaterialSGNode([new RenderSGNode(resources.noface)]);
    noface.ambient = [0, 0, 0, 1];
    noface.diffuse = [0.1, 0.1, 0.1, 1];
    noface.specular = [0, 0, 0, 1];
    noface.emission = [0, 0, 0, 1];
    noface.shininess = 0.0;
    let nofaceNode = new TransformationSGNode(glm.transform({translate: [10, floorOffset + 2.5, -15], rotateZ : 125, scale: [1.5, 1.5, 1.5]}), [noface]);
    shadowNode.append(nofaceNode);
    rootnofloor.append(nofaceNode);
  }
  
  {
    let mask = new TransparentMaterialSGNode([new RenderSGNode(resources.nofacemask)]);
    mask.ambient = [1, 1, 1, 1];
    mask.diffuse = [0, 0, 0, 1];
    mask.specular = [0, 0, 0, 1];
    mask.emission = [0, 0, 0, 1];
    mask.shininess = 0;
    let maskNode = new TransformationSGNode(glm.transform({translate: [9.75, floorOffset + 2.7, -15], rotateY: -90, scale: [0.2, 0.2, 0.2]}), [mask]);
    shadowNode.append(maskNode);
    rootnofloor.append(maskNode);
  }
  
  {
    let tree = new TransparentMaterialSGNode([new RenderSGNode(resources.tree_model_01)]);
    tree.ambient = [0.24725, 0.3995, 0.745, 1];
    tree.diffuse = [0.75164, 0.60648, 0.22648, 1];
    tree.specular = [0.228281, 0.655802, 0.766065, 1];
    tree.shininess = 0.7;
    
    let treeNode = new TransformationSGNode(glm.transform({translate: [-10, floorOffset+0.5, -3], scale: 0.2}), [tree]);
    shadowNode.append(treeNode);
    rootnofloor.append(treeNode);
  }
  
  return root;
}

function initTextures(resources){
  floorTexture = gl.createTexture();
  initTexture(floorTexture, resources.floortexture);
  
  fenceTexture = gl.createTexture();
  initTexture(fenceTexture, resources.fencetexture);
  
  oldTexture = gl.createTexture();
  initTexture(oldTexture, resources.oldtexture);
  
  houseFloorTexture = gl.createTexture();
  initTexture(houseFloorTexture, resources.housefloortexture);
  
  houseWallTexture = gl.createTexture();
  initTexture(houseWallTexture, resources.housewalltexture);
  
  mossTexture = gl.createTexture();
  initTexture(mossTexture, resources.mosstexture);
  
  concreteTexture = gl.createTexture();
  initTexture(concreteTexture, resources.concretetexture);
  
  windowTexture = gl.createTexture();
  initTexture(windowTexture, resources.windowtexture);
}

function initTexture(texture, image){
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function initRenderToTexture() {
  var depthTextureExt = gl.getExtension("WEBGL_depth_texture");
  if(!depthTextureExt) { alert('No depth texture support!!!'); return; }
  
  //generate color texture (required mainly for debugging and to avoid bugs in some WebGL platforms)
  renderTargetFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderTargetFramebuffer);
  
  //create color texture
  renderTargetColorTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderTargetColorTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
  //create depth texture
  renderTargetDepthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderTargetDepthTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
  
  //bind textures to framebuffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTargetColorTexture, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, renderTargetDepthTexture ,0);
  
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!=gl.FRAMEBUFFER_COMPLETE)
  {alert('Framebuffer incomplete!');}
  
  //clean up
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderToTexture(timeInMilliseconds){
  //bind framebuffer to draw scene into texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderTargetFramebuffer);
  
  //setup viewport
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  //setup context and camera matrices
  const context = createSGContext(gl);
  //setup a projection matrix for the light camera which is large enough to capture our scene
  context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), width / height, 2, floorSize*floorSize + floorSize);
  //compute the light's position in world space
  let lightModelMatrix = mat4.multiply(mat4.create(), rotateLight.matrix, translateLight.matrix);
  let lightPositionVector = vec4.fromValues(lightNode.position[0], lightNode.position[1], lightNode.position[2], 1);
  let worldLightPos = vec4.transformMat4(vec4.create(), lightPositionVector, lightModelMatrix);
  //let the light "shine" towards the scene center (i.e. towards C3PO)
  let worldLightLookAtPos = [0,0,0];
  let upVector = [0,1,0];
  //TASK 1.1: setup camera to look at the scene from the light's perspective
  let lookAtMatrix = mat4.lookAt(mat4.create(), worldLightPos, worldLightLookAtPos, upVector);
  //let lookAtMatrix = mat4.lookAt(mat4.create(), [0,1,-10], [0,0,0], [0,1,0]); //replace me for TASK 1.1
  context.viewMatrix = lookAtMatrix;
  
  //multiply and save light projection and view matrix for later use in shadow mapping shader!
  shadowNode.lightViewProjectionMatrix = mat4.multiply(mat4.create(),context.projectionMatrix,context.viewMatrix);
  
  //render scenegraph
  rootnofloor.render(context); //scene graph without floor to avoid reading from the same texture as we write to...
  
  //disable framebuffer (render to screen again)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render(timeInMilliseconds) {
  
  checkForWindowResize(gl);
  
  //update animations
  rotateLight.matrix = glm.rotateY(timeInMilliseconds*0.05);
  
  moveSpiritHandNode.matrix = glm.rotateZ(Math.cos(timeInMilliseconds / 2 * 0.01) * 25);
  moveSpiritX=Math.abs((timeInMilliseconds*0.005)%(maxMoveSpiritX+0.0001) -maxMoveSpiritX/2) + maxMoveSpiritX/2;
  moveSpiritNode.matrix = glm.translate(moveSpiritX - 28, Math.abs(Math.cos(timeInMilliseconds/2 * 0.01)) + floorOffset + 0.6, -10);
  
  animatedAngle = timeInMilliseconds/10;
  
  //draw scene for shadow map into texture
  renderToTexture(timeInMilliseconds);
  
  //setup viewport
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.435, 0.506, 0.635, 1.0); // sky blue color as background
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  //setup context and camera matrices
  const context = createSGContext(gl);
  camera.move(timeInMilliseconds);
  mat4.perspective(context.projectionMatrix, glm.deg2rad(30), width / height, 0.01, 100);
  mat4.lookAt(context.viewMatrix, camera.position, camera.look, camera.up);
  context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);
  
  //render scenegraph
  root.render(context);
  
  //animate
  requestAnimationFrame(render);
}


//a scene graph node for setting shadow parameters
class ShadowSGNode extends SGNode {
  constructor(shadowtexture, textureunit, width, height, children) {
    super(children);
    this.shadowtexture = shadowtexture;
    this.textureunit = textureunit;
    this.texturewidth = width;
    this.textureheight = height;
    
    this.lightViewProjectionMatrix = mat4.create(); //has to be updated each frame
  }
  
  render(context) {
    //set additional shader parameters
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_depthMap'), this.textureunit);
    
    //pass shadow map size to shader (required for extra task)
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_shadowMapWidth'), this.texturewidth);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_shadowMapHeight'), this.textureheight);
    
    var eyeToLightMatrix = mat4.multiply(mat4.create(), this.lightViewProjectionMatrix, context.invViewMatrix);
    //var eyeToLightMatrix = mat4.create();
    gl.uniformMatrix4fv(gl.getUniformLocation(context.shader, 'u_eyeToLightMatrix'), false, eyeToLightMatrix);
    
    //activate and bind texture
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowtexture);
    
    //render children
    super.render(context);
    
    //clean up
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}


//a scene graph node for setting texture parameters
class TextureSGNode extends SGNode {
  constructor(texture, textureunit, children, texture2, textureunit2 ) {
    super(children);
    this.texture = texture;
    this.textureunit = textureunit;
    this.texture2 = texture2;
    this.textureunit2 = textureunit2;
  }
  
  render(context) {
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture'), 1);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_tex'), this.textureunit);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_tex2'), this.textureunit2);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture2);
    
    super.render(context);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture'), 0);
  }
}

// https://stackoverflow.com/questions/29802400/cylinder-partially-visible-webgl
function createCylinder(segments, length, radius) {
  var textureCoordData = [];
  var vertices = [];
  var indices = [];
  var normals = [];
  
  var angle;
  var alpha = 360 / segments;
  var zCoord = 0;
  var v = -length/2
  
  for (var j = 0; j < length + 1; j++) {
    //Reset angle for each face of the length
    angle = 0;
    for (var i = 0; i < segments ;i++) {
      vertices.push(radius*Math.cos(glm.deg2rad(angle))); //X
      vertices.push(radius*Math.sin(glm.deg2rad(angle))); //Y
      vertices.push(zCoord); //Z
      
      normals.push(Math.cos(glm.deg2rad(angle))); //X
      normals.push(Math.sin(glm.deg2rad(angle))); //Y
      normals.push(zCoord); //Z
      
      var u = 1 - (i / segments);
      var w = 1 - (j / length);
      textureCoordData.push(u);
      textureCoordData.push(w);
      //Update angle
      angle = angle + alpha;
    }
    
    //Updating z coordinate
    zCoord = zCoord + (1 / length);
  }
  
  
  var lengthInc;
  j = 0;
  i = 0;
  
  for (j = 0; j < length; j++) {
    
    lengthInc = j * segments;
    
    for (i = 0; i < segments; i++) {
      
      if (i != segments - 1) {
        indices.push(i + lengthInc);
        indices.push(i + lengthInc + segments);
        indices.push(i + lengthInc + segments + 1);
        
        indices.push(i + lengthInc + segments + 1);
        indices.push(i + lengthInc + 1);
        indices.push(i + lengthInc);
      }
      else {
        indices.push(i + lengthInc);
        indices.push(i + lengthInc + segments);
        indices.push(lengthInc + segments);
        
        indices.push(lengthInc + segments);
        indices.push(lengthInc);
        indices.push(i + lengthInc);
      }
    }
  }
  
  return {
    position: vertices,
    normal: normals,
    texture: textureCoordData,
    index: indices
  };
  
}

class TransparentMaterialSGNode extends MaterialSGNode{
  
  constructor(children) {
    super(children);
    this.alpha = 1;
  }
  
  render(context) {
    if (this.alpha != 1){
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.enable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST);
    }
    gl.uniform1f(gl.getUniformLocation(context.shader, this.uniform+'.alpha'), this.alpha);
    super.render(context);
  }
}

class RainSGNode extends SGNode {
  
  constructor(particleCount, area, children) {
    super(children);
    this.area = area;
    this.particleCount = particleCount;
    this.rainSpeed = 0.1;
    this.generateRainDrops();
  }
  
  generateRainDrops(){
    for(var i = 0; i <= this.particleCount; i++){
      var rainSphere = new TransparentMaterialSGNode(new RenderSGNode(makeSphere(0.1, 10, 10)));
      rainSphere.ambient = [0.4, 0.5, 0.4, 0.5];
      rainSphere.alpha = 0.1;
      var rainDrop = new TransformationSGNode(glm.translate(this.getRandomInt(this.area, -this.area), this.getRandomInt(10, -2), this.getRandomInt(this.area, -this.area)), [rainSphere]);
      this.append(rainDrop);
    }
  }
  
  render(context) {
    var self = this;
    this.children.forEach(function (c) {
      var x = c.matrix[12];
      var y = c.matrix[13];
      var z = c.matrix[14];
      
      //make "new" raindrop. Basically reuse the object and just start from another random location
      if (y < -2){
        x = self.getRandomInt(self.area, -self.area);
        y = 10;
        z = self.getRandomInt(self.area, -self.area);
      }
      y -= self.rainSpeed;
      
      c.matrix = glm.translate(x, y, z);
    });
    
    super.render(context);
  }
  
  getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }
}
