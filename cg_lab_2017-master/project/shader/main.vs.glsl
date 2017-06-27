
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;
attribute vec4 a_color;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;
uniform mat4 u_invView;

//in
uniform vec3 u_pointLightPos;
uniform vec3 u_spotLightPos;

//out
varying vec3 v_vertexPosition;
varying vec3 v_normal;
varying vec3 v_lightPosition;
varying vec3 v_spotLightPosition;
varying vec2 v_texCoord;
varying lowp vec4 v_color;

void main() {
    // compute vertex position in eye space and pass it on for light calculation
    vec4 vertexPosition = u_modelView * vec4(a_position,1);
    v_vertexPosition = -vertexPosition.xyz;

    // compute normal vector in eye space and pass it on
    v_normal = u_normalMatrix * a_normal;

    // compute light vector in eye space and pass it on
    v_lightPosition = u_pointLightPos - vertexPosition.xyz;
    v_spotLightPosition = u_spotLightPos - vertexPosition.xyz;

    //pass on texture coordinates
    v_texCoord = a_texCoord;

    //pass on the color
    v_color = a_color;

    gl_Position = u_projection * vertexPosition;
}
