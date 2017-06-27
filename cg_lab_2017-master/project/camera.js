
function Camera(scene, canvas, speed, mouseSpeed, nofaceNode) {
  this.scene = scene;
  this.canvas = canvas;
  this.speed = speed;
  this.mouseSpeed = mouseSpeed;
  this.movie = true;
  this.nofaceNode = nofaceNode;
  this.timer = 0;
  this.alpha = 1;

  this.previousTime = 0;
  this.PI_2 = Math.PI / 2;

  this.reset();

  var self = this;

  // Mouse movement function
  var onMouseMove = function (event) {
    if (!self.movie){
      var rect = self.canvas.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;

      self.horizontalAngle += self.mouseSpeed * (self.canvas.clientWidth/2 - x);
      self.verticalAngle += self.mouseSpeed * (self.canvas.clientHeight/2 - y);
    }
  };

  var onKeyUp = function(event){
    self.pressedKeys[event.code] = false;
  }

  var onKeyDown = function(event){
    self.pressedKeys[event.code] = true;
  }

  var onMouseWheel = function(event){
    if (!self.movie){
      self.mouseWheelDelta += event.wheelDelta ? event.wheelDelta : -event.detail;
    }
  }

// Add even listeners
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
  document.addEventListener('mousewheel', onMouseWheel, false);
  document.addEventListener("DOMMouseScroll", onMouseWheel, false);

// remove event listeners
  this.dispose = function() {
    document.removeEventListener( 'mousemove', onMouseMove, false);
    document.removeEventListener( 'keydown', onKeyDown, false);
    document.removeEventListener( 'keyup', onKeyUp, false);
    document.removeEventListener( 'mousewheel', onMouseWheel, false);
  };
}

// Reset current variables for replaying the movie again
Camera.prototype.reset = function () {
  this.pressedKeys = {};

  this.position = vec3.create(0, 0, 5);
  this.direction = vec3.create();
  this.look = vec3.create(0, 0, 0);
  this.up = vec3.create();

  this.horizontalAngle = Math.PI;
  this.verticalAngle = 0;
  this.mouseWheelDelta = 0;
  this.timer = 0;
  this.alpha = 1;
}


// Play movie by timing the events using the deltaValue (difference between this time and the previous one)
Camera.prototype.autoMove = function(timeInMilliseconds, deltaTime) {
  this.timer += deltaTime;
  // 3 seconds
  if (this.timer < 3*1000){
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, deltaTime * this.speed); // move forward
    this.verticalAngle -= this.mouseSpeed * 5; // adjust vertical angle, so the camera doesnt look upwards
    displayText("Multitextured Fence");
  }
  // 1 second
  else if (this.timer < 4*1000){
    this.verticalAngle += this.mouseSpeed * 5;
    //pause to observe multitextured fence
  }
  // 2 seonds
  else if (this.timer < 6*1000){
    clearText();
    this.horizontalAngle += this.mouseSpeed * 200; // rotate to the left
  }
  // 2 seconds
  else if (this.timer < 9*1000){
    displayText("Playful Spirits");
    // Observe Spirits
  }
  // 2 seconds
  else if (this.timer < 10*1000){
      clearText();
      this.horizontalAngle += this.mouseSpeed * 100; // rotate to the left
      mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, deltaTime * this.speed); // move forward towards cylinder
  }
  // 3 seconds
  else if (this.timer < 13*1000){
    displayText("Multiple Vertex Cylinder");
    //pause to observe cylinder
  }
  // 1 second
  else if (this.timer < 14*1000){
    this.verticalAngle += this.mouseSpeed * 65; // start looking upwards
  }
  // 3 seconds
  else if (this.timer < 16*1000){
      this.verticalAngle -= this.mouseSpeed * 30; // start looking downwards
  }
  // 2 seonds
  else if (this.timer < 17*1000){
     clearText();
    this.horizontalAngle += this.mouseSpeed * 300; // rotate to the left
  }
  else if (this.timer < 18*1000){
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, deltaTime * (this.speed*1.8)); // move forward
  }
  // 1 seond
  else if (this.timer < 19*1000){
      this.horizontalAngle -= this.mouseSpeed * 235; // rotate to the right
      this.verticalAngle += this.mouseSpeed * 20; // an a bit up
  }
  // 2 seconds
  else if (this.timer < 20*1000){
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, deltaTime * this.speed*2.3); // move forward
    this.horizontalAngle -= this.mouseSpeed * 20; // a bit to the right
  }
  // 3 second
  else if (this.timer < 25*1000){
    displayText("House and Noface fading");
    this.nofaceNode.matrix[14] = this.nofaceNode.matrix[14] + deltaTime*this.speed*0.5; // move no face along z axis
    this.alpha -= 0.01; // and make it transparent
    // pause to observe the inside of the hosue
  }
  // 1 second
  else if (this.timer < 26*1000){
    clearText();
    this.verticalAngle += this.mouseSpeed * 4; // start looking upwards
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, deltaTime * this.speed*0.2); // move forward
  }
  else if (this.timer < 27*1000){
    this.horizontalAngle += this.mouseSpeed * 190; // rotate to the left
  }

  else if (this.timer < 30*1000){
    displayText("Rain outside");
    // observe rain outside
  }
  else {
    clearText();
    this.movie = false;
  }
}

Camera.prototype.move = function (timeInMilliseconds) {

  var deltaTime = timeInMilliseconds - this.previousTime;
  this.previousTime = timeInMilliseconds;

  // if movie is playing then call the automove function
  if (this.movie){
    this.autoMove(timeInMilliseconds, deltaTime);
  }

// direction calculated from Spherical coordinates
  this.direction = vec3.fromValues(
    Math.cos(this.verticalAngle) * Math.sin(this.horizontalAngle),
    Math.sin(this.verticalAngle),
    Math.cos(this.verticalAngle) * Math.cos(this.horizontalAngle)
  );

  var right = vec3.fromValues(
    Math.sin(this.horizontalAngle - this.PI_2),
    0,
    Math.cos(this.horizontalAngle - this.PI_2)
  );


// Movement explained in the documentation
  if (this.mouseWheelDelta != 0){
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, this.mouseWheelDelta);
    this.mouseWheelDelta = 0;
  }
  if (!this.movie && this.pressedKeys['KeyW']) {
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, deltaTime * this.speed);
  }
  if (!this.movie && this.pressedKeys['KeyS']) {
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, -deltaTime * this.speed);
  }
  if (!this.movie && this.pressedKeys['KeyA']) {
    mat3.multiplyScalarAndAdd(this.position, this.position, right, -deltaTime * this.speed);
  }
  if (!this.movie && this.pressedKeys['KeyD']) {
    mat3.multiplyScalarAndAdd(this.position, this.position, right, deltaTime * this.speed);
  }
  // press M to stop the movie
  if (this.pressedKeys['KeyM']){
    this.movie = false;
    clearText();
  }

  // press U to start the movie
  if (this.pressedKeys['KeyU']){
    // set back the noFace to where is initially was
    this.nofaceNode.matrix = glm.transform({translate: [10, 0, 8], scale: [1.5, 1.5, 1.5]});
    this.reset();
    this.movie = true;
  }

  // reset everything on R
  if (!this.movie && this.pressedKeys['KeyR']){
    this.reset();
  }

 // update matrices for movement
  this.look = mat3.add(vec3.create(), this.position, this.direction);
  this.up = vec3.cross(vec3.create(), right, this.direction);
}
