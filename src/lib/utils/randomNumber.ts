export default (min : number, max : number) => {
    const factor = max - min;
    return Math.floor(Math.random() * factor) + min;
}