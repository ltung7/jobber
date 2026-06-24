const parseHTMLForm = (html: string) => {
  const formData: Record<string,string> = {};

  // Helper to decode HTML entities
  const decodeHTML = (str: string) => {
    return str
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'");
  };

  // Parse all input fields (text, radio, etc)
  const inputRegex = /<input[^>]*>/g;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    const inputTag = match[0];
    const nameMatch = inputTag.match(/name="([^"]*)"/);
    const valueMatch = inputTag.match(/value="([^"]*)"/);
    const typeMatch = inputTag.match(/type="([^"]*)"/);
    const checkedMatch = inputTag.match(/checked/);
    
    if (nameMatch) {
      const name = nameMatch[1];
      const value = valueMatch ? decodeHTML(valueMatch[1]) : '';
      const type = typeMatch ? typeMatch[1] : 'text';
      
      // Only add radio if checked, or text inputs always
      if (type === 'radio' && checkedMatch) {
        formData[name] = value;
      } else if (type === 'text') {
        formData[name] = value;
      }
    }
  }

  // Parse textareas
  const textareaRegex = /<textarea[^>]*name="([^"]*)"[^>]*>(.*?)<\/textarea>/gs;
  while ((match = textareaRegex.exec(html)) !== null) {
    formData[match[1]] = decodeHTML(match[2].trim());
  }

  // Parse selects
  const selectRegex = /<select[^>]*name="([^"]*)"[^>]*>(.*?)<\/select>/gs;
  while ((match = selectRegex.exec(html)) !== null) {
    const selectName = match[1];
    const optionsHTML = match[2];
    
    const selectedRegex = /<option[^>]*value="([^"]*)"[^>]*selected/;
    const selectedMatch = optionsHTML.match(selectedRegex);
    
    if (selectedMatch) {
      formData[selectName] = decodeHTML(selectedMatch[1]);
    } else {
      const firstOptionRegex = /<option[^>]*value="([^"]*)"/;
      const firstMatch = optionsHTML.match(firstOptionRegex);
      if (firstMatch) {
        formData[selectName] = decodeHTML(firstMatch[1]);
      }
    }
  }

  return formData;
}

export default parseHTMLForm;