export function parseDataset<T = Record<string, any>>(element: HTMLElement, group: string): T {
  const result: any = {};
  const groupPrefix = group;

  for (const key in element.dataset) {
    if (key.startsWith(groupPrefix) && key.length > groupPrefix.length) {
      const rawSubKey = key.slice(groupPrefix.length);

      // Lowercase the first character
      const normalisedKey = rawSubKey.charAt(0).toLowerCase() + rawSubKey.slice(1);

      // Split camelCase into parts (e.g., optionsMaxValue -> options, maxValue)
      const path = normalisedKey.split(/(?=[A-Z])/).map(part => 
        part.charAt(0).toLowerCase() + part.slice(1)
      );

      let value: any = element.dataset[key as keyof typeof element.dataset];

      // Parse value
      if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      } else if (!isNaN(Number(value)) && value.trim() !== "") {
        value = Number(value);
      }

      // Assign into nested object
      let current = result;
      for (let i = 0; i < path.length; i++) {
        const part = path[i];
        if (i === path.length - 1) {
          current[part] = value;
        } else {
          if (!(part in current)) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }
  }

  return result as T;
}