//#############################################################################
// SNIPPET 1: create shader and buffer

//in WebGL/OpenGL3 we have to create and use our own shaders for the programmable pipeline
//create the shader program
shaderProgram = createProgram(gl, resources.vs, resources.fs);

//create a buffer and put a single clipspace rectangle in it (2 triangles)
buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//we need typed arrays
const arr = new Float32Array([
  -1.0, -1.0,
  1.0, -1.0,
  -1.0, 1.0,
  -1.0, 1.0,
  1.0, -1.0,
  1.0, 1.0]);
//copy data to GPU
gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);

//#############################################################################
// SNIPPET 2: active shader and use buffer

//activate shader program that you have initialized before
gl.useProgram(shaderProgram);

//we look up the internal location after compilation of the shader program given the name of the attribute
const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');

//enable this vertex attribute
gl.enableVertexAttribArray(positionLocation);
//use the currently bound buffer for this location
//each element is a FLOAT with 2 components
//2 .. number of components
//float ... type
//false ... the array should not be normalized
//stride / offset ... in case you are interleaving different attribute
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// draw the bound data as 6 vertices = 2 triangles starting at index 0
gl.drawArrays(gl.TRIANGLES, 0, 6);

//#############################################################################
// SNIPPET 3: set uniform

//we use a uniform to specify the rectangle color
//a uniform is like a parameter to a shader (vertex or fragment).
//however, the same value is used for all instances
var userColor = { r: 0.6, g: 0.2, b: 0.8};
gl.uniform3f(gl.getUniformLocation(shaderProgram, 'u_usercolor'),
              userColor.r, userColor.g, userColor.b);

//#############################################################################
// SNIPPET 4: define color buffer

//same for the color
colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
const colors = new Float32Array([
  1, 0, 0, 1,
  0, 1, 0, 1,
  0, 0, 1, 1,
  0, 0, 1, 1,
  0, 1, 0, 1,
  0, 0, 0, 1]);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

//#############################################################################
// SNIPPET 5: use color buffer

const colorLocation = gl.getAttribLocation(shaderProgram, 'a_color');
gl.enableVertexAttribArray(colorLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
