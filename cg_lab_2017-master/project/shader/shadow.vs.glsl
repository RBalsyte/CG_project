// Phong Vertex Shader

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;
attribute vec4 a_color;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;
uniform mat4 u_invView;

// in
uniform vec3 u_lightPos;
uniform vec3 u_spotlightPos;
uniform vec3 u_spotlightDir;
uniform float u_spotlightAngle;
uniform mat4 u_eyeToLightMatrix;

//output of this shader
varying vec3 v_normalVec;
varying vec3 v_lightVec;
varying vec4 v_spotlightVec;
varying vec3 v_eyeVec;
varying vec2 v_texCoord;
varying vec4 v_shadowMapTexCoord;
varying lowp vec4 v_color;

void main() {
    //compute vertex position in eye space
    vec4 eyePosition = u_modelView * vec4(a_position,1);

    //compute normal vector in eye space
    v_normalVec = u_normalMatrix * a_normal;

    //compute variables for light computation
    v_eyeVec = -eyePosition.xyz;
    v_lightVec = u_lightPos - eyePosition.xyz;

    vec3 vecLightToVertex = eyePosition.xyz - u_spotlightPos;
    vecLightToVertex = normalize(vecLightToVertex);
    vec3 normSpotlightDir = normalize(u_spotlightDir);

    float angle = acos(dot(vecLightToVertex,  normSpotlightDir));

    if(angle < u_spotlightAngle)
      v_spotlightVec =  vec4(u_spotlightPos - eyePosition.xyz, 1.0);
    else
      v_spotlightVec =  vec4(0,0,0,0.0);

    //calculate vertex position in light clip space coordinates using u_eyeToLightMatrix (assign result to v_shadowMapTexCoord)
    v_shadowMapTexCoord = u_eyeToLightMatrix*eyePosition;


    //pass on texture coordinates
    v_texCoord = a_texCoord;

    //pass on the color
    v_color = a_color;

    gl_Position = u_projection * eyePosition;
}
