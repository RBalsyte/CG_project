// Phong Fragment Shader
// Disclaimer: This phong shader implementation is neither performance optimized nor beautifully coded.
// It shows the basic priciples in a simple way and is sufficient for our lab exercises.
precision mediump float;

/**
* definition of a material structure containing common properties
*/
struct Material {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
    vec4 emission;
    float shininess;
};

/**
* definition of the light properties related to material properties
*/
struct Light {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
};

//illumination related variables
uniform Material u_material;
uniform Light u_light;
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;

//texture related variables
uniform bool u_enableObjectTexture;
uniform sampler2D u_tex;
uniform sampler2D u_tex2;
uniform bool u_enableColorLookup;
varying vec2 v_texCoord;
varying lowp vec4 v_color;


//shadow map resolution (required for extra task)
uniform float u_shadowMapWidth;
uniform float u_shadowMapHeight;

//shadow related variables
varying vec4 v_shadowMapTexCoord;
uniform sampler2D u_depthMap;

vec4 calculateSimplePointLight(Light light, Material material, vec3 lightVec, vec3 normalVec, vec3 eyeVec, vec4 textureColor) {
    lightVec = normalize(lightVec);
    normalVec = normalize(normalVec);
    eyeVec = normalize(eyeVec);

    //compute diffuse term
    float diffuse = max(dot(normalVec,lightVec),0.0);

    //compute specular term
    vec3 reflectVec = reflect(-lightVec,normalVec);
    float spec = pow( max( dot(reflectVec, eyeVec), 0.0) , material.shininess);

    if(u_enableObjectTexture || u_enableColorLookup)
    {
        //replace diffuse and ambient matrial with texture color if texture is available
        material.diffuse = vec4(textureColor.rgb, 1);
        material.ambient = vec4(textureColor.rgb, 1);
    }

    vec4 c_amb  = clamp(light.ambient * material.ambient, 0.0, 1.0);
    vec4 c_diff = clamp(diffuse * light.diffuse * material.diffuse, 0.0, 1.0);
    vec4 c_spec = clamp(spec * light.specular * material.specular, 0.0, 1.0);
    vec4 c_em   = material.emission;

    //Note: You can directly use the shadow related varying/uniform variables in this example since we only have 1 light source.
    //Normally you should pass them to the calculateSimplePointLight function as parameters since they change for each light source!

    //apply perspective division to v_shadowMapTexCoord and save to shadowMapTexCoord3D
    vec3 shadowMapTexCoord3D = v_shadowMapTexCoord.xyz/v_shadowMapTexCoord.w; //do perspective division

    //do texture space transformation (-1 to 1 -> 0 to 1)
    shadowMapTexCoord3D = vec3(0.5,0.5,0.5) + shadowMapTexCoord3D*0.5;
    //substract small amount from z to get rid of self shadowing (TRY: disable to see difference)
    shadowMapTexCoord3D.z -= 0.003;

    float shadowCoeff = 1.0; //set to 1 if no shadow!
    //look up depth in u_depthMap and set shadow coefficient (shadowCoeff) to 0 based on depth comparison
    /*float zShadowMap = texture2D(u_depthMap, shadowMapTexCoord3D.xy).r;
    if(shadowMapTexCoord3D.z > zShadowMap)
    shadowCoeff = 0.0;*/

    //Improve shadow quality by sampling multiple shadow coefficients (a.k.a. PCF)
    float sumShadowCoeff = 0.0;
    for(float dx=-1.0; dx <= 1.0; dx++)
    {
      for(float dy=-1.0; dy <= 1.0; dy++)
      {
        float subShadowCoeff = 1.0; //set to 1 if no shadow!
        float zShadowMap = texture2D(u_depthMap, shadowMapTexCoord3D.xy+vec2(dx/u_shadowMapWidth,dy/u_shadowMapHeight)).r;
        if(shadowMapTexCoord3D.z > zShadowMap)
          subShadowCoeff = 0.0;

        sumShadowCoeff += subShadowCoeff;
      }
    }
    shadowCoeff = sumShadowCoeff/9.0;

    //apply shadow coefficient to diffuse and specular part
    vec4 finalColor = c_amb + shadowCoeff * (c_diff + c_spec) + c_em;
    finalColor.a = finalColor.a * textureColor.a;

    return finalColor;
}

void main (void) {

    vec4 textureColor = vec4(0, 0, 0, 1);
    if(u_enableObjectTexture)
    {
        vec4 color0 = texture2D(u_tex, vec2(v_texCoord));
        vec4 color1 = texture2D(u_tex2, vec2(v_texCoord));
        textureColor = color0 + color1;
    }

    if (u_enableColorLookup){
      textureColor = v_color;
    }

    gl_FragColor = calculateSimplePointLight(u_light, u_material, v_lightVec, v_normalVec, v_eyeVec, textureColor);
}