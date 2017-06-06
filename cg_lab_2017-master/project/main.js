/**
* Created by Clemens Birklbauer on 22.02.2016.
*/
'use strict';

var floorSize = 20;
var floorCount = 20;
var movementSpeed = 0.3;
var animatedAngle = 0;

var fenceHeight = 2;


var gl = null;

const camera = {
  position: {
    x:0,
    y:0,
    z:0
  },
  rotation:0
};

//scene graph nodes
var root = null;
var rootnofloor = null;
var rotateSpirit;
var rotateLight;
var rotateNode;

var maxMoveSpiritX = 32;
var moveSpiritX = 0;
var moveSpiritDown = true;
var moveSpiritNode;
var moveSpiritHandNode;

//textures
var renderTargetColorTexture;
var renderTargetDepthTexture;
var floorTexture;
var fenceTexture;

//framebuffer variables
var renderTargetFramebuffer;
var framebufferWidth = 512;
var framebufferHeight = 512;

// Camera variables
var cameraPos = vec3.fromValues(0,1,-10);
var cameraLookAt = vec3.fromValues(0,0,0);
var cameraDirection = vec3.normalize(vec3.create(),vec3.sub(vec3.create(),cameraPos, cameraLookAt));
var upVector = vec3.fromValues(0,1,0);
var cameraFront = vec3.fromValues(0,-1,10);

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
  model: 'models/C-3PO.obj'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
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
      new RenderSGNode(makeSphere(.2,10,10))
    ]);
  }

  function createWalls(){
    return new ShaderSGNode(createProgram(gl, resources.vs_wall, resources.fs_wall), [
      new RenderSGNode(makeRect(5,20))
    ]);
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

  {
    //initialize light
    let light = new LightSGNode(); //use now framework implementation of light node
    light.ambient = [0.2, 0.2, 0.2, 1];
    light.diffuse = [0.8, 0.8, 0.8, 1];
    light.specular = [1, 1, 1, 1];
    light.position = [0, 0, 0];

    rotateLight = new TransformationSGNode(mat4.create());
    let translateLight = new TransformationSGNode(glm.translate(0,2,2)); //translating the light is the same as setting the light position

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
      new TransformationSGNode(glm.translate(0,-1.5, 0),  [
        c3po
      ])
    ]);
    root.append(rotateNode);
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
      root.append(new TransformationSGNode(glm.transform({ translate: [0,-1.52,0], rotateX: -90, scale: 1}), [
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
      root.append(new TransformationSGNode(glm.transform({ translate: [0,-1.52, floorSize], scale: 1}), [
        fence
      ]));
      root.append(new TransformationSGNode(glm.transform({ translate: [0, -1.52, -floorSize], scale: 1}), [
        fence
      ]));
      root.append(new TransformationSGNode(glm.transform({ translate: [floorSize, -1.52, 0], rotateY: 90, scale: 1}), [
        fence
      ]));
      root.append(new TransformationSGNode(glm.transform({ translate: [-floorSize, -1.52, 0], rotateY: -90, scale: 1}), [
        fence
      ]));

    }

    return root;
  }


  function initTextures(resources)
  {
    //create texture object
    floorTexture = gl.createTexture();
    //select a texture unit
    gl.activeTexture(gl.TEXTURE0);
    //bind texture to active texture unit
    gl.bindTexture(gl.TEXTURE_2D, floorTexture);
    //set sampling parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //TASK 4: change texture sampling behaviour
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    //upload texture data
    gl.texImage2D(gl.TEXTURE_2D, //texture unit target == texture type
      0, //level of detail level (default 0)
      gl.RGBA, //internal format of the data in memory
      gl.RGBA, //image format (should match internal format)
      gl.UNSIGNED_BYTE, //image data type
      resources.floortexture); //actual image data
    //clean up/unbind texture
    gl.bindTexture(gl.TEXTURE_2D, null);

    //create texture object
    fenceTexture = gl.createTexture();
    //select a texture unit
    gl.activeTexture(gl.TEXTURE0);
    //bind texture to active texture unit
    gl.bindTexture(gl.TEXTURE_2D, fenceTexture);
    //set sampling parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //TASK 4: change texture sampling behaviour
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //upload texture data
    gl.texImage2D(gl.TEXTURE_2D, //texture unit target == texture type
      0, //level of detail level (default 0)
      gl.RGBA, //internal format of the data in memory
      gl.RGBA, //image format (should match internal format)
      gl.UNSIGNED_BYTE, //image data type
      resources.fencetexture); //actual image data
    //clean up/unbind texture
    gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function initRenderToTexture() {
      //check if depth texture extension is supported
      var depthTextureExt = gl.getExtension("WEBGL_depth_texture");
      if(!depthTextureExt) { alert('No depth texture support!!!'); return; }

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
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, renderTargetDepthTexture ,0);

        //check if framebuffer was created successfully
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!=gl.FRAMEBUFFER_COMPLETE)
        {alert('Framebuffer incomplete!');}

        //clean up
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      function makeFloor() {
        var floor = makeRect(floorSize, floorSize);
        //adapt texture coordinates
        floor.texture = [0, 0,  floorCount, 0,  floorCount, floorCount,  0, floorCount];
        return floor;
      }

      function makeFence(){
        var fence = makeRect(floorSize, fenceHeight);
        fence.texture = [0, 0,  1, 0,  1, 1,  0, 1];
        return fence;
      }

      function renderToTexture(timeInMilliseconds)
      {
        //TASK 5: Render C3PO to framebuffer/texture
        //bind framebuffer to draw scene into texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderTargetFramebuffer);

        //setup viewport
        gl.viewport(0, 0, framebufferWidth, framebufferHeight);
        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //setup context and camera matrices
        const context = createSGContext(gl);
        context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), framebufferWidth / framebufferHeight, 0.01, 100);
        context.viewMatrix = mat4.lookAt(mat4.create(), [0,1,-10], [0,0,0], [0,1,0]);

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

        //update animations
        context.timeInMilliseconds = timeInMilliseconds;

        rotateNode.matrix = glm.rotateY(timeInMilliseconds*-0.01);
        rotateLight.matrix = glm.rotateY(timeInMilliseconds*0.05);

        moveSpiritHandNode.matrix = glm.rotateZ(Math.cos(timeInMilliseconds/2*0.01)*15);
        
        moveSpiritX=Math.abs((timeInMilliseconds*0.005)%(maxMoveSpiritX+0.0001) -maxMoveSpiritX/2) + maxMoveSpiritX/2;
        moveSpiritNode.matrix = glm.translate(moveSpiritX - 28, Math.abs(Math.cos(timeInMilliseconds/2*0.01))-0.4, -10);

        let position = vec3.scale(
          vec3.create(), cameraPos,
          -1);
        let lookAtMatrix2 = mat4.lookAt(mat4.create(), cameraPos, vec3.add(vec3.create(),cameraPos, cameraFront), cameraUp);
        let lookAtMatrix = mat4.lookAt(mat4.create(), position, [0,0,0], [0,1,0]);
        context.viewMatrix = lookAtMatrix2;

        //render scenegraph
        root.render(context);

        //animate
        requestAnimationFrame(render);

          animatedAngle = timeInMilliseconds/10;
      }

      //a scene graph node for setting texture parameters
      class TextureSGNode extends SGNode {
        constructor(texture, textureunit, children ) {
          super(children);
          this.texture = texture;
          this.textureunit = textureunit;
        }

        render(context)
        {
          //tell shader to use our texture
          gl.uniform1i(gl.getUniformLocation(context.shader, 'u_enableObjectTexture'), 1);

          //set additional shader parameters
          //TASK 1: set texture unit
          gl.uniform1i(gl.getUniformLocation(context.shader, 'u_tex'), this.textureunit);
          //EXTRA TASK: animate texture coordinates
          gl.uniform1f(gl.getUniformLocation(context.shader, 'u_wobbleTime'), context.timeInMilliseconds/1000.0);

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
          pos: { x : 0, y : 0},
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
          const delta = { x : mouse.pos.x - pos.x, y: pos.y - mouse.pos.y };
          if (mouse.leftButtonDown) {
            //add the relative movement of the mouse to the rotation variables
             var sensitivity = 0.05;
             delta.x = delta.x*sensitivity;
             delta.y = delta.y*sensitivity;

             yaw   += delta.x;
             pitch += delta.y;

             if(pitch > 89.0)
                 pitch = 89.0;
             if(pitch < -89.0)
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
          if (event.code == 'KeyW'){
             cameraPos = vec3.add(vec3.create(), cameraPos, vec3.multiply(vec3.create(),vec3.fromValues(movementSpeed,movementSpeed,movementSpeed),cameraFront));
          }
          if (event.code == 'KeyS'){
            cameraPos = vec3.sub(vec3.create(), cameraPos, vec3.multiply(vec3.create(),vec3.fromValues(movementSpeed,movementSpeed,movementSpeed),cameraFront));
          }
          if (event.code == 'KeyD'){
            cameraPos = vec3.add(vec3.create(), cameraPos,vec3.multiply(vec3.create(), vec3.normalize(vec3.create(), vec3.cross(vec3.create(),cameraFront, cameraUp)), vec3.fromValues(movementSpeed,movementSpeed,movementSpeed)));
          }
          if (event.code == 'KeyA'){
            cameraPos = vec3.sub(vec3.create(), cameraPos,vec3.multiply(vec3.create(), vec3.normalize(vec3.create(), vec3.cross(vec3.create(),cameraFront, cameraUp)), vec3.fromValues(movementSpeed,movementSpeed,movementSpeed)));;
          }
        });
      }

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
