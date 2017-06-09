/**
*
* http://www.opengl-tutorial.org/beginners-tutorials/tutorial-6-keyboard-and-mouse/
*/
function Camera(scene, canvas, speed, mouseSpeed) {
  this.scene = scene;
  this.canvas = canvas;
  this.speed = speed;
  this.mouseSpeed = mouseSpeed;
  
  this.previousTime = 0;
  this.PI_2 = Math.PI / 2;
  
  this.reset();
  
  var self = this;
  var onMouseMove = function (event) {
    var rect = self.canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    
    self.horizontalAngle += self.mouseSpeed * (self.canvas.clientWidth/2 - x);
    self.verticalAngle += self.mouseSpeed * (self.canvas.clientHeight/2 - y);
  };
  
  var onKeyUp = function(event){
    self.pressedKeys[event.code] = false;
  }
  
  var onKeyDown = function(event){
    self.pressedKeys[event.code] = true;
  }
  
  var onMouseWheel = function(event){
    self.mouseWheelDelta += event.wheelDelta ? event.wheelDelta : -event.detail;
  }
  
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
  document.addEventListener('mousewheel', onMouseWheel, false);
  document.addEventListener("DOMMouseScroll", onMouseWheel, false);
  
  this.dispose = function() {
    document.removeEventListener( 'mousemove', onMouseMove, false);
    document.removeEventListener( 'keydown', onKeyDown, false);
    document.removeEventListener( 'keyup', onKeyUp, false);
    document.removeEventListener( 'mousewheel', onMouseWheel, false);
  };
}

Camera.prototype.move = function (timeInMilliseconds) {
  
  var deltaTime = timeInMilliseconds - this.previousTime;
  this.previousTime = timeInMilliseconds;
  
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
  
  if (this.mouseWheelDelta != 0){
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, this.mouseWheelDelta);
    this.mouseWheelDelta = 0;
  }
  if (this.pressedKeys['KeyW']) {
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, deltaTime * this.speed);
  }
  if (this.pressedKeys['KeyS']) {
    mat3.multiplyScalarAndAdd(this.position, this.position, this.direction, -deltaTime * this.speed);
  }
  if (this.pressedKeys['KeyA']) {
    mat3.multiplyScalarAndAdd(this.position, this.position, right, -deltaTime * this.speed);
  }
  if (this.pressedKeys['KeyD']) {
    mat3.multiplyScalarAndAdd(this.position, this.position, right, deltaTime * this.speed);
  }
  if (this.pressedKeys['KeyR']){
    this.reset();
  }
  
  this.look = mat3.add(vec3.create(), this.position, this.direction);
  this.up = vec3.cross(vec3.create(), right, this.direction);
}

Camera.prototype.reset = function () {
  this.pressedKeys = {};
  
  this.position = vec3.create(0, 0, 5);
  this.direction = vec3.create();
  this.look = vec3.create(0, 0, 0);
  this.up = vec3.create();
  
  this.horizontalAngle = Math.PI;
  this.verticalAngle = 0;
  this.mouseWheelDelta = 0;
}
