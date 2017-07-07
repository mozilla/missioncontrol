export function getMajorVersion(verString) {
  return parseInt(String(verString).split('.')[0], 10);
}

export { getMajorVersion as default };
