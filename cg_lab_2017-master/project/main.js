/**
* @requires: camera.js
*
*https://free3d.com/3d-model/old-chair-51635.html
*/
'use strict';

const floorSize = 20;
const floorCount = 20;
const fenceHeight = 1;
const fenceCount = 10;
const windowSize = 1;
const windowHeight = 1.3;
const windowCount = 5;
const floorOffset = -2;
const movementSpeed = 0.005;
const mouseSpeed = 0.0001;
const lampSwingMaxAngle = 15;

var gl = null;

//default
var width = 600;
var height = 600;

var lampSwingSpeed = 0.02;
var lampAngle = 0;
var camera;

//scene graph nodes
var root = null;
var rootnofloor = null;
var shadowNode;
var shadowNode2;
var spirits;
var sunNode;
var sun;
var nofaceNode;
var spotlightNode;
var translateSpotlight;
var lamp;
var lampNode;
var lampStringNode;
var noface;
var mask;

//textures
var renderTargetColorTexture;
var renderTargetDepthTexture;
var floorTexture;
var fenceTexture;
var concreteTexture;
var oldTexture;
var crackTexture;
var dirtTexture;
var houseFloorTexture;
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
  cracktexture: 'models/crack.jpg',
  dirttexture: 'models/circle.png',
  housefloortexture: 'models/tatami.jpg',
  housebody: 'models/houseBody.obj',
  houseroof: 'models/houseRoof.obj',
  noface: 'models/noFace.obj',
  nofacemask: 'models/mask.obj',
  chair: 'models/chair.obj',
  table: 'models/table.obj'
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
  camera = new Camera(root, gl.canvas, movementSpeed, mouseSpeed, nofaceNode);
}

function createSceneGraph(gl, resources) {
  //create scenegraph root
  const root = new ShaderSGNode(createProgram(gl, resources.vs_shadow, resources.fs_shadow));

  //create Light Sphere for vizualization
  function createLightSphere() {
    return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
      new RenderSGNode(makeSphere(0.2, 10, 10))
    ]);
  }

 // helper function to create floor, fence, etc.
  function makeRectangle(width, height, textureRepeatCountHorizontally, textureRepeatCountVertically) {
    var rectangle = makeRect(width, height);
    //adapt texture coordinates
    rectangle.texture = [0, 0, textureRepeatCountHorizontally, 0, textureRepeatCountHorizontally, textureRepeatCountVertically, 0, textureRepeatCountVertically];
    return rectangle;
  }

  {
    //add node for setting shadow parameters
    shadowNode = new ShadowSGNode(renderTargetDepthTexture, 3, width, height);
    root.append(shadowNode);

    shadowNode2 = new ShadowSGNode(renderTargetDepthTexture, 3, width, height);
    root.append(shadowNode2);
  }

  {
    //create scenegraph without floor and shadow shader
    rootnofloor = new ShaderSGNode(createProgram(gl, resources.vs_shadow, resources.fs_shadow));
  }

  {
    //initialize sun above the house
    sun = new LightSGNode();
    sun.ambient = [0.1, 0.1, 0.1, 1];
    sun.diffuse = [1, 1, 1, 1];
    sun.specular = [1, 1, 0, 1];
    sun.position = [15, 20, 5];

    sunNode = new TransformationSGNode(glm.transform({ translate: [15, 20, 5]}));
    sunNode.append(sun);
    sunNode.append(createLightSphere());

    shadowNode.append(sunNode);
  }

  {
    lamp = new SpiritlightSGNode();
    lamp.ambient = [0.1, 0.1, 0.1, 1];
    lamp.diffuse = [1, 1, 1, 1];
    lamp.specular = [1, 0, 0, 1];
    lamp.position = [8, 1, 9];
    lamp.uniform = 'u_lamp';

    lampNode = new TransformationSGNode(glm.transform({translate: [8, 1, 9]}), [createLightSphere()]);
    lampNode.append(lamp);
    shadowNode2.append(lampNode);

    lampStringNode = new TransformationSGNode(glm.transform({translate: [8, 4, 9], rotateZ:90, rotateX: 90}), [new RenderSGNode(createCylinder(15, 1, 0.01))]);
    shadowNode2.append(lampStringNode);

  }


  {
    //initialize light
    spotlightNode = new SpiritlightSGNode(); //use now framework implementation of light node
    spotlightNode.ambient = [0, 0, 0, 0];
    spotlightNode.diffuse = [1, 0, 1, 1];
    spotlightNode.specular = [1, 0, 0, 1];
    spotlightNode.position = [-3, 4, 0];
    spotlightNode.uniform = 'u_spotlight';
    spotlightNode.direction = [-1,-1,0];
    spotlightNode.angle = 30.0;

    translateSpotlight = new TransformationSGNode(glm.transform({ translate: [-3, 4, 0]}));

    translateSpotlight.append(spotlightNode);
    translateSpotlight.append(createLightSphere());
    shadowNode.append(translateSpotlight);
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
    let rain = new RainSGNode(300, floorSize);
    shadowNode.append(rain);
  }

  {
    let houseRoof = new TransparentMaterialSGNode([new RenderSGNode(resources.houseroof)]);
    houseRoof.ambient = [0, 0, 0, 1];
    houseRoof.diffuse = [0.1, 0.1, 0.1, 1];
    houseRoof.specular = [0.5, 0.5, 0.5, 1];
    houseRoof.shininess = 1000.0;

    let houseRoofNode = new TransformationSGNode(glm.transform({translate: [8, floorOffset, 9], scale: [0.5,0.5,1]}), [houseRoof]);
    shadowNode.append(houseRoofNode);
    rootnofloor.append(houseRoofNode);
  }

  {
    let window1 = new TransparentMaterialSGNode(new TextureSGNode(windowTexture, 0, new RenderSGNode(makeRectangle(1, 1.4, 1, 1))));
    window1.ambient = [0, 0, 0, 1];
    window1.diffuse = [0.1, 0.1, 0.1, 1];
    window1.specular = [1, 1, 1, 1];
    window1.shininess = 10;
    window1.alpha = 0.5;

    let windowNode = new TransformationSGNode(glm.transform({ translate: [5.5, 0.9, 18.8], rotateZ:-90}), [window1]);
    shadowNode.append(windowNode);
    rootnofloor.append(windowNode);
  }

  {
    let window2 = new TransparentMaterialSGNode(new WindowSGNode(2.2, 0.91, 0.39));
    window2.ambient = [0, 0, 0, 1];
    window2.diffuse = [0.1, 0.1, 0.1, 1];
    window2.specular = [1, 1, 1, 1];
    window2.shininess = 10;

    let windowNode2 = new TransformationSGNode(glm.transform({ translate: [12.0, 0.8, 4.3], rotateY: -90, scale: 1}), [window2]);
    shadowNode.append(windowNode2);
    rootnofloor.append(windowNode2);
  }

  {
    let houseBody = new TransparentMaterialSGNode([new RenderSGNode(resources.housebody)]);
    houseBody.ambient = [0.9, 0, 0, 0.5];
    houseBody.diffuse = [0.9, 0, 0, 0.5];
    houseBody.specular = [0.5, 0.5, 0.5, 1];
    houseBody.shininess = 1000;

    let houseBodyNode = new TransformationSGNode(glm.transform({translate: [8, floorOffset, 9], rotateY: 180, scale: [0.5,0.5,1]}), [houseBody]);
    shadowNode.append(houseBodyNode);
    rootnofloor.append(houseBodyNode);
  }

  {
    let houseFloor = new TransparentMaterialSGNode(new TextureSGNode(houseFloorTexture, 0, new RenderSGNode(makeRectangle(10, 10, 10, 10)), dirtTexture, 1, crackTexture, 2));
    houseFloor.ambient = [0, 0, 0, 1];
    houseFloor.diffuse = [0.1, 0.1, 0.1, 1];
    houseFloor.specular = [0.5, 0.5, 0.5, 1];
    houseFloor.shininess = 50.0;

    let houseFloorNode = new TransformationSGNode(glm.transform({translate: [8, floorOffset + 0.05, 9], rotateX: -90, scale: [0.5,1,1]}), [houseFloor]);
    shadowNode.append(houseFloorNode);
  }

  {
    let chair = new TransparentMaterialSGNode([new RenderSGNode(resources.chair)]);
    chair.ambient = [0.5, 0.2, 0.1, 1];
    chair.diffuse = [0.1, 0.1, 0.1, 1];
    chair.specular = [1, 1, 1, 1];
    chair.shininess = 10;

    let chairNode1 = new TransformationSGNode(glm.transform({ translate: [5.5, floorOffset + 1.2, 12], rotateY:90, scale: 0.1}), [chair]);
    shadowNode.append(chairNode1);
    rootnofloor.append(chairNode1);

    let chairNode2 = new TransformationSGNode(glm.transform({ translate: [9.5, floorOffset + 1.2, 12], rotateY:-90, scale: 0.1}), [Object.create(chair)]);
    shadowNode.append(chairNode2);
    rootnofloor.append(chairNode2);
  }

  {
    let table = new TransparentMaterialSGNode([new RenderSGNode(resources.table)]);
    table.ambient = [0.5, 0.2, 0.1, 1];
    table.diffuse = [0.1, 0.1, 0.1, 1];
    table.specular = [1, 1, 1, 1];
    table.shininess = 10;

    let tableNode = new TransformationSGNode(glm.transform({ translate: [7.5, floorOffset + 0.2, 12], rotateY:90, scale: 0.05}), [table]);
    shadowNode.append(tableNode);
    rootnofloor.append(tableNode);
  }

  {
    spirits = new SpiritsSGNode(10);
    shadowNode.append(spirits);
    rootnofloor.append(spirits);
  }

  {
    let cylinderMaterial = new TransparentMaterialSGNode(new TextureSGNode(concreteTexture, 0, new RenderSGNode(createCylinder(15, 1, 0.5))));
    let cylinderNode = new TransformationSGNode(glm.transform({translate: [-3, floorOffset, 0], rotateX: -90, scale: [0.5, 0.5, 6]}), [cylinderMaterial]);
    shadowNode.append(cylinderNode);
    rootnofloor.append(cylinderNode);
  }

  {
    noface = new TransparentMaterialSGNode([new RenderSGNode(resources.noface)]);
    noface.ambient = [0, 0, 0, 1];
    noface.diffuse = [0.1, 0.1, 0.1, 1];
    noface.specular = [0, 0, 0, 1];
    noface.emission = [0, 0, 0, 1];
    noface.shininess = 0.0;

    let nofaceBodyNode = new TransformationSGNode(glm.transform({translate: [0, floorOffset + 2.5, 0], rotateY: 90, rotateZ : 125, scale: [1.5, 1.5, 1.5]}), [noface]);

    mask = new TransparentMaterialSGNode([new RenderSGNode(resources.nofacemask)]);
    mask.ambient = [1, 1, 1, 1];
    mask.diffuse = [0, 0, 0, 1];
    mask.specular = [0, 0, 0, 1];
    mask.emission = [0, 0, 0, 1];
    mask.shininess = 0;
    let maskNode = new TransformationSGNode(glm.transform({translate: [0, floorOffset + 2.7, 0.25], scale: [0.2, 0.2, 0.2]}), [mask]);

    nofaceNode = new TransformationSGNode(glm.transform({translate: [10, 0, 8]}), [nofaceBodyNode, maskNode]);
    shadowNode.append(nofaceNode);
    rootnofloor.append(nofaceNode);
  }

  {
    let tree = new TransparentMaterialSGNode([new RenderSGNode(resources.tree_model_01)]);
    tree.ambient = [0.24725, 0.3995, 0.745, 1];
    tree.diffuse = [0.75164, 0.60648, 0.22648, 1];
    tree.specular = [0.228281, 0.655802, 0.766065, 1];
    tree.shininess = 0.7;

    let treeNode = new TransformationSGNode(glm.transform({translate: [-10, floorOffset, -3], scale: 0.2}), [tree]);
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

  dirtTexture = gl.createTexture();
  initTexture(dirtTexture, resources.dirttexture);

  crackTexture = gl.createTexture();
  initTexture(crackTexture, resources.cracktexture);

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
  context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(90), width / height, 30, 600);
  //compute the light's position in world space
  let lightModelMatrix = sunNode.matrix;
  let lightPositionVector = vec4.fromValues(sun.position[0], sun.position[1], sun.position[2], 1);
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

  rootnofloor.render(context);
  //disable framebuffer (render to screen again)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render(timeInMilliseconds) {

  checkForWindowResize(gl);

  //update animations
  spirits.moveSpirits(timeInMilliseconds);

  if (lampAngle > lampSwingMaxAngle || lampAngle < -lampSwingMaxAngle){
    lampSwingSpeed *= -1;
  }
  lampAngle += 50*lampSwingSpeed;
  mat4.rotateX(lampStringNode.matrix, lampStringNode.matrix, lampSwingSpeed);
  lampNode.matrix = glm.translate(Math.sin(lampAngle*0.03 + 0.70) + 7.4, 2.9, 9);
  noface.alpha = camera.alpha;
  mask.alpha = camera.alpha;

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
  constructor(texture1, textureunit1, children, texture2, textureunit2, texture3, textureunit3) {
    super(children);
    this.texture1 = texture1;
    this.texture2 = texture2;
    this.texture3 = texture3;
    this.textureunit1 = textureunit1;
    this.textureunit2 = textureunit2;
    this.textureunit3 = textureunit3;
  }

  render(context) {
    if (this.texture1 !== undefined){
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture1'), 1);
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_tex1'), this.textureunit1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture1);
    }

    if (this.texture2 !== undefined){
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture2'), 1);
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_tex2'), this.textureunit2);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.texture2);
    }

    if (this.texture3 !== undefined){
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture3'), 1);
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_tex3'), this.textureunit3);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.texture3);
    }
    super.render(context);

    if (this.texture1 !== undefined){
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture1'), 0);
    }

    if (this.texture2 !== undefined){
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture2'), 0);
    }

    if (this.texture3 !== undefined){
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture3'), 0);
    }
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

class WindowSGNode extends SGNode{

  constructor(windowWidth, windowHeight, frameThickness, children) {
    super(children);
    this.windowWidth = windowWidth;
    this.windowHeight = windowHeight;
    this.frameThickness = frameThickness;
    this.windowObject = this.makeWindow(this.windowWidth, this.windowHeight, this.frameThickness);

    this.indexBuffer = null;
    this.positionBuffer = null;
    this.textCoordBuffer = null;
    this.normalBuffer = null;
    this.colorBuffer = null;
  }

  initBuffers(gl){
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.windowObject.position), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.windowObject.index), gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.windowObject.texture), gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.windowObject.normal), gl.STATIC_DRAW);

    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.windowObject.color), gl.STATIC_DRAW);
  }

  setTransformationUniforms(context) {
    //set matrix uniforms
    const modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    const normalMatrix = mat3.normalFromMat4(mat3.create(), modelViewMatrix);
    const projectionMatrix = context.projectionMatrix;

    gl.uniformMatrix4fv(gl.getUniformLocation(context.shader, 'u_modelView'), false, modelViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(context.shader, 'u_normalMatrix'), false, normalMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(context.shader, 'u_projection'), false, projectionMatrix);
  }

  setAttributes(context){
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    var positionLoc = gl.getAttribLocation(context.shader, 'a_position');
    if (isValidAttributeLocation(positionLoc)){
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    var texCoordLoc = gl.getAttribLocation(context.shader, 'a_texCoord');
    if (isValidAttributeLocation(texCoordLoc)){
      gl.enableVertexAttribArray(texCoordLoc);
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    var normalLoc = gl.getAttribLocation(context.shader, 'a_normal');
    if (isValidAttributeLocation(normalLoc)){
      gl.enableVertexAttribArray(normalLoc);
      gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }
  }

  render(context) {
    this.setTransformationUniforms(context);

    if (this.positionBuffer === null) {
      this.initBuffers(context.gl);
    }

    this.setAttributes(context);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    var colorLoc = gl.getAttribLocation(context.shader, 'a_color');
    if (isValidAttributeLocation(colorLoc)){
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    }

    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableColorLookup'), 1);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    //render elements
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.windowObject.index.length, gl.UNSIGNED_SHORT, 0);

    if (isValidAttributeLocation(colorLoc)){
      gl.disableVertexAttribArray(colorLoc);
    }

    //render children
    super.render(context);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableColorLookup'), 0);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);

  }

  makeWindow(width, height, frameThickness) {
    width = width || 1;
    height = height || 1;
    frameThickness = frameThickness || 0.4;

    var position = [
      -width, -height, 0, width, -height, 0, width, -height + frameThickness, 0, -width, -height + frameThickness, 0, // upper frame
      -width, -height + frameThickness, 0, -width, height, 0, -width + frameThickness, height, 0, -width + frameThickness, -height + frameThickness, 0, // left frame
      width - frameThickness, -height + frameThickness, 0, width - frameThickness, height, 0, width, height, 0, width, -height + frameThickness, 0 ,// right frame
      -width + frameThickness, height - frameThickness, 0, width - frameThickness, height - frameThickness, 0, width - frameThickness, height, 0, -width + frameThickness, height, 0, // downer frame
      -width + frameThickness, -height + frameThickness, 0, width - frameThickness, -height + frameThickness, 0, width - frameThickness, height - frameThickness, 0, -width + frameThickness, height - frameThickness, 0 // glass
    ];

    var normal = [
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ];

    var texture = [
      0, 0 /**/, 1, 0 /**/, 1, 1 /**/, 0, 1,
      0, 0 /**/, 1, 0 /**/, 1, 1 /**/, 0, 1,
      0, 0 /**/, 1, 0 /**/, 1, 1 /**/, 0, 1,
      0, 0 /**/, 1, 0 /**/, 1, 1 /**/, 0, 1,
      0, 0 /**/, 1, 0 /**/, 1, 1 /**/, 0, 1
    ];

    var index = [
      0, 1, 2, 2, 3, 0,
      4, 5, 6, 6, 7, 4,
      8, 9, 10, 10, 11, 8,
      12, 13, 14, 14, 15, 12,
      16, 17, 18, 18, 19, 16
    ];

    var color = [
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black

      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black

      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black
      0.0,  0.0,  0.0,  1.0,    // black

      0.0,  0.0,  1.0,  0.25,    // blue
      0.0,  0.0,  1.0,  0.25,    // blue
      0.0,  0.0,  1.0,  0.25,    // blue
      0.0,  0.0,  1.0,  0.25     // blue
    ];

    return {
      position: position,
      normal: normal,
      texture: texture,
      index: index,
      color: color
    };
  }
}

class TransparentMaterialSGNode extends MaterialSGNode {

  constructor(children) {
    super(children);
    this.alpha = 1;
  }

  render(context) {

    if(this.alpha < 1){
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
    }

    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_alpha'), this.alpha);
    super.render(context);

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
  }
}

class RainSGNode extends SGNode {

  constructor(particleCount, area, children) {
    super(children);
    this.area = area;
    this.particleCount = particleCount;
    this.rainSpeed = 0.5;
    this.generateRainDrops();
  }

  generateRainDrops(){
    for(var i = 0; i <= this.particleCount; i++){
      var rainSphere = new MaterialSGNode(new RenderSGNode(makeSphere(0.02, 10, 10)));
      rainSphere.ambient = [0, 0, 0.7, 0.5];
      var rainDrop = new TransformationSGNode(glm.translate(getRandomInt(this.area, -this.area), getRandomInt(10, -2), getRandomInt(this.area, -this.area)), [rainSphere]);
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
      if (y < -2 + 0.1){
        x = getRandomInt(self.area, -self.area);
        y = 10;
        z = getRandomInt(self.area, -self.area);
      }
      y -= self.rainSpeed;

      c.matrix = glm.translate(x, y, z);
    });

    super.render(context);
  }
}

class SpiritsSGNode extends SGNode {

  constructor(spiritCount, children) {
    super(children);
    this.spiritCount = spiritCount;
    this.maxMoveSpiritX = 32;
    this.moveSpiritX = 0;
    this.spirits = [];
    this.spiritsPositions = [];
    this.generateSpirits();
  }

  generateSpirits(){

    for(var i = 0; i <= this.spiritCount; i++){

      var spirit = new TransformationSGNode(mat4.create());
      var moveSpiritHandNode = new TransformationSGNode(mat4.create());
      spirit.append(moveSpiritHandNode);

      // add Body node as a sphere by creating a Sphere
      let spiritBodyNode = new TransparentMaterialSGNode([new RenderSGNode(makeSphere(0.2, 10, 10))]);
      spiritBodyNode.ambient = [0, 0, 0, 1];
      spiritBodyNode.diffuse = [0, 0, 0, 1];
      spiritBodyNode.specular = [0.5, 0.5, 0.5, 1];
      spiritBodyNode.shininess = 100;
      spirit.append(spiritBodyNode);

      //left leg
      spirit.append(this.makeSpiritLimb(-0.1, 0, 0, 0.6));
      //right Leg
      spirit.append(this.makeSpiritLimb(0.1, 0, 0, 0.6));
      // left upper arm
      moveSpiritHandNode.append(this.makeSpiritLimb(0.16, 0, 0, 0.4));
      // right upper arm
      moveSpiritHandNode.append(this.makeSpiritLimb(-0.16, 0, 0, 0.4));

      this.spirits.push(spirit);
      this.spiritsPositions.push([getRandomInt(-10, -20), getRandomInt(10, 20), getRandomInt(0, 20), getRandomInt(0, 20), getRandomInt(-20, -10), getRandomInt(-20, -10)]);
    }
  }

  makeSpiritLimb(x, y, z, length){
    var limb = new RenderSGNode(createCylinder(15, 1, 0.2));
    return new TransformationSGNode(glm.transform({translate: [x, y, z], rotateX: 90, scale: [0.06, 0.1, length]}), [limb]);
  }

  moveSpirits(timeInMilliseconds){
    for (var i = 0; i < this.spirits.length; i++){
      this.spirits[i].children[0].matrix = glm.rotateZ(Math.cos(timeInMilliseconds / 2 * 0.01) * 25);

      var moveX = this.spiritsPositions[i][0];
      var moveZ = this.spiritsPositions[i][1];
      var maxMoveSpiritX = this.spiritsPositions[i][2];
      var maxMoveSpiritZ = this.spiritsPositions[i][3];
      var offsetX = this.spiritsPositions[i][4];
      var offsetZ = this.spiritsPositions[i][5];

      moveX = Math.abs((timeInMilliseconds*0.005) % (maxMoveSpiritX+0.001) - maxMoveSpiritX/2) + maxMoveSpiritX/2;
      moveZ = Math.abs((timeInMilliseconds*0.005) % (maxMoveSpiritZ+0.001) - maxMoveSpiritZ/2) + maxMoveSpiritZ/2;
      this.spirits[i].matrix = glm.translate(moveX + offsetX, Math.abs(Math.cos(timeInMilliseconds/2 * 0.01)) + -1.4, moveZ+ offsetZ);
      this.spiritsPositions[i][0] = moveX;
      this.spiritsPositions[i][1] = moveZ;
    }
  }

  render(context) {
    this.spirits.forEach(function (c) {
      c.render(context);
    });
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

class SpiritlightSGNode extends LightSGNode {

  constructor(position, direction, angle, children) {
    super(position, children);
    this.direction = direction || [0, 0, 0];
    this.angle = 90;

    this._worldDirection = null;
  }

  setLightDirection(context) {
    const gl = context.gl;
    if (!context.shader || !isValidUniformLocation(gl.getUniformLocation(context.shader, this.uniform+'Dir'))) {
      return;
    }
    const direction = this._worldDirection || this.direction;
    gl.uniform3f(gl.getUniformLocation(context.shader, this.uniform+'Dir'), direction[0], direction[1], direction[2]);
    if(!context.shader || !isValidUniformLocation(gl.getUniformLocation(context.shader, this.uniform+'Angle'))) {
      return;
    }

    gl.uniform1f(gl.getUniformLocation(context.shader, this.uniform+'Angle'), glm.deg2rad(this.angle));
  }

  computeLightDirection(context) {
    const modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    const odir = this.direction;
    const direction = vec4.transformMat4(vec4.create(), vec4.fromValues(odir[0], odir[1], odir[2], 1), modelViewMatrix);

    this._worldDirection = direction;
  }

  render(context) {
    this.setLightDirection(context);
    this.computeLightDirection(context);

    //render children
    super.render(context);
  }
}
