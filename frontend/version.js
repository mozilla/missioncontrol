// simple function to compare versions in the firefox format,
// which are generally semantic but also can have the extension
// 'b' or 'rc' (e.g. 60.0.1rc5, 59.0.2b55)
export function semVerCompare(ver1, ver2) {
  const ver1Parts = ver1.split('.');
  const ver2Parts = ver2.split('.');

  for (let i = 0; i < ver1Parts.length; i += 1) {
    // version 1 has more components than 2, so is greater
    if (i === ver2Parts.length) {
      return 1;
    }

    const v1Part = ver1Parts[i];
    const v2Part = ver2Parts[i];
    const diff = parseInt(v1Part, 10) - parseInt(v2Part, 10);

    if (diff) {
      return diff;
    }

    // if we are on the last element of i and they are equal
    if (i === ver1Parts.length - 1) {
      // if there are still elements in second, it is greater
      if (i < ver2Parts.length - 1) {
        return -1;
      }

      // otherwise they are of equal length, and we need to
      // figure out if they have a display part and compare
      // that
      const ver1DisplayPart =
        v1Part.match(/[A-z]+/) && v1Part.match(/[A-z]+/)[0];
      const ver2DisplayPart =
        v2Part.match(/[A-z]+/) && v2Part.match(/[A-z]+/)[0];

      if (
        ver1DisplayPart > ver2DisplayPart ||
        (!ver1DisplayPart && ver2DisplayPart)
      ) {
        return 1;
      } else if (
        ver1DisplayPart < ver2DisplayPart ||
        (ver2DisplayPart && !ver1DisplayPart)
      ) {
        return -1;
      } else if (ver1DisplayPart === ver2DisplayPart) {
        return (
          parseInt(v1Part.split(ver1DisplayPart).pop(), 10) -
          parseInt(v2Part.split(ver2DisplayPart).pop(), 10)
        );
      }
    }
  }

  // should never get here
  return -1;
}

export { semVerCompare as default };
