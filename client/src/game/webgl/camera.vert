#version 300 es

in vec2 a_position;
uniform vec2 u_translation;
uniform vec2 u_scale;

void main() {
    // Scale and translate the position
    vec2 position = a_position * u_scale + u_translation;

    // Position is already in clip space
    gl_Position = vec4(position, 0.0, 1.0);
}
