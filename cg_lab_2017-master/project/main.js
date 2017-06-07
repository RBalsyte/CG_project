/**
* @requires: camera.js
*/
'use strict';

const floorSize = 20;
const floorCount = 20;
const fenceHeight = 3;
const fenceCount = 10;

const movementSpeed = 0.005;
const mouseSpeed = 0.00002;

const maxMoveSpiritX = 32;

var gl = null;

//default
var width = 600;
var height = 600;

var animatedAngle = 0;
var moveSpiritX = 0;
var moveSpiritDown = true;

//scene graph nodes
var root = null;
var rootnofloor = null;
var camera;
var rotateSpirit;
var rotateLight;
var rotateNode;
var moveSpiritNode;
var moveSpiritHandNode;

//textures
var renderTargetColorTexture;
var renderTargetDepthTexture;
var floorTexture;
var fenceTexture;
var oldTexture;

//framebuffer variables
var renderTargetFramebuffer;

//load the required resources using a utility function
loadResources({
  vs_single: 'shader/single.vs.glsl',
  fs_single: 'shader/single.fs.glsl',
  vs_texture: 'shader/texture.vs.glsl',
  fs_texture: 'shader/texture.fs.glsl',
  vs_spirit: 'shader/spirit.vs.glsl',
  fs_spirit: 'shader/spirit.fs.glsl',
  floortexture: 'models/grass.jpg',
  fencetexture: 'models/fence.jpg',
  oldtexture: 'models/paint.jpg'
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
  //create scenegraph without floor and simple shader
  rootnofloor = new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single));
  rootnofloor.append(rotateNode); //reuse model part
}

function createSceneGraph(gl, resources) {
  //create scenegraph
  const root = new ShaderSGNode(createProgram(gl, resources.vs_texture, resources.fs_texture));
  
  //light debug helper function
  function createLightSphere() {
    return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
      new RenderSGNode(makeSphere(.2,10,10))
    ]);
  }
  
  function makeFloor() {
    var floor = makeRect(floorSize, floorSize);
    //adapt texture coordinates
    floor.texture = [0, 0, floorCount, 0, floorCount, floorCount, 0, floorCount];
    return floor;
  }
  
  function makeFence(){
    var fence = makeRect(floorSize, fenceHeight);
    fence.texture = [0, 0, fenceCount, 0, fenceCount, 1, 0, 1];
    return fence;
  }
  
  {
    camera = new Camera(root, gl.canvas, movementSpeed, mouseSpeed);
  }
  
  {
    let floor = new MaterialSGNode(new TextureSGNode(floorTexture, 0, new RenderSGNode(makeFloor())));
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.1, 0.1, 0.1, 1];
    floor.specular = [1, 1, 1, 1];
    floor.shininess = 10;
    
    root.append(new TransformationSGNode(glm.transform({ translate: [0,-1.52,0], rotateX: -90, scale: 1}), [floor]));
  }
  
  {
    let fence = new MaterialSGNode(new TextureSGNode(fenceTexture, 0, new RenderSGNode(makeFence()), oldTexture, 1));
    fence.ambient = [0.2, 0.2, 0.2, 1.0];
    fence.diffuse = [0.8, 0.8, 0.8, 1.0];
    fence.specular = [0, 0, 0, 1];
    fence.emission = [0, 0, 0, 1];
    fence.shininess = 0.0;
    
    root.append(new TransformationSGNode(glm.transform({ translate: [0,-1.52, floorSize], scale: 1}), [fence]));
    root.append(new TransformationSGNode(glm.transform({ translate: [0, -1.52, -floorSize], scale: 1}), [fence]));
    root.append(new TransformationSGNode(glm.transform({ translate: [floorSize, -1.52, 0], rotateY: 90, scale: 1}), [fence]));
    root.append(new TransformationSGNode(glm.transform({ translate: [-floorSize, -1.52, 0], rotateY: -90, scale: 1}), [fence]));
  }
  
  {
    let light = new LightSGNode();
    light.ambient = [0.2, 0.2, 0.2, 1];
    light.diffuse = [0.8, 0.8, 0.8, 1];
    light.specular = [1, 1, 1, 1];
    light.position = [0, 0, 0];
    
    rotateLight = new TransformationSGNode(mat4.create());
    let translateLight = new TransformationSGNode(glm.translate(0,2,2));
    
    rotateLight.append(translateLight);
    translateLight.append(light);
    translateLight.append(createLightSphere());
    root.append(rotateLight);
  }
  
  {
    moveSpiritNode = new TransformationSGNode(mat4.create());
    moveSpiritHandNode = new TransformationSGNode(mat4.create());
    
    //var spiritTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(animatedAngle/2));
    var spiritTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(10,-0.6, 0));
    let spiritTransformationNode = new TransformationSGNode(spiritTransformationMatrix);
    moveSpiritNode.append(spiritTransformationNode);
    
    // add Body node as a sphere by creating a Sphere
    let spiritBodyNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(makeSphere(.2,10,10)));
    spiritTransformationNode.append(spiritBodyNode);
    
    //transformation of left leg
    var leftLegTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(-0.1,-0.3,0));
    leftLegTransformationMatrix = mat4.multiply(mat4.create(), leftLegTransformationMatrix, glm.scale(0.2,1,1));
    var leftLegTransformationNode = new TransformationSGNode(leftLegTransformationMatrix);
    //spiritTransformationNode.append(leftLegTransformationNode);
    
    //left leg
    let leftLegNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(makeRect(0.05,0.3)));
    leftLegTransformationNode.append(leftLegNode);
    spiritTransformationNode.append(leftLegTransformationNode);
    
    //transformation of right leg
    var rightLegTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0.13,-0.3,0));
    rightLegTransformationMatrix = mat4.multiply(mat4.create(), rightLegTransformationMatrix, glm.scale(0.2,1,1));
    var rightLegTransformationNode = new TransformationSGNode(rightLegTransformationMatrix);
    //spiritTransformationNode.append(rightLegTransformationNode);
    
    //right Leg
    let rightLegNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(makeRect(0.05,0.3)));
    rightLegTransformationNode.append(rightLegNode);
    spiritTransformationNode.append(rightLegTransformationNode);
    
    spiritTransformationNode.append(moveSpiritHandNode);
    // transformation of left upper arm
    var leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(glm.deg2rad(120)));
    leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(),leftUpperArmTransformationMatrix , glm.translate(-0.16,-0.2,0));
    leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(), leftUpperArmTransformationMatrix, glm.scale(0.2,1,1));
    var leftUpperArmTransformationNode = new TransformationSGNode(leftUpperArmTransformationMatrix);
    
    // left upper arm
    let leftUpperArmNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(makeRect(0.05,0.2)));
    leftUpperArmTransformationNode.append(leftUpperArmNode);
    moveSpiritHandNode.append(leftUpperArmTransformationNode);
    
    // transformation of right upper arm
    var rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(glm.deg2rad(45)));
    rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(),rightUpperArmTransformationMatrix , glm.translate(0.18,-0.2,0));
    rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(), rightUpperArmTransformationMatrix, glm.scale(0.2,1,1));
    var rightUpperArmTransformationNode = new TransformationSGNode(rightUpperArmTransformationMatrix);
    
    // right upper arm
    let rightUpperArmNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(makeRect(0.05,0.2)));
    rightUpperArmTransformationNode.append(rightUpperArmNode);
    moveSpiritHandNode.append(rightUpperArmTransformationNode);
    // transformation of right lower arm
    
    spiritTransformationNode.append(moveSpiritHandNode);
    root.append(moveSpiritNode);
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
  gl.activeTexture(gl.TEXTURE0);
  renderTargetFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderTargetFramebuffer);
  renderTargetColorTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderTargetColorTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
  renderTargetDepthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderTargetDepthTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
  
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTargetColorTexture, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, renderTargetDepthTexture, 0);
  
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!=gl.FRAMEBUFFER_COMPLETE)
  {alert('Framebuffer incomplete!');}
  
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderToTexture(timeInMilliseconds){
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderTargetFramebuffer);
  gl.viewport(0, 0, width, height);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const context = createSGContext(gl);
  mat4.lookAt(context.viewMatrix, [0,1,-10], [0,0,0], [0,1,0]);
  context.timeInMilliseconds = timeInMilliseconds;
  
  rootnofloor.render(context);
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render(timeInMilliseconds) {
  checkForWindowResize(gl);
  renderToTexture(timeInMilliseconds);
  
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.435, 0.506, 0.635, 1.0); // sky blue color as background
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  const context = createSGContext(gl);
  context.timeInMilliseconds = timeInMilliseconds;
  
  camera.move(timeInMilliseconds);
  rotateNode.matrix = glm.rotateY(timeInMilliseconds * -0.01);
  rotateLight.matrix = glm.rotateY(timeInMilliseconds * 0.05);
  moveSpiritX=Math.abs((timeInMilliseconds*0.005)%(maxMoveSpiritX+0.0001) -maxMoveSpiritX/2) + maxMoveSpiritX/2;
  moveSpiritNode.matrix = glm.translate(moveSpiritX - 28, Math.abs(Math.cos(timeInMilliseconds/2*0.01))-0.4, -10);
  
  mat4.perspective(context.projectionMatrix, glm.deg2rad(30), width / height, 0.01, 100);
  mat4.lookAt(context.viewMatrix, camera.position, camera.look, camera.up);
  context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);
  
  root.render(context);
  requestAnimationFrame(render);
  animatedAngle = timeInMilliseconds/10;
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
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableMultitexturing'), 0);
  }
}

//TODO what is this used for?
class CubeRenderNode extends SGNode {
  
  render(context) {
    
    //setting the model view and projection matrix on shader
    //setUpModelViewMatrix(context.sceneMatrix, context.viewMatrix);
    
    var positionLocation = gl.getAttribLocation(context.shader, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false,0,0) ;
    gl.enableVertexAttribArray(positionLocation);
    
    var colorLocation = gl.getAttribLocation(context.shader, 'a_color');
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false,0,0) ;
    gl.enableVertexAttribArray(colorLocation);
    
    //set alpha value for blending
    //TASK 1-3
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_alpha'), 0.5);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0); //LINE_STRIP
    
    //render children
    super.render(context);
  }
}
