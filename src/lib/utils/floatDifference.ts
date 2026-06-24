const floatDifference = (a: number, b: number, maxDifference: number = 0.1) => Math.abs(a - b) > maxDifference;

export default floatDifference;