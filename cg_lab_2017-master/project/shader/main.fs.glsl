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

struct DirectionalLight {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
    vec3 direction;
};

struct PointLight {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
    vec3 direction;
};

struct SpotLight {
    vec4 ambient;
    vec4 diffuse;
    vec4 specular;
    vec3 direction;
    float constant;
    float cutOff;
};

// in
varying vec3 v_vertexPosition;
varying vec3 v_normal;
varying vec3 v_lightPosition;
varying vec3 v_spotLightPosition;
varying vec2 v_texCoord;
varying lowp vec4 v_color;

uniform Material u_material;
uniform sampler2D u_depthMap;

//lights. We have sun, lamp and street lamp
uniform DirectionalLight u_directionalLight;
uniform PointLight u_pointLight;
uniform SpotLight u_spotLight;

//texture
uniform bool u_enableObjectTexture1;
uniform bool u_enableObjectTexture2;
uniform bool u_enableObjectTexture3;
uniform sampler2D u_tex1;
uniform sampler2D u_tex2;
uniform sampler2D u_tex3;

//color
uniform bool u_enableColorLookup;
uniform float u_alpha;

vec4 calculateDirectionalLight(DirectionalLight light, vec3 normal, vec3 vertexPosition, Material material, vec4 textureColor)
{

    vec3 lightDirection = normalize(light.direction);

    // diffuse shading
    float diff = max(dot(normal, lightDirection), 0.0);

    // specular shading
    vec3 reflectDirection = reflect(lightDirection, normal);
    float spec = pow(max(dot(lightDirection, reflectDirection), 0.0), material.shininess);

    // replace with texture color if needed
    if(u_enableObjectTexture1 || u_enableColorLookup)
    {
        material.diffuse = vec4(textureColor.rgb, 1);
        material.ambient = vec4(textureColor.rgb, 1);
    }

    vec4 ambient  = clamp(light.ambient * material.ambient, 0.0, 1.0);
    vec4 diffuse = clamp(diff * light.diffuse * material.diffuse, 0.0, 1.0);
    vec4 specular = clamp(spec * light.specular * material.specular, 0.0, 1.0);
    vec4 emission  = material.emission;

    // combine results
    return (ambient + diffuse + specular + emission);
}

vec4 calculatePointLight(PointLight pointLight, vec3 lightPosition, vec3 normal, vec3 vertexPosition, Material material, vec4 textureColor)
{
    // diffuse shading
    float diff = max(dot(normal, lightPosition),0.0);

    // specular shading
    vec3 reflectVec = reflect(-lightPosition, normal);
  	float spec = pow( max( dot(reflectVec, vertexPosition), 0.0) , material.shininess);

    if(u_enableObjectTexture1 || u_enableColorLookup)
    {
        material.diffuse = vec4(textureColor.rgb, 1);
        material.ambient = vec4(textureColor.rgb, 1);
    }

    // combine results
    vec4 ambient  = clamp(pointLight.ambient * material.ambient, 0.0, 1.0);
    vec4 diffuse = clamp(diff * pointLight.diffuse * material.diffuse, 0.0, 1.0);
    vec4 specular = clamp(spec * pointLight.specular * material.specular, 0.0, 1.0);
    vec4 emission  = material.emission;

    return (ambient + diffuse + specular + emission);
}

vec4 calculateSpotLight(SpotLight light, vec3 lightPosition, vec3 normal, vec3 vertexPosition, Material material, vec4 textureColor)
{
    vec3 lightDirection = normalize(light.direction);

    // diffuse shading
    float diff = max(dot(normal, lightPosition), 0.0);

    // specular shading
    vec3 reflectDirection = reflect(lightPosition, normal);
    float spec = pow(max(dot(lightPosition, reflectDirection), 0.0), material.shininess);


    float spotCosine = dot(lightDirection,-lightPosition);
    float spotFactor = 1.0;
    if (spotCosine >= light.cutOff) {
            spotFactor = pow(spotCosine, light.constant);
    }
    else { // The point is outside the cone of light from the spotlight.
        return vec4(0.0); // The light will add no color to the point.
    }

    if(u_enableObjectTexture1 || u_enableColorLookup)
    {
        material.diffuse = vec4(textureColor.rgb, 1);
        material.ambient = vec4(textureColor.rgb, 1);
    }

    // combine results
    vec4 ambient  = clamp(light.ambient * material.ambient, 0.0, 1.0);
    vec4 diffuse = clamp(diff * light.diffuse * material.diffuse, 0.0, 1.0);
    vec4 specular = clamp(spec * light.specular * material.specular, 0.0, 1.0);
    vec4 emission  = material.emission;

    ambient  *= spotFactor;
    diffuse  *= spotFactor;
    specular *= spotFactor;
    emission *= spotFactor;

    return (ambient + diffuse + specular + emission);
}

void main (void) {

    vec4 textureColor = vec4(0, 0, 0, 1);
    if(u_enableObjectTexture1)
    {
        vec4 color1 = texture2D(u_tex1, vec2(v_texCoord));
        textureColor = color1;
        if(u_enableObjectTexture2)
        {
            vec4 color2 = texture2D(u_tex2, vec2(v_texCoord));
            if (color2.a > 0.0){
              textureColor = textureColor * color2;
            }

            if(u_enableObjectTexture3)
            {
                vec4 color3 = texture2D(u_tex3, vec2(v_texCoord));
                if (color3.a > 0.0){
                    textureColor = textureColor * color3;
                }
            }
        }
    }

    if (u_enableColorLookup){
      textureColor = v_color;
    }

    vec3 normal = normalize(v_normal);
    vec3 lightPosition = normalize(v_lightPosition);
    vec3 spotLightPosition = normalize(v_spotLightPosition);
    vec3 vertexPosition = normalize(v_vertexPosition);

    // sun -> directional light
    gl_FragColor = calculateDirectionalLight(u_directionalLight, normal, vertexPosition, u_material, textureColor)
                  + calculatePointLight(u_pointLight, lightPosition, normal, vertexPosition, u_material, textureColor)
                  + calculateSpotLight(u_spotLight, spotLightPosition, normal, vertexPosition, u_material, textureColor);

    gl_FragColor.a = textureColor.a * u_alpha;
}
