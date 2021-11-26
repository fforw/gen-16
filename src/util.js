export function clamp(v)
{
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

const toLinearPower = 2.4;
const toRGBPower = 1/toLinearPower;


/**
 * Converts a color from integer 0-255 to linear color 0-1
 *
 * @param {number} v    color value 0-255
 * 
 * @return {number} linear color value 0 - 1
 */
export function toLinear(v)
{
    return Math.pow(v/255, toLinearPower)
}

/**
 * Converts a color from linear color 0-1 to integer 0-255
 *
 * @param {number} v    linear color value 0 - 1
 *
 * @return {number} color value 0-255
 */

export function toRGB(v)
{
    return Math.pow(v, toRGBPower) * 255
}
