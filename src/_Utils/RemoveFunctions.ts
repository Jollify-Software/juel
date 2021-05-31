export const removeFunctions = (obj) => {
  Object.keys(obj).forEach(k => {
    if (typeof obj[k] === "function")
      delete obj[k];
    else if (typeof obj[k] === "object")
    delete obj[k];// = removeFunctions(obj[k])
  })
  }
