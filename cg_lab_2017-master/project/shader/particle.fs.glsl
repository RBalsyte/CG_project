//need to specify how "precise" float should be
precision mediump float;

//interpolate argument between vertex and fragment shader
varying vec3 v_color;

//alpha value determining transparency
uniform float u_alpha;

//entry point again
void main() {
  gl_FragColor = vec4(v_color, u_alpha);
}
