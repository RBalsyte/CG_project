/**
 * Created by Clemens Birklbauer on 22.02.2016.
 */
'use strict';

var floorSize = 20;
var floorCount = 20;
var movementSpeed = 0.3;
var animatedAngle = 0;

var gl = null;

const camera = {
  position: {
    x: 0,
    y: 0,
    z: 0
  },
  rotation: 0
};

//scene graph nodes
var root = null;
var rootnofloor = null;
var rotateSpirit;
var rotateLight;
var rotateNode;

// Spirit movement variables
//
var maxMoveSpiritX = 32;
var moveSpiritX = 0;
var moveSpiritNode;
var moveSpiritHandNode;

//textures
var renderTargetColorTexture;
var renderTargetDepthTexture;
var floorTexture;
var fenceTexture;
var concreteTexture;

//framebuffer variables
var renderTargetFramebuffer;
var framebufferWidth = 512;
var framebufferHeight = 512;

// Camera variables
var cameraPos = vec3.fromValues(0, 1, -10);
var cameraLookAt = vec3.fromValues(0, 0, 0);
var cameraDirection = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), cameraPos, cameraLookAt));
var upVector = vec3.fromValues(0, 1, 0);
var cameraFront = vec3.fromValues(0, -1, 10);

var cameraRight = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), upVector, cameraDirection));
var cameraUp = vec3.cross(vec3.create(), cameraDirection, cameraRight);

var pitch = -1;
var yaw = 90;


//load the required resources using a utility function
loadResources({
  vs: 'shader/texture.vs.glsl',
  fs: 'shader/texture.fs.glsl',
  vs_single: 'shader/single.vs.glsl',
  fs_single: 'shader/single.fs.glsl',
  vs_wall: 'shader/wallTexture.vs.glsl',
  fs_wall: 'shader/wallTexture.fs.glsl',
  vs_spirit: 'shader/spirit.vs.glsl',
  fs_spirit: 'shader/spirit.fs.glsl',
  floortexture: 'models/grass.jpg',
  fencetexture: 'models/fence.jpg',
  concretetexture: 'models/concrete.jpg',
  model: 'models/C-3PO.obj',
  tree_model_01: 'models/tree01.obj'
}).then(function(resources /*an object containing our keys with the loaded resources*/ ) {
  init(resources);

  render(0);
});

function init(resources) {
  //create a GL context
  gl = createContext();

  //init textures
  initTextures(resources);
  initRenderToTexture();

  gl.enable(gl.DEPTH_TEST);

  //create scenegraph
  root = createSceneGraph(gl, resources);

  //create scenegraph without floor and simple shader
  rootnofloor = new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single));
  rootnofloor.append(rotateNode); //reuse model part

  initInteraction(gl.canvas);
}

function createSceneGraph(gl, resources) {
  //create scenegraph
  const root = new ShaderSGNode(createProgram(gl, resources.vs, resources.fs));

  //light debug helper function
  function createLightSphere() {
    return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
      new RenderSGNode(makeSphere(.2, 10, 10))
    ]);
  }

  function createWalls() {
    return new ShaderSGNode(createProgram(gl, resources.vs_wall, resources.fs_wall), [
      new RenderSGNode(makeRect(5, 20))
    ]);
  }

  function createCylinder(segments, length) {
    return new ShaderSGNode(createProgram(gl, resources.vs_texture, resources.fs_texture), [
      new RenderSGNode(makeCylinder2(segments, length))
    ]);
  }

  // Create Spirit - can be made into a function
  {
    moveSpiritNode = new TransformationSGNode(mat4.create());
    moveSpiritHandNode = new TransformationSGNode(mat4.create());

    //var spiritTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(animatedAngle/2));
    var spiritTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(10, -0.6, 0));
    let spiritTransformationNode = new TransformationSGNode(spiritTransformationMatrix);
    moveSpiritNode.append(spiritTransformationNode);

    // add Body node as a sphere by creating a Sphere
    let spiritBodyNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
      new RenderSGNode(makeSphere(.2, 10, 10)));
    spiritTransformationNode.append(spiritBodyNode);

    //transformation of left leg
    var leftLegTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(-0.1, -0.3, 0));
    leftLegTransformationMatrix = mat4.multiply(mat4.create(), leftLegTransformationMatrix, glm.scale(0.2, 1, 1));
    var leftLegTransformationNode = new TransformationSGNode(leftLegTransformationMatrix);
    //spiritTransformationNode.append(leftLegTransformationNode);

    //left leg
    let leftLegNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
      new RenderSGNode(makeRect(0.05, 0.3)));
    leftLegTransformationNode.append(leftLegNode);
    spiritTransformationNode.append(leftLegTransformationNode);

    //transformation of right leg
    var rightLegTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0.13, -0.3, 0));
    rightLegTransformationMatrix = mat4.multiply(mat4.create(), rightLegTransformationMatrix, glm.scale(0.2, 1, 1));
    var rightLegTransformationNode = new TransformationSGNode(rightLegTransformationMatrix);
    //spiritTransformationNode.append(rightLegTransformationNode);

    //right Leg
    let rightLegNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
      new RenderSGNode(makeRect(0.05, 0.3)));
    rightLegTransformationNode.append(rightLegNode);
    spiritTransformationNode.append(rightLegTransformationNode);

    spiritTransformationNode.append(moveSpiritHandNode);
    // transformation of left upper arm
    var leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(glm.deg2rad(120)));
    leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(), leftUpperArmTransformationMatrix, glm.translate(-0.16, -0.2, 0));
    leftUpperArmTransformationMatrix = mat4.multiply(mat4.create(), leftUpperArmTransformationMatrix, glm.scale(0.2, 1, 1));
    var leftUpperArmTransformationNode = new TransformationSGNode(leftUpperArmTransformationMatrix);

    // left upper arm
    let leftUpperArmNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
      new RenderSGNode(makeRect(0.05, 0.2)));
    leftUpperArmTransformationNode.append(leftUpperArmNode);
    moveSpiritHandNode.append(leftUpperArmTransformationNode);

    // transformation of right upper arm
    var rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(glm.deg2rad(45)));
    rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(), rightUpperArmTransformationMatrix, glm.translate(0.18, -0.2, 0));
    rightUpperArmTransformationMatrix = mat4.multiply(mat4.create(), rightUpperArmTransformationMatrix, glm.scale(0.2, 1, 1));
    var rightUpperArmTransformationNode = new TransformationSGNode(rightUpperArmTransformationMatrix);

    // right upper arm
    let rightUpperArmNode = new ShaderSGNode(createProgram(gl, resources.vs_spirit, resources.fs_spirit),
      new RenderSGNode(makeRect(0.05, 0.2)));
    rightUpperArmTransformationNode.append(rightUpperArmNode);
    moveSpiritHandNode.append(rightUpperArmTransformationNode);
    // transformation of right lower arm

    spiritTransformationNode.append(moveSpiritHandNode);
    root.append(moveSpiritNode);
  }

  {
    //initialize light
    let light = new LightSGNode(); //use now framework implementation of light node
    light.ambient = [0.2, 0.2, 0.2, 1];
    light.diffuse = [0.8, 0.8, 0.8, 1];
    light.specular = [1, 1, 1, 1];
    light.position = [0, 0, 0];

    rotateLight = new TransformationSGNode(mat4.create());
    let translateLight = new TransformationSGNode(glm.translate(0, 2, 2)); //translating the light is the same as setting the light position

    rotateLight.append(translateLight);
    translateLight.append(light);
    translateLight.append(createLightSphere()); //add sphere for debugging: since we use 0,0,0 as our light position the sphere is at the same position as the light source
    root.append(rotateLight);
  }

  {
    //initialize C3PO
    let c3po = new MaterialSGNode([ //use now framework implementation of material node
      new RenderSGNode(resources.model)
    ]);
    //gold
    c3po.ambient = [0.24725, 0.1995, 0.0745, 1];
    c3po.diffuse = [0.75164, 0.60648, 0.22648, 1];
    c3po.specular = [0.628281, 0.555802, 0.366065, 1];
    c3po.shininess = 0.4;

    rotateNode = new TransformationSGNode(mat4.create(), [
      new TransformationSGNode(glm.translate(0, -1.5, 0), [
        c3po
      ])
    ]);
    root.append(rotateNode);
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
      translate: [5, -1, 8],
      rotateX: 2,
      scale: 0.2
    }), [
      tree
    ]));
  }

  {
    //initialize floor

    let floor = new MaterialSGNode(new TextureSGNode(floorTexture, 2, new RenderSGNode(makeFloor())));
    floor.ambient = [0, 0, 0, 1];
    floor.diffuse = [0.1, 0.1, 0.1, 1];
    floor.specular = [1, 1, 1, 1];
    floor.shininess = 10.0;

    // translate mid value moves up and down objects from the floor
    // rotate, rotates the floor
    // scale in(de)creases the size of the objects relative to the floor
    root.append(new TransformationSGNode(glm.transform({
      translate: [0, -1.52, 0],
      rotateX: -90,
      scale: 1
    }), [
      floor
    ]));
  }

  {
    let fenceMaterial = new MaterialSGNode(new TextureSGNode(fenceTexture, 2, new RenderSGNode(makeFence())));
    fenceMaterial.ambient = [0, 0, 0, 1];
    fenceMaterial.diffuse = [0.1, 0.1, 0.1, 1];
    fenceMaterial.specular = [1, 1, 1, 1];
    fenceMaterial.shininess = 10.0;

    let fence = new ShaderSGNode(createProgram(gl, resources.vs_wall, resources.fs_wall), [fenceMaterial]);
    root.append(new TransformationSGNode(glm.transform({
      translate: [0, -1.52, floorSize],
      scale: 1
    }), [
      fence
    ]));
    root.append(new TransformationSGNode(glm.transform({
      translate: [0, -1.52, -floorSize],
      scale: 1
    }), [
      fence
    ]));
    root.append(new TransformationSGNode(glm.transform({
      translate: [floorSize, -1.52, 0],
      rotateY: 90,
      scale: 1
    }), [
      fence
    ]));
    root.append(new TransformationSGNode(glm.transform({
      translate: [-floorSize, -1.52, 0],
      rotateY: -90,
      scale: 1
    }), [
      fence
    ]));
  }

  {
    let cylinderMaterial = new MaterialSGNode(new TextureSGNode(concreteTexture, 2, new RenderSGNode(makeCylinder2(15,0.07))));
    //let cylinderNode = createCylinder(15, 0.07);
    root.append(new TransformationSGNode(glm.transform({
      translate: [-3, 0, 0],
      rotateX: -90,
      scale: 0.3
    }), [
      cylinderMaterial
    ]));
  }

  return root;
}


function initTextures(resources){
  floorTexture = gl.createTexture();
  initTexture(floorTexture, resources.floortexture);

  fenceTexture = gl.createTexture();
  initTexture(fenceTexture, resources.fencetexture);

  concreteTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, concreteTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resources.concretetexture);
  gl.bindTexture(gl.TEXTURE_2D, null);
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
  //check if depth texture extension is supported
  var depthTextureExt = gl.getExtension("WEBGL_depth_texture");
  if (!depthTextureExt) {
    alert('No depth texture support!!!');
    return;
  }

  //general setup
  gl.activeTexture(gl.TEXTURE0);

  //create framebuffer
  renderTargetFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderTargetFramebuffer);

  //TASK 5: Setup color and depth texture and bind them to the framebuffer
  //create color texture
  renderTargetColorTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderTargetColorTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, //texture unit target == texture type
    0, //level of detail level (default 0)
    gl.RGBA, //internal format of the data in memory
    framebufferWidth, //texture width (required if no image given)
    framebufferHeight, //texture height (required if no image given)
    0, //border (enable or disable setting a border color for clamping, required if no image given)
    gl.RGBA, //image format (should match internal format)
    gl.UNSIGNED_BYTE, //image data type
    null); //actual image data

  //create depth texture
  renderTargetDepthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderTargetDepthTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, framebufferWidth, framebufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

  //attach textures to framebuffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTargetColorTexture, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, renderTargetDepthTexture, 0);

  //check if framebuffer was created successfully
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
    alert('Framebuffer incomplete!');
  }

  //clean up
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

function renderToTexture(timeInMilliseconds) {
  //bind framebuffer to draw scene into texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderTargetFramebuffer);

  //setup viewport
  gl.viewport(0, 0, framebufferWidth, framebufferHeight);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //setup context and camera matrices
  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), framebufferWidth / framebufferHeight, 0.01, 100);
  context.viewMatrix = mat4.lookAt(mat4.create(), [0, 1, -10], [0, 0, 0], [0, 1, 0]);

  //EXTRA TASK: animate texture coordinates
  context.timeInMilliseconds = timeInMilliseconds;

  //render scenegraph
  rootnofloor.render(context);

  //disable framebuffer (to render to screen again)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function render(timeInMilliseconds) {
  checkForWindowResize(gl);

  //render different scene to texture
  renderToTexture(timeInMilliseconds);

  //setup viewport
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //setup context and camera matrices
  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);
  //very primitive camera implementation

  //update animations
  context.timeInMilliseconds = timeInMilliseconds;

  rotateNode.matrix = glm.rotateY(timeInMilliseconds * -0.01);
  rotateLight.matrix = glm.rotateY(timeInMilliseconds * 0.05);

  // Spirit animations
  moveSpiritHandNode.matrix = glm.rotateZ(Math.cos(timeInMilliseconds / 2 * 0.01) * 15);

  moveSpiritX = Math.abs((timeInMilliseconds * 0.005) % (maxMoveSpiritX + 0.0001) - maxMoveSpiritX / 2) + maxMoveSpiritX / 2;
  moveSpiritNode.matrix = glm.translate(moveSpiritX - 28, Math.abs(Math.cos(timeInMilliseconds / 2 * 0.01)) - 0.4, -10);

  // Camera updates
  let position = vec3.scale(
    vec3.create(), cameraPos, -1);
  let lookAtMatrix2 = mat4.lookAt(mat4.create(), cameraPos, vec3.add(vec3.create(), cameraPos, cameraFront), cameraUp);
  let lookAtMatrix = mat4.lookAt(mat4.create(), position, [0, 0, 0], [0, 1, 0]);
  context.viewMatrix = lookAtMatrix2;

  //render scenegraph
  root.render(context);

  //animate
  requestAnimationFrame(render);

  animatedAngle = timeInMilliseconds / 10;
}

//a scene graph node for setting texture parameters
class TextureSGNode extends SGNode {
  constructor(texture, textureunit, children) {
    super(children);
    this.texture = texture;
    this.textureunit = textureunit;
  }

  render(context) {
    //tell shader to use our texture
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture'), 1);

    //set additional shader parameters
    //TASK 1: set texture unit
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_tex'), this.textureunit);
    //EXTRA TASK: animate texture coordinates
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_wobbleTime'), context.timeInMilliseconds / 1000.0);

    //activate/select texture unit and bind texture
    //TASK 1: activate/select texture unit and bind texture
    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    //render children
    super.render(context);

    //clean up
    //TASK 1: activate/select texture unit and bind null as texture
    gl.activeTexture(gl.TEXTURE0 + this.textureunit); //set active texture unit since it might have changed in children render functions
    gl.bindTexture(gl.TEXTURE_2D, null);

    //disable texturing in shader
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture'), 0);
  }
}

//camera control
function initInteraction(canvas) {
  const mouse = {
    pos: {
      x: 0,
      y: 0
    },
    leftButtonDown: false
  };

  function toPos(event) {
    //convert to local coordinates
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  canvas.addEventListener('mousedown', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = event.button === 0;
  });

  canvas.addEventListener('mousemove', function(event) {
    const pos = toPos(event);
    const delta = {
      x: mouse.pos.x - pos.x,
      y: pos.y - mouse.pos.y
    };
    if (mouse.leftButtonDown) {
      //add the relative movement of the mouse to the rotation variables
      var sensitivity = 0.05;
      delta.x = delta.x * sensitivity;
      delta.y = delta.y * sensitivity;

      yaw += delta.x;
      pitch += delta.y;

      if (pitch > 89.0)
        pitch = 89.0;
      if (pitch < -89.0)
        pitch = -89.0;

      let front = vec3.create();
      front[0] = Math.cos(glm.deg2rad(yaw)) * Math.cos(glm.deg2rad(pitch));
      front[1] = Math.sin(glm.deg2rad(pitch));
      front[2] = Math.sin(glm.deg2rad(yaw)) * Math.cos(glm.deg2rad(pitch));
      cameraFront = vec3.normalize(vec3.create(), front);
    }
    mouse.pos = pos;
  });
  canvas.addEventListener('mouseup', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = false;
  });
  //register globally
  document.addEventListener('keypress', function(event) {
    //https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    if (event.code === 'KeyR') {
      camera.position.x = 0;
      camera.position.y = 0;
    }
    if (event.code == 'KeyW') {
      cameraPos = vec3.add(vec3.create(), cameraPos, vec3.multiply(vec3.create(), vec3.fromValues(movementSpeed, movementSpeed, movementSpeed), cameraFront));
    }
    if (event.code == 'KeyS') {
      cameraPos = vec3.sub(vec3.create(), cameraPos, vec3.multiply(vec3.create(), vec3.fromValues(movementSpeed, movementSpeed, movementSpeed), cameraFront));
    }
    if (event.code == 'KeyD') {
      cameraPos = vec3.add(vec3.create(), cameraPos, vec3.multiply(vec3.create(), vec3.normalize(vec3.create(), vec3.cross(vec3.create(), cameraFront, cameraUp)), vec3.fromValues(movementSpeed, movementSpeed, movementSpeed)));
    }
    if (event.code == 'KeyA') {
      cameraPos = vec3.sub(vec3.create(), cameraPos, vec3.multiply(vec3.create(), vec3.normalize(vec3.create(), vec3.cross(vec3.create(), cameraFront, cameraUp)), vec3.fromValues(movementSpeed, movementSpeed, movementSpeed)));
    }
  });
}

// https://stackoverflow.com/questions/29802400/cylinder-partially-visible-webgl
function makeCylinder2(segments, length) {
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
      vertices.push(Math.cos(glm.deg2rad(angle))); //X
      vertices.push(Math.sin(glm.deg2rad(angle))); //Y
      vertices.push(zCoord); //Z

      normals.push(Math.cos(glm.deg2rad(angle))); //X
      normals.push(Math.sin(glm.deg2rad(angle))); //Y
      normals.push(zCoord); //Z

      textureCoordData.push(alpha / 2*Math.PI);
      textureCoordData.push((v + length/2)/length);

      //Update texture coordinates
      v = v + 1;

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
