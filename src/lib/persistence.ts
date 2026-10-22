export const saveToStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(`fuelshare_${key}`, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving to localStorage [${key}]:`, err);
  }
};

export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(`fuelshare_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (err) {
    console.error(`Error reading from localStorage [${key}]:`, err);
    return defaultValue;
  }
};
