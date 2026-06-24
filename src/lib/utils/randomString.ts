export const randomString = (length : number, alphanumeric : boolean = true) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    if (!alphanumeric) characters += '?<>!@#$%^&*(){}[]:;,-=_+';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

export const randomDatedId = (input : string = '', length : number = 16) => {
    let number = Date.now();
    const max = 62;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = input;
    do {
        const v = Math.round(number % max);
        result = characters[v] + result;
        number = Math.round(number / max);
    } while (number > max);
    result = characters[number] + result;
    
    let counter = result.length;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * max));
      counter += 1;
    }

    return result;
}

export default randomString;