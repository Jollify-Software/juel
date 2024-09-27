export function removeEmpty(obj) {
  const newObj = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === Object(v) && Array.isArray(v) == false) {
      newObj[k] = removeEmpty(v);
    } else if (v != null) {
      newObj[k] = obj[k];
    }
  });
  return newObj;
}