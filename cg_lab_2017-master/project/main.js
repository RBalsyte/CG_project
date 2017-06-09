/**
* @requires: camera.js
*/
'use strict';

const floorSize = 20;
const floorCount = 20;
const fenceHeight = 1;
const fenceCount = 10;

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

//scene graph nodes
var root = null;
var camera;
var rotateSpirit;
var rotateLight;
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
  concretetexture: 'models/concrete.jpg',
  tree_model_01: 'models/tree01.obj',
  oldtexture: 'models/paint.jpg',
  housefloortexture: 'models/tatami.jpg',
  housewalltexture: 'models/houseWall.jpg',
  mosstexture: 'models/moss.jpg',
  housebody: 'models/houseBody.obj',
  houseroof: 'models/houseRoof.obj',
  noface: 'models/noFace.obj'
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
}

function createSceneGraph(gl, resources) {
  //create scenegraph
  const root = new ShaderSGNode(createProgram(gl, resources.vs_texture, resources.fs_texture));

  //light debug helper function
  function createLightSphere() {
    return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
      new RenderSGNode(makeSphere(.4, 10, 10))
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

  function makeRectangle(width, height, textureRepeatCountHorizontally, textureRepeatCountVertically) {
  var rectangle = makeRect(width, height);
  //adapt texture coordinates
  rectangle.texture = [0, 0, textureRepeatCountHorizontally, 0, textureRepeatCountHorizontally, textureRepeatCountVertically, 0, textureRepeatCountVertically];
  return rectangle;
}

  {
    camera = new Camera(root, gl.canvas, movementSpeed, mouseSpeed);
  }

  {
    //initialize light
    let light = new LightSGNode(); //use now framework implementation of light node
    light.ambient = [0.2, 0.2, 0.2, 1];
    light.diffuse = [0.8, 0.8, 0.8, 1];
    light.specular = [0, 0, 0, 1];
    light.position = [0, 2, 10];

    rotateLight = new TransformationSGNode(mat4.create());
    let translateLight = new TransformationSGNode(glm.translate(2,10,10));

    rotateLight.append(translateLight);
    translateLight.append(light);
    translateLight.append(createLightSphere());
    root.append(rotateLight);
  }

  {
    let floor = new MaterialSGNode(new TextureSGNode(floorTexture, 0, new RenderSGNode(makeFloor())));
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.1, 0.1, 0.1, 1];
    floor.specular = [1, 1, 1, 1];
    floor.shininess = 1000;

    root.append(new TransformationSGNode(glm.transform({ translate: [0, floorOffset, 0], rotateX: -90, scale: 1}), [floor]));
  }

  {
    let fence = new MaterialSGNode(new TextureSGNode(fenceTexture, 0, new RenderSGNode(makeFence()), oldTexture, 1));
    fence.ambient = [0.2, 0.2, 0.2, 1.0];
    fence.diffuse = [0.8, 0.8, 0.8, 1.0];
    fence.specular = [0, 0, 0, 1];
    fence.emission = [0, 0, 0, 1];
    fence.shininess = 0.0;

    root.append(new TransformationSGNode(glm.transform({ translate: [0, fenceHeight + floorOffset, floorSize], rotateY: 180, scale: 1}), [Object.create(fence)]));
    root.append(new TransformationSGNode(glm.transform({ translate: [0, fenceHeight + floorOffset, -floorSize],  scale: 1}), [Object.create(fence)]));
    root.append(new TransformationSGNode(glm.transform({ translate: [floorSize, fenceHeight + floorOffset, 0], rotateY: -90, scale: 1}), [Object.create(fence)]));
    root.append(new TransformationSGNode(glm.transform({ translate: [-floorSize, fenceHeight + floorOffset, 0], rotateY: 90, scale: 1}), [fence]));
  }

  {
  let houseBody = new MaterialSGNode(new TextureSGNode(houseWallTexture, 0, new RenderSGNode(resources.housebody), mossTexture, 1));
  houseBody.ambient = [0.3, 0.3, 0.2, 1];
  houseBody.diffuse = [0.1, 0.1, 0.1, 1];
  houseBody.specular = [0, 0, 0, 1];
  houseBody.emission = [0, 0, 0, 1];
  houseBody.shininess = 0.0;
  root.append(new TransformationSGNode(glm.transform({ translate: [0, floorOffset-1, 0]}), [houseBody]));
}

{
  let houseRoof = new MaterialSGNode([new RenderSGNode(resources.houseroof)]);
  houseRoof.ambient = [0.3, 0.3, 0.2, 1];
  houseRoof.diffuse = [0.1, 0.1, 0.1, 1];
  houseRoof.specular = [0, 0, 0, 1];
  houseRoof.emission = [0, 0, 0, 1];
  houseRoof.shininess = 0.0;
  root.append(new TransformationSGNode(glm.transform({ translate: [0, floorOffset-1, 0]}), [houseRoof]));
}

{
  let houseFloor = new MaterialSGNode(new TextureSGNode(houseFloorTexture, 0, new RenderSGNode(makeRectangle(15, 10, 20, 20))));
  houseFloor.ambient = [0, 0, 0, 1];
  houseFloor.diffuse = [0.1, 0.1, 0.1, 1];
  houseFloor.specular = [1, 1, 1, 1];
  houseFloor.shininess = 10;
  root.append(new TransformationSGNode(glm.transform({ translate: [0, floorOffset + 0.05, 0], rotateX: -90, scale: 1}), [houseFloor]));
}

  {
   let cylinderMaterial = new MaterialSGNode(new TextureSGNode(concreteTexture, 0, new RenderSGNode(createCylinder(15, 1, 0.5))));
    root.append(new TransformationSGNode(glm.transform({
      translate: [-3, floorOffset, 0],
      rotateX: -90,
      scale: [0.5,0.5,6]
    }), [
      cylinderMaterial
    ]));
  }

  {
    moveSpiritNode = new TransformationSGNode(mat4.create());
    moveSpiritHandNode = new TransformationSGNode(mat4.create());

    var spiritTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(10, floorOffset + 0.6, 0));
    let spiritTransformationNode = new TransformationSGNode(spiritTransformationMatrix);
    moveSpiritNode.append(spiritTransformationNode);

    // add Body node as a sphere by creating a Sphere
    let spiritBodyNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(makeSphere(.2, 10, 10)));
    spiritTransformationNode.append(spiritBodyNode);

    //transformation of left leg
    var leftLegTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateX(90));
    leftLegTransformationMatrix = mat4.multiply(mat4.create(), leftLegTransformationMatrix, glm.translate(-0.1, 0, 0));
    leftLegTransformationMatrix = mat4.multiply(mat4.create(), leftLegTransformationMatrix, glm.scale(0.06,0.1,0.6));
    var leftLegTransformationNode = new TransformationSGNode(leftLegTransformationMatrix);
    //spiritTransformationNode.append(leftLegTransformationNode);

    //left leg
    let leftLegNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(createCylinder(15, 1,0.2)));
    leftLegTransformationNode.append(leftLegNode);
    spiritTransformationNode.append(leftLegTransformationNode);

    //transformation of right leg
    var rightLegTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateX(90));
    rightLegTransformationMatrix = mat4.multiply(mat4.create(), rightLegTransformationMatrix, glm.translate(0.1, 0, 0));
    rightLegTransformationMatrix = mat4.multiply(mat4.create(), rightLegTransformationMatrix, glm.scale(0.06,0.1,0.6));
    var rightLegTransformationNode = new TransformationSGNode(rightLegTransformationMatrix);

    //right Leg
    let rightLegNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(createCylinder(15, 1,0.2)));
    rightLegTransformationNode.append(rightLegNode);
    spiritTransformationNode.append(rightLegTransformationNode);

    // Add hand movement animation node
    spiritTransformationNode.append(moveSpiritHandNode);
    // transformation of left upper arm
    var leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateX(90));
    leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(), leftUpperArmTransformationMatrix, glm.translate(0.16, 0, 0));
    leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(), leftUpperArmTransformationMatrix, glm.scale(0.06,0.1,0.4));
    var leftUpperArmTransformationNode = new TransformationSGNode(leftUpperArmTransformationMatrix);

    // left upper arm
    let leftUpperArmNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(createCylinder(15, 1,0.2)));
    leftUpperArmTransformationNode.append(leftUpperArmNode);
    moveSpiritHandNode.append(leftUpperArmTransformationNode);

    // transformation of right upper arm
    var rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateX(90));
    rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(), rightUpperArmTransformationMatrix, glm.translate(-0.16, 0, 0));
    rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(), rightUpperArmTransformationMatrix, glm.scale(0.06,0.1,0.4));
    var rightUpperArmTransformationNode = new TransformationSGNode(rightUpperArmTransformationMatrix);

    // right upper arm
    let rightUpperArmNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
    new RenderSGNode(createCylinder(15, 1,0.2)));
    rightUpperArmTransformationNode.append(rightUpperArmNode);
    moveSpiritHandNode.append(rightUpperArmTransformationNode);
    // transformation of right lower arm

    spiritTransformationNode.append(moveSpiritHandNode);
    root.append(moveSpiritNode);
  }

  {
    noFaceNode = new MaterialSGNode([new RenderSGNode(resources.noface)]);
    noFaceNode.ambient = [0, 0, 0, 1];
    noFaceNode.diffuse = [0.1, 0.1, 0.1, 1];
    noFaceNode.specular = [0, 0, 0, 1];
    noFaceNode.emission = [0, 0, 0, 1];
    noFaceNode.shininess = 0.0;
    root.append(new TransformationSGNode(glm.translate(0, floorOffset + 2, 0), [noFaceNode]));
  }

  {
    //initialize Tree
    let tree = new MaterialSGNode([ //use now framework implementation of material node
      new RenderSGNode(resources.tree_model_01)
    ]);
    //gold
    tree.ambient = [0.24725, 0.3995, 0.745, 1];
    tree.diffuse = [0.75164, 0.60648, 0.22648, 1];
    tree.specular = [0.228281, 0.655802, 0.766065, 1];
    tree.shininess = 0.7;

    root.append(new TransformationSGNode(glm.transform({
      translate: [5, floorOffset, 8],
      rotateX: 2,
      scale: 0.2
    }), [
      tree
    ]));
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


function makeFloor() {
  var floor = makeRect(floorSize, floorSize);
  //adapt texture coordinates
  floor.texture = [0, 0, floorCount, 0, floorCount, floorCount, 0, floorCount];
  return floor;
}

function makeFence() {
  var fence = makeRect(floorSize, 1);
  fence.texture = [0, 0, 1, 0, 1, 1, 0, 1];
  return fence;
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
  rotateLight.matrix = glm.rotateY(timeInMilliseconds * 0.05);

   moveSpiritHandNode.matrix = glm.rotateX(Math.cos(timeInMilliseconds / 2 * 0.01) * 15);
  moveSpiritX=Math.abs((timeInMilliseconds*0.005)%(maxMoveSpiritX+0.0001) -maxMoveSpiritX/2) + maxMoveSpiritX/2;
  moveSpiritNode.matrix = glm.translate(moveSpiritX - 28, Math.abs(Math.cos(timeInMilliseconds/2*0.01)), -10);

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
