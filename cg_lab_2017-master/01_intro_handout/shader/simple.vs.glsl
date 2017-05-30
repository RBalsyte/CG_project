/**
 * as simple vertex shader setting the 2D position of a vertex without any transformations and forwarding the color
 * Created by Samuel Gratzl on 08.02.2016.
 */

//attributes: per vertex inputs in this case the 2d position and its color
attribute vec2 a_position;

//like a C program main is the main function
void main() {
  //gl_Position .. magic output variable storing the vertex 4D position
  gl_Position = vec4(a_position, 0, 1);
}
